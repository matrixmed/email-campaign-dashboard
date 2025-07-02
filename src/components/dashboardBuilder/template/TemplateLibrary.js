// TemplateLibrary.js - Fixed layouts to match exact mockup specifications

import { 
  TEMPLATE_TYPES, 
  getThemeColors, 
  getThemeLogo,
  TABLE_TYPES,
  getMetricValue,
  formatMetricValue 
} from './LayoutTemplates';

// ============================================================================
// SINGLE CAMPAIGN TEMPLATES
// ============================================================================

/**
 * SINGLE NO TABLES
 * Top: Title + Logo
 * Hero row: Unique engagement rate, potential patient impact, cost per engaged professional
 * Second row: Healthcare professionals reached, unique professional engagements, unique click rate
 * Bottom: Audience breakdown (full width)
 */
export const generateSingleNoneTemplate = (campaign, theme) => {
  const components = [];
  const themeColors = getThemeColors(theme);

  // 1. Campaign Title - top left
  components.push({
    id: 'campaign-title',
    type: 'title',
    title: campaign.campaign_name || 'Campaign Analysis',
    position: { x: 20, y: -15, width: 1000, height: 100 },
    style: {
      background: 'transparent',
      color: themeColors.darkGray || '#1f2937'
    }
  });

  // 3. HERO ROW - 3 main cards (always the same for single campaigns)
  components.push({
    id: 'hero-unique-engagement',
    type: 'hero',
    title: 'UNIQUE ENGAGEMENT RATE',
    value: `${campaign.core_metrics?.unique_open_rate?.toFixed(1) || '31.2'}%`,
    subtitle: `+${campaign.core_metrics?.performance_vs_industry?.toFixed(1) || '31.2'}% above industry`,
    position: { x: 30, y: 95, width: 200, height: 90 },
    style: {
      background: themeColors.heroGradient || 'linear-gradient(135deg, #1e40af, #3b82f6)',
      color: '#ffffff',
      font: '20px',
      borderRadius: '8px'
    }
  });

  components.push({
    id: 'hero-patient-impact',
    type: 'secondary',
    title: 'POTENTIAL PATIENT IMPACT',
    value: `${((campaign.cost_metrics?.estimated_patient_impact || 82800000) / 1000000).toFixed(1)}M`,
    subtitle: 'Calculated using verified patient panel sizes',
    position: { x: 270, y: 95, width: 200, height: 88 },
    style: {
      background: themeColors.cardGradient || '#f8fafc',
      border: `1px solid ${themeColors.border || '#e2e8f0'}`,
      borderRadius: '8px'
    }
  });

  components.push({
    id: 'hero-cost-per-engaged',
    type: 'secondary',
    title: 'COST PER ENGAGED PROFESSIONAL',
    value: '$0.00',
    subtitle: '',
    position: { x: 510, y: 95, width: 200, height: 88 },
    style: {
      background: themeColors.cardGradient || '#f8fafc',
      border: `1px solid ${themeColors.border || '#e2e8f0'}`,
      borderRadius: '8px'
    }
  });

  // 4. SECOND ROW - 3 cards (consistent across all single templates)
  const secondRowCards = [
    {
      id: 'healthcare-professionals-reached',
      title: 'HEALTHCARE PROFESSIONALS REACHED',
      value: (campaign.volume_metrics?.delivered || 30256).toLocaleString(),
      subtitle: `${campaign.core_metrics?.delivery_rate?.toFixed(1)}% delivery rate`,
      x: 30
    },
    {
      id: 'unique-professional-engagements',
      title: 'UNIQUE PROFESSIONAL ENGAGEMENTS',
      value: (campaign.volume_metrics?.unique_opens || 9424).toLocaleString(),
      subtitle: `${(campaign.volume_metrics?.total_opens).toLocaleString()} total opens`,
      x: 176
    },
    {
      id: 'unique-click-rate',
      title: 'UNIQUE CLICK RATE',
      value: `${campaign.core_metrics?.unique_click_rate?.toFixed(1)}%`,
      subtitle: '+0.8% vs Industry avg',
      x: 319
    },
    {
      id: 'total-click-rate',
      title: 'TOTAL CLICK RATE',
      value: `${campaign.core_metrics?.total_click_rate?.toFixed(1)}%`,
      subtitle: '+0.8% vs Industry avg',
      x: 462
    },
    {
      id: 'one-hour-open-rate',
      title: 'ONE HOUR OPEN RATE',
      value: `${campaign.core_metrics?.['1_hour_open_rate']?.toFixed(1)}%`,
      subtitle: '% of Opens within the First Hour of Deployment',
      x: 605
    }    
  ];

  secondRowCards.forEach(card => {
    components.push({
      id: card.id,
      type: 'metric',
      title: card.title,
      value: card.value,
      subtitle: card.subtitle,
      position: { x: card.x, y: 228, width: 104, height: 75 },
      style: {
        background: themeColors.cardGradient || '#f8fafc',
        border: `1px solid ${themeColors.border || '#e2e8f0'}`,
        borderRadius: '6px'
      }
    });
  });

  // 5. Audience Breakdown - full width at bottom
  components.push({
    id: 'audience-breakdown',
    type: 'specialty-strips',
    title: 'Audience Breakdown',
    specialties: getTopSpecialties(campaign.specialty_performance),
    position: { x: 30, y: 350, width: 679, height: 170 },
    style: { background: 'transparent' }
  });

  return components;
};

