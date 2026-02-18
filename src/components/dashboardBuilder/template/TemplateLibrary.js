import { TEMPLATE_TYPES, getThemeColors, TABLE_TYPES, TABLE_DEFINITIONS } from './LayoutTemplates';

const addMatrixLogo = (components, theme) => {
  if (theme !== 'matrix') {
    components.push({
      id: 'matrix-logo-bottom',
      type: 'image',
      src: `${process.env.PUBLIC_URL}/matrix.png`,
      position: { x: 905, y: 520, width: 90, height: 36 },
      isLogo: true,
      style: { pointerEvents: 'none' }
    });
  }
};

export const generateSingleNoneTemplate = (campaign, theme, mergeSubspecialties = false, costComparisonMode = 'none', showTotalSends = false) => {
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

  const hasCostComparison = costComparisonMode !== 'none';

  const topRowCards = hasCostComparison ? 3 : 2;

  let cardWidth, cardSpacing, startX;
  if (topRowCards === 2) {
    cardWidth = 319;
    cardSpacing = 41;
    startX = 30;
  } else if (topRowCards === 3) {
    cardWidth = 200;
    cardSpacing = 40;
    startX = 30;
  }

  components.push({
    id: 'hero-unique-engagement',
    type: 'hero',
    title: 'UNIQUE ENGAGEMENT RATE',
    value: `${campaign.core_metrics?.unique_open_rate?.toFixed(1)}%`,
    position: { x: startX, y: 95, width: cardWidth, height: 88 },
    style: {
      background: themeColors.heroGradient || 'linear-gradient(135deg, #1e40af, #3b82f6)',
      color: '#ffffff',
      font: '20px',
      borderRadius: '8px'
    }
  });

  const healthcareSubtitle = showTotalSends
    ? `${(campaign.volume_metrics?.sent).toLocaleString()} Total Sends`
    : `${((campaign.volume_metrics?.delivered / campaign.volume_metrics?.sent) * 100).toFixed(1)}% delivery rate`;

  const healthcareX = startX + cardWidth + cardSpacing;
  components.push({
    id: 'healthcare-professionals-reached',
    type: 'metric',
    title: 'HEALTHCARE PROFESSIONALS REACHED',
    value: (campaign.volume_metrics?.delivered).toLocaleString(),
    subtitle: healthcareSubtitle,
    position: { x: healthcareX, y: 95, width: cardWidth, height: 88 },
    currentTheme: theme,
    style: {
      background: themeColors.cardGradient || '#f8fafc',
      border: `1px solid ${themeColors.border || '#e2e8f0'}`,
      borderRadius: '8px'
    }
  });

  if (hasCostComparison) {
    const costComparisonX = startX + (2 * (cardWidth + cardSpacing));

    components.push({
      id: 'cost-comparison',
      type: 'cost-comparison',
      currentTheme: theme,
      contractedCost: 10,
      actualCost: 5,
      position: { x: costComparisonX, y: 95, width: cardWidth, height: 88 }
    });
  }

  const secondRowCards = [];

  secondRowCards.push({
    id: 'total-professional-engagements',
    title: 'TOTAL PROFESSIONAL ENGAGEMENTS',
    value: (campaign.volume_metrics?.total_opens).toLocaleString(),
    subtitle: `${((campaign.volume_metrics?.total_opens / campaign.volume_metrics?.delivered) * 100).toFixed(1)}% total open rate`,
    x: 30
  });

  secondRowCards.push(
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
  );

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

  addMatrixLogo(components, theme);
  return components;
};

