import React, { useState, useCallback, useRef, useEffect } from 'react';
import { getThemeColors } from './template/LayoutTemplates';
import { useDrag } from 'react-dnd';

const CostComparisonCard = ({
  id,
  contractedCost = 0,
  actualCost = 0,
  position,
  mode = 'side-by-side',
  onMove,
  onResize,
  onDelete,
  onSelect,
  isSelected,
  currentTheme,
  style = {}
}) => {
  const [isDragState, setIsDragState] = useState(false);
  const [isResizeState, setIsResizeState] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [resizeStart, setResizeStart] = useState(null);
  const cardRef = useRef(null);
  const themeColors = getThemeColors(currentTheme);
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'component',
    item: { id, type: 'cost-comparison' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [id]);

  useEffect(() => {
    if (cardRef.current) {
      drag(cardRef.current);
    }
  }, [drag]);

  const handleMouseDown = useCallback((e) => {
    e.stopPropagation();
    onSelect?.(id);
  }, [id, onSelect]);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    onSelect?.(e);
  }, [onSelect]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    onDelete?.(id);
  }, [id, onDelete]);

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
    
    const newWidth = Math.max(150, resizeStart.startWidth + deltaX);
    const newHeight = Math.max(80, resizeStart.startHeight + deltaY);
    
    onResize?.(id, { width: newWidth, height: newHeight });
  }, [isResizeState, resizeStart, onResize, id]);
  
  const handleResizeEnd = useCallback(() => {
    setIsResizeState(false);
    setResizeStart(null);
  }, []);

  useEffect(() => {
    if (isResizeState) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizeState, handleResizeMove, handleResizeEnd]);

  const savings = contractedCost - actualCost;
  const efficiency = contractedCost > 0 ? ((actualCost / contractedCost) * 100) : 0;
  const savingsPercentage = contractedCost > 0 ? ((savings / contractedCost) * 100) : 0;

  const cardStyle = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: position.width,
    height: position.height,
    zIndex: isSelected ? 100 : isDragState ? 90 : 1,
    opacity: isDragState ? 0.8 : 1,
    
    border: isSelected 
      ? `2px solid ${themeColors.primary}` 
      : `1px solid ${themeColors.border}`,
    boxShadow: isSelected 
      ? `0 0 0 3px ${themeColors.primary}33, 0 8px 32px ${themeColors.secondary}33` 
      : '0 2px 8px rgba(0, 0, 0, 0.1)',
    borderRadius: '8px',
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
        margin: '2px 8px'
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
            BUDGETED
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
        background: `${themeColors.primary || '#3b82f6'}15`,
        borderRadius: '6px',
        padding: '9px 16px',
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

  const renderPercentage = () => (
    <>
      <div style={{ 
        fontSize: getFontSize(12, 10, 16),
        fontWeight: '700',
        color: themeColors.text || '#1f2937',
        textAlign: 'center',
        letterSpacing: '0.5px',
        marginBottom: getFontSize(14, 0, 8),
      }}>
        COST EFFICIENCY
      </div>
      
      <div style={{ 
        textAlign: 'center',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '0 4px'
      }}>
        <div style={{ 
          fontSize: getFontSize(48, 32, 56),
          fontWeight: '700',
          color: savingsPercentage > 0 ? '#10b981' : '#ef4444',
          lineHeight: '0.9'
        }}>
          {Math.abs(savingsPercentage).toFixed(0)}%
        </div>
        <div style={{ 
          fontSize: getFontSize(11, 6, 11),
          opacity: 0.7,
          color: themeColors.textSecondary || '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          UNDER BUDGET
        </div>
        
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          fontSize: getFontSize(9, 7, 12),
          color: themeColors.textSecondary || '#6b7280',
          gap: '8px'
        }}>
          <div style={{ 
            textAlign: 'left',
            flex: 1
          }}>
            <div style={{ 
              fontWeight: '600',
              fontSize: getFontSize(24, 9, 14),
              color: themeColors.text || '#1f2937'
            }}>
              ${actualCost.toFixed(2)}
            </div>
            <div style={{ 
              opacity: 0.7,
              fontSize: getFontSize(16, 6, 10)
            }}>
              Actual
            </div>
          </div>
          <div style={{ 
            textAlign: 'right',
            flex: 1
          }}>
            <div style={{ 
              fontWeight: '600',
              fontSize: getFontSize(24, 9, 14),
              color: themeColors.text || '#1f2937'
            }}>
              ${contractedCost.toFixed(2)}
            </div>
            <div style={{ 
              opacity: 0.7,
              fontSize: getFontSize(16, 6, 10)
            }}>
              Budget
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const renderStacked = () => (
    <>
      <div style={{ 
        fontSize: getFontSize(12, 10, 16),
        fontWeight: '700',
        color: themeColors.text || '#1f2937',
        textAlign: 'center',
        letterSpacing: '0.5px',
        marginBottom: getFontSize(0, 3, 6)
      }}>
        COST ANALYSIS
      </div>
      
      <div style={{ flex: 1 }}>
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: getFontSize(8, 4, 12)
        }}>
          <span style={{ 
            color: themeColors.textSecondary || '#6b7280',
            fontSize: getFontSize(10, 8, 14),
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            BUDGETED:
          </span>
          <span style={{ 
            fontWeight: '700',
            fontSize: getFontSize(16, 14, 20),
            color: themeColors.text || '#1f2937'
          }}>
            ${contractedCost.toFixed(2)}
          </span>
        </div>
        
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: getFontSize(0, 3, 7)
        }}>
          <span style={{ 
            color: themeColors.textSecondary || '#6b7280',
            fontSize: getFontSize(10, 8, 14),
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            ACTUAL:
          </span>
          <span style={{ 
            fontWeight: '700',
            fontSize: getFontSize(16, 14, 20),
            color: themeColors.text || '#1f2937'
          }}>
            ${actualCost.toFixed(2)}
          </span>
        </div>
        
        <div style={{ 
          height: '1px',
          background: themeColors.border || '#e2e8f0',
          margin: `${getFontSize(8, 4, 12)}px 0`,
          opacity: 0.6
        }} />
        
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ 
            color: themeColors.textSecondary || '#6b7280',
            fontSize: getFontSize(10, 8, 14),
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: '600'
          }}>
            SAVINGS:
          </span>
          <span style={{ 
            fontWeight: '700',
            fontSize: getFontSize(18, 16, 22),
            color: savings > 0 ? '#10b981' : '#ef4444'
          }}>
            ${Math.abs(savings).toFixed(2)}
          </span>
        </div>
      </div>
    </>
  );

  const renderGauge = () => {
    const gaugePercentage = Math.min(100, Math.max(0, 100 - efficiency));
    
    return (
      <>
        <div style={{ 
          fontSize: getFontSize(12, 10, 16),
          fontWeight: '700',
          color: themeColors.text || '#1f2937',
          textAlign: 'center',
          letterSpacing: '0.5px',
          marginBottom: getFontSize(4, 2, 8)
        }}>
          COST EFFICIENCY
        </div>
        
        <div style={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '0 4px'
        }}>
          <div style={{ 
            textAlign: 'center'
          }}>
            <div style={{ 
              fontSize: getFontSize(10, 6, 11),
              opacity: 0.7,
              color: themeColors.textSecondary || '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              ACTUAL VS BUDGET
            </div>
          </div>
          
          <div style={{ 
            textAlign: 'center'
          }}>
            <div style={{ 
              fontSize: getFontSize(45, 24, 44),
              fontWeight: '700',
              color: savings > 0 ? '#10b981' : '#ef4444',
              lineHeight: '0.9',
              marginBottom: getFontSize(2, 4, 10)
            }}>
              {gaugePercentage.toFixed(0)}%
            </div>
            <div style={{ 
              fontSize: getFontSize(14, 5, 10),
              opacity: 0.7,
              color: themeColors.textSecondary || '#6b7280'
            }}>
              {savings > 0 ? 'Under Budget' : 'Over Budget'}
            </div>
          </div>
          
          <div style={{ 
            position: 'relative'
          }}>
            <div style={{ 
              width: '100%',
              height: getFontSize(14, 6, 12),
              background: themeColors.border || '#e2e8f0',
              borderRadius: getFontSize(4, 3, 6),
              position: 'relative',
              opacity: 0.3
            }}>
              <div style={{ 
                height: '100%',
                background: savings > 0 ? '#10b981' : '#ef4444',
                borderRadius: getFontSize(14, 3, 6),
                width: `${gaugePercentage}%`,
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        </div>
      </>
    );
  };

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
      className="cost-comparison-card"
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
          cursor: 'se-resize',
          background: `linear-gradient(-45deg, transparent 30%, ${themeColors.primary}33 30%, ${themeColors.primary}33 70%, transparent 70%)`,
          opacity: isSelected ? 1 : 0,
          transition: 'opacity 0.2s ease'
        }}
      />
    </div>
  );
};

export default CostComparisonCard;