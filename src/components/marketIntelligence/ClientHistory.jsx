import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';
import LastUpdatedTag from './LastUpdatedTag';

const ClientHistory = ({ searchTerm, onSelectCompany, lastUpdated }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/market-intelligence/client-history`);
        const json = await res.json();
        if (json.status === 'success') {
          setData(json);
        }
      } catch (err) {}
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="mi-loading"><div className="loading-spinner"></div><p>Loading client data...</p></div>;
  }

  const filtered = data?.clients?.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return c.company?.toLowerCase().includes(term) ||
           c.brands?.some(b => b.toLowerCase().includes(term)) ||
           c.agencies?.some(a => a.toLowerCase().includes(term));
  }) || [];

  return (
    <div className="mi-tab-content">
      <div className="mi-section-header">
        <h3>Client History</h3>
        <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
          <span style={{color: '#8a8a8a', fontSize: 13}}>{data?.total_companies} companies | {data?.total_brands} active brands</span>
          <LastUpdatedTag date={lastUpdated} />
        </div>
      </div>

      <div className="table-section">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Brands</th>
              <th>Agency</th>
              <th>Sales</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={i}>
                <td className="mi-bold mi-company-link" onClick={() => onSelectCompany(c.company)}>{c.company}</td>
                <td style={{whiteSpace: 'normal', lineHeight: 1.6}}>
                  {c.brands.map((b, j) => (
                    <span key={j} style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      margin: '2px 4px 2px 0',
                      borderRadius: '12px',
                      fontSize: '12px',
                      background: 'rgba(0, 255, 255, 0.08)',
                      border: '1px solid rgba(0, 255, 255, 0.2)',
                      color: '#0ff',
                    }}>{b}</span>
                  ))}
                </td>
                <td>{c.agencies.join(', ') || '-'}</td>
                <td>{c.sales_members.join(', ') || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClientHistory;
