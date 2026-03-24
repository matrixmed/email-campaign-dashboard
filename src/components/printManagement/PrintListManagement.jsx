import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { API_BASE_URL } from '../../config/api';
import '../../styles/PrintManagement.css';
import '../../styles/AudienceQueryBuilder.css';
import '../../styles/SectionHeaders.css';
import '../../styles/ListEfficiencyAnalysis.css';

const API = API_BASE_URL;
const VALID_LISTS = ['JCAD', 'NPPA', 'BT'];

const renderListBadges = (lists) => {
  if (!lists) return null;
  return lists.split(',').map(l => l.trim()).filter(Boolean).map(l => (
    <span key={l} className="badge badge-list">{l}</span>
  ));
};

const ManualInputPanel = ({ onRefresh }) => {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detectedAction, setDetectedAction] = useState(null);

  const handleParse = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResults(null);

    const lower = text.toLowerCase();
    const unsubKeywords = ['unsubscribe', 'remove', 'cancel', 'drop', 'take off', 'retired', 'deceased', 'moved', 'no longer', 'left practice', 'do not work', 'business closed'];
    const isUnsub = unsubKeywords.some(k => lower.includes(k));
    const action = isUnsub ? 'unsubscribe' : 'subscribe';
    setDetectedAction(action);

    try {
      const res = await fetch(`${API}/api/print-lists/manual-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, action, confirm: false }),
      });
      const data = await res.json();
      const people = data.parsed || [];

      if (people.length > 0 && action === 'subscribe') {
        for (const person of people) {
          if (person.npi) {
            try {
              const checkRes = await fetch(`${API}/api/print-lists/subscribers?search=${person.npi}&per_page=1`);
              const checkData = await checkRes.json();
              if (checkData.subscribers?.length > 0) {
                const existing = checkData.subscribers[0];
                const existingLists = (existing.subscribed_lists || '').split(',').map(l => l.trim()).filter(Boolean);
                const newLists = person.lists || [];
                const allDups = newLists.length > 0 && newLists.every(l => existingLists.includes(l));
                if (allDups && newLists.length > 0) {
                  person._existingMatch = true;
                  person._existingNote = `Already on ${existingLists.join(', ')}`;
                } else if (existingLists.length > 0) {
                  person._existingNote = `Existing: ${existingLists.join(', ')}`;
                }
                if (!person.address_1 && existing.address_1) {
                  person.address_1 = existing.address_1;
                  person.city = existing.city;
                  person.state = existing.state;
                  person.zipcode = existing.zipcode;
                }
                if (!person.first_name && existing.first_name) {
                  person.first_name = existing.first_name;
                  person.last_name = existing.last_name;
                }
              }
            } catch (e) {}
          }
        }
      }

      setParsed(people);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleConfirm = async (overrideAction) => {
    if (!parsed?.length) return;
    const action = overrideAction || detectedAction;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/print-lists/manual-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, confirm: true, parsed }),
      });
      const data = await res.json();
      setResults(data.results || []);
      setParsed(null);
      setText('');
      onRefresh?.();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const updateParsedField = (idx, field, value) => {
    setParsed(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const removeParsedRow = (idx) => {
    setParsed(prev => prev.filter((_, i) => i !== idx));
  };

  const clearAll = () => { setText(''); setParsed(null); setResults(null); setDetectedAction(null); };

  return (
    <>
      <div className="form-group full-width">
        <textarea
          className="print-textarea"
          value={text}
          onChange={e => setText(e.target.value)}
        />
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="submit-button"
          onClick={handleParse}
        >
          {loading ? 'Parsing...' : 'Parse & Validate'}
        </button>
        {(parsed || results) && (
          <button type="button" className="section-header-clear-btn" onClick={clearAll} style={{ marginLeft: 10 }}>Clear</button>
        )}
      </div>

      {parsed && parsed.length > 0 && (
        <div className="results-section">
          <div className="print-detected-bar">
            <span>
              Detected: <strong className={detectedAction === 'unsubscribe' ? 'print-text-red' : 'print-text-green'}>
                {detectedAction === 'unsubscribe' ? 'Unsubscribe' : 'Subscribe'}
              </strong>
              {' — '}{parsed.length} {parsed.length === 1 ? 'person' : 'people'}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="submit-button" onClick={() => handleConfirm()} disabled={loading}>
                {loading ? 'Applying...' : `Confirm ${detectedAction === 'unsubscribe' ? 'Unsubscribe' : 'Subscribe'}`}
              </button>
              <button type="button" className="print-btn-switch"
                onClick={() => setDetectedAction(prev => prev === 'subscribe' ? 'unsubscribe' : 'subscribe')}>
                Switch to {detectedAction === 'subscribe' ? 'Unsubscribe' : 'Subscribe'}
              </button>
            </div>
          </div>

          <div className="table-container">
            <table className="results-table print-edit-table">
              <thead>
                <tr>
                  <th>NPI</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Degree</th>
                  <th>Address</th>
                  <th>City</th>
                  <th>ST</th>
                  <th>Zip</th>
                  <th>Lists</th>
                  <th>Reason</th>
                  <th>Notes</th>
                  <th>Blacklist</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {parsed.map((p, i) => (
                  <tr key={i} className={p._existingMatch ? 'print-row-warn' : p.suggest_blacklist ? 'print-row-red' : ''}>
                    <td><input className="print-edit-input" value={p.npi || ''} onChange={e => updateParsedField(i, 'npi', e.target.value)} style={{ width: 95 }} /></td>
                    <td><input className="print-edit-input" value={p.first_name || ''} onChange={e => updateParsedField(i, 'first_name', e.target.value)} style={{ width: 90 }} /></td>
                    <td><input className="print-edit-input" value={p.last_name || ''} onChange={e => updateParsedField(i, 'last_name', e.target.value)} style={{ width: 90 }} /></td>
                    <td><input className="print-edit-input" value={p.degree || ''} onChange={e => updateParsedField(i, 'degree', e.target.value)} style={{ width: 50 }} /></td>
                    <td><input className="print-edit-input" value={p.address_1 || ''} onChange={e => updateParsedField(i, 'address_1', e.target.value)} style={{ width: 160 }} /></td>
                    <td><input className="print-edit-input" value={p.city || ''} onChange={e => updateParsedField(i, 'city', e.target.value)} style={{ width: 100 }} /></td>
                    <td><input className="print-edit-input" value={p.state || ''} onChange={e => updateParsedField(i, 'state', e.target.value)} style={{ width: 35 }} /></td>
                    <td><input className="print-edit-input" value={p.zipcode || ''} onChange={e => updateParsedField(i, 'zipcode', e.target.value)} style={{ width: 85 }} /></td>
                    <td><input className="print-edit-input" value={(p.lists || []).join(', ')} onChange={e => updateParsedField(i, 'lists', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} style={{ width: 120 }} /></td>
                    <td><input className="print-edit-input" value={p.reason || ''} onChange={e => updateParsedField(i, 'reason', e.target.value)} style={{ width: 130 }} /></td>
                    <td><input className="print-edit-input" value={p.notes || ''} onChange={e => updateParsedField(i, 'notes', e.target.value)} style={{ width: 120 }} placeholder={p._existingNote || ''} />
                      {p._existingMatch && <span className="print-flag print-flag-amber" style={{ marginTop: 2 }}>Already subscribed</span>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={p.suggest_blacklist || false} onChange={e => updateParsedField(i, 'suggest_blacklist', e.target.checked)} style={{ accentColor: '#f87171', width: 15, height: 15 }} title="Blacklist this address" />
                    </td>
                    <td>
                      <button type="button" onClick={() => removeParsedRow(i)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 16, padding: '2px 6px' }} title="Remove row">&times;</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {parsed && parsed.length === 0 && (
        <div className="error-message" style={{ marginTop: 16 }}>
          <p>Could not parse any subscriber information. Try including an NPI number or a name.</p>
        </div>
      )}

      {results && results.length > 0 && (
        <div className="print-results-list">
          {results.map((r, i) => (
            <div key={i} className={`print-result-item ${r.status === 'ok' ? 'print-result-ok' : 'print-result-warn'}`}>
              <span className="print-result-status">{r.status}</span>
              <span className="print-result-detail">
                <strong>{r.name || r.npi}</strong> — {r.messages?.join('; ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

const DropFilePanel = ({ onRefresh }) => {
  const [targetList, setTargetList] = useState('JCAD');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);

  const clearAll = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setLoading(false);
    setConfirming(false);
    const input = document.getElementById('print-drop-input');
    if (input) input.value = '';
  };

  const handleFile = async (f) => {
    if (!f) return;
    setFile(f);
    setLoading(true);
    setResult(null);
    setPreview(null);

    const formData = new FormData();
    formData.append('file', f);
    formData.append('list', targetList);

    try {
      const res = await fetch(`${API}/api/print-lists/subscription-upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setPreview(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setConfirming(true);

    const formData = new FormData();
    formData.append('confirm', 'true');
    formData.append('data', JSON.stringify({
      target_list: preview.target_list,
      entries: preview.valid || [],
    }));

    try {
      const res = await fetch(`${API}/api/print-lists/subscription-upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setResult(data.applied);
      setPreview(null);
      setFile(null);
      onRefresh?.();
    } catch (e) {
      console.error(e);
    }
    setConfirming(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dma-drop-active');
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.csv')) handleFile(f);
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

  const getRowClass = (entry) => {
    if (entry.status === 'blacklisted' || entry.status === 'ineligible') return 'print-row-red';
    if (entry.status === 'duplicate') return 'print-row-orange';
    if (entry.status === 'missing') return 'print-row-yellow';
    return '';
  };

  return (
    <>
      <div className="form-group full-width">
        <label>Target List</label>
        <div className="search-mode-toggle">
          {VALID_LISTS.map(l => (
            <button key={l} type="button" className={`mode-button ${targetList === l ? 'active' : ''}`} onClick={() => setTargetList(l)}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {!preview && result === null && (
        <div
          className="dma-drop-zone"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById('print-drop-input').click()}
        >
          <input
            id="print-drop-input"
            type="file"
            accept=".csv"
            onChange={e => handleFile(e.target.files[0])}
            style={{ display: 'none' }}
          />
          <p>{loading ? 'Validating...' : 'Drag and drop CSV'}</p>
          <p className="dma-drop-or">or</p>
          <p className="dma-drop-browse">Click to browse</p>
        </div>
      )}

      {file && !preview && !result && (
        <div className="dma-file-list">
          <div className="dma-file-chip">
            <span>{file.name}</span>
            <button onClick={clearAll}>&times;</button>
          </div>
        </div>
      )}

      {preview && (
        <div className="results-section">
          <div className="aggregate-overview">
            <div className="aggregate-grid" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div className="aggregate-stat"><span className="aqb-stat-label">Total Rows</span><span className="aqb-stat-value">{preview.summary?.total}</span></div>
              <div className="aggregate-stat"><span className="aqb-stat-label">Valid</span><span className="aqb-stat-value" style={{ color: '#4ade80' }}>{preview.summary?.valid}</span></div>
              {preview.summary?.issues > 0 && (
                <div className="aggregate-stat"><span className="aqb-stat-label">Issues</span><span className="aqb-stat-value" style={{ color: '#fbbf24' }}>{preview.summary?.issues}</span></div>
              )}
              <div className="aggregate-stat"><span className="aqb-stat-label">Target</span><span className="aqb-stat-value">{preview.target_list}</span></div>
            </div>
          </div>

          {preview.issues?.length > 0 && (
            <div className="sample-data-section">
              <div className="table-header-row">
                <h4 style={{ margin: 0, color: '#fbbf24', fontSize: '1rem' }}>Issues ({preview.issues.length})</h4>
              </div>
              <div className="table-container">
                <table className="results-table">
                  <thead><tr><th>#</th><th>NPI</th><th>Name</th><th>Degree</th><th>Address</th><th>Status</th><th>Details</th></tr></thead>
                  <tbody>
                    {preview.issues.map((entry, i) => (
                      <tr key={i} className={getRowClass(entry)}>
                        <td>{entry.row_num}</td>
                        <td>{entry.npi || '—'}</td>
                        <td>{entry.first_name} {entry.last_name}</td>
                        <td>{entry.degree || '—'}</td>
                        <td>{entry.address_1 || '—'}, {entry.city} {entry.state}</td>
                        <td><span className={`print-status-badge print-status-${entry.status}`}>{entry.status}</span></td>
                        <td style={{ whiteSpace: 'normal', maxWidth: 250 }}>{entry.messages?.join('; ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {preview.valid?.length > 0 && (
            <div className="sample-data-section">
              <div className="table-header-row">
                <h4 style={{ margin: 0, color: 'var(--color-accent, #0ff)', fontSize: '1rem' }}>Ready to Import ({preview.valid.length})</h4>
              </div>
              <div className="table-container">
                <table className="results-table">
                  <thead><tr><th>#</th><th>NPI</th><th>Name</th><th>Degree</th><th>Email</th><th>Address</th><th>City</th><th>ST</th><th>Notes</th></tr></thead>
                  <tbody>
                    {preview.valid.map((entry, i) => (
                      <tr key={i}>
                        <td>{entry.row_num}</td>
                        <td>{entry.npi || '—'}</td>
                        <td>{entry.first_name} {entry.last_name}</td>
                        <td>{entry.degree || '—'}</td>
                        <td>{entry.email || '—'}</td>
                        <td>{entry.address_1 || '—'}</td>
                        <td>{entry.city || '—'}</td>
                        <td>{entry.state || '—'}</td>
                        <td style={{ whiteSpace: 'normal', maxWidth: 200, fontSize: '0.75rem' }}>
                          {[...(entry.auto_corrections || []), ...(entry.messages || [])].join('; ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="submit-button" onClick={handleConfirm} disabled={confirming || !preview.valid?.length}>
              {confirming ? 'Importing...' : `Import ${preview.valid?.length || 0} Subscribers`}
            </button>
            <button type="button" className="section-header-clear-btn" onClick={clearAll} style={{ marginLeft: 10 }}>Cancel</button>
          </div>
        </div>
      )}

      {result !== null && (
        <div className="aggregate-overview" style={{ marginTop: 16 }}>
          <div className="aggregate-grid" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div className="aggregate-stat"><span className="aqb-stat-label">Imported</span><span className="aqb-stat-value" style={{ color: '#4ade80' }}>{result}</span></div>
            <button type="button" className="section-header-clear-btn" onClick={clearAll}>Upload Another</button>
          </div>
        </div>
      )}
    </>
  );
};

const PrintListManagement = ({ externalSearch = '' }) => {
  const [stats, setStats] = useState(null);
  const [inputMode, setInputMode] = useState('manual');
  const [subscribers, setSubscribers] = useState([]);
  const [listFilter, setListFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState(null);
  const [displayCount, setDisplayCount] = useState(25);
  const [isFullyExpanded, setIsFullyExpanded] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimer = useRef(null);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(externalSearch);
      setDisplayCount(25);
      setIsFullyExpanded(false);
    }, 300);
    return () => clearTimeout(searchTimer.current);
  }, [externalSearch]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/print-lists/stats`);
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  }, []);

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: 1, per_page: 10000 });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (listFilter) params.set('list', listFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`${API}/api/print-lists/subscribers?${params}`);
      const data = await res.json();
      setSubscribers(data.subscribers || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('Failed to load subscribers:', e);
    }
    setLoading(false);
  }, [debouncedSearch, listFilter, statusFilter]);

  useEffect(() => { fetchStats(); }, [fetchStats, refreshKey]);
  useEffect(() => { fetchSubscribers(); }, [fetchSubscribers]);

  const handleExport = (listName) => {
    window.open(`${API}/api/print-lists/export/${encodeURIComponent(listName)}`, '_blank');
  };

  const handleRefresh = () => setRefreshKey(k => k + 1);

  const handleSort = (col) => {
    if (sortColumn === col) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  const sortedSubscribers = useMemo(() => {
    if (!sortColumn) return subscribers;
    return [...subscribers].sort((a, b) => {
      let aVal = a[sortColumn] || '';
      let bVal = b[sortColumn] || '';
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [subscribers, sortColumn, sortDirection]);

  const visibleSubscribers = useMemo(() => {
    return sortedSubscribers.slice(0, displayCount);
  }, [sortedSubscribers, displayCount]);

  const hasMore = displayCount < sortedSubscribers.length;

  const handleExportAll = () => {
    if (!subscribers.length) return;
    const headers = ['NPI', 'First Name', 'Last Name', 'Degree', 'Address', 'City', 'State', 'Zip', 'Lists', 'Status'];
    const rows = subscribers.map(s =>
      [s.npi, s.first_name, s.last_name, s.degree, s.address_1, s.city, s.state, s.zipcode, s.subscribed_lists, s.is_subscribed ? 'Active' : 'Inactive']
        .map(v => `"${(v || '').toString().replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `print_subscribers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const SortIndicator = ({ col }) => {
    if (sortColumn !== col) return null;
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div className="print-management">
      <div className="section-header-bar">
        <h3>Print Lists</h3>
        <div className="section-header-stats">
          {stats && VALID_LISTS.map(l => (
            <div key={l} className="section-header-stat-item print-stat-exportable" onClick={() => handleExport(l)} title={`Export ${l}`}>
              <span className="section-header-stat-value">{(stats.list_counts?.[l] || 0).toLocaleString()}</span>
              <span className="section-header-stat-label">{l}</span>
              <span className="print-export-icon">↓</span>
            </div>
          ))}
          {stats && (
            <div className="section-header-stat-item">
              <span className="section-header-stat-value" style={{ color: '#f87171' }}>{stats.total_inactive}</span>
              <span className="section-header-stat-label">Unsub'd</span>
            </div>
          )}
        </div>
      </div>

      <div className="query-section-content">
        <div className="query-form">
          <div className="form-group full-width">
            <label>Input Method</label>
            <div className="search-mode-toggle">
              <button type="button" className={`mode-button ${inputMode === 'manual' ? 'active' : ''}`} onClick={() => setInputMode('manual')}>
                Manual Entry
              </button>
              <button type="button" className={`mode-button ${inputMode === 'drop' ? 'active' : ''}`} onClick={() => setInputMode('drop')}>
                Drop File
              </button>
            </div>
          </div>

          {inputMode === 'manual' && <ManualInputPanel onRefresh={handleRefresh} />}
          {inputMode === 'drop' && <DropFilePanel onRefresh={handleRefresh} />}
        </div>
      </div>

      <div className="section-header-bar" style={{ marginTop: 24 }}>
        <h3>Subscribers</h3>
        <div className="section-header-stats" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="section-header-stat-item">
            <span className="section-header-stat-value">{total.toLocaleString()}</span>
            <span className="section-header-stat-label">Total</span>
          </div>
          <select className="print-filter-select print-filter-header" value={listFilter} onChange={e => { setListFilter(e.target.value); setDisplayCount(25); setIsFullyExpanded(false); }}>
            <option value="">All Lists</option>
            {VALID_LISTS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select className="print-filter-select print-filter-header" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setDisplayCount(25); setIsFullyExpanded(false); }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {sortedSubscribers.length > 25 && (
            <button
              className="btn-expand-table"
              onClick={() => {
                if (isFullyExpanded) {
                  setDisplayCount(25);
                  setIsFullyExpanded(false);
                } else {
                  setDisplayCount(sortedSubscribers.length);
                  setIsFullyExpanded(true);
                }
              }}
            >
              {isFullyExpanded ? 'Collapse' : 'Expand All'}
            </button>
          )}
          <button className="btn-export" onClick={handleExportAll}>Export</button>
        </div>
      </div>

      {loading ? (
        <div className="sample-note">Loading subscribers...</div>
      ) : subscribers.length > 0 ? (
        <div className="results-section" style={{ marginTop: 0 }}>
          <div className="sample-data-section" style={{ background: 'transparent', border: 'none', padding: 0 }}>
            <div className="table-container">
              <table className="results-table">
                <thead>
                  <tr>
                    <th className="sortable" onClick={() => handleSort('npi')}>NPI<SortIndicator col="npi" /></th>
                    <th className="sortable" onClick={() => handleSort('last_name')}>Name<SortIndicator col="last_name" /></th>
                    <th className="sortable" onClick={() => handleSort('degree')}>Degree<SortIndicator col="degree" /></th>
                    <th className="sortable" onClick={() => handleSort('address_1')}>Address<SortIndicator col="address_1" /></th>
                    <th className="sortable" onClick={() => handleSort('city')}>City<SortIndicator col="city" /></th>
                    <th className="sortable" onClick={() => handleSort('state')}>ST<SortIndicator col="state" /></th>
                    <th className="sortable" onClick={() => handleSort('zipcode')}>Zip<SortIndicator col="zipcode" /></th>
                    <th>Lists</th>
                    <th className="sortable" onClick={() => handleSort('is_subscribed')}>Status<SortIndicator col="is_subscribed" /></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSubscribers.map(s => (
                    <tr key={s.id}>
                      <td>{s.npi || '—'}</td>
                      <td>{s.first_name} {s.last_name}</td>
                      <td>{s.degree || '—'}</td>
                      <td>{s.address_1 || '—'}</td>
                      <td>{s.city || '—'}</td>
                      <td>{s.state || '—'}</td>
                      <td>{s.zipcode || '—'}</td>
                      <td>{renderListBadges(s.subscribed_lists)}</td>
                      <td>
                        <span className={`print-status-badge ${s.is_subscribed ? 'print-status-active' : 'print-status-inactive'}`}>
                          {s.is_subscribed ? 'Active' : 'Inactive'}
                        </span>
                        {s.is_comp && <span className="print-status-badge print-status-comp" style={{ marginLeft: 4 }}>Comp</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMore && !isFullyExpanded && (
              <div className="load-more-container">
                <button className="btn-load-more" onClick={() => setDisplayCount(prev => prev + 25)}>
                  Load More ({visibleSubscribers.length} of {sortedSubscribers.length})
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="sample-note">No subscribers found.</div>
      )}
    </div>
  );
};

export default PrintListManagement;