import React, { useState } from 'react';
import '../../styles/AnalyticsHub.css';
import MonthlyEngagementChart from './MonthlyEngagementChart';
import CampaignDecayChart from './CampaignDecayChart';
import BrandPerformanceComparison from './BrandPerformanceComparison';

const AnalyticsHub = () => {
  const [activeView, setActiveView] = useState('monthly');
  const [searchTerm, setSearchTerm] = useState('');

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

      <div className="analytics-tabs">
        <button
          className={`tab-button ${activeView === 'monthly' ? 'active' : ''}`}
          onClick={() => setActiveView('monthly')}
        >
          <span>Monthly Trends</span>
        </button>
        <button
          className={`tab-button ${activeView === 'decay' ? 'active' : ''}`}
          onClick={() => setActiveView('decay')}
        >
          <span>Campaign Decay</span>
        </button>
        <button
          className={`tab-button ${activeView === 'brands' ? 'active' : ''}`}
          onClick={() => setActiveView('brands')}
        >
          <span>Brand Performance</span>
        </button>
      </div>

      <div className="analytics-content">
        {activeView === 'monthly' && <MonthlyEngagementChart searchTerm={searchTerm} />}
        {activeView === 'decay' && <CampaignDecayChart />}
        {activeView === 'brands' && <BrandPerformanceComparison />}
      </div>
    </div>
  );
};

export default AnalyticsHub;
