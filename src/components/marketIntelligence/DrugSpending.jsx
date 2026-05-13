import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';
import LastUpdatedTag from './LastUpdatedTag';
import { matchesSearchTerm } from '../../utils/searchUtils';
import TablePagination from '../common/TablePagination';
import exportTableCSV from '../../utils/exportTableCSV';

const PER_PAGE = 100;

const DrugSpending = ({ searchTerm, onSelectCompany, lastUpdated }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('drugs');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/market-intelligence/drug-spending?limit=500`);
        const json = await res.json();
        if (json.status === 'success') {
          setData(json);
        }
      } catch (err) {}
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => { setCurrentPage(1); }, [subTab, searchTerm]);

  const formatCurrency = (num) => {
    if (!num) return '$0';
    if (num >= 1e9) return '$' + (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return '$' + (num / 1e3).toFixed(1) + 'K';
    return '$' + num.toFixed(0);
  };

  if (loading) {
    return <div className="mi-loading"><div className="loading-spinner"></div><p>Loading drug spending data...</p></div>;
  }

  if (!data || data.total === 0) {
    return (
      <div className="mi-tab-content">
        <div className="mi-section-header"><h3>Drug Spending</h3></div>
        <div className="mi-empty"><h3>No Drug Spending Data</h3><p>Run drug_spending_loader.py to pull Medicare Part D spending data.</p></div>
      </div>
    );
  }

  const filteredDrugs = data.drugs?.filter(d =>
    matchesSearchTerm(d.brand_name, searchTerm) ||
    matchesSearchTerm(d.generic_name, searchTerm) ||
    matchesSearchTerm(d.manufacturer, searchTerm)
  ) || [];

  const filteredMfrs = data.by_manufacturer?.filter(m =>
    matchesSearchTerm(m.manufacturer, searchTerm)
  ) || [];

  const currentData = subTab === 'drugs' ? filteredDrugs : filteredMfrs;
  const totalPages = Math.max(1, Math.ceil(currentData.length / PER_PAGE));
  const pageStart = (currentPage - 1) * PER_PAGE;
  const visible = currentData.slice(pageStart, pageStart + PER_PAGE);

  const handleExport = () => {
    if (subTab === 'drugs') {
      const headers = ['Brand', 'Generic', 'Manufacturer', 'Total Spending', 'Claims', 'Beneficiaries', 'Avg/Claim'];
      const rows = filteredDrugs.map(d => [
        d.brand_name || '',
        d.generic_name || '',
        d.manufacturer || '',
        d.total_spending || 0,
        d.total_claims || 0,
        d.total_beneficiaries || 0,
        d.avg_spending_per_claim || 0,
      ]);
      exportTableCSV('drug_spending_drugs', headers, rows);
    } else {
      const headers = ['Manufacturer', 'Total Drug Spending', 'Drug Count'];
      const rows = filteredMfrs.map(m => [m.manufacturer || '', m.total || 0, m.drug_count || 0]);
      exportTableCSV('drug_spending_manufacturers', headers, rows);
    }
  };

  return (
    <div className="mi-tab-content">
      <div className="mi-section-header">
        <h3>Drug Spending</h3>
        <LastUpdatedTag date={lastUpdated} />
      </div>

      <div className="mi-subtabs">
        <button className={`mi-subtab ${subTab === 'drugs' ? 'active' : ''}`} onClick={() => setSubTab('drugs')}>
          Top Drugs ({filteredDrugs.length})
        </button>
        <button className={`mi-subtab ${subTab === 'manufacturers' ? 'active' : ''}`} onClick={() => setSubTab('manufacturers')}>
          By Manufacturer ({filteredMfrs.length})
        </button>
        {currentData.length > 0 && (
          <button className="export-button" style={{ marginLeft: 'auto' }} onClick={handleExport}>Export CSV</button>
        )}
      </div>

      {subTab === 'drugs' && (
        <div className="table-section">
          <table>
            <thead>
              <tr>
                <th>Brand</th>
                <th>Generic</th>
                <th>Manufacturer</th>
                <th>Total Spending</th>
                <th>Claims</th>
                <th>Beneficiaries</th>
                <th>Avg/Claim</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((d, i) => (
                <tr key={i}>
                  <td className="mi-bold">{d.brand_name}</td>
                  <td>{d.generic_name}</td>
                  <td className="mi-company-link" onClick={() => onSelectCompany(d.manufacturer)}>{d.manufacturer}</td>
                  <td className="mi-highlight">{formatCurrency(d.total_spending)}</td>
                  <td>{d.total_claims?.toLocaleString()}</td>
                  <td>{d.total_beneficiaries?.toLocaleString()}</td>
                  <td>{formatCurrency(d.avg_spending_per_claim)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'manufacturers' && (
        <div className="table-section">
          <table>
            <thead>
              <tr>
                <th>Manufacturer</th>
                <th>Total Drug Spending</th>
                <th>Drug Count</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((m, i) => (
                <tr key={i}>
                  <td className="mi-bold mi-company-link" onClick={() => onSelectCompany(m.manufacturer)}>{m.manufacturer}</td>
                  <td className="mi-highlight">{formatCurrency(m.total)}</td>
                  <td>{m.drug_count}</td>
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

export default DrugSpending;