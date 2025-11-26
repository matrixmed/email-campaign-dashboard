import React, { useState, useEffect } from 'react';
import '../../styles/CampaignBenchmarks.css';
import { API_BASE_URL } from '../../config/api';

const CampaignBenchmarks = () => {
  const [loading, setLoading] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [filterByTopic, setFilterByTopic] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [activeTab, setActiveTab] = useState('performance');
  const [hasRun, setHasRun] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [showCampaignSelector, setShowCampaignSelector] = useState(false);
  const [campaignSearchTerm, setCampaignSearchTerm] = useState('');

  const API_BASE = `${API_BASE_URL}/api`;

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const dashboardMetricsUrl = 'https://emaildash.blob.core.windows.net/json-data/dashboard_metrics.json?sp=r&st=2025-06-09T18:55:36Z&se=2027-06-17T02:55:36Z&spr=https&sv=2024-11-04&sr=b&sig=9o5%2B%2BHmlqiFuAQmw9bGl0D2485Z8xTy0XXsb10S2aCI%3D';
      const response = await fetch(dashboardMetricsUrl);
      if (response.ok) {
        const data = await response.json();
        const validCampaigns = Array.isArray(data) ? data : [];
        setCampaigns(validCampaigns);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    }
  };

  const handleCampaignToggle = (campaign) => {
    setSelectedCampaign(campaign);
  };

  const fetchBenchmarkData = async () => {
    setLoading(true);
    setHasRun(true);
    try {
      const response = await fetch(`${API_BASE}/analytics/campaign-benchmarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: selectedCampaign?.campaign_id?.[0] || null,
          campaign_name: selectedCampaign?.campaign_name || null,
          filters: {
            filter_by_topic: filterByTopic,
            month: selectedMonth
          }
        })
      });
      const data = await response.json();
      setBenchmarkData(data);
    } catch (error) {
      console.error('Error fetching benchmark data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.campaign_name.toLowerCase().includes(campaignSearchTerm.toLowerCase())
  );

  const renderPerformanceScore = () => {
    if (!benchmarkData?.campaign || !benchmarkData?.benchmarks) return null;

    const { campaign, classification, benchmarks, grade, overall_score, similar_count } = benchmarkData;

    return (
      <div className="performance-score-container">
        <div className="score-header">
          <div className="campaign-info">
            <h3>{campaign.campaign_name}</h3>
            <p className="campaign-date">Sent: {new Date(campaign.send_date).toLocaleDateString()}</p>
            {classification && (
              <div className="classification-badges">
                <span className="classification-badge bucket">{classification.bucket}</span>
                {classification.topic && classification.topic !== 'Other' && (
                  <span className="classification-badge topic">{classification.topic}</span>
                )}
              </div>
            )}
          </div>
          <div className="grade-badge">
            <div className="grade-letter">{grade}</div>
            <div className="grade-score">{overall_score}th percentile</div>
          </div>
        </div>

        <div className="benchmark-cards">
          {Object.entries(benchmarks).map(([metric, data]) => {
            const metricName = metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return (
              <div key={metric} className="benchmark-card">
                <h4>{metricName}</h4>
                <div className="metric-value">{data.your_value?.toFixed(1)}%</div>
                <div className="benchmark-bar">
                  <div className="benchmark-range">
                    <span className="range-label">25th</span>
                    <span className="range-value">{data.p25?.toFixed(1)}%</span>
                  </div>
                  <div className="percentile-track">
                    <div
                      className="percentile-marker"
                      style={{ left: `${data.your_percentile}%` }}
                      title={`${data.your_percentile}th percentile`}
                    />
                  </div>
                  <div className="benchmark-range">
                    <span className="range-label">75th</span>
                    <span className="range-value">{data.p75?.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="benchmark-stats">
                  <div className="stat">
                    <span className="stat-label">Median:</span>
                    <span className="stat-value">{data.median?.toFixed(1)}%</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Top 10%:</span>
                    <span className="stat-value">{data.p90?.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="comparison-summary">
          <p>Based on <strong>{similar_count}</strong> similar campaigns in <strong>{classification?.bucket || 'this category'}</strong></p>
        </div>
      </div>
    );
  };

  const renderSimilarCampaigns = () => {
    if (!benchmarkData?.similar_campaigns) return null;

    const { similar_campaigns } = benchmarkData;

    return (
      <div className="similar-campaigns-container">
        <h3>Similar Campaigns</h3>
        <p className="section-subtitle">Campaigns matching the bucket{filterByTopic ? ' and topic' : ''}</p>

        <div className="campaigns-table-wrapper">
          <table className="campaigns-table">
            <thead>
              <tr>
                <th>Campaign Name</th>
                <th>Send Date</th>
                <th>Unique Open Rate</th>
                <th>Unique Click Rate</th>
                <th>Sends</th>
                <th>Similarity</th>
              </tr>
            </thead>
            <tbody>
              {similar_campaigns.map((camp, idx) => (
                <tr key={idx}>
                  <td className="campaign-name-cell">{camp.campaign_name}</td>
                  <td>{new Date(camp.send_date).toLocaleDateString()}</td>
                  <td>
                    <span className={camp.open_rate_delta > 0 ? 'positive' : camp.open_rate_delta < 0 ? 'negative' : ''}>
                      {camp.unique_open_rate?.toFixed(1)}%
                      {camp.open_rate_delta !== undefined && (
                        <span className="delta"> ({camp.open_rate_delta > 0 ? '+' : ''}{camp.open_rate_delta?.toFixed(1)}%)</span>
                      )}
                    </span>
                  </td>
                  <td>{camp.unique_click_rate?.toFixed(1)}%</td>
                  <td>{camp.delivered?.toLocaleString()}</td>
                  <td>
                    <div className="similarity-badge">{camp.similarity_score}%</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderSuccessFactors = () => {
    if (!benchmarkData?.success_factors) return null;

    const { success_factors } = benchmarkData;

    return (
      <div className="success-factors-container">
        <h3>Success Factors</h3>
        <p className="section-subtitle">Performance patterns within this campaign type</p>

        <div className="factors-grid">
          {success_factors.map((factor, idx) => (
            <div key={idx} className="factor-card">
              <div className="factor-header">
                <h4>{factor.factor}</h4>
                <div className="factor-performance">{factor.avg_performance?.toFixed(1)}%</div>
              </div>
              <div className="factor-details">
                <span className="factor-sample">Based on {factor.sample_size} campaigns</span>
                {factor.vs_overall && (
                  <span className={`factor-delta ${factor.vs_overall > 0 ? 'positive' : 'negative'}`}>
                    {factor.vs_overall > 0 ? '+' : ''}{factor.vs_overall?.toFixed(1)}% vs avg
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPercentileRanking = () => {
    if (!benchmarkData?.benchmarks) return null;

    const { benchmarks } = benchmarkData;

    return (
      <div className="percentile-ranking-container">
        <h3>Percentile Rankings</h3>
        <p className="section-subtitle">Where the campaign ranks across all metrics</p>

        <div className="ranking-bars">
          {Object.entries(benchmarks).map(([metric, data]) => {
            const metricName = metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const percentile = data.your_percentile || 0;

            return (
              <div key={metric} className="ranking-item">
                <div className="ranking-label">{metricName}</div>
                <div className="ranking-bar-wrapper">
                  <div className="ranking-bar" style={{ width: `${percentile}%` }}>
                    <span className="ranking-value">{percentile}th %ile</span>
                  </div>
                </div>
                <div className="ranking-value-text">{data.your_value?.toFixed(1)}%</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="campaign-benchmarks">
        <div className="loading-container">
          <div className="spinner">
            <div></div><div></div><div></div><div></div><div></div><div></div>
          </div>
          <p>Analyzing campaign performance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="campaign-benchmarks">
      <div className="benchmark-filters">
        <div className="filter-row">
          <div className="filter-group full-width">
            <label>Select Campaign to Benchmark</label>
            <button
              type="button"
              className="selector-button"
              onClick={() => setShowCampaignSelector(true)}
            >
              {selectedCampaign
                ? selectedCampaign.campaign_name
                : 'Choose a Campaign'
              }
            </button>
          </div>
        </div>

        <div className="filter-row">
          <div className="filter-group">
            <label>Month/Season</label>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              <option value="all">All Months</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
              <option value="Q1">Q1 (Jan-Mar)</option>
              <option value="Q2">Q2 (Apr-Jun)</option>
              <option value="Q3">Q3 (Jul-Sep)</option>
              <option value="Q4">Q4 (Oct-Dec)</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Filter by Topic/Brand</label>
            <div className="toggle-container">
              <label className="campaign-benchmark-toggle-switch">
                <input
                  type="checkbox"
                  checked={filterByTopic}
                  onChange={(e) => setFilterByTopic(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
              <span className="toggle-label">
                {filterByTopic ? 'Yes - Match topic/brand' : 'No - All in bucket'}
              </span>
            </div>
            <p className="filter-hint">
              {filterByTopic
                ? 'Compare only against campaigns with the same topic/brand'
                : 'Compare against all campaigns in the same campaign type'}
            </p>
          </div>
        </div>

        <div className="run-analysis-section">
          <button
            className="run-analysis-button"
            onClick={fetchBenchmarkData}
          >
            {loading ? 'Running...' : 'Run'}
          </button>
          {(selectedMonth !== 'all' || filterByTopic) && (
            <button
              className="clear-all-filters-button"
              onClick={() => {
                setSelectedMonth('all');
                setFilterByTopic(false);
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {hasRun && (
        <>
          <div className="viz-tabs">
            <button
              className={`viz-tab ${activeTab === 'performance' ? 'active' : ''}`}
              onClick={() => setActiveTab('performance')}
            >
              Performance Score
            </button>
            <button
              className={`viz-tab ${activeTab === 'similar' ? 'active' : ''}`}
              onClick={() => setActiveTab('similar')}
            >
              Similar Campaigns
            </button>
            <button
              className={`viz-tab ${activeTab === 'factors' ? 'active' : ''}`}
              onClick={() => setActiveTab('factors')}
            >
              Success Factors
            </button>
            <button
              className={`viz-tab ${activeTab === 'percentile' ? 'active' : ''}`}
              onClick={() => setActiveTab('percentile')}
            >
              Percentile Ranking
            </button>
          </div>

          <div className="benchmark-content">
            {activeTab === 'performance' && renderPerformanceScore()}
            {activeTab === 'similar' && renderSimilarCampaigns()}
            {activeTab === 'factors' && renderSuccessFactors()}
            {activeTab === 'percentile' && renderPercentileRanking()}
          </div>
        </>
      )}

      {showCampaignSelector && (
        <div className="cb-modal-overlay" onClick={() => setShowCampaignSelector(false)}>
          <div className="cb-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cb-modal-header">
              <h2>Select Campaign</h2>
              <button
                className="cb-modal-close"
                onClick={() => setShowCampaignSelector(false)}
              >
                ×
              </button>
            </div>

            <div className="cb-modal-search">
              <input
                type="text"
                placeholder="Search campaigns"
                value={campaignSearchTerm}
                onChange={(e) => setCampaignSearchTerm(e.target.value)}
                className="cb-search-input"
              />
            </div>

            <div className="cb-modal-list">
              {filteredCampaigns.map(campaign => {
                const isSelected = selectedCampaign?.campaign_name === campaign.campaign_name;
                return (
                  <div
                    key={campaign.campaign_name}
                    className={`cb-modal-list-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      handleCampaignToggle(campaign);
                      setShowCampaignSelector(false);
                    }}
                  >
                    <div className="cb-item-checkbox">
                      {isSelected && <span className="checkmark">✓</span>}
                    </div>
                    <div className="cb-item-info">
                      <div className="cb-item-name">{campaign.campaign_name}</div>
                      <div className="cb-item-stats">
                        <span>Open Rate: {campaign.core_metrics?.unique_open_rate?.toFixed(1) || 'N/A'}%</span>
                        <span>Delivered: {campaign.volume_metrics?.delivered?.toLocaleString() || 'N/A'}</span>
                        <span>Date: {campaign.send_date}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="cb-modal-footer">
              <button
                type="button"
                onClick={() => setShowCampaignSelector(false)}
                className="cb-done-button"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignBenchmarks;