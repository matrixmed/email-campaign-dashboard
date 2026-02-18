import React, { useState, useEffect, useMemo } from 'react';
import '../../styles/SpecialtyBreakdown.css';
import '../../styles/SectionHeaders.css';
import { matchesSearchTerm } from '../../utils/searchUtils';
import { classifyCampaign, stripAbGroup } from '../../utils/campaignClassifier';
import { API_BASE_URL } from '../../config/api';

const METADATA_BLOB_URL = "https://emaildash.blob.core.windows.net/json-data/completed_campaign_metadata.json?sp=r&st=2025-09-03T19:53:53Z&se=2027-09-29T04:08:53Z&spr=https&sv=2024-11-04&sr=b&sig=JWxxARzWg4FN%2FhGa17O3RGffl%2BVyJ%2FkE3npL9Iws%2FIs%3D";

const combineDeploymentAudience = (deployments) => {
  const combined = {};
  const allSpecialties = new Set();
  deployments.forEach(d => Object.keys(d.audience_breakdown || {}).forEach(key => allSpecialties.add(key)));

  const deployment1 = deployments.find(d =>
    d.campaign_name && /deployment\s*#?\s*1\s*$/i.test(d.campaign_name)
  ) || deployments[0];

  const totalDelivered1 = Object.values(deployment1.audience_breakdown || {}).reduce((sum, a) => sum + (a.delivered || 0), 0);

  allSpecialties.forEach(spec => {
    const d1Delivered = deployment1.audience_breakdown?.[spec]?.delivered || 0;
    const totalOpens = deployments.reduce((sum, d) => sum + (d.audience_breakdown?.[spec]?.opens || 0), 0);

    combined[spec] = {
      delivered: d1Delivered,
      opens: totalOpens,
      open_rate: d1Delivered > 0 ? Math.min((totalOpens / d1Delivered) * 100, 100) : 0
    };
  });

  return combined;
};

const getIndustryFromMap = (campaignName, industryMap) => {
  const name = campaignName.toLowerCase();
  let matched = null;
  let matchedLen = 0;
  for (const [brand, industry] of Object.entries(industryMap)) {
    if (name.includes(brand) && brand.length > matchedLen) {
      matched = industry;
      matchedLen = brand.length;
    }
  }
  return matched;
};

const INITIAL_SHOW = 5;

