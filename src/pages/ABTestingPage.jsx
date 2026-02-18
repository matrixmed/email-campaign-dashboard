import React, { useState, useEffect, useMemo, useCallback } from 'react';
import _ from 'lodash';
import TestCard from '../components/ab-testing/TestCard';
import HistoricalResults from '../components/ab-testing/HistoricalResults';
import { API_BASE_URL } from '../config/api';
import '../styles/ABTestingPage.css';
import '../styles/AnalyticsHub.css';

const ABTestingPage = () => {
  const [metricsData, setMetricsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storedTests, setStoredTests] = useState([]);
  const [dropdownOptions, setDropdownOptions] = useState({ categories: [], markets: [], subcategories: [] });

  const [filterCategory, setFilterCategory] = useState('');
  const [filterMarket, setFilterMarket] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [activeTab, setActiveTab] = useState('active');

  const defaultCategories = [];
  const defaultSubcategories = [];

  useEffect(() => {
    Promise.all([fetchCampaignData(), fetchStoredTests(), fetchDropdownOptions(), fetchMarkets()]);
  }, []);

  const fetchCampaignData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ab-testing/campaigns`);
      const data = await res.json();
      if (data.status === 'success') {
        setMetricsData(data.campaigns || []);
      }
    } catch (error) {
      console.error('Failed to fetch campaign data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStoredTests = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ab-testing/tests`);
      const data = await res.json();
      if (data.status === 'success') {
        setStoredTests(data.tests || []);
      }
    } catch (e) {}

  };

  const fetchDropdownOptions = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ab-testing/dropdown-options`);
      const data = await res.json();
      if (data.status === 'success') {
        setDropdownOptions(data);
      }
    } catch (e) {}
  };

  const fetchMarkets = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/ab-testing/markets`);
      const data = await res.json();
      if (data.status === 'success') {
        setDropdownOptions(prev => ({
          ...prev,
          markets: [...new Set([...(prev.markets || []), ...(data.markets || [])])].sort()
        }));
      }
    } catch (e) {}
  };

  const cleanCampaignName = (name) => {
    return name.split(/\s*[-–—]\s*deployment\s*#?\d+|\s+deployment\s*#?\d+/i)[0].trim();
  };

  const stripAbGroup = (name) => {
    return name.replace(/\s*[-–—]\s*group\s+[a-z]\b/i, '').trim();
  };

  const extractGroupLabel = (name) => {
    const match = name.match(/[-–—]\s*group\s+([a-z])\b/i);
    return match ? match[1].toUpperCase() : null;
  };

  const detectedTests = useMemo(() => {
    if (!metricsData || metricsData.length === 0) return [];

    const abCampaigns = metricsData.filter(item =>
      /[-–—]\s*group\s+[a-z]\b/i.test(item.Campaign) && (item.Delivered || 0) >= 100
    );

    if (abCampaigns.length === 0) return [];

    const byCleanName = _.groupBy(abCampaigns, item => cleanCampaignName(item.Campaign));

    const deploymentMerged = Object.entries(byCleanName).map(([campaignName, deployments]) => {
      if (deployments.length === 1) {
        return { ...deployments[0], Campaign: campaignName };
      }

      const deployment1 = deployments.find(d => {
        const name = d.Campaign.toLowerCase();
        return name.includes('deployment 1') || name.includes('deployment #1') || name.includes('deployment1');
      });
      const baseDeployment = deployment1 || deployments[0];

      return {
        Campaign: campaignName,
        Send_Date: baseDeployment.Send_Date,
        Sent: baseDeployment.Sent,
        Delivered: baseDeployment.Delivered,
        Unique_Opens: _.sumBy(deployments, 'Unique_Opens'),
        Total_Opens: _.sumBy(deployments, 'Total_Opens'),
        Unique_Clicks: _.sumBy(deployments, 'Unique_Clicks'),
        Total_Clicks: _.sumBy(deployments, 'Total_Clicks'),
        Hard_Bounces: _.sumBy(deployments, 'Hard_Bounces'),
        Soft_Bounces: _.sumBy(deployments, 'Soft_Bounces'),
        Total_Bounces: _.sumBy(deployments, 'Total_Bounces'),
        Filtered_Bot_Clicks: _.sumBy(deployments, 'Filtered_Bot_Clicks'),
      };
    });

    const withRates = deploymentMerged.map(d => ({
      ...d,
      Unique_Open_Rate: d.Delivered > 0 ? (d.Unique_Opens / d.Delivered) * 100 : 0,
      Total_Open_Rate: d.Delivered > 0 ? (d.Total_Opens / d.Delivered) * 100 : 0,
      Unique_Click_Rate: d.Unique_Opens > 0 ? (d.Unique_Clicks / d.Unique_Opens) * 100 : 0,
      Total_Click_Rate: d.Total_Opens > 0 ? (d.Total_Clicks / d.Total_Opens) * 100 : 0,
    }));

    const byBaseName = _.groupBy(withRates, item => stripAbGroup(item.Campaign));

    return Object.entries(byBaseName)
      .filter(([, items]) => items.length >= 2)
      .map(([baseName, items]) => {
        const stored = storedTests.find(t => t.base_campaign_name === baseName);

        const groups = items
          .map(item => {
            const label = extractGroupLabel(item.Campaign);
            if (!label) return null;

            const storedGroup = stored?.groups?.find(g => g.group_label === label);

            return {
              label,
              campaignNamePattern: item.Campaign,
              dbId: storedGroup?.id || null,
              subcategory: storedGroup?.subcategory || '',
              notes: storedGroup?.notes || '',
              sendTime: item.Send_Date || '',
              metrics: {
                Sent: item.Sent || 0,
                Delivered: item.Delivered || 0,
                Unique_Opens: item.Unique_Opens || 0,
                Total_Opens: item.Total_Opens || 0,
                Unique_Open_Rate: item.Unique_Open_Rate || 0,
                Total_Open_Rate: item.Total_Open_Rate || 0,
                Unique_Clicks: item.Unique_Clicks || 0,
                Total_Clicks: item.Total_Clicks || 0,
                Unique_Click_Rate: item.Unique_Click_Rate || 0,
                Total_Click_Rate: item.Total_Click_Rate || 0,
                Hard_Bounces: item.Hard_Bounces || 0,
                Soft_Bounces: item.Soft_Bounces || 0,
                Total_Bounces: item.Total_Bounces || 0,
                Filtered_Bot_Clicks: item.Filtered_Bot_Clicks || 0,
              }
            };
          })
          .filter(Boolean)
          .sort((a, b) => a.label.localeCompare(b.label));

        return {
          baseName,
          groups,
          sendDate: items[0]?.Send_Date,
          metadata: stored ? {
            id: stored.id,
            description: stored.description,
            category: stored.category,
            market: stored.market,
            notes: stored.notes,
            status: stored.status
          } : null
        };
      })
      .sort((a, b) => {
        const dateA = a.sendDate ? new Date(a.sendDate) : new Date(0);
        const dateB = b.sendDate ? new Date(b.sendDate) : new Date(0);
        return dateB - dateA;
      });
  }, [metricsData, storedTests]);

  const dbActiveTests = useMemo(() => {
    const detectedNames = new Set(detectedTests.map(t => t.baseName));
    return storedTests
      .filter(st => st.status === 'active' && !detectedNames.has(st.base_campaign_name))
      .map(st => {
        const groups = (st.groups || []).map(g => {
          let metrics = {
            Sent: 0, Delivered: 0,
            Unique_Opens: 0, Total_Opens: 0,
            Unique_Open_Rate: 0, Total_Open_Rate: 0,
            Unique_Clicks: 0, Total_Clicks: 0,
            Unique_Click_Rate: 0, Total_Click_Rate: 0,
            Hard_Bounces: 0, Soft_Bounces: 0,
            Total_Bounces: 0, Filtered_Bot_Clicks: 0,
          };
          let displayNotes = g.notes || '';

          if (g.notes) {
            try {
              const parsed = JSON.parse(g.notes);
              if (parsed.metrics) {
                metrics = { ...metrics, ...parsed.metrics };
                displayNotes = '';
              }
            } catch {}
          }

          return {
            label: g.group_label,
            campaignNamePattern: g.campaign_name_pattern || `${st.base_campaign_name} - Group ${g.group_label}`,
            dbId: g.id,
            subcategory: g.subcategory || '',
            notes: displayNotes,
            metrics
          };
        }).sort((a, b) => a.label.localeCompare(b.label));

        return {
          baseName: st.base_campaign_name,
          groups,
          sendDate: st.created_at,
          metadata: {
            id: st.id,
            description: st.description,
            category: st.category,
            market: st.market,
            notes: st.notes,
            status: st.status
          }
        };
      });
  }, [storedTests, detectedTests]);

  const allTests = useMemo(() => {
    return [...detectedTests, ...dbActiveTests].sort((a, b) => {
      const dateA = a.sendDate ? new Date(a.sendDate) : new Date(0);
      const dateB = b.sendDate ? new Date(b.sendDate) : new Date(0);
      return dateB - dateA;
    });
  }, [detectedTests, dbActiveTests]);

  const filteredTests = useMemo(() => {
    return allTests.filter(test => {
      if (filterCategory && test.metadata?.category !== filterCategory) return false;
      if (filterMarket && test.metadata?.market !== filterMarket) return false;
      if (filterStatus && test.metadata?.status !== filterStatus) return false;
      return true;
    });
  }, [allTests, filterCategory, filterMarket, filterStatus]);

  const categoryOptions = useMemo(() => {
    return [...new Set([
      ...defaultCategories,
      ...(dropdownOptions.categories || []),
      ...allTests.map(t => t.metadata?.category).filter(Boolean)
    ])].sort();
  }, [dropdownOptions.categories, allTests]);

  const marketOptions = useMemo(() => {
    return [...new Set([
      ...(dropdownOptions.markets || []),
      ...allTests.map(t => t.metadata?.market).filter(Boolean)
    ])].sort();
  }, [dropdownOptions.markets, allTests]);

  const subcategoryOptions = useMemo(() => {
    return [...new Set([
      ...defaultSubcategories,
      ...(dropdownOptions.subcategories || [])
    ])].sort();
  }, [dropdownOptions.subcategories]);

  const handleMetadataChanged = useCallback((updatedTest) => {
    setStoredTests(prev => {
      const idx = prev.findIndex(t => t.base_campaign_name === updatedTest.base_campaign_name);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = updatedTest;
        return updated;
      }
      return [...prev, updatedTest];
    });
  }, []);

  return (
    <div className="ab-testing-page analytics-hub">
      <div className="page-header">
        <h1>A/B Testing</h1>
      </div>

      <div className="analytics-tabs-container">
        <div className="analytics-tabs">
          <button
            className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            <span>Active Tests ({loading ? '...' : filteredTests.length})</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'historical' ? 'active' : ''}`}
            onClick={() => setActiveTab('historical')}
          >
            <span>Historical Results</span>
          </button>
        </div>
        <div className="tab-controls">
          <select
            className="ab-filter-select"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="ab-filter-select"
            value={filterMarket}
            onChange={(e) => setFilterMarket(e.target.value)}
          >
            <option value="">All Markets</option>
            {marketOptions.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {activeTab === 'active' && (
            <select
              className="ab-filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="ab-loading">
          <div className="ab-loading-spinner"></div>
          <span>Loading campaign data...</span>
        </div>
      ) : activeTab === 'active' ? (
        <>
          {filteredTests.length === 0 ? (
            <div className="ab-empty-state">
              <div className="ab-empty-icon">&#9878;</div>
              <h3>No A/B Tests Detected</h3>
              <p>
                A/B tests are auto-detected from campaigns with "Group A", "Group B", etc. in their names.
                {allTests.length > 0 && filterCategory && ' Try removing filters.'}
              </p>
            </div>
          ) : (
            <div className="ab-tests-list">
              {filteredTests.map(test => (
                <TestCard
                  key={test.baseName}
                  test={test}
                  categoryOptions={categoryOptions}
                  marketOptions={marketOptions}
                  subcategoryOptions={subcategoryOptions}
                  onMetadataChanged={handleMetadataChanged}
                />
              ))}
            </div>
          )}
        </>
      ) : null}

      {!loading && activeTab === 'historical' && (
        <HistoricalResults
          filterCategory={filterCategory}
          filterMarket={filterMarket}
        />
      )}
    </div>
  );
};

export default ABTestingPage;