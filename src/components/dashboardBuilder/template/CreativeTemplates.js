import { getThemeColors, TABLE_TYPES } from './LayoutTemplates';
import { addMatrixLogo, generateTableForType, sanitizeTitle, detectMonthOnlyDifference, getTopSpecialties } from './TemplateLibrary';

const buildAudienceBreakdown = (specialtyPerformance, mergeSubspecialties, position) => {
  if (!specialtyPerformance) return null;
  return {
    id: 'audience-breakdown',
    type: 'specialty-strips',
    title: 'AUDIENCE BREAKDOWN',
    specialties: mergeSubspecialties
      ? getTopSpecialties(specialtyPerformance, true)
      : Object.entries(specialtyPerformance)
          .filter(([name, data]) => data.audience_total >= 100 && !name.toLowerCase().includes('unknown') && !name.toLowerCase().includes('staff') && data.unique_open_rate > 0)
          .sort((a, b) => b[1].audience_percentage - a[1].audience_percentage)
          .slice(0, 4),
    position,
    style: { background: 'transparent' }
  };
};

const buildAggregatedAudience = (campaigns, mergeSubspecialties, position) => {
  const aggregated = {};
  campaigns.forEach(c => {
    if (c.specialty_performance) {
      Object.entries(c.specialty_performance).forEach(([spec, data]) => {
        if (!aggregated[spec]) {
          aggregated[spec] = { audience_total: 0, unique_opens: 0, audience_percentage: 0, unique_open_rate: 0 };
        }
        aggregated[spec].audience_total += data.audience_total || 0;
        aggregated[spec].unique_opens += data.unique_opens || 0;
      });
    }
  });
  const totalAud = Object.values(aggregated).reduce((s, d) => s + d.audience_total, 0);
  if (totalAud === 0) return null;
  Object.values(aggregated).forEach(d => {
    d.unique_open_rate = d.audience_total > 0 ? (d.unique_opens / d.audience_total) * 100 : 0;
    d.audience_percentage = totalAud > 0 ? (d.audience_total / totalAud) * 100 : 0;
  });
  return {
    id: 'audience-breakdown',
    type: 'specialty-strips',
    title: 'AUDIENCE BREAKDOWN',
    specialties: mergeSubspecialties
      ? getTopSpecialties(aggregated, true)
      : Object.entries(aggregated)
          .filter(([name, data]) => data.audience_total >= 100 && !name.toLowerCase().includes('unknown') && !name.toLowerCase().includes('staff') && data.unique_open_rate > 0)
          .sort((a, b) => b[1].audience_percentage - a[1].audience_percentage)
          .slice(0, 4),
    position,
    style: { background: 'transparent' }
  };
};

export const generateHotTopicsSingle = (campaign, theme, mergeSubspecialties = false, costComparisonMode = 'none', showTotalSends = false, selectedTableTypes = {}) => {
  const components = [];
  const themeColors = getThemeColors(theme);

  components.push({
    id: 'campaign-title',
    type: 'title',
    title: campaign.campaign_name || 'Campaign Analysis',
    position: { x: 22, y: 50, width: 1000, height: 90 },
    style: { background: 'transparent', color: themeColors.darkGray || '#1f2937' }
  });

  const totalOpens = campaign.volume_metrics?.total_opens || 0;
  const bannerValue = totalOpens * 2;

  components.push({
    id: 'ms-enl-kpis',
    type: 'metric-strip',
    title: 'eNL Performance',
    position: { x: 22, y: 128, width: 973, height: 68 },
    config: {
      variant: 'hero',
      metrics: [
        { label: 'Delivered', value: (campaign.volume_metrics?.delivered || 0).toLocaleString() },
        { label: 'Unique Opens', value: (campaign.volume_metrics?.unique_opens || 0).toLocaleString() },
        { label: 'Unique Open Rate', value: `${(campaign.core_metrics?.unique_open_rate || 0).toFixed(1)}%` },
        { label: 'eNL Banner Impressions', value: bannerValue.toLocaleString() },
        { label: 'Click Through Rate', value: `${(campaign.core_metrics?.total_click_rate || 0).toFixed(1)}%` }
      ]
    },
    style: {
      background: themeColors.heroGradient,
      border: 'none',
      borderRadius: '8px'
    }
  });

  const aud = buildAudienceBreakdown(campaign.specialty_performance, mergeSubspecialties,
    { x: 282, y: 205, width: 713, height: 175 });
  if (aud) components.push(aud);

  const journalTable = generateTableForType(TABLE_TYPES.ONLINE_JOURNAL, 1, themeColors);
  journalTable.position = { x: 287, y: 392, width: 330, height: 134 };
  components.push(journalTable);

  const socialTable = generateTableForType(TABLE_TYPES.SOCIAL_MEDIA, 2, themeColors);
  socialTable.position = { x: 646, y: 392, width: 328, height: 134 };
  components.push(socialTable);


  addMatrixLogo(components, theme);
  return components;
};

