import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';
import LastUpdatedTag from './LastUpdatedTag';

const DrugSpending = ({ searchTerm, onSelectCompany, lastUpdated }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('drugs');
  const [displayCount, setDisplayCount] = useState(100);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/market-intelligence/drug-spending?limit=500`);
        const json = await res.json();
        if (json.status === 'success') {
          setData(json);
        }
      } catch (err) {}
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => { setDisplayCount(100); }, [subTab, searchTerm]);

  const formatCurrency = (num) => {
    if (!num) return '$0';
    if (num >= 1e9) return '$' + (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return '$' + (num / 1e3).toFixed(1) + 'K';
    return '$' + num.toFixed(0);
  };

  if (loading) {
    return <div className="mi-loading"><div className="loading-spinner"></div><p>Loading drug spending data...</p></div>;
  }

  if (!data || data.total === 0) {
    return (
      <div className="mi-tab-content">
        <div className="mi-section-header"><h3>Drug Spending</h3></div>
        <div className="mi-empty"><h3>No Drug Spending Data</h3><p>Run drug_spending_loader.py to pull Medicare Part D spending data.</p></div>
      </div>
    );
  }

  const filteredDrugs = data.drugs?.filter(d => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return d.brand_name?.toLowerCase().includes(term) || d.generic_name?.toLowerCase().includes(term) || d.manufacturer?.toLowerCase().includes(term);
  }) || [];

  const filteredMfrs = data.by_manufacturer?.filter(m => {
    if (!searchTerm) return true;
    return m.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  const currentData = subTab === 'drugs' ? filteredDrugs : filteredMfrs;
  const visible = currentData.slice(0, displayCount);
  const hasMore = displayCount < currentData.length;

  return (
    <div className="mi-tab-content">
      <div className="mi-section-header">
        <h3>Drug Spending</h3>
        <LastUpdatedTag date={lastUpdated} />
      </div>

      <div className="mi-subtabs">
        <button className={`mi-subtab ${subTab === 'drugs' ? 'active' : ''}`} onClick={() => setSubTab('drugs')}>
          Top Drugs ({filteredDrugs.length})
        </button>
        <button className={`mi-subtab ${subTab === 'manufacturers' ? 'active' : ''}`} onClick={() => setSubTab('manufacturers')}>
          By Manufacturer ({filteredMfrs.length})
        </button>
      </div>

      {subTab === 'drugs' && (
        <div className="table-section">
          <table>
            <thead>
              <tr>
                <th>Brand</th>
                <th>Generic</th>
                <th>Manufacturer</th>
                <th>Total Spending</th>
                <th>Claims</th>
                <th>Beneficiaries</th>
                <th>Avg/Claim</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((d, i) => (
                <tr key={i}>
                  <td className="mi-bold">{d.brand_name}</td>
                  <td>{d.generic_name}</td>
                  <td className="mi-company-link" onClick={() => onSelectCompany(d.manufacturer)}>{d.manufacturer}</td>
                  <td className="mi-highlight">{formatCurrency(d.total_spending)}</td>
                  <td>{d.total_claims?.toLocaleString()}</td>
                  <td>{d.total_beneficiaries?.toLocaleString()}</td>
                  <td>{formatCurrency(d.avg_spending_per_claim)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'manufacturers' && (
        <div className="table-section">
          <table>
            <thead>
              <tr>
                <th>Manufacturer</th>
                <th>Total Drug Spending</th>
                <th>Drug Count</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((m, i) => (
                <tr key={i}>
                  <td className="mi-bold mi-company-link" onClick={() => onSelectCompany(m.manufacturer)}>{m.manufacturer}</td>
                  <td className="mi-highlight">{formatCurrency(m.total)}</td>
                  <td>{m.drug_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && (
        <div className="load-more-container">
          <button className="btn-load-more" onClick={() => setDisplayCount(c => c + 100)}>
            Load More ({visible.length} of {currentData.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default DrugSpending;
