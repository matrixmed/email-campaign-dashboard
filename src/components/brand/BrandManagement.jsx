import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../../styles/BrandManagement.css';
import { API_BASE_URL } from '../../config/api';

const BrandManagement = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [searchText, setSearchText] = useState('');
  const [newRowIds, setNewRowIds] = useState(new Set()); 
  const [aaCounters, setAaCounters] = useState({}); 
  const tableRefs = useRef({});

  const salesMembers = ['Emily', 'Courtney', 'Morgan', 'Dana'];
  const brandFields = ['brand', 'agency', 'pharma_company', 'industry'];

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/brand-management`);
      const data = await response.json();
      if (data.status === 'success') {
        setBrands(data.brands);
      }
    } catch (error) {
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

  const getFieldIndex = (field) => brandFields.findIndex(f => f === field);

  const navigateCell = (currentBrandId, currentField, direction, editorBrands) => {
    const currentFieldIndex = getFieldIndex(currentField);
    const currentRowIndex = editorBrands.findIndex(b => b.id === currentBrandId);

    let newRowIndex = currentRowIndex;
    let newFieldIndex = currentFieldIndex;

    switch (direction) {
      case 'ArrowUp':
        newRowIndex = Math.max(0, currentRowIndex - 1);
        break;
      case 'ArrowDown':
        newRowIndex = Math.min(editorBrands.length - 1, currentRowIndex + 1);
        break;
      case 'ArrowLeft':
        newFieldIndex = Math.max(0, currentFieldIndex - 1);
        break;
      case 'ArrowRight':
        newFieldIndex = Math.min(brandFields.length - 1, currentFieldIndex + 1);
        break;
      default:
        return null;
    }

    if (newRowIndex !== currentRowIndex || newFieldIndex !== currentFieldIndex) {
      const newBrand = editorBrands[newRowIndex];
      const newField = brandFields[newFieldIndex];
      return { brandId: newBrand.id, field: newField, value: newBrand[newField] || '' };
    }
    return null;
  };

  const handleKeyDown = async (e, brandId, field, editorBrands) => {
    if (e.key === 'Enter') {
      await handleCellBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    } else if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      await handleCellBlur();
      const newCell = navigateCell(brandId, field, e.key, editorBrands);
      if (newCell) {
        setEditingCell({ brandId: newCell.brandId, field: newCell.field });
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
        const newCell = navigateCell(brandId, field, e.key, editorBrands);
        if (newCell) {
          setEditingCell({ brandId: newCell.brandId, field: newCell.field });
          setEditValue(newCell.value);
        }
      }
    }
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
      }
    } catch (error) {
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
      }
    } catch (error) {
    }
  };

  const handleAddBrand = async (editor) => {
    const currentCounter = aaCounters[editor] || 1;
    const brandName = `aa${currentCounter}`;

    try {
      const response = await fetch(`${API_BASE_URL}/api/brand-management/entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sales_member: editor,
          brand: brandName,
          agency: '',
          pharma_company: '',
          industry: '',
          is_active: true
        })
      });

      const data = await response.json();
      if (data.status === 'success') {
        setAaCounters(prev => ({ ...prev, [editor]: currentCounter + 1 }));
        const newBrand = {
          id: data.id,
          sales_member: editor,
          brand: brandName,
          agency: '',
          pharma_company: '',
          industry: '',
          is_active: true
        };
        setBrands(prev => [newBrand, ...prev]);
        setNewRowIds(prev => new Set([...prev, data.id]));
      } else {
      }
    } catch (error) {
    }
  };

  const handleMoveBrand = async (brandId, targetLocation) => {
    const brand = brands.find(b => b.id === brandId);
    if (!brand) return;

    let updates = {};

    if (salesMembers.includes(targetLocation)) {
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
        setBrands(prev => prev.map(b =>
          b.id === brandId ? { ...b, ...updates } : b
        ));
        setNewRowIds(prev => new Set([...prev, brandId]));
      } else {
      }
    } catch (error) {
    }
  };

  const filterBrands = (brandsList) => {
    if (!searchText) return brandsList;
    const search = searchText.toLowerCase();
    return brandsList.filter(b =>
      (b.brand || '').toLowerCase().includes(search) ||
      (b.agency || '').toLowerCase().includes(search) ||
      (b.pharma_company || '').toLowerCase().includes(search) ||
      (b.industry || '').toLowerCase().includes(search)
    );
  };

  const getBrandsByEditor = (editor) => {
    const editorBrands = filterBrands(brands.filter(b => b.sales_member === editor && b.is_active));
    return [...editorBrands].sort((a, b) => {
      const aIsNew = newRowIds.has(a.id);
      const bIsNew = newRowIds.has(b.id);

      if (aIsNew && !bIsNew) return -1;
      if (!aIsNew && bIsNew) return 1;

      if (aIsNew && bIsNew) return 0;

      const aVal = (a.brand || '').toLowerCase();
      const bVal = (b.brand || '').toLowerCase();
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
      return 0;
    });
  };

  const getUnassignedBrands = () => {
    const unassigned = filterBrands(brands.filter(b => (!b.sales_member || b.sales_member.trim() === '') && b.is_active !== false));
    return [...unassigned].sort((a, b) => {
      const aIsNew = newRowIds.has(a.id);
      const bIsNew = newRowIds.has(b.id);

      if (aIsNew && !bIsNew) return -1;
      if (!aIsNew && bIsNew) return 1;
      if (aIsNew && bIsNew) return 0;

      const aVal = (a.brand || '').toLowerCase();
      const bVal = (b.brand || '').toLowerCase();
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
      return 0;
    });
  };

  const renderCell = (brand, field, editorBrands) => {
    const isEditing = editingCell?.brandId === brand.id && editingCell?.field === field;

    return (
      <td
        onClick={() => handleCellClick(brand.id, field, brand[field])}
        className={isEditing ? 'editing' : ''}
        style={{ width: '20%' }}
      >
        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleCellBlur}
            onKeyDown={(e) => handleKeyDown(e, brand.id, field, editorBrands)}
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
      'unassigned'
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
            {option === 'unassigned' ? 'Unassigned' : option}
          </option>
        ))}
      </select>
    );
  };

  const renderBrandSection = (editor, brandsData) => (
    <div key={editor} className="reports-section">
      <table className="reports-table" ref={el => tableRefs.current[editor] = el}>
        <tbody>
          <tr className="agency-section-header">
            <td className="agency-section-title-cell">
              <span>{editor}'s Brands <span className="agency-count">({brandsData.length})</span></span>
            </td>
            <td className="agency-section-empty-cell"></td>
            <td className="agency-section-empty-cell"></td>
            <td className="agency-section-empty-cell"></td>
            <td className="agency-section-action-cell">
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
              {renderCell(brand, 'brand', brandsData)}
              {renderCell(brand, 'agency', brandsData)}
              {renderCell(brand, 'pharma_company', brandsData)}
              {renderCell(brand, 'industry', brandsData)}
              <td className="actions-cell" style={{ width: '20%', textAlign: 'right', paddingRight: '16px' }}>
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
              <td colSpan="5" style={{ textAlign: 'center', color: '#888', padding: '20px', fontStyle: 'italic' }}>
                No brands assigned
              </td>
            </tr>
          )}
          <tr className="agency-divider">
            <td colSpan="5"></td>
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

      <div className="brand-header-row">
        <table className="reports-table">
          <thead>
            <tr>
              <th style={{ width: '20%', fontSize: '18px' }}>Brand</th>
              <th style={{ width: '20%', fontSize: '18px' }}>Agency</th>
              <th style={{ width: '20%', fontSize: '18px' }}>Pharma Company</th>
              <th style={{ width: '20%', fontSize: '18px' }}>Industry</th>
              <th style={{ width: '20%', textAlign: 'right', paddingRight: '16px', fontSize: '18px' }}>Actions</th>
            </tr>
          </thead>
        </table>
      </div>

      {salesMembers.map(editor => renderBrandSection(editor, getBrandsByEditor(editor)))}

      <div className="reports-section">
        <table className="reports-table" ref={el => tableRefs.current['unassigned'] = el}>
          <tbody>
            <tr className="agency-section-header">
              <td className="agency-section-title-cell">
                <span>Unassigned Brands <span className="agency-count">({getUnassignedBrands().length})</span></span>
              </td>
              <td className="agency-section-empty-cell"></td>
              <td className="agency-section-empty-cell"></td>
              <td className="agency-section-empty-cell"></td>
              <td className="agency-section-action-cell"></td>
            </tr>
            {(() => {
              const unassignedBrands = getUnassignedBrands();
              return unassignedBrands.map((brand, index) => (
                <tr key={brand.id} className={index % 2 === 0 ? 'report-row even-row' : 'report-row odd-row'}>
                  {renderCell(brand, 'brand', unassignedBrands)}
                  {renderCell(brand, 'agency', unassignedBrands)}
                  {renderCell(brand, 'pharma_company', unassignedBrands)}
                  {renderCell(brand, 'industry', unassignedBrands)}
                  <td className="actions-cell" style={{ width: '20%', textAlign: 'right', paddingRight: '16px' }}>
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
              ));
            })()}
            {getUnassignedBrands().length === 0 && (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: '#888', padding: '20px', fontStyle: 'italic' }}>
                  No unassigned brands
                </td>
              </tr>
            )}
            <tr className="agency-divider">
              <td colSpan="5"></td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default BrandManagement;