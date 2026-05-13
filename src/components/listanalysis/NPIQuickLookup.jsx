import React, { useState } from 'react';
import { API_BASE_URL } from '../../config/api';
import '../../styles/NPIQuickLookup.css';
import '../../styles/SectionHeaders.css';
import { getSpecialtyFromTaxonomy } from './taxonomyMapping';
import TablePagination from '../common/TablePagination';

const PER_PAGE = 100;

const formatZipcode = (zip) => {
  if (!zip) return '';
  const cleaned = zip.toString().replace(/\D/g, '');
  if (cleaned.length >= 5) return cleaned.slice(0, 5);
  return zip;
};

const formatName = (name) => {
  if (!name) return '';
  return name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
};

const formatAddress = (address1, address2) => {
  const parts = [address1, address2].filter(p => p && p.trim());
  return parts.join(', ');
};

const isTaxonomyCode = (value) => {
  return value && /^\d{3}[A-Z0-9]{6}X$/.test(value);
};

const getSpecialty = (profile) => {
  if (profile.specialty && !isTaxonomyCode(profile.specialty)) {
    return profile.specialty;
  }
  const code = profile.taxonomy_code || profile.specialty;
  if (code) {
    const mapped = getSpecialtyFromTaxonomy(code);
    return mapped || "";
  }
  return "";
};

