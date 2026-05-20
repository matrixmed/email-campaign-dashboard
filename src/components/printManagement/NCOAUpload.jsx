import React, { useState, useMemo } from 'react';
import { API_BASE_URL } from '../../config/api';
import '../../styles/DMABreakdown.css';
import '../../styles/SectionHeaders.css';
import '../../styles/PrintManagement.css';

const API = API_BASE_URL;

const TABLE_LABEL = {
  universal_profiles: 'Universal',
  user_profiles: 'Audience',
  print_only_contacts: 'Print-only',
  print_list_subscribers: 'Print List',
};

const SIDE_LABEL = {
  mailing: 'mailing',
  practice: 'practice',
  address: 'address',
};

const renderListChips = (lists) => {
  if (!lists || lists.length === 0) return <span style={{ color: '#666', fontSize: '0.75rem' }}>—</span>;
  return lists.map(l => (
    <span key={l} className="badge badge-list" style={{ marginRight: 4 }}>{l}</span>
  ));
};

const renderUnsubLists = (entry) => {
  const cur = entry.current_lists || [];
  const past = entry.current_unsubscribed_lists || [];
  if (cur.length > 0) {
    return (
      <div>
        <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: 2 }}>Will be cleared:</div>
        {cur.map(l => (
          <span key={l} className="badge badge-list" style={{ marginRight: 4, background: 'rgba(239,68,68,0.15)', borderColor: '#ef4444', color: '#fca5a5' }}>{l}</span>
        ))}
      </div>
    );
  }
  if (past.length > 0) {
    return (
      <div style={{ fontSize: '0.75rem', color: '#888' }}>
        <em>Already off all lists.</em> Flag + status will still be applied.
      </div>
    );
  }
  return <span style={{ color: '#666', fontSize: '0.75rem', fontStyle: 'italic' }}>Not on any list. Flag + status only.</span>;
};

const TABLE_BG = {
  universal_profiles: 'rgba(0,255,255,0.1)',
  user_profiles: 'rgba(34,197,94,0.1)',
  print_only_contacts: 'rgba(217,184,127,0.1)',
  print_list_subscribers: 'rgba(168,85,247,0.1)',
};
const TABLE_FG = {
  universal_profiles: '#0ff',
  user_profiles: '#86efac',
  print_only_contacts: '#d9b87f',
  print_list_subscribers: '#c4b5fd',
};

const tableTag = (table, side) => (
  <span style={{
    display: 'inline-block', padding: '1px 6px', borderRadius: 3, fontSize: '0.7rem',
    background: TABLE_BG[table] || 'rgba(148,163,184,0.1)',
    color: TABLE_FG[table] || '#cbd5e1',
    border: '1px solid currentColor', whiteSpace: 'nowrap',
  }}>
    {TABLE_LABEL[table] || table}
    {side && side !== 'address' ? ` · ${SIDE_LABEL[side]}` : ''}
  </span>
);

const NCOAUpload = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedUpdates, setSelectedUpdates] = useState(new Set());
  const [selectedUndelv, setSelectedUndelv] = useState(new Set());

  const clearAll = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setLoading(false);
    setConfirming(false);
    setSelectedUpdates(new Set());
    setSelectedUndelv(new Set());
    const input = document.getElementById('ncoa-file-input');
    if (input) input.value = '';
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setPreview(null);
      setResult(null);
      setError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dma-drop-active');
    const f = e.dataTransfer.files[0];
    if (f && f.name.toLowerCase().endsWith('.csv')) {
      setFile(f);
      setPreview(null);
      setResult(null);
      setError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('dma-drop-active');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dma-drop-active');
  };

  const handleProcess = async () => {
    if (!file) {
      setError('Please upload a CSV file');
      return;
    }
    setLoading(true);
    setError(null);
    setPreview(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API}/api/list-management/ncoa/preview`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process file');
      setPreview(data);
      setSelectedUpdates(new Set((data.address_updates || []).map((_, i) => i)));
      setSelectedUndelv(new Set((data.undeliverable || []).map((_, i) => i)));
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setConfirming(true);

    const toApply = {
      address_updates: (preview.address_updates || []).filter((_, i) => selectedUpdates.has(i)),
      undeliverable: (preview.undeliverable || []).filter((_, i) => selectedUndelv.has(i)),
    };

    try {
      const res = await fetch(`${API}/api/list-management/ncoa/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toApply),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply changes');
      setResult(data);
      setPreview(null);
      setFile(null);
    } catch (e) {
      setError(e.message);
    }
    setConfirming(false);
  };

  const toggleUpdate = (idx) => {
    setSelectedUpdates(prev => {
      const s = new Set(prev);
      if (s.has(idx)) s.delete(idx); else s.add(idx);
      return s;
    });
  };

  const toggleUndelv = (idx) => {
    setSelectedUndelv(prev => {
      const s = new Set(prev);
      if (s.has(idx)) s.delete(idx); else s.add(idx);
      return s;
    });
  };

  const updatesGrouped = useMemo(() => {
    const groups = new Map();
    (preview?.address_updates || []).forEach((u, i) => {
      if (!groups.has(u.csv_idx)) groups.set(u.csv_idx, []);
      groups.get(u.csv_idx).push({ ...u, _i: i });
    });
    return Array.from(groups.values());
  }, [preview]);

  const undelvGrouped = useMemo(() => {
    const groups = new Map();
    (preview?.undeliverable || []).forEach((u, i) => {
      if (!groups.has(u.csv_idx)) groups.set(u.csv_idx, []);
      groups.get(u.csv_idx).push({ ...u, _i: i });
    });
    return Array.from(groups.values());
  }, [preview]);

  return (
    <>
      <div className="section-header-bar">
        <h3>NCOA Address Update</h3>
        <button className="section-header-clear-btn" onClick={clearAll}>Clear</button>
      </div>

      <div className="dma-breakdown">
        <div
          className="dma-drop-zone"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById('ncoa-file-input').click()}
        >
          <input
            id="ncoa-file-input"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <p>Drag and drop NCOA CSV</p>
          <p className="dma-drop-or">or</p>
          <p className="dma-drop-browse">Click to browse</p>
        </div>

        {file && (
          <div className="dma-file-list">
            <div className="dma-file-chip">
              <span>{file.name}</span>
              <button onClick={() => { setFile(null); setPreview(null); }}>&times;</button>
            </div>
          </div>
        )}

        <div className="dma-actions">
          <button className="dma-btn-process" onClick={handleProcess}>
            {loading ? 'Processing...' : 'Process NCOA File'}
          </button>
        </div>

        {error && <div className="dma-error">{error}</div>}

        {preview && (
          <div className="dma-results">
            <div className="dma-summary">
              <div className="dma-stat">
                <span className="dma-stat-value">{preview.summary?.total_rows}</span>
                <span className="dma-stat-label">Total Rows</span>
              </div>
              {preview.summary?.deduped !== preview.summary?.total_rows && (
                <div className="dma-stat">
                  <span className="dma-stat-value">{preview.summary?.deduped}</span>
                  <span className="dma-stat-label">After Dedup</span>
                </div>
              )}
              <div className="dma-stat">
                <span className="dma-stat-value" style={{ color: '#4ade80' }}>{preview.address_updates?.length || 0}</span>
                <span className="dma-stat-label">Address Updates</span>
              </div>
              <div className="dma-stat">
                <span className="dma-stat-value" style={{ color: '#f87171' }}>{preview.undeliverable?.length || 0}</span>
                <span className="dma-stat-label">Undeliverable</span>
              </div>
              {preview.already_current?.length > 0 && (
                <div className="dma-stat">
                  <span className="dma-stat-value" style={{ color: '#888' }}>{preview.already_current.length}</span>
                  <span className="dma-stat-label">Already Current</span>
                </div>
              )}
              {preview.not_found?.length > 0 && (
                <div className="dma-stat dma-stat-warn">
                  <span className="dma-stat-value">{preview.not_found.length}</span>
                  <span className="dma-stat-label">Not Found</span>
                </div>
              )}
            </div>

            {preview.address_updates?.length > 0 && (
              <>
                <h4 className="print-preview-label">
                  Address Updates ({selectedUpdates.size} of {preview.address_updates.length} selected)
                </h4>
                <div className="dma-table-wrapper" style={{ maxHeight: 320, marginBottom: 16 }}>
                  <table className="dma-table">
                    <thead>
                      <tr>
                        <th style={{ width: 30 }}>
                          <input type="checkbox"
                            checked={selectedUpdates.size === preview.address_updates.length}
                            onChange={e => setSelectedUpdates(e.target.checked ? new Set(preview.address_updates.map((_, i) => i)) : new Set())}
                            style={{ accentColor: 'var(--color-accent, #0ff)' }}
                          />
                        </th>
                        <th>Name</th>
                        <th>Target</th>
                        <th>NPI</th>
                        <th>Lists</th>
                        <th>Old Address</th>
                        <th>New Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {updatesGrouped.map((group, gi) => group.map((u, ri) => (
                        <tr key={`${u.csv_idx}-${u._i}`} style={ri === 0 && gi > 0 ? { borderTop: '2px solid #333336' } : {}}>
                          <td>
                            <input type="checkbox" checked={selectedUpdates.has(u._i)} onChange={() => toggleUpdate(u._i)}
                              style={{ accentColor: 'var(--color-accent, #0ff)' }} />
                          </td>
                          <td>{ri === 0 ? u.name : <span style={{ color: '#666' }}>↳</span>}</td>
                          <td>{tableTag(u.table, u.side)}</td>
                          <td style={{ fontFamily: "'Courier New', monospace", fontSize: '0.75rem' }}>{u.npi || '—'}</td>
                          <td>{renderListChips(u.current_lists)}</td>
                          <td style={{ color: '#f87171', whiteSpace: 'normal', fontSize: '0.8rem' }}>{u.old_address}{u.old_city ? `, ${u.old_city}, ${u.old_state}` : ''}</td>
                          <td style={{ color: '#4ade80', whiteSpace: 'normal', fontSize: '0.8rem' }}>{u.new_address}</td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {preview.undeliverable?.length > 0 && (
              <>
                <h4 className="print-preview-label">
                  Undeliverable / Unsubscribe ({selectedUndelv.size} of {preview.undeliverable.length} selected)
                </h4>
                <div className="dma-table-wrapper" style={{ maxHeight: 320, marginBottom: 16 }}>
                  <table className="dma-table">
                    <thead>
                      <tr>
                        <th style={{ width: 30 }}>
                          <input type="checkbox"
                            checked={selectedUndelv.size === preview.undeliverable.length}
                            onChange={e => setSelectedUndelv(e.target.checked ? new Set(preview.undeliverable.map((_, i) => i)) : new Set())}
                            style={{ accentColor: 'var(--color-accent, #0ff)' }}
                          />
                        </th>
                        <th>Name</th>
                        <th>Target</th>
                        <th>NPI</th>
                        <th>Lists Cleared</th>
                        <th>Code</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {undelvGrouped.map((group, gi) => group.map((u, ri) => (
                        <tr key={`${u.csv_idx}-${u._i}`} style={ri === 0 && gi > 0 ? { borderTop: '2px solid #333336' } : {}}>
                          <td>
                            <input type="checkbox" checked={selectedUndelv.has(u._i)} onChange={() => toggleUndelv(u._i)}
                              style={{ accentColor: 'var(--color-accent, #0ff)' }} />
                          </td>
                          <td>{ri === 0 ? u.name : <span style={{ color: '#666' }}>↳</span>}</td>
                          <td>{tableTag(u.table, u.side)}</td>
                          <td style={{ fontFamily: "'Courier New', monospace", fontSize: '0.75rem' }}>{u.npi || '—'}</td>
                          <td>{renderUnsubLists(u)}</td>
                          <td style={{ fontFamily: "'Courier New', monospace" }}>{u.return_code || '—'}</td>
                          <td style={{ whiteSpace: 'normal', fontSize: '0.8rem' }}>{u.decoded}</td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {preview.already_current?.length > 0 && (
              <details style={{ marginBottom: 12 }}>
                <summary style={{ cursor: 'pointer', color: '#888', fontSize: '0.85rem', padding: '6px 0' }}>
                  Already Current ({preview.already_current.length}) — already at the new address, no action needed
                </summary>
                <div className="dma-table-wrapper" style={{ maxHeight: 200 }}>
                  <table className="dma-table">
                    <thead>
                      <tr><th>Name</th><th>Target</th><th>NPI</th><th>Note</th></tr>
                    </thead>
                    <tbody>
                      {preview.already_current.map((n, i) => (
                        <tr key={i}>
                          <td>{n.name}</td>
                          <td>{tableTag(n.table, n.side)}</td>
                          <td style={{ fontFamily: "'Courier New', monospace", fontSize: '0.75rem' }}>{n.npi || '—'}</td>
                          <td style={{ color: '#888', fontSize: '0.8rem' }}>{n.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}

            {preview.not_found?.length > 0 && (
              <details style={{ marginBottom: 12 }}>
                <summary style={{ cursor: 'pointer', color: '#f87171', fontSize: '0.85rem', padding: '6px 0' }}>
                  Not Found ({preview.not_found.length}) — name + old address didn't match anyone in our DB
                </summary>
                <div className="dma-table-wrapper" style={{ maxHeight: 220 }}>
                  <table className="dma-table">
                    <thead>
                      <tr><th>Name</th><th>Old Address</th><th>Code</th><th>Reason</th></tr>
                    </thead>
                    <tbody>
                      {preview.not_found.map((n, i) => (
                        <tr key={i}>
                          <td>{n.name}</td>
                          <td style={{ fontSize: '0.8rem' }}>{n.old_address}</td>
                          <td>{n.return_code || '—'}</td>
                          <td style={{ fontSize: '0.8rem', color: '#888' }}>{n.decoded}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}

            <div className="dma-actions">
              <button className="dma-btn-process" onClick={handleConfirm} disabled={confirming || (selectedUpdates.size === 0 && selectedUndelv.size === 0)}>
                {confirming ? 'Applying...' : `Apply ${selectedUpdates.size} Updates, ${selectedUndelv.size} Unsubscribes`}
              </button>
              <button className="section-header-clear-btn" onClick={clearAll}>Cancel</button>
            </div>
          </div>
        )}

        {result && (
          <div className="dma-results">
            <div className="dma-summary">
              <div className="dma-stat">
                <span className="dma-stat-value" style={{ color: '#4ade80' }}>{result.applied?.address_updates ?? 0}</span>
                <span className="dma-stat-label">Addresses Updated</span>
              </div>
              <div className="dma-stat">
                <span className="dma-stat-value" style={{ color: '#f87171' }}>{result.applied?.undeliverable ?? 0}</span>
                <span className="dma-stat-label">Unsubscribed (Undeliverable)</span>
              </div>
              {result.errors?.length > 0 && (
                <div className="dma-stat dma-stat-warn">
                  <span className="dma-stat-value">{result.errors.length}</span>
                  <span className="dma-stat-label">Errors</span>
                </div>
              )}
            </div>
            {result.errors?.length > 0 && (
              <div style={{ padding: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 4, color: '#fca5a5', fontSize: '0.8rem', marginBottom: 12 }}>
                <div style={{ marginBottom: 4, fontWeight: 600 }}>Errors:</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {result.errors.slice(0, 10).map((er, i) => (
                    <li key={i}>{er.table}#{er.csv_idx}: {er.error}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="dma-actions">
              <button className="section-header-clear-btn" onClick={clearAll}>Process Another File</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default NCOAUpload;