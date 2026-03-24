from flask import Blueprint, request, jsonify
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, inspect, text
from models import Program, SubProgram, ProgramItem, Base
from datetime import datetime
import os

programs_bp = Blueprint('programs', __name__)

DEFAULT_DB = 'postgresql://krill_user:mFjksQrNfkvghjzJEDVE0qQw8zBwz5dV@dpg-d3f8kmbipnbc73a2lnng-a.virginia-postgres.render.com/krill'

_engine = create_engine(os.getenv('DATABASE_URL') or DEFAULT_DB)
Base.metadata.create_all(_engine, tables=[Program.__table__, SubProgram.__table__, ProgramItem.__table__], checkfirst=True)

try:
    insp = inspect(_engine)
    cols = [c['name'] for c in insp.get_columns('program_items')]
    if 'sub_program_id' not in cols:
        with _engine.connect() as conn:
            conn.execute(text('ALTER TABLE program_items ADD COLUMN sub_program_id INTEGER'))
            conn.commit()
    cols2 = [c['name'] for c in insp.get_columns('programs')]
    if 'has_sub_programs' not in cols2:
        with _engine.connect() as conn:
            conn.execute(text('ALTER TABLE programs ADD COLUMN has_sub_programs BOOLEAN DEFAULT FALSE'))
            conn.commit()
except Exception:
    pass

def get_session():
    Session = sessionmaker(bind=_engine)
    return Session()

def serialize_program(program, session):
    items = session.query(ProgramItem).filter_by(program_id=program.id).order_by(ProgramItem.item_type, ProgramItem.item_label).all()
    sub_programs = session.query(SubProgram).filter_by(program_id=program.id).order_by(SubProgram.sort_order).all()

    direct_items = [i for i in items if not i.sub_program_id]
    sp_items_map = {}
    for item in items:
        if item.sub_program_id:
            sp_items_map.setdefault(item.sub_program_id, []).append(item)

    def serialize_item(item):
        return {
            'id': item.id,
            'program_id': item.program_id,
            'sub_program_id': item.sub_program_id,
            'item_type': item.item_type,
            'item_identifier': item.item_identifier,
            'item_label': item.item_label,
            'created_at': item.created_at.isoformat() if item.created_at else None,
        }

    return {
        'id': program.id,
        'name': program.name,
        'description': program.description,
        'status': program.status,
        'has_sub_programs': program.has_sub_programs or False,
        'created_at': program.created_at.isoformat() if program.created_at else None,
        'updated_at': program.updated_at.isoformat() if program.updated_at else None,
        'items': [serialize_item(i) for i in direct_items],
        'sub_programs': [{
            'id': sp.id,
            'name': sp.name,
            'sort_order': sp.sort_order,
            'items': [serialize_item(i) for i in sp_items_map.get(sp.id, [])]
        } for sp in sub_programs],
    }

@programs_bp.route('/', methods=['GET'])
def get_all_programs():
    try:
        session = get_session()
        programs = session.query(Program).order_by(Program.updated_at.desc()).all()
        result = [serialize_program(p, session) for p in programs]
        session.close()
        return jsonify({'status': 'success', 'programs': result}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@programs_bp.route('/', methods=['POST'])
def create_program():
    try:
        data = request.json
        name = data.get('name')
        if not name:
            return jsonify({'status': 'error', 'message': 'name is required'}), 400

        session = get_session()
        program = Program(
            name=name,
            description=data.get('description', ''),
            status=data.get('status', 'active'),
            has_sub_programs=data.get('has_sub_programs', False)
        )
        session.add(program)
        session.commit()

        if data.get('has_sub_programs') and data.get('sub_programs'):
            for idx, sp_data in enumerate(data['sub_programs']):
                sp = SubProgram(
                    program_id=program.id,
                    name=sp_data.get('name', f'Sub-Program {idx + 1}'),
                    sort_order=sp_data.get('sort_order', idx)
                )
                session.add(sp)
                session.commit()
                for item in sp_data.get('items', []):
                    new_item = ProgramItem(
                        program_id=program.id,
                        sub_program_id=sp.id,
                        item_type=item.get('item_type', ''),
                        item_identifier=item.get('item_identifier', ''),
                        item_label=item.get('item_label', '')
                    )
                    session.add(new_item)
            session.commit()
        else:
            items_data = data.get('items', [])
            for item in items_data:
                new_item = ProgramItem(
                    program_id=program.id,
                    item_type=item.get('item_type', ''),
                    item_identifier=item.get('item_identifier', ''),
                    item_label=item.get('item_label', '')
                )
                session.add(new_item)
            session.commit()

        result = serialize_program(program, session)
        session.close()
        return jsonify({'status': 'success', 'program': result}), 201
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@programs_bp.route('/<int:program_id>', methods=['PUT'])
def update_program(program_id):
    try:
        data = request.json
        session = get_session()
        program = session.query(Program).filter_by(id=program_id).first()
        if not program:
            session.close()
            return jsonify({'status': 'error', 'message': 'Program not found'}), 404

        if 'name' in data:
            program.name = data['name']
        if 'description' in data:
            program.description = data['description']
        if 'status' in data:
            program.status = data['status']
        if 'has_sub_programs' in data:
            program.has_sub_programs = data['has_sub_programs']
        program.updated_at = datetime.utcnow()

        if 'sub_programs' in data:
            existing_sps = session.query(SubProgram).filter_by(program_id=program_id).all()
            for sp in existing_sps:
                session.query(ProgramItem).filter_by(program_id=program_id, sub_program_id=sp.id).delete()
            session.query(SubProgram).filter_by(program_id=program_id).delete()

            for idx, sp_data in enumerate(data['sub_programs']):
                sp = SubProgram(
                    program_id=program_id,
                    name=sp_data.get('name', f'Sub-Program {idx + 1}'),
                    sort_order=sp_data.get('sort_order', idx)
                )
                session.add(sp)
                session.commit()
                for item in sp_data.get('items', []):
                    new_item = ProgramItem(
                        program_id=program_id,
                        sub_program_id=sp.id,
                        item_type=item.get('item_type', ''),
                        item_identifier=item.get('item_identifier', ''),
                        item_label=item.get('item_label', '')
                    )
                    session.add(new_item)

        if 'items' in data:
            session.query(ProgramItem).filter_by(program_id=program_id, sub_program_id=None).delete()
            for item in data['items']:
                new_item = ProgramItem(
                    program_id=program_id,
                    item_type=item.get('item_type', ''),
                    item_identifier=item.get('item_identifier', ''),
                    item_label=item.get('item_label', '')
                )
                session.add(new_item)

        session.commit()
        result = serialize_program(program, session)
        session.close()
        return jsonify({'status': 'success', 'program': result}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@programs_bp.route('/<int:program_id>', methods=['DELETE'])
def delete_program(program_id):
    try:
        session = get_session()
        program = session.query(Program).filter_by(id=program_id).first()
        if not program:
            session.close()
            return jsonify({'status': 'error', 'message': 'Program not found'}), 404

        session.query(ProgramItem).filter_by(program_id=program_id).delete()
        session.query(SubProgram).filter_by(program_id=program_id).delete()
        session.delete(program)
        session.commit()
        session.close()
        return jsonify({'status': 'success', 'message': 'Program deleted'}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@programs_bp.route('/<int:program_id>/items', methods=['POST'])
def add_items(program_id):
    try:
        data = request.json
        session = get_session()
        program = session.query(Program).filter_by(id=program_id).first()
        if not program:
            session.close()
            return jsonify({'status': 'error', 'message': 'Program not found'}), 404

        items_data = data.get('items', [])
        for item in items_data:
            new_item = ProgramItem(
                program_id=program_id,
                sub_program_id=item.get('sub_program_id'),
                item_type=item.get('item_type', ''),
                item_identifier=item.get('item_identifier', ''),
                item_label=item.get('item_label', '')
            )
            session.add(new_item)

        program.updated_at = datetime.utcnow()
        session.commit()
        result = serialize_program(program, session)
        session.close()
        return jsonify({'status': 'success', 'program': result}), 201
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@programs_bp.route('/<int:program_id>/items/<int:item_id>', methods=['DELETE'])
def remove_item(program_id, item_id):
    try:
        session = get_session()
        item = session.query(ProgramItem).filter_by(id=item_id, program_id=program_id).first()
        if not item:
            session.close()
            return jsonify({'status': 'error', 'message': 'Item not found'}), 404

        session.delete(item)
        program = session.query(Program).filter_by(id=program_id).first()
        if program:
            program.updated_at = datetime.utcnow()
        session.commit()
        session.close()
        return jsonify({'status': 'success', 'message': 'Item removed'}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500