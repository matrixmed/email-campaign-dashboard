import React, { useState, useEffect } from 'react';
import _ from 'lodash';
import '../../styles/MonthlyEngagementChart.css';

const MonthlyEngagementChart = ({ searchTerm }) => {
  const [yearData, setYearData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [chartWidth, setChartWidth] = useState(1200);
  const chartContainerRef = React.useRef(null);

  useEffect(() => {
    fetchMonthlyData();
  }, [searchTerm]);

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

  const fetchMonthlyData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://emaildash.blob.core.windows.net/json-data/completed_campaign_metrics.json?sp=r&st=2025-05-08T18:43:13Z&se=2027-06-26T02:43:13Z&spr=https&sv=2024-11-04&sr=b&sig=%2FuZDifPilE4VzfTl%2BWjUcSmzP9M283h%2B8gH9Q1V3TUg%3D');
      const campaignsData = await response.json();

      // Filter by search term first
      let filteredCampaigns = campaignsData;
      if (searchTerm) {
        filteredCampaigns = campaignsData.filter(campaign =>
          campaign.Campaign && campaign.Campaign.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Filter valid deliveries (>= 100)
      const validDeliveries = filteredCampaigns.filter(item => (item.Delivered || 0) >= 100);

      // Group by cleaned campaign name to combine deployments
      const groupedCampaigns = _.groupBy(validDeliveries, item => cleanCampaignName(item.Campaign));

      // Combine deployments
      const combinedCampaigns = Object.entries(groupedCampaigns).map(([campaignName, deployments]) => {
        if (deployments.length === 1) {
          return deployments[0];
        }

        // Find deployment 1 for base date
        const deployment1 = deployments.find(d => {
          const name = d.Campaign.toLowerCase();
          return name.includes('deployment 1') ||
            name.includes('deployment #1') ||
            name.includes('deployment1');
        });

        const baseDeployment = deployment1 || deployments[0];

        const totalUniqueOpens = _.sumBy(deployments, 'Unique_Opens');
        const totalDelivered = baseDeployment.Delivered;

        return {
          Campaign: campaignName,
          Send_Date: baseDeployment.Send_Date,
          Delivered: totalDelivered,
          Unique_Opens: totalUniqueOpens,
          Unique_Open_Rate: (totalUniqueOpens / totalDelivered) * 100
        };
      });

      // Group by year and month
      const monthlyData = {};
      const currentYear = new Date().getFullYear();
      const startYear = currentYear - 4; // Only go back 5 years

      combinedCampaigns.forEach(campaign => {
        if (!campaign.Send_Date || !campaign.Unique_Open_Rate) return;

        const date = new Date(campaign.Send_Date);
        const year = date.getFullYear();

        // Filter to only include last 5 years
        if (year < startYear) return;

        const month = date.getMonth();

        if (!monthlyData[year]) {
          monthlyData[year] = Array(12).fill(null).map(() => ({
            totalUniqueOpens: 0,
            totalDelivered: 0
          }));
        }

        monthlyData[year][month].totalUniqueOpens += campaign.Unique_Opens;
        monthlyData[year][month].totalDelivered += campaign.Delivered;
      });

      // Calculate unique open rate for each year/month
      const yearlyAverages = {};
      Object.keys(monthlyData).forEach(year => {
        yearlyAverages[year] = monthlyData[year].map(monthData => {
          if (monthData.totalDelivered === 0) return null; // null for no data
          return (monthData.totalUniqueOpens / monthData.totalDelivered) * 100;
        });
      });

      setYearData(yearlyAverages);
    } catch (error) {
      console.error('Failed to fetch monthly data:', error);
    }
    setIsLoading(false);
  };

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

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const maxValue = getMaxValue();
  const chartHeight = 500;
  const padding = { top: 20, right: 40, bottom: 60, left: 80 };

  return (
    <div className="monthly-chart-container" ref={chartContainerRef}>
      {isLoading ? (
        <div className="chart-loading">Loading data...</div>
      ) : yearData && Object.keys(yearData).length > 0 ? (
        <div className="chart-wrapper">
          <svg width={chartWidth} height={chartHeight} className="line-chart">
            {/* Y-axis labels */}
            {[0, 10, 20, 30, 40, 50].map(val => {
              const y = chartHeight - padding.bottom - ((val / 50) * (chartHeight - padding.top - padding.bottom));
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

            {/* X-axis labels */}
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

            {/* Lines for each year */}
            {Object.entries(yearData).sort(([a], [b]) => a - b).map(([year, values], yearIdx) => {
              const points = values
                .map((val, monthIdx) => {
                  if (val === null) return null;
                  const x = padding.left + (monthIdx * (chartWidth - padding.left - padding.right) / 11);
                  const y = chartHeight - padding.bottom - ((val / 50) * (chartHeight - padding.top - padding.bottom));
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
  );
};

export default MonthlyEngagementChart;
