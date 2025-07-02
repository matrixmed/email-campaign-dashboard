import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDrag } from 'react-dnd';
import { getComponentStyle, getTypographyStyle, MATRIX_COLORS } from './template/LayoutTemplates';

const TitleComponent = ({ 
  id, 
  title = 'Campaign Title',
  subtitle = '',
  position = { x: 0, y: 0, width: 600, height: 80 },
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
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [resizeStart, setResizeStart] = useState(null);
  const [localTitle, setLocalTitle] = useState(title);
  const [localSubtitle, setLocalSubtitle] = useState(subtitle);
  const titleRef = useRef(null);
  const titleInputRef = useRef(null);
  const subtitleInputRef = useRef(null);

  useEffect(() => {
    setLocalTitle(title);
    setLocalSubtitle(subtitle);
  }, [title, subtitle]);

  useEffect(() => {
    if (isEditing === id && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditing, id]);

  const [{ isDragMonitor }, drag] = useDrag(() => ({
    type: 'title',
    item: { id, type: 'title', position },
    collect: (monitor) => ({
      isDragMonitor: monitor.isDragging(),
    }),
  }), [id, position]);

  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.title-delete-btn') || 
        e.target.closest('.title-resize-handle') ||
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
    
    const newWidth = Math.max(300, Math.min(resizeStart.startWidth + deltaX, 1024 - position.x));
    const newHeight = Math.max(60, Math.min(resizeStart.startHeight + deltaY, 576 - position.y));
    
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
    onEdit?.(id, { 
      title: localTitle, 
      subtitle: localSubtitle 
    });
    setIsEditing(null);
  }, [id, localTitle, localSubtitle, onEdit, setIsEditing]);

  const handleCancel = useCallback(() => {
    setLocalTitle(title);
    setLocalSubtitle(subtitle);
    setIsEditing(null);
  }, [title, subtitle, setIsEditing]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.target === titleInputRef.current && subtitleInputRef.current) {
        subtitleInputRef.current.focus();
      } else {
        handleSave();
      }
    }
  }, [handleSave, handleCancel]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    onDelete?.(id);
  }, [id, onDelete]);

  const handleClick = useCallback((e) => {
    if (e.target.closest('.title-delete-btn') || 
        e.target.closest('.title-resize-handle')) {
      return;
    }
    onSelect?.(e);
  }, [onSelect]);

  const handleDoubleClick = useCallback((e) => {
    if (e.target.closest('.title-content') || 
        e.target.closest('.title-text') ||
        e.target.closest('.subtitle-text')) {
      handleEdit();
    }
  }, [handleEdit]);

  const getTitleClass = () => {
    const baseClass = 'dashboard-canvas-title';
    const selectedClass = isSelected ? 'title-selected' : '';
    const draggingClass = (isDragging || isDragMonitor) ? 'title-dragging' : '';
    const resizingClass = isResizing ? 'title-resizing' : '';
    const editingClass = isEditing === id ? 'title-editing' : '';
    
    return `${baseClass} ${selectedClass} ${draggingClass} ${resizingClass} ${editingClass}`.trim();
  };

  const containerStyle = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: position.width,
    height: position.height,
    ...getComponentStyle({ type: 'title', position, style }),
    ...style,
    zIndex: isSelected ? 100 : isDragging ? 90 : 1,
    opacity: isDragging ? 0.8 : 1,
    border: isSelected ? `2px solid ${MATRIX_COLORS.primary || '#007bff'}` : style.border || '2px solid transparent',
    boxShadow: isSelected 
      ? `0 0 0 3px rgba(0, 123, 255, 0.2), 0 4px 16px rgba(0, 0, 0, 0.15)` 
      : style.boxShadow || 'none',
    borderRadius: style.borderRadius || '8px',
    background: style.background || 'transparent',
    cursor: isDragging ? 'move' : 'pointer',
    transition: isDragging || isResizing ? 'none' : 'all 0.2s ease',
    padding: '16px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  };

  const getResponsiveFontSizes = () => {
    const baseWidth = 600;
    const baseHeight = 80;
    const scale = Math.min(position.width / baseWidth, position.height / baseHeight);
    
    return {
      title: Math.max(18, Math.min(32, 24 * scale)),
      subtitle: Math.max(12, Math.min(16, 14 * scale))
    };
  };

  const fontSizes = getResponsiveFontSizes();

  const titleStyle = {
    ...getTypographyStyle('title', 'value'),
    fontSize: `${fontSizes.title}px`,
    fontWeight: '800',
    color: style.color || MATRIX_COLORS.darkGray || '#1f2937',
    background: style.textGradient ? `linear-gradient(135deg, ${MATRIX_COLORS.secondary || '#6366f1'} 0%, ${MATRIX_COLORS.primary || '#007bff'} 100%)` : 'none',
    WebkitBackgroundClip: style.textGradient ? 'text' : 'unset',
    WebkitTextFillColor: style.textGradient ? 'transparent' : 'unset',
    backgroundClip: style.textGradient ? 'text' : 'unset',
    margin: '0 0 8px 0',
    letterSpacing: '-0.5px',
    lineHeight: '1.2',
    cursor: 'pointer'
  };

  const subtitleStyle = {
    ...getTypographyStyle('title', 'subtitle'),
    fontSize: `${fontSizes.subtitle}px`,
    fontWeight: '600',
    color: style.color || MATRIX_COLORS.gray || '#6b7280',
    margin: '0',
    textTransform: subtitle ? 'uppercase' : 'none',
    letterSpacing: '0.5px',
    lineHeight: '1.4',
    cursor: 'pointer',
    opacity: 0.9
  };

  const editing = isEditing === id;

  return (
    <div 
      ref={(node) => {
        titleRef.current = node;
        drag(node);
      }}
      className={getTitleClass()}
      style={containerStyle}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <button 
        className="title-delete-btn"
        onClick={handleDelete}
        aria-label="Delete title"
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

      <div className="title-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {editing ? (
          <>
            <input
              ref={titleInputRef}
              className="title-input"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              placeholder="Campaign Title"
              style={{
                ...titleStyle,
                background: 'rgba(255, 255, 255, 0.95)',
                border: '2px solid rgba(0, 123, 255, 0.5)',
                borderRadius: '4px',
                padding: '8px 12px',
                width: '100%',
                marginBottom: '8px',
                outline: 'none',
                WebkitBackgroundClip: 'unset',
                WebkitTextFillColor: 'unset',
                backgroundClip: 'unset'
              }}
              autoFocus
            />
            {subtitle !== undefined && (
              <input
                ref={subtitleInputRef}
                className="subtitle-input"
                value={localSubtitle}
                onChange={(e) => setLocalSubtitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSave}
                placeholder="Subtitle (optional)"
                style={{
                  ...subtitleStyle,
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '2px solid rgba(0, 123, 255, 0.5)',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  width: '100%',
                  outline: 'none',
                  textTransform: 'none'
                }}
              />
            )}
          </>
        ) : (
          <>
            <h1 
              className="title-text" 
              style={titleStyle}
              onDoubleClick={handleEdit}
              title="Double-click to edit"
            >
              {title}
            </h1>
            {subtitle && (
              <h2 
                className="subtitle-text" 
                style={subtitleStyle}
                onDoubleClick={handleEdit}
                title="Double-click to edit"
              >
                {subtitle}
              </h2>
            )}
          </>
        )}
      </div>

      <div 
        className="title-resize-handle"
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

export default TitleComponent;