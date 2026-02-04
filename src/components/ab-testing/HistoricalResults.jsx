import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../../config/api';
import '../../styles/AudienceQueryBuilder.css';

const HistoricalResults = ({ filterCategory = '', filterMarket = '' }) => {
  const [historical, setHistorical] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

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

  const filtered = useMemo(() => {
    return historical.filter(h => {
      if (filterCategory && h.category !== filterCategory) return false;
      if (filterMarket && h.market !== filterMarket) return false;
      return true;
    });
  }, [historical, filterCategory, filterMarket]);

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
      if (!primary) return;

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
        const winIdx = primary.winner === 'A' ? 0 : 1;
        const loseIdx = primary.winner === 'A' ? 1 : 0;
        const winGroup = test.groups?.[winIdx];
        const loseGroup = test.groups?.[loseIdx];
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
    const winIdx = primary.winner === 'A' ? 0 : 1;
    return test.groups?.[winIdx];
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
            <h3>
              {filterCategory
                ? `${filterCategory} Tests`
                : 'All Tests'}
              {filterMarket ? ` \u2014 ${filterMarket}` : ''}
            </h3>
            <span className="ab-category-summary-count">{categorySummary.totalTests} tests</span>
          </div>

          <div className="ab-category-summary-stats">
            <div className="ab-summary-stat">
              <span className="ab-summary-stat-value">{categorySummary.totalTests}</span>
              <span className="ab-summary-stat-label">Total Tests</span>
            </div>
            <div className="ab-summary-stat">
              <span className="ab-summary-stat-value">{categorySummary.significantTests}</span>
              <span className="ab-summary-stat-label">Significant</span>
            </div>
            <div className="ab-summary-stat">
              <span className="ab-summary-stat-value">{categorySummary.noWinner}</span>
              <span className="ab-summary-stat-label">No Winner</span>
            </div>
            <div className="ab-summary-stat">
              <span className="ab-summary-stat-value ab-summary-lift">+{categorySummary.avgLift}%</span>
              <span className="ab-summary-stat-label">Avg Lift</span>
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
                      Beat: {a.beaten}
                      {a.topMarket !== '-' && (<><br />Top market: {a.topMarket}</>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="x-table-container">
        <table className="results-table">
          <thead>
            <tr>
              <th></th>
              <th>Test Name</th>
              <th>Category</th>
              <th>Market</th>
              <th>Winner</th>
              <th>Winning Approach</th>
              <th>P-Value</th>
              <th>Lift</th>
              <th>Significant</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(test => {
              const primary = getPrimaryResult(test);
              const winnerGroup = getWinnerGroupInfo(test);
              const isExpanded = expandedId === test.id;

              return (
                <React.Fragment key={test.id}>
                  <tr
                    onClick={() => toggleExpand(test.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ width: 30, textAlign: 'center' }}>
                      <span className={`ab-expand-arrow ${isExpanded ? 'expanded' : ''}`}>&#9662;</span>
                    </td>
                    <td className="ab-historical-name">{test.base_campaign_name}</td>
                    <td>{test.category || '-'}</td>
                    <td>{test.market || '-'}</td>
                    <td>
                      {primary?.winner && primary.winner !== 'none' ? (
                        <span className="ab-historical-winner">Group {primary.winner}</span>
                      ) : (
                        <span className="ab-historical-no-winner">None</span>
                      )}
                    </td>
                    <td>{winnerGroup?.subcategory || '-'}</td>
                    <td>{primary?.p_value != null ? (primary.p_value < 0.0001 ? '< 0.0001' : primary.p_value.toFixed(4)) : '-'}</td>
                    <td>
                      {primary?.relative_lift != null ? (
                        <span className={primary.relative_lift > 0 ? 'ab-lift-positive' : 'ab-lift-negative'}>
                          {primary.relative_lift > 0 ? '+' : ''}{primary.relative_lift.toFixed(1)}%
                        </span>
                      ) : '-'}
                    </td>
                    <td>
                      <span className={`ab-sig-badge ${primary?.is_significant ? 'sig-yes' : 'sig-no'}`}>
                        {primary?.is_significant ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td>{test.updated_at ? new Date(test.updated_at).toLocaleDateString() : '-'}</td>
                  </tr>
                  {isExpanded && (
                    <tr className="ab-expanded-row">
                      <td colSpan={10} style={{ padding: 0 }}>
                        <ExpandedTestDetail test={test} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ExpandedTestDetail = ({ test }) => {
  const primary = test.results?.find(r => r.metric_name === 'Unique_Open_Rate') || test.results?.[0];

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
          {(test.groups || []).map((group, idx) => {
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
                  <span className={r.winner === 'A' ? 'ab-expanded-result-winner' : ''}>
                    A: {r.group_a_value?.toFixed(2)}%
                  </span>
                  <span className="ab-expanded-result-vs">vs</span>
                  <span className={r.winner === 'B' ? 'ab-expanded-result-winner' : ''}>
                    B: {r.group_b_value?.toFixed(2)}%
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