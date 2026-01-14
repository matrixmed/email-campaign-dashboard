import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../../config/api';

const BidAnalysis = ({ searchTerm, startDate = null, endDate = null }) => {
  const [exchangeData, setExchangeData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let exchangeUrl = `${API_BASE_URL}/api/basis/exchange-stats?group_by=exchange`;

      if (startDate) exchangeUrl += `&start_date=${startDate}`;
      if (endDate) exchangeUrl += `&end_date=${endDate}`;

      const res = await fetch(exchangeUrl);
      const result = await res.json();

      if (result.status === 'success') {
        setExchangeData(result.data || []);
        setSummary(result.summary || {});
      }
    } catch (err) {
      console.error('Error fetching bid data:', err);
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

  const formatPercent = (num) => {
    if (!num && num !== 0) return '-';
    return num.toFixed(2) + '%';
  };

  const filteredData = searchTerm
    ? exchangeData.filter(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    : exchangeData;

  const sortedByWinRate = [...filteredData]
    .filter(d => d.win_rate != null)
    .sort((a, b) => (b.win_rate || 0) - (a.win_rate || 0));

  const avgWinRate = sortedByWinRate.length > 0
    ? sortedByWinRate.reduce((sum, d) => sum + (d.win_rate || 0), 0) / sortedByWinRate.length
    : 0;

  const totalPotentialGain = filteredData.reduce((sum, d) => sum + (d.potential_gain || 0), 0);
  const totalPotentialCost = filteredData.reduce((sum, d) => sum + (d.potential_cost || 0), 0);

  if (loading) {
    return (
      <div className="exchange-scorecard">
        <div className="exchange-loading">
          <div className="loading-spinner"></div>
          <p>Loading bid analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bid-analysis">
      <div className="exchange-scorecard">
        <div className="exchange-header">
          <div className="exchange-header-left">
            <h2>Bid Analysis</h2>
          </div>
          <div className="exchange-summary-stats">
            <div className="exchange-stat">
              <span className="exchange-stat-value">{formatNumber(summary.total_impressions)}</span>
              <span className="exchange-stat-label">Won</span>
            </div>
            <div className="exchange-stat">
              <span className="exchange-stat-value">{formatPercent(avgWinRate)}</span>
              <span className="exchange-stat-label">Avg Win Rate</span>
            </div>
            <div className="exchange-stat">
              <span className="exchange-stat-value">{formatCurrency(summary.avg_ecpm)}</span>
              <span className="exchange-stat-label">Avg eCPM</span>
            </div>
            <div className="exchange-stat">
              <span className="exchange-stat-value good">+{formatNumber(totalPotentialGain)}</span>
              <span className="exchange-stat-label">Potential +</span>
            </div>
          </div>
        </div>

        <div className="exchange-table-container">
          <table className="exchange-table">
            <thead>
              <tr>
                <th>Exchange</th>
                <th className="right">Volume</th>
                <th className="right">Bids</th>
                <th className="right">Won</th>
                <th className="right">Win Rate</th>
                <th className="right">eCPM</th>
                <th className="right">Potential +</th>
                <th className="right">Est. Cost</th>
                <th>Strategy</th>
              </tr>
            </thead>
            <tbody>
              {sortedByWinRate.map((item, idx) => {
                const winRate = item.win_rate || 0;
                const ecpmVsAvg = summary.avg_ecpm > 0 ? ((item.ecpm - summary.avg_ecpm) / summary.avg_ecpm) * 100 : 0;

                let strategy = 'Maintain';
                let strategyClass = 'average';

                if (winRate > 95) {
                  strategy = 'Lower Bid';
                  strategyClass = 'below_avg';
                } else if (winRate > 85) {
                  strategy = 'Optimized';
                  strategyClass = 'good';
                } else if (winRate < 50 && item.potential_gain > 0 && ecpmVsAvg < 0) {
                  strategy = 'Raise Bid';
                  strategyClass = 'excellent';
                } else if (winRate < 50 && item.potential_gain > 0) {
                  strategy = 'Test Raise';
                  strategyClass = 'average';
                } else if (winRate < 50) {
                  strategy = 'Low Wins';
                  strategyClass = 'below_avg';
                } else if (ecpmVsAvg < -15) {
                  strategy = 'Efficient';
                  strategyClass = 'excellent';
                } else if (ecpmVsAvg > 30) {
                  strategy = 'Expensive';
                  strategyClass = 'poor';
                }

                return (
                  <tr key={idx}>
                    <td>
                      <div className="exchange-name-cell">
                        <span className="exchange-rank">{idx + 1}</span>
                        <span className="exchange-name" title={item.name}>{item.name}</span>
                      </div>
                    </td>
                    <td className="right">{item.volume_pct || 0}%</td>
                    <td className="right">{formatNumber(item.bids || 0)}</td>
                    <td className="right">{formatNumber(item.impressions)}</td>
                    <td className={`right ${winRate > 90 ? 'negative' : winRate < 50 ? 'warning' : ''}`}>
                      {formatPercent(item.win_rate)}
                    </td>
                    <td className={`right ${ecpmVsAvg < -15 ? 'positive' : ecpmVsAvg > 30 ? 'negative' : ''}`}>
                      {formatCurrency(item.ecpm)}
                    </td>
                    <td className={`right ${item.potential_gain > 0 ? 'positive' : ''}`}>
                      {item.potential_gain > 0 ? `+${formatNumber(item.potential_gain)}` : '-'}
                    </td>
                    <td className="right">
                      {item.potential_cost > 0 ? formatCurrency(item.potential_cost) : '-'}
                    </td>
                    <td>
                      <span className={`status-badge status-${strategyClass}`}>{strategy}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="exchange-footer">
          <div className="footer-stats">
            <span className="footer-stat">
              <span className="dot excellent"></span>
              Efficient: {sortedByWinRate.filter(d => {
                const ecpm = summary.avg_ecpm > 0 ? ((d.ecpm - summary.avg_ecpm) / summary.avg_ecpm) * 100 : 0;
                return ecpm < -15 && (d.win_rate || 0) >= 60;
              }).length}
            </span>
            <span className="footer-stat">
              <span className="dot good"></span>
              Optimized: {sortedByWinRate.filter(d => (d.win_rate || 0) >= 70 && (d.win_rate || 0) <= 90).length}
            </span>
            <span className="footer-stat">
              <span className="dot below-avg"></span>
              Consider Lower: {sortedByWinRate.filter(d => (d.win_rate || 0) > 90).length}
            </span>
            <span className="footer-stat">
              <span className="dot poor"></span>
              Low Wins: {sortedByWinRate.filter(d => (d.win_rate || 0) < 50).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BidAnalysis;