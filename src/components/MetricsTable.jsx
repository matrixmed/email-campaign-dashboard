import React, { useEffect, useRef } from 'react';
import { metricDisplayNames } from './metricDisplayNames'

const MetricsTable = ({
    currentRows,
    processedFullData,
    selectedColumn,
    handleColumnChange,
    currentPage,
    rowsPerPage,
    handlePagination,
    availableMetrics,
    totalPages,
    handleRowsPerPageChange,
    }) => {
    const [activeDropdown, setActiveDropdown] = React.useState(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('th')) {
                setActiveDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const toggleDropdown = (colKey) => {
        setActiveDropdown(activeDropdown === colKey ? null : colKey);
    };

    const exportToCSV = (fullData) => {
        const header = ['Campaign', ...availableMetrics];
        const rows = fullData.map(item => [
            item.Campaign,
            ...availableMetrics.map(metric => item[metric] ?? ""),
        ]);
        
        const csvContent = [header, ...rows]
            .map(row => row.map(field => 
                `"${String(field).replace(/"/g, '""')}"`
            ).join(","))
            .join("\n");
        
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "email_metrics_data.csv");
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
                        {Object.entries(selectedColumn).map(([colKey, colValue]) => (
                            <th 
                                key={colKey}
                                className="sortable-header"
                                onClick={() => toggleDropdown(colKey)}
                            >
                                <div className="header-content">
                                    <span>{metricDisplayNames[colValue]}</span>
                                    <span className="dropdown-arrow">
                                        <svg 
                                            width="12" 
                                            height="12" 
                                            viewBox="0 0 24 24" 
                                            fill="none" 
                                            stroke="currentColor" 
                                            strokeWidth="2"
                                            strokeLinecap="round" 
                                            strokeLinejoin="round"
                                            style={{ 
                                                transform: activeDropdown === colKey ? 'rotate(180deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.2s'
                                            }}
                                        >
                                            <polyline points="6 9 12 15 18 9"></polyline>
                                        </svg>
                                    </span>
                                </div>
                                {activeDropdown === colKey && (
                                    <div className="dropdown">
                                        {availableMetrics.map((metric, index) => (
                                            <div
                                                key={index}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleColumnChange(colKey, metric);
                                                    setActiveDropdown(null);
                                                }}
                                                className="dropdown-item"
                                            >
                                                {metricDisplayNames[metric]}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {currentRows && currentRows.map((item, index) => (
                        <tr key={index}>
                            <td>{item.Campaign}</td>
                            {Object.values(selectedColumn).map((col, colIndex) => (
                                <td key={colIndex}>
                                    {typeof item[col] === 'number' 
                                        ? item[col].toFixed(2) 
                                        : item[col]}
                                </td>
                            ))}
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
                <button
                    className="export-button"
                    onClick={() => exportToCSV(processedFullData)}
                >
                    Export CSV
                </button>
            </div>
        </div>
    );
};

export default MetricsTable;