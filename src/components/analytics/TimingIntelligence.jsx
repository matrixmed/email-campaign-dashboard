import React, { useState, useEffect, useMemo } from 'react';
import '../../styles/TimingIntelligence.css';
import '../../styles/SectionHeaders.css';
import { API_BASE_URL } from '../../config/api';
import { getIndustry } from '../../utils/industryKeywords';

const METRICS_BLOB_URL = 'https://emaildash.blob.core.windows.net/json-data/dashboard_metrics.json?sp=r&st=2025-06-09T18:55:36Z&se=2027-06-17T02:55:36Z&spr=https&sv=2024-11-04&sr=b&sig=9o5%2B%2BHmlqiFuAQmw9bGl0D2485Z8xTy0XXsb10S2aCI%3D';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TimingIntelligence = ({ onClearCache }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [brandIndustryMap, setBrandIndustryMap] = useState({});

  const [heatmapData, setHeatmapData] = useState(null);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState('opens');
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [dateRange, setDateRange] = useState('all');
  const [specialties, setSpecialties] = useState([]);
  const [specialtiesLoading, setSpecialtiesLoading] = useState(true);
  const [showSpecialtySelector, setShowSpecialtySelector] = useState(false);
  const [showCampaignSelector, setShowCampaignSelector] = useState(false);
  const [specialtySearchTerm, setSpecialtySearchTerm] = useState('');
  const [campaignSearchTerm, setCampaignSearchTerm] = useState('');

  const API_BASE = `${API_BASE_URL}/api`;

  useEffect(() => {
    fetchCampaigns();
    fetchSpecialties();
    fetchBrandData();
  }, []);

  const fetchCampaigns = async () => {
    setCampaignsLoading(true);
    try {
      const response = await fetch(`${METRICS_BLOB_URL}&_t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        setCampaigns(Array.isArray(data) ? data : []);
      }
    } catch (err) {}
    finally { setCampaignsLoading(false); }
  };

  const fetchSpecialties = async () => {
    setSpecialtiesLoading(true);
    try {
      const response = await fetch(`${API_BASE}/users/specialties?merge=false`);
      if (response.ok) {
        const data = await response.json();
        setSpecialties(data.specialties || []);
      }
    } catch (err) {}
    finally { setSpecialtiesLoading(false); }
  };

  const fetchBrandData = async () => {
    try {
      const response = await fetch(`${API_BASE}/brand-management`);
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

  const overview = useMemo(() => {
    if (!campaigns.length) return null;

    const valid = campaigns.filter(c =>
      c.core_metrics?.['1_hour_open_rate'] != null && c.send_date
    );
    if (!valid.length) return null;

    const avg = arr => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;

    const byDay = {};
    DAY_ORDER.forEach(d => { byDay[d] = { rates1hr: [], rates6hr: [], rates12hr: [], rates24hr: [], uniqueOpenRates: [], count: 0 }; });

    valid.forEach(c => {
      const dow = DAY_NAMES[new Date(c.send_date + 'T12:00:00').getDay()];
      if (!byDay[dow]) return;
      byDay[dow].count++;
      byDay[dow].rates1hr.push(c.core_metrics['1_hour_open_rate'] || 0);
      byDay[dow].rates6hr.push(c.core_metrics['6_hour_open_rate'] || 0);
      byDay[dow].rates12hr.push(c.core_metrics['12_hour_open_rate'] || 0);
      byDay[dow].rates24hr.push(c.core_metrics['24_hour_open_rate'] || 0);
      if (c.core_metrics.unique_open_rate != null) {
        byDay[dow].uniqueOpenRates.push(c.core_metrics.unique_open_rate);
      }
    });

    const dayData = DAY_ORDER.map(name => ({
      day_name: name,
      campaign_count: byDay[name].count,
      avg_unique_open_rate: avg(byDay[name].uniqueOpenRates),
      avg_1hr_rate: avg(byDay[name].rates1hr),
      avg_6hr_rate: avg(byDay[name].rates6hr),
      avg_12hr_rate: avg(byDay[name].rates12hr),
      avg_24hr_rate: avg(byDay[name].rates24hr),
    })).filter(d => d.campaign_count > 0);

    const avg1hr = avg(valid.map(c => c.core_metrics['1_hour_open_rate'] || 0));
    const avg6hr = avg(valid.map(c => c.core_metrics['6_hour_open_rate'] || 0));
    const avg12hr = avg(valid.map(c => c.core_metrics['12_hour_open_rate'] || 0));
    const avg24hr = avg(valid.map(c => c.core_metrics['24_hour_open_rate'] || 0));

    const avgTimeHours = valid
      .map(c => c.core_metrics.avg_time_to_open_hours)
      .filter(v => v != null && v > 0);
    const medianTime = avgTimeHours.length
      ? avgTimeHours.sort((a, b) => a - b)[Math.floor(avgTimeHours.length / 2)]
      : 0;
    const medianDisplay = medianTime < 1
      ? `${Math.round(medianTime * 60)} min`
      : medianTime < 24
        ? `${medianTime.toFixed(1)} hrs`
        : `${(medianTime / 24).toFixed(1)} days`;

    const marketBuckets = {};

    valid.forEach(c => {
      const industry = getIndustry(c.campaign_name, brandIndustryMap);
      if (!industry) return;
      if (!marketBuckets[industry]) marketBuckets[industry] = { rates1hr: [], rates6hr: [], rates12hr: [], rates24hr: [], count: 0 };
      marketBuckets[industry].count++;
      marketBuckets[industry].rates1hr.push(c.core_metrics['1_hour_open_rate'] || 0);
      marketBuckets[industry].rates6hr.push(c.core_metrics['6_hour_open_rate'] || 0);
      marketBuckets[industry].rates12hr.push(c.core_metrics['12_hour_open_rate'] || 0);
      marketBuckets[industry].rates24hr.push(c.core_metrics['24_hour_open_rate'] || 0);
    });

    const marketVelocity = Object.entries(marketBuckets)
      .filter(([, v]) => v.count >= 5)
      .map(([market, v]) => ({
        market,
        count: v.count,
        avg_1hr: avg(v.rates1hr),
        avg_6hr: avg(v.rates6hr),
        avg_12hr: avg(v.rates12hr),
        avg_24hr: avg(v.rates24hr),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const uniqueOpenRates = valid.map(c => c.core_metrics.unique_open_rate).filter(v => v != null);
    const avgUniqueOpenRate = avg(uniqueOpenRates);

    const weekdays = dayData.filter(d => ['Monday','Tuesday','Wednesday','Thursday','Friday'].includes(d.day_name));
    const weekends = dayData.filter(d => ['Saturday','Sunday'].includes(d.day_name));
    const wdAvg = weekdays.length ? avg(weekdays.map(d => d.avg_unique_open_rate)) : 0;
    const weAvg = weekends.length ? avg(weekends.map(d => d.avg_unique_open_rate)) : 0;

    const bestDay = dayData.filter(d => d.campaign_count >= 3)
      .sort((a, b) => b.avg_unique_open_rate - a.avg_unique_open_rate)[0] || null;

    return {
      dayData,
      overallVelocity: { avg1hr, avg6hr, avg12hr, avg24hr },
      marketVelocity,
      medianDisplay,
      totalCampaigns: valid.length,
      avg1hr,
      avgUniqueOpenRate,
      bestDay,
      wdAvg,
      weAvg,
      weekdayDiff: +(wdAvg - weAvg).toFixed(1),
    };
  }, [campaigns, brandIndustryMap]);

  const fetchHeatmapData = async () => {
    setHeatmapLoading(true);
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
      setHeatmapData(data);
    } catch (error) {
    } finally {
      setHeatmapLoading(false);
    }
  };

  const handleSpecialtyToggle = (specialty) => {
    setSelectedSpecialties(prev =>
      prev.includes(specialty) ? prev.filter(s => s !== specialty) : [...prev, specialty]
    );
  };

  const handleCampaignToggle = (campaign) => {
    setSelectedCampaigns(prev =>
      prev.includes(campaign.campaign_name) ? prev.filter(c => c !== campaign.campaign_name) : [...prev, campaign.campaign_name]
    );
  };

  const handleSelectAllSpecialties = () => {
    setSelectedSpecialties(specialties.filter(spec => spec.toLowerCase().includes(specialtySearchTerm.toLowerCase())));
  };
  const handleClearAllSpecialties = () => setSelectedSpecialties([]);
  const handleSelectAllCampaigns = () => {
    setSelectedCampaigns(campaigns.filter(c => c.campaign_name.toLowerCase().includes(campaignSearchTerm.toLowerCase())).map(c => c.campaign_name));
  };
  const handleClearAllCampaigns = () => setSelectedCampaigns([]);

  const filteredSpecialties = specialties.filter(spec => spec.toLowerCase().includes(specialtySearchTerm.toLowerCase()));
  const filteredCampaigns = campaigns.filter(c => c.campaign_name.toLowerCase().includes(campaignSearchTerm.toLowerCase()));

  const formatHourShort = (h) => {
    if (h === 0) return '12a';
    if (h < 12) return `${h}a`;
    if (h === 12) return '12p';
    return `${h - 12}p`;
  };

  const renderDayOfWeekPerformance = () => {
    if (!overview?.dayData?.length) return null;
    const data = overview.dayData;
    const maxOpenRate = Math.max(...data.map(d => d.avg_unique_open_rate));
    const max1hr = Math.max(...data.map(d => d.avg_1hr_rate));
    const maxRate = Math.max(maxOpenRate, max1hr);

    const qualified = data.filter(d => d.campaign_count >= 3);
    const sweetSpot = qualified.length > 0
      ? qualified.reduce((best, d) => d.avg_unique_open_rate > best.avg_unique_open_rate ? d : best, qualified[0])
      : null;

    return (
      <div className="ti-section">
        <div className="ti-section-title">Day of Week Performance</div>
        <div className="ti-mini-chart">
          {data.map(d => {
            const isSweet = sweetSpot && d.day_name === sweetSpot.day_name;
            return (
              <div className={`ti-mini-row ${isSweet ? 'ti-sweet-spot' : ''}`} key={d.day_name}>
                <div className="ti-mini-label">{d.day_name.slice(0, 3)}</div>
                <div className="ti-mini-track">
                  <div className="ti-fill-6hr" style={{ width: `${maxRate > 0 ? (d.avg_1hr_rate / maxRate) * 100 : 0}%` }} />
                  <div className="ti-mini-fill" style={{ width: `${maxRate > 0 ? (d.avg_unique_open_rate / maxRate) * 100 : 0}%` }} />
                </div>
                <div className="ti-mini-value">{d.avg_unique_open_rate}%</div>
                <div className="ti-mini-count">{d.campaign_count} cmp</div>
              </div>
            );
          })}
        </div>
        <div className="ti-legend-row">
          <span className="ti-legend-swatch ti-legend-1hr"></span> Unique open rate
          <span className="ti-legend-swatch ti-legend-6hr" style={{ marginLeft: 12 }}></span> 1-hr velocity
        </div>
        <div className="ti-callout">
          Weekday avg: <strong>{overview.wdAvg}%</strong>&nbsp;&nbsp;|&nbsp;&nbsp;Weekend avg: <strong>{overview.weAvg}%</strong>
        </div>
      </div>
    );
  };

  const renderAutoInsights = () => {
    if (!overview) return null;

    return (
      <div className="ti-section">
        <div className="ti-section-title">Auto Insights</div>
        <div className="ti-insight-grid">
          <div className="ti-auto-insight">
            <div className="ti-auto-insight-label">Best Send Day</div>
            <div className="ti-auto-insight-value">{overview.bestDay ? overview.bestDay.day_name : 'N/A'}</div>
            <div className="ti-auto-insight-detail">{overview.bestDay ? `${overview.bestDay.avg_unique_open_rate}% open rate (${overview.bestDay.campaign_count} campaigns)` : ''}</div>
          </div>
          <div className="ti-auto-insight">
            <div className="ti-auto-insight-label">Avg Unique Open Rate</div>
            <div className="ti-auto-insight-value">{overview.avgUniqueOpenRate}%</div>
            <div className="ti-auto-insight-detail">across {overview.totalCampaigns} campaigns</div>
          </div>
          <div className="ti-auto-insight">
            <div className="ti-auto-insight-label">Median Time to Open</div>
            <div className="ti-auto-insight-value">{overview.medianDisplay}</div>
            <div className="ti-auto-insight-detail">median avg time to open</div>
          </div>
          <div className="ti-auto-insight">
            <div className="ti-auto-insight-label">Weekday vs Weekend</div>
            <div className="ti-auto-insight-value">{overview.weekdayDiff >= 0 ? '+' : ''}{overview.weekdayDiff} pp</div>
            <div className="ti-auto-insight-detail">weekday advantage in unique open rate</div>
          </div>
        </div>
      </div>
    );
  };

  const renderMarketVelocity = () => {
    if (!overview) return null;
    const { overallVelocity, marketVelocity, medianDisplay, totalCampaigns } = overview;

    const rows = [
      { label: 'Overall', count: totalCampaigns, ...overallVelocity, isOverall: true },
      ...marketVelocity.map(m => ({
        label: m.market,
        count: m.count,
        avg1hr: m.avg_1hr,
        avg6hr: m.avg_6hr,
        avg12hr: m.avg_12hr,
        avg24hr: m.avg_24hr,
        isOverall: false,
      }))
    ];

    return (
      <div className="ti-section ti-section-full">
        <div className="ti-section-title">Engagement Velocity by Market</div>
        <p className="ti-section-sub">Avg % of unique opens reached at each time milestone, grouped by market (brand-name matching)</p>
        <div className="ti-velocity-table">
          <div className="ti-vel-header">
            <div className="ti-vel-cell ti-vel-market">Market</div>
            <div className="ti-vel-cell ti-vel-num">1 Hour</div>
            <div className="ti-vel-cell ti-vel-num">6 Hours</div>
            <div className="ti-vel-cell ti-vel-num">12 Hours</div>
            <div className="ti-vel-cell ti-vel-num">24 Hours</div>
            <div className="ti-vel-cell ti-vel-count">Campaigns</div>
          </div>
          {rows.map(r => (
            <div className={`ti-vel-row ${r.isOverall ? 'ti-vel-overall' : ''}`} key={r.label}>
              <div className="ti-vel-cell ti-vel-market">{r.label}</div>
              <div className="ti-vel-cell ti-vel-num">{r.avg1hr}%</div>
              <div className="ti-vel-cell ti-vel-num">{r.avg6hr}%</div>
              <div className="ti-vel-cell ti-vel-num">{r.avg12hr}%</div>
              <div className="ti-vel-cell ti-vel-num">{r.avg24hr}%</div>
              <div className="ti-vel-cell ti-vel-count">{r.count}</div>
            </div>
          ))}
        </div>
        <div className="ti-callout">
          Median time to open: <strong>{medianDisplay}</strong>
        </div>
      </div>
    );
  };

  const renderHeatmap = () => {
    if (!heatmapData?.heatmap_opens) return null;

    const data = heatmapMode === 'sends' ? heatmapData.heatmap_sends : heatmapData.heatmap_opens;
    const title = heatmapMode === 'sends' ? 'When Are Campaigns Sent?' : 'When Do Recipients Open Emails?';
    const subtitle = heatmapMode === 'sends'
      ? 'Shows % of total campaign sends at each hour/day'
      : 'Shows % of total opens that occurred at each hour/day';
    const tooltipSuffix = heatmapMode === 'sends' ? '% of total sends' : '% of total opens';

    const hours = Array.from({ length: 24 }, (_, i) => i);
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const allValues = Object.values(data).flatMap(day => Object.values(day));
    const maxRate = Math.max(...allValues.filter(v => v !== null && v !== undefined));

    const getColor = (rate) => {
      if (rate === null || rate === undefined) return '#1a1a1a';
      const intensity = rate / maxRate;
      const r = Math.round(10 + (intensity * 20));
      const g = Math.round(50 + (intensity * 205));
      const b = Math.round(50 + (intensity * 205));
      return `rgb(${r}, ${g}, ${b})`;
    };

    return (
      <div className="heatmap-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h3>{title}</h3>
            <p className="heatmap-subtitle">{subtitle}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button className={`heatmap-mode-btn ${heatmapMode === 'opens' ? 'active' : ''}`} onClick={() => setHeatmapMode('opens')}>Opens</button>
            <button className={`heatmap-mode-btn ${heatmapMode === 'sends' ? 'active' : ''}`} onClick={() => setHeatmapMode('sends')}>Sends</button>
          </div>
        </div>

        <div className="heatmap-grid">
          <div className="heatmap-y-axis">
            <div className="y-axis-label">Day</div>
            {days.map(day => (<div key={day} className="y-axis-tick">{day.substring(0, 3)}</div>))}
          </div>
          <div className="heatmap-main">
            <div className="heatmap-x-axis">
              {hours.map(hour => (<div key={hour} className="x-axis-label">{formatHourShort(hour)}</div>))}
            </div>
            <div className="heatmap-cells">
              {days.map(day => (
                <div key={day} className="heatmap-row">
                  {hours.map(hour => {
                    const rate = data[day]?.[hour];
                    const hasData = rate !== null && rate !== undefined;
                    return (
                      <div
                        key={`${day}-${hour}`}
                        className="heatmap-cell"
                        style={{ backgroundColor: getColor(rate) }}
                        title={hasData ? `${day} ${hour}:00 - ${rate.toFixed(1)}${tooltipSuffix}` : 'No data'}
                      >
                        {hasData && <span className="cell-value">{rate.toFixed(1)}%</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="heatmap-legend">
          <span>Lower {heatmapMode === 'opens' ? 'Engagement' : 'Volume'}</span>
          <div className="legend-gradient"></div>
          <span>Higher {heatmapMode === 'opens' ? 'Engagement' : 'Volume'}</span>
        </div>
      </div>
    );
  };

  const renderDayBars = () => {
    if (!heatmapData?.day_of_week) return null;
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const maxRate = Math.max(...Object.values(heatmapData.day_of_week).map(d => d.open_rate));

    return (
      <div className="day-performance-container">
        <h3>Day of Week Performance</h3>
        <p className="section-subtitle">What % of total opens happened on each day of the week</p>
        <div className="day-bars">
          {days.map(day => {
            const data = heatmapData.day_of_week[day];
            if (!data) return null;
            const percentage = (data.open_rate / maxRate) * 100;
            return (
              <div key={day} className="day-bar-item">
                <div className="day-name">{day}</div>
                <div className="day-bar-wrapper">
                  <div className="day-bar" style={{ width: `${percentage}%` }}>
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

  const renderTimeToOpen = () => {
    if (!heatmapData?.time_to_open) return null;
    const { buckets } = heatmapData.time_to_open;
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
            <div className="insight-value">{heatmapData.time_to_open.median}</div>
            <div className="insight-label">Median Time to Open</div>
          </div>
          <div className="insight-card">
            <div className="insight-value">{heatmapData.time_to_open.peak_window}</div>
            <div className="insight-label">Peak Engagement Window</div>
          </div>
          <div className="insight-card">
            <div className="insight-value">{heatmapData.time_to_open.percent_24h}%</div>
            <div className="insight-label">Opens Within 24 Hours</div>
          </div>
        </div>
      </div>
    );
  };

  if (campaignsLoading) {
    return (
      <div className="timing-intelligence">
        <div className="loading-container">
          <div className="spinner">
            <div></div><div></div><div></div><div></div><div></div><div></div>
          </div>
          <p>Loading timing data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="timing-intelligence">
      <div className="section-header-bar">
        <h3>Timing Intelligence</h3>
        <div className="section-header-stats">
          {overview && (
            <>
              <div className="stat-badge">{overview.totalCampaigns} Campaigns</div>
              <div className="stat-badge">{overview.avgUniqueOpenRate}% Avg Open Rate</div>
              <div className="stat-badge">{overview.medianDisplay} Median Open</div>
            </>
          )}
        </div>
        {onClearCache && (
          <button className="clear-cache-button" onClick={onClearCache} title="Clear cached data and reload">Clear</button>
        )}
      </div>

      {overview && (
        <>
          <div className="ti-overview-grid">
            {renderDayOfWeekPerformance()}
            {renderAutoInsights()}
          </div>
          {renderMarketVelocity()}
        </>
      )}

      {/* DISABLED - queries not verified yet
      {!heatmapData && !heatmapLoading && (
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
              <button type="button" className="selector-button" onClick={() => setShowCampaignSelector(true)}>
                {selectedCampaigns.length === 0 ? 'Select Campaigns' : `${selectedCampaigns.length} Campaign${selectedCampaigns.length !== 1 ? 's' : ''} Selected`}
              </button>
            </div>
            <div className="filter-group">
              <label>Filter by Specialty</label>
              <button type="button" className="selector-button" onClick={() => setShowSpecialtySelector(true)}>
                {selectedSpecialties.length === 0 ? 'Select Specialties' : `${selectedSpecialties.length} Specialt${selectedSpecialties.length !== 1 ? 'ies' : 'y'} Selected`}
              </button>
            </div>
            <div className="filter-group ti-generate-group">
              <label>&nbsp;</label>
              <button className="ti-generate-btn" onClick={fetchHeatmapData} disabled={heatmapLoading}>
                {heatmapLoading ? 'Loading...' : 'Generate Analysis'}
              </button>
            </div>
          </div>
        </div>
      )}

      {heatmapLoading && (
        <div className="loading-container" style={{ minHeight: '200px' }}>
          <div className="spinner">
            <div></div><div></div><div></div><div></div><div></div><div></div>
          </div>
          <p>Running full timing analysis...</p>
        </div>
      )}

      {heatmapData && !heatmapLoading && (
        <div className="timing-content">
          {renderHeatmap()}
          {renderDayBars()}
          {renderTimeToOpen()}
        </div>
      )}

      {showSpecialtySelector && (
        <div className="ti-modal-overlay" onClick={() => setShowSpecialtySelector(false)}>
          <div className="ti-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="ti-modal-header">
              <h2>Select Specialties</h2>
              <button className="ti-modal-close" onClick={() => setShowSpecialtySelector(false)}>×</button>
            </div>
            <div className="ti-modal-search">
              <input type="text" placeholder="Search specialties" value={specialtySearchTerm} onChange={(e) => setSpecialtySearchTerm(e.target.value)} className="ti-search-input" />
            </div>
            <div className="ti-modal-actions">
              <button type="button" onClick={handleSelectAllSpecialties} className="ti-action-button select-all">Select All</button>
              <button type="button" onClick={handleClearAllSpecialties} className="ti-action-button clear-all">Clear All</button>
              <div className="ti-selection-count">{selectedSpecialties.length} selected</div>
            </div>
            <div className="ti-modal-list">
              {specialtiesLoading ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-secondary, #b8b8b8)' }}>
                  <div style={{ width: '24px', height: '24px', border: '2px solid #333', borderTopColor: '#0ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }}></div>
                  <p style={{ fontSize: '13px', margin: 0 }}>Loading specialties...</p>
                </div>
              ) : filteredSpecialties.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary, #b8b8b8)' }}>
                  <p>No matching specialties.</p>
                </div>
              ) : (
                filteredSpecialties.map(specialty => {
                  const isSelected = selectedSpecialties.includes(specialty);
                  return (
                    <div key={specialty} className={`ti-modal-list-item ${isSelected ? 'selected' : ''}`} onClick={() => handleSpecialtyToggle(specialty)}>
                      <div className="ti-item-checkbox">{isSelected && <span className="checkmark">✓</span>}</div>
                      <div className="ti-item-info"><div className="ti-item-name">{specialty}</div></div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="ti-modal-footer">
              <button type="button" onClick={() => setShowSpecialtySelector(false)} className="ti-done-button">Done</button>
            </div>
          </div>
        </div>
      )}

      {showCampaignSelector && (
        <div className="ti-modal-overlay" onClick={() => setShowCampaignSelector(false)}>
          <div className="ti-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="ti-modal-header">
              <h2>Select Campaigns</h2>
              <button className="ti-modal-close" onClick={() => setShowCampaignSelector(false)}>×</button>
            </div>
            <div className="ti-modal-search">
              <input type="text" placeholder="Search campaigns" value={campaignSearchTerm} onChange={(e) => setCampaignSearchTerm(e.target.value)} className="ti-search-input" />
            </div>
            <div className="ti-modal-actions">
              <button type="button" onClick={handleSelectAllCampaigns} className="ti-action-button select-all">Select All</button>
              <button type="button" onClick={handleClearAllCampaigns} className="ti-action-button clear-all">Clear All</button>
              <div className="ti-selection-count">{selectedCampaigns.length} selected</div>
            </div>
            <div className="ti-modal-list">
              {[...filteredCampaigns].sort((a, b) => new Date(b.send_date) - new Date(a.send_date)).map(campaign => {
                const isSelected = selectedCampaigns.includes(campaign.campaign_name);
                return (
                  <div key={campaign.campaign_name} className={`ti-modal-list-item ${isSelected ? 'selected' : ''}`} onClick={() => handleCampaignToggle(campaign)}>
                    <div className="ti-item-checkbox">{isSelected && <span className="checkmark">✓</span>}</div>
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
              <button type="button" onClick={() => setShowCampaignSelector(false)} className="ti-done-button">Done</button>
            </div>
          </div>
        </div>
      )}
      */}
    </div>
  );
};

export default TimingIntelligence;