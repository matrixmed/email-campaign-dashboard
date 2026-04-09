import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { API_BASE_URL } from '../../config/api';
import '../../styles/ReportsManager.css';
import '../../styles/AudienceQueryBuilder.css';

const DigitalListDisplay = ({ externalSearch = '' }) => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeList, setActiveList] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortField, setSortField] = useState('last_name');
  const [sortDir, setSortDir] = useState('asc');

  const PER_PAGE = 100;

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/list-management/digital-lists/overview`)
      .then(r => r.json())
      .then(d => {
        setOverview(d);
        const lists = Object.keys(d.subscribed_counts || {}).sort();
        if (lists.length > 0) setActiveList(lists[0]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sortedLists = useMemo(() => {
    if (!overview?.subscribed_counts) return [];
    return Object.entries(overview.subscribed_counts)
      .sort((a, b) => b[1] - a[1]);
  }, [overview]);

  const fetchMembers = useCallback((listName, pg, search) => {
    setMembersLoading(true);
    const params = new URLSearchParams({
      list: listName,
      page: pg,
      per_page: PER_PAGE,
      search: search || '',
    });
    fetch(`${API_BASE_URL}/api/list-management/digital-lists/members?${params}`)
      .then(r => r.json())
      .then(d => {
        setMembers(d.members || []);
        setTotal(d.total || 0);
        setTotalPages(d.total_pages || 1);
        setMembersLoading(false);
      })
      .catch(() => setMembersLoading(false));
  }, []);

  useEffect(() => {
    if (activeList) {
      setPage(1);
      fetchMembers(activeList, 1, externalSearch);
    }
  }, [activeList, externalSearch, fetchMembers]);

  useEffect(() => {
    if (activeList && page > 1) {
      fetchMembers(activeList, page, externalSearch);
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
    const headers = ['Email', 'First Name', 'Last Name', 'NPI', 'Specialty', 'Degree', 'City', 'State'];
    const rows = sortedMembers.map(m =>
      [m.email || '', m.first_name || '', m.last_name || '', m.npi || '', m.specialty || '',
       m.degree || '', m.city || '', m.state || '']
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    );
    const blob = new Blob([headers.join(',') + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeList || 'digital_list').replace(/[:\s]+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sortedMembers, activeList]);

  if (loading) return <div style={{ textAlign: 'center', padding: '3rem', color: '#8a8a8a' }}>Loading digital list data...</div>;
  if (!overview) return <div style={{ textAlign: 'center', padding: '3rem', color: '#ef4444' }}>Failed to load data.</div>;

  return (
    <div className="shadow-engagers">
      <div className="reports-section-header">
        <h3>Digital List Management</h3>
        <div className="reports-header-stats">
          <span className="reports-header-stat-item">
            <span className="reports-header-stat-label">Users on Lists:</span>
            <span className="reports-header-stat-value">{(overview.total_subscribed || 0).toLocaleString()}</span>
          </span>
          <span className="reports-header-stat-item">
            <span className="reports-header-stat-label">Lists:</span>
            <span className="reports-header-stat-value">{sortedLists.length}</span>
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '10px 16px', background: 'rgba(255,255,255,0.03)' }}>
        {sortedLists.map(([name, count]) => {
          const isActive = activeList === name;
          return (
            <button
              key={name}
              onClick={() => { setActiveList(name); setPage(1); }}
              style={{
                padding: '6px 14px',
                borderRadius: '16px',
                border: isActive ? '1px solid #0ff' : '1px solid #555',
                background: isActive ? 'rgba(0, 255, 255, 0.12)' : 'rgba(255,255,255,0.05)',
                color: isActive ? '#0ff' : '#ccc',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {name} ({count.toLocaleString()})
            </button>
          );
        })}
      </div>

      <div className="shadow-table-controls" style={{ background: 'var(--color-bg-card, #2a2a2d)', border: '1px solid var(--color-border, #333336)', borderRadius: '4px', padding: '8px 12px', marginBottom: '4px', marginTop: '8px' }}>
        <span className="shadow-result-count">{total.toLocaleString()} contacts</span>
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
                  ['email', 'Email'],
                  ['last_name', 'Name'],
                  ['npi', 'NPI'],
                  ['specialty', 'Specialty'],
                  ['degree', 'Degree'],
                  ['city', 'City'],
                  ['state', 'State'],
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
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No records found</td></tr>
              ) : (
                sortedMembers.map((m, i) => (
                  <tr key={m.email || i}>
                    <td style={{ fontSize: '0.8rem' }}>{m.email || '\u2014'}</td>
                    <td>{[m.first_name, m.last_name].filter(Boolean).join(' ') || '\u2014'}</td>
                    <td style={{ fontFamily: "'Courier New', monospace", fontSize: '0.8rem' }}>{m.npi || '\u2014'}</td>
                    <td>{m.specialty || '\u2014'}</td>
                    <td>{m.degree || '\u2014'}</td>
                    <td>{m.city || '\u2014'}</td>
                    <td>{m.state || '\u2014'}</td>
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

export default DigitalListDisplay;