export const generateHotTopicsMulti = (campaigns, theme, mergeSubspecialties = false, costComparisonMode = 'none', showTotalSends = false, selectedTableTypes = {}) => {
  const components = [];
  const themeColors = getThemeColors(theme);

  const campaignNames = campaigns.map(c => c.campaign_name || 'Unknown');
  const dedup = detectMonthOnlyDifference(campaignNames);
  let titleText;
  if (dedup.isMonthOnly) {
    titleText = sanitizeTitle(dedup.baseName);
  } else {
    const joined = campaignNames.slice(0, 3).join(' + ');
    titleText = campaigns.length > 3 ? `${joined} + ${campaigns.length - 3} more` : joined;
  }

  components.push({
    id: 'multi-campaign-title',
    type: 'title',
    title: titleText,
    position: { x: 24, y: 48, width: 1000, height: 90 },
    style: { background: 'transparent', color: themeColors.darkGray || '#1f2937' }
  });

  const totalDelivered = campaigns.reduce((s, c) => s + (c.volume_metrics?.delivered || 0), 0);
  const totalUniqueOpens = campaigns.reduce((s, c) => s + (c.volume_metrics?.unique_opens || 0), 0);
  const totalTotalOpens = campaigns.reduce((s, c) => s + (c.volume_metrics?.total_opens || 0), 0);
  const aggUniqueOpenRate = totalDelivered > 0 ? (totalUniqueOpens / totalDelivered) * 100 : 0;
  const totalClicks = campaigns.reduce((s, c) => s + ((c.core_metrics?.total_click_rate || 0) / 100) * (c.volume_metrics?.total_opens || 0), 0);
  const aggCTR = totalTotalOpens > 0 ? (totalClicks / totalTotalOpens) * 100 : 0;
  const aggBannerImp = totalTotalOpens * 2;

  components.push({
    id: 'ms-enl-kpis',
    type: 'metric-strip',
    title: 'eNL Performance (Combined)',
    position: { x: 22, y: 128, width: 973, height: 68 },
    config: {
      variant: 'hero',
      metrics: [
        { label: 'Delivered', value: totalDelivered.toLocaleString() },
        { label: 'Unique Opens', value: totalUniqueOpens.toLocaleString() },
        { label: 'Unique Open Rate', value: `${aggUniqueOpenRate.toFixed(1)}%` },
        { label: 'eNL Banner Impressions', value: aggBannerImp.toLocaleString() },
        { label: 'Click Through Rate', value: `${aggCTR.toFixed(1)}%` }
      ]
    },
    style: {
      background: themeColors.heroGradient,
      border: 'none',
      borderRadius: '8px'
    }
  });

  const comparisonRows = campaigns.map((campaign, index) => {
    const totalOpens = campaign.volume_metrics?.total_opens || 0;
    const bannerValue = totalOpens * 2;
    const label = dedup.isMonthOnly ? dedup.months[index] : (campaign.campaign_name || 'Unknown');
    return [
      label,
      (campaign.volume_metrics?.delivered || 0).toLocaleString(),
      (campaign.volume_metrics?.unique_opens || 0).toLocaleString(),
      `${(campaign.core_metrics?.unique_open_rate || 0).toFixed(1)}%`,
      bannerValue.toLocaleString(),
      `${(campaign.core_metrics?.total_click_rate || 0).toFixed(1)}%`
    ];
  });

  const compTableHeight = Math.max(Math.min(171, 45 + campaigns.length * 28), 392 - 207) - 15;

  components.push({
    id: 'campaign-comparison-table',
    type: 'table',
    title: '',
    config: {
      customData: comparisonRows,
      headers: [
        dedup.isMonthOnly ? 'Month' : 'Campaign',
        'Delivered', 'Unique Opens', 'Open Rate', 'Banner Imp', 'CTR'
      ]
    },
    position: { x: 287, y: 207, width: 702, height: compTableHeight },
    style: {
      background: themeColors.cardGradient,
      border: `1px solid ${themeColors.border}`,
      borderRadius: '6px'
    }
  });

  const journalTable = generateTableForType(TABLE_TYPES.ONLINE_JOURNAL, 1, themeColors);
  journalTable.position = { x: 287, y: 392, width: 328, height: 134 };
  components.push(journalTable);

  const socialTable = generateTableForType(TABLE_TYPES.SOCIAL_MEDIA, 2, themeColors);
  socialTable.position = { x: 645, y: 392, width: 328, height: 134 };
  components.push(socialTable);


  addMatrixLogo(components, theme);
  return components;
};

