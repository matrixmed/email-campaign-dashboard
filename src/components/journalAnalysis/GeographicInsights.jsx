import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { City, State } from 'country-state-city';
import _ from 'lodash';
import { matchesSearchTerm } from '../../utils/searchUtils';

const buildCityToStateMap = () => {
  const map = {};
  const usCities = City.getCitiesOfCountry('US') || [];
  const usStates = State.getStatesOfCountry('US') || [];

  const stateCodeToName = {};
  usStates.forEach(state => {
    stateCodeToName[state.isoCode] = state.name;
  });

  usCities.forEach(city => {
    const stateName = stateCodeToName[city.stateCode];
    if (stateName) {
      map[city.name] = stateName;
      map[city.name.toLowerCase()] = stateName;
    }
  });

  return map;
};

const cityToStateMap = buildCityToStateMap();

const GA_BLOB_URL = "https://emaildash.blob.core.windows.net/json-data/google_analytics_metrics.json?sp=r&st=2026-01-16T21:12:00Z&se=2028-04-14T04:27:00Z&spr=https&sv=2024-11-04&sr=b&sig=fDQhUjngrEfV4mfCzwx7itsVhoyQYVkuNEwi86NSFf8%3D";

const WORLD_GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const US_GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

const GEO_COLORS = [
  '#0ff', '#00cc99', '#38bdf8', '#ffd93d', '#ff6b6b',
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

const countryNameMap = {
  'United States': 'United States of America',
  'USA': 'United States of America',
  'UK': 'United Kingdom',
  'Russia': 'Russian Federation',
  'South Korea': 'Korea, Republic of',
  'Taiwan': 'Taiwan, Province of China',
  'Vietnam': 'Viet Nam',
  'Czech Republic': 'Czechia',
};

const getCityState = (cityName) => {
  if (!cityName) return null;
  return cityToStateMap[cityName] || cityToStateMap[cityName.toLowerCase()] || null;
};

const stateNameToId = {
  'Alabama': '01', 'Alaska': '02', 'Arizona': '04', 'Arkansas': '05', 'California': '06',
  'Colorado': '08', 'Connecticut': '09', 'Delaware': '10', 'Florida': '12', 'Georgia': '13',
  'Hawaii': '15', 'Idaho': '16', 'Illinois': '17', 'Indiana': '18', 'Iowa': '19',
  'Kansas': '20', 'Kentucky': '21', 'Louisiana': '22', 'Maine': '23', 'Maryland': '24',
  'Massachusetts': '25', 'Michigan': '26', 'Minnesota': '27', 'Mississippi': '28', 'Missouri': '29',
  'Montana': '30', 'Nebraska': '31', 'Nevada': '32', 'New Hampshire': '33', 'New Jersey': '34',
  'New Mexico': '35', 'New York': '36', 'North Carolina': '37', 'North Dakota': '38', 'Ohio': '39',
  'Oklahoma': '40', 'Oregon': '41', 'Pennsylvania': '42', 'Rhode Island': '44', 'South Carolina': '45',
  'South Dakota': '46', 'Tennessee': '47', 'Texas': '48', 'Utah': '49', 'Vermont': '50',
  'Virginia': '51', 'Washington': '53', 'West Virginia': '54', 'Wisconsin': '55', 'Wyoming': '56',
  'District of Columbia': '11', 'Puerto Rico': '72'
};

const GeographicInsights = ({ searchTerm = '', viewMode = 'overview' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [countryData, setCountryData] = useState([]);
  const [cityData, setCityData] = useState([]);
  const [stateData, setStateData] = useState([]);
  const [journalGeoData, setJournalGeoData] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [countriesVisible, setCountriesVisible] = useState(100);
  const [citiesVisible, setCitiesVisible] = useState(100);
  const [journalsVisibleByCountry, setJournalsVisibleByCountry] = useState({});
  const [journalsVisibleByCity, setJournalsVisibleByCity] = useState({});
  const [mapView, setMapView] = useState('world');
  const [tooltipContent, setTooltipContent] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (viewMode !== 'country') {
      setSelectedCountry(null);
    }
    if (viewMode !== 'city') {
      setSelectedCity(null);
    }
  }, [viewMode]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(GA_BLOB_URL);
      const data = await response.json();

      if (data.urls && Array.isArray(data.urls)) {
        const countryTotals = {};
        const cityTotals = {};
        const stateTotals = {};
        const journalData = [];

        data.urls.forEach(item => {
          const title = item.title && item.title !== 'Unknown' ? item.title : extractTitleFromUrl(item.url);
          const property = getPropertyFromUrl(item.url);
          const geo = item.breakdowns?.geography;
          if (!geo) return;

          const journalCountries = {};
          const journalCities = {};

          if (geo.countries) {
            Object.entries(geo.countries).forEach(([country, value]) => {
              const users = typeof value === 'object' ? value.users : value;
              countryTotals[country] = (countryTotals[country] || 0) + users;
              journalCountries[country] = (journalCountries[country] || 0) + users;
            });
          }

          if (geo.cities) {
            Object.entries(geo.cities).forEach(([city, users]) => {
              if (city && city !== '(not set)') {
                cityTotals[city] = (cityTotals[city] || 0) + users;
                journalCities[city] = (journalCities[city] || 0) + users;

                const state = getCityState(city);
                if (state) {
                  stateTotals[state] = (stateTotals[state] || 0) + users;
                }
              }
            });
          }

          const totalUsers = item.current?.total_users || 0;
          if (totalUsers > 0) {
            journalData.push({
              title,
              url: item.url,
              property,
              countries: journalCountries,
              cities: journalCities,
              totalUsers,
              topCountry: Object.entries(journalCountries).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown',
              topCity: Object.entries(journalCities).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown'
            });
          }
        });

        const sortedCountries = Object.entries(countryTotals)
          .map(([name, users]) => ({ name, users }))
          .sort((a, b) => b.users - a.users);

        const sortedCities = Object.entries(cityTotals)
          .map(([name, users]) => ({ name, users }))
          .sort((a, b) => b.users - a.users);

        const sortedStates = Object.entries(stateTotals)
          .map(([name, users]) => ({ name, users }))
          .sort((a, b) => b.users - a.users);

        setCountryData(sortedCountries);
        setCityData(sortedCities);
        setStateData(sortedStates);
        setJournalGeoData(_.orderBy(journalData, ['totalUsers'], ['desc']));
      }
    } catch (error) {
    }
    setIsLoading(false);
  };

  const formatNumber = (num) => {
    if (isNaN(num)) return "0";
    return num.toLocaleString();
  };

  const totalUsers = _.sumBy(countryData, 'users');
  const topCountries = countryData.slice(0, 8);
  const topCities = cityData.slice(0, 10);

  const filteredJournals = journalGeoData.filter(j =>
    matchesSearchTerm(j.title, searchTerm)
  );

  const pieData = topCountries.map((c, idx) => ({
    name: c.name,
    value: c.users,
    color: GEO_COLORS[idx % GEO_COLORS.length]
  }));

  const cityBarData = topCities.map((c, idx) => ({
    name: c.name.length > 15 ? c.name.substring(0, 15) + '...' : c.name,
    fullName: c.name,
    users: c.users,
    fill: GEO_COLORS[idx % GEO_COLORS.length]
  }));

  const totalUsUsers = _.sumBy(stateData, 'users');

  const countryDataMap = useMemo(() => {
    const map = {};
    countryData.forEach(c => {
      const mappedName = countryNameMap[c.name] || c.name;
      map[mappedName] = c.users;
      map[c.name] = c.users;
    });
    return map;
  }, [countryData]);

  const getCountryColor = (countryName) => {
    const users = countryDataMap[countryName] || 0;
    if (users === 0) return '#2a2a2d';

    const maxUsers = countryData[0]?.users || 1;
    const logMax = Math.log(maxUsers + 1);
    const logVal = Math.log(users + 1);
    const normalized = logVal / logMax;

    const r = Math.round(0 + normalized * 0);
    const g = Math.round(50 + normalized * 205);
    const b = Math.round(80 + normalized * 175);

    return `rgb(${r}, ${g}, ${b})`;
  };

  const stateDataMap = useMemo(() => {
    const map = {};
    stateData.forEach(s => {
      map[s.name] = s.users;
    });
    return map;
  }, [stateData]);

  const getStateColor = (stateName) => {
    const users = stateDataMap[stateName] || 0;
    if (users === 0) return '#2a2a2d';

    const maxUsers = stateData[0]?.users || 1;
    const logMax = Math.log(maxUsers + 1);
    const logVal = Math.log(users + 1);
    const normalized = logVal / logMax;

    const r = Math.round(0 + normalized * 0);
    const g = Math.round(50 + normalized * 205);
    const b = Math.round(80 + normalized * 175);

    return `rgb(${r}, ${g}, ${b})`;
  };

  const getStateName = (geo) => {
    const stateId = geo.id;
    for (const [name, id] of Object.entries(stateNameToId)) {
      if (id === stateId || id === String(stateId).padStart(2, '0')) {
        return name;
      }
    }
    return geo.properties?.name || null;
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="ja-custom-tooltip">
          <p className="ja-tooltip-title">{data.fullName || data.name}</p>
          <div className="ja-tooltip-row">
            <span>Users:</span>
            <span>{formatNumber(data.users || data.value)}</span>
          </div>
          <div className="ja-tooltip-row">
            <span>Percentage:</span>
            <span>{(((data.users || data.value) / totalUsers) * 100).toFixed(1)}%</span>
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
            <p>Loading geographic data...</p>
          </div>
        </div>
      ) : (
        <>
          {viewMode === 'overview' && (
            <>
              <div className="ja-chart-container">
                <div className="ja-chart-row">
                  <div className="ja-chart-half">
                    <h3>Top Countries</h3>
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
                          label={({ name, percent }) => percent > 0.05 ? name : ''}
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
                    <h3>Top Cities</h3>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={cityBarData} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                        <XAxis type="number" stroke="#888" />
                        <YAxis dataKey="name" type="category" stroke="#888" width={100} tick={{ fontSize: 12, fill: '#ccc' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="users" radius={[0, 4, 4, 0]}>
                          {cityBarData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="ja-chart-container" style={{ marginTop: '24px' }}>
                <div className="ja-map-header">
                  <h3>{mapView === 'world' ? 'Global Distribution' : 'United States Distribution'}</h3>
                  <div className="ja-toggle-group">
                    <button
                      className={`ja-toggle-btn ${mapView === 'world' ? 'active' : ''}`}
                      onClick={() => setMapView('world')}
                    >
                      World
                    </button>
                    <button
                      className={`ja-toggle-btn ${mapView === 'us' ? 'active' : ''}`}
                      onClick={() => setMapView('us')}
                    >
                      United States
                    </button>
                  </div>
                </div>

                <div
                  className="ja-map-container"
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltipPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                  }}
                  onMouseLeave={() => setTooltipContent(null)}
                >
                  {tooltipContent && (
                    <div
                      className="ja-map-tooltip"
                      style={{
                        left: tooltipPosition.x + 10,
                        top: tooltipPosition.y - 10
                      }}
                    >
                      <div className="ja-map-tooltip-name">{tooltipContent.name}</div>
                      <div className="ja-map-tooltip-value">
                        {formatNumber(tooltipContent.users)} users
                      </div>
                      <div className="ja-map-tooltip-pct">
                        {mapView === 'world'
                          ? `${((tooltipContent.users / totalUsers) * 100).toFixed(1)}% of global traffic`
                          : `${totalUsUsers > 0 ? ((tooltipContent.users / totalUsUsers) * 100).toFixed(1) : 0}% of US traffic`
                        }
                      </div>
                    </div>
                  )}
                  {mapView === 'world' ? (
                    <ComposableMap
                      projection="geoMercator"
                      projectionConfig={{
                        scale: 150,
                        center: [0, 30]
                      }}
                      style={{ width: '100%', height: '100%' }}
                    >
                      <ZoomableGroup>
                        <Geographies geography={WORLD_GEO_URL}>
                          {({ geographies }) =>
                            geographies.map((geo) => {
                              const countryName = geo.properties.name;
                              const users = countryDataMap[countryName] || 0;
                              return (
                                <Geography
                                  key={geo.rsmKey}
                                  geography={geo}
                                  fill={getCountryColor(countryName)}
                                  stroke="#1a1a1a"
                                  strokeWidth={0.5}
                                  style={{
                                    default: { outline: 'none' },
                                    hover: { outline: 'none', fill: '#0ff', cursor: 'pointer' },
                                    pressed: { outline: 'none' }
                                  }}
                                  onMouseEnter={() => {
                                    setTooltipContent({ name: countryName, users });
                                  }}
                                  onMouseLeave={() => {
                                    setTooltipContent(null);
                                  }}
                                />
                              );
                            })
                          }
                        </Geographies>
                      </ZoomableGroup>
                    </ComposableMap>
                  ) : (
                    <ComposableMap
                      projection="geoAlbersUsa"
                      projectionConfig={{
                        scale: 1100
                      }}
                      style={{ width: '100%', height: '100%' }}
                    >
                      <Geographies geography={US_GEO_URL}>
                        {({ geographies }) =>
                          geographies.map((geo) => {
                            const stateName = getStateName(geo);
                            const users = stateDataMap[stateName] || 0;
                            return (
                              <Geography
                                key={geo.rsmKey}
                                geography={geo}
                                fill={getStateColor(stateName)}
                                stroke="#1a1a1a"
                                strokeWidth={0.5}
                                style={{
                                  default: { outline: 'none' },
                                  hover: { outline: 'none', fill: '#0ff', cursor: 'pointer' },
                                  pressed: { outline: 'none' }
                                }}
                                onMouseEnter={() => {
                                  setTooltipContent({ name: stateName, users });
                                }}
                                onMouseLeave={() => {
                                  setTooltipContent(null);
                                }}
                              />
                            );
                          })
                        }
                      </Geographies>
                    </ComposableMap>
                  )}
                </div>

                <div className="ja-map-legend">
                  <span className="ja-map-legend-label">Less Traffic</span>
                  <div className="ja-map-legend-gradient"></div>
                  <span className="ja-map-legend-label">More Traffic</span>
                </div>
              </div>
            </>
          )}

          {viewMode === 'country' && (
            <div className="ja-matrix-section">
              <div className="ja-matrix-header">
                <h4>Users by Country</h4>
              </div>
              <div className="matrix-table-wrapper">
                <table className="ja-matrix-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>#</th>
                      <th className="publication-header">Country</th>
                      <th>Users</th>
                      <th>% of Total</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {countryData.slice(0, countriesVisible).map((country, idx) => {
                      const isExpanded = selectedCountry === country.name;
                      const allJournalsForCountry = filteredJournals
                        .filter(j => j.countries[country.name])
                        .map(j => ({
                          title: j.title,
                          property: j.property,
                          users: j.countries[country.name],
                          percentage: ((j.countries[country.name] / j.totalUsers) * 100).toFixed(1)
                        }))
                        .sort((a, b) => b.users - a.users);

                      const journalsVisible = journalsVisibleByCountry[country.name] || 20;
                      const journalsForCountry = allJournalsForCountry.slice(0, journalsVisible);
                      const hasMoreJournals = allJournalsForCountry.length > journalsVisible;

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
                            <td className="publication-cell geo-country-cell">
                              {country.name}
                            </td>
                            <td className="matrix-value-cell">
                              <span className="matrix-value">{formatNumber(country.users)}</span>
                            </td>
                            <td className="matrix-value-cell">
                              <span className="matrix-value">{((country.users / totalUsers) * 100).toFixed(1)}%</span>
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
                                        <th className="publication-header">Journal</th>
                                        <th>Users from {country.name}</th>
                                        <th>% of Journal Traffic</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {journalsForCountry.map((j, jIdx) => (
                                        <tr key={jIdx}>
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
                                          setJournalsVisibleByCountry(prev => ({
                                            ...prev,
                                            [country.name]: (prev[country.name] || 20) + 20
                                          }));
                                        }}
                                      >
                                        Load More ({allJournalsForCountry.length - journalsVisible} remaining)
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
              {countriesVisible < countryData.length && (
                <div className="load-more-container">
                  <button
                    className="load-more-btn"
                    onClick={() => setCountriesVisible(prev => prev + 50)}
                  >
                    Load More ({countryData.length - countriesVisible} remaining)
                  </button>
                </div>
              )}
            </div>
          )}

          {viewMode === 'city' && (
            <div className="ja-matrix-section">
              <div className="ja-matrix-header">
                <h4>Users by City</h4>
              </div>
              <div className="matrix-table-wrapper">
                <table className="ja-matrix-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>#</th>
                      <th className="publication-header">City</th>
                      <th>Users</th>
                      <th>% of Total</th>
                      <th style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cityData.slice(0, citiesVisible).map((city, idx) => {
                      const isExpanded = selectedCity === city.name;
                      const allJournalsForCity = filteredJournals
                        .filter(j => j.cities[city.name])
                        .map(j => ({
                          title: j.title,
                          property: j.property,
                          users: j.cities[city.name],
                          percentage: ((j.cities[city.name] / j.totalUsers) * 100).toFixed(1)
                        }))
                        .sort((a, b) => b.users - a.users);

                      const journalsVisible = journalsVisibleByCity[city.name] || 20;
                      const journalsForCity = allJournalsForCity.slice(0, journalsVisible);
                      const hasMoreJournals = allJournalsForCity.length > journalsVisible;

                      return (
                        <React.Fragment key={city.name}>
                          <tr
                            className={`expandable-row ${isExpanded ? 'expanded' : ''}`}
                            onClick={() => setSelectedCity(isExpanded ? null : city.name)}
                            style={{ cursor: 'pointer' }}
                          >
                            <td className="matrix-value-cell">
                              <span className="matrix-value row-number">{idx + 1}</span>
                            </td>
                            <td className="publication-cell geo-country-cell">
                              {city.name}
                            </td>
                            <td className="matrix-value-cell">
                              <span className="matrix-value">{formatNumber(city.users)}</span>
                            </td>
                            <td className="matrix-value-cell">
                              <span className="matrix-value">{((city.users / totalUsers) * 100).toFixed(1)}%</span>
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
                                        <th className="publication-header">Journal</th>
                                        <th>Users from {city.name}</th>
                                        <th>% of Journal Traffic</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {journalsForCity.map((j, jIdx) => (
                                        <tr key={jIdx}>
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
                                          setJournalsVisibleByCity(prev => ({
                                            ...prev,
                                            [city.name]: (prev[city.name] || 20) + 20
                                          }));
                                        }}
                                      >
                                        Load More ({allJournalsForCity.length - journalsVisible} remaining)
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
              {citiesVisible < cityData.length && (
                <div className="load-more-container">
                  <button
                    className="load-more-btn"
                    onClick={() => setCitiesVisible(prev => prev + 50)}
                  >
                    Load More ({cityData.length - citiesVisible} remaining)
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

export default GeographicInsights;