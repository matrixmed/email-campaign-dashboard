import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import '../styles/BasisOptimization.css';

const BasisOptimizationPage = () => {
  const [activeTab, setActiveTab] = useState('recommendations');
  const [recommendations, setRecommendations] = useState([]);
  const [impacts, setImpacts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [benchmarks, setBenchmarks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRec, setSelectedRec] = useState(null);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [implementNotes, setImplementNotes] = useState('');
  const [expandedRecs, setExpandedRecs] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSummary();
    fetchBenchmarks();
  }, []);

  useEffect(() => {
    if (activeTab === 'recommendations') {
      fetchRecommendations();
    } else if (activeTab === 'impacts') {
      fetchImpacts();
    }
  }, [activeTab, statusFilter]);

  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/basis/summary`);
      const data = await res.json();
      if (data.status === 'success') {
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  };

  const fetchBenchmarks = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/basis/benchmarks`);
      const data = await res.json();
      if (data.status === 'success') {
        setBenchmarks(data.benchmarks);
      }
    } catch (err) {
      console.error('Error fetching benchmarks:', err);
    }
  };

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/basis/recommendations?status=${statusFilter}`);
      const data = await res.json();
      if (data.status === 'success') {
        setRecommendations(data.recommendations);
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    }
    setLoading(false);
  };

  const fetchImpacts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/basis/impacts`);
      const data = await res.json();
      if (data.status === 'success') {
        setImpacts(data.impacts);
      }
    } catch (err) {
      console.error('Error fetching impacts:', err);
    }
    setLoading(false);
  };

  const handleApprove = async (recId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/basis/recommendations/${recId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_by: 'user' })
      });
      if (res.ok) {
        fetchRecommendations();
        fetchSummary();
      }
    } catch (err) {
      console.error('Error approving:', err);
    }
  };

  const handleImplement = async (recId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/basis/recommendations/${recId}/implement`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ implemented_by: 'user', notes: implementNotes })
      });
      if (res.ok) {
        setSelectedRec(null);
        setImplementNotes('');
        fetchRecommendations();
        fetchSummary();
      }
    } catch (err) {
      console.error('Error implementing:', err);
    }
  };

  const handleDismiss = async (recId, reason) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/basis/recommendations/${recId}/dismiss`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissed_by: 'user', reason: reason || 'Not applicable' })
      });
      if (res.ok) {
        fetchRecommendations();
        fetchSummary();
      }
    } catch (err) {
      console.error('Error dismissing:', err);
    }
  };

  const toggleExpanded = (recId) => {
    setExpandedRecs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recId)) {
        newSet.delete(recId);
      } else {
        newSet.add(recId);
      }
      return newSet;
    });
  };

  const getPriorityColor = (priority) => {
    if (priority === 'high') return '#dc3545';
    if (priority === 'medium') return '#f59e0b';
    return '#28a745';
  };

  const getImpactClass = (score) => {
    if (score >= 0.3) return 'positive';
    if (score <= -0.3) return 'negative';
    return '';
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const formatCurrency = (num) => {
    if (!num) return '$0.00';
    return '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatPercent = (num) => {
    if (!num) return '0%';
    return (num * 100).toFixed(2) + '%';
  };

  return (
    <div className="basis-optimization">
      <div className="page-header">
        <h1>Basis Optimization</h1>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search recommendations"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="basis-tabs-container">
        <div className="basis-tabs">
          <button
            className={`tab-button ${activeTab === 'recommendations' ? 'active' : ''}`}
            onClick={() => setActiveTab('recommendations')}
          >
            <span>Recommendations</span>
          </button>
          <button
            className={`tab-button ${activeTab === 'impacts' ? 'active' : ''}`}
            onClick={() => setActiveTab('impacts')}
          >
            <span>Impact Analysis</span>
          </button>
        </div>
        {activeTab === 'recommendations' && (
          <div className="tab-controls">
            <label>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="status-select"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="implemented">Implemented</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
        )}
      </div>

      <div className="basis-content">
        {summary && (
          <div className="summary-cards">
            <div className="summary-card">
              <span className="summary-label">Pending</span>
              <span className="summary-value pending">{summary.recommendations.pending}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Approved</span>
              <span className="summary-value approved">{summary.recommendations.approved}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Implemented</span>
              <span className="summary-value implemented">{summary.recommendations.implemented}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Positive Impact</span>
              <span className="summary-value positive">{summary.impacts.positive}</span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Negative Impact</span>
              <span className="summary-value negative">{summary.impacts.negative}</span>
            </div>
          </div>
        )}

        {benchmarks && benchmarks.data_points > 0 && (
          <div className="benchmarks-section">
            <h3>14-Day Benchmarks</h3>
            <div className="benchmarks-grid">
              <div className="benchmark-stat">
                <span className="stat-label">Avg eCPC</span>
                <span className="stat-value">{formatCurrency(benchmarks.avg_ecpc)}</span>
              </div>
              <div className="benchmark-stat">
                <span className="stat-label">Avg CTR</span>
                <span className="stat-value">{formatPercent(benchmarks.avg_ctr)}</span>
              </div>
              <div className="benchmark-stat">
                <span className="stat-label">Total Impressions</span>
                <span className="stat-value">{formatNumber(benchmarks.total_impressions)}</span>
              </div>
              <div className="benchmark-stat">
                <span className="stat-label">Total Spend</span>
                <span className="stat-value">{formatCurrency(benchmarks.total_spend)}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'recommendations' && (
          <div className="recommendations-section">
            {loading ? (
              <div className="loading-state">
                <p>Loading recommendations...</p>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="empty-state">
                <p>No {statusFilter} recommendations found.</p>
              </div>
            ) : (
              <div className="rec-list">
                {recommendations.map((rec) => {
                  const isExpanded = expandedRecs.has(rec.id);
                  return (
                    <div key={rec.id} className={`rec-card ${isExpanded ? 'expanded' : ''}`}>
                      <div className="rec-header" onClick={() => toggleExpanded(rec.id)}>
                        <div className="rec-title">
                          <span
                            className="priority-badge"
                            style={{
                              backgroundColor: `${getPriorityColor(rec.priority)}22`,
                              color: getPriorityColor(rec.priority)
                            }}
                          >
                            {rec.priority}
                          </span>
                          <span className="type-badge">{rec.recommendation_type}</span>
                          <h4>{rec.title}</h4>
                        </div>
                        <div className="rec-meta">
                          <span className="rec-date">{rec.recommendation_date}</span>
                          <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="rec-detail">
                          <p className="rec-description">{rec.description}</p>

                          <div className="rec-info">
                            {rec.campaign_name && (
                              <div className="info-item">
                                <strong>Campaign:</strong> {rec.campaign_name}
                              </div>
                            )}
                            {rec.vendor_name && (
                              <div className="info-item">
                                <strong>Vendor:</strong> {rec.vendor_name}
                              </div>
                            )}
                            {rec.confidence_score && (
                              <div className="info-item">
                                <strong>Confidence:</strong> {(rec.confidence_score * 100).toFixed(0)}%
                              </div>
                            )}
                          </div>

                          {rec.rationale && (
                            <div className="rec-rationale">
                              <strong>Rationale:</strong> {rec.rationale}
                            </div>
                          )}

                          {rec.expected_impact && (
                            <div className="rec-expected">
                              <strong>Expected Impact:</strong> {rec.expected_impact}
                            </div>
                          )}

                          {rec.status === 'pending' && (
                            <div className="rec-actions">
                              <button className="btn-approve" onClick={() => handleApprove(rec.id)}>
                                Approve
                              </button>
                              <button className="btn-dismiss" onClick={() => handleDismiss(rec.id)}>
                                Dismiss
                              </button>
                            </div>
                          )}

                          {rec.status === 'approved' && (
                            <div className="rec-actions">
                              <button className="btn-approve" onClick={() => setSelectedRec(rec)}>
                                Mark Implemented
                              </button>
                              <button className="btn-dismiss" onClick={() => handleDismiss(rec.id)}>
                                Dismiss
                              </button>
                            </div>
                          )}

                          {rec.status === 'implemented' && rec.impact_measured && (
                            <div className="impact-result">
                              <strong>Impact:</strong>{' '}
                              <span className={getImpactClass(rec.impact_status === 'positive' ? 0.5 : -0.5)}>
                                {rec.impact_status}
                              </span>
                              {rec.impact_summary && <p>{rec.impact_summary}</p>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'impacts' && (
          <div className="impacts-section">
            {loading ? (
              <div className="loading-state">
                <p>Loading impact analysis...</p>
              </div>
            ) : impacts.length === 0 ? (
              <div className="empty-state">
                <p>No impact data yet. Implement some recommendations first.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="impacts-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Recommendation</th>
                      <th>Type</th>
                      <th>Campaign</th>
                      <th>Impact Score</th>
                      <th>Category</th>
                      <th>Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {impacts.map((impact) => (
                      <tr key={impact.id}>
                        <td>{impact.measurement_date}</td>
                        <td>{impact.recommendation_title}</td>
                        <td>{impact.recommendation_type}</td>
                        <td>{impact.campaign_name}</td>
                        <td className={getImpactClass(impact.impact_score)}>
                          {impact.impact_score?.toFixed(2)}
                        </td>
                        <td>{impact.impact_category}</td>
                        <td>{impact.success_summary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedRec && (
        <div className="modal-overlay" onClick={() => setSelectedRec(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Mark as Implemented</h3>
            <p>{selectedRec.title}</p>
            <textarea
              placeholder="Implementation notes (optional)"
              value={implementNotes}
              onChange={(e) => setImplementNotes(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn-dismiss" onClick={() => setSelectedRec(null)}>
                Cancel
              </button>
              <button className="btn-approve" onClick={() => handleImplement(selectedRec.id)}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BasisOptimizationPage;
