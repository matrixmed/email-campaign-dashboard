import React from 'react';

const SNAP_THRESHOLD = 8;
const GUIDE_STYLE = {
  position: 'absolute',
  backgroundColor: '#cc0001',
  zIndex: 1000,
  pointerEvents: 'none',
  opacity: 0.8,
  animation: 'guideAppear 0.15s ease-out'
};

export const calculateAlignmentGuides = (draggedComponent, allComponents, canvasBounds = { width: 1024, height: 576 }) => {
  if (!draggedComponent || !allComponents) return { guides: [], snapPosition: null };

  const guides = [];
  let snapPosition = null;
  const dragBounds = {
    left: draggedComponent.position.x,
    right: draggedComponent.position.x + draggedComponent.position.width,
    top: draggedComponent.position.y,
    bottom: draggedComponent.position.y + draggedComponent.position.height,
    centerX: draggedComponent.position.x + draggedComponent.position.width / 2,
    centerY: draggedComponent.position.y + draggedComponent.position.height / 2
  };

  // Filter out the dragged component
  const otherComponents = allComponents.filter(comp => comp.id !== draggedComponent.id);

  // Check alignment with other components
  otherComponents.forEach(component => {
    const compBounds = {
      left: component.position.x,
      right: component.position.x + component.position.width,
      top: component.position.y,
      bottom: component.position.y + component.position.height,
      centerX: component.position.x + component.position.width / 2,
      centerY: component.position.y + component.position.height / 2
    };

    // Vertical alignment guides
    const verticalAlignments = [
      { type: 'left', dragValue: dragBounds.left, compValue: compBounds.left, offset: 0 },
      { type: 'right', dragValue: dragBounds.right, compValue: compBounds.right, offset: -draggedComponent.position.width },
      { type: 'centerX', dragValue: dragBounds.centerX, compValue: compBounds.centerX, offset: -draggedComponent.position.width / 2 }
    ];

    verticalAlignments.forEach(({ type, dragValue, compValue, offset }) => {
      const distance = Math.abs(dragValue - compValue);
      if (distance <= SNAP_THRESHOLD) {
        // Create guide line
        guides.push({
          id: `${type}-${component.id}`,
          type: 'vertical',
          x: compValue,
          y: Math.min(dragBounds.top, compBounds.top) - 20,
          height: Math.max(dragBounds.bottom, compBounds.bottom) - Math.min(dragBounds.top, compBounds.top) + 40
        });

        // Set snap position
        if (!snapPosition) snapPosition = {};
        snapPosition.x = compValue + offset;
      }
    });

    // Horizontal alignment guides
    const horizontalAlignments = [
      { type: 'top', dragValue: dragBounds.top, compValue: compBounds.top, offset: 0 },
      { type: 'bottom', dragValue: dragBounds.bottom, compValue: compBounds.bottom, offset: -draggedComponent.position.height },
      { type: 'centerY', dragValue: dragBounds.centerY, compValue: compBounds.centerY, offset: -draggedComponent.position.height / 2 }
    ];

    horizontalAlignments.forEach(({ type, dragValue, compValue, offset }) => {
      const distance = Math.abs(dragValue - compValue);
      if (distance <= SNAP_THRESHOLD) {
        guides.push({
          id: `${type}-${component.id}`,
          type: 'horizontal',
          x: Math.min(dragBounds.left, compBounds.left) - 20,
          y: compValue,
          width: Math.max(dragBounds.right, compBounds.right) - Math.min(dragBounds.left, compBounds.left) + 40
        });

        if (!snapPosition) snapPosition = {};
        snapPosition.y = compValue + offset;
      }
    });
  });

  // Canvas edge alignment
  const canvasAlignments = [
    { type: 'canvas-left', value: 0, offset: 0, axis: 'x' },
    { type: 'canvas-right', value: canvasBounds.width, offset: -draggedComponent.position.width, axis: 'x' },
    { type: 'canvas-top', value: 0, offset: 0, axis: 'y' },
    { type: 'canvas-bottom', value: canvasBounds.height, offset: -draggedComponent.position.height, axis: 'y' },
    { type: 'canvas-centerX', value: canvasBounds.width / 2, offset: -draggedComponent.position.width / 2, axis: 'x' },
    { type: 'canvas-centerY', value: canvasBounds.height / 2, offset: -draggedComponent.position.height / 2, axis: 'y' }
  ];

  canvasAlignments.forEach(({ type, value, offset, axis }) => {
    const dragValue = axis === 'x' ? 
      (type.includes('center') ? dragBounds.centerX : (type.includes('right') ? dragBounds.right : dragBounds.left)) :
      (type.includes('center') ? dragBounds.centerY : (type.includes('bottom') ? dragBounds.bottom : dragBounds.top));

    const distance = Math.abs(dragValue - value);
    if (distance <= SNAP_THRESHOLD) {
      if (axis === 'x') {
        guides.push({
          id: type,
          type: 'vertical',
          x: value,
          y: 0,
          height: canvasBounds.height
        });
      } else {
        guides.push({
          id: type,
          type: 'horizontal',
          x: 0,
          y: value,
          width: canvasBounds.width
        });
      }

      if (!snapPosition) snapPosition = {};
      snapPosition[axis] = value + offset;
    }
  });

  return { guides, snapPosition };
};

export const AlignmentGuides = ({ guides }) => {
  if (!guides || guides.length === 0) return null;

  return (
    <div className="alignment-guides-container">
      {guides.map(guide => (
        <div
          key={guide.id}
          style={{
            ...GUIDE_STYLE,
            left: `${guide.x}px`,
            top: `${guide.y}px`,
            width: guide.type === 'vertical' ? '1px' : `${guide.width}px`,
            height: guide.type === 'horizontal' ? '1px' : `${guide.height}px`
          }}
        />
      ))}
      <style jsx>{`
        @keyframes guideAppear {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 0.8;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default AlignmentGuides;