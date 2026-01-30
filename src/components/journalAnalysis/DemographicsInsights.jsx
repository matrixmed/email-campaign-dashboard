import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import _ from 'lodash';
import { matchesSearchTerm } from '../../utils/searchUtils';

const GA_BLOB_URL = "https://emaildash.blob.core.windows.net/json-data/google_analytics_metrics.json?sp=r&st=2026-01-16T21:12:00Z&se=2028-04-14T04:27:00Z&spr=https&sv=2024-11-04&sr=b&sig=fDQhUjngrEfV4mfCzwx7itsVhoyQYVkuNEwi86NSFf8%3D";

const AGE_COLORS = {
  '18-24': '#38bdf8',
  '25-34': '#0ff',
  '35-44': '#00cc99',
  '45-54': '#ffd93d',
  '55-64': '#fb923c',
  '65+': '#ff6b6b'
};

const GENDER_COLORS = {
  male: '#38bdf8',
  female: '#f472b6',
  unknown: '#888'
};

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
    if (hostname.includes('oncologymatrix')) return 'Oncology Matrix';
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

const isBaseUrl = (url) => {
  if (!url) return true;
  try {
    let fullUrl = url;
    if (!url.startsWith('http')) {
      fullUrl = 'https://' + url;
    }
    const urlObj = new URL(fullUrl);
    const path = urlObj.pathname.replace(/\/+$/, '');
    return !path || path === '' || path === '/';
  } catch (e) {
    return false;
  }
};

