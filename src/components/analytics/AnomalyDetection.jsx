import React, { useState, useEffect } from 'react';
import _ from 'lodash';
import '../../styles/AnomalyDetection.css';

const AnomalyDetection = () => {
  const [anomalies, setAnomalies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchAndAnalyzeAnomalies();
  }, []);

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
      "RCC", "Vitiligo", "Skincare science", "Melanoma", "GPP", "Atopic Dermatitis"
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

      const validDeliveries = campaignsData.filter(item => (item.Delivered || 0) >= 100);
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

      const campaignsWithBucket = combinedCampaigns.map(c => {
        const { bucket, topic } = extractBucketAndTopic(c.CleanedName);
        return { ...c, Bucket: bucket, Topic: topic };
      });

      const bucketized = _.groupBy(campaignsWithBucket, 'Bucket');
      const allBuckets = ['Custom Email', 'Clinical Updates', 'Expert Perspectives', 'Hot Topics'];

      const allAnomalies = [];
      const bucketTopicMap = {};

      Object.entries(bucketized).forEach(([bucket, bucketCampaigns]) => {
        const topicGroups = _.groupBy(bucketCampaigns, 'Topic');

        Object.entries(topicGroups).forEach(([topic, campaigns]) => {
          console.log(`Topic: ${topic} (${bucket}) - ${campaigns.length} campaigns`);

          if (campaigns.length < 5) return;

          const openRates = campaigns.map(c => c.Unique_Open_Rate).filter(r => r != null);
          const mean = _.mean(openRates);
          const stdDev = Math.sqrt(_.mean(openRates.map(r => Math.pow(r - mean, 2))));

          console.log(`  Mean: ${mean.toFixed(2)}%, StdDev: ${stdDev.toFixed(2)}%`);

          let anomaliesInTopic = 0;
          campaigns.forEach(campaign => {
            const zScore = (campaign.Unique_Open_Rate - mean) / (stdDev || 1);
            if (zScore < -1.5) {
              anomaliesInTopic++;
              allAnomalies.push({
                ...campaign,
                topicMean: mean,
                topicStdDev: stdDev,
                zScore: zScore,
                deviationPercent: ((campaign.Unique_Open_Rate - mean) / mean) * 100
              });
            }
          });

          if (anomaliesInTopic > 0) {
            console.log(`  Found ${anomaliesInTopic} anomalies in this topic`);
          }

          if (!bucketTopicMap[bucket]) {
            bucketTopicMap[bucket] = [];
          }
          if (campaigns.length >= 5) {
            bucketTopicMap[bucket].push(topic);
          }
        });
      });

      console.log(`Total anomalies found: ${allAnomalies.length}`);

      allAnomalies.sort((a, b) => a.zScore - b.zScore);

      const filterOptions = ['all', ...allBuckets];
      Object.entries(bucketTopicMap).forEach(([bucket, topics]) => {
        topics.sort().forEach(topic => filterOptions.push(topic));
      });

      setCategories(filterOptions);
      setAnomalies(allAnomalies);
    } catch (error) {
      console.error('Failed to fetch anomaly data:', error);
    }
    setIsLoading(false);
  };

  const filteredAnomalies = selectedCategory === 'all'
    ? anomalies
    : anomalies.filter(a => a.Bucket === selectedCategory || a.Topic === selectedCategory);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(`${dateString}T00:00:00`);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="anomaly-detection-container">
      <div className="anomaly-header">
        <div className="anomaly-title">
          <h2>Underperforming Campaigns</h2>
          <p className="anomaly-subtitle">
            Campaigns performing significantly below their category average (≥1.5 standard deviations)
          </p>
        </div>
        <div className="category-filter">
          <label htmlFor="category-select">Category:</label>
          <select
            id="category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-select"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="loading">Analyzing campaigns...</div>
      ) : filteredAnomalies.length > 0 ? (
        <div className="anomalies-grid">
          {filteredAnomalies.map((anomaly, idx) => (
            <div key={idx} className="anomaly-card">
              <div className="anomaly-card-header">
                <span className="anomaly-severity">
                  {anomaly.zScore < -2.5 ? 'Severe' : anomaly.zScore < -2 ? 'Moderate' : 'Mild'}
                </span>
                <span className="anomaly-bucket">{anomaly.Bucket}</span>
              </div>
              <div className="anomaly-category-label">{anomaly.Topic}</div>
              <h3 className="anomaly-campaign-name">{anomaly.CleanedName}</h3>
              <div className="anomaly-date">{formatDate(anomaly.Send_Date)}</div>

              <div className="anomaly-metrics">
                <div className="anomaly-metric">
                  <span className="metric-label">Campaign Performance</span>
                  <span className="metric-value campaign-value">
                    {anomaly.Unique_Open_Rate.toFixed(2)}%
                  </span>
                </div>
                <div className="anomaly-metric">
                  <span className="metric-label">Topic Average</span>
                  <span className="metric-value">
                    {anomaly.topicMean.toFixed(2)}%
                  </span>
                </div>
                <div className="anomaly-metric highlight">
                  <span className="metric-label">Deviation</span>
                  <span className="metric-value deviation-value">
                    {anomaly.deviationPercent.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="anomaly-stats">
                <div className="stat-item">
                  <span className="stat-label">Delivered:</span>
                  <span className="stat-value">{anomaly.Delivered.toLocaleString()}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Z-Score:</span>
                  <span className="stat-value">{anomaly.zScore.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-anomalies">
          <p>No significant anomalies detected in the selected category.</p>
          <p className="no-anomalies-subtitle">All campaigns are performing within expected ranges.</p>
        </div>
      )}
    </div>
  );
};

export default AnomalyDetection;