/**
 * SINGLE ONE TABLE
 * Same as no tables + audience breakdown gives space + table next to it
 */
export const generateSingleOneTemplate = (campaign, theme) => {
  const components = generateSingleNoneTemplate(campaign, theme);
  const themeColors = getThemeColors(theme);
  
  // Adjust audience breakdown to half width
  const audienceComponent = components.find(c => c.id === 'audience-breakdown');
  if (audienceComponent) {
    audienceComponent.position = { x: 30, y: 350, width: 393, height: 170 };
  }

  // Add table next to audience breakdown
  components.push({
    id: 'additional-table-1',
    type: 'table',
    title: 'Social Media Metrics',
    config: { 
      customData: [
        ['LinkedIn CTR', '2.1%'],
        ['Facebook Reach', '12.5K'],
        ['Social Shares', '247']
      ],
      headers: ['Platform', 'Value']
    },
    position: { x: 464, y: 350, width: 245, height: 170 },
    style: {
      background: themeColors.cardGradient || '#f8fafc',
      border: `1px solid ${themeColors.border || '#e2e8f0'}`,
      borderRadius: '6px'
    }
  });

  return components;
};

/**
 * SINGLE TWO TABLES
 * Remove total click rate and 24 hour open rate cards, add two tables in their place
 * Audience breakdown and first table remain same size
 */
export const generateSingleTwoTemplate = (campaign, theme) => {
  const components = generateSingleOneTemplate(campaign, theme);
  const themeColors = getThemeColors(theme);

  const firstTable = components.find(c => c.id === 'additional-table-1');
  if (firstTable) {
    firstTable.position = { ...firstTable.position, height: 125, y: 395 }; 
  }

  // remove those cards and replace with tables
  const filteredComponents = components.filter(c => 
    c.id !== 'total-click-rate' && c.id !== 'one-hour-open-rate'
  );

  // Add second table in place of removed cards
  filteredComponents.push({
    id: 'additional-table-2',
    type: 'table',
    title: 'Digital Metrics',
    config: { 
      customData: [
        ['Email CTR', '3.2%'],
        ['Website Visits', '15.7K'],
        ['Conversion Rate', '2.8%']
      ],
      headers: ['Metric', 'Value']
    },
    position: { x: 464, y: 228, width: 245, height: 125 },
    style: {
      background: themeColors.cardGradient || '#f8fafc',
      border: `1px solid ${themeColors.border || '#e2e8f0'}`,
      borderRadius: '6px'
    }
  });

  return filteredComponents;
};

/**
 * SINGLE THREE TABLES
 * Same as two tables + third table takes up image space at bottom
 */
export const generateSingleThreeTemplate = (campaign, theme) => {
  const components = generateSingleTwoTemplate(campaign, theme);
  const themeColors = getThemeColors(theme);

  // Add third table in image space (bottom row)
  components.push({
    id: 'additional-table-3',
    type: 'table',
    title: 'Video Metrics',
    config: { 
      customData: [
        ['Video Views', '22.1K'],
        ['Completion Rate', '78%'],
        ['Engagement Time', '4.2min']
      ],
      headers: ['Metric', 'Value']
    },
    position: { x: 752, y: 395, width: 210, height: 125 },
    style: {
      background: themeColors.cardGradient || '#f8fafc',
      border: `1px solid ${themeColors.border || '#e2e8f0'}`,
      borderRadius: '6px'
    }
  });

  return components;
};

// ============================================================================
// MULTI CAMPAIGN TEMPLATES
// ============================================================================

/**
 * MULTI NO TABLES
 * Top: 4 smaller hero cards (same metrics for all multi templates)
 * Center: Campaign comparison table (9 columns, rows = campaigns + header)
 * Bottom: Aggregated audience breakdown
 */
export const generateMultiNoneTemplate = (campaigns, theme) => {
  const components = [];
  const themeColors = getThemeColors(theme);
  const aggregatedData = aggregateMultiCampaignData(campaigns);
  
  // Campaign Title
  const campaignNames = campaigns.map(c => c.campaign_name).slice(0, 3).join(' + ');
  const titleText = campaigns.length > 3 ? `${campaignNames} + ${campaigns.length - 3} more` : campaignNames;
  
  components.push({
    id: 'multi-campaign-title',
    type: 'title',
    title: `Multi-Campaign Analysis: ${titleText}`,
    position: { x: 20, y: -17, width: 1000, height: 100 },
    style: {
      background: 'transparent',
      color: themeColors.darkGray || '#1f2937'
    }
  });

  // 4 smaller hero cards (same for all multi templates)
  const multiHeroCards = [
    {
      id: 'multi-unique-engagement',
      title: 'UNIQUE ENGAGEMENT RATE',
      value: `${aggregatedData.core_metrics?.unique_open_rate?.toFixed(1) || 0}%`,
      subtitle: 'Aggregated across campaigns',
      x: 15
    },
    {
      id: 'multi-patient-impact',
      title: 'POTENTIAL PATIENT IMPACT',
      value: `${((aggregatedData.cost_metrics?.estimated_patient_impact || 0) / 1000000).toFixed(1)}M`,
      subtitle: 'Combined impact potential',
      x: 205
    },
    {
      id: 'multi-cost-per-engaged',
      title: 'COST PER ENGAGED PROFESSIONAL',
      value: '$0.00',
      subtitle: 'Manual calculation required',
      x: 395
    },
    {
      id: 'multi-professional-engagements',
      title: 'UNIQUE PROFESSIONAL ENGAGEMENTS',
      value: (aggregatedData.volume_metrics?.unique_opens || 0).toLocaleString(),
      subtitle: 'Total unique professionals',
      x: 585
    }
  ];

  multiHeroCards.forEach((card, index) => {
    components.push({
      id: card.id,
      type: index === 0 ? 'hero' : 'secondary',
      title: card.title,
      value: card.value,
      subtitle: card.subtitle,
      position: { x: card.x, y: 95, width: 150, height: 60 },
      style: {
        background: index === 0 ? (themeColors.heroGradient || 'linear-gradient(135deg, #1e40af, #3b82f6)') : (themeColors.cardGradient || '#f8fafc'),
        color: index === 0 ? '#ffffff' : (themeColors.text || '#1f2937'),
        border: index === 0 ? 'none' : `1px solid ${themeColors.border || '#e2e8f0'}`,
        borderRadius: '6px'
      }
    });
  });

  // Campaign Comparison Table (9 columns)
  const tableData = generateMultiCampaignTableData(campaigns);
  components.push({
    id: 'campaign-comparison-table',
    type: 'table',
    title: '',
    config: { 
      customData: tableData,
      headers: [
        'Campaign Name', 'Sent', 'Delivered', 'Unique Opens', 
        'Unique Open Rate', 'Total Opens', 'Total Open Rate', 
        'Unique Click Rate', 'Total Click Rate'
      ]
    },
    position: { x: 15, y: 200, width: 720, height: 160 },
    style: {
      background: themeColors.cardGradient || '#f8fafc',
      border: `1px solid ${themeColors.border || '#e2e8f0'}`,
      borderRadius: '6px'
    }
  });

  // Aggregated Audience Breakdown
  components.push({
    id: 'aggregated-audience-breakdown',
    type: 'specialty-strips',
    title: 'COMBINED AUDIENCE BREAKDOWN BY SPECIALTY',
    specialties: getTopSpecialties(aggregatedData.specialty_performance),
    position: { x: 15, y: 400, width: 720, height: 130 },
    style: { background: 'transparent' }
  });

  return components;
};

