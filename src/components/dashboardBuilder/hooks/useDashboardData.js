import { useState, useEffect, useMemo, useCallback } from 'react';

const DASHBOARD_METRICS_URL = "https://emaildash.blob.core.windows.net/json-data/dashboard_metrics.json?sp=r&st=2025-06-09T18:55:36Z&se=2027-06-17T02:55:36Z&spr=https&sv=2024-11-04&sr=b&sig=9o5%2B%2BHmlqiFuAQmw9bGl0D2485Z8xTy0XXsb10S2aCI%3D";

const useDashboardData = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(DASHBOARD_METRICS_URL);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const validCampaigns = Array.isArray(data) ? data : [];
        
        setCampaigns(validCampaigns);
      } catch (err) {
        setError(err.message);
        setCampaigns([]);
      } finally {
        setLoading(false);
      }
    };

    loadCampaigns();
  }, []);

  const getAvailableMetrics = useCallback((campaign) => {
    if (!campaign) return [];
    
    const metrics = [];
    
    if (campaign.digital_metrics) {
      if (campaign.digital_metrics.issue_views > 0) {
        metrics.push({
          name: 'Issue Views',
          category: 'digital',
          value: campaign.digital_metrics.issue_views.toLocaleString()
        });
      }
      
      if (campaign.digital_metrics.avg_time_in_issue > 0) {
        metrics.push({
          name: 'Time in Issue',
          category: 'digital',
          value: `${campaign.digital_metrics.avg_time_in_issue} min`
        });
      }
    }
    
    if (campaign.social_metrics) {
      if (campaign.social_metrics.linkedin_ctr > 0) {
        metrics.push({
          name: 'LinkedIn CTR',
          category: 'social',
          value: `${campaign.social_metrics.linkedin_ctr}%`
        });
      }
      
      if (campaign.social_metrics.facebook_reach > 0) {
        metrics.push({
          name: 'Facebook Reach',
          category: 'social',
          value: campaign.social_metrics.facebook_reach.toLocaleString()
        });
      }
      
      if (campaign.social_metrics.social_shares_total > 0) {
        metrics.push({
          name: 'Social Shares',
          category: 'social',
          value: campaign.social_metrics.social_shares_total.toLocaleString()
        });
      }
    }
    
    const geoData = getGeographicData(campaign);
    if (geoData.length > 0) {
      metrics.push({
        name: 'Regional Performance',
        category: 'geographic',
        value: `${geoData.length} regions`,
        data: geoData
      });
    }
    
    const authorityData = getAuthorityMetrics(campaign);
    const hasAuthorityData = Object.values(authorityData).some(val => val > 0);
    if (hasAuthorityData) {
      metrics.push({
        name: 'Professional Authority',
        category: 'authority',
        value: 'MD/DO/NP breakdown',
        data: authorityData
      });
    }
    
    return metrics;
  }, []);

  const getAuthorityMetrics = useCallback((campaign) => {
    if (!campaign?.authority_metrics) return {};
    
    return {
      mdEngagement: campaign.authority_metrics.md_engagement_rate || 0,
      doEngagement: campaign.authority_metrics.do_engagement_rate || 0,
      npEngagement: campaign.authority_metrics.np_engagement_rate || 0,
      paEngagement: campaign.authority_metrics.pa_engagement_rate || 0,
      phdEngagement: campaign.authority_metrics.phd_engagement_rate || 0,
      otherEngagement: campaign.authority_metrics.other_engagement_rate || 0,
      academicAffiliation: campaign.authority_metrics.academic_affiliation_rate || 0,
      avgYearsExperience: campaign.authority_metrics.avg_years_experience || 0
    };
  }, []);

  const getGeographicData = useCallback((campaign) => {
    if (!campaign?.geographic_distribution) return [];
    
    return Object.entries(campaign.geographic_distribution).map(([region, data]) => ({
      region: region.charAt(0).toUpperCase() + region.slice(1),
      engagement: data.engagement_rate || 0,
      volume: data.volume || 0
    }));
  }, []);

  const getSpecialtyBreakdown = useCallback((campaign, shouldMerge = false) => {
    if (!campaign?.specialty_performance) return [];
    
    let specialtyData = campaign.specialty_performance;
    
    if (shouldMerge) {
      specialtyData = mergeSpecialties(specialtyData);
    }
    
    return Object.entries(specialtyData).map(([specialty, data]) => ({
      specialty,
      uniqueOpenRate: data.unique_open_rate || 0,
      uniqueOpens: data.unique_opens || 0,
      audienceTotal: data.audience_total || 0,
      performanceDelta: data.performance_delta || 0,
      audiencePercentage: data.audience_percentage || 0
    })).sort((a, b) => b.audienceTotal - a.audienceTotal);
  }, []);

  const mergeSpecialties = useCallback((specialtyData) => {
    const merged = {};
    let totalAudience = 0;
    
    Object.values(specialtyData).forEach(data => {
      totalAudience += data.audience_total || 0;
    });
    
    Object.entries(specialtyData).forEach(([specialty, data]) => {
      const baseSpecialty = specialty.split(' - ')[0].trim();
      
      if (!merged[baseSpecialty]) {
        merged[baseSpecialty] = {
          unique_open_rate: 0,
          unique_opens: 0,
          audience_total: 0,
          performance_delta: 0,
          audience_percentage: 0,
          count: 0
        };
      }
      
      merged[baseSpecialty].unique_opens += data.unique_opens;
      merged[baseSpecialty].audience_total += data.audience_total;
      merged[baseSpecialty].performance_delta += data.performance_delta;
      merged[baseSpecialty].count += 1;
    });
    
    Object.keys(merged).forEach(specialty => {
      const data = merged[specialty];
      data.unique_open_rate = data.audience_total > 0 
        ? (data.unique_opens / data.audience_total) * 100 
        : 0;
      data.performance_delta = data.performance_delta / data.count;
      data.audience_percentage = totalAudience > 0 
        ? (data.audience_total / totalAudience) * 100 
        : 0;
      
      data.unique_open_rate = Math.round(data.unique_open_rate * 10) / 10;
      data.performance_delta = Math.round(data.performance_delta * 10) / 10;
      data.audience_percentage = Math.round(data.audience_percentage * 10) / 10;
    });
    
    return merged;
  }, []);

  const processMultiCampaignData = useCallback((selectedCampaigns) => {
    if (!selectedCampaigns || selectedCampaigns.length === 0) return null;
    
    const aggregated = {
      campaign_name: `Multi-Campaign Analysis (${selectedCampaigns.length} campaigns)`,
      send_date: 'Various',
      core_metrics: {
        unique_open_rate: 0,
        total_open_rate: 0,
        unique_click_rate: 0,
        total_click_rate: 0,
        delivery_rate: 0
      },
      volume_metrics: {
        delivered: 0,
        unique_opens: 0,
        unique_clicks: 0,
        sent: 0,
        total_opens: 0,
        total_clicks: 0
      },
      cost_metrics: {
        estimated_patient_impact: 0
      },
      specialty_performance: {}
    };
    
    const totalDelivered = selectedCampaigns.reduce((sum, c) => sum + (c.volume_metrics?.delivered || 0), 0);
    const totalOpens = selectedCampaigns.reduce((sum, c) => sum + (c.volume_metrics?.unique_opens || 0), 0);
    const totalClicks = selectedCampaigns.reduce((sum, c) => sum + (c.volume_metrics?.unique_clicks || 0), 0);
    const totalSent = selectedCampaigns.reduce((sum, c) => sum + (c.volume_metrics?.sent || 0), 0);
    
    aggregated.core_metrics.unique_open_rate = totalDelivered > 0 ? (totalOpens / totalDelivered) * 100 : 0;
    aggregated.core_metrics.unique_click_rate = totalDelivered > 0 ? (totalClicks / totalDelivered) * 100 : 0;
    aggregated.core_metrics.total_open_rate = selectedCampaigns.reduce((sum, c) => sum + (c.core_metrics?.total_open_rate || 0), 0) / selectedCampaigns.length;
    aggregated.core_metrics.total_click_rate = selectedCampaigns.reduce((sum, c) => sum + (c.core_metrics?.total_click_rate || 0), 0) / selectedCampaigns.length;
    
    aggregated.volume_metrics.delivered = totalDelivered;
    aggregated.volume_metrics.unique_opens = totalOpens;
    aggregated.volume_metrics.unique_clicks = totalClicks;
    aggregated.volume_metrics.sent = totalSent;
    aggregated.volume_metrics.total_opens = selectedCampaigns.reduce((sum, c) => sum + (c.volume_metrics?.total_opens || 0), 0);
    aggregated.volume_metrics.total_clicks = selectedCampaigns.reduce((sum, c) => sum + (c.volume_metrics?.total_clicks || 0), 0);
    
    aggregated.cost_metrics.estimated_patient_impact = selectedCampaigns.reduce((sum, c) => sum + (c.cost_metrics?.estimated_patient_impact || 0), 0);
    
    const allSpecialties = {};
    selectedCampaigns.forEach(campaign => {
      if (campaign.specialty_performance) {
        Object.entries(campaign.specialty_performance).forEach(([specialty, data]) => {
          const baseSpecialty = specialty.split(' - ')[0].trim();
          if (!allSpecialties[baseSpecialty]) {
            allSpecialties[baseSpecialty] = {
              unique_opens: 0,
              audience_total: 0,
              performance_delta: 0,
              count: 0
            };
          }
          
          allSpecialties[baseSpecialty].unique_opens += data.unique_opens || 0;
          allSpecialties[baseSpecialty].audience_total += data.audience_total || 0;
          allSpecialties[baseSpecialty].performance_delta += data.performance_delta || 0;
          allSpecialties[baseSpecialty].count += 1;
        });
      }
    });
    
    const totalAudience = Object.values(allSpecialties).reduce((sum, s) => sum + s.audience_total, 0);
    Object.keys(allSpecialties).forEach(specialty => {
      const data = allSpecialties[specialty];
      data.unique_open_rate = data.audience_total > 0 ? (data.unique_opens / data.audience_total) * 100 : 0;
      data.performance_delta = data.performance_delta / data.count;
      data.audience_percentage = totalAudience > 0 ? (data.audience_total / totalAudience) * 100 : 0;
    });
    
    aggregated.specialty_performance = allSpecialties;
    return aggregated;
  }, []);

  const generateMultiCampaignTable = useMemo(() => {
    return (selectedCampaigns) => {
      if (!selectedCampaigns || selectedCampaigns.length === 0) {
        return { headers: [], rows: [] };
      }

      const headers = [
        'Campaign Name',
        'Sent',
        'Delivered', 
        'Unique Opens',
        'Unique Open Rate',
        'Total Opens',
        'Total Open Rate',
        'Unique Click Rate',
        'Total Click Rate'
      ];

      const rows = selectedCampaigns.map(campaign => [
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

      return { headers, rows };
    };
  }, []);

  const searchCampaigns = useMemo(() => {
    return (searchTerm) => {
      if (!searchTerm.trim()) return campaigns;
      
      const term = searchTerm.toLowerCase();
      return campaigns.filter(campaign => 
        campaign.campaign_name?.toLowerCase().includes(term) ||
        campaign.content_type?.toLowerCase().includes(term) ||
        campaign.disease_state?.toLowerCase().includes(term)
      );
    };
  }, [campaigns]);

  return {
    campaigns,
    loading,
    error,
    getAvailableMetrics,
    getAuthorityMetrics,
    getGeographicData,
    getSpecialtyBreakdown,
    processMultiCampaignData,
    generateMultiCampaignTable,
    mergeSpecialties,
    searchCampaigns
  };
};

export default useDashboardData;