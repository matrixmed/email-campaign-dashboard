import React, { useState, useEffect } from 'react';
import _ from 'lodash';
import '../../styles/AnomalyDetection.css';
import '../../styles/SectionHeaders.css';
import { matchesSearchTerm } from '../../utils/searchUtils';
import { API_BASE_URL } from '../../config/api';

const AnomalyDetection = ({ searchTerm = '', detectByDisease = false, analyzeBy = 'content', onAnalyzeByChange, onDetectByDiseaseChange }) => {
  const [anomalies, setAnomalies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOverperforming, setShowOverperforming] = useState(false);
  const [brandIndustryMap, setBrandIndustryMap] = useState({});
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    const fetchBrandData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/brand-management`);
        const data = await response.json();
        if (data.status === 'success' && data.brands) {
          const mapping = {};
          const brandNames = [];
          data.brands.forEach(b => {
            if (b.brand) {
              brandNames.push(b.brand);
              if (b.industry) {
                const brandLower = b.brand.toLowerCase();
                mapping[brandLower] = b.industry;
                const firstWord = brandLower.split(/\s+/)[0];
                if (firstWord && firstWord !== brandLower && !mapping[firstWord]) {
                  mapping[firstWord] = b.industry;
                }
              }
            }
          });
          setBrandIndustryMap(mapping);
          setBrands(brandNames);
        }
      } catch (error) {
      }
    };
    fetchBrandData();
  }, []);

  useEffect(() => {
    fetchAndAnalyzeAnomalies();
  }, [detectByDisease, showOverperforming, analyzeBy, brandIndustryMap, brands]);

  const cleanCampaignName = (name) => {
    return name.split(/\s*[-–—]\s*deployment\s*#?\d+|\s+deployment\s*#?\d+/i)[0].trim();
  };

  const BUCKETS = {
    "Clinical Updates": [/(?:^|[\s_-])cu(?:$|[\s_-])/i, /\bclinical\s*updates\b/i],
    "Expert Perspectives": [/(?:^|[\s_-])ep(?:$|[\s_-])/i, /\bexpert\s*perspectives\b/i, /JCADTV\s*Expert\s*Perspectives/i],
    "Hot Topics": [/(?:^|[\s_-])ht(?:$|[\s_-])/i, /\bhot\s*topics\b/i],
    "Custom Email": [/\bcustom\s*email\b/i]
  };

  const TOPICS = {
    "Clinical Updates": [
      "Allergy & Pulmonology", "Breast Cancer", "Cardiology", "Colorectal Surgery",
      "Diabetes", "Gastroenterology", "Generalized Pustular Psoriasis", "Infectious Disease",
      "Neonatology", "Neuroscience", "Oncology", "Ophthalmology", "Acne"
    ],
    "Expert Perspectives": [
      "RCC", "Vitiligo", "Skincare science", "Melanoma", "GPP", "Atopic Dermatitis",
      "Multiple Myeloma"
    ],
    "Hot Topics": [
      "Alzheimers", "Breast Cancer", "MCL", "NSCLC", "Melanoma",
      "Multiple Myeloma", "Ophthalmology", "Pigmented Lesions", "CLL",
      "Inflammatory Diseases", "Metastatic Breast Cancer"
    ]
  };

  const extractBucketAndTopic = (campaignName) => {
    const name = campaignName.toLowerCase();

    let bucket = null;
    for (const [bucketName, patterns] of Object.entries(BUCKETS)) {
      for (const pattern of patterns) {
        if (pattern.test(name)) {
          bucket = bucketName;
          break;
        }
      }
      if (bucket) break;
    }

    if (!bucket) {
      return { bucket: 'Custom Email', topic: 'Other' };
    }

    if (bucket === 'Custom Email') {
      for (const brand of brands) {
        if (name.includes(brand.toLowerCase())) {
          return { bucket, topic: brand };
        }
      }
      return { bucket, topic: 'Other' };
    }

    if (bucket === 'Expert Perspectives') {
      if (/gpp|generalized\s*pustular\s*psoriasis|spevigo/i.test(name)) {
        return { bucket, topic: 'GPP' };
      }
      if (/melanoma|castle/i.test(name)) {
        return { bucket, topic: 'Melanoma' };
      }
      if (/rcc|cabometyx/i.test(name)) {
        return { bucket, topic: 'RCC' };
      }
      if (/skincare|skinbetter/i.test(name)) {
        return { bucket, topic: 'Skincare science' };
      }
    }

    if (bucket === 'Clinical Updates') {
      if (/allergy.*pulmo/i.test(name)) {
        return { bucket, topic: 'Allergy & Pulmonology' };
      }
      if (/colorectal/i.test(name)) {
        return { bucket, topic: 'Colorectal Surgery' };
      }
      if (/neuro/i.test(name) && !/neonat/i.test(name)) {
        return { bucket, topic: 'Neuroscience' };
      }
      if (/gpp|generalized\s*pustular\s*psoriasis/i.test(name)) {
        return { bucket, topic: 'Generalized Pustular Psoriasis' };
      }
    }

    for (const topic of TOPICS[bucket] || []) {
      const variants = [
        topic,
        topic.replace(/ /g, ''),
        topic.replace(/ & /g, ''),
        topic.replace(/&/g, 'and')
      ];

      for (const variant of variants) {
        const escapedVariant = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedVariant}\\b`, 'i');
        if (regex.test(name)) {
          return { bucket, topic };
        }
      }
    }

    return { bucket, topic: 'Other' };
  };

  const extractIndustryAndDisease = (campaignName) => {
    const name = campaignName.toLowerCase();

    let matchedIndustry = null;
    let matchedBrand = null;

    for (const [brand, industry] of Object.entries(brandIndustryMap)) {
      if (name.includes(brand)) {
        if (!matchedBrand || brand.length > matchedBrand.length) {
          matchedBrand = brand;
          matchedIndustry = industry;
        }
      }
    }

    if (!matchedIndustry) {
      return { industry: null, disease: 'Other' };
    }

    const { topic } = extractBucketAndTopic(campaignName);

    return { industry: matchedIndustry, disease: topic !== 'Other' ? topic : matchedBrand };
  };

  const fetchAndAnalyzeAnomalies = async () => {
    setIsLoading(true);
    try {
      const completedResponse = await fetch('https://emaildash.blob.core.windows.net/json-data/completed_campaign_metrics.json?sp=r&st=2025-05-08T18:43:13Z&se=2027-06-26T02:43:13Z&spr=https&sv=2024-11-04&sr=b&sig=%2FuZDifPilE4VzfTl%2BWjUcSmzP9M283h%2B8gH9Q1V3TUg%3D');
      const completedData = await completedResponse.json();

      let liveData = [];
      try {
        const liveResponse = await fetch('https://emaildash.blob.core.windows.net/json-data/live_campaign_metrics.json?sp=r&st=2025-02-05T20:36:54Z&se=2026-07-31T03:36:54Z&spr=https&sv=2022-11-02&sr=b&sig=7Ywfk4UlVByj1PeeOo%2BjdliKQSVAWYDU5ZR%2Fcrc7eBE%3D');
        liveData = await liveResponse.json();
        if (!Array.isArray(liveData)) liveData = [];
      } catch (e) {
      }

      const completedCampaigns = completedData.map(c => ({ ...c, isLive: false }));
      const liveCampaigns = liveData
        .filter(c => c.Sent > 0 && c.Delivered > 20 && c.Unique_Opens !== "NA")
        .map(c => {
          const delivered = parseFloat(c.Delivered) || 0;
          const uniqueOpens = parseFloat(c.Unique_Opens) || 0;
          const uniqueOpenRate = delivered > 0 ? (uniqueOpens / delivered) * 100 : 0;
          return { ...c, isLive: true, Unique_Open_Rate: uniqueOpenRate };
        });

      const campaignsData = [...completedCampaigns, ...liveCampaigns];

      const cutoffDate = new Date('2025-02-01');
      const validDeliveries = campaignsData.filter(item => {
        if ((item.Delivered || 0) < 100) return false;
        if (item.isLive) return true;
        if (!item.Send_Date) return false;
        const sendDate = new Date(item.Send_Date);
        return sendDate >= cutoffDate;
      });
      const groupedCampaigns = _.groupBy(validDeliveries, item => cleanCampaignName(item.Campaign));

      const combinedCampaigns = Object.entries(groupedCampaigns).map(([campaignName, deployments]) => {
        const isLive = deployments.some(d => d.isLive);

        const isDeploymentBased = deployments.some(d =>
          /deployment\s*#?\d+/i.test(d.Campaign)
        );

        if (deployments.length === 1) {
          if (isLive && isDeploymentBased) {
            return null;
          }
          return { ...deployments[0], CleanedName: campaignName, isLive };
        }

        const deployment1 = deployments.find(d => {
          const name = d.Campaign.toLowerCase();
          return name.includes('deployment 1') || name.includes('deployment #1') || name.includes('deployment1');
        });

        const baseDeployment = deployment1 || deployments[0];
        const totalUniqueOpens = _.sumBy(deployments, d => parseFloat(d.Unique_Opens) || 0);
        const totalDelivered = parseFloat(baseDeployment.Delivered) || 0;

        return {
          Campaign: campaignName,
          CleanedName: campaignName,
          Send_Date: baseDeployment.Send_Date,
          Delivered: totalDelivered,
          Unique_Opens: totalUniqueOpens,
          Unique_Open_Rate: totalDelivered > 0 ? (totalUniqueOpens / totalDelivered) * 100 : 0,
          isLive
        };
      }).filter(c => c !== null);

      let processedCampaigns;

      if (analyzeBy === 'industry') {
        processedCampaigns = combinedCampaigns
          .map(c => {
            const { industry, disease } = extractIndustryAndDisease(c.CleanedName);
            const { topic } = extractBucketAndTopic(c.CleanedName);
            return {
              ...c,
              Industry: industry,
              Disease: disease !== 'Other' ? disease : topic,
              Bucket: industry || 'Unknown',
              Topic: disease !== 'Other' ? disease : topic
            };
          })
          .filter(c => c.Industry !== null);
      } else {
        processedCampaigns = combinedCampaigns
          .map(c => {
            const { bucket, topic } = extractBucketAndTopic(c.CleanedName);
            return { ...c, Bucket: bucket, Topic: topic, Disease: topic };
          })
          .filter(c => c.Topic !== 'Other');
      }

      const primaryGroupKey = analyzeBy === 'industry' ? 'Industry' : 'Bucket';
      const primaryGroups = _.groupBy(processedCampaigns, primaryGroupKey);
      const allAnomalies = [];


      const zThreshold = showOverperforming ? 1.5 : -1.5;

      Object.entries(primaryGroups).forEach(([groupName, groupCampaigns]) => {
        const diseaseGroups = _.groupBy(groupCampaigns, 'Disease');

        if (detectByDisease) {
          Object.entries(diseaseGroups).forEach(([disease, campaigns]) => {
            const completedCampaignsInGroup = campaigns.filter(c => !c.isLive);
            if (completedCampaignsInGroup.length < 5) return;

            const openRates = completedCampaignsInGroup.map(c => c.Unique_Open_Rate).filter(r => r != null);
            const mean = _.mean(openRates);
            const stdDev = Math.sqrt(_.mean(openRates.map(r => Math.pow(r - mean, 2))));

            campaigns.forEach(campaign => {
              const zScore = (campaign.Unique_Open_Rate - mean) / (stdDev || 1);
              const isAnomaly = showOverperforming ? zScore > zThreshold : zScore < zThreshold;
              if (isAnomaly) {
                allAnomalies.push({
                  ...campaign,
                  topicMean: mean,
                  topicStdDev: stdDev,
                  zScore: zScore,
                  deviationPercent: ((campaign.Unique_Open_Rate - mean) / mean) * 100
                });
              }
            });
          });
        } else {
          const completedCampaignsInGroup = groupCampaigns.filter(c => !c.isLive);
          if (completedCampaignsInGroup.length >= 5) {
            const openRates = completedCampaignsInGroup.map(c => c.Unique_Open_Rate).filter(r => r != null);
            const mean = _.mean(openRates);
            const stdDev = Math.sqrt(_.mean(openRates.map(r => Math.pow(r - mean, 2))));

            groupCampaigns.forEach(campaign => {
              const zScore = (campaign.Unique_Open_Rate - mean) / (stdDev || 1);
              const isAnomaly = showOverperforming ? zScore > zThreshold : zScore < zThreshold;
              if (isAnomaly) {
                allAnomalies.push({
                  ...campaign,
                  topicMean: mean,
                  topicStdDev: stdDev,
                  zScore: zScore,
                  deviationPercent: ((campaign.Unique_Open_Rate - mean) / mean) * 100
                });
              }
            });
          }
        }
      });

      allAnomalies.sort((a, b) => {
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        if (showOverperforming) {
          return b.zScore - a.zScore;
        } else {
          return a.zScore - b.zScore;
        }
      });

      setAnomalies(allAnomalies);
    } catch (error) {
    }
    setIsLoading(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(`${dateString}T00:00:00`);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const matchesSearch = (anomaly) => {
    if (!searchTerm) return true;

    const searchableText = [
      anomaly.CleanedName,
      anomaly.Topic,
      anomaly.Bucket,
      formatDate(anomaly.Send_Date)
    ].join(' ');

    return matchesSearchTerm(searchableText, searchTerm);
  };

  const filteredAnomalies = searchTerm
    ? anomalies.filter(matchesSearch)
    : anomalies;

  const getSeverityLabel = (zScore) => {
    const absZ = Math.abs(zScore);
    if (absZ > 2.5) return showOverperforming ? 'Exceptional' : 'Severe';
    if (absZ > 2) return showOverperforming ? 'Strong' : 'Moderate';
    return showOverperforming ? 'Notable' : 'Mild';
  };

  return (
    <div className="anomaly-detection-container">
      <div className="section-header-bar">
        <h3 className="anomaly-section-title">
          <span
            className="anomaly-prefix-toggle"
            onClick={() => setShowOverperforming(!showOverperforming)}
          >
            <span key={showOverperforming ? 'over' : 'under'} className="anomaly-prefix-text">
              {showOverperforming ? 'Over' : 'Under'}
            </span>
            <svg className="anomaly-prefix-icon" width="14" height="14" viewBox="0 0 14 14">
              <path d="M7 1.5L10 4.5H4L7 1.5Z" fill="currentColor"/>
              <path d="M7 12.5L4 9.5H10L7 12.5Z" fill="currentColor"/>
            </svg>
          </span>
          performing Campaigns
        </h3>
        <div className="section-header-stats">
          <div className="anomaly-controls-inline">
            <span className="control-label">Group by</span>
            <div className="anomaly-mode-toggle">
              <button
                className={`mode-toggle-btn ${analyzeBy === 'content' ? 'active' : ''}`}
                onClick={() => onAnalyzeByChange('content')}
              >
                Content
              </button>
              <button
                className={`mode-toggle-btn ${analyzeBy === 'industry' ? 'active' : ''}`}
                onClick={() => onAnalyzeByChange('industry')}
              >
                Industry
              </button>
            </div>
            <span className="control-divider">→</span>
            <div className="anomaly-mode-toggle">
              <button
                className={`mode-toggle-btn ${!detectByDisease ? 'active' : ''}`}
                onClick={() => onDetectByDiseaseChange(false)}
              >
                All
              </button>
              <button
                className={`mode-toggle-btn ${detectByDisease ? 'active' : ''}`}
                onClick={() => onDetectByDiseaseChange(true)}
              >
                By Disease
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="anomaly-content-section">
        {isLoading ? (
          <div className="loading-container">
            <div className="spinner">
              <div></div><div></div><div></div><div></div><div></div><div></div>
            </div>
            <p>Analyzing campaigns...</p>
          </div>
        ) : filteredAnomalies.length > 0 ? (
          <div className="anomalies-grid">
            {filteredAnomalies.map((anomaly, idx) => (
              <div
                key={idx}
                className={`anomaly-card ${showOverperforming ? 'overperforming' : ''} ${anomaly.isLive ? 'live-campaign' : ''}`}
                style={anomaly.isLive ? {
                  borderColor: showOverperforming ? 'rgba(76, 175, 80, 0.5)' : 'rgba(255, 107, 107, 0.5)',
                  boxShadow: showOverperforming
                    ? '0 0 0 1px rgba(76, 175, 80, 0.3)'
                    : '0 0 0 1px rgba(255, 107, 107, 0.3)'
                } : {}}
              >
                {anomaly.isLive && (
                  <div className="live-badge">LIVE</div>
                )}
                <div className="anomaly-card-header">
                  <span className={`anomaly-severity ${showOverperforming ? 'positive' : ''}`}>
                    {getSeverityLabel(anomaly.zScore)}
                  </span>
                  <span className="anomaly-bucket">{anomaly.Bucket}</span>
                </div>
                <div className="anomaly-category-label">{anomaly.Topic}</div>
                <h3 className="anomaly-campaign-name">{anomaly.CleanedName}</h3>
                <div className="anomaly-date">{formatDate(anomaly.Send_Date)}</div>

                <div className="anomaly-metrics">
                  <div className="anomaly-metric">
                    <span className="anomaly-metric-label">Unique Open Rate</span>
                    <span className={`anomaly-metric-value ${showOverperforming ? 'positive' : 'negative'}`}>
                      {anomaly.Unique_Open_Rate.toFixed(2)}%
                    </span>
                  </div>
                  <div className="anomaly-metric">
                    <span className="anomaly-metric-label">
                      {detectByDisease ? 'Disease' : (analyzeBy === 'industry' ? 'Industry' : 'Content')} Average
                    </span>
                    <span className="anomaly-metric-value">
                      {anomaly.topicMean.toFixed(2)}%
                    </span>
                  </div>
                  <div className="anomaly-metric highlight">
                    <span className="anomaly-metric-label">Deviation</span>
                    <span className={`anomaly-metric-value ${showOverperforming ? 'positive' : 'negative'}`}>
                      {showOverperforming ? '+' : ''}{anomaly.deviationPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="anomaly-stats">
                  <div className="anomaly-stat-item">
                    <span className="anomaly-stat-label">Delivered</span>
                    <span className="anomaly-stat-value">{anomaly.Delivered.toLocaleString()}</span>
                  </div>
                  <div className="anomaly-stat-item">
                    <span className="anomaly-stat-label">Z-Score</span>
                    <span className="anomaly-stat-value">{showOverperforming ? '+' : ''}{anomaly.zScore.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-anomalies">
            <p>No significant {showOverperforming ? 'overperformers' : 'anomalies'} detected{searchTerm ? ' matching search' : ''}.</p>
            <p className="no-anomalies-subtitle">
              {showOverperforming
                ? 'No campaigns are significantly exceeding expected performance.'
                : 'All campaigns are performing within expected ranges.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnomalyDetection;