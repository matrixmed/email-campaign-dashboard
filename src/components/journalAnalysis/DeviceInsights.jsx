import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import _ from 'lodash';
import { matchesSearchTerm } from '../../utils/searchUtils';

const GA_BLOB_URL = "https://emaildash.blob.core.windows.net/json-data/google_analytics_metrics.json?sp=r&st=2026-01-16T21:12:00Z&se=2028-04-14T04:27:00Z&spr=https&sv=2024-11-04&sr=b&sig=fDQhUjngrEfV4mfCzwx7itsVhoyQYVkuNEwi86NSFf8%3D";

const DEVICE_COLORS = {
  desktop: '#0ff',
  mobile: '#ff6b6b',
  tablet: '#ffd93d'
};

const extractTitleFromUrl = (url) => {
  if (!url) return 'Unknown URL';
  try {
    const urlObj = new URL(url);
    let pathname = urlObj.pathname;
    pathname = pathname.replace(/\/+$/, '');
    pathname = pathname
      .replace(/\/Page\s*\d+.*$/i, '')
      .replace(/\/S\d+.*$/i, '')
      .replace(/\/contentsBrowser.*$/i, '')
      .replace(/\/issuelistBrowser.*$/i, '');
    const segments = pathname.split('/').filter(s => s && s !== 'index.html' && s !== 'view');
    if (segments.length > 0) {
      const title = segments[segments.length - 1]
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      return title || urlObj.hostname;
    }
    return urlObj.hostname;
  } catch {
    return url.substring(0, 50);
  }
};

const DeviceInsights = ({ searchTerm = '', viewMode = 'overview' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [deviceData, setDeviceData] = useState({});
  const [journalDeviceData, setJournalDeviceData] = useState([]);
  const [propertyDeviceData, setPropertyDeviceData] = useState([]);
  const [journalsVisible, setJournalsVisible] = useState(100);
  const [sortConfig, setSortConfig] = useState({ key: 'total', direction: 'desc' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(GA_BLOB_URL);
      const data = await response.json();

      if (data.urls && Array.isArray(data.urls)) {
        const totals = { desktop: 0, mobile: 0, tablet: 0 };
        const journalData = [];
        const propertyMap = {};

        data.urls.forEach(item => {
          if (!item.current?.devices) return;

          let title = item.title;
          if (!title || title.trim() === '' || title.toLowerCase() === 'no title' || title.toLowerCase() === 'title not found') {
            title = extractTitleFromUrl(item.url);
          }

          const property = item.property_name || 'Unknown Property';

          let desktop = 0, mobile = 0, tablet = 0;
          Object.entries(item.current.devices).forEach(([device, count]) => {
            const d = device.toLowerCase();
            if (d === 'desktop') {
              desktop = count;
              totals.desktop += count;
            } else if (d === 'mobile') {
              mobile = count;
              totals.mobile += count;
            } else if (d === 'tablet') {
              tablet = count;
              totals.tablet += count;
            }
          });

          const total = desktop + mobile + tablet;
          if (total > 0) {
            journalData.push({
              title,
              url: item.url,
              property,
              desktop,
              mobile,
              tablet,
              total,
              desktopPct: (desktop / total * 100).toFixed(1),
              mobilePct: (mobile / total * 100).toFixed(1),
              tabletPct: (tablet / total * 100).toFixed(1),
              mobileRatio: desktop > 0 ? (mobile / desktop).toFixed(2) : 'N/A'
            });

            if (!propertyMap[property]) {
              propertyMap[property] = { desktop: 0, mobile: 0, tablet: 0 };
            }
            propertyMap[property].desktop += desktop;
            propertyMap[property].mobile += mobile;
            propertyMap[property].tablet += tablet;
          }
        });

        const propertyData = Object.entries(propertyMap).map(([name, devices]) => {
          const total = devices.desktop + devices.mobile + devices.tablet;
          return {
            name,
            desktop: devices.desktop,
            mobile: devices.mobile,
            tablet: devices.tablet,
            total
          };
        });

        setDeviceData(totals);
        setJournalDeviceData(_.orderBy(journalData, ['total'], ['desc']));
        setPropertyDeviceData(_.orderBy(propertyData, ['total'], ['desc']));
      }
    } catch (error) {
    }
    setIsLoading(false);
  };

  const formatNumber = (num) => {
    if (isNaN(num)) return "0";
    return num.toLocaleString();
  };

  const total = deviceData.desktop + deviceData.mobile + deviceData.tablet || 1;

  const pieData = [
    { name: 'Desktop', value: deviceData.desktop, color: DEVICE_COLORS.desktop },
    { name: 'Mobile', value: deviceData.mobile, color: DEVICE_COLORS.mobile },
    { name: 'Tablet', value: deviceData.tablet, color: DEVICE_COLORS.tablet }
  ].filter(d => d.value > 0);

  const filteredJournals = journalDeviceData.filter(j =>
    matchesSearchTerm(j.title, searchTerm)
  );


  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="ja-custom-tooltip">
          <p className="ja-tooltip-title">{data.name}</p>
          <div className="ja-tooltip-row">
            <span>Users:</span>
            <span>{formatNumber(data.value)}</span>
          </div>
          <div className="ja-tooltip-row">
            <span>Percentage:</span>
            <span>{((data.value / total) * 100).toFixed(1)}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const getMaxChars = (count) => {
    if (count <= 5) return 40;
    if (count <= 8) return 30;
    if (count <= 10) return 25;
    return 18;
  };

  const targetProperties = [
    'jcad website',
    'jcad digital edition',
    'oncology matrix',
    'icns website',
    'nhr website'
  ];

  const propertyChartData = targetProperties
    .map(targetName => {
      const found = propertyDeviceData.find(p => p.name.toLowerCase() === targetName.toLowerCase());
      const journalCount = filteredJournals.filter(j =>
        j.property && j.property.toLowerCase() === targetName.toLowerCase()
      ).length || 1;
      if (found) {
        return {
          name: found.name,
          fullName: found.name,
          Desktop: Math.round(found.desktop / journalCount),
          Mobile: Math.round(found.mobile / journalCount),
          Tablet: Math.round(found.tablet / journalCount),
          journalCount
        };
      }
      return null;
    })
    .filter(Boolean);

  const getPathFromUrl = (url) => {
    if (!url) return '';
    try {
      let fullUrl = url;
      if (!url.startsWith('http')) {
        fullUrl = 'https://' + url;
      }
      const urlObj = new URL(fullUrl);
      let path = urlObj.pathname.replace(/\/+$/, '');
      if (!path || path === '/') return '';
      path = path.startsWith('/') ? path.substring(1) : path;
      return decodeURIComponent(path).replace(/-/g, ' ').replace(/_/g, ' ');
    } catch {
      const parts = url.split('/');
      if (parts.length > 1) {
        const lastPart = parts[parts.length - 1] || parts[parts.length - 2];
        return lastPart.replace(/-/g, ' ').replace(/_/g, ' ');
      }
      return '';
    }
  };

  const getPropertyShortName = (property) => {
    if (!property) return '';
    const lower = property.toLowerCase();
    if (lower.includes('jcad website')) return 'JCAD';
    if (lower.includes('jcad digital')) return 'JCAD DE';
    if (lower.includes('oncology')) return 'Onc Matrix';
    if (lower.includes('icns')) return 'ICNS';
    if (lower.includes('nhr')) return 'NHR';
    return property.substring(0, 8);
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
    } catch {
      const cleanUrl = url.replace(/^https?:\/\//, '').replace(/\/+$/, '');
      return !cleanUrl.includes('/');
    }
  };

  const filteredJournalsFromProperties = filteredJournals.filter(j => {
    if (!j.property) return false;
    const propLower = j.property.toLowerCase();
    const isTargetProperty = targetProperties.some(tp => propLower === tp.toLowerCase());
    if (!isTargetProperty) return false;
    if (isBaseUrl(j.url)) return false;
    return true;
  });

  const journalBarChartData = filteredJournalsFromProperties.slice(0, 10).map(j => {
    let path = getPathFromUrl(j.url);
    if (!path) {
      path = j.title || 'Unknown';
    }
    const propShort = getPropertyShortName(j.property);
    const displayPath = path.length > 25 ? path.substring(0, 25) + '...' : path;
    return {
      name: displayPath,
      path: displayPath,
      fullName: `${j.property}: ${path}`,
      property: propShort,
      Desktop: j.desktop,
      Mobile: j.mobile,
      Tablet: j.tablet
    };
  });

  const calculateStats = (data, key) => {
    const values = data.map(j => parseFloat(j[key]));
    const mean = values.length > 0 ? _.mean(values) : 0;
    const stdDev = values.length > 0 ? Math.sqrt(_.mean(values.map(v => Math.pow(v - mean, 2)))) : 0;
    return { mean, stdDev };
  };

  const mobileStats = calculateStats(filteredJournals, 'mobilePct');
  const desktopStats = calculateStats(filteredJournals, 'desktopPct');

  const getValueClass = (value, stats) => {
    if (stats.stdDev === 0) return '';
    const zScore = (value - stats.mean) / stats.stdDev;
    if (zScore > 1) return 'matrix-high';
    if (zScore < -1) return 'matrix-low';
    return '';
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const getSortedJournals = () => {
    const sorted = [...filteredJournals].sort((a, b) => {
      let aVal, bVal;

      if (sortConfig.key === 'title') {
        aVal = a.title.toLowerCase();
        bVal = b.title.toLowerCase();
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (sortConfig.key === 'mobileRatio') {
        aVal = a.mobileRatio === 'N/A' ? -1 : parseFloat(a.mobileRatio);
        bVal = b.mobileRatio === 'N/A' ? -1 : parseFloat(b.mobileRatio);
      } else if (sortConfig.key === 'desktopPct' || sortConfig.key === 'mobilePct' || sortConfig.key === 'tabletPct') {
        aVal = parseFloat(a[sortConfig.key]);
        bVal = parseFloat(b[sortConfig.key]);
      } else {
        aVal = a[sortConfig.key];
        bVal = b[sortConfig.key];
      }

      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  };

  const sortedJournals = getSortedJournals();

  const SortHeader = ({ label, sortKey, className = '' }) => (
    <th
      onClick={() => handleSort(sortKey)}
      style={{ cursor: 'pointer', userSelect: 'none' }}
      className={`${className} ${sortConfig.key === sortKey ? 'sorted' : ''}`}
    >
      {label}
      <span className="sort-indicator">
        {sortConfig.key === sortKey ? (sortConfig.direction === 'desc' ? ' ▼' : ' ▲') : ''}
      </span>
    </th>
  );

  return (
    <div className="publication-comparison-wrapper">
      {isLoading ? (
        <div className="ja-chart-container">
          <div className="loading-container">
            <div className="spinner">
              <div></div><div></div><div></div><div></div><div></div><div></div>
            </div>
            <p>Loading device data...</p>
          </div>
        </div>
      ) : (
        <>
          {viewMode === 'overview' && (
            <>
              <div className="ja-chart-container">
                <div className="ja-chart-row">
                  <div className="ja-chart-half">
                    <h3>Device Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="ja-chart-half">
                    <h3>Avg Users per Journal by Property</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={propertyChartData} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                        <XAxis type="number" stroke="#888" />
                        <YAxis dataKey="name" type="category" stroke="#888" width={150} tick={{ fontSize: 11, fill: '#ccc' }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Desktop" stackId="a" fill={DEVICE_COLORS.desktop} />
                        <Bar dataKey="Mobile" stackId="a" fill={DEVICE_COLORS.mobile} />
                        <Bar dataKey="Tablet" stackId="a" fill={DEVICE_COLORS.tablet} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="ja-chart-container" style={{ marginTop: '24px' }}>
                <h3>Device Breakdown by Top Journals</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={journalBarChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                    <XAxis
                      dataKey="name"
                      stroke="#888"
                      tick={(props) => {
                        const { x, y, index } = props;
                        const item = journalBarChartData[index];
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text x={0} y={0} dy={16} textAnchor="middle" fill="#0ff" fontSize={13} fontWeight="600">
                              {item?.property || ''}
                            </text>
                            <text x={0} y={0} dy={34} textAnchor="middle" fill="#ccc" fontSize={12}>
                              {item?.path || ''}
                            </text>
                          </g>
                        );
                      }}
                      interval={0}
                      height={80}
                    />
                    <YAxis stroke="#888" tick={{ fontSize: 12, fill: '#888' }} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="ja-custom-tooltip">
                              <p className="ja-tooltip-title">{data.fullName}</p>
                              {payload.map((entry, idx) => (
                                <div key={idx} className="ja-tooltip-row">
                                  <span>{entry.name}:</span>
                                  <span>{formatNumber(entry.value)}</span>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Desktop" fill={DEVICE_COLORS.desktop} />
                    <Bar dataKey="Mobile" fill={DEVICE_COLORS.mobile} />
                    <Bar dataKey="Tablet" fill={DEVICE_COLORS.tablet} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {viewMode === 'comparison' && (
            <div className="ja-matrix-section">
              <div className="ja-matrix-header">
                <h4>Device Breakdown by Journal</h4>
              </div>
              <div className="matrix-table-wrapper">
                <table className="ja-matrix-table">
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>#</th>
                      <SortHeader label="Journal" sortKey="title" className="publication-header" />
                      <SortHeader label="Total Users" sortKey="total" />
                      <SortHeader label="Desktop" sortKey="desktopPct" />
                      <SortHeader label="Mobile" sortKey="mobilePct" />
                      <SortHeader label="Tablet" sortKey="tabletPct" />
                      <SortHeader label="Mobile:Desktop" sortKey="mobileRatio" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedJournals.slice(0, journalsVisible).map((j, idx) => (
                      <tr key={idx}>
                        <td className="matrix-value-cell">
                          <span className="matrix-value row-number">{idx + 1}</span>
                        </td>
                        <td className="publication-cell device-journal-cell">{j.title}</td>
                        <td className="matrix-value-cell">
                          <span className="matrix-value">{formatNumber(j.total)}</span>
                        </td>
                        <td className="matrix-value-cell">
                          <span className={`matrix-value ${getValueClass(parseFloat(j.desktopPct), desktopStats)}`}>
                            {formatNumber(j.desktop)} <span className="ja-pct">({j.desktopPct}%)</span>
                          </span>
                        </td>
                        <td className="matrix-value-cell">
                          <span className={`matrix-value ${getValueClass(parseFloat(j.mobilePct), mobileStats)}`}>
                            {formatNumber(j.mobile)} <span className="ja-pct">({j.mobilePct}%)</span>
                          </span>
                        </td>
                        <td className="matrix-value-cell">
                          <span className="matrix-value">
                            {formatNumber(j.tablet)} <span className="ja-pct">({j.tabletPct}%)</span>
                          </span>
                        </td>
                        <td className="matrix-value-cell">
                          <span className="matrix-value">{j.mobileRatio}:1</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {journalsVisible < sortedJournals.length && (
                <div className="load-more-container">
                  <button
                    className="load-more-btn"
                    onClick={() => setJournalsVisible(prev => prev + 50)}
                  >
                    Load More ({sortedJournals.length - journalsVisible} remaining)
                  </button>
                </div>
              )}
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

export default DeviceInsights;