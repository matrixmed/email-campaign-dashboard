import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDrag } from 'react-dnd';
import { getComponentStyle, MATRIX_COLORS } from './template/LayoutTemplates';

const SpecialtyKPIStrips = ({ 
  id, 
  title = 'Audience Breakdown',
  campaign,
  specialties = [],
  position = { x: 0, y: 0, width: 460, height: 70 },
  style = {},
  onEdit, 
  onDelete,
  onMove,
  onResize,
  onSelect,
  isEditing,
  setIsEditing,
  isSelected = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [resizeStart, setResizeStart] = useState(null);
  const [localTitle, setLocalTitle] = useState(title);
  const stripRef = useRef(null);
  const titleInputRef = useRef(null);

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  useEffect(() => {
    if (isEditing === id && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditing, id]);

  const [{ isDragMonitor }, drag] = useDrag(() => ({
    type: 'specialty-strips',
    item: { id, type: 'specialty-strips', position },
    collect: (monitor) => ({
      isDragMonitor: monitor.isDragging(),
    }),
  }), [id, position]);

  const getTopSpecialties = useCallback(() => {
    if (Array.isArray(specialties) && specialties.length > 0) {
      return specialties.slice(0, 4);
    }
    
    if (campaign?.specialty_performance) {
      return Object.entries(campaign.specialty_performance)
        .filter(([name, data]) => {
          return data.audience_total >= 100 && 
                 !name.toLowerCase().includes('unknown') &&
                 !name.toLowerCase().includes('staff') &&
                 data.unique_open_rate > 0;
        })
        .sort((a, b) => b[1].audience_percentage - a[1].audience_percentage)
        .slice(0, 4);
    }
    
    if (typeof specialties === 'object' && specialties !== null) {
      return Object.entries(specialties).slice(0, 4);
    }
    
    return [];
  }, [campaign, specialties]);

  const topSpecialties = getTopSpecialties();

  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.strip-delete-btn') || 
        e.target.closest('.strip-resize-handle') ||
        e.target.tagName === 'INPUT' ||
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
    
    const newWidth = Math.max(300, Math.min(resizeStart.startWidth + deltaX, 1024 - position.x));
    const newHeight = Math.max(120, Math.min(resizeStart.startHeight + deltaY, 576 - position.y));
    
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
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  const handleEdit = useCallback(() => {
    setIsEditing(id);
  }, [id, setIsEditing]);

  const handleSave = useCallback(() => {
    onEdit?.(id, { title: localTitle });
    setIsEditing(null);
  }, [id, localTitle, onEdit, setIsEditing]);

  const handleCancel = useCallback(() => {
    setLocalTitle(title);
    setIsEditing(null);
  }, [title, setIsEditing]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    onDelete?.(id);
  }, [id, onDelete]);

  const handleClick = useCallback((e) => {
    if (e.target.closest('.strip-delete-btn') || 
        e.target.closest('.strip-resize-handle')) {
      return;
    }
    onSelect?.(e);
  }, [onSelect]);

  const handleDoubleClick = useCallback((e) => {
    if (e.target.closest('.strip-title')) {
      handleEdit();
    }
  }, [handleEdit]);

  const formatSpecialtyName = (name) => {
    const cleanName = name.split(' - ')[0];
    return cleanName.length > 20 ? cleanName.substring(0, 20) + '...' : cleanName;
  };

  const getTrendIcon = (delta) => {
    if (delta > 0) return '↗';
    if (delta < 0) return '↘';
    return '';
  };

  const getTrendColor = (delta) => {
    if (delta > 0) return '#28a745';
    if (delta < 0) return '#dc3545';
    return '#6c757d';
  };

  const formatDelta = (delta) => {
    if (delta === 0) return '';
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(1)}%`;
  };

  const getStripClass = () => {
    const baseClass = 'dashboard-canvas-specialty-strips';
    const selectedClass = isSelected ? 'strips-selected' : '';
    const draggingClass = (isDragging || isDragMonitor) ? 'strips-dragging' : '';
    const resizingClass = isResizing ? 'strips-resizing' : '';
    
    return `${baseClass} ${selectedClass} ${draggingClass} ${resizingClass}`.trim();
  };

  const containerStyle = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: position.width,
    height: position.height,
    ...getComponentStyle({ type: 'specialty-strips', position, style }),
    ...style,
    zIndex: isSelected ? 100 : isDragging ? 90 : 1,
    opacity: isDragging ? 0.8 : 1,
    border: isSelected ? `2px solid ${MATRIX_COLORS.primary || '#007bff'}` : style.border || '1px solid rgba(0, 0, 0, 0.05)',
    boxShadow: isSelected 
      ? `0 0 0 3px rgba(0, 123, 255, 0.2), 0 4px 16px rgba(0, 0, 0, 0.15)` 
      : style.boxShadow || '0 2px 8px rgba(0, 0, 0, 0.05)',
    borderRadius: style.borderRadius || '8px',
    background: style.background || 'transparent',
    cursor: isDragging ? 'move' : 'pointer',
    transition: isDragging || isResizing ? 'none' : 'all 0.2s ease',
    padding: '16px'
  };

  const headerStyle = {
    fontSize: Math.max(9, Math.min(12, position.width / 30)),
    fontWeight: '700',
    color: style.color || MATRIX_COLORS.darkGray || '#2c3e50',
    marginBottom: '10px',
    marginTop: '-6px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    cursor: 'pointer'
  };

  const gridContainerStyle = {
    display: 'grid',
    gridTemplateColumns: topSpecialties.length <= 2 ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
    gridTemplateRows: topSpecialties.length <= 2 ? '1fr' : 'repeat(2, 1fr)',
    gap: '12px',
    height: 'calc(100% - 40px)'
  };

  const pillStyle = {
    background: 'linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%)',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '40px',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
  };

  const editing = isEditing === id;

  if (topSpecialties.length === 0) {
    return (
      <div 
        ref={(node) => {
          stripRef.current = node;
          drag(node);
        }}
        className={getStripClass()}
        style={containerStyle} 
        onMouseDown={handleMouseDown}
        onClick={handleClick}
      >
        <button 
          className="strip-delete-btn"
          onClick={handleDelete}
          aria-label="Delete specialty strips"
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

        <div className="strip-title" style={headerStyle}>
          {editing ? (
            <input
              ref={titleInputRef}
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
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
            <span onDoubleClick={handleEdit} title="Double-click to edit">
              {localTitle}
            </span>
          )}
        </div>
        
        <div style={{ 
          color: MATRIX_COLORS.gray || '#6c757d', 
          fontSize: '12px',
          textAlign: 'center',
          marginTop: '20px'
        }}>
          No specialty data available
        </div>

        <div 
          className="strip-resize-handle"
          onMouseDown={handleResizeStart}
          title="Drag to resize"
          style={{
            position: 'absolute',
            bottom: '0px',
            right: '0px',
            width: '16px',
            height: '16px',
            cursor: 'se-resize',
            background: 'linear-gradient(-45deg, transparent 30%, rgba(0, 123, 255, 0.3) 30%, rgba(0, 123, 255, 0.3) 70%, transparent 70%)',
            opacity: isSelected ? 1 : 0,
            transition: 'opacity 0.2s ease'
          }}
        />
      </div>
    );
  }

  return (
    <div 
      ref={(node) => {
        stripRef.current = node;
        drag(node);
      }}
      className={getStripClass()}
      style={containerStyle} 
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <button 
        className="strip-delete-btn"
        onClick={handleDelete}
        aria-label="Delete specialty strips"
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

      <div className="strip-title" style={headerStyle}>
        {editing ? (
          <input
            ref={titleInputRef}
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: 'inherit',
              fontWeight: 'inherit',
              color: 'inherit',
              width: '100%',
              outline: 'none',
              padding: '0px'
            }}
            autoFocus
          />
        ) : (
          <span onDoubleClick={handleEdit} title="Double-click to edit">
            {localTitle}
          </span>
        )}
      </div>

      <div style={gridContainerStyle}>
        {topSpecialties.map(([name, data], index) => {
          const cleanName = formatSpecialtyName(name);
          const engagementRate = data.unique_open_rate?.toFixed(1) || '0.0';
          const audienceShare = data.audience_percentage?.toFixed(1) || '0.0';
          const delta = data.performance_delta || 0;
          const trendIcon = getTrendIcon(delta);
          const trendColor = getTrendColor(delta);
          const deltaText = formatDelta(delta);
          const engagedCount = data.unique_opens || 0;
          
          return (
            <div key={index} style={pillStyle}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start',
                marginBottom: '8px'
              }}>
                <div style={{ 
                  fontSize: Math.max(10, Math.min(12, position.width / 40)),
                  fontWeight: '700',
                  color: MATRIX_COLORS.darkGray || '#2c3e50',
                  lineHeight: '1.2',
                  flex: '1',
                  marginRight: '8px'
                }}>
                  {cleanName}
                </div>
                
                <div style={{ 
                  fontSize: Math.max(8, Math.min(10, position.width / 50)),
                  fontWeight: '600',
                  color: MATRIX_COLORS.gray || '#6c757d',
                  whiteSpace: 'nowrap'
                }}>
                  {audienceShare}% of audience
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-end'
              }}>
                <div style={{ 
                  fontSize: Math.max(14, Math.min(16, position.width / 30)),
                  fontWeight: '800',
                  color: MATRIX_COLORS.darkGray || '#2c3e50'
                }}>
                  {engagementRate}%
                </div>
                
                {deltaText && (
                  <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    fontSize: Math.max(9, Math.min(11, position.width / 45)),
                    fontWeight: '700',
                    color: trendColor,
                    marginLeft: '8px'
                  }}>
                    <span>{trendIcon}</span>
                    <span>{deltaText}</span>
                  </div>
                )}
                
                <div style={{ 
                  fontSize: Math.max(7, Math.min(9, position.width / 55)),
                  fontWeight: '600',
                  color: MATRIX_COLORS.gray || '#6c757d',
                  textAlign: 'right',
                  whiteSpace: 'nowrap',
                  marginLeft: '8px'
                }}>
                  {engagedCount.toLocaleString()} engaged
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div 
        className="strip-resize-handle"
        onMouseDown={handleResizeStart}
        title="Drag to resize"
        style={{
          position: 'absolute',
          bottom: '0px',
          right: '0px',
          width: '16px',
          height: '16px',
          cursor: 'se-resize',
          background: 'linear-gradient(-45deg, transparent 30%, rgba(0, 123, 255, 0.3) 30%, rgba(0, 123, 255, 0.3) 70%, transparent 70%)',
          opacity: isSelected ? 1 : 0,
          transition: 'opacity 0.2s ease'
        }}
      />
    </div>
  );
};

export default SpecialtyKPIStrips;