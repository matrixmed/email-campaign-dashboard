import React, { useState } from 'react';
import SocialMetrics from '../components/social/SocialMetrics';
import VideoMetrics from '../components/video/VideoMetrics';
import DigitalJournals from '../components/journal/DigitalJournals';
import '../styles/AnalyticsHub.css';

const ContentPerformancePage = () => {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('contentPerformanceTab') || 'walsworth';
  });
  const [search, setSearch] = useState('');

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('contentPerformanceTab', tab);
  };

  return (
    <div className="content-performance-page analytics-hub">
      <div className="page-header">
        <h1>Content Performance</h1>
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="analytics-tabs-container">
        <div className="analytics-tabs">
          <button className={`tab-button ${activeTab === 'walsworth' ? 'active' : ''}`} onClick={() => handleTabClick('walsworth')}>Walsworth</button>
          <button className={`tab-button ${activeTab === 'google' ? 'active' : ''}`} onClick={() => handleTabClick('google')}>Google Analytics</button>
          <button className={`tab-button ${activeTab === 'youtube' ? 'active' : ''}`} onClick={() => handleTabClick('youtube')}>YouTube</button>
          <button className={`tab-button ${activeTab === 'vimeo' ? 'active' : ''}`} onClick={() => handleTabClick('vimeo')}>Vimeo</button>
          <button className={`tab-button ${activeTab === 'linkedin' ? 'active' : ''}`} onClick={() => handleTabClick('linkedin')}>LinkedIn</button>
          <button className={`tab-button ${activeTab === 'facebook' ? 'active' : ''}`} onClick={() => handleTabClick('facebook')}>Facebook</button>
          <button className={`tab-button ${activeTab === 'instagram' ? 'active' : ''}`} onClick={() => handleTabClick('instagram')}>Instagram</button>
        </div>
      </div>

      <div style={{ display: activeTab === 'walsworth' ? 'block' : 'none' }}>
        <DigitalJournals embedded={true} externalSearch={search} forceSource="walsworth" />
      </div>
      <div style={{ display: activeTab === 'google' ? 'block' : 'none' }}>
        <DigitalJournals embedded={true} externalSearch={search} forceSource="google" />
      </div>
      <div style={{ display: activeTab === 'youtube' ? 'block' : 'none' }}>
        <VideoMetrics embedded={true} externalSearch={search} forceSource="youtube" />
      </div>
      <div style={{ display: activeTab === 'vimeo' ? 'block' : 'none' }}>
        <VideoMetrics embedded={true} externalSearch={search} forceSource="vimeo" />
      </div>
      <div style={{ display: activeTab === 'linkedin' ? 'block' : 'none' }}>
        <SocialMetrics embedded={true} externalSearch={search} forcePlatform="linkedin" />
      </div>
      <div style={{ display: activeTab === 'facebook' ? 'block' : 'none' }}>
        <SocialMetrics embedded={true} externalSearch={search} forcePlatform="facebook" />
      </div>
      <div style={{ display: activeTab === 'instagram' ? 'block' : 'none' }}>
        <SocialMetrics embedded={true} externalSearch={search} forcePlatform="instagram" />
      </div>
    </div>
  );
};

export default ContentPerformancePage;