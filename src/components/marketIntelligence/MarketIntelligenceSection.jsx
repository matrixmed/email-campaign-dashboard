import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';
import ClientHistory from './ClientHistory';
import FDAAlerts from './FDAAlerts';
import PharmaPipeline from './PharmaPipeline';
import PDUFACalendar from './PDUFACalendar';
import KOLInsights from './KOLInsights';
import DrugSpending from './DrugSpending';
import ResearchTrends from './ResearchTrends';
import PatentWatch from './PatentWatch';
import MarketBenchmarks from './MarketBenchmarks';
import CompanyModal from './CompanyModal';
import '../../styles/MarketIntelligence.css';

const TAB_DATA_MAP = {
  clients: 'client_history',
  fda: 'fda_approvals',
  pipeline: 'clinical_trials',
  pdufa: 'pdufa_dates',
  kol: 'open_payments',
  spending: 'drug_spending',
  research: null,
  patents: 'patent_expirations',
  benchmarks: 'market_benchmarks',
};

const formatLastUpdated = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const MarketIntelligenceSection = () => {
  const [activeTab, setActiveTab] = useState('clients');
  const [searchTerm, setSearchTerm] = useState('');
  const [modalCompany, setModalCompany] = useState(null);
  const [lastUpdated, setLastUpdated] = useState({});

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/market-intelligence/summary`);
        const json = await res.json();
        if (json.status === 'success' && json.last_updated) {
          setLastUpdated(json.last_updated);
        }
      } catch (err) {}
    };
    fetchSummary();
  }, []);

  const tabs = [
    { key: 'clients', label: 'Client History' },
    { key: 'fda', label: 'FDA Alerts' },
    { key: 'pipeline', label: 'Clinical Trials' },
    { key: 'pdufa', label: 'PDUFA Calendar' },
    { key: 'kol', label: 'KOL Insights' },
    { key: 'spending', label: 'Drug Spending' },
    { key: 'research', label: 'Research Trends' },
    { key: 'patents', label: 'Patent Watch' },
    { key: 'benchmarks', label: 'Benchmarks' },
  ];

  const handleTabChange = (key) => {
    setActiveTab(key);
    setSearchTerm('');
  };

  const openCompanyModal = (name) => {
    setModalCompany(name);
  };

  const getLastUpdatedForTab = (tabKey) => {
    if (tabKey === 'research') {
      const pubmed = formatLastUpdated(lastUpdated.pubmed_trends);
      const reddit = formatLastUpdated(lastUpdated.reddit);
      if (pubmed && reddit) return `PubMed: ${pubmed} | Reddit: ${reddit}`;
      return pubmed || reddit || null;
    }
    const dataKey = TAB_DATA_MAP[tabKey];
    if (!dataKey) return null;
    return formatLastUpdated(lastUpdated[dataKey]);
  };

  const currentLastUpdated = getLastUpdatedForTab(activeTab);

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
              className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.key)}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mi-content">
        {activeTab === 'clients' && <ClientHistory searchTerm={searchTerm} onSelectCompany={openCompanyModal} lastUpdated={currentLastUpdated} />}
        {activeTab === 'fda' && <FDAAlerts searchTerm={searchTerm} onSelectCompany={openCompanyModal} lastUpdated={currentLastUpdated} />}
        {activeTab === 'pipeline' && <PharmaPipeline searchTerm={searchTerm} onSelectCompany={openCompanyModal} lastUpdated={currentLastUpdated} />}
        {activeTab === 'pdufa' && <PDUFACalendar searchTerm={searchTerm} onSelectCompany={openCompanyModal} lastUpdated={currentLastUpdated} />}
        {activeTab === 'kol' && <KOLInsights searchTerm={searchTerm} onSelectCompany={openCompanyModal} lastUpdated={currentLastUpdated} />}
        {activeTab === 'spending' && <DrugSpending searchTerm={searchTerm} onSelectCompany={openCompanyModal} lastUpdated={currentLastUpdated} />}
        {activeTab === 'research' && <ResearchTrends lastUpdated={getLastUpdatedForTab('research')} />}
        {activeTab === 'patents' && <PatentWatch searchTerm={searchTerm} onSelectCompany={openCompanyModal} lastUpdated={currentLastUpdated} />}
        {activeTab === 'benchmarks' && <MarketBenchmarks lastUpdated={currentLastUpdated} />}
      </div>

      {modalCompany && (
        <CompanyModal companyName={modalCompany} onClose={() => setModalCompany(null)} />
      )}
    </div>
  );
};

export default MarketIntelligenceSection;
