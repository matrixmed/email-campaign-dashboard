import React, { useState } from 'react';
import { API_BASE_URL } from '../../config/api';
import '../../styles/DMABreakdown.css';
import '../../styles/SectionHeaders.css';

const DMABreakdown = () => {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const clearBreakdown = () => {
    setFiles([]);
    setResults(null);
    setError(null);
    setLoading(false);
    const input = document.getElementById('dma-file-input');
    if (input) input.value = '';
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setResults(null);
    setError(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dma-drop-active');
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      return ['csv', 'xlsx', 'xls'].includes(ext);
    });
    if (droppedFiles.length > 0) {
      setFiles(droppedFiles);
      setResults(null);
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

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setResults(null);
  };

  const handleProcess = async () => {
    if (files.length === 0) {
      setError('Please upload at least one file');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('input_files', file);
      });

      const response = await fetch(`${API_BASE_URL}/api/list-analysis/dma-breakdown`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process files');
      }

      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!results) return;

    const rows = results.results.map(r => `${r.dma_code},${r.count}`);
    rows.push(`Grand Total,${results.grand_total}`);
    const csv = 'DMA Number,Count\n' + rows.join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'DMA_Breakdown.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="section-header-bar">
        <h3>DMA Breakdown</h3>
        <button className="section-header-clear-btn" onClick={clearBreakdown}>Clear</button>
      </div>
      <div className="dma-breakdown">
      <div
        className="dma-drop-zone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('dma-file-input').click()}
      >
        <input
          id="dma-file-input"
          type="file"
          multiple
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        <p>Drag and drop files</p>
        <p className="dma-drop-or">or</p>
        <p className="dma-drop-browse">Click to browse</p>
      </div>

      {files.length > 0 && (
        <div className="dma-file-list">
          {files.map((file, idx) => (
            <div key={idx} className="dma-file-chip">
              <span>{file.name}</span>
              <button onClick={() => removeFile(idx)}>&times;</button>
            </div>
          ))}
        </div>
      )}

      <div className="dma-actions">
        <button
          className="dma-btn-process"
          onClick={handleProcess}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Generate Breakdown'}
        </button>
        {results && (
          <button className="dma-btn-export" onClick={handleExport}>
            Export CSV
          </button>
        )}
      </div>

      {error && <div className="dma-error">{error}</div>}

      {results && (
        <div className="dma-results">
          <div className="dma-summary">
            <div className="dma-stat">
              <span className="dma-stat-value">{results.total_records.toLocaleString()}</span>
              <span className="dma-stat-label">Total Records</span>
            </div>
            <div className="dma-stat">
              <span className="dma-stat-value">{results.results.length}</span>
              <span className="dma-stat-label">DMA Regions</span>
            </div>
            <div className="dma-stat">
              <span className="dma-stat-value">{results.grand_total.toLocaleString()}</span>
              <span className="dma-stat-label">Mapped</span>
            </div>
            {results.unmapped_count > 0 && (
              <div className="dma-stat dma-stat-warn">
                <span className="dma-stat-value">{results.unmapped_count.toLocaleString()}</span>
                <span className="dma-stat-label">Unmapped</span>
              </div>
            )}
          </div>

          <div className="dma-table-wrapper">
            <table className="dma-table">
              <thead>
                <tr>
                  <th>DMA Number</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {results.results.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.dma_code}</td>
                    <td>{row.count.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="dma-grand-total-row">
                  <td>Grand Total</td>
                  <td>{results.grand_total.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default DMABreakdown;