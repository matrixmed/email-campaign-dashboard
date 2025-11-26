import React, { useState, useEffect } from 'react';
import _ from 'lodash';
import '../../styles/AnomalyDetection.css';

const AnomalyDetection = ({ searchTerm = '', detectBySubtopic = false }) => {
  const [anomalies, setAnomalies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showOverperforming, setShowOverperforming] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    fetchAndAnalyzeAnomalies();
  }, [detectBySubtopic, showOverperforming]);

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

  const BRANDS = [
    "Bimzelx", "Adbry", "Breyanzi", "Calquence", "Aquaphor", "Cabometyx",
    "Carvykti", "Cabtreo", "Claritin", "Castle", "Delgocitinib", "Gvoke VialDx",
    "Imfinzi", "Eucerin", "Phesgo", "One Lung", "Imlunestrant", "Signia",
    "Opzelura", "Kisunla", "Uplizna", "Tagrisso", "Leqselvi", "Vabysmo",
    "Verzenio", "Neutrogena", "Rinvoq", "Skinbetter", "Skinceuticals",
    "Skyrizi", "Spevigo", "Truqap", "Winlevi", "Zoryve"
  ];

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
      for (const brand of BRANDS) {
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

  const fetchAndAnalyzeAnomalies = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://emaildash.blob.core.windows.net/json-data/completed_campaign_metrics.json?sp=r&st=2025-05-08T18:43:13Z&se=2027-06-26T02:43:13Z&spr=https&sv=2024-11-04&sr=b&sig=%2FuZDifPilE4VzfTl%2BWjUcSmzP9M283h%2B8gH9Q1V3TUg%3D');
      const campaignsData = await response.json();

      const cutoffDate = new Date('2025-02-01');
      const validDeliveries = campaignsData.filter(item => {
        if ((item.Delivered || 0) < 100) return false;
        if (!item.Send_Date) return false;
        const sendDate = new Date(item.Send_Date);
        return sendDate >= cutoffDate;
      });
      const groupedCampaigns = _.groupBy(validDeliveries, item => cleanCampaignName(item.Campaign));

      const combinedCampaigns = Object.entries(groupedCampaigns).map(([campaignName, deployments]) => {
        if (deployments.length === 1) {
          return { ...deployments[0], CleanedName: campaignName };
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
          Unique_Open_Rate: totalDelivered > 0 ? (totalUniqueOpens / totalDelivered) * 100 : 0
        };
      });

      const campaignsWithBucket = combinedCampaigns
        .map(c => {
          const { bucket, topic } = extractBucketAndTopic(c.CleanedName);
          return { ...c, Bucket: bucket, Topic: topic };
        })
        .filter(c => c.Topic !== 'Other');

      const bucketized = _.groupBy(campaignsWithBucket, 'Bucket');
      const allAnomalies = [];

      const zThreshold = showOverperforming ? 1.5 : -1.5;

      Object.entries(bucketized).forEach(([bucket, bucketCampaigns]) => {
        const topicGroups = _.groupBy(bucketCampaigns, 'Topic');

        if (detectBySubtopic) {
          Object.entries(topicGroups).forEach(([topic, campaigns]) => {
            if (campaigns.length < 5) return;

            const openRates = campaigns.map(c => c.Unique_Open_Rate).filter(r => r != null);
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
          if (bucketCampaigns.length >= 5) {
            const openRates = bucketCampaigns.map(c => c.Unique_Open_Rate).filter(r => r != null);
            const mean = _.mean(openRates);
            const stdDev = Math.sqrt(_.mean(openRates.map(r => Math.pow(r - mean, 2))));

            bucketCampaigns.forEach(campaign => {
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

      if (showOverperforming) {
        allAnomalies.sort((a, b) => b.zScore - a.zScore);
      } else {
        allAnomalies.sort((a, b) => a.zScore - b.zScore);
      }

      setAnomalies(allAnomalies);
    } catch (error) {
      console.error('Failed to fetch anomaly data:', error);
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

    const searchWords = searchTerm.toLowerCase().split(' ').filter(w => w.length > 0);
    const campaignName = anomaly.CleanedName.toLowerCase();
    const topic = anomaly.Topic.toLowerCase();
    const bucket = anomaly.Bucket.toLowerCase();
    const sendDate = formatDate(anomaly.Send_Date).toLowerCase();

    return searchWords.every(word =>
      campaignName.includes(word) ||
      topic.includes(word) ||
      bucket.includes(word) ||
      sendDate.includes(word)
    );
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
      <div className="anomaly-header">
        <div className="anomaly-title-row">
          <h2>{showOverperforming ? 'Overperforming Campaigns' : 'Underperforming Campaigns'}</h2>
          <div
            className="info-icon-wrapper"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <svg className="info-icon" viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            {showTooltip && (
              <div className="topics-tooltip">
                <div className="tooltip-title">Topics & Subtopics</div>
                <div className="tooltip-section">
                  <div className="tooltip-topic-header">Clinical Updates</div>
                  <div className="tooltip-subtopics">Allergy & Pulmonology, Breast Cancer, Cardiology, Colorectal Surgery, Diabetes, Gastroenterology, GPP, Infectious Disease, Neonatology, Neuroscience, Oncology, Ophthalmology, Acne</div>
                </div>
                <div className="tooltip-section">
                  <div className="tooltip-topic-header">Expert Perspectives</div>
                  <div className="tooltip-subtopics">RCC, Vitiligo, Skincare Science, Melanoma, GPP, Atopic Dermatitis, Multiple Myeloma</div>
                </div>
                <div className="tooltip-section">
                  <div className="tooltip-topic-header">Hot Topics</div>
                  <div className="tooltip-subtopics">Alzheimers, Breast Cancer, MCL, NSCLC, Melanoma, Multiple Myeloma, Ophthalmology, Pigmented Lesions, CLL, Inflammatory Diseases, Metastatic Breast Cancer</div>
                </div>
                <div className="tooltip-section">
                  <div className="tooltip-topic-header">Custom Email</div>
                  <div className="tooltip-subtopics">Brand-specific campaigns</div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="performance-toggle">
          <button
            className={`toggle-btn ${!showOverperforming ? 'active' : ''}`}
            onClick={() => setShowOverperforming(false)}
          >
            Underperforming
          </button>
          <button
            className={`toggle-btn ${showOverperforming ? 'active' : ''}`}
            onClick={() => setShowOverperforming(true)}
          >
            Overperforming
          </button>
        </div>
      </div>

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
            <div key={idx} className={`anomaly-card ${showOverperforming ? 'overperforming' : ''}`}>
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
                  <span className="anomaly-metric-label">Campaign Performance</span>
                  <span className={`anomaly-metric-value ${showOverperforming ? 'positive' : 'negative'}`}>
                    {anomaly.Unique_Open_Rate.toFixed(2)}%
                  </span>
                </div>
                <div className="anomaly-metric">
                  <span className="anomaly-metric-label">{detectBySubtopic ? 'Subtopic' : 'Topic'} Average</span>
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
  );
};

export default AnomalyDetection;