const SpecialtyBreakdown = ({ searchTerm = '' }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rawCampaigns, setRawCampaigns] = useState([]);
  const [analyzeBy, setAnalyzeBy] = useState('content');
  const [groupByTopic, setGroupByTopic] = useState(false);
  const [combineSubSpecialties, setCombineSubSpecialties] = useState(false);
  const [showMoreGroups, setShowMoreGroups] = useState(new Set());
  const [brandIndustryMap, setBrandIndustryMap] = useState({});

  useEffect(() => {
    fetchData();
    fetchBrandData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(METADATA_BLOB_URL);
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const rawData = await response.json();

      const groups = {};
      rawData.forEach(item => {
        if (!item.audience_breakdown || Object.keys(item.audience_breakdown).length === 0) return;
        const key = stripAbGroup(item.base_campaign_name || item.campaign_name || '');
        if (!key) return;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      });

      const campaigns = Object.entries(groups).map(([baseName, deployments]) => {
        const audience = deployments.length > 1
          ? combineDeploymentAudience(deployments)
          : deployments[0].audience_breakdown;
        return { baseName, audience };
      }).filter(c => c.audience && Object.keys(c.audience).length > 0);

      setRawCampaigns(campaigns);
    } catch (err) {
      setError("Failed to load specialty data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchBrandData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/brand-management`);
      const data = await response.json();
      if (data.status === 'success' && data.brands) {
        const mapping = {};
        data.brands.forEach(b => {
          if (b.brand && b.industry) {
            const brandLower = b.brand.toLowerCase();
            mapping[brandLower] = b.industry;
            const firstWord = brandLower.split(/\s+/)[0];
            if (firstWord && firstWord !== brandLower && !mapping[firstWord]) {
              mapping[firstWord] = b.industry;
            }
          }
        });
        setBrandIndustryMap(mapping);
      }
    } catch (err) {}
  };

  const groupedData = useMemo(() => {
    if (!rawCampaigns.length) return [];

    const groupMap = {};

    rawCampaigns.forEach(({ baseName, audience }) => {
      let groupKey, topicKey;

      if (analyzeBy === 'industry') {
        const industry = getIndustryFromMap(baseName, brandIndustryMap);
        if (!industry) return;
        const { topic } = classifyCampaign(baseName);
        groupKey = industry;
        topicKey = topic;
      } else {
        const { bucket, topic } = classifyCampaign(baseName);
        groupKey = bucket;
        topicKey = topic;
      }

      const displayKey = groupByTopic ? `${groupKey}|||${topicKey}` : groupKey;

      if (!groupMap[displayKey]) {
        groupMap[displayKey] = {
          groupName: groupByTopic ? topicKey : groupKey,
          parentGroup: groupByTopic ? groupKey : null,
          specialties: {}
        };
      }

      Object.entries(audience).forEach(([specName, specData]) => {
        if (!specName || specName.trim() === '') return;
        const finalName = combineSubSpecialties ? specName.split(' - ')[0].trim() : specName;

        if (!groupMap[displayKey].specialties[finalName]) {
          groupMap[displayKey].specialties[finalName] = {
            delivered: 0, opens: 0, weightedRateSum: 0, totalWeight: 0
          };
        }

        const s = groupMap[displayKey].specialties[finalName];
        const delivered = specData.delivered || 0;
        const opens = specData.opens || 0;
        const rate = Math.min(specData.open_rate || 0, 100);
        s.delivered += delivered;
        s.opens += opens;
        if (delivered > 0) {
          s.weightedRateSum += rate * delivered;
          s.totalWeight += delivered;
        }
      });
    });

    return Object.values(groupMap).map(group => {
      const specArray = Object.entries(group.specialties)
        .map(([name, data]) => ({
          name,
          delivered: data.delivered,
          opens: data.opens,
          openRate: data.totalWeight > 0 ? data.weightedRateSum / data.totalWeight : 0
        }))
        .filter(s => s.delivered >= 50)
        .filter(s => !searchTerm || matchesSearchTerm(s.name, searchTerm))
        .sort((a, b) => b.openRate - a.openRate);

      if (specArray.length === 0) return null;

      const totalDelivered = specArray.reduce((sum, s) => sum + s.delivered, 0);
      const avgRate = totalDelivered > 0
        ? specArray.reduce((sum, s) => sum + (s.openRate * s.delivered), 0) / totalDelivered
        : 0;

      const maxRate = specArray.length > 0 ? specArray[0].openRate : 1;

      return {
        ...group,
        specialties: specArray.map(s => ({
          ...s,
          barWidth: maxRate > 0 ? (s.openRate / maxRate) * 100 : 0,
          vsAvg: s.openRate - avgRate
        })),
        avgRate,
        totalDelivered,
        specCount: specArray.length
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.totalDelivered - a.totalDelivered);
  }, [rawCampaigns, analyzeBy, groupByTopic, combineSubSpecialties, searchTerm, brandIndustryMap]);

  const toggleShowMore = (groupId) => {
    setShowMoreGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="sb-container">
        <div className="sb-loader">
          <div className="sb-spinner"><div></div><div></div><div></div><div></div><div></div><div></div></div>
          <p>Loading specialty breakdown...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sb-container">
        <div className="sb-error"><p>{error}</p></div>
      </div>
    );
  }

  return (
    <div className="sb-container">
      <div className="section-header-bar">
        <h3>Specialty Breakdown</h3>
        <div className="section-header-stats">
          <div className="anomaly-controls-inline">
            <span className="control-label">Group by</span>
            <div className="anomaly-mode-toggle">
              <button
                className={`mode-toggle-btn ${analyzeBy === 'content' ? 'active' : ''}`}
                onClick={() => setAnalyzeBy('content')}
              >
                Content
              </button>
              <button
                className={`mode-toggle-btn ${analyzeBy === 'industry' ? 'active' : ''}`}
                onClick={() => setAnalyzeBy('industry')}
              >
                Industry
              </button>
            </div>
            <span className="control-divider">→</span>
            <div className="anomaly-mode-toggle">
              <button
                className={`mode-toggle-btn ${!groupByTopic ? 'active' : ''}`}
                onClick={() => setGroupByTopic(false)}
              >
                All
              </button>
              <button
                className={`mode-toggle-btn ${groupByTopic ? 'active' : ''}`}
                onClick={() => setGroupByTopic(true)}
              >
                By Topic
              </button>
            </div>
          </div>
          <label className="sb-merge-toggle">
            <span>Merge</span>
            <input
              type="checkbox"
              checked={combineSubSpecialties}
              onChange={(e) => setCombineSubSpecialties(e.target.checked)}
            />
            <span className="sb-toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="sb-groups">
        {groupedData.map(group => {
          const groupId = group.groupName + (group.parentGroup || '');
          const showAll = showMoreGroups.has(groupId);
          const visibleSpecs = showAll ? group.specialties : group.specialties.slice(0, INITIAL_SHOW);
          const remaining = group.specialties.length - INITIAL_SHOW;

          return (
            <div className="sb-group-card" key={groupId}>
              <div className="sb-group-header">
                <div className="sb-group-header-left">
                  <h4 className="sb-group-name">{group.groupName}</h4>
                  {group.parentGroup && (
                    <span className="sb-group-parent">{group.parentGroup}</span>
                  )}
                </div>
                <div className="sb-group-meta">
                  <span className="sb-group-avg">{group.avgRate.toFixed(1)}%</span>
                  <span className="sb-group-count">{group.specCount} specialties</span>
                </div>
              </div>
              <div className="sb-group-specs">
                {visibleSpecs.map(spec => (
                  <div className="sb-spec-row" key={spec.name}>
                    <span className="sb-spec-name" title={spec.name}>{spec.name}</span>
                    <div className="sb-spec-bar-track">
                      <div
                        className={`sb-spec-fill ${spec.vsAvg >= 0 ? 'sb-fill-green' : 'sb-fill-amber'}`}
                        style={{ width: `${spec.barWidth}%` }}
                      />
                    </div>
                    <span className="sb-spec-rate">{spec.openRate.toFixed(1)}%</span>
                    <span className="sb-spec-volume">{spec.delivered.toLocaleString()}</span>
                    <span className={`sb-spec-dev ${spec.vsAvg >= 0 ? 'sb-dev-pos' : 'sb-dev-neg'}`}>
                      {spec.vsAvg >= 0 ? '+' : ''}{spec.vsAvg.toFixed(1)}pp
                    </span>
                  </div>
                ))}
                {remaining > 0 && (
                  <button className="sb-show-more" onClick={() => toggleShowMore(groupId)}>
                    {showAll ? 'Show less' : `Show ${remaining} more`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {groupedData.length === 0 && (
          <div className="sb-empty">No specialty data available{searchTerm ? ' matching search' : ''}.</div>
        )}
      </div>
    </div>
  );
};

export default SpecialtyBreakdown;