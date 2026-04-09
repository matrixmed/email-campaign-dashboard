import React, { useState, useEffect, useRef } from 'react';
import '../../styles/JournalAnalysis.css';
import '../../styles/SectionHeaders.css';
import PublicationComparison from './PublicationComparison';
import JournalAnomalies from './JournalAnomalies';
import DeviceInsights from './DeviceInsights';
import TrafficInsights from './TrafficInsights';
import GeographicInsights from './GeographicInsights';
import DemographicsInsights from './DemographicsInsights';
import YouTubeInsights from './YouTubeInsights';
import SocialProfileInsights from './SocialProfileInsights';
import { useSearch } from '../../context/SearchContext';

const JournalAnalysisHub = () => {
  const { searchTerms, setSearchTerm: setGlobalSearchTerm } = useSearch();
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('contentAnalyticsTab') || 'walsworth';
  });
  const [searchTerm, setSearchTerm] = useState(searchTerms.contentAnalysis || '');
  const [visitedTabs, setVisitedTabs] = useState({ walsworth: true });

  const [walsworthSubTab, setWalsworthSubTab] = useState('publications');
  const [googleSubTab, setGoogleSubTab] = useState('devices');
  const [youtubeSubTab, setYoutubeSubTab] = useState('overview');
  const [socialSubTab, setSocialSubTab] = useState('followers');

  const [selectedMetrics, setSelectedMetrics] = useState(['visitsPerIssue', 'pageViewsPerIssue', 'uniqueViewsPerIssue', 'avgTimeInIssue']);
  const [selectedPublications, setSelectedPublications] = useState([]);
  const [allPublications, setAllPublications] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [metricsDropdownOpen, setMetricsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const metricsDropdownRef = useRef(null);
  const [analyzeBy, setAnalyzeBy] = useState('time');
  const [deviceViewMode, setDeviceViewMode] = useState('overview');
  const [trafficViewMode, setTrafficViewMode] = useState('overview');
  const [geoViewMode, setGeoViewMode] = useState('overview');
  const [demoViewMode, setDemoViewMode] = useState('overview');

  const metricOptions = [
    { key: 'visitsPerIssue', label: 'Visits', color: '#0ff' },
    { key: 'pageViewsPerIssue', label: 'Page Views', color: '#00cc99' },
    { key: 'uniqueViewsPerIssue', label: 'Unique Views', color: '#38bdf8' },
    { key: 'avgTimeInIssue', label: 'Avg Time in Issue', color: '#ffd93d' }
  ];

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

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('contentAnalyticsTab', tab);
    if (!visitedTabs[tab]) {
      setVisitedTabs(prev => ({ ...prev, [tab]: true }));
    }
  };

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

  const getSubHeaderTitle = () => {
    switch (activeTab) {
      case 'walsworth': return 'Walsworth';
      case 'google': return 'Google Analytics';
      case 'youtube': return 'YouTube';
      case 'social': return 'Social Profiles';
      default: return '';
    }
  };

  return (
    <div className="content-analysis-hub">
      <div className="page-header">
        <h1>Content Analytics</h1>
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

      <div className="analytics-tabs-container">
        <div className="analytics-tabs">
          <button className={`tab-button ${activeTab === 'walsworth' ? 'active' : ''}`} onClick={() => handleTabClick('walsworth')}>Walsworth</button>
          <button className={`tab-button ${activeTab === 'google' ? 'active' : ''}`} onClick={() => handleTabClick('google')}>Google Analytics</button>
          <button className={`tab-button ${activeTab === 'youtube' ? 'active' : ''}`} onClick={() => handleTabClick('youtube')}>YouTube</button>
          <button className={`tab-button ${activeTab === 'social' ? 'active' : ''}`} onClick={() => handleTabClick('social')}>Social Profiles</button>
        </div>
      </div>

      <div className="section-header-bar">
        <h3>{getSubHeaderTitle()}</h3>
      </div>

      <div style={{ display: activeTab === 'walsworth' ? 'block' : 'none' }}>
        <div className="ca-sub-tabs">
          <button className={`ca-sub-tab ${walsworthSubTab === 'publications' ? 'active' : ''}`} onClick={() => setWalsworthSubTab('publications')}>Publications</button>
          <button className={`ca-sub-tab ${walsworthSubTab === 'journal' ? 'active' : ''}`} onClick={() => setWalsworthSubTab('journal')}>Journal</button>
          <button className={`ca-sub-tab ${walsworthSubTab === 'anomaly' ? 'active' : ''}`} onClick={() => setWalsworthSubTab('anomaly')}>Anomaly Detection</button>
        </div>

        {walsworthSubTab === 'publications' && (
          <>
            <div className="section-header-bar" style={{ marginBottom: '16px' }}>
              <h3>Publication Comparison</h3>
              <div className="section-header-stats">
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
            </div>

            <PublicationComparison
              searchTerm={searchTerm}
              selectedMetrics={selectedMetrics}
              metricOptions={metricOptions}
              selectedPublications={selectedPublications}
              setSelectedPublications={setSelectedPublications}
              allPublications={allPublications}
              setAllPublications={setAllPublications}
            />
          </>
        )}

        {walsworthSubTab === 'journal' && (
          <div className="ja-chart-container" style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#666', fontSize: '15px' }}>Journal content coming soon.</p>
          </div>
        )}

        {walsworthSubTab === 'anomaly' && (
          <JournalAnomalies
            searchTerm={searchTerm}
            analyzeBy={analyzeBy}
            onAnalyzeByChange={setAnalyzeBy}
          />
        )}
      </div>

      {visitedTabs.google && (
        <div style={{ display: activeTab === 'google' ? 'block' : 'none' }}>
          <div className="ca-sub-tabs">
            <button className={`ca-sub-tab ${googleSubTab === 'devices' ? 'active' : ''}`} onClick={() => setGoogleSubTab('devices')}>Device Insights</button>
            <button className={`ca-sub-tab ${googleSubTab === 'traffic' ? 'active' : ''}`} onClick={() => setGoogleSubTab('traffic')}>Traffic Sources</button>
            <button className={`ca-sub-tab ${googleSubTab === 'geographic' ? 'active' : ''}`} onClick={() => setGoogleSubTab('geographic')}>Geographic</button>
            <button className={`ca-sub-tab ${googleSubTab === 'demographics' ? 'active' : ''}`} onClick={() => setGoogleSubTab('demographics')}>Demographics</button>
          </div>

          {googleSubTab === 'devices' && (
            <>
              <div className="section-header-bar">
                <h3>Device Insights</h3>
                <div className="section-header-stats">
                  <div className="ja-toggle-group">
                    <button className={`ja-toggle-btn ${deviceViewMode === 'overview' ? 'active' : ''}`} onClick={() => setDeviceViewMode('overview')}>Overview</button>
                    <button className={`ja-toggle-btn ${deviceViewMode === 'comparison' ? 'active' : ''}`} onClick={() => setDeviceViewMode('comparison')}>By Journal</button>
                  </div>
                </div>
              </div>
              <DeviceInsights searchTerm={searchTerm} viewMode={deviceViewMode} />
            </>
          )}

          {googleSubTab === 'traffic' && (
            <>
              <div className="section-header-bar">
                <h3>Traffic Sources</h3>
                <div className="section-header-stats">
                  <div className="ja-toggle-group">
                    <button className={`ja-toggle-btn ${trafficViewMode === 'overview' ? 'active' : ''}`} onClick={() => setTrafficViewMode('overview')}>Overview</button>
                    <button className={`ja-toggle-btn ${trafficViewMode === 'drilldown' ? 'active' : ''}`} onClick={() => setTrafficViewMode('drilldown')}>Source</button>
                  </div>
                </div>
              </div>
              <TrafficInsights searchTerm={searchTerm} viewMode={trafficViewMode} />
            </>
          )}

          {googleSubTab === 'geographic' && (
            <>
              <div className="section-header-bar">
                <h3>Geographic</h3>
                <div className="section-header-stats">
                  <div className="ja-toggle-group">
                    <button className={`ja-toggle-btn ${geoViewMode === 'overview' ? 'active' : ''}`} onClick={() => setGeoViewMode('overview')}>Overview</button>
                    <button className={`ja-toggle-btn ${geoViewMode === 'country' ? 'active' : ''}`} onClick={() => setGeoViewMode('country')}>Country</button>
                    <button className={`ja-toggle-btn ${geoViewMode === 'city' ? 'active' : ''}`} onClick={() => setGeoViewMode('city')}>City</button>
                  </div>
                </div>
              </div>
              <GeographicInsights searchTerm={searchTerm} viewMode={geoViewMode} />
            </>
          )}

          {googleSubTab === 'demographics' && (
            <>
              <div className="section-header-bar">
                <h3>Demographics</h3>
                <div className="section-header-stats">
                  <div className="ja-toggle-group">
                    <button className={`ja-toggle-btn ${demoViewMode === 'overview' ? 'active' : ''}`} onClick={() => setDemoViewMode('overview')}>Overview</button>
                    <button className={`ja-toggle-btn ${demoViewMode === 'age' ? 'active' : ''}`} onClick={() => setDemoViewMode('age')}>Age</button>
                    <button className={`ja-toggle-btn ${demoViewMode === 'gender' ? 'active' : ''}`} onClick={() => setDemoViewMode('gender')}>Gender</button>
                  </div>
                </div>
              </div>
              <DemographicsInsights searchTerm={searchTerm} viewMode={demoViewMode} />
            </>
          )}
        </div>
      )}

      {visitedTabs.youtube && (
        <div style={{ display: activeTab === 'youtube' ? 'block' : 'none' }}>
          <div className="ca-sub-tabs">
            <button className={`ca-sub-tab ${youtubeSubTab === 'overview' ? 'active' : ''}`} onClick={() => setYoutubeSubTab('overview')}>Overview</button>
            <button className={`ca-sub-tab ${youtubeSubTab === 'traffic' ? 'active' : ''}`} onClick={() => setYoutubeSubTab('traffic')}>Traffic Sources</button>
            <button className={`ca-sub-tab ${youtubeSubTab === 'audience' ? 'active' : ''}`} onClick={() => setYoutubeSubTab('audience')}>Audience</button>
          </div>

          <div style={{ display: youtubeSubTab === 'overview' ? 'block' : 'none' }}>
            <YouTubeInsights searchTerm={searchTerm} viewMode="overview" />
          </div>
          <div style={{ display: youtubeSubTab === 'traffic' ? 'block' : 'none' }}>
            <YouTubeInsights searchTerm={searchTerm} viewMode="traffic" />
          </div>
          <div style={{ display: youtubeSubTab === 'audience' ? 'block' : 'none' }}>
            <YouTubeInsights searchTerm={searchTerm} viewMode="audience" />
          </div>
        </div>
      )}

      {visitedTabs.social && (
        <div style={{ display: activeTab === 'social' ? 'block' : 'none' }}>
          <div className="ca-sub-tabs">
            <button className={`ca-sub-tab ${socialSubTab === 'followers' ? 'active' : ''}`} onClick={() => setSocialSubTab('followers')}>Followers</button>
            <button className={`ca-sub-tab ${socialSubTab === 'growth' ? 'active' : ''}`} onClick={() => setSocialSubTab('growth')}>Growth</button>
            <button className={`ca-sub-tab ${socialSubTab === 'pageviews' ? 'active' : ''}`} onClick={() => setSocialSubTab('pageviews')}>Page Views</button>
            <button className={`ca-sub-tab ${socialSubTab === 'linkedin-demo' ? 'active' : ''}`} onClick={() => setSocialSubTab('linkedin-demo')}>LinkedIn Demographics</button>
            <button className={`ca-sub-tab ${socialSubTab === 'instagram-demo' ? 'active' : ''}`} onClick={() => setSocialSubTab('instagram-demo')}>Instagram Audience</button>
          </div>

          <SocialProfileInsights searchTerm={searchTerm} activeSection={socialSubTab} />
        </div>
      )}
    </div>
  );
};

export default JournalAnalysisHub;