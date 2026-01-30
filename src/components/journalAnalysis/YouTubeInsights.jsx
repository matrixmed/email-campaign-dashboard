import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import _ from 'lodash';
import { matchesSearchTerm } from '../../utils/searchUtils';

const YOUTUBE_BLOB_URL = "https://emaildash.blob.core.windows.net/json-data/youtube_metrics.json?sp=r&st=2026-01-23T22:10:53Z&se=2028-02-03T06:25:53Z&spr=https&sv=2024-11-04&sr=b&sig=5a4p0mFtPn4d9In830LMCQOJlaqkcuPCt7okIDLSHBA%3D";

const COLORS = ['#0ff', '#ff6b6b', '#ffd93d', '#00cc99', '#38bdf8', '#a78bfa', '#f472b6', '#fb923c', '#4ade80', '#818cf8'];

const YouTubeInsights = ({ searchTerm = '', viewMode = 'overview' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [videosData, setVideosData] = useState([]);
  const [aggregatedData, setAggregatedData] = useState({
    trafficSources: {},
    playbackLocations: {},
    countries: {},
    usStates: {},
    cities: [],
    devices: {},
    operatingSystems: {},
    demographics: { ageGroups: {}, genders: {} },
    subscriptionStatus: {},
    searchTerms: [],
    externalUrls: []
  });
  const [selectedTrafficSource, setSelectedTrafficSource] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(YOUTUBE_BLOB_URL);
      const data = await response.json();

      if (data.videos) {
        const videosArray = Object.entries(data.videos).map(([id, video]) => ({
          id,
          title: video.title || 'Untitled',
          views: video.current?.views || 0,
          breakdowns: video.breakdowns || {}
        }));

        setVideosData(videosArray);
        aggregateAllData(videosArray);
      }
    } catch (error) {
    }
    setIsLoading(false);
  };

  const aggregateAllData = (videos) => {
    const agg = {
      trafficSources: {},
      playbackLocations: {},
      countries: {},
      usStates: {},
      cities: {},
      devices: {},
      operatingSystems: {},
      ageGroups: {},
      genders: {},
      subscriptionStatus: {},
      searchTerms: {},
      externalUrls: {}
    };

    videos.forEach(video => {
      const bd = video.breakdowns;
      if (!bd) return;


      if (bd.trafficSources) {
        Object.entries(bd.trafficSources).forEach(([source, data]) => {
          agg.trafficSources[source] = (agg.trafficSources[source] || 0) + (data.views || 0);
        });
      }


      if (bd.playbackLocations) {
        Object.entries(bd.playbackLocations).forEach(([loc, data]) => {
          agg.playbackLocations[loc] = (agg.playbackLocations[loc] || 0) + (data.views || 0);
        });
      }


      if (bd.geography) {
        if (bd.geography.countries) {
          Object.entries(bd.geography.countries).forEach(([country, data]) => {
            agg.countries[country] = (agg.countries[country] || 0) + (data.views || 0);
          });
        }
        if (bd.geography.usStates) {
          Object.entries(bd.geography.usStates).forEach(([state, data]) => {
            const stateName = state.replace('US-', '');
            agg.usStates[stateName] = (agg.usStates[stateName] || 0) + (data.views || 0);
          });
        }
        if (bd.geography.cities) {
          bd.geography.cities.forEach(item => {
            agg.cities[item.city] = (agg.cities[item.city] || 0) + (item.views || 0);
          });
        }
      }


      if (bd.devices) {
        Object.entries(bd.devices).forEach(([device, data]) => {
          agg.devices[device] = (agg.devices[device] || 0) + (data.views || 0);
        });
      }


      if (bd.operatingSystems) {
        Object.entries(bd.operatingSystems).forEach(([os, data]) => {
          agg.operatingSystems[os] = (agg.operatingSystems[os] || 0) + (data.views || 0);
        });
      }


      if (bd.demographics) {
        if (bd.demographics.ageGroups) {
          Object.entries(bd.demographics.ageGroups).forEach(([age, pct]) => {
            if (!agg.ageGroups[age]) agg.ageGroups[age] = { total: 0, count: 0 };
            agg.ageGroups[age].total += pct;
            agg.ageGroups[age].count += 1;
          });
        }
        if (bd.demographics.genders) {
          Object.entries(bd.demographics.genders).forEach(([gender, pct]) => {
            if (!agg.genders[gender]) agg.genders[gender] = { total: 0, count: 0 };
            agg.genders[gender].total += pct;
            agg.genders[gender].count += 1;
          });
        }
      }


      if (bd.subscriptionStatus) {
        Object.entries(bd.subscriptionStatus).forEach(([status, data]) => {
          agg.subscriptionStatus[status] = (agg.subscriptionStatus[status] || 0) + (data.views || 0);
        });
      }


      if (bd.trafficDetails) {
        if (bd.trafficDetails.searchTerms) {
          bd.trafficDetails.searchTerms.forEach(item => {
            agg.searchTerms[item.term] = (agg.searchTerms[item.term] || 0) + (item.views || 0);
          });
        }
        if (bd.trafficDetails.externalUrls) {
          bd.trafficDetails.externalUrls.forEach(item => {
            agg.externalUrls[item.url] = (agg.externalUrls[item.url] || 0) + (item.views || 0);
          });
        }
      }
    });


    const result = {
      trafficSources: Object.entries(agg.trafficSources)
        .map(([name, views]) => ({ name, views }))
        .sort((a, b) => b.views - a.views),
      playbackLocations: Object.entries(agg.playbackLocations)
        .map(([name, views]) => ({ name, views }))
        .sort((a, b) => b.views - a.views),
      countries: Object.entries(agg.countries)
        .map(([name, views]) => ({ name, views }))
        .sort((a, b) => b.views - a.views),
      usStates: Object.entries(agg.usStates)
        .map(([name, views]) => ({ name, views }))
        .sort((a, b) => b.views - a.views),
      cities: Object.entries(agg.cities)
        .map(([name, views]) => ({ name, views }))
        .sort((a, b) => b.views - a.views),
      devices: Object.entries(agg.devices)
        .map(([name, views]) => ({ name, views }))
        .sort((a, b) => b.views - a.views),
      operatingSystems: Object.entries(agg.operatingSystems)
        .map(([name, views]) => ({ name, views }))
        .sort((a, b) => b.views - a.views),
      ageGroups: Object.entries(agg.ageGroups)
        .map(([name, data]) => ({ name, percentage: data.count > 0 ? data.total / data.count : 0 }))
        .sort((a, b) => {
          const order = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
          return order.indexOf(a.name) - order.indexOf(b.name);
        }),
      genders: Object.entries(agg.genders)
        .map(([name, data]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), percentage: data.count > 0 ? data.total / data.count : 0 }))
        .sort((a, b) => b.percentage - a.percentage),
      subscriptionStatus: Object.entries(agg.subscriptionStatus)
        .map(([name, views]) => ({ name, views }))
        .sort((a, b) => b.views - a.views),
      searchTerms: Object.entries(agg.searchTerms)
        .map(([term, views]) => ({ term, views }))
        .sort((a, b) => b.views - a.views),
      externalUrls: Object.entries(agg.externalUrls)
        .map(([url, views]) => ({ url, views }))
        .sort((a, b) => b.views - a.views)
    };

    setAggregatedData(result);
  };

  const formatNumber = (num) => {
    if (isNaN(num)) return "0";
    return num.toLocaleString();
  };

  const totalTrafficViews = _.sumBy(aggregatedData.trafficSources, 'views');
  const totalCountryViews = _.sumBy(aggregatedData.countries, 'views');
  const totalDeviceViews = _.sumBy(aggregatedData.devices, 'views');

  const CustomTooltip = ({ active, payload, totalViews }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="ja-custom-tooltip">
          <p className="ja-tooltip-title">{data.name || data.term || data.url}</p>
          <div className="ja-tooltip-row">
            <span>Views:</span>
            <span>{formatNumber(data.views || data.value)}</span>
          </div>
          {totalViews && (
            <div className="ja-tooltip-row">
              <span>Percentage:</span>
              <span>{(((data.views || data.value) / totalViews) * 100).toFixed(1)}%</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const filteredVideos = videosData.filter(v => matchesSearchTerm(v.title, searchTerm));


  const getVideosByTrafficSource = (sourceName) => {
    return filteredVideos
      .filter(v => v.breakdowns?.trafficSources?.[sourceName])
      .map(v => ({
        title: v.title,
        views: v.breakdowns.trafficSources[sourceName].views || 0
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20);
  };


  const getVideosByCountry = (countryName) => {
    return filteredVideos
      .filter(v => v.breakdowns?.geography?.countries?.[countryName])
      .map(v => ({
        title: v.title,
        views: v.breakdowns.geography.countries[countryName].views || 0
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20);
  };

  return (
    <div className="publication-comparison-wrapper">
      {isLoading ? (
        <div className="ja-chart-container">
          <div className="loading-container">
            <div className="spinner">
              <div></div><div></div><div></div><div></div><div></div><div></div>
            </div>
            <p>Loading YouTube data...</p>
          </div>
        </div>
      ) : (
        <>
          {viewMode === 'overview' && (
            <div className="ja-chart-container">
              <div className="ja-chart-row">
                <div className="ja-chart-half">
                  <h3>Traffic Sources</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={aggregatedData.trafficSources.slice(0, 8)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="views"
                        label={({ name, percent }) => percent > 0.05 ? name : ''}
                      >
                        {aggregatedData.trafficSources.slice(0, 8).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip totalViews={totalTrafficViews} />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="ja-chart-half">
                  <h3>Device Distribution</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={aggregatedData.devices} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis type="number" stroke="#888" />
                      <YAxis dataKey="name" type="category" stroke="#888" width={100} tick={{ fontSize: 12, fill: '#ccc' }} />
                      <Tooltip content={<CustomTooltip totalViews={totalDeviceViews} />} />
                      <Bar dataKey="views" radius={[0, 4, 4, 0]}>
                        {aggregatedData.devices.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'traffic' && (
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
                      <th>Views</th>
                      <th>% of Total</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregatedData.trafficSources.map((source, idx) => {
                      const isExpanded = selectedTrafficSource === source.name;
                      const videosForSource = isExpanded ? getVideosByTrafficSource(source.name) : [];

                      return (
                        <React.Fragment key={source.name}>
                          <tr
                            className={`expandable-row ${isExpanded ? 'expanded' : ''}`}
                            onClick={() => setSelectedTrafficSource(isExpanded ? null : source.name)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td className="matrix-value-cell">
                              <span className="matrix-value row-number">{idx + 1}</span>
                            </td>
                            <td className="publication-cell">
                              {source.name}
                            </td>
                            <td className="matrix-value-cell">
                              <span className="matrix-value">{formatNumber(source.views)}</span>
                            </td>
                            <td className="matrix-value-cell">
                              <span className="matrix-value">{((source.views / totalTrafficViews) * 100).toFixed(1)}%</span>
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
                                        <th className="publication-header">Video</th>
                                        <th>Views from {source.name}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {videosForSource.map((v, vIdx) => (
                                        <tr key={vIdx}>
                                          <td className="matrix-value-cell">
                                            <span className="matrix-value row-number">{vIdx + 1}</span>
                                          </td>
                                          <td className="publication-cell">{v.title}</td>
                                          <td className="matrix-value-cell">
                                            <span className="matrix-value">{formatNumber(v.views)}</span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
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

              {aggregatedData.searchTerms.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <div className="ja-matrix-header">
                    <h4>Top Search Terms</h4>
                  </div>
                  <div className="matrix-table-wrapper">
                    <table className="ja-matrix-table">
                      <thead>
                        <tr>
                          <th style={{ width: '50px' }}>#</th>
                          <th className="publication-header">Search Term</th>
                          <th>Views</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aggregatedData.searchTerms.slice(0, 20).map((item, idx) => (
                          <tr key={idx}>
                            <td className="matrix-value-cell">
                              <span className="matrix-value row-number">{idx + 1}</span>
                            </td>
                            <td className="publication-cell">{item.term}</td>
                            <td className="matrix-value-cell">
                              <span className="matrix-value">{formatNumber(item.views)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {viewMode === 'geography' && (
            <div className="ja-matrix-section">
              <div className="ja-matrix-header">
                <h4>Views by Country</h4>
              </div>
              <div className="matrix-table-wrapper">
                <table className="ja-matrix-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>#</th>
                      <th className="publication-header">Country</th>
                      <th>Views</th>
                      <th>% of Total</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregatedData.countries.slice(0, 30).map((country, idx) => {
                      const isExpanded = selectedCountry === country.name;
                      const videosForCountry = isExpanded ? getVideosByCountry(country.name) : [];

                      return (
                        <React.Fragment key={country.name}>
                          <tr
                            className={`expandable-row ${isExpanded ? 'expanded' : ''}`}
                            onClick={() => setSelectedCountry(isExpanded ? null : country.name)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td className="matrix-value-cell">
                              <span className="matrix-value row-number">{idx + 1}</span>
                            </td>
                            <td className="publication-cell">{country.name}</td>
                            <td className="matrix-value-cell">
                              <span className="matrix-value">{formatNumber(country.views)}</span>
                            </td>
                            <td className="matrix-value-cell">
                              <span className="matrix-value">{((country.views / totalCountryViews) * 100).toFixed(1)}%</span>
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
                                        <th className="publication-header">Video</th>
                                        <th>Views from {country.name}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {videosForCountry.map((v, vIdx) => (
                                        <tr key={vIdx}>
                                          <td className="matrix-value-cell">
                                            <span className="matrix-value row-number">{vIdx + 1}</span>
                                          </td>
                                          <td className="publication-cell">{v.title}</td>
                                          <td className="matrix-value-cell">
                                            <span className="matrix-value">{formatNumber(v.views)}</span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
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

              {aggregatedData.usStates.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <div className="ja-matrix-header">
                    <h4>US States</h4>
                  </div>
                  <div className="matrix-table-wrapper">
                    <table className="ja-matrix-table">
                      <thead>
                        <tr>
                          <th style={{ width: '50px' }}>#</th>
                          <th className="publication-header">State</th>
                          <th>Views</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aggregatedData.usStates.slice(0, 20).map((state, idx) => (
                          <tr key={idx}>
                            <td className="matrix-value-cell">
                              <span className="matrix-value row-number">{idx + 1}</span>
                            </td>
                            <td className="publication-cell">{state.name}</td>
                            <td className="matrix-value-cell">
                              <span className="matrix-value">{formatNumber(state.views)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {viewMode === 'audience' && (
            <>
              <div className="ja-matrix-section">
                <div className="ja-matrix-header">
                  <h4>Subscription Status</h4>
                </div>
                <div className="matrix-table-wrapper">
                  <table className="ja-matrix-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>#</th>
                        <th className="publication-header">Status</th>
                        <th>Views</th>
                        <th>% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aggregatedData.subscriptionStatus.map((status, idx) => {
                        const totalSubViews = _.sumBy(aggregatedData.subscriptionStatus, 'views');
                        return (
                          <tr key={idx}>
                            <td className="matrix-value-cell">
                              <span className="matrix-value row-number">{idx + 1}</span>
                            </td>
                            <td className="publication-cell">{status.name}</td>
                            <td className="matrix-value-cell">
                              <span className="matrix-value">{formatNumber(status.views)}</span>
                            </td>
                            <td className="matrix-value-cell">
                              <span className="matrix-value">{((status.views / totalSubViews) * 100).toFixed(1)}%</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="ja-matrix-section" style={{ marginTop: '24px' }}>
                <div className="ja-matrix-header">
                  <h4>Devices</h4>
                </div>
                <div className="matrix-table-wrapper">
                  <table className="ja-matrix-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>#</th>
                        <th className="publication-header">Device</th>
                        <th>Views</th>
                        <th>% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aggregatedData.devices.map((device, idx) => (
                        <tr key={idx}>
                          <td className="matrix-value-cell">
                            <span className="matrix-value row-number">{idx + 1}</span>
                          </td>
                          <td className="publication-cell">{device.name}</td>
                          <td className="matrix-value-cell">
                            <span className="matrix-value">{formatNumber(device.views)}</span>
                          </td>
                          <td className="matrix-value-cell">
                            <span className="matrix-value">{((device.views / totalDeviceViews) * 100).toFixed(1)}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="ja-matrix-section" style={{ marginTop: '24px' }}>
                <div className="ja-matrix-header">
                  <h4>Operating Systems</h4>
                </div>
                <div className="matrix-table-wrapper">
                  <table className="ja-matrix-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>#</th>
                        <th className="publication-header">Operating System</th>
                        <th>Views</th>
                        <th>% of Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aggregatedData.operatingSystems.map((os, idx) => {
                        const totalOsViews = _.sumBy(aggregatedData.operatingSystems, 'views');
                        return (
                          <tr key={idx}>
                            <td className="matrix-value-cell">
                              <span className="matrix-value row-number">{idx + 1}</span>
                            </td>
                            <td className="publication-cell">{os.name}</td>
                            <td className="matrix-value-cell">
                              <span className="matrix-value">{formatNumber(os.views)}</span>
                            </td>
                            <td className="matrix-value-cell">
                              <span className="matrix-value">{((os.views / totalOsViews) * 100).toFixed(1)}%</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default YouTubeInsights;