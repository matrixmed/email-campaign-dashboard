import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';
import '../styles/TrackingPage.css';

const TrackingPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeEnv, setActiveEnv] = useState('prod');
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [visitorDetail, setVisitorDetail] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/t/dashboard`);
      if (!response.ok) throw new Error('Failed to fetch tracking data');
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVisitorDetail = async (fingerprint) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/t/visitor/${fingerprint}`);
      if (!response.ok) throw new Error('Failed to fetch visitor detail');
      const result = await response.json();
      setVisitorDetail(result);
    } catch (err) {
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleVisitorClick = (fingerprint) => {
    setSelectedVisitor(fingerprint);
    fetchVisitorDetail(fingerprint);
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  const formatRelative = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading && !data) {
    return (
      <div className="tracking-page">
        <div className="loading-state">Loading tracking data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tracking-page">
        <div className="error-state">Error: {error}</div>
      </div>
    );
  }

  const envStats = data?.environment_stats?.[activeEnv] || {};
  const topPages = data?.top_pages?.[activeEnv] || [];
  const visitors = (data?.visitors || []).filter(v => v.environment === activeEnv);
  const sessions = (data?.sessions || []).filter(s => s.environment === activeEnv);
  const actions = data?.actions?.[activeEnv] || {};
  const clickedElements = data?.clicked_elements?.[activeEnv] || [];
  const hourlyActivity = data?.hourly_activity?.[activeEnv] || [];
  const dailyActivity = data?.daily_activity?.[activeEnv] || [];

  return (
    <div className="tracking-page">
      <div className="tracking-header">
        <div className="header-left">
          <h1>Visitor Tracking</h1>
          <span className="env-badge">{activeEnv === 'dev' ? 'Development' : 'Production'}</span>
        </div>
        <div className="header-right">
          <div className="env-toggle">
            <button
              className={`env-btn ${activeEnv === 'dev' ? 'active' : ''}`}
              onClick={() => setActiveEnv('dev')}
            >
              Localhost
            </button>
            <button
              className={`env-btn ${activeEnv === 'prod' ? 'active' : ''}`}
              onClick={() => setActiveEnv('prod')}
            >
              Production
            </button>
          </div>
          <button className="refresh-btn" onClick={fetchData}>
            Refresh
          </button>
        </div>
      </div>

      <div className="tracking-tabs">
        <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`tab ${activeTab === 'visitors' ? 'active' : ''}`} onClick={() => setActiveTab('visitors')}>Visitors</button>
        <button className={`tab ${activeTab === 'sessions' ? 'active' : ''}`} onClick={() => setActiveTab('sessions')}>Sessions</button>
        <button className={`tab ${activeTab === 'pages' ? 'active' : ''}`} onClick={() => setActiveTab('pages')}>Pages</button>
        <button className={`tab ${activeTab === 'actions' ? 'active' : ''}`} onClick={() => setActiveTab('actions')}>Actions</button>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{envStats.total_visitors || 0}</div>
              <div className="stat-label">Total Visitors</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{envStats.active_24h || 0}</div>
              <div className="stat-label">Active (24h)</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{envStats.active_7d || 0}</div>
              <div className="stat-label">Active (7d)</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{envStats.total_pageviews || 0}</div>
              <div className="stat-label">Total Pageviews</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{envStats.pageviews_24h || 0}</div>
              <div className="stat-label">Pageviews (24h)</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{formatDuration(envStats.avg_duration_seconds)}</div>
              <div className="stat-label">Avg Duration</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{envStats.avg_scroll_depth || 0}%</div>
              <div className="stat-label">Avg Scroll Depth</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{envStats.avg_visits_per_user || 0}</div>
              <div className="stat-label">Avg Visits/User</div>
            </div>
          </div>

          <div className="overview-grid">
            <div className="panel">
              <h3>Daily Activity (30 days)</h3>
              <div className="chart-container">
                {dailyActivity.length > 0 ? (
                  <div className="bar-chart">
                    {dailyActivity.map((d, i) => (
                      <div key={i} className="bar-item" title={`${d.day}: ${d.pageviews} pageviews, ${d.unique_visitors} visitors`}>
                        <div
                          className="bar"
                          style={{
                            height: `${Math.min((d.pageviews / Math.max(...dailyActivity.map(x => x.pageviews))) * 100, 100)}%`
                          }}
                        />
                        <span className="bar-label">{d.day?.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-data">No data yet</div>
                )}
              </div>
            </div>

            <div className="panel">
              <h3>Top Pages</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Page</th>
                      <th>Views</th>
                      <th>Avg Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPages.length > 0 ? topPages.map((p, i) => (
                      <tr key={i}>
                        <td>{p.page}</td>
                        <td>{p.views}</td>
                        <td>{formatDuration(p.avg_duration)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={3} className="no-data">No data yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel">
              <h3>Recent Visitors</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Visitor</th>
                      <th>Last Seen</th>
                      <th>Visits</th>
                      <th>Pageviews</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitors.slice(0, 10).map((v, i) => (
                      <tr key={i} className="clickable" onClick={() => handleVisitorClick(v.fingerprint_full)}>
                        <td><code>{v.fingerprint}</code></td>
                        <td>{formatRelative(v.last_seen)}</td>
                        <td>{v.visit_count}</td>
                        <td>{v.pageviews}</td>
                      </tr>
                    ))}
                    {visitors.length === 0 && (
                      <tr><td colSpan={4} className="no-data">No visitors yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="panel">
              <h3>Top Clicked Elements</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Element</th>
                      <th>Clicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clickedElements.slice(0, 10).map((e, i) => (
                      <tr key={i}>
                        <td>{e.element}</td>
                        <td>{e.clicks}</td>
                      </tr>
                    ))}
                    {clickedElements.length === 0 && (
                      <tr><td colSpan={2} className="no-data">No clicks yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'visitors' && (
        <div className="panel full-width">
          <h3>All Visitors ({visitors.length})</h3>
          <div className="table-container scrollable">
            <table>
              <thead>
                <tr>
                  <th>Fingerprint</th>
                  <th>First Seen</th>
                  <th>Last Seen</th>
                  <th>Visits</th>
                  <th>Sessions</th>
                  <th>Pageviews</th>
                  <th>Screen</th>
                  <th>Timezone</th>
                  <th>Platform</th>
                </tr>
              </thead>
              <tbody>
                {visitors.map((v, i) => (
                  <tr key={i} className="clickable" onClick={() => handleVisitorClick(v.fingerprint_full)}>
                    <td><code>{v.fingerprint}</code></td>
                    <td>{formatDate(v.first_seen)}</td>
                    <td>{formatRelative(v.last_seen)}</td>
                    <td>{v.visit_count}</td>
                    <td>{v.sessions}</td>
                    <td>{v.pageviews}</td>
                    <td>{v.screen || '-'}</td>
                    <td>{v.timezone || '-'}</td>
                    <td>{v.platform || '-'}</td>
                  </tr>
                ))}
                {visitors.length === 0 && (
                  <tr><td colSpan={9} className="no-data">No visitors yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="panel full-width">
          <h3>Recent Sessions ({sessions.length})</h3>
          <div className="table-container scrollable">
            <table>
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Visitor</th>
                  <th>Started</th>
                  <th>Last Activity</th>
                  <th>Pages Viewed</th>
                  <th>Total Duration</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => (
                  <tr key={i}>
                    <td><code>{s.session_id}</code></td>
                    <td><code>{s.fingerprint}</code></td>
                    <td>{formatDate(s.started)}</td>
                    <td>{formatRelative(s.last_activity)}</td>
                    <td>{s.pages_viewed}</td>
                    <td>{formatDuration(s.total_duration)}</td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr><td colSpan={6} className="no-data">No sessions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'pages' && (
        <div className="panel full-width">
          <h3>Page Analytics</h3>
          <div className="table-container scrollable">
            <table>
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Views</th>
                  <th>Avg Duration</th>
                </tr>
              </thead>
              <tbody>
                {topPages.map((p, i) => (
                  <tr key={i}>
                    <td>{p.page}</td>
                    <td>{p.views}</td>
                    <td>{formatDuration(p.avg_duration)}</td>
                  </tr>
                ))}
                {topPages.length === 0 && (
                  <tr><td colSpan={3} className="no-data">No page data yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'actions' && (
        <div className="actions-grid">
          <div className="panel">
            <h3>Action Types</h3>
            <div className="action-list">
              {Object.entries(actions).length > 0 ? (
                Object.entries(actions).map(([type, count]) => (
                  <div key={type} className="action-item">
                    <span className="action-type">{type}</span>
                    <span className="action-count">{count}</span>
                  </div>
                ))
              ) : (
                <div className="no-data">No actions yet</div>
              )}
            </div>
          </div>

          <div className="panel">
            <h3>Clicked Elements</h3>
            <div className="table-container scrollable">
              <table>
                <thead>
                  <tr>
                    <th>Element Text</th>
                    <th>Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {clickedElements.map((e, i) => (
                    <tr key={i}>
                      <td>{e.element}</td>
                      <td>{e.clicks}</td>
                    </tr>
                  ))}
                  {clickedElements.length === 0 && (
                    <tr><td colSpan={2} className="no-data">No clicks yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {selectedVisitor && visitorDetail && (
        <div className="modal-overlay" onClick={() => { setSelectedVisitor(null); setVisitorDetail(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Visitor Details</h2>
              <button className="close-btn" onClick={() => { setSelectedVisitor(null); setVisitorDetail(null); }}>×</button>
            </div>
            <div className="visitor-info">
              <div className="info-grid">
                <div><strong>Fingerprint:</strong> <code>{visitorDetail.visitor?.fingerprint}</code></div>
                <div><strong>Environment:</strong> {visitorDetail.visitor?.environment}</div>
                <div><strong>First Seen:</strong> {formatDate(visitorDetail.visitor?.first_seen)}</div>
                <div><strong>Last Seen:</strong> {formatDate(visitorDetail.visitor?.last_seen)}</div>
                <div><strong>Visit Count:</strong> {visitorDetail.visitor?.visit_count}</div>
                <div><strong>Screen:</strong> {visitorDetail.visitor?.screen || '-'}</div>
                <div><strong>Timezone:</strong> {visitorDetail.visitor?.timezone || '-'}</div>
                <div><strong>Platform:</strong> {visitorDetail.visitor?.platform || '-'}</div>
              </div>
              <div className="user-agent">
                <strong>User Agent:</strong>
                <div className="ua-text">{visitorDetail.visitor?.user_agent || '-'}</div>
              </div>
            </div>

            <div className="visitor-activity">
              <h3>Page Views ({visitorDetail.pageviews?.length || 0})</h3>
              <div className="table-container scrollable">
                <table>
                  <thead>
                    <tr>
                      <th>Session</th>
                      <th>Page</th>
                      <th>Time</th>
                      <th>Duration</th>
                      <th>Scroll</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitorDetail.pageviews?.map((pv, i) => (
                      <tr key={i}>
                        <td><code>{pv.session}</code></td>
                        <td>{pv.page}</td>
                        <td>{formatDate(pv.entered_at)}</td>
                        <td>{formatDuration(pv.duration)}</td>
                        <td>{pv.scroll ? `${pv.scroll}%` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3>Actions ({visitorDetail.actions?.length || 0})</h3>
              <div className="table-container scrollable">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Page</th>
                      <th>Action</th>
                      <th>Element</th>
                      <th>Text</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitorDetail.actions?.map((a, i) => (
                      <tr key={i}>
                        <td>{formatDate(a.timestamp)}</td>
                        <td>{a.page}</td>
                        <td>{a.action}</td>
                        <td>{a.element}</td>
                        <td>{a.text || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackingPage;