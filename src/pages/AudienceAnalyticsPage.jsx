import React, { useState } from 'react';
import AudienceQueryBuilder from '../components/audience/AudienceQueryBuilder';
import NPIQuickLookup from '../components/listanalysis/NPIQuickLookup';
import ListEfficiencyAnalysis from '../components/listanalysis/ListEfficiencyAnalysis';
import DMABreakdown from '../components/listanalysis/DMABreakdown';
import EngagementPatterns from '../components/audience/EngagementPatterns';
import PrintListManagement from '../components/printManagement/PrintListManagement';
import NCOAUpload from '../components/printManagement/NCOAUpload';
import ShadowEngagers from '../components/audience/ShadowEngagers';
import HCPTargeting from '../components/audience/HCPTargeting';
import PrintListDisplay from '../components/audience/PrintListDisplay';
import DigitalListDisplay from '../components/audience/DigitalListDisplay';
import '../styles/AnalyticsHub.css';

const AudienceAnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('audienceAnalyticsTab') || 'find-users';
  });
  const [printSearch, setPrintSearch] = useState('');
  const [shadowSearch, setShadowSearch] = useState('');
  const [targetingSearch, setTargetingSearch] = useState('');
  const [printListSearch, setPrintListSearch] = useState('');
  const [digitalListSearch, setDigitalListSearch] = useState('');

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('audienceAnalyticsTab', tab);
  };

  const activeSection = activeTab === 'find-users' ? 'find' : activeTab === 'analyze' ? 'analyze' : undefined;

  return (
    <div className="audience-analytics-page analytics-hub">
      <div className="page-header">
        <h1>Audience Analytics</h1>
        {activeTab === 'print-management' && (
          <div className="search-container">
            <input
              type="text"
              placeholder="Search"
              value={printSearch}
              onChange={(e) => setPrintSearch(e.target.value)}
              className="search-input"
            />
          </div>
        )}
        {activeTab === 'shadow-engagers' && (
          <div className="search-container">
            <input
              type="text"
              placeholder="Search"
              value={shadowSearch}
              onChange={(e) => setShadowSearch(e.target.value)}
              className="search-input"
            />
          </div>
        )}
        {activeTab === 'hcp-targeting' && (
          <div className="search-container">
            <input
              type="text"
              placeholder="Search"
              value={targetingSearch}
              onChange={(e) => setTargetingSearch(e.target.value)}
              className="search-input"
            />
          </div>
        )}
        {activeTab === 'print-lists' && (
          <div className="search-container">
            <input
              type="text"
              placeholder="Search"
              value={printListSearch}
              onChange={(e) => setPrintListSearch(e.target.value)}
              className="search-input"
            />
          </div>
        )}
        {activeTab === 'digital-lists' && (
          <div className="search-container">
            <input
              type="text"
              placeholder="Search"
              value={digitalListSearch}
              onChange={(e) => setDigitalListSearch(e.target.value)}
              className="search-input"
            />
          </div>
        )}
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
        {/* DISABLED - not verified yet
        <button
          className={`tab-button ${activeTab === 'hcp-targeting' ? 'active' : ''}`}
          onClick={() => handleTabClick('hcp-targeting')}
        >
          <span>HCP Targeting</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'print-lists' ? 'active' : ''}`}
          onClick={() => handleTabClick('print-lists')}
        >
          <span>Print Lists</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'digital-lists' ? 'active' : ''}`}
          onClick={() => handleTabClick('digital-lists')}
        >
          <span>Digital Lists</span>
        </button>
        */}
        <button
          className={`tab-button ${activeTab === 'list-analysis' ? 'active' : ''}`}
          onClick={() => handleTabClick('list-analysis')}
        >
          <span>IQVIA List Efficiency</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'dma-breakdown' ? 'active' : ''}`}
          onClick={() => handleTabClick('dma-breakdown')}
        >
          <span>DMA Breakdown</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'shadow-engagers' ? 'active' : ''}`}
          onClick={() => handleTabClick('shadow-engagers')}
        >
          <span>Shadow Engagers</span>
        </button>
        {/* DISABLED - not verified yet
        <button
          className={`tab-button ${activeTab === 'engagement-patterns' ? 'active' : ''}`}
          onClick={() => handleTabClick('engagement-patterns')}
        >
          <span>Engagement Queries</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'print-management' ? 'active' : ''}`}
          onClick={() => handleTabClick('print-management')}
        >
          <span>Print Management</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'ncoa-upload' ? 'active' : ''}`}
          onClick={() => handleTabClick('ncoa-upload')}
        >
          <span>NCOA Upload</span>
        </button>
        */}
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
      {activeTab === 'hcp-targeting' && (
        <HCPTargeting externalSearch={targetingSearch} />
      )}
      {activeTab === 'shadow-engagers' && (
        <ShadowEngagers externalSearch={shadowSearch} />
      )}
      {activeTab === 'print-lists' && (
        <PrintListDisplay externalSearch={printListSearch} />
      )}
      {activeTab === 'digital-lists' && (
        <DigitalListDisplay externalSearch={digitalListSearch} />
      )}
      {/* DISABLED - not verified yet
      {activeTab === 'engagement-patterns' && (
        <EngagementPatterns />
      )}
      {activeTab === 'print-management' && (
        <PrintListManagement externalSearch={printSearch} />
      )}
      {activeTab === 'ncoa-upload' && (
        <NCOAUpload />
      )}
      */}
    </div>
  );
};

export default AudienceAnalyticsPage;