import React, { useEffect, useState, useRef } from 'react';
import { metricDisplayNames } from '../utils/metricDisplayNames';
import CampaignModal from './CampaignModal';

const MetricsTable = ({ currentRows, processedFullData, selectedColumn, handleColumnChange, currentPage, rowsPerPage, handlePagination, availableMetrics, totalPages, handleRowsPerPageChange, selectedDeployment, handleDeploymentChange }) => {
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [activeTooltipRow, setActiveTooltipRow] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [selectedCampaigns, setSelectedCampaigns] = useState([]);
    const [isCompareMode, setIsCompareMode] = useState(false);
    const tableContainerRef = useRef(null);
    
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

    const getTooltipPosition = (index) => {
        if (!tableContainerRef.current) return 'bottom';
        
        const tableContainer = tableContainerRef.current;
        
        const rows = tableContainer.querySelectorAll('tbody tr');
        if (!rows || !rows[index]) return 'bottom';
        
        const row = rows[index];
        const rowRect = row.getBoundingClientRect();
        const containerRect = tableContainer.getBoundingClientRect();
        
        const distanceFromBottom = containerRect.bottom - rowRect.bottom;
        
        return distanceFromBottom < 120 ? 'top' : 'bottom';
    };

    const formatValue = (value, metric) => {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        if (typeof numValue !== 'number' || isNaN(numValue)) return value;
        
        const nonPercentageMetrics = ['Sent', 'Hard_Bounces', 'Soft_Bounces', 'Total_Bounces', 
            'Delivered', 'Unique_Opens', 'Total_Opens', 'Unique_Clicks', 'Total_Clicks', 
            'Filtered_Bot_Clicks'];
            
        if (nonPercentageMetrics.includes(metric)) {
            return value.toLocaleString();
        }
        
        return Number(value).toFixed(2);
    };

    const formatDate = (dateString) => {
            if (!dateString) return '';
            const date = new Date(`${dateString}T00:00:00`);
            if (isNaN(date.getTime())) return dateString;
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const exportToCSV = (fullData) => {
        const header = ['Campaign', 'Send_Date', ...availableMetrics];
        const rows = fullData.map(item => [
            item.Campaign,
            item.Send_Date || '',
            ...availableMetrics.map(metric => 
                typeof item[metric] === 'number' ? formatValue(item[metric], metric) : (item[metric] ?? "")
            ),
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

    const handleCampaignClick = (campaign) => {
        setSelectedCampaign(campaign);
        setIsModalOpen(true);
        setIsCompareMode(false);
    };
    
    const toggleCampaignSelection = (campaign, isSelected) => {
        if (isSelected) {
            setSelectedCampaigns(prev => prev.filter(c => c.Campaign !== campaign.Campaign));
        } else {
            if (selectedCampaigns.length < 4) {
                setSelectedCampaigns(prev => [...prev, campaign]);
            }
        }
    };
    
    const isCampaignSelected = (campaign) => {
        return selectedCampaigns.some(c => c.Campaign === campaign.Campaign);
    };
    
    const openCompareModal = () => {
        if (selectedCampaigns.length > 0) {
            setIsCompareMode(true);
            setIsModalOpen(true);
        }
    };
    
    const closeModal = () => {
        setIsModalOpen(false);
    };

    const maxPageButtons = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    const endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

    const deploymentOptions = [
        { value: "all", label: "All Deployments" },
        { value: "1", label: "Deployment 1" },
        { value: "2", label: "Deployment 2" },
        { value: "3", label: "Deployment 3" },
        { value: "none", label: "No Deployment" }
    ];

    return (
        <div className="table-section">
            <div className="metrics-header">
                <h2>Completed Campaign Metrics</h2>
                
                <div className="top-controls">
                    <div className="filter-control">
                        <label htmlFor="deploymentFilter">Filter by Deployment:</label>
                        <select
                            id="deploymentFilter"
                            value={selectedDeployment}
                            onChange={(e) => handleDeploymentChange(e.target.value)}
                            className="deployment-select"
                        >
                            {deploymentOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div className="rows-control">
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
                    
                    {selectedCampaigns.length > 0 && (
                        <div className="compare-control">
                            <button 
                                className="compare-button"
                                onClick={openCompareModal}
                            >
                                Compare Selected ({selectedCampaigns.length})
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="table-container" ref={tableContainerRef}>
                <table>
                    <thead>
                        <tr>
                            
                            <th className="campaign-column">Campaign</th>
                            <th className="date-column">Send Date</th>
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
                            <th className="select-column">Select</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentRows && currentRows.map((item, index) => {
                            const tooltipPosition = activeTooltipRow === index 
                                ? getTooltipPosition(index) 
                                : 'bottom';
                            const isSelected = isCampaignSelected(item);
                                
                            return (
                                <tr key={index} className={isSelected ? 'selected-row' : ''}>
                                    
                                    <td 
                                        className="campaign-column-with-tooltip clickable"
                                        onMouseEnter={() => setActiveTooltipRow(index)}
                                        onMouseLeave={() => setActiveTooltipRow(null)}
                                        onClick={() => handleCampaignClick(item)}
                                    >
                                        <div className="campaign-text">
                                            {item.Campaign}
                                        </div>
                                        
                                        {activeTooltipRow === index && (
                                            <div className={`attached-tooltip tooltip-${tooltipPosition}`}>
                                                {item.Campaign}
                                            </div>
                                        )}
                                    </td>
                                    <td className="date-column">
                                        {formatDate(item.Send_Date)}
                                    </td>
                                    {Object.values(selectedColumn).map((col, colIndex) => (
                                        <td key={colIndex}>
                                            {formatValue(item[col], col)}
                                        </td>
                                    ))}
                                    <td className="select-column">
                                        <input 
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleCampaignSelection(item, isSelected)}
                                            title={isSelected ? "Deselect for comparison" : "Select for comparison"}
                                            disabled={!isSelected && selectedCampaigns.length >= 4}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
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
            
            <CampaignModal 
                isOpen={isModalOpen}
                onClose={closeModal}
                campaign={selectedCampaign}
                compareCampaigns={selectedCampaigns}
                isCompareMode={isCompareMode}
                metricDisplayNames={metricDisplayNames}
            />
        </div>
    );
};

export default MetricsTable;