import React, { useState } from 'react';
import { API_BASE_URL } from '../../config/api';
import '../../styles/PrintListEditAddressModal.css';

const splitAddress = (raw) => {
  const s = (raw || '').trim();
  if (!s) return ['', ''];
  const m = s.match(/^(.+?)[\s,]+(ste\.?|suite|apt\.?|apartment|unit|#|bldg\.?|building|fl\.?|floor|rm\.?|room)\b\s*(.*)$/i);
  if (m) return [m[1].trim(), `${m[2]} ${m[3]}`.trim()];
  return [s, ''];
};

const PrintListEditAddressModal = ({ row, onClose, onSaved }) => {
  const sourceTable = row.source_table || row.table_name;
  const sourceId = row.source_id || row.id;

  const initialAddr1Raw = row.practice_address_1 || row.address_1 || row.address || '';
  const initialAddr2Raw = row.practice_address_2 || row.address_2 || '';
  const [splitFromAddr1, suiteFromAddr1] = splitAddress(initialAddr1Raw);
  const needsSplit = !initialAddr2Raw && suiteFromAddr1;

  const [addr1, setAddr1] = useState(needsSplit ? splitFromAddr1 : initialAddr1Raw);
  const [addr2, setAddr2] = useState(needsSplit ? suiteFromAddr1 : initialAddr2Raw);
  const [city, setCity] = useState(row.practice_city || row.city || '');
  const [state, setState] = useState(row.practice_state || row.state || '');
  const [zipcode, setZipcode] = useState(row.practice_zipcode || row.zipcode || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setError(null);
    if (!addr1.trim() || !city.trim() || !state.trim()) {
      setError('Address line 1, city, and state are required.');
      return;
    }
    if (!sourceTable || !sourceId) {
      setError('Missing record identifiers.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/list-management/print-lists/update-address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_table: sourceTable,
          source_id: sourceId,
          npi: row.npi || null,
          address_1: addr1.trim(),
          address_2: addr2.trim(),
          city: city.trim(),
          state: state.trim().toUpperCase(),
          zipcode: zipcode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Request failed.');
        setSubmitting(false);
        return;
      }
      onSaved && onSaved(data);
      onClose && onClose();
    } catch (e) {
      setError(e.message || 'Network error.');
    } finally {
      setSubmitting(false);
    }
  };

  const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ') || 'Unnamed contact';
  const currentAddress = [
    row.practice_address_1 || row.address_1 || row.address,
    row.practice_address_2 || row.address_2,
    [row.practice_city || row.city, row.practice_state || row.state, row.practice_zipcode || row.zipcode].filter(Boolean).join(', '),
  ].filter(Boolean).join(' · ') || 'No address on file';

  return (
    <div className="pleam-overlay" onClick={onClose}>
      <div className="pleam-modal" onClick={e => e.stopPropagation()}>
        <div className="pleam-header">
          <div className="pleam-header-text">
            <h2 className="pleam-title">Edit Address</h2>
            <div className="pleam-subtitle">{fullName}</div>
          </div>
          <button className="pleam-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="pleam-meta">
          {row.npi && (
            <span className="pleam-chip">
              <span className="pleam-chip-label">NPI</span>
              <span className="pleam-chip-value pleam-mono">{row.npi}</span>
            </span>
          )}
          <span className="pleam-chip">
            <span className="pleam-chip-label">Source</span>
            <span className="pleam-chip-value">{sourceTable || '—'}</span>
          </span>
          {row.npi && (
            <span className="pleam-cascade">cascades to user_profiles + universal_profiles + print_only_contacts</span>
          )}
        </div>

        <div className="pleam-current">
          <span className="pleam-current-label">Current</span>
          <span className="pleam-current-value">{currentAddress}</span>
        </div>

        <div className="pleam-body">
          <div className="pleam-row">
            <div className="pleam-field" style={{ flex: 3 }}>
              <label className="pleam-field-label">Address Line 1</label>
              <input
                type="text"
                className="pleam-input"
                value={addr1}
                onChange={e => setAddr1(e.target.value)}
                disabled={submitting}
                autoFocus
              />
            </div>
            <div className="pleam-field" style={{ flex: 2 }}>
              <label className="pleam-field-label">Line 2 <span className="pleam-field-optional">suite, apt</span></label>
              <input
                type="text"
                className="pleam-input"
                value={addr2}
                onChange={e => setAddr2(e.target.value)}
                disabled={submitting}
                placeholder="Ste 4"
              />
            </div>
          </div>

          <div className="pleam-row">
            <div className="pleam-field" style={{ flex: 2 }}>
              <label className="pleam-field-label">City</label>
              <input type="text" className="pleam-input" value={city} onChange={e => setCity(e.target.value)} disabled={submitting} />
            </div>
            <div className="pleam-field" style={{ width: 80 }}>
              <label className="pleam-field-label">State</label>
              <input type="text" className="pleam-input" value={state} onChange={e => setState(e.target.value.toUpperCase())} maxLength={2} disabled={submitting} />
            </div>
            <div className="pleam-field" style={{ width: 120 }}>
              <label className="pleam-field-label">Zipcode</label>
              <input type="text" className="pleam-input" value={zipcode} onChange={e => setZipcode(e.target.value)} maxLength={10} disabled={submitting} />
            </div>
          </div>

          {error && <div className="pleam-error">{error}</div>}
        </div>

        <div className="pleam-footer">
          <button className="pleam-btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="pleam-btn-primary" onClick={submit} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save Address'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintListEditAddressModal;