export const generateSingleOneTemplate = (campaign, theme, mergeSubspecialties = false, costComparisonMode = 'none', showTotalSends = false) => {
  const components = generateSingleNoneTemplate(campaign, theme, mergeSubspecialties, costComparisonMode, showTotalSends);
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
        ['Avg Time in Issue', ''],
        ['Total Page Views', ''],
        ['Total Issue Visits', '']
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

  addMatrixLogo(components, theme);
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

const generateTableForType = (tableType, position, themeColors) => {
  const tableDefinition = TABLE_DEFINITIONS[tableType];
  
  if (!tableDefinition) {
    return {
      id: `table-${position}`,
      type: 'table',
      title: `Table ${position}`,
      config: { 
        customData: [
          ['Metric', 'Value'],
          ['Example 1', '100'],
          ['Example 2', '200']
        ],
        headers: ['Metric', 'Value']
      },
      style: {
        background: themeColors.cardGradient || '#f8fafc',
        border: `1px solid ${themeColors.border || '#e2e8f0'}`,
        borderRadius: '6px'
      }
    };
  }
  
  return {
    id: `additional-table-${position}`,
    type: 'table',
    title: tableDefinition.title,
    config: { 
      customData: tableDefinition.data,
      headers: tableDefinition.headers
    },
    style: {
      background: themeColors.cardGradient || '#f8fafc',
      border: `1px solid ${themeColors.border || '#e2e8f0'}`,
      borderRadius: '6px'
    }
  };
};

export const generateSingleTwoTemplate = (campaign, theme, mergeSubspecialties = false, costComparisonMode = 'none', showTotalSends = false, selectedTableTypes = {}) => {
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

  const hasCostComparison = costComparisonMode !== 'none';

  const topRowCards = hasCostComparison ? 3 : 2;

  let cardWidth, cardSpacing, startX;
  if (topRowCards === 2) {
    cardWidth = 319;
    cardSpacing = 41;
    startX = 30;
  } else if (topRowCards === 3) {
    cardWidth = 200;
    cardSpacing = 40;
    startX = 30;
  }

  components.push({
    id: 'hero-unique-engagement',
    type: 'hero',
    title: 'UNIQUE ENGAGEMENT RATE',
    value: `${campaign.core_metrics?.unique_open_rate?.toFixed(1)}%`,
    position: { x: startX, y: 95, width: cardWidth, height: 88 },
    style: {
      background: themeColors.heroGradient || 'linear-gradient(135deg, #1e40af, #3b82f6)',
      color: '#ffffff',
      font: '20px',
      borderRadius: '8px'
    }
  });

  const healthcareSubtitle = showTotalSends
    ? `${(campaign.volume_metrics?.sent).toLocaleString()} Total Sends`
    : `${((campaign.volume_metrics?.delivered / campaign.volume_metrics?.sent) * 100).toFixed(1)}% delivery rate`;

  const healthcareX = startX + cardWidth + cardSpacing;
  components.push({
    id: 'healthcare-professionals-reached',
    type: 'metric',
    title: 'HEALTHCARE PROFESSIONALS REACHED',
    value: (campaign.volume_metrics?.delivered).toLocaleString(),
    subtitle: healthcareSubtitle,
    position: { x: healthcareX, y: 95, width: cardWidth, height: 88 },
    currentTheme: theme,
    style: {
      background: themeColors.cardGradient || '#f8fafc',
      border: `1px solid ${themeColors.border || '#e2e8f0'}`,
      borderRadius: '8px'
    }
  });

  if (hasCostComparison) {
    const costComparisonX = startX + (2 * (cardWidth + cardSpacing));

    components.push({
      id: 'cost-comparison',
      type: 'cost-comparison',
      currentTheme: theme,
      contractedCost: 10,
      actualCost: 5,
      position: { x: costComparisonX, y: 95, width: cardWidth, height: 88 }
    });
  }

  const secondRowCards = [];

  secondRowCards.push({
    id: 'total-professional-engagements',
    title: 'TOTAL PROFESSIONAL ENGAGEMENTS',
    value: (campaign.volume_metrics?.total_opens).toLocaleString(),
    subtitle: `${((campaign.volume_metrics?.total_opens / campaign.volume_metrics?.delivered) * 100).toFixed(1)}% total open rate`,
    x: 30
  });

  secondRowCards.push(
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
      subtitle: `${campaign.core_metrics?.unique_click_rate?.toFixed(1)}% unique click rate`,
      x: 319
    }
  );

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

  const table1Type = selectedTableTypes.table1 || TABLE_TYPES.VIDEO_METRICS;
  const table1 = generateTableForType(table1Type, 1, themeColors);
  table1.position = { x: 463, y: 395, width: 261, height: 140 };
  components.push(table1);

  const table2Type = selectedTableTypes.table2 || TABLE_TYPES.ONLINE_JOURNAL;
  const table2 = generateTableForType(table2Type, 2, themeColors);
  table2.position = { x: 464, y: 228, width: 261, height: 140 };
  components.push(table2);

  addMatrixLogo(components, theme);
  return components;
};

export const generateSingleThreeTemplate = (campaign, theme, mergeSubspecialties = false, costComparisonMode = 'none', showTotalSends = false, selectedTableTypes = {}) => {
  const components = generateSingleTwoTemplate(campaign, theme, mergeSubspecialties, costComparisonMode, showTotalSends, selectedTableTypes);
  const themeColors = getThemeColors(theme);

  const matrixLogoIndex = components.findIndex(c => c.id === 'matrix-logo-bottom');
  if (matrixLogoIndex !== -1) {
    components.splice(matrixLogoIndex, 1);
  }

  const table3Type = selectedTableTypes.table3 || TABLE_TYPES.SOCIAL_MEDIA;
  const table3 = generateTableForType(table3Type, 3, themeColors);
  table3.position = { x: 752, y: 431, width: 225, height: 104 };
  components.push(table3);

  return components;
};

export const generateMultiNoneTemplate = (campaigns, theme, mergeSubspecialties = false, costComparisonMode = 'none', showTotalSends = false) => {
  const components = [];
  const themeColors = getThemeColors(theme);
  const aggregatedData = aggregateMultiCampaignData(campaigns, mergeSubspecialties);
  
  const campaignNames = campaigns.map(c => c.campaign_name).slice(0, 3).join(' + ');
  const titleText = campaigns.length > 3 ?
    `${campaignNames} + ${campaigns.length - 3} more` : campaignNames;
  
  components.push({
    id: 'multi-campaign-title',
    type: 'title',
    title: titleText,
    position: { x: 5, y: -5, width: 800, height: 70 },
    style: {
      background: 'transparent',
      color: themeColors.darkGray || '#1f2937'
    }
  });

  const multiHealthcareSubtitle = showTotalSends
    ? `${(aggregatedData.volume_metrics?.sent).toLocaleString()} Total Sends`
    : `${((aggregatedData.volume_metrics?.delivered / aggregatedData.volume_metrics?.sent) * 100).toFixed(1)}% delivery rate`;

  const baseCards = [
    {
      id: 'multi-unique-engagement',
      title: 'UNIQUE ENGAGEMENT RATE',
      value: `${aggregatedData.core_metrics?.unique_open_rate?.toFixed(1)}%`,
      subtitle: 'Aggregated across campaigns'
    },
    {
      id: 'multi-healthcare-professionals',
      title: 'HEALTHCARE PROFESSIONALS REACHED',
      value: (aggregatedData.volume_metrics?.delivered).toLocaleString(),
      subtitle: multiHealthcareSubtitle
    }
  ];

  const conditionalCards = [];

  conditionalCards.push({
    id: 'multi-professional-engagements',
    title: 'UNIQUE PROFESSIONAL ENGAGEMENTS',
    value: (aggregatedData.volume_metrics?.unique_opens).toLocaleString(),
    subtitle: 'Total unique professionals'
  });

  const allCards = [...baseCards, ...conditionalCards];
  const totalCards = allCards.length + (costComparisonMode !== 'none' ? 1 : 0);
  
  let cardWidth, startX;
  if (totalCards === 3) {
    cardWidth = 212;
    startX = 17;
  } else {
    cardWidth = 150;
    startX = 17;
  }
  
  const cardSpacing = totalCards === 3 ? 41 : 39;
  
  allCards.forEach((card, index) => {
    const x = startX + (index * (cardWidth + cardSpacing));
    
    components.push({
      id: card.id,
      type: index === 0 ? 'hero' : 'secondary',
      title: card.title,
      value: card.value,
      subtitle: card.subtitle,
      position: { x, y: 90, width: cardWidth, height: 58 },
      isMulti: true,
      style: {
        background: index === 0 ? (themeColors.heroGradient || 'linear-gradient(135deg, #1e40af, #3b82f6)') : (themeColors.cardGradient || '#f8fafc'),
        color: index === 0 ? '#ffffff' : (themeColors.text || '#1f2937'),
        border: index === 0 ? 'none' : `1px solid ${themeColors.border || '#e2e8f0'}`,
        borderRadius: '6px'
      }
    });
  });

  if (costComparisonMode !== 'none') {
    const costCardX = startX + (allCards.length * (cardWidth + cardSpacing));
    components.push({
      id: 'cost-comparison',
      type: 'cost-comparison',
      currentTheme: theme,
      contractedCost: 10,
      actualCost: 5,
      position: { x: costCardX, y: 90, width: cardWidth, height: 58 }
    });
  }

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
    position: { x: 15, y: 188, width: 748, height: 210 },
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

  addMatrixLogo(components, theme);
  return components;
};

export const generateMultiOneTemplate = (campaigns, theme, mergeSubspecialties = false, costComparisonMode = 'none', showTotalSends = false) => {
  const components = generateMultiNoneTemplate(campaigns, theme, mergeSubspecialties, costComparisonMode, showTotalSends);
  const themeColors = getThemeColors(theme);

  const audienceComponent = components.find(c => c.id === 'aggregated-audience-breakdown');
  if (audienceComponent) {
    audienceComponent.position = { x: 10, y: 400, width: 457, height: 170 };
  }

  components.push({
    id: 'additional-table-1',
    type: 'table',
    title: 'Online Journal Metrics',
    config: {
      customData: [
        ['Avg Time in Issue', ''],
        ['Total Page Views', ''],
        ['Total Issue Visits', '']
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

export const generateMultiTwoTemplate = (campaigns, theme, mergeSubspecialties = false, costComparisonMode = 'none', showTotalSends = false) => {
  const components = generateMultiOneTemplate(campaigns, theme, mergeSubspecialties, costComparisonMode, showTotalSends);
  const themeColors = getThemeColors(theme);

  const matrixLogoIndex = components.findIndex(c => c.id === 'matrix-logo-bottom');
  if (matrixLogoIndex !== -1) {
    components.splice(matrixLogoIndex, 1);
  }

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
        ['Total Time Watched', ''],
        ['Avg Time Watched', ''],
        ['Total Impressions', '']
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

export const generateMultiThreeTemplate = (campaigns, theme, mergeSubspecialties = false, costComparisonMode = 'none', showTotalSends = false) => {
  const components = generateMultiTwoTemplate(campaigns, theme, mergeSubspecialties, costComparisonMode, showTotalSends);
  const themeColors = getThemeColors(theme);

  const secondTable = components.find(c => c.id === 'additional-table-2');
  if (secondTable) {
    secondTable.position = { x: 741, y: 415, width: 244, height: 125 };
  }

  components.push({
    id: 'additional-table-3',
    type: 'table',
    title: 'Landing Page Impressions',
    config: { 
      customData: [
        ['300x250', ''],
        ['728x90', '']
      ],
      headers: ['Metric', 'Value']
    },
    position: { x: 775, y: 297, width: 208, height: 88 },
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
  const { template, campaigns, theme, type, mergeSubspecialties = false, costComparisonMode = 'none', showTotalSends = false, selectedTableTypes = {} } = config;
  const generator = TEMPLATE_GENERATORS[template.id];
  
  if (!generator) {
    throw new Error(`Template ${template.id} not found`);
  }
  
  if (type === 'single') {
    return generator(campaigns[0], theme, mergeSubspecialties, costComparisonMode, showTotalSends, selectedTableTypes);
  } else {
    return generator(campaigns, theme, mergeSubspecialties, costComparisonMode, showTotalSends, selectedTableTypes);
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