import React, { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from '../../config/api';

const KOLInsights = ({ searchTerm }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('manufacturers');
  const [selectedManufacturer, setSelectedManufacturer] = useState(null);
  const [manufacturerDetail, setManufacturerDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showTopN, setShowTopN] = useState(25);
  const [showTopNOpen, setShowTopNOpen] = useState(false);
  const topNRef = useRef(null);
  const rowsPerPage = 25;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (topNRef.current && !topNRef.current.contains(event.target)) {
        setShowTopNOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  useEffect(() => {
    setPage(1);
  }, [subTab, searchTerm]);

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

  const handleExport = () => {
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

  const filteredManufacturers = data.manufacturers?.filter(m => {
    if (!searchTerm) return true;
    return m.manufacturer_name?.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  const filteredSpecialties = data.specialties || [];

  const getSubtabTitle = () => {
    if (subTab === 'manufacturers') return `Manufacturers by HCP Spend (${filteredManufacturers.length})`;
    if (subTab === 'specialties') return `By Specialty (${filteredSpecialties.length})`;
    if (subTab === 'detail' && selectedManufacturer) return `${selectedManufacturer} - KOLs (${manufacturerDetail?.total_hcps?.toLocaleString() || '...'})`;
    return '';
  };

  const mfrPaginated = filteredManufacturers.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const mfrTotalPages = Math.ceil(filteredManufacturers.length / rowsPerPage);

  return (
    <div className="mi-tab-content">
      <div className="mi-section-header">
        <h3>KOL Insights</h3>
        {subTab === 'detail' && selectedManufacturer && (
          <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
            <span style={{color: '#0ff', fontWeight: 700, fontSize: 14}}>{manufacturerDetail?.total_in_audience?.toLocaleString() || 0} in our audience</span>
            <button className="mi-export-btn" onClick={handleExport}>Export All KOLs</button>
          </div>
        )}
      </div>

      <div className="mi-subtabs">
        <button className={`mi-subtab ${subTab === 'manufacturers' ? 'active' : ''}`}
          onClick={() => { setSubTab('manufacturers'); setSelectedManufacturer(null); setManufacturerDetail(null); setPage(1); }}>
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
        {subTab === 'detail' && (
          <div className="filter-control" ref={topNRef} style={{marginLeft: 'auto'}}>
            <label>Show:</label>
            <div className="custom-dropdown">
              <button className="custom-dropdown-trigger" onClick={() => setShowTopNOpen(!showTopNOpen)}>
                <span className="dropdown-value">Top {showTopN}</span>
                <svg className={`dropdown-arrow ${showTopNOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 12 12">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {showTopNOpen && (
                <div className="custom-dropdown-menu">
                  {[25, 50, 100, 250].map(n => (
                    <div key={n} className={`custom-dropdown-option ${showTopN === n ? 'selected' : ''}`}
                      onClick={() => { setShowTopN(n); setShowTopNOpen(false); }}>
                      <span>Top {n}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {subTab === 'manufacturers' && (
        <>
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
                {mfrPaginated.map((m, i) => (
                  <tr key={i} className="clickable-row" onClick={() => fetchManufacturerDetail(m.manufacturer_name)}>
                    <td className="mi-bold">{m.manufacturer_name}</td>
                    <td>{m.hcp_count?.toLocaleString()}</td>
                    <td>{formatCurrency(m.total_spend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {mfrTotalPages > 1 && (
            <div className="mi-pagination">
              <button disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span>Page {page} of {mfrTotalPages}</span>
              <button disabled={page === mfrTotalPages} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
        </>
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
              {filteredSpecialties.map((s, i) => (
                <tr key={i}>
                  <td>{s.specialty}</td>
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
              {manufacturerDetail.hcps?.slice(0, showTopN).map((h, i) => {
                const inAudience = manufacturerDetail.matched_to_audience?.some(m => m.npi === h.npi);
                return (
                  <tr key={i} className={inAudience ? 'row-in-audience' : ''}>
                    <td>{h.npi}</td>
                    <td className="mi-bold">{h.physician_name}</td>
                    <td>{h.specialty}</td>
                    <td>{formatCurrency(h.total_payments)}</td>
                    <td>{formatCurrency(h.avg_payment)}</td>
                    <td>{inAudience ? <span className="mi-audience-match">Yes</span> : <span className="mi-dim">No</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default KOLInsights;