const NPIQuickLookup = () => {
  const [npiInput, setNpiInput] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hideNonActive, setHideNonActive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const handleLookup = async () => {
    if (!npiInput.trim()) {
      setError('Please enter at least one NPI number');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/npi/quick-lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          npis: npiInput
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        setResults(data);
      } else {
        setError(data.message || 'Lookup failed');
      }
    } catch (err) {
      setError('Failed to connect to server: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!results || !results.results || results.results.length === 0) {
      return;
    }

    const exportResults = hideNonActive
      ? results.results.filter(p => !p.provider_status || p.provider_status === 'Active')
      : results.results;

    if (exportResults.length === 0) return;

    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '""';
      const str = String(value);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = [
      'NPI',
      'First Name',
      'Last Name',
      'Specialty',
      'Address',
      'City',
      'State',
      'Zipcode',
      'Flag',
      'Source',
      'Status'
    ];

    const csvRows = [headers.map(h => escapeCSV(h)).join(',')];

    exportResults.forEach(profile => {
      const statusFlag = profile.provider_status && profile.provider_status !== 'Active'
        ? profile.provider_status : '';
      const addrFlag = profile.address_flag_event
        ? (profile.address_flag_event === 'undeliverable' ? 'Undeliverable' : 'Address flagged')
        : '';
      const flag = [statusFlag, addrFlag].filter(Boolean).join(' / ');
      const status = profile.source === 'Market'
        ? ''
        : (profile.audience_active === false ? 'Inactive' : (profile.audience_active ? 'Active' : ''));
      const row = [
        profile.npi || '',
        formatName(profile.first_name),
        formatName(profile.last_name),
        getSpecialty(profile),
        formatAddress(profile.address, profile.address_2),
        formatName(profile.city),
        profile.state || '',
        formatZipcode(profile.zipcode),
        flag,
        profile.source || '',
        status
      ];
      csvRows.push(row.map(cell => escapeCSV(cell)).join(','));
    });

    const csvContent = csvRows.join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `npi_lookup_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearLookup = () => {
    setNpiInput('');
    setResults(null);
    setError(null);
    setHideNonActive(false);
    setCurrentPage(1);
  };

  return (
    <>
      <div className="section-header-bar">
        <h3>NPI Lookup</h3>
        <button className="section-header-clear-btn" onClick={clearLookup}>Clear</button>
      </div>
      <div className="npi-quick-lookup">
      <textarea
        className="npi-input-textarea"
        placeholder="1234567890&#10;9876543210&#10;1122334455"
        value={npiInput}
        onChange={(e) => setNpiInput(e.target.value)}
        rows={8}
      />

      <div className="npi-lookup-actions">
        <button
          className="btn-primary"
          onClick={handleLookup}
        >
          {loading ? 'Looking up...' : 'Lookup NPIs'}
        </button>
      </div>

      {error && (
        <div className="npi-lookup-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {results && (() => {
        const allResults = results.results || [];
        const filteredResults = hideNonActive
          ? allResults.filter(p => !p.provider_status || p.provider_status === 'Active')
          : allResults;
        const hiddenCount = allResults.length - filteredResults.length;
        const totalCount = filteredResults.length;
        const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));
        const pageStart = (currentPage - 1) * PER_PAGE;
        const visibleData = filteredResults.slice(pageStart, pageStart + PER_PAGE);

        return (
          <div className="npi-lookup-results">
            <div className="results-summary-section">
              <p>
                Found <strong>{results.found}</strong> of <strong>{results.requested}</strong> NPIs
                {results.missing > 0 && (
                  <span className="missing-count"> ({results.missing} not found)</span>
                )}
              </p>
              {(results.owned_count > 0 || results.licensed_count > 0 || results.market_count > 0) && (
                <p className="source-breakdown">
                  <span className="source-owned">{results.owned_count || 0} Owned</span>
                  {' | '}
                  <span className="source-licensed">{results.licensed_count || 0} Licensed</span>
                  {' | '}
                  <span className="source-market">{results.market_count || 0} Market</span>
                </p>
              )}
              <label className="hide-non-active-toggle" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', marginTop: '4px' }}>
                <input
                  type="checkbox"
                  checked={hideNonActive}
                  onChange={(e) => setHideNonActive(e.target.checked)}
                />
                Hide non-active (retired, deceased, etc.)
                {hideNonActive && hiddenCount > 0 && (
                  <span style={{ color: '#888' }}>— {hiddenCount} hidden</span>
                )}
              </label>
            </div>

            {results.missing_npis && results.missing_npis.length > 0 && (
              <div className="missing-npis-notice">
                <strong>Missing NPIs:</strong> {results.missing_npis.join(', ')}
              </div>
            )}

            {totalCount > 0 && (
              <div className="results-data-section">
                <div className="table-header-row">
                  <h4>Results ({totalCount.toLocaleString()} profiles)</h4>
                  {totalCount > 0 && (
                    <button className="export-button" onClick={handleDownloadCSV}>Export CSV</button>
                  )}
                </div>

                <div className="results-table-container">
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th>NPI</th>
                        <th>First Name</th>
                        <th>Last Name</th>
                        <th>Specialty</th>
                        <th>Address</th>
                        <th>City</th>
                        <th>State</th>
                        <th>Zipcode</th>
                        <th>Flag</th>
                        <th>Source</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleData.map((profile, index) => {
                        const statusFlag = profile.provider_status && profile.provider_status !== 'Active'
                          ? profile.provider_status : '';
                        const addrFlag = profile.address_flag_event
                          ? (profile.address_flag_event === 'undeliverable' ? 'Undeliverable' : 'Address flagged')
                          : '';
                        const addrTooltip = profile.address_flag_reason || '';
                        const isMarket = profile.source === 'Market';
                        const audienceActive = profile.audience_active;
                        return (
                        <tr key={index}>
                          <td className="npi-cell">{profile.npi}</td>
                          <td>{formatName(profile.first_name)}</td>
                          <td>{formatName(profile.last_name)}</td>
                          <td>{getSpecialty(profile) || 'N/A'}</td>
                          <td>{formatAddress(profile.address, profile.address_2)}</td>
                          <td>{formatName(profile.city)}</td>
                          <td>{profile.state}</td>
                          <td>{formatZipcode(profile.zipcode)}</td>
                          <td>
                            {statusFlag && (
                              <span className="status-badge inactive" style={{ marginRight: 4 }}>
                                {statusFlag}
                              </span>
                            )}
                            {addrFlag && (
                              <span
                                className="status-badge inactive"
                                title={addrTooltip}
                                style={{ background: 'rgba(239,68,68,0.15)', borderColor: '#ef4444', color: '#fca5a5' }}
                              >
                                {addrFlag}
                              </span>
                            )}
                          </td>
                          <td>
                            <span className={`source-badge ${profile.source ? profile.source.toLowerCase() : 'unknown'}`}>
                              {profile.source || 'N/A'}
                            </span>
                          </td>
                          <td>
                            {!isMarket && audienceActive !== null && audienceActive !== undefined && (
                              <span className={`status-badge ${audienceActive ? 'active' : 'inactive'}`}>
                                {audienceActive ? 'Active' : 'Inactive'}
                              </span>
                            )}
                          </td>
                        </tr>
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
            )}
          </div>
        );
      })()}
    </div>
    </>
  );
};

export default NPIQuickLookup;