/**
 * MULTI ONE TABLE
 * Same as multi none + audience breakdown smaller + table next to it
 */
export const generateMultiOneTemplate = (campaigns, theme) => {
  const components = generateMultiNoneTemplate(campaigns, theme);
  const themeColors = getThemeColors(theme);
  
  // Adjust audience breakdown to smaller width
  const audienceComponent = components.find(c => c.id === 'aggregated-audience-breakdown');
  if (audienceComponent) {
    audienceComponent.position = { x: 15, y: 400, width: 418, height: 130 };
  }

  // Add additional table
  components.push({
    id: 'additional-table-1',
    type: 'table',
    title: 'Digital Metrics Summary',
    config: { 
      customData: [
        ['Total Email CTR', '2.8%'],
        ['Combined Reach', '125K'],
        ['Avg Engagement', '4.2min']
      ],
      headers: ['Metric', 'Value']
    },
    position: { x: 472, y: 400, width: 263, height: 130 },
    style: {
      background: themeColors.cardGradient || '#f8fafc',
      border: `1px solid ${themeColors.border || '#e2e8f0'}`,
      borderRadius: '6px'
    }
  });

  return components;
};

/**
 * MULTI TWO TABLES
 * Same as multi one + second table takes some image space
 */
export const generateMultiTwoTemplate = (campaigns, theme) => {
  const components = generateMultiOneTemplate(campaigns, theme);
  const themeColors = getThemeColors(theme);
  
  // Adjust first table width
  const firstTable = components.find(c => c.id === 'additional-table-1');
  if (firstTable) {
    firstTable.position = { x: 472, y: 400, width: 263, height: 130 };
  }

  // Add second table
  components.push({
    id: 'additional-table-2',
    type: 'table',
    title: 'Performance Summary',
    config: { 
      customData: [
        ['ROI', '285%'],
        ['Cost Efficiency', '+15%'],
        ['Quality Score', '8.9/10']
      ],
      headers: ['Metric', 'Value']
    },
    position: { x: 775, y: 400, width: 200, height: 130 },
    style: {
      background: themeColors.cardGradient || '#f8fafc',
      border: `1px solid ${themeColors.border || '#e2e8f0'}`,
      borderRadius: '6px'
    }
  });

  return components;
};

/**
 * MULTI THREE TABLES
 * Same as multi two + third table stacked on top of second
 */
