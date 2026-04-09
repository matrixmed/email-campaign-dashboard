import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';
import LastUpdatedTag from './LastUpdatedTag';

const AREA_COLORS = {
  dermatology: { primary: '#00857a', bg: 'rgba(0, 133, 122, 0.15)' },
  oncology: { primary: '#2a5fa3', bg: 'rgba(42, 95, 163, 0.15)' },
  neuroscience: { primary: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' },
};

const FDAAlerts = ({ searchTerm, onSelectCompany, lastUpdated }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('recent');
  const [displayCount, setDisplayCount] = useState(100);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/market-intelligence/fda-approvals`);
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

  const getAreaStyle = (area) => {
    const c = AREA_COLORS[area];
    return c ? { background: c.bg, color: c.primary } : {};
  };

  if (loading) {
    return <div className="mi-loading"><div className="loading-spinner"></div><p>Loading FDA data...</p></div>;
  }

  if (!data || !data.approvals || data.approvals.length === 0) {
    return (
      <div className="mi-tab-content">
        <div className="mi-section-header"><h3>FDA Alerts</h3></div>
        <div className="mi-empty"><h3>No FDA Data</h3><p>Run fda_approvals_loader.py to pull recent approvals and label changes.</p></div>
      </div>
    );
  }

  const filterBySearch = (item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.brand_name?.toLowerCase().includes(term) ||
      item.generic_name?.toLowerCase().includes(term) ||
      item.sponsor_name?.toLowerCase().includes(term)
    );
  };

  const recent = data.approvals.filter(a => filterBySearch(a));
  const newIndications = data.approvals.filter(a => a.is_new_indication && filterBySearch(a));
  const newApprovals = data.approvals.filter(a => a.submission_type === 'ORIG' && filterBySearch(a));
  const inOurAreas = data.approvals.filter(a => ['oncology', 'dermatology', 'neuroscience'].includes(a.therapeutic_area) && filterBySearch(a));

  const currentData = {
    recent: recent,
    indications: newIndications,
    new: newApprovals,
    our_areas: inOurAreas,
  }[subTab] || recent;

  const visible = currentData.slice(0, displayCount);
  const hasMore = displayCount < currentData.length;

  return (
    <div className="mi-tab-content">
      <div className="mi-section-header">
        <h3>FDA Alerts</h3>
        <LastUpdatedTag date={lastUpdated} />
      </div>

      <div className="mi-subtabs">
        <button className={`mi-subtab ${subTab === 'recent' ? 'active' : ''}`} onClick={() => setSubTab('recent')}>
          All Recent ({recent.length})
        </button>
        <button className={`mi-subtab ${subTab === 'our_areas' ? 'active' : ''}`} onClick={() => setSubTab('our_areas')}>
          Our Therapeutic Areas ({inOurAreas.length})
        </button>
        <button className={`mi-subtab ${subTab === 'indications' ? 'active' : ''}`} onClick={() => setSubTab('indications')}>
          New Indications ({newIndications.length})
        </button>
        <button className={`mi-subtab ${subTab === 'new' ? 'active' : ''}`} onClick={() => setSubTab('new')}>
          New Drug Approvals ({newApprovals.length})
        </button>
      </div>

      <div className="table-section">
        <table>
          <thead>
            <tr>
              <th style={{width: 100}}>Date</th>
              <th>Brand</th>
              <th>Generic</th>
              <th>Sponsor</th>
              <th style={{width: 80}}>Type</th>
              <th style={{width: 110}}>Area</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((a, i) => (
              <tr key={i}>
                <td style={{whiteSpace: 'nowrap', fontWeight: 600, color: '#fff'}}>{a.approval_date}</td>
                <td className="mi-bold">{a.brand_name || '-'}</td>
                <td>{a.generic_name || '-'}</td>
                <td className="mi-company-link" onClick={() => onSelectCompany(a.sponsor_name)}>{a.sponsor_name}</td>
                <td>
                  <span style={{
                    padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                    background: a.submission_type === 'ORIG' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                    color: a.submission_type === 'ORIG' ? '#4ade80' : '#fbbf24',
                  }}>
                    {a.submission_type === 'ORIG' ? 'NEW' : 'SUPPL'}
                  </span>
                </td>
                <td>
                  {a.therapeutic_area
                    ? <span className="mi-area-tag" style={getAreaStyle(a.therapeutic_area)}>{a.therapeutic_area}</span>
                    : '-'
                  }
                </td>
                <td style={{whiteSpace: 'normal', lineHeight: 1.4, color: '#999', fontSize: 13}}>{a.submission_description || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

export default FDAAlerts;
