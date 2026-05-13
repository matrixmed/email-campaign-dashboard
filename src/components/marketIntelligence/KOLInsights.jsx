import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../../config/api';
import LastUpdatedTag from './LastUpdatedTag';
import { matchesSearchTerm } from '../../utils/searchUtils';
import TablePagination from '../common/TablePagination';
import exportTableCSV from '../../utils/exportTableCSV';

const PER_PAGE = 100;

const cleanSpecialty = (raw) => {
  if (!raw) return '';
  const parts = raw.split('|');
  return parts[parts.length - 1].trim();
};

const KOLInsights = ({ searchTerm, onSelectCompany, lastUpdated }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('manufacturers');
  const [selectedManufacturer, setSelectedManufacturer] = useState(null);
  const [manufacturerDetail, setManufacturerDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => { setCurrentPage(1); }, [subTab, selectedManufacturer, searchTerm]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/market-intelligence/open-payments?limit=100`);
        const json = await res.json();
        if (json.status === 'success') {
          setData(json);
        }
      } catch (err) {}
      setLoading(false);
    };
    fetchData();
  }, []);

  const fetchManufacturerDetail = useCallback(async (name) => {
    setDetailLoading(true);
    setSelectedManufacturer(name);
    setSubTab('detail');
    try {
      const res = await fetch(`${API_BASE_URL}/api/market-intelligence/open-payments/manufacturer/${encodeURIComponent(name)}`);
      const json = await res.json();
      if (json.status === 'success') {
        setManufacturerDetail(json);
      }
    } catch (err) {}
    setDetailLoading(false);
  }, []);

  const handleDetailExport = () => {
    if (!selectedManufacturer) return;
    window.open(`${API_BASE_URL}/api/market-intelligence/open-payments/manufacturer/${encodeURIComponent(selectedManufacturer)}/export`, '_blank');
  };

  const formatCurrency = (num) => {
    if (!num && num !== 0) return '$0';
    if (num >= 1000000) return '$' + (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return '$' + (num / 1000).toFixed(1) + 'K';
    return '$' + num.toFixed(0);
  };

  if (loading) {
    return <div className="mi-loading"><div className="loading-spinner"></div><p>Loading KOL data...</p></div>;
  }

  if (!data || !data.summary || data.summary.total_records === 0) {
    return (
      <div className="mi-tab-content">
        <div className="mi-empty"><h3>No Open Payments Data</h3><p>Run the open_payments_loader.py script to load CMS Sunshine Act data.</p></div>
      </div>
    );
  }

  const filteredManufacturers = data.manufacturers?.filter(m =>
    matchesSearchTerm(m.manufacturer_name, searchTerm)
  ) || [];

  const filteredSpecialties = data.specialties || [];

  const detailHcps = manufacturerDetail?.hcps || [];

  let pagedSource = [];
  if (subTab === 'manufacturers') pagedSource = filteredManufacturers;
  else if (subTab === 'specialties') pagedSource = filteredSpecialties;
  else if (subTab === 'detail') pagedSource = detailHcps;
  const totalPages = Math.max(1, Math.ceil(pagedSource.length / PER_PAGE));
  const pageStart = (currentPage - 1) * PER_PAGE;
  const visibleManufacturers = filteredManufacturers.slice(pageStart, pageStart + PER_PAGE);
  const visibleSpecialties = filteredSpecialties.slice(pageStart, pageStart + PER_PAGE);
  const visibleDetailHcps = detailHcps.slice(pageStart, pageStart + PER_PAGE);

  const handleExportCurrent = () => {
    if (subTab === 'manufacturers') {
      const headers = ['Manufacturer', 'HCPs Paid', 'Total Spend'];
      const rows = filteredManufacturers.map(m => [m.manufacturer_name || '', m.hcp_count || 0, m.total_spend || 0]);
      exportTableCSV('kol_manufacturers', headers, rows);
    } else if (subTab === 'specialties') {
      const headers = ['Specialty', 'HCP Count', 'Total Spend'];
      const rows = filteredSpecialties.map(s => [cleanSpecialty(s.specialty), s.hcp_count || 0, s.total_spend || 0]);
      exportTableCSV('kol_specialties', headers, rows);
    } else if (subTab === 'detail') {
      handleDetailExport();
    }
  };

  return (
    <div className="mi-tab-content">
      <div className="mi-section-header">
        <h3>KOL Insights</h3>
        {subTab !== 'detail' && <LastUpdatedTag date={lastUpdated} />}
        {subTab === 'detail' && selectedManufacturer && (
          <span style={{color: '#0ff', fontWeight: 700, fontSize: 14}}>{manufacturerDetail?.total_in_audience?.toLocaleString() || 0} in our audience</span>
        )}
      </div>

      <div className="mi-subtabs">
        <button className={`mi-subtab ${subTab === 'manufacturers' ? 'active' : ''}`}
          onClick={() => { setSubTab('manufacturers'); setSelectedManufacturer(null); setManufacturerDetail(null); }}>
          Manufacturers
        </button>
        <button className={`mi-subtab ${subTab === 'specialties' ? 'active' : ''}`}
          onClick={() => { setSubTab('specialties'); setSelectedManufacturer(null); setManufacturerDetail(null); }}>
          By Specialty
        </button>
        {subTab === 'detail' && selectedManufacturer && (
          <button className="mi-subtab active">
            {selectedManufacturer}
          </button>
        )}
        {pagedSource.length > 0 && (
          <button className="export-button" style={{ marginLeft: 'auto' }} onClick={handleExportCurrent}>
            {subTab === 'detail' ? 'Export All KOLs' : 'Export CSV'}
          </button>
        )}
      </div>

      {subTab === 'manufacturers' && (
        <div className="table-section">
          <table>
            <thead>
              <tr>
                <th>Manufacturer</th>
                <th>HCPs Paid</th>
                <th>Total Spend</th>
              </tr>
            </thead>
            <tbody>
              {visibleManufacturers.map((m, i) => (
                <tr key={i} className="clickable-row" onClick={() => fetchManufacturerDetail(m.manufacturer_name)}>
                  <td className="mi-bold mi-company-link" onClick={(e) => { e.stopPropagation(); onSelectCompany(m.manufacturer_name); }}>{m.manufacturer_name}</td>
                  <td>{m.hcp_count?.toLocaleString()}</td>
                  <td>{formatCurrency(m.total_spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'specialties' && (
        <div className="table-section">
          <table>
            <thead>
              <tr>
                <th>Specialty</th>
                <th>HCP Count</th>
                <th>Total Spend</th>
              </tr>
            </thead>
            <tbody>
              {visibleSpecialties.map((s, i) => (
                <tr key={i}>
                  <td>{cleanSpecialty(s.specialty)}</td>
                  <td>{s.hcp_count?.toLocaleString()}</td>
                  <td>{formatCurrency(s.total_spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {subTab === 'detail' && detailLoading && (
        <div className="mi-loading"><div className="loading-spinner"></div></div>
      )}

      {subTab === 'detail' && manufacturerDetail && !detailLoading && (
        <>
        <div className="table-section">
          <table>
            <thead>
              <tr>
                <th>NPI</th>
                <th>Name</th>
                <th>Specialty</th>
                <th>Total Payments</th>
                <th>Avg Payment</th>
                <th>In Audience</th>
              </tr>
            </thead>
            <tbody>
              {visibleDetailHcps.map((h, i) => {
                const matchedRow = manufacturerDetail.matched_to_audience?.find(m => m.npi === h.npi);
                const inAudience = !!matchedRow;
                const sourceLabel = matchedRow?.source || (inAudience ? 'Yes' : null);
                return (
                  <tr key={i} className={inAudience ? 'row-in-audience' : ''}>
                    <td>{h.npi}</td>
                    <td className="mi-bold">{h.physician_name}</td>
                    <td>{cleanSpecialty(h.specialty)}</td>
                    <td>{formatCurrency(h.total_payments)}</td>
                    <td>{formatCurrency(h.avg_payment)}</td>
                    <td>{inAudience ? <span className="mi-audience-match">{sourceLabel}</span> : <span className="mi-dim">No</span>}</td>
                  </tr>
                );
              })}
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

export default KOLInsights;