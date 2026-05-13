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

const pillStyle = (isActive) => ({
  padding: '6px 14px',
  borderRadius: '16px',
  border: isActive ? '1px solid #0ff' : '1px solid #555',
  background: isActive ? 'rgba(0, 255, 255, 0.12)' : 'rgba(255,255,255,0.05)',
  color: isActive ? '#0ff' : '#ccc',
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  fontWeight: isActive ? 600 : 400,
});

const FDAAlerts = ({ searchTerm, onSelectCompany, lastUpdated }) => {
  const [approvalData, setApprovalData] = useState(null);
  const [safetyData, setSafetyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('approvals');
  const [approvalPill, setApprovalPill] = useState('our_areas');
  const [safetyPill, setSafetyPill] = useState('our_areas');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [appRes, safetyRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/market-intelligence/fda-approvals`),
          fetch(`${API_BASE_URL}/api/market-intelligence/fda-safety-alerts`),
        ]);
        const appJson = await appRes.json();
        const safetyJson = await safetyRes.json();
        if (appJson.status === 'success') setApprovalData(appJson);
        if (safetyJson.status === 'success') setSafetyData(safetyJson);
      } catch (err) {}
      setLoading(false);
    };
    fetchAll();
  }, []);

  useEffect(() => { setCurrentPage(1); }, [subTab, approvalPill, safetyPill, searchTerm]);

  const getAreaStyle = (area) => {
    const c = AREA_COLORS[area];
    return c ? { background: c.bg, color: c.primary } : {};
  };

  if (loading) {
    return <div className="mi-loading"><div className="loading-spinner"></div><p>Loading FDA data...</p></div>;
  }

  const filterBySearch = (item) =>
    matchesSearchTerm(item.brand_name, searchTerm) ||
    matchesSearchTerm(item.generic_name, searchTerm) ||
    matchesSearchTerm(item.sponsor_name, searchTerm) ||
    matchesSearchTerm(item.recalling_firm, searchTerm);

  const approvals = approvalData?.approvals?.filter(filterBySearch) || [];
  const ourAreaApprovals = approvals.filter(a => ['oncology', 'dermatology', 'neuroscience'].includes(a.therapeutic_area));
  const newIndications = approvals.filter(a => a.is_new_indication);
  const newDrugs = approvals.filter(a => a.submission_type === 'ORIG');

  const safetyAlerts = safetyData?.alerts?.filter(filterBySearch) || [];
  const ourAreaSafety = safetyData?.in_our_areas?.filter(filterBySearch) || [];

  const currentApprovals = {
    our_areas: ourAreaApprovals,
    indications: newIndications,
    new: newDrugs,
    all: approvals,
  }[approvalPill] || ourAreaApprovals;

  const currentSafety = safetyPill === 'our_areas' ? ourAreaSafety : safetyAlerts;
  const activeData = subTab === 'approvals' ? currentApprovals : currentSafety;
  const total = activeData.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const pageStart = (currentPage - 1) * PER_PAGE;
  const visible = activeData.slice(pageStart, pageStart + PER_PAGE);

  const handleExport = () => {
    if (subTab === 'approvals') {
      const headers = ['Date', 'Brand', 'Generic', 'Sponsor', 'Type', 'Area', 'Description'];
      const rows = activeData.map(a => [
        a.approval_date || '',
        a.brand_name || '',
        a.generic_name || '',
        a.sponsor_name || '',
        a.submission_type === 'ORIG' ? 'NEW' : (a.submission_type || ''),
        a.therapeutic_area || '',
        a.submission_description || '',
      ]);
      exportTableCSV(`fda_approvals_${approvalPill}`, headers, rows);
    } else {
      const headers = ['Date', 'Product', 'Reason', 'Class', 'Firm', 'Area'];
      const rows = activeData.map(a => [
        a.report_date || '',
        a.brand_name || '',
        a.reason || '',
        a.classification || '',
        a.recalling_firm || '',
        a.therapeutic_area || '',
      ]);
      exportTableCSV(`fda_safety_${safetyPill}`, headers, rows);
    }
  };

  return (
    <div className="mi-tab-content">
      <div className="mi-section-header">
        <h3>FDA Alerts</h3>
        <LastUpdatedTag date={lastUpdated} />
      </div>

      <div className="mi-subtabs">
        <button className={`mi-subtab ${subTab === 'approvals' ? 'active' : ''}`} onClick={() => setSubTab('approvals')}>
          Approvals ({approvals.length})
        </button>
        <button className={`mi-subtab ${subTab === 'safety' ? 'active' : ''}`} onClick={() => setSubTab('safety')}>
          Safety Alerts ({safetyAlerts.length})
        </button>
        {total > 0 && (
          <button className="export-button" style={{ marginLeft: 'auto' }} onClick={handleExport}>Export CSV</button>
        )}
      </div>

      {subTab === 'approvals' && (
        <>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '10px 0', marginBottom: 8}}>
            <button style={pillStyle(approvalPill === 'our_areas')} onClick={() => setApprovalPill('our_areas')}>Our Areas ({ourAreaApprovals.length})</button>
            <button style={pillStyle(approvalPill === 'indications')} onClick={() => setApprovalPill('indications')}>New Indications ({newIndications.length})</button>
            <button style={pillStyle(approvalPill === 'new')} onClick={() => setApprovalPill('new')}>New Drugs ({newDrugs.length})</button>
            <button style={pillStyle(approvalPill === 'all')} onClick={() => setApprovalPill('all')}>All ({approvals.length})</button>
          </div>

          <div className="table-section">
            <table>
              <thead>
                <tr>
                  <th style={{width: 100}}>Date</th>
                  <th>Brand</th>
                  <th>Generic</th>
                  <th>Sponsor</th>
                  <th style={{width: 80}}>Type</th>
                  <th style={{width: 110}}>Area</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a, i) => (
                  <tr key={i}>
                    <td style={{whiteSpace: 'nowrap', fontWeight: 600, color: '#fff'}}>{a.approval_date}</td>
                    <td className="mi-bold">{a.brand_name || '-'}</td>
                    <td>{a.generic_name || '-'}</td>
                    <td className="mi-company-link" onClick={() => onSelectCompany(a.sponsor_name)}>{a.sponsor_name}</td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                        background: a.submission_type === 'ORIG' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(251, 191, 36, 0.15)',
                        color: a.submission_type === 'ORIG' ? '#4ade80' : '#fbbf24',
                      }}>
                        {a.submission_type === 'ORIG' ? 'NEW' : 'SUPPL'}
                      </span>
                    </td>
                    <td>{a.therapeutic_area ? <span className="mi-area-tag" style={getAreaStyle(a.therapeutic_area)}>{a.therapeutic_area}</span> : '-'}</td>
                    <td style={{whiteSpace: 'normal', lineHeight: 1.4, color: '#999', fontSize: 13}}>{a.submission_description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {subTab === 'safety' && (
        <>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '10px 0', marginBottom: 8}}>
            <button style={pillStyle(safetyPill === 'our_areas')} onClick={() => setSafetyPill('our_areas')}>Our Areas ({ourAreaSafety.length})</button>
            <button style={pillStyle(safetyPill === 'all')} onClick={() => setSafetyPill('all')}>All ({safetyAlerts.length})</button>
          </div>

          <div className="table-section">
            <table>
              <thead>
                <tr>
                  <th style={{width: 100}}>Date</th>
                  <th>Product</th>
                  <th>Reason</th>
                  <th style={{width: 80}}>Class</th>
                  <th>Firm</th>
                  <th style={{width: 110}}>Area</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a, i) => (
                  <tr key={i}>
                    <td style={{whiteSpace: 'nowrap', fontWeight: 600, color: '#fff'}}>{a.report_date}</td>
                    <td className="mi-bold" style={{whiteSpace: 'normal', lineHeight: 1.4}}>{a.brand_name || '-'}</td>
                    <td style={{whiteSpace: 'normal', lineHeight: 1.4, color: '#ccc', fontSize: 13}}>{a.reason || '-'}</td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                        background: a.classification === 'Class I' ? 'rgba(239, 68, 68, 0.15)' : a.classification === 'Class II' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(255,255,255,0.08)',
                        color: a.classification === 'Class I' ? '#f87171' : a.classification === 'Class II' ? '#fbbf24' : '#8a8a8a',
                      }}>{a.classification || '-'}</span>
                    </td>
                    <td>{a.recalling_firm || '-'}</td>
                    <td>{a.therapeutic_area ? <span className="mi-area-tag" style={getAreaStyle(a.therapeutic_area)}>{a.therapeutic_area}</span> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default FDAAlerts;