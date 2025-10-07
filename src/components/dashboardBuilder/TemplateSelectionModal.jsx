import React, { useState } from 'react';
import { THEMES, THEME_INFO, TEMPLATE_TYPES } from './template/LayoutTemplates';

const TemplateSelectionModal = ({ 
  isOpen, 
  onClose, 
  campaigns = [], 
  onTemplateSelect 
}) => {
  const [step, setStep] = useState(1);
  const [selectedTheme, setSelectedTheme] = useState(THEMES.MATRIX);
  const [campaignType, setCampaignType] = useState('single');
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedSingleCampaign, setSelectedSingleCampaign] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.campaign_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const singleTemplates = [
    {
      id: TEMPLATE_TYPES.SINGLE_NONE,
      name: 'No Tables',
      description: 'Clean layout with full-width audience breakdown',
      image: 'single-none.png',
      features: [
        '8 core metric cards',
        'Full-width Audience breakdown'
      ]
    },
    {
      id: TEMPLATE_TYPES.SINGLE_ONE,
      name: 'One Table',
      description: 'Audience breakdown + one data table',
      image: 'single-one.png',
      features: [
        '8 core metric cards',
        'Audience breakdown',
        'One customizable table'
      ]
    },
    {
      id: TEMPLATE_TYPES.SINGLE_TWO,
      name: 'Two Tables',
      description: 'Removes 2 metric cards, adds 2 tables',
      image: 'single-two.png',
      features: [
        '6 core metric cards',
        'Audience breakdown + first table',
        'Second table replaces removed metric cards'
      ]
    },
    {
      id: TEMPLATE_TYPES.SINGLE_THREE,
      name: 'Three Tables',
      description: 'Maximum data density',
      image: 'single-three.png',
      features: [
        'Same as two tables layout',
        'Minimal image space, maximum data focus'
      ]
    }
  ];

  const multiTemplates = [
    {
      id: TEMPLATE_TYPES.MULTI_NONE,
      name: 'Multi Comparison',
      description: 'Campaign comparison with aggregated metrics',
      image: 'multi-none.png',
      features: [
        '4 aggregated hero metrics across campaigns',
        '9-column comparison table (all selected campaigns)',
        'Combined audience breakdown with merged specialties'
      ]
    },
    {
      id: TEMPLATE_TYPES.MULTI_ONE,
      name: 'Multi + One Table',
      description: 'Campaign comparison + audience + additional table',
      image: 'multi-one.png',
      features: [
        'Same 4 hero metrics and comparison table',
        'Audience breakdown (half width)',
        'One additional metrics table'
      ]
    },
    {
      id: TEMPLATE_TYPES.MULTI_TWO,
      name: 'Multi + Two Tables',
      description: 'Maximum multi-campaign view with two tables',
      image: 'multi-two.png',
      features: [
        'Same core multi-campaign structure',
        'Two additional tables side by side'
      ]
    },
    {
      id: TEMPLATE_TYPES.MULTI_THREE,
      name: 'Multi + Three Tables',
      description: 'Dense layout with stacked third table',
      image: 'multi-three.png',
      features: [
        'Same as multi two tables',
        'Third table stacked above second table'
      ]
    }
  ];

  const availableTemplates = campaignType === 'single' ? singleTemplates : multiTemplates;

  const handleCampaignToggle = (campaign) => {
    if (campaignType === 'single') {
      setSelectedSingleCampaign(campaign);
    } else {
      setSelectedCampaigns(prev => {
        const isSelected = prev.find(c => c.campaign_name === campaign.campaign_name);
        if (isSelected) {
          return prev.filter(c => c.campaign_name !== campaign.campaign_name);
        } else if (prev.length < 8) {
          return [...prev, campaign];
        }
        return prev;
      });
    }
  };

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleGenerate = () => {
    const campaigns = campaignType === 'single' 
      ? [selectedSingleCampaign]
      : selectedCampaigns;

    const config = {
      template: selectedTemplate,
      campaigns,
      theme: selectedTheme,
      type: campaignType
    };

    onTemplateSelect(config);
    onClose();
  };

  const canProceed = () => {
    switch (step) {
      case 1: return !!selectedTheme;
      case 2: return !!campaignType;
      case 3: 
        return campaignType === 'single' 
          ? !!selectedSingleCampaign 
          : selectedCampaigns.length > 0;
      case 4: return !!selectedTemplate;
      default: return false;
    }
  };

  const modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  };

  const contentStyle = {
    background: '#ffffff',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '1200px',
    maxHeight: '90vh',
    overflow: 'auto',
    position: 'relative',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
    border: '1px solid rgba(0, 0, 0, 0.08)'
  };

  const headerStyle = {
    padding: '24px 32px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
    background: '#ffffff',
    color: '#1f2937',
    borderRadius: '16px 16px 0 0'
  };

  const bodyStyle = {
    padding: '32px',
    minHeight: '500px',
    background: '#ffffff'
  };

  const footerStyle = {
    padding: '20px 32px',
    borderTop: '1px solid rgba(0, 0, 0, 0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#f9fafb',
    borderRadius: '0 0 16px 16px'
  };

  return (
    <div style={modalStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={contentStyle}>
        <div style={headerStyle}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#1f2937',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
          <p style={{ margin: '2px 0 0', opacity: 0.9, fontSize: '16px' }}>
            Step {step} of 4: {
              step === 1 ? 'Choose Theme' :
              step === 2 ? 'Campaign Type' :
              step === 3 ? 'Select Campaigns' :
              'Choose Template'
            }
          </p>
        </div>

        <div style={bodyStyle}>
          {step === 1 && (
            <div>
              <h3 style={{ marginBottom: '24px', fontSize: '24px', color: '#1f2937' }}>
                Choose Your Theme
              </h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                gap: '24px' 
              }}>
                {Object.entries(THEME_INFO).map(([themeKey, themeData]) => (
                  <div
                    key={themeKey}
                    onClick={() => setSelectedTheme(themeKey)}
                    style={{
                      border: selectedTheme === themeKey ? '2px solid #667eea' : '1px solid rgba(0, 0, 0, 0.08)',
                      borderRadius: '12px',
                      padding: '24px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      background: selectedTheme === themeKey ? '#f0f7ff' : '#ffffff',
                      boxShadow: selectedTheme === themeKey ? '0 8px 24px rgba(102, 126, 234, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '6px',
                        background: `linear-gradient(135deg, ${themeData.colors[0]} 0%, ${themeData.colors[1]} 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#1f2937',
                        fontWeight: 'bold',
                        fontSize: '18px'
                      }}>
                        {themeData.name.charAt(0)}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '20px', fontWeight: '500', color: '#1f2937' }}>
                          {themeData.name}
                        </h4>
                        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
                          {themeData.description}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {themeData.colors.map((color, index) => (
                        <div
                          key={index}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            backgroundColor: color,
                            border: '2px solid rgba(255, 255, 255, 0.8)',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ marginBottom: '24px', fontSize: '24px', color: '#1f2937' }}>
                Campaign Type
              </h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
                gap: '24px' 
              }}>
                <div
                  onClick={() => setCampaignType('single')}
                  style={{
                    border: campaignType === 'single' ? '2px solid #667eea' : '1px solid rgba(0, 0, 0, 0.08)',
                    borderRadius: '16px',
                    padding: '32px 24px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    background: campaignType === 'single' ? '#f0f7ff' : '#ffffff',
                    textAlign: 'center'
                  }}
                >
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '500', color: '#1f2937' }}>
                    Single Campaign
                  </h4>
                  <p style={{ margin: '30px 0 16px 0', fontSize: '16px', color: '#6b7280', lineHeight: '1.5' }}>
                    Focus on one campaign with detailed metrics and specialty breakdowns
                  </p>
                </div>

                <div
                  onClick={() => setCampaignType('multi')}
                  style={{
                    border: campaignType === 'multi' ? '2px solid #667eea' : '1px solid rgba(0, 0, 0, 0.08)',
                    borderRadius: '16px',
                    padding: '32px 24px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    background: campaignType === 'multi' ? '#f0f7ff' : '#ffffff',
                    textAlign: 'center'
                  }}
                >
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '500', color: '#1f2937' }}>
                    Multi Campaign
                  </h4>
                  <p style={{ margin: '30px 0 16px 0', fontSize: '16px', color: '#6b7280', lineHeight: '1.5' }}>
                    Compare multiple campaigns with aggregated metrics and performance tables
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <p style={{ marginBottom: '24px', marginTop: '0px', color: '#6b7280', fontSize: '16px' }}>
                {campaignType === 'single' 
                  ? 'Choose one campaign to analyze in detail'
                  : `Select up to 8 campaigns to compare (${selectedCampaigns.length}/8 selected)`
                }
              </p>

              <div style={{ marginBottom: '24px' }}>
                <input
                  type="text"
                  placeholder="Search campaigns"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '95%',
                    padding: '12px 16px',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    borderRadius: '6px',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
                gap: '16px',
                maxHeight: '370px',
                overflow: 'auto',
                padding: '8px'
              }}>
                {filteredCampaigns.map(campaign => {
                  const isSelected = campaignType === 'single' 
                    ? selectedSingleCampaign?.campaign_name === campaign.campaign_name
                    : selectedCampaigns.some(c => c.campaign_name === campaign.campaign_name);

                  return (
                    <div
                      key={campaign.campaign_name}
                      onClick={() => handleCampaignToggle(campaign)}
                      style={{
                        border: isSelected ? '2px solid #667eea' : '1px solid rgba(0, 0, 0, 0.08)',
                        borderRadius: '12px',
                        padding: '20px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        background: isSelected ? '#f0f7ff' : '#ffffff',
                        boxShadow: isSelected ? '0 4px 16px rgba(102, 126, 234, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.05)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: `3px solid ${isSelected ? '#667eea' : '#d1d5db'}`,
                          background: isSelected ? '#667eea' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: '2px',
                          flexShrink: 0
                        }}>
                          {isSelected && (
                            <div style={{ 
                              width: '6px', 
                              height: '6px', 
                              borderRadius: '50%', 
                              background: 'white' 
                            }} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ 
                            margin: '0 0 8px 0', 
                            fontSize: '16px', 
                            fontWeight: '500', 
                            color: '#1f2937',
                            wordBreak: 'break-word'
                          }}>
                            {campaign.campaign_name}
                          </h4>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                            <div>Opens: {campaign.volume_metrics?.unique_opens?.toLocaleString() || 'N/A'}</div>
                            <div>Rate: {campaign.core_metrics?.unique_open_rate?.toFixed(1) || 'N/A'}%</div>
                          </div>
                          <div style={{
                            background: '#f3f4f6',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            color: '#6b7280',
                            display: 'inline-block'
                          }}>
                            {campaign.volume_metrics?.delivered?.toLocaleString() || 'N/A'} delivered
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredCampaigns.length === 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px', 
                  color: '#6b7280',
                  background: '#f9fafb',
                  borderRadius: '6px'
                }}>
                  No campaigns found matching "{searchTerm}"
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div>
              <h3 style={{ marginBottom: '24px', marginTop: '0px', fontSize: '24px', color: '#1f2937' }}>
                Choose Template Layout
              </h3>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', 
                gap: '24px',
                overflow: 'auto',
                maxHeight: '445px' 
              }}>
                {availableTemplates.map(template => (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    style={{
                      border: selectedTemplate?.id === template.id ? '2px solid #667eea' : '1px solid rgba(0, 0, 0, 0.08)',
                      borderRadius: '16px',
                      cursor: 'pointer',
                      width: '97%',
                      transition: 'all 0.3s ease',
                      background: selectedTemplate?.id === template.id ? '#f0f7ff' : '#ffffff',
                      overflow: 'hidden',
                      boxShadow: selectedTemplate?.id === template.id ? '0 8px 24px rgba(102, 126, 234, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    <div
                      style={{
                        height: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg,#f3f4f6 0%,#e5e7eb 100%)',
                      }}
                    >
                      <img
                        src={`${process.env.PUBLIC_URL}/${template.image}`}
                        alt={template.name}
                        style={{ height: "auto", width: '100%', objectFit: 'cover' }}
                      />
                    </div>

                    <div style={{ padding: '20px' }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '500', color: '#1f2937' }}>
                        {template.name}
                      </h4>
                      <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280', lineHeight: '1.5' }}>
                        {template.description}
                      </p>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                        {template.features.map((feature, index) => (
                          <li key={index} style={{ 
                            fontSize: '12px', 
                            color: '#666', 
                            marginBottom: '4px', 
                            paddingLeft: '16px', 
                            position: 'relative' 
                          }}>
                            <span style={{ position: 'absolute', left: 0, color: '#667eea', fontWeight: 'bold' }}>•</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={footerStyle}>
          <div style={{ display: 'flex', gap: '12px' }}>
            {step > 1 && (
              <button
                onClick={handleBack}
                style={{
                  padding: '10px 20px',
                  background: '#ffffff',
                  color: '#1f2937',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Back
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {step < 4 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                style={{
                  padding: '10px 24px',
                  background: canProceed() ? '#667eea' : '#4a4a4d',
                  color: '#1f2937',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: canProceed() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  opacity: canProceed() ? 1 : 0.5
                }}
                onMouseOver={(e) => {
                  if (canProceed()) e.target.style.background = '#5568d3';
                }}
                onMouseOut={(e) => {
                  if (canProceed()) e.target.style.background = '#667eea';
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={!canProceed()}
                style={{
                  padding: '10px 24px',
                  background: canProceed() ? '#10b981' : '#4a4a4d',
                  color: '#1f2937',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: canProceed() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  opacity: canProceed() ? 1 : 0.5
                }}
                onMouseOver={(e) => {
                  if (canProceed()) e.target.style.background = '#059669';
                }}
                onMouseOut={(e) => {
                  if (canProceed()) e.target.style.background = '#10b981';
                }}
              >
                Generate Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateSelectionModal;