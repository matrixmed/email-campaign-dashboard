import React from 'react';

const MetricsTable = ({
    filteredData,
    selectedColumn,
    toggleDropdown,
    handleColumnChange,
    dropdownOpen,
    currentPage,
    handlePagination,
    availableMetrics,
    totalPages,
    indexOfFirstRow,
    indexOfLastRow,
    }) => {
    const currentRows = filteredData.slice().slice(indexOfFirstRow, indexOfLastRow);
    const maxPageButtons = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    const endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

    return (
        <div className="table-section">
            <h2>Key Metrics Table</h2>
            <table>
                <thead>
                    <tr>
                        <th>Publication</th>
                        <th onClick={() => toggleDropdown('column1')}>
                            {selectedColumn.column1}{' '}
                            <span className="dropdown-arrow">▼</span>
                            {dropdownOpen.column1 && (
                                <div className="dropdown">
                                    {availableMetrics.map((metric, index) => (
                                        <div
                                            key={index}
                                            onClick={() => handleColumnChange('column1', metric)}
                                            className="dropdown-item"
                                        >
                                            {metric}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </th>
                        <th onClick={() => toggleDropdown('column2')}>
                            {selectedColumn.column2}{' '}
                            <span className="dropdown-arrow">▼</span>
                            {dropdownOpen.column2 && (
                                <div className="dropdown">
                                    {availableMetrics.map((metric, index) => (
                                        <div
                                            key={index}
                                            onClick={() => handleColumnChange('column2', metric)}
                                            className="dropdown-item"
                                        >
                                            {metric}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </th>
                        <th onClick={() => toggleDropdown('column3')}>
                            {selectedColumn.column3}{' '}
                            <span className="dropdown-arrow">▼</span>
                            {dropdownOpen.column3 && (
                                <div className="dropdown">
                                    {availableMetrics.map((metric, index) => (
                                        <div
                                            key={index}
                                            onClick={() => handleColumnChange('column3', metric)}
                                            className="dropdown-item"
                                        >
                                            {metric}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </th>
                        <th onClick={() => toggleDropdown('column4')}>
                            {selectedColumn.column4}{' '}
                            <span className="dropdown-arrow">▼</span>
                            {dropdownOpen.column4 && (
                                <div className="dropdown">
                                    {availableMetrics.map((metric, index) => (
                                        <div
                                            key={index}
                                            onClick={() => handleColumnChange('column4', metric)}
                                            className="dropdown-item"
                                        >
                                            {metric}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {currentRows.map((item, index) => (
                        <tr key={index}>
                            <td>{item.Publication}</td>
                            <td>{item[selectedColumn.column1]}</td>
                            <td>{item[selectedColumn.column2]}</td>
                            <td>{item[selectedColumn.column3]}</td>
                            <td>{item[selectedColumn.column4]}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="pagination">
                {currentPage > 1 && (
                    <button onClick={() => handlePagination(currentPage - 1)}>Previous</button>
                )}
                {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(num => (
                    <button
                        key={num}
                        onClick={() => handlePagination(num)}
                        className={currentPage === num ? 'active' : ''}
                    >
                        {num}
                    </button>
                ))}
                {currentPage < totalPages && (
                    <button onClick={() => handlePagination(currentPage + 1)}>Next</button>
                )}
            </div>
        </div>
    );
};

export default MetricsTable;
