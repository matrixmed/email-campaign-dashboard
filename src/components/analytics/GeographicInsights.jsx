import React, { useState, useEffect, useRef } from 'react';
import '../../styles/GeographicInsights.css';
import { API_BASE_URL } from '../../config/api';
import USStateMap from './USStateMap';
import html2canvas from 'html2canvas';

const GeographicInsights = () => {
  const [loading, setLoading] = useState(true);
  const [mainGeoData, setMainGeoData] = useState(null);
  const [mainDataLoaded, setMainDataLoaded] = useState(false);
  const [customMapData, setCustomMapData] = useState(null);
  const [activeMainTab, setActiveMainTab] = useState('audience-vs-npis');
  const [customMapLoading, setCustomMapLoading] = useState(false);
  const exportRef = useRef(null);
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);
  const [engagementFilter, setEngagementFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [specialties, setSpecialties] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [showSpecialtySelector, setShowSpecialtySelector] = useState(false);
  const [showCampaignSelector, setShowCampaignSelector] = useState(false);
  const [specialtySearchTerm, setSpecialtySearchTerm] = useState('');
  const [campaignSearchTerm, setCampaignSearchTerm] = useState('');
  const [geoViewMode, setGeoViewMode] = useState('state');
  const [mapColorMode, setMapColorMode] = useState('count'); 
  const [customMapGranularity, setCustomMapGranularity] = useState('state');

  const API_BASE = `${API_BASE_URL}/api`;

  useEffect(() => {
    fetchMainGeoData();
    fetchSpecialties();
    fetchCampaigns();
  }, []);

  const handleTabChange = (tab) => {
    setActiveMainTab(tab);
    if (tab !== 'custom-map' && !mainDataLoaded) {
      fetchMainGeoData();
    }
  };

  const fetchMainGeoData = async () => {
    setLoading(true);
    try {
      console.log('[GEO] Fetching main geographic data...');
      const response = await fetch(`${API_BASE}/analytics/geographic-main`);
      const data = await response.json();
      console.log('[GEO] Data received:', data);
      setMainGeoData(data);
      setMainDataLoaded(true);
    } catch (error) {
      console.error('[GEO] Error fetching main geographic data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpecialties = async () => {
    try {
      const url = `${API_BASE}/users/specialties?merge=false`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setSpecialties(data.specialties || []);
      }
    } catch (err) {
      console.error('Error fetching specialties:', err);
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

  const generateCustomMap = async () => {
    setCustomMapLoading(true);
    try {
      const response = await fetch(`${API_BASE}/analytics/geographic-custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialties: selectedSpecialties,
          campaigns: selectedCampaigns,
          engagement_filter: engagementFilter,
          date_range: dateRange,
          granularity: customMapGranularity
        })
      });
      const data = await response.json();
      setCustomMapData(data);
    } catch (error) {
      console.error('Error generating custom map:', error);
    } finally {
      setCustomMapLoading(false);
    }
  };

  const exportMapAsImage = async () => {
    if (!exportRef.current) return;

    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#1c1c1e',
        scale: 2
      });

      const link = document.createElement('a');
      link.download = `geographic-map-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Error exporting map:', error);
    }
  };

  const filteredSpecialties = specialties.filter(spec =>
    spec.toLowerCase().includes(specialtySearchTerm.toLowerCase())
  );

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.campaign_name.toLowerCase().includes(campaignSearchTerm.toLowerCase())
  );

  const prepareAudienceMapData = () => {
    if (!mainGeoData?.state_heatmap) return {};
    const mapData = {};
    Object.entries(mainGeoData.state_heatmap).forEach(([state, data]) => {
      mapData[state] = {
        value: data.count,
        label: `${data.count.toLocaleString()} users`
      };
    });
    return mapData;
  };

  const prepareNPIMapData = () => {
    if (!mainGeoData?.npi_by_state) return {};
    const mapData = {};
    Object.entries(mainGeoData.npi_by_state).forEach(([state, data]) => {
      mapData[state] = {
        value: data.count,
        label: `${data.count.toLocaleString()} NPIs`
      };
    });
    return mapData;
  };

  const preparePenetrationMapData = () => {
    if (!mainGeoData?.penetration) return {};
    const mapData = {};
    Object.entries(mainGeoData.penetration).forEach(([state, data]) => {
      mapData[state] = {
        value: data.penetration_rate,
        label: `${data.penetration_rate}% penetration`
      };
    });
    return mapData;
  };

  const renderCityView = () => {
    if (!mainGeoData?.city_data) {
      return <div className="no-data">No city data available</div>;
    }

    const cityArray = Object.entries(mainGeoData.city_data)
      .map(([city, data]) => ({ city, ...data }))
      .sort((a, b) => b.audience_count - a.audience_count);

    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div style={{ background: 'var(--color-bg-elevated, #222224)', borderRadius: '8px', padding: '24px' }}>
            <h5 style={{ color: '#0ff', marginBottom: '16px', fontFamily: 'Lora, serif' }}>
              Top Cities - Audience
            </h5>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #444' }}>
                  <th style={{ padding: '8px', textAlign: 'left', color: '#aaa', fontSize: '12px' }}>City</th>
                  <th style={{ padding: '8px', textAlign: 'right', color: '#aaa', fontSize: '12px' }}>Count</th>
                  <th style={{ padding: '8px', textAlign: 'right', color: '#aaa', fontSize: '12px' }}>Open Rate</th>
                </tr>
              </thead>
              <tbody>
                {cityArray.slice(0, 20).map((c, idx) => (
                  <tr key={c.city} style={{ borderBottom: '1px solid #333' }}>
                    <td style={{ padding: '6px 8px', color: '#fff', fontSize: '13px' }}>{c.city}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#0ff', fontWeight: 'bold', fontSize: '13px' }}>{c.audience_count.toLocaleString()}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#4caf50', fontSize: '13px' }}>{c.engagement_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background: 'var(--color-bg-elevated, #222224)', borderRadius: '8px', padding: '24px' }}>
            <h5 style={{ color: '#ff8800', marginBottom: '16px', fontFamily: 'Lora, serif' }}>
              City Distribution Summary
            </h5>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}>Total Cities</div>
              <div style={{ color: '#fff', fontSize: '28px', fontWeight: 'bold' }}>{cityArray.length}</div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}>Top City</div>
              <div style={{ color: '#0ff', fontSize: '18px', fontWeight: 'bold' }}>{cityArray[0]?.city || 'N/A'}</div>
              <div style={{ color: '#aaa', fontSize: '12px' }}>{cityArray[0]?.audience_count?.toLocaleString() || 0} users</div>
            </div>
            <div>
              <div style={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}>Highest Engagement City</div>
              {(() => {
                const topEngaged = [...cityArray].filter(c => c.audience_count >= 10).sort((a, b) => b.engagement_rate - a.engagement_rate)[0];
                return (
                  <>
                    <div style={{ color: '#4caf50', fontSize: '18px', fontWeight: 'bold' }}>{topEngaged?.city || 'N/A'}</div>
                    <div style={{ color: '#aaa', fontSize: '12px' }}>{topEngaged?.engagement_rate || 0}% open rate</div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--color-bg-elevated, #222224)', borderRadius: '8px', padding: '24px', maxHeight: '400px', overflowY: 'auto' }}>
          <h5 style={{ color: '#fff', marginBottom: '16px', fontFamily: 'Lora, serif' }}>
            All Cities ({cityArray.length} total)
          </h5>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #444' }}>
                <th style={{ padding: '10px', textAlign: 'left', color: '#aaa' }}>Rank</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#aaa' }}>City</th>
                <th style={{ padding: '10px', textAlign: 'right', color: '#0ff' }}>Audience</th>
                <th style={{ padding: '10px', textAlign: 'right', color: '#4caf50' }}>Engaged</th>
                <th style={{ padding: '10px', textAlign: 'right', color: '#888' }}>Open Rate</th>
              </tr>
            </thead>
            <tbody>
              {cityArray.map((c, idx) => (
                <tr key={c.city} style={{ borderBottom: '1px solid #333', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '8px 10px', color: '#888' }}>{idx + 1}</td>
                  <td style={{ padding: '8px 10px', color: '#fff' }}>{c.city}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0ff', fontWeight: 'bold' }}>{c.audience_count.toLocaleString()}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#4caf50' }}>{c.engaged_count.toLocaleString()}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#888' }}>{c.engagement_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderZipcodeView = () => {
    if (!mainGeoData?.zipcode_data) {
      return <div className="no-data">No zipcode data available</div>;
    }

    const zipcodeArray = Object.entries(mainGeoData.zipcode_data)
      .map(([prefix, data]) => ({ prefix, ...data }))
      .filter(z => z.audience_count > 0 || z.npi_count > 0)
      .sort((a, b) => b.audience_count - a.audience_count);

    const topZipcodes = zipcodeArray.slice(0, 50);

    const maxAudience = Math.max(...zipcodeArray.map(z => z.audience_count));
    const maxNpi = Math.max(...zipcodeArray.map(z => z.npi_count));

    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
          <div style={{ background: 'var(--color-bg-elevated, #222224)', borderRadius: '8px', padding: '24px' }}>
            <h5 style={{ color: '#0ff', marginBottom: '16px', fontFamily: 'Lora, serif' }}>
              Top Zipcode Regions - Audience
            </h5>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
              {topZipcodes.filter(z => z.audience_count > 0).slice(0, 30).map(z => {
                const size = Math.max(30, Math.min(80, (z.audience_count / maxAudience) * 80));
                return (
                  <div
                    key={z.prefix}
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      borderRadius: '50%',
                      background: `rgba(0, 255, 255, ${0.3 + (z.audience_count / maxAudience) * 0.7})`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      border: '1px solid rgba(0, 255, 255, 0.5)'
                    }}
                    title={`${z.prefix}xx: ${z.audience_count.toLocaleString()} users (${z.state})`}
                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                  >
                    <span style={{ fontSize: size > 50 ? '12px' : '10px', fontWeight: 'bold', color: '#fff' }}>{z.prefix}</span>
                    {size > 45 && <span style={{ fontSize: '9px', color: '#ccc' }}>{z.audience_count.toLocaleString()}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ background: 'var(--color-bg-elevated, #222224)', borderRadius: '8px', padding: '24px' }}>
            <h5 style={{ color: '#ff8800', marginBottom: '16px', fontFamily: 'Lora, serif' }}>
              Top Zipcode Regions - All NPIs
            </h5>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
              {zipcodeArray.filter(z => z.npi_count > 0).sort((a, b) => b.npi_count - a.npi_count).slice(0, 30).map(z => {
                const size = Math.max(30, Math.min(80, (z.npi_count / maxNpi) * 80));
                return (
                  <div
                    key={z.prefix}
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      borderRadius: '50%',
                      background: `rgba(255, 136, 0, ${0.3 + (z.npi_count / maxNpi) * 0.7})`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      border: '1px solid rgba(255, 136, 0, 0.5)'
                    }}
                    title={`${z.prefix}xx: ${z.npi_count.toLocaleString()} NPIs (${z.state})`}
                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                  >
                    <span style={{ fontSize: size > 50 ? '12px' : '10px', fontWeight: 'bold', color: '#fff' }}>{z.prefix}</span>
                    {size > 45 && <span style={{ fontSize: '9px', color: '#ccc' }}>{z.npi_count.toLocaleString()}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--color-bg-elevated, #222224)', borderRadius: '8px', padding: '24px' }}>
          <h5 style={{ color: '#fff', marginBottom: '16px', fontFamily: 'Lora, serif' }}>
            Top 50 Zipcode Regions by Audience
          </h5>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #444' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#aaa' }}>Zip Prefix</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#aaa' }}>State</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: '#0ff' }}>Audience</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: '#ff8800' }}>NPIs</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: '#4caf50' }}>Penetration</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: '#888' }}>Engagement</th>
                </tr>
              </thead>
              <tbody>
                {topZipcodes.map((z, idx) => (
                  <tr key={z.prefix} style={{ borderBottom: '1px solid #333', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '10px', color: '#fff', fontWeight: 'bold' }}>{z.prefix}xx</td>
                    <td style={{ padding: '10px', color: '#aaa' }}>{z.state || '-'}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#0ff' }}>{z.audience_count.toLocaleString()}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#ff8800' }}>{z.npi_count.toLocaleString()}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#4caf50' }}>{z.penetration_rate}%</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#888' }}>{z.engagement_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const prepareAudienceMapDataByMode = () => {
    if (!mainGeoData?.state_heatmap) return {};
    const mapData = {};
    Object.entries(mainGeoData.state_heatmap).forEach(([state, data]) => {
      if (mapColorMode === 'count') {
        mapData[state] = {
          value: data.count,
          label: `${data.count.toLocaleString()} users`
        };
      } else {
        mapData[state] = {
          value: data.engagement_rate,
          label: `${data.engagement_rate}% open rate`
        };
      }
    });
    return mapData;
  };

  const prepareNPIMapDataByMode = () => {
    if (!mainGeoData?.npi_by_state) return {};
    const mapData = {};
    Object.entries(mainGeoData.npi_by_state).forEach(([state, data]) => {
      if (mapColorMode === 'count') {
        mapData[state] = {
          value: data.count,
          label: `${data.count.toLocaleString()} NPIs`
        };
      } else {
        const penRate = mainGeoData.penetration?.[state]?.penetration_rate || 0;
        mapData[state] = {
          value: penRate,
          label: `${penRate}% penetration`
        };
      }
    });
    return mapData;
  };

  const renderAudienceVsNPIs = () => {
    if (!mainGeoData?.state_heatmap || !mainGeoData?.npi_by_state) {
      return <div className="no-data">Loading map data...</div>;
    }

    const audienceMapData = prepareAudienceMapDataByMode();
    const npiMapData = prepareNPIMapDataByMode();

    const totalAudience = Object.values(mainGeoData.state_heatmap || {}).reduce((sum, s) => sum + (s.count || 0), 0);
    const totalNPIs = Object.values(mainGeoData.npi_by_state || {}).reduce((sum, s) => sum + (s.count || 0), 0);

    return (
      <div className="full-map-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h4 style={{ color: '#fff', fontFamily: 'Lora, serif', fontSize: '24px', marginBottom: '8px' }}>
              Audience vs Total Market
            </h4>
            <p style={{ fontSize: '14px', color: '#888', margin: 0 }}>
              Audience: <span style={{ color: '#0ff', fontWeight: 'bold' }}>{totalAudience.toLocaleString()}</span> users |
              Total Market: <span style={{ color: '#ff8800', fontWeight: 'bold' }}>{totalNPIs.toLocaleString()}</span> NPIs
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setGeoViewMode('state')}
                style={{
                  padding: '8px 16px',
                  background: geoViewMode === 'state' ? '#0ff' : 'transparent',
                  color: geoViewMode === 'state' ? '#000' : '#aaa',
                  border: geoViewMode === 'state' ? 'none' : '1px solid #444',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: geoViewMode === 'state' ? 'bold' : 'normal',
                  fontSize: '13px',
                  transition: 'all 0.2s'
                }}
              >
                By State
              </button>
              <button
                onClick={() => setGeoViewMode('zipcode')}
                style={{
                  padding: '8px 16px',
                  background: geoViewMode === 'zipcode' ? '#0ff' : 'transparent',
                  color: geoViewMode === 'zipcode' ? '#000' : '#aaa',
                  border: geoViewMode === 'zipcode' ? 'none' : '1px solid #444',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: geoViewMode === 'zipcode' ? 'bold' : 'normal',
                  fontSize: '13px',
                  transition: 'all 0.2s'
                }}
              >
                By Zipcode
              </button>
              <button
                onClick={() => setGeoViewMode('city')}
                style={{
                  padding: '8px 16px',
                  background: geoViewMode === 'city' ? '#0ff' : 'transparent',
                  color: geoViewMode === 'city' ? '#000' : '#aaa',
                  border: geoViewMode === 'city' ? 'none' : '1px solid #444',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: geoViewMode === 'city' ? 'bold' : 'normal',
                  fontSize: '13px',
                  transition: 'all 0.2s'
                }}
              >
                By City
              </button>
            </div>

            {geoViewMode === 'state' && (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', borderLeft: '1px solid #444', paddingLeft: '16px' }}>
                <span style={{ color: '#666', fontSize: '12px', marginRight: '4px' }}>Color:</span>
                <button
                  onClick={() => setMapColorMode('count')}
                  style={{
                    padding: '6px 12px',
                    background: mapColorMode === 'count' ? 'rgba(0, 255, 255, 0.2)' : 'transparent',
                    color: mapColorMode === 'count' ? '#0ff' : '#666',
                    border: mapColorMode === 'count' ? '1px solid #0ff' : '1px solid #444',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: mapColorMode === 'count' ? '600' : 'normal',
                    transition: 'all 0.2s'
                  }}
                >
                  Count
                </button>
                <button
                  onClick={() => setMapColorMode('engagement')}
                  style={{
                    padding: '6px 12px',
                    background: mapColorMode === 'engagement' ? 'rgba(0, 255, 255, 0.2)' : 'transparent',
                    color: mapColorMode === 'engagement' ? '#0ff' : '#666',
                    border: mapColorMode === 'engagement' ? '1px solid #0ff' : '1px solid #444',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: mapColorMode === 'engagement' ? '600' : 'normal',
                    transition: 'all 0.2s'
                  }}
                >
                  Open Rate
                </button>
              </div>
            )}
          </div>
        </div>

        {geoViewMode === 'state' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', minHeight: '450px' }}>
            <div style={{ height: '100%' }}>
              <USStateMap
                data={audienceMapData}
                colorScale={mapColorMode === 'count' ? 'engagement' : 'penetration'}
                title="Audience Distribution"
                subtitle={mapColorMode === 'count' ? 'Colored by user count' : 'Colored by open rate'}
                tooltipContent={(state, stateData) => {
                  const total = Object.values(mainGeoData.state_heatmap || {}).reduce((sum, s) => sum + (s.count || 0), 0) || 1;
                  const count = mainGeoData.state_heatmap?.[state]?.count || 0;
                  const pct = ((count / total) * 100).toFixed(1);
                  const engRate = mainGeoData.state_heatmap?.[state]?.engagement_rate || 0;
                  return (
                    <div>
                      <div style={{ color: '#fff', marginBottom: '4px' }}>{count.toLocaleString()} users</div>
                      <div style={{ color: '#0ff', fontSize: '12px' }}>{pct}% of total audience</div>
                      <div style={{ color: '#4caf50', fontSize: '12px' }}>{engRate}% unique open rate</div>
                    </div>
                  );
                }}
              />
            </div>
            <div style={{ height: '100%' }}>
              <USStateMap
                data={npiMapData}
                colorScale={mapColorMode === 'count' ? 'diverging' : 'penetration'}
                title="Total Market (All NPIs)"
                subtitle={mapColorMode === 'count' ? 'Colored by NPI count' : 'Colored by penetration rate'}
                tooltipContent={(state, stateData) => {
                  const total = Object.values(mainGeoData.npi_by_state || {}).reduce((sum, s) => sum + (s.count || 0), 0) || 1;
                  const count = mainGeoData.npi_by_state?.[state]?.count || 0;
                  const pct = ((count / total) * 100).toFixed(1);
                  const penRate = mainGeoData.penetration?.[state]?.penetration_rate || 0;
                  return (
                    <div>
                      <div style={{ color: '#fff', marginBottom: '4px' }}>{count.toLocaleString()} NPIs</div>
                      <div style={{ color: '#ff8800', fontSize: '12px' }}>{pct}% of total market</div>
                      <div style={{ color: '#4caf50', fontSize: '12px' }}>{penRate}% penetration</div>
                    </div>
                  );
                }}
              />
            </div>
          </div>
        )}
        {geoViewMode === 'zipcode' && renderZipcodeView()}
        {geoViewMode === 'city' && renderCityView()}
      </div>
    );
  };

  const renderPenetrationMap = () => {
    const mapData = preparePenetrationMapData();
    return (
      <USStateMap
        data={mapData}
        colorScale="penetration"
        title="Market Penetration by State"
        subtitle="% of total NPIs you've captured in each state"
        tooltipContent={(state, stateData) => {
          const penData = mainGeoData.penetration?.[state];
          return (
            <div>
              <div style={{ color: '#4caf50', fontWeight: 'bold', marginBottom: '4px' }}>{stateData.value}% penetration</div>
              <div style={{ color: '#0ff', fontSize: '12px' }}>{penData?.audience_count?.toLocaleString() || 0} audience</div>
              <div style={{ color: '#ff8800', fontSize: '12px' }}>{penData?.npi_count?.toLocaleString() || 0} total NPIs</div>
            </div>
          );
        }}
      />
    );
  };

  const renderMetroAreas = () => {
    if (!mainGeoData?.metro_areas || mainGeoData.metro_areas.length === 0) {
      return <div className="no-data">Metro area data coming soon...</div>;
    }

    return (
      <div className="metro-areas-section">
        <h4>Top 50 Metro Areas</h4>
        <div className="metro-table">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Metro Area</th>
                <th>Audience</th>
                <th>NPIs</th>
                <th>Penetration</th>
                <th>Engagement Rate</th>
              </tr>
            </thead>
            <tbody>
              {mainGeoData.metro_areas.slice(0, 50).map((metro, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{metro.name}</td>
                  <td>{metro.audience_count?.toLocaleString()}</td>
                  <td>{metro.npi_count?.toLocaleString()}</td>
                  <td>{metro.penetration_rate}%</td>
                  <td>{metro.engagement_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderUrbanRural = () => {
    if (!mainGeoData?.urban_rural) {
      return <div className="no-data">Urban/Rural data coming soon...</div>;
    }

    const { audience, npis } = mainGeoData.urban_rural;

    const audienceTotal = audience?.total || 1;
    const npiTotal = npis?.total || 1;

    const audienceUrbanPct = ((audience?.urban || 0) / audienceTotal * 100).toFixed(1);
    const audienceSuburbanPct = ((audience?.suburban || 0) / audienceTotal * 100).toFixed(1);
    const audienceRuralPct = ((audience?.rural || 0) / audienceTotal * 100).toFixed(1);

    const npiUrbanPct = ((npis?.urban || 0) / npiTotal * 100).toFixed(1);
    const npiSuburbanPct = ((npis?.suburban || 0) / npiTotal * 100).toFixed(1);
    const npiRuralPct = ((npis?.rural || 0) / npiTotal * 100).toFixed(1);

    return (
      <div className="urban-rural-section">
        <h4>Urban / Suburban / Rural Distribution</h4>
        <p style={{ color: '#888', marginBottom: '24px' }}>
          Compare where your audience is located vs the total NPI universe
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
          <div style={{ background: 'var(--color-bg-elevated, #222224)', borderRadius: '8px', padding: '24px' }}>
            <h5 style={{ color: '#0ff', marginBottom: '20px', fontFamily: 'Lora, serif' }}>Audience</h5>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#fff' }}>Urban</span>
                <span style={{ color: '#0ff', fontWeight: 'bold' }}>{(audience?.urban || 0).toLocaleString()} ({audienceUrbanPct}%)</span>
              </div>
              <div style={{ background: '#333', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                <div style={{ background: '#0ff', height: '100%', width: `${audienceUrbanPct}%`, transition: 'width 0.5s ease' }}></div>
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#fff' }}>Suburban</span>
                <span style={{ color: '#4caf50', fontWeight: 'bold' }}>{(audience?.suburban || 0).toLocaleString()} ({audienceSuburbanPct}%)</span>
              </div>
              <div style={{ background: '#333', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                <div style={{ background: '#4caf50', height: '100%', width: `${audienceSuburbanPct}%`, transition: 'width 0.5s ease' }}></div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#fff' }}>Rural</span>
                <span style={{ color: '#ff8800', fontWeight: 'bold' }}>{(audience?.rural || 0).toLocaleString()} ({audienceRuralPct}%)</span>
              </div>
              <div style={{ background: '#333', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                <div style={{ background: '#ff8800', height: '100%', width: `${audienceRuralPct}%`, transition: 'width 0.5s ease' }}></div>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--color-bg-elevated, #222224)', borderRadius: '8px', padding: '24px' }}>
            <h5 style={{ color: '#ff8800', marginBottom: '20px', fontFamily: 'Lora, serif' }}>All NPIs (Market)</h5>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#fff' }}>Urban</span>
                <span style={{ color: '#0ff', fontWeight: 'bold' }}>{(npis?.urban || 0).toLocaleString()} ({npiUrbanPct}%)</span>
              </div>
              <div style={{ background: '#333', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                <div style={{ background: '#0ff', height: '100%', width: `${npiUrbanPct}%`, transition: 'width 0.5s ease' }}></div>
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#fff' }}>Suburban</span>
                <span style={{ color: '#4caf50', fontWeight: 'bold' }}>{(npis?.suburban || 0).toLocaleString()} ({npiSuburbanPct}%)</span>
              </div>
              <div style={{ background: '#333', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                <div style={{ background: '#4caf50', height: '100%', width: `${npiSuburbanPct}%`, transition: 'width 0.5s ease' }}></div>
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#fff' }}>Rural</span>
                <span style={{ color: '#ff8800', fontWeight: 'bold' }}>{(npis?.rural || 0).toLocaleString()} ({npiRuralPct}%)</span>
              </div>
              <div style={{ background: '#333', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                <div style={{ background: '#ff8800', height: '100%', width: `${npiRuralPct}%`, transition: 'width 0.5s ease' }}></div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(0, 255, 255, 0.05)', borderRadius: '8px', padding: '20px', borderLeft: '3px solid #0ff' }}>
          <h5 style={{ color: '#fff', marginBottom: '12px' }}>Key Insight</h5>
          <p style={{ color: '#aaa', fontSize: '14px', margin: 0 }}>
            {parseFloat(audienceUrbanPct) > parseFloat(npiUrbanPct)
              ? `Your audience over-indexes in urban areas by ${(parseFloat(audienceUrbanPct) - parseFloat(npiUrbanPct)).toFixed(1)} percentage points compared to the total NPI market.`
              : parseFloat(audienceRuralPct) > parseFloat(npiRuralPct)
                ? `Your audience over-indexes in rural areas by ${(parseFloat(audienceRuralPct) - parseFloat(npiRuralPct)).toFixed(1)} percentage points compared to the total NPI market.`
                : `Your audience distribution closely matches the overall NPI market distribution.`
            }
          </p>
        </div>
      </div>
    );
  };

  const getAllStatesByEngagement = () => {
    if (!mainGeoData?.state_heatmap) return [];
    return Object.entries(mainGeoData.state_heatmap)
      .filter(([_, data]) => data.count > 0)
      .map(([state, data]) => ({ state, rate: data.engagement_rate, count: data.count }))
      .sort((a, b) => b.rate - a.rate);
  };

  const renderGeographicBreakdown = () => {
    const data = mainGeoData?.breakdown;
    if (!data) return null;

    const totalMarket = Object.values(mainGeoData?.npi_by_state || {}).reduce((sum, s) => sum + (s.count || 0), 0);
    const allStates = getAllStatesByEngagement();

    return (
      <div className="geographic-breakdown" style={{ marginBottom: '24px' }}>
        <div className="breakdown-stats" style={{ marginBottom: '16px' }}>
          <div className="stat-card">
            <div className="stat-value">{data.total_users?.toLocaleString() || 0}</div>
            <div className="stat-label">Total Audience</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totalMarket.toLocaleString()}</div>
            <div className="stat-label">Total Market</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ fontSize: '1.5rem' }}>{data.top_state || 'N/A'}</div>
            <div className="stat-label">Largest State (by count)</div>
          </div>
        </div>

        <div style={{
          background: 'var(--color-bg-elevated, #222224)',
          borderRadius: '8px',
          padding: '16px 20px'
        }}>
          <div style={{ color: '#888', fontSize: '13px', fontWeight: '500', marginBottom: '12px' }}>
            States by Open Rate
          </div>
          <div style={{
            display: 'flex',
            gap: '10px',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            paddingBottom: '4px'
          }} className="hide-scrollbar">
            {allStates.map((item, idx) => (
              <div
                key={item.state}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: idx === 0 ? 'rgba(0, 255, 255, 0.15)' : idx < 3 ? 'rgba(0, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '16px',
                  border: idx === 0 ? '1px solid rgba(0, 255, 255, 0.3)' : '1px solid transparent',
                  flexShrink: 0
                }}
              >
                <span style={{
                  fontWeight: 'bold',
                  fontSize: '10px',
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: idx === 0 ? '#0ff' : idx < 3 ? '#1a4d5c' : '#333',
                  color: idx === 0 ? '#000' : '#aaa',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {idx + 1}
                </span>
                <span style={{ color: '#fff', fontWeight: '500', fontSize: '12px', whiteSpace: 'nowrap' }}>{item.state}</span>
                <span style={{ color: idx < 3 ? '#0ff' : '#4caf50', fontSize: '11px', whiteSpace: 'nowrap' }}>{item.rate}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderCustomMap = () => {
    if (!customMapData) return null;

    const granularity = customMapData.granularity || 'state';

    if (granularity === 'state' && customMapData.state_data) {
      const customMapDataFormatted = {};
      Object.entries(customMapData.state_data).forEach(([state, data]) => {
        customMapDataFormatted[state] = {
          value: data.count,
          label: `${data.count} users`
        };
      });

      return (
        <div className="custom-map-result">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h4>Custom Map Result - By State</h4>
            <button className="export-button" onClick={exportMapAsImage}>
              Export as Image
            </button>
          </div>
          <div ref={exportRef}>
            <USStateMap
              data={customMapDataFormatted}
              colorScale="engagement"
              title="Custom Query Result"
              subtitle={`${customMapData.breakdown?.total_users?.toLocaleString() || 0} users across ${customMapData.breakdown?.total_regions || 0} states`}
              tooltipContent={(state, stateData) => (
                <div>
                  <div style={{ color: '#fff' }}>{stateData.value?.toLocaleString()} users</div>
                </div>
              )}
            />
          </div>
          <div className="custom-breakdown" style={{ marginTop: '20px', padding: '16px', background: 'var(--color-bg-elevated, #222224)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', gap: '30px' }}>
              <div><span style={{ color: '#888' }}>Total Users:</span> <span style={{ color: '#0ff', fontWeight: 'bold' }}>{customMapData.breakdown?.total_users?.toLocaleString()}</span></div>
              <div><span style={{ color: '#888' }}>States:</span> <span style={{ color: '#ff8800', fontWeight: 'bold' }}>{customMapData.breakdown?.total_regions}</span></div>
              <div><span style={{ color: '#888' }}>Top Region:</span> <span style={{ color: '#4caf50', fontWeight: 'bold' }}>{customMapData.breakdown?.top_region}</span></div>
            </div>
          </div>
        </div>
      );
    }

    if (granularity === 'zipcode' && customMapData.zipcode_data) {
      const zipcodeArray = Object.entries(customMapData.zipcode_data)
        .map(([prefix, data]) => ({ prefix, ...data }))
        .sort((a, b) => b.count - a.count);
      const maxCount = Math.max(...zipcodeArray.map(z => z.count));

      return (
        <div className="custom-map-result">
          <h4 style={{ marginBottom: '20px' }}>Custom Map Result - By Zipcode</h4>
          <div style={{ background: 'var(--color-bg-elevated, #222224)', borderRadius: '8px', padding: '24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {zipcodeArray.slice(0, 40).map(z => {
                const size = Math.max(35, Math.min(70, (z.count / maxCount) * 70));
                return (
                  <div
                    key={z.prefix}
                    style={{
                      width: `${size}px`,
                      height: `${size}px`,
                      borderRadius: '50%',
                      background: `rgba(0, 255, 255, ${0.3 + (z.count / maxCount) * 0.7})`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(0, 255, 255, 0.5)'
                    }}
                    title={`${z.prefix}xx: ${z.count.toLocaleString()} users (${z.state})`}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>{z.prefix}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="custom-breakdown" style={{ padding: '16px', background: 'var(--color-bg-elevated, #222224)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', gap: '30px' }}>
              <div><span style={{ color: '#888' }}>Total Users:</span> <span style={{ color: '#0ff', fontWeight: 'bold' }}>{customMapData.breakdown?.total_users?.toLocaleString()}</span></div>
              <div><span style={{ color: '#888' }}>Zip Regions:</span> <span style={{ color: '#ff8800', fontWeight: 'bold' }}>{customMapData.breakdown?.total_regions}</span></div>
              <div><span style={{ color: '#888' }}>Top Region:</span> <span style={{ color: '#4caf50', fontWeight: 'bold' }}>{customMapData.breakdown?.top_region}</span></div>
            </div>
          </div>
        </div>
      );
    }

    if (granularity === 'city' && customMapData.city_data) {
      const cityArray = Object.entries(customMapData.city_data)
        .map(([city, data]) => ({ city, count: data.count }))
        .sort((a, b) => b.count - a.count);

      return (
        <div className="custom-map-result">
          <h4 style={{ marginBottom: '20px' }}>Custom Map Result - By City</h4>
          <div style={{ background: 'var(--color-bg-elevated, #222224)', borderRadius: '8px', padding: '24px', maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #444' }}>
                  <th style={{ padding: '10px', textAlign: 'left', color: '#aaa' }}>Rank</th>
                  <th style={{ padding: '10px', textAlign: 'left', color: '#aaa' }}>City</th>
                  <th style={{ padding: '10px', textAlign: 'right', color: '#0ff' }}>Users</th>
                </tr>
              </thead>
              <tbody>
                {cityArray.slice(0, 50).map((c, idx) => (
                  <tr key={c.city} style={{ borderBottom: '1px solid #333' }}>
                    <td style={{ padding: '8px', color: '#888' }}>{idx + 1}</td>
                    <td style={{ padding: '8px', color: '#fff' }}>{c.city}</td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#0ff', fontWeight: 'bold' }}>{c.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="custom-breakdown" style={{ marginTop: '20px', padding: '16px', background: 'var(--color-bg-elevated, #222224)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', gap: '30px' }}>
              <div><span style={{ color: '#888' }}>Total Users:</span> <span style={{ color: '#0ff', fontWeight: 'bold' }}>{customMapData.breakdown?.total_users?.toLocaleString()}</span></div>
              <div><span style={{ color: '#888' }}>Cities:</span> <span style={{ color: '#ff8800', fontWeight: 'bold' }}>{customMapData.breakdown?.total_regions}</span></div>
              <div><span style={{ color: '#888' }}>Top City:</span> <span style={{ color: '#4caf50', fontWeight: 'bold' }}>{customMapData.breakdown?.top_region}</span></div>
            </div>
          </div>
        </div>
      );
    }

    return <div className="no-data">No data available for this query</div>;
  };

  const renderCustomMapTab = () => {
    return (
      <div className="custom-map-tab">
        <div className="custom-map-header" style={{ marginBottom: '24px' }}>
          <h3 className="section-title" style={{ marginBottom: '8px' }}>Create Custom Map</h3>
          <p style={{ color: '#888', fontSize: '14px' }}>
            Build custom geographic visualizations by filtering audience data
          </p>
        </div>

          <div className="filter-row">
            <div className="filter-group">
              <label>View By</label>
              <select value={customMapGranularity} onChange={(e) => setCustomMapGranularity(e.target.value)}>
                <option value="state">State</option>
                <option value="zipcode">Zipcode (3-digit)</option>
                <option value="city">City</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Engagement Status</label>
              <select value={engagementFilter} onChange={(e) => setEngagementFilter(e.target.value)}>
                <option value="all">All Audience</option>
                <option value="opened">Has Opened</option>
                <option value="never_opened">Never Opened</option>
              </select>
            </div>

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

          <div className="custom-actions">
            <button
              className="generate-map-button"
              onClick={generateCustomMap}
              disabled={customMapLoading}
            >
              {customMapLoading ? 'Generating...' : 'Generate Map'}
            </button>
            {(selectedSpecialties.length > 0 || selectedCampaigns.length > 0) && (
              <button
                className="clear-all-filters-button"
                onClick={() => {
                  setSelectedSpecialties([]);
                  setSelectedCampaigns([]);
                }}
              >
                Clear All Filters
              </button>
            )}
          </div>

        {customMapData && renderCustomMap()}
      </div>
    );
  };

  const renderMetroUrbanRuralTab = () => {
    const urbanRural = mainGeoData?.urban_rural;
    const metroAreas = mainGeoData?.metro_areas || [];

    console.log('[GEO-METRO] urban_rural:', urbanRural);
    console.log('[GEO-METRO] metro_areas:', metroAreas);

    const audience = urbanRural?.audience || {};
    const npis = urbanRural?.npis || {};
    const audienceTotal = audience?.total || 1;
    const npiTotal = npis?.total || 1;

    const audienceUrbanPct = ((audience?.urban || 0) / audienceTotal * 100).toFixed(1);
    const audienceSuburbanPct = ((audience?.suburban || 0) / audienceTotal * 100).toFixed(1);
    const audienceRuralPct = ((audience?.rural || 0) / audienceTotal * 100).toFixed(1);

    const npiUrbanPct = ((npis?.urban || 0) / npiTotal * 100).toFixed(1);
    const npiSuburbanPct = ((npis?.suburban || 0) / npiTotal * 100).toFixed(1);
    const npiRuralPct = ((npis?.rural || 0) / npiTotal * 100).toFixed(1);

    const totalMetroAudience = metroAreas.reduce((sum, m) => sum + (m.audience_count || 0), 0);
    const totalMetroNPIs = metroAreas.reduce((sum, m) => sum + (m.npi_count || 0), 0);
    const avgMetroPenetration = metroAreas.length > 0
      ? (metroAreas.reduce((sum, m) => sum + (m.penetration_rate || 0), 0) / metroAreas.length).toFixed(1)
      : 0;
    const avgMetroEngagement = metroAreas.length > 0
      ? (metroAreas.reduce((sum, m) => sum + (m.engagement_rate || 0), 0) / metroAreas.length).toFixed(1)
      : 0;

    const bestMetro = metroAreas.length > 0
      ? metroAreas.reduce((best, m) => m.engagement_rate > best.engagement_rate ? m : best, metroAreas[0])
      : null;

    return (
      <div className="metro-urban-combined">
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ color: '#fff', fontFamily: 'Lora, serif', fontSize: '24px', marginBottom: '8px' }}>
            Geographic Market Analysis
          </h3>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '30px'
        }}>
          <div style={{ background: 'var(--color-bg-elevated, #222224)', borderRadius: '8px', padding: '20px' }}>
            <div style={{ color: '#0ff', fontSize: '1.75rem', fontWeight: 'bold' }}>{metroAreas.length}</div>
            <div style={{ color: '#888', fontSize: '12px' }}>Metro Areas</div>
          </div>
          <div style={{ background: 'var(--color-bg-elevated, #222224)', borderRadius: '8px', padding: '20px' }}>
            <div style={{ color: '#0ff', fontSize: '1.75rem', fontWeight: 'bold' }}>{totalMetroAudience.toLocaleString()}</div>
            <div style={{ color: '#888', fontSize: '12px' }}>Metro Audience</div>
          </div>
          <div style={{ background: 'var(--color-bg-elevated, #222224)', borderRadius: '8px', padding: '20px' }}>
            <div style={{ color: '#0ff', fontSize: '1.75rem', fontWeight: 'bold' }}>{avgMetroPenetration}%</div>
            <div style={{ color: '#888', fontSize: '12px' }}>Avg Metro Penetration</div>
          </div>
          <div style={{ background: 'var(--color-bg-elevated, #222224)', borderRadius: '8px', padding: '20px' }}>
            <div style={{ color: '#0ff', fontSize: '1.75rem', fontWeight: 'bold' }}>{avgMetroEngagement}%</div>
            <div style={{ color: '#888', fontSize: '12px' }}>Avg Metro Open Rate</div>
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h4 style={{ color: '#fff', fontFamily: 'Lora, serif', marginBottom: '16px' }}>Population Density Distribution</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ background: 'var(--color-bg-elevated, #222224)', borderRadius: '8px', padding: '20px' }}>
              <div style={{ color: '#0ff', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Audience</div>
              {[
                { label: 'Urban', value: audience?.urban || 0, pct: audienceUrbanPct },
                { label: 'Suburban', value: audience?.suburban || 0, pct: audienceSuburbanPct },
                { label: 'Rural', value: audience?.rural || 0, pct: audienceRuralPct }
              ].map(item => (
                <div key={item.label} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#fff', fontSize: '13px' }}>{item.label}</span>
                    <span style={{ color: '#0ff', fontWeight: 'bold', fontSize: '13px' }}>{item.value.toLocaleString()} ({item.pct}%)</span>
                  </div>
                  <div style={{ background: '#333', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                    <div style={{ background: '#0ff', height: '100%', width: `${item.pct}%`, transition: 'width 0.5s ease' }}></div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--color-bg-elevated, #222224)', borderRadius: '8px', padding: '20px' }}>
              <div style={{ color: '#888', fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Total Market</div>
              {[
                { label: 'Urban', value: npis?.urban || 0, pct: npiUrbanPct },
                { label: 'Suburban', value: npis?.suburban || 0, pct: npiSuburbanPct },
                { label: 'Rural', value: npis?.rural || 0, pct: npiRuralPct }
              ].map(item => (
                <div key={item.label} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#fff', fontSize: '13px' }}>{item.label}</span>
                    <span style={{ color: '#888', fontWeight: 'bold', fontSize: '13px' }}>{item.value.toLocaleString()} ({item.pct}%)</span>
                  </div>
                  <div style={{ background: '#333', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                    <div style={{ background: '#555', height: '100%', width: `${item.pct}%`, transition: 'width 0.5s ease' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{
          background: 'rgba(0, 255, 255, 0.05)',
          borderRadius: '8px',
          padding: '16px 20px',
          borderLeft: '3px solid #0ff',
          marginBottom: '30px'
        }}>
          <div style={{ color: '#fff', fontWeight: '600', marginBottom: '8px' }}>Key Insights</div>
          <div style={{ color: '#aaa', fontSize: '13px', lineHeight: '1.6' }}>
            {parseFloat(audienceUrbanPct) > parseFloat(npiUrbanPct) && (
              <div style={{ marginBottom: '4px' }}>• Audience over-indexes in urban areas by {(parseFloat(audienceUrbanPct) - parseFloat(npiUrbanPct)).toFixed(1)} percentage points vs the market.</div>
            )}
            {parseFloat(audienceRuralPct) > parseFloat(npiRuralPct) && (
              <div style={{ marginBottom: '4px' }}>• Audience over-indexes in rural areas by {(parseFloat(audienceRuralPct) - parseFloat(npiRuralPct)).toFixed(1)} percentage points vs the market.</div>
            )}
            {bestMetro && (
              <div>• Best performing metro: {bestMetro.name} with {bestMetro.engagement_rate}% open rate.</div>
            )}
            {metroAreas.length === 0 && (
              <div>• No metro area data available yet.</div>
            )}
          </div>
        </div>

        <div>
          <h4 style={{ color: '#fff', fontFamily: 'Lora, serif', marginBottom: '16px' }}>Metro Areas Performance</h4>
          {metroAreas.length === 0 ? (
            <div style={{ background: 'var(--color-bg-elevated, #222224)', borderRadius: '8px', padding: '40px', textAlign: 'center', color: '#666' }}>
              No metro area data available
            </div>
          ) : (
            <div style={{
              background: 'var(--color-bg-elevated, #222224)',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#888', fontSize: '12px', fontWeight: '600' }}>#</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#888', fontSize: '12px', fontWeight: '600' }}>Metro Area</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', color: '#888', fontSize: '12px', fontWeight: '600' }}>Audience</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', color: '#888', fontSize: '12px', fontWeight: '600' }}>Market NPIs</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', color: '#888', fontSize: '12px', fontWeight: '600' }}>Penetration</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', color: '#888', fontSize: '12px', fontWeight: '600' }}>Open Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metroAreas.slice(0, 30).map((metro, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #333' }}>
                        <td style={{ padding: '10px 16px', color: '#666', fontSize: '13px' }}>{idx + 1}</td>
                        <td style={{ padding: '10px 16px', color: '#fff', fontSize: '13px', fontWeight: '500' }}>{metro.name}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#0ff', fontSize: '13px' }}>{metro.audience_count?.toLocaleString()}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#888', fontSize: '13px' }}>{metro.npi_count?.toLocaleString()}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#0ff', fontSize: '13px' }}>{metro.penetration_rate}%</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', color: '#0ff', fontSize: '13px' }}>{metro.engagement_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="geographic-insights">
        <div className="loading-container" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px'
        }}>
          <div className="spinner">
            <div></div><div></div><div></div><div></div><div></div><div></div>
          </div>
          <p style={{ color: '#aaa', marginTop: '16px' }}>Loading geographic data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="geographic-insights">
      <div className="main-visualizations">

        {renderGeographicBreakdown()}

        <div className="viz-tabs">
          <button
            className={`viz-tab ${activeMainTab === 'audience-vs-npis' ? 'active' : ''}`}
            onClick={() => handleTabChange('audience-vs-npis')}
          >
            Audience vs Market
          </button>
          <button
            className={`viz-tab ${activeMainTab === 'metro-urban-rural' ? 'active' : ''}`}
            onClick={() => handleTabChange('metro-urban-rural')}
          >
            Metro & Urban/Rural
          </button>
          <button
            className={`viz-tab ${activeMainTab === 'custom-map' ? 'active' : ''}`}
            onClick={() => handleTabChange('custom-map')}
          >
            Custom Map
          </button>
        </div>

        <div className="main-geo-content">
          {activeMainTab === 'audience-vs-npis' && renderAudienceVsNPIs()}
          {activeMainTab === 'metro-urban-rural' && renderMetroUrbanRuralTab()}
          {activeMainTab === 'custom-map' && renderCustomMapTab()}
        </div>
      </div>

      {showSpecialtySelector && (
        <div className="gi-modal-overlay" onClick={() => setShowSpecialtySelector(false)}>
          <div className="gi-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="gi-modal-header">
              <h2>Select Specialties</h2>
              <button className="gi-modal-close" onClick={() => setShowSpecialtySelector(false)}>×</button>
            </div>
            <div className="gi-modal-search">
              <input
                type="text"
                placeholder="Search specialties"
                value={specialtySearchTerm}
                onChange={(e) => setSpecialtySearchTerm(e.target.value)}
                className="gi-search-input"
              />
            </div>
            <div className="gi-modal-actions">
              <button type="button" onClick={handleSelectAllSpecialties} className="gi-action-button select-all">Select All</button>
              <button type="button" onClick={handleClearAllSpecialties} className="gi-action-button clear-all">Clear All</button>
              <div className="gi-selection-count">{selectedSpecialties.length} selected</div>
            </div>
            <div className="gi-modal-list">
              {filteredSpecialties.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#b8b8b8' }}>
                  {specialties.length === 0 ? <><p>No specialties found in the database.</p></> : <p>No specialties match your search.</p>}
                </div>
              ) : (
                filteredSpecialties.map(specialty => {
                  const isSelected = selectedSpecialties.includes(specialty);
                  return (
                    <div key={specialty} className={`gi-modal-list-item ${isSelected ? 'selected' : ''}`} onClick={() => handleSpecialtyToggle(specialty)}>
                      <div className="gi-item-checkbox">{isSelected && <span className="checkmark">✓</span>}</div>
                      <div className="gi-item-info"><div className="gi-item-name">{specialty}</div></div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="gi-modal-footer">
              <button type="button" onClick={() => setShowSpecialtySelector(false)} className="gi-done-button">Done</button>
            </div>
          </div>
        </div>
      )}

      {showCampaignSelector && (
        <div className="gi-modal-overlay" onClick={() => setShowCampaignSelector(false)}>
          <div className="gi-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="gi-modal-header">
              <h2>Select Campaigns</h2>
              <button className="gi-modal-close" onClick={() => setShowCampaignSelector(false)}>×</button>
            </div>
            <div className="gi-modal-search">
              <input
                type="text"
                placeholder="Search campaigns"
                value={campaignSearchTerm}
                onChange={(e) => setCampaignSearchTerm(e.target.value)}
                className="gi-search-input"
              />
            </div>
            <div className="gi-modal-actions">
              <button type="button" onClick={handleSelectAllCampaigns} className="gi-action-button select-all">Select All</button>
              <button type="button" onClick={handleClearAllCampaigns} className="gi-action-button clear-all">Clear All</button>
              <div className="gi-selection-count">{selectedCampaigns.length} selected</div>
            </div>
            <div className="gi-modal-list">
              {filteredCampaigns.map(campaign => {
                const isSelected = selectedCampaigns.includes(campaign.campaign_name);
                return (
                  <div key={campaign.campaign_name} className={`gi-modal-list-item ${isSelected ? 'selected' : ''}`} onClick={() => handleCampaignToggle(campaign)}>
                    <div className="gi-item-checkbox">{isSelected && <span className="checkmark">✓</span>}</div>
                    <div className="gi-item-info">
                      <div className="gi-item-name">{campaign.campaign_name}</div>
                      <div className="gi-item-stats">
                        <span>Opens: {campaign.volume_metrics?.unique_opens?.toLocaleString() || 'N/A'}</span>
                        <span>Rate: {campaign.core_metrics?.unique_open_rate?.toFixed(1) || 'N/A'}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="gi-modal-footer">
              <button type="button" onClick={() => setShowCampaignSelector(false)} className="gi-done-button">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeographicInsights;