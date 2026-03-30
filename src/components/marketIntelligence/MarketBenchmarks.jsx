import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';

const MarketBenchmarks = () => {
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
    const ch = b.channel || 'other';
    if (!grouped[ch]) grouped[ch] = [];
    grouped[ch].push(b);
  });

  const channels = Object.keys(grouped);
  const activeChannel = subTab || channels[0] || 'email';
  const activeBenchmarks = grouped[activeChannel] || [];

  const channelLabel = (ch) => ch.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  const formatValue = (b) => {
    if (b.metric_unit === 'USD') {
      if (b.metric_value >= 1000000000) return '$' + (b.metric_value / 1000000000).toFixed(1) + 'B';
      if (b.metric_value >= 1000000) return '$' + (b.metric_value / 1000000).toFixed(1) + 'M';
      if (b.metric_value >= 1000) return '$' + (b.metric_value / 1000).toFixed(1) + 'K';
      return '$' + b.metric_value.toFixed(2);
    }
    if (b.metric_unit === 'percent') return b.metric_value.toFixed(2) + '%';
    if (b.metric_unit === 'seconds') return b.metric_value.toFixed(0) + 's';
    if (b.metric_unit === 'count') return b.metric_value.toLocaleString();
    if (b.metric_unit === 'flag') return 'Yes';
    return b.metric_value.toLocaleString();
  };

  return (
    <div className="mi-tab-content">
      <div className="mi-section-header">
        <h3>Market Benchmarks</h3>
      </div>

      <div className="mi-subtabs">
        {channels.map(ch => (
          <button
            key={ch}
            className={`mi-subtab ${activeChannel === ch ? 'active' : ''}`}
            onClick={() => setSubTab(ch)}
          >
            {channelLabel(ch)}
          </button>
        ))}
      </div>

      <div className="table-section">
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Value</th>
              <th>Platform</th>
              <th>Year</th>
              <th>Source</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {activeBenchmarks.map((b, i) => (
              <tr key={i}>
                <td className="mi-bold">{b.metric_name}</td>
                <td className="mi-highlight">{formatValue(b)}</td>
                <td>{b.platform}</td>
                <td>{b.year}{b.quarter ? ` Q${b.quarter}` : ''}</td>
                <td className="mi-truncate" title={b.source}>{b.source}</td>
                <td className="mi-truncate" title={b.notes}>{b.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MarketBenchmarks;