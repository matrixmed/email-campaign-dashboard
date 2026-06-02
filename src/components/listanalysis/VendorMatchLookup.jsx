import React, { useState } from 'react';
import { API_BASE_URL } from '../../config/api';
import '../../styles/NPIQuickLookup.css';
import '../../styles/SectionHeaders.css';
import '../../styles/VendorMatchLookup.css';
import TablePagination from '../common/TablePagination';

const PER_PAGE = 100;

const VendorMatchLookup = () => {
  const [npiInput, setNpiInput] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const runLookup = async () => {
    if (!npiInput.trim()) {
      setError('Please enter or upload at least one NPI');
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null);
    setCurrentPage(1);
    try {
      const response = await fetch(`${API_BASE_URL}/api/vendor-match/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npis: npiInput })
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
    if (!results || !results.results || results.results.length === 0) return;
    const headers = ['NPI', 'IQVIA Match', 'HLD Match'];
    const rows = [headers.join(',')];
    results.results.forEach(r => {
      rows.push([r.npi, r.iqvia ? 'Yes' : 'No', r.hld ? 'Yes' : 'No'].join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `vendor_match_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearAll = () => {
    setNpiInput('');
    setResults(null);
    setError(null);
    setCurrentPage(1);
  };

  const renderBadge = (matched) => (
    <span className={`match-badge ${matched ? 'match-yes' : 'match-no'}`}>
      {matched ? 'Match' : '—'}
    </span>
  );

  return (
    <>
      <div className="section-header-bar">
        <h3>Vendor Match Lookup</h3>
        <button className="section-header-clear-btn" onClick={clearAll}>Clear</button>
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
          <button className="btn-primary" onClick={runLookup} disabled={loading}>
            {loading ? 'Checking...' : 'Check Matches'}
          </button>
        </div>

        {error && (
          <div className="npi-lookup-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {results && (() => {
          const all = results.results || [];
          const totalPages = Math.max(1, Math.ceil(all.length / PER_PAGE));
          const pageStart = (currentPage - 1) * PER_PAGE;
          const visible = all.slice(pageStart, pageStart + PER_PAGE);

          return (
            <div className="npi-lookup-results">
              <div className="results-summary-section">
                <p>Checked <strong>{results.requested.toLocaleString()}</strong> NPIs</p>
                <div className="vendor-match-chips">
                  <span className="vm-chip vm-iqvia">IQVIA: {results.iqvia_count.toLocaleString()}</span>
                  <span className="vm-chip vm-hld">HLD: {results.hld_count.toLocaleString()}</span>
                  <span className="vm-chip vm-both">Both: {results.both_count.toLocaleString()}</span>
                  <span className="vm-chip vm-neither">Neither: {results.neither_count.toLocaleString()}</span>
                </div>
              </div>

              {results.invalid_count > 0 && (
                <div className="missing-npis-notice">
                  <strong>{results.invalid_count}</strong> entries were skipped (not valid 10-digit NPIs)
                  {results.invalid_npis.length > 0 && `: ${results.invalid_npis.join(', ')}`}
                </div>
              )}

              <div className="results-data-section">
                <div className="table-header-row">
                  <h4>Results ({all.length.toLocaleString()} NPIs)</h4>
                  <button className="btn-export" onClick={handleDownloadCSV}>Export CSV</button>
                </div>

                <div className="results-table-container">
                  <table className="results-table">
                    <thead>
                      <tr>
                        <th>NPI</th>
                        <th>IQVIA</th>
                        <th>HLD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((r, i) => (
                        <tr key={i}>
                          <td className="npi-cell">{r.npi}</td>
                          <td>{renderBadge(r.iqvia)}</td>
                          <td>{renderBadge(r.hld)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <TablePagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            </div>
          );
        })()}
      </div>
    </>
  );
};

export default VendorMatchLookup;