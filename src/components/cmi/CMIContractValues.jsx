import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../../styles/CMIContractValues.css';
import { API_BASE_URL } from '../../config/api';
import { matchesSearchTerm } from '../../utils/searchUtils';

const CMIContractValues = () => {
  const [contracts, setContracts] = useState([]);
  const [cmiOnly, setCmiOnly] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filterText, setFilterText] = useState('');
  const [selectedYear, setSelectedYear] = useState(2026);
  const [newRowIds, setNewRowIds] = useState(new Set());
  const [aaCounter, setAaCounter] = useState(1);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const tableRef = useRef(null);

  const columns = [
    { key: 'contract_number', label: 'Contract #' },
    { key: 'client', label: 'Client' },
    { key: 'brand', label: 'Brand' },
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'placement_id', label: 'Placement ID' },
    { key: 'placement_description', label: 'Placement Description' },
    { key: 'buy_component_type', label: 'Buy Component Type' },
    { key: 'media_tactic_id', label: 'Media Tactic ID' },
    { key: 'frequency', label: 'Frequency' },
    { key: 'metric', label: 'Metric' },
    { key: 'data_type', label: 'Data Type' },
    { key: 'notes', label: 'Notes' }
  ];

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/cmi-contracts/validation?year=${selectedYear}`);
      const data = await response.json();
      if (data.status === 'success') {
        setContracts(data.contracts);
        setCmiOnly(data.cmi_only || []);
        setSummary(data.summary || null);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  useEffect(() => {
    setNewRowIds(new Set());
    setAaCounter(1);
  }, [selectedYear]);

  const handleCellClick = (contractId, columnKey, currentValue) => {
    setEditingCell({ contractId, columnKey });
    setEditValue(currentValue || '');
  };

  const getColumnIndex = (columnKey) => columns.findIndex(c => c.key === columnKey);

  const navigateCell = (currentContractId, currentColumnKey, direction) => {
    const currentColIndex = getColumnIndex(currentColumnKey);
    const currentRowIndex = sortedContracts.findIndex(c => c.id === currentContractId);

    let newRowIndex = currentRowIndex;
    let newColIndex = currentColIndex;

    switch (direction) {
      case 'ArrowUp':
        newRowIndex = Math.max(0, currentRowIndex - 1);
        break;
      case 'ArrowDown':
        newRowIndex = Math.min(sortedContracts.length - 1, currentRowIndex + 1);
        break;
      case 'ArrowLeft':
        newColIndex = Math.max(0, currentColIndex - 1);
        break;
      case 'ArrowRight':
        newColIndex = Math.min(columns.length - 1, currentColIndex + 1);
        break;
      default:
        return null;
    }

    if (newRowIndex !== currentRowIndex || newColIndex !== currentColIndex) {
      const newContract = sortedContracts[newRowIndex];
      const newColumn = columns[newColIndex];
      return { contractId: newContract.id, columnKey: newColumn.key, value: newContract[newColumn.key] || '' };
    }
    return null;
  };

  const handleKeyDown = async (e, contractId, columnKey) => {
    if (e.key === 'Enter') {
      await handleCellBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    } else if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      await handleCellBlur();
      const newCell = navigateCell(contractId, columnKey, e.key);
      if (newCell) {
        setEditingCell({ contractId: newCell.contractId, columnKey: newCell.columnKey });
        setEditValue(newCell.value);
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const input = e.target;
      const cursorPos = input.selectionStart;
      const textLength = input.value.length;

      const atStart = cursorPos === 0;
      const atEnd = cursorPos === textLength;

      if ((e.key === 'ArrowLeft' && atStart) || (e.key === 'ArrowRight' && atEnd)) {
        e.preventDefault();
        await handleCellBlur();
        const newCell = navigateCell(contractId, columnKey, e.key);
        if (newCell) {
          setEditingCell({ contractId: newCell.contractId, columnKey: newCell.columnKey });
          setEditValue(newCell.value);
        }
      }
    }
  };

  const handleCellBlur = async () => {
    if (!editingCell) return;

    const { contractId, columnKey } = editingCell;
    const contract = contracts.find(c => c.id === contractId);

    if (contract[columnKey] === editValue) {
      setEditingCell(null);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/cmi-contracts/${contractId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [columnKey]: editValue })
      });

      const data = await response.json();
      if (data.status === 'success') {
        setContracts(prev => prev.map(c =>
          c.id === contractId ? { ...c, [columnKey]: editValue } : c
        ));
      } else {
      }
    } catch (error) {
    }

    setEditingCell(null);
  };

  const handleAddRow = async () => {
    const brandName = `aa${aaCounter}`;
    const placementId = `PL_${Date.now()}`;

    try {
      const response = await fetch(`${API_BASE_URL}/api/cmi-contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_number: '',
          client: '',
          brand: brandName,
          vehicle: '',
          placement_id: placementId,
          placement_description: '',
          buy_component_type: '',
          media_tactic_id: '',
          frequency: '',
          metric: '',
          data_type: '',
          notes: '',
          year: selectedYear
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        setAaCounter(prev => prev + 1);
        const newContract = {
          id: data.id,
          contract_number: '',
          client: '',
          brand: brandName,
          vehicle: '',
          placement_id: placementId,
          placement_description: '',
          buy_component_type: '',
          media_tactic_id: '',
          frequency: '',
          metric: '',
          data_type: '',
          notes: '',
          year: selectedYear
        };
        setContracts(prev => [newContract, ...prev]);
        setNewRowIds(prev => new Set([...prev, data.id]));
      } else {
      }
    } catch (error) {
    }
  };

  const handleAdoptCmiOnly = async (row) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/cmi-contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_number: row.contract_number || '',
          client: row.client || '',
          brand: row.brand || '',
          vehicle: row.vehicle || '',
          placement_id: row.placement_id,
          placement_description: row.placement_description || '',
          buy_component_type: row.buy_component_type || '',
          media_tactic_id: row.media_tactic_id || '',
          frequency: row.frequency || '',
          metric: row.metric || '',
          data_type: '',
          notes: '',
          year: selectedYear
        })
      });
      const data = await response.json();
      if (data.status === 'success') {
        fetchContracts();
      }
    } catch (error) {
    }
  };

  const handleDeleteRow = async (contractId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/cmi-contracts/${contractId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.status === 'success') {
        setContracts(prev => prev.filter(c => c.id !== contractId));
      } else {
      }
    } catch (error) {
    }
  };

  const handleSort = (columnKey) => {
    let direction = 'asc';
    if (sortConfig.key === columnKey && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: columnKey, direction });
  };

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/cmi-contracts/export?year=${selectedYear}`);
      const csvContent = await response.text();

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cmi_contracts.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
    }
  };

  const filteredContracts = contracts.filter(contract => {
    if (!filterText) return true;
    return Object.values(contract).some(val =>
      matchesSearchTerm(String(val), filterText)
    );
  });

  const filteredCmiOnly = cmiOnly.filter(row => {
    if (!filterText) return true;
    return Object.values(row).some(val =>
      matchesSearchTerm(String(val), filterText)
    );
  });

  const sortedContracts = [...filteredContracts].sort((a, b) => {
    const aIsNew = newRowIds.has(a.id);
    const bIsNew = newRowIds.has(b.id);

    if (aIsNew && !bIsNew) return -1;
    if (!aIsNew && bIsNew) return 1;

    if (aIsNew && bIsNew) {
      return 0; 
    }

    if (sortConfig.key) {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    }

    const aVal = (a.brand || '').toLowerCase();
    const bVal = (b.brand || '').toLowerCase();
    if (aVal < bVal) return -1;
    if (aVal > bVal) return 1;
    return 0;
  });

  const hoveredContract = hoveredCell ? [...contracts].find(c => c.id === hoveredCell.contractId) : null;
  const hoveredMismatch = hoveredContract && hoveredCell ? (hoveredContract.cmi_mismatches || {})[hoveredCell.columnKey] : null;

  return (
    <div className="cmi-contract-values">
      <div className="page-header">
        <h1>CMI Contract Values</h1>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner">
            <div></div><div></div><div></div><div></div><div></div><div></div>
          </div>
          <p>Loading contracts...</p>
        </div>
      ) : (
      <>
      <div className="cmi-controls-top">
        <div className="year-tabs">
          <button
            onClick={() => setSelectedYear(2024)}
            className={`tab-button ${selectedYear === 2024 ? 'active' : ''}`}
          >
            2024
          </button>
          <button
            onClick={() => setSelectedYear(2025)}
            className={`tab-button ${selectedYear === 2025 ? 'active' : ''}`}
          >
            2025
          </button>
          <button
            onClick={() => setSelectedYear(2026)}
            className={`tab-button ${selectedYear === 2026 ? 'active' : ''}`}
          >
            2026
          </button>
        </div>
        <div className="action-buttons">
          <button onClick={handleAddRow} className="action-btn action-btn-add">
            Add Row
          </button>
          <button onClick={handleExport} className="action-btn action-btn-export">
            Export CSV
          </button>
        </div>
      </div>

      {summary && (
        <div className="cmi-validation-summary">
          <span className="cmi-summary-chip cmi-summary-match">✓ {summary.full_match} matched</span>
          <span className="cmi-summary-chip cmi-summary-mismatch">⚠ {summary.partial_mismatch} mismatch</span>
          <span className="cmi-summary-chip cmi-summary-orphan">○ {summary.no_cmi_record} no CMI record</span>
          <span className="cmi-summary-chip cmi-summary-cmionly">+ {summary.cmi_only} CMI-only</span>
        </div>
      )}

      <div className="cmi-table-container">
        <div className="cmi-table-wrapper">
          <table className="cmi-table" ref={tableRef}>
            <thead>
              <tr>
                <th className="cmi-status-col">CMI</th>
                {columns.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    {sortConfig.key === col.key && (
                      <span className="sort-indicator">
                        {sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}
                      </span>
                    )}
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedContracts.map(contract => {
                const status = contract.cmi_match_status;
                const mismatches = contract.cmi_mismatches || {};
                const rowClass =
                  status === 'full_match' ? 'cmi-row-match' :
                  status === 'partial_mismatch' ? 'cmi-row-mismatch' :
                  'cmi-row-orphan';
                const badge =
                  status === 'full_match' ? <span className="cmi-badge cmi-badge-match" title="All fields match CMI">✓</span> :
                  status === 'partial_mismatch' ? <span className="cmi-badge cmi-badge-mismatch" title={`${Object.keys(mismatches).length} mismatch(es)`}>⚠ {Object.keys(mismatches).length}</span> :
                  <span className="cmi-badge cmi-badge-orphan" title="No matching CMI placement">○</span>;

                return (
                <tr key={contract.id} className={rowClass}>
                  <td className="cmi-status-col">{badge}</td>
                  {columns.map(col => {
                    const mismatch = mismatches[col.key];
                    const cellClass = [
                      editingCell?.contractId === contract.id && editingCell?.columnKey === col.key ? 'editing' : '',
                      mismatch ? 'cmi-cell-mismatch' : ''
                    ].filter(Boolean).join(' ');

                    return (
                    <td
                      key={col.key}
                      onClick={() => handleCellClick(contract.id, col.key, contract[col.key])}
                      onMouseEnter={(e) => {
                        if (mismatch) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltipPos({ top: rect.top - 8, left: rect.left });
                          setHoveredCell({ contractId: contract.id, columnKey: col.key });
                        }
                      }}
                      onMouseLeave={() => setHoveredCell(null)}
                      className={cellClass}
                    >
                      {editingCell?.contractId === contract.id && editingCell?.columnKey === col.key ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellBlur}
                          onKeyDown={(e) => handleKeyDown(e, contract.id, col.key)}
                          autoFocus
                          className="cell-input"
                        />
                      ) : (
                        <span>{contract[col.key] || ''}</span>
                      )}
                    </td>
                    );
                  })}
                  <td>
                    <button
                      onClick={() => handleDeleteRow(contract.id)}
                      className="cmi-btn-delete"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
                );
              })}
              {filteredCmiOnly.length > 0 && (
                <>
                  <tr className="cmi-only-divider">
                    <td colSpan={columns.length + 2}>
                      In CMI's metadata but missing from our contracts ({filteredCmiOnly.length}{filterText && cmiOnly.length !== filteredCmiOnly.length ? ` of ${cmiOnly.length}` : ''})
                    </td>
                  </tr>
                  {filteredCmiOnly.map((row, idx) => (
                    <tr key={`cmi-only-${row.placement_id}-${idx}`} className="cmi-row-cmionly">
                      <td className="cmi-status-col">
                        <span className="cmi-badge cmi-badge-cmionly" title="CMI has this placement, we don't">+</span>
                      </td>
                      {columns.map(col => (
                        <td key={col.key}>
                          <span>{row[col.key] || ''}</span>
                        </td>
                      ))}
                      <td>
                        <button
                          onClick={() => handleAdoptCmiOnly(row)}
                          className="cmi-btn-adopt"
                          title="Insert this placement into our contracts table"
                        >
                          Add
                        </button>
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {sortedContracts.length === 0 && (
        <div className="cmi-empty">
          No contracts found. Click "Add Row" to create one.
        </div>
      )}
      </>
      )}

      {hoveredMismatch && (
        <div
          className="cmi-mismatch-tooltip"
          style={{
            position: 'fixed',
            top: tooltipPos.top,
            left: tooltipPos.left,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="cmi-mismatch-label">CMI value:</div>
          <div className="cmi-mismatch-value">{hoveredMismatch.cmi || <em>(empty)</em>}</div>
        </div>
      )}
    </div>
  );
};

export default CMIContractValues;