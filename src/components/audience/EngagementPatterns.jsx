import React, { useState, useMemo } from 'react';
import '../../styles/EngagementPatterns.css';
import '../../styles/SectionHeaders.css';
import { API_BASE_URL } from '../../config/api';

const PATTERN_CATEGORIES = {
  'Engagement Level': [
    { id: 'hyper_engaged', name: 'Hyper Engaged', desc: 'Very high open rates across many campaigns' },
    { id: 'infrequent_responders', name: 'Infrequent Responders', desc: 'Low open rates despite receiving many emails' },
    { id: 'heavy_inactive', name: 'Heavy Inactive', desc: 'Received many campaigns, never opened' },
  ],
  'Behavior': [
    { id: 'click_champions', name: 'Click Champions', desc: 'High click-through rate among openers' },
    { id: 'binge_readers', name: 'Binge Readers', desc: 'Open multiple emails in rapid succession' },
    { id: 'fast_openers', name: 'Fast Openers', desc: 'Consistently open emails within minutes' },
    { id: 'one_and_done', name: 'One and Done', desc: 'Opened early campaigns then stopped' },
  ],
  'Timing & Trends': [
    { id: 'declining_engagement', name: 'Declining Engagement', desc: 'Open rate trending downward over time' },
    { id: 'recently_reengaged', name: 'Recently Re-engaged', desc: 'Was inactive but recently started opening again' },
    { id: 'weekend_warriors', name: 'Weekend Warriors', desc: 'Primarily open emails on weekends' },
    { id: 'early_birds_night_owls', name: 'Early Birds & Night Owls', desc: 'Open emails at unusual hours' },
  ]
};

const PATTERN_COLUMNS = {
  infrequent_responders: ['email', 'npi', 'first_name', 'last_name', 'specialty', 'campaigns_received', 'campaigns_opened', 'unique_open_rate'],
  hyper_engaged: ['email', 'npi', 'first_name', 'last_name', 'specialty', 'campaigns_received', 'campaigns_opened', 'unique_open_rate'],
  heavy_inactive: ['email', 'npi', 'first_name', 'last_name', 'specialty', 'campaigns_received'],
  click_champions: ['email', 'npi', 'first_name', 'last_name', 'specialty', 'campaigns_received', 'campaigns_clicked', 'unique_click_rate'],
  binge_readers: ['email', 'npi', 'first_name', 'last_name', 'specialty', 'total_opens', 'rapid_opens', 'binge_sessions', 'binge_rate'],
  fast_openers: ['email', 'npi', 'first_name', 'last_name', 'specialty', 'campaigns_opened', 'avg_open_minutes', 'fast_opens', 'fast_open_rate'],
  one_and_done: ['email', 'npi', 'first_name', 'last_name', 'specialty', 'total_campaigns', 'first_three_opens', 'later_opens'],
  declining_engagement: ['email', 'npi', 'first_name', 'last_name', 'specialty', 'total_campaigns', 'early_open_rate', 'late_open_rate', 'engagement_decline'],
  recently_reengaged: ['email', 'npi', 'first_name', 'last_name', 'specialty', 'total_campaigns', 'recent_opens', 'recent_open_rate', 'historical_open_rate'],
  weekend_warriors: ['email', 'npi', 'first_name', 'last_name', 'specialty', 'total_delayed_opens', 'weekend_opens', 'weekday_opens', 'weekend_open_rate'],
  early_birds_night_owls: ['email', 'npi', 'first_name', 'last_name', 'specialty', 'total_delayed_opens', 'avg_hour', 'reader_type', 'early_morning_opens', 'night_opens']
};

const COLUMN_LABELS = {
  email: 'Email', npi: 'NPI', first_name: 'First Name', last_name: 'Last Name', specialty: 'Specialty',
  campaigns_received: 'Campaigns', campaigns_opened: 'Opened', campaigns_clicked: 'Clicked',
  unique_open_rate: 'Open Rate %', unique_click_rate: 'Click Rate %',
  total_opens: 'Total Opens', rapid_opens: 'Rapid Opens', binge_sessions: 'Binge Sessions', binge_rate: 'Binge %',
  campaigns_opened_fast: 'Fast Opens', avg_open_minutes: 'Avg Min', fast_opens: 'Fast Opens', fast_open_rate: 'Fast %',
  total_campaigns: 'Campaigns', first_three_opens: 'First 3 Opens', later_opens: 'Later Opens',
  early_open_rate: 'Early %', late_open_rate: 'Late %', engagement_decline: 'Decline %',
  recent_opens: 'Recent Opens', recent_open_rate: 'Recent %', historical_open_rate: 'Historical %',
  total_delayed_opens: 'Delayed Opens', weekend_opens: 'Weekend', weekday_opens: 'Weekday', weekend_open_rate: 'Weekend %',
  avg_hour: 'Avg Hour', reader_type: 'Type', early_morning_opens: 'Early AM', night_opens: 'Night'
};

