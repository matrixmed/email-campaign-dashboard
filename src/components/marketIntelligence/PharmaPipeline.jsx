import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../../config/api';

const AREA_COLORS = {
  dermatology: { primary: '#00857a', bg: 'rgba(0, 133, 122, 0.15)' },
  oncology: { primary: '#2a5fa3', bg: 'rgba(42, 95, 163, 0.15)' },
  neuroscience: { primary: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' },
};

const PharmaPipeline = ({ searchTerm }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('sponsors');
  const [displayCount, setDisplayCount] = useState(25);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/market-intelligence/clinical-trials?sponsor_class=INDUSTRY`);
      const json = await res.json();
      if (json.status === 'success') {
        setData(json);
      }
    } catch (err) {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setDisplayCount(25); }, [subTab, searchTerm]);

  const getAreaStyle = (area) => {
    const c = AREA_COLORS[area];
    return c ? { background: c.bg, color: c.primary } : {};
  };

  const filteredSponsors = data?.top_sponsors?.filter(s => {
    if (!searchTerm) return true;
    return s.sponsor_name?.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  const filteredTrials = data?.trials?.filter(t => {
    if (!t.primary_completion_date) return false;
    const comp = new Date(t.primary_completion_date);
    const now = new Date();
    const future = new Date();
    future.setMonth(future.getMonth() + 18);
    if (comp < now || comp > future) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return t.sponsor_name?.toLowerCase().includes(term) || t.title?.toLowerCase().includes(term) || t.conditions?.toLowerCase().includes(term);
  }) || [];

  const currentData = subTab === 'sponsors' ? filteredSponsors : filteredTrials;
  const visibleData = currentData.slice(0, displayCount);
  const hasMore = displayCount < currentData.length;

  if (loading) {
    return <div className="mi-loading"><div className="loading-spinner"></div><p>Loading clinical trials...</p></div>;
  }

  return (
    <div className="mi-tab-content">
      <div className="mi-section-header">
        <h3>Pharma Pipeline</h3>
      </div>

      <div className="mi-subtabs">
        <button className={`mi-subtab ${subTab === 'sponsors' ? 'active' : ''}`} onClick={() => setSubTab('sponsors')}>
          Top Sponsors ({filteredSponsors.length})
        </button>
        <button className={`mi-subtab ${subTab === 'completing' ? 'active' : ''}`} onClick={() => setSubTab('completing')}>
          Trials Completing ({filteredTrials.length})
        </button>
      </div>

      {subTab === 'sponsors' && (
        <div className="table-section">
          <table>
            <thead>
              <tr>
                <th>Sponsor</th>
                <th>Total Trials</th>
                <th>Completing in 18mo</th>
              </tr>
            </thead>
            <tbody>
              {visibleData.map((s, i) => (
                <tr key={i}>
                  <td className="mi-bold">{s.sponsor_name}</td>
                  <td>{s.trial_count}</td>
                  <td>{s.upcoming_count > 0 ? <span className="mi-highlight">{s.upcoming_count}</span> : '0'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'completing' && (
        <div className="table-section">
          <table>
            <thead>
              <tr>
                <th>Completion</th>
                <th>Sponsor</th>
                <th>Title</th>
                <th>Area</th>
              </tr>
            </thead>
            <tbody>
              {visibleData.map((t, i) => (
                <tr key={i}>
                  <td style={{whiteSpace: 'nowrap'}}>{t.primary_completion_date}</td>
                  <td className="mi-bold">{t.sponsor_name}</td>
                  <td className="mi-truncate">{t.title}</td>
                  <td><span className="mi-area-tag" style={getAreaStyle(t.therapeutic_area)}>{t.therapeutic_area}</span></td>
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

export default PharmaPipeline;