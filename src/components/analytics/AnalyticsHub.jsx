import React, { useState, useCallback, useRef, useEffect } from 'react';
import '../../styles/AnalyticsHub.css';
import MonthlyEngagementChart from './MonthlyEngagementChart';
import YearlyTrends from './YearlyTrends';
import AnomalyDetection from './AnomalyDetection';
import TimingIntelligence from './TimingIntelligence';
import CampaignBenchmarks from './CampaignBenchmarks';
import GeographicInsights from './GeographicInsights';
import { useSearch } from '../../context/SearchContext';

const AnalyticsHub = () => {
  const { searchTerms, setSearchTerm: setGlobalSearchTerm } = useSearch();
  const [activeView, setActiveView] = useState('monthly');
  const [searchTerm, setSearchTerm] = useState(searchTerms.campaignAnalytics || '');
  const [selectedMetric, setSelectedMetric] = useState('Unique_Open_Rate');
  const [detectBySubtopic, setDetectBySubtopic] = useState(false);
  const [monthlyDropdownOpen, setMonthlyDropdownOpen] = useState(false);
  const [yearlyDropdownOpen, setYearlyDropdownOpen] = useState(false);
  const [selectedYearlyMetrics, setSelectedYearlyMetrics] = useState(['Unique_Open_Rate', 'Total_Open_Rate', 'Unique_Click_Rate', 'Total_Click_Rate']);
  const monthlyDropdownRef = useRef(null);
  const yearlyDropdownRef = useRef(null);

  const metricOptions = [
    { key: 'Unique_Open_Rate', label: 'Unique Open Rate', color: '#0ff' },
    { key: 'Total_Open_Rate', label: 'Total Open Rate', color: '#00cc99' },
    { key: 'Unique_Click_Rate', label: 'Unique Click Rate', color: '#38bdf8' },
    { key: 'Total_Click_Rate', label: 'Total Click Rate', color: '#ffd93d' },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (monthlyDropdownRef.current && !monthlyDropdownRef.current.contains(event.target)) {
        setMonthlyDropdownOpen(false);
      }
      if (yearlyDropdownRef.current && !yearlyDropdownRef.current.contains(event.target)) {
        setYearlyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleYearlyMetricToggle = (metricKey) => {
    setSelectedYearlyMetrics(prev => {
      if (prev.includes(metricKey)) {
        if (prev.length === 1) return prev;
        return prev.filter(m => m !== metricKey);
      }
      return [...prev, metricKey];
    });
  };

  const getYearlySelectedLabel = () => {
    if (selectedYearlyMetrics.length === 0) return 'Select metrics';
    if (selectedYearlyMetrics.length === 1) {
      return metricOptions.find(m => m.key === selectedYearlyMetrics[0])?.label;
    }
    return `${selectedYearlyMetrics.length} metrics selected`;
  };

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
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setGlobalSearchTerm('campaignAnalytics', e.target.value);
            }}
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
            className={`tab-button ${activeView === 'yearly' ? 'active' : ''}`}
            onClick={() => handleTabChange('yearly')}
          >
            <span>Yearly Trends</span>
          </button>
          <button
            className={`tab-button ${activeView === 'anomaly' ? 'active' : ''}`}
            onClick={() => handleTabChange('anomaly')}
          >
            <span>Anomaly Detection</span>
          </button>
          <button
            className={`tab-button ${activeView === 'benchmarks' ? 'active' : ''}`}
            onClick={() => handleTabChange('benchmarks')}
          >
            <span>Campaign Benchmarks</span>
          </button>
          <button
            className={`tab-button ${activeView === 'timing' ? 'active' : ''}`}
            onClick={() => handleTabChange('timing')}
          >
            <span>Timing Intelligence</span>
          </button>
          {/*
          <button
            className={`tab-button ${activeView === 'geographic' ? 'active' : ''}`}
            onClick={() => handleTabChange('geographic')}
          >
            <span>Geographic Insights</span>
          </button>
          
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
            <div className="metric-selector" ref={monthlyDropdownRef}>
              <label>Metric:</label>
              <div className="custom-dropdown">
                <button
                  className="custom-dropdown-trigger"
                  onClick={() => setMonthlyDropdownOpen(!monthlyDropdownOpen)}
                >
                  <span className="dropdown-value">
                    {metricOptions.find(m => m.key === selectedMetric)?.label}
                  </span>
                  <svg className={`dropdown-arrow ${monthlyDropdownOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 12 12">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {monthlyDropdownOpen && (
                  <div className="custom-dropdown-menu">
                    {metricOptions.map(option => (
                      <div
                        key={option.key}
                        className={`custom-dropdown-option ${selectedMetric === option.key ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedMetric(option.key);
                          setMonthlyDropdownOpen(false);
                        }}
                      >
                        <span className="metric-color-dot" style={{ backgroundColor: option.color }}></span>
                        <span>{option.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'yearly' && (
            <div className="metric-selector" ref={yearlyDropdownRef}>
              <label>Metrics:</label>
              <div className="custom-dropdown">
                <button
                  className="custom-dropdown-trigger"
                  onClick={() => setYearlyDropdownOpen(!yearlyDropdownOpen)}
                >
                  <span className="dropdown-value">{getYearlySelectedLabel()}</span>
                  <svg className={`dropdown-arrow ${yearlyDropdownOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 12 12">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {yearlyDropdownOpen && (
                  <div className="custom-dropdown-menu multi-select">
                    {metricOptions.map(option => (
                      <label
                        key={option.key}
                        className={`custom-dropdown-option ${selectedYearlyMetrics.includes(option.key) ? 'selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedYearlyMetrics.includes(option.key)}
                          onChange={() => handleYearlyMetricToggle(option.key)}
                        />
                        <span className="metric-color-dot" style={{ backgroundColor: option.color }}></span>
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
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
        <div style={{ display: activeView === 'yearly' ? 'block' : 'none' }}>
          <YearlyTrends searchTerm={searchTerm} selectedMetrics={selectedYearlyMetrics} />
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
        {/*
        {visitedTabs.geographic && (
          <div style={{ display: activeView === 'geographic' ? 'block' : 'none' }}>
            <GeographicInsights key={`geographic-${clearKeys.geographic}`} />
          </div>
        )}
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