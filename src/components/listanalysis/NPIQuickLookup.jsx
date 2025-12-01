import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { API_BASE_URL } from '../../config/api';
import '../../styles/NPIQuickLookup.css';

const formatZipcode = (zip) => {
  if (!zip) return '';
  const cleaned = zip.toString().replace(/\D/g, '');
  if (cleaned.length === 9) return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
  if (cleaned.length >= 5) return cleaned.slice(0, 5);
  return zip;
};

const NPIQuickLookup = forwardRef((props, ref) => {
  const [npiInput, setNpiInput] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

    const headers = [
      'NPI',
      'First Name',
      'Last Name',
      'Middle Name',
      'Organization',
      'Credential',
      'Specialty',
      'Taxonomy Code',
      'Address',
      'Address 2',
      'City',
      'State',
      'Zipcode',
      'Is Active',
      'Source',
      'Enumeration Date',
      'Last Update Date'
    ];

    const csvRows = [headers.join(',')];

    results.results.forEach(profile => {
      const row = [
        profile.npi || '',
        profile.first_name || '',
        profile.last_name || '',
        profile.middle_name || '',
        profile.organization_name || '',
        profile.credential || '',
        profile.specialty || '',
        profile.taxonomy_code || '',
        (profile.address || '').replace(/,/g, ' '),
        (profile.address_2 || '').replace(/,/g, ' '),
        profile.city || '',
        profile.state || '',
        formatZipcode(profile.zipcode),
        profile.is_active ? 'Yes' : 'No',
        profile.source || '',
        profile.enumeration_date || '',
        profile.last_update_date || ''
      ];
      csvRows.push(row.join(','));
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

      {results && (
        <div className="npi-lookup-results">
          <div className="results-header">
            <div className="results-summary">
              <h3>Results</h3>
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
            <button
              className="btn-download"
              onClick={handleDownloadCSV}
              disabled={results.results.length === 0}
            >
              Download CSV
            </button>
          </div>

          {results.missing_npis && results.missing_npis.length > 0 && (
            <div className="missing-npis-notice">
              <strong>Missing NPIs:</strong> {results.missing_npis.join(', ')}
            </div>
          )}

          <div className="results-table-container">
            <table className="results-table">
              <thead>
                <tr>
                  <th>NPI</th>
                  <th>Name</th>
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
                {results.results.map((profile, index) => (
                  <tr key={index}>
                    <td className="npi-cell">{profile.npi}</td>
                    <td>
                      {profile.organization_name ? (
                        <strong>{profile.organization_name}</strong>
                      ) : (
                        <>
                          {profile.first_name} {profile.last_name}
                          {profile.middle_name && ` ${profile.middle_name}`}
                        </>
                      )}
                    </td>
                    <td>{profile.specialty || 'N/A'}</td>
                    <td>
                      {profile.address}
                      {profile.address_2 && <>, {profile.address_2}</>}
                    </td>
                    <td>{profile.city}</td>
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
        </div>
      )}
    </div>
  );
});

export default NPIQuickLookup;