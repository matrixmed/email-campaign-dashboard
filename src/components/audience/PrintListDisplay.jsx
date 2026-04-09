import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { API_BASE_URL } from '../../config/api';
import '../../styles/ReportsManager.css';
import '../../styles/AudienceQueryBuilder.css';

const PrintListDisplay = ({ externalSearch = '' }) => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeList, setActiveList] = useState('JCAD Print List');
  const [activeType, setActiveType] = useState('subscribed');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [audienceCount, setAudienceCount] = useState(0);
  const [sortField, setSortField] = useState('last_name');
  const [sortDir, setSortDir] = useState('asc');

  const SUBSCRIBE_LISTS = ['JCAD Print List', 'NP+PA Print List', 'JCAD Comp List'];
  const PER_PAGE = 100;

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/list-management/print-lists/overview`)
      .then(r => r.json())
      .then(d => {
        setOverview(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const unsubHierarchy = useMemo(() => {
    if (!overview?.unsubscribed_counts) return {};
    const hierarchy = {};
    for (const key of Object.keys(overview.unsubscribed_counts)) {
      const hotTopicsMatch = key.match(/^Hot Topics - (.+?): (.+)$/);
      if (hotTopicsMatch) {
        const area = hotTopicsMatch[1];
        const subList = hotTopicsMatch[2];
        if (!hierarchy[area]) hierarchy[area] = [];
        hierarchy[area].push({ key, subList, count: overview.unsubscribed_counts[key] });
      } else {
        hierarchy[key] = [{ key, subList: null, count: overview.unsubscribed_counts[key] }];
      }
    }
    return hierarchy;
  }, [overview]);

  const unsubCategories = useMemo(() => {
    return Object.keys(unsubHierarchy).sort((a, b) => {
      if (a === 'JCAD Print List') return -1;
      if (b === 'JCAD Print List') return 1;
      return a.localeCompare(b);
    });
  }, [unsubHierarchy]);

  const fetchMembers = useCallback((listName, type, pg, search) => {
    setMembersLoading(true);
    const params = new URLSearchParams({
      list: listName,
      type: type,
      page: pg,
      per_page: PER_PAGE,
      search: search || '',
    });
    fetch(`${API_BASE_URL}/api/list-management/print-lists/members?${params}`)
      .then(r => r.json())
      .then(d => {
        setMembers(d.members || []);
        setTotal(d.total || 0);
        setAudienceCount(d.audience_count || 0);
        setTotalPages(d.total_pages || 1);
        setMembersLoading(false);
      })
      .catch(() => setMembersLoading(false));
  }, []);

  useEffect(() => {
    if (!activeList) return;
    setPage(1);
    fetchMembers(activeList, activeType, 1, externalSearch);
  }, [activeList, externalSearch, fetchMembers]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeList && page > 1) {
      fetchMembers(activeList, activeType, page, externalSearch);
    }
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedMembers = [...members].sort((a, b) => {
    let av = a[sortField] || '';
    let bv = b[sortField] || '';
    if (typeof av === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  const exportCSV = useCallback(() => {
    const headers = ['NPI', 'First Name', 'Last Name', 'Credential', 'Specialty', 'City', 'State', 'In Audience', 'Email',
      ...(activeType === 'unsubscribed' ? ['Reason'] : [])
    ];
    const rows = sortedMembers.map(m =>
      [m.npi || '', m.first_name || '', m.last_name || '', m.credential || '', m.primary_specialty || '',
       m.practice_city || '', m.practice_state || '', m.in_audience ? 'Yes' : 'No', m.audience_email || '',
       ...(activeType === 'unsubscribed' ? [m.unsubscribe_reason || ''] : [])
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    );
    const blob = new Blob([headers.join(',') + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeList || 'print_list').replace(/[:\s]+/g, '_')}_${activeType}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sortedMembers, activeList, activeType]);

  const handleTypeToggle = (type) => {
    if (activeType === type) return;
    setActiveType(type);
    setExpandedCategory(null);
    setMembers([]);
    setTotal(0);
    setAudienceCount(0);
    if (type === 'subscribed') {
      setActiveList('JCAD Print List');
    } else {
      setActiveList(null);
    }
  };

  const handleCategoryClick = (category) => {
    const items = unsubHierarchy[category];
    if (items.length === 1 && !items[0].subList) {
      setActiveList(items[0].key);
      setExpandedCategory(null);
    } else {
      if (expandedCategory === category) {
        setExpandedCategory(null);
      } else {
        setExpandedCategory(category);
      }
    }
  };

  const getCategoryTotal = (category) => {
    const items = unsubHierarchy[category] || [];
    return items.reduce((sum, item) => sum + (item.count || 0), 0);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: '#8a8a8a' }}>Loading print list data...</div>;
  if (!overview) return <div style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>Failed to load data.</div>;

  return (
    <div className="shadow-engagers">
      <div className="reports-section-header">
        <h3>Print List Management</h3>
        <div className="reports-header-stats">
          <span className="reports-header-stat-item">
            <span className="reports-header-stat-label">Total Subscribed:</span>
            <span className="reports-header-stat-value">{(overview.total_subscribed || 0).toLocaleString()}</span>
          </span>
          <span className="reports-header-stat-item">
            <span className="reports-header-stat-label">In Audience:</span>
            <span className="reports-header-stat-value" style={{ color: '#0ff' }}>{(overview.total_in_audience || 0).toLocaleString()}</span>
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <button
          onClick={() => handleTypeToggle('subscribed')}
          style={{ padding: '4px 12px', border: '1px solid var(--color-border, #333336)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', background: activeType === 'subscribed' ? 'rgba(0, 255, 255, 0.1)' : 'transparent', color: activeType === 'subscribed' ? '#0ff' : '#8a8a8a' }}
        >
          Subscribed ({(overview.total_subscribed || 0).toLocaleString()})
        </button>
        <button
          onClick={() => handleTypeToggle('unsubscribed')}
          style={{ padding: '4px 12px', border: '1px solid var(--color-border, #333336)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', background: activeType === 'unsubscribed' ? 'rgba(0, 255, 255, 0.1)' : 'transparent', color: activeType === 'unsubscribed' ? '#0ff' : '#8a8a8a' }}
        >
          Unsubscribed ({Object.values(overview.unsubscribed_counts || {}).reduce((s, c) => s + c, 0).toLocaleString()})
        </button>
      </div>

      <div className="archive-agency-tabs" style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
        <style>{`.archive-agency-tabs::-webkit-scrollbar { display: none; }`}</style>
        {activeType === 'subscribed' ? (
          SUBSCRIBE_LISTS.map(name => (
            <button
              key={name}
              className={`archive-tab-button ${activeList === name ? 'active' : ''}`}
              onClick={() => { setActiveList(name); setPage(1); }}
            >
              {name} ({((overview.subscribed_counts || {})[name] || 0).toLocaleString()})
            </button>
          ))
        ) : (
          unsubCategories.map(category => {
            const items = unsubHierarchy[category];
            const isDirect = items.length === 1 && !items[0].subList;
            const isExpanded = expandedCategory === category;
            const isActiveCategory = isDirect ? activeList === items[0].key : isExpanded;
            const label = category === 'JCAD Print List' ? 'JCAD Unsubs' : category;
            return (
              <button
                key={category}
                className={`archive-tab-button ${isActiveCategory ? 'active' : ''}`}
                onClick={() => handleCategoryClick(category)}
              >
                {label} ({getCategoryTotal(category).toLocaleString()})
                {!isDirect && (isExpanded ? ' \u25BC' : ' \u25B6')}
              </button>
            );
          })
        )}
      </div>

      {activeType === 'unsubscribed' && expandedCategory && unsubHierarchy[expandedCategory]?.length > 1 && (
        <div className="archive-agency-tabs" style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', borderTop: 'none' }}>
          {unsubHierarchy[expandedCategory].map(item => (
            <button
              key={item.key}
              className={`archive-tab-button ${activeList === item.key ? 'active' : ''}`}
              onClick={() => { setActiveList(item.key); setPage(1); }}
            >
              {item.subList} ({(item.count || 0).toLocaleString()})
            </button>
          ))}
        </div>
      )}

      <div className="shadow-table-controls" style={{ background: 'var(--color-bg-card, #2a2a2d)', border: '1px solid var(--color-border, #333336)', borderRadius: '4px', padding: '8px 12px', marginBottom: '4px', marginTop: '8px' }}>
        <span className="shadow-result-count">{total.toLocaleString()} total</span>
        <span style={{ fontSize: '0.8rem', color: '#0ff' }}>{audienceCount.toLocaleString()} in audience</span>
        <span style={{ fontSize: '0.8rem', color: '#888' }}>
          {activeType === 'subscribed' ? 'Subscribed' : 'Unsubscribed'}
        </span>
        <button type="button" className="btn-export" style={{ background: 'linear-gradient(135deg, #27ae60, #229954)', borderColor: '#229954' }} onClick={exportCSV}>Export CSV</button>
      </div>

      {membersLoading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#8a8a8a' }}>Loading...</div>
      ) : (
        <div className="x-table-container">
          <table className="results-table">
            <thead>
              <tr>
                {[
                  ['last_name', 'Name'],
                  ['npi', 'NPI'],
                  ['credential', 'Credential'],
                  ['primary_specialty', 'Specialty'],
                  ['practice_address_1', 'Address'],
                  ['practice_city', 'City'],
                  ['practice_state', 'State'],
                  ['in_audience', 'In Audience'],
                  ...(activeType === 'unsubscribed' ? [['unsubscribe_reason', 'Reason']] : []),
                ].map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className="sortable"
                    style={{ cursor: 'pointer' }}
                  >
                    {label} {sortField === key ? (sortDir === 'asc' ? '\u25B2' : '\u25BC') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedMembers.length === 0 ? (
                <tr><td colSpan={activeType === 'unsubscribed' ? 9 : 8} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No records found</td></tr>
              ) : (
                sortedMembers.map((m, i) => (
                  <tr key={m.npi || i}>
                    <td>{[m.first_name, m.last_name].filter(Boolean).join(' ') || '\u2014'}</td>
                    <td style={{ fontFamily: "'Courier New', monospace", fontSize: '0.8rem' }}>{m.npi || '\u2014'}</td>
                    <td>{m.credential || '\u2014'}</td>
                    <td>{m.primary_specialty || m.primary_taxonomy_code || '\u2014'}</td>
                    <td style={{ fontSize: '0.8rem' }}>{[m.practice_address_1, m.practice_address_2].filter(Boolean).join(', ') || '\u2014'}</td>
                    <td>{m.practice_city || '\u2014'}</td>
                    <td>{m.practice_state || '\u2014'}</td>
                    <td>
                      {m.in_audience ? (
                        <span style={{ color: '#22c55e', fontWeight: 600 }}>Yes</span>
                      ) : (
                        <span style={{ color: '#888' }}>No</span>
                      )}
                    </td>
                    {activeType === 'unsubscribed' && (
                      <td style={{ color: '#aaa' }}>{m.unsubscribe_reason || '\u2014'}</td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="load-more-container">
          <button
            type="button"
            className="btn-load-more"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ opacity: page === 1 ? 0.4 : 1 }}
          >
            Prev
          </button>
          <span style={{ fontSize: '0.85rem', color: '#aaa' }}>Page {page} of {totalPages} ({total.toLocaleString()} total)</span>
          <button
            type="button"
            className="btn-load-more"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ opacity: page === totalPages ? 0.4 : 1 }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default PrintListDisplay;