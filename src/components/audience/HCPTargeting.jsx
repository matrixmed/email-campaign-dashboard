import React, { useState, useEffect, useMemo, useCallback } from 'react';
import '../../styles/CampaignPerformancePage.css';
import '../../styles/ReportsManager.css';
import '../../styles/NPIQuickLookup.css';
import { matchesSearchTerm } from '../../utils/searchUtils';
import { API_BASE_URL } from '../../config/api';
import TablePagination from '../common/TablePagination';
import HCPProfileModal from './HCPProfileModal';

const PER_PAGE = 100;

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
  const [currentPage, setCurrentPage] = useState(1);
  const [trendCat, setTrendCat] = useState('all');
  const [sourceLookup, setSourceLookup] = useState({ by_email: {}, by_npi: {} });
  const [modalHCP, setModalHCP] = useState(null);
  const [modalIndex, setModalIndex] = useState(-1);

  useEffect(() => {
    fetch(HCP_BLOB).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
    fetch(TRENDS_BLOB).then(r => r.json()).then(d => setTrendsData(d)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!data?.hcp_profiles) return;
    const profiles = Object.values(data.hcp_profiles);
    const emails = [...new Set(profiles.map(p => (p.email || '').toLowerCase()).filter(Boolean))];
    const npis = [...new Set(profiles.map(p => p.npi).filter(Boolean))];
    if (emails.length === 0 && npis.length === 0) return;
    fetch(`${API_BASE_URL}/api/users/source-status-lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails, npis })
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) setSourceLookup({ by_email: d.by_email || {}, by_npi: d.by_npi || {} });
      })
      .catch(() => {});
  }, [data]);

  const lookupSource = useCallback((profile) => {
    const byNpi = profile.npi ? sourceLookup.by_npi[profile.npi] : null;
    if (byNpi) return byNpi;
    const em = (profile.email || '').toLowerCase();
    return em ? (sourceLookup.by_email[em] || null) : null;
  }, [sourceLookup]);

  const groupTypes = useMemo(() => {
    if (!data?.hcp_profiles) return { disease: { label: 'Disease State', groups: [] }, medium: { label: 'Content Medium', groups: [] }, special: { label: 'Engagement', groups: ['Non-Engagers'] } };
    const diseaseCounts = {};
    const mediumCounts = {};
    Object.values(data.hcp_profiles).forEach(p => {
      if (p.is_anonymous_ga) return;
      (p.disease_groups || []).forEach(g => { diseaseCounts[g] = (diseaseCounts[g] || 0) + 1; });
      (p.medium_groups || []).forEach(g => { mediumCounts[g] = (mediumCounts[g] || 0) + 1; });
    });
    return {
      disease: { label: 'Disease State', groups: Object.keys(diseaseCounts).sort((a, b) => diseaseCounts[b] - diseaseCounts[a]) },
      medium: { label: 'Content Medium', groups: Object.keys(mediumCounts).sort((a, b) => mediumCounts[b] - mediumCounts[a]) },
      special: { label: 'Engagement', groups: ['Non-Engagers'] },
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
      rows = rows.filter(r =>
        matchesSearchTerm(r.name, externalSearch) ||
        matchesSearchTerm(r.email, externalSearch) ||
        matchesSearchTerm(r.npi, externalSearch) ||
        matchesSearchTerm(r.specialty, externalSearch)
      );
    } else if (activeGroupType === 'disease') {
      rows = rows.filter(r => !r.is_anonymous_ga && r.topics?.some(t => t.ta === activeGroup));
    } else if (activeGroupType === 'medium') {
      rows = rows.filter(r => !r.is_anonymous_ga && r.medium_groups?.includes(activeGroup));
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

  const openModal = (hcp, idx) => {
    setModalHCP(hcp);
    setModalIndex(idx);
  };

  const closeModal = () => {
    setModalHCP(null);
    setModalIndex(-1);
  };

  const navigateModal = (dir) => {
    const start = (currentPage - 1) * PER_PAGE;
    const vis = filtered.slice(start, start + PER_PAGE);
    const newIdx = modalIndex + dir;
    if (newIdx >= 0 && newIdx < vis.length) {
      setModalHCP(vis[newIdx]);
      setModalIndex(newIdx);
    }
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

  const exportCSV = useCallback(() => {
    const header = 'NPI,Name,Email,Specialty,City,State,Source,Status,Affinity,Campaigns Opened,Campaigns Clicked,GA Verified\n';
    const rows = filtered.map(h => {
      const info = lookupSource(h) || {};
      const src = info.source || '';
      const stat = info.is_active === true ? 'Active' : (info.is_active === false ? 'Inactive' : '');
      return `${h.npi || ''},${(h.name || '').trim()},${h.email},${h.specialty || ''},${h.city || ''},${h.state || ''},${src},${stat},${h._score?.toFixed(1)},${h._opened || 0},${h._clicked || 0},${h.ga_matched ? 'Yes' : 'No'}`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hcp_targeting_${activeGroup.replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered, activeGroup, lookupSource]);

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: '#8a8a8a' }}>Loading HCP targeting data...</div>;
  if (!data) return <div style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>Failed to load data.</div>;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageStart = (currentPage - 1) * PER_PAGE;
  const visibleData = filtered.slice(pageStart, pageStart + PER_PAGE);

  return (
    <div className="shadow-engagers">
      <div className="section-header-bar" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, fontFamily: "'Lora', serif" }}>HCP Targeting</h4>
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
              <button key={key} onClick={() => { setActiveGroupType(key); setActiveGroup(val.groups[0]); setCurrentPage(1); }}
                style={{ padding: '4px 12px', border: '1px solid var(--color-border, #333336)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', background: activeGroupType === key ? 'rgba(0, 255, 255, 0.1)' : 'transparent', color: activeGroupType === key ? '#0ff' : '#8a8a8a' }}>
                {val.label}
              </button>
            ))}
          </div>

          <div className="archive-agency-tabs" style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
            <style>{`.archive-agency-tabs::-webkit-scrollbar { display: none; }`}</style>
            {groupTypes[activeGroupType].groups.map(g => (
              <button key={g} className={`archive-tab-button ${activeGroup === g ? 'active' : ''}`}
                onClick={() => { setActiveGroup(g); setCurrentPage(1); }}>
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
            {filtered.length > 0 && (
              <button className="export-button" onClick={exportCSV}>Export CSV</button>
            )}
          </div>

          <div className="x-table-container">
            <table className="results-table">
              <thead>
                <tr>
                  {[['name','Name'],['npi','NPI'],['specialty','Specialty'],['location','Location'],['source','Source'],['status','Status'],['score','Affinity'],['opened','Opened'],['clicked','Clicked'],['total_clicks','Total Clicks'],['ga','GA']].map(([key, label]) => (
                    <th key={key} onClick={!['location','npi','ga','source','status'].includes(key) ? () => handleSort(key) : undefined} className={!['location','npi','ga','source','status'].includes(key) ? 'sortable' : ''}>
                      {label} {sortField === key ? (sortDir === 'asc' ? '\u25B2' : '\u25BC') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleData.map((h, i) => {
                  const info = lookupSource(h) || {};
                  return (
                  <tr key={i} onClick={() => openModal(h, i)} style={{ cursor: 'pointer' }}>
                    <td>{h.name?.trim() || '\u2014'}</td>
                    <td style={{ fontFamily: "'Courier New', monospace", fontSize: '0.8rem' }}>{h.npi || '\u2014'}</td>
                    <td>{h.specialty || '\u2014'}</td>
                    <td>{[h.city, h.state].filter(Boolean).join(', ') || '\u2014'}</td>
                    <td>
                      {info.source ? (
                        <span className={`source-badge ${info.source.toLowerCase()}`}>{info.source}</span>
                      ) : ''}
                    </td>
                    <td>
                      {info.is_active === true ? (
                        <span className="status-badge active">Active</span>
                      ) : info.is_active === false ? (
                        <span className="status-badge inactive">Inactive</span>
                      ) : ''}
                    </td>
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
                  );
                })}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
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

export default HCPTargeting;