import React, { useState, useRef, useEffect, useCallback } from 'react';

const DraggableImage = ({ 
  image, 
  onMove, 
  onResize, 
  onDelete, 
  onSelect,
  isSelected = false 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [resizeStart, setResizeStart] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalDimensions, setNaturalDimensions] = useState({ width: 300, height: 200 });
  const imageRef = useRef(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setNaturalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setImageLoaded(true);
      
      if (!image.position.width || !image.position.height) {
        const maxWidth = 400;
        const maxHeight = 300;
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        
        let newWidth = img.naturalWidth;
        let newHeight = img.naturalHeight;
        
        if (newWidth > maxWidth) {
          newWidth = maxWidth;
          newHeight = newWidth / aspectRatio;
        }
        
        if (newHeight > maxHeight) {
          newHeight = maxHeight;
          newWidth = newHeight * aspectRatio;
        }
        
        onResize?.(image.id, { 
          width: Math.round(newWidth), 
          height: Math.round(newHeight) 
        });
      }
    };
    img.src = image.src;
  }, [image.src, image.position.width, image.position.height, onResize, image.id]);

  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.draggable-image-delete-btn') || 
        e.target.closest('.draggable-image-resize-handle')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    onSelect?.();
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - image.position.x,
      y: e.clientY - image.position.y
    });
  }, [image.position, onSelect]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !dragStart) return;

    const rawX = e.clientX - dragStart.x;
    const rawY = e.clientY - dragStart.y;
    
    const newX = Math.max(0, Math.round(rawX / 8) * 8);
    const newY = Math.max(0, Math.round(rawY / 8) * 8);
    
    const maxX = 1024 - image.position.width;
    const maxY = 576 - image.position.height;
    
    onMove?.(image.id, {
      x: Math.min(newX, maxX),
      y: Math.min(newY, maxY)
    });
  }, [isDragging, dragStart, image.position.width, image.position.height, onMove, image.id]);

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
      startWidth: image.position.width,
      startHeight: image.position.height
    });
  }, [image.position.width, image.position.height]);

  const handleResizeMove = useCallback((e) => {
    if (!isResizing || !resizeStart) return;
    
    const deltaX = e.clientX - resizeStart.startX;
    const deltaY = e.clientY - resizeStart.startY;
    
    const aspectRatio = naturalDimensions.width / naturalDimensions.height;
    let newWidth = Math.max(60, resizeStart.startWidth + deltaX);
    let newHeight = newWidth / aspectRatio;
    
    if (newHeight < 45) {
      newHeight = 45;
      newWidth = newHeight * aspectRatio;
    }
    
    const maxWidth = 1024 - image.position.x;
    const maxHeight = 576 - image.position.y;
    
    newWidth = Math.min(newWidth, maxWidth);
    newHeight = Math.min(newHeight, maxHeight);
    
    newWidth = Math.round(newWidth / 8) * 8;
    newHeight = Math.round(newHeight / 8) * 8;
    
    onResize?.(image.id, { width: newWidth, height: newHeight });
  }, [isResizing, resizeStart, naturalDimensions, image.position.x, image.position.y, onResize, image.id]);

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
    onDelete?.(image.id);
  }, [image.id, onDelete]);

  const containerStyle = {
    position: 'absolute',
    left: `${image.position.x}px`,
    top: `${image.position.y}px`,
    width: `${image.position.width}px`,
    height: `${image.position.height}px`,
    cursor: isDragging ? 'move' : 'pointer',
    zIndex: isSelected ? 100 : 10,
    border: isSelected ? '2px solid #cc0001' : '2px solid transparent',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: isSelected 
      ? '0 0 0 3px rgba(204, 0, 1, 0.2), 0 4px 16px rgba(0, 0, 0, 0.15)' 
      : '0 2px 8px rgba(0, 0, 0, 0.1)',
    transition: isDragging ? 'none' : 'all 0.2s ease',
    opacity: isDragging ? 0.8 : 1
  };

  if (!imageLoaded) {
    return (
      <div style={containerStyle}>
        <div style={{
          width: '100%',
          height: '100%',
          background: '#f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontSize: '12px'
        }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle} onMouseDown={handleMouseDown}>
      <img 
        ref={imageRef}
        src={image.src} 
        alt="Dashboard content" 
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: 'cover',
          display: 'block',
          pointerEvents: 'none'
        }}
        draggable={false}
      />
      
      <button
        className="draggable-image-delete-btn"
        onClick={handleDelete}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '28px',
          height: '28px',
          border: 'none',
          background: 'rgba(220, 53, 69, 0.9)',
          color: 'white',
          borderRadius: '50%',
          cursor: 'pointer',
          fontSize: '16px',
          lineHeight: '1',
          opacity: isSelected ? 1 : 0,
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
          backdropFilter: 'blur(4px)'
        }}
        onMouseEnter={(e) => e.target.style.background = '#dc3545'}
        onMouseLeave={(e) => e.target.style.background = 'rgba(220, 53, 69, 0.9)'}
      >
        ×
      </button>
      
      <div 
        className="draggable-image-resize-handle"
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
          borderBottom: '12px solid rgba(255, 255, 255, 0.8)'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '4px',
          right: '4px',
          width: '0',
          height: '0',
          borderLeft: '8px solid transparent',
          borderBottom: '8px solid #cc0001'
        }} />
      </div>
    </div>
  );
};

export default DraggableImage;