import React, { useState, useEffect, useMemo } from 'react';
import '../../styles/GeographicRates.css';
import '../../styles/SectionHeaders.css';
import { API_BASE_URL } from '../../config/api';
import { matchesSearchTerm } from '../../utils/searchUtils';
import { stripAbGroup } from '../../utils/campaignClassifier';
import USStateMap from './USStateMap';

const METADATA_BLOB_URL = "https://emaildash.blob.core.windows.net/json-data/completed_campaign_metadata.json?sp=r&st=2025-09-03T19:53:53Z&se=2027-09-29T04:08:53Z&spr=https&sv=2024-11-04&sr=b&sig=JWxxARzWg4FN%2FhGa17O3RGffl%2BVyJ%2FkE3npL9Iws%2FIs%3D";

const REGION_ORDER = ['West', 'Southwest', 'Midwest', 'Southeast', 'Northeast'];

const REGION_PATHS = {
  West:      "M 40,28 L 155,22 L 155,70 L 155,135 L 155,210 L 95,230 L 40,195 L 25,140 L 20,80 Z",
  Southwest: "M 155,135 L 305,135 L 340,230 L 245,225 L 175,240 L 95,230 L 155,210 Z",
  Midwest:   "M 155,22 L 305,18 L 370,16 L 370,75 L 305,135 L 155,135 L 155,70 Z",
  Southeast: "M 305,135 L 370,75 L 448,65 L 448,130 L 435,195 L 340,230 Z",
  Northeast: "M 370,16 L 448,20 L 448,65 L 370,75 Z"
};

const REGION_LABEL_POS = {
  West:      { x: 90, y: 125 },
  Southwest: { x: 220, y: 185 },
  Midwest:   { x: 260, y: 78 },
  Southeast: { x: 385, y: 155 },
  Northeast: { x: 415, y: 46 }
};

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM',
  'NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA',
  'WV','WI','WY'
];

