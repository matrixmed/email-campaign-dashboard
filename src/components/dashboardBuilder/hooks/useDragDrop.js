import { useDrop, useDrag } from 'react-dnd';
import { useCallback } from 'react';

const DND_TYPES = {
  METRIC: 'metric',
  CARD: 'card'
};

export const useDragDrop = (
  cards = [],
  onAddCard,
  onMoveCard,
  canInsert,
  generateCardFromMetric
) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [DND_TYPES.METRIC, DND_TYPES.CARD],
    drop: (item, monitor) => {
      if (!monitor.didDrop()) {
        if (item.category) {
          handleMetricDrop(item);
        } else {
          const clientOffset = monitor.getClientOffset();
          const canvasElement = document.querySelector('.dashboard-canvas-content');
          
          if (clientOffset && canvasElement) {
            const containerRect = canvasElement.getBoundingClientRect();
            const x = clientOffset.x - containerRect.left;
            const y = clientOffset.y - containerRect.top;
            onMoveCard(item.id, { x: Math.max(0, x - 100), y: Math.max(0, y - 50) });
          }
        }
      }
    },
    canDrop: (item) => {
      if (item.category) {
        return canInsert(item.category || item.type);
      }
      return true;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop()
    })
  });

  const handleMetricDrop = useCallback((metric) => {
    if (!canInsert(metric.category || metric.type)) return;
    
    const newCard = generateCardFromMetric(metric);
    if (newCard) {
      onAddCard(newCard);
    }
  }, [canInsert, generateCardFromMetric, onAddCard]);

  const createDraggableMetric = useCallback((metric) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [{ isDragging }, drag] = useDrag({
      type: DND_TYPES.METRIC,
      item: metric,
      collect: (monitor) => ({
        isDragging: monitor.isDragging()
      })
    });

    return { isDragging, drag };
  }, []);

  const createDraggableCard = useCallback((card) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [{ isDragging }, drag] = useDrag({
      type: DND_TYPES.CARD,
      item: card,
      collect: (monitor) => ({
        isDragging: monitor.isDragging()
      })
    });

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [{ isOver: isCardOver }, cardDrop] = useDrop({
      accept: DND_TYPES.CARD,
      drop: (draggedCard) => {
        if (draggedCard.id !== card.id) {
          onMoveCard(draggedCard.id, card.position);
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver()
      })
    });

    return { 
      isDragging, 
      drag, 
      drop: cardDrop, 
      isOver: isCardOver 
    };
  }, [onMoveCard]);

  const getDropZoneStyles = useCallback(() => {
    const baseStyles = {
      transition: 'all 0.2s ease'
    };

    if (isOver) {
      return {
        ...baseStyles,
        backgroundColor: canDrop ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)',
        border: `2px dashed ${canDrop ? '#00ff00' : '#ff0000'}`,
        className: 'drag-over'
      };
    }

    return baseStyles;
  }, [isOver, canDrop]);

  return {
    drop,
    isOver,
    canDrop,
    getDropZoneStyles,   
    createDraggableMetric,
    createDraggableCard,
    DND_TYPES
  };
};