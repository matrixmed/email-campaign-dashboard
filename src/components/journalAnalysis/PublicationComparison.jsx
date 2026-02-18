import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import _ from 'lodash';
import { matchesSearchTerm } from '../../utils/searchUtils';

const WALSWORTH_BLOB_URL = "https://emaildash.blob.core.windows.net/json-data/walsworth_metrics.json?sp=r&st=2026-01-15T18:57:16Z&se=2027-09-24T02:12:16Z&spr=https&sv=2024-11-04&sr=b&sig=w1q9PY%2FMzuTUvwwOV%2Bcub%2FV7Cygeff3ESRaC2l1KvPM%3D";

const normalizePublicationName = (publication) => {
  if (!publication) return 'Unknown';
  if (publication.startsWith('Innovations in Clinical Neuroscience') && publication !== 'Innovations in Clinical Neuroscience') {
    return 'Innovations in Clinical Neuroscience';
  }
  if (publication.startsWith('Bariatric Times') && publication !== 'Bariatric Times') {
    return 'Bariatric Times';
  }
  return publication;
};

const PublicationComparison = ({
  searchTerm = '',
  selectedMetrics = ['visitsPerIssue'],
  metricOptions = [],
  selectedPublications = [],
  setSelectedPublications,
  allPublications = [],
  setAllPublications
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [publicationData, setPublicationData] = useState([]);
  const [showPerIssue, setShowPerIssue] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(WALSWORTH_BLOB_URL);
      const data = await response.json();

      if (data.issues && Array.isArray(data.issues)) {
        const normalizedIssues = data.issues.map(issue => ({
          ...issue,
          publication: normalizePublicationName(issue.publication)
        }));
        const grouped = _.groupBy(normalizedIssues, 'publication');

        const aggregated = Object.entries(grouped).map(([publication, issues]) => {
          const totalPageViews = _.sumBy(issues, i => i.current?.total_page_views || 0);
          const uniquePageViews = _.sumBy(issues, i => i.current?.unique_page_views || 0);
          const totalIssueVisits = _.sumBy(issues, i => i.current?.total_issue_visits || 0);
          const totalWeightedTime = _.sumBy(issues, i =>
            (i.current?.seconds_per_visit || 0) * (i.current?.total_issue_visits || 0)
          );
          const avgTimeInIssue = totalIssueVisits > 0 ? totalWeightedTime / totalIssueVisits : 0;
          const issueCount = issues.length;

          return {
            publication: publication || 'Unknown',
            totalPageViews,
            uniquePageViews,
            totalIssueVisits,
            avgTimeInIssue: Math.round(avgTimeInIssue),
            issueCount,
            pageViewsPerIssue: issueCount > 0 ? Math.round(totalPageViews / issueCount) : 0,
            uniqueViewsPerIssue: issueCount > 0 ? Math.round(uniquePageViews / issueCount) : 0,
            visitsPerIssue: issueCount > 0 ? Math.round(totalIssueVisits / issueCount) : 0,
            issues
          };
        }).filter(p => p.publication !== 'Unknown');

        const sorted = _.orderBy(aggregated, ['visitsPerIssue'], ['desc']);
        setPublicationData(sorted);
        setAllPublications(sorted.map(p => p.publication));
        setSelectedPublications(sorted.slice(0, 5).map(p => p.publication));
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

  const tableData = publicationData
    .filter(p => selectedPublications.includes(p.publication))
    .filter(p => matchesSearchTerm(p.publication, searchTerm));

  const chartData = publicationData
    .filter(p => selectedPublications.includes(p.publication))
    .filter(p => matchesSearchTerm(p.publication, searchTerm));

  const getMaxChars = (count) => {
    if (count <= 3) return 50;
    if (count <= 5) return 40;
    if (count <= 7) return 30;
    if (count <= 10) return 25;
    return 20;
  };

  const maxChars = getMaxChars(chartData.length);

  const sortedChartData = _.orderBy(chartData, ['visitsPerIssue'], ['desc']).map(p => ({
    name: p.publication.length > maxChars ? p.publication.substring(0, maxChars) + '...' : p.publication,
    fullName: p.publication,
    visitsPerIssue: p.visitsPerIssue,
    pageViewsPerIssue: p.pageViewsPerIssue,
    uniqueViewsPerIssue: p.uniqueViewsPerIssue,
    avgTimeInIssue: p.avgTimeInIssue,
    ...p
  }));

  const sortedTableData = _.orderBy(tableData, ['visitsPerIssue'], ['desc']);

  const calculateStats = (data, key) => {
    const values = data.map(p => p[key]);
    const mean = values.length > 0 ? _.mean(values) : 0;
    const stdDev = values.length > 0 ? Math.sqrt(_.mean(values.map(v => Math.pow(v - mean, 2)))) : 0;
    return { mean, stdDev };
  };

  const visitsStats = calculateStats(sortedTableData, 'visitsPerIssue');
  const pageViewsStats = calculateStats(sortedTableData, 'pageViewsPerIssue');
  const uniqueViewsStats = calculateStats(sortedTableData, 'uniqueViewsPerIssue');
  const avgTimeStats = calculateStats(sortedTableData, 'avgTimeInIssue');

  const getValueClass = (value, stats) => {
    if (stats.stdDev === 0) return '';
    const zScore = (value - stats.mean) / stats.stdDev;
    if (zScore > 1) return 'matrix-high';
    if (zScore < -1) return 'matrix-low';
    return '';
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="ja-custom-tooltip">
          <p className="ja-tooltip-title">{data.fullName}</p>
          <div className="ja-tooltip-row">
            <span>Issues:</span>
            <span>{data.issueCount}</span>
          </div>
          {payload.map((entry, idx) => {
            const metric = metricOptions.find(m => m.key === entry.dataKey);
            const value = entry.dataKey === 'avgTimeInIssue'
              ? formatTimeInIssue(entry.value)
              : formatNumber(entry.value);
            return (
              <div key={idx} className="ja-tooltip-row">
                <span style={{ color: entry.color }}>{metric?.label || entry.dataKey}:</span>
                <span>{value}</span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const getTableValue = (pub, metricKey) => {
    if (showPerIssue) {
      if (metricKey === 'avgTimeInIssue') return pub.avgTimeInIssue;
      return pub[metricKey];
    }
    if (metricKey === 'visitsPerIssue') return pub.totalIssueVisits;
    if (metricKey === 'pageViewsPerIssue') return pub.totalPageViews;
    if (metricKey === 'uniqueViewsPerIssue') return pub.uniquePageViews;
    return pub[metricKey];
  };

  const formatTableValue = (pub, metricKey) => {
    const value = getTableValue(pub, metricKey);
    if (metricKey === 'avgTimeInIssue') return formatTimeInIssue(value);
    return formatNumber(value);
  };

  const formatYAxis = (value) => {
    if (selectedMetrics.includes('avgTimeInIssue') && selectedMetrics.length === 1) {
      return formatTimeInIssue(value);
    }
    return formatNumber(value);
  };

  return (
    <div className="publication-comparison-wrapper">
      {isLoading ? (
        <div className="ja-chart-container">
          <div className="loading-container">
            <div className="spinner">
              <div></div><div></div><div></div><div></div><div></div><div></div>
            </div>
            <p>Loading publication data...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="ja-chart-container">
            {sortedChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={sortedChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis
                    dataKey="name"
                    stroke="#888"
                    tick={{ fontSize: 11, fill: '#ccc' }}
                    interval={0}
                    height={60}
                  />
                  <YAxis
                    stroke="#888"
                    tickFormatter={formatYAxis}
                    tick={{ fontSize: 12, fill: '#888' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value) => {
                      const metric = metricOptions.find(m => m.key === value);
                      return <span style={{ color: '#ccc' }}>{metric?.label || value}</span>;
                    }}
                  />
                  {metricOptions
                    .filter(m => selectedMetrics.includes(m.key))
                    .map(metric => (
                      <Bar
                        key={metric.key}
                        dataKey={metric.key}
                        fill={metric.color}
                        name={metric.key}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data">Select publications to display in the chart</div>
            )}
          </div>

          {sortedTableData.length > 0 && (
            <div className="ja-matrix-section">
              <div className="ja-matrix-header">
                <h4>Publication Details</h4>
                <div className="ja-toggle-group">
                  <button
                    className={`ja-toggle-btn ${showPerIssue ? 'active' : ''}`}
                    onClick={() => setShowPerIssue(true)}
                  >
                    Per Issue
                  </button>
                  <button
                    className={`ja-toggle-btn ${!showPerIssue ? 'active' : ''}`}
                    onClick={() => setShowPerIssue(false)}
                  >
                    Total
                  </button>
                </div>
              </div>
              <div className="matrix-table-wrapper">
                <table className="ja-matrix-table">
                  <thead>
                    <tr>
                      <th className="publication-header">Publication</th>
                      <th>Issues</th>
                      <th>{showPerIssue ? 'Visits/Issue' : 'Total Visits'}</th>
                      <th>{showPerIssue ? 'Page Views/Issue' : 'Page Views'}</th>
                      <th>{showPerIssue ? 'Unique Views/Issue' : 'Unique Views'}</th>
                      <th>Avg Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTableData.map((pub, idx) => (
                      <tr key={idx}>
                        <td className="publication-cell">{pub.publication}</td>
                        <td className="matrix-value-cell">
                          <span className="matrix-value">{pub.issueCount}</span>
                        </td>
                        <td className="matrix-value-cell">
                          <span className={`matrix-value ${getValueClass(pub.visitsPerIssue, visitsStats)}`}>
                            {formatTableValue(pub, 'visitsPerIssue')}
                          </span>
                        </td>
                        <td className="matrix-value-cell">
                          <span className={`matrix-value ${getValueClass(pub.pageViewsPerIssue, pageViewsStats)}`}>
                            {formatTableValue(pub, 'pageViewsPerIssue')}
                          </span>
                        </td>
                        <td className="matrix-value-cell">
                          <span className={`matrix-value ${getValueClass(pub.uniqueViewsPerIssue, uniqueViewsStats)}`}>
                            {formatTableValue(pub, 'uniqueViewsPerIssue')}
                          </span>
                        </td>
                        <td className="matrix-value-cell">
                          <span className={`matrix-value ${getValueClass(pub.avgTimeInIssue, avgTimeStats)}`}>
                            {formatTimeInIssue(pub.avgTimeInIssue)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="matrix-legend">
                <span className="legend-item"><span className="legend-color matrix-high"></span> Above Average</span>
                <span className="legend-item"><span className="legend-color matrix-low"></span> Below Average</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PublicationComparison;