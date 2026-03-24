import React, { useState } from 'react';
import { API_BASE_URL } from '../../config/api';
import '../../styles/DMABreakdown.css';
import '../../styles/SectionHeaders.css';
import '../../styles/PrintManagement.css';

const API = API_BASE_URL;

const renderListBadges = (lists) => {
  if (!lists) return null;
  return lists.split(',').map(l => l.trim()).filter(Boolean).map(l => (
    <span key={l} className="badge badge-list">{l}</span>
  ));
};

const NCOAUpload = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedUpdates, setSelectedUpdates] = useState(new Set());
  const [selectedUnsubs, setSelectedUnsubs] = useState(new Set());

  const clearAll = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setLoading(false);
    setConfirming(false);
    setSelectedUpdates(new Set());
    setSelectedUnsubs(new Set());
    const input = document.getElementById('ncoa-file-input');
    if (input) input.value = '';
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setPreview(null);
      setResult(null);
      setError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dma-drop-active');
    const f = e.dataTransfer.files[0];
    if (f && f.name.toLowerCase().endsWith('.csv')) {
      setFile(f);
      setPreview(null);
      setResult(null);
      setError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('dma-drop-active');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dma-drop-active');
  };

  const handleProcess = async () => {
    if (!file) {
      setError('Please upload a CSV file');
      return;
    }
    setLoading(true);
    setError(null);
    setPreview(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API}/api/print-lists/ncoa-upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process file');
      setPreview(data);
      setSelectedUpdates(new Set((data.address_updates || []).map((_, i) => i)));
      setSelectedUnsubs(new Set((data.unsubscribe_candidates || []).map((_, i) => i)));
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setConfirming(true);

    const toApply = {
      address_updates: (preview.address_updates || []).filter((_, i) => selectedUpdates.has(i)),
      unsubscribes: (preview.unsubscribe_candidates || []).filter((_, i) => selectedUnsubs.has(i)),
    };

    const formData = new FormData();
    formData.append('confirm', 'true');
    formData.append('data', JSON.stringify(toApply));

    try {
      const res = await fetch(`${API}/api/print-lists/ncoa-upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to apply changes');
      setResult(data.applied);
      setPreview(null);
      setFile(null);
    } catch (e) {
      setError(e.message);
    }
    setConfirming(false);
  };

  const toggleUpdate = (idx) => {
    setSelectedUpdates(prev => {
      const s = new Set(prev);
      s.has(idx) ? s.delete(idx) : s.add(idx);
      return s;
    });
  };

  const toggleUnsub = (idx) => {
    setSelectedUnsubs(prev => {
      const s = new Set(prev);
      s.has(idx) ? s.delete(idx) : s.add(idx);
      return s;
    });
  };

  return (
    <>
      <div className="section-header-bar">
        <h3>NCOA Address Update</h3>
        <button className="section-header-clear-btn" onClick={clearAll}>Clear</button>
      </div>

      <div className="dma-breakdown">
        <div
          className="dma-drop-zone"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => document.getElementById('ncoa-file-input').click()}
        >
          <input
            id="ncoa-file-input"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <p>Drag and drop NCOA CSV</p>
          <p className="dma-drop-or">or</p>
          <p className="dma-drop-browse">Click to browse</p>
        </div>

        {file && (
          <div className="dma-file-list">
            <div className="dma-file-chip">
              <span>{file.name}</span>
              <button onClick={() => { setFile(null); setPreview(null); }}>&times;</button>
            </div>
          </div>
        )}

        <div className="dma-actions">
          <button className="dma-btn-process" onClick={handleProcess}>
            {loading ? 'Processing...' : 'Process NCOA File'}
          </button>
        </div>

        {error && <div className="dma-error">{error}</div>}

        {preview && (
          <div className="dma-results">
            <div className="dma-summary">
              <div className="dma-stat">
                <span className="dma-stat-value">{preview.summary?.total_rows}</span>
                <span className="dma-stat-label">Total Rows</span>
              </div>
              <div className="dma-stat">
                <span className="dma-stat-value">{preview.address_updates?.length || 0}</span>
                <span className="dma-stat-label">Address Updates</span>
              </div>
              <div className="dma-stat">
                <span className="dma-stat-value" style={{ color: '#f87171' }}>{preview.unsubscribe_candidates?.length || 0}</span>
                <span className="dma-stat-label">Unsubscribe</span>
              </div>
              {preview.not_found?.length > 0 && (
                <div className="dma-stat dma-stat-warn">
                  <span className="dma-stat-value">{preview.not_found.length}</span>
                  <span className="dma-stat-label">Not Found</span>
                </div>
              )}
            </div>

            {preview.address_updates?.length > 0 && (
              <>
                <h4 className="print-preview-label">
                  Address Updates ({selectedUpdates.size} of {preview.address_updates.length} selected)
                </h4>
                <div className="dma-table-wrapper" style={{ maxHeight: 280, marginBottom: 16 }}>
                  <table className="dma-table">
                    <thead>
                      <tr>
                        <th style={{ width: 30 }}>
                          <input type="checkbox"
                            checked={selectedUpdates.size === preview.address_updates.length}
                            onChange={e => setSelectedUpdates(e.target.checked ? new Set(preview.address_updates.map((_, i) => i)) : new Set())}
                            style={{ accentColor: 'var(--color-accent, #0ff)' }}
                          />
                        </th>
                        <th>Name</th>
                        <th>NPI</th>
                        <th>Lists</th>
                        <th>Old Address</th>
                        <th>New Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.address_updates.map((u, i) => (
                        <tr key={i}>
                          <td>
                            <input type="checkbox" checked={selectedUpdates.has(i)} onChange={() => toggleUpdate(i)}
                              style={{ accentColor: 'var(--color-accent, #0ff)' }} />
                          </td>
                          <td>{u.name}</td>
                          <td>{u.npi || '—'}</td>
                          <td>{renderListBadges(u.current_lists)}</td>
                          <td style={{ color: '#f87171', whiteSpace: 'normal' }}>{u.old_address}</td>
                          <td style={{ color: '#4ade80', whiteSpace: 'normal' }}>{u.new_address}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {preview.unsubscribe_candidates?.length > 0 && (
              <>
                <h4 className="print-preview-label">
                  Unsubscribe Candidates ({selectedUnsubs.size} of {preview.unsubscribe_candidates.length} selected)
                </h4>
                <div className="dma-table-wrapper" style={{ maxHeight: 280, marginBottom: 16 }}>
                  <table className="dma-table">
                    <thead>
                      <tr>
                        <th style={{ width: 30 }}>
                          <input type="checkbox"
                            checked={selectedUnsubs.size === preview.unsubscribe_candidates.length}
                            onChange={e => setSelectedUnsubs(e.target.checked ? new Set(preview.unsubscribe_candidates.map((_, i) => i)) : new Set())}
                            style={{ accentColor: 'var(--color-accent, #0ff)' }}
                          />
                        </th>
                        <th>Name</th>
                        <th>NPI</th>
                        <th>Lists</th>
                        <th>Code</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.unsubscribe_candidates.map((u, i) => (
                        <tr key={i}>
                          <td>
                            <input type="checkbox" checked={selectedUnsubs.has(i)} onChange={() => toggleUnsub(i)}
                              style={{ accentColor: 'var(--color-accent, #0ff)' }} />
                          </td>
                          <td>{u.name}</td>
                          <td>{u.npi || '—'}</td>
                          <td>{renderListBadges(u.current_lists)}</td>
                          <td>{u.return_code || '—'}</td>
                          <td style={{ whiteSpace: 'normal' }}>{u.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {preview.not_found?.length > 0 && (
              <>
                <h4 className="print-preview-label">Not Found ({preview.not_found.length})</h4>
                <div className="dma-table-wrapper" style={{ maxHeight: 200, marginBottom: 16 }}>
                  <table className="dma-table">
                    <thead>
                      <tr><th>Name</th><th>Address</th><th>Code</th></tr>
                    </thead>
                    <tbody>
                      {preview.not_found.map((n, i) => (
                        <tr key={i}>
                          <td>{n.name}</td>
                          <td>{n.old_address}</td>
                          <td>{n.return_code || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="dma-actions">
              <button className="dma-btn-process" onClick={handleConfirm} disabled={confirming || (selectedUpdates.size === 0 && selectedUnsubs.size === 0)}>
                {confirming ? 'Applying...' : `Apply ${selectedUpdates.size} Updates, ${selectedUnsubs.size} Unsubscribes`}
              </button>
              <button className="section-header-clear-btn" onClick={clearAll}>Cancel</button>
            </div>
          </div>
        )}

        {result && (
          <div className="dma-results">
            <div className="dma-summary">
              <div className="dma-stat">
                <span className="dma-stat-value" style={{ color: '#4ade80' }}>{result.address_updates}</span>
                <span className="dma-stat-label">Addresses Updated</span>
              </div>
              <div className="dma-stat">
                <span className="dma-stat-value" style={{ color: '#f87171' }}>{result.unsubscribes}</span>
                <span className="dma-stat-label">Unsubscribed</span>
              </div>
            </div>
            <div className="dma-actions">
              <button className="section-header-clear-btn" onClick={clearAll}>Process Another File</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default NCOAUpload;