const DemographicsInsights = ({ searchTerm = '', viewMode = 'overview' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [ageData, setAgeData] = useState([]);
  const [genderData, setGenderData] = useState([]);
  const [journalDemoData, setJournalDemoData] = useState([]);
  const [selectedAge, setSelectedAge] = useState(null);
  const [selectedGender, setSelectedGender] = useState(null);
  const [journalsVisibleByAge, setJournalsVisibleByAge] = useState({});
  const [journalsVisibleByGender, setJournalsVisibleByGender] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (viewMode !== 'age') {
      setSelectedAge(null);
    }
    if (viewMode !== 'gender') {
      setSelectedGender(null);
    }
  }, [viewMode]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(GA_BLOB_URL);
      const data = await response.json();

      if (data.urls && Array.isArray(data.urls)) {
        const ageTotals = {};
        const genderTotals = {};
        const journalData = [];

        data.urls.forEach(item => {
          const title = item.title && item.title !== 'Unknown' ? item.title : extractTitleFromUrl(item.url);
          const property = getPropertyFromUrl(item.url);
          const demo = item.breakdowns?.demographics;
          if (!demo) return;

          const journalAge = {};
          const journalGender = {};

          if (demo.ageGroups) {
            Object.entries(demo.ageGroups).forEach(([age, users]) => {
              const normalizedAge = normalizeAgeGroup(age);
              ageTotals[normalizedAge] = (ageTotals[normalizedAge] || 0) + users;
              journalAge[normalizedAge] = (journalAge[normalizedAge] || 0) + users;
            });
          }

          if (demo.genders) {
            Object.entries(demo.genders).forEach(([gender, users]) => {
              const normalizedGender = gender.toLowerCase();
              genderTotals[normalizedGender] = (genderTotals[normalizedGender] || 0) + users;
              journalGender[normalizedGender] = (journalGender[normalizedGender] || 0) + users;
            });
          }

          const totalUsers = item.current?.total_users || 0;
          const ageTotal = Object.values(journalAge).reduce((a, b) => a + b, 0);
          const genderTotal = Object.values(journalGender).reduce((a, b) => a + b, 0);

          if (ageTotal > 0 || genderTotal > 0) {
            journalData.push({
              title,
              url: item.url,
              property,
              ageGroups: journalAge,
              genders: journalGender,
              totalUsers,
              dominantAge: Object.entries(journalAge).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown',
              dominantGender: Object.entries(journalGender).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown'
            });
          }
        });

        const ageOrder = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
        const sortedAge = ageOrder
          .filter(age => ageTotals[age])
          .map(age => ({ name: age, users: ageTotals[age] }));

        const sortedGender = Object.entries(genderTotals)
          .map(([name, users]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), users }))
          .sort((a, b) => b.users - a.users);

        setAgeData(sortedAge);
        setGenderData(sortedGender);
        setJournalDemoData(_.orderBy(journalData, ['totalUsers'], ['desc']));
      }
    } catch (error) {
    }
    setIsLoading(false);
  };

  const normalizeAgeGroup = (age) => {
    if (age.includes('18') && age.includes('24')) return '18-24';
    if (age.includes('25') && age.includes('34')) return '25-34';
    if (age.includes('35') && age.includes('44')) return '35-44';
    if (age.includes('45') && age.includes('54')) return '45-54';
    if (age.includes('55') && age.includes('64')) return '55-64';
    if (age.includes('65')) return '65+';
    return age;
  };

  const formatNumber = (num) => {
    if (isNaN(num)) return "0";
    return num.toLocaleString();
  };

  const totalAgeUsers = _.sumBy(ageData, 'users');
  const totalGenderUsers = _.sumBy(genderData, 'users');

  const filteredJournals = journalDemoData.filter(j =>
    matchesSearchTerm(j.title, searchTerm) && !isBaseUrl(j.url)
  );

  const globalAgePercentages = {};
  ageData.forEach(a => {
    globalAgePercentages[a.name] = (a.users / totalAgeUsers) * 100;
  });

  const globalGenderPercentages = {};
  genderData.forEach(g => {
    globalGenderPercentages[g.name.toLowerCase()] = (g.users / totalGenderUsers) * 100;
  });

  const affinityBlacklist = ['author guidelines', 'about jcad'];

  const getAgeSkewedJournals = (ageGroup) => {
    return filteredJournals
      .filter(j => j.ageGroups[ageGroup] && !affinityBlacklist.includes(j.title.toLowerCase()))
      .map(j => {
        const ageTotal = Object.values(j.ageGroups).reduce((a, b) => a + b, 0);
        const journalPct = ageTotal > 0 ? (j.ageGroups[ageGroup] / ageTotal) * 100 : 0;
        const globalPct = globalAgePercentages[ageGroup] || 0;
        const overIndex = journalPct - globalPct;
        return {
          title: j.title,
          property: j.property,
          users: j.ageGroups[ageGroup],
          percentage: journalPct.toFixed(1),
          overIndex: overIndex.toFixed(1)
        };
      })
      .sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage))
      .slice(0, 5);
  };

  const getGenderSkewedJournals = (genderKey) => {
    return filteredJournals
      .filter(j => j.genders[genderKey] && !affinityBlacklist.includes(j.title.toLowerCase()))
      .map(j => {
        const genderTotal = Object.values(j.genders).reduce((a, b) => a + b, 0);
        const journalPct = genderTotal > 0 ? (j.genders[genderKey] / genderTotal) * 100 : 0;
        const globalPct = globalGenderPercentages[genderKey] || 0;
        const overIndex = journalPct - globalPct;
        return {
          title: j.title,
          property: j.property,
          users: j.genders[genderKey],
          percentage: journalPct.toFixed(1),
          overIndex: overIndex.toFixed(1)
        };
      })
      .filter(j => parseFloat(j.overIndex) > 0)
      .sort((a, b) => parseFloat(b.overIndex) - parseFloat(a.overIndex))
      .slice(0, 5);
  };

  const maleSkewedJournals = getGenderSkewedJournals('male');
  const femaleSkewedJournals = getGenderSkewedJournals('female');

  const ageBarData = ageData.map(a => ({
    name: a.name,
    users: a.users,
    fill: AGE_COLORS[a.name] || '#888'
  }));

  const genderPieData = genderData.map(g => ({
    name: g.name,
    value: g.users,
    color: GENDER_COLORS[g.name.toLowerCase()] || '#888'
  }));

  const CustomAgeTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="ja-custom-tooltip">
          <p className="ja-tooltip-title">Age: {data.name}</p>
          <div className="ja-tooltip-row">
            <span>Users:</span>
            <span>{formatNumber(data.users)}</span>
          </div>
          <div className="ja-tooltip-row">
            <span>Percentage:</span>
            <span>{((data.users / totalAgeUsers) * 100).toFixed(1)}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomGenderTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="ja-custom-tooltip">
          <p className="ja-tooltip-title">{data.name}</p>
          <div className="ja-tooltip-row">
            <span>Users:</span>
            <span>{formatNumber(data.value)}</span>
          </div>
          <div className="ja-tooltip-row">
            <span>Percentage:</span>
            <span>{((data.value / totalGenderUsers) * 100).toFixed(1)}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="publication-comparison-wrapper">
      {isLoading ? (
        <div className="ja-chart-container">
          <div className="loading-container">
            <div className="spinner">
              <div></div><div></div><div></div><div></div><div></div><div></div>
            </div>
            <p>Loading demographics data...</p>
          </div>
        </div>
      ) : (
        <>
          {viewMode === 'overview' && (
            <div className="ja-chart-container">
              <div className="ja-chart-row">
                <div className="ja-chart-half">
                  <h3>Age Distribution</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={ageBarData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis dataKey="name" stroke="#888" tick={{ fill: '#ccc' }} />
                      <YAxis stroke="#888" tick={{ fill: '#888' }} />
                      <Tooltip content={<CustomAgeTooltip />} />
                      <Bar dataKey="users" radius={[4, 4, 0, 0]}>
                        {ageBarData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="ja-chart-half">
                  <h3>Gender Distribution</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={genderPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {genderPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomGenderTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'age' && (
            <>
              <div className="ja-analytics-section">
                <div className="ja-analytics-header">
                  <h4>Age Affinity Analysis</h4>
                  <p className="ja-analytics-subtitle">Journals where specific age groups over-index compared to the overall average</p>
                </div>
                <div className="ja-analytics-grid">
                  {ageData.map(age => {
                    const skewedJournals = getAgeSkewedJournals(age.name);
                    if (skewedJournals.length === 0) return null;
                    return (
                      <div key={age.name} className="ja-analytics-card">
                        <div className="ja-analytics-card-header">
                          <span className="ja-age-badge" style={{ background: AGE_COLORS[age.name] }}>{age.name}</span>
                          <span className="ja-analytics-card-subtitle">Top Affinity Journals</span>
                        </div>
                        <div className="ja-analytics-card-content">
                          {skewedJournals.map((j, idx) => (
                            <div key={idx} className="ja-affinity-item">
                              <div className="ja-affinity-title">
                                <span className="ja-affinity-rank">{idx + 1}</span>
                                <span className="ja-affinity-name">{j.title}</span>
                                <span className="property-tag">{j.property}</span>
                              </div>
                              <div className="ja-affinity-stats">
                                <span className="ja-affinity-pct">{j.percentage}%</span>
                                <span className="ja-affinity-index" style={{ color: parseFloat(j.overIndex) >= 0 ? '#00cc99' : '#ff6b6b' }}>
                                  {parseFloat(j.overIndex) >= 0 ? '+' : ''}{j.overIndex}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="ja-matrix-section">
                <div className="ja-matrix-header">
                  <h4>Users by Age Group</h4>
                </div>
                <div className="matrix-table-wrapper">
                  <table className="ja-matrix-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>#</th>
                        <th className="publication-header">Age Group</th>
                        <th>Users</th>
                        <th>% of Total</th>
                        <th style={{ width: '50px' }}></th>
                      </tr>
                    </thead>
                  <tbody>
                    {ageData.map((age, idx) => {
                      const isExpanded = selectedAge === age.name;
                      const allJournalsForAge = filteredJournals
                        .filter(j => j.ageGroups[age.name])
                        .map(j => {
                          const ageTotal = Object.values(j.ageGroups).reduce((a, b) => a + b, 0);
                          return {
                            title: j.title,
                            property: j.property,
                            users: j.ageGroups[age.name],
                            percentage: ageTotal > 0 ? ((j.ageGroups[age.name] / ageTotal) * 100).toFixed(1) : '0'
                          };
                        })
                        .sort((a, b) => b.users - a.users);

                      const journalsVisible = journalsVisibleByAge[age.name] || 20;
                      const journalsForAge = allJournalsForAge.slice(0, journalsVisible);
                      const hasMoreJournals = allJournalsForAge.length > journalsVisible;

                      return (
                        <React.Fragment key={age.name}>
                          <tr
                            className={`expandable-row ${isExpanded ? 'expanded' : ''}`}
                            onClick={() => setSelectedAge(isExpanded ? null : age.name)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td className="matrix-value-cell">
                              <span className="matrix-value row-number">{idx + 1}</span>
                            </td>
                            <td className="publication-cell demo-age-cell">
                              <span style={{ color: AGE_COLORS[age.name] }}>{age.name}</span>
                            </td>
                            <td className="matrix-value-cell">
                              <span className="matrix-value">{formatNumber(age.users)}</span>
                            </td>
                            <td className="matrix-value-cell">
                              <span className="matrix-value">{((age.users / totalAgeUsers) * 100).toFixed(1)}%</span>
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
                                        <th>Users ({age.name})</th>
                                        <th>% of Journal Demographics</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {journalsForAge.map((j, jIdx) => (
                                        <tr key={jIdx}>
                                          <td className="matrix-value-cell">
                                            <span className="matrix-value row-number">{jIdx + 1}</span>
                                          </td>
                                          <td className="publication-cell">
                                            {j.title}
                                            <span className="property-tag">{j.property}</span>
                                          </td>
                                          <td className="matrix-value-cell">
                                            <span className="matrix-value">{formatNumber(j.users)}</span>
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
                                          setJournalsVisibleByAge(prev => ({
                                            ...prev,
                                            [age.name]: (prev[age.name] || 20) + 20
                                          }));
                                        }}
                                      >
                                        Load More ({allJournalsForAge.length - journalsVisible} remaining)
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
            </div>
            </>
          )}

          {viewMode === 'gender' && (
            <>
              <div className="ja-analytics-section">
                <div className="ja-analytics-header">
                  <h4>Gender Affinity Analysis</h4>
                  <p className="ja-analytics-subtitle">Journals where specific genders over-index compared to the overall average</p>
                </div>
                <div className="ja-analytics-grid gender-grid">
                  {maleSkewedJournals.length > 0 && (
                    <div className="ja-analytics-card">
                      <div className="ja-analytics-card-header">
                        <span className="ja-gender-badge" style={{ background: GENDER_COLORS.male }}>Male</span>
                        <span className="ja-analytics-card-subtitle">Higher Male Readership</span>
                      </div>
                      <div className="ja-analytics-card-content">
                        {maleSkewedJournals.map((j, idx) => (
                          <div key={idx} className="ja-affinity-item">
                            <div className="ja-affinity-title">
                              <span className="ja-affinity-rank">{idx + 1}</span>
                              <span className="ja-affinity-name">{j.title}</span>
                              <span className="property-tag">{j.property}</span>
                            </div>
                            <div className="ja-affinity-stats">
                              <span className="ja-affinity-pct">{j.percentage}% male</span>
                              <span className="ja-affinity-index" style={{ color: '#00cc99' }}>+{j.overIndex}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {femaleSkewedJournals.length > 0 && (
                    <div className="ja-analytics-card">
                      <div className="ja-analytics-card-header">
                        <span className="ja-gender-badge" style={{ background: GENDER_COLORS.female }}>Female</span>
                        <span className="ja-analytics-card-subtitle">Higher Female Readership</span>
                      </div>
                      <div className="ja-analytics-card-content">
                        {femaleSkewedJournals.map((j, idx) => (
                          <div key={idx} className="ja-affinity-item">
                            <div className="ja-affinity-title">
                              <span className="ja-affinity-rank">{idx + 1}</span>
                              <span className="ja-affinity-name">{j.title}</span>
                              <span className="property-tag">{j.property}</span>
                            </div>
                            <div className="ja-affinity-stats">
                              <span className="ja-affinity-pct">{j.percentage}% female</span>
                              <span className="ja-affinity-index" style={{ color: '#00cc99' }}>+{j.overIndex}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="ja-matrix-section">
                <div className="ja-matrix-header">
                  <h4>Users by Gender</h4>
                </div>
                <div className="matrix-table-wrapper">
                  <table className="ja-matrix-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>#</th>
                        <th className="publication-header">Gender</th>
                        <th>Users</th>
                        <th>% of Total</th>
                        <th style={{ width: '50px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {genderData.map((gender, idx) => {
                        const isExpanded = selectedGender === gender.name;
                        const genderKey = gender.name.toLowerCase();
                        const allJournalsForGender = filteredJournals
                          .filter(j => j.genders[genderKey])
                          .map(j => {
                            const genderTotal = Object.values(j.genders).reduce((a, b) => a + b, 0);
                            return {
                              title: j.title,
                              property: j.property,
                              users: j.genders[genderKey],
                              percentage: genderTotal > 0 ? ((j.genders[genderKey] / genderTotal) * 100).toFixed(1) : '0'
                            };
                          })
                          .sort((a, b) => b.users - a.users);

                        const journalsVisible = journalsVisibleByGender[gender.name] || 20;
                        const journalsForGender = allJournalsForGender.slice(0, journalsVisible);
                        const hasMoreJournals = allJournalsForGender.length > journalsVisible;

                        return (
                          <React.Fragment key={gender.name}>
                            <tr
                              className={`expandable-row ${isExpanded ? 'expanded' : ''}`}
                              onClick={() => setSelectedGender(isExpanded ? null : gender.name)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td className="matrix-value-cell">
                                <span className="matrix-value row-number">{idx + 1}</span>
                              </td>
                              <td className="publication-cell demo-gender-cell">
                                <span style={{ color: GENDER_COLORS[genderKey] }}>{gender.name}</span>
                              </td>
                              <td className="matrix-value-cell">
                                <span className="matrix-value">{formatNumber(gender.users)}</span>
                              </td>
                              <td className="matrix-value-cell">
                                <span className="matrix-value">{((gender.users / totalGenderUsers) * 100).toFixed(1)}%</span>
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
                                          <th>{gender.name} Users</th>
                                          <th>% of Journal Demographics</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {journalsForGender.map((j, jIdx) => (
                                          <tr key={jIdx}>
                                            <td className="matrix-value-cell">
                                              <span className="matrix-value row-number">{jIdx + 1}</span>
                                            </td>
                                            <td className="publication-cell">
                                              {j.title}
                                              <span className="property-tag">{j.property}</span>
                                            </td>
                                            <td className="matrix-value-cell">
                                              <span className="matrix-value">{formatNumber(j.users)}</span>
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
                                            setJournalsVisibleByGender(prev => ({
                                              ...prev,
                                              [gender.name]: (prev[gender.name] || 20) + 20
                                            }));
                                          }}
                                        >
                                          Load More ({allJournalsForGender.length - journalsVisible} remaining)
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
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default DemographicsInsights;