export const generateMultiThreeTemplate = (campaigns, theme) => {
  const components = generateMultiTwoTemplate(campaigns, theme);
  const themeColors = getThemeColors(theme);
  
  // Adjust second table to bottom half
  const secondTable = components.find(c => c.id === 'additional-table-2');
  if (secondTable) {
    secondTable.position = { x: 775, y: 420, width: 200, height: 110 };
  }

  // Add third table stacked above
  components.push({
    id: 'additional-table-3',
    type: 'table',
    title: 'Quick Stats',
    config: { 
      customData: [
        ['Campaigns', campaigns.length.toString()],
        ['Total Reach', '250K+']
      ],
      headers: ['Stat', 'Value']
    },
    position: { x: 775, y: 270, width: 200, height: 110 },
    style: {
      background: themeColors.cardGradient || '#f8fafc',
      border: `1px solid ${themeColors.border || '#e2e8f0'}`,
      borderRadius: '6px'
    }
  });

  return components;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get top 4 specialties with merged subspecialties (remove "- " suffixes)
 */
function getTopSpecialties(specialtyPerformance) {
  if (!specialtyPerformance) return [];
  
  // Merge subspecialties by removing "- " suffixes
  const mergedSpecialties = {};
  
  Object.entries(specialtyPerformance).forEach(([name, data]) => {
    // Remove everything after " - " to merge subspecialties
    const baseName = name.split(' - ')[0];
    
    if (!mergedSpecialties[baseName]) {
      mergedSpecialties[baseName] = {
        audience_total: 0,
        unique_opens: 0,
        performance_delta: 0,
        count: 0
      };
    }
    
    mergedSpecialties[baseName].audience_total += data.audience_total || 0;
    mergedSpecialties[baseName].unique_opens += data.unique_opens || 0;
    mergedSpecialties[baseName].performance_delta += data.performance_delta || 0;
    mergedSpecialties[baseName].count += 1;
  });
  
  // Calculate averages and percentages
  const totalAudience = Object.values(mergedSpecialties).reduce((sum, data) => sum + data.audience_total, 0);
  
  Object.values(mergedSpecialties).forEach(data => {
    data.unique_open_rate = data.audience_total > 0 ? (data.unique_opens / data.audience_total) * 100 : 0;
    data.performance_delta = data.performance_delta / data.count;
    data.audience_percentage = totalAudience > 0 ? (data.audience_total / totalAudience) * 100 : 0;
  });
  
  // Return top 4 by audience percentage
  return Object.entries(mergedSpecialties)
    .filter(([name, data]) => {
      return data.audience_total >= 500 && 
             data.audience_percentage >= 1.0 &&
             !name.toLowerCase().includes('unknown') &&
             !name.toLowerCase().includes('staff');
    })
    .sort(([,a], [,b]) => b.audience_percentage - a.audience_percentage)
    .slice(0, 4);
}

/**
 * Aggregate data from multiple campaigns - FIXED IMPLEMENTATION
 */
function aggregateMultiCampaignData(campaigns) {
  const aggregated = {
    core_metrics: {},
    volume_metrics: {},
    cost_metrics: {},
    specialty_performance: {}
  };

  // Sum totals
  const totalDelivered = campaigns.reduce((sum, c) => sum + (c.volume_metrics?.delivered || 0), 0);
  const totalOpens = campaigns.reduce((sum, c) => sum + (c.volume_metrics?.unique_opens || 0), 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + (c.volume_metrics?.unique_clicks || 0), 0);
  const totalSent = campaigns.reduce((sum, c) => sum + (c.volume_metrics?.sent || 0), 0);
  const totalPatientImpact = campaigns.reduce((sum, c) => sum + (c.cost_metrics?.estimated_patient_impact || 0), 0);

  // Calculate aggregated rates
  aggregated.core_metrics.unique_open_rate = totalDelivered > 0 ? (totalOpens / totalDelivered) * 100 : 0;
  aggregated.core_metrics.unique_click_rate = totalDelivered > 0 ? (totalClicks / totalDelivered) * 100 : 0;
  aggregated.core_metrics.delivery_rate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;

  // Aggregate volume metrics
  aggregated.volume_metrics = {
    sent: totalSent,
    delivered: totalDelivered,
    unique_opens: totalOpens,
    unique_clicks: totalClicks
  };

  // Aggregate cost metrics
  aggregated.cost_metrics = {
    estimated_patient_impact: totalPatientImpact
  };

  // Aggregate and merge specialty performance
  const allSpecialties = {};
  campaigns.forEach(campaign => {
    if (campaign.specialty_performance) {
      Object.entries(campaign.specialty_performance).forEach(([specialty, data]) => {
        // Merge subspecialties
        const baseName = specialty.split(' - ')[0];
        
        if (!allSpecialties[baseName]) {
          allSpecialties[baseName] = {
            audience_total: 0,
            unique_opens: 0,
            performance_delta: 0,
            count: 0
          };
        }
        allSpecialties[baseName].audience_total += data.audience_total || 0;
        allSpecialties[baseName].unique_opens += data.unique_opens || 0;
        allSpecialties[baseName].performance_delta += data.performance_delta || 0;
        allSpecialties[baseName].count += 1;
      });
    }
  });

  // Calculate averages for specialty performance
  const totalAudience = Object.values(allSpecialties).reduce((sum, data) => sum + data.audience_total, 0);
  Object.values(allSpecialties).forEach(data => {
    data.unique_open_rate = data.audience_total > 0 ? (data.unique_opens / data.audience_total) * 100 : 0;
    data.performance_delta = data.performance_delta / data.count;
    data.audience_percentage = totalAudience > 0 ? (data.audience_total / totalAudience) * 100 : 0;
  });

  aggregated.specialty_performance = allSpecialties;
  return aggregated;
}

/**
 * Generate table data for multi-campaign comparison (9 columns)
 */
function generateMultiCampaignTableData(campaigns) {
  const rows = campaigns.map(campaign => [
    campaign.campaign_name || 'Unknown',
    (campaign.volume_metrics?.sent || 0).toLocaleString(),
    (campaign.volume_metrics?.delivered || 0).toLocaleString(),
    (campaign.volume_metrics?.unique_opens || 0).toLocaleString(),
    `${(campaign.core_metrics?.unique_open_rate || 0).toFixed(1)}%`,
    (campaign.volume_metrics?.total_opens || 0).toLocaleString(),
    `${(campaign.core_metrics?.total_open_rate || 0).toFixed(1)}%`,
    `${(campaign.core_metrics?.unique_click_rate || 0).toFixed(1)}%`,
    `${(campaign.core_metrics?.total_click_rate || 0).toFixed(1)}%`
  ]);

  return rows;
}

// ============================================================================
// TEMPLATE REGISTRY
// ============================================================================

export const TEMPLATE_GENERATORS = {
  [TEMPLATE_TYPES.SINGLE_NONE]: generateSingleNoneTemplate,
  [TEMPLATE_TYPES.SINGLE_ONE]: generateSingleOneTemplate,
  [TEMPLATE_TYPES.SINGLE_TWO]: generateSingleTwoTemplate,
  [TEMPLATE_TYPES.SINGLE_THREE]: generateSingleThreeTemplate,
  [TEMPLATE_TYPES.MULTI_NONE]: generateMultiNoneTemplate,
  [TEMPLATE_TYPES.MULTI_ONE]: generateMultiOneTemplate,
  [TEMPLATE_TYPES.MULTI_TWO]: generateMultiTwoTemplate,
  [TEMPLATE_TYPES.MULTI_THREE]: generateMultiThreeTemplate
};

/**
 * Generate template based on configuration
 */
export const generateTemplate = (config) => {
  const { template, campaigns, theme, type } = config;
  const generator = TEMPLATE_GENERATORS[template.id];
  
  if (!generator) {
    throw new Error(`Template ${template.id} not found`);
  }
  
  if (type === 'single') {
    return generator(campaigns[0], theme);
  } else {
    return generator(campaigns, theme);
  }
};

export default {
  TEMPLATE_GENERATORS,
  generateTemplate,
  generateSingleNoneTemplate,
  generateSingleOneTemplate,
  generateSingleTwoTemplate,
  generateSingleThreeTemplate,
  generateMultiNoneTemplate,
  generateMultiOneTemplate,
  generateMultiTwoTemplate,
  generateMultiThreeTemplate
};