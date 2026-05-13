import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';
import LastUpdatedTag from './LastUpdatedTag';
import { matchesSearchTerm } from '../../utils/searchUtils';
import TablePagination from '../common/TablePagination';
import exportTableCSV from '../../utils/exportTableCSV';

const PER_PAGE = 100;

const AREA_COLORS = {
  dermatology: { primary: '#00857a', bg: 'rgba(0, 133, 122, 0.15)' },
  oncology: { primary: '#2a5fa3', bg: 'rgba(42, 95, 163, 0.15)' },
  neuroscience: { primary: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' },
};

const ConferenceCalendar = ({ searchTerm, onSelectCompany, lastUpdated }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('upcoming');
  const [expandedConf, setExpandedConf] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => { setCurrentPage(1); }, [subTab, searchTerm]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/market-intelligence/conferences`);
        const json = await res.json();
        if (json.status === 'success') setData(json);
      } catch (err) {}
      setLoading(false);
    };
    fetchData();
  }, []);

  const getAreaStyle = (area) => {
    const c = AREA_COLORS[area];
    return c ? { background: c.bg, color: c.primary } : {};
  };

  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return <div className="mi-loading"><div className="loading-spinner"></div><p>Loading conferences...</p></div>;
  }

  const filtered = (list) => list?.filter(c =>
    matchesSearchTerm(c.name, searchTerm) ||
    matchesSearchTerm(c.abbreviation, searchTerm) ||
    matchesSearchTerm(c.therapeutic_area, searchTerm)
  ) || [];

  const upcoming = filtered(data?.upcoming);
  const past = filtered(data?.past);

  const currentList = subTab === 'upcoming' ? upcoming : past;
  const totalPages = Math.max(1, Math.ceil(currentList.length / PER_PAGE));
  const pageStart = (currentPage - 1) * PER_PAGE;
  const visibleList = currentList.slice(pageStart, pageStart + PER_PAGE);

  const handleExport = () => {
    const headers = ['Abbreviation', 'Conference', 'Therapeutic Area', 'Start Date', 'End Date', 'Location', 'Days Until', 'Active Sponsors'];
    const rows = currentList.map(c => {
      const days = daysUntil(c.start_date);
      const sponsors = (c.active_sponsors || []).map(s => `${s.sponsor} (${s.trials})`).join('; ');
      return [
        c.abbreviation || '',
        c.name || '',
        c.therapeutic_area || '',
        c.start_date || '',
        c.end_date || '',
        c.location || '',
        days != null ? (days > 0 ? `${days}` : 'Past') : '',
        sponsors,
      ];
    });
    exportTableCSV(`conferences_${subTab}`, headers, rows);
  };

  return (
    <div className="mi-tab-content">
      <div className="mi-section-header">
        <h3>Conferences</h3>
        <LastUpdatedTag date={lastUpdated} />
      </div>

      <div className="mi-subtabs">
        <button className={`mi-subtab ${subTab === 'upcoming' ? 'active' : ''}`} onClick={() => setSubTab('upcoming')}>
          Upcoming ({upcoming.length})
        </button>
        <button className={`mi-subtab ${subTab === 'past' ? 'active' : ''}`} onClick={() => setSubTab('past')}>
          Past ({past.length})
        </button>
        {currentList.length > 0 && (
          <button className="export-button" style={{ marginLeft: 'auto' }} onClick={handleExport}>Export CSV</button>
        )}
      </div>

      <div className="table-section">
        <table>
          <thead>
            <tr>
              <th style={{width: 80}}>Abbrev</th>
              <th>Conference</th>
              <th style={{width: 110}}>Area</th>
              <th style={{width: 100}}>Dates</th>
              <th>Location</th>
              <th style={{width: 80}}>Days</th>
              {subTab === 'upcoming' && <th>Sponsors with Active Trials</th>}
            </tr>
          </thead>
          <tbody>
            {visibleList.map((c, i) => {
              const days = daysUntil(c.start_date);
              const isExpanded = expandedConf === c.abbreviation;
              return (
                <React.Fragment key={i}>
                  <tr className={c.active_sponsors?.length > 0 ? 'clickable-row' : ''}
                      onClick={() => c.active_sponsors?.length > 0 && setExpandedConf(isExpanded ? null : c.abbreviation)}>
                    <td className="mi-bold">{c.abbreviation}</td>
                    <td style={{whiteSpace: 'normal', lineHeight: 1.4}}>{c.name}</td>
                    <td><span className="mi-area-tag" style={getAreaStyle(c.therapeutic_area)}>{c.therapeutic_area}</span></td>
                    <td style={{whiteSpace: 'nowrap', fontSize: 12}}>{c.start_date}<br/>{c.end_date}</td>
                    <td>{c.location}</td>
                    <td style={{color: days > 0 ? (days <= 60 ? '#fbbf24' : '#8a8a8a') : '#555'}}>{days > 0 ? `${days}d` : 'Past'}</td>
                    {subTab === 'upcoming' && (
                      <td>
                        {c.active_sponsors?.length > 0 ? (
                          <span style={{color: '#0ff', fontWeight: 600}}>{c.active_sponsor_count} companies with {c.active_sponsors.reduce((sum, s) => sum + s.trials, 0)} trials completing nearby</span>
                        ) : (
                          <span className="mi-dim">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                  {isExpanded && c.active_sponsors?.length > 0 && (
                    <tr>
                      <td colSpan={7} style={{padding: '12px 20px', background: 'rgba(0,255,255,0.03)'}}>
                        <div style={{fontSize: 12, color: '#8a8a8a', marginBottom: 8}}>Companies with Phase 3 trials completing within 60 days of {c.abbreviation}:</div>
                        <div style={{display: 'flex', flexWrap: 'wrap', gap: 8}}>
                          {c.active_sponsors.map((s, j) => (
                            <span key={j} className="mi-company-link"
                              onClick={(e) => { e.stopPropagation(); onSelectCompany(s.sponsor); }}
                              style={{padding: '4px 12px', background: 'rgba(0,255,255,0.08)', border: '1px solid rgba(0,255,255,0.2)', borderRadius: 12, fontSize: 13}}>
                              {s.sponsor} ({s.trials})
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
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

export default ConferenceCalendar;