import React, { useState, useEffect } from 'react';
import _ from 'lodash';
import { matchesSearchTerm } from '../../utils/searchUtils';

const WALSWORTH_BLOB_URL = "https://emaildash.blob.core.windows.net/json-data/walsworth_metrics.json?sp=r&st=2026-01-15T18:57:16Z&se=2027-09-24T02:12:16Z&spr=https&sv=2024-11-04&sr=b&sig=w1q9PY%2FMzuTUvwwOV%2Bcub%2FV7Cygeff3ESRaC2l1KvPM%3D";

const JournalAnomalies = ({ searchTerm = '', analyzeBy = 'time' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [anomalies, setAnomalies] = useState([]);
  const [showOverperforming, setShowOverperforming] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    fetchAndAnalyze();
  }, [showOverperforming, analyzeBy]);

  const fetchAndAnalyze = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(WALSWORTH_BLOB_URL);
      const data = await response.json();

      if (data.issues && Array.isArray(data.issues)) {
        const issues = data.issues.filter(i =>
          i.current?.total_issue_visits >= 10 && i.publication
        );

        const grouped = _.groupBy(issues, 'publication');
        const allAnomalies = [];
        const zThreshold = showOverperforming ? 1.5 : -1.5;

        Object.entries(grouped).forEach(([publication, pubIssues]) => {
          if (pubIssues.length < 3) return;

          let values, getValue;
          if (analyzeBy === 'time') {
            getValue = (i) => i.current?.seconds_per_visit || 0;
          } else if (analyzeBy === 'visits') {
            getValue = (i) => i.current?.total_issue_visits || 0;
          } else {
            getValue = (i) => i.current?.total_page_views || 0;
          }

          values = pubIssues.map(getValue).filter(v => v > 0);
          if (values.length < 3) return;

          const mean = _.mean(values);
          const stdDev = Math.sqrt(_.mean(values.map(v => Math.pow(v - mean, 2))));

          pubIssues.forEach(issue => {
            const value = getValue(issue);
            if (value === 0) return;

            const zScore = (value - mean) / (stdDev || 1);
            const isAnomaly = showOverperforming ? zScore > zThreshold : zScore < zThreshold;

            if (isAnomaly) {
              allAnomalies.push({
                ...issue,
                publication,
                metricValue: value,
                mean,
                stdDev,
                zScore,
                deviationPercent: ((value - mean) / mean) * 100
              });
            }
          });
        });

        allAnomalies.sort((a, b) => {
          if (showOverperforming) {
            return b.zScore - a.zScore;
          }
          return a.zScore - b.zScore;
        });

        setAnomalies(allAnomalies);
      }
    } catch (error) {
    }
    setIsLoading(false);
  };

  const formatTimeInIssue = (seconds) => {
    if (isNaN(seconds) || seconds <= 0) return "0s";
    seconds = Math.round(seconds);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const formatNumber = (num) => {
    if (isNaN(num)) return "0";
    return num.toLocaleString();
  };

  const formatMetricValue = (value) => {
    if (analyzeBy === 'time') {
      return formatTimeInIssue(value);
    }
    return formatNumber(Math.round(value));
  };

  const getMetricLabel = () => {
    if (analyzeBy === 'time') return 'Avg Time in Issue';
    if (analyzeBy === 'visits') return 'Total Issue Visits';
    return 'Total Page Views';
  };

  const getSeverityLabel = (zScore) => {
    const absZ = Math.abs(zScore);
    if (absZ > 2.5) return showOverperforming ? 'Exceptional' : 'Severe';
    if (absZ > 2) return showOverperforming ? 'Strong' : 'Moderate';
    return showOverperforming ? 'Notable' : 'Mild';
  };

  const matchesSearch = (anomaly) => {
    if (!searchTerm) return true;
    const searchable = [
      anomaly.issue_name,
      anomaly.publication
    ].join(' ');
    return matchesSearchTerm(searchable, searchTerm);
  };

  const filteredAnomalies = anomalies.filter(matchesSearch);

  const publicationStats = _.groupBy(filteredAnomalies, 'publication');
  const topUnderperformingPubs = Object.entries(publicationStats)
    .map(([pub, issues]) => ({ publication: pub, count: issues.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="ja-section-container">
      <div className="ja-anomaly-header">
        <div className="ja-anomaly-title-row">
          <h2>{showOverperforming ? 'Overperforming Issues' : 'Underperforming Issues'}</h2>
          <div
            className="ja-info-icon-wrapper"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
          </div>
        </div>

        <div className="ja-anomaly-controls">
          <div className="ja-toggle-group">
            <button
              className={`ja-toggle-btn ${!showOverperforming ? 'active' : ''}`}
              onClick={() => setShowOverperforming(false)}
            >
              Underperforming
            </button>
            <button
              className={`ja-toggle-btn ${showOverperforming ? 'active' : ''}`}
              onClick={() => setShowOverperforming(true)}
            >
              Overperforming
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="ja-loading">
          <div className="spinner">
            <div></div><div></div><div></div><div></div><div></div><div></div>
          </div>
          <p>Analyzing journal data...</p>
        </div>
      ) : filteredAnomalies.length > 0 ? (
        <div className="ja-anomaly-grid">
          {filteredAnomalies.map((anomaly, idx) => (
            <div
              key={idx}
              className={`ja-anomaly-card ${showOverperforming ? 'overperforming' : ''}`}
            >
              <div className="ja-anomaly-card-header">
                <span className={`ja-anomaly-severity ${showOverperforming ? 'positive' : ''}`}>
                  {getSeverityLabel(anomaly.zScore)}
                </span>
                <span className="ja-anomaly-publication">{anomaly.publication}</span>
              </div>

              <h3 className="ja-anomaly-issue-name">{anomaly.issue_name}</h3>

              <div className="ja-anomaly-metrics">
                <div className="ja-anomaly-metric">
                  <span className="ja-anomaly-metric-label">{getMetricLabel()}</span>
                  <span className={`ja-anomaly-metric-value ${showOverperforming ? 'positive' : 'negative'}`}>
                    {formatMetricValue(anomaly.metricValue)}
                  </span>
                </div>
                <div className="ja-anomaly-metric">
                  <span className="ja-anomaly-metric-label">Publication Average</span>
                  <span className="ja-anomaly-metric-value">
                    {formatMetricValue(anomaly.mean)}
                  </span>
                </div>
                <div className="ja-anomaly-metric highlight">
                  <span className="ja-anomaly-metric-label">Deviation</span>
                  <span className={`ja-anomaly-metric-value ${showOverperforming ? 'positive' : 'negative'}`}>
                    {showOverperforming ? '+' : ''}{anomaly.deviationPercent.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="ja-anomaly-stats">
                <div className="ja-anomaly-stat">
                  <span className="ja-anomaly-stat-label">Total Visits</span>
                  <span className="ja-anomaly-stat-value">
                    {formatNumber(anomaly.current?.total_issue_visits || 0)}
                  </span>
                </div>
                <div className="ja-anomaly-stat">
                  <span className="ja-anomaly-stat-label">Z-Score</span>
                  <span className="ja-anomaly-stat-value">
                    {showOverperforming ? '+' : ''}{anomaly.zScore.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="ja-no-data">
          <p>No significant {showOverperforming ? 'overperformers' : 'anomalies'} detected{searchTerm ? ' matching search' : ''}.</p>
          <p className="ja-no-data-subtitle">
            {showOverperforming
              ? 'No issues are significantly exceeding expected performance.'
              : 'All issues are performing within expected ranges for their publication.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default JournalAnomalies;