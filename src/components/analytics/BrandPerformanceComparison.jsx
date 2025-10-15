import React, { useState, useEffect } from 'react';
import _ from 'lodash';
import '../../styles/BrandPerformance.css';

const BrandPerformanceComparison = () => {
  const [brands, setBrands] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBrandsAndCampaigns();
  }, []);

  const cleanCampaignName = (name) => {
    return name.split(/\s*[-–—]\s*deployment\s*#?\d+|\s+deployment\s*#?\d+/i)[0].trim();
  };

  const fetchBrandsAndCampaigns = async () => {
    setIsLoading(true);
    try {
      const brandsResponse = await fetch('/api/brand-management');
      const brandsData = await brandsResponse.json();

      const uniqueBrands = [...new Set(brandsData.brands
        .filter(b => b.is_active)
        .map(b => b.brand))]
        .sort();

      const campaignsResponse = await fetch('https://emaildash.blob.core.windows.net/json-data/completed_campaign_metrics.json?sp=r&st=2025-05-08T18:43:13Z&se=2027-06-26T02:43:13Z&spr=https&sv=2024-11-04&sr=b&sig=%2FuZDifPilE4VzfTl%2BWjUcSmzP9M283h%2B8gH9Q1V3TUg%3D');
      const campaignsData = await campaignsResponse.json();

      const validDeliveries = campaignsData.filter(item => (item.Delivered || 0) >= 100);

      const groupedCampaigns = _.groupBy(validDeliveries, item => cleanCampaignName(item.Campaign));

      const combinedCampaigns = Object.entries(groupedCampaigns).map(([campaignName, deployments]) => {
        if (deployments.length === 1) {
          return deployments[0];
        }

        const deployment1 = deployments.find(d => {
          const name = d.Campaign.toLowerCase();
          return name.includes('deployment 1') || name.includes('deployment #1') || name.includes('deployment1');
        });

        const baseDeployment = deployment1 || deployments[0];
        const totalUniqueOpens = _.sumBy(deployments, 'Unique_Opens');
        const totalUniqueClicks = _.sumBy(deployments, 'Unique_Clicks');
        const totalDelivered = baseDeployment.Delivered;

        return {
          Campaign: campaignName,
          Send_Date: baseDeployment.Send_Date,
          Delivered: totalDelivered,
          Unique_Opens: totalUniqueOpens,
          Unique_Clicks: totalUniqueClicks,
          Unique_Open_Rate: (totalUniqueOpens / totalDelivered) * 100,
          Unique_Click_Rate: totalUniqueOpens > 0 ? (totalUniqueClicks / totalUniqueOpens) * 100 : 0
        };
      });

      const brandMetrics = uniqueBrands.map(brandName => {
        const brandCampaigns = combinedCampaigns.filter(c => {
          const campaignLower = c.Campaign.toLowerCase();
          const brandLower = brandName.toLowerCase();

          const wordBoundaryMatch = new RegExp(`\\b${brandLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b|\\(${brandLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'i');

          return wordBoundaryMatch.test(campaignLower);
        });

        if (brandCampaigns.length === 0) {
          return null;
        }

        const totalDelivered = _.sumBy(brandCampaigns, 'Delivered');
        const totalUniqueOpens = _.sumBy(brandCampaigns, 'Unique_Opens');
        const totalUniqueClicks = _.sumBy(brandCampaigns, 'Unique_Clicks');

        return {
          name: brandName,
          totalCampaigns: brandCampaigns.length,
          totalDelivered,
          totalUniqueOpens,
          totalUniqueClicks,
          uniqueOpenRate: totalDelivered > 0 ? (totalUniqueOpens / totalDelivered) * 100 : 0,
          uniqueClickRate: totalUniqueOpens > 0 ? (totalUniqueClicks / totalUniqueOpens) * 100 : 0
        };
      }).filter(b => b !== null && b.totalCampaigns > 0);

      brandMetrics.sort((a, b) => b.uniqueOpenRate - a.uniqueOpenRate);

      setBrands(brandMetrics);

      if (brandMetrics.length > 0) {
        setSelectedBrands(brandMetrics.slice(0, Math.min(5, brandMetrics.length)).map(b => b.name));
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (selectedBrands.length > 0 && brands.length > 0) {
      const comparison = brands.filter(b => selectedBrands.includes(b.name));
      setComparisonData({ brands: comparison });
    }
  }, [selectedBrands, brands]);

  const toggleBrand = (brandName) => {
    if (selectedBrands.includes(brandName)) {
      if (selectedBrands.length > 1) {
        setSelectedBrands(selectedBrands.filter(b => b !== brandName));
      }
    } else {
      if (selectedBrands.length < 10) {
        setSelectedBrands([...selectedBrands, brandName]);
      }
    }
  };

  const metrics = [
    { key: 'uniqueOpenRate', label: 'Unique Open Rate', format: (v) => `${v.toFixed(1)}%` },
    { key: 'uniqueClickRate', label: 'Unique Click Rate', format: (v) => `${v.toFixed(1)}%` },
    { key: 'totalCampaigns', label: 'Total Campaigns', format: (v) => v },
    { key: 'totalDelivered', label: 'Total Delivered', format: (v) => v.toLocaleString() },
    { key: 'totalUniqueOpens', label: 'Total Opens', format: (v) => v.toLocaleString() },
    { key: 'totalUniqueClicks', label: 'Total Clicks', format: (v) => v.toLocaleString() }
  ];

  return (
    <div className="brand-comparison-container">
      <div className="brand-header">
        <h2>Brand Performance Comparison</h2>
        <p className="brand-subtitle">Compare unique open rates across brands (all-time data)</p>
      </div>

      <div className="chart-controls">
        <div className="control-group">
          <label>Select Brands (1-10)</label>
          <div className="brand-selector">
            {brands.map(brand => (
              <button
                key={brand.name}
                className={selectedBrands.includes(brand.name) ? 'selected' : ''}
                onClick={() => toggleBrand(brand.name)}
                disabled={!selectedBrands.includes(brand.name) && selectedBrands.length >= 10}
              >
                {brand.name} ({brand.totalCampaigns})
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="chart-loading">Loading data...</div>
      ) : comparisonData && comparisonData.brands.length > 0 ? (
        <div className="comparison-wrapper">
          <div className="comparison-table">
            <table>
              <thead>
                <tr>
                  <th>Brand</th>
                  <th>Open Rate</th>
                  <th>Click Rate</th>
                  <th>Campaigns</th>
                  <th>Total Delivered</th>
                  <th>Total Opens</th>
                  <th>Total Clicks</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.brands.map(brandData => (
                  <tr key={brandData.name}>
                    <td className="brand-name-cell">{brandData.name}</td>
                    <td className="rate-cell">{brandData.uniqueOpenRate.toFixed(2)}%</td>
                    <td className="rate-cell">{brandData.uniqueClickRate.toFixed(2)}%</td>
                    <td>{brandData.totalCampaigns}</td>
                    <td>{brandData.totalDelivered.toLocaleString()}</td>
                    <td>{brandData.totalUniqueOpens.toLocaleString()}</td>
                    <td>{brandData.totalUniqueClicks.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="comparison-grid">
            {metrics.map(metric => (
              <div key={metric.key} className="metric-comparison">
                <div className="metric-header">{metric.label}</div>
                <div className="metric-bars">
                  {comparisonData.brands.map((brandData, idx) => {
                    const value = brandData[metric.key] || 0;
                    const maxValue = Math.max(...comparisonData.brands.map(b => b[metric.key] || 0));
                    const widthPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;

                    return (
                      <div key={brandData.name} className="brand-bar">
                        <div className="brand-name-label">{brandData.name}</div>
                        <div className="bar-container">
                          <div
                            className="bar"
                            style={{
                              width: `${widthPercent}%`,
                              backgroundColor: `hsl(${(idx * 360) / comparisonData.brands.length}, 70%, 50%)`
                            }}
                          >
                            <span className="bar-value">{metric.format(value)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="no-data">No brand data available</div>
      )}
    </div>
  );
};

export default BrandPerformanceComparison;