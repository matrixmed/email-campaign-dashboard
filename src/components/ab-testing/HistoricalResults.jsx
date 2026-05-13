import React, { useState, useEffect, useMemo } from 'react';
import _ from 'lodash';
import { API_BASE_URL } from '../../config/api';
import { runAnalysis } from '../../utils/statistics';
import '../../styles/AudienceQueryBuilder.css';

const cleanCampaignName = (name) =>
  name.split(/\s*[-–—]\s*deployment\s*#?\d+|\s+deployment\s*#?\d+/i)[0].trim();

const stripAbGroup = (name) =>
  name.replace(/\s*[-–—]\s*group\s+[a-z]\b/i, '').trim();

const extractGroupLabel = (name) => {
  const match = name.match(/[-–—]\s*group\s+([a-z])\b/i);
  return match ? match[1].toUpperCase() : null;
};

const buildMetricsMap = (campaigns) => {
  if (!campaigns || campaigns.length === 0) return {};

  const abCampaigns = campaigns.filter(item =>
    item?.Campaign && /[-–—]\s*group\s+[a-z]\b/i.test(item.Campaign)
  );

  const byCleanName = _.groupBy(abCampaigns, item => cleanCampaignName(item.Campaign));
  const merged = Object.entries(byCleanName).map(([cleanName, deployments]) => {
    if (deployments.length === 1) {
      return { ...deployments[0], Campaign: cleanName };
    }
    const deployment1 = deployments.find(d => {
      const name = d.Campaign.toLowerCase();
      return name.includes('deployment 1') || name.includes('deployment #1') || name.includes('deployment1');
    });
    const base = deployment1 || deployments[0];
    return {
      Campaign: cleanName,
      Send_Date: base.Send_Date,
      Sent: base.Sent,
      Delivered: base.Delivered,
      Unique_Opens: _.sumBy(deployments, 'Unique_Opens'),
      Total_Opens: _.sumBy(deployments, 'Total_Opens'),
      Unique_Clicks: _.sumBy(deployments, 'Unique_Clicks'),
      Total_Clicks: _.sumBy(deployments, 'Total_Clicks'),
    };
  });

  const map = {};
  merged.forEach(item => {
    const label = extractGroupLabel(item.Campaign);
    if (!label) return;
    const base = stripAbGroup(item.Campaign);
    if (!map[base]) map[base] = {};
    map[base][label] = item;
  });
  return map;
};

const computeResults = (groups, metricsByLabel) => {
  const sorted = [...groups].sort((a, b) =>
    (a.group_label || '').localeCompare(b.group_label || '')
  );
  if (sorted.length < 2) return [];

  const [ga, gb] = sorted;
  const ma = metricsByLabel?.[ga.group_label];
  const mb = metricsByLabel?.[gb.group_label];

  const successA = ma?.Unique_Opens || 0;
  const deliveredA = ma?.Delivered || 0;
  const successB = mb?.Unique_Opens || 0;
  const deliveredB = mb?.Delivered || 0;

  if (deliveredA === 0 || deliveredB === 0) return [];

  const analysis = runAnalysis(successA, deliveredA, successB, deliveredB);
  const winnerLabel = analysis.winner === 'A'
    ? ga.group_label
    : analysis.winner === 'B'
      ? gb.group_label
      : 'none';

  return [{
    metric_name: 'Unique_Open_Rate',
    group_a_value: analysis.rateA,
    group_b_value: analysis.rateB,
    winner: winnerLabel,
    is_significant: analysis.isSignificant,
    p_value: analysis.pValue,
    relative_lift: analysis.relativeLift,
  }];
};

const HistoricalResults = ({
  filterCategory = '',
  filterMarket = '',
  campaignsData = [],
  onTestReactivated,
}) => {
  const [historical, setHistorical] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [reactivatingId, setReactivatingId] = useState(null);

  useEffect(() => {
    fetchHistorical();
  }, []);

  const fetchHistorical = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ab-testing/historical`);
      const data = await res.json();
      if (data.status === 'success') {
        setHistorical(data.historical || []);
      }
    } catch (e) {
      console.error('Failed to fetch historical results:', e);
    } finally {
      setLoading(false);
    }
  };

  const metricsMap = useMemo(() => buildMetricsMap(campaignsData), [campaignsData]);

  const enriched = useMemo(() => {
    return historical.map(test => {
      const hasResults = Array.isArray(test.results) && test.results.length > 0;
      if (hasResults) return test;

      const metricsByLabel = metricsMap[test.base_campaign_name] || {};
      const computed = computeResults(test.groups || [], metricsByLabel);

      const groupsWithMetrics = (test.groups || []).map(g => {
        const m = metricsByLabel[g.group_label];
        if (!m) return g;
        return {
          ...g,
          metrics: {
            Delivered: m.Delivered || 0,
            Unique_Opens: m.Unique_Opens || 0,
          }
        };
      });

      return { ...test, results: computed, groups: groupsWithMetrics };
    });
  }, [historical, metricsMap]);

  const filtered = useMemo(() => {
    return enriched.filter(h => {
      if (filterCategory && h.category !== filterCategory) return false;
      if (filterMarket && h.market !== filterMarket) return false;
      return true;
    });
  }, [enriched, filterCategory, filterMarket]);

  const handleReactivate = async (test, e) => {
    e.stopPropagation();
    if (!test.id || reactivatingId) return;
    setReactivatingId(test.id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ab-testing/tests/${test.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setHistorical(prev => prev.filter(t => t.id !== test.id));
        if (onTestReactivated && data.test) onTestReactivated(data.test);
      }
    } catch (err) {
      console.error('Failed to reactivate test:', err);
    } finally {
      setReactivatingId(null);
    }
  };

  const categorySummary = useMemo(() => {
    if (filtered.length === 0) return null;

    const totalTests = filtered.length;
    let significantTests = 0;
    let noWinner = 0;
    const lifts = [];
    const byMarket = {};
    const winningApproaches = {};

    filtered.forEach(test => {
      const primary = test.results?.find(r => r.metric_name === 'Unique_Open_Rate') || test.results?.[0];
      if (!primary) {
        noWinner++;
        return;
      }

      if (primary.is_significant && primary.winner !== 'none') {
        significantTests++;
      } else {
        noWinner++;
      }

      if (primary.relative_lift != null) {
        lifts.push(Math.abs(primary.relative_lift));
      }

      const mkt = test.market || 'Unassigned';
      if (!byMarket[mkt]) {
        byMarket[mkt] = { total: 0, significant: 0, lifts: [] };
      }
      byMarket[mkt].total++;
      if (primary.is_significant && primary.winner !== 'none') {
        byMarket[mkt].significant++;
      }
      if (primary.relative_lift != null) {
        byMarket[mkt].lifts.push(Math.abs(primary.relative_lift));
      }

      if (primary.is_significant && primary.winner !== 'none') {
        const sortedGroups = [...(test.groups || [])].sort((a, b) =>
          (a.group_label || '').localeCompare(b.group_label || '')
        );
        const winIdx = sortedGroups.findIndex(g => g.group_label === primary.winner);
        if (winIdx === -1) return;
        const loseIdx = winIdx === 0 ? 1 : 0;
        const winGroup = sortedGroups[winIdx];
        const loseGroup = sortedGroups[loseIdx];
        const winSub = winGroup?.subcategory || 'Untagged';
        const loseSub = loseGroup?.subcategory || 'Untagged';

        const key = winSub;
        if (!winningApproaches[key]) {
          winningApproaches[key] = { wins: 0, lifts: [], beatenApproaches: {}, markets: {} };
        }
        winningApproaches[key].wins++;
        if (primary.relative_lift != null) {
          winningApproaches[key].lifts.push(Math.abs(primary.relative_lift));
        }
        winningApproaches[key].beatenApproaches[loseSub] = (winningApproaches[key].beatenApproaches[loseSub] || 0) + 1;
        winningApproaches[key].markets[mkt] = (winningApproaches[key].markets[mkt] || 0) + 1;
      }
    });

    const avgLift = lifts.length > 0
      ? (lifts.reduce((a, b) => a + b, 0) / lifts.length).toFixed(1)
      : '0';

    const marketBreakdown = Object.entries(byMarket)
      .map(([market, data]) => ({
        market,
        ...data,
        avgLift: data.lifts.length > 0
          ? (data.lifts.reduce((a, b) => a + b, 0) / data.lifts.length).toFixed(1)
          : '0'
      }))
      .sort((a, b) => b.total - a.total);

    const approachBreakdown = Object.entries(winningApproaches)
      .map(([approach, data]) => ({
        approach,
        ...data,
        avgLift: data.lifts.length > 0
          ? (data.lifts.reduce((a, b) => a + b, 0) / data.lifts.length).toFixed(1)
          : '0',
        beaten: Object.entries(data.beatenApproaches)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => `${name} (${count}x)`)
          .join(', '),
        topMarket: Object.entries(data.markets).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'
      }))
      .sort((a, b) => b.wins - a.wins);

    return {
      totalTests,
      significantTests,
      noWinner,
      avgLift,
      marketBreakdown,
      approachBreakdown
    };
  }, [filtered]);

  const getPrimaryResult = (test) => {
    return test.results?.find(r => r.metric_name === 'Unique_Open_Rate') || test.results?.[0];
  };

  const getWinnerGroupInfo = (test) => {
    const primary = getPrimaryResult(test);
    if (!primary || !primary.is_significant || primary.winner === 'none') return null;
    const sortedGroups = [...(test.groups || [])].sort((a, b) =>
      (a.group_label || '').localeCompare(b.group_label || '')
    );
    return sortedGroups.find(g => g.group_label === primary.winner) || null;
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  if (loading) {
    return (
      <div className="ab-historical">
        <div className="ab-historical-loading">Loading historical results...</div>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="ab-historical">
        <div className="ab-historical-empty">
          {historical.length === 0
            ? 'No completed A/B tests found. Complete and save tests to build your historical database.'
            : 'No tests match the current filters.'}
        </div>
      </div>
    );
  }

  return (
    <div className="ab-historical">
      {categorySummary && (
        <div className="ab-category-summary">
          <div className="ab-category-summary-header">
            <div className="ab-summary-title-row">
              <h3>
                {filterCategory
                  ? `${filterCategory} Tests`
                  : 'All Tests'}
                {filterMarket ? ` \u2014 ${filterMarket}` : ''}
              </h3>
              <div className="ab-summary-inline-stats">
                <div className="ab-summary-inline-stat">
                  <span className="ab-summary-inline-value">{categorySummary.totalTests}</span>
                  <span className="ab-summary-inline-label">Tests</span>
                </div>
                <span className="ab-summary-inline-divider" />
                <div className="ab-summary-inline-stat">
                  <span className="ab-summary-inline-value ab-color-green">{categorySummary.significantTests}</span>
                  <span className="ab-summary-inline-label">Significant</span>
                </div>
                <span className="ab-summary-inline-divider" />
                <div className="ab-summary-inline-stat">
                  <span className="ab-summary-inline-value ab-color-muted">{categorySummary.noWinner}</span>
                  <span className="ab-summary-inline-label">No Winner</span>
                </div>
                <span className="ab-summary-inline-divider" />
                <div className="ab-summary-inline-stat">
                  <span className="ab-summary-inline-value ab-color-accent">+{categorySummary.avgLift}%</span>
                  <span className="ab-summary-inline-label">Avg Lift</span>
                </div>
              </div>
            </div>
          </div>

          {categorySummary.marketBreakdown.length > 1 && (
            <div className="ab-summary-breakdown">
              <h4>By Market</h4>
              <div className="ab-summary-breakdown-grid">
                {categorySummary.marketBreakdown.map(m => (
                  <div key={m.market} className="ab-summary-breakdown-card">
                    <div className="ab-summary-breakdown-name">{m.market}</div>
                    <div className="ab-summary-breakdown-detail">
                      {m.total} tests &middot; {m.significant} significant &middot; avg lift +{m.avgLift}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {categorySummary.approachBreakdown.length > 0 && (
            <div className="ab-summary-breakdown">
              <h4>Winning Approaches by Subcategory</h4>
              <div className="ab-summary-breakdown-grid">
                {categorySummary.approachBreakdown.map(a => (
                  <div key={a.approach} className="ab-summary-breakdown-card ab-summary-breakdown-winner">
                    <div className="ab-summary-breakdown-name">
                      &ldquo;{a.approach}&rdquo; approach
                    </div>
                    <div className="ab-summary-breakdown-detail">
                      Won {a.wins} test{a.wins !== 1 ? 's' : ''} &middot; avg lift +{a.avgLift}%
                      <br />
                      Defeated: {a.beaten}
                      {a.topMarket !== '-' && (<><br />Top market: {a.topMarket}</>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="ab-historical-list">
        {filtered.map(test => {
          const primary = getPrimaryResult(test);
          const winnerGroup = getWinnerGroupInfo(test);
          const isExpanded = expandedId === test.id;
          const isReactivating = reactivatingId === test.id;

          return (
            <div key={test.id} className="ab-historical-item">
              <div className="ab-historical-row" onClick={() => toggleExpand(test.id)}>
                <span className={`ab-expand-arrow ${isExpanded ? 'expanded' : ''}`}>&#9662;</span>
                <div className="ab-historical-row-main">
                  <span className="ab-historical-name">{test.base_campaign_name}</span>
                  <div className="ab-historical-row-tags">
                    {test.category && <span className="ab-historical-tag">{test.category}</span>}
                    {test.market && <span className="ab-historical-tag">{test.market}</span>}
                  </div>
                </div>
                <div className="ab-historical-row-stats">
                  {primary?.winner && primary.winner !== 'none' ? (
                    <span className="ab-historical-winner">Group {primary.winner}</span>
                  ) : (
                    <span className="ab-historical-no-winner">No Winner</span>
                  )}
                  {primary?.relative_lift != null ? (
                    <span className={`ab-historical-lift ${primary.relative_lift > 0 ? 'ab-lift-positive' : 'ab-lift-negative'}`}>
                      {primary.relative_lift > 0 ? '+' : ''}{primary.relative_lift.toFixed(1)}%
                    </span>
                  ) : null}
                  <span className={`ab-sig-badge ${primary?.is_significant ? 'sig-yes' : 'sig-no'}`}>
                    {primary?.is_significant ? 'Significant' : 'Not Sig.'}
                  </span>
                  <span className="ab-historical-date">
                    {test.updated_at ? new Date(test.updated_at).toLocaleDateString() : '-'}
                  </span>
                  <button
                    type="button"
                    className="ab-reactivate-btn"
                    onClick={(e) => handleReactivate(test, e)}
                    disabled={isReactivating}
                    title="Move this test back to Active Tests"
                  >
                    {isReactivating ? 'Reactivating...' : 'Reactivate'}
                  </button>
                </div>
              </div>
              {isExpanded && <ExpandedTestDetail test={test} />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ExpandedTestDetail = ({ test }) => {
  const primary = test.results?.find(r => r.metric_name === 'Unique_Open_Rate') || test.results?.[0];
  const sortedGroups = [...(test.groups || [])].sort((a, b) =>
    (a.group_label || '').localeCompare(b.group_label || '')
  );

  return (
    <div className="ab-expanded-detail">
      {test.description && (
        <div className="ab-expanded-description">
          <strong>Description:</strong> {test.description}
        </div>
      )}
      {test.notes && (
        <div className="ab-expanded-description">
          <strong>Notes:</strong> {test.notes}
        </div>
      )}

      <div className="ab-expanded-groups">
        <h4>Group Breakdown</h4>
        <div className="ab-expanded-groups-grid">
          {sortedGroups.map((group, idx) => {
            const isWinner = primary?.winner === group.group_label;
            const groupResult = idx === 0 ? primary?.group_a_value : primary?.group_b_value;

            return (
              <div key={group.group_label} className={`ab-expanded-group-card ${isWinner ? 'winner' : ''}`}>
                <div className="ab-expanded-group-header">
                  <span className="ab-expanded-group-label">Group {group.group_label}</span>
                  {isWinner && <span className="ab-expanded-winner-tag">Winner</span>}
                </div>
                <div className="ab-expanded-group-meta">
                  {group.subcategory && (
                    <div className="ab-expanded-group-field">
                      <span className="ab-expanded-field-label">Approach:</span>
                      <span className="ab-expanded-field-value">{group.subcategory}</span>
                    </div>
                  )}
                  {group.notes && (
                    <div className="ab-expanded-group-field">
                      <span className="ab-expanded-field-label">Notes:</span>
                      <span className="ab-expanded-field-value">{group.notes}</span>
                    </div>
                  )}
                  {groupResult != null && (
                    <div className="ab-expanded-group-field">
                      <span className="ab-expanded-field-label">Unique Open Rate:</span>
                      <span className={`ab-expanded-field-value ${isWinner ? 'highlight' : ''}`}>
                        {groupResult.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {test.results && test.results.length > 0 && (
        <div className="ab-expanded-results">
          <h4>All Metrics</h4>
          <div className="ab-expanded-results-grid">
            {test.results.map(r => (
              <div key={r.metric_name} className="ab-expanded-result-item">
                <div className="ab-expanded-result-name">
                  {r.metric_name.replace(/_/g, ' ')}
                </div>
                <div className="ab-expanded-result-values">
                  <span className={r.winner !== 'none' && r.winner === sortedGroups[0]?.group_label ? 'ab-expanded-result-winner' : ''}>
                    {sortedGroups[0]?.group_label || 'A'}: {r.group_a_value?.toFixed(2)}%
                  </span>
                  <span className="ab-expanded-result-vs">vs</span>
                  <span className={r.winner !== 'none' && r.winner === sortedGroups[1]?.group_label ? 'ab-expanded-result-winner' : ''}>
                    {sortedGroups[1]?.group_label || 'B'}: {r.group_b_value?.toFixed(2)}%
                  </span>
                </div>
                <div className="ab-expanded-result-detail">
                  {r.is_significant ? (
                    <span className="ab-lift-positive">
                      Sig. &middot; p={r.p_value < 0.0001 ? '<0.0001' : r.p_value?.toFixed(4)} &middot;
                      lift {r.relative_lift > 0 ? '+' : ''}{r.relative_lift?.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="ab-historical-no-winner">Not significant</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoricalResults;