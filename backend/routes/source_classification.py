LICENSED_SEGMENTS = ('IQVIA HCPs', 'HLD HCPs')
OWNED_OVERRIDE_SEGMENTS = ('Matrix Owned Emails',)

def classify_source(ac_segments):
    if not ac_segments:
        return None
    if isinstance(ac_segments, str):
        segments = [s.strip() for s in ac_segments.split(',') if s.strip()]
    else:
        segments = [str(s).strip() for s in ac_segments if s]
    if not segments:
        return None
    seg_set = set(segments)
    if seg_set & set(OWNED_OVERRIDE_SEGMENTS):
        return 'Owned'
    if seg_set & set(LICENSED_SEGMENTS):
        return 'Licensed'
    return 'Owned'

def classify_source_sql_expr(up_alias='up'):
    return f"""
    CASE
        WHEN {up_alias}.ac_segments IS NOT NULL
             AND jsonb_array_length(COALESCE({up_alias}.ac_segments::jsonb, '[]'::jsonb)) > 0
        THEN CASE
            WHEN {up_alias}.ac_segments::jsonb ?| ARRAY['Matrix Owned Emails']
                THEN 'Owned'
            WHEN {up_alias}.ac_segments::jsonb ?| ARRAY['IQVIA HCPs', 'HLD HCPs']
                THEN 'Licensed'
            ELSE 'Owned'
        END
        ELSE (
            SELECT CASE
                WHEN _ame.name IN ('Matrix Owned Emails') THEN 'Owned'
                WHEN _ame.name IN ('IQVIA HCPs', 'HLD HCPs') THEN 'Licensed'
                ELSE 'Owned'
            END
            FROM ac_membership_events _ame
            WHERE _ame.user_profile_id = {up_alias}.id
              AND _ame.dimension = 'segment'
              AND _ame.event = 'added'
            ORDER BY _ame.at DESC
            LIMIT 1
        )
    END
    """