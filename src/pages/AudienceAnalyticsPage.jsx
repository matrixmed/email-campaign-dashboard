import React, { useState } from 'react';
import AudienceQueryBuilder from '../components/audience/AudienceQueryBuilder';
import NPIQuickLookup from '../components/listanalysis/NPIQuickLookup';
import VendorMatchLookup from '../components/listanalysis/VendorMatchLookup';
import SpecialtyLookup from '../components/listanalysis/SpecialtyLookup';
import ListEfficiencyAnalysis from '../components/listanalysis/ListEfficiencyAnalysis';
import DMABreakdown from '../components/listanalysis/DMABreakdown';
import EngagementPatterns from '../components/audience/EngagementPatterns';
import PrintListManagement from '../components/printManagement/PrintListManagement';
import NCOAUpload from '../components/printManagement/NCOAUpload';
import ShadowEngagers from '../components/audience/ShadowEngagers';
import HCPTargeting from '../components/audience/HCPTargeting';
import PageViewers from '../components/audience/PageViewers';
import PrintListDisplay from '../components/audience/PrintListDisplay';
import DigitalListDisplay from '../components/audience/DigitalListDisplay';
import SubscriberIntake from '../components/audience/SubscriberIntake';
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
  const [subscriberIntakeSearch, setSubscriberIntakeSearch] = useState('');
  const [listEfficiencySearch, setListEfficiencySearch] = useState('');

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
        {activeTab === 'subscriber-intake' && (
          <div className="search-container">
            <input
              type="text"
              placeholder="Search"
              value={subscriberIntakeSearch}
              onChange={(e) => setSubscriberIntakeSearch(e.target.value)}
              className="search-input"
            />
          </div>
        )}
        {activeTab === 'list-analysis' && (
          <div className="search-container">
            <input
              type="text"
              placeholder="Search"
              value={listEfficiencySearch}
              onChange={(e) => setListEfficiencySearch(e.target.value)}
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
        <button
          className={`tab-button ${activeTab === 'specialty-lookup' ? 'active' : ''}`}
          onClick={() => handleTabClick('specialty-lookup')}
        >
          <span>Specialty Lookup</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'vendor-match' ? 'active' : ''}`}
          onClick={() => handleTabClick('vendor-match')}
        >
          <span>Vendor Match</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'hcp-targeting' ? 'active' : ''}`}
          onClick={() => handleTabClick('hcp-targeting')}
        >
          <span>HCP Targeting</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'page-viewers' ? 'active' : ''}`}
          onClick={() => handleTabClick('page-viewers')}
        >
          <span>Page Viewers</span>
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
        <button
          className={`tab-button ${activeTab === 'subscriber-intake' ? 'active' : ''}`}
          onClick={() => handleTabClick('subscriber-intake')}
        >
          <span>Subscriber Intake</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'ncoa-upload' ? 'active' : ''}`}
          onClick={() => handleTabClick('ncoa-upload')}
        >
          <span>NCOA Upload</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'list-analysis' ? 'active' : ''}`}
          onClick={() => handleTabClick('list-analysis')}
        >
          <span>List Efficiency</span>
        </button>
        {/* DISABLED - not verified yet
        <button
          className={`tab-button ${activeTab === 'dma-breakdown' ? 'active' : ''}`}
          onClick={() => handleTabClick('dma-breakdown')}
        >
          <span>DMA Breakdown</span>
        </button>
        */}
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
        */}
      </div>

      {(activeTab === 'find-users' || activeTab === 'analyze') && (
        <AudienceQueryBuilder activeSection={activeSection} />
      )}
      {activeTab === 'npi-lookup' && (
        <NPIQuickLookup />
      )}
      {activeTab === 'specialty-lookup' && (
        <SpecialtyLookup />
      )}
      {activeTab === 'vendor-match' && (
        <VendorMatchLookup />
      )}
      {activeTab === 'list-analysis' && (
        <ListEfficiencyAnalysis externalSearch={listEfficiencySearch} />
      )}
      {/* DISABLED - not verified yet
      {activeTab === 'dma-breakdown' && (
        <DMABreakdown />
      )}
      */}
      {activeTab === 'hcp-targeting' && (
        <HCPTargeting externalSearch={targetingSearch} />
      )}
      {activeTab === 'page-viewers' && (
        <PageViewers />
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
      {activeTab === 'subscriber-intake' && (
        <SubscriberIntake externalSearch={subscriberIntakeSearch} />
      )}
      {activeTab === 'ncoa-upload' && (
        <NCOAUpload />
      )}
      {/* DISABLED - not verified yet
      {activeTab === 'engagement-patterns' && (
        <EngagementPatterns />
      )}
      {activeTab === 'print-management' && (
        <PrintListManagement externalSearch={printSearch} />
      )}
      */}
    </div>
  );
};

export default AudienceAnalyticsPage;