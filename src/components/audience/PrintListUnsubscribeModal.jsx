import React, { useState, useMemo } from 'react';
import { API_BASE_URL } from '../../config/api';

const REASONS = [
  'Moved',
  'Retired',
  'Deceased',
  'Business closed',
  'No longer at this address',
  'Address undeliverable',
  'Not interested',
  'Switched specialties',
];

const BLACKLIST_TRIGGERS = new Set(['Moved', 'Business closed', 'No longer at this address', 'Address undeliverable']);

const PrintListUnsubscribeModal = ({ row, currentLists, onClose, onSaved }) => {
  const [selectedLists, setSelectedLists] = useState(currentLists || []);
  const [reasons, setReasons] = useState([]);
  const [otherText, setOtherText] = useState('');
  const [alsoBlacklist, setAlsoBlacklist] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const showBlacklistOption = useMemo(() => reasons.some(r => BLACKLIST_TRIGGERS.has(r)), [reasons]);
  const table = row.table_name || (row.npi ? 'universal_profiles' : 'print_only_contacts');

  const toggleList = (l) => setSelectedLists(s => s.includes(l) ? s.filter(x => x !== l) : [...s, l]);
  const toggleReason = (r) => setReasons(s => s.includes(r) ? s.filter(x => x !== r) : [...s, r]);

  const submit = async () => {
    setError(null);
    if (!selectedLists.length) { setError('Pick at least one list to unsubscribe from.'); return; }
    const allReasons = [...reasons];
    if (otherText.trim()) allReasons.push(`Other: ${otherText.trim()}`);
    if (!allReasons.length) { setError('Pick at least one reason.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/list-management/print-lists/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table,
          id: row.id,
          npi: row.npi,
          lists: selectedLists,
          reasons: allReasons,
          also_blacklist: showBlacklistOption && alsoBlacklist,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.reason || data.error || 'Request failed.');
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

  return (
    <div className="aqb-modal-overlay" onClick={onClose}>
      <div className="aqb-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="aqb-modal-header">
          <h2>Unsubscribe</h2>
          <button className="aqb-modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ padding: '16px 20px', overflowY: 'auto' }}>
          <div style={{ fontSize: '0.95rem', marginBottom: 4, color: '#fff' }}>
            {[row.first_name, row.last_name].filter(Boolean).join(' ') || '—'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: 14 }}>
            {row.npi ? `NPI ${row.npi} · ` : ''}{[row.practice_address_1 || row.address_1, row.practice_city || row.city, row.practice_state || row.state].filter(Boolean).join(', ') || ''}
          </div>

          <div style={{ fontSize: '0.85rem', color: '#b8b8b8', marginBottom: 6 }}>Lists to remove *</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {(currentLists || []).map(l => (
              <label key={l} style={{
                cursor: 'pointer', padding: '4px 10px', borderRadius: 4, fontSize: '0.85rem',
                border: '1px solid ' + (selectedLists.includes(l) ? '#ef4444' : '#333336'),
                background: selectedLists.includes(l) ? 'rgba(239,68,68,0.08)' : '#2a2a2d',
                color: selectedLists.includes(l) ? '#fca5a5' : '#ddd',
              }}>
                <input type="checkbox" checked={selectedLists.includes(l)} onChange={() => toggleList(l)} style={{ display: 'none' }} />
                {l}
              </label>
            ))}
            <button
              type="button"
              onClick={() => setSelectedLists(currentLists || [])}
              style={{ padding: '4px 10px', borderRadius: 4, fontSize: '0.75rem', background: 'transparent', border: '1px solid #333336', color: '#888', cursor: 'pointer' }}
            >
              All
            </button>
          </div>

          <div style={{ fontSize: '0.85rem', color: '#b8b8b8', marginBottom: 6 }}>Reason(s) *</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {REASONS.map(r => (
              <label key={r} style={{
                cursor: 'pointer', padding: '4px 10px', borderRadius: 4, fontSize: '0.85rem',
                border: '1px solid ' + (reasons.includes(r) ? '#0ff' : '#333336'),
                background: reasons.includes(r) ? 'rgba(0,255,255,0.08)' : '#2a2a2d',
                color: reasons.includes(r) ? '#0ff' : '#ddd',
              }}>
                <input type="checkbox" checked={reasons.includes(r)} onChange={() => toggleReason(r)} style={{ display: 'none' }} />
                {r}
              </label>
            ))}
          </div>
          <input
            type="text" placeholder="Other (free text)…"
            value={otherText} onChange={e => setOtherText(e.target.value)}
            style={{ width: '100%', padding: 8, background: '#2a2a2d', border: '1px solid #333336', borderRadius: 4, color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}
          />

          {showBlacklistOption && (row.practice_address_1 || row.address_1) && (
            <div style={{ marginTop: 14, padding: 10, background: 'rgba(217,184,127,0.08)', border: '1px solid #d9b87f', borderRadius: 4 }}>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.85rem', color: '#d9b87f' }}>
                <input type="checkbox" checked={alsoBlacklist} onChange={e => setAlsoBlacklist(e.target.checked)} style={{ marginTop: 3 }} />
                <span>
                  <strong>Also blacklist this address.</strong> All current and future subscribers at this address will be moved to unsubscribed.
                </span>
              </label>
            </div>
          )}

          {error && (
            <div style={{ padding: 8, marginTop: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 4, color: '#fca5a5', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #333336', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="archive-tab-button">Cancel</button>
          <button onClick={submit} disabled={submitting} className="export-button" style={{ background: '#ef4444', borderColor: '#ef4444' }}>
            {submitting ? 'Unsubscribing…' : 'Unsubscribe'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintListUnsubscribeModal;