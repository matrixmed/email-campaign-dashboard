import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getComponentStyle, getThemeColors } from './template/LayoutTemplates';

const CostComparisonCard = ({ 
  id, 
  mode = 'none',
  contractedCost = 10,
  actualCost = 5,
  position = { x: 0, y: 0, width: 280, height: 120 },
  style = {},
  theme = 'matrix',
  onEdit, 
  onDelete,
  onResize,
  onMove,
  onSelect,
  isSelected = false,
  isDragging = false,
  isResizing = false
}) => {
  const [isDragState, setIsDragState] = useState(false);
  const [isResizeState, setIsResizeState] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [resizeStart, setResizeStart] = useState(null);
  const cardRef = useRef(null);

  const themeColors = getThemeColors(theme);
  const savings = contractedCost - actualCost;
  const savingsPercentage = Math.round((savings / contractedCost) * 100);

  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.cost-delete-btn') || 
        e.target.closest('.cost-resize-handle')) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    onSelect?.(id);
    
    setIsDragState(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  }, [position, onSelect, id]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragState || !dragStart) return;

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
  }, [isDragState, dragStart, position.width, position.height, onMove, id]);

  const handleMouseUp = useCallback(() => {
    setIsDragState(false);
    setDragStart(null);
  }, []);

  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizeState(true);
    setResizeStart({
      startX: e.clientX,
      startY: e.clientY,
      startWidth: position.width,
      startHeight: position.height
    });
  }, [position.width, position.height]);

  const handleResizeMove = useCallback((e) => {
    if (!isResizeState || !resizeStart) return;
    
    const deltaX = e.clientX - resizeStart.startX;
    const deltaY = e.clientY - resizeStart.startY;
    
    const newWidth = Math.max(200, Math.min(resizeStart.startWidth + deltaX, 1024 - position.x));
    const newHeight = Math.max(100, Math.min(resizeStart.startHeight + deltaY, 576 - position.y));
    
    onResize?.(id, { width: newWidth, height: newHeight });
  }, [isResizeState, resizeStart, position.x, position.y, onResize, id]);

  const handleResizeEnd = useCallback(() => {
    setIsResizeState(false);
    setResizeStart(null);
  }, []);

  useEffect(() => {
    if (isDragState) {
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
  }, [isDragState, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (isResizeState) {
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
  }, [isResizeState, handleResizeMove, handleResizeEnd]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    onDelete?.(id);
  }, [id, onDelete]);

  const handleClick = useCallback((e) => {
    if (e.target.closest('.cost-delete-btn') || 
        e.target.closest('.cost-resize-handle')) {
      return;
    }
    onSelect?.(id);
  }, [onSelect, id]);

  const cardStyle = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: position.width,
    height: position.height,
    ...getComponentStyle({ type: 'secondary', position, style }),
    ...style,
    zIndex: isSelected ? 100 : isDragState ? 90 : 1,
    opacity: isDragState ? 0.8 : 1,
    border: isSelected ? `2px solid ${themeColors.primary}` : style.border || `1px solid ${themeColors.border}`,
    boxShadow: isSelected 
      ? `0 0 0 3px ${themeColors.primary}33, 0 8px 32px ${themeColors.secondary}33` 
      : style.boxShadow || `0 2px 8px rgba(0, 0, 0, 0.1)`,
    borderRadius: style.borderRadius || '8px',
    background: themeColors.cardGradient,
    cursor: isDragState ? 'move' : 'pointer',
    transition: isDragState || isResizeState ? 'none' : 'all 0.2s ease',
    padding: '16px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
  };

  const getFontSize = (base, min, max) => {
    const scale = Math.min(position.width / 280, position.height / 120);
    return Math.max(min, Math.min(max, base * scale));
  };

  const renderSideBySide = () => (
    <>
      <div style={{ 
        fontSize: getFontSize(14, 11, 18),
        fontWeight: '700',
        color: themeColors.text || '#1f2937',
        textAlign: 'center',
        letterSpacing: '0.5px'
      }}>
        COST COMPARISON
      </div>
      
      <div style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flex: 1,
        gap: '16px',
        margin: '0 8px'
      }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ 
            fontSize: getFontSize(11, 9, 14),
            opacity: 0.7,
            marginBottom: '6px',
            color: themeColors.textSecondary || '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            CONTRACTED
          </div>
          <div style={{ 
            fontSize: getFontSize(24, 18, 32),
            fontWeight: '700',
            color: themeColors.text || '#1f2937',
            lineHeight: '1.2'
          }}>
            ${contractedCost.toFixed(2)}
          </div>
        </div>
        
        <div style={{ 
          width: '1px', 
          height: '50px', 
          background: themeColors.border || '#e2e8f0',
          opacity: 0.6
        }} />
        
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ 
            fontSize: getFontSize(11, 9, 14),
            opacity: 0.7,
            marginBottom: '6px',
            color: themeColors.textSecondary || '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            ACTUAL
          </div>
          <div style={{ 
            fontSize: getFontSize(24, 18, 32),
            fontWeight: '700',
            color: themeColors.text || '#1f2937',
            lineHeight: '1.2'
          }}>
            ${actualCost.toFixed(2)}
          </div>
        </div>
      </div>
      
      <div style={{ 
        background: themeColors.primary + '15' || 'rgba(102, 126, 234, 0.1)',
        borderRadius: '6px',
        padding: '10px 16px',
        textAlign: 'center'
      }}>
        <div style={{ 
          fontSize: getFontSize(12, 10, 16),
          fontWeight: '600',
          color: themeColors.text || '#1f2937',
          lineHeight: '1.3'
        }}>
          SAVINGS: ${savings.toFixed(2)} per engagement
        </div>
      </div>
    </>
  );

  const renderGauge = () => (
    <>
      <div style={{ 
        fontSize: getFontSize(14, 11, 18),
        fontWeight: '700',
        color: themeColors.text || '#1f2937',
        textAlign: 'center',
        letterSpacing: '0.5px'
      }}>
        COST EFFICIENCY
      </div>
      
      <div style={{ 
        textAlign: 'center'
      }}>
        <div style={{ 
          fontSize: getFontSize(11, 9, 14),
          opacity: 0.7,
          color: themeColors.textSecondary || '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          ACTUAL VS CONTRACTED COST
        </div>
      </div>
      
      <div style={{ 
        position: 'relative'
      }}>
        <div style={{ 
          width: '100%',
          height: '12px',
          background: themeColors.border || '#e2e8f0',
          borderRadius: '6px',
          position: 'relative',
          opacity: 0.3
        }}>
          <div style={{ 
            height: '100%',
            background: themeColors.primary || '#667eea',
            borderRadius: '6px',
            width: `${(actualCost / contractedCost) * 100}%`,
            position: 'relative',
            minWidth: '8px'
          }}>
            <div style={{ 
              position: 'absolute',
              top: '-8px',
              right: '-4px',
              width: '0',
              height: '0',
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderBottom: '8px solid ' + (themeColors.primary || '#667eea')
            }} />
          </div>
        </div>
        
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: getFontSize(10, 8, 12),
          marginTop: '8px',
          color: themeColors.textSecondary || '#6b7280'
        }}>
          <span>$0</span>
          <span style={{ fontWeight: '600' }}>${actualCost.toFixed(2)}</span>
          <span>${contractedCost.toFixed(2)}</span>
        </div>
      </div>
      
      <div style={{ 
        textAlign: 'center'
      }}>
        <div style={{ 
          fontSize: getFontSize(12, 10, 16),
          fontWeight: '600',
          color: themeColors.text || '#1f2937',
          lineHeight: '1.3'
        }}>
          Saved ${savings.toFixed(2)} per engagement
        </div>
      </div>
    </>
  );

  const renderStacked = () => (
    <>
      <div style={{ 
        fontSize: getFontSize(14, 11, 18),
        fontWeight: '700',
        color: themeColors.text || '#1f2937',
        textAlign: 'center',
        letterSpacing: '0.5px'
      }}>
        COST COMPARISON
      </div>
      
      <div>
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <span style={{ 
            color: themeColors.textSecondary || '#6b7280',
            fontSize: getFontSize(12, 10, 16),
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            CONTRACTED:
          </span>
          <span style={{ 
            fontWeight: '700',
            fontSize: getFontSize(20, 16, 26),
            color: themeColors.text || '#1f2937'
          }}>
            ${contractedCost.toFixed(2)}
          </span>
        </div>
        
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <span style={{ 
            color: themeColors.textSecondary || '#6b7280',
            fontSize: getFontSize(12, 10, 16),
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            ACTUAL:
          </span>
          <span style={{ 
            fontWeight: '700',
            fontSize: getFontSize(20, 16, 26),
            color: themeColors.text || '#1f2937'
          }}>
            ${actualCost.toFixed(2)}
          </span>
        </div>
        
        <div style={{ 
          height: '1px',
          background: themeColors.border || '#e2e8f0',
          margin: '16px 0',
          opacity: 0.6
        }} />
      </div>
      
      <div>
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <span style={{ 
            color: themeColors.textSecondary || '#6b7280',
            fontSize: getFontSize(12, 10, 16),
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            SAVINGS:
          </span>
          <span style={{ 
            fontWeight: '700',
            fontSize: getFontSize(22, 18, 28),
            color: themeColors.text || '#1f2937'
          }}>
            ${savings.toFixed(2)}
          </span>
        </div>
        
        <div style={{ 
          textAlign: 'right',
          fontSize: getFontSize(10, 8, 12),
          opacity: 0.7,
          color: themeColors.textSecondary || '#6b7280'
        }}>
          per engagement
        </div>
      </div>
    </>
  );

  const renderPercentage = () => (
    <>
      <div style={{ 
        fontSize: getFontSize(14, 11, 18),
        fontWeight: '700',
        color: themeColors.text || '#1f2937',
        textAlign: 'center',
        letterSpacing: '0.5px'
      }}>
        COST EFFICIENCY
      </div>
      
      <div style={{ 
        textAlign: 'center'
      }}>
        <div style={{ 
          fontSize: getFontSize(40, 28, 56),
          fontWeight: '700',
          color: themeColors.text || '#1f2937',
          lineHeight: '1'
        }}>
          {savingsPercentage}%
        </div>
        <div style={{ 
          fontSize: getFontSize(12, 10, 16),
          opacity: 0.7,
          color: themeColors.textSecondary || '#6b7280',
          marginTop: '4px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          UNDER BUDGET
        </div>
      </div>
      
      <div>
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ 
              fontSize: getFontSize(10, 8, 12),
              opacity: 0.7,
              color: themeColors.textSecondary || '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              ACTUAL
            </div>
            <div style={{ 
              fontSize: getFontSize(16, 14, 22),
              fontWeight: '700',
              color: themeColors.text || '#1f2937'
            }}>
              ${actualCost.toFixed(2)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ 
              fontSize: getFontSize(10, 8, 12),
              opacity: 0.7,
              color: themeColors.textSecondary || '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              BUDGETED
            </div>
            <div style={{ 
              fontSize: getFontSize(16, 14, 22),
              fontWeight: '700',
              color: themeColors.text || '#1f2937'
            }}>
              ${contractedCost.toFixed(2)}
            </div>
          </div>
        </div>
        
        <div style={{ 
          textAlign: 'center',
          fontSize: getFontSize(11, 9, 14),
          opacity: 0.8,
          color: themeColors.textSecondary || '#6b7280'
        }}>
          Saved ${savings.toFixed(2)} per engagement
        </div>
      </div>
    </>
  );

  const renderContent = () => {
    switch (mode) {
      case 'gauge':
        return renderGauge();
      case 'stacked':
        return renderStacked();
      case 'percentage':
        return renderPercentage();
      case 'side-by-side':
      default:
        return renderSideBySide();
    }
  };

  return (
    <div 
      ref={cardRef}
      style={cardStyle}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      <button 
        className="cost-delete-btn"
        onClick={handleDelete}
        aria-label="Delete cost comparison card"
        type="button"
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
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

      {renderContent()}

      <div 
        className="cost-resize-handle"
        onMouseDown={handleResizeStart}
        title="Drag to resize"
        style={{
          position: 'absolute',
          bottom: '0px',
          right: '0px',
          width: '16px',
          height: '16px',
          opacity: isSelected ? 1 : 0,
          transition: 'opacity 0.2s ease',
          cursor: 'se-resize',
          background: 'transparent'
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M16 0L16 16L0 16" stroke="rgba(255,255,255,0.6)" strokeWidth="2"/>
          <path d="M10 6L10 10L6 10" stroke="rgba(255,255,255,0.6)" strokeWidth="1"/>
        </svg>
      </div>
    </div>
  );
};

export default CostComparisonCard;