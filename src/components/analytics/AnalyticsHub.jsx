import React, { useState } from 'react';
import '../../styles/AnalyticsHub.css';
import MonthlyEngagementChart from './MonthlyEngagementChart';
import AnomalyDetection from './AnomalyDetection';
import BrandPerformanceComparison from './BrandPerformanceComparison';

const AnalyticsHub = () => {
  const [activeView, setActiveView] = useState('monthly');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('Unique_Open_Rate');

  return (
    <div className="analytics-hub">
      <div className="page-header">
        <h1>Campaign Analytics</h1>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search campaigns"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="analytics-tabs-container">
        <div className="analytics-tabs">
          <button
            className={`tab-button ${activeView === 'monthly' ? 'active' : ''}`}
            onClick={() => setActiveView('monthly')}
          >
            <span>Monthly Trends</span>
          </button>
          <button
            className={`tab-button ${activeView === 'anomaly' ? 'active' : ''}`}
            onClick={() => setActiveView('anomaly')}
          >
            <span>Anomaly Detection</span>
          </button>
          <button
            className={`tab-button ${activeView === 'brands' ? 'active' : ''}`}
            onClick={() => setActiveView('brands')}
          >
            <span>Brand Performance</span>
          </button>
        </div>

        {activeView === 'monthly' && (
          <div className="metric-selector">
            <label htmlFor="metric-select">Metric:</label>
            <select
              id="metric-select"
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="metric-select"
            >
              <option value="Unique_Open_Rate">Unique Open Rate</option>
              <option value="Total_Open_Rate">Total Open Rate</option>
              <option value="Unique_Click_Rate">Unique Click Rate</option>
              <option value="Total_Click_Rate">Total Click Rate</option>
            </select>
          </div>
        )}
      </div>

      <div className="analytics-content">
        {activeView === 'monthly' && <MonthlyEngagementChart searchTerm={searchTerm} selectedMetric={selectedMetric} />}
        {activeView === 'anomaly' && <AnomalyDetection />}
        {activeView === 'brands' && <BrandPerformanceComparison />}
      </div>
    </div>
  );
};

export default AnalyticsHub;