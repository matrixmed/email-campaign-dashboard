import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { API_BASE_URL } from '../../config/api';
import MultiSelectDropdown from '../common/MultiSelectDropdown';
import TablePagination from '../common/TablePagination';
import HCPProfileModal from './HCPProfileModal';
import '../../styles/ReportsManager.css';
import '../../styles/AudienceQueryBuilder.css';
import '../../styles/NPIQuickLookup.css';

const adaptDigitalRowForModal = (m) => ({
  ...m,
  name: [m.first_name, m.last_name].filter(Boolean).join(' '),
});

const PER_PAGE = 100;

const TABS = [
  { key: 'audience', label: 'Audience' },
  { key: 'lists', label: 'Lists' },
  { key: 'tags', label: 'Tags' },
  { key: 'segments', label: 'Segments' },
];

const DigitalListDisplay = ({ externalSearch = '' }) => {
  const [activeTab, setActiveTab] = useState('audience');
  const [audienceStatus, setAudienceStatus] = useState('all');

  const [overview, setOverview] = useState({ lists: null, tags: null, segments: null, audience: null });
  const [selected, setSelected] = useState({ lists: [], tags: [], segments: [] });
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortField, setSortField] = useState('last_name');
  const [sortDir, setSortDir] = useState('asc');
  const [modalRow, setModalRow] = useState(null);
  const [modalIndex, setModalIndex] = useState(-1);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE_URL}/api/list-management/digital-lists/overview`).then(r => r.json()).catch(() => ({})),
      fetch(`${API_BASE_URL}/api/list-management/tags/overview`).then(r => r.json()).catch(() => ({})),
      fetch(`${API_BASE_URL}/api/list-management/segments/overview`).then(r => r.json()).catch(() => ({})),
    ]).then(([l, t, s]) => {
      setOverview({ lists: l, tags: t, segments: s, audience: { active: l.total_subscribed, inactive: l.total_inactive } });
    });
  }, []);

  const listOptions = useMemo(() => {
    const c = overview.lists?.subscribed_counts || {};
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([v, n]) => ({ value: v, count: n }));
  }, [overview.lists]);

  const tagOptions = useMemo(() => {
    const c = overview.tags?.counts || {};
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([v, n]) => ({ value: v, count: n }));
  }, [overview.tags]);

  const segmentOptions = useMemo(() => {
    const c = overview.segments?.counts || {};
    return Object.entries(c).sort((a, b) => b[1] - a[1]).map(([v, n]) => ({ value: v, count: n }));
  }, [overview.segments]);

  const fetchMembers = useCallback((tab, pg, search) => {
    let url = '';
    if (tab === 'audience') {
      const params = new URLSearchParams({ page: pg, per_page: PER_PAGE, search: search || '', status: audienceStatus });
      url = `${API_BASE_URL}/api/list-management/audience?${params}`;
    } else if (tab === 'lists') {
      if (selected.lists.length === 0) { setMembers([]); setTotal(0); setTotalPages(1); return; }
      const params = new URLSearchParams({ lists: selected.lists.join(','), list: selected.lists[0], page: pg, per_page: PER_PAGE, search: search || '' });
      url = `${API_BASE_URL}/api/list-management/digital-lists/members?${params}`;
    } else if (tab === 'tags') {
      if (selected.tags.length === 0) { setMembers([]); setTotal(0); setTotalPages(1); return; }
      const params = new URLSearchParams({ tags: selected.tags.join(','), page: pg, per_page: PER_PAGE, search: search || '' });
      url = `${API_BASE_URL}/api/list-management/tags/members?${params}`;
    } else if (tab === 'segments') {
      if (selected.segments.length === 0) { setMembers([]); setTotal(0); setTotalPages(1); return; }
      const params = new URLSearchParams({ segments: selected.segments.join(','), page: pg, per_page: PER_PAGE, search: search || '' });
      url = `${API_BASE_URL}/api/list-management/segments/members?${params}`;
    }

    setMembersLoading(true);
    fetch(url)
      .then(r => r.json())
      .then(d => {
        setMembers(d.members || []);
        setTotal(d.total || 0);
        setTotalPages(d.total_pages || 1);
        if (d.total_active != null || d.total_inactive != null) {
          setOverview(o => ({ ...o, audience: { active: d.total_active, inactive: d.total_inactive } }));
        }
        setMembersLoading(false);
      })
      .catch(() => setMembersLoading(false));
  }, [selected, audienceStatus]);

  useEffect(() => {
    setPage(1);
    fetchMembers(activeTab, 1, externalSearch);
  }, [activeTab, selected, audienceStatus, externalSearch, fetchMembers]);

  useEffect(() => {
    if (page > 1) fetchMembers(activeTab, page, externalSearch);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      let av = a[sortField] ?? '';
      let bv = b[sortField] ?? '';
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [members, sortField, sortDir]);

  const openProfileModal = (m, idx) => {
    setModalRow(adaptDigitalRowForModal(m));
    setModalIndex(idx);
  };

  const closeProfileModal = () => {
    setModalRow(null);
    setModalIndex(-1);
  };

  const navigateProfileModal = (dir) => {
    const newIdx = modalIndex + dir;
    if (newIdx >= 0 && newIdx < sortedMembers.length) {
      setModalRow(adaptDigitalRowForModal(sortedMembers[newIdx]));
      setModalIndex(newIdx);
    }
  };

  const exportCSV = useCallback(() => {
    const base = ['Email', 'First Name', 'Last Name', 'NPI', 'Specialty', 'Degree', 'City', 'State', 'Source', 'Active'];
    const withReason = activeTab === 'audience' ? [...base, 'Inactive Reason', 'Inactive At'] : base;
    const headers = activeTab === 'audience'
      ? [...withReason, 'Digital Lists', 'Tags', 'Segments']
      : [...base, 'Digital Lists', 'Tags', 'Segments'];

    const rows = sortedMembers.map(m => {
      const fields = [
        m.email || '', m.first_name || '', m.last_name || '', m.npi || '',
        m.specialty || '', m.degree || '', m.city || '', m.state || '',
        m.source || '',
        m.is_active ? 'Yes' : 'No',
      ];
      if (activeTab === 'audience') {
        fields.push(m.inactive_reason || '', m.inactive_at || '');
      }
      fields.push(
        (m.digital_lists_subscribed || []).join(' | '),
        (m.ac_tags || []).join(' | '),
        (m.ac_segments || []).join(' | '),
      );
      return fields.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });
    const blob = new Blob([headers.join(',') + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    let fname = activeTab;
    if (activeTab !== 'audience') {
      const sel = selected[activeTab] || [];
      fname = sel.length === 1 ? sel[0] : `${sel.length}_${activeTab}`;
    }
    a.href = url;
    a.download = `${fname.replace(/[:\s/]+/g, '_')}_digital.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sortedMembers, activeTab, selected]);

  const audienceStats = overview.audience || {};
  const listsCount = overview.lists?.subscribed_counts ? Object.keys(overview.lists.subscribed_counts).length : 0;
  const tagsCount = overview.tags?.counts ? Object.keys(overview.tags.counts).length : 0;
  const segmentsCount = overview.segments?.counts ? Object.keys(overview.segments.counts).length : 0;

  const brandTotals = useMemo(() => {
    const counts = overview.lists?.subscribed_counts || {};
    const countsExQuarantine = overview.lists?.subscribed_counts_ex_jcad_quarantine || {};
    const sumLists = (names) => names.reduce((acc, n) => acc + (counts[n] || 0), 0);
    const sumListsExQuarantine = (names) => names.reduce((acc, n) => acc + (countsExQuarantine[n] || 0), 0);

    const jcadLists = ['JCAD US Subscribers', 'JCAD International Subscribers', 'JCAD NPPA (MMC)', 'JCAD Comp'];

    return [
      { key: 'jcad', label: 'JCAD', value: sumLists(jcadLists), secondary: sumListsExQuarantine(jcadLists) },
      { key: 'nppa', label: 'NPPA', value: sumLists(['JCAD NPPA (MMC)']) },
      { key: 'bt', label: 'BT', value: sumLists(['BT US Subscribers', 'BT Comp']) },
      { key: 'oncology', label: 'Oncology', value: sumLists(['Oncology (MMC)']) },
      { key: 'icns', label: 'ICNS', value: sumLists(['ICNS International Subscribers', 'ICNS US Subscribers']) },
      { key: 'nhr', label: 'NHR', value: sumLists(['Nutrition Health Review']) },
    ];
  }, [overview.lists]);

  return (
    <div className="shadow-engagers">
      <div className="reports-section-header">
        <h3>Digital Audience</h3>
        <div className="reports-header-stats">
          <span className="reports-header-stat-item">
            <span className="reports-header-stat-label">Active:</span>
            <span className="reports-header-stat-value" style={{ color: '#22c55e' }}>{(audienceStats.active || 0).toLocaleString()}</span>
          </span>
          <span className="reports-header-stat-item">
            <span className="reports-header-stat-label">Inactive:</span>
            <span className="reports-header-stat-value" style={{ color: '#888' }}>{(audienceStats.inactive || 0).toLocaleString()}</span>
          </span>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
        marginBottom: '16px',
      }}>
        {brandTotals.map(({ key, label, value, secondary }) => (
          <div key={key} style={{
            background: 'var(--color-bg-card, #2a2a2d)',
            border: '1px solid var(--color-border, #333336)',
            borderRadius: '8px',
            padding: '20px 16px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-secondary, #b8b8b8)',
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: 500,
            }}>
              {label}
            </div>
            <div style={{
              fontFamily: "var(--font-heading, 'Lora', serif)",
              fontSize: '1.5rem',
              fontWeight: 600,
              color: 'var(--color-accent, #0ff)',
              lineHeight: 1.2,
            }}>
              {value.toLocaleString()}
              {secondary != null && (
                <span style={{ color: 'var(--color-text-secondary, #b8b8b8)', fontWeight: 500 }}>
                  {' / '}{secondary.toLocaleString()}
                </span>
              )}
            </div>
            {secondary != null && (
              <div style={{
                fontSize: '0.65rem',
                color: 'var(--color-text-secondary, #888)',
                marginTop: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
              }}>
                Total / Ex-Quarantine
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div className="archive-agency-tabs" style={{ margin: 0, flex: '1 1 auto', minWidth: 0, overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style>{`.archive-agency-tabs::-webkit-scrollbar { display: none; }`}</style>
          {TABS.map(t => {
            let suffix = '';
            if (t.key === 'lists') suffix = ` (${listsCount})`;
            else if (t.key === 'tags') suffix = ` (${tagsCount})`;
            else if (t.key === 'segments') suffix = ` (${segmentsCount})`;
            return (
              <button key={t.key}
                className={`archive-tab-button ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}{suffix}
              </button>
            );
          })}
        </div>
        <div style={{ flex: '0 0 auto' }}>
          {activeTab === 'audience' ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              {[['all', 'All'], ['active', 'Active'], ['inactive', 'Inactive']].map(([val, lbl]) => (
                <button key={val}
                  onClick={() => setAudienceStatus(val)}
                  style={{
                    padding: '6px 12px', borderRadius: '4px', fontSize: '0.8rem', cursor: 'pointer',
                    border: audienceStatus === val ? '1px solid #0ff' : '1px solid #333336',
                    background: audienceStatus === val ? 'rgba(0,255,255,0.08)' : 'var(--color-bg-card, #2a2a2d)',
                    color: audienceStatus === val ? '#0ff' : '#ccc',
                    fontWeight: audienceStatus === val ? 600 : 400,
                  }}
                >
                  {lbl}
                </button>
              ))}
            </div>
          ) : activeTab === 'lists' ? (
            <MultiSelectDropdown
              options={listOptions}
              selected={selected.lists}
              onChange={v => setSelected(s => ({ ...s, lists: v }))}
              placeholder="Select lists..."
              searchPlaceholder="Search lists..."
            />
          ) : activeTab === 'tags' ? (
            <MultiSelectDropdown
              options={tagOptions}
              selected={selected.tags}
              onChange={v => setSelected(s => ({ ...s, tags: v }))}
              placeholder="Select tags..."
              searchPlaceholder="Search tags..."
            />
          ) : (
            <MultiSelectDropdown
              options={segmentOptions}
              selected={selected.segments}
              onChange={v => setSelected(s => ({ ...s, segments: v }))}
              placeholder="Select segments..."
              searchPlaceholder="Search segments..."
            />
          )}
        </div>
      </div>

      <div className="shadow-table-controls" style={{ background: 'var(--color-bg-card, #2a2a2d)', border: '1px solid var(--color-border, #333336)', borderRadius: '4px', padding: '8px 12px', marginBottom: '4px', marginTop: '8px' }}>
        <span className="shadow-result-count">{total.toLocaleString()} contacts</span>
        {sortedMembers.length > 0 && (
          <button className="export-button" onClick={exportCSV}>Export CSV</button>
        )}
      </div>

      {membersLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#8a8a8a' }}>Loading...</div>
      ) : activeTab !== 'audience' && (selected[activeTab] || []).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
          Select at least one {activeTab === 'lists' ? 'list' : activeTab === 'tags' ? 'tag' : 'segment'} to view members.
        </div>
      ) : (
        <div className="x-table-container">
          <table className="results-table">
            <thead>
              <tr>
                {[
                  ['email', 'Email'],
                  ['last_name', 'Name'],
                  ['npi', 'NPI'],
                  ['specialty', 'Specialty'],
                  ['degree', 'Degree'],
                  ['city', 'City'],
                  ['state', 'State'],
                  ['source', 'Source'],
                  ...(activeTab === 'audience' ? [['is_active', 'Status']] : []),
                ].map(([key, label]) => (
                  <th key={key} onClick={() => handleSort(key)} className="sortable" style={{ cursor: 'pointer' }}>
                    {label} {sortField === key ? (sortDir === 'asc' ? '\u25B2' : '\u25BC') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedMembers.length === 0 ? (
                <tr><td colSpan={activeTab === 'audience' ? 9 : 8} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No records found</td></tr>
              ) : (
                sortedMembers.map((m, i) => (
                  <tr key={m.email || i} style={{ opacity: m.is_active === false ? 0.6 : 1, cursor: 'pointer' }} onClick={() => openProfileModal(m, i)}>
                    <td style={{ fontSize: '0.8rem' }}>{m.email || '\u2014'}</td>
                    <td>{[m.first_name, m.last_name].filter(Boolean).join(' ') || '\u2014'}</td>
                    <td style={{ fontFamily: "'Courier New', monospace", fontSize: '0.8rem' }}>{m.npi || '\u2014'}</td>
                    <td>{m.specialty || '\u2014'}</td>
                    <td>{m.degree || '\u2014'}</td>
                    <td>{m.city || '\u2014'}</td>
                    <td>{m.state || '\u2014'}</td>
                    <td>
                      {m.source ? (
                        <span className={`source-badge ${m.source.toLowerCase()}`}>{m.source}</span>
                      ) : '\u2014'}
                    </td>
                    {activeTab === 'audience' && (
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {m.is_active ? (
                          <span style={{ color: '#22c55e', fontWeight: 600 }}>Active</span>
                        ) : (
                          <span style={{ color: '#f87171', fontWeight: 600 }} title={m.inactive_reason || ''}>
                            Inactive{m.inactive_reason ? ` · ${m.inactive_reason}` : ''}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <TablePagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {modalRow && (
        <HCPProfileModal
          hcp={modalRow}
          position={`${modalIndex + 1} of ${sortedMembers.length}`}
          hasPrev={modalIndex > 0}
          hasNext={modalIndex < sortedMembers.length - 1}
          onPrev={() => navigateProfileModal(-1)}
          onNext={() => navigateProfileModal(1)}
          onClose={closeProfileModal}
        />
      )}
    </div>
  );
};

export default DigitalListDisplay;