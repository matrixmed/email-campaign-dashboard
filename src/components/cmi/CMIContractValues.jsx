import React, { useState, useEffect, useCallback } from 'react';
import '../../styles/CMIContractValues.css';
import { API_BASE_URL } from '../../config/api';

const CMIContractValues = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [filterText, setFilterText] = useState('');
  const [selectedYear, setSelectedYear] = useState(2025);

  const columns = [
    { key: 'contract_number', label: 'Contract #' },
    { key: 'client', label: 'Client' },
    { key: 'brand', label: 'Brand' },
    { key: 'vehicle', label: 'Vehicle' },
    { key: 'placement_id', label: 'Placement ID' },
    { key: 'placement_description', label: 'Placement Description' },
    { key: 'buy_component_type', label: 'Buy Component Type' },
    { key: 'data_type', label: 'Data Type' },
    { key: 'notes', label: 'Notes' }
  ];

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/cmi-contracts?year=${selectedYear}`);
      const data = await response.json();
      if (data.status === 'success') {
        setContracts(data.contracts);
      }
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const handleCellClick = (contractId, columnKey, currentValue) => {
    setEditingCell({ contractId, columnKey });
    setEditValue(currentValue || '');
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
        console.error('Failed to update:', data.message);
      }
    } catch (error) {
      console.error('Error updating contract:', error.message);
    }

    setEditingCell(null);
  };

  const handleAddRow = async () => {
    const newPlacementId = `NEW_${Date.now()}`;

    try {
      const response = await fetch(`${API_BASE_URL}/api/cmi-contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_number: '',
          client: '',
          brand: '',
          vehicle: '',
          placement_id: newPlacementId,
          placement_description: '',
          buy_component_type: '',
          data_type: '',
          notes: '',
          year: selectedYear
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        fetchContracts();
      } else {
        console.error('Failed to add row:', data.message);
      }
    } catch (error) {
      console.error('Error adding row:', error.message);
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
        console.error('Failed to delete:', data.message);
      }
    } catch (error) {
      console.error('Error deleting contract:', error.message);
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
      console.error('Error exporting:', error.message);
    }
  };

  const filteredContracts = contracts.filter(contract => {
    if (!filterText) return true;
    const searchText = filterText.toLowerCase();
    return Object.values(contract).some(val =>
      String(val).toLowerCase().includes(searchText)
    );
  });

  const sortedContracts = [...filteredContracts].sort((a, b) => {
    if (!sortConfig.key) return 0;

    const aVal = a[sortConfig.key] || '';
    const bVal = b[sortConfig.key] || '';

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  if (loading) {
    return (
      <div className="cmi-container">
        <div className="cmi-loading">Loading contracts...</div>
      </div>
    );
  }

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

      <div className="cmi-table-container">
        <div className="cmi-table-wrapper">
          <table className="cmi-table">
            <thead>
              <tr>
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
              {sortedContracts.map(contract => (
                <tr key={contract.id}>
                  {columns.map(col => (
                    <td
                      key={col.key}
                      onClick={() => handleCellClick(contract.id, col.key, contract[col.key])}
                      className={editingCell?.contractId === contract.id && editingCell?.columnKey === col.key ? 'editing' : ''}
                    >
                      {editingCell?.contractId === contract.id && editingCell?.columnKey === col.key ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleCellBlur}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCellBlur();
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                          autoFocus
                          className="cell-input"
                        />
                      ) : (
                        <span>{contract[col.key] || ''}</span>
                      )}
                    </td>
                  ))}
                  <td>
                    <button
                      onClick={() => handleDeleteRow(contract.id)}
                      className="cmi-btn-delete"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sortedContracts.length === 0 && (
        <div className="cmi-empty">
          No contracts found. Click "Add Row" to create one.
        </div>
      )}
    </div>
  );
};

export default CMIContractValues;
