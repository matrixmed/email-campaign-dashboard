import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import '../../styles/CampaignPerformancePage.css';
import '../../styles/ReportsManager.css';
import '../../styles/NPIQuickLookup.css';
import '../../styles/AudienceQueryBuilder.css';
import '../../styles/SectionHeaders.css';
import { API_BASE_URL } from '../../config/api';
import TablePagination from '../common/TablePagination';
import HCPProfileModal from './HCPProfileModal';

const PER_PAGE = 100;

const stripUrl = (url) => {
  if (!url) return '';
  return url.replace(/^https?:\/\/(www\.)?/, '').split('?')[0];
};

const formatDuration = (sec) => {
  if (!sec) return '—';
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s`;
  return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
};

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const PageViewers = ({ externalSearch = '' }) => {
  const [urlInput, setUrlInput] = useState('');
  const [submittedUrl, setSubmittedUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [onlyIdentified, setOnlyIdentified] = useState(false);
  const [sortField, setSortField] = useState('engagement_sec');
  const [sortDir, setSortDir] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [modalHCP, setModalHCP] = useState(null);
  const [modalIndex, setModalIndex] = useState(-1);
  const debounceRef = useRef(null);

  const runLookup = useCallback((url) => {
    const u = (url || '').trim();
    if (!u) return;
    setSubmittedUrl(u);
    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentPage(1);
    fetch(`${API_BASE_URL}/api/ga-insights/url-viewers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: u }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) setResult(d);
        else setError(d.error || 'Lookup failed');
        setLoading(false);
      })
      .catch(e => { setError(e.message || 'Network error'); setLoading(false); });
  }, []);

  useEffect(() => {
    const q = urlInput.trim().toLowerCase();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 3) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(() => {
      fetch(`${API_BASE_URL}/api/ga-insights/top-urls?days=120&limit=12&q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(d => { if (d.success) setSuggestions(d.urls || []); })
        .catch(() => {});
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [urlInput]);

  useEffect(() => {
    if (externalSearch && externalSearch.trim()) {
      setUrlInput(externalSearch.trim());
      runLookup(externalSearch.trim());
    }
  }, [externalSearch, runLookup]);

  const viewers = useMemo(() => {
    let rows = result?.viewers || [];
    if (onlyIdentified) rows = rows.filter(v => v.identified);
    rows = [...rows].sort((a, b) => {
      let av, bv;
      if (sortField === 'name') { av = a.name || 'zzz'; bv = b.name || 'zzz'; }
      else { av = a[sortField] || 0; bv = b[sortField] || 0; }
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return rows;
  }, [result, onlyIdentified, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const viewerToHCP = (v) => {
    if (v.identified) {
      return {
        email: v.email, npi: v.npi, name: v.name, specialty: v.specialty,
        city: v.hcp_city, state: v.hcp_state, user_pseudo_id: v.user_pseudo_id,
        ga_matched: true, is_anonymous_ga: false,
        ga_profile: { recent_events: [] },
      };
    }
    return {
      name: `GA User ${(v.user_pseudo_id || '').slice(0, 12)}...`,
      is_anonymous_ga: true, user_pseudo_id: v.user_pseudo_id,
      city: v.ga_city, ga_profile: { recent_events: [] },
    };
  };

  const openModal = (v, idx) => { setModalHCP(viewerToHCP(v)); setModalIndex(idx); };
  const closeModal = () => { setModalHCP(null); setModalIndex(-1); };
  const navigateModal = (dir) => {
    const start = (currentPage - 1) * PER_PAGE;
    const vis = viewers.slice(start, start + PER_PAGE);
    const ni = modalIndex + dir;
    if (ni >= 0 && ni < vis.length) { setModalHCP(viewerToHCP(vis[ni])); setModalIndex(ni); }
  };

  const exportCSV = useCallback(() => {
    const header = 'GA ID,Identified,Name,Email,NPI,Specialty,HCP Location,Confidence,Page Views,Sessions,Dwell (sec),GA City,Device,First Seen,Last Seen\n';
    const rows = viewers.map(v => [
      v.user_pseudo_id, v.identified ? 'Yes' : 'No', (v.name || '').trim(), v.email || '', v.npi || '',
      v.specialty || '', [v.hcp_city, v.hcp_state].filter(Boolean).join(' '), v.confidence ?? '',
      v.page_views, v.sessions, v.engagement_sec, v.ga_city || '', v.device || '',
      v.first_seen || '', v.last_seen || '',
    ].map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `page_viewers_${stripUrl(submittedUrl).replace(/[^a-z0-9]+/gi, '_').slice(0, 60)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [viewers, submittedUrl]);

  const totalPages = Math.max(1, Math.ceil(viewers.length / PER_PAGE));
  const pageStart = (currentPage - 1) * PER_PAGE;
  const visibleData = viewers.slice(pageStart, pageStart + PER_PAGE);
  const summary = result?.summary;

  return (
    <div className="shadow-engagers">
      <div className="query-section">
        <div className="section-header-bar">
          <h3>Specific Landing Page Viewers</h3>
        </div>
        <div className="query-section-content">
          <div className="query-form">
            <div className="form-group full-width">
              <label>Landing Page URL</label>
              <input
                type="text"
                list="page-viewers-suggestions"
                placeholder="Enter URL"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') runLookup(urlInput); }}
              />
              <datalist id="page-viewers-suggestions">
                {suggestions.map((s, i) => (
                  <option key={i} value={s.url_clean}>{`${s.viewers} viewers · ${s.page_views} views`}</option>
                ))}
              </datalist>
            </div>
            <div>
              <button
                type="button"
                className="mode-button active"
                style={{ flex: 'none', padding: '10px 28px' }}
                onClick={() => runLookup(urlInput)}
              >
                {loading ? 'Looking up…' : 'Look up'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '2rem', color: '#8a8a8a' }}>Loading viewers…</div>}
      {error && <div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>{error}</div>}

      {result && summary && (
        <>
          <div className="hpm-stat-grid" style={{ margin: '16px 0 10px' }}>
            <div className="hpm-stat"><div className="hpm-stat-label">Total Viewers</div><div className="hpm-stat-value">{summary.total_viewers.toLocaleString()}</div></div>
            <div className="hpm-stat"><div className="hpm-stat-label">Identified HCPs</div><div className="hpm-stat-value" style={{ color: '#22c55e' }}>{summary.identified_hcps.toLocaleString()}</div></div>
            <div className="hpm-stat"><div className="hpm-stat-label">Anonymous</div><div className="hpm-stat-value">{summary.anonymous.toLocaleString()}</div></div>
            <div className="hpm-stat"><div className="hpm-stat-label">Total Page Views</div><div className="hpm-stat-value">{summary.total_page_views.toLocaleString()}</div></div>
            <div className="hpm-stat"><div className="hpm-stat-label">Total Time</div><div className="hpm-stat-value">{formatDuration(summary.total_engagement_sec)}</div></div>
          </div>

          <div className="shadow-table-controls" style={{ background: 'var(--color-bg-card, #2a2a2d)', border: '1px solid var(--color-border, #333336)', borderRadius: '4px', padding: '8px 12px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="shadow-result-count" title={submittedUrl} style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stripUrl(submittedUrl)}</span>
            <label style={{ fontSize: '0.78rem', color: '#b8b8b8', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input type="checkbox" checked={onlyIdentified} onChange={e => { setOnlyIdentified(e.target.checked); setCurrentPage(1); }} />
              Identified only
            </label>
            <span className="shadow-result-count">{viewers.length.toLocaleString()} shown</span>
            {viewers.length > 0 && <button className="export-button" onClick={exportCSV}>Export CSV</button>}
          </div>

          <div className="x-table-container">
            <table className="results-table">
              <thead>
                <tr>
                  {[['name', 'Viewer'], ['specialty', 'Specialty'], ['confidence', 'Match'], ['page_views', 'Views'], ['sessions', 'Sessions'], ['engagement_sec', 'Dwell'], ['location', 'GA Location'], ['last_seen', 'Last Seen'], ['gaid', 'GA ID']].map(([key, label]) => (
                    <th key={key}
                      onClick={!['location', 'gaid'].includes(key) ? () => handleSort(key) : undefined}
                      className={!['location', 'gaid'].includes(key) ? 'sortable' : ''}>
                      {label} {sortField === key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleData.map((v, i) => (
                  <tr key={i} onClick={() => openModal(v, i)} style={{ cursor: 'pointer' }}>
                    <td>
                      {v.identified
                        ? <span style={{ fontWeight: 600 }}>{v.name || v.email || `NPI ${v.npi}`}</span>
                        : <span style={{ color: '#8a8a8a' }}>Anonymous</span>}
                    </td>
                    <td>{v.specialty || '—'}</td>
                    <td>
                      {v.identified ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <span style={{ color: v.confidence >= 90 ? '#22c55e' : v.confidence >= 70 ? '#f59e0b' : '#8a8a8a', fontWeight: 600 }}>{v.confidence ?? '—'}{v.confidence != null ? '%' : ''}</span>
                          {v.distinct_ga_cities >= 3 && <span title={`GA activity spans ${v.distinct_ga_cities} cities — shared device/proxy likely`} style={{ color: '#ef4444', fontSize: '0.7rem' }}>⚠</span>}
                        </span>
                      ) : '—'}
                    </td>
                    <td>{v.page_views}</td>
                    <td>{v.sessions}</td>
                    <td>{formatDuration(v.engagement_sec)}</td>
                    <td>{[v.ga_city, v.device].filter(Boolean).join(' · ') || '—'}</td>
                    <td>{formatDate(v.last_seen)}</td>
                    <td style={{ fontFamily: "'Courier New', monospace", fontSize: '0.72rem', color: '#8a8a8a' }}>{(v.user_pseudo_id || '').slice(0, 16)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <TablePagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}

      {modalHCP && (
        <HCPProfileModal
          hcp={modalHCP}
          position={`${modalIndex + 1} of ${visibleData.length}`}
          hasPrev={modalIndex > 0}
          hasNext={modalIndex < visibleData.length - 1}
          onPrev={() => navigateModal(-1)}
          onNext={() => navigateModal(1)}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

export default PageViewers;