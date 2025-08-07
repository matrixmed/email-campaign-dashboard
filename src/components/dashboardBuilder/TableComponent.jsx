import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDrag } from 'react-dnd';
import { getComponentStyle, MATRIX_COLORS } from './template/LayoutTemplates';

const TableComponent = ({ 
  id, 
  title = 'Data Table',
  data = [],
  config = { rows: 5, cols: 3 },
  position = { x: 0, y: 0, width: 400, height: 300 },
  style = {},
  onEdit, 
  onDelete,
  onResize,
  onMove,
  onSelect,
  isEditing, 
  setIsEditing,
  isSelected = false,
  campaign = null
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [resizeStart, setResizeStart] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [tableTitle, setTableTitle] = useState(title);
  const [isEditingCell, setIsEditingCell] = useState(null);
  const tableRef = useRef(null);
  const titleInputRef = useRef(null);

  useEffect(() => {
    setTableTitle(title);
  }, [title]);

  useEffect(() => {
    if (config.customData) {
      if (config.customData.headers && config.customData.rows) {
        setTableData([config.customData.headers, ...config.customData.rows]);
      } else if (Array.isArray(config.customData)) {
        if (isCampaignComparisonTable && config.headers && !Array.isArray(config.customData[0])) {
          setTableData([config.headers, ...config.customData]);
        } else if (isCampaignComparisonTable && config.headers && config.customData.length > 0 && 
                   config.customData[0].length > 0 && config.customData[0][0] !== 'Campaign Name') {
          setTableData([config.headers, ...config.customData]);
        } else {
          setTableData(config.customData);
        }
      }
    } else if (config.dataType === 'specialty' && campaign?.specialty_performance) {
      const specialties = Object.entries(campaign.specialty_performance)
        .filter(([name, data]) => data.audience_total >= 100)
        .sort(([,a], [,b]) => (b.unique_open_rate || 0) - (a.unique_open_rate || 0))
        .slice(0, 5);
      
      const specialtyData = [
        ['Specialty', 'Open Rate', 'Audience', 'vs Industry'],
        ...specialties.map(([name, data]) => [
          name.split(' - ')[0], 
          `${data.unique_open_rate?.toFixed(1) || 0}%`,
          data.audience_total?.toLocaleString() || '0',
          `${data.performance_delta > 0 ? '+' : ''}${data.performance_delta?.toFixed(1) || 0}%`
        ])
      ];
      setTableData(specialtyData);
      setTableTitle('Top Specialty Performance');
    } else if (config.dataType === 'authority' && campaign?.authority_metrics) {
      const authorityData = [
        ['Credential', 'Engagement Rate'],
        ['MD', `${campaign.authority_metrics.md_engagement_rate?.toFixed(1) || 0}%`],
        ['DO', `${campaign.authority_metrics.do_engagement_rate?.toFixed(1) || 0}%`],
        ['NP', `${campaign.authority_metrics.np_engagement_rate?.toFixed(1) || 0}%`],
        ['PA', `${campaign.authority_metrics.pa_engagement_rate?.toFixed(1) || 0}%`]
      ].filter(row => row[0] === 'Credential' || parseFloat(row[1]) > 0);
      
      setTableData(authorityData);
      setTableTitle('Professional Authority Analysis');
    } else if (config.dataType === 'geographic' && campaign?.geographic_distribution) {
      const geoData = [
        ['Region', 'Engagement Rate', 'Volume'],
        ...Object.entries(campaign.geographic_distribution)
          .sort(([,a], [,b]) => (b.engagement_rate || 0) - (a.engagement_rate || 0))
          .slice(0, 8)
          .map(([region, data]) => [
            region.charAt(0).toUpperCase() + region.slice(1),
            `${data.engagement_rate?.toFixed(1) || 0}%`,
            data.volume?.toLocaleString() || '0'
          ])
      ];
      setTableData(geoData);
      setTableTitle('Regional Performance');
    } else {
      const emptyData = Array(config.rows || 5).fill().map((_, rowIndex) => 
        Array(config.cols || 3).fill().map((_, colIndex) => 
          rowIndex === 0 ? `Header ${colIndex + 1}` : 
          `Row ${rowIndex} Col ${colIndex + 1}`
        )
      );
      setTableData(emptyData);
    }
  }, [config, campaign, title]);

  const [{ isDragMonitor }, drag] = useDrag(() => ({
    type: 'table',
    item: { id, type: 'table', position },
    collect: (monitor) => ({
      isDragMonitor: monitor.isDragging(),
    }),
  }), [id, position]);

  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.table-delete-btn') || 
        e.target.closest('.table-resize-handle') ||
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        isEditing === id) {
      return;
    }

    e.preventDefault();
    onSelect?.(e);
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  }, [position, onSelect, isEditing, id]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !dragStart) return;

    const rawX = e.clientX - dragStart.x;
    const rawY = e.clientY - dragStart.y;
    
    const newX = Math.max(0, Math.round(rawX / 8) * 8);
    const newY = Math.max(0, Math.round(rawY / 8) * 8);
    
    const maxX = 1024 - position.width;
    const maxY = 576 - position.height;
    
    onMove?.(id, {
      x: Math.min(newX, maxX),
      y: Math.min(newY, maxY)
    });
  }, [isDragging, dragStart, position.width, position.height, onMove, id]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeStart({
      startX: e.clientX,
      startY: e.clientY,
      startWidth: position.width,
      startHeight: position.height
    });
  }, [position.width, position.height]);

  const handleResizeMove = useCallback((e) => {
    if (!isResizing || !resizeStart) return;
    
    const deltaX = e.clientX - resizeStart.startX;
    const deltaY = e.clientY - resizeStart.startY;
    
    const newWidth = Math.max(200, Math.min(resizeStart.startWidth + deltaX, 1024 - position.x));
    const newHeight = Math.max(150, Math.min(resizeStart.startHeight + deltaY, 576 - position.y));
    
    onResize?.(id, { width: newWidth, height: newHeight });
  }, [isResizing, resizeStart, position.x, position.y, onResize, id]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizeStart(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'move';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'se-resize';
      document.body.style.userSelect = '';
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    onDelete?.(id);
  }, [id, onDelete]);

  const handleCellEdit = useCallback((rowIndex, colIndex, value) => {
    const newData = [...tableData];
    newData[rowIndex][colIndex] = value;
    setTableData(newData);
    onEdit?.(id, { data: newData });
  }, [tableData, onEdit, id]);

  const handleTitleEdit = useCallback((newTitle) => {
    setTableTitle(newTitle);
    onEdit?.(id, { title: newTitle });
  }, [onEdit, id]);

  const handleCellDoubleClick = useCallback((rowIndex, colIndex) => {
    setIsEditingCell({ row: rowIndex, col: colIndex });
  }, []);

  const handleCellKeyDown = useCallback((e, rowIndex, colIndex) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsEditingCell(null);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditingCell(null);
      const originalData = [...tableData];
      setTableData(originalData);
    }
  }, [tableData]);

  const handleTitleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setIsEditing(null);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setTableTitle(title);
      setIsEditing(null);
    }
  }, [setIsEditing, title]);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (e.target.closest('.table-delete-btn') || 
        e.target.closest('.table-resize-handle')) {
      return;
    }
    onSelect?.(e);
  }, [onSelect]);

  const handleDoubleClick = useCallback((e) => {
    if (e.target.closest('.table-title')) {
      setIsEditing(id);
    }
  }, [id, setIsEditing]);

  const getTableClass = () => {
    const baseClass = 'dashboard-canvas-table';
    const selectedClass = isSelected ? 'table-selected' : '';
    const draggingClass = (isDragging || isDragMonitor) ? 'table-dragging' : '';
    const resizingClass = isResizing ? 'table-resizing' : '';
    
    return `${baseClass} ${selectedClass} ${draggingClass} ${resizingClass}`.trim();
  };

  const isCampaignComparisonTable = id === 'campaign-comparison-table';
  
  const tableStyle = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: position.width,
    height: position.height,
    ...getComponentStyle({ type: 'table', position, style }),
    ...style,
    zIndex: isSelected ? 100 : isDragging ? 90 : 1,
    opacity: isDragging ? 0.8 : 1,
    border: isSelected ? `2px solid ${MATRIX_COLORS.primary || '#007bff'}` : style.border || '1px solid #e0e0e0',
    boxShadow: isSelected 
      ? `0 0 0 3px rgba(0, 123, 255, 0.2), 0 4px 16px rgba(0, 0, 0, 0.15)` 
      : style.boxShadow || '0 2px 8px rgba(0, 0, 0, 0.1)',
    borderRadius: style.borderRadius || '8px',
    background: style.background || '#ffffff',
    cursor: isDragging ? 'move' : 'pointer',
    transition: isDragging || isResizing ? 'none' : 'all 0.2s ease',
    padding: isCampaignComparisonTable ? '2px' : '8px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  };

  const titleStyle = {
    fontSize: Math.max(12, Math.min(18, position.width / 25)),
    fontWeight: '700',
    color: style.color || '#2c3e50',
    marginBottom: isCampaignComparisonTable ? '2px' : '9px',
    textAlign: 'center',
    cursor: 'pointer'
  };

  const tableContainerStyle = {
    flex: 1,
    overflow: 'auto',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    background: '#ffffff',
    margin: isCampaignComparisonTable ? '0' : '0',
    padding: '0'
  };

  const actualTableStyle = {
    width: '100%',
    height: '100%',
    borderCollapse: 'collapse',
    fontSize: Math.max(8, Math.min(14, position.width / (data[0]?.length * 8 || 35))),
    tableLayout: 'fixed'
  };

  const getColumnWidth = (colIndex, totalCols) => {
    if (isCampaignComparisonTable && colIndex === 0) {
      return '17%';
    }
    
    if (totalCols <= 3) return 'auto';
    if (totalCols <= 5) return `${100 / totalCols}%`;
    return `${Math.max(12, 100 / totalCols)}%`;
  };

  const getCellStyle = (rowIndex, colIndex) => {
    const isHeader = rowIndex === 0;
    return {
      ...dataCellStyle,
      backgroundColor: rowIndex % 2 === 0 ? '#f9f9f9' : '#ffffff',
      width: getColumnWidth(colIndex),
      fontWeight: isCampaignComparisonTable && isHeader ? 'bold' : 'normal'
    };
  };

  const dataCellStyle = {
    border: '1px solid #e0e0e0',
    padding: isCampaignComparisonTable ? '2px 4px' : '4px 6px',
    textAlign: isCampaignComparisonTable ? 'center' : 'left',
    verticalAlign: 'middle',
    fontSize: 'inherit',
    color: '#111'
  };

  useEffect(() => {
    if (isEditing === id && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditing, id]);

  return (
    <div 
      ref={(node) => {
        tableRef.current = node;
        drag(node);
      }}
      className={getTableClass()}
      style={tableStyle}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <button 
        className="table-delete-btn"
        onClick={handleDelete}
        aria-label="Delete table"
        type="button"
        style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          border: 'none',
          background: 'rgba(220, 38, 38, 0.9)',
          color: 'white',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isSelected ? 1 : 0,
          transition: 'opacity 0.2s ease',
          zIndex: 20
        }}
      >
        ×
      </button>

      <div className="table-title" style={titleStyle}>
        {isEditing === id ? (
          <input
            ref={titleInputRef}
            value={tableTitle}
            onChange={(e) => setTableTitle(e.target.value)}
            onBlur={() => {
              handleTitleEdit(tableTitle);
              setIsEditing(null);
            }}
            onKeyDown={handleTitleKeyDown}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: 'inherit',
              fontWeight: 'inherit',
              color: 'inherit',
              width: '100%',
              outline: 'none',
              padding: '2px'
            }}
            autoFocus
          />
        ) : (
          <span onDoubleClick={() => setIsEditing(id)} title="Double-click to edit">
            {tableTitle}
          </span>
        )}
      </div>

      <div style={tableContainerStyle}>
        <table style={actualTableStyle}>
          <tbody>
            {tableData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => {
                  const isHeader = rowIndex === 0;
                  const isEditingThisCell = isEditingCell?.row === rowIndex && isEditingCell?.col === colIndex;
                  
                  return (
                    <td 
                      key={colIndex} 
                      style={getCellStyle(rowIndex, colIndex)}
                      onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                    >
                      {isEditingThisCell ? (
                        <input
                          value={cell}
                          onChange={(e) => handleCellEdit(rowIndex, colIndex, e.target.value)}
                          onBlur={() => setIsEditingCell(null)}
                          onKeyDown={(e) => handleCellKeyDown(e, rowIndex, colIndex)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            fontSize: 'inherit',
                            width: '100%',
                            padding: '0',
                            outline: 'none'
                          }}
                          autoFocus
                        />
                      ) : (
                        <span 
                          title="Double-click to edit"
                          style={{ cursor: 'pointer' }}
                        >
                          {cell}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div 
        className="table-resize-handle"
        onMouseDown={handleResizeStart}
        title="Drag to resize"
        style={{
          position: 'absolute',
          bottom: '0px',
          right: '0px',
          width: '16px',
          height: '16px',
          opacity: isSelected ? 1 : 0,
          transition: 'opacity 0.2s ease'
        }}
      />
    </div>
  );
};

export default TableComponent;