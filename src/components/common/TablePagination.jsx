import React from 'react';

const TablePagination = ({ currentPage, totalPages, onPageChange, maxPageButtons = 5 }) => {
  if (!totalPages || totalPages <= 1) return null;

  const startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
  const endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
  const adjustedStart = Math.max(1, endPage - maxPageButtons + 1);

  return (
    <div className="pagination">
      {currentPage > 1 && (
        <button onClick={() => onPageChange(currentPage - 1)}>Previous</button>
      )}
      {Array.from({ length: endPage - adjustedStart + 1 }, (_, i) => adjustedStart + i).map(num => (
        <button
          key={num}
          onClick={() => onPageChange(num)}
          className={currentPage === num ? 'active' : ''}
        >
          {num}
        </button>
      ))}
      {currentPage < totalPages && (
        <button onClick={() => onPageChange(currentPage + 1)}>Next</button>
      )}
    </div>
  );
};

export default TablePagination;