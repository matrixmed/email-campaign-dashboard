import React, { useState, useCallback, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';
import CreatableSelect from '../ab-testing/CreatableSelect';
import '../../styles/ABTestingPage.css';

const SUB_LISTS = ['JCAD Print List', 'NP+PA Print List', 'JCAD Comp List'];

const PrintListAddModal = ({ initialAction = 'subscribe', availableUnsubLists = [], onClose, onSaved }) => {
  const [action, setAction] = useState(initialAction);
  const [npi, setNpi] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [degree, setDegree] = useState('');
  const [email, setEmail] = useState('');
  const [address1, setAddress1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [company, setCompany] = useState('');
  const [selectedLists, setSelectedLists] = useState([]);
  const [customList, setCustomList] = useState('');
  const [reason, setReason] = useState('');
  const [reasonOptions, setReasonOptions] = useState([]);
  const [lookupBanner, setLookupBanner] = useState(null);
  const [matchedRecord, setMatchedRecord] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE_URL}/api/list-management/print-lists/reasons`)
      .then(r => r.json())
      .then(d => { if (alive && Array.isArray(d.reasons)) setReasonOptions(d.reasons); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const subscribeOptions = SUB_LISTS;
  const unsubscribeOptions = Array.from(new Set([...SUB_LISTS, ...availableUnsubLists]));
  const listOptions = action === 'subscribe' ? subscribeOptions : unsubscribeOptions;

  const toggleList = (l) => {
    setSelectedLists(s => s.includes(l) ? s.filter(x => x !== l) : [...s, l]);
  };

  const runLookup = useCallback(async () => {
    if (!npi && !(firstName && lastName)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/list-management/print-lists/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npi, first_name: firstName, last_name: lastName, address_1: address1 }),
      });
      const data = await res.json();
      if (data.found) {
        const r = data.record;
        setMatchedRecord({ table: r.table_name, id: r.id, npi: r.npi });
        setLookupBanner({ table: r.table_name, npi: r.npi, name: `${r.first_name || ''} ${r.last_name || ''}`.trim(), matchedBy: data.matched_by });
        if (r.first_name && !firstName) setFirstName(r.first_name);
        if (r.last_name && !lastName) setLastName(r.last_name);
        if (r.degree && !degree) setDegree(r.degree);
        if (r.address_1 && !address1) setAddress1(r.address_1);
        if (r.city && !city) setCity(r.city);
        if (r.state && !state) setState(r.state);
        if (r.zipcode && !zipcode) setZipcode(r.zipcode);
        if (r.specialty && !specialty) setSpecialty(r.specialty);
        if (r.npi && !npi) setNpi(r.npi);
      } else {
        setMatchedRecord(null);
        setLookupBanner({ table: null, name: null });
      }
    } catch (_) {}
  }, [npi, firstName, lastName, address1, degree, city, state, zipcode, specialty]);

  const submit = async () => {
    setError(null);
    if (!firstName || !lastName) { setError('First and last name are required.'); return; }
    const customs = customList.split(',').map(s => s.trim()).filter(Boolean);
    const lists = Array.from(new Set([...selectedLists, ...customs]));
    if (!lists.length) { setError('Pick at least one list.'); return; }

    setSubmitting(true);
    try {
      const url = action === 'subscribe'
        ? `${API_BASE_URL}/api/list-management/print-lists/subscribe`
        : `${API_BASE_URL}/api/list-management/print-lists/unsubscribe`;

      let body;
      if (action === 'subscribe') {
        body = {
          npi, first_name: firstName, last_name: lastName, degree, email,
          address_1: address1, city, state, zipcode, specialty, company, lists,
        };
      } else {
        const reasonText = reason.trim() || 'Manually added to unsubscribed';
        body = {
          table: matchedRecord ? matchedRecord.table : null,
          id: matchedRecord ? matchedRecord.id : null,
          npi,
          first_name: firstName, last_name: lastName,
          email,
          address_1: address1, city, state, zipcode,
          specialty, company,
          lists,
          reasons: [reasonText],
        };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
      <div className="aqb-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="aqb-modal-header">
          <h2>{action === 'subscribe' ? 'Add Subscriber' : 'Add to Unsubscribed'}</h2>
          <button className="aqb-modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ padding: '16px 20px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              type="button"
              className={`archive-tab-button ${action === 'subscribe' ? 'active' : ''}`}
              onClick={() => setAction('subscribe')}
            >
              Subscribe
            </button>
            <button
              type="button"
              className={`archive-tab-button ${action === 'unsubscribe' ? 'active' : ''}`}
              onClick={() => setAction('unsubscribe')}
            >
              Unsubscribe (e.g. Hot Topics)
            </button>
          </div>

          {lookupBanner && lookupBanner.table && (
            <div style={{ padding: 8, marginBottom: 12, background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', borderRadius: 4, color: '#86efac', fontSize: '0.85rem' }}>
              Match in <code>{lookupBanner.table}</code>{lookupBanner.name ? ` — ${lookupBanner.name}` : ''}{lookupBanner.matchedBy === 'name_only' ? ' (name-only match — verify address)' : ''}. Lists will be appended to this record.
            </div>
          )}
          {lookupBanner && !lookupBanner.table && (
            <div style={{ padding: 8, marginBottom: 12, background: 'rgba(217,184,127,0.1)', border: '1px solid #d9b87f', borderRadius: 4, color: '#d9b87f', fontSize: '0.85rem' }}>
              No match — will be created in <code>print_only_contacts</code>.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="NPI" value={npi} onChange={setNpi} onBlur={runLookup} />
            <Field label="Degree" value={degree} onChange={setDegree} />
            <Field label="First Name *" value={firstName} onChange={setFirstName} onBlur={runLookup} />
            <Field label="Last Name *" value={lastName} onChange={setLastName} onBlur={runLookup} />
            <Field label="Email" value={email} onChange={setEmail} type="email" />
            <Field label="Specialty" value={specialty} onChange={setSpecialty} />
            <Field label="Address" value={address1} onChange={setAddress1} onBlur={runLookup} fullWidth />
            <Field label="City" value={city} onChange={setCity} />
            <Field label="State" value={state} onChange={setState} maxLength={2} />
            <Field label="Zip" value={zipcode} onChange={setZipcode} />
            <Field label="Company" value={company} onChange={setCompany} fullWidth />
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: '0.85rem', color: '#b8b8b8', marginBottom: 6 }}>Lists *</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {listOptions.map(l => (
                <label key={l} style={{
                  cursor: 'pointer', padding: '4px 10px', borderRadius: 4, fontSize: '0.85rem',
                  border: '1px solid ' + (selectedLists.includes(l) ? '#0ff' : '#333336'),
                  background: selectedLists.includes(l) ? 'rgba(0,255,255,0.08)' : '#2a2a2d',
                  color: selectedLists.includes(l) ? '#0ff' : '#ddd',
                }}>
                  <input type="checkbox" checked={selectedLists.includes(l)} onChange={() => toggleList(l)} style={{ display: 'none' }} />
                  {l}
                </label>
              ))}
            </div>
            {action === 'unsubscribe' && (
              <input
                type="text" placeholder="Other lists (comma separated)"
                value={customList} onChange={e => setCustomList(e.target.value)}
                style={{ marginTop: 8, width: '100%', padding: 8, background: '#2a2a2d', border: '1px solid #333336', borderRadius: 4, color: '#fff', fontSize: '0.85rem' }}
              />
            )}
          </div>

          {action === 'unsubscribe' && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: '0.85rem', color: '#b8b8b8', marginBottom: 6 }}>Reason</div>
              <CreatableSelect
                value={reason}
                options={reasonOptions}
                onChange={(val) => {
                  setReason(val);
                  if (val && !reasonOptions.includes(val)) {
                    setReasonOptions(prev => [...prev, val].sort());
                  }
                }}
                placeholder="Select"
              />
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
          <button onClick={submit} disabled={submitting} className="export-button">
            {submitting ? 'Saving…' : action === 'subscribe' ? 'Subscribe' : 'Add to Unsubscribed'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, onBlur, placeholder, type = 'text', maxLength, fullWidth }) => (
  <div style={{ gridColumn: fullWidth ? '1 / -1' : 'auto' }}>
    <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: 3 }}>{label}</div>
    <input
      type={type} value={value || ''} maxLength={maxLength}
      onChange={e => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      style={{ width: '100%', padding: '6px 10px', background: '#2a2a2d', border: '1px solid #333336', borderRadius: 4, color: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}
    />
  </div>
);

export default PrintListAddModal;