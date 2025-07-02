const GRID = {
  COLS: 5,
  ROWS: 6,
  GAP: 24,
  PADDING: 20
};

const CANVAS = {
  WIDTH: 1280,
  HEIGHT: 720
};

const RESERVED_ZONES = {
  logo: { row: 1, col: 5, span: { cols: 1, rows: 1 } },
  image: { row: 2, col: 4, span: { cols: 2, rows: 3 } }
};

const CARD_DIMENSIONS = {
  hero: { cols: 2, rows: 2 },
  secondary: { cols: 2, rows: 1 },
  performance: { cols: 1, rows: 1 },
  specialty: { cols: 1, rows: 1 }
};

const PRIORITIES = {
  hero: 1,
  secondary: 2,
  performance: 3,
  specialty: 4
};

function createEmptyGrid() {
  return Array(GRID.ROWS).fill().map(() => Array(GRID.COLS).fill(true));
}

function markReservedCells(grid) {
  Object.values(RESERVED_ZONES).forEach(({ row, col, span }) => {
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

function canPlaceCard(grid, row, col, span) {
  if (row + span.rows > GRID.ROWS || col + span.cols > GRID.COLS) {
    return false;
  }

  for (let r = row; r < row + span.rows; r++) {
    for (let c = col; c < col + span.cols; c++) {
      if (!grid[r] || !grid[r][c]) {
        return false;
      }
    }
  }
  return true;
}

function occupyGridCells(grid, row, col, span) {
  for (let r = row; r < row + span.rows; r++) {
    for (let c = col; c < col + span.cols; c++) {
      if (grid[r] && grid[r][c] !== undefined) {
        grid[r][c] = false;
      }
    }
  }
}

function findOptimalPosition(grid, cardType) {
  const span = CARD_DIMENSIONS[cardType] || CARD_DIMENSIONS.performance;

  for (let row = 0; row <= GRID.ROWS - span.rows; row++) {
    for (let col = 0; col <= GRID.COLS - span.cols; col++) {
      if (canPlaceCard(grid, row, col, span)) {
        return { row: row + 1, col: col + 1, span };
      }
    }
  }

  const fallbackSpan = { cols: 1, rows: 1 };
  for (let row = 0; row <= GRID.ROWS - 1; row++) {
    for (let col = 0; col <= GRID.COLS - 1; col++) {
      if (canPlaceCard(grid, row, col, fallbackSpan)) {
        return { row: row + 1, col: col + 1, span: fallbackSpan };
      }
    }
  }

  return null;
}

export function calculateGridLayout(cards) {
  const grid = markReservedCells(createEmptyGrid());
  const layoutCards = [];

  const sortedCards = [...cards].sort((a, b) => {
    const priorityA = PRIORITIES[a.type] || 999;
    const priorityB = PRIORITIES[b.type] || 999;
    return priorityA - priorityB;
  });

  sortedCards.forEach(card => {
    const position = findOptimalPosition(grid, card.type);
    
    if (position) {
      occupyGridCells(grid, position.row - 1, position.col - 1, position.span);
      layoutCards.push({
        ...card,
        position: {
          ...position,
          gridColumn: position.span.cols === 1 ? position.col : `${position.col} / ${position.col + position.span.cols}`,
          gridRow: position.span.rows === 1 ? position.row : `${position.row} / ${position.row + position.span.rows}`
        }
      });
    } else {
      layoutCards.push({
        ...card,
        position: { gridColumn: 'auto', gridRow: 'auto' }
      });
    }
  });

  return layoutCards;
}

export function recalculateAfterRemoval(cards, removedId) {
  const remaining = cards.filter(card => card.id !== removedId);
  return calculateGridLayout(remaining);
}

export function validateCardPlacement(cards, newCard, targetPosition) {
  const grid = markReservedCells(createEmptyGrid());
  
  cards.forEach(card => {
    if (card.position?.row && card.position.row !== 'auto') {
      const span = card.position.span || { cols: 1, rows: 1 };
      occupyGridCells(grid, card.position.row - 1, card.position.col - 1, span);
    }
  });

  const span = CARD_DIMENSIONS[newCard.type] || CARD_DIMENSIONS.performance;
  return canPlaceCard(grid, targetPosition.row - 1, targetPosition.col - 1, span);
}

export function getInsertionPosition(cards, cardType) {
  const testCard = { id: 'temp', type: cardType };
  const layout = calculateGridLayout([...cards, testCard]);
  const inserted = layout.find(c => c.id === 'temp');
  
  return inserted?.position || null;
}

export function calculateGridStats(cards) {
  const totalCells = GRID.ROWS * GRID.COLS;
  const reservedCells = Object.values(RESERVED_ZONES)
    .reduce((sum, zone) => sum + (zone.span.rows * zone.span.cols), 0);
  
  const occupiedCells = cards.reduce((sum, card) => {
    if (card.position?.span) {
      return sum + (card.position.span.rows * card.position.span.cols);
    }
    return sum + 1;
  }, 0);

  const availableCells = totalCells - reservedCells - occupiedCells;
  const utilization = Math.round((occupiedCells / (totalCells - reservedCells)) * 100);

  return {
    total: totalCells,
    reserved: reservedCells,
    occupied: occupiedCells,
    available: availableCells,
    utilization
  };
}

export function optimizeGridLayout(cards) {
  const sortedByPosition = [...cards].sort((a, b) => {
    if (!a.position || !b.position) return 0;
    if (a.position.row !== b.position.row) {
      return (a.position.row || 999) - (b.position.row || 999);
    }
    return (a.position.col || 999) - (b.position.col || 999);
  });

  return calculateGridLayout(sortedByPosition);
}

export function getGridDimensions() {
  const cellWidth = (CANVAS.WIDTH - 2 * GRID.PADDING - (GRID.COLS - 1) * GRID.GAP) / GRID.COLS;
  const cellHeight = (CANVAS.HEIGHT - 2 * GRID.PADDING - (GRID.ROWS - 1) * GRID.GAP) / GRID.ROWS;

  return {
    cellWidth: Math.floor(cellWidth),
    cellHeight: Math.floor(cellHeight),
    totalWidth: CANVAS.WIDTH,
    totalHeight: CANVAS.HEIGHT,
    gap: GRID.GAP,
    padding: GRID.PADDING
  };
}

export function convertPixelsToGrid(x, y) {
  const { cellWidth, cellHeight, padding, gap } = getGridDimensions();
  
  const adjustedX = x - padding;
  const adjustedY = y - padding;
  
  const col = Math.floor(adjustedX / (cellWidth + gap)) + 1;
  const row = Math.floor(adjustedY / (cellHeight + gap)) + 1;
  
  return {
    col: Math.max(1, Math.min(col, GRID.COLS)),
    row: Math.max(1, Math.min(row, GRID.ROWS))
  };
}

export function convertGridToPixels(col, row) {
  const { cellWidth, cellHeight, padding, gap } = getGridDimensions();
  
  const x = padding + (col - 1) * (cellWidth + gap);
  const y = padding + (row - 1) * (cellHeight + gap);
  
  return { x, y };
}

export function getGridBounds(position) {
  if (!position || position.row === 'auto') return null;
  
  const { cellWidth, cellHeight, gap } = getGridDimensions();
  const { row, col, span } = position;
  
  const width = span.cols * cellWidth + (span.cols - 1) * gap;
  const height = span.rows * cellHeight + (span.rows - 1) * gap;
  
  const { x, y } = convertGridToPixels(col, row);
  
  return { x, y, width, height };
}

export { GRID, CANVAS, RESERVED_ZONES, CARD_DIMENSIONS, PRIORITIES };