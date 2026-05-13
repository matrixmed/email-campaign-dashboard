import React, { useState } from 'react';
import { API_BASE_URL } from '../../config/api';

const PrintListBlacklistModal = ({ initial = {}, onClose, onSaved }) => {
  const [address1, setAddress1] = useState(initial.address_1 || '');
  const [city, setCity] = useState(initial.city || '');
  const [state, setState] = useState(initial.state || '');
  const [zipcode, setZipcode] = useState(initial.zipcode || '');
  const [reason, setReason] = useState(initial.reason || '');
  const [cascade, setCascade] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setError(null);
    if (!address1.trim()) { setError('Address is required.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/list-management/print-lists/blacklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address_1: address1, city, state, zipcode, reason, cascade }),
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

  return (
    <div className="aqb-modal-overlay" onClick={onClose}>
      <div className="aqb-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="aqb-modal-header">
          <h2>Blacklist Address</h2>
          <button className="aqb-modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Address *" value={address1} onChange={setAddress1} fullWidth />
            <Field label="City" value={city} onChange={setCity} />
            <Field label="State" value={state} onChange={setState} maxLength={2} placeholder="2-letter" />
            <Field label="Zip" value={zipcode} onChange={setZipcode} fullWidth />
            <Field label="Reason" value={reason} onChange={setReason} fullWidth />
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 14, fontSize: '0.85rem', color: '#ddd', cursor: 'pointer' }}>
            <input type="checkbox" checked={cascade} onChange={e => setCascade(e.target.checked)} style={{ marginTop: 3 }} />
            <span>Also unsubscribe all current subscribers at this address (recommended).</span>
          </label>

          {error && (
            <div style={{ padding: 8, marginTop: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 4, color: '#fca5a5', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #333336', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="archive-tab-button">Cancel</button>
          <button onClick={submit} disabled={submitting} className="export-button" style={{ background: '#d9b87f', borderColor: '#d9b87f', color: '#222' }}>
            {submitting ? 'Adding…' : 'Blacklist'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, placeholder, type = 'text', maxLength, fullWidth }) => (
  <div style={{ gridColumn: fullWidth ? '1 / -1' : 'auto' }}>
    <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: 3 }}>{label}</div>
    <input
      type={type} value={value || ''} maxLength={maxLength}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: '100%', padding: '6px 10px', background: '#2a2a2d', border: '1px solid #333336', borderRadius: 4, color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}
    />
  </div>
);

export default PrintListBlacklistModal;