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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
    backdropFilter: 'blur(4px)'
  };

  const contentStyle = {
    background: '#ffffff',
    borderRadius: '20px',
    width: '90%',
    maxWidth: '1200px',
    maxHeight: '90vh',
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 25px 70px rgba(0, 0, 0, 0.25)',
    border: '2px solid #e5e7eb'
  };

  const headerStyle = {
    padding: '18px 24px',
    borderBottom: '1px solid #e5e7eb',
    background: '#ffffff',
    color: '#1f2937',
    borderRadius: '20px 20px 0 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  };

  const bodyStyle = {
    padding: '36px',
    minHeight: '500px',
    background: '#ffffff',
    overflowY: 'auto',
    maxHeight: 'calc(90vh - 180px)'
  };

  const footerStyle = {
    padding: '24px 36px',
    borderTop: '2px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
    borderRadius: '0 0 20px 20px'
  };

  return (
    <div style={modalStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={contentStyle}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              padding: '4px 12px',
              background: '#f3f4f6',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#6b7280'
            }}>
              Step {step} of 4
            </div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
              {
                step === 1 ? 'Choose Your Theme' :
                step === 2 ? 'Select Campaign Type' :
                step === 3 ? 'Pick Your Campaigns' :
                'Choose Template Layout'
              }
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              width: '32px',
              height: '32px',
              color: '#9ca3af',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.color = '#6b7280'}
            onMouseOut={(e) => e.target.style.color = '#9ca3af'}
          >
            ×
          </button>
        </div>

        <div style={bodyStyle}>
          {step === 1 && (
            <div>
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
                      border: selectedTheme === themeKey ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '24px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      background: selectedTheme === themeKey ? '#eff6ff' : '#ffffff',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '8px',
                        background: `linear-gradient(135deg, ${themeData.colors[0]} 0%, ${themeData.colors[1]} 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontWeight: '600',
                        fontSize: '20px'
                      }}>
                        {themeData.name.charAt(0)}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                          {themeData.name}
                        </h4>
                        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px', lineHeight: '1.4' }}>
                          {themeData.description}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {themeData.colors.map((color, index) => (
                        <div
                          key={index}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '6px',
                            backgroundColor: color,
                            border: '2px solid white',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
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
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
                gap: '24px' 
              }}>
                <div
                  onClick={() => setCampaignType('single')}
                  style={{
                    border: campaignType === 'single' ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                    borderRadius: '16px',
                    padding: '32px 24px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: campaignType === 'single' ? '#eff6ff' : '#ffffff',
                    textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
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
                    border: campaignType === 'multi' ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                    borderRadius: '16px',
                    padding: '32px 24px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: campaignType === 'multi' ? '#eff6ff' : '#ffffff',
                    textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
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
              <p style={{ marginBottom: '20px', marginTop: '0px', color: '#6b7280', fontSize: '14px' }}>
                {campaignType === 'single'
                  ? 'Choose one campaign to analyze in detail'
                  : `Select up to 8 campaigns to compare (${selectedCampaigns.length}/8 selected)`
                }
              </p>

              <div style={{ marginBottom: '20px' }}>
                <input
                  type="text"
                  placeholder="Search campaigns"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '95%',
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    background: '#ffffff',
                    color: '#111827'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
                        border: isSelected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        background: isSelected ? '#eff6ff' : '#ffffff',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div style={{
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          border: `2px solid ${isSelected ? '#3b82f6' : '#d1d5db'}`,
                          background: isSelected ? '#3b82f6' : 'transparent',
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
                            fontSize: '15px',
                            fontWeight: '600',
                            color: '#111827',
                            wordBreak: 'break-word'
                          }}>
                            {campaign.campaign_name}
                          </h4>
                          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
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
                  borderRadius: '8px'
                }}>
                  No campaigns found matching "{searchTerm}"
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div>
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
                      border: selectedTemplate?.id === template.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      width: '97%',
                      transition: 'all 0.2s ease',
                      background: selectedTemplate?.id === template.id ? '#eff6ff' : '#ffffff',
                      overflow: 'hidden',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
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
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                        {template.name}
                      </h4>
                      <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#6b7280', lineHeight: '1.5' }}>
                        {template.description}
                      </p>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                        {template.features.map((feature, index) => (
                          <li key={index} style={{
                            fontSize: '13px',
                            color: '#6b7280',
                            marginBottom: '4px',
                            paddingLeft: '16px',
                            position: 'relative'
                          }}>
                            <span style={{ position: 'absolute', left: 0, color: '#3b82f6' }}>•</span>
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
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                onMouseOver={(e) => e.target.style.background = '#f9fafb'}
                onMouseOut={(e) => e.target.style.background = '#ffffff'}
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
                  background: canProceed() ? '#1a4d7a' : '#555',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: canProceed() ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s ease'
                }}
                onMouseOver={(e) => {
                  if (canProceed()) e.target.style.background = '#143d61';
                }}
                onMouseOut={(e) => {
                  if (canProceed()) e.target.style.background = '#1a4d7a';
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
                  background: canProceed() ? '#1a4d7a' : '#555',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: canProceed() ? 'pointer' : 'not-allowed',
                  transition: 'background 0.2s ease'
                }}
                onMouseOver={(e) => {
                  if (canProceed()) e.target.style.background = '#143d61';
                }}
                onMouseOut={(e) => {
                  if (canProceed()) e.target.style.background = '#1a4d7a';
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