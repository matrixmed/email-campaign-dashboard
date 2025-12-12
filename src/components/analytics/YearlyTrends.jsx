import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import _ from 'lodash';
import '../../styles/YearlyTrends.css';
import { matchesSearchTerm } from '../../utils/searchUtils';

const YearlyTrends = ({ searchTerm = '', selectedMetrics = ['Unique_Open_Rate'] }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [yearlyData, setYearlyData] = useState([]);
  const [filteredCampaignNames, setFilteredCampaignNames] = useState([]);
  const [excludedCampaigns, setExcludedCampaigns] = useState(new Set());
  const [campaignDropdownOpen, setCampaignDropdownOpen] = useState(false);
  const campaignDropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (campaignDropdownRef.current && !campaignDropdownRef.current.contains(event.target)) {
        setCampaignDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availableMetrics = [
    { key: 'Unique_Open_Rate', label: 'Unique Open Rate', color: '#0ff' },
    { key: 'Total_Open_Rate', label: 'Total Open Rate', color: '#00cc99' },
    { key: 'Unique_Click_Rate', label: 'Unique Click Rate', color: '#38bdf8' },
    { key: 'Total_Click_Rate', label: 'Total Click Rate', color: '#ffd93d' },
  ];

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    setExcludedCampaigns(new Set());
  }, [searchTerm]);

  useEffect(() => {
    if (campaigns.length > 0) {
      calculateYearlyData();
    }
  }, [campaigns, searchTerm, selectedMetrics, excludedCampaigns]);

  const cleanCampaignName = (name) => {
    return name.split(/\s*[-–—]\s*deployment\s*#?\d+|\s+deployment\s*#?\d+/i)[0].trim();
  };

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://emaildash.blob.core.windows.net/json-data/completed_campaign_metrics.json?sp=r&st=2025-05-08T18:43:13Z&se=2027-06-26T02:43:13Z&spr=https&sv=2024-11-04&sr=b&sig=%2FuZDifPilE4VzfTl%2BWjUcSmzP9M283h%2B8gH9Q1V3TUg%3D');
      if (response.ok) {
        const data = await response.json();
        setCampaigns(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateYearlyData = () => {
    let filteredCampaigns = campaigns;
    if (searchTerm.trim()) {
      filteredCampaigns = campaigns.filter(c =>
        matchesSearchTerm(c.Campaign, searchTerm)
      );
    }

    const validDeliveries = filteredCampaigns.filter(item => (item.Delivered || 0) >= 100);

    const groupedCampaigns = _.groupBy(validDeliveries, item => cleanCampaignName(item.Campaign));

    const allCampaignNames = Object.keys(groupedCampaigns).sort();
    setFilteredCampaignNames(allCampaignNames);

    const filteredGroupedCampaigns = Object.fromEntries(
      Object.entries(groupedCampaigns).filter(([name]) => !excludedCampaigns.has(name))
    );

    const combinedCampaigns = Object.entries(filteredGroupedCampaigns).map(([campaignName, deployments]) => {
      if (deployments.length === 1) {
        return deployments[0];
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

    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 4;
    const yearGroups = {};

    combinedCampaigns.forEach(campaign => {
      const sendDate = campaign.Send_Date;
      if (!sendDate) return;

      const year = new Date(sendDate).getFullYear();
      if (isNaN(year) || year < startYear) return;

      if (!yearGroups[year]) {
        yearGroups[year] = {
          campaigns: [],
          totals: {
            uniqueOpens: 0,
            totalOpens: 0,
            uniqueClicks: 0,
            totalClicks: 0,
            delivered: 0
          }
        };
      }
      yearGroups[year].campaigns.push(campaign);
      yearGroups[year].totals.uniqueOpens += campaign.Unique_Opens || 0;
      yearGroups[year].totals.totalOpens += campaign.Total_Opens || 0;
      yearGroups[year].totals.uniqueClicks += campaign.Unique_Clicks || 0;
      yearGroups[year].totals.totalClicks += campaign.Total_Clicks || 0;
      yearGroups[year].totals.delivered += campaign.Delivered || 0;
    });

    const data = Object.keys(yearGroups)
      .sort((a, b) => a - b)
      .map(year => {
        const group = yearGroups[year];
        const totals = group.totals;

        return {
          year: year.toString(),
          campaignCount: group.campaigns.length,
          Unique_Open_Rate: totals.delivered > 0 ? parseFloat(((totals.uniqueOpens / totals.delivered) * 100).toFixed(2)) : 0,
          Total_Open_Rate: totals.delivered > 0 ? parseFloat(((totals.totalOpens / totals.delivered) * 100).toFixed(2)) : 0,
          Unique_Click_Rate: totals.uniqueOpens > 0 ? parseFloat(((totals.uniqueClicks / totals.uniqueOpens) * 100).toFixed(2)) : 0,
          Total_Click_Rate: totals.totalOpens > 0 ? parseFloat(((totals.totalClicks / totals.totalOpens) * 100).toFixed(2)) : 0
        };
      });

    setYearlyData(data);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const yearData = yearlyData.find(d => d.year === label);
      return (
        <div className="yearly-tooltip">
          <p className="tooltip-year">{label}</p>
          <p className="tooltip-count">{yearData?.campaignCount || 0} campaigns</p>
          <div className="tooltip-metrics">
            {payload.map((entry, index) => {
              const metric = availableMetrics.find(m => m.key === entry.dataKey);
              return (
                <p key={index} style={{ color: entry.color }}>
                  {metric?.label}: {entry.value?.toFixed(2)}%
                </p>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="yearly-trends">
        <div className="loading-container">
          <div className="spinner">
            <div></div><div></div><div></div><div></div><div></div><div></div>
          </div>
          <p>Loading campaign data...</p>
        </div>
      </div>
    );
  }

  const totalCampaigns = yearlyData.reduce((sum, d) => sum + d.campaignCount, 0);
  const includedCount = filteredCampaignNames.length - excludedCampaigns.size;

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

  return (
    <div className="yearly-trends">
      {searchTerm && (
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

      <div className="yearly-chart-container">
        {yearlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={yearlyData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey="year"
                stroke="#888"
                tick={{ fill: '#aaa', fontSize: 14 }}
              />
              <YAxis
                stroke="#888"
                tick={{ fill: '#aaa', fontSize: 12 }}
                tickFormatter={(value) => `${value}%`}
                domain={[0, 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => {
                  const metric = availableMetrics.find(m => m.key === value);
                  return <span style={{ color: '#ccc' }}>{metric?.label || value}</span>;
                }}
              />
              {availableMetrics
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
          <div className="no-data-message">
            {searchTerm ? `No campaigns found matching "${searchTerm}"` : 'No campaign data available'}
          </div>
        )}
      </div>

      {yearlyData.length > 0 && (
        <div className="yearly-summary">
          <h4>Year-over-Year Summary</h4>
          <div className="summary-table-wrapper">
            <table className="summary-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Campaigns</th>
                  {availableMetrics
                    .filter(m => selectedMetrics.includes(m.key))
                    .map(m => (
                      <th key={m.key} style={{ color: m.color }}>{m.label}</th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {yearlyData.map((row, idx) => {
                  const prevRow = idx > 0 ? yearlyData[idx - 1] : null;
                  return (
                    <tr key={row.year}>
                      <td className="year-cell">{row.year}</td>
                      <td>{row.campaignCount}</td>
                      {availableMetrics
                        .filter(m => selectedMetrics.includes(m.key))
                        .map(m => {
                          const currentVal = row[m.key];
                          const prevVal = prevRow?.[m.key];
                          const delta = prevVal ? currentVal - prevVal : null;
                          return (
                            <td key={m.key}>
                              <span className="yoy-metric-value">{currentVal?.toFixed(2)}%</span>
                              {delta !== null && (
                                <span className={`yoy-delta ${delta >= 0 ? 'yoy-positive' : 'yoy-negative'}`}>
                                  {delta >= 0 ? '+' : ''}{delta.toFixed(2)}%
                                </span>
                              )}
                            </td>
                          );
                        })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default YearlyTrends;