export const generateExpertPerspectivesSingle = (campaign, theme, mergeSubspecialties = false, costComparisonMode = 'none', showTotalSends = false, selectedTableTypes = {}) => {
  const components = [];
  const themeColors = getThemeColors(theme);

  components.push({
    id: 'campaign-title',
    type: 'title',
    title: campaign.campaign_name || 'Campaign Analysis',
    position: { x: 17, y: 38, width: 1000, height: 100 },
    style: { background: 'transparent', color: themeColors.darkGray || '#1f2937' }
  });

  const totalOpens = campaign.volume_metrics?.total_opens || 0;
  const bannerValue = totalOpens;

  components.push({
    id: 'ms-enl-kpis',
    type: 'metric-strip',
    title: 'eNL Performance',
    position: { x: 22, y: 128, width: 973, height: 68 },
    config: {
      variant: 'hero',
      metrics: [
        { label: 'Delivered', value: (campaign.volume_metrics?.delivered || 0).toLocaleString() },
        { label: 'Unique Opens', value: (campaign.volume_metrics?.unique_opens || 0).toLocaleString() },
        { label: 'Unique Open Rate', value: `${(campaign.core_metrics?.unique_open_rate || 0).toFixed(1)}%` },
        { label: 'eNL Banner Imp', value: bannerValue.toLocaleString() },
        { label: 'Total Click Rate', value: `${(campaign.core_metrics?.total_click_rate || 0).toFixed(1)}%` }
      ]
    },
    style: {
      background: themeColors.heroGradient,
      border: 'none',
      borderRadius: '8px'
    }
  });

  const videoTable = generateTableForType(TABLE_TYPES.VIDEO_METRICS, 1, themeColors);
  videoTable.position = { x: 21, y: 208, width: 298, height: 136 };
  components.push(videoTable);

  const socialTable = generateTableForType(TABLE_TYPES.SOCIAL_MEDIA, 2, themeColors);
  socialTable.position = { x: 331, y: 208, width: 298, height: 135 };
  components.push(socialTable);

  const landingTable = generateTableForType(TABLE_TYPES.LANDING_PAGE, 3, themeColors);
  landingTable.position = { x: 641, y: 208, width: 298, height: 100 };
  components.push(landingTable);

  const aud = buildAudienceBreakdown(campaign.specialty_performance, mergeSubspecialties,
    { x: 14, y: 366, width: 615, height: 190 });
  if (aud) components.push(aud);


  addMatrixLogo(components, theme);
  return components;
};