const EngagementPatterns = () => {
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [minCampaigns, setMinCampaigns] = useState(10);
  const [infrequentThreshold, setInfrequentThreshold] = useState(10);
  const [hyperEngagedThreshold, setHyperEngagedThreshold] = useState(70);
  const [fastOpenMinutes, setFastOpenMinutes] = useState(30);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRun = async () => {
    if (!selectedPattern) return;
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/engagement-patterns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pattern_type: selectedPattern,
          min_campaigns: minCampaigns,
          infrequent_threshold: infrequentThreshold,
          hyper_engaged_threshold: hyperEngagedThreshold,
          fast_open_minutes: fastOpenMinutes
        })
      });
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const json = await response.json();
      setResults(json);
    } catch (err) {
      setError('Failed to run engagement pattern query.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedPattern) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/engagement-patterns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pattern_type: selectedPattern,
          min_campaigns: minCampaigns,
          infrequent_threshold: infrequentThreshold,
          hyper_engaged_threshold: hyperEngagedThreshold,
          fast_open_minutes: fastOpenMinutes,
          export_csv: true
        })
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `engagement_${selectedPattern}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const columns = useMemo(() => {
    if (!selectedPattern) return [];
    return PATTERN_COLUMNS[selectedPattern] || [];
  }, [selectedPattern]);

  const patternInfo = useMemo(() => {
    for (const patterns of Object.values(PATTERN_CATEGORIES)) {
      const found = patterns.find(p => p.id === selectedPattern);
      if (found) return found;
    }
    return null;
  }, [selectedPattern]);

  const clearAll = () => {
    setSelectedPattern(null);
    setResults(null);
    setError(null);
    setLoading(false);
  };

  return (
    <div className="ep-container">
      <div className="section-header-bar">
        <h3>Engagement Queries</h3>
        <button className="section-header-clear-btn" onClick={clearAll}>Clear</button>
      </div>

      <div className="ep-split">
        <div className="ep-sidebar">
          {Object.entries(PATTERN_CATEGORIES).map(([category, patterns]) => (
            <div key={category} className="ep-sidebar-group">
              <div className="ep-sidebar-category">{category}</div>
              {patterns.map(pattern => (
                <div
                  key={pattern.id}
                  className={`ep-sidebar-item ${selectedPattern === pattern.id ? 'active' : ''}`}
                  onClick={() => setSelectedPattern(pattern.id)}
                >
                  <span className="ep-sidebar-name">{pattern.name}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="ep-content">
          {!selectedPattern ? (
            <div className="ep-empty-state">
              <h3>Select a Pattern</h3>
              <p>Choose an engagement pattern from the sidebar to query your audience data.</p>
            </div>
          ) : (
            <>
              <div className="ep-detail-header">
                <div className="ep-detail-info">
                  <div>
                    <h3 className="ep-detail-name">{patternInfo?.name}</h3>
                    <p className="ep-detail-desc">{patternInfo?.desc}</p>
                  </div>
                </div>
              </div>

              <div className="ep-controls">
                <div className="ep-control-group">
                  <span className="ep-control-label">Min Campaigns:</span>
                  <input type="number" className="ep-control-input" value={minCampaigns} min={1} onChange={e => setMinCampaigns(parseInt(e.target.value) || 1)} />
                </div>

                {selectedPattern === 'infrequent_responders' && (
                  <div className="ep-control-group">
                    <span className="ep-control-label">Max Open Rate %:</span>
                    <input type="number" className="ep-control-input" value={infrequentThreshold} min={1} max={100} onChange={e => setInfrequentThreshold(parseInt(e.target.value) || 30)} />
                  </div>
                )}

                {selectedPattern === 'hyper_engaged' && (
                  <div className="ep-control-group">
                    <span className="ep-control-label">Min Open Rate %:</span>
                    <input type="number" className="ep-control-input" value={hyperEngagedThreshold} min={1} max={100} onChange={e => setHyperEngagedThreshold(parseInt(e.target.value) || 70)} />
                  </div>
                )}

                {selectedPattern === 'fast_openers' && (
                  <div className="ep-control-group">
                    <span className="ep-control-label">Within Minutes:</span>
                    <input type="number" className="ep-control-input" value={fastOpenMinutes} min={1} onChange={e => setFastOpenMinutes(parseInt(e.target.value) || 30)} />
                  </div>
                )}

                <div className="ep-controls-actions">
                  <button className="ep-run-btn" onClick={handleRun} disabled={loading}>
                    {loading ? 'Running...' : 'Run Query'}
                  </button>
                  {results?.users?.length > 0 && (
                    <button className="ep-export-btn" onClick={handleExport}>Export CSV</button>
                  )}
                </div>
              </div>

              {loading && <div className="ep-loading">Running query...</div>}

              {error && <div className="ep-empty">{error}</div>}

              {results && !loading && (
                <>
                  <div className="section-header-bar">
                    <h3>{patternInfo?.name || 'Results'}</h3>
                    <div className="section-header-stats">
                      <div className="section-header-stat-item">
                        <span className="section-header-stat-label">Users Found</span>
                        <span className="section-header-stat-value">{results.summary?.total_users || 0}</span>
                      </div>
                      <div className="section-header-stat-item">
                        <span className="section-header-stat-label">Min Campaigns</span>
                        <span className="section-header-stat-value">{results.summary?.parameters?.min_campaigns || minCampaigns}</span>
                      </div>
                    </div>
                  </div>

                  {results.users?.length > 0 ? (
                    <div className="ep-table-wrapper">
                      <table className="ep-results-table">
                        <thead>
                          <tr>
                            {columns.map(col => (
                              <th key={col}>{COLUMN_LABELS[col] || col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {results.users.map((user, i) => (
                            <tr key={i}>
                              {columns.map(col => (
                                <td key={col}>
                                  {typeof user[col] === 'number'
                                    ? (col.includes('rate') || col.includes('decline') || col === 'binge_rate' || col === 'fast_open_rate')
                                      ? `${user[col]}%`
                                      : user[col].toLocaleString()
                                    : user[col] || '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="ep-empty">No users matched this pattern with the current thresholds.</div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EngagementPatterns;