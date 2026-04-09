import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import '../../styles/CampaignPerformancePage.css';
import '../../styles/CampaignModal.css';
import '../../styles/ReportsManager.css';

const BLOB_ACCOUNT = 'emaildash';
const BLOB_CONTAINER = 'json-data';
const SAS_TOKEN = process.env.REACT_APP_AZURE_SAS_TOKEN;
const HCP_BLOB = `https://${BLOB_ACCOUNT}.blob.core.windows.net/${BLOB_CONTAINER}/hcp_cluster_blob.json?${SAS_TOKEN}`;
const TRENDS_BLOB = `https://${BLOB_ACCOUNT}.blob.core.windows.net/${BLOB_CONTAINER}/hcp_trends_blob.json?${SAS_TOKEN}`;

const HCPTargeting = ({ externalSearch = '' }) => {
  const [data, setData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('hcp');
  const [activeGroupType, setActiveGroupType] = useState('disease');
  const [activeGroup, setActiveGroup] = useState('');
  const [sortField, setSortField] = useState('score');
  const [sortDir, setSortDir] = useState('desc');
  const [displayCount, setDisplayCount] = useState(50);
  const [modalHCP, setModalHCP] = useState(null);
  const [modalTab, setModalTab] = useState('overview');
  const [modalIndex, setModalIndex] = useState(-1);
  const [expandedSession, setExpandedSession] = useState(null);
  const [trendCat, setTrendCat] = useState('all');
  const modalRef = useRef(null);

  useEffect(() => {
    fetch(HCP_BLOB).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
    fetch(TRENDS_BLOB).then(r => r.json()).then(d => setTrendsData(d)).catch(() => {});
  }, []);

  const groupTypes = useMemo(() => {
    if (!data?.hcp_profiles) return { disease: { label: 'Disease State', groups: [] }, medium: { label: 'Content Medium', groups: [] }, special: { label: 'Engagement', groups: ['Non-Engagers', 'Anonymous GA Users'] } };
    const diseaseCounts = {};
    const mediumCounts = {};
    Object.values(data.hcp_profiles).forEach(p => {
      if (p.is_anonymous_ga) return;
      (p.disease_groups || []).forEach(g => { diseaseCounts[g] = (diseaseCounts[g] || 0) + 1; });
      (p.medium_groups || p.content_mediums || []).forEach(g => { mediumCounts[g] = (mediumCounts[g] || 0) + 1; });
    });
    return {
      disease: { label: 'Disease State', groups: Object.keys(diseaseCounts).sort((a, b) => diseaseCounts[b] - diseaseCounts[a]) },
      medium: { label: 'Content Medium', groups: Object.keys(mediumCounts).sort((a, b) => mediumCounts[b] - mediumCounts[a]) },
      special: { label: 'Engagement', groups: ['Non-Engagers', 'Anonymous GA Users'] },
    };
  }, [data]);

  useEffect(() => {
    if (groupTypes.disease.groups.length > 0 && !activeGroup) {
      setActiveGroup(groupTypes.disease.groups[0]);
    }
  }, [groupTypes, activeGroup]);

  const filtered = useMemo(() => {
    if (!data?.hcp_profiles) return [];
    let rows = Object.values(data.hcp_profiles);

    if (externalSearch.trim()) {
      const term = externalSearch.toLowerCase();
      rows = rows.filter(r =>
        (r.name && r.name.toLowerCase().includes(term)) ||
        (r.email && r.email.toLowerCase().includes(term)) ||
        (r.npi && r.npi.includes(term)) ||
        (r.specialty && r.specialty.toLowerCase().includes(term))
      );
    } else if (activeGroupType === 'disease') {
      rows = rows.filter(r => !r.is_anonymous_ga && r.topics?.some(t => t.ta === activeGroup));
    } else if (activeGroupType === 'medium') {
      rows = rows.filter(r => !r.is_anonymous_ga && (r.medium_preferences?.[activeGroup.toLowerCase()] > 0 || r.content_mediums?.includes(activeGroup)));
    } else if (activeGroup === 'Non-Engagers') {
      rows = rows.filter(r => !r.is_anonymous_ga && !r.topics?.length && !r.total_clicks);
    } else if (activeGroup === 'Anonymous GA Users') {
      rows = rows.filter(r => r.is_anonymous_ga);
    }

    rows = rows.map(r => {
      const topic = r.topics?.find(t => t.ta === activeGroup);
      return {
        ...r,
        _score: topic?.score || (r.topics?.length ? Math.max(...r.topics.map(t => t.score)) : 0),
        _opened: topic?.opened || 0,
        _clicked: topic?.clicked || 0,
      };
    });

    rows.sort((a, b) => {
      let av, bv;
      if (sortField === 'score') { av = a._score; bv = b._score; }
      else if (sortField === 'name') { av = a.name || ''; bv = b.name || ''; }
      else if (sortField === 'specialty') { av = a.specialty || ''; bv = b.specialty || ''; }
      else if (sortField === 'opened') { av = a._opened; bv = b._opened; }
      else if (sortField === 'clicked') { av = a._clicked; bv = b._clicked; }
      else if (sortField === 'total_clicks') { av = a.total_clicks || 0; bv = b.total_clicks || 0; }
      else { av = a._score; bv = b._score; }
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });

    return rows;
  }, [data, externalSearch, activeGroupType, activeGroup, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const openModal = (hcp, idx) => { setModalHCP(hcp); setModalIndex(idx); setModalTab('overview'); setExpandedSession(null); };

  const navigateModal = (dir) => {
    const vis = filtered.slice(0, displayCount);
    const newIdx = modalIndex + dir;
    if (newIdx >= 0 && newIdx < vis.length) { setModalHCP(vis[newIdx]); setModalIndex(newIdx); setModalTab('overview'); setExpandedSession(null); }
  };

  const formatLastUpdated = (iso) => {
    if (!iso) return 'Unknown';
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now - d) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDate = (iso) => { if (!iso) return '\u2014'; return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); };
  const formatDateTime = (iso) => { if (!iso) return '\u2014'; const d = new Date(iso); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); };
  const stripUrl = (url) => { if (!url) return '\u2014'; return url.replace(/^https?:\/\/(www\.)?/, '').split('?')[0]; };
  const formatDuration = (ms) => { if (!ms) return '\u2014'; const s = ms / 1000; if (s < 60) return `${s.toFixed(0)}s`; return `${Math.floor(s/60)}m ${Math.round(s%60)}s`; };

  const exportCSV = useCallback(() => {
    const header = 'NPI,Name,Email,Specialty,City,State,Affinity,Campaigns Opened,Campaigns Clicked,GA Verified\n';
    const rows = filtered.map(h => `${h.npi || ''},${(h.name || '').trim()},${h.email},${h.specialty || ''},${h.city || ''},${h.state || ''},${h._score?.toFixed(1)},${h._opened || 0},${h._clicked || 0},${h.ga_matched ? 'Yes' : 'No'}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hcp_targeting_${activeGroup.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered, activeGroup]);

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: '#8a8a8a' }}>Loading HCP targeting data...</div>;
  if (!data) return <div style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>Failed to load data.</div>;

  const visibleData = filtered.slice(0, displayCount);

  return (
    <div className="shadow-engagers">
      <div className="section-header-bar" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, fontFamily: "'Lora', serif", color: 'var(--color-accent, #0ff)' }}>HCP Targeting</h4>
        <div className="anomaly-mode-toggle">
          <button className={`mode-toggle-btn ${viewMode === 'hcp' ? 'active' : ''}`} onClick={() => setViewMode('hcp')}>HCP</button>
          <button className={`mode-toggle-btn ${viewMode === 'trends' ? 'active' : ''}`} onClick={() => setViewMode('trends')}>Trends</button>
        </div>
      </div>

      {viewMode === 'trends' && (
        trendsData?.sections?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {trendsData.sections.map((section, si) => (
              <div key={si} style={{ background: 'var(--color-bg-card, #2a2a2d)', border: '1px solid var(--color-border, #333336)', borderRadius: '8px', padding: '20px' }}>
                <h4 style={{ margin: '0 0 16px', fontFamily: "'Lora', serif", color: 'var(--color-accent, #0ff)', fontSize: '1rem' }}>{section.title}</h4>

                {section.type === 'funnel' && section.data?.stages && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px', marginBottom: '12px' }}>
                      {section.data.stages.map((s, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>{s.value.toLocaleString()}</div>
                          <div style={{ width: '100%', background: `rgba(0, 255, 255, ${0.15 + (1 - i / section.data.stages.length) * 0.6})`, borderRadius: '4px 4px 0 0', height: `${Math.max(s.pct, 5)}%` }} />
                          <div style={{ fontSize: '0.7rem', color: '#8a8a8a', textAlign: 'center' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    {section.data.insight && <div style={{ fontSize: '0.8rem', color: '#b8b8b8', marginTop: '8px' }}>{section.data.insight}</div>}
                  </div>
                )}

                {section.type === 'stat_grid' && section.data?.items && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                    {section.data.items.map((item, i) => (
                      <div key={i} style={{ padding: '12px', background: 'var(--color-bg-elevated, #222224)', borderRadius: '6px' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0ff', marginBottom: '4px' }}>{item.value}</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{item.label}</div>
                        <div style={{ fontSize: '0.7rem', color: '#8a8a8a' }}>{item.detail}</div>
                      </div>
                    ))}
                  </div>
                )}

                {section.type === 'bar_chart' && section.data?.bars && (
                  <div>
                    {section.data.bars.map((bar, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <span style={{ width: '130px', fontSize: '0.85rem', flexShrink: 0 }}>{bar.label}</span>
                        <div style={{ flex: 1, height: '20px', background: 'var(--color-bg-elevated, #222224)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                          <div style={{ width: `${(bar.value / Math.max(...section.data.bars.map(b => b.value))) * 100}%`, height: '100%', background: 'linear-gradient(90deg, rgba(0,255,255,0.3), rgba(0,255,255,0.6))', borderRadius: '4px' }} />
                          <span style={{ position: 'absolute', right: '8px', top: '2px', fontSize: '0.75rem', fontWeight: 600, color: '#fff' }}>{bar.value}{bar.unit}</span>
                        </div>
                      </div>
                    ))}
                    {section.data.insight && <div style={{ fontSize: '0.8rem', color: '#b8b8b8', marginTop: '12px' }}>{section.data.insight}</div>}
                  </div>
                )}

                {section.type === 'comparison' && section.data?.items && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {section.data.items.map((item, i) => (
                      <div key={i} style={{ padding: '12px', background: 'var(--color-bg-elevated, #222224)', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>{item.label}</span>
                          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0ff' }}>{item.stat}</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#8a8a8a', lineHeight: 1.4 }}>{item.detail}</div>
                      </div>
                    ))}
                  </div>
                )}

                {section.type === 'connections' && section.data?.pairs && (
                  <div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                      {section.data.pairs.map((pair, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--color-bg-elevated, #222224)', borderRadius: '6px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0ff' }}>{pair.from}</span>
                          <span style={{ color: pair.strength === 'strong' ? '#0ff' : '#8a8a8a', fontSize: '1.2rem' }}>{'\u2194'}</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0ff' }}>{pair.to}</span>
                          <span style={{ fontSize: '0.7rem', color: '#8a8a8a', marginLeft: 'auto' }}>{pair.strength}</span>
                        </div>
                      ))}
                    </div>
                    {section.data.insight && <div style={{ fontSize: '0.8rem', color: '#b8b8b8' }}>{section.data.insight}</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#8a8a8a' }}>Trends data not yet available. Run the trends analysis to populate.</div>
        )
      )}

      {viewMode === 'hcp' && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            {Object.entries(groupTypes).map(([key, val]) => (
              <button key={key} onClick={() => { setActiveGroupType(key); setActiveGroup(val.groups[0]); setDisplayCount(50); }}
                style={{ padding: '4px 12px', border: '1px solid var(--color-border, #333336)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', background: activeGroupType === key ? 'rgba(0, 255, 255, 0.1)' : 'transparent', color: activeGroupType === key ? '#0ff' : '#8a8a8a' }}>
                {val.label}
              </button>
            ))}
          </div>

          <div className="archive-agency-tabs" style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
            <style>{`.archive-agency-tabs::-webkit-scrollbar { display: none; }`}</style>
            {groupTypes[activeGroupType].groups.map(g => (
              <button key={g} className={`archive-tab-button ${activeGroup === g ? 'active' : ''}`}
                onClick={() => { setActiveGroup(g); setDisplayCount(50); }}>
                {g}
              </button>
            ))}
          </div>

          <div className="shadow-table-controls" style={{ background: 'var(--color-bg-card, #2a2a2d)', border: '1px solid var(--color-border, #333336)', borderRadius: '4px', padding: '8px 12px', marginBottom: '4px' }}>
            <div className="last-updated-tag">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M7 4V7L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>Last synced: {formatLastUpdated(data.generated_at)}</span>
            </div>
            <span className="shadow-result-count">{filtered.length.toLocaleString()} results</span>
            <button type="button" className="btn-export" style={{ background: 'linear-gradient(135deg, #27ae60, #229954)', borderColor: '#229954' }} onClick={exportCSV}>Export CSV</button>
          </div>

          <div className="x-table-container">
            <table className="results-table">
              <thead>
                <tr>
                  {[['name','Name'],['npi','NPI'],['specialty','Specialty'],['location','Location'],['score','Affinity'],['opened','Opened'],['clicked','Clicked'],['total_clicks','Total Clicks'],['ga','GA']].map(([key, label]) => (
                    <th key={key} onClick={!['location','npi','ga'].includes(key) ? () => handleSort(key) : undefined} className={!['location','npi','ga'].includes(key) ? 'sortable' : ''}>
                      {label} {sortField === key ? (sortDir === 'asc' ? '\u25B2' : '\u25BC') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleData.map((h, i) => (
                  <tr key={i} onClick={() => openModal(h, i)} style={{ cursor: 'pointer' }}>
                    <td>{h.name?.trim() || '\u2014'}</td>
                    <td style={{ fontFamily: "'Courier New', monospace", fontSize: '0.8rem' }}>{h.npi || '\u2014'}</td>
                    <td>{h.specialty || '\u2014'}</td>
                    <td>{[h.city, h.state].filter(Boolean).join(', ') || '\u2014'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '50px', height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(h._score, 100)}%`, height: '100%', background: '#0ff', borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{h._score?.toFixed(0)}</span>
                      </div>
                    </td>
                    <td>{h._opened}</td>
                    <td>{h._clicked}</td>
                    <td>{h.total_clicks || 0}</td>
                    <td>{h.ga_matched ? <span style={{ color: '#22c55e', fontWeight: 700 }}>&#10003;</span> : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length > displayCount && (
            <div className="load-more-container">
              <button type="button" className="btn-load-more" onClick={() => setDisplayCount(prev => prev + 100)}>
                Load More ({visibleData.length} of {filtered.length})
              </button>
            </div>
          )}
        </>
      )}

      {modalHCP && (
        <div className="campaign-modal-overlay" onClick={e => { if (e.target === e.currentTarget && !e.target.closest('.modal-nav-arrow')) setModalHCP(null); }}>
          {modalIndex > 0 && (
            <button className="modal-nav-arrow modal-nav-left" onClick={() => navigateModal(-1)} aria-label="Previous HCP">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
          )}
          {modalIndex < visibleData.length - 1 && (
            <button className="modal-nav-arrow modal-nav-right" onClick={() => navigateModal(1)} aria-label="Next HCP">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          )}

          <div className="campaign-modal" ref={modalRef}>
            <div className="campaign-modal-header">
              <h3>{modalHCP.name?.trim() || modalHCP.email || 'Anonymous GA User'}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="modal-position">{modalIndex + 1} of {Math.min(displayCount, filtered.length)}</span>
                <button className="modal-close-button" onClick={() => setModalHCP(null)}>&times;</button>
              </div>
            </div>

            <div className="campaign-modal-info">
              <div className="campaign-modal-info-left" style={{ flexWrap: 'wrap' }}>
                {modalHCP.npi && <div className="info-pill"><span className="info-label">NPI</span><span className="info-value">{modalHCP.npi}</span></div>}
                {modalHCP.specialty && <div className="info-pill"><span className="info-label">Specialty</span><span className="info-value">{modalHCP.specialty}</span></div>}
                {modalHCP.degree && <div className="info-pill"><span className="info-label">Degree</span><span className="info-value">{modalHCP.degree}</span></div>}
                {(modalHCP.city || modalHCP.state) && <div className="info-pill"><span className="info-label">Location</span><span className="info-value">{[modalHCP.city, modalHCP.state, modalHCP.zipcode].filter(Boolean).join(', ')}</span></div>}
                {modalHCP.email && <div className="info-pill"><span className="info-label">Email</span><span className="info-value">{modalHCP.email}</span></div>}
                {modalHCP.ga_matched && <div className="info-pill" style={{ borderColor: '#22c55e' }}><span className="info-label" style={{ color: '#22c55e' }}>GA Status</span><span className="info-value" style={{ color: '#22c55e' }}>Cross-Channel Verified</span></div>}
                {modalHCP.user_pseudo_id && <div className="info-pill"><span className="info-label">GA ID</span><span className="info-value" style={{ fontFamily: "'Courier New', monospace", fontSize: '0.75rem' }}>{modalHCP.user_pseudo_id}</span></div>}
              </div>
            </div>

            <div className="archive-agency-tabs" style={{ marginTop: '16px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style>{`.archive-agency-tabs::-webkit-scrollbar { display: none; }`}</style>
              {['overview', 'email', 'ga', 'path'].map(tab => (
                <button key={tab} className={`archive-tab-button ${modalTab === tab ? 'active' : ''}`} onClick={() => setModalTab(tab)}>
                  {tab === 'overview' ? 'Overview' : tab === 'email' ? 'Email Activity' : tab === 'ga' ? 'GA Sessions' : 'Journey Path'}
                </button>
              ))}
            </div>

            {modalTab === 'overview' && (
              <div style={{ marginTop: '20px' }}>
                {(modalHCP.disease_groups?.length > 0 || modalHCP.medium_groups?.length > 0 || modalHCP.avoids?.length > 0) && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    {modalHCP.disease_groups?.map((g, i) => (
                      <span key={`d${i}`} style={{ padding: '3px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, background: 'rgba(0, 255, 255, 0.1)', color: '#0ff' }}>{g}</span>
                    ))}
                    {modalHCP.medium_groups?.map((g, i) => (
                      <span key={`m${i}`} style={{ padding: '3px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>{g}</span>
                    ))}
                    {modalHCP.avoids?.map((g, i) => (
                      <span key={`a${i}`} style={{ padding: '3px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', textDecoration: 'line-through' }}>{g}</span>
                    ))}
                  </div>
                )}

                {modalHCP.engagement_by_disease && Object.keys(modalHCP.engagement_by_disease).length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ color: '#0ff', fontFamily: "'Lora', serif", marginBottom: '12px', fontSize: '0.95rem' }}>Engagement by Disease State</h4>
                    {Object.entries(modalHCP.engagement_by_disease).sort((a, b) => (b[1].clicked || 0) - (a[1].clicked || 0)).map(([disease, stats], i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{ width: '160px', fontSize: '0.85rem', flexShrink: 0 }}>{disease}</span>
                        <div style={{ width: '60px', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min((stats.clicked || 0) / Math.max(...Object.values(modalHCP.engagement_by_disease).map(s => s.clicked || 1)) * 100, 100)}%`, height: '100%', background: (stats.clicked || 0) > 0 ? '#0ff' : '#ef4444', borderRadius: '4px', opacity: (stats.clicked || 0) > 0 ? 1 : 0.3 }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#8a8a8a', whiteSpace: 'nowrap' }}>
                          {stats.sent || 0} sent / {stats.opened || 0} opened / {stats.clicked || 0} clicked
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {!modalHCP.engagement_by_disease && modalHCP.topics?.length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ color: '#0ff', fontFamily: "'Lora', serif", marginBottom: '12px', fontSize: '0.95rem' }}>Topic Affinity</h4>
                    {modalHCP.topics.map((t, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{ width: '160px', fontSize: '0.85rem', flexShrink: 0 }}>{t.ta}</span>
                        <div style={{ width: '60px', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(t.score, 100)}%`, height: '100%', background: '#0ff', borderRadius: '2px' }} />
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, width: '35px', textAlign: 'right' }}>{t.score.toFixed(0)}</span>
                        <span style={{ fontSize: '0.75rem', color: '#8a8a8a', width: '90px' }}>{t.opened}o / {t.clicked}c</span>
                      </div>
                    ))}
                  </div>
                )}

                {modalHCP.engagement_by_content_type && Object.keys(modalHCP.engagement_by_content_type).length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ color: '#0ff', fontFamily: "'Lora', serif", marginBottom: '12px', fontSize: '0.95rem' }}>Engagement by Content Type</h4>
                    {Object.entries(modalHCP.engagement_by_content_type).sort((a, b) => (b[1].clicked || 0) - (a[1].clicked || 0)).map(([type, stats], i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{ width: '160px', fontSize: '0.85rem', flexShrink: 0 }}>{type}</span>
                        <div style={{ width: '60px', height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min((stats.clicked || 0) / Math.max(...Object.values(modalHCP.engagement_by_content_type).map(s => s.clicked || 1)) * 100, 100)}%`, height: '100%', background: '#a78bfa', borderRadius: '2px' }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#8a8a8a', width: '120px', textAlign: 'right' }}>
                          {stats.opened || 0} opened / {stats.clicked || 0} clicked
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {modalHCP.click_categories && Object.keys(modalHCP.click_categories).length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ color: '#0ff', fontFamily: "'Lora', serif", marginBottom: '12px', fontSize: '0.95rem' }}>Click Categories</h4>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {Object.entries(modalHCP.click_categories).sort((a, b) => b[1] - a[1]).map(([cat, count], i) => (
                        <div key={i} style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border, #333336)', borderRadius: '4px' }}>
                          <div style={{ fontSize: '0.7rem', color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cat}</div>
                          <div style={{ fontSize: '1rem', fontWeight: 600 }}>{count}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(modalHCP.ga_matched || modalHCP.ga_profile) && (
                  <div>
                    <h4 style={{ color: '#0ff', fontFamily: "'Lora', serif", marginBottom: '12px', fontSize: '0.95rem' }}>GA Browsing Overview</h4>
                    <div className="campaign-metrics-summary">
                      <div className="metric-summary-card"><div className="metric-summary-label">Sessions</div><div className="metric-summary-value">{modalHCP.ga_profile?.total_sessions || modalHCP.ga_sessions?.length || 0}</div></div>
                      <div className="metric-summary-card"><div className="metric-summary-label">Page Views</div><div className="metric-summary-value">{modalHCP.ga_profile?.page_views || 0}</div></div>
                      <div className="metric-summary-card"><div className="metric-summary-label">Total Time</div><div className="metric-summary-value">{formatDuration((modalHCP.ga_profile?.total_engagement_sec || 0) * 1000)}</div></div>
                      <div className="metric-summary-card"><div className="metric-summary-label">Scrolls</div><div className="metric-summary-value">{modalHCP.ga_profile?.scrolls || 0}</div></div>
                    </div>
                    {modalHCP.ga_profile?.pages_visited?.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#8a8a8a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Top Pages Visited</div>
                        {modalHCP.ga_profile.pages_visited.slice(0, 8).map((p, i) => (
                          <div key={i} style={{ fontSize: '0.8rem', color: '#b8b8b8', padding: '2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stripUrl(p)}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {modalTab === 'email' && (
              <div style={{ marginTop: '20px' }}>
                {modalHCP.recent_clicks?.length > 0 && (
                  <>
                    <h4 style={{ color: '#0ff', fontFamily: "'Lora', serif", marginBottom: '12px' }}>Click History</h4>
                    <div className="x-table-container" style={{ marginBottom: '24px' }}>
                      <table className="results-table">
                        <thead><tr><th>Date</th><th>URL</th><th>Campaign</th></tr></thead>
                        <tbody>
                          {modalHCP.recent_clicks.map((c, i) => (
                            <tr key={i}>
                              <td style={{ whiteSpace: 'nowrap' }}>{formatDate(c.ts)}</td>
                              <td style={{ maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.url}>{stripUrl(c.url)}</td>
                              <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.campaign || '\u2014'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
                {modalHCP.top_campaigns?.length > 0 && (
                  <>
                    <h4 style={{ color: '#0ff', fontFamily: "'Lora', serif", marginBottom: '12px' }}>Campaigns Opened</h4>
                    <div className="x-table-container">
                      <table className="results-table">
                        <thead><tr><th>Campaign</th><th>Opens</th></tr></thead>
                        <tbody>
                          {modalHCP.top_campaigns.map((c, i) => (
                            <tr key={i}>
                              <td style={{ maxWidth: '500px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</td>
                              <td>{c.opens}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
                {!modalHCP.recent_clicks?.length && !modalHCP.top_campaigns?.length && (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#8a8a8a' }}>No email engagement data.</div>
                )}
              </div>
            )}

            {modalTab === 'ga' && (
              <div style={{ marginTop: '20px' }}>
                {modalHCP.ga_profile?.recent_events?.length > 0 ? (
                  <>
                    <h4 style={{ color: '#0ff', fontFamily: "'Lora', serif", marginBottom: '12px' }}>Sessions</h4>
                    {(() => {
                      const sessions = {};
                      (modalHCP.ga_profile?.recent_events || []).forEach(e => {
                        const sid = e.session_id || 'unknown';
                        if (!sessions[sid]) sessions[sid] = { events: [], firstTs: e.ts, city: e.city, device: e.device, source: e.source };
                        sessions[sid].events.push(e);
                        if (e.ts && (!sessions[sid].firstTs || e.ts < sessions[sid].firstTs)) sessions[sid].firstTs = e.ts;
                      });
                      return Object.entries(sessions).sort((a, b) => (b[1].firstTs || '').localeCompare(a[1].firstTs || '')).map(([sid, sess], i) => {
                        const totalEngagement = sess.events.reduce((sum, e) => sum + (e.engagement_ms || 0), 0);
                        const pageViews = sess.events.filter(e => e.event === 'page_view').length;
                        const isExpanded = expandedSession === sid;
                        return (
                          <div key={i} style={{ marginBottom: '8px', border: '1px solid var(--color-border, #333336)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div onClick={() => setExpandedSession(isExpanded ? null : sid)}
                              style={{ padding: '10px 14px', background: 'var(--color-bg-elevated, #222224)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '0.85rem' }}>
                                <span style={{ color: '#0ff', fontWeight: 600 }}>{formatDateTime(sess.firstTs)}</span>
                                <span>{pageViews} pages</span>
                                <span>{formatDuration(totalEngagement)}</span>
                                <span style={{ color: '#8a8a8a' }}>{sess.city} / {sess.device}</span>
                              </div>
                              <span style={{ color: '#8a8a8a', fontSize: '0.8rem' }}>{isExpanded ? '\u25B2' : '\u25BC'}</span>
                            </div>
                            {isExpanded && (
                              <div style={{ padding: '12px 14px' }}>
                                {sess.events.sort((a, b) => (a.ts || '').localeCompare(b.ts || '')).map((e, j) => (
                                  <div key={j} style={{ display: 'flex', gap: '12px', padding: '4px 0', borderBottom: '1px solid rgba(51,51,54,0.5)', fontSize: '0.8rem' }}>
                                    <span style={{ color: '#8a8a8a', minWidth: '70px' }}>{e.ts ? new Date(e.ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }) : '\u2014'}</span>
                                    <span style={{ minWidth: '100px', color: e.event === 'page_view' ? '#0ff' : e.event === 'scroll' ? '#22c55e' : e.event === 'click' ? '#f59e0b' : '#8a8a8a' }}>{e.event}</span>
                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.url}>{stripUrl(e.url)}</span>
                                    {e.engagement_ms && <span style={{ color: '#8a8a8a' }}>{formatDuration(e.engagement_ms)}</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </>
                ) : modalHCP.ga_sessions?.length > 0 ? (
                  <>
                    <h4 style={{ color: '#0ff', fontFamily: "'Lora', serif", marginBottom: '12px' }}>Probabilistic GA Matches</h4>
                    <div className="x-table-container">
                      <table className="results-table">
                        <thead><tr><th>Confidence</th><th>Landing Page</th><th>City</th><th>Device</th><th>Source</th><th>Email URL</th></tr></thead>
                        <tbody>
                          {modalHCP.ga_sessions.map((s, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 600, color: s.confidence >= 80 ? '#22c55e' : s.confidence >= 60 ? '#f59e0b' : '#8a8a8a' }}>{s.confidence?.toFixed(0)}%</td>
                              <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={s.landing}>{s.landing || '\u2014'}</td>
                              <td>{s.city || '\u2014'}</td>
                              <td>{s.device || '\u2014'}</td>
                              <td>{s.source || '\u2014'}</td>
                              <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={s.email_url}>{stripUrl(s.email_url)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#8a8a8a' }}>No GA session data available.</div>
                )}
              </div>
            )}

            {modalTab === 'path' && (
              <div style={{ marginTop: '20px' }}>
                {(modalHCP.path_events?.length > 0 || modalHCP.ga_profile?.recent_events?.length > 0) ? (
                  <div style={{ position: 'relative', paddingLeft: '28px' }}>
                    <div style={{ position: 'absolute', left: '10px', top: '8px', bottom: '8px', width: '2px', background: '#333336' }} />
                    {[
                      ...(modalHCP.path_events || []).map(e => ({ ...e, source: 'email' })),
                      ...(modalHCP.ga_profile?.recent_events || []).filter(e => e.event === 'page_view').map(e => ({ ts: e.ts, type: 'ga_pageview', url: e.url, source: 'ga', engagement_ms: e.engagement_ms, city: e.city })),
                    ].sort((a, b) => (b.ts || '').localeCompare(a.ts || '')).map((e, i) => {
                      const isGA = e.source === 'ga';
                      const isSocial = e.type === 'social_click';
                      const dotColor = isGA ? '#22c55e' : isSocial ? '#ec4899' : '#0ff';
                      const label = isGA ? 'GA' : isSocial ? (e.platform || 'social') : 'email';
                      return (
                        <div key={i} style={{ position: 'relative', marginBottom: '14px', paddingLeft: '16px' }}>
                          <div style={{ position: 'absolute', left: '-22px', top: '6px', width: '10px', height: '10px', borderRadius: '50%', background: dotColor, border: '2px solid #1c1c1e' }} />
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '0.75rem', color: '#8a8a8a', whiteSpace: 'nowrap', minWidth: '90px' }}>{formatDateTime(e.ts)}</span>
                            <div>
                              <span style={{ display: 'inline-block', fontSize: '11px', padding: '1px 8px', borderRadius: '4px', marginRight: '8px', background: isGA ? 'rgba(34,197,94,0.15)' : isSocial ? 'rgba(236,72,153,0.15)' : 'rgba(0,255,255,0.1)', color: dotColor, textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>{label}</span>
                              <span style={{ fontSize: '0.85rem', color: '#e0e0e0' }}>{stripUrl(e.url)}</span>
                              {e.engagement_ms && <span style={{ fontSize: '0.75rem', color: '#8a8a8a', marginLeft: '8px' }}>{formatDuration(e.engagement_ms)}</span>}
                              {e.campaign && <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '2px' }}>via {e.campaign}</div>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#8a8a8a' }}>No journey data available.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HCPTargeting;