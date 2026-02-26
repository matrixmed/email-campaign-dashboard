import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getThemeColors } from './template/LayoutTemplates';

const SLOT_ICONS = {
  video: '\u25B6',
  journal: '\u{1F4D6}',
  social: '\u{1F4F1}',
  image: '\u{1F5BC}',
  default: '\u{1F4CB}'
};

const ImageSlot = ({
  id,
  title,
  position = { x: 0, y: 0, width: 320, height: 150 },
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
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [resizeStart, setResizeStart] = useState(null);

  const cardRef = useRef(null);
  const themeColors = getThemeColors(currentTheme);

  const slotLabel = config.slotLabel || title || 'IMAGE';
  const slotIcon = config.slotIcon || 'default';
  const icon = SLOT_ICONS[slotIcon] || SLOT_ICONS.default;
  const accentColor = themeColors.accent || themeColors.primary || '#007bff';

  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.dashboard-canvas-delete-btn') ||
        e.target.closest('.dashboard-canvas-resize-handle') ||
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
    const newWidth = Math.max(80, Math.min(resizeStart.startWidth + (e.clientX - resizeStart.startX), 1024 - position.x));
    const newHeight = Math.max(60, Math.min(resizeStart.startHeight + (e.clientY - resizeStart.startY), 576 - position.y));
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

  const cardStyle = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: position.width,
    height: position.height,
    background: style.background || 'transparent',
    border: isSelected ? `2px dashed ${themeColors.primary || '#007bff'}` : `2px dashed ${accentColor}40`,
    borderRadius: style.borderRadius || '8px',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    cursor: isDragging ? 'move' : 'pointer',
    transition: isDragging || isResizing ? 'none' : 'all 0.2s ease',
    zIndex: isSelected ? 100 : isDragging ? 90 : 1,
    opacity: isDragging ? 0.8 : 0.6,
    boxShadow: isSelected
      ? '0 0 0 3px rgba(0, 123, 255, 0.2)'
      : 'none'
  };

  return (
    <div
      ref={cardRef}
      className={`dashboard-canvas-card dc-image-slot ${isSelected ? 'dc-selected' : ''}`}
      style={cardStyle}
      onMouseDown={handleMouseDown}
      onClick={(e) => { e.stopPropagation(); onSelect?.(e); }}
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

      <div style={{
        fontSize: '28px',
        marginBottom: '6px',
        opacity: 0.4
      }}>
        {icon}
      </div>
      <div style={{
        fontSize: '10px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        color: accentColor,
        opacity: 0.6,
        textAlign: 'center',
        padding: '0 8px'
      }}>
        {slotLabel}
      </div>

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

export default ImageSlot;