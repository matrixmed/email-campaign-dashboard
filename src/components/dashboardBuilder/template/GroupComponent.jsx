import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MATRIX_COLORS } from './LayoutTemplates';
import MetricCard from '../MetricCard';
import TableComponent from '../TableComponent';
import TitleComponent from '../TitleComponent';

const GroupComponent = ({ 
  id, 
  title = 'Component Group',
  children = [],
  position = { x: 0, y: 0, width: 400, height: 300 },
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
  const [localTitle, setLocalTitle] = useState(title);
  
  const groupRef = useRef(null);

  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.group-delete-btn') || 
        e.target.closest('.group-resize-handle') ||
        e.target.tagName === 'INPUT' ||
        isEditing === id) {
      return;
    }

    e.preventDefault();
    onSelect?.();
    
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
      document.body.style.userSelect = 'none';
      
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

  const handleTitleEdit = useCallback((newTitle) => {
    setLocalTitle(newTitle);
    onEdit?.(id, { title: newTitle });
  }, [onEdit, id]);

  const groupStyle = {
    position: 'absolute',
    left: `${position.x}px`,
    top: `${position.y}px`,
    width: `${position.width}px`,
    height: `${position.height}px`,
    border: isSelected 
      ? `3px solid ${MATRIX_COLORS.primary}` 
      : `2px dashed ${MATRIX_COLORS.gray}`,
    borderRadius: '8px',
    background: 'rgba(204, 0, 1, 0.02)',
    cursor: isDragging ? 'move' : 'default',
    zIndex: isSelected ? 100 : 1,
    transition: isDragging ? 'none' : 'all 0.2s ease',
    opacity: isDragging ? 0.8 : 1,
    overflow: 'hidden'
  };

  const headerStyle = {
    position: 'absolute',
    top: '0',
    left: '0',
    right: '0',
    height: '32px',
    background: `linear-gradient(90deg, ${MATRIX_COLORS.primary} 0%, ${MATRIX_COLORS.primaryDark} 100%)`,
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '6px 6px 0 0'
  };

  return (
    <div style={groupStyle} onMouseDown={handleMouseDown} ref={groupRef}>
      <div style={headerStyle}>
        {isEditing === id ? (
          <input
            value={localTitle}
            onChange={(e) => handleTitleEdit(e.target.value)}
            onBlur={() => setIsEditing(null)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditing(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: 'inherit',
              fontWeight: 'inherit',
              width: '100%'
            }}
            autoFocus
          />
        ) : (
          <span onDoubleClick={() => setIsEditing(id)}>
            📦 {localTitle} ({children.length} items)
          </span>
        )}
      </div>

      <button 
        className="group-delete-btn"
        onClick={handleDelete}
        style={{
          position: 'absolute',
          top: '4px',
          right: '4px',
          width: '24px',
          height: '24px',
          border: 'none',
          background: 'rgba(255, 255, 255, 0.9)',
          color: MATRIX_COLORS.primary,
          borderRadius: '50%',
          cursor: 'pointer',
          fontSize: '14px',
          lineHeight: '1',
          opacity: isSelected ? 1 : 0,
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20
        }}
      >
        ×
      </button>

      <div style={{ 
        position: 'relative', 
        width: '100%', 
        height: 'calc(100% - 32px)',
        top: '32px',
        overflow: 'hidden'
      }}>
        {children.map(child => {
          const childPosition = {
            x: position.x + child.relativePosition.x,
            y: position.y + child.relativePosition.y + 32,
            width: child.relativePosition.width,
            height: child.relativePosition.height
          };

          const commonProps = {
            key: child.id,
            ...child,
            position: childPosition,
            onEdit: () => {},
            onDelete: () => {},
            onMove: () => {}, 
            onResize: () => {},
            onSelect: () => {},
            isEditing: null,
            setIsEditing: () => {},
            isSelected: false
          };

          if (child.type === 'table') {
            return <TableComponent {...commonProps} campaign={campaign} />;
          } else if (child.type === 'title') {
            return <TitleComponent {...commonProps} />;
          } else {
            return <MetricCard {...commonProps} />;
          }
        })}
      </div>

      <div 
        className="group-resize-handle"
        onMouseDown={handleResizeStart}
        style={{
          position: 'absolute',
          bottom: '0',
          right: '0',
          width: '20px',
          height: '20px',
          cursor: 'se-resize',
          opacity: isSelected ? 1 : 0,
          transition: 'opacity 0.2s ease',
          zIndex: 20
        }}
      >
        <div style={{
          position: 'absolute',
          bottom: '4px',
          right: '4px',
          width: '0',
          height: '0',
          borderLeft: '12px solid transparent',
          borderBottom: `12px solid ${MATRIX_COLORS.primary}`
        }} />
      </div>
    </div>
  );
};

export default GroupComponent;