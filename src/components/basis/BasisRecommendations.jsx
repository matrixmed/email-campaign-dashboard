import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../../config/api';

const BasisRecommendations = ({ searchTerm }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRec, setExpandedRec] = useState(null);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/basis/recommendations`);
      const data = await res.json();
      if (data.status === 'success') {
        setRecommendations(data.recommendations || []);
      }
    } catch (err) {
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const getTypeLabel = (type) => {
    const labels = {
      'bid_increase': 'Raise Bid',
      'bid_decrease': 'Lower Bid',
      'bid_test': 'Test Bid',
      'bid_optimize': 'Optimize',
      'exchange_reduce': 'Reduce',
      'exchange_block': 'Block',
      'domain_block': 'Block Domain',
      'domain_reduce': 'Review Domain',
      'underperformance': 'Underperformer',
      'high_performer': 'High Performer',
      'pacing_alert': 'Pacing',
      'vendor_optimization': 'Vendor',
      'exchange_opportunity': 'Opportunity'
    };
    return labels[type] || type?.replace('_', ' ') || 'Unknown';
  };

  const filteredRecs = recommendations.filter(rec => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      rec.title?.toLowerCase().includes(term) ||
      rec.campaign_name?.toLowerCase().includes(term) ||
      rec.vendor_name?.toLowerCase().includes(term)
    );
  });

  const highCount = filteredRecs.filter(r => r.priority === 'high').length;
  const mediumCount = filteredRecs.filter(r => r.priority === 'medium').length;
  const lowCount = filteredRecs.filter(r => r.priority === 'low').length;

  return (
    <div className="recommendations-redesign">
      <div className="exchange-scorecard">
        <div className="exchange-header">
          <div className="exchange-header-left">
            <h2>Recommendations</h2>
          </div>
          <div className="exchange-summary-stats">
            <div className="exchange-stat">
              <span className="exchange-stat-value bad">{highCount}</span>
              <span className="exchange-stat-label">High Priority</span>
            </div>
            <div className="exchange-stat">
              <span className="exchange-stat-value" style={{ color: '#f59e0b' }}>{mediumCount}</span>
              <span className="exchange-stat-label">Medium</span>
            </div>
            <div className="exchange-stat">
              <span className="exchange-stat-value good">{lowCount}</span>
              <span className="exchange-stat-label">Low</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="exchange-loading">
            <div className="loading-spinner"></div>
            <p>Loading recommendations...</p>
          </div>
        ) : filteredRecs.length === 0 ? (
          <div className="exchange-empty">
            <h3>No Recommendations</h3>
            <p>System is running optimally. No actions needed.</p>
          </div>
        ) : (
          <div className="rec-list-container">
            {filteredRecs.map((rec) => (
              <div key={rec.id} className={`rec-card ${expandedRec === rec.id ? 'expanded' : ''}`}>
                <div
                  className="rec-card-header"
                  onClick={() => setExpandedRec(expandedRec === rec.id ? null : rec.id)}
                >
                  <div className="rec-card-left">
                    <span className={`rec-priority-dot ${rec.priority}`}></span>
                    <span className={`rec-type-tag ${rec.recommendation_type}`}>
                      {getTypeLabel(rec.recommendation_type)}
                    </span>
                    <span className="rec-title">{rec.title}</span>
                  </div>
                  <div className="rec-card-right">
                    {rec.confidence_score && (
                      <span className="rec-confidence">
                        {Math.round(rec.confidence_score * 100)}%
                      </span>
                    )}
                    <span className={`rec-expand-icon ${expandedRec === rec.id ? 'open' : ''}`}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  </div>
                </div>

                {expandedRec === rec.id && (
                  <div className="rec-card-body">
                    <p className="rec-description">{rec.description}</p>

                    <div className="rec-details-grid">
                      {rec.campaign_name && (
                        <div className="rec-detail-item">
                          <span className="rec-detail-label">Campaign</span>
                          <span className="rec-detail-value">{rec.campaign_name}</span>
                        </div>
                      )}
                      {rec.vendor_name && (
                        <div className="rec-detail-item">
                          <span className="rec-detail-label">Exchange</span>
                          <span className="rec-detail-value">{rec.vendor_name}</span>
                        </div>
                      )}
                      {rec.expected_impact && (
                        <div className="rec-detail-item">
                          <span className="rec-detail-label">Expected Impact</span>
                          <span className="rec-detail-value">{rec.expected_impact}</span>
                        </div>
                      )}
                    </div>

                    {rec.rationale && (
                      <div className="rec-rationale">
                        <span className="rec-detail-label">Rationale</span>
                        <p>{rec.rationale}</p>
                      </div>
                    )}

                    {rec.baseline_metrics && (
                      <div className="rec-metrics">
                        <span className="rec-detail-label">Current Performance</span>
                        <div className="rec-metrics-row">
                          {rec.baseline_metrics.impressions && (
                            <span className="rec-metric">
                              <strong>{rec.baseline_metrics.impressions.toLocaleString()}</strong> Impressions
                            </span>
                          )}
                          {rec.baseline_metrics.clicks && (
                            <span className="rec-metric">
                              <strong>{rec.baseline_metrics.clicks.toLocaleString()}</strong> Clicks
                            </span>
                          )}
                          {rec.baseline_metrics.ecpm && (
                            <span className="rec-metric">
                              <strong>${rec.baseline_metrics.ecpm.toFixed(2)}</strong> eCPM
                            </span>
                          )}
                          {rec.baseline_metrics.win_rate && (
                            <span className="rec-metric">
                              <strong>{rec.baseline_metrics.win_rate.toFixed(0)}%</strong> Win Rate
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {rec.expected_outcome && (
                      <div className="rec-expected-outcome">
                        <span className="rec-detail-label">Expected Outcome</span>
                        <div className="rec-outcome-grid">
                          {rec.expected_outcome.impressions_gain && (
                            <div className="outcome-item positive">
                              <span className="outcome-value">+{rec.expected_outcome.impressions_gain.toLocaleString()}</span>
                              <span className="outcome-label">Impressions</span>
                            </div>
                          )}
                          {rec.expected_outcome.cost_change && (
                            <div className={`outcome-item ${rec.expected_outcome.cost_change < 0 ? 'positive' : 'neutral'}`}>
                              <span className="outcome-value">
                                {rec.expected_outcome.cost_change >= 0 ? '+' : '-'}${Math.abs(rec.expected_outcome.cost_change).toLocaleString()}
                              </span>
                              <span className="outcome-label">{rec.expected_outcome.cost_change >= 0 ? 'Cost' : 'Savings'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {rec.action_items && rec.action_items.length > 0 && (
                      <div className="rec-actions-list">
                        <span className="rec-detail-label">Actions</span>
                        <ul>
                          {rec.action_items.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BasisRecommendations;