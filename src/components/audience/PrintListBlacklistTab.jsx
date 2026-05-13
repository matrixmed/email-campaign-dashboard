import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../../config/api';
import TablePagination from '../common/TablePagination';

const PrintListBlacklistTab = ({ editMode, externalSearch = '', onAddBlacklist, refreshKey = 0 }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedPeople, setExpandedPeople] = useState({});

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, per_page: 100, search: externalSearch || '' });
    fetch(`${API_BASE_URL}/api/list-management/print-lists/blacklist?${params}`)
      .then(r => r.json())
      .then(d => {
        setEntries(d.entries || []);
        setTotal(d.total || 0);
        setTotalPages(d.total_pages || 1);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, externalSearch]);

  useEffect(() => { load(); }, [load, refreshKey]);

  useEffect(() => { setPage(1); }, [externalSearch]);

  const toggleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!expandedPeople[id]) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/list-management/print-lists/blacklist/${id}/affected`);
        const d = await res.json();
        setExpandedPeople(p => ({ ...p, [id]: d.people || [] }));
      } catch (_) {}
    }
  };

  const handleDelete = async (id, address) => {
    if (!window.confirm(`Remove blacklist entry for "${address}"? Existing unsubscribed records won't change.`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/list-management/print-lists/blacklist/${id}`, { method: 'DELETE' });
      if (res.ok) load();
    } catch (_) {}
  };

  return (
    <div>
      <div className="shadow-table-controls" style={{ background: 'var(--color-bg-card, #2a2a2d)', border: '1px solid var(--color-border, #333336)', borderRadius: '4px', padding: '8px 12px', marginBottom: '4px', marginTop: '8px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="shadow-result-count">{total.toLocaleString()} blacklisted addresses</span>
        <span style={{ flex: 1 }} />
        {editMode && (
          <button className="export-button" onClick={onAddBlacklist} style={{ background: '#d9b87f', borderColor: '#d9b87f', color: '#222' }}>+ Add Blacklist</button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#8a8a8a' }}>Loading…</div>
      ) : (
        <div className="x-table-container">
          <table className="results-table">
            <thead>
              <tr>
                <th></th>
                <th>Address</th>
                <th>City</th>
                <th>State</th>
                <th>Zip</th>
                <th>Reason</th>
                <th>Affected</th>
                <th>Added</th>
                {editMode && <th></th>}
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={editMode ? 9 : 8} style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>No blacklisted addresses.</td></tr>
              ) : (
                entries.map(e => (
                  <React.Fragment key={e.id}>
                    <tr>
                      <td style={{ width: 28 }}>
                        <button
                          onClick={() => toggleExpand(e.id)}
                          title="Show affected people"
                          style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          {expandedId === e.id ? '▼' : '▶'}
                        </button>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{e.address_1 || '—'}</td>
                      <td>{e.city || '—'}</td>
                      <td>{e.state || '—'}</td>
                      <td style={{ fontSize: '0.8rem' }}>{e.zipcode || '—'}</td>
                      <td style={{ fontSize: '0.85rem', color: '#aaa' }}>{e.reason || '—'}</td>
                      <td style={{ color: e.affected_count > 0 ? '#d9b87f' : '#888' }}>{e.affected_count}</td>
                      <td style={{ fontSize: '0.75rem', color: '#888' }}>{e.created_at ? new Date(e.created_at).toLocaleDateString() : '—'}</td>
                      {editMode && (
                        <td style={{ width: 40, textAlign: 'right' }}>
                          <button
                            onClick={() => handleDelete(e.id, e.address_1)}
                            title="Remove blacklist entry"
                            style={{ background: 'transparent', border: '1px solid #333336', color: '#ef4444', borderRadius: 4, width: 26, height: 26, cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1 }}
                          >
                            ×
                          </button>
                        </td>
                      )}
                    </tr>
                    {expandedId === e.id && (
                      <tr>
                        <td colSpan={editMode ? 9 : 8} style={{ background: '#1f1f22', padding: 0 }}>
                          <div style={{ padding: 10 }}>
                            <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: 6 }}>People unsubscribed at this address</div>
                            {!expandedPeople[e.id] ? (
                              <div style={{ color: '#888', fontSize: '0.8rem' }}>Loading…</div>
                            ) : expandedPeople[e.id].length === 0 ? (
                              <div style={{ color: '#888', fontSize: '0.8rem' }}>No matching unsubscribed records.</div>
                            ) : (
                              <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.8rem', color: '#ddd' }}>
                                {expandedPeople[e.id].map((p, i) => (
                                  <li key={`${p.table_name}-${p.id}-${i}`}>
                                    {[p.first_name, p.last_name].filter(Boolean).join(' ') || '—'}
                                    {p.npi ? ` · NPI ${p.npi}` : ''}
                                    <span style={{ color: '#666' }}> · {p.table_name}#{p.id}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
    </div>
  );
};

export default PrintListBlacklistTab;