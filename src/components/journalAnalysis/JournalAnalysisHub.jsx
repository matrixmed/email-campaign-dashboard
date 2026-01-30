import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../../styles/JournalAnalysis.css';
import PublicationComparison from './PublicationComparison';
import JournalAnomalies from './JournalAnomalies';
import IssueComparison from './IssueComparison';
import DeviceInsights from './DeviceInsights';
import TrafficInsights from './TrafficInsights';
import GeographicInsights from './GeographicInsights';
import DemographicsInsights from './DemographicsInsights';
import YouTubeInsights from './YouTubeInsights';
import { useSearch } from '../../context/SearchContext';

const JournalAnalysisHub = () => {
  const { searchTerms, setSearchTerm: setGlobalSearchTerm } = useSearch();
  const [activeView, setActiveView] = useState('publication');
  const [searchTerm, setSearchTerm] = useState(searchTerms.contentAnalysis || '');
  const [dataSource, setDataSource] = useState('walsworth');
  const [visitedTabs, setVisitedTabs] = useState({ publication: true });

  const [selectedMetrics, setSelectedMetrics] = useState(['visitsPerIssue', 'pageViewsPerIssue', 'uniqueViewsPerIssue', 'avgTimeInIssue']);
  const [selectedPublications, setSelectedPublications] = useState([]);
  const [allPublications, setAllPublications] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [metricsDropdownOpen, setMetricsDropdownOpen] = useState(false);
  const [analyzeBy, setAnalyzeBy] = useState('time');
  const [deviceViewMode, setDeviceViewMode] = useState('overview');
  const [trafficViewMode, setTrafficViewMode] = useState('overview');
  const [geoViewMode, setGeoViewMode] = useState('overview');
  const [demoViewMode, setDemoViewMode] = useState('overview');
  const [youtubeViewMode, setYoutubeViewMode] = useState('overview');
  const dropdownRef = useRef(null);
  const metricsDropdownRef = useRef(null);

  const metricOptions = [
    { key: 'visitsPerIssue', label: 'Visits', color: '#0ff' },
    { key: 'pageViewsPerIssue', label: 'Page Views', color: '#00cc99' },
    { key: 'uniqueViewsPerIssue', label: 'Unique Views', color: '#38bdf8' },
    { key: 'avgTimeInIssue', label: 'Avg Time in Issue', color: '#ffd93d' }
  ];

  const walsworthTabs = ['publication', 'anomalies', 'issues'];
  const googleAnalyticsTabs = ['devices', 'traffic', 'geographic', 'demographics'];
  const youtubeTabs = ['yt-overview', 'yt-traffic', 'yt-geography', 'yt-audience'];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (metricsDropdownRef.current && !metricsDropdownRef.current.contains(event.target)) {
        setMetricsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (dataSource === 'walsworth' && (googleAnalyticsTabs.includes(activeView) || youtubeTabs.includes(activeView))) {
      setActiveView('publication');
      setVisitedTabs(prev => ({ ...prev, publication: true }));
    } else if (dataSource === 'google' && (walsworthTabs.includes(activeView) || youtubeTabs.includes(activeView))) {
      setActiveView('devices');
      setVisitedTabs(prev => ({ ...prev, devices: true }));
    } else if (dataSource === 'youtube' && (walsworthTabs.includes(activeView) || googleAnalyticsTabs.includes(activeView))) {
      setActiveView('yt-overview');
      setVisitedTabs(prev => ({ ...prev, 'yt-overview': true }));
    }
  }, [dataSource]);

  const handleTabChange = useCallback((tab) => {
    setActiveView(tab);
    if (!visitedTabs[tab]) {
      setVisitedTabs(prev => ({ ...prev, [tab]: true }));
    }
  }, [visitedTabs]);

  const togglePublication = (pub) => {
    setSelectedPublications(prev => {
      if (prev.includes(pub)) {
        if (prev.length === 1) return prev;
        return prev.filter(p => p !== pub);
      }
      return [...prev, pub];
    });
  };

  const toggleMetric = (metricKey) => {
    setSelectedMetrics(prev => {
      if (prev.includes(metricKey)) {
        if (prev.length === 1) return prev;
        return prev.filter(m => m !== metricKey);
      }
      return [...prev, metricKey];
    });
  };

  const getSelectedLabel = () => {
    if (selectedPublications.length === 0) return 'Select publications';
    if (selectedPublications.length === 1) return selectedPublications[0];
    if (selectedPublications.length === allPublications.length) return 'All publications';
    return `${selectedPublications.length} publications`;
  };

  const getMetricsLabel = () => {
    if (selectedMetrics.length === 0) return 'Select metrics';
    if (selectedMetrics.length === 1) {
      const metric = metricOptions.find(m => m.key === selectedMetrics[0]);
      return metric?.label || selectedMetrics[0];
    }
    if (selectedMetrics.length === metricOptions.length) return 'All metrics';
    return `${selectedMetrics.length} metrics`;
  };

  return (
    <div className="content-analysis-hub">
      <div className="page-header">
        <h1>Content Analysis</h1>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setGlobalSearchTerm('contentAnalysis', e.target.value);
            }}
            className="search-input"
          />
        </div>
      </div>

      <div className="data-source-toggle">
        <div
          className={`data-source-option ${dataSource === 'walsworth' ? 'active' : ''}`}
          onClick={() => setDataSource('walsworth')}
        >
          Walsworth
        </div>
        <div
          className={`data-source-option ${dataSource === 'google' ? 'active' : ''}`}
          onClick={() => setDataSource('google')}
        >
          Google Analytics
        </div>
        <div
          className={`data-source-option ${dataSource === 'youtube' ? 'active' : ''}`}
          onClick={() => setDataSource('youtube')}
        >
          YouTube
        </div>
      </div>

      <div className="analytics-tabs-container">
        <div className="analytics-tabs">
          {dataSource === 'walsworth' && (
            <>
              <button
                className={`tab-button ${activeView === 'publication' ? 'active' : ''}`}
                onClick={() => handleTabChange('publication')}
              >
                <span>Publication</span>
              </button>
              <button
                className={`tab-button ${activeView === 'issues' ? 'active' : ''}`}
                onClick={() => handleTabChange('issues')}
              >
                <span>Issue</span>
              </button>
              <button
                className={`tab-button ${activeView === 'anomalies' ? 'active' : ''}`}
                onClick={() => handleTabChange('anomalies')}
              >
                <span>Anomaly Detection</span>
              </button>
              
            </>
          )}
          {dataSource === 'google' && (
            <>
              <button
                className={`tab-button ${activeView === 'devices' ? 'active' : ''}`}
                onClick={() => handleTabChange('devices')}
              >
                <span>Device</span>
              </button>
              <button
                className={`tab-button ${activeView === 'traffic' ? 'active' : ''}`}
                onClick={() => handleTabChange('traffic')}
              >
                <span>Traffic</span>
              </button>
              <button
                className={`tab-button ${activeView === 'geographic' ? 'active' : ''}`}
                onClick={() => handleTabChange('geographic')}
              >
                <span>Geographic</span>
              </button>
              <button
                className={`tab-button ${activeView === 'demographics' ? 'active' : ''}`}
                onClick={() => handleTabChange('demographics')}
              >
                <span>Demographics</span>
              </button>
            </>
          )}
          {dataSource === 'youtube' && (
            <>
              <button
                className={`tab-button ${activeView === 'yt-overview' ? 'active' : ''}`}
                onClick={() => handleTabChange('yt-overview')}
              >
                <span>Overview</span>
              </button>
              <button
                className={`tab-button ${activeView === 'yt-traffic' ? 'active' : ''}`}
                onClick={() => handleTabChange('yt-traffic')}
              >
                <span>Traffic</span>
              </button>
              <button
                className={`tab-button ${activeView === 'yt-geography' ? 'active' : ''}`}
                onClick={() => handleTabChange('yt-geography')}
              >
                <span>Geographic</span>
              </button>
              <button
                className={`tab-button ${activeView === 'yt-audience' ? 'active' : ''}`}
                onClick={() => handleTabChange('yt-audience')}
              >
                <span>Audience</span>
              </button>
            </>
          )}
        </div>

          {dataSource === 'walsworth' && activeView === 'publication' && (
            <div className="tab-controls">
              <div className="metric-selector" ref={metricsDropdownRef}>
                <label>Metrics:</label>
                <div className="custom-dropdown">
                  <button
                    className="custom-dropdown-trigger"
                    onClick={() => setMetricsDropdownOpen(!metricsDropdownOpen)}
                  >
                    <span className="dropdown-value">{getMetricsLabel()}</span>
                    <svg className={`dropdown-arrow ${metricsDropdownOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 12 12">
                      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {metricsDropdownOpen && (
                    <div className="custom-dropdown-menu">
                      <div className="ja-dropdown-list">
                        {metricOptions.map(metric => (
                          <label key={metric.key} className="custom-dropdown-option">
                            <input
                              type="checkbox"
                              checked={selectedMetrics.includes(metric.key)}
                              onChange={() => toggleMetric(metric.key)}
                            />
                            <span className="metric-color-dot" style={{ background: metric.color }}></span>
                            <span>{metric.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="metric-selector" ref={dropdownRef}>
                <label>Publications:</label>
                <div className="custom-dropdown">
                  <button
                    className="custom-dropdown-trigger"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                  >
                    <span className="dropdown-value">{getSelectedLabel()}</span>
                    <svg className={`dropdown-arrow ${dropdownOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 12 12">
                      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {dropdownOpen && (
                    <div className="custom-dropdown-menu">
                      <div className="ja-dropdown-actions">
                        <button onClick={() => setSelectedPublications(allPublications)}>All</button>
                        <button onClick={() => setSelectedPublications(allPublications.slice(0, 10))}>Top 10</button>
                        <button onClick={() => setSelectedPublications(allPublications.slice(0, 5))}>Top 5</button>
                      </div>
                      <div className="ja-dropdown-list">
                        {allPublications.map(pub => (
                          <label key={pub} className="custom-dropdown-option">
                            <input
                              type="checkbox"
                              checked={selectedPublications.includes(pub)}
                              onChange={() => togglePublication(pub)}
                            />
                            <span>{pub}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {dataSource === 'walsworth' && activeView === 'anomalies' && (
            <div className="tab-controls">
              <div className="ja-control-group">
                <span className="ja-control-label">Analyze by:</span>
                <div className="ja-toggle-group">
                  <button
                    className={`ja-toggle-btn ${analyzeBy === 'time' ? 'active' : ''}`}
                    onClick={() => setAnalyzeBy('time')}
                  >
                    Time
                  </button>
                  <button
                    className={`ja-toggle-btn ${analyzeBy === 'visits' ? 'active' : ''}`}
                    onClick={() => setAnalyzeBy('visits')}
                  >
                    Visits
                  </button>
                  <button
                    className={`ja-toggle-btn ${analyzeBy === 'views' ? 'active' : ''}`}
                    onClick={() => setAnalyzeBy('views')}
                  >
                    Page Views
                  </button>
                </div>
              </div>
            </div>
          )}

          {dataSource === 'google' && activeView === 'devices' && (
            <div className="tab-controls">
              <div className="ja-control-group">
                <span className="ja-control-label">View:</span>
                <div className="ja-toggle-group">
                  <button
                    className={`ja-toggle-btn ${deviceViewMode === 'overview' ? 'active' : ''}`}
                    onClick={() => setDeviceViewMode('overview')}
                  >
                    Overview
                  </button>
                  <button
                    className={`ja-toggle-btn ${deviceViewMode === 'comparison' ? 'active' : ''}`}
                    onClick={() => setDeviceViewMode('comparison')}
                  >
                    By Journal
                  </button>
                </div>
              </div>
            </div>
          )}

          {dataSource === 'google' && activeView === 'traffic' && (
            <div className="tab-controls">
              <div className="ja-control-group">
                <span className="ja-control-label">View:</span>
                <div className="ja-toggle-group">
                  <button
                    className={`ja-toggle-btn ${trafficViewMode === 'overview' ? 'active' : ''}`}
                    onClick={() => setTrafficViewMode('overview')}
                  >
                    Overview
                  </button>
                  <button
                    className={`ja-toggle-btn ${trafficViewMode === 'drilldown' ? 'active' : ''}`}
                    onClick={() => setTrafficViewMode('drilldown')}
                  >
                    Source
                  </button>
                </div>
              </div>
            </div>
          )}

          {dataSource === 'google' && activeView === 'geographic' && (
            <div className="tab-controls">
              <div className="ja-control-group">
                <span className="ja-control-label">View:</span>
                <div className="ja-toggle-group">
                  <button
                    className={`ja-toggle-btn ${geoViewMode === 'overview' ? 'active' : ''}`}
                    onClick={() => setGeoViewMode('overview')}
                  >
                    Overview
                  </button>
                  <button
                    className={`ja-toggle-btn ${geoViewMode === 'country' ? 'active' : ''}`}
                    onClick={() => setGeoViewMode('country')}
                  >
                    Country
                  </button>
                  <button
                    className={`ja-toggle-btn ${geoViewMode === 'city' ? 'active' : ''}`}
                    onClick={() => setGeoViewMode('city')}
                  >
                    City
                  </button>
                </div>
              </div>
            </div>
          )}

          {dataSource === 'google' && activeView === 'demographics' && (
            <div className="tab-controls">
              <div className="ja-control-group">
                <span className="ja-control-label">View:</span>
                <div className="ja-toggle-group">
                  <button
                    className={`ja-toggle-btn ${demoViewMode === 'overview' ? 'active' : ''}`}
                    onClick={() => setDemoViewMode('overview')}
                  >
                    Overview
                  </button>
                  <button
                    className={`ja-toggle-btn ${demoViewMode === 'age' ? 'active' : ''}`}
                    onClick={() => setDemoViewMode('age')}
                  >
                    Age
                  </button>
                  <button
                    className={`ja-toggle-btn ${demoViewMode === 'gender' ? 'active' : ''}`}
                    onClick={() => setDemoViewMode('gender')}
                  >
                    Gender
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>

      <div className="analytics-content">
        {dataSource === 'walsworth' && (
          <>
            <div style={{ display: activeView === 'publication' ? 'block' : 'none' }}>
              <PublicationComparison
                searchTerm={searchTerm}
                selectedMetrics={selectedMetrics}
                metricOptions={metricOptions}
                selectedPublications={selectedPublications}
                setSelectedPublications={setSelectedPublications}
                allPublications={allPublications}
                setAllPublications={setAllPublications}
              />
            </div>
            {visitedTabs.anomalies && (
              <div style={{ display: activeView === 'anomalies' ? 'block' : 'none' }}>
                <JournalAnomalies searchTerm={searchTerm} analyzeBy={analyzeBy} />
              </div>
            )}
            {visitedTabs.issues && (
              <div style={{ display: activeView === 'issues' ? 'block' : 'none' }}>
                <IssueComparison searchTerm={searchTerm} />
              </div>
            )}
          </>
        )}

        {dataSource === 'google' && (
          <>
            {visitedTabs.devices && (
              <div style={{ display: activeView === 'devices' ? 'block' : 'none' }}>
                <DeviceInsights searchTerm={searchTerm} viewMode={deviceViewMode} />
              </div>
            )}
            {visitedTabs.traffic && (
              <div style={{ display: activeView === 'traffic' ? 'block' : 'none' }}>
                <TrafficInsights searchTerm={searchTerm} viewMode={trafficViewMode} />
              </div>
            )}
            {visitedTabs.geographic && (
              <div style={{ display: activeView === 'geographic' ? 'block' : 'none' }}>
                <GeographicInsights searchTerm={searchTerm} viewMode={geoViewMode} />
              </div>
            )}
            {visitedTabs.demographics && (
              <div style={{ display: activeView === 'demographics' ? 'block' : 'none' }}>
                <DemographicsInsights searchTerm={searchTerm} viewMode={demoViewMode} />
              </div>
            )}
          </>
        )}

        {dataSource === 'youtube' && (
          <>
            {visitedTabs['yt-overview'] && (
              <div style={{ display: activeView === 'yt-overview' ? 'block' : 'none' }}>
                <YouTubeInsights searchTerm={searchTerm} viewMode="overview" />
              </div>
            )}
            {visitedTabs['yt-traffic'] && (
              <div style={{ display: activeView === 'yt-traffic' ? 'block' : 'none' }}>
                <YouTubeInsights searchTerm={searchTerm} viewMode="traffic" />
              </div>
            )}
            {visitedTabs['yt-geography'] && (
              <div style={{ display: activeView === 'yt-geography' ? 'block' : 'none' }}>
                <YouTubeInsights searchTerm={searchTerm} viewMode="geography" />
              </div>
            )}
            {visitedTabs['yt-audience'] && (
              <div style={{ display: activeView === 'yt-audience' ? 'block' : 'none' }}>
                <YouTubeInsights searchTerm={searchTerm} viewMode="audience" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default JournalAnalysisHub;