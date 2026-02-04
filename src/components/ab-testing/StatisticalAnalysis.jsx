import React, { useMemo } from 'react';
import { runAnalysis } from '../../utils/statistics';

const METRIC = { key: 'Unique_Open_Rate', label: 'Unique Open Rate', successKey: 'Unique_Opens', denominatorKey: 'Delivered' };

const StatisticalAnalysis = ({ groupsData, status = 'active' }) => {
  const groups = Object.entries(groupsData || {});

  const pairwiseResults = useMemo(() => {
    if (groups.length < 2) return null;

    const groupRates = groups.map(([label, metrics]) => {
      const success = metrics?.[METRIC.successKey] || 0;
      const n = metrics?.[METRIC.denominatorKey] || 0;
      const rate = n > 0 ? (success / n) * 100 : 0;
      return { label, success, n, rate: parseFloat(rate.toFixed(2)) };
    });

    const ranked = [...groupRates].sort((a, b) => b.rate - a.rate);
    const best = ranked[0];

    const comparisons = ranked.slice(1).map(other => {
      const result = runAnalysis(best.success, best.n, other.success, other.n);
      return {
        groupA: best.label,
        groupB: other.label,
        rateA: best.rate,
        rateB: other.rate,
        ...result
      };
    });

    const anySignificant = comparisons.some(c => c.isSignificant);

    const bestComparison = comparisons.length > 0
      ? comparisons.reduce((a, b) => a.pValue < b.pValue ? a : b)
      : null;

    return {
      ranked,
      comparisons,
      best,
      anySignificant,
      bestComparison,
      sampleAdequate: groupRates.every(g => g.n >= 100)
    };
  }, [groupsData, groups]);

  if (!pairwiseResults || groups.length < 2) {
    return (
      <div className="ab-stats-panel">
        <div className="ab-stats-empty">Need at least 2 groups for statistical analysis</div>
      </div>
    );
  }

  const { ranked, comparisons, best, anySignificant, bestComparison } = pairwiseResults;
  const isCompleted = status === 'completed';

  const confidenceLevel = bestComparison
    ? (bestComparison.pValue < 0.001 ? '99.9%'
      : bestComparison.pValue < 0.01 ? '99%'
      : bestComparison.pValue < 0.05 ? '95%'
      : 'Not significant')
    : 'Not significant';

  const groupColors = ['rgba(0, 255, 255, 0.3)', 'rgba(59, 130, 246, 0.3)', 'rgba(168, 85, 247, 0.3)', 'rgba(245, 158, 11, 0.3)', 'rgba(16, 185, 129, 0.3)'];
  const groupBorderColors = ['#0ff', '#3b82f6', '#a855f7', '#f59e0b', '#10b981'];

  const maxRate = Math.max(...ranked.map(g => g.rate), 1);

  return (
    <div className="ab-stats-panel">
      <div className="ab-stats-header">
        <h3>Statistical Analysis &mdash; {METRIC.label}</h3>
      </div>

      <div className="ab-stats-result">
        <div className="ab-stats-winner-section">
          {anySignificant ? (
            <>
              <div className="ab-stats-winner-badge">
                <span className="ab-stats-winner-text">Group {best.label} {isCompleted ? 'Wins' : 'Winning'}</span>
              </div>
              <div className="ab-stats-confidence">
                {confidenceLevel} confidence &middot; {best.rate}% {METRIC.label}
              </div>
            </>
          ) : (
            <div className="ab-stats-no-winner">
              No statistically significant {isCompleted ? 'winner' : 'leader'} &mdash; differences are likely random variation
            </div>
          )}
        </div>

        {!pairwiseResults.sampleAdequate && (
          <div className="ab-stats-warning">
            Sample size may be too small for reliable results (minimum ~100 per group recommended).
            {ranked.map(g => ` Group ${g.label}: ${g.n.toLocaleString()}`).join(',')}
          </div>
        )}

        <div className="ab-stats-ranking">
          {ranked.map((g, idx) => (
            <div key={g.label} className={`ab-stats-rank-item ${idx === 0 && anySignificant ? 'rank-winner' : ''}`}>
              <span className="ab-stats-rank-position">#{idx + 1}</span>
              <span className="ab-stats-rank-label">Group {g.label}</span>
              <span className="ab-stats-rank-rate">{g.rate}%</span>
              {idx === 0 && anySignificant && <span className="ab-stats-rank-badge">{isCompleted ? 'Winner' : 'Leading'}</span>}
            </div>
          ))}
        </div>

        {comparisons.length > 0 && (
          <div className="ab-stats-details">
            {comparisons.map(c => (
              <div key={`${c.groupA}-${c.groupB}`} className="ab-stat-comparison">
                <div className="ab-stat-comparison-header">
                  Group {c.groupA} vs Group {c.groupB}
                </div>
                <div className="ab-stat-comparison-grid">
                  <div className="ab-stat-item">
                    <span className="ab-stat-label">Z-Score</span>
                    <span className="ab-stat-value">{c.zScore}</span>
                  </div>
                  <div className="ab-stat-item">
                    <span className="ab-stat-label">P-Value</span>
                    <span className="ab-stat-value">{c.pValue < 0.0001 ? '< 0.0001' : c.pValue}</span>
                  </div>
                  <div className="ab-stat-item">
                    <span className="ab-stat-label">95% CI</span>
                    <span className="ab-stat-value">
                      [{(c.confidenceInterval.low * 100).toFixed(2)}%, {(c.confidenceInterval.high * 100).toFixed(2)}%]
                    </span>
                  </div>
                  <div className="ab-stat-item">
                    <span className="ab-stat-label">Relative Lift</span>
                    <span className={`ab-stat-value ${c.relativeLift > 0 ? 'positive' : c.relativeLift < 0 ? 'negative' : ''}`}>
                      {c.relativeLift > 0 ? '+' : ''}{c.relativeLift}%
                    </span>
                  </div>
                </div>
                <div className={`ab-stats-verdict ${c.isSignificant ? 'significant' : 'not-significant'}`}>
                  {c.isSignificant
                    ? `Statistically Significant \u2014 Group ${c.groupA} ${isCompleted ? 'outperformed' : 'outperforming'} Group ${c.groupB}`
                    : 'Not Significant \u2014 difference is likely random'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="ab-stats-chart">
        <h4>Unique Open Rate Comparison</h4>
        <div className="ab-stats-bars">
          {ranked.map((g, idx) => (
            <div key={g.label} className="ab-chart-row-multi">
              <div className="ab-chart-label">Group {g.label}</div>
              <div className="ab-chart-bars">
                <div
                  className={`ab-chart-bar ${idx === 0 && anySignificant ? 'bar-winner' : ''}`}
                  style={{
                    width: `${(g.rate / maxRate) * 100}%`,
                    background: idx === 0 && anySignificant
                      ? groupColors[idx % groupColors.length].replace('0.3', '0.5')
                      : groupColors[idx % groupColors.length],
                    borderColor: groupBorderColors[idx % groupBorderColors.length],
                    borderWidth: idx === 0 && anySignificant ? '2px' : '1px',
                    borderStyle: 'solid',
                  }}
                >
                  <span className="ab-chart-bar-value">{g.rate}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatisticalAnalysis;