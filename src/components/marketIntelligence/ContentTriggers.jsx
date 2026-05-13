import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';
import LastUpdatedTag from './LastUpdatedTag';

const AREA_COLORS = {
  dermatology: { primary: '#00857a', bg: 'rgba(0, 133, 122, 0.15)' },
  oncology: { primary: '#2a5fa3', bg: 'rgba(42, 95, 163, 0.15)' },
  neuroscience: { primary: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' },
};

const TYPE_STYLES = {
  fda_approval: { label: 'FDA', bg: 'rgba(74, 222, 128, 0.15)', color: '#4ade80' },
  pdufa: { label: 'PDUFA', bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' },
  patent_cliff: { label: 'PATENT', bg: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' },
  research_momentum: { label: 'RESEARCH', bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' },
  conference: { label: 'CONFERENCE', bg: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' },
};

const ContentTriggers = ({ onSelectCompany, lastUpdated }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/market-intelligence/content-triggers`);
        const json = await res.json();
        if (json.status === 'success') setData(json);
      } catch (err) {}
      setLoading(false);
    };
    fetchData();
  }, []);

  const getAreaStyle = (area) => {
    const c = AREA_COLORS[area];
    return c ? { background: c.bg, color: c.primary } : {};
  };

  if (loading) {
    return <div className="mi-loading"><div className="loading-spinner"></div><p>Scanning for content triggers...</p></div>;
  }

  const triggers = data?.triggers || [];
  const filtered = filterType === 'all' ? triggers : triggers.filter(t => t.type === filterType);

  const typeCounts = {};
  triggers.forEach(t => { typeCounts[t.type] = (typeCounts[t.type] || 0) + 1; });

  return (
    <div className="mi-tab-content">
      <div className="mi-section-header">
        <h3>Content Triggers</h3>
        <LastUpdatedTag date={lastUpdated} />
      </div>

      <div className="mi-subtabs">
        <button className={`mi-subtab ${filterType === 'all' ? 'active' : ''}`} onClick={() => setFilterType('all')}>
          All ({triggers.length})
        </button>
        {Object.entries(typeCounts).map(([type, count]) => (
          <button key={type} className={`mi-subtab ${filterType === type ? 'active' : ''}`} onClick={() => setFilterType(type)}>
            {TYPE_STYLES[type]?.label || type} ({count})
          </button>
        ))}
      </div>

      <div className="table-section">
        <table>
          <thead>
            <tr>
              <th style={{width: 90}}>Type</th>
              <th style={{width: 100}}>Date</th>
              <th>Trigger</th>
              <th>Detail</th>
              <th style={{width: 110}}>Area</th>
              <th>Company</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => {
              const style = TYPE_STYLES[t.type] || {};
              return (
                <tr key={i}>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                      background: style.bg, color: style.color,
                    }}>{style.label || t.type}</span>
                  </td>
                  <td style={{whiteSpace: 'nowrap', color: '#fff', fontWeight: 500}}>{t.date || '-'}</td>
                  <td className="mi-bold" style={{whiteSpace: 'normal', lineHeight: 1.4}}>{t.title}</td>
                  <td style={{whiteSpace: 'normal', lineHeight: 1.4, color: '#8a8a8a', fontSize: 13}}>{t.detail}</td>
                  <td>
                    {t.area ? <span className="mi-area-tag" style={getAreaStyle(t.area)}>{t.area}</span> : '-'}
                  </td>
                  <td>
                    {t.company ? (
                      <span className="mi-company-link" onClick={() => onSelectCompany(t.company)}>{t.company}</span>
                    ) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContentTriggers;