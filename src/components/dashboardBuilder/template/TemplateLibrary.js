import { TEMPLATE_TYPES, getThemeColors } from './LayoutTemplates';

export const generateSingleNoneTemplate = (campaign, theme, mergeSubspecialties = false, costComparisonMode = 'none') => {
  const components = [];
  const themeColors = getThemeColors(theme);

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

  components.push({
    id: 'hero-unique-engagement',
    type: 'hero',
    title: 'UNIQUE ENGAGEMENT RATE',
    value: `${campaign.core_metrics?.unique_open_rate?.toFixed(1)}%`,
    position: { x: 30, y: 95, width: 200, height: 88 },
    style: {
      background: themeColors.heroGradient || 'linear-gradient(135deg, #1e40af, #3b82f6)',
      color: '#ffffff',
      font: '20px',
      borderRadius: '8px'
    }
  });

  components.push({
    id: 'hero-patient-impact',
    type: 'metric',
    title: 'POTENTIAL PATIENT IMPACT',
    value: `${((campaign.cost_metrics?.estimated_patient_impact) / 1000000).toFixed(1)}M`,
    subtitle: 'Estimated patient panel sizes',
    position: { x: 270, y: 95, width: 200, height: 88 },
    style: {
      background: themeColors.cardGradient || '#f8fafc',
      border: `1px solid ${themeColors.border || '#e2e8f0'}`,
      borderRadius: '8px'
    }
  });

  if (costComparisonMode === 'none') {
    components.push({
      id: 'cost-comparison',
      type: 'metric',
      title: 'HEALTHCARE PROFESSIONALS REACHED',
      value: (campaign.volume_metrics?.delivered).toLocaleString(),
      subtitle: `${((campaign.volume_metrics?.delivered / campaign.volume_metrics?.sent) * 100).toFixed(1)}% delivery rate`,
      position: { x: 510, y: 95, width: 200, height: 88 },
      currentTheme: theme,
      style: {
        background: themeColors.cardGradient || '#f8fafc',
        border: `1px solid ${themeColors.border || '#e2e8f0'}`,
        borderRadius: '8px'
      }
    });
  } else {
    components.push({
      id: 'cost-comparison',
      type: 'cost-comparison',
      currentTheme: theme,
      contractedCost: 10,
      actualCost: 5,
      position: { x: 510, y: 95, width: 200, height: 88 }
    });
  }

  if (costComparisonMode === 'none') {
    const secondRowCards = [
      {
        id: 'healthcare-professionals-reached',
        title: 'TOTAL PROFESSIONAL ENGAGEMENTS',
        value: (campaign.volume_metrics?.total_opens).toLocaleString(),
        subtitle: `${((campaign.volume_metrics?.total_opens / campaign.volume_metrics?.delivered) * 100).toFixed(1)}% total open rate`,
        x: 30
      },
      {
        id: 'unique-professional-engagements',
        title: 'UNIQUE PROFESSIONAL ENGAGEMENTS',
        value: (campaign.volume_metrics?.unique_opens).toLocaleString(),
        subtitle: undefined,
        x: 176
      },
      {
        id: 'total-click-rate',
        title: 'TOTAL CLICK RATE',
        value: `${campaign.core_metrics?.total_click_rate?.toFixed(1)}%`,
        subtitle: undefined,
        x: 319
      },
      {
        id: 'unique-click-rate',
        title: 'UNIQUE CLICK RATE',
        value: `${campaign.core_metrics?.unique_click_rate?.toFixed(1)}%`,
        subtitle: undefined,
        x: 462
      },
      {
        id: 'one-hour-open-rate',
        title: 'ONE HOUR OPEN RATE',
        value: campaign.core_metrics?.['1_hour_open_rate'] ? `${campaign.core_metrics['1_hour_open_rate'].toFixed(1)}%` : 'undefined%',
        subtitle: 'Percent of opens in the first hour',
        x: 605
      }
    ];

    secondRowCards.forEach(card => {
      components.push({
        id: card.id,
        type: 'secondary',
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
  } else {
    const secondRowCards = [
      {
        id: 'healthcare-professionals-reached',
        title: 'HEALTHCARE PROFESSIONALS REACHED',
        value: (campaign.volume_metrics?.delivered).toLocaleString(),
        subtitle: `${((campaign.volume_metrics?.delivered / campaign.volume_metrics?.sent) * 100).toFixed(1)}% delivery rate`,
        x: 30
      },
      {
        id: 'unique-professional-engagements',
        title: 'UNIQUE PROFESSIONAL ENGAGEMENTS',
        value: (campaign.volume_metrics?.unique_opens).toLocaleString(),
        subtitle: `${(campaign.volume_metrics?.total_opens).toLocaleString()} total opens`,
        x: 176
      },
      {
        id: 'total-click-rate',
        title: 'TOTAL CLICK RATE',
        value: `${campaign.core_metrics?.total_click_rate?.toFixed(1)}%`,
        subtitle: undefined,
        x: 319
      },
      {
        id: 'unique-click-rate',
        title: 'UNIQUE CLICK RATE',
        value: `${campaign.core_metrics?.unique_click_rate?.toFixed(1)}%`,
        subtitle: undefined,
        x: 462
      },
      {
        id: 'one-hour-open-rate',
        title: 'ONE HOUR OPEN RATE',
        value: campaign.core_metrics?.['1_hour_open_rate'] ? `${campaign.core_metrics['1_hour_open_rate'].toFixed(1)}%` : 'undefined%',
        subtitle: 'Immediate Engagement',
        x: 605
      }
    ];

    secondRowCards.forEach(card => {
      components.push({
        id: card.id,
        type: 'secondary',
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
  }

  components.push({
    id: 'audience-breakdown',
    type: 'specialty-strips',
    title: 'AUDIENCE BREAKDOWN',
    specialties: mergeSubspecialties ? 
      getTopSpecialties(campaign.specialty_performance, true) : 
      Object.entries(campaign.specialty_performance)
        .filter(([name, data]) => {
          return data.audience_total >= 100 && 
                !name.toLowerCase().includes('unknown') &&
                !name.toLowerCase().includes('staff') &&
                data.unique_open_rate > 0;
        })
        .sort((a, b) => b[1].audience_percentage - a[1].audience_percentage)
        .slice(0, 4),
    position: { x: 23, y: 350, width: 718, height: 190 },
    style: { background: 'transparent' }
  });

  return components;
};

export const generateSingleOneTemplate = (campaign, theme, mergeSubspecialties = false, costComparisonMode = 'none') => {
  const components = generateSingleNoneTemplate(campaign, theme, mergeSubspecialties, costComparisonMode);
  const themeColors = getThemeColors(theme);
  
  const audienceComponent = components.find(c => c.id === 'audience-breakdown');
  if (audienceComponent) {
    audienceComponent.position = { x: 23, y: 350, width: 433, height: 190 };
  }

  components.push({
    id: 'additional-table-1',
    type: 'table',
    title: 'Online Journal Metrics',
    config: { 
      customData: [
        ['Avg Time in Issue', '3m 19s'],
        ['Total Page Views', '2,778'],
        ['Total Issue Visits', '439']
      ],
      headers: ['Platform', 'Value']
    },
    position: { x: 463, y: 360, width: 261, height: 154 },
    style: {
      background: themeColors.cardGradient || '#f8fafc',
      border: `1px solid ${themeColors.border || '#e2e8f0'}`,
      borderRadius: '6px'
    }
  });

  return components;
};

function getTopSpecialties(specialtyData, mergeSubspecialties) {
  if (!specialtyData) return [];
  
  let processedData = Object.entries(specialtyData);
  
  if (mergeSubspecialties) {
    const merged = {};
    let totalAudience = 0;
    
    processedData.forEach(([name, data]) => {
      totalAudience += data.audience_total || 0;
    });
    
    processedData.forEach(([name, data]) => {
      const baseSpecialty = name.split(' - ')[0];
      if (!merged[baseSpecialty]) {
        merged[baseSpecialty] = {
          audience_total: 0,
          unique_opens: 0,
          total_opens: 0,
          unique_open_rate: 0,
          audience_percentage: 0,
          count: 0
        };
      }
      merged[baseSpecialty].audience_total += data.audience_total || 0;
      merged[baseSpecialty].unique_opens += data.unique_opens || 0;
      merged[baseSpecialty].total_opens += data.total_opens || 0;
      merged[baseSpecialty].count += 1;
    });
    
    Object.keys(merged).forEach(specialty => {
      const data = merged[specialty];
      data.unique_open_rate = data.audience_total > 0 ? 
        (data.unique_opens / data.audience_total) * 100 : 0;
      data.audience_percentage = totalAudience > 0 ? 
        (data.audience_total / totalAudience) * 100 : 0;
    });
    
    processedData = Object.entries(merged);
  } else {
    const totalAudience = processedData.reduce((sum, [, data]) => sum + (data.audience_total || 0), 0);
    processedData.forEach(([name, data]) => {
      if (!data.audience_percentage && totalAudience > 0) {
        data.audience_percentage = (data.audience_total / totalAudience) * 100;
      }
    });
  }
  
  return processedData
    .filter(([name, data]) => {
      return data.audience_total >= 100 && 
            !name.toLowerCase().includes('unknown') &&
            !name.toLowerCase().includes('staff') &&
            data.unique_open_rate > 0;
    })
    .sort((a, b) => b[1].audience_percentage - a[1].audience_percentage)
    .slice(0, 4);
}

function aggregateMultiCampaignData(campaigns, mergeSubspecialties) {
  const aggregated = {
    core_metrics: { unique_open_rate: 0, total_open_rate: 0, unique_click_rate: 0, total_click_rate: 0 },
    volume_metrics: { sent: 0, delivered: 0, unique_opens: 0, total_opens: 0 },
    cost_metrics: { estimated_patient_impact: 0 },
    specialty_performance: {}
  };

  campaigns.forEach(campaign => {
    
    Object.keys(aggregated.volume_metrics).forEach(key => {
      aggregated.volume_metrics[key] += campaign.volume_metrics?.[key] || 0;
    });
    
    aggregated.cost_metrics.estimated_patient_impact += campaign.cost_metrics?.estimated_patient_impact || 0;

    if (campaign.specialty_performance) {
      Object.entries(campaign.specialty_performance).forEach(([specialty, data]) => {
        if (!aggregated.specialty_performance[specialty]) {
          aggregated.specialty_performance[specialty] = {
            audience_total: 0,
            unique_opens: 0,
            total_opens: 0,
            unique_open_rate: 0,
            audience_percentage: 0,
            performance_delta: 0,
            count: 0
          };
        }
        
        const aggData = aggregated.specialty_performance[specialty];
        aggData.audience_total += data.audience_total || 0;
        aggData.unique_opens += data.unique_opens || 0;
        aggData.total_opens += data.total_opens || 0;
        aggData.performance_delta += data.performance_delta || 0;
        aggData.count++;
      });
    }
  });

  aggregated.core_metrics.unique_open_rate = aggregated.volume_metrics.delivered > 0 ?
    (aggregated.volume_metrics.unique_opens / aggregated.volume_metrics.delivered) * 100 : 0;
  aggregated.core_metrics.total_open_rate = aggregated.volume_metrics.delivered > 0 ?
    (aggregated.volume_metrics.total_opens / aggregated.volume_metrics.delivered) * 100 : 0;
  
  let totalUniqueClicks = 0;
  let totalClicks = 0;
  campaigns.forEach(campaign => {
    const uniqueClickRate = campaign.core_metrics?.unique_click_rate || 0;
    const totalClickRate = campaign.core_metrics?.total_click_rate || 0;
    const delivered = campaign.volume_metrics?.delivered || 0;
    
    totalUniqueClicks += (uniqueClickRate / 100) * delivered;
    totalClicks += (totalClickRate / 100) * delivered;
  });
  
  aggregated.core_metrics.unique_click_rate = aggregated.volume_metrics.delivered > 0 ?
    (totalUniqueClicks / aggregated.volume_metrics.delivered) * 100 : 0;
  aggregated.core_metrics.total_click_rate = aggregated.volume_metrics.delivered > 0 ?
    (totalClicks / aggregated.volume_metrics.delivered) * 100 : 0;

  const totalAudience = Object.values(aggregated.specialty_performance)
    .reduce((sum, data) => sum + data.audience_total, 0);

  Object.values(aggregated.specialty_performance).forEach(data => {
    data.unique_open_rate = data.audience_total > 0 ? 
      (data.unique_opens / data.audience_total) * 100 : 0;
    data.performance_delta = data.count > 0 ? data.performance_delta / data.count : 0;
    data.audience_percentage = totalAudience > 0 ? (data.audience_total / totalAudience) * 100 : 0;
  });

  return aggregated;
}

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

export const generateSingleTwoTemplate = (campaign, theme, mergeSubspecialties = false, costComparisonMode = 'none') => {
  const components = [];
  const themeColors = getThemeColors(theme);

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

  components.push({
    id: 'hero-unique-engagement',
    type: 'hero',
    title: 'UNIQUE ENGAGEMENT RATE',
    value: `${campaign.core_metrics?.unique_open_rate?.toFixed(1)}%`,
    subtitle: `+${campaign.core_metrics?.performance_vs_industry?.toFixed(1)}% above industry`,
    position: { x: 30, y: 95, width: 200, height: 88 },
    style: {
      background: themeColors.heroGradient || 'linear-gradient(135deg, #1e40af, #3b82f6)',
      color: '#ffffff',
      font: '20px',
      borderRadius: '8px'
    }
  });

  components.push({
    id: 'hero-patient-impact',
    title: 'POTENTIAL PATIENT IMPACT',
    value: `${((campaign.cost_metrics?.estimated_patient_impact) / 1000000).toFixed(1)}M`,
    subtitle: 'Estimated patient panel sizes',
    position: { x: 270, y: 95, width: 200, height: 88 },
    style: {
      background: themeColors.cardGradient || '#f8fafc',
      border: `1px solid ${themeColors.border || '#e2e8f0'}`,
      borderRadius: '8px'
    }
  });

  if (costComparisonMode === 'none') {
    components.push({
      id: 'cost-comparison',
      title: 'HEALTHCARE PROFESSIONALS REACHED',
      value: (campaign.volume_metrics?.delivered).toLocaleString(),
      subtitle: `${((campaign.volume_metrics?.delivered / campaign.volume_metrics?.sent) * 100).toFixed(1)}% delivery rate`,
      position: { x: 510, y: 95, width: 200, height: 88 },
      currentTheme: theme,
      style: {
        background: themeColors.cardGradient || '#f8fafc',
        border: `1px solid ${themeColors.border || '#e2e8f0'}`,
        borderRadius: '8px'
      }
    });

    components.push({
      id: 'healthcare-professionals-reached',
      type: 'secondary',
      title: 'UNIQUE PROFESSIONAL ENGAGEMENTS',
      value: (campaign.volume_metrics?.unique_opens).toLocaleString(),
      subtitle: `${(campaign.volume_metrics?.total_opens).toLocaleString()} total opens`,
      position: { x: 30, y: 228, width: 104, height: 75 },
      style: {
        background: themeColors.cardGradient || '#f8fafc',
        border: `1px solid ${themeColors.border || '#e2e8f0'}`,
        borderRadius: '6px'
      }
    });

    components.push({
      id: 'unique-professional-engagements',
      type: 'secondary',
      title: 'UNIQUE CLICK RATE',
      value: `${campaign.core_metrics?.unique_click_rate?.toFixed(1)}%`,
      subtitle: `${campaign.core_metrics?.total_click_rate?.toFixed(1)}% total click rate`,
      position: { x: 176, y: 228, width: 104, height: 75 },
      style: {
        background: themeColors.cardGradient || '#f8fafc',
        border: `1px solid ${themeColors.border || '#e2e8f0'}`,
        borderRadius: '6px'
      }
    });

    components.push({
      id: 'unique-click-rate',
      type: 'secondary',
      title: 'ONE HOUR OPEN RATE',
      value: campaign.core_metrics?.['1_hour_open_rate'] ? `${campaign.core_metrics['1_hour_open_rate'].toFixed(1)}%` : 'undefined%',
      subtitle: 'Immediate Engagement',
      position: { x: 319, y: 228, width: 104, height: 75 },
      style: {
        background: themeColors.cardGradient || '#f8fafc',
        border: `1px solid ${themeColors.border || '#e2e8f0'}`,
        borderRadius: '6px'
      }
    });
  } else {
    components.push({
      id: 'cost-comparison',
      type: 'cost-comparison',
      currentTheme: theme,
      contractedCost: 10,
      actualCost: 5,
      position: { x: 510, y: 95, width: 200, height: 88 }
    });

    components.push({
      id: 'healthcare-professionals-reached',
      type: 'secondary',
      title: 'HEALTHCARE PROFESSIONALS REACHED',
      value: (campaign.volume_metrics?.delivered).toLocaleString(),
      subtitle: `${((campaign.volume_metrics?.delivered / campaign.volume_metrics?.sent) * 100).toFixed(1)}% delivery rate`,
      position: { x: 30, y: 228, width: 104, height: 75 },
      style: {
        background: themeColors.cardGradient || '#f8fafc',
        border: `1px solid ${themeColors.border || '#e2e8f0'}`,
        borderRadius: '6px'
      }
    });

    components.push({
      id: 'unique-professional-engagements',
      type: 'secondary',
      title: 'UNIQUE PROFESSIONAL ENGAGEMENTS',
      value: (campaign.volume_metrics?.unique_opens).toLocaleString(),
      subtitle: `${(campaign.volume_metrics?.total_opens).toLocaleString()} total opens`,
      position: { x: 176, y: 228, width: 104, height: 75 },
      style: {
        background: themeColors.cardGradient || '#f8fafc',
        border: `1px solid ${themeColors.border || '#e2e8f0'}`,
        borderRadius: '6px'
      }
    });

    components.push({
      id: 'unique-click-rate',
      type: 'secondary',
      title: 'UNIQUE CLICK RATE',
      value: `${campaign.core_metrics?.unique_click_rate?.toFixed(1)}%`,
      subtitle: `${campaign.core_metrics?.total_click_rate?.toFixed(1)}% total click rate`,
      position: { x: 319, y: 228, width: 104, height: 75 },
      style: {
        background: themeColors.cardGradient || '#f8fafc',
        border: `1px solid ${themeColors.border || '#e2e8f0'}`,
        borderRadius: '6px'
      }
    });
  }

  components.push({
    id: 'audience-breakdown',
    type: 'specialty-strips',
    title: 'AUDIENCE BREAKDOWN',
    specialties: mergeSubspecialties ? 
      getTopSpecialties(campaign.specialty_performance, true) : 
      Object.entries(campaign.specialty_performance)
        .filter(([name, data]) => {
          return data.audience_total >= 100 && 
                !name.toLowerCase().includes('unknown') &&
                !name.toLowerCase().includes('staff') &&
                data.unique_open_rate > 0;
        })
        .sort((a, b) => b[1].audience_percentage - a[1].audience_percentage)
        .slice(0, 4),
    position: { x: 23, y: 350, width: 433, height: 212 },
    style: { background: 'transparent' }
  });

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
    position: { x: 463, y: 395, width: 261, height: 140 },
    style: {
      background: themeColors.cardGradient || '#f8fafc',
      border: `1px solid ${themeColors.border || '#e2e8f0'}`,
      borderRadius: '6px'
    }
  });

  components.push({
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
    position: { x: 464, y: 228, width: 261, height: 140 },
    style: {
      background: themeColors.cardGradient || '#f8fafc',
      border: `1px solid ${themeColors.border || '#e2e8f0'}`,
      borderRadius: '6px'
    }
  });

  return components;
};

export const generateSingleThreeTemplate = (campaign, theme, mergeSubspecialties = false, costComparisonMode = 'none') => {
  const components = [];
  const themeColors = getThemeColors(theme);

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

  components.push({
    id: 'hero-unique-engagement',
    type: 'hero',
    title: 'UNIQUE ENGAGEMENT RATE',
    value: `${campaign.core_metrics?.unique_open_rate?.toFixed(1)}%`,
    subtitle: `+${campaign.core_metrics?.performance_vs_industry?.toFixed(1)}% above industry`,
    position: { x: 30, y: 95, width: 200, height: 88 },
    style: {
      background: themeColors.heroGradient || 'linear-gradient(135deg, #1e40af, #3b82f6)',
      color: '#ffffff',
      font: '20px',
      borderRadius: '8px'
    }
  });

  components.push({
    id: 'hero-patient-impact',
    title: 'POTENTIAL PATIENT IMPACT',
    value: `${((campaign.cost_metrics?.estimated_patient_impact) / 1000000).toFixed(1)}M`,
    subtitle: 'Estimated patient panel sizes',
    position: { x: 270, y: 95, width: 200, height: 88 },
    style: {
      background: themeColors.cardGradient || '#f8fafc',
      border: `1px solid ${themeColors.border || '#e2e8f0'}`,
      borderRadius: '8px'
    }
  });

  if (costComparisonMode === 'none') {
    components.push({
      id: 'cost-comparison',
      title: 'HEALTHCARE PROFESSIONALS REACHED',
      value: (campaign.volume_metrics?.delivered).toLocaleString(),
      subtitle: `${((campaign.volume_metrics?.delivered / campaign.volume_metrics?.sent) * 100).toFixed(1)}% delivery rate`,
      position: { x: 510, y: 95, width: 200, height: 88 },
      currentTheme: theme,
      style: {
        background: themeColors.cardGradient || '#f8fafc',
        border: `1px solid ${themeColors.border || '#e2e8f0'}`,
        borderRadius: '8px'
      }
    });

    components.push({
      id: 'healthcare-professionals-reached',
      type: 'secondary',
      title: 'UNIQUE PROFESSIONAL ENGAGEMENTS',
      value: (campaign.volume_metrics?.unique_opens).toLocaleString(),
      subtitle: `${(campaign.volume_metrics?.total_opens).toLocaleString()} total opens`,
      position: { x: 30, y: 228, width: 104, height: 75 },
      style: {
        background: themeColors.cardGradient || '#f8fafc',
        border: `1px solid ${themeColors.border || '#e2e8f0'}`,
        borderRadius: '6px'
      }
    });

    components.push({
      id: 'unique-professional-engagements',
      type: 'secondary',
      title: 'UNIQUE CLICK RATE',
      value: `${campaign.core_metrics?.unique_click_rate?.toFixed(1)}%`,
      subtitle: `${campaign.core_metrics?.total_click_rate?.toFixed(1)}% total click rate`,
      position: { x: 176, y: 228, width: 104, height: 75 },
      style: {
        background: themeColors.cardGradient || '#f8fafc',
        border: `1px solid ${themeColors.border || '#e2e8f0'}`,
        borderRadius: '6px'
      }
    });

    components.push({
      id: 'unique-click-rate',
      type: 'secondary',
      title: 'ONE HOUR OPEN RATE',
      value: campaign.core_metrics?.['1_hour_open_rate'] ? `${campaign.core_metrics['1_hour_open_rate'].toFixed(1)}%` : 'undefined%',
      subtitle: 'Immediate Engagement',
      position: { x: 319, y: 228, width: 104, height: 75 },
      style: {
        background: themeColors.cardGradient || '#f8fafc',
        border: `1px solid ${themeColors.border || '#e2e8f0'}`,
        borderRadius: '6px'
      }
    });
  } else {
    components.push({
      id: 'cost-comparison',
      type: 'cost-comparison',
      currentTheme: theme,
      contractedCost: 10,
      actualCost: 5,
      position: { x: 510, y: 95, width: 200, height: 88 }
    });

    components.push({
      id: 'healthcare-professionals-reached',
      type: 'secondary',
      title: 'HEALTHCARE PROFESSIONALS REACHED',
      value: (campaign.volume_metrics?.delivered).toLocaleString(),
      subtitle: `${((campaign.volume_metrics?.delivered / campaign.volume_metrics?.sent) * 100).toFixed(1)}% delivery rate`,
      position: { x: 30, y: 228, width: 104, height: 75 },
      style: {
        background: themeColors.cardGradient || '#f8fafc',
        border: `1px solid ${themeColors.border || '#e2e8f0'}`,
        borderRadius: '6px'
      }
    });

    components.push({
      id: 'unique-professional-engagements',
      type: 'secondary',
      title: 'UNIQUE PROFESSIONAL ENGAGEMENTS',
      value: (campaign.volume_metrics?.unique_opens).toLocaleString(),
      subtitle: `${(campaign.volume_metrics?.total_opens).toLocaleString()} total opens`,
      position: { x: 176, y: 228, width: 104, height: 75 },
      style: {
        background: themeColors.cardGradient || '#f8fafc',
        border: `1px solid ${themeColors.border || '#e2e8f0'}`,
        borderRadius: '6px'
      }
    });

    components.push({
      id: 'unique-click-rate',
      type: 'secondary',
      title: 'UNIQUE CLICK RATE',
      value: `${campaign.core_metrics?.unique_click_rate?.toFixed(1)}%`,
      subtitle: `${campaign.core_metrics?.total_click_rate?.toFixed(1)}% total click rate`,
      position: { x: 319, y: 228, width: 104, height: 75 },
      style: {
        background: themeColors.cardGradient || '#f8fafc',
        border: `1px solid ${themeColors.border || '#e2e8f0'}`,
        borderRadius: '6px'
      }
    });
  }

  components.push({
    id: 'audience-breakdown',
    type: 'specialty-strips',
    title: 'AUDIENCE BREAKDOWN',
    specialties: mergeSubspecialties ? 
      getTopSpecialties(campaign.specialty_performance, true) : 
      Object.entries(campaign.specialty_performance)
        .filter(([name, data]) => {
          return data.audience_total >= 100 && 
                !name.toLowerCase().includes('unknown') &&
                !name.toLowerCase().includes('staff') &&
                data.unique_open_rate > 0;
        })
        .sort((a, b) => b[1].audience_percentage - a[1].audience_percentage)
        .slice(0, 4),
    position: { x: 23, y: 350, width: 433, height: 212 },
    style: { background: 'transparent' }
  });

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
    position: { x: 463, y: 395, width: 261, height: 140 },
    style: {
      background: themeColors.cardGradient || '#f8fafc',
      border: `1px solid ${themeColors.border || '#e2e8f0'}`,
      borderRadius: '6px'
    }
  });

  components.push({
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
    position: { x: 464, y: 228, width: 261, height: 140 },
    style: {
      background: themeColors.cardGradient || '#f8fafc',
      border: `1px solid ${themeColors.border || '#e2e8f0'}`,
      borderRadius: '6px'
    }
  });

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
    position: { x: 752, y: 395, width: 225, height: 140 },
    style: {
      background: themeColors.cardGradient || '#f8fafc',
      border: `1px solid ${themeColors.border || '#e2e8f0'}`,
      borderRadius: '6px'
    }
  });

  return components;
};

export const generateMultiNoneTemplate = (campaigns, theme, mergeSubspecialties = false, costComparisonMode = 'none') => {
  const components = [];
  const themeColors = getThemeColors(theme);
  const aggregatedData = aggregateMultiCampaignData(campaigns, mergeSubspecialties);
  
  const campaignNames = campaigns.map(c => c.campaign_name).slice(0, 3).join(' + ');
  const titleText = campaigns.length > 3 ?
    `${campaignNames} + ${campaigns.length - 3} more` : campaignNames;
  
  components.push({
    id: 'multi-campaign-title',
    type: 'title',
    title: `Multi-Campaign Analysis: ${titleText}`,
    position: { x: 5, y: -5, width: 800, height: 70 },
    style: {
      background: 'transparent',
      color: themeColors.darkGray || '#1f2937'
    }
  });

  const multiHeroCards = [
    {
      id: 'multi-unique-engagement',
      title: 'UNIQUE ENGAGEMENT RATE',
      value: `${aggregatedData.core_metrics?.unique_open_rate?.toFixed(1)}%`,
      subtitle: 'Aggregated across campaigns',
      x: 15
    },
    {
      id: 'multi-patient-impact',
      title: 'POTENTIAL PATIENT IMPACT',
      value: `${((aggregatedData.cost_metrics?.estimated_patient_impact) / 1000000).toFixed(1)}M`,
      subtitle: 'Combined impact potential',
      x: 205
    },
    {
      id: 'multi-cost-comparison',
      title: 'HEALTHCARE PROFESSIONALS REACHED',
      value: (aggregatedData.volume_metrics?.delivered).toLocaleString(),
      subtitle: `${((aggregatedData.volume_metrics?.delivered / aggregatedData.volume_metrics?.sent) * 100).toFixed(1)}% delivery rate`,
      x: 395
    },
    {
      id: 'multi-professional-engagements',
      title: 'UNIQUE PROFESSIONAL ENGAGEMENTS',
      value: (aggregatedData.volume_metrics?.unique_opens).toLocaleString(),
      subtitle: 'Total unique professionals',
      x: 585
    }
  ];

  multiHeroCards.forEach((card, index) => {
    if (costComparisonMode !== 'none' && card.id === 'multi-professional-engagements') {
      components.push({
        id: 'cost-comparison',
        type: 'cost-comparison',
        currentTheme: theme,
        contractedCost: 10,
        actualCost: 5,
        position: { x: card.x, y: 90, width: 150, height: 58 }
      });
    } else {
      components.push({
        id: card.id,
        type: index === 0 ? 'hero' : 'secondary',
        title: card.title,
        value: card.value,
        subtitle: card.subtitle,
        position: { x: card.x, y: 90, width: 150, height: 58 },
        isMulti: true,
        style: {
          background: index === 0 ? (themeColors.heroGradient || 'linear-gradient(135deg, #1e40af, #3b82f6)') : (themeColors.cardGradient || '#f8fafc'),
          color: index === 0 ? '#ffffff' : (themeColors.text || '#1f2937'),
          border: index === 0 ? 'none' : `1px solid ${themeColors.border || '#e2e8f0'}`,
          borderRadius: '6px'
        }
      });
    }
  });

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
    position: { x: 15, y: 190, width: 748, height: 207 },
    style: {
      background: themeColors.cardGradient || '#f8fafc',
      border: `1px solid ${themeColors.border || '#e2e8f0'}`,
      borderRadius: '6px'
    }
  });

  components.push({
    id: 'aggregated-audience-breakdown',
    type: 'specialty-strips',
    title: 'AUDIENCE BREAKDOWN',
    specialties: getTopSpecialties(aggregatedData.specialty_performance, mergeSubspecialties),
    position: { x: 10, y: 400, width: 762, height: 170 },
    style: { background: 'transparent' }
  });

  return components;
};

export const generateMultiOneTemplate = (campaigns, theme, mergeSubspecialties = false, costComparisonMode = 'none') => {
  const components = generateMultiNoneTemplate(campaigns, theme, mergeSubspecialties, costComparisonMode);
  const themeColors = getThemeColors(theme);
  
  const audienceComponent = components.find(c => c.id === 'aggregated-audience-breakdown');
  if (audienceComponent) {
    audienceComponent.position = { x: 10, y: 400, width: 457, height: 170 };
  }

  components.push({
    id: 'additional-table-1',
    type: 'table',
    title: 'Social Media Metrics',
    config: { 
      customData: [
        ['LinkedIn CTR', '%'],
        ['Linkedin Engagement Rate', '%'],
        ['Linkedin Impressions', '#']
      ],
      headers: ['Metric', 'Value']
    },
    position: { x: 472, y: 415, width: 278, height: 125 },
    style: {
      background: themeColors.cardGradient || '#f8fafc',
      border: `1px solid ${themeColors.border || '#e2e8f0'}`,
      borderRadius: '6px'
    }
  });

  return components;
};

export const generateMultiTwoTemplate = (campaigns, theme, mergeSubspecialties = false, costComparisonMode = 'none') => {
  const components = generateMultiOneTemplate(campaigns, theme, mergeSubspecialties, costComparisonMode);
  const themeColors = getThemeColors(theme);
  
  const firstTable = components.find(c => c.id === 'additional-table-1');
  if (firstTable) {
    firstTable.position = { x: 472, y: 415, width: 244, height: 125 };
  }

  components.push({
    id: 'additional-table-2',
    type: 'table',
    title: 'Video Metrics',
    config: { 
      customData: [
        ['Views', '#'],
        ['Avg Time Watched', '#'],
        ['Impressions', '#']
      ],
      headers: ['Metric', 'Value']
    },
    position: { x: 741, y: 415, width: 244, height: 125 },
    style: {
      background: themeColors.cardGradient || '#f8fafc',
      border: `1px solid ${themeColors.border || '#e2e8f0'}`,
      borderRadius: '6px'
    }
  });

  return components;
};

export const generateMultiThreeTemplate = (campaigns, theme, mergeSubspecialties = false, costComparisonMode = 'none') => {
  const components = generateMultiTwoTemplate(campaigns, theme, mergeSubspecialties, costComparisonMode);
  const themeColors = getThemeColors(theme);
  
  const secondTable = components.find(c => c.id === 'additional-table-2');
  if (secondTable) {
    secondTable.position = { x: 741, y: 415, width: 244, height: 125 };
  }

  components.push({
    id: 'additional-table-3',
    type: 'table',
    title: 'Performance Metrics',
    config: { 
      customData: [
        ['CTR', '%'],
        ['Conversions', '#'],
        ['ROI', '%']
      ],
      headers: ['Metric', 'Value']
    },
    position: { x: 741, y: 290, width: 244, height: 120 },
    style: {
      background: themeColors.cardGradient || '#f8fafc',
      border: `1px solid ${themeColors.border || '#e2e8f0'}`,
      borderRadius: '6px'
    }
  });

  return components;
};

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

export const generateTemplate = (config) => {
  const { template, campaigns, theme, type, mergeSubspecialties = false, costComparisonMode = 'none' } = config;
  const generator = TEMPLATE_GENERATORS[template.id];
  
  if (!generator) {
    throw new Error(`Template ${template.id} not found`);
  }
  
  if (type === 'single') {
    return generator(campaigns[0], theme, mergeSubspecialties, costComparisonMode);
  } else {
    return generator(campaigns, theme, mergeSubspecialties, costComparisonMode);
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