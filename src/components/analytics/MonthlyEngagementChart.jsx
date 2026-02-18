import React, { useState, useEffect, useRef } from 'react';
import _ from 'lodash';
import '../../styles/MonthlyEngagementChart.css';
import '../../styles/SectionHeaders.css';
import { matchesSearchTerm } from '../../utils/searchUtils';

const MonthlyEngagementChart = ({ searchTerm, selectedMetric = 'Unique_Open_Rate', selectedYears = [], onAvailableYears, metricOptions = [], onMetricChange, availableYears = [], onYearToggle }) => {
  const [metricDropdownOpen, setMetricDropdownOpen] = useState(false);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const metricDropdownRef = useRef(null);
  const yearDropdownRef = useRef(null);
  const [yearData, setYearData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartWidth, setChartWidth] = useState(1200);
  const [allCampaigns, setAllCampaigns] = useState([]);
  const [filteredCampaignNames, setFilteredCampaignNames] = useState([]);
  const [excludedCampaigns, setExcludedCampaigns] = useState(new Set());
  const [campaignDropdownOpen, setCampaignDropdownOpen] = useState(false);
  const chartContainerRef = React.useRef(null);
  const campaignDropdownRef = React.useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (campaignDropdownRef.current && !campaignDropdownRef.current.contains(event.target)) {
        setCampaignDropdownOpen(false);
      }
      if (metricDropdownRef.current && !metricDropdownRef.current.contains(event.target)) {
        setMetricDropdownOpen(false);
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target)) {
        setYearDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setExcludedCampaigns(new Set());
  }, [searchTerm]);

  useEffect(() => {
    fetchCampaignData();
  }, [searchTerm]);

  useEffect(() => {
    if (allCampaigns.length > 0) {
      processMonthlyData();
    }
  }, [allCampaigns, selectedMetric, excludedCampaigns, selectedYears]);

  useEffect(() => {
    const updateWidth = () => {
      if (chartContainerRef.current) {
        setChartWidth(chartContainerRef.current.offsetWidth - 40);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const cleanCampaignName = (name) => {
    return name.split(/\s*[-–—]\s*deployment\s*#?\d+|\s+deployment\s*#?\d+/i)[0].trim();
  };

  const fetchCampaignData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://emaildash.blob.core.windows.net/json-data/completed_campaign_metrics.json?sp=r&st=2025-05-08T18:43:13Z&se=2027-06-26T02:43:13Z&spr=https&sv=2024-11-04&sr=b&sig=%2FuZDifPilE4VzfTl%2BWjUcSmzP9M283h%2B8gH9Q1V3TUg%3D');
      const campaignsData = await response.json();

      if (onAvailableYears) {
        const allYears = [...new Set(
          campaignsData
            .filter(c => c.Send_Date)
            .map(c => new Date(c.Send_Date).getFullYear())
            .filter(y => !isNaN(y) && y >= 2000)
        )].sort((a, b) => a - b);
        onAvailableYears(allYears);
      }

      let filteredCampaigns = campaignsData;
      if (searchTerm) {
        filteredCampaigns = campaignsData.filter(campaign =>
          matchesSearchTerm(campaign.Campaign, searchTerm)
        );
      }

      const validDeliveries = filteredCampaigns.filter(item => (item.Delivered || 0) >= 100);
      const groupedCampaigns = _.groupBy(validDeliveries, item => cleanCampaignName(item.Campaign));

      const combinedCampaigns = Object.entries(groupedCampaigns).map(([campaignName, deployments]) => {
        if (deployments.length === 1) {
          return { ...deployments[0], Campaign: campaignName };
        }

        const deployment1 = deployments.find(d => {
          const name = d.Campaign.toLowerCase();
          return name.includes('deployment 1') ||
            name.includes('deployment #1') ||
            name.includes('deployment1');
        });

        const baseDeployment = deployment1 || deployments[0];

        const totalUniqueOpens = _.sumBy(deployments, 'Unique_Opens');
        const totalTotalOpens = _.sumBy(deployments, 'Total_Opens');
        const totalUniqueClicks = _.sumBy(deployments, 'Unique_Clicks');
        const totalTotalClicks = _.sumBy(deployments, 'Total_Clicks');
        const totalDelivered = baseDeployment.Delivered;

        return {
          Campaign: campaignName,
          Send_Date: baseDeployment.Send_Date,
          Delivered: totalDelivered,
          Unique_Opens: totalUniqueOpens,
          Total_Opens: totalTotalOpens,
          Unique_Clicks: totalUniqueClicks,
          Total_Clicks: totalTotalClicks,
          Unique_Open_Rate: (totalUniqueOpens / totalDelivered) * 100,
          Total_Open_Rate: (totalTotalOpens / totalDelivered) * 100,
          Unique_Click_Rate: totalUniqueOpens > 0 ? (totalUniqueClicks / totalUniqueOpens) * 100 : 0,
          Total_Click_Rate: totalTotalOpens > 0 ? (totalTotalClicks / totalTotalOpens) * 100 : 0
        };
      });

      const campaignNames = combinedCampaigns.map(c => c.Campaign).sort();
      setFilteredCampaignNames(campaignNames);
      setAllCampaigns(combinedCampaigns);
    } catch (error) {
    }
    setIsLoading(false);
  };

  const processMonthlyData = () => {
    const campaignsToProcess = allCampaigns.filter(c => !excludedCampaigns.has(c.Campaign));

    const monthlyData = {};

    campaignsToProcess.forEach(campaign => {
      if (!campaign.Send_Date) return;

      const date = new Date(campaign.Send_Date);
      const year = date.getFullYear();

      if (selectedYears.length > 0 && !selectedYears.includes(year)) return;

      const month = date.getMonth();

      if (!monthlyData[year]) {
        monthlyData[year] = Array(12).fill(null).map(() => ({
          totalUniqueOpens: 0,
          totalTotalOpens: 0,
          totalUniqueClicks: 0,
          totalTotalClicks: 0,
          totalDelivered: 0
        }));
      }

      monthlyData[year][month].totalUniqueOpens += campaign.Unique_Opens || 0;
      monthlyData[year][month].totalTotalOpens += campaign.Total_Opens || 0;
      monthlyData[year][month].totalUniqueClicks += campaign.Unique_Clicks || 0;
      monthlyData[year][month].totalTotalClicks += campaign.Total_Clicks || 0;
      monthlyData[year][month].totalDelivered += campaign.Delivered || 0;
    });

    const yearlyAverages = {};
    Object.keys(monthlyData).forEach(year => {
      yearlyAverages[year] = monthlyData[year].map(monthData => {
        if (monthData.totalDelivered === 0) return null;

        if (selectedMetric === 'Unique_Open_Rate') {
          return (monthData.totalUniqueOpens / monthData.totalDelivered) * 100;
        } else if (selectedMetric === 'Total_Open_Rate') {
          return (monthData.totalTotalOpens / monthData.totalDelivered) * 100;
        } else if (selectedMetric === 'Unique_Click_Rate') {
          return monthData.totalUniqueOpens > 0 ? (monthData.totalUniqueClicks / monthData.totalUniqueOpens) * 100 : null;
        } else if (selectedMetric === 'Total_Click_Rate') {
          return monthData.totalTotalOpens > 0 ? (monthData.totalTotalClicks / monthData.totalTotalOpens) * 100 : null;
        }
        return null;
      });
    });

    setYearData(yearlyAverages);
  };

  const toggleCampaignExclusion = (campaignName) => {
    setExcludedCampaigns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(campaignName)) {
        newSet.delete(campaignName);
      } else {
        newSet.add(campaignName);
      }
      return newSet;
    });
  };

  const includedCount = filteredCampaignNames.length - excludedCampaigns.size;

  const getMaxValue = () => {
    if (!yearData) return 0;
    let max = 0;
    Object.values(yearData).forEach(year => {
      year.forEach(val => {
        if (val !== null && val > max) max = val;
      });
    });
    return max;
  };

  const getChartScale = () => {
    const maxValue = getMaxValue();

    if (selectedMetric.includes('Click_Rate')) {
      if (maxValue <= 5) return { max: 5, step: 1 };
      if (maxValue <= 10) return { max: 10, step: 2 };
      if (maxValue <= 15) return { max: 15, step: 3 };
      if (maxValue <= 20) return { max: 20, step: 4 };
      if (maxValue <= 30) return { max: 30, step: 5 };
      return { max: Math.ceil(maxValue / 10) * 10, step: Math.ceil(maxValue / 50) * 10 };
    } else {
      if (maxValue <= 20) return { max: 20, step: 4 };
      if (maxValue <= 30) return { max: 30, step: 5 };
      if (maxValue <= 40) return { max: 40, step: 8 };
      if (maxValue <= 50) return { max: 50, step: 10 };
      if (maxValue <= 60) return { max: 60, step: 10 };
      if (maxValue <= 70) return { max: 70, step: 10 };
      if (maxValue <= 80) return { max: 80, step: 10 };
      if (maxValue <= 90) return { max: 90, step: 10 };
      if (maxValue <= 100) return { max: 100, step: 10 };
      return { max: Math.ceil(maxValue / 10) * 10, step: 10 };
    }
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const scale = getChartScale();
  const chartHeight = 500;
  const padding = { top: 20, right: 40, bottom: 60, left: 80 };

  const metricLabels = {
    'Unique_Open_Rate': 'Unique Open Rate',
    'Total_Open_Rate': 'Total Open Rate',
    'Unique_Click_Rate': 'Unique Click Rate',
    'Total_Click_Rate': 'Total Click Rate'
  };

  const getYearLabel = () => {
    if (availableYears.length === 0) return `${selectedYears.length} years`;
    const active = availableYears.filter(y => selectedYears.includes(y));
    if (active.length === 0) return 'Select years';
    if (active.length === availableYears.length) return 'All years';
    if (active.length <= 3) return active.join(', ');
    return `${active.length} years selected`;
  };

  const getMoMChangeData = () => {
    if (!yearData) return null;
    const sortedYears = Object.keys(yearData).sort((a, b) => a - b).map(Number);
    if (sortedYears.length === 0) return null;

    const changeData = {};
    sortedYears.forEach(year => {
      changeData[year] = [];
      for (let month = 0; month < 12; month++) {
        const currentVal = yearData[year]?.[month];

        let prevVal = null;
        if (month === 0) {
          const prevYear = year - 1;
          if (yearData[prevYear]) {
            prevVal = yearData[prevYear][11];
          }
        } else {
          prevVal = yearData[year]?.[month - 1];
        }

        if (currentVal !== null && prevVal !== null && prevVal !== 0) {
          const pctChange = ((currentVal - prevVal) / prevVal) * 100;
          changeData[year].push({
            value: currentVal,
            change: pctChange,
            direction: pctChange > 0 ? 'up' : pctChange < 0 ? 'down' : 'flat'
          });
        } else if (currentVal !== null) {
          changeData[year].push({
            value: currentVal,
            change: null,
            direction: null
          });
        } else {
          changeData[year].push(null);
        }
      }
    });

    return { years: sortedYears, data: changeData };
  };

  return (
    <div className="monthly-trends-wrapper">
      <div className="section-header-bar">
        <h3>Monthly Trends</h3>
        <div className="section-header-stats">
          <div className="metric-selector" ref={metricDropdownRef}>
            <label>Metric:</label>
            <div className="custom-dropdown">
              <button
                className="custom-dropdown-trigger"
                onClick={() => setMetricDropdownOpen(!metricDropdownOpen)}
              >
                <span className="dropdown-value">
                  {metricOptions.find(m => m.key === selectedMetric)?.label}
                </span>
                <svg className={`dropdown-arrow ${metricDropdownOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 12 12">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {metricDropdownOpen && (
                <div className="custom-dropdown-menu">
                  {metricOptions.map(option => (
                    <div
                      key={option.key}
                      className={`custom-dropdown-option ${selectedMetric === option.key ? 'selected' : ''}`}
                      onClick={() => {
                        onMetricChange(option.key);
                        setMetricDropdownOpen(false);
                      }}
                    >
                      <span className="metric-color-dot" style={{ backgroundColor: option.color }}></span>
                      <span>{option.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="metric-selector" ref={yearDropdownRef}>
            <label>Years:</label>
            <div className="custom-dropdown">
              <button
                className="custom-dropdown-trigger"
                onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
              >
                <span className="dropdown-value">{getYearLabel()}</span>
                <svg className={`dropdown-arrow ${yearDropdownOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 12 12">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {yearDropdownOpen && (
                <div className="custom-dropdown-menu multi-select" onMouseDown={(e) => e.stopPropagation()}>
                  <div className="year-dropdown-scroll">
                    {availableYears.slice().reverse().map(year => (
                      <label
                        key={year}
                        className={`custom-dropdown-option ${selectedYears.includes(year) ? 'selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedYears.includes(year)}
                          onChange={() => onYearToggle(year)}
                        />
                        <span>{year}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {searchTerm && !isLoading && (
        <div className="search-results-bar">
          <div className="search-indicator">
            Showing results for "<span className="search-term">{searchTerm}</span>" - {includedCount} campaign{includedCount !== 1 ? 's' : ''}
            {excludedCampaigns.size > 0 && (
              <span className="excluded-count"> ({excludedCampaigns.size} excluded)</span>
            )}
          </div>
          <div className="campaign-filter-dropdown" ref={campaignDropdownRef}>
            <button
              className="campaign-filter-trigger"
              onClick={() => setCampaignDropdownOpen(!campaignDropdownOpen)}
            >
              <span>View Campaigns</span>
              <svg className={`dropdown-arrow ${campaignDropdownOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 12 12">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {campaignDropdownOpen && (
              <div className="campaign-filter-menu">
                <div className="campaign-filter-header">
                  <span>{filteredCampaignNames.length} campaigns found</span>
                  {excludedCampaigns.size > 0 && (
                    <button
                      className="clear-exclusions"
                      onClick={() => setExcludedCampaigns(new Set())}
                    >
                      Include all
                    </button>
                  )}
                </div>
                <div className="campaign-filter-list">
                  {filteredCampaignNames.map(name => (
                    <label
                      key={name}
                      className={`campaign-filter-option ${excludedCampaigns.has(name) ? 'excluded' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={!excludedCampaigns.has(name)}
                        onChange={() => toggleCampaignExclusion(name)}
                      />
                      <span className="campaign-name" title={name}>{name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="monthly-chart-container" ref={chartContainerRef}>
      {isLoading ? (
        <div className="loading-container">
          <div className="spinner">
            <div></div><div></div><div></div><div></div><div></div><div></div>
          </div>
          <p>Loading data...</p>
        </div>
      ) : yearData && Object.keys(yearData).length > 0 ? (
        <div className="chart-wrapper">
          <svg width={chartWidth} height={chartHeight} className="line-chart">
            {Array.from({ length: Math.floor(scale.max / scale.step) + 1 }, (_, i) => i * scale.step).map(val => {
              const y = chartHeight - padding.bottom - ((val / scale.max) * (chartHeight - padding.top - padding.bottom));
              return (
                <g key={val}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={chartWidth - padding.right}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="12"
                    fill="#6b7280"
                  >
                    {val}%
                  </text>
                </g>
              );
            })}

            {months.map((month, idx) => {
              const x = padding.left + (idx * (chartWidth - padding.left - padding.right) / 11);
              return (
                <text
                  key={month}
                  x={x}
                  y={chartHeight - padding.bottom + 20}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#6b7280"
                >
                  {month}
                </text>
              );
            })}

            {Object.entries(yearData).sort(([a], [b]) => a - b).map(([year, values], yearIdx) => {
              const points = values
                .map((val, monthIdx) => {
                  if (val === null) return null;
                  const x = padding.left + (monthIdx * (chartWidth - padding.left - padding.right) / 11);
                  const y = chartHeight - padding.bottom - ((val / scale.max) * (chartHeight - padding.top - padding.bottom));
                  return { x, y, val };
                })
                .filter(p => p !== null);

              if (points.length === 0) return null;

              const pathData = points.map((p, i) =>
                `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
              ).join(' ');

              return (
                <g key={year}>
                  <path
                    d={pathData}
                    stroke={colors[yearIdx % colors.length]}
                    strokeWidth="2"
                    fill="none"
                  />
                  {points.map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r="4"
                      fill={colors[yearIdx % colors.length]}
                    >
                      <title>{`${year}: ${p.val.toFixed(2)}%`}</title>
                    </circle>
                  ))}
                </g>
              );
            })}
          </svg>

          <div className="chart-legend">
            {Object.keys(yearData).sort((a, b) => a - b).map((year, idx) => (
              <div key={year} className="legend-item">
                <span
                  className="legend-color"
                  style={{ backgroundColor: colors[idx % colors.length] }}
                ></span>
                <span>{year}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="no-data">No campaign data available</div>
      )}
      </div>

      {yearData && Object.keys(yearData).length > 0 && (() => {
        const momData = getMoMChangeData();
        if (!momData) return null;
        return (
          <div className="monthly-matrix-section">
            <h4>Month-over-Month {metricLabels[selectedMetric]} Change</h4>
            <div className="matrix-table-wrapper">
              <table className="monthly-matrix-table mom-change-table">
                <thead>
                  <tr>
                    <th className="month-header">Year</th>
                    {months.map(month => (
                      <th key={month}>{month}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {momData.years.map(year => (
                    <tr key={year}>
                      <td className="month-cell">{year}</td>
                      {momData.data[year].map((cell, monthIdx) => (
                        <td key={monthIdx} className="matrix-value-cell">
                          {cell !== null ? (
                            <span className={`matrix-value ${cell.change !== null ? (cell.direction === 'up' ? 'mom-up' : cell.direction === 'down' ? 'mom-down' : '') : ''}`}>
                              {cell.value.toFixed(2)}%
                              {cell.change !== null && (
                                <span className={`mom-change-badge ${cell.direction === 'up' ? 'mom-badge-up' : 'mom-badge-down'}`}>
                                  {cell.direction === 'up' ? '+' : ''}{cell.change.toFixed(1)}%
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="matrix-no-data">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="matrix-legend">
              <span className="legend-item"><span className="legend-color mom-up"></span> Increase from prior month</span>
              <span className="legend-item"><span className="legend-color mom-down"></span> Decrease from prior month</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default MonthlyEngagementChart;