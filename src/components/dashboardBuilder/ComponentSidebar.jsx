import React, { useState, useCallback } from 'react';
import { THEME_INFO, AVAILABLE_METRICS, TABLE_TYPES, TABLE_DEFINITIONS } from './template/LayoutTemplates';
import { API_BASE_URL } from '../../config/api';

const ComponentSidebar = ({
  isOpen,
  onToggle,
  campaigns = [],
  selectedCampaign,
  currentTheme,
  costComparisonMode,
  showPatientImpact,
  specialtyMergeMode,
  onThemeChange,
  onCostModeChange,
  onPatientImpactToggle,
  onCampaignChange,
  onToggleSpecialtyMerge,
  onAddComponent,
  deletedCards = [],
  onRestoreCard,
  budgetedCost,
  actualCost,
  onBudgetedCostChange,
  onActualCostChange,
  currentTemplate = 'single',
  selectedTableTypes = {},
  onTableTypeChange,
  onRestoreDashboard
}) => {
  const [activeSection, setActiveSection] = useState('controls');
  const [searchTerm, setSearchTerm] = useState('');
  const [customTableRows, setCustomTableRows] = useState(2);
  const [customTableCols, setCustomTableCols] = useState(2);

  const [savedDashboards, setSavedDashboards] = useState([]);
  const [loadingDashboards, setLoadingDashboards] = useState(false);
  const [archiveSearchTerm, setArchiveSearchTerm] = useState('');

  const fetchSavedDashboards = useCallback(async () => {
    setLoadingDashboards(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboards/list?user_id=default_user`);
      const data = await response.json();
      if (data.status === 'success') {
        setSavedDashboards(data.dashboards);
      }
    } catch (error) {
      console.error('Error fetching dashboards:', error);
    } finally {
      setLoadingDashboards(false);
    }
  }, []);

  const sections = [
    {
      id: 'controls',
      label: 'Controls',
      icon: '⚙️',
      count: 0
    },
    {
      id: 'add-components',
      label: 'Add Components',
      icon: '➕',
      count: AVAILABLE_METRICS.length + Object.keys(TABLE_TYPES).length + 1
    },
    {
      id: 'restore',
      label: 'Restore',
      icon: '♻️',
      count: deletedCards.length
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: '📁',
      count: savedDashboards.length
    }
  ];

  const handleAddMetricCard = useCallback((metricKey) => {
    const metricDisplayNames = {
      'unique_open_rate': 'Unique Open Rate',
      'total_open_rate': 'Total Open Rate', 
      'unique_click_rate': 'Unique Click Rate',
      'total_click_rate': 'Total Click Rate',
      'delivery_rate': 'Delivery Rate',
      '1_hour_open_rate': '1 Hour Open Rate',
      '6_hour_open_rate': '6 Hour Open Rate',
      '12_hour_open_rate': '12 Hour Open Rate',
      '24_hour_open_rate': '24 Hour Open Rate',
      'mobile_engagement_rate': 'Mobile Engagement Rate',
      'average_time_to_open_hours': 'Average Time to Open (Hours)',
      'unique_opens': 'Unique Opens',
      'total_opens': 'Total Opens',
      'unique_clicks': 'Unique Clicks',
      'total_clicks': 'Total Clicks',
      'delivered': 'Delivered',
      'sent': 'Sent',
      'bounces': 'Bounces',
      'estimated_patient_impact': 'Estimated Patient Impact'
    };
  
    const displayTitle = metricDisplayNames[metricKey];
    
    const component = {
      id: `${metricKey}-${Date.now()}`,
      type: 'metric',
      title: displayTitle,
      value: (selectedCampaign || campaigns[0]) ? getMetricValue(selectedCampaign || campaigns[0], metricKey) : 'N/A',
      originalKey: metricKey,
      position: { 
        x: 100 + Math.random() * 200, 
        y: 100 + Math.random() * 200, 
        width: 180, 
        height: 100 
      }
    };
      onAddComponent?.(component);
  }, [selectedCampaign, campaigns, onAddComponent]);

  const handleAddCustomTable = useCallback(() => {
    const rows = Math.max(1, Math.min(8, customTableRows));
    const cols = Math.max(1, Math.min(8, customTableCols)); 
    
    const tableData = [];
    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < cols; j++) {
        if (i === 0) {
          row.push(`Header ${j + 1}`);
        } else {
          row.push(`Row ${i} Col ${j + 1}`);
        }
      }
      tableData.push(row);
    }
    
    const component = {
      id: `custom-table-${rows}x${cols}-${Date.now()}`,
      type: 'table',
      title: `Custom Table (${rows}x${cols})`,
      config: {
        customData: tableData,
        headers: tableData[0],
        dataType: 'custom',
        dimensions: { rows, cols }
      },
      position: { 
        x: 100 + Math.random() * 200, 
        y: 100 + Math.random() * 200, 
        width: Math.max(280, cols * 80), 
        height: Math.max(180, rows * 35) 
      }
    };

    onAddComponent?.(component);
  }, [customTableRows, customTableCols, onAddComponent]);

  const handleAddGenericCard = useCallback(() => {
    const component = {
      id: `card-${Date.now()}`,
      type: 'metric',
      title: 'New Card',
      value: '0',
      subtitle: '',
      position: {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        width: 180,
        height: 100
      }
    };

    onAddComponent?.(component);
  }, [onAddComponent]);

  const handleAddAuthorityMetrics = useCallback(() => {
    const component = {
      id: `authority-${Date.now()}`,
      type: 'table',
      title: 'Authority Metrics',
      config: {
        dataType: 'authority',
        customData: [
          ['Credential', 'Engagement Rate'],
          ['MD', '0.0%'],
          ['DO', '0.0%'],
          ['NP', '0.0%'],
          ['PA', '0.0%']
        ]
      },
      position: { 
        x: 100 + Math.random() * 200, 
        y: 100 + Math.random() * 200, 
        width: 320, 
        height: 160 
      }
    };

    onAddComponent?.(component);
  }, [onAddComponent]);

  const handleAddGeographicDistribution = useCallback(() => {
    const component = {
      id: `geographic-${Date.now()}`,
      type: 'table',
      title: 'Regional Geographic Distribution',
      config: {
        dataType: 'geographic',
        customData: [
          ['Region', 'Engagement Rate', 'Volume'],
          ['Northeast', '0.0%', '0'],
          ['Southeast', '0.0%', '0'],
          ['Midwest', '0.0%', '0'],
          ['West', '0.0%', '0']
        ]
      },
      position: {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        width: 380,
        height: 180
      }
    };

    onAddComponent?.(component);
  }, [onAddComponent]);

  const handleAddLandingPageImpressions = useCallback(() => {
    const component = {
      id: `landing-page-${Date.now()}`,
      type: 'table',
      title: 'Landing Page Impressions',
      config: {
        dataType: 'custom',
        customData: [
          ['728x90', ''],
          ['300x250', '']
        ]
      },
      position: {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        width: 300,
        height: 120
      }
    };

    onAddComponent?.(component);
  }, [onAddComponent]);

  const handleAddVideoMetricsTable = useCallback(() => {
    const component = {
      id: `video-metrics-${Date.now()}`,
      type: 'table',
      title: 'Video Metrics',
      config: {
        dataType: 'custom',
        customData: [
          ['Total Time Watched', ''],
          ['Avg Time Watched', ''],
          ['Total Impressions', '']
        ]
      },
      position: {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        width: 300,
        height: 120
      }
    };

    onAddComponent?.(component);
  }, [onAddComponent]);

  const handleAddJournalMetricsTable = useCallback(() => {
    const component = {
      id: `journal-metrics-${Date.now()}`,
      type: 'table',
      title: 'Online Journal Metrics',
      config: {
        dataType: 'custom',
        customData: [
          ['Avg Time in Issue', ''],
          ['Total Page Views', ''],
          ['Total Issue Visits', '']
        ]
      },
      position: {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        width: 300,
        height: 120
      }
    };

    onAddComponent?.(component);
  }, [onAddComponent]);

  const handleAddSocialMediaTable = useCallback(() => {
    const component = {
      id: `social-media-${Date.now()}`,
      type: 'table',
      title: 'LinkedIn Social Media Metrics',
      config: {
        dataType: 'custom',
        customData: [
          ['Impressions', ''],
          ['Engagement Rate', ''],
          ['CTR', '']
        ]
      },
      position: {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        width: 300,
        height: 120
      }
    };

    onAddComponent?.(component);
  }, [onAddComponent]);

  const getMetricValue = (campaign, metricKey) => {
    if (!campaign) return 'N/A';
    
    const metricMap = {
      'unique_open_rate': () => `${campaign.core_metrics?.unique_open_rate?.toFixed(1) || 0}%`,
      'total_open_rate': () => `${campaign.core_metrics?.total_open_rate?.toFixed(1) || 0}%`,
      'unique_click_rate': () => `${campaign.core_metrics?.unique_click_rate?.toFixed(1) || 0}%`,
      'total_click_rate': () => `${campaign.core_metrics?.total_click_rate?.toFixed(1) || 0}%`,
      'delivery_rate': () => `${campaign.core_metrics?.delivery_rate?.toFixed(1) || 0}%`,
      '1_hour_open_rate': () => `${campaign.core_metrics?.['1_hour_open_rate']?.toFixed(1) || 0}%`,
      '6_hour_open_rate': () => `${campaign.core_metrics?.['6_hour_open_rate']?.toFixed(1) || 0}%`,
      '12_hour_open_rate': () => `${campaign.core_metrics?.['12_hour_open_rate']?.toFixed(1) || 0}%`,
      '24_hour_open_rate': () => `${campaign.core_metrics?.['24_hour_open_rate']?.toFixed(1) || 0}%`,
      'mobile_engagement_rate': () => `${campaign.core_metrics?.mobile_engagement_rate?.toFixed(1) || 0}%`,
      'average_time_to_open_hours': () => `${campaign.core_metrics?.average_time_to_open_hours?.toFixed(1) || 0}h`,
      'unique_opens': () => (campaign.volume_metrics?.unique_opens || 0).toLocaleString(),
      'total_opens': () => (campaign.volume_metrics?.total_opens || 0).toLocaleString(),
      'unique_clicks': () => (campaign.volume_metrics?.unique_clicks || 0).toLocaleString(),
      'total_clicks': () => (campaign.volume_metrics?.total_clicks || 0).toLocaleString(),
      'delivered': () => (campaign.volume_metrics?.delivered || 0).toLocaleString(),
      'sent': () => (campaign.volume_metrics?.sent || 0).toLocaleString(),
      'bounces': () => (campaign.volume_metrics?.bounces || 0).toLocaleString(),
      'estimated_patient_impact': () => (campaign.cost_metrics?.estimated_patient_impact || 0).toLocaleString()
    };
  
    const getValue = metricMap[metricKey];
    return getValue ? getValue() : 'N/A';
  };

  const filteredMetrics = AVAILABLE_METRICS.filter(metric =>
    metric.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDashboards = savedDashboards.filter(dashboard =>
    dashboard.title.toLowerCase().includes(archiveSearchTerm.toLowerCase())
  );

  if (!isOpen) {
    return (
      <div className="dc-component-sidebar">
        <button 
          className="dc-sidebar-toggle"
          onClick={onToggle}
          aria-label="Open sidebar"

        >
          ▶
        </button>
      </div>
    );
  }

  return (
    <div className="dc-component-sidebar dc-open" style={{
      position: 'relative',
      background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
      width: '320px',
      height: '100%',
      transition: 'width 0.3s ease',
      boxShadow: '2px 0 10px rgba(0, 0, 0, 0.1)',
      zIndex: 150,
      borderRight: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>

      <div className="dc-sidebar-content" style={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: '20px 0'
      }}>
        <div className="dc-sidebar-nav" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '0 16px',
          marginBottom: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '20px'
        }}>
          {sections.map(section => (
            <button
              key={section.id}
              className={`dc-nav-button ${activeSection === section.id ? 'dc-active' : ''}`}
              onClick={() => setActiveSection(section.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: activeSection === section.id ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: activeSection === section.id ? 'white' : 'rgba(255, 255, 255, 0.8)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <span>{section.icon}</span>
              <span style={{ flex: 1, textAlign: 'left' }}>{section.label}</span>
              {section.count > 0 && (
                <span style={{ 
                  background: 'rgba(255, 255, 255, 0.2)', 
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  fontSize: '12px' 
                }}>
                  {section.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '0 16px' }}>
          {activeSection === 'controls' && (
            <div className="dc-sidebar-section">
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ color: 'white', margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
                  Dashboard Controls
                </h3>
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={specialtyMergeMode}
                    onChange={onToggleSpecialtyMerge}
                    style={{ margin: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontWeight: '600', marginBottom: '4px' }}>
                      Merge Subspecialties
                    </div>
                  </div>
                </label>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={showPatientImpact}
                    onChange={onPatientImpactToggle}
                    style={{ margin: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontWeight: '600', marginBottom: '4px' }}>
                      Show Patient Impact
                    </div>
                  </div>
                </label>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ color: 'white', display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Color Theme
                </label>
                <select 
                  value={currentTheme} 
                  onChange={(e) => onThemeChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '14px'
                  }}
                >
                  {Object.entries(THEME_INFO).map(([key, info]) => (
                    <option key={key} value={key} style={{ background: '#1e293b', color: 'white' }}>
                      {info.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ color: 'white', display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Cost Comparison Model
                </label>
                <select 
                  value={costComparisonMode} 
                  onChange={(e) => onCostModeChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '14px'
                  }}
                >
                  <option value="none" style={{ background: '#1e293b', color: 'white' }}>
                    None
                  </option>
                  <option value="side-by-side" style={{ background: '#1e293b', color: 'white' }}>
                    Side-by-Side
                  </option>
                  <option value="gauge" style={{ background: '#1e293b', color: 'white' }}>
                    Progress Gauge
                  </option>
                  <option value="stacked" style={{ background: '#1e293b', color: 'white' }}>
                    Compact Stacked
                  </option>
                  <option value="percentage" style={{ background: '#1e293b', color: 'white' }}>
                    Percentage Focus
                  </option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: 'white', display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Budgeted Cost ($)
                </label>
                <input
                  type="number"
                  value={budgetedCost}
                  onChange={(e) => onBudgetedCostChange(parseFloat(e.target.value) || 0)}
                  placeholder="Enter budgeted amount"
                  step="0.01"
                  min=""
                  style={{
                    width: '90%',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ color: 'white', display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Actual Cost ($)
                </label>
                <input
                  type="number"
                  value={actualCost}
                  onChange={(e) => onActualCostChange(parseFloat(e.target.value) || 0)}
                  placeholder="Enter actual amount"
                  step="0.01"
                  min="0"
                  style={{
                    width: '90%',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '14px'
                  }}
                />
              </div>

              {(currentTemplate === 'single-two' || currentTemplate === 'single-three' || currentTemplate === 'multi-two' || currentTemplate === 'multi-three') && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ color: 'white', margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
                    Table Configuration
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {Array.from({ length: (currentTemplate === 'single-two' || currentTemplate === 'multi-two') ? 2 : 3 }, (_, index) => {
                      const tablePosition = index + 1;
                      const currentSelection = selectedTableTypes[`table${tablePosition}`] || TABLE_TYPES.ONLINE_JOURNAL;
                      
                      return (
                        <div key={tablePosition} style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          padding: '12px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                          <label style={{ 
                            color: 'white', 
                            display: 'block', 
                            marginBottom: '6px', 
                            fontWeight: '600',
                            fontSize: '13px'
                          }}>
                            Table {tablePosition}
                          </label>
                          <select 
                            value={currentSelection}
                            onChange={(e) => onTableTypeChange?.(`table${tablePosition}`, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px',
                              borderRadius: '4px',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              background: 'rgba(255, 255, 255, 0.1)',
                              color: 'white',
                              fontSize: '12px'
                            }}
                          >
                            {Object.entries(TABLE_DEFINITIONS).map(([key, definition]) => (
                              <option key={key} value={key} style={{ background: '#1e293b', color: 'white' }}>
                                {definition.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <label style={{ color: 'white', display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Current Campaign
                </label>
                {selectedCampaign ? (
                  <div style={{
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)'
                  }}>
                    <div style={{ color: 'white', fontWeight: '600', marginBottom: '4px' }}>
                      {selectedCampaign.campaign_name}
                    </div>
                    <button
                      onClick={() => onCampaignChange(null)}
                      style={{
                        padding: '6px 12px',
                        background: 'rgba(220, 38, 38, 0.8)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Clear Campaign
                    </button>
                  </div>
                ) : (
                  <select 
                    onChange={(e) => {
                      const campaign = campaigns.find(c => c.campaign_name === e.target.value);
                      onCampaignChange(campaign);
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '14px'
                    }}
                    defaultValue=""
                  >
                    <option value="" style={{ background: '#1e293b', color: 'white' }}>
                      Select Campaign
                    </option>
                    {campaigns.map(campaign => (
                      <option key={campaign.campaign_name} value={campaign.campaign_name} style={{ background: '#1e293b', color: 'white' }}>
                        {campaign.campaign_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {activeSection === 'add-components' && (
            <div className="dc-sidebar-section">

              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: 'white', margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
                  Basic Components
                </h4>
                <button
                  onClick={handleAddGenericCard}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    marginBottom: '8px'
                  }}
                >
                  Add Card
                </button>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: 'white', margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
                  Engagement & Volume Metrics
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {filteredMetrics.map(metric => (
                    <button
                      key={metric}
                      onClick={() => handleAddMetricCard(metric)}
                      style={{
                        padding: '8px 12px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: 'white', margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
                  Special Metrics
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <button
                    onClick={handleAddAuthorityMetrics}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    Authority Metrics
                  </button>
                  <button
                    onClick={handleAddGeographicDistribution}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    Regional Geographic Distribution
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: 'white', margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
                  Ready-Made Tables
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <button
                    onClick={handleAddLandingPageImpressions}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    Landing Page Impressions
                  </button>
                  <button
                    onClick={handleAddVideoMetricsTable}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    Video Metrics
                  </button>
                  <button
                    onClick={handleAddJournalMetricsTable}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    Online Journal Metrics
                  </button>
                  <button
                    onClick={handleAddSocialMediaTable}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    LinkedIn Social Media Metrics
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: 'white', margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
                  Custom Table Builder
                </h4>
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  padding: '12px', 
                  borderRadius: '6px',
                  marginBottom: '12px'
                }}>
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                      Rows (1-8):
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="8"
                      value={customTableRows}
                      onChange={(e) => setCustomTableRows(parseInt(e.target.value))}
                      style={{
                        marginBottom: '4px'
                      }}
                    />
                    <div style={{ color: 'white', fontSize: '14px', fontWeight: '600', textAlign: 'center' }}>
                      {customTableRows} rows
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                      Columns (1-8):
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="8"
                      value={customTableCols}
                      onChange={(e) => setCustomTableCols(parseInt(e.target.value))}
                      style={{
                        marginBottom: '4px'
                      }}
                    />
                    <div style={{ color: 'white', fontSize: '14px', fontWeight: '600', textAlign: 'center' }}>
                      {customTableCols} columns
                    </div>
                  </div>
                  
                  <button
                    onClick={handleAddCustomTable}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Create {customTableRows}×{customTableCols} Table
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'restore' && (
            <div className="dc-sidebar-section">
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ color: 'white', margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
                  Restore Components
                </h3>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', margin: '0 0 16px 0' }}>
                  Click to restore deleted components
                </p>
              </div>

              {deletedCards.length === 0 ? (
                <div style={{
                  padding: '20px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                    No deleted components to restore
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {deletedCards.map((card, index) => (
                    <button
                      key={`${card.id}-${index}`}
                      onClick={() => onRestoreCard?.(card)}
                      style={{
                        padding: '12px',
                        background: 'rgba(34, 197, 94, 0.1)',
                        color: 'white',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = 'rgba(34, 197, 94, 0.2)';
                        e.target.style.borderColor = 'rgba(34, 197, 94, 0.5)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = 'rgba(34, 197, 94, 0.1)';
                        e.target.style.borderColor = 'rgba(34, 197, 94, 0.3)';
                      }}
                    >
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                        {card.title || 'Untitled Component'}
                      </div>
                      <div style={{ fontSize: '12px', opacity: 0.8 }}>
                        {card.type} • {card.value || 'No value'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === 'archive' && (
            <div className="dc-sidebar-section">
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ color: 'white', margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
                  Saved Dashboards
                </h3>
                <input
                  type="text"
                  placeholder="Search dashboards..."
                  value={archiveSearchTerm}
                  onChange={(e) => setArchiveSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    marginBottom: '12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(99, 102, 241, 0.6)';
                    e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                />
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', margin: '0 0 12px 0' }}>
                  Load a previously saved dashboard
                </p>
                <button
                  onClick={fetchSavedDashboards}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '13px',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  {loadingDashboards ? 'Loading...' : 'Refresh List'}
                </button>
              </div>

              {savedDashboards.length === 0 ? (
                <div style={{
                  padding: '20px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                    No saved dashboards found
                  </div>
                </div>
              ) : filteredDashboards.length === 0 ? (
                <div style={{
                  padding: '20px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                    No dashboards match your search
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredDashboards.map((dashboard) => (
                    <div
                      key={dashboard.id}
                      style={{
                        padding: '12px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: '6px'
                      }}
                    >
                      <div style={{ fontWeight: '600', color: 'white', marginBottom: '6px' }}>
                        {dashboard.title}
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                        {new Date(dashboard.updated_at).toLocaleDateString()}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => onRestoreDashboard?.(dashboard.id)}
                          style={{
                            flex: 1,
                            padding: '6px 12px',
                            background: 'rgba(99, 102, 241, 0.2)',
                            border: '1px solid rgba(99, 102, 241, 0.4)',
                            borderRadius: '4px',
                            color: 'white',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Load
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch(`${API_BASE_URL}/api/dashboards/${dashboard.id}`, {
                                method: 'DELETE'
                              });
                              const data = await response.json();
                              if (data.status === 'success') {
                                fetchSavedDashboards();
                              }
                            } catch (error) {
                              console.error('Error deleting dashboard:', error.message);
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            borderRadius: '4px',
                            color: 'white',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComponentSidebar;