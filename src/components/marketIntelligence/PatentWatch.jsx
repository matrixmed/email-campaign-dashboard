import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';
import LastUpdatedTag from './LastUpdatedTag';
import { matchesSearchTerm } from '../../utils/searchUtils';
import TablePagination from '../common/TablePagination';
import exportTableCSV from '../../utils/exportTableCSV';

const PER_PAGE = 100;

const PatentWatch = ({ searchTerm, onSelectCompany, lastUpdated }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('companies');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/market-intelligence/patent-expirations?years_ahead=3`);
        const json = await res.json();
        if (json.status === 'success') { setData(json); }
      } catch (err) {}
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => { setCurrentPage(1); }, [subTab, searchTerm]);

  if (loading) {
    return <div className="mi-loading"><div className="loading-spinner"></div><p>Loading patent data...</p></div>;
  }

  const filtered = data?.expirations?.filter(e =>
    matchesSearchTerm(e.drug_name, searchTerm) ||
    matchesSearchTerm(e.active_ingredient, searchTerm) ||
    matchesSearchTerm(e.applicant, searchTerm)
  ) || [];

  const filteredApplicants = data?.by_applicant?.filter(a =>
    matchesSearchTerm(a.applicant, searchTerm)
  ) || [];

  const activeData = subTab === 'companies' ? filteredApplicants : filtered;
  const totalPages = Math.max(1, Math.ceil(activeData.length / PER_PAGE));
  const pageStart = (currentPage - 1) * PER_PAGE;
  const applicantsVisible = filteredApplicants.slice(pageStart, pageStart + PER_PAGE);
  const expVisible = filtered.slice(pageStart, pageStart + PER_PAGE);

  const handleExport = () => {
    if (subTab === 'companies') {
      const headers = ['Company', 'Drugs Expiring', 'Earliest Expiry'];
      const rows = filteredApplicants.map(a => [a.applicant || '', a.drug_count || 0, a.earliest_expiry || '']);
      exportTableCSV('patent_watch_companies', headers, rows);
    } else {
      const headers = ['Expiry Date', 'Drug', 'Ingredient', 'Company'];
      const rows = filtered.map(e => [
        e.patent_expiration_date || '',
        e.drug_name || '',
        e.active_ingredient || '',
        e.applicant || '',
      ]);
      exportTableCSV('patent_watch_expirations', headers, rows);
    }
  };

  return (
    <div className="mi-tab-content">
      <div className="mi-section-header">
        <h3>Patent Watch</h3>
        <LastUpdatedTag date={lastUpdated} />
      </div>

      <div className="mi-subtabs">
        <button className={`mi-subtab ${subTab === 'companies' ? 'active' : ''}`} onClick={() => setSubTab('companies')}>
          By Company ({filteredApplicants.length})
        </button>
        <button className={`mi-subtab ${subTab === 'expirations' ? 'active' : ''}`} onClick={() => setSubTab('expirations')}>
          All Expirations ({filtered.length})
        </button>
        {activeData.length > 0 && (
          <button className="export-button" style={{ marginLeft: 'auto' }} onClick={handleExport}>Export CSV</button>
        )}
      </div>

      {subTab === 'companies' && (
        <div className="table-section">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Drugs Expiring</th>
                <th>Earliest Expiry</th>
              </tr>
            </thead>
            <tbody>
              {applicantsVisible.map((a, i) => (
                <tr key={i}>
                  <td className="mi-bold mi-company-link" onClick={() => onSelectCompany(a.applicant)}>{a.applicant}</td>
                  <td>{a.drug_count}</td>
                  <td>{a.earliest_expiry}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'expirations' && (
        <div className="table-section">
          <table>
            <thead>
              <tr>
                <th>Expiry Date</th>
                <th>Drug</th>
                <th>Ingredient</th>
                <th>Company</th>
              </tr>
            </thead>
            <tbody>
              {expVisible.map((e, i) => (
                <tr key={i}>
                  <td style={{whiteSpace: 'nowrap'}}>{e.patent_expiration_date}</td>
                  <td className="mi-bold">{e.drug_name}</td>
                  <td>{e.active_ingredient}</td>
                  <td className="mi-company-link" onClick={() => onSelectCompany(e.applicant)}>{e.applicant}</td>
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

export default PatentWatch;