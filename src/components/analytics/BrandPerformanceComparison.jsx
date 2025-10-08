import React, { useState, useEffect } from 'react';

const BrandPerformanceComparison = () => {
  const [brands, setBrands] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('ytd');

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (selectedBrands.length > 0) {
      fetchComparisonData();
    }
  }, [selectedBrands, dateRange]);

  const fetchBrands = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/analytics/brand-list');
      const data = await response.json();
      setBrands(data.brands);
      if (data.brands.length >= 2) {
        setSelectedBrands([data.brands[0].name, data.brands[1].name]);
      }
    } catch (error) {
      console.error('Failed to fetch brands:', error);
    }
    setIsLoading(false);
  };

  const fetchComparisonData = async () => {
    try {
      const response = await fetch('/api/analytics/brand-comparison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brands: selectedBrands,
          date_range: dateRange
        })
      });
      const data = await response.json();
      setComparisonData(data);
    } catch (error) {
      console.error('Failed to fetch comparison data:', error);
    }
  };

  const toggleBrand = (brandName) => {
    if (selectedBrands.includes(brandName)) {
      if (selectedBrands.length > 1) {
        setSelectedBrands(selectedBrands.filter(b => b !== brandName));
      }
    } else {
      if (selectedBrands.length < 5) {
        setSelectedBrands([...selectedBrands, brandName]);
      }
    }
  };

  const metrics = [
    { key: 'unique_open_rate', label: 'Unique Open Rate', format: (v) => `${v.toFixed(1)}%` },
    { key: 'unique_click_rate', label: 'Unique Click Rate', format: (v) => `${v.toFixed(1)}%` },
    { key: 'total_campaigns', label: 'Total Campaigns', format: (v) => v },
    { key: 'total_sends', label: 'Total Sends', format: (v) => v.toLocaleString() },
    { key: 'total_engagement', label: 'Total Engagements', format: (v) => v.toLocaleString() },
    { key: 'avg_cost_per_engagement', label: 'Avg Cost/Engagement', format: (v) => `$${v.toFixed(2)}` }
  ];

  return (
    <div className="brand-comparison-container">
      <div className="chart-controls">
        <div className="control-group">
          <label>Select Brands (1-5)</label>
          <div className="brand-selector">
            {brands.map(brand => (
              <button
                key={brand.name}
                className={selectedBrands.includes(brand.name) ? 'selected' : ''}
                onClick={() => toggleBrand(brand.name)}
              >
                {brand.name}
              </button>
            ))}
          </div>
        </div>
        <div className="control-group">
          <label>Date Range</label>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="ytd">Year to Date</option>
            <option value="last_year">Last Year</option>
            <option value="q4">Q4 2024</option>
            <option value="q3">Q3 2024</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="chart-loading">Loading data...</div>
      ) : comparisonData ? (
        <div className="comparison-wrapper">
          <div className="chart-title">Brand Performance Comparison</div>
          <div className="comparison-grid">
            {metrics.map(metric => (
              <div key={metric.key} className="metric-comparison">
                <div className="metric-header">{metric.label}</div>
                <div className="metric-bars">
                  {selectedBrands.map((brandName, idx) => {
                    const brandData = comparisonData.brands.find(b => b.name === brandName);
                    const value = brandData?.[metric.key] || 0;
                    const maxValue = Math.max(...comparisonData.brands.map(b => b[metric.key] || 0));
                    const widthPercent = maxValue > 0 ? (value / maxValue) * 100 : 0;

                    return (
                      <div key={brandName} className="brand-bar">
                        <div className="brand-name">{brandName}</div>
                        <div className="bar-container">
                          <div
                            className="bar"
                            style={{ width: `${widthPercent}%` }}
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
          <div className="comparison-table">
            <table>
              <thead>
                <tr>
                  <th>Brand</th>
                  <th>Open Rate</th>
                  <th>Click Rate</th>
                  <th>Campaigns</th>
                  <th>Total Sends</th>
                  <th>Cost/Engagement</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {selectedBrands.map(brandName => {
                  const brandData = comparisonData.brands.find(b => b.name === brandName);
                  return (
                    <tr key={brandName}>
                      <td className="brand-name-cell">{brandName}</td>
                      <td>{brandData?.unique_open_rate.toFixed(1)}%</td>
                      <td>{brandData?.unique_click_rate.toFixed(1)}%</td>
                      <td>{brandData?.total_campaigns}</td>
                      <td>{brandData?.total_sends.toLocaleString()}</td>
                      <td>${brandData?.avg_cost_per_engagement.toFixed(2)}</td>
                      <td>
                        <span className={`trend ${brandData?.trend > 0 ? 'positive' : 'negative'}`}>
                          {brandData?.trend > 0 ? '↗' : '↘'} {Math.abs(brandData?.trend).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="no-data">Select brands to compare</div>
      )}
    </div>
  );
};

export default BrandPerformanceComparison;
