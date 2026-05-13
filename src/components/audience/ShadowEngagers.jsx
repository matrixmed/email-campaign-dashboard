import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../../config/api';
import '../../styles/CampaignPerformancePage.css';
import '../../styles/AudienceQueryBuilder.css';
import '../../styles/ShadowEngagers.css';
import { matchesSearchTerm } from '../../utils/searchUtils';
import TablePagination from '../common/TablePagination';
import exportTableCSV from '../../utils/exportTableCSV';

const PER_PAGE = 100;

const ShadowEngagers = ({ externalSearch = '' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortField, setSortField] = useState('confidence_pct');
  const [sortDir, setSortDir] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/shadow-engagers/`);
      const result = await response.json();
      if (result.error) {
        setError(result.error);
      } else {
        setData(result);
      }
    } catch (err) {
      setError('Failed to connect to server: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!data?.engagers) return [];
    let rows = [...data.engagers];

    if (externalSearch.trim()) {
      rows = rows.filter(r =>
        matchesSearchTerm(r.email, externalSearch) ||
        matchesSearchTerm(r.first_name, externalSearch) ||
        matchesSearchTerm(r.last_name, externalSearch) ||
        matchesSearchTerm(r.specialty, externalSearch)
      );
    }

    rows.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === 'string') aVal = (aVal || '').toLowerCase();
      if (typeof bVal === 'string') bVal = (bVal || '').toLowerCase();
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return rows;
  }, [data, externalSearch, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'confidence_pct' ? 'desc' : 'asc');
    }
  };

  const sortIcon = (field) => {
    if (sortField !== field) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  };

  const formatName = (first, last) => {
    const parts = [first, last].filter(Boolean);
    if (parts.length === 0) return '—';
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
  };

  const getClassBadge = (classification) => {
    const cls = classification?.toLowerCase() || '';
    return `shadow-badge shadow-badge-${cls}`;
  };

  const counts = useMemo(() => {
    if (!data?.engagers) return {};
    const e = data.engagers;
    return {
      total: e.length,
      confirmed: e.filter(r => r.classification === 'Confirmed').length,
      likely: e.filter(r => r.classification === 'Likely').length,
      potential: e.filter(r => r.classification === 'Potential').length,
      unlikely: e.filter(r => r.classification === 'Unlikely').length,
    };
  }, [data]);

  const formatLastUpdated = (iso) => {
    if (!iso) return 'Never';
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now - d) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="shadow-engagers">
        <div className="shadow-loading">Loading shadow engager data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="shadow-engagers">
        <div className="shadow-error">
          <p>{error}</p>
          <p className="shadow-error-hint">Run the detection script to populate this data.</p>
        </div>
      </div>
    );
  }

  if (!data?.engagers?.length) {
    return (
      <div className="shadow-engagers">
        <div className="shadow-empty">
          <p>No shadow engager data found.</p>
          <p className="shadow-error-hint">Run the detection script to populate this data.</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageStart = (currentPage - 1) * PER_PAGE;
  const visibleData = filtered.slice(pageStart, pageStart + PER_PAGE);

  const handleExport = () => {
    const headers = ['Email', 'First Name', 'Last Name', 'Specialty', 'Confidence %', 'Classification', 'Clicks w/o Open', 'Campaigns w/ Opens', 'Total Clicks'];
    const rows = filtered.map(r => [
      r.email || '',
      r.first_name || '',
      r.last_name || '',
      r.specialty || '',
      r.confidence_pct || 0,
      r.classification || '',
      r.campaigns_clicked_no_open || 0,
      r.campaigns_with_opens || 0,
      r.total_clean_clicks_no_open || 0,
    ]);
    exportTableCSV('shadow_engagers', headers, rows);
  };

  return (
    <div className="shadow-engagers">
      <div className="campaign-metrics-summary">
        <div className="metric-summary-card">
          <div className="metric-summary-label">Total Identified</div>
          <div className="metric-summary-value">{counts.total?.toLocaleString()}</div>
        </div>
        <div className="metric-summary-card">
          <div className="metric-summary-label">Confirmed (75%+)</div>
          <div className="metric-summary-value shadow-val-confirmed">{counts.confirmed?.toLocaleString()}</div>
        </div>
        <div className="metric-summary-card">
          <div className="metric-summary-label">Likely (50-74%)</div>
          <div className="metric-summary-value shadow-val-likely">{counts.likely?.toLocaleString()}</div>
        </div>
        <div className="metric-summary-card">
          <div className="metric-summary-label">Potential (30-49%)</div>
          <div className="metric-summary-value shadow-val-potential">{counts.potential?.toLocaleString()}</div>
        </div>
        <div className="metric-summary-card">
          <div className="metric-summary-label">Unlikely (&lt;30%)</div>
          <div className="metric-summary-value shadow-val-unlikely">{counts.unlikely?.toLocaleString()}</div>
        </div>
      </div>

      <div className="shadow-table-controls">
        <div className="last-updated-tag">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M7 4V7L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Last updated: {formatLastUpdated(data.last_updated)}</span>
        </div>
        <span className="shadow-result-count">{filtered.length.toLocaleString()} results</span>
        {filtered.length > 0 && (
          <button className="export-button" onClick={handleExport}>Export CSV</button>
        )}
      </div>

      <div className="x-table-container">
        <table className="results-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('email')} className="sortable">
                Email {sortIcon('email')}
              </th>
              <th onClick={() => handleSort('last_name')} className="sortable">
                Name {sortIcon('last_name')}
              </th>
              <th onClick={() => handleSort('specialty')} className="sortable">
                Specialty {sortIcon('specialty')}
              </th>
              <th onClick={() => handleSort('confidence_pct')} className="sortable">
                Confidence {sortIcon('confidence_pct')}
              </th>
              <th onClick={() => handleSort('classification')} className="sortable">
                Status {sortIcon('classification')}
              </th>
              <th onClick={() => handleSort('campaigns_clicked_no_open')} className="sortable">
                Clicks w/o Open {sortIcon('campaigns_clicked_no_open')}
              </th>
              <th onClick={() => handleSort('campaigns_with_opens')} className="sortable">
                Campaigns w/ Opens {sortIcon('campaigns_with_opens')}
              </th>
              <th onClick={() => handleSort('total_clean_clicks_no_open')} className="sortable">
                Total Clicks {sortIcon('total_clean_clicks_no_open')}
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleData.map((row, i) => (
              <tr key={row.email || i}>
                <td>{row.email}</td>
                <td>{formatName(row.first_name, row.last_name)}</td>
                <td>{row.specialty || '—'}</td>
                <td>
                  <div className="shadow-confidence">
                    <div className="shadow-confidence-bar">
                      <div
                        className="shadow-confidence-fill"
                        style={{ width: `${Math.min(row.confidence_pct, 100)}%` }}
                        data-classification={row.classification?.toLowerCase()}
                      />
                    </div>
                    <span>{row.confidence_pct}%</span>
                  </div>
                </td>
                <td><span className={getClassBadge(row.classification)}>{row.classification}</span></td>
                <td>{row.campaigns_clicked_no_open}</td>
                <td>{row.campaigns_with_opens}</td>
                <td>{row.total_clean_clicks_no_open}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default ShadowEngagers;