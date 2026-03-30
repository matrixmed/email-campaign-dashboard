import React, { useState } from 'react';
import Opportunities from './Opportunities';
import CompanyProfile from './CompanyProfile';
import PharmaPipeline from './PharmaPipeline';
import PDUFACalendar from './PDUFACalendar';
import KOLInsights from './KOLInsights';
import ResearchTrends from './ResearchTrends';
import PatentWatch from './PatentWatch';
import MarketBenchmarks from './MarketBenchmarks';
import '../../styles/MarketIntelligence.css';

const MarketIntelligenceSection = () => {
  const [activeTab, setActiveTab] = useState('opportunities');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);

  const tabs = [
    { key: 'opportunities', label: 'Opportunities' },
    { key: 'pipeline', label: 'Pharma Pipeline' },
    { key: 'pdufa', label: 'PDUFA Calendar' },
    { key: 'kol', label: 'KOL Insights' },
    { key: 'research', label: 'Research Trends' },
    { key: 'patents', label: 'Patent Watch' },
    { key: 'benchmarks', label: 'Benchmarks' },
  ];

  const handleSelectCompany = (company) => {
    setSelectedCompany(company);
    setActiveTab('company');
  };

  const handleBackToOpportunities = () => {
    setSelectedCompany(null);
    setActiveTab('opportunities');
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    setSearchTerm('');
    if (key !== 'company') {
      setSelectedCompany(null);
    }
  };

  return (
    <div className="mi-section">
      <div className="page-header">
        <h1>Market Intelligence</h1>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="mi-tabs-container">
        <div className="mi-tabs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`tab-button ${activeTab === tab.key || (tab.key === 'opportunities' && activeTab === 'company') ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.key)}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mi-content">
        {activeTab === 'opportunities' && <Opportunities searchTerm={searchTerm} onSelectCompany={handleSelectCompany} />}
        {activeTab === 'company' && selectedCompany && <CompanyProfile companyName={selectedCompany} onBack={handleBackToOpportunities} />}
        {activeTab === 'pipeline' && <PharmaPipeline searchTerm={searchTerm} />}
        {activeTab === 'pdufa' && <PDUFACalendar searchTerm={searchTerm} />}
        {activeTab === 'kol' && <KOLInsights searchTerm={searchTerm} />}
        {activeTab === 'research' && <ResearchTrends />}
        {activeTab === 'patents' && <PatentWatch searchTerm={searchTerm} />}
        {activeTab === 'benchmarks' && <MarketBenchmarks />}
      </div>
    </div>
  );
};

export default MarketIntelligenceSection;