import React, { useState, useEffect, useCallback } from 'react';
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

const PharmaPipeline = ({ searchTerm, onSelectCompany, lastUpdated }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('sponsors');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/market-intelligence/clinical-trials?sponsor_class=INDUSTRY`);
      const json = await res.json();
      if (json.status === 'success') {
        setData(json);
      }
    } catch (err) {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [subTab, searchTerm]);

  const getAreaStyle = (area) => {
    const c = AREA_COLORS[area];
    return c ? { background: c.bg, color: c.primary } : {};
  };

  const filteredSponsors = data?.top_sponsors?.filter(s =>
    matchesSearchTerm(s.sponsor_name, searchTerm)
  ) || [];

  const filteredTrials = data?.trials?.filter(t => {
    if (!t.primary_completion_date) return false;
    const comp = new Date(t.primary_completion_date);
    const now = new Date();
    const future = new Date();
    future.setMonth(future.getMonth() + 18);
    if (comp < now || comp > future) return false;
    return matchesSearchTerm(t.sponsor_name, searchTerm) ||
           matchesSearchTerm(t.title, searchTerm) ||
           matchesSearchTerm(t.conditions, searchTerm);
  }) || [];

  const activeData = subTab === 'sponsors' ? filteredSponsors : filteredTrials;
  const totalPages = Math.max(1, Math.ceil(activeData.length / PER_PAGE));
  const pageStart = (currentPage - 1) * PER_PAGE;
  const sponsorsVisible = filteredSponsors.slice(pageStart, pageStart + PER_PAGE);
  const trialsVisible = filteredTrials.slice(pageStart, pageStart + PER_PAGE);

  const handleExport = () => {
    if (subTab === 'sponsors') {
      const headers = ['Sponsor', 'Total Trials', 'Completing in 18mo'];
      const rows = filteredSponsors.map(s => [s.sponsor_name || '', s.trial_count || 0, s.upcoming_count || 0]);
      exportTableCSV('clinical_trials_top_sponsors', headers, rows);
    } else {
      const headers = ['Completion Date', 'Sponsor', 'Title', 'Therapeutic Area', 'Conditions'];
      const rows = filteredTrials.map(t => [
        t.primary_completion_date || '',
        t.sponsor_name || '',
        t.title || '',
        t.therapeutic_area || '',
        t.conditions || '',
      ]);
      exportTableCSV('clinical_trials_completing', headers, rows);
    }
  };

  if (loading) {
    return <div className="mi-loading"><div className="loading-spinner"></div><p>Loading clinical trials...</p></div>;
  }

  return (
    <div className="mi-tab-content">
      <div className="mi-section-header">
        <h3>Clinical Trials</h3>
        <LastUpdatedTag date={lastUpdated} />
      </div>

      <div className="mi-subtabs">
        <button className={`mi-subtab ${subTab === 'sponsors' ? 'active' : ''}`} onClick={() => setSubTab('sponsors')}>
          Top Sponsors ({filteredSponsors.length})
        </button>
        <button className={`mi-subtab ${subTab === 'completing' ? 'active' : ''}`} onClick={() => setSubTab('completing')}>
          Trials Completing ({filteredTrials.length})
        </button>
        {activeData.length > 0 && (
          <button className="export-button" style={{ marginLeft: 'auto' }} onClick={handleExport}>Export CSV</button>
        )}
      </div>

      {subTab === 'sponsors' && (
        <div className="table-section">
          <table>
            <thead>
              <tr>
                <th>Sponsor</th>
                <th>Total Trials</th>
                <th>Completing in 18mo</th>
              </tr>
            </thead>
            <tbody>
              {sponsorsVisible.map((s, i) => (
                <tr key={i}>
                  <td className="mi-bold mi-company-link" onClick={() => onSelectCompany(s.sponsor_name)}>{s.sponsor_name}</td>
                  <td>{s.trial_count}</td>
                  <td>{s.upcoming_count > 0 ? <span className="mi-highlight">{s.upcoming_count}</span> : '0'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'completing' && (
        <div className="table-section">
          <table>
            <thead>
              <tr>
                <th style={{width: 110}}>Completion</th>
                <th style={{width: 200}}>Sponsor</th>
                <th>Title</th>
                <th style={{width: 110}}>Area</th>
              </tr>
            </thead>
            <tbody>
              {trialsVisible.map((t, i) => (
                <tr key={i}>
                  <td style={{whiteSpace: 'nowrap'}}>{t.primary_completion_date}</td>
                  <td className="mi-bold mi-company-link" onClick={() => onSelectCompany(t.sponsor_name)}>{t.sponsor_name}</td>
                  <td style={{whiteSpace: 'normal', lineHeight: 1.4}}>{t.title}</td>
                  <td><span className="mi-area-tag" style={getAreaStyle(t.therapeutic_area)}>{t.therapeutic_area}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default PharmaPipeline;