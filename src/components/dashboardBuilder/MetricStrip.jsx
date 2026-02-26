import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getThemeColors } from './template/LayoutTemplates';

const MetricStrip = ({
  id,
  title,
  value,
  position = { x: 0, y: 0, width: 600, height: 55 },
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
  const metrics = config.metrics || [];
  const isHero = config.variant === 'hero';
  const [localMetrics, setLocalMetrics] = useState(metrics);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [resizeStart, setResizeStart] = useState(null);

  const cardRef = useRef(null);

  const themeColors = getThemeColors(currentTheme);

  useEffect(() => {
    setLocalMetrics(config.metrics || []);
  }, [config.metrics]);

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
    const newWidth = Math.max(200, Math.min(resizeStart.startWidth + (e.clientX - resizeStart.startX), 1024 - position.x));
    const newHeight = Math.max(40, Math.min(resizeStart.startHeight + (e.clientY - resizeStart.startY), 576 - position.y));
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

  const editing = isEditing === id;

  const handleMetricEdit = useCallback((index, field, newVal) => {
    const updated = localMetrics.map((m, i) =>
      i === index ? { ...m, [field]: newVal } : m
    );
    setLocalMetrics(updated);
  }, [localMetrics]);

  const handleEditBlur = useCallback(() => {
    onEdit?.(id, { config: { ...config, metrics: localMetrics } });
    setIsEditing(null);
  }, [id, config, localMetrics, onEdit, setIsEditing]);

  const handleEditKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditBlur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setLocalMetrics(config.metrics || []);
      setIsEditing(null);
    }
  }, [handleEditBlur, config.metrics, setIsEditing]);

  const dividerColor = isHero ? 'rgba(255, 255, 255, 0.4)' : (themeColors.primary || '#007bff');

  const cardStyle = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: position.width,
    height: position.height,
    background: style.background || themeColors.cardGradient || '#ffffff',
    border: isSelected ? `2px solid ${themeColors.primary || '#007bff'}` : (style.border || `1px solid ${themeColors.border || '#e2e8f0'}`),
    borderRadius: style.borderRadius || '8px',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    display: 'flex',
    alignItems: 'center',
    overflow: 'hidden',
    cursor: isDragging ? 'move' : 'pointer',
    transition: isDragging || isResizing ? 'none' : 'all 0.2s ease',
    zIndex: isSelected ? 100 : isDragging ? 90 : 1,
    opacity: isDragging ? 0.8 : 1,
    boxShadow: isSelected
      ? '0 0 0 3px rgba(0, 123, 255, 0.2), 0 4px 16px rgba(0, 0, 0, 0.15)'
      : isHero ? `0 4px 16px ${themeColors.secondary || 'rgba(0,0,0,0.15)'}33` : '0 1px 4px rgba(0, 0, 0, 0.06)'
  };

  return (
    <div
      ref={cardRef}
      className={`dashboard-canvas-card dc-metric-strip ${isSelected ? 'dc-selected' : ''}`}
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

      <div style={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        height: '100%',
        padding: '6px 12px',
        gap: '0'
      }}>
        {(editing ? localMetrics : metrics).map((metric, index) => (
          <React.Fragment key={index}>
            {index > 0 && (
              <div style={{
                width: '2px',
                height: '60%',
                background: dividerColor,
                opacity: isHero ? 1 : 0.3,
                flexShrink: 0
              }} />
            )}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px 8px',
              minWidth: 0
            }}>
              {editing ? (
                <>
                  <input
                    type="text"
                    value={localMetrics[index]?.label || ''}
                    onChange={(e) => handleMetricEdit(index, 'label', e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    onBlur={handleEditBlur}
                    style={{
                      fontSize: '8px', textTransform: 'uppercase', textAlign: 'center',
                      width: '100%', border: '1px solid rgba(0,123,255,0.5)',
                      borderRadius: '2px', padding: '1px 2px', color: '#1f2937',
                      background: 'rgba(255,255,255,0.95)'
                    }}
                  />
                  <input
                    type="text"
                    value={localMetrics[index]?.value || ''}
                    onChange={(e) => handleMetricEdit(index, 'value', e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    onBlur={handleEditBlur}
                    style={{
                      fontSize: '13px', fontWeight: '700', textAlign: 'center',
                      width: '100%', border: '1px solid rgba(0,123,255,0.5)',
                      borderRadius: '2px', padding: '1px 2px', color: '#1f2937',
                      background: 'rgba(255,255,255,0.95)', marginTop: '2px'
                    }}
                  />
                </>
              ) : (
                <>
                  <div style={{
                    fontSize: isHero ? '10px' : '8px', fontWeight: '600', textTransform: 'uppercase',
                    letterSpacing: isHero ? '0.8px' : '0.5px',
                    color: isHero ? 'rgba(255, 255, 255, 0.85)' : (style.color || themeColors.textSecondary || '#6b7280'),
                    marginBottom: isHero ? '4px' : '2px', textAlign: 'center', lineHeight: '1.2',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    width: '100%'
                  }}>
                    {metric.label}
                  </div>
                  <div style={{
                    fontSize: isHero ? '18px' : '14px', fontWeight: isHero ? 800 : '700',
                    color: isHero ? '#ffffff' : (style.color || themeColors.text || '#1f2937'),
                    textAlign: 'center', lineHeight: '1.1'
                  }}>
                    {metric.value}
                  </div>
                </>
              )}
            </div>
          </React.Fragment>
        ))}
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

export default MetricStrip;