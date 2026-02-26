import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getThemeColors } from './template/LayoutTemplates';

const StatHighlight = ({
  id,
  title,
  value,
  subtitle,
  position = { x: 0, y: 0, width: 190, height: 90 },
  style = {},
  config = {},
  currentTheme = 'matrix',
  onEdit,
  onDelete,
  onResize,
  onMove,
  onSelect,
  isEditing,
  setIsEditing,
  isSelected = false
}) => {
  const [localTitle, setLocalTitle] = useState(title);
  const [localValue, setLocalValue] = useState(value);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [resizeStart, setResizeStart] = useState(null);

  const cardRef = useRef(null);
  const titleInputRef = useRef(null);
  const valueInputRef = useRef(null);

  const themeColors = getThemeColors(currentTheme);
  const accentColor = config.accentColor || style.accentColor || themeColors.primary;

  useEffect(() => {
    setLocalTitle(title);
    setLocalValue(value);
  }, [title, value]);

  useEffect(() => {
    if (isEditing === id && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditing, id]);

  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.dashboard-canvas-delete-btn') ||
        e.target.closest('.dashboard-canvas-resize-handle') ||
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
    const newX = Math.max(0, Math.round((e.clientX - dragStart.x) / 8) * 8);
    const newY = Math.max(0, Math.round((e.clientY - dragStart.y) / 8) * 8);
    const maxX = 1024 - position.width;
    const maxY = 576 - position.height;
    onMove?.(id, { x: Math.min(newX, maxX), y: Math.min(newY, maxY) });
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
      startX: e.clientX, startY: e.clientY,
      startWidth: position.width, startHeight: position.height
    });
  }, [position.width, position.height]);

  const handleResizeMove = useCallback((e) => {
    if (!isResizing || !resizeStart) return;
    const newWidth = Math.max(100, Math.min(resizeStart.startWidth + (e.clientX - resizeStart.startX), 1024 - position.x));
    const newHeight = Math.max(50, Math.min(resizeStart.startHeight + (e.clientY - resizeStart.startY), 576 - position.y));
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

  const handleBlur = useCallback((field) => (e) => {
    const updates = {};
    if (field === 'title') updates.title = localTitle;
    if (field === 'value') updates.value = localValue;
    onEdit?.(id, updates);

    const related = e.relatedTarget;
    if (related !== titleInputRef.current && related !== valueInputRef.current) {
      setIsEditing(null);
    }
  }, [id, localTitle, localValue, onEdit, setIsEditing]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      onEdit?.(id, { title: localTitle, value: localValue });
      setIsEditing(null);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setLocalTitle(title);
      setLocalValue(value);
      setIsEditing(null);
    }
  }, [id, localTitle, localValue, onEdit, title, value, setIsEditing]);

  const editing = isEditing === id;

  const cardStyle = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: position.width,
    height: position.height,
    background: style.background || themeColors.cardGradient || '#ffffff',
    border: isSelected ? `2px solid ${themeColors.primary || '#007bff'}` : (style.border || `1px solid ${themeColors.border || '#e2e8f0'}`),
    borderLeft: `6px solid ${accentColor}`,
    borderRadius: style.borderRadius || '8px',
    padding: '12px 16px',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    overflow: 'hidden',
    cursor: isDragging ? 'move' : 'pointer',
    transition: isDragging || isResizing ? 'none' : 'all 0.2s ease',
    zIndex: isSelected ? 100 : isDragging ? 90 : 1,
    opacity: isDragging ? 0.8 : 1,
    boxShadow: isSelected
      ? '0 0 0 3px rgba(0, 123, 255, 0.2), 0 4px 16px rgba(0, 0, 0, 0.15)'
      : '0 2px 8px rgba(0, 0, 0, 0.08)'
  };

  return (
    <div
      ref={cardRef}
      className={`dashboard-canvas-card dc-stat-highlight ${isSelected ? 'dc-selected' : ''}`}
      style={cardStyle}
      onMouseDown={handleMouseDown}
      onClick={(e) => { e.stopPropagation(); onSelect?.(e); }}
      onDoubleClick={() => setIsEditing(id)}
    >
      <button
        className="dashboard-canvas-delete-btn"
        onClick={(e) => { e.stopPropagation(); onDelete?.(id); }}
        style={{
          position: 'absolute', top: '4px', right: '4px',
          width: '24px', height: '24px', borderRadius: '50%', border: 'none',
          background: 'rgba(220, 38, 38, 0.9)', color: 'white', cursor: 'pointer',
          fontSize: '14px', fontWeight: 'bold', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          opacity: isSelected ? 1 : 0, transition: 'opacity 0.2s ease', zIndex: 10
        }}
      >
        ×
      </button>

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
          <input
            ref={titleInputRef}
            type="text"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={handleBlur('title')}
            onKeyDown={handleKeyDown}
            style={{
              fontSize: '10px', fontWeight: '600', textTransform: 'uppercase',
              letterSpacing: '0.5px', background: 'rgba(255,255,255,0.95)',
              border: '2px solid rgba(0,123,255,0.5)', borderRadius: '4px',
              padding: '2px 4px', width: '100%', color: '#1f2937'
            }}
          />
          <input
            ref={valueInputRef}
            type="text"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur('value')}
            onKeyDown={handleKeyDown}
            style={{
              fontSize: '28px', fontWeight: '800',
              background: 'rgba(255,255,255,0.95)',
              border: '2px solid rgba(0,123,255,0.5)', borderRadius: '4px',
              padding: '2px 4px', width: '100%', color: '#1f2937'
            }}
          />
        </div>
      ) : (
        <>
          <div style={{
            fontSize: '10px', fontWeight: '600', textTransform: 'uppercase',
            letterSpacing: '0.8px', color: style.color || themeColors.textSecondary || '#6b7280',
            marginBottom: '4px', lineHeight: '1.2'
          }}>
            {title}
          </div>
          <div style={{
            fontSize: Math.min(36, Math.max(28, position.width / 6)) + 'px',
            fontWeight: '800', color: style.color || themeColors.text || '#1f2937',
            lineHeight: '1.1'
          }}>
            {value}
          </div>
          {subtitle && (
            <div style={{
              fontSize: '9px', fontWeight: '500',
              color: style.color || themeColors.textSecondary || '#6b7280',
              marginTop: '2px', lineHeight: '1.2'
            }}>
              {subtitle}
            </div>
          )}
        </>
      )}

      <div
        className="dashboard-canvas-resize-handle"
        onMouseDown={handleResizeStart}
        style={{
          position: 'absolute', bottom: '0px', right: '0px',
          width: '16px', height: '16px', cursor: 'se-resize',
          background: 'linear-gradient(-45deg, transparent 30%, rgba(0, 123, 255, 0.3) 30%, rgba(0, 123, 255, 0.3) 70%, transparent 70%)',
          opacity: isSelected ? 1 : 0, transition: 'opacity 0.2s ease'
        }}
      />
    </div>
  );
};

export default StatHighlight;