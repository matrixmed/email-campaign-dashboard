export const createGroup = (selectedComponents) => {
  if (!selectedComponents || selectedComponents.length < 2) return null;

  const bounds = calculateGroupBounds(selectedComponents);
  
  const group = {
    id: `group-${Date.now()}`,
    type: 'group',
    title: 'Component Group',
    position: bounds,
    children: selectedComponents.map(comp => ({
      ...comp,
      relativePosition: {
        x: comp.position.x - bounds.x,
        y: comp.position.y - bounds.y,
        width: comp.position.width,
        height: comp.position.height
      }
    })),
    section: 'group'
  };

  return group;
};

export const ungroupComponents = (group) => {
  if (!group || group.type !== 'group') return [];

  return group.children.map(child => ({
    ...child,
    id: `${child.id}-ungrouped-${Date.now()}`,
    position: {
      x: group.position.x + child.relativePosition.x,
      y: group.position.y + child.relativePosition.y,
      width: child.relativePosition.width,
      height: child.relativePosition.height
    }
  }));
};

export const updateGroupPosition = (group, newPosition) => {
  if (!group || group.type !== 'group') return group;

  return {
    ...group,
    position: { ...group.position, ...newPosition }
  };
};

export const updateGroupSize = (group, newSize) => {
  if (!group || group.type !== 'group') return group;

  const scaleX = newSize.width / group.position.width;
  const scaleY = newSize.height / group.position.height;

  return {
    ...group,
    position: { ...group.position, ...newSize },
    children: group.children.map(child => ({
      ...child,
      relativePosition: {
        x: child.relativePosition.x * scaleX,
        y: child.relativePosition.y * scaleY,
        width: child.relativePosition.width * scaleX,
        height: child.relativePosition.height * scaleY
      }
    }))
  };
};

export const calculateGroupBounds = (components) => {
  if (!components || components.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

  const bounds = components.reduce((acc, comp) => {
    const left = comp.position.x;
    const right = comp.position.x + comp.position.width;
    const top = comp.position.y;
    const bottom = comp.position.y + comp.position.height;

    return {
      left: Math.min(acc.left, left),
      right: Math.max(acc.right, right),
      top: Math.min(acc.top, top),
      bottom: Math.max(acc.bottom, bottom)
    };
  }, {
    left: Infinity,
    right: -Infinity,
    top: Infinity,
    bottom: -Infinity
  });

  return {
    x: bounds.left,
    y: bounds.top,
    width: bounds.right - bounds.left,
    height: bounds.bottom - bounds.top
  };
};

export const isPointInComponent = (point, component) => {
  return point.x >= component.position.x &&
         point.x <= component.position.x + component.position.width &&
         point.y >= component.position.y &&
         point.y <= component.position.y + component.position.height;
};

export const getComponentsInRect = (rect, allComponents) => {
  return allComponents.filter(component => {
    return component.position.x >= rect.x &&
           component.position.y >= rect.y &&
           component.position.x + component.position.width <= rect.x + rect.width &&
           component.position.y + component.position.height <= rect.y + rect.height;
  });
};

export const SelectionBox = ({ isVisible, startPoint, endPoint }) => {
  if (!isVisible || !startPoint || !endPoint) return null;

  const rect = {
    x: Math.min(startPoint.x, endPoint.x),
    y: Math.min(startPoint.y, endPoint.y),
    width: Math.abs(endPoint.x - startPoint.x),
    height: Math.abs(endPoint.y - startPoint.y)
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: `${rect.x}px`,
        top: `${rect.y}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        border: '2px dashed #cc0001',
        background: 'rgba(204, 0, 1, 0.1)',
        pointerEvents: 'none',
        zIndex: 999,
        borderRadius: '4px'
      }}
    />
  );
};

export const MultiSelectToolbar = ({ selectedComponents, onGroup, onUngroup, onDelete, onDuplicate }) => {
  if (!selectedComponents || selectedComponents.length === 0) return null;

  const hasGroups = selectedComponents.some(comp => comp.type === 'group');
  const canGroup = selectedComponents.length > 1 && !hasGroups;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '8px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        zIndex: 1001,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)',
        fontSize: '14px',
        fontWeight: '500'
      }}
    >
      <span>{selectedComponents.length} selected</span>
      
      {canGroup && (
        <button
          onClick={onGroup}
          style={{
            background: '#cc0001',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600'
          }}
        >
          Group
        </button>
      )}
      
      {hasGroups && (
        <button
          onClick={onUngroup}
          style={{
            background: '#0066cc',
            color: 'white',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600'
          }}
        >
          Ungroup
        </button>
      )}
      
      <button
        onClick={onDuplicate}
        style={{
          background: '#28a745',
          color: 'white',
          border: 'none',
          padding: '6px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: '600'
        }}
      >
        Duplicate
      </button>
      
      <button
        onClick={onDelete}
        style={{
          background: '#dc3545',
          color: 'white',
          border: 'none',
          padding: '6px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: '600'
        }}
      >
        Delete
      </button>
    </div>
  );
};

export default {
  createGroup,
  ungroupComponents,
  updateGroupPosition,
  updateGroupSize,
  calculateGroupBounds,
  isPointInComponent,
  getComponentsInRect,
  SelectionBox,
  MultiSelectToolbar
};