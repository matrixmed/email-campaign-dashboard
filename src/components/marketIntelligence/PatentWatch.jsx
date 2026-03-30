import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';

const PatentWatch = ({ searchTerm }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('companies');
  const [displayCount, setDisplayCount] = useState(25);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/market-intelligence/patent-expirations?years_ahead=3`);
        const json = await res.json();
        if (json.status === 'success') { setData(json); }
      } catch (err) {}
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => { setDisplayCount(25); }, [subTab, searchTerm]);

  if (loading) {
    return <div className="mi-loading"><div className="loading-spinner"></div><p>Loading patent data...</p></div>;
  }

  const filtered = data?.expirations?.filter(e => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return e.drug_name?.toLowerCase().includes(term) || e.active_ingredient?.toLowerCase().includes(term) || e.applicant?.toLowerCase().includes(term);
  }) || [];

  const filteredApplicants = data?.by_applicant?.filter(a => {
    if (!searchTerm) return true;
    return a.applicant?.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  const currentData = subTab === 'companies' ? filteredApplicants : filtered;
  const visibleData = currentData.slice(0, displayCount);
  const hasMore = displayCount < currentData.length;

  return (
    <div className="mi-tab-content">
      <div className="mi-section-header">
        <h3>Patent Watch</h3>
      </div>

      <div className="mi-subtabs">
        <button className={`mi-subtab ${subTab === 'companies' ? 'active' : ''}`} onClick={() => setSubTab('companies')}>
          By Company ({filteredApplicants.length})
        </button>
        <button className={`mi-subtab ${subTab === 'expirations' ? 'active' : ''}`} onClick={() => setSubTab('expirations')}>
          All Expirations ({filtered.length})
        </button>
      </div>

      {subTab === 'companies' && (
        <div className="table-section">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Drugs Expiring</th>
                <th>Earliest Expiry</th>
              </tr>
            </thead>
            <tbody>
              {visibleData.map((a, i) => (
                <tr key={i}>
                  <td className="mi-bold">{a.applicant}</td>
                  <td>{a.drug_count}</td>
                  <td>{a.earliest_expiry}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'expirations' && (
        <div className="table-section">
          <table>
            <thead>
              <tr>
                <th>Expiry Date</th>
                <th>Drug</th>
                <th>Ingredient</th>
                <th>Company</th>
              </tr>
            </thead>
            <tbody>
              {visibleData.map((e, i) => (
                <tr key={i}>
                  <td style={{whiteSpace: 'nowrap'}}>{e.patent_expiration_date}</td>
                  <td className="mi-bold">{e.drug_name}</td>
                  <td>{e.active_ingredient}</td>
                  <td>{e.applicant}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && (
        <div className="load-more-container">
          <button className="btn-load-more" onClick={() => setDisplayCount(c => c + 25)}>
            Load More ({visibleData.length} of {currentData.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default PatentWatch;