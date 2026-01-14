import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../../config/api';

const ExchangeScorecard = ({ searchTerm, startDate = null, endDate = null }) => {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/api/basis/exchange-stats?group_by=exchange`;
      if (startDate) {
        url += `&start_date=${startDate}`;
      }
      if (endDate) {
        url += `&end_date=${endDate}`;
      }

      const res = await fetch(url);
      const result = await res.json();
      if (result.status === 'success') {
        setData(result.exchanges || result.data || []);
        setSummary(result.summary || {});
      }
    } catch (err) {
      console.error('Error fetching exchange data:', err);
    }
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (num) => {
    if (!num && num !== 0) return '-';
    return '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const filteredData = searchTerm
    ? data.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : data;

  if (loading) {
    return (
      <div className="exchange-scorecard">
        <div className="exchange-loading">
          <div className="loading-spinner"></div>
          <p>Loading data...</p>
        </div>
      </div>
    );
  }

  if (filteredData.length === 0) {
    return (
      <div className="exchange-scorecard">
        <div className="exchange-empty">
          <h3>No Data Found</h3>
          <p>No data available for the selected timeframe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="exchange-scorecard">
      <div className="exchange-header">
        <div className="exchange-header-left">
          <h2>Exchange Performance</h2>
        </div>
        <div className="exchange-summary-stats">
          <div className="exchange-stat">
            <span className="exchange-stat-value">{formatNumber(summary.total_impressions)}</span>
            <span className="exchange-stat-label">Impressions</span>
          </div>
          <div className="exchange-stat">
            <span className="exchange-stat-value">{formatNumber(summary.total_clicks)}</span>
            <span className="exchange-stat-label">Clicks</span>
          </div>
          <div className="exchange-stat">
            <span className="exchange-stat-value">{formatCurrency(summary.total_spend)}</span>
            <span className="exchange-stat-label">Spend</span>
          </div>
          <div className="exchange-stat">
            <span className="exchange-stat-value">{formatCurrency(summary.avg_ecpm)}</span>
            <span className="exchange-stat-label">Avg eCPM</span>
          </div>
        </div>
      </div>

      <div className="exchange-table-container">
        <table className="exchange-table">
          <thead>
            <tr>
              <th>Exchange</th>
              <th className="right">Volume</th>
              <th className="right">Impressions</th>
              <th className="right">Clicks</th>
              <th className="right">Win Rate</th>
              <th className="right">Spend</th>
              <th className="right">eCPM</th>
              <th className="right">vs Avg</th>
              <th>Action</th>
              <th className="insight-col">Insight</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item, idx) => (
              <tr key={idx} className={`row-${item.status}`}>
                <td>
                  <div className="exchange-name-cell">
                    <span className="exchange-rank">{item.rank}</span>
                    <span className="exchange-name" title={item.name}>{item.name}</span>
                  </div>
                </td>
                <td className={`right volume-cell ${item.volume_pct >= 8 ? 'high-volume' : item.volume_pct >= 3 ? 'med-volume' : ''}`}>
                  {item.volume_pct}%
                </td>
                <td className="right">{formatNumber(item.impressions)}</td>
                <td className="right">{formatNumber(item.clicks)}</td>
                <td className={`right ${item.win_rate > 90 ? 'overbid' : item.win_rate < 50 && item.win_rate > 0 ? 'opportunity' : ''}`}>
                  {item.win_rate ? `${item.win_rate.toFixed(0)}%` : '-'}
                </td>
                <td className="right">{formatCurrency(item.spend)}</td>
                <td className="right">{formatCurrency(item.ecpm)}</td>
                <td className={`right variance-cell ${item.vs_avg_ecpm < 0 ? 'positive' : item.vs_avg_ecpm > 30 ? 'negative' : ''}`}>
                  {item.vs_avg_ecpm > 0 ? '+' : ''}{item.vs_avg_ecpm}%
                </td>
                <td>
                  <span className={`status-badge ${item.status}`}>
                    {item.recommendation_text}
                  </span>
                </td>
                <td className="insight-cell">
                  <span className="action-detail" title={item.action_detail}>
                    {item.action_detail}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="exchange-footer">
        <div className="footer-stats">
          <span className="footer-stat">
            <span className="dot excellent"></span>
            Excellent: {summary.excellent_count || 0}
          </span>
          <span className="footer-stat">
            <span className="dot good"></span>
            Good: {summary.good_count || 0}
          </span>
          <span className="footer-stat">
            <span className="dot average"></span>
            Average: {summary.average_count || 0}
          </span>
          <span className="footer-stat">
            <span className="dot below-avg"></span>
            Below Avg: {summary.below_avg_count || 0}
          </span>
          <span className="footer-stat">
            <span className="dot poor"></span>
            Poor: {summary.poor_count || 0}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ExchangeScorecard;