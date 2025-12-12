import React, { useState, useEffect } from 'react';
import '../../styles/TimingIntelligence.css';
import { API_BASE_URL } from '../../config/api';

const TimingIntelligence = () => {
  const [loading, setLoading] = useState(false);
  const [timingData, setTimingData] = useState(null);
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [dateRange, setDateRange] = useState('all');
  const [activeTab, setActiveTab] = useState('heatmap');
  const [hasRun, setHasRun] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState('opens');
  const [specialties, setSpecialties] = useState([]);
  const [specialtiesLoading, setSpecialtiesLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [showSpecialtySelector, setShowSpecialtySelector] = useState(false);
  const [showCampaignSelector, setShowCampaignSelector] = useState(false);
  const [specialtySearchTerm, setSpecialtySearchTerm] = useState('');
  const [campaignSearchTerm, setCampaignSearchTerm] = useState('');

  const API_BASE = `${API_BASE_URL}/api`;

  useEffect(() => {
    fetchSpecialties();
    fetchCampaigns();
  }, []);

  const fetchSpecialties = async () => {
    setSpecialtiesLoading(true);
    try {
      const url = `${API_BASE}/users/specialties?merge=false`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setSpecialties(data.specialties || []);
      }
    } catch (err) {
      console.error('Error fetching specialties:', err);
    } finally {
      setSpecialtiesLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const dashboardMetricsUrl = 'https://emaildash.blob.core.windows.net/json-data/dashboard_metrics.json?sp=r&st=2025-06-09T18:55:36Z&se=2027-06-17T02:55:36Z&spr=https&sv=2024-11-04&sr=b&sig=9o5%2B%2BHmlqiFuAQmw9bGl0D2485Z8xTy0XXsb10S2aCI%3D';
      const response = await fetch(dashboardMetricsUrl);
      if (response.ok) {
        const data = await response.json();
        const validCampaigns = Array.isArray(data) ? data : [];
        setCampaigns(validCampaigns);
      }
    } catch (err) {
      console.error('Error fetching campaigns:', err);
    }
  };

  const handleSpecialtyToggle = (specialty) => {
    setSelectedSpecialties(prev => {
      const isSelected = prev.includes(specialty);
      return isSelected
        ? prev.filter(s => s !== specialty)
        : [...prev, specialty];
    });
  };

  const handleCampaignToggle = (campaign) => {
    setSelectedCampaigns(prev => {
      const isSelected = prev.includes(campaign.campaign_name);
      return isSelected
        ? prev.filter(c => c !== campaign.campaign_name)
        : [...prev, campaign.campaign_name];
    });
  };

  const handleSelectAllSpecialties = () => {
    const filtered = specialties.filter(spec =>
      spec.toLowerCase().includes(specialtySearchTerm.toLowerCase())
    );
    setSelectedSpecialties(filtered);
  };

  const handleClearAllSpecialties = () => {
    setSelectedSpecialties([]);
  };

  const handleSelectAllCampaigns = () => {
    const filtered = campaigns.filter(campaign =>
      campaign.campaign_name.toLowerCase().includes(campaignSearchTerm.toLowerCase())
    );
    setSelectedCampaigns(filtered.map(c => c.campaign_name));
  };

  const handleClearAllCampaigns = () => {
    setSelectedCampaigns([]);
  };

  const fetchTimingData = async () => {
    setLoading(true);
    setHasRun(true);
    try {
      const response = await fetch(`${API_BASE}/analytics/timing-intelligence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialties: selectedSpecialties,
          campaigns: selectedCampaigns,
          date_range: dateRange
        })
      });
      const data = await response.json();
      setTimingData(data);
    } catch (error) {
      console.error('Error fetching timing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSpecialties = specialties.filter(spec =>
    spec.toLowerCase().includes(specialtySearchTerm.toLowerCase())
  );

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.campaign_name.toLowerCase().includes(campaignSearchTerm.toLowerCase())
  );

  const renderHourDayHeatmap = () => {
    if (!timingData?.heatmap_opens) return null;

    let heatmapData, title, subtitle, tooltipSuffix;

    if (heatmapMode === 'opens') {
      heatmapData = timingData.heatmap_opens;
      title = 'When Do Recipients Open Emails?';
      subtitle = 'Shows % of total opens that occurred at each hour/day';
      tooltipSuffix = '% of total opens';
    } else if (heatmapMode === 'sends') {
      heatmapData = timingData.heatmap_sends;
      title = 'When Are Campaigns Sent?';
      subtitle = 'Shows % of total campaign sends at each hour/day - reveals sending patterns';
      tooltipSuffix = '% of total sends';
    } else {
      heatmapData = timingData.heatmap_normalized;
      title = 'Normalized Engagement Lift';
      subtitle = 'Performance relative to send volume - higher = better than expected, lower = worse than expected. 1.0 = baseline.';
      tooltipSuffix = 'x lift';
    }

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const allValues = Object.values(heatmapData).flatMap(day =>
      Object.values(day)
    );
    const maxRate = Math.max(...allValues.filter(v => v !== null && v !== undefined));

    const getColor = (rate) => {
      if (rate === null || rate === undefined) return '#1a1a1a';

      if (heatmapMode === 'normalized') {
        if (rate >= 1.0) {
          const intensity = Math.min((rate - 1.0) / 2.0, 1);
          const r = Math.round(10 + (intensity * 20));
          const g = Math.round(50 + (intensity * 205));
          const b = Math.round(50 + (intensity * 205));
          return `rgb(${r}, ${g}, ${b})`;
        } else {
          const intensity = Math.min((1.0 - rate), 1);
          const r = Math.round(100 + (intensity * 155));
          const g = Math.round(50 + (intensity * 0));
          const b = Math.round(50 - (intensity * 50));
          return `rgb(${r}, ${g}, ${b})`;
        }
      } else {
        const intensity = rate / maxRate;
        const r = Math.round(10 + (intensity * 20));
        const g = Math.round(50 + (intensity * 205));
        const b = Math.round(50 + (intensity * 205));
        return `rgb(${r}, ${g}, ${b})`;
      }
    };

    const formatHour = (hour) => {
      if (hour === 0) return '12a';
      if (hour < 12) return `${hour}a`;
      if (hour === 12) return '12p';
      return `${hour - 12}p`;
    };

    return (
      <div className="heatmap-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h3>{title}</h3>
            <p className="heatmap-subtitle">{subtitle}</p>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              className={`heatmap-mode-btn ${heatmapMode === 'opens' ? 'active' : ''}`}
              onClick={() => setHeatmapMode('opens')}
            >
              Opens
            </button>
            <button
              className={`heatmap-mode-btn ${heatmapMode === 'sends' ? 'active' : ''}`}
              onClick={() => setHeatmapMode('sends')}
            >
              Sends
            </button>
            <button
              className={`heatmap-mode-btn ${heatmapMode === 'normalized' ? 'active' : ''}`}
              onClick={() => setHeatmapMode('normalized')}
            >
              Normalized
            </button>
          </div>
        </div>

        <div className="heatmap-grid">
          <div className="heatmap-y-axis">
            <div className="y-axis-label">Day</div>
            {days.map(day => (
              <div key={day} className="y-axis-tick">
                {day.substring(0, 3)}
              </div>
            ))}
          </div>

          <div className="heatmap-main">
            <div className="heatmap-x-axis">
              {hours.map(hour => (
                <div key={hour} className="x-axis-label">{formatHour(hour)}</div>
              ))}
            </div>

            <div className="heatmap-cells">
              {days.map(day => (
                <div key={day} className="heatmap-row">
                  {hours.map(hour => {
                    const rate = heatmapData[day]?.[hour];
                    const hasData = rate !== null && rate !== undefined;
                    return (
                      <div
                        key={`${day}-${hour}`}
                        className="heatmap-cell"
                        style={{ backgroundColor: getColor(rate) }}
                        title={hasData ? `${day} ${hour}:00 - ${rate.toFixed(heatmapMode === 'normalized' ? 2 : 1)}${tooltipSuffix}` : 'No data'}
                      >
                        {hasData && <span className="cell-value">{heatmapMode === 'normalized' ? `${rate.toFixed(2)}x` : `${rate.toFixed(1)}%`}</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="heatmap-legend">
          {heatmapMode === 'normalized' ? (
            <>
              <span>Below Expected</span>
              <div className="legend-gradient"></div>
              <span>Above Expected</span>
            </>
          ) : (
            <>
              <span>Lower {heatmapMode === 'opens' ? 'Engagement' : 'Volume'}</span>
              <div className="legend-gradient"></div>
              <span>Higher {heatmapMode === 'opens' ? 'Engagement' : 'Volume'}</span>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderTimeToOpenDistribution = () => {
    if (!timingData?.time_to_open) return null;

    const { buckets } = timingData.time_to_open;
    const maxCount = Math.max(...buckets.map(b => b.count));

    return (
      <div className="time-to-open-container">
        <h3>Time to First Open</h3>
        <p className="section-subtitle">How quickly do recipients open emails after they're sent?</p>

        <div className="histogram">
          {buckets.map((bucket, idx) => (
            <div key={idx} className="histogram-bar-container">
              <div
                className="histogram-bar"
                style={{ height: `${(bucket.count / maxCount) * 100}%` }}
                title={`${bucket.label}: ${bucket.count.toLocaleString()} opens (${bucket.percentage.toFixed(1)}%)`}
              >
                <span className="bar-label">{bucket.percentage.toFixed(0)}%</span>
              </div>
              <div className="histogram-label">{bucket.label}</div>
            </div>
          ))}
        </div>

        <div className="insights-cards">
          <div className="insight-card">
            <div className="insight-value">{timingData.time_to_open.median}</div>
            <div className="insight-label">Median Time to Open</div>
          </div>
          <div className="insight-card">
            <div className="insight-value">{timingData.time_to_open.peak_window}</div>
            <div className="insight-label">Peak Engagement Window</div>
          </div>
          <div className="insight-card">
            <div className="insight-value">{timingData.time_to_open.percent_24h}%</div>
            <div className="insight-label">Opens Within 24 Hours</div>
          </div>
        </div>
      </div>
    );
  };

  const renderSpecialtyRecommendations = () => {
    if (!timingData?.specialty_recommendations) return null;

    return (
      <div className="recommendations-container">
        <h3>Best Send Times by Specialty</h3>
        <p className="section-subtitle">Times when this specialty is most likely to open (based on % of total opens)</p>

        <div className="recommendations-grid">
          {timingData.specialty_recommendations.map((rec, idx) => (
            <div key={idx} className="recommendation-card">
              <div className="rec-header">
                <h4>{rec.specialty}</h4>
                <div className="rec-sample-size">{rec.sample_size.toLocaleString()} total opens analyzed</div>
              </div>

              <div className="rec-best-time">
                <div className="time-badge best">
                  <div className="badge-label">BEST</div>
                  <div className="badge-time">{rec.best_time.day} @ {rec.best_time.hour}</div>
                  <div className="badge-rate">{rec.best_time.open_rate.toFixed(1)}% of opens</div>
                </div>
              </div>

              <div className="rec-worst-time">
                <div className="time-badge worst">
                  <div className="badge-label">WORST</div>
                  <div className="badge-time">{rec.worst_time.day} @ {rec.worst_time.hour}</div>
                  <div className="badge-rate">{rec.worst_time.open_rate.toFixed(1)}% of opens</div>
                </div>
              </div>

              <div className="rec-improvement">
                <strong>{rec.improvement}%</strong> better engagement at optimal time
              </div>

              {rec.top_windows && rec.top_windows.length > 0 && (
                <div className="rec-top-windows">
                  <div className="top-windows-label">Other good times:</div>
                  <div className="window-chips">
                    {rec.top_windows.slice(0, 3).map((window, i) => (
                      <span key={i} className="window-chip">
                        {window.day.substr(0, 3)} {window.hour} ({window.open_rate.toFixed(1)}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {selectedSpecialties.length === 0 && (
          <div className="no-specialty-message">
            <p>Select specialties from the filters above to see targeted recommendations</p>
          </div>
        )}
      </div>
    );
  };

  const renderDayOfWeekPerformance = () => {
    if (!timingData?.day_of_week) return null;

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const maxRate = Math.max(...Object.values(timingData.day_of_week).map(d => d.open_rate));

    return (
      <div className="day-performance-container">
        <h3>Day of Week Performance</h3>
        <p className="section-subtitle">What % of total opens happened on each day of the week</p>

        <div className="day-bars">
          {days.map(day => {
            const data = timingData.day_of_week[day];
            if (!data) return null;

            const percentage = (data.open_rate / maxRate) * 100;

            return (
              <div key={day} className="day-bar-item">
                <div className="day-name">{day}</div>
                <div className="day-bar-wrapper">
                  <div
                    className="day-bar"
                    style={{ width: `${percentage}%` }}
                  >
                    <span className="day-rate">{data.open_rate.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="day-count">{data.campaigns.toLocaleString()} opens</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="timing-intelligence">
        <div className="loading-container">
          <div className="spinner">
            <div></div><div></div><div></div><div></div><div></div><div></div>
          </div>
          <p>Analyzing engagement timing patterns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="timing-intelligence">
      <div className="timing-filters">
        <div className="filter-row">
          <div className="filter-group">
            <label>Date Range</label>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              <option value="all">All Time</option>
              <option value="1year">Last 12 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="3months">Last 3 Months</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Filter by Campaign</label>
            <button
              type="button"
              className="selector-button"
              onClick={() => setShowCampaignSelector(true)}
            >
              {selectedCampaigns.length === 0
                ? 'Select Campaigns'
                : `${selectedCampaigns.length} Campaign${selectedCampaigns.length !== 1 ? 's' : ''} Selected`
              }
            </button>
          </div>

          <div className="filter-group">
            <label>Filter by Specialty</label>
            <button
              type="button"
              className="selector-button"
              onClick={() => setShowSpecialtySelector(true)}
            >
              {selectedSpecialties.length === 0
                ? 'Select Specialties'
                : `${selectedSpecialties.length} Specialt${selectedSpecialties.length !== 1 ? 'ies' : 'y'} Selected`
              }
            </button>
          </div>
        </div>

        <div className="run-analysis-section">
          <button
            className="run-analysis-button"
            onClick={fetchTimingData}
            disabled={loading}
          >
            {loading ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>

      {hasRun && (
        <>
          <div className="viz-tabs">
            <button
              className={`viz-tab ${activeTab === 'heatmap' ? 'active' : ''}`}
              onClick={() => setActiveTab('heatmap')}
            >
              Hour × Day Heatmap
            </button>
            <button
              className={`viz-tab ${activeTab === 'time-to-open' ? 'active' : ''}`}
              onClick={() => setActiveTab('time-to-open')}
            >
              Time to Open
            </button>
            <button
              className={`viz-tab ${activeTab === 'recommendations' ? 'active' : ''}`}
              onClick={() => setActiveTab('recommendations')}
            >
              Specialty Recommendations
            </button>
          </div>

          <div className="timing-content">
            {activeTab === 'heatmap' && (
              <>
                {renderHourDayHeatmap()}
                {renderDayOfWeekPerformance()}
              </>
            )}
            {activeTab === 'time-to-open' && renderTimeToOpenDistribution()}
            {activeTab === 'recommendations' && renderSpecialtyRecommendations()}
          </div>
        </>
      )}

      {showSpecialtySelector && (
        <div className="ti-modal-overlay" onClick={() => setShowSpecialtySelector(false)}>
          <div className="ti-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="ti-modal-header">
              <h2>Select Specialties</h2>
              <button
                className="ti-modal-close"
                onClick={() => setShowSpecialtySelector(false)}
              >
                ×
              </button>
            </div>

            <div className="ti-modal-search">
              <input
                type="text"
                placeholder="Search specialties"
                value={specialtySearchTerm}
                onChange={(e) => setSpecialtySearchTerm(e.target.value)}
                className="ti-search-input"
              />
            </div>

            <div className="ti-modal-actions">
              <button
                type="button"
                onClick={handleSelectAllSpecialties}
                className="ti-action-button select-all"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearAllSpecialties}
                className="ti-action-button clear-all"
              >
                Clear All
              </button>
              <div className="ti-selection-count">
                {selectedSpecialties.length} selected
              </div>
            </div>

            <div className="ti-modal-list">
              {specialtiesLoading ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-secondary, #b8b8b8)' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    border: '2px solid #333',
                    borderTopColor: '#0ff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    margin: '0 auto 12px'
                  }}></div>
                  <p style={{ fontSize: '13px', margin: 0 }}>Loading specialties...</p>
                </div>
              ) : filteredSpecialties.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary, #b8b8b8)' }}>
                  {specialties.length === 0 ? (
                    <>
                      <p>No specialties found in the database.</p>
                      <p style={{ fontSize: '0.875rem', marginTop: '8px' }}>
                        Database connection error. Ensure the user_profiles table has specialty data.
                      </p>
                    </>
                  ) : (
                    <p>No matching specialties.</p>
                  )}
                </div>
              ) : (
                filteredSpecialties.map(specialty => {
                  const isSelected = selectedSpecialties.includes(specialty);
                  return (
                    <div
                      key={specialty}
                      className={`ti-modal-list-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSpecialtyToggle(specialty)}
                    >
                      <div className="ti-item-checkbox">
                        {isSelected && <span className="checkmark">✓</span>}
                      </div>
                      <div className="ti-item-info">
                        <div className="ti-item-name">{specialty}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="ti-modal-footer">
              <button
                type="button"
                onClick={() => setShowSpecialtySelector(false)}
                className="ti-done-button"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showCampaignSelector && (
        <div className="ti-modal-overlay" onClick={() => setShowCampaignSelector(false)}>
          <div className="ti-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="ti-modal-header">
              <h2>Select Campaigns</h2>
              <button
                className="ti-modal-close"
                onClick={() => setShowCampaignSelector(false)}
              >
                ×
              </button>
            </div>

            <div className="ti-modal-search">
              <input
                type="text"
                placeholder="Search campaigns"
                value={campaignSearchTerm}
                onChange={(e) => setCampaignSearchTerm(e.target.value)}
                className="ti-search-input"
              />
            </div>

            <div className="ti-modal-actions">
              <button
                type="button"
                onClick={handleSelectAllCampaigns}
                className="ti-action-button select-all"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearAllCampaigns}
                className="ti-action-button clear-all"
              >
                Clear All
              </button>
              <div className="ti-selection-count">
                {selectedCampaigns.length} selected
              </div>
            </div>

            <div className="ti-modal-list">
              {filteredCampaigns.map(campaign => {
                const isSelected = selectedCampaigns.includes(campaign.campaign_name);
                return (
                  <div
                    key={campaign.campaign_name}
                    className={`ti-modal-list-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleCampaignToggle(campaign)}
                  >
                    <div className="ti-item-checkbox">
                      {isSelected && <span className="checkmark">✓</span>}
                    </div>
                    <div className="ti-item-info">
                      <div className="ti-item-name">{campaign.campaign_name}</div>
                      <div className="ti-item-stats">
                        <span>Opens: {campaign.volume_metrics?.unique_opens?.toLocaleString() || 'N/A'}</span>
                        <span>Rate: {campaign.core_metrics?.unique_open_rate?.toFixed(1) || 'N/A'}%</span>
                        <span>Delivered: {campaign.volume_metrics?.delivered?.toLocaleString() || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="ti-modal-footer">
              <button
                type="button"
                onClick={() => setShowCampaignSelector(false)}
                className="ti-done-button"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimingIntelligence;