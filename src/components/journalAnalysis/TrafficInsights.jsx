import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import _ from 'lodash';
import { matchesSearchTerm } from '../../utils/searchUtils';

const GA_BLOB_URL = "https://emaildash.blob.core.windows.net/json-data/google_analytics_metrics.json?sp=r&st=2026-01-16T21:12:00Z&se=2028-04-14T04:27:00Z&spr=https&sv=2024-11-04&sr=b&sig=fDQhUjngrEfV4mfCzwx7itsVhoyQYVkuNEwi86NSFf8%3D";

const SOURCE_COLORS = [
  '#0ff', '#ff6b6b', '#ffd93d', '#00cc99', '#38bdf8',
  '#a78bfa', '#f472b6', '#fb923c', '#4ade80', '#818cf8'
];

const extractTitleFromUrl = (url) => {
  if (!url) return 'Unknown URL';
  try {
    let fullUrl = url;
    if (!url.startsWith('http')) {
      fullUrl = 'https://' + url;
    }
    const urlObj = new URL(fullUrl);
    let path = urlObj.pathname.replace(/\/+$/, '');

    if (!path || path === '/') {
      return urlObj.hostname;
    }

    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) {
      return urlObj.hostname;
    }

    let title = segments[segments.length - 1];
    title = title.replace(/[-_]/g, ' ');
    title = title.replace(/\.(html?|php|aspx?)$/i, '');
    title = title.replace(/\b\w/g, c => c.toUpperCase());

    return title || urlObj.hostname;
  } catch (e) {
    const cleanUrl = url.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    return cleanUrl || 'Unknown URL';
  }
};

const getPropertyFromUrl = (url) => {
  if (!url) return 'Unknown';
  try {
    let fullUrl = url;
    if (!url.startsWith('http')) {
      fullUrl = 'https://' + url;
    }
    const urlObj = new URL(fullUrl);
    const hostname = urlObj.hostname.toLowerCase().replace('www.', '');

    if (hostname.includes('jcadonline')) return 'JCAD';
    if (hostname.includes('icnsjournal')) return 'ICNS';
    if (hostname.includes('onclogymatrix') || hostname.includes('oncologymatrix')) return 'Oncology Matrix';
    if (hostname.includes('nhrhealth') || hostname.includes('nhr')) return 'NHR';
    if (hostname.includes('matrixmedical')) return 'Matrix Medical';
    if (hostname.includes('walsworth')) return 'Walsworth';

    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    return hostname;
  } catch (e) {
    return 'Unknown';
  }
};

