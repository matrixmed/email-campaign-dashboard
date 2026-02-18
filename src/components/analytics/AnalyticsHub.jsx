import React, { useState, useCallback } from 'react';
import '../../styles/AnalyticsHub.css';
import MonthlyEngagementChart from './MonthlyEngagementChart';
import YearlyTrends from './YearlyTrends';
import AnomalyDetection from './AnomalyDetection';
import TimingIntelligence from './TimingIntelligence';
import CampaignBenchmarks from './CampaignBenchmarks';
import SpecialtyBreakdown from './SpecialtyBreakdown';
import ClickAnalytics from './ClickAnalytics';
import SubjectLineAnalysis from './SubjectLineAnalysis';
import GeographicRates from './GeographicRates';
import { useSearch } from '../../context/SearchContext';

const AnalyticsHub = () => {
  const { searchTerms, setSearchTerm: setGlobalSearchTerm } = useSearch();
  const [activeView, setActiveView] = useState('monthly');
  const [searchTerm, setSearchTerm] = useState(searchTerms.campaignAnalytics || '');
  const [selectedMetric, setSelectedMetric] = useState('Unique_Open_Rate');
  const [analyzeBy, setAnalyzeBy] = useState('content');
  const [detectByDisease, setDetectByDisease] = useState(false);
  const [selectedYearlyMetrics, setSelectedYearlyMetrics] = useState(['Unique_Open_Rate', 'Total_Open_Rate', 'Unique_Click_Rate', 'Total_Click_Rate']);
  const [availableYears, setAvailableYears] = useState([]);
  const [selectedYears, setSelectedYears] = useState(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);
  });

  const metricOptions = [
    { key: 'Unique_Open_Rate', label: 'Unique Open Rate', color: '#0ff' },
    { key: 'Total_Open_Rate', label: 'Total Open Rate', color: '#00cc99' },
    { key: 'Unique_Click_Rate', label: 'Unique Click Rate', color: '#38bdf8' },
    { key: 'Total_Click_Rate', label: 'Total Click Rate', color: '#ffd93d' },
  ];


  const handleYearlyMetricToggle = (metricKey) => {
    setSelectedYearlyMetrics(prev => {
      if (prev.includes(metricKey)) {
        if (prev.length === 1) return prev;
        return prev.filter(m => m !== metricKey);
      }
      return [...prev, metricKey];
    });
  };

  const handleYearToggle = (year) => {
    setSelectedYears(prev => {
      if (prev.includes(year)) {
        if (prev.length === 1) return prev;
        return prev.filter(y => y !== year);
      }
      return [...prev, year].sort((a, b) => a - b);
    });
  };

  const handleAvailableYears = useCallback((years) => {
    setAvailableYears(prev => {
      if (prev.length === years.length && prev.every((y, i) => y === years[i])) return prev;
      return years;
    });
  }, []);

  const [visitedTabs, setVisitedTabs] = useState({ monthly: true });

  const [clearKeys, setClearKeys] = useState({
    timing: 0,
    benchmarks: 0,
    geographic: 0,
    specialty: 0,
    clicks: 0,
    'subject-lines': 0,
    'geographic-rates': 0,
    deliverability: 0,
    journeys: 0
  });

  const cacheableTabs = ['timing', 'benchmarks', 'geographic', 'specialty', 'clicks', 'subject-lines', 'geographic-rates', 'deliverability', 'journeys'];

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

  return (
    <div className="analytics-hub">
      <div className="page-header">
        <h1>Campaign Analytics</h1>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setGlobalSearchTerm('campaignAnalytics', e.target.value);
            }}
            className="search-input"
          />
        </div>
      </div>

      <div className="analytics-tabs">
        <button className={`tab-button ${activeView === 'monthly' ? 'active' : ''}`} onClick={() => handleTabChange('monthly')}>Monthly Trends</button>
        <button className={`tab-button ${activeView === 'yearly' ? 'active' : ''}`} onClick={() => handleTabChange('yearly')}>Yearly Trends</button>
        <button className={`tab-button ${activeView === 'benchmarks' ? 'active' : ''}`} onClick={() => handleTabChange('benchmarks')}>Campaign Benchmarks</button>
        <button className={`tab-button ${activeView === 'anomaly' ? 'active' : ''}`} onClick={() => handleTabChange('anomaly')}>Anomaly Detection</button>
        <button className={`tab-button ${activeView === 'subject-lines' ? 'active' : ''}`} onClick={() => handleTabChange('subject-lines')}>Subject Lines</button>
        <button className={`tab-button ${activeView === 'clicks' ? 'active' : ''}`} onClick={() => handleTabChange('clicks')}>Click Analytics</button>
        <button className={`tab-button ${activeView === 'specialty' ? 'active' : ''}`} onClick={() => handleTabChange('specialty')}>Specialty Breakdown</button>
        <button className={`tab-button ${activeView === 'geographic-rates' ? 'active' : ''}`} onClick={() => handleTabChange('geographic-rates')}>Geographic Rates</button>
        <button className={`tab-button ${activeView === 'timing' ? 'active' : ''}`} onClick={() => handleTabChange('timing')}>Timing Intelligence</button>
      </div>

      <div className="analytics-content">
        <div style={{ display: activeView === 'monthly' ? 'block' : 'none' }}>
          <MonthlyEngagementChart
            searchTerm={searchTerm}
            selectedMetric={selectedMetric}
            selectedYears={selectedYears}
            onAvailableYears={handleAvailableYears}
            metricOptions={metricOptions}
            onMetricChange={setSelectedMetric}
            availableYears={availableYears}
            onYearToggle={handleYearToggle}
          />
        </div>
        <div style={{ display: activeView === 'yearly' ? 'block' : 'none' }}>
          <YearlyTrends
            searchTerm={searchTerm}
            selectedMetrics={selectedYearlyMetrics}
            selectedYears={selectedYears}
            metricOptions={metricOptions}
            onMetricToggle={handleYearlyMetricToggle}
            availableYears={availableYears}
            onYearToggle={handleYearToggle}
          />
        </div>
        <div style={{ display: activeView === 'anomaly' ? 'block' : 'none' }}>
          <AnomalyDetection
            searchTerm={searchTerm}
            detectByDisease={detectByDisease}
            analyzeBy={analyzeBy}
            onAnalyzeByChange={setAnalyzeBy}
            onDetectByDiseaseChange={setDetectByDisease}
          />
        </div>

        {visitedTabs.timing && (
          <div style={{ display: activeView === 'timing' ? 'block' : 'none' }}>
            <TimingIntelligence key={`timing-${clearKeys.timing}`} onClearCache={handleClearCache} />
          </div>
        )}
        {visitedTabs.benchmarks && (
          <div style={{ display: activeView === 'benchmarks' ? 'block' : 'none' }}>
            <CampaignBenchmarks key={`benchmarks-${clearKeys.benchmarks}`} onClearCache={handleClearCache} />
          </div>
        )}
        {visitedTabs.specialty && (
          <div style={{ display: activeView === 'specialty' ? 'block' : 'none' }}>
            <SpecialtyBreakdown key={`specialty-${clearKeys.specialty}`} searchTerm={searchTerm} />
          </div>
        )}
        {visitedTabs.clicks && (
          <div style={{ display: activeView === 'clicks' ? 'block' : 'none' }}>
            <ClickAnalytics key={`clicks-${clearKeys.clicks}`} searchTerm={searchTerm} />
          </div>
        )}
        {visitedTabs['subject-lines'] && (
          <div style={{ display: activeView === 'subject-lines' ? 'block' : 'none' }}>
            <SubjectLineAnalysis key={`subject-lines-${clearKeys['subject-lines']}`} searchTerm={searchTerm} />
          </div>
        )}
        {visitedTabs['geographic-rates'] && (
          <div style={{ display: activeView === 'geographic-rates' ? 'block' : 'none' }}>
            <GeographicRates key={`geographic-rates-${clearKeys['geographic-rates']}`} searchTerm={searchTerm} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsHub;