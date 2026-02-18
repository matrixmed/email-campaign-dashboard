import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../../config/api';

const BasisOverview = ({ searchTerm }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [brandRes, exchRes, domainRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/basis/exchange-stats?group_by=brand`),
        fetch(`${API_BASE_URL}/api/basis/exchange-stats`),
        fetch(`${API_BASE_URL}/api/basis/property-stats?limit=10000&min_impressions=1&days=365`)
      ]);

      const brandData = await brandRes.json();
      const exchData = await exchRes.json();
      const domainData = await domainRes.json();

      if (brandData.status === 'success' && exchData.status === 'success') {
        setData({
          brands: brandData.data || [],
          brandSummary: brandData.summary || {},
          exchanges: exchData.exchanges || exchData.data || [],
          exchangeSummary: exchData.summary || {},
          domains: domainData.data || [],
          domainSummary: domainData.summary || {}
        });
      }
    } catch (err) {
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

  const formatPercent = (num) => {
    if (!num && num !== 0) return '-';
    return num.toFixed(2) + '%';
  };

  if (loading) {
    return (
      <div className="overview-container">
        <div className="overview-loading">
          <div className="loading-spinner"></div>
          <p>Loading overview...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="overview-container">
        <div className="overview-empty">
          <h3>No Data Available</h3>
          <p>Run the sync pipeline to pull performance data from Basis.</p>
        </div>
      </div>
    );
  }

  const { brands, brandSummary, exchanges, exchangeSummary, domains, domainSummary } = data;

  const growthOpportunities = [...exchanges]
    .filter(e => e.potential_gain > 0 && e.win_rate < 70 && e.win_rate > 0)
    .sort((a, b) => (b.potential_gain || 0) - (a.potential_gain || 0))
    .slice(0, 5);

  const costSavings = exchanges.filter(e => e.win_rate > 90);

  const totalPotentialGain = growthOpportunities.reduce((sum, e) => sum + (e.potential_gain || 0), 0);

  const topVolumeExchanges = [...exchanges]
    .sort((a, b) => (b.volume_pct || 0) - (a.volume_pct || 0))
    .slice(0, 8);

  const bestValueExchanges = exchanges
    .filter(e => e.vs_avg_ecpm < 0 && e.volume_pct >= 2)
    .sort((a, b) => a.vs_avg_ecpm - b.vs_avg_ecpm)
    .slice(0, 3);

  const topDomains = domains.filter(d => d.status === 'excellent' || d.status === 'good').slice(0, 5);
  const poorDomains = domains.filter(d => d.status === 'poor').slice(0, 5);

  return (
    <div className="overview-container">
      <div className="overview-summary-grid">
        <div className="summary-card primary">
          <span className="summary-value">{formatNumber(exchangeSummary.total_impressions)}</span>
          <span className="summary-label">Total Impressions</span>
        </div>
        <div className="summary-card">
          <span className="summary-value">{formatNumber(exchangeSummary.total_clicks)}</span>
          <span className="summary-label">Total Clicks</span>
        </div>
        <div className="summary-card">
          <span className="summary-value">{formatCurrency(exchangeSummary.total_spend)}</span>
          <span className="summary-label">Total Spend</span>
        </div>
        <div className="summary-card">
          <span className="summary-value">{formatCurrency(exchangeSummary.avg_ecpm)}</span>
          <span className="summary-label">Avg eCPM</span>
        </div>
        <div className="summary-card">
          <span className="summary-value">{formatCurrency(exchangeSummary.avg_ecpc)}</span>
          <span className="summary-label">Avg eCPC</span>
        </div>
        <div className="summary-card">
          <span className="summary-value">{exchangeSummary.avg_ctr?.toFixed(3)}%</span>
          <span className="summary-label">Avg CTR</span>
        </div>
      </div>

      <div className="exchange-scorecard">
        <div className="exchange-table-container">
          <table className="exchange-table">
            <thead>
              <tr>
                <th>Brand</th>
                <th className="right">Campaigns</th>
                <th className="right">Impressions</th>
                <th className="right">Clicks</th>
                <th className="right">Spend</th>
                <th className="right">eCPM</th>
                <th className="right">vs Avg</th>
                <th className="right">CTR</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand, idx) => (
                <tr key={idx}>
                  <td>
                    <div className="exchange-name-cell">
                      <span className="exchange-rank">{idx + 1}</span>
                      <span className="exchange-name">{brand.name}</span>
                    </div>
                  </td>
                  <td className="right">{brand.campaign_count || '-'}</td>
                  <td className="right">{formatNumber(brand.impressions)}</td>
                  <td className="right">{formatNumber(brand.clicks)}</td>
                  <td className="right">{formatCurrency(brand.spend)}</td>
                  <td className="right">{formatCurrency(brand.ecpm)}</td>
                  <td className={`right ${brand.vs_avg_ecpm < 0 ? 'positive' : brand.vs_avg_ecpm > 30 ? 'negative' : ''}`}>
                    {brand.vs_avg_ecpm > 0 ? '+' : ''}{brand.vs_avg_ecpm}%
                  </td>
                  <td className="right">{brand.ctr?.toFixed(3)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overview-two-column">
        <div className="overview-card">
          <div className="overview-card-header">
            <h3>Volume Distribution</h3>
          </div>
          <div className="volume-bars">
            {topVolumeExchanges.map((ex, idx) => (
              <div key={idx} className="volume-row">
                <span className="volume-name" title={ex.name}>{ex.name}</span>
                <div className="volume-bar-container">
                  <div
                    className={`volume-bar ${ex.vs_avg_ecpm < 0 ? 'efficient' : ex.vs_avg_ecpm > 30 ? 'expensive' : ''}`}
                    style={{ width: `${Math.min((ex.volume_pct || 0) * 2, 100)}%` }}
                  />
                </div>
                <span className="volume-pct">{ex.volume_pct}%</span>
                <span className={`volume-cost ${ex.vs_avg_ecpm < 0 ? 'good' : ex.vs_avg_ecpm > 30 ? 'bad' : ''}`}>
                  {formatCurrency(ex.ecpm)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-card-header">
            <h3>Best Value Exchanges</h3>
          </div>
          <div className="best-value-list">
            {bestValueExchanges.length > 0 ? bestValueExchanges.map((ex, idx) => (
              <div key={idx} className="best-value-item">
                <div className="best-value-main">
                  <span className="best-value-name">{ex.name}</span>
                  <span className="best-value-volume">{ex.volume_pct}% volume</span>
                </div>
                <div className="best-value-stats">
                  <span className="best-value-ecpm">{formatCurrency(ex.ecpm)} eCPM</span>
                  <span className="best-value-vs positive">{ex.vs_avg_ecpm}% vs avg</span>
                </div>
              </div>
            )) : (
              <div className="empty-state">No high-value exchanges identified</div>
            )}
          </div>
        </div>
      </div>

      {growthOpportunities.length > 0 && (
        <div className="exchange-scorecard">
          <div className="exchange-header">
            <div className="exchange-header-left">
              <h2>Growth Opportunities</h2>
            </div>
          </div>
          <div className="opportunity-grid">
            {growthOpportunities.map((item, idx) => {
              const targetWinRate = 70;
              const currentWinRate = item.win_rate || 1;
              const bidMultiplier = Math.sqrt(targetWinRate / currentWinRate);
              const recommendedBid = item.ecpm * bidMultiplier;
              const bidChange = ((bidMultiplier - 1) * 100).toFixed(0);

              return (
                <div key={idx} className="opportunity-card">
                  <div className="opportunity-header">
                    <span className="opportunity-name">{item.name}</span>
                    <span className="opportunity-volume">{item.volume_pct}% volume</span>
                  </div>
                  <div className="opportunity-body">
                    <div className="opportunity-current">
                      <span className="opp-label">Current</span>
                      <span className="opp-value">{formatNumber(item.impressions)} impr</span>
                      <span className="opp-detail">Win rate: {formatPercent(item.win_rate)}</span>
                    </div>
                    <div className="opportunity-arrow">→</div>
                    <div className="opportunity-potential">
                      <span className="opp-label">If raised to 70%</span>
                      <span className="opp-value highlight">+{formatNumber(item.potential_gain)} impr</span>
                      <span className="opp-detail">Est. cost: {formatCurrency(item.potential_cost)}</span>
                    </div>
                  </div>
                  <div className="opportunity-footer">
                    <span className="opp-ecpm">eCPM: {formatCurrency(item.ecpm)}</span>
                    <span className="opp-bid-rec">Raise to ~${recommendedBid.toFixed(2)} (+{bidChange}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {costSavings.length > 0 && (
        <div className="exchange-scorecard">
          <div className="exchange-header">
            <div className="exchange-header-left">
              <h2>Cost Savings Opportunities</h2>
            </div>
          </div>
          <div className="opportunity-grid">
            {costSavings.slice(0, 5).map((item, idx) => {
              const targetWinRate = 75;
              const currentWinRate = item.win_rate || 100;
              const bidMultiplier = Math.sqrt(targetWinRate / currentWinRate);
              const recommendedBid = item.ecpm * bidMultiplier;
              const bidChange = Math.abs((1 - bidMultiplier) * 100).toFixed(0);
              const potentialSavings = (item.spend || 0) * (1 - bidMultiplier);

              return (
                <div key={idx} className="opportunity-card savings">
                  <div className="opportunity-header">
                    <span className="opportunity-name">{item.name}</span>
                    <span className="opportunity-volume">{item.volume_pct}% volume</span>
                  </div>
                  <div className="opportunity-body">
                    <div className="opportunity-current">
                      <span className="opp-label">Current</span>
                      <span className="opp-value">{formatNumber(item.impressions)} impr</span>
                      <span className="opp-detail">Win rate: {formatPercent(item.win_rate)}</span>
                    </div>
                    <div className="opportunity-arrow">→</div>
                    <div className="opportunity-potential">
                      <span className="opp-label">Target: 75% win rate</span>
                      <span className="opp-value highlight savings">Save ~{formatCurrency(potentialSavings)}</span>
                      <span className="opp-detail">Same volume, lower cost</span>
                    </div>
                  </div>
                  <div className="opportunity-footer">
                    <span className="opp-ecpm">Current eCPM: {formatCurrency(item.ecpm)}</span>
                    <span className="opp-bid-rec savings">Lower to ~${recommendedBid.toFixed(2)} (-{bidChange}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default BasisOverview;