const TrafficInsights = ({ searchTerm = '', viewMode = 'overview' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [sourceData, setSourceData] = useState([]);
  const [journalSourceData, setJournalSourceData] = useState([]);
  const [selectedSource, setSelectedSource] = useState(null);
  const [sourcesVisible, setSourcesVisible] = useState(100);
  const [journalsVisibleBySource, setJournalsVisibleBySource] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (viewMode !== 'drilldown') {
      setSelectedSource(null);
    }
  }, [viewMode]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(GA_BLOB_URL);
      const data = await response.json();

      if (data.urls && Array.isArray(data.urls)) {
        const sourceTotals = {};
        const journalData = [];

        data.urls.forEach(item => {
          if (!item.current?.sources) return;
          const title = item.title && item.title !== 'Unknown' ? item.title : extractTitleFromUrl(item.url);
          const journalSources = {};
          let totalSessions = 0;

          Object.entries(item.current.sources).forEach(([source, count]) => {
            const normalizedSource = normalizeSourceName(source);
            sourceTotals[normalizedSource] = (sourceTotals[normalizedSource] || 0) + count;
            journalSources[normalizedSource] = (journalSources[normalizedSource] || 0) + count;
            totalSessions += count;
          });

          if (totalSessions > 0) {
            journalData.push({
              title,
              url: item.url,
              property: getPropertyFromUrl(item.url),
              sources: journalSources,
              totalSessions,
              topSource: Object.entries(journalSources).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown'
            });
          }
        });

        const sortedSources = Object.entries(sourceTotals)
          .map(([name, sessions]) => ({ name, sessions }))
          .sort((a, b) => b.sessions - a.sessions);

        setSourceData(sortedSources);
        setJournalSourceData(_.orderBy(journalData, ['totalSessions'], ['desc']));
      }
    } catch (error) {
    }
    setIsLoading(false);
  };

  const normalizeSourceName = (source) => {
    const s = source.toLowerCase();
    if (s === '(direct)' || s === 'direct') return 'Direct';
    if (s.includes('google')) return 'Google';
    if (s.includes('bing')) return 'Bing';
    if (s.includes('yahoo')) return 'Yahoo';
    if (s.includes('facebook') || s.includes('fb')) return 'Facebook';
    if (s.includes('linkedin')) return 'LinkedIn';
    if (s.includes('twitter') || s.includes('x.com')) return 'Twitter/X';
    if (s.includes('email') || s.includes('newsletter') || s.includes('mailchimp')) return 'Email';
    if (s.includes('instagram')) return 'Instagram';
    return source.charAt(0).toUpperCase() + source.slice(1);
  };

  const formatNumber = (num) => {
    if (isNaN(num)) return "0";
    return num.toLocaleString();
  };

  const totalSessions = _.sumBy(sourceData, 'sessions');
  const topSources = sourceData.slice(0, 10);

  const pieData = topSources.map((s, idx) => ({
    name: s.name,
    value: s.sessions,
    color: SOURCE_COLORS[idx % SOURCE_COLORS.length]
  }));

  const filteredJournals = journalSourceData.filter(j =>
    matchesSearchTerm(j.title, searchTerm)
  );

  const sourceByJournal = selectedSource
    ? filteredJournals
        .filter(j => j.sources[selectedSource])
        .map(j => ({
          title: j.title,
          sessions: j.sources[selectedSource],
          percentage: ((j.sources[selectedSource] / j.totalSessions) * 100).toFixed(1)
        }))
        .sort((a, b) => b.sessions - a.sessions)
        .slice(0, 20)
    : [];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="ja-custom-tooltip">
          <p className="ja-tooltip-title">{data.name}</p>
          <div className="ja-tooltip-row">
            <span>Sessions:</span>
            <span>{formatNumber(data.sessions || data.value)}</span>
          </div>
          <div className="ja-tooltip-row">
            <span>Percentage:</span>
            <span>{((data.sessions || data.value) / totalSessions * 100).toFixed(1)}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const barChartData = topSources.map((s, idx) => ({
    name: s.name.length > 15 ? s.name.substring(0, 15) + '...' : s.name,
    fullName: s.name,
    sessions: s.sessions,
    fill: SOURCE_COLORS[idx % SOURCE_COLORS.length]
  }));

  return (
    <div className="publication-comparison-wrapper">
      {isLoading ? (
        <div className="ja-chart-container">
          <div className="loading-container">
            <div className="spinner">
              <div></div><div></div><div></div><div></div><div></div><div></div>
            </div>
            <p>Loading traffic data...</p>
          </div>
        </div>
      ) : (
        <>
          {viewMode === 'overview' && (
            <div className="ja-chart-container">
              <div className="ja-chart-row">
                <div className="ja-chart-half">
                  <h3>Traffic Distribution</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => percent > 0.05 ? `${name}` : ''}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="ja-chart-half">
                  <h3>Top Traffic Sources</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={barChartData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis type="number" stroke="#888" />
                      <YAxis dataKey="name" type="category" stroke="#888" width={100} tick={{ fontSize: 12, fill: '#ccc' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="sessions" radius={[0, 4, 4, 0]}>
                        {barChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'drilldown' && (
            <div className="ja-matrix-section">
              <div className="ja-matrix-header">
                <h4>Traffic Sources</h4>
              </div>
              <div className="matrix-table-wrapper">
                <table className="ja-matrix-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>#</th>
                      <th className="publication-header">Source</th>
                      <th>Sessions</th>
                      <th>% of Total</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceData.slice(0, sourcesVisible).map((source, idx) => {
                      const isExpanded = selectedSource === source.name;
                      const allJournalsForSource = filteredJournals
                        .filter(j => j.sources[source.name])
                        .map(j => ({
                          title: j.title,
                          property: j.property,
                          sessions: j.sources[source.name],
                          percentage: ((j.sources[source.name] / j.totalSessions) * 100).toFixed(1)
                        }))
                        .sort((a, b) => b.sessions - a.sessions);

                      const journalsVisible = journalsVisibleBySource[source.name] || 20;
                      const journalsForSource = allJournalsForSource.slice(0, journalsVisible);
                      const hasMoreJournals = allJournalsForSource.length > journalsVisible;

                      return (
                        <React.Fragment key={source.name}>
                          <tr
                            className={`expandable-row ${isExpanded ? 'expanded' : ''}`}
                            onClick={() => setSelectedSource(isExpanded ? null : source.name)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td className="matrix-value-cell">
                              <span className="matrix-value row-number">{idx + 1}</span>
                            </td>
                            <td className="publication-cell">
                              {source.name}
                            </td>
                            <td className="matrix-value-cell">
                              <span className="matrix-value">{formatNumber(source.sessions)}</span>
                            </td>
                            <td className="matrix-value-cell">
                              <span className="matrix-value">{((source.sessions / totalSessions) * 100).toFixed(1)}%</span>
                            </td>
                            <td className="matrix-value-cell expand-cell">
                              <span className={`expand-chevron ${isExpanded ? 'expanded' : ''}`}>
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                  <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="expanded-content-row">
                              <td colSpan={5} style={{ padding: 0 }}>
                                <div className="expanded-journals-table">
                                  <table className="ja-matrix-table nested-table">
                                    <thead>
                                      <tr>
                                        <th style={{ width: '50px' }}>#</th>
                                        <th className="publication-header">Journal</th>
                                        <th>Sessions from {source.name}</th>
                                        <th>% of Journal Traffic</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {journalsForSource.map((j, jIdx) => (
                                        <tr key={jIdx}>
                                          <td className="matrix-value-cell">
                                            <span className="matrix-value row-number">{jIdx + 1}</span>
                                          </td>
                                          <td className="publication-cell">
                                            {j.title}
                                            <span className="property-tag">{j.property}</span>
                                          </td>
                                          <td className="matrix-value-cell">
                                            <span className="matrix-value">{formatNumber(j.sessions)}</span>
                                          </td>
                                          <td className="matrix-value-cell">
                                            <span className="matrix-value">{j.percentage}%</span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                  {hasMoreJournals && (
                                    <div className="load-more-container nested">
                                      <button
                                        className="load-more-btn"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setJournalsVisibleBySource(prev => ({
                                            ...prev,
                                            [source.name]: (prev[source.name] || 20) + 20
                                          }));
                                        }}
                                      >
                                        Load More ({allJournalsForSource.length - journalsVisible} remaining)
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {sourcesVisible < sourceData.length && (
                <div className="load-more-container">
                  <button
                    className="load-more-btn"
                    onClick={() => setSourcesVisible(prev => prev + 50)}
                  >
                    Load More ({sourceData.length - sourcesVisible} remaining)
                  </button>
                </div>
              )}
            </div>
          )}

        </>
      )}
    </div>
  );
};

export default TrafficInsights;