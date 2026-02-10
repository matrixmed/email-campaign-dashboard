import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../../config/api';

const BasisRecommendations = ({ searchTerm }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedRec, setExpandedRec] = useState(null);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/basis/recommendations`);
      const data = await res.json();
      if (data.status === 'success') {
        setRecommendations(data.recommendations || []);
        setSummary(data.summary || {});
      }
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const getCategoryLabel = (category) => {
    const labels = {
      'cost_savings': 'Cost Savings',
      'growth': 'Growth',
      'engagement': 'Engagement',
      'efficiency': 'Efficiency'
    };
    return labels[category] || category;
  };

  const getTypeLabel = (type) => {
    const labels = {
      'exchange_bid_multiplier': 'Bid Multiplier',
      'exchange_disable': 'Disable Exchange',
      'domain_blocklist': 'Block Domain',
      'domain_allowlist': 'Create Allowlist',
      'domain_bid_cap': 'Cap Domain Bid',
      'frequency_cap': 'Frequency Cap',
      'diversification': 'Diversification'
    };
    return labels[type] || type?.replace(/_/g, ' ') || 'Unknown';
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const filteredRecs = recommendations.filter(rec => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      rec.title?.toLowerCase().includes(term) ||
      rec.exchange?.toLowerCase().includes(term) ||
      rec.domain?.toLowerCase().includes(term) ||
      rec.campaign_name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="basis-recommendations">
      <div className="basis-rec-subheader">
        <span className="basis-rec-subheader-title">Optimization Recommendations</span>
        <div className="basis-rec-subheader-stats">
          <div className="basis-rec-subheader-stat">
            <span className="stat-label">Total:</span>
            <span className="stat-value">{recommendations.length}</span>
          </div>
          {(summary.cost_savings_recs || 0) > 0 && (
            <div className="basis-rec-subheader-stat">
              <span className="stat-label">Cost Savings:</span>
              <span className="stat-value">{summary.cost_savings_recs}</span>
            </div>
          )}
          {(summary.growth_recs || 0) > 0 && (
            <div className="basis-rec-subheader-stat">
              <span className="stat-label">Growth:</span>
              <span className="stat-value">{summary.growth_recs}</span>
            </div>
          )}
          {(summary.engagement_recs || 0) > 0 && (
            <div className="basis-rec-subheader-stat">
              <span className="stat-label">Engagement:</span>
              <span className="stat-value">{summary.engagement_recs}</span>
            </div>
          )}
          {(summary.efficiency_recs || 0) > 0 && (
            <div className="basis-rec-subheader-stat">
              <span className="stat-label">Efficiency:</span>
              <span className="stat-value">{summary.efficiency_recs}</span>
            </div>
          )}
          {summary.estimated_total_savings > 0 && (
            <div className="basis-rec-subheader-stat savings">
              <span className="stat-label">Est. Savings:</span>
              <span className="stat-value">${summary.estimated_total_savings?.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="ab-loading">
          <div className="ab-loading-spinner"></div>
          <span>Analyzing campaign data...</span>
        </div>
      ) : filteredRecs.length === 0 ? (
        <div className="ab-empty-state">
          <div className="ab-empty-icon">&#10003;</div>
          <h3>System Optimized</h3>
          <p>
            No actionable recommendations at this time. Your campaigns are running efficiently.
          </p>
          {summary.portfolio_metrics && (
            <div className="basis-rec-optimal-metrics">
              <span>{formatNumber(summary.portfolio_metrics.total_impressions)} impressions</span>
              <span>${summary.portfolio_metrics.total_spend?.toLocaleString()} spend</span>
              <span>${summary.portfolio_metrics.avg_ecpm?.toFixed(2)} avg eCPM</span>
              <span>{summary.portfolio_metrics.overall_win_rate?.toFixed(0)}% win rate</span>
            </div>
          )}
        </div>
      ) : (
        <div className="basis-rec-list">
          {filteredRecs.map((rec) => (
            <div key={rec.id} className="ab-test-card">
              <div
                className="ab-test-card-header"
                onClick={() => setExpandedRec(expandedRec === rec.id ? null : rec.id)}
              >
                <div className="ab-test-card-title-row">
                  <span className={`basis-rec-priority ${rec.priority}`}></span>
                  <h3 className="ab-test-card-name">{rec.title}</h3>
                  <div className="ab-test-card-badges">
                    <span className={`ab-badge ab-badge-${rec.category}`}>
                      {getCategoryLabel(rec.category)}
                    </span>
                    <span className="ab-badge ab-badge-type">
                      {getTypeLabel(rec.type)}
                    </span>
                    {rec.impact?.estimated_savings && (
                      <span className="ab-badge ab-badge-savings">
                        Save ${rec.impact.estimated_savings.toLocaleString()}
                      </span>
                    )}
                    {rec.impact?.potential_impressions && (
                      <span className="ab-badge ab-badge-growth">
                        +{formatNumber(rec.impact.potential_impressions)} impr
                      </span>
                    )}
                  </div>
                  <span className={`ab-test-expand-icon ${expandedRec === rec.id ? 'expanded' : ''}`}>&#9662;</span>
                </div>
              </div>

              {expandedRec === rec.id && (
                <div className="ab-test-card-body">
                  <p className="basis-rec-description">{rec.description}</p>

                  <div className="basis-rec-details-grid">
                    {rec.current_state && (
                      <div className="basis-rec-detail-box">
                        <label>Current State</label>
                        <p>{rec.current_state}</p>
                      </div>
                    )}

                    {rec.action && (
                      <div className="basis-rec-detail-box action-box">
                        <label>Recommended Action</label>
                        <div className="basis-rec-action-content">
                          {rec.action.type === 'set_exchange_bid_multiplier' && (
                            <p><code>{rec.action.exchange}</code> → Set multiplier to <strong>{rec.action.recommended_multiplier}x</strong> <span className="action-note">(Target: {rec.action.target_win_rate}% win rate)</span></p>
                          )}
                          {rec.action.type === 'add_to_blocklist' && (
                            <p><code>{rec.action.domain}</code> → Add to <strong>blocklist</strong></p>
                          )}
                          {rec.action.type === 'create_allowlist' && (
                            <p>Create allowlist with <strong>{rec.action.domains?.length}</strong> high-performing domains</p>
                          )}
                          {rec.action.type === 'set_domain_bid_cap' && (
                            <p><code>{rec.action.domain}</code> → Set max bid to <strong>${rec.action.recommended_max_bid}</strong></p>
                          )}
                          {rec.action.type === 'disable_exchange' && (
                            <p><code>{rec.action.exchange}</code> → <strong>Disable</strong> this exchange</p>
                          )}
                          {rec.action.type === 'set_frequency_cap' && (
                            <p>{rec.action.note || `Set to ${rec.action.recommended_impressions} impressions per ${rec.action.recommended_hours} hours`}</p>
                          )}
                          {rec.action.type === 'review_exchange_mix' && (
                            <p>Review exchange distribution - <code>{rec.action.dominant_exchange}</code> has {rec.action.concentration_pct}% of volume</p>
                          )}
                        </div>
                      </div>
                    )}

                  </div>

                  {rec.metrics && (
                    <div className="basis-rec-metrics-row">
                      {rec.metrics.impressions && (
                        <div className="basis-rec-metric-item">
                          <span className="metric-value">{formatNumber(rec.metrics.impressions)}</span>
                          <span className="metric-label">Impressions</span>
                        </div>
                      )}
                      {rec.metrics.spend && (
                        <div className="basis-rec-metric-item">
                          <span className="metric-value">${rec.metrics.spend.toLocaleString()}</span>
                          <span className="metric-label">Spend</span>
                        </div>
                      )}
                      {rec.metrics.ecpm && (
                        <div className="basis-rec-metric-item">
                          <span className="metric-value">${rec.metrics.ecpm.toFixed(2)}</span>
                          <span className="metric-label">eCPM</span>
                        </div>
                      )}
                      {rec.metrics.win_rate && (
                        <div className="basis-rec-metric-item">
                          <span className="metric-value">{rec.metrics.win_rate.toFixed(0)}%</span>
                          <span className="metric-label">Win Rate</span>
                        </div>
                      )}
                      {rec.metrics.clicks !== undefined && (
                        <div className="basis-rec-metric-item">
                          <span className="metric-value">{rec.metrics.clicks}</span>
                          <span className="metric-label">Clicks</span>
                        </div>
                      )}
                      {rec.metrics.ctr && (
                        <div className="basis-rec-metric-item">
                          <span className="metric-value">{rec.metrics.ctr.toFixed(3)}%</span>
                          <span className="metric-label">CTR</span>
                        </div>
                      )}
                      {rec.impact?.confidence && (
                        <div className="basis-rec-metric-item">
                          <span className={`metric-value confidence-${rec.impact.confidence}`}>
                            {rec.impact.confidence.charAt(0).toUpperCase() + rec.impact.confidence.slice(1)}
                          </span>
                          <span className="metric-label">Confidence</span>
                        </div>
                      )}
                    </div>
                  )}

                  {rec.top_domains && rec.top_domains.length > 0 && (
                    <div className="basis-rec-detail-box">
                      <label>Top Performing Domains</label>
                      <div className="basis-rec-domain-list">
                        {rec.top_domains.map((d, idx) => (
                          <div key={idx} className="basis-rec-domain-item">
                            <span className="domain-name">{d.name}</span>
                            <span className="domain-stat">{d.ctr} CTR</span>
                            <span className="domain-stat">{formatNumber(d.impressions)} impr</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {rec.how_to && (
                    <div className="basis-rec-howto">
                      <label>How to Implement</label>
                      <p>{rec.how_to}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BasisRecommendations;
