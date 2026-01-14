import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../../config/api';

const BasisDomains = ({ searchTerm, startDate, endDate }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState('impressions');
  const [sortDir, setSortDir] = useState('desc');
  const [displayCount, setDisplayCount] = useState(100);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', 10000);
      params.append('min_impressions', 1);
      params.append('days', 365);

      const res = await fetch(`${API_BASE_URL}/api/basis/property-stats?${params}`);
      const result = await res.json();

      if (result.status === 'success') {
        setData(result);
      }
    } catch (err) {
      console.error('Error fetching domain data:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (num) => {
    if (!num && num !== 0) return '$0.00';
    return '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const loadMore = () => {
    setDisplayCount(prev => prev + 25);
  };

  if (loading) {
    return (
      <div className="domains-container">
        <div className="domains-loading">
          <div className="loading-spinner"></div>
          <p>Loading domain analysis...</p>
        </div>
      </div>
    );
  }

  if (!data || !data.data || data.data.length === 0) {
    return (
      <div className="domains-container">
        <div className="domains-empty">
          <h3>No Domain Data</h3>
          <p>No property/domain level data available. Run the sync to pull domain data from Basis.</p>
        </div>
      </div>
    );
  }

  const { summary } = data;
  let domains = [...data.data];

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    domains = domains.filter(d =>
      d.property_name?.toLowerCase().includes(term) ||
      d.exchange?.toLowerCase().includes(term)
    );
  }

  const statusOrder = { excellent: 1, good: 2, average: 3, below_avg: 4, poor: 5 };

  domains.sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === 'status') {
      aVal = statusOrder[aVal] || 99;
      bVal = statusOrder[bVal] || 99;
    } else if (typeof aVal === 'string') {
      aVal = aVal?.toLowerCase() || '';
      bVal = bVal?.toLowerCase() || '';
    }

    if (sortDir === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  const getStatusBadge = (status) => {
    const labels = {
      excellent: 'Excellent',
      good: 'Good',
      average: 'Average',
      below_avg: 'Below Avg',
      poor: 'Poor'
    };
    return <span className={`status-badge status-${status}`}>{labels[status] || status}</span>;
  };

  const SortHeader = ({ field, label, right = false }) => (
    <th
      className={`sortable ${sortField === field ? 'active' : ''} ${right ? 'right' : ''}`}
      onClick={() => handleSort(field)}
    >
      {label}
      {sortField === field && (
        <span className="sort-arrow">{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>
      )}
    </th>
  );

  const displayedDomains = domains.slice(0, displayCount);
  const hasMore = displayCount < domains.length;

  return (
    <div className="domains-container">
      <div className="exchange-scorecard">
        <div className="exchange-header">
          <div className="exchange-header-left">
            <h2>Domain Performance</h2>
          </div>
          <div className="exchange-header-right">
            <div className="exchange-summary-stats">
              <div className="exchange-stat">
                <span className="exchange-stat-value">{summary.total_properties?.toLocaleString()}</span>
                <span className="exchange-stat-label">Total Domains</span>
              </div>
              <div className="exchange-stat">
                <span className="exchange-stat-value good">{(summary.excellent_count + summary.good_count)?.toLocaleString()}</span>
                <span className="exchange-stat-label">High Performers</span>
              </div>
              <div className="exchange-stat">
                <span className="exchange-stat-value bad">{summary.poor_count?.toLocaleString()}</span>
                <span className="exchange-stat-label">Poor Performers</span>
              </div>
              <div className="exchange-stat">
                <span className="exchange-stat-value">{formatCurrency(summary.avg_ecpm)}</span>
                <span className="exchange-stat-label">Avg eCPM</span>
              </div>
              <div className="exchange-stat">
                <span className="exchange-stat-value">{(summary.avg_ctr * 100).toFixed(2)}%</span>
                <span className="exchange-stat-label">Avg CTR</span>
              </div>
            </div>
            {hasMore && (
              <button className="expand-all-btn" onClick={() => setDisplayCount(domains.length)}>
                Expand All
              </button>
            )}
          </div>
        </div>

        <div className="exchange-table-container">
          <table className="exchange-table">
            <thead>
              <tr>
                <SortHeader field="property_name" label="Domain/App" />
                <SortHeader field="status" label="Status" right />
                <SortHeader field="impressions" label="Impressions" right />
                <SortHeader field="clicks" label="Clicks" right />
                <SortHeader field="spend" label="Spend" right />
                <SortHeader field="ecpm" label="eCPM" right />
                <SortHeader field="vs_avg_ecpm" label="vs Avg" right />
                <SortHeader field="ctr" label="CTR" right />
                <SortHeader field="ecpc" label="eCPC" right />
              </tr>
            </thead>
            <tbody>
              {displayedDomains.map((d, idx) => (
                <tr key={idx}>
                  <td title={d.property_name}>
                    <div className="exchange-name-cell">
                      <span className="exchange-rank">{idx + 1}</span>
                      <span className="exchange-name">
                        {d.property_name?.length > 50 ? d.property_name.slice(0, 50) + '...' : d.property_name}
                      </span>
                    </div>
                  </td>
                  <td className="right">{getStatusBadge(d.status)}</td>
                  <td className="right">{formatNumber(d.impressions)}</td>
                  <td className="right">{formatNumber(d.clicks)}</td>
                  <td className="right">{formatCurrency(d.spend)}</td>
                  <td className="right">{formatCurrency(d.ecpm)}</td>
                  <td className={`right ${d.vs_avg_ecpm < 0 ? 'positive' : d.vs_avg_ecpm > 30 ? 'negative' : ''}`}>
                    {d.vs_avg_ecpm > 0 ? '+' : ''}{d.vs_avg_ecpm}%
                  </td>
                  <td className="right">{(d.ctr * 100).toFixed(3)}%</td>
                  <td className="right">{d.ecpc ? formatCurrency(d.ecpc) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {hasMore && (
          <div className="load-more-container">
            <button className="load-more-btn" onClick={loadMore}>
              Load More ({(domains.length - displayCount).toLocaleString()} remaining)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BasisDomains;