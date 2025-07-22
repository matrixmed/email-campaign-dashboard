const CANVAS_CONFIG = {
  width: 1280,
  height: 720,
  padding: 20,
  grid: {
    columns: 5,
    rows: 8,
    gap: 16
  },
  reserved: {
    logo: { row: 1, col: 5, span: { cols: 1, rows: 1 } },
    image: { row: 2, col: 4, span: { cols: 2, rows: 3 } }
  }
};

const CARD_LAYOUTS = {
  hero: { 
    span: { cols: 2, rows: 2 }, 
    priority: 1,
    minCols: 2,
    minRows: 1
  },
  secondary: { 
    span: { cols: 2, rows: 1 }, 
    priority: 2,
    minCols: 1,
    minRows: 1
  },
  performance: { 
    span: { cols: 1, rows: 1 }, 
    priority: 3,
    minCols: 1,
    minRows: 1
  },
  specialty: { 
    span: { cols: 1, rows: 1 }, 
    priority: 4,
    minCols: 1,
    minRows: 1
  }
};

function getAvailableGrid() {
  const grid = Array(CANVAS_CONFIG.grid.rows).fill().map(() => 
    Array(CANVAS_CONFIG.grid.columns).fill(true)
  );

  Object.values(CANVAS_CONFIG.reserved).forEach(zone => {
    const { row, col, span } = zone;
    for (let r = row - 1; r < row - 1 + span.rows; r++) {
      for (let c = col - 1; c < col - 1 + span.cols; c++) {
        if (grid[r] && grid[r][c] !== undefined) {
          grid[r][c] = false;
        }
      }
    }
  });

  return grid;
}

function canFitAt(grid, row, col, span) {
  const { rows, cols } = span;
  
  if (row + rows > CANVAS_CONFIG.grid.rows || col + cols > CANVAS_CONFIG.grid.columns) {
    return false;
  }

  for (let r = row; r < row + rows; r++) {
    for (let c = col; c < col + cols; c++) {
      if (!grid[r] || !grid[r][c]) {
        return false;
      }
    }
  }
  
  return true;
}

function occupyCells(grid, row, col, span) {
  const { rows, cols } = span;
  
  for (let r = row; r < row + rows; r++) {
    for (let c = col; c < col + cols; c++) {
      if (grid[r] && grid[r][c] !== undefined) {
        grid[r][c] = false;
      }
    }
  }
}

function findPosition(grid, cardType) {
  const layout = CARD_LAYOUTS[cardType] || CARD_LAYOUTS.performance;
  const { span } = layout;

  for (let row = 0; row <= CANVAS_CONFIG.grid.rows - span.rows; row++) {
    for (let col = 0; col <= CANVAS_CONFIG.grid.columns - span.cols; col++) {
      if (canFitAt(grid, row, col, span)) {
        return { row: row + 1, col: col + 1, span };
      }
    }
  }

  if (span.cols > 1 || span.rows > 1) {
    const fallbackSpan = { 
      cols: Math.max(1, span.cols - 1), 
      rows: Math.max(1, span.rows - 1) 
    };
    
    for (let row = 0; row <= CANVAS_CONFIG.grid.rows - fallbackSpan.rows; row++) {
      for (let col = 0; col <= CANVAS_CONFIG.grid.columns - fallbackSpan.cols; col++) {
        if (canFitAt(grid, row, col, fallbackSpan)) {
          return { row: row + 1, col: col + 1, span: fallbackSpan };
        }
      }
    }
  }

  return null;
}

function positionToGrid(position) {
  if (!position) return { gridColumn: 'auto', gridRow: 'auto' };

  const { row, col, span } = position;
  const colEnd = col + span.cols;
  const rowEnd = row + span.rows;

  return {
    gridColumn: span.cols === 1 ? col : `${col} / ${colEnd}`,
    gridRow: span.rows === 1 ? row : `${row} / ${rowEnd}`
  };
}

export function calculateAutoLayout(cards) {
  const grid = getAvailableGrid();
  const positioned = [];

  const sortedCards = [...cards].sort((a, b) => {
    const priorityA = CARD_LAYOUTS[a.type]?.priority || 999;
    const priorityB = CARD_LAYOUTS[b.type]?.priority || 999;
    return priorityA - priorityB;
  });

  sortedCards.forEach(card => {
    const position = findPosition(grid, card.type);
    
    if (position) {
      occupyCells(grid, position.row - 1, position.col - 1, position.span);
      positioned.push({
        ...card,
        position: {
          ...position,
          cssGrid: positionToGrid(position)
        }
      });
    } else {
      positioned.push({
        ...card,
        position: {
          row: 'auto',
          col: 'auto',
          cssGrid: { gridColumn: 'auto', gridRow: 'auto' }
        }
      });
    }
  });

  return positioned;
}

export function recalculateLayout(remainingCards) {
  return calculateAutoLayout(remainingCards);
}

export function validatePosition(cards, newCard, targetPosition) {
  const grid = getAvailableGrid();
  
  cards.forEach(card => {
    if (card.position && card.position.row !== 'auto') {
      const span = card.position.span || { cols: 1, rows: 1 };
      occupyCells(grid, card.position.row - 1, card.position.col - 1, span);
    }
  });

  const layout = CARD_LAYOUTS[newCard.type] || CARD_LAYOUTS.performance;
  return canFitAt(grid, targetPosition.row - 1, targetPosition.col - 1, layout.span);
}

export function getInsertionPoint(existingCards, newCardType) {
  const cards = [...existingCards];
  const newCard = { id: 'temp', type: newCardType };
  
  const layout = calculateAutoLayout([...cards, newCard]);
  const insertedCard = layout.find(c => c.id === 'temp');
  
  return insertedCard?.position || null;
}

export function getGridStats(cards) {
  const totalCells = CANVAS_CONFIG.grid.rows * CANVAS_CONFIG.grid.columns;
  const reservedCells = Object.values(CANVAS_CONFIG.reserved)
    .reduce((sum, zone) => sum + (zone.span.rows * zone.span.cols), 0);
  
  const occupiedCells = cards.reduce((sum, card) => {
    if (card.position && card.position.span) {
      return sum + (card.position.span.rows * card.position.span.cols);
    }
    return sum + 1;
  }, 0);

  const availableCells = totalCells - reservedCells - occupiedCells;
  const utilization = (occupiedCells / (totalCells - reservedCells)) * 100;

  return {
    totalCells,
    reservedCells,
    occupiedCells,
    availableCells,
    utilization: Math.round(utilization)
  };
}

export function optimizeLayout(cards) {
  const sortedCards = [...cards].sort((a, b) => {
    if (!a.position || !b.position) return 0;
    if (a.position.row !== b.position.row) {
      return a.position.row - b.position.row;
    }
    return a.position.col - b.position.col;
  });

  return calculateAutoLayout(sortedCards);
}

export function getCanvasStyles() {
  return {
    width: `${CANVAS_CONFIG.width}px`,
    height: `${CANVAS_CONFIG.height}px`,
    display: 'grid',
    gridTemplateColumns: `repeat(${CANVAS_CONFIG.grid.columns}, 1fr)`,
    gridTemplateRows: `repeat(${CANVAS_CONFIG.grid.rows}, 1fr)`,
    gap: `${CANVAS_CONFIG.grid.gap}px`,
    padding: `${CANVAS_CONFIG.padding}px`
  };
}

export default {
  calculateAutoLayout,
  recalculateLayout,
  validatePosition,
  getInsertionPoint,
  getGridStats,
  optimizeLayout,
  getCanvasStyles,
  CANVAS_CONFIG,
  CARD_LAYOUTS
};