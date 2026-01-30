import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { API_BASE_URL } from '../../config/api';
import '../../styles/NPIQuickLookup.css';
import { getSpecialtyFromTaxonomy } from './taxonomyMapping';

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

const NPIQuickLookup = forwardRef((props, ref) => {
  const [npiInput, setNpiInput] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tableState, setTableState] = useState({
    displayCount: 10,
    isFullyExpanded: false
  });

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
      'Is Active',
      'Source'
    ];

    const csvRows = [headers.map(h => escapeCSV(h)).join(',')];

    results.results.forEach(profile => {
      const row = [
        profile.npi || '',
        formatName(profile.first_name),
        formatName(profile.last_name),
        getSpecialty(profile),
        formatAddress(profile.address, profile.address_2),
        formatName(profile.city),
        profile.state || '',
        formatZipcode(profile.zipcode),
        profile.is_active ? 'Yes' : 'No',
        profile.source || ''
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
    setTableState({
      displayCount: 10,
      isFullyExpanded: false
    });
  };

  useImperativeHandle(ref, () => ({
    clearLookup
  }));

  return (
    <div className="npi-quick-lookup">
      <h2>NPI Quick Lookup</h2>

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
        const totalCount = allResults.length;
        const displayLimit = tableState.isFullyExpanded ? totalCount : tableState.displayCount;
        const visibleData = allResults.slice(0, displayLimit);
        const hasMore = totalCount > visibleData.length;

        return (
          <div className="npi-lookup-results">
            <div className="results-summary-section">
              <p>
                Found <strong>{results.found}</strong> of <strong>{results.requested}</strong> NPIs
                {results.missing > 0 && (
                  <span className="missing-count"> ({results.missing} not found)</span>
                )}
              </p>
              {(results.audience_count > 0 || results.market_count > 0) && (
                <p className="source-breakdown">
                  <span className="source-audience">{results.audience_count || 0} from Audience</span>
                  {' | '}
                  <span className="source-market">{results.market_count || 0} from Market</span>
                </p>
              )}
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
                  <div className="table-action-buttons">
                    {totalCount > 10 && (
                      <button
                        className="btn-expand-table"
                        onClick={() => setTableState(prev => ({
                          ...prev,
                          isFullyExpanded: !prev.isFullyExpanded,
                          displayCount: prev.isFullyExpanded ? 10 : totalCount
                        }))}
                      >
                        {tableState.isFullyExpanded ? 'Collapse' : 'Expand All'}
                      </button>
                    )}
                    <button
                      className="btn-export"
                      onClick={handleDownloadCSV}
                      disabled={totalCount === 0}
                    >
                      Export
                    </button>
                  </div>
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
                        <th>Status</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleData.map((profile, index) => (
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
                            <span className={`status-badge ${profile.is_active ? 'active' : 'inactive'}`}>
                              {profile.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <span className={`source-badge ${profile.source === 'Audience' ? 'audience' : 'market'}`}>
                              {profile.source || 'N/A'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {hasMore && !tableState.isFullyExpanded && (
                  <div className="load-more-container">
                    <button
                      className="btn-load-more"
                      onClick={() => setTableState(prev => ({
                        ...prev,
                        displayCount: prev.displayCount + 10
                      }))}
                    >
                      Load More ({visibleData.length} of {totalCount})
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
});

export default NPIQuickLookup;