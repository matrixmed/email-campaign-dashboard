import React, { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../../config/api';
import { useSearch } from '../../context/SearchContext';
import BasisOverview from './BasisOverview';
import ExchangeScorecard from './ExchangeScorecard';
import BrandAnalysis from './BrandAnalysis';
import BidAnalysis from './BidAnalysis';
import BasisDomains from './BasisDomains';
import BasisRecommendations from './BasisRecommendations';
import '../../styles/BasisSection.css';

const BasisSection = () => {
  const { searchTerms, setSearchTerm: setGlobalSearchTerm } = useSearch();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState(searchTerms.basisOptimization || '');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [timeframe, setTimeframe] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [timeframeOpen, setTimeframeOpen] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const timeframeRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (timeframeRef.current && !timeframeRef.current.contains(event.target)) {
        setTimeframeOpen(false);
        if (showCustomPicker && timeframe !== 'custom') {
          setShowCustomPicker(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCustomPicker, timeframe]);

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const recRes = await fetch(`${API_BASE_URL}/api/basis/recommendations?status=pending`);
        const recData = await recRes.json();
        if (recData.status === 'success') {
          setPendingCount(recData.recommendations?.length || 0);
        }
      } catch (err) {
      }
    };
    fetchPendingCount();
  }, []);

  useEffect(() => {
    const fetchLastUpdated = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/basis/last-updated`);
        const data = await res.json();
        if (data.status === 'success' && data.last_updated) {
          setLastUpdated(data.last_updated);
        }
      } catch (err) {
      }
    };
    fetchLastUpdated();
  }, []);

  const formatLastUpdated = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setGlobalSearchTerm('basisOptimization', value);
  };

  const timeframeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'last_3_months', label: 'Last 3 Months' },
    { value: 'last_6_months', label: 'Last 6 Months' },
    { value: 'last_year', label: 'Last Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const getDateRange = () => {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    let startDate = null;

    switch (timeframe) {
      case 'last_week': {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        startDate = d.toISOString().split('T')[0];
        break;
      }
      case 'last_month': {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        startDate = d.toISOString().split('T')[0];
        break;
      }
      case 'last_3_months': {
        const d = new Date();
        d.setMonth(d.getMonth() - 3);
        startDate = d.toISOString().split('T')[0];
        break;
      }
      case 'last_6_months': {
        const d = new Date();
        d.setMonth(d.getMonth() - 6);
        startDate = d.toISOString().split('T')[0];
        break;
      }
      case 'last_year': {
        const d = new Date();
        d.setFullYear(d.getFullYear() - 1);
        startDate = d.toISOString().split('T')[0];
        break;
      }
      case 'custom':
        return {
          startDate: customStartDate || null,
          endDate: customEndDate || endDate
        };
      default:
        return { startDate: null, endDate: null };
    }

    return { startDate, endDate };
  };

  const handleTimeframeSelect = (value) => {
    if (value === 'custom') {
      setShowCustomPicker(true);
      setTimeframeOpen(false);
    } else {
      setTimeframe(value);
      setTimeframeOpen(false);
      setShowCustomPicker(false);
    }
  };

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      setTimeframe('custom');
      setShowCustomPicker(false);
    }
  };

  const getTimeframeLabel = () => {
    if (timeframe === 'custom' && customStartDate && customEndDate) {
      return `${customStartDate} - ${customEndDate}`;
    }
    return timeframeOptions.find(o => o.value === timeframe)?.label || 'All Time';
  };

  const dateRange = getDateRange();

  return (
    <div className="basis-section">
      <div className="page-header">
        <h1>Basis Optimization</h1>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search"
            value={searchTerm}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>
      </div>

      <div className="basis-tabs-container">
        <div className="basis-tabs">
          <button
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span>Overview</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'bids' ? 'active' : ''}`}
            onClick={() => setActiveTab('bids')}
          >
            <span>Bid</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'exchanges' ? 'active' : ''}`}
            onClick={() => setActiveTab('exchanges')}
          >
            <span>Exchange</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'brands' ? 'active' : ''}`}
            onClick={() => setActiveTab('brands')}
          >
            <span>Brand</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'domains' ? 'active' : ''}`}
            onClick={() => setActiveTab('domains')}
          >
            <span>Domain</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'recommendations' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommendations')}
          >
            <span>Recommendations{pendingCount > 0 ? ` (${pendingCount})` : ''}</span>
          </button>
        </div>

        {(activeTab === 'overview' || activeTab === 'recommendations') && lastUpdated && (
          <div className="tab-controls">
            <div className="last-updated-tag">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M7 4V7L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Last updated: {formatLastUpdated(lastUpdated)}</span>
            </div>
          </div>
        )}

        {(activeTab === 'exchanges' || activeTab === 'brands' || activeTab === 'bids' || activeTab === 'domains') && (
          <div className="tab-controls">
            <div className="control-group" ref={timeframeRef}>
              <div className="custom-dropdown timeframe-dropdown">
                <button
                  className="custom-dropdown-trigger"
                  onClick={() => setTimeframeOpen(!timeframeOpen)}
                >
                  <svg className="calendar-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="2" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M1 5.5H13" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M4 1V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M10 1V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span className="dropdown-value">{getTimeframeLabel()}</span>
                  <svg className={`dropdown-arrow ${timeframeOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 12 12">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {timeframeOpen && (
                  <div className="custom-dropdown-menu timeframe-menu">
                    {timeframeOptions.map(option => (
                      <div
                        key={option.value}
                        className={`custom-dropdown-option ${timeframe === option.value ? 'selected' : ''}`}
                        onClick={() => handleTimeframeSelect(option.value)}
                      >
                        {option.label}
                      </div>
                    ))}
                  </div>
                )}
                {showCustomPicker && (
                  <div className="custom-date-picker">
                    <div className="date-picker-header">
                      <span>Select Date Range</span>
                      <button className="close-picker" onClick={() => setShowCustomPicker(false)}>×</button>
                    </div>
                    <div className="date-picker-body">
                      <div className="date-field">
                        <label>Start Date</label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                        />
                      </div>
                      <div className="date-field">
                        <label>End Date</label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="date-picker-footer">
                      <button className="btn-cancel" onClick={() => setShowCustomPicker(false)}>Cancel</button>
                      <button className="btn-apply" onClick={handleCustomDateApply}>Apply</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="basis-content">
        {activeTab === 'overview' && (
          <BasisOverview searchTerm={searchTerm} />
        )}
        {activeTab === 'exchanges' && (
          <ExchangeScorecard
            searchTerm={searchTerm}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
          />
        )}
        {activeTab === 'brands' && (
          <BrandAnalysis
            searchTerm={searchTerm}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
          />
        )}
        {activeTab === 'bids' && (
          <BidAnalysis
            searchTerm={searchTerm}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
          />
        )}
        {activeTab === 'domains' && (
          <BasisDomains
            searchTerm={searchTerm}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
          />
        )}
        {activeTab === 'recommendations' && (
          <BasisRecommendations
            searchTerm={searchTerm}
            onUpdate={() => {}}
          />
        )}
      </div>
    </div>
  );
};

export default BasisSection;