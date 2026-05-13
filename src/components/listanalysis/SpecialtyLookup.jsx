import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../../config/api';
import { matchesSearchTerm } from '../../utils/searchUtils';
import '../../styles/NPIQuickLookup.css';
import '../../styles/SectionHeaders.css';
import '../../styles/AudienceQueryBuilder.css';
import '../../styles/SpecialtyLookup.css';
import taxonomyMap, { getSpecialtyFromTaxonomy } from './taxonomyMapping';
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
    return mapped || '';
  }
  return '';
};

const baseSpecialty = (specialty) => {
  if (!specialty) return '';
  return specialty.split(' - ')[0].trim();
};

const SpecialtyLookup = () => {
  const [specialties, setSpecialties] = useState([]);
  const [specialtiesLoading, setSpecialtiesLoading] = useState(true);
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);
  const [showSpecialtySelector, setShowSpecialtySelector] = useState(false);
  const [specialtySearchTerm, setSpecialtySearchTerm] = useState('');

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hideNonActive, setHideNonActive] = useState(false);
  const [resultsPage, setResultsPage] = useState(1);
  const [countsPage, setCountsPage] = useState(1);

  const [counts, setCounts] = useState(null);
  const [countsLoading, setCountsLoading] = useState(false);
  const [countsError, setCountsError] = useState(null);
  const [countsMergeMode, setCountsMergeMode] = useState(false);
  const [countsOnlyOwned, setCountsOnlyOwned] = useState(false);
  const [countsOnlyActive, setCountsOnlyActive] = useState(false);
  const [countsSortColumn, setCountsSortColumn] = useState('universal_count');
  const [countsSortDirection, setCountsSortDirection] = useState('desc');

  useEffect(() => {
    const fetchSpecialties = async () => {
      setSpecialtiesLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/users/specialties?merge=false`);
        if (response.ok) {
          const data = await response.json();
          setSpecialties(data.specialties || []);
        }
      } catch (err) {
        // silent
      } finally {
        setSpecialtiesLoading(false);
      }
    };
    fetchSpecialties();
  }, []);

  const specialtyToTaxonomyCodes = useMemo(() => {
    const map = {};
    Object.entries(taxonomyMap || {}).forEach(([code, text]) => {
      if (!text) return;
      if (!map[text]) map[text] = [];
      map[text].push(code);
    });
    return map;
  }, []);

  const handleSpecialtyToggle = (specialty) => {
    setSelectedSpecialties(prev => {
      const isSelected = prev.includes(specialty);
      return isSelected
        ? prev.filter(s => s !== specialty)
        : [...prev, specialty];
    });
  };

  const handleSelectAllSpecialties = () => {
    const filtered = specialties.filter(spec =>
      matchesSearchTerm(spec, specialtySearchTerm)
    );
    setSelectedSpecialties(filtered);
  };

  const handleClearAllSpecialties = () => {
    setSelectedSpecialties([]);
  };

  const filteredSpecialties = specialties.filter(spec =>
    matchesSearchTerm(spec, specialtySearchTerm)
  );

  const handleLookup = async () => {
    if (selectedSpecialties.length === 0) {
      setError('Please select at least one specialty');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    const taxonomyCodes = [];
    selectedSpecialties.forEach(s => {
      const codes = specialtyToTaxonomyCodes[s] || [];
      codes.forEach(c => taxonomyCodes.push(c));
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/npi/specialty-lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          specialties: selectedSpecialties,
          taxonomy_codes: taxonomyCodes
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

  const handleLoadCounts = async () => {
    setCountsLoading(true);
    setCountsError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/npi/specialty-counts`);
      const data = await response.json();
      if (data.status === 'success') {
        setCounts(data);
      } else {
        setCountsError(data.message || 'Failed to load counts');
      }
    } catch (err) {
      setCountsError('Failed to connect to server: ' + err.message);
    } finally {
      setCountsLoading(false);
    }
  };

  const handleSortCounts = (column) => {
    if (countsSortColumn === column) {
      setCountsSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setCountsSortColumn(column);
      setCountsSortDirection(column === 'specialty' ? 'asc' : 'desc');
    }
  };

  const aggregatedCounts = useMemo(() => {
    if (!counts) return [];
    const pick = (row) => countsOnlyActive ? (row.count_active || 0) : (row.count || 0);

    const universalBySpecialty = {};
    (counts.universal_taxonomy_counts || []).forEach((row) => {
      const text = (taxonomyMap && taxonomyMap[row.taxonomy_code]) || '';
      if (!text) return;
      const key = countsMergeMode ? baseSpecialty(text) : text;
      universalBySpecialty[key] = (universalBySpecialty[key] || 0) + pick(row);
    });

    const ownedBySpecialty = {};
    (counts.owned_specialty_counts || []).forEach((row) => {
      if (!row.specialty) return;
      const key = countsMergeMode ? baseSpecialty(row.specialty) : row.specialty;
      ownedBySpecialty[key] = (ownedBySpecialty[key] || 0) + pick(row);
    });

    const licensedBySpecialty = {};
    (counts.licensed_specialty_counts || []).forEach((row) => {
      if (!row.specialty) return;
      const key = countsMergeMode ? baseSpecialty(row.specialty) : row.specialty;
      licensedBySpecialty[key] = (licensedBySpecialty[key] || 0) + pick(row);
    });

    const allKeys = new Set([
      ...Object.keys(universalBySpecialty),
      ...Object.keys(ownedBySpecialty),
      ...Object.keys(licensedBySpecialty)
    ]);

    const rows = [];
    allKeys.forEach(key => {
      const owned = ownedBySpecialty[key] || 0;
      const licensed = licensedBySpecialty[key] || 0;
      rows.push({
        specialty: key,
        universal_count: universalBySpecialty[key] || 0,
        owned_count: owned,
        licensed_count: licensed,
        audience_count: owned + licensed
      });
    });

    rows.sort((a, b) => {
      if (countsSortColumn === 'specialty') {
        const av = (a.specialty || '').toLowerCase();
        const bv = (b.specialty || '').toLowerCase();
        if (av < bv) return countsSortDirection === 'asc' ? -1 : 1;
        if (av > bv) return countsSortDirection === 'asc' ? 1 : -1;
        return 0;
      }
      const av = a[countsSortColumn] || 0;
      const bv = b[countsSortColumn] || 0;
      return countsSortDirection === 'asc' ? (av - bv) : (bv - av);
    });

    return rows;
  }, [counts, countsMergeMode, countsOnlyActive, countsSortColumn, countsSortDirection]);

  const handleDownloadCSV = () => {
    if (!results || !results.results || results.results.length === 0) return;

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
      'NPI', 'First Name', 'Last Name', 'Specialty', 'Address', 'City',
      'State', 'Zipcode', 'Flag', 'Source', 'Status'
    ];
    const csvRows = [headers.map(h => escapeCSV(h)).join(',')];
    exportResults.forEach(profile => {
      const flag = profile.provider_status && profile.provider_status !== 'Active'
        ? profile.provider_status : '';
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

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `specialty_lookup_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadCountsCSV = () => {
    if (!aggregatedCounts || aggregatedCounts.length === 0) return;

    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '""';
      const str = String(value);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const headers = countsOnlyOwned
      ? ['Specialty', 'Market Universe', 'Owned', 'Coverage %']
      : ['Specialty', 'Market Universe', 'Licensed', 'Owned', 'Coverage %'];
    const csvRows = [headers.map(h => escapeCSV(h)).join(',')];
    aggregatedCounts.forEach(row => {
      const numerator = countsOnlyOwned ? row.owned_count : (row.owned_count + row.licensed_count);
      const coverage = row.universal_count > 0
        ? ((numerator / row.universal_count) * 100).toFixed(2)
        : '0.00';
      const cells = countsOnlyOwned
        ? [row.specialty, row.universal_count, row.owned_count, coverage]
        : [row.specialty, row.universal_count, row.licensed_count, row.owned_count, coverage];
      csvRows.push(cells.map(c => escapeCSV(c)).join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `specialty_counts_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearLookup = () => {
    setSelectedSpecialties([]);
    setResults(null);
    setError(null);
    setHideNonActive(false);
    setResultsPage(1);
    setCountsPage(1);
    setCounts(null);
    setCountsError(null);
    setCountsMergeMode(false);
    setCountsOnlyOwned(false);
    setCountsOnlyActive(false);
  };

  return (
    <>
      <div className="section-header-bar">
        <h3>Specialty Lookup</h3>
        <button className="section-header-clear-btn" onClick={clearLookup}>Clear</button>
      </div>
      <div className="npi-quick-lookup specialty-lookup">

        <div className="specialty-lookup-form">
          <button
            type="button"
            className="selector-button"
            onClick={() => setShowSpecialtySelector(true)}
          >
            {selectedSpecialties.length === 0
              ? 'Select Specialties'
              : `${selectedSpecialties.length} Specialt${selectedSpecialties.length !== 1 ? 'ies' : 'y'} Selected`
            }
          </button>
          {selectedSpecialties.length > 0 && (
            <div className="specialty-lookup-chips">
              {selectedSpecialties.map(s => (
                <span key={s} className="specialty-chip">
                  {s}
                  <button
                    type="button"
                    className="specialty-chip-remove"
                    onClick={() => handleSpecialtyToggle(s)}
                    aria-label={`Remove ${s}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="npi-lookup-actions specialty-lookup-actions">
          <button
            className="btn-primary"
            onClick={handleLookup}
          >
            {loading ? 'Looking up...' : 'Lookup NPIs'}
          </button>
          <button
            className="btn-secondary-subtle"
            onClick={() => handleLoadCounts()}
            disabled={countsLoading}
          >
            {countsLoading ? 'Calculating...' : 'Calculate Specialty Counts'}
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
          const pageStart = (resultsPage - 1) * PER_PAGE;
          const visibleData = filteredResults.slice(pageStart, pageStart + PER_PAGE);

          const ownedShown = filteredResults.filter(r => r.source === 'Owned').length;
          const licensedShown = filteredResults.filter(r => r.source === 'Licensed').length;
          const marketShown = filteredResults.filter(r => r.source === 'Market').length;

          return (
            <div className="npi-lookup-results">
              <div className="results-summary-section">
                <p>
                  Found <strong>{totalCount.toLocaleString()}</strong> NPIs across{' '}
                  <strong>{(results.specialties || []).length}</strong> specialt
                  {(results.specialties || []).length !== 1 ? 'ies' : 'y'}
                </p>
                {(ownedShown > 0 || licensedShown > 0 || marketShown > 0) && (
                  <p className="source-breakdown">
                    <span className="source-owned">{ownedShown} Owned</span>
                    {' | '}
                    <span className="source-licensed">{licensedShown} Licensed</span>
                    {' | '}
                    <span className="source-market">{marketShown} Market</span>
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
                          const flag = profile.provider_status && profile.provider_status !== 'Active'
                            ? profile.provider_status : '';
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
                                {flag && (
                                  <span className="status-badge inactive">{flag}</span>
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
                    currentPage={resultsPage}
                    totalPages={totalPages}
                    onPageChange={setResultsPage}
                  />
                </div>
              )}
            </div>
          );
        })()}

        {countsError && (
          <div className="npi-lookup-error">
            <strong>Error:</strong> {countsError}
          </div>
        )}

        {counts && (
          <div className="npi-lookup-results">
            <div className="results-summary-section">
              <p>
                <strong>{(countsOnlyActive ? counts.universal_total_active : counts.universal_total).toLocaleString()}</strong> HCPs in Market Universe ·{' '}
                <strong>{(countsOnlyActive ? (counts.owned_total_active || 0) : (counts.owned_total || 0)).toLocaleString()}</strong> Owned ·{' '}
                <strong>{(countsOnlyActive ? (counts.licensed_total_active || 0) : (counts.licensed_total || 0)).toLocaleString()}</strong> Licensed ·{' '}
                <strong>{aggregatedCounts.length.toLocaleString()}</strong> specialt
                {aggregatedCounts.length !== 1 ? 'ies' : 'y'}
              </p>
              <div className="counts-toggles-row">
                <label className="hide-non-active-toggle" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={countsMergeMode}
                    onChange={(e) => setCountsMergeMode(e.target.checked)}
                  />
                  Merge subspecialties
                </label>
                <label className="hide-non-active-toggle" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={countsOnlyOwned}
                    onChange={(e) => setCountsOnlyOwned(e.target.checked)}
                  />
                  Only Owned
                </label>
                <label className="hide-non-active-toggle" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={countsOnlyActive}
                    onChange={(e) => setCountsOnlyActive(e.target.checked)}
                  />
                  Only Active
                </label>
              </div>
            </div>

            <div className="results-data-section">
              <div className="table-header-row">
                <h4>Specialty Counts ({aggregatedCounts.length.toLocaleString()})</h4>
                {aggregatedCounts.length > 0 && (
                  <button className="export-button" onClick={handleDownloadCountsCSV}>Export CSV</button>
                )}
              </div>

              <div className="results-table-container">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th className="sortable" onClick={() => handleSortCounts('specialty')}>
                        Specialty {countsSortColumn === 'specialty' && (countsSortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th className="sortable" onClick={() => handleSortCounts('universal_count')}>
                        Market Universe {countsSortColumn === 'universal_count' && (countsSortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      {!countsOnlyOwned && (
                        <th className="sortable" onClick={() => handleSortCounts('licensed_count')}>
                          Licensed {countsSortColumn === 'licensed_count' && (countsSortDirection === 'asc' ? '▲' : '▼')}
                        </th>
                      )}
                      <th className="sortable" onClick={() => handleSortCounts('owned_count')}>
                        Owned {countsSortColumn === 'owned_count' && (countsSortDirection === 'asc' ? '▲' : '▼')}
                      </th>
                      <th>Coverage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregatedCounts.slice((countsPage - 1) * PER_PAGE, countsPage * PER_PAGE).map((row, idx) => {
                      const numerator = countsOnlyOwned ? row.owned_count : (row.owned_count + row.licensed_count);
                      const coverage = row.universal_count > 0
                        ? (numerator / row.universal_count) * 100
                        : 0;
                      return (
                        <tr key={`${row.specialty}-${idx}`}>
                          <td>{row.specialty}</td>
                          <td>{row.universal_count.toLocaleString()}</td>
                          {!countsOnlyOwned && (
                            <td>{row.licensed_count.toLocaleString()}</td>
                          )}
                          <td>{row.owned_count.toLocaleString()}</td>
                          <td>{coverage.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <TablePagination
                currentPage={countsPage}
                totalPages={Math.max(1, Math.ceil(aggregatedCounts.length / PER_PAGE))}
                onPageChange={setCountsPage}
              />
            </div>
          </div>
        )}
      </div>

      {showSpecialtySelector && (
        <div className="aqb-modal-overlay" onClick={() => setShowSpecialtySelector(false)}>
          <div className="aqb-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="aqb-modal-header">
              <h2>Select Specialties</h2>
              <button
                className="aqb-modal-close"
                onClick={() => setShowSpecialtySelector(false)}
              >
                ×
              </button>
            </div>

            <div className="aqb-modal-search">
              <input
                type="text"
                placeholder="Search specialties"
                value={specialtySearchTerm}
                onChange={(e) => setSpecialtySearchTerm(e.target.value)}
                className="aqb-search-input"
              />
            </div>

            <div className="aqb-modal-actions">
              <button
                type="button"
                onClick={handleSelectAllSpecialties}
                className="aqb-action-button select-all"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearAllSpecialties}
                className="aqb-action-button clear-all"
              >
                Clear All
              </button>
              <div className="aqb-selection-count">
                {selectedSpecialties.length} selected
              </div>
            </div>

            <div className="aqb-modal-list">
              {specialtiesLoading ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-secondary, #b8b8b8)' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    border: '2px solid #333',
                    borderTopColor: '#0ff',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    margin: '0 auto 12px'
                  }}></div>
                  <p style={{ fontSize: '13px', margin: 0 }}>Loading specialties...</p>
                </div>
              ) : filteredSpecialties.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary, #b8b8b8)' }}>
                  {specialties.length === 0 ? (
                    <p>No specialties found in the database.</p>
                  ) : (
                    <p>No matching specialties.</p>
                  )}
                </div>
              ) : (
                filteredSpecialties.map(specialty => {
                  const isSelected = selectedSpecialties.includes(specialty);
                  return (
                    <div
                      key={specialty}
                      className={`aqb-modal-list-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSpecialtyToggle(specialty)}
                    >
                      <div className="aqb-item-checkbox">
                        {isSelected && <span className="checkmark">✓</span>}
                      </div>
                      <div className="aqb-item-info">
                        <div className="aqb-item-name">{specialty}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="aqb-modal-footer">
              <button
                type="button"
                onClick={() => setShowSpecialtySelector(false)}
                className="aqb-done-button"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SpecialtyLookup;