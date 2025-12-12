import React, { useState, useEffect, useRef } from 'react';
import '../../styles/SpecialtySection.css';
import { matchesSearchTerm } from '../../utils/searchUtils';
import { useSearch } from '../../context/SearchContext';

const SpecialtySection = () => {
  const { searchTerms, setSearchTerm: setGlobalSearchTerm } = useSearch();
  const [specialtyData, setSpecialtyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeBucket, setActiveBucket] = useState(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [combineSubSpecialties, setCombineSubSpecialties] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchTerms.specialtyMetrics || '');
  const layoverRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (layoverRef.current && !layoverRef.current.contains(event.target)) {
        setSelectedSpecialty(null);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [layoverRef]);

  useEffect(() => {
    async function fetchSpecialtyData() {
      try {
        const blobUrl = "https://emaildash.blob.core.windows.net/json-data/campaign_specialty_analytics.json?sp=r&st=2025-05-21T17:34:21Z&se=2026-10-01T01:34:21Z&spr=https&sv=2024-11-04&sr=b&sig=51CHGowiAC88aYsUogq6GrhpoAJqYaxpvydLbDkMCLA%3D";
        const response = await fetch(blobUrl);
        
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status}`);
        }
        
        const jsonData = await response.json();
        
        const transformedData = transformNewFormatData(jsonData);
        setSpecialtyData(transformedData);
      } catch (error) {
        setError("Failed to load specialty metrics data. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    
    fetchSpecialtyData();
  }, []);

  const transformNewFormatData = (rawData) => {
    
    if (!rawData || typeof rawData !== 'object') {
      return {};
    }
    
    const transformed = {};
    
    Object.keys(rawData).forEach(bucket => {
      transformed[bucket] = {};
      
      Object.keys(rawData[bucket]).forEach(topic => {
        const topicData = rawData[bucket][topic];
        
        if (topicData && topicData.aggregate && topicData.aggregate.specialties) {
          
          const aggregate = topicData.aggregate;
          
          transformed[bucket][topic] = {
            Aggregate: {
              Sent: aggregate.total_sent || 0,
              Bounced: aggregate.total_bounced || 0,
              Delivered: aggregate.total_delivered || 0,
              Unique_Opens: aggregate.total_opens || 0,
              Unique_Open_Rate: aggregate.average_open_rate || 0
            },
            Specialties: {}
          };
          
          Object.keys(aggregate.specialties).forEach(specialty => {
            const specData = aggregate.specialties[specialty];
            
            transformed[bucket][topic].Specialties[specialty] = {
              Sent: specData.total_sent || 0,
              Delivered: specData.total_delivered || 0,
              Unique_Opens: specData.total_opens || 0,
              Unique_Open_Rate: specData.average_open_rate || 0
            };
          });
          
        }
        else if (topicData && (topicData.Aggregate || topicData.Specialties)) {
          transformed[bucket][topic] = topicData;
        }
        else {
        }
      });
    });
    
    return transformed;
  };

  const formatNumber = (num) => {
    if (num === undefined || isNaN(num)) return "0";
    return num.toLocaleString();
  };

  const formatPercent = (value) => {
    if (value === undefined || isNaN(value)) return "0.00%";
    return value.toFixed(2) + '%';
  };

  const groupSpecialties = (specialty) => {
    if (!specialty || specialty === '') {
      return 'Unknown';
    }
    
    const parts = String(specialty).split(' - ');
    return parts[0].trim();
  };

  const toggleBucket = (bucket) => {
    if (activeBucket === bucket) {
      setActiveBucket(null);
    } else {
      setActiveBucket(bucket);
    }
  };

  const getTopicTotals = (bucketData, topic, searchFilter = '') => {
    if (!bucketData || !bucketData[topic]) {
      return {
        Sent: 0,
        Delivered: 0,
        Unique_Opens: 0,
        Unique_Open_Rate: 0
      };
    }

    if (!searchFilter || !searchFilter.trim()) {
      if (bucketData[topic].Aggregate) {
        return {
          Sent: bucketData[topic].Aggregate.Sent || 0,
          Delivered: bucketData[topic].Aggregate.Delivered || 0,
          Unique_Opens: bucketData[topic].Aggregate.Unique_Opens || 0,
          Unique_Open_Rate: bucketData[topic].Aggregate.Unique_Open_Rate || 0
        };
      }
    }

    if (!bucketData[topic].Specialties) {
      return {
        Sent: 0,
        Delivered: 0,
        Unique_Opens: 0,
        Unique_Open_Rate: 0
      };
    }

    const specialties = bucketData[topic].Specialties;

    let totalSent = 0;
    let totalDelivered = 0;
    let totalOpens = 0;
    let weightedRateSum = 0;
    let totalWeight = 0;

    Object.entries(specialties).forEach(([name, specialty]) => {
      if (searchFilter && searchFilter.trim() && !matchesSearchTerm(name, searchFilter)) {
        return;
      }

      totalSent += specialty.Sent || 0;
      totalDelivered += specialty.Delivered || 0;
      totalOpens += specialty.Unique_Opens || 0;

      const delivered = specialty.Delivered || 0;
      const rate = specialty.Unique_Open_Rate || 0;
      if (delivered > 0) {
        weightedRateSum += rate * delivered;
        totalWeight += delivered;
      }
    });

    const openRate = totalWeight > 0 ? weightedRateSum / totalWeight : 0;

    return {
      Sent: totalSent,
      Delivered: totalDelivered,
      Unique_Opens: totalOpens,
      Unique_Open_Rate: openRate
    };
  };

  const recalculateBucketMetrics = (bucketData) => {
    if (!bucketData) return null;

    const topics = Object.keys(bucketData).filter(key => key !== 'Aggregate');

    let totalSent = 0;
    let totalDelivered = 0;
    let totalOpens = 0;
    let weightedRateSum = 0;
    let totalWeight = 0;

    topics.forEach(topic => {
      const topicMetrics = getTopicTotals(bucketData, topic);
      totalSent += topicMetrics.Sent;
      totalDelivered += topicMetrics.Delivered;
      totalOpens += topicMetrics.Unique_Opens;

      if (topicMetrics.Delivered > 0) {
        weightedRateSum += topicMetrics.Unique_Open_Rate * topicMetrics.Delivered;
        totalWeight += topicMetrics.Delivered;
      }
    });

    const openRate = totalWeight > 0 ? weightedRateSum / totalWeight : 0;

    return {
      Sent: totalSent,
      Delivered: totalDelivered,
      Unique_Opens: totalOpens,
      Unique_Open_Rate: openRate
    };
  };

  const recalculateFilteredBucketMetrics = (bucketData, searchFilter) => {
    if (!bucketData) return null;

    if (!searchFilter || !searchFilter.trim()) {
      return recalculateBucketMetrics(bucketData);
    }

    const topics = Object.keys(bucketData).filter(key => key !== 'Aggregate');

    let totalSent = 0;
    let totalDelivered = 0;
    let totalOpens = 0;
    let weightedRateSum = 0;
    let totalWeight = 0;

    topics.forEach(topic => {
      if (!bucketData[topic] || !bucketData[topic].Specialties) return;

      const specialties = bucketData[topic].Specialties;

      Object.entries(specialties).forEach(([name, data]) => {
        if (!matchesSearchTerm(name, searchFilter)) return;

        totalSent += data.Sent || 0;
        totalDelivered += data.Delivered || 0;
        totalOpens += data.Unique_Opens || 0;

        const delivered = data.Delivered || 0;
        const rate = data.Unique_Open_Rate || 0;
        if (delivered > 0) {
          weightedRateSum += rate * delivered;
          totalWeight += delivered;
        }
      });
    });

    const openRate = totalWeight > 0 ? weightedRateSum / totalWeight : 0;

    return {
      Sent: totalSent,
      Delivered: totalDelivered,
      Unique_Opens: totalOpens,
      Unique_Open_Rate: openRate
    };
  };

  const getSortedSpecialties = (topic, searchFilter = '') => {
    if (!activeBucket || !specialtyData[activeBucket][topic] || !specialtyData[activeBucket][topic].Specialties) {
      return [];
    }

    const specialties = specialtyData[activeBucket][topic].Specialties;

    if (!combineSubSpecialties) {
      return Object.entries(specialties)
        .filter(([name]) => {
          if (!searchFilter.trim()) return true;
          return matchesSearchTerm(name, searchFilter);
        })
        .map(([name, data]) => ({
          name,
          ...data,
          openRate: data.Unique_Open_Rate || 0
        }))
        .sort((a, b) => b.openRate - a.openRate);
    }

    const grouped = {};

    Object.entries(specialties).forEach(([name, data]) => {
      const groupName = groupSpecialties(name);

      if (searchFilter.trim() && !matchesSearchTerm(name, searchFilter)) {
        return;
      }

      if (!grouped[groupName]) {
        grouped[groupName] = {
          name: groupName,
          Sent: 0,
          Delivered: 0,
          Unique_Opens: 0,
          weightedRateSum: 0,
          totalWeight: 0,
          subSpecialties: []
        };
      }

      grouped[groupName].Sent += data.Sent || 0;
      grouped[groupName].Delivered += data.Delivered || 0;
      grouped[groupName].Unique_Opens += data.Unique_Opens || 0;

      const delivered = data.Delivered || 0;
      const rate = data.Unique_Open_Rate || 0;
      if (delivered > 0) {
        grouped[groupName].weightedRateSum += rate * delivered;
        grouped[groupName].totalWeight += delivered;
      }

      grouped[groupName].subSpecialties.push({
        name,
        ...data,
        openRate: data.Unique_Open_Rate || 0
      });
    });

    Object.values(grouped).forEach(group => {
      group.openRate = group.totalWeight > 0 ?
        group.weightedRateSum / group.totalWeight : 0;
    });

    return Object.values(grouped).sort((a, b) => b.openRate - a.openRate);
  };

  const handleSpecialtyClick = (topic, specialty) => {
    setSelectedSpecialty({
      bucket: activeBucket,
      topic,
      specialty
    });
  };

  if (loading) {
    return (
      <div className="specialty-section">
        <div className="specialty-loader">
          <div className="specialty-spinner">
            <div></div><div></div><div></div><div></div><div></div><div></div>
          </div>
          <p>Loading specialty metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="specialty-section">
        <div className="specialty-error">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const buckets = specialtyData ? Object.keys(specialtyData) : [];
  const activeBucketData = activeBucket ? specialtyData[activeBucket] : null;
  const bucketMetrics = activeBucketData ?
    recalculateFilteredBucketMetrics(activeBucketData, searchQuery) :
    { Sent: 0, Delivered: 0, Unique_Opens: 0, Unique_Open_Rate: 0 };

  return (
    <div className="specialty-section">
      <div className="page-header">
        <h1>Specialty Metrics</h1>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search specialties"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setGlobalSearchTerm('specialtyMetrics', e.target.value);
            }}
            className="search-input"
          />
        </div>
      </div>

      <div className="specialty-tabs-container">
        <div className="specialty-tabs">
          {buckets.map((bucket) => (
            <button
              key={bucket}
              className={`tab-button ${activeBucket === bucket ? 'active' : ''}`}
              onClick={() => toggleBucket(bucket)}
            >
              <span>{bucket}</span>
            </button>
          ))}
        </div>
        <div className="specialty-merge-selector">
          <label htmlFor="merge-select">Merge Specialties:</label>
          <select
            id="merge-select"
            value={combineSubSpecialties ? 'merged' : 'separate'}
            onChange={(e) => setCombineSubSpecialties(e.target.value === 'merged')}
          >
            <option value="separate">Separate</option>
            <option value="merged">Merged</option>
          </select>
        </div>
      </div>

      {activeBucket && specialtyData[activeBucket] && (
        <div className="specialty-content">
          <div className="specialty-aggregate-metrics">
            <div className="specialty-aggregate-card">
              <div className="specialty-aggregate-label">Sent</div>
              <div className="specialty-aggregate-value">{formatNumber(bucketMetrics.Sent)}</div>
            </div>
            <div className="specialty-aggregate-card">
              <div className="specialty-aggregate-label">Delivered</div>
              <div className="specialty-aggregate-value">{formatNumber(bucketMetrics.Delivered)}</div>
            </div>
            <div className="specialty-aggregate-card">
              <div className="specialty-aggregate-label">Unique Opens</div>
              <div className="specialty-aggregate-value">{formatNumber(bucketMetrics.Unique_Opens)}</div>
            </div>
            <div className="specialty-aggregate-card specialty-highlight">
              <div className="specialty-aggregate-label">Unique Open Rate</div>
              <div className="specialty-aggregate-value">{formatPercent(bucketMetrics.Unique_Open_Rate)}</div>
            </div>
          </div>

          <div className="specialty-topics-container">
            {Object.keys(specialtyData[activeBucket])
              .filter(key => key !== 'Aggregate')
              .map((topic) => {
                const topicTotals = getTopicTotals(specialtyData[activeBucket], topic, searchQuery);
                const sortedSpecialties = getSortedSpecialties(topic, searchQuery);

                if (searchQuery && sortedSpecialties.length === 0) {
                  return null;
                }

                return (
                  <div className="specialty-topic-section" key={topic}>
                    <h3 className="specialty-topic-heading">{topic}</h3>

                    <div className="specialty-metrics-grid">
                      <div
                        className="specialty-metric-card specialty-total-card"
                        onClick={() => handleSpecialtyClick(topic, {
                          name: "Total Average",
                          Sent: topicTotals.Sent,
                          Delivered: topicTotals.Delivered,
                          Unique_Opens: topicTotals.Unique_Opens,
                          openRate: topicTotals.Unique_Open_Rate
                        })}
                      >
                        <div className="specialty-name">Total Avg</div>
                        <div className="specialty-open-rate">{formatPercent(topicTotals.Unique_Open_Rate)}</div>
                      </div>

                      {sortedSpecialties.map((specialty) => (
                        <div
                          className={`specialty-metric-card ${combineSubSpecialties && specialty.subSpecialties ? 'specialty-grouped-card' : ''}`}
                          key={specialty.name}
                          onClick={() => handleSpecialtyClick(topic, specialty)}
                        >
                          <div className="specialty-name">
                            {specialty.name}
                            {combineSubSpecialties && specialty.subSpecialties && (
                              <span className="specialty-sub-count">({specialty.subSpecialties.length})</span>
                            )}
                          </div>
                          <div className="specialty-open-rate">
                            {formatPercent(specialty.openRate)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {selectedSpecialty && (
        <div className="specialty-layover-container">
          <div className="specialty-layover" ref={layoverRef}>
            <div className="specialty-layover-header">
              <h3>{selectedSpecialty.specialty.name}</h3>
              <button 
                className="specialty-layover-close" 
                onClick={() => setSelectedSpecialty(null)}
              >
                ×
              </button>
            </div>
            <div className="specialty-layover-content">
              <div className="specialty-layover-meta">
                <div>{selectedSpecialty.bucket} | {selectedSpecialty.topic}</div>
              </div>
              <div className="specialty-layover-metrics">
                <div className="specialty-layover-metric">
                  <div className="specialty-layover-metric-label">Sent</div>
                  <div className="specialty-layover-metric-value">
                    {formatNumber(selectedSpecialty.specialty.Sent || 0)}
                  </div>
                </div>
                <div className="specialty-layover-metric">
                  <div className="specialty-layover-metric-label">Delivered</div>
                  <div className="specialty-layover-metric-value">
                    {formatNumber(selectedSpecialty.specialty.Delivered || 0)}
                  </div>
                </div>
                <div className="specialty-layover-metric">
                  <div className="specialty-layover-metric-label">Unique Opens</div>
                  <div className="specialty-layover-metric-value">
                    {formatNumber(selectedSpecialty.specialty.Unique_Opens || 0)}
                  </div>
                </div>
                <div className="specialty-layover-metric specialty-highlight">
                  <div className="specialty-layover-metric-label">Unique Open Rate</div>
                  <div className="specialty-layover-metric-value">
                    {formatPercent(selectedSpecialty.specialty.openRate)}
                  </div>
                </div>
              </div>
              
              {combineSubSpecialties && selectedSpecialty.specialty.subSpecialties && (
                <div className="specialty-layover-subspecialties">
                  <h4>Sub-Specialties:</h4>
                  <div className="specialty-subspecialty-list">
                    {selectedSpecialty.specialty.subSpecialties
                      .sort((a, b) => b.openRate - a.openRate)
                      .map((sub, index) => (
                        <div key={index} className="specialty-subspecialty-item">
                          <span className="specialty-subspecialty-name">{sub.name}</span>
                          <span className="specialty-subspecialty-rate">{formatPercent(sub.openRate)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!activeBucket && (
        <div className="specialty-empty-state">
          <p>Select a bucket above to view specialty metrics</p>
        </div>
      )}
    </div>
  );
};

export default SpecialtySection;