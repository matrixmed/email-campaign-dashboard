import React, { useState, useEffect, useCallback } from 'react';
import '../../styles/BrandManagement.css';
import { API_BASE_URL } from '../../config/api';

const BrandManagement = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');

  const salesMembers = ['Emily', 'Courtney', 'Morgan', 'Dana'];

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('${API_BASE_URL}/api/brand-management');
      const data = await response.json();
      if (data.status === 'success') {
        setBrands(data.brands);
      }
    } catch (error) {
      console.error('Error fetching brands:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const handleCellClick = (brandId, field, currentValue) => {
    setEditingCell({ brandId, field });
    setEditValue(currentValue || '');
  };

  const handleCellBlur = async () => {
    if (!editingCell) return;

    const { brandId, field } = editingCell;
    const brand = brands.find(b => b.id === brandId);

    if (brand[field] === editValue) {
      setEditingCell(null);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/brand-management/${brandId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: editValue })
      });

      const data = await response.json();
      if (data.status === 'success') {
        setBrands(prev => prev.map(b =>
          b.id === brandId ? { ...b, [field]: editValue } : b
        ));
      } else {
        alert('Failed to update: ' + data.message);
      }
    } catch (error) {
      alert('Error updating brand: ' + error.message);
    }

    setEditingCell(null);
  };

  const handleDelete = async (brandId) => {
    if (!window.confirm('Delete this brand assignment?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/brand-management/${brandId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.status === 'success') {
        setBrands(prev => prev.filter(b => b.id !== brandId));
      } else {
        alert('Failed to delete: ' + data.message);
      }
    } catch (error) {
      alert('Error deleting brand: ' + error.message);
    }
  };

  const handleAddBrand = async (editor) => {
    try {
      const response = await fetch('${API_BASE_URL}/api/brand-management/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          editor_name: editor,
          brand: 'New Brand',
          agency: '',
          pharma_company: '',
          is_active: true
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        fetchBrands();
      } else {
        alert('Failed to add brand: ' + data.message);
      }
    } catch (error) {
      alert('Error adding brand: ' + error.message);
    }
  };

  const getBrandsByEditor = (editor) => {
    return brands.filter(b => b.editor_name === editor && b.is_active);
  };

  const getUnassignedBrands = () => {
    return brands.filter(b => !b.editor_name || b.editor_name.trim() === '');
  };

  const getHistoricalBrands = () => {
    return brands.filter(b => !b.is_active);
  };

  const renderCell = (brand, field) => {
    const isEditing = editingCell?.brandId === brand.id && editingCell?.field === field;

    return (
      <td
        onClick={() => handleCellClick(brand.id, field, brand[field])}
        className={isEditing ? 'editing' : ''}
      >
        {isEditing ? (
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
          <span>{brand[field] || '-'}</span>
        )}
      </td>
    );
  };

  const renderBrandSection = (editor, brandsData) => (
    <div key={editor} className="reports-section">
      <table className="reports-table">
        <tbody>
          <tr className="agency-section-header">
            <td colSpan="4" className="agency-section-title">
              {editor}'s Brands <span className="agency-count">({brandsData.length})</span>
              <button
                onClick={() => handleAddBrand(editor)}
                style={{
                  marginLeft: 'auto',
                  padding: '4px 12px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Add Brand
              </button>
            </td>
          </tr>
          {brandsData.map((brand, index) => (
            <tr key={brand.id} className={index % 2 === 0 ? 'report-row even-row' : 'report-row odd-row'}>
              {renderCell(brand, 'brand')}
              {renderCell(brand, 'agency')}
              {renderCell(brand, 'pharma_company')}
              <td>
                <button
                  onClick={() => handleDelete(brand.id)}
                  style={{
                    padding: '4px 12px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {brandsData.length === 0 && (
            <tr>
              <td colSpan="4" style={{ textAlign: 'center', color: '#888', padding: '20px', fontStyle: 'italic' }}>
                No brands assigned
              </td>
            </tr>
          )}
          <tr className="agency-divider">
            <td colSpan="4"></td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  if (loading) {
    return (
      <div className="reports-manager">
        <div className="loading-container">
          <p>Loading brands...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="brand-management">
      <div className="page-header">
        <h1>Brand & Agency Management</h1>
        <div className="header-spacer"></div>
      </div>

      <div className="table-container">
        <table className="reports-table">
          <thead>
            <tr>
              <th>Brand</th>
              <th>Agency</th>
              <th>Pharma Company</th>
              <th>Actions</th>
            </tr>
          </thead>
        </table>
      </div>

      {salesMembers.map(editor => renderBrandSection(editor, getBrandsByEditor(editor)))}

      <div className="reports-section">
        <table className="reports-table">
          <tbody>
            <tr className="agency-section-header">
              <td colSpan="4" className="agency-section-title">
                Unassigned Brands <span className="agency-count">({getUnassignedBrands().length})</span>
              </td>
            </tr>
            {getUnassignedBrands().map((brand, index) => (
              <tr key={brand.id} className={index % 2 === 0 ? 'report-row even-row' : 'report-row odd-row'}>
                {renderCell(brand, 'brand')}
                {renderCell(brand, 'agency')}
                {renderCell(brand, 'pharma_company')}
                <td>
                  <button
                    onClick={() => handleDelete(brand.id)}
                    style={{
                      padding: '4px 12px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {getUnassignedBrands().length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: '#888', padding: '20px', fontStyle: 'italic' }}>
                  No unassigned brands
                </td>
              </tr>
            )}
            <tr className="agency-divider">
              <td colSpan="4"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="reports-section">
        <table className="reports-table">
          <tbody>
            <tr className="agency-section-header">
              <td colSpan="5" className="agency-section-title">
                Historical / Inactive Brands <span className="agency-count">({getHistoricalBrands().length})</span>
              </td>
            </tr>
            {getHistoricalBrands().map((brand, index) => (
              <tr key={brand.id} className={index % 2 === 0 ? 'report-row even-row' : 'report-row odd-row'}>
                {renderCell(brand, 'brand')}
                {renderCell(brand, 'agency')}
                {renderCell(brand, 'pharma_company')}
                <td style={{ color: '#888' }}>{brand.editor_name || '-'}</td>
                <td>
                  <button
                    onClick={() => handleDelete(brand.id)}
                    style={{
                      padding: '4px 12px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {getHistoricalBrands().length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: '#888', padding: '20px', fontStyle: 'italic' }}>
                  No historical brands
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BrandManagement;