const processMetadataGeo = (rawData) => {
  const groups = {};
  rawData.forEach(item => {
    const key = stripAbGroup(item.base_campaign_name || item.campaign_name || '');
    if (!key) return;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  const regionTotals = {};
  let totalDelivered = 0;
  let totalOpens = 0;
  let campaignsWithGeo = 0;

  Object.values(groups).forEach(deployments => {
    const deployment1 = deployments.find(d =>
      d.campaign_name && /deployment\s*#?\s*1\s*$/i.test(d.campaign_name)
    ) || deployments[0];

    if (!deployment1.geographic_breakdown) return;
    campaignsWithGeo++;

    const regions = Object.keys(deployment1.geographic_breakdown);
    regions.forEach(regionKey => {
      if (regionKey.toLowerCase() === 'unknown') return;
      const name = regionKey.charAt(0).toUpperCase() + regionKey.slice(1).toLowerCase();

      if (!regionTotals[name]) {
        regionTotals[name] = { delivered: 0, opens: 0 };
      }

      const d1Delivered = deployment1.geographic_breakdown[regionKey]?.delivered || 0;
      const allOpens = deployments.reduce((sum, d) =>
        sum + (d.geographic_breakdown?.[regionKey]?.opens || 0), 0);

      regionTotals[name].delivered += d1Delivered;
      regionTotals[name].opens += allOpens;
      totalDelivered += d1Delivered;
      totalOpens += allOpens;
    });
  });

  const overallOpenRate = totalDelivered > 0
    ? Math.min((totalOpens / totalDelivered) * 100, 100) : 0;

  const regions = Object.entries(regionTotals)
    .map(([region, d]) => ({
      region,
      delivered: d.delivered,
      opens: d.opens,
      openRate: d.delivered > 0 ? Math.min((d.opens / d.delivered) * 100, 100) : 0,
      audiencePct: totalDelivered > 0 ? (d.delivered / totalDelivered) * 100 : 0
    }));

  return { regions, totalDelivered, campaignsWithGeo, overallOpenRate };
};

const INITIAL_SHOW = 10;
const LOAD_MORE = 10;

const METRIC_LABELS = {
  unique_open_rate: 'Unique Open Rate',
  total_open_rate: 'Total Open Rate',
  unique_click_rate: 'Unique Click Rate',
  total_click_rate: 'Total Click Rate'
};

const GeographicRates = ({ searchTerm = '' }) => {
  const [snapshot, setSnapshot] = useState(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [mapColorBy, setMapColorBy] = useState('openRate');
  const [hoveredRegion, setHoveredRegion] = useState(null);

  const [generateLevel, setGenerateLevel] = useState('state');
  const [generateForState, setGenerateForState] = useState('');

  const [stateData, setStateData] = useState(null);
  const [stateLoading, setStateLoading] = useState(false);
  const [stateError, setStateError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('unique_open_rate');
  const [stateVisible, setStateVisible] = useState(INITIAL_SHOW);

  const [zipData, setZipData] = useState(null);
  const [zipLoading, setZipLoading] = useState(false);
  const [zipState, setZipState] = useState(null);
  const [zipVisible, setZipVisible] = useState(INITIAL_SHOW);

  const [directZipData, setDirectZipData] = useState(null);
  const [directZipLoading, setDirectZipLoading] = useState(false);
  const [directZipState, setDirectZipState] = useState(null);
  const [directZipVisible, setDirectZipVisible] = useState(INITIAL_SHOW);

  useEffect(() => {
    fetchSnapshot();
  }, []);

  const fetchSnapshot = async () => {
    setSnapshotLoading(true);
    try {
      const response = await fetch(`${METADATA_BLOB_URL}&_t=${Date.now()}`);
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

  const fetchStateData = async () => {
    setStateLoading(true);
    setStateError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/geographic-rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const json = await response.json();
      if (json.error) throw new Error(json.error);
      setStateData(json);
    } catch (err) {
      setStateError('Failed to load state-level data. Try again.');
    } finally {
      setStateLoading(false);
    }
  };

  const fetchZipData = async (stateAbbrev) => {
    setZipLoading(true);
    setZipState(stateAbbrev);
    setZipData(null);
    setZipVisible(INITIAL_SHOW);
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/geographic-rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 'zipcode', state: stateAbbrev })
      });
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const json = await response.json();
      if (json.error) throw new Error(json.error);
      setZipData(json);
    } catch (err) {
      setZipData(null);
    } finally {
      setZipLoading(false);
    }
  };

  const fetchDirectZipData = async (stateAbbrev) => {
    setDirectZipLoading(true);
    setDirectZipState(stateAbbrev);
    setDirectZipData(null);
    setDirectZipVisible(INITIAL_SHOW);
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics/geographic-rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 'zipcode', state: stateAbbrev })
      });
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const json = await response.json();
      if (json.error) throw new Error(json.error);
      setDirectZipData(json);
    } catch (err) {
      setDirectZipData(null);
    } finally {
      setDirectZipLoading(false);
    }
  };

  const handleGenerate = () => {
    if (generateLevel === 'state') {
      fetchStateData();
    } else if (generateLevel === 'zipcode' && generateForState) {
      fetchDirectZipData(generateForState);
    }
  };

  const handleReset = () => {
    setStateData(null);
    setStateError(null);
    setStateVisible(INITIAL_SHOW);
    setZipData(null);
    setZipState(null);
    setZipVisible(INITIAL_SHOW);
    setDirectZipData(null);
    setDirectZipState(null);
    setDirectZipVisible(INITIAL_SHOW);
  };

  const orderedRegions = useMemo(() => {
    if (!snapshot?.regions) return [];
    const regionMap = {};
    snapshot.regions.forEach(r => { regionMap[r.region] = r; });
    return REGION_ORDER.map(name => regionMap[name]).filter(Boolean);
  }, [snapshot]);

  const getRegionColor = (regionName) => {
    if (!snapshot?.regions) return 'rgba(255,255,255,0.06)';
    const r = snapshot.regions.find(reg => reg.region === regionName);
    if (!r) return 'rgba(255,255,255,0.06)';

    const allValues = snapshot.regions.map(reg => mapColorBy === 'openRate' ? reg.openRate : reg.audiencePct);
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const val = mapColorBy === 'openRate' ? r.openRate : r.audiencePct;
    const range = max - min;
    const norm = range > 0 ? (val - min) / range : 0.5;

    if (mapColorBy === 'openRate') {
      const g = Math.round(120 + norm * 135);
      const b = Math.round(80 + norm * 80);
      return `rgb(${Math.round(20 - norm * 10)}, ${g}, ${b})`;
    } else {
      const intensity = 0.15 + norm * 0.65;
      return `rgba(0, 255, 255, ${intensity})`;
    }
  };

  const getRegionTooltip = (regionName) => {
    if (!snapshot?.regions) return null;
    return snapshot.regions.find(r => r.region === regionName);
  };

  const summary = stateData?.summary || {};
  const nationalRate = useMemo(() => {
    if (!summary) return 0;
    return summary[`national_${selectedMetric}`] || 0;
  }, [summary, selectedMetric]);

  const metricLabel = METRIC_LABELS[selectedMetric] || 'Unique Open Rate';

  const mapData = useMemo(() => {
    if (!stateData?.state_rates) return {};
    const mapped = {};
    stateData.state_rates.forEach(state => {
      mapped[state.state_name] = {
        value: state[selectedMetric] || 0,
        label: `${state[selectedMetric] || 0}%`,
        state_abbrev: state.state_abbrev,
        total_sent: state.total_sent,
        unique_open_rate: state.unique_open_rate,
        total_open_rate: state.total_open_rate,
        unique_click_rate: state.unique_click_rate,
        total_click_rate: state.total_click_rate
      };
    });
    return mapped;
  }, [stateData, selectedMetric]);

  const sortedStates = useMemo(() => {
    if (!stateData?.state_rates) return [];
    let states = [...stateData.state_rates];
    if (searchTerm.trim()) {
      states = states.filter(s =>
        matchesSearchTerm(s.state_name, searchTerm) || matchesSearchTerm(s.state_abbrev, searchTerm)
      );
    }
    return states.sort((a, b) => (b[selectedMetric] || 0) - (a[selectedMetric] || 0));
  }, [stateData, searchTerm, selectedMetric]);

  const visibleStates = sortedStates.slice(0, stateVisible);
  const statesRemaining = sortedStates.length - stateVisible;
  const getStateVal = (state) => state[selectedMetric] || 0;
  const getStateDelta = (state) => getStateVal(state) - nationalRate;

  const sortedDirectZips = useMemo(() => {
    if (!directZipData?.zip_rates) return [];
    return [...directZipData.zip_rates].sort((a, b) => (b[selectedMetric] || 0) - (a[selectedMetric] || 0));
  }, [directZipData, selectedMetric]);

  const visibleDirectZips = sortedDirectZips.slice(0, directZipVisible);
  const directZipsRemaining = sortedDirectZips.length - directZipVisible;

  const isGenerated = stateData || directZipData;

  if (snapshotLoading) {
    return (
      <div className="gr-container">
        <div className="gr-loading">
          <div className="sb-spinner"><div></div><div></div><div></div><div></div><div></div><div></div></div>
          <p>Loading geographic data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gr-container">
      <div className="section-header-bar">
        <h3>Geographic Rates</h3>
        <div className="section-header-stats">
          {snapshot && (
            <>
              <div className="section-header-stat-item">
                <span className="section-header-stat-label">Regions</span>
                <span className="section-header-stat-value">{snapshot.regions.length}</span>
              </div>
              <div className="section-header-stat-item">
                <span className="section-header-stat-label">Total Delivered</span>
                <span className="section-header-stat-value">{snapshot.totalDelivered?.toLocaleString()}</span>
              </div>
              <div className="section-header-stat-item">
                <span className="section-header-stat-label">Avg Open Rate</span>
                <span className="section-header-stat-value">{snapshot.overallOpenRate?.toFixed(1)}%</span>
              </div>
            </>
          )}
        </div>
      </div>

      {orderedRegions.length > 0 && (
        <div className="gr-region-grid">
          {orderedRegions.map(r => {
            const delta = r.openRate - snapshot.overallOpenRate;
            return (
              <div
                className={`gr-region-card ${hoveredRegion === r.region ? 'gr-region-active' : ''}`}
                key={r.region}
                onMouseEnter={() => setHoveredRegion(r.region)}
                onMouseLeave={() => setHoveredRegion(null)}
              >
                <div className="gr-region-name">{r.region}</div>
                <div className="gr-region-rate">{r.openRate.toFixed(1)}%</div>
                <div className={`gr-region-delta ${delta >= 0 ? 'gr-delta-pos' : 'gr-delta-neg'}`}>
                  {delta >= 0 ? '+' : ''}{delta.toFixed(1)}pp vs overall
                </div>
                <div className="gr-region-stats">
                  <span>{r.delivered.toLocaleString()} delivered</span>
                  <span>{r.audiencePct.toFixed(1)}% of audience</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {orderedRegions.length > 0 && (
        <div className="gr-regional-map-wrapper">
          <div className="gr-regional-map-header">
            <div className="anomaly-mode-toggle">
              <button
                className={`mode-toggle-btn ${mapColorBy === 'openRate' ? 'active' : ''}`}
                onClick={() => setMapColorBy('openRate')}
              >Open Rate</button>
              <button
                className={`mode-toggle-btn ${mapColorBy === 'audiencePct' ? 'active' : ''}`}
                onClick={() => setMapColorBy('audiencePct')}
              >Audience %</button>
            </div>
          </div>
          <svg
            viewBox="0 0 470 250"
            className="gr-regional-map-svg"
            xmlns="http://www.w3.org/2000/svg"
          >
            {REGION_ORDER.map(regionName => {
              const isHovered = hoveredRegion === regionName;
              const regionData = getRegionTooltip(regionName);
              const val = regionData
                ? (mapColorBy === 'openRate' ? regionData.openRate.toFixed(1) + '%' : regionData.audiencePct.toFixed(1) + '%')
                : '';
              return (
                <g key={regionName}
                  onMouseEnter={() => setHoveredRegion(regionName)}
                  onMouseLeave={() => setHoveredRegion(null)}
                  style={{ cursor: 'default' }}
                >
                  <path
                    d={REGION_PATHS[regionName]}
                    fill={getRegionColor(regionName)}
                    stroke={isHovered ? '#0ff' : 'rgba(255,255,255,0.15)'}
                    strokeWidth={isHovered ? 2 : 1}
                    style={{ transition: 'fill 0.2s ease, stroke 0.2s ease' }}
                  />
                  <text
                    x={REGION_LABEL_POS[regionName].x}
                    y={REGION_LABEL_POS[regionName].y - 8}
                    textAnchor="middle"
                    className="gr-map-label-name"
                  >
                    {regionName}
                  </text>
                  <text
                    x={REGION_LABEL_POS[regionName].x}
                    y={REGION_LABEL_POS[regionName].y + 10}
                    textAnchor="middle"
                    className="gr-map-label-value"
                  >
                    {val}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {!orderedRegions.length && !snapshotLoading && (
        <div className="gr-empty">No regional data available in campaign metadata.</div>
      )}

      {!isGenerated && !stateLoading && !directZipLoading && (
        <div className="gr-generate-controls">
          <div className="gr-controls-row">
            <div className="gr-control-group">
              <span className="control-label">Level</span>
              <div className="anomaly-mode-toggle">
                <button className={`mode-toggle-btn ${generateLevel === 'state' ? 'active' : ''}`} onClick={() => setGenerateLevel('state')}>State</button>
                <button className={`mode-toggle-btn ${generateLevel === 'zipcode' ? 'active' : ''}`} onClick={() => setGenerateLevel('zipcode')}>Zipcode</button>
              </div>
            </div>
            {generateLevel === 'zipcode' && (
              <div className="gr-control-group">
                <span className="control-label">State</span>
                <select
                  className="gr-state-select"
                  value={generateForState}
                  onChange={e => setGenerateForState(e.target.value)}
                >
                  <option value="">Select state...</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div className="gr-control-group">
              <span className="control-label">Metric</span>
              <div className="anomaly-mode-toggle">
                <button className={`mode-toggle-btn ${selectedMetric === 'unique_open_rate' ? 'active' : ''}`} onClick={() => setSelectedMetric('unique_open_rate')}>Unique Open Rate</button>
                <button className={`mode-toggle-btn ${selectedMetric === 'total_open_rate' ? 'active' : ''}`} onClick={() => setSelectedMetric('total_open_rate')}>Total Open Rate</button>
                <button className={`mode-toggle-btn ${selectedMetric === 'unique_click_rate' ? 'active' : ''}`} onClick={() => setSelectedMetric('unique_click_rate')}>Unique Click Rate</button>
                <button className={`mode-toggle-btn ${selectedMetric === 'total_click_rate' ? 'active' : ''}`} onClick={() => setSelectedMetric('total_click_rate')}>Total Click Rate</button>
              </div>
            </div>
            <button
              className="gr-generate-btn"
              onClick={handleGenerate}
              disabled={generateLevel === 'zipcode' && !generateForState}
            >
              Generate Map
            </button>
          </div>
        </div>
      )}

      {(stateLoading || directZipLoading) && (
        <div className="gr-loading">
          <div className="sb-spinner"><div></div><div></div><div></div><div></div><div></div><div></div></div>
          <p>{stateLoading ? 'Calculating state-by-state rates...' : `Loading zip codes for ${directZipState}...`}</p>
        </div>
      )}

      {stateError && <div className="gr-empty">{stateError}</div>}

      {stateData && !stateLoading && (
        <>
          <div className="section-header-bar" style={{ marginTop: '16px' }}>
            <h3>State Analysis</h3>
            <div className="section-header-stats">
              <div className="anomaly-controls-inline">
                <span className="control-label">Metric</span>
                <div className="anomaly-mode-toggle">
                  <button className={`mode-toggle-btn ${selectedMetric === 'unique_open_rate' ? 'active' : ''}`} onClick={() => setSelectedMetric('unique_open_rate')}>Unique Open</button>
                  <button className={`mode-toggle-btn ${selectedMetric === 'total_open_rate' ? 'active' : ''}`} onClick={() => setSelectedMetric('total_open_rate')}>Total Open</button>
                  <button className={`mode-toggle-btn ${selectedMetric === 'unique_click_rate' ? 'active' : ''}`} onClick={() => setSelectedMetric('unique_click_rate')}>Unique Click</button>
                  <button className={`mode-toggle-btn ${selectedMetric === 'total_click_rate' ? 'active' : ''}`} onClick={() => setSelectedMetric('total_click_rate')}>Total Click</button>
                </div>
              </div>
              <div className="section-header-stat-item">
                <span className="section-header-stat-label">National {metricLabel}</span>
                <span className="section-header-stat-value">{nationalRate}%</span>
              </div>
              <button className="gr-reset-btn" onClick={handleReset}>Reset</button>
            </div>
          </div>

          <div className="gr-map-container">
            <USStateMap
              data={mapData}
              colorScale="opportunity"
              title={`${metricLabel} by State`}
              subtitle={`National avg: ${nationalRate}%`}
              tooltipContent={(stateName, stateInfo) => stateInfo ? (
                <div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>Sent: {stateInfo.total_sent?.toLocaleString()}</div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>Unique Open: {stateInfo.unique_open_rate}%</div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>Total Open: {stateInfo.total_open_rate}%</div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>Unique Click: {stateInfo.unique_click_rate}%</div>
                  <div style={{ fontSize: '12px', color: '#aaa' }}>Total Click: {stateInfo.total_click_rate}%</div>
                </div>
              ) : null}
            />
            <div className="gr-legend">
              <span>Low</span>
              <div className="gr-legend-gradient"></div>
              <span>High</span>
            </div>
          </div>

          <div className="gr-states-header">
            <h4>State Rankings — {metricLabel}</h4>
            {stateVisible > INITIAL_SHOW && (
              <button className="gr-collapse-btn" onClick={() => setStateVisible(INITIAL_SHOW)}>
                Collapse
              </button>
            )}
          </div>

          <div className="gr-state-cards">
            {visibleStates.map((state, idx) => {
              const val = getStateVal(state);
              const delta = getStateDelta(state);
              return (
                <div
                  className={`gr-state-card gr-state-clickable ${zipState === state.state_abbrev ? 'gr-state-selected' : ''}`}
                  key={state.state_abbrev}
                  onClick={() => fetchZipData(state.state_abbrev)}
                >
                  <div className="gr-state-rank">#{idx + 1}</div>
                  <div className="gr-state-name">{state.state_name}</div>
                  <div className="gr-state-abbrev">{state.state_abbrev}</div>
                  <div className="gr-state-rate">{val}%</div>
                  <div className={`gr-state-delta ${delta >= 0 ? 'gr-delta-pos' : 'gr-delta-neg'}`}>
                    {delta >= 0 ? '+' : ''}{delta.toFixed(1)}pp
                  </div>
                  <div className="gr-state-volume">{state.total_sent?.toLocaleString()} sent</div>
                </div>
              );
            })}
          </div>

          {statesRemaining > 0 && (
            <button className="gr-load-more" onClick={() => setStateVisible(prev => prev + LOAD_MORE)}>
              Show {Math.min(statesRemaining, LOAD_MORE)} more states
            </button>
          )}

          {zipState && (
            <div style={{ marginTop: '16px' }}>
              <div className="gr-states-header">
                <h4>Zip Codes — {zipState}</h4>
                <button className="gr-collapse-btn" onClick={() => { setZipState(null); setZipData(null); }}>
                  Close
                </button>
              </div>

              {zipLoading && (
                <div className="gr-loading" style={{ minHeight: '120px' }}>
                  <div className="sb-spinner"><div></div><div></div><div></div><div></div><div></div><div></div></div>
                  <p>Loading zip codes...</p>
                </div>
              )}

              {zipData && zipData.zip_rates && (
                <>
                  <div className="gr-state-cards">
                    {zipData.zip_rates.slice(0, zipVisible).map((z, idx) => (
                      <div className="gr-state-card" key={z.zipcode + z.city}>
                        <div className="gr-state-rank">#{idx + 1}</div>
                        <div className="gr-state-name">{z.city || 'Unknown'}</div>
                        <div className="gr-state-abbrev">{z.zipcode}</div>
                        <div className="gr-state-rate">{z[selectedMetric] || 0}%</div>
                        <div className="gr-state-volume">{z.total_sent?.toLocaleString()} sent</div>
                      </div>
                    ))}
                  </div>
                  {zipData.zip_rates.length > zipVisible && (
                    <button className="gr-load-more" onClick={() => setZipVisible(prev => prev + LOAD_MORE)}>
                      Show {Math.min(zipData.zip_rates.length - zipVisible, LOAD_MORE)} more
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {directZipData && !directZipLoading && (
        <>
          <div className="section-header-bar" style={{ marginTop: '16px' }}>
            <h3>Zipcode Analysis — {directZipState}</h3>
            <div className="section-header-stats">
              <div className="anomaly-controls-inline">
                <span className="control-label">Metric</span>
                <div className="anomaly-mode-toggle">
                  <button className={`mode-toggle-btn ${selectedMetric === 'unique_open_rate' ? 'active' : ''}`} onClick={() => setSelectedMetric('unique_open_rate')}>Unique Open</button>
                  <button className={`mode-toggle-btn ${selectedMetric === 'total_open_rate' ? 'active' : ''}`} onClick={() => setSelectedMetric('total_open_rate')}>Total Open</button>
                  <button className={`mode-toggle-btn ${selectedMetric === 'unique_click_rate' ? 'active' : ''}`} onClick={() => setSelectedMetric('unique_click_rate')}>Unique Click</button>
                  <button className={`mode-toggle-btn ${selectedMetric === 'total_click_rate' ? 'active' : ''}`} onClick={() => setSelectedMetric('total_click_rate')}>Total Click</button>
                </div>
              </div>
              <div className="section-header-stat-item">
                <span className="section-header-stat-label">Zip Codes</span>
                <span className="section-header-stat-value">{sortedDirectZips.length}</span>
              </div>
              <button className="gr-reset-btn" onClick={handleReset}>Reset</button>
            </div>
          </div>

          <div className="gr-state-cards">
            {visibleDirectZips.map((z, idx) => (
              <div className="gr-state-card" key={z.zipcode + z.city}>
                <div className="gr-state-rank">#{idx + 1}</div>
                <div className="gr-state-name">{z.city || 'Unknown'}</div>
                <div className="gr-state-abbrev">{z.zipcode}</div>
                <div className="gr-state-rate">{z[selectedMetric] || 0}%</div>
                <div className="gr-state-volume">{z.total_sent?.toLocaleString()} sent</div>
              </div>
            ))}
          </div>

          {directZipsRemaining > 0 && (
            <button className="gr-load-more" onClick={() => setDirectZipVisible(prev => prev + LOAD_MORE)}>
              Show {Math.min(directZipsRemaining, LOAD_MORE)} more
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default GeographicRates;