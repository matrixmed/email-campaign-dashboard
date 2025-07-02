import React, { useState, useCallback } from 'react';
import { THEME_INFO, AVAILABLE_METRICS, TABLE_TYPES } from './template/LayoutTemplates';

const ComponentSidebar = ({ 
  isOpen, 
  onToggle,
  campaigns = [],
  selectedCampaign,
  currentTheme,
  specialtyMergeMode,
  onThemeChange,
  onCampaignChange,
  onToggleSpecialtyMerge,
  onAddComponent
}) => {
  const [activeSection, setActiveSection] = useState('controls');
  const [searchTerm, setSearchTerm] = useState('');

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
      count: 0 
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
      'cost_per_engaged_professional': 'Cost Per Engaged Professional',
      'estimated_patient_impact': 'Estimated Patient Impact'
    };

    const component = {
      id: `${metricKey}-${Date.now()}`,
      type: 'metric',
      title: metricDisplayNames[metricKey] || metricKey.replace(/_/g, ' ').toUpperCase(),
      value: selectedCampaign ? getMetricValue(selectedCampaign, metricKey) : 'N/A',
      subtitle: 'Custom metric',
      position: { 
        x: 100 + Math.random() * 200, 
        y: 100 + Math.random() * 200, 
        width: 180, 
        height: 100 
      }
    };

    onAddComponent?.(component);
  }, [selectedCampaign, onAddComponent]);

  const handleAddTable = useCallback((tableType) => {
    const tableConfig = TABLE_TYPES[tableType];
    const component = {
      id: `table-${tableType.toLowerCase()}-${Date.now()}`,
      type: 'table',
      title: tableConfig.title,
      config: {
        customData: tableConfig.defaultData,
        headers: tableConfig.defaultData[0],
        dataType: tableType.toLowerCase()
      },
      position: { 
        x: 100 + Math.random() * 200, 
        y: 100 + Math.random() * 200, 
        width: 400, 
        height: 250 
      }
    };

    onAddComponent?.(component);
  }, [onAddComponent]);

  const handleAddGenericCard = useCallback(() => {
    const component = {
      id: `card-${Date.now()}`,
      type: 'metric',
      title: 'New Card',
      value: '0',
      subtitle: 'Custom card - double click to edit',
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

  const getMetricValue = (campaign, metricKey) => {
    const keys = metricKey.split('.');
    let value = campaign;
    
    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        return 'N/A';
      }
    }
    
    if (typeof value === 'number') {
      if (metricKey.includes('rate') || metricKey.includes('percentage')) {
        return `${value.toFixed(1)}%`;
      }
      return value.toLocaleString();
    }
    
    return value || 'N/A';
  };

  const filteredMetrics = AVAILABLE_METRICS.filter(metric =>
    metric.toLowerCase().includes(searchTerm.toLowerCase())
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
      width: 'auto',
      height: '79vh',
      transition: 'width 0.3s ease',
      boxShadow: '2px 0 10px rgba(0, 0, 0, 0.1)',
      zIndex: 150,
      borderRight: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '0 8px 0px 0',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      overflowX: "hidden",
      overflowY: "auto"
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
                <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px', marginTop: '4px' }}>
                  Changes colors and logo only - layout stays the same
                </div>
              </div>

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
                <h3 style={{ color: 'white', margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
                  Add Components
                </h3>
                
                <input
                  type="text"
                  placeholder="Search metrics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '90%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '14px',
                    marginBottom: '16px'
                  }}
                />
              </div>

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
                  ➕ Add Generic Card
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
                    👨‍⚕️ Authority Metrics
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
                    🗺️ Regional Geographic Distribution
                  </button>
                </div>
              </div>

              <div>
                <h4 style={{ color: 'white', margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
                  Tables
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {Object.entries(TABLE_TYPES).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => handleAddTable(key)}
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
                      📊 {config.title}
                    </button>
                  ))}
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
                  Restore previously deleted components
                </p>
              </div>
              
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComponentSidebar;