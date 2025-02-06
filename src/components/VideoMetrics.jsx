import React, { useState, useEffect } from 'react';
import { videoMetricDisplayNames } from './metricDisplayNames';

const VideoMetrics = () => {
    const [videosData, setVideosData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [selectedMetrics, setSelectedMetrics] = useState({
        col1: 'views',
        col2: 'impressions',
        col3: 'finishes',
        col4: 'mean_percent_watched'
    });

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.sortable-header')) {
                setActiveDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        async function fetchVideoMetricsData() {
            const blobUrl = "https://emaildash.blob.core.windows.net/json-data/video_metrics.json?sp=r&st=2024-12-13T20:41:55Z&se=2026-02-02T04:41:55Z&spr=https&sv=2022-11-02&sr=b&sig=9V%2B8%2FcA1G1pIdaNAyicVWNiKfjbXbwjv4zZgLvuLoEE%3D";
            try {
                const response = await fetch(blobUrl);
                const jsonData = await response.json();
                const sortedData = jsonData.sort((a, b) => b.views - a.views);
                setVideosData(sortedData);
                setFilteredData(sortedData);
            } catch (error) {
                console.error("Error fetching video metrics data:", error);
            }
        }
        fetchVideoMetricsData();
    }, []);

    const handleSearchChange = (e) => {
        const searchValue = e.target.value.toLowerCase();
        setSearch(searchValue);
        setFilteredData(videosData.filter(item =>
            searchValue.split(' ').every(word => item.title.toLowerCase().includes(word))
        ));
        setCurrentPage(1);
    };

    const handleRowsPerPageChange = (e) => {
        setRowsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    const handlePagination = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const toggleDropdown = (colKey) => {
        setActiveDropdown(activeDropdown === colKey ? null : colKey);
    };

    const handleMetricChange = (colKey, newMetric) => {
        setSelectedMetrics(prev => ({ ...prev, [colKey]: newMetric }));
        setActiveDropdown(null);
    };

    const exportToCSV = () => {
        const header = ['Title', ...Object.values(selectedMetrics).map(metric => videoMetricDisplayNames[metric])];
        const rows = filteredData.map(item => [
            item.title,
            ...Object.values(selectedMetrics).map(metric => item[metric] ?? "")
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
        link.setAttribute("download", "video_metrics_data.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);

    const availableMetrics = [
        'views', 'impressions', 'finishes', 'downloads', 
        'unique_impressions', 'unique_viewers', 'mean_percent_watched',
        'mean_seconds_watched', 'total_seconds_watched', 'created'
    ];

    const maxPageButtons = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    const endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

    return (
        <div className="table-section">
            <div className="digital-journals-header">
                <h2>JCAD TV Metrics</h2>
                <div className="search-container">
                    <input
                        type="text"
                        className="digital-journals-search-box"
                        placeholder="Search by Title"
                        value={search}
                        onChange={handleSearchChange}
                    />
                </div>
                <div className="digital-journals-controls">
                    <div className="digital-ed-rows-per-page">
                        <label htmlFor="rowsPerPage">Rows per page:</label>
                        <select
                            id="rowsPerPage"
                            value={rowsPerPage}
                            onChange={handleRowsPerPageChange}
                        >
                            {[10, 15, 20, 25, 30, 35, 40, 45, 50].map((num) => (
                                <option key={num} value={num}>{num}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Title</th>
                        {Object.entries(selectedMetrics).map(([colKey, colValue]) => (
                            <th 
                                key={colKey}
                                className="sortable-header relative"
                            >
                                <div 
                                    className="header-content cursor-pointer"
                                    onClick={() => toggleDropdown(colKey)}
                                >
                                    <span>{videoMetricDisplayNames[colValue]}</span>
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
                                    <div className="dropdown absolute right-0 mt-2 py-2 w-48 bg-white rounded-md shadow-lg z-10">
                                        {availableMetrics.map((metric) => (
                                            <div
                                                key={metric}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMetricChange(colKey, metric);
                                                }}
                                                className="dropdown-item px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                            >
                                                {videoMetricDisplayNames[metric]}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {currentRows.map((item, index) => (
                        <tr key={index}>
                            <td>{item.title}</td>
                            {Object.values(selectedMetrics).map((metric, idx) => (
                                <td key={idx}>
                                    {typeof item[metric] === 'number' 
                                        ? (metric.includes('percent') || metric.includes('watched') 
                                            ? `${item[metric].toFixed(2)}%` 
                                            : item[metric].toLocaleString())
                                        : item[metric]}
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
                <button className="export-button" onClick={exportToCSV}>
                    Export CSV
                </button>
            </div>
        </div>
    );
};

export default VideoMetrics;