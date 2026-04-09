import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';
import LastUpdatedTag from './LastUpdatedTag';

const MarketBenchmarks = ({ lastUpdated }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/market-intelligence/market-benchmarks`);
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
    return <div className="mi-loading"><div className="loading-spinner"></div><p>Loading benchmarks...</p></div>;
  }

  const grouped = {};
  data?.benchmarks?.forEach(b => {
    const cat = b.category || b.channel || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(b);
  });

  const categories = Object.keys(grouped);
  const activeCategory = subTab || categories[0] || 'Email to HCPs';
  const activeBenchmarks = grouped[activeCategory] || [];

  const formatValue = (b) => {
    if (b.metric_unit === 'flag') return '';
    if (b.metric_unit === 'USD') {
      if (b.metric_value >= 1000000000) return '$' + (b.metric_value / 1000000000).toFixed(1) + 'B';
      if (b.metric_value >= 1000000) return '$' + (b.metric_value / 1000000).toFixed(1) + 'M';
      if (b.metric_value >= 1000) return '$' + (b.metric_value / 1000).toFixed(1) + 'K';
      return '$' + b.metric_value.toFixed(2);
    }
    if (b.metric_unit === 'percent') return b.metric_value.toFixed(2) + '%';
    if (b.metric_unit === 'seconds') return b.metric_value.toFixed(0) + 's';
    if (b.metric_unit === 'count') return b.metric_value.toLocaleString();
    return b.metric_value.toLocaleString();
  };

  const isOpportunity = activeCategory === 'Opportunities';

  return (
    <div className="mi-tab-content">
      <div className="mi-section-header">
        <h3>Market Benchmarks</h3>
        <LastUpdatedTag date={lastUpdated} />
      </div>

      <div className="mi-subtabs">
        {categories.map(cat => (
          <button
            key={cat}
            className={`mi-subtab ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => setSubTab(cat)}
          >
            {cat} ({grouped[cat].length})
          </button>
        ))}
      </div>

      <div className="table-section">
        <table>
          <thead>
            <tr>
              <th>{isOpportunity ? 'Opportunity' : 'Metric'}</th>
              {!isOpportunity && <th>Value</th>}
              <th>Platform</th>
              {!isOpportunity && <th>Year</th>}
              <th>Notes</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {activeBenchmarks.map((b, i) => (
              <tr key={i}>
                <td className="mi-bold">{b.metric_name}</td>
                {!isOpportunity && <td className="mi-highlight">{formatValue(b)}</td>}
                <td>{b.platform}</td>
                {!isOpportunity && <td>{b.year}{b.quarter ? ` Q${b.quarter}` : ''}</td>}
                <td style={{maxWidth: 400, whiteSpace: 'normal', lineHeight: '1.4', fontSize: 13}}>{b.notes}</td>
                <td>
                  {b.source_url ? (
                    <a href={b.source_url} target="_blank" rel="noopener noreferrer" className="mi-source-link">
                      {b.source}
                    </a>
                  ) : b.source}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MarketBenchmarks;
