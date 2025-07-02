import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDrag } from 'react-dnd';
import { getComponentStyle, getTypographyStyle, MATRIX_COLORS } from './template/LayoutTemplates';

const MetricCard = ({ 
  id, 
  title, 
  value, 
  subtitle, 
  type = 'metric', 
  position = { x: 0, y: 0, width: 200, height: 100 },
  style = {},
  onEdit, 
  onDelete,
  onResize,
  onMove,
  onSelect,
  isEditing, 
  setIsEditing,
  isSelected = false
}) => {
  // Local state for editing
  const [localTitle, setLocalTitle] = useState(title);
  const [localValue, setLocalValue] = useState(value);
  const [localSubtitle, setLocalSubtitle] = useState(subtitle);
  
  // Drag and resize state
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [resizeStart, setResizeStart] = useState(null);
  
  const cardRef = useRef(null);
  const titleInputRef = useRef(null);
  const valueInputRef = useRef(null);
  const subtitleInputRef = useRef(null);

  // Update local state when props change
  useEffect(() => {
    setLocalTitle(title);
    setLocalValue(value);
    setLocalSubtitle(subtitle);
  }, [title, value, subtitle]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing === id && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditing, id]);

  // React DnD integration
  const [{ isDragMonitor }, drag] = useDrag(() => ({
    type: 'card',
    item: { id, type, position },
    collect: (monitor) => ({
      isDragMonitor: monitor.isDragging(),
    }),
  }), [id, position]);

  // ============================================================================
  // DRAG HANDLERS
  // ============================================================================

  const handleMouseDown = useCallback((e) => {
    // Prevent drag if clicking on interactive elements
    if (e.target.closest('.dashboard-canvas-delete-btn') || 
        e.target.closest('.dashboard-canvas-resize-handle') ||
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
    
    // Snap to 8px grid for precision
    const newX = Math.max(0, Math.round(rawX / 8) * 8);
    const newY = Math.max(0, Math.round(rawY / 8) * 8);
    
    // Constrain to canvas bounds (1024x576)
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

  // ============================================================================
  // RESIZE HANDLERS
  // ============================================================================

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
    
    // Calculate new dimensions with constraints
    const newWidth = Math.max(120, Math.min(resizeStart.startWidth + deltaX, 1024 - position.x));
    const newHeight = Math.max(60, Math.min(resizeStart.startHeight + deltaY, 576 - position.y));
    
    onResize?.(id, { width: newWidth, height: newHeight });
  }, [isResizing, resizeStart, position.x, position.y, onResize, id]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizeStart(null);
  }, []);

  // ============================================================================
  // GLOBAL MOUSE EVENTS
  // ============================================================================

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

  // ============================================================================
  // EDIT HANDLERS
  // ============================================================================

  const handleEdit = useCallback(() => {
    setIsEditing(id);
  }, [id, setIsEditing]);

  const handleSave = useCallback(() => {
    onEdit?.(id, { 
      title: localTitle, 
      value: localValue, 
      subtitle: localSubtitle 
    });
    setIsEditing(null);
  }, [id, localTitle, localValue, localSubtitle, onEdit, setIsEditing]);

  const handleCancel = useCallback(() => {
    setLocalTitle(title);
    setLocalValue(value);
    setLocalSubtitle(subtitle);
    setIsEditing(null);
  }, [title, value, subtitle, setIsEditing]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Move focus to next input
      if (e.target === titleInputRef.current) {
        valueInputRef.current?.focus();
      } else if (e.target === valueInputRef.current) {
        subtitleInputRef.current?.focus();
      } else {
        handleSave();
      }
    }
  }, [handleSave, handleCancel]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    onDelete?.(id);
  }, [id, onDelete]);

  // ============================================================================
  // CLICK HANDLERS
  // ============================================================================

  const handleClick = useCallback((e) => {
    if (e.target.closest('.dashboard-canvas-delete-btn') || 
        e.target.closest('.dashboard-canvas-resize-handle')) {
      return;
    }
    onSelect?.(e);
  }, [onSelect]);

  const handleDoubleClick = useCallback((e) => {
    if (e.target.closest('.dashboard-canvas-card-title') || 
        e.target.closest('.dashboard-canvas-card-value') ||
        e.target.closest('.dashboard-canvas-card-subtitle')) {
      handleEdit();
    }
  }, [handleEdit]);

  // ============================================================================
  // STYLING
  // ============================================================================

  const getCardClass = () => {
    const baseClass = 'dashboard-canvas-card';
    const typeClass = `dc-${type}`;
    const selectedClass = isSelected ? 'dc-selected' : '';
    const draggingClass = (isDragging || isDragMonitor) ? 'dc-dragging' : '';
    const resizingClass = isResizing ? 'dc-resizing' : '';
    const editingClass = isEditing === id ? 'dc-editing' : '';
    
    return `${baseClass} ${typeClass} ${selectedClass} ${draggingClass} ${resizingClass} ${editingClass}`.trim();
  };
  
  const cardStyle = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: position.width,
    height: position.height,
    ...getComponentStyle({ type, position, style }),
    ...style, // Apply any custom styles from template
    zIndex: isSelected ? 100 : isDragging ? 90 : 1,
    opacity: isDragging ? 0.8 : 1,
    border: isSelected ? `2px solid ${MATRIX_COLORS.primary || '#007bff'}` : style.border || '1px solid rgba(0, 0, 0, 0.08)',
    boxShadow: isSelected 
      ? `0 0 0 3px rgba(0, 123, 255, 0.2), 0 4px 16px rgba(0, 0, 0, 0.15)` 
      : style.boxShadow || '0 2px 8px rgba(0, 0, 0, 0.1)',
    borderRadius: style.borderRadius || '8px',
    background: style.background || MATRIX_COLORS.cardGradient || '#ffffff',
    color: style.color || MATRIX_COLORS.text || '#1f2937',
    cursor: isDragging ? 'move' : 'pointer',
    transition: isDragging || isResizing ? 'none' : 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
    overflow: 'hidden'
  };
  
  const getResponsiveFontSizes = () => {
    const baseWidth = 200;
    const baseHeight = 100;
    const scale = Math.min(position.width / baseWidth, position.height / baseHeight);
    
    return {
      title: Math.max(11, Math.min(20, 12 * scale)),
      value: Math.max(20, Math.min(48, 28 * scale)),
      subtitle: Math.max(9, Math.min(14, 10 * scale))
    };
  };
  
  const fontSizes = getResponsiveFontSizes();

  const titleStyle = {
    ...getTypographyStyle(type, 'title'),
    fontSize: `${fontSizes.title}px`,
    fontWeight: type === 'hero' ? '700' : '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
    marginTop: '-5px',
    lineHeight: '1.2',
    cursor: 'pointer',
    color: style.color || (type === 'hero' ? '#ffffff' : MATRIX_COLORS.text || '#1f2937')
  };
  
  const valueStyle = {
    ...getTypographyStyle(type, 'value'),
    fontSize: `${fontSizes.value}px`,
    fontWeight: type === 'hero' ? '800' : '700',
    marginBottom: '4px',
    lineHeight: '1.1',
    cursor: 'pointer',
    color: style.color || (type === 'hero' ? '#ffffff' : MATRIX_COLORS.primary || '#007bff')
  };
  
  const subtitleStyle = {
    ...getTypographyStyle(type, 'subtitle'),
    fontSize: `${fontSizes.subtitle}px`,
    fontWeight: '400',
    lineHeight: '1.4',
    opacity: 0.9,
    cursor: 'pointer',
    color: style.color || (type === 'hero' ? '#ffffff' : MATRIX_COLORS.textSecondary || '#6b7280')
  };

  const editing = isEditing === id;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div 
      ref={(node) => {
        cardRef.current = node;
        drag(node);
      }}
      className={getCardClass()}
      style={cardStyle}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* Delete Button */}
      <button 
        className="dashboard-canvas-delete-btn"
        onClick={handleDelete}
        aria-label="Delete card"
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
          zIndex: 10
        }}
      >
        ×
      </button>
      
      {/* Card Content */}
      <div className="dashboard-canvas-card-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {editing ? (
          <>
            {/* Editing Mode */}
            <input
              ref={titleInputRef}
              className="dashboard-canvas-title-input"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              placeholder="Card title"
              style={{
                ...titleStyle,
                background: 'rgba(255, 255, 255, 0.95)',
                border: '2px solid rgba(0, 123, 255, 0.5)',
                borderRadius: '4px',
                padding: '6px 8px',
                width: '100%',
                marginBottom: '8px',
                outline: 'none'
              }}
            />
            <input
              ref={valueInputRef}
              className="dashboard-canvas-value-input"
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              placeholder="Value"
              style={{
                ...valueStyle,
                background: 'rgba(255, 255, 255, 0.95)',
                border: '2px solid rgba(0, 123, 255, 0.5)',
                borderRadius: '4px',
                padding: '6px 8px',
                width: '100%',
                marginBottom: '8px',
                outline: 'none'
              }}
            />
            {subtitle && (
              <input
                ref={subtitleInputRef}
                className="dashboard-canvas-subtitle-input"
                value={localSubtitle}
                onChange={(e) => setLocalSubtitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSave}
                placeholder="Subtitle"
                style={{
                  ...subtitleStyle,
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '2px solid rgba(0, 123, 255, 0.5)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  width: '100%',
                  outline: 'none'
                }}
              />
            )}
          </>
        ) : (
          <>
            {/* Display Mode */}
            <div 
              className="dashboard-canvas-card-title" 
              style={titleStyle} 
              onDoubleClick={handleEdit}
              title="Double-click to edit"
            >
              {title}
            </div>
            <div 
              className="dashboard-canvas-card-value" 
              style={valueStyle} 
              onDoubleClick={handleEdit}
              title="Double-click to edit"
            >
              {value}
            </div>
            {subtitle && (
              <div 
                className="dashboard-canvas-card-subtitle" 
                style={subtitleStyle} 
                onDoubleClick={handleEdit}
                title="Double-click to edit"
              >
                {subtitle}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Resize Handle */}
      <div 
        className="dashboard-canvas-resize-handle"
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

export default MetricCard;