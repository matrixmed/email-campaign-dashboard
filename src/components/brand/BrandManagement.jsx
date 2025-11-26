import React, { useState, useEffect, useCallback } from 'react';
import '../../styles/BrandManagement.css';
import { API_BASE_URL } from '../../config/api';

const BrandManagement = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [searchText, setSearchText] = useState('');

  const salesMembers = ['Emily', 'Courtney', 'Morgan', 'Dana'];

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/brand-management`);
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
        console.error('Failed to update:', data.message);
      }
    } catch (error) {
      console.error('Error updating brand:', error.message);
    }

    setEditingCell(null);
  };

  const handleDelete = async (brandId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/brand-management/${brandId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.status === 'success') {
        setBrands(prev => prev.filter(b => b.id !== brandId));
      } else {
        console.error('Failed to delete:', data.message);
      }
    } catch (error) {
      console.error('Error deleting brand:', error.message);
    }
  };

  const handleAddBrand = async (editor) => {
    let brandName = 'Brand1';
    let counter = 1;
    const existingBrandNames = brands.map(b => (b.brand || '').toLowerCase());

    while (existingBrandNames.includes(brandName.toLowerCase())) {
      counter++;
      brandName = `Brand${counter}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/brand-management/entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sales_member: editor,
          brand: brandName,
          agency: '',
          pharma_company: '',
          is_active: true
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        fetchBrands();
      } else {
        console.error('Failed to add brand:', data.message);
      }
    } catch (error) {
      console.error('Error adding brand:', error.message);
    }
  };

  const handleMoveBrand = async (brandId, targetLocation) => {
    const brand = brands.find(b => b.id === brandId);
    if (!brand) return;

    let updates = {};

    if (targetLocation === 'historic') {
      updates = { is_active: false };
    } else if (salesMembers.includes(targetLocation)) {
      updates = { sales_member: targetLocation, is_active: true };
    } else if (targetLocation === 'unassigned') {
      updates = { sales_member: '', is_active: true };
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/brand-management/${brandId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      if (data.status === 'success') {
        fetchBrands();
      } else {
        console.error('Failed to move brand:', data.message);
      }
    } catch (error) {
      console.error('Error moving brand:', error.message);
    }
  };

  const filterBrands = (brandsList) => {
    if (!searchText) return brandsList;
    const search = searchText.toLowerCase();
    return brandsList.filter(b =>
      (b.brand || '').toLowerCase().includes(search) ||
      (b.agency || '').toLowerCase().includes(search) ||
      (b.pharma_company || '').toLowerCase().includes(search)
    );
  };

  const getBrandsByEditor = (editor) => {
    return filterBrands(brands.filter(b => b.sales_member === editor && b.is_active));
  };

  const getUnassignedBrands = () => {
    return filterBrands(brands.filter(b => !b.sales_member || b.sales_member.trim() === ''));
  };

  const getHistoricalBrands = () => {
    return filterBrands(brands.filter(b => !b.is_active));
  };

  const renderCell = (brand, field) => {
    const isEditing = editingCell?.brandId === brand.id && editingCell?.field === field;

    return (
      <td
        onClick={() => handleCellClick(brand.id, field, brand[field])}
        className={isEditing ? 'editing' : ''}
        style={{ width: '25%' }}
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

  const renderMoveDropdown = (brand) => {
    const currentEditor = brand.sales_member;
    const moveOptions = [
      ...salesMembers.filter(m => m !== currentEditor),
      'unassigned',
      'historic'
    ];

    return (
      <select
        onChange={(e) => {
          if (e.target.value) {
            handleMoveBrand(brand.id, e.target.value);
            e.target.value = '';
          }
        }}
        className="move-dropdown"
        defaultValue=""
      >
        <option value="" disabled>Move to</option>
        {moveOptions.map(option => (
          <option key={option} value={option}>
            {option === 'historic' ? 'Historic' :
             option === 'unassigned' ? 'Unassigned' :
             option}
          </option>
        ))}
      </select>
    );
  };

  const renderBrandSection = (editor, brandsData) => (
    <div key={editor} className="reports-section">
      <table className="reports-table">
        <tbody>
          <tr className="agency-section-header">
            <td colSpan="4" className="agency-section-title">
              <span>{editor}'s Brands <span className="agency-count">({brandsData.length})</span></span>
              <button
                onClick={() => handleAddBrand(editor)}
                className="add-brand-button"
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
              <td className="actions-cell" style={{ width: '25%', textAlign: 'right', paddingRight: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                  {renderMoveDropdown(brand)}
                  <button
                    onClick={() => handleDelete(brand.id)}
                    className="delete-button"
                  >
                    Delete
                  </button>
                </div>
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
      <div className="brand-management">
        <div className="loading-container">
          <div className="spinner">
            <div></div><div></div><div></div><div></div><div></div><div></div>
          </div>
          <p>Loading brands...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="brand-management">
      <div className="page-header">
        <h1>Brand & Agency Management</h1>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="table-container">
        <table className="reports-table">
          <thead>
            <tr>
              <th style={{ width: '25%', fontSize: '18px' }}>Brand</th>
              <th style={{ width: '25%', fontSize: '18px' }}>Agency</th>
              <th style={{ width: '25%', fontSize: '18px' }}>Pharma Company</th>
              <th style={{ width: '25%', textAlign: 'right', paddingRight: '16px', fontSize: '18px' }}>Actions</th>
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
                <td className="actions-cell" style={{ width: '25%', textAlign: 'right', paddingRight: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                    {renderMoveDropdown(brand)}
                    <button
                      onClick={() => handleDelete(brand.id)}
                      className="delete-button"
                    >
                      Delete
                    </button>
                  </div>
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
              <td colSpan="4" className="agency-section-title">
                Historical / Inactive Brands <span className="agency-count">({getHistoricalBrands().length})</span>
              </td>
            </tr>
            {getHistoricalBrands().map((brand, index) => (
              <tr key={brand.id} className={index % 2 === 0 ? 'report-row even-row' : 'report-row odd-row'}>
                {renderCell(brand, 'brand')}
                {renderCell(brand, 'agency')}
                {renderCell(brand, 'pharma_company')}
                <td className="actions-cell" style={{ width: '25%', textAlign: 'right', paddingRight: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                    {renderMoveDropdown(brand)}
                    <button
                      onClick={() => handleDelete(brand.id)}
                      className="delete-button"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {getHistoricalBrands().length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', color: '#888', padding: '20px', fontStyle: 'italic' }}>
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