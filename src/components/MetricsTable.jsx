import React from 'react';

const MetricsTable = ({
    filteredData,
    selectedColumn,
    toggleDropdown,
    handleColumnChange,
    dropdownOpen,
    currentPage,
    rowsPerPage,
    handlePagination,
    availableMetrics,
    totalPages,
    handleRowsPerPageChange,
    }) => {
    const currentRows = filteredData.slice().slice(0, rowsPerPage);

    const exportToCSV = () => {
        // Use the entire filtered dataset for export, not just the current page
        const header = ['Campaign', ...availableMetrics];
    
        // Map over the entire filtered data
        const rows = filteredData.map(item => [
            item.Publication,
            ...availableMetrics.map(metric => item[metric] ?? ""), 
        ]);
    
        const csvContent = [header, ...rows]
            .map(row => row.join(","))
            .join("\n");
    
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "filtered_data.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    

    const maxPageButtons = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    const endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

    return (
        <div className="table-section">
            <h2>Completed Campaign Metrics</h2>
            <div className="rows-per-page">
                <label htmlFor="rowsPerPage">Rows per page:</label>
                <select
                    id="rowsPerPage"
                    value={rowsPerPage}
                    onChange={handleRowsPerPageChange}
                >
                    {[10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100].map((num) => (
                        <option key={num} value={num}>
                            {num}
                        </option>
                    ))}
                </select>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Campaign</th>
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
            <div className="export-button-container">
                <button className="export-button" onClick={exportToCSV}>
                    Export CSV
                </button>
            </div>
        </div>
    );
};

export default MetricsTable;
