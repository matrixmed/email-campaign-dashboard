import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';
import LastUpdatedTag from './LastUpdatedTag';

const AREA_COLORS = {
  dermatology: { primary: '#00857a', bg: 'rgba(0, 133, 122, 0.15)' },
  oncology: { primary: '#2a5fa3', bg: 'rgba(42, 95, 163, 0.15)' },
  neuroscience: { primary: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' },
};

const PDUFACalendar = ({ searchTerm, onSelectCompany, lastUpdated }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('pending');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/market-intelligence/pdufa-dates`);
        const json = await res.json();
        if (json.status === 'success') { setData(json); }
      } catch (err) {}
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="mi-loading"><div className="loading-spinner"></div><p>Loading PDUFA dates...</p></div>;
  }

  const filterBySearch = (d) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return d.drug_name?.toLowerCase().includes(term) || d.company_name?.toLowerCase().includes(term);
  };

  const pending = data?.dates?.filter(d => d.status === 'pending' && filterBySearch(d)) || [];
  const past = data?.dates?.filter(d => d.status !== 'pending' && filterBySearch(d)) || [];
  const currentData = subTab === 'pending' ? pending : past;

  const getAreaStyle = (area) => {
    const c = AREA_COLORS[area];
    return c ? { background: c.bg, color: c.primary } : {};
  };

  return (
    <div className="mi-tab-content">
      <div className="mi-section-header">
        <h3>PDUFA Decisions</h3>
        <LastUpdatedTag date={lastUpdated} />
      </div>

      <div className="mi-subtabs">
        <button className={`mi-subtab ${subTab === 'pending' ? 'active' : ''}`} onClick={() => setSubTab('pending')}>
          Upcoming ({pending.length})
        </button>
        <button className={`mi-subtab ${subTab === 'past' ? 'active' : ''}`} onClick={() => setSubTab('past')}>
          Past ({past.length})
        </button>
      </div>

      <div className="table-section">
        <table>
          <thead>
            <tr>
              <th>Target Date</th>
              <th>Drug</th>
              <th>Company</th>
              <th>Type</th>
              <th>Therapeutic Area</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((d, i) => (
              <tr key={i}>
                <td className="mi-bold" style={{whiteSpace: 'nowrap'}}>{d.target_date}</td>
                <td>{d.drug_name}</td>
                <td className="mi-company-link" onClick={() => onSelectCompany(d.company_name)}>{d.company_name}</td>
                <td>{d.application_type || '-'}</td>
                <td>{d.therapeutic_area ? <span className="mi-area-tag" style={getAreaStyle(d.therapeutic_area)}>{d.therapeutic_area}</span> : '-'}</td>
                <td><span className={d.status === 'pending' ? 'mi-status-pending' : d.status === 'approved' ? 'mi-status-approved' : 'mi-status-past'}>{d.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PDUFACalendar;