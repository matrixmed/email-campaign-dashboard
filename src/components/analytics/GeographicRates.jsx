import React, { useState, useEffect, useMemo } from 'react';
import '../../styles/GeographicRates.css';
import '../../styles/SectionHeaders.css';
import { API_BASE_URL } from '../../config/api';
import { matchesSearchTerm } from '../../utils/searchUtils';
import { stripAbGroup } from '../../utils/campaignClassifier';
import USStateMap from './USStateMap';

const METADATA_BLOB_URL = "https://emaildash.blob.core.windows.net/json-data/completed_campaign_metadata.json?sp=r&st=2025-09-03T19:53:53Z&se=2027-09-29T04:08:53Z&spr=https&sv=2024-11-04&sr=b&sig=JWxxARzWg4FN%2FhGa17O3RGffl%2BVyJ%2FkE3npL9Iws%2FIs%3D";

const REGION_ICONS = {
  'Northeast': '🏙️',
  'Southeast': '🌴',
  'Midwest': '🌾',
  'Southwest': '🏜️',
  'West': '🏔️'
};

const processMetadataGeo = (rawData) => {
  const groups = {};
  rawData.forEach(item => {
    const key = stripAbGroup(item.base_campaign_name || item.campaign_name || '');
    if (!key) return;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  const regionTotals = {};
  let totalVolume = 0;
  let campaignsWithGeo = 0;

  Object.values(groups).forEach(deployments => {
    deployments.forEach(d => {
      if (!d.geographic_distribution) return;
      campaignsWithGeo++;
      Object.entries(d.geographic_distribution).forEach(([region, data]) => {
        const name = region.charAt(0).toUpperCase() + region.slice(1);
        if (!regionTotals[name]) {
          regionTotals[name] = { volume: 0, engagementSum: 0, engagementCount: 0 };
        }
        const vol = data.volume || 0;
        regionTotals[name].volume += vol;
        totalVolume += vol;
        if (data.engagement_rate != null) {
          regionTotals[name].engagementSum += data.engagement_rate;
          regionTotals[name].engagementCount += 1;
        }
      });
    });
  });

  const regions = Object.entries(regionTotals)
    .map(([region, d]) => ({
      region,
      volume: d.volume,
      percentage: totalVolume > 0 ? Math.round((d.volume / totalVolume) * 1000) / 10 : 0,
      avgEngagement: d.engagementCount > 0 ? Math.round((d.engagementSum / d.engagementCount) * 10) / 10 : 0
    }))
    .sort((a, b) => b.volume - a.volume);

  return { regions, totalVolume, campaignsWithGeo };
};

const GeographicRates = ({ searchTerm = '' }) => {
  const [snapshot, setSnapshot] = useState(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('open_rate');
  const [sortBy, setSortBy] = useState('open_rate');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    fetchSnapshot();
  }, []);

  const fetchSnapshot = async () => {
    setSnapshotLoading(true);
    try {
      const response = await fetch(METADATA_BLOB_URL);
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const rawData = await response.json();
      const processed = processMetadataGeo(rawData);
      setSnapshot(processed);
    } catch (err) {
      console.error('Snapshot fetch error:', err);
    } finally {
      setSnapshotLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/geographic-rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const json = await response.json();
      setData(json);
    } catch (err) {
      setError('Failed to load geographic rates data.');
    } finally {
      setLoading(false);
    }
  };

  const mapData = useMemo(() => {
    if (!data?.state_rates) return {};
    const mapped = {};
    data.state_rates.forEach(state => {
      mapped[state.state_name] = {
        value: state[selectedMetric] || 0,
        label: `${state[selectedMetric]}%`,
        state_abbrev: state.state_abbrev,
        total_sent: state.total_sent,
        open_rate: state.open_rate,
        click_rate: state.click_rate,
        click_to_open_rate: state.click_to_open_rate
      };
    });
    return mapped;
  }, [data, selectedMetric]);

  const nationalAvg = useMemo(() => {
    if (!data?.summary) return 0;
    if (selectedMetric === 'open_rate') return data.summary.national_open_rate;
    if (selectedMetric === 'click_rate') return data.summary.national_click_rate;
    return data.summary.national_click_to_open_rate;
  }, [data, selectedMetric]);

  const filteredStates = useMemo(() => {
    if (!data?.state_rates) return [];
    let states = data.state_rates;
    if (searchTerm.trim()) {
      states = states.filter(s =>
        matchesSearchTerm(s.state_name, searchTerm) || matchesSearchTerm(s.state_abbrev, searchTerm)
      );
    }
    return [...states].sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [data, searchTerm, sortBy, sortDir]);

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  const metricLabel = selectedMetric === 'open_rate' ? 'Open Rate' : selectedMetric === 'click_rate' ? 'Click Rate' : 'Click-to-Open';

  const summary = data?.summary || {};

  return (
    <div className="gr-container">
      <div className="section-header-bar">
        <h3>Geographic Rates</h3>
        {data && (
          <div className="anomaly-mode-toggle">
            <span className="control-label">Metric</span>
            <button className={`mode-toggle-btn ${selectedMetric === 'open_rate' ? 'active' : ''}`} onClick={() => setSelectedMetric('open_rate')}>Open Rate</button>
            <button className={`mode-toggle-btn ${selectedMetric === 'click_rate' ? 'active' : ''}`} onClick={() => setSelectedMetric('click_rate')}>Click Rate</button>
            <button className={`mode-toggle-btn ${selectedMetric === 'click_to_open_rate' ? 'active' : ''}`} onClick={() => setSelectedMetric('click_to_open_rate')}>Click-to-Open</button>
          </div>
        )}
        <div className="section-header-stats">
          {data ? (
            <>
              <div className="section-header-stat-item">
                <span className="section-header-stat-label">States</span>
                <span className="section-header-stat-value">{summary.total_states}</span>
              </div>
              <div className="section-header-stat-item">
                <span className="section-header-stat-label">National Open Rate</span>
                <span className="section-header-stat-value">{summary.national_open_rate}%</span>
              </div>
              <div className="section-header-stat-item">
                <span className="section-header-stat-label">National Click Rate</span>
                <span className="section-header-stat-value">{summary.national_click_rate}%</span>
              </div>
            </>
          ) : snapshot ? (
            <>
              <div className="section-header-stat-item">
                <span className="section-header-stat-label">Regions</span>
                <span className="section-header-stat-value">{snapshot.regions.length}</span>
              </div>
              <div className="section-header-stat-item">
                <span className="section-header-stat-label">Total Audience</span>
                <span className="section-header-stat-value">{snapshot.totalVolume?.toLocaleString()}</span>
              </div>
              <div className="section-header-stat-item">
                <span className="section-header-stat-label">Campaigns</span>
                <span className="section-header-stat-value">{snapshot.campaignsWithGeo}</span>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {!data && (
        <>
          {snapshotLoading ? (
            <div className="gr-snapshot-loading">
              <div className="sb-spinner"><div></div><div></div><div></div><div></div><div></div><div></div></div>
              <p>Loading geographic snapshot...</p>
            </div>
          ) : snapshot ? (
            <div className="gr-snapshot">
              <div className="gr-region-grid">
                {snapshot.regions.map(r => (
                  <div key={r.region} className="gr-region-card">
                    <div className="gr-region-icon">{REGION_ICONS[r.region] || '📍'}</div>
                    <div className="gr-region-details">
                      <div className="gr-region-name">{r.region}</div>
                      <div className="gr-region-audience">{r.volume.toLocaleString()}</div>
                      <div className="gr-region-meta">{r.percentage}% of audience &middot; {r.avgEngagement}% avg engagement</div>
                    </div>
                    <div className="gr-region-bar-bg">
                      <div className="gr-region-bar-fill" style={{ width: `${r.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="gr-generate-prompt">
                <div className="gr-generate-info">
                  <p>Generate the full state-by-state map and rate table for open rates, click rates, and click-to-open rates.</p>
                </div>
                <button className="gr-generate-btn" onClick={fetchData} disabled={loading}>
                  {loading ? 'Generating...' : 'Generate Map & Rates'}
                </button>
              </div>
            </div>
          ) : (
            <div className="gr-empty">Failed to load geographic snapshot.</div>
          )}

          {loading && (
            <div className="gr-loading-overlay">
              <div className="sb-spinner"><div></div><div></div><div></div><div></div><div></div><div></div></div>
              <p>Calculating state-by-state rates...</p>
            </div>
          )}
        </>
      )}

      {error && <div className="gr-empty">{error}</div>}

      {data && !loading && (
        <>
          <div className="gr-map-container">
            <USStateMap
              data={mapData}
              colorScale="opportunity"
              title={`${metricLabel} by State`}
              subtitle={`National avg: ${nationalAvg}%`}
              tooltipContent={(stateData) => stateData ? (
                <div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>Sent: {stateData.total_sent?.toLocaleString()}</div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>Open: {stateData.open_rate}%</div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>Click: {stateData.click_rate}%</div>
                </div>
              ) : null}
            />
            <div className="gr-legend">
              <span>Below Avg</span>
              <div className="gr-legend-gradient"></div>
              <span>Above Avg</span>
            </div>
          </div>

          <div className="section-header-bar">
            <h3>State Details</h3>
            <div className="section-header-stats">
              <div className="section-header-stat-item">
                <span className="section-header-stat-label">Showing</span>
                <span className="section-header-stat-value">{filteredStates.length} states</span>
              </div>
            </div>
          </div>

          <div className="gr-table-section">
            <table className="gr-table">
              <thead>
                <tr>
                  <th className={sortBy === 'state_name' ? 'sorted' : ''} onClick={() => handleSort('state_name')}>State</th>
                  <th className={sortBy === 'total_sent' ? 'sorted' : ''} onClick={() => handleSort('total_sent')}>Sent</th>
                  <th className={sortBy === 'open_rate' ? 'sorted' : ''} onClick={() => handleSort('open_rate')}>Open Rate</th>
                  <th className={sortBy === 'click_rate' ? 'sorted' : ''} onClick={() => handleSort('click_rate')}>Click Rate</th>
                  <th className={sortBy === 'click_to_open_rate' ? 'sorted' : ''} onClick={() => handleSort('click_to_open_rate')}>Click-to-Open</th>
                </tr>
              </thead>
              <tbody>
                {filteredStates.map((state, i) => {
                  const openAbove = state.open_rate >= summary.national_open_rate;
                  const clickAbove = state.click_rate >= summary.national_click_rate;
                  return (
                    <tr key={i}>
                      <td>{state.state_name} ({state.state_abbrev})</td>
                      <td>{state.total_sent?.toLocaleString()}</td>
                      <td className={`gr-rate-cell ${openAbove ? 'gr-rate-above' : 'gr-rate-below'}`}>
                        {state.open_rate}%
                        <span className="gr-vs-avg">{openAbove ? '+' : ''}{(state.open_rate - summary.national_open_rate).toFixed(1)}pp</span>
                      </td>
                      <td className={`gr-rate-cell ${clickAbove ? 'gr-rate-above' : 'gr-rate-below'}`}>
                        {state.click_rate}%
                      </td>
                      <td>{state.click_to_open_rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default GeographicRates;