export const generateExpertPerspectivesMulti = (campaigns, theme, mergeSubspecialties = false, costComparisonMode = 'none', showTotalSends = false, selectedTableTypes = {}) => {
  const components = [];
  const themeColors = getThemeColors(theme);

  const campaignNames = campaigns.map(c => c.campaign_name || 'Unknown');
  const dedup = detectMonthOnlyDifference(campaignNames);
  let titleText;
  if (dedup.isMonthOnly) {
    titleText = sanitizeTitle(dedup.baseName);
  } else {
    const joined = campaignNames.slice(0, 3).join(' + ');
    titleText = campaigns.length > 3 ? `${joined} + ${campaigns.length - 3} more` : joined;
  }

  components.push({
    id: 'multi-campaign-title',
    type: 'title',
    title: titleText,
    position: { x: 24, y: 48, width: 971, height: 90 },
    style: { background: 'transparent', color: themeColors.darkGray || '#1f2937' }
  });

  const totalDelivered = campaigns.reduce((s, c) => s + (c.volume_metrics?.delivered || 0), 0);
  const totalUniqueOpens = campaigns.reduce((s, c) => s + (c.volume_metrics?.unique_opens || 0), 0);
  const totalTotalOpens = campaigns.reduce((s, c) => s + (c.volume_metrics?.total_opens || 0), 0);
  const aggUniqueOpenRate = totalDelivered > 0 ? (totalUniqueOpens / totalDelivered) * 100 : 0;
  const totalClicks = campaigns.reduce((s, c) => s + ((c.core_metrics?.total_click_rate || 0) / 100) * (c.volume_metrics?.total_opens || 0), 0);
  const aggCTR = totalTotalOpens > 0 ? (totalClicks / totalTotalOpens) * 100 : 0;
  const aggBannerImp = totalTotalOpens;

  components.push({
    id: 'ms-enl-kpis',
    type: 'metric-strip',
    title: 'eNL Performance (Combined)',
    position: { x: 24, y: 128, width: 713, height: 68 },
    config: {
      variant: 'hero',
      metrics: [
        { label: 'Delivered', value: totalDelivered.toLocaleString() },
        { label: 'Unique Opens', value: totalUniqueOpens.toLocaleString() },
        { label: 'Unique Open Rate', value: `${aggUniqueOpenRate.toFixed(1)}%` },
        { label: 'eNL Banner Imp', value: aggBannerImp.toLocaleString() },
        { label: 'Total Click Rate', value: `${aggCTR.toFixed(1)}%` }
      ]
    },
    style: {
      background: themeColors.heroGradient,
      border: 'none',
      borderRadius: '8px'
    }
  });

  const landingTable = generateTableForType(TABLE_TYPES.LANDING_PAGE, 3, themeColors);
  landingTable.position = { x: 752, y: 128, width: 231, height: 104 };
  components.push(landingTable);

  const comparisonRows = campaigns.map((campaign, index) => {
    const totalOpens = campaign.volume_metrics?.total_opens || 0;
    const bannerValue = totalOpens;
    const label = dedup.isMonthOnly ? dedup.months[index] : (campaign.campaign_name || 'Unknown');
    return [
      label,
      (campaign.volume_metrics?.delivered || 0).toLocaleString(),
      (campaign.volume_metrics?.unique_opens || 0).toLocaleString(),
      `${(campaign.core_metrics?.unique_open_rate || 0).toFixed(1)}%`,
      bannerValue.toLocaleString(),
      `${(campaign.core_metrics?.total_click_rate || 0).toFixed(1)}%`
    ];
  });

  const compTableHeight = Math.max(Math.min(178, 45 + campaigns.length * 28), 408 - 208) - 15;

  components.push({
    id: 'campaign-comparison-table',
    type: 'table',
    title: '',
    config: {
      customData: comparisonRows,
      headers: [
        dedup.isMonthOnly ? 'Month' : 'Campaign',
        'Delivered', 'Unique Opens', 'Open Rate', 'eNL Banner Imp', 'CTR'
      ]
    },
    position: { x: 24, y: 208, width: 706, height: compTableHeight },
    style: {
      background: themeColors.cardGradient,
      border: `1px solid ${themeColors.border}`,
      borderRadius: '6px'
    }
  });

  const videoTable = generateTableForType(TABLE_TYPES.VIDEO_METRICS, 1, themeColors);
  videoTable.position = { x: 24, y: 408, width: 332, height: 128 };
  components.push(videoTable);

  const socialTable = generateTableForType(TABLE_TYPES.SOCIAL_MEDIA, 2, themeColors);
  socialTable.position = { x: 390, y: 408, width: 327, height: 129 };
  components.push(socialTable);

  addMatrixLogo(components, theme);
  return components;
};