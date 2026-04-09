import React, { useState, useEffect, useMemo } from 'react';
import '../../styles/CampaignBenchmarks.css';
import '../../styles/SectionHeaders.css';
import { API_BASE_URL } from '../../config/api';
import { classifyCampaign, getDiseaseFromCampaign } from '../../utils/campaignClassifier';
import { getIndustry } from '../../utils/industryKeywords';

const INITIAL_SHOW = 5;
const LOAD_MORE = 10;

const CampaignBenchmarks = ({ onClearCache }) => {
  const [loading, setLoading] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState(null);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [analyzeBy, setAnalyzeBy] = useState('market');
  const [filterByDisease, setFilterByDisease] = useState(false);
  const [activeTab, setActiveTab] = useState('performance');
  const [hasRun, setHasRun] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [showCampaignSelector, setShowCampaignSelector] = useState(false);
  const [campaignSearchTerm, setCampaignSearchTerm] = useState('');

  const [overviewMode, setOverviewMode] = useState('market');
  const [overviewByDisease, setOverviewByDisease] = useState(false);
  const [brandIndustryMap, setBrandIndustryMap] = useState({});
  const [overviewVisibleCounts, setOverviewVisibleCounts] = useState({});

  const API_BASE = `${API_BASE_URL}/api`;

  useEffect(() => {
    fetchCampaigns();
    fetchBrandData();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const dashboardMetricsUrl = 'https://emaildash.blob.core.windows.net/json-data/dashboard_metrics.json?sp=r&st=2025-06-09T18:55:36Z&se=2027-06-17T02:55:36Z&spr=https&sv=2024-11-04&sr=b&sig=9o5%2B%2BHmlqiFuAQmw9bGl0D2485Z8xTy0XXsb10S2aCI%3D';
      const response = await fetch(`${dashboardMetricsUrl}&_t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        const validCampaigns = Array.isArray(data) ? data : [];
        setCampaigns(validCampaigns);
      }
    } catch (err) {
    }
  };

  const fetchBrandData = async () => {
    try {
      const response = await fetch(`${API_BASE}/brand-management`);
      const data = await response.json();
      if (data.status === 'success' && data.brands) {
        const mapping = {};
        data.brands.forEach(b => {
          if (b.brand && b.industry) {
            const brandLower = b.brand.toLowerCase();
            mapping[brandLower] = b.industry;
            const firstWord = brandLower.split(/\s+/)[0];
            if (firstWord && firstWord !== brandLower && !mapping[firstWord]) {
              mapping[firstWord] = b.industry;
            }
          }
        });
        setBrandIndustryMap(mapping);
      }
    } catch (err) {}
  };

  const overviewData = useMemo(() => {
    if (!campaigns.length) return [];

    const validCampaigns = campaigns.filter(c =>
      c.campaign_name && c.core_metrics?.unique_open_rate != null
    );

    const overallSum = validCampaigns.reduce((s, c) => s + c.core_metrics.unique_open_rate, 0);
    const overallAvg = validCampaigns.length > 0 ? overallSum / validCampaigns.length : 0;

    const groupMap = {};

    validCampaigns.forEach(c => {
      const name = c.campaign_name;
      let groupKey, topicKey;

      if (overviewMode === 'market') {
        const industry = getIndustry(name, brandIndustryMap);
        if (!industry) return;
        groupKey = industry;
        topicKey = getDiseaseFromCampaign(name) || 'General';
      } else {
        const { bucket, topic } = classifyCampaign(name);
        groupKey = bucket;
        topicKey = topic;
      }

      if (overviewByDisease) {
        const compositeKey = `${groupKey}|||${topicKey}`;
        if (!groupMap[compositeKey]) {
          groupMap[compositeKey] = { groupName: topicKey, parentGroup: groupKey, rates: [], count: 0 };
        }
        groupMap[compositeKey].rates.push(c.core_metrics.unique_open_rate);
        groupMap[compositeKey].count++;
      } else {
        if (!groupMap[groupKey]) {
          groupMap[groupKey] = { groupName: groupKey, parentGroup: null, rates: [], count: 0 };
        }
        groupMap[groupKey].rates.push(c.core_metrics.unique_open_rate);
        groupMap[groupKey].count++;
      }
    });

    const groups = Object.values(groupMap).map(g => {
      const avg = g.rates.reduce((s, r) => s + r, 0) / g.rates.length;
      return {
        groupName: g.groupName,
        parentGroup: g.parentGroup,
        avgRate: avg,
        delta: avg - overallAvg,
        count: g.count
      };
    });

    groups.sort((a, b) => b.avgRate - a.avgRate);

    if (overviewByDisease) {
      const parentOrder = [];
      const parentMap = {};
      groups.forEach(g => {
        const p = g.parentGroup || g.groupName;
        if (!parentMap[p]) {
          parentMap[p] = { parentName: p, children: [], totalRate: 0, totalCount: 0 };
          parentOrder.push(p);
        }
        parentMap[p].children.push(g);
        parentMap[p].totalRate += g.avgRate * g.count;
        parentMap[p].totalCount += g.count;
      });

      return parentOrder.map(p => {
        const parent = parentMap[p];
        parent.children.sort((a, b) => b.avgRate - a.avgRate);
        const parentAvg = parent.totalCount > 0 ? parent.totalRate / parent.totalCount : 0;
        return {
          parentName: parent.parentName,
          parentAvg,
          parentCount: parent.totalCount,
          parentDelta: parentAvg - overallAvg,
          children: parent.children
        };
      }).sort((a, b) => b.parentAvg - a.parentAvg);
    }

    return groups;
  }, [campaigns, overviewMode, overviewByDisease, brandIndustryMap]);

  const getOverviewVisible = (groupId) => overviewVisibleCounts[groupId] || INITIAL_SHOW;

  const handleOverviewLoadMore = (groupId) => {
    setOverviewVisibleCounts(prev => ({
      ...prev,
      [groupId]: (prev[groupId] || INITIAL_SHOW) + LOAD_MORE
    }));
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
            analyze_by: analyzeBy,
            filter_by_disease: filterByDisease
          }
        })
      });
      const data = await response.json();
      setBenchmarkData(data);
    } catch (error) {
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

    const displayMetrics = ['unique_open_rate', 'total_open_rate', 'unique_click_rate', 'total_click_rate'];

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
          {displayMetrics.map((metric) => {
            const data = benchmarks[metric];
            if (!data) return null;
            const metricName = metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return (
              <div key={metric} className="benchmark-card">
                <h4>{metricName}</h4>
                <div className="benchmark-metric-value">{data.your_value?.toFixed(1)}%</div>
                <div className="benchmark-bar-container">
                  <div className="benchmark-bar-labels">
                    <span className="range-min">Min: {data.min?.toFixed(1)}%</span>
                    <span className="range-max">Max: {data.max?.toFixed(1)}%</span>
                  </div>
                  <div className="percentile-track">
                    <div
                      className="percentile-marker"
                      style={{ left: `${data.your_percentile}%` }}
                      title={`${data.your_percentile}th percentile`}
                    />
                  </div>
                </div>
                <div className="benchmark-stats">
                  <div className="stat">
                    <span className="stat-label">Median:</span>
                    <span className="stat-value">{data.median?.toFixed(1)}%</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Mean:</span>
                    <span className="stat-value">{data.mean?.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="comparison-summary">
          <p>Based on <strong>{similar_count}</strong> similar campaigns in <strong>{classification?.bucket || 'this category'}</strong>{filterByDisease && classification?.topic ? ` > ${classification.topic}` : ''}</p>
        </div>
      </div>
    );
  };

  const renderSimilarCampaigns = () => {
    if (!benchmarkData?.similar_campaigns) return null;

    const { similar_campaigns, campaign } = benchmarkData;
    const selectedUniqueOpen = campaign?.core_metrics?.unique_open_rate || 0;
    const selectedTotalOpen = campaign?.core_metrics?.total_open_rate || 0;
    const selectedUniqueClick = campaign?.core_metrics?.unique_click_rate || 0;
    const selectedTotalClick = campaign?.core_metrics?.total_click_rate || 0;

    const formatWithDelta = (value, selectedValue) => {
      const delta = value - selectedValue;
      const deltaClass = delta < 0 ? 'delta-positive' : delta > 0 ? 'delta-negative' : '';
      const rateClass = delta < 0 ? 'rate-positive' : delta > 0 ? 'rate-negative' : '';
      return (
        <span className={rateClass}>
          {value?.toFixed(1)}%
          <span className={`delta-text ${deltaClass}`}>
            {' '}({delta > 0 ? '+' : ''}{delta?.toFixed(1)}%)
          </span>
        </span>
      );
    };

    return (
      <div className="similar-campaigns-container">
        <h3>Similar Campaigns</h3>
        <p className="section-subtitle">Campaigns matching the {analyzeBy === 'market' ? 'market' : 'content type'}{filterByDisease ? ' and disease' : ''}</p>

        <div className="campaigns-table-wrapper">
          <table className="campaigns-table">
            <thead>
              <tr>
                <th>Campaign Name</th>
                <th>Send Date</th>
                <th>Unique Open Rate</th>
                <th>Total Open Rate</th>
                <th>Unique Click Rate</th>
                <th>Total Click Rate</th>
                <th>Sends</th>
              </tr>
            </thead>
            <tbody>
              {similar_campaigns.map((camp, idx) => (
                <tr key={idx}>
                  <td className="campaign-name-cell">{camp.campaign_name}</td>
                  <td>{new Date(camp.send_date).toLocaleDateString()}</td>
                  <td>{formatWithDelta(camp.unique_open_rate, selectedUniqueOpen)}</td>
                  <td>{formatWithDelta(camp.total_open_rate, selectedTotalOpen)}</td>
                  <td>{formatWithDelta(camp.unique_click_rate, selectedUniqueClick)}</td>
                  <td>{formatWithDelta(camp.total_click_rate, selectedTotalClick)}</td>
                  <td>{camp.delivered?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPercentileRanking = () => {
    if (!benchmarkData?.benchmarks) return null;

    const { benchmarks } = benchmarkData;

    const metricOrder = ['unique_open_rate', 'total_open_rate', 'unique_click_rate', 'total_click_rate', 'delivery_rate'];

    return (
      <div className="percentile-ranking-container">
        <h3>Percentile Rankings</h3>
        <p className="section-subtitle">Where the campaign ranks across all metrics</p>

        <div className="ranking-bars">
          {metricOrder.map((metric) => {
            const data = benchmarks[metric];
            if (!data) return null;
            const metricName = metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const percentile = data.your_percentile || 0;

            return (
              <div key={metric} className="ranking-item">
                <div className="ranking-label">{metricName}</div>
                <div className="ranking-bar-wrapper">
                  <div className="ranking-bar" style={{ width: `${Math.max(percentile, 5)}%` }}>
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
      <div className="section-header-bar">
        <h3>Campaign Benchmarks</h3>
        <div className="section-header-stats">
          <div className="anomaly-controls-inline">
            <span className="control-label">Group by</span>
            <div className="anomaly-mode-toggle">
              <button
                className={`mode-toggle-btn ${overviewMode === 'content' ? 'active' : ''}`}
                onClick={() => { setOverviewMode('content'); setOverviewVisibleCounts({}); }}
              >
                Content
              </button>
              <button
                className={`mode-toggle-btn ${overviewMode === 'market' ? 'active' : ''}`}
                onClick={() => { setOverviewMode('market'); setOverviewVisibleCounts({}); }}
              >
                Market
              </button>
            </div>
            <span className="control-divider">→</span>
            <div className="anomaly-mode-toggle">
              <button
                className={`mode-toggle-btn ${!overviewByDisease ? 'active' : ''}`}
                onClick={() => { setOverviewByDisease(false); setOverviewVisibleCounts({}); }}
              >
                All
              </button>
              <button
                className={`mode-toggle-btn ${overviewByDisease ? 'active' : ''}`}
                onClick={() => { setOverviewByDisease(true); setOverviewVisibleCounts({}); }}
              >
                By Disease
              </button>
            </div>
          </div>
          {onClearCache && (
            <button
              className="clear-cache-button"
              onClick={onClearCache}
              title="Clear cached data and reload"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <div className="cb-overview-section">

        {overviewByDisease && Array.isArray(overviewData) && overviewData.length > 0 && overviewData[0]?.children ? (
          <div className="cbo-groups">
            {overviewData.map(parent => {
              const groupId = parent.parentName;
              const visible = getOverviewVisible(groupId);
              const visibleChildren = parent.children.slice(0, visible);
              const remaining = parent.children.length - visible;

              return (
                <div className="cbo-group-section" key={groupId}>
                  <div className="cbo-group-header">
                    <h4 className="cbo-group-name">{parent.parentName}</h4>
                    <div className="cbo-group-meta">
                      <span className="cbo-group-avg">{parent.parentAvg.toFixed(1)}%</span>
                      <span className="cbo-group-count">{parent.parentCount} campaigns</span>
                      {overviewVisibleCounts[groupId] > INITIAL_SHOW && (
                        <button className="cbo-collapse-btn" onClick={() => setOverviewVisibleCounts(prev => { const next = { ...prev }; delete next[groupId]; return next; })}>
                          Collapse
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="cbo-grid">
                    {visibleChildren.map((child) => (
                      <div className={"cbo-card"} key={child.groupName}>
                        <div className="cbo-card-name" title={child.groupName}>{child.groupName}</div>
                        <div className="cbo-card-rate">{child.avgRate.toFixed(1)}%</div>
                        <div className="cbo-card-bottom">
                          <span className={`cbo-card-delta ${child.delta >= 0 ? 'cbo-pos' : 'cbo-neg'}`}>
                            {child.delta >= 0 ? '+' : ''}{child.delta.toFixed(1)}pp
                          </span>
                          <span className="cbo-card-count">n={child.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {remaining > 0 && (
                    <button className="cbo-load-more" onClick={() => handleOverviewLoadMore(groupId)}>
                      Show {Math.min(remaining, LOAD_MORE)} more
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {Array.isArray(overviewData) && overviewData.length > 0 && !overviewData[0]?.children && (
              <div className="cbo-flat">
                <div className="cbo-grid">
                  {overviewData.map((group) => (
                    <div className={"cbo-card"} key={group.groupName}>
                      <div className="cbo-card-name" title={group.groupName}>{group.groupName}</div>
                      <div className="cbo-card-rate">{group.avgRate.toFixed(1)}%</div>
                      <div className="cbo-card-bottom">
                        <span className={`cbo-card-delta ${group.delta >= 0 ? 'cbo-pos' : 'cbo-neg'}`}>
                          {group.delta >= 0 ? '+' : ''}{group.delta.toFixed(1)}pp
                        </span>
                        <span className="cbo-card-count">n={group.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {Array.isArray(overviewData) && overviewData.length === 0 && campaigns.length > 0 && overviewMode === 'market' && (
          <div className="cb-overview-empty">No market matches found. Brand data may still be loading.</div>
        )}
      </div>

      <div className="benchmark-filters">
        <button
          type="button"
          className="selector-button full-width"
          onClick={() => setShowCampaignSelector(true)}
        >
          {selectedCampaign
            ? selectedCampaign.campaign_name
            : 'Choose a Campaign'
          }
        </button>

        <div className="analyze-toggles-row">
          <span className="toggle-label">Group by</span>
          <div className="benchmark-mode-toggle">
            <button
              className={`mode-toggle-btn ${analyzeBy === 'content' ? 'active' : ''}`}
              onClick={() => setAnalyzeBy('content')}
            >
              Content
            </button>
            <button
              className={`mode-toggle-btn ${analyzeBy === 'market' ? 'active' : ''}`}
              onClick={() => setAnalyzeBy('market')}
            >
              Market
            </button>
          </div>
          <span className="toggle-arrow">→</span>
          <div className="benchmark-mode-toggle">
            <button
              className={`mode-toggle-btn ${!filterByDisease ? 'active' : ''}`}
              onClick={() => setFilterByDisease(false)}
            >
              All
            </button>
            <button
              className={`mode-toggle-btn ${filterByDisease ? 'active' : ''}`}
              onClick={() => setFilterByDisease(true)}
            >
              By Disease
            </button>
          </div>
        </div>

        <div className="run-analysis-section">
          <button
            className="run-analysis-button"
            onClick={fetchBenchmarkData}
            disabled={loading}
          >
            {loading ? 'Running...' : 'Run'}
          </button>
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
              className={`viz-tab ${activeTab === 'percentile' ? 'active' : ''}`}
              onClick={() => setActiveTab('percentile')}
            >
              Percentile Ranking
            </button>
          </div>

          <div className="benchmark-content">
            {activeTab === 'performance' && renderPerformanceScore()}
            {activeTab === 'similar' && renderSimilarCampaigns()}
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
              {[...filteredCampaigns].sort((a, b) => new Date(b.send_date) - new Date(a.send_date)).map(campaign => {
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