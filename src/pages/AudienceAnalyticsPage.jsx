import React, { useState } from 'react';
import AudienceQueryBuilder from '../components/audience/AudienceQueryBuilder';
import NPIQuickLookup from '../components/listanalysis/NPIQuickLookup';
import ListEfficiencyAnalysis from '../components/listanalysis/ListEfficiencyAnalysis';
import DMABreakdown from '../components/listanalysis/DMABreakdown';
import EngagementPatterns from '../components/audience/EngagementPatterns';
import '../styles/AnalyticsHub.css';

const AudienceAnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('audienceAnalyticsTab') || 'find-users';
  });

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('audienceAnalyticsTab', tab);
  };

  const activeSection = activeTab === 'find-users' ? 'find' : activeTab === 'analyze' ? 'analyze' : undefined;

  return (
    <div className="audience-analytics-page analytics-hub">
      <div className="page-header">
        <h1>Audience Analytics</h1>
      </div>

      <div className="analytics-tabs">
        <button
          className={`tab-button ${activeTab === 'find-users' ? 'active' : ''}`}
          onClick={() => handleTabClick('find-users')}
        >
          <span>Find Users</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'analyze' ? 'active' : ''}`}
          onClick={() => handleTabClick('analyze')}
        >
          <span>Analyze Users</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'npi-lookup' ? 'active' : ''}`}
          onClick={() => handleTabClick('npi-lookup')}
        >
          <span>NPI Lookup</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'list-analysis' ? 'active' : ''}`}
          onClick={() => handleTabClick('list-analysis')}
        >
          <span>List Analytics</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'dma-breakdown' ? 'active' : ''}`}
          onClick={() => handleTabClick('dma-breakdown')}
        >
          <span>DMA Breakdown</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'engagement-patterns' ? 'active' : ''}`}
          onClick={() => handleTabClick('engagement-patterns')}
        >
          <span>Engagement Queries</span>
        </button>
      </div>

      {(activeTab === 'find-users' || activeTab === 'analyze') && (
        <AudienceQueryBuilder activeSection={activeSection} />
      )}
      {activeTab === 'npi-lookup' && (
        <NPIQuickLookup />
      )}
      {activeTab === 'list-analysis' && (
        <ListEfficiencyAnalysis />
      )}
      {activeTab === 'dma-breakdown' && (
        <DMABreakdown />
      )}
      {activeTab === 'engagement-patterns' && (
        <EngagementPatterns />
      )}
    </div>
  );
};

export default AudienceAnalyticsPage;