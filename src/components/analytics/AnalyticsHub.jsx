import React, { useState, useCallback } from 'react';
import '../../styles/AnalyticsHub.css';
import MonthlyEngagementChart from './MonthlyEngagementChart';
import AnomalyDetection from './AnomalyDetection';
import TimingIntelligence from './TimingIntelligence';
import CampaignBenchmarks from './CampaignBenchmarks';
import GeographicInsights from './GeographicInsights';

const AnalyticsHub = () => {
  const [activeView, setActiveView] = useState('monthly');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMetric, setSelectedMetric] = useState('Unique_Open_Rate');
  const [detectBySubtopic, setDetectBySubtopic] = useState(false);

  const [visitedTabs, setVisitedTabs] = useState({ monthly: true });

  const [clearKeys, setClearKeys] = useState({
    timing: 0,
    benchmarks: 0,
    geographic: 0,
    deliverability: 0,
    'subject-lines': 0,
    journeys: 0
  });

  const cacheableTabs = ['timing', 'benchmarks', 'geographic', 'deliverability', 'subject-lines', 'journeys'];

  const handleTabChange = useCallback((tab) => {
    setActiveView(tab);
    if (!visitedTabs[tab]) {
      setVisitedTabs(prev => ({ ...prev, [tab]: true }));
    }
  }, [visitedTabs]);

  const handleClearCache = useCallback(() => {
    if (cacheableTabs.includes(activeView)) {
      setClearKeys(prev => ({
        ...prev,
        [activeView]: prev[activeView] + 1
      }));
    }
  }, [activeView]);

  const PlaceholderComponent = ({ title }) => (
    <div className="placeholder-content">
      <h2>{title}</h2>
    </div>
  );

  const showClearButton = cacheableTabs.includes(activeView);

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
            onClick={() => handleTabChange('monthly')}
          >
            <span>Monthly Trends</span>
          </button>
          <button
            className={`tab-button ${activeView === 'anomaly' ? 'active' : ''}`}
            onClick={() => handleTabChange('anomaly')}
          >
            <span>Anomaly Detection</span>
          </button>
          <button
            className={`tab-button ${activeView === 'timing' ? 'active' : ''}`}
            onClick={() => handleTabChange('timing')}
          >
            <span>Timing Intelligence</span>
          </button>
          <button
            className={`tab-button ${activeView === 'benchmarks' ? 'active' : ''}`}
            onClick={() => handleTabChange('benchmarks')}
          >
            <span>Campaign Benchmarks</span>
          </button>
          <button
            className={`tab-button ${activeView === 'geographic' ? 'active' : ''}`}
            onClick={() => handleTabChange('geographic')}
          >
            <span>Geographic Insights</span>
          </button>
          {/*
          <button
            className={`tab-button ${activeView === 'deliverability' ? 'active' : ''}`}
            onClick={() => handleTabChange('deliverability')}
          >
            <span>Deliverability Monitor</span>
          </button>
          <button
            className={`tab-button ${activeView === 'subject-lines' ? 'active' : ''}`}
            onClick={() => handleTabChange('subject-lines')}
          >
            <span>Subject Lines</span>
          </button>
          <button
            className={`tab-button ${activeView === 'journeys' ? 'active' : ''}`}
            onClick={() => handleTabChange('journeys')}
          >
            <span>User Journeys</span>
          </button>
          */}
        </div>

        <div className="tab-controls">
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

          {activeView === 'anomaly' && (
            <div className="metric-selector">
              <label htmlFor="anomaly-toggle">Analyze by Subtopic:</label>
              <label className="anomaly-toggle-switch" style={{ marginLeft: '8px' }}>
                <input
                  type="checkbox"
                  checked={detectBySubtopic}
                  onChange={(e) => setDetectBySubtopic(e.target.checked)}
                />
                <span className="anomaly-toggle-slider"></span>
              </label>
            </div>
          )}

          {showClearButton && (
            <button
              className="clear-cache-button"
              onClick={handleClearCache}
              title="Clear cached data and reload"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="analytics-content">
        <div style={{ display: activeView === 'monthly' ? 'block' : 'none' }}>
          <MonthlyEngagementChart searchTerm={searchTerm} selectedMetric={selectedMetric} />
        </div>
        <div style={{ display: activeView === 'anomaly' ? 'block' : 'none' }}>
          <AnomalyDetection searchTerm={searchTerm} detectBySubtopic={detectBySubtopic} />
        </div>

        {visitedTabs.timing && (
          <div style={{ display: activeView === 'timing' ? 'block' : 'none' }}>
            <TimingIntelligence key={`timing-${clearKeys.timing}`} />
          </div>
        )}
        {visitedTabs.benchmarks && (
          <div style={{ display: activeView === 'benchmarks' ? 'block' : 'none' }}>
            <CampaignBenchmarks key={`benchmarks-${clearKeys.benchmarks}`} />
          </div>
        )}
        {visitedTabs.geographic && (
          <div style={{ display: activeView === 'geographic' ? 'block' : 'none' }}>
            <GeographicInsights key={`geographic-${clearKeys.geographic}`} />
          </div>
        )}
        {/*
        {visitedTabs.deliverability && (
          <div style={{ display: activeView === 'deliverability' ? 'block' : 'none' }}>
            <PlaceholderComponent key={`deliverability-${clearKeys.deliverability}`} title="Deliverability Monitor" />
          </div>
        )}
        {visitedTabs['subject-lines'] && (
          <div style={{ display: activeView === 'subject-lines' ? 'block' : 'none' }}>
            <PlaceholderComponent key={`subject-lines-${clearKeys['subject-lines']}`} title="Subject Line Analysis" />
          </div>
        )}
        {visitedTabs.journeys && (
          <div style={{ display: activeView === 'journeys' ? 'block' : 'none' }}>
            <PlaceholderComponent key={`journeys-${clearKeys.journeys}`} title="User Journeys" />
          </div>
        )}
        */}
      </div>
    </div>
  );
};

export default AnalyticsHub;