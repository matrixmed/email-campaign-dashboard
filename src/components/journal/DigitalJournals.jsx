import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../../styles/journal.css';

const DigitalJournals = () => {
    const [journalsData, setJournalsData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedJournal, setSelectedJournal] = useState(null);
    const [timeframeFilter, setTimeframeFilter] = useState('12');
    const [aggregateMetrics, setAggregateMetrics] = useState({
        totalUsers: 0,
        avgDuration: 0,
        bounceRate: 0
    });
    const modalRef = useRef(null);

    useEffect(() => {
        async function fetchUrlData() {
            const blobUrl = "https://emaildash.blob.core.windows.net/json-data/url_data.json?sp=r&st=2025-04-17T15:45:29Z&se=2026-05-16T23:45:29Z&spr=https&sv=2024-11-04&sr=b&sig=JAPRaNxToQbFGXbMjhy0zMrZoL0gm1aM23P8T21Q2kk%3D";
            try {
                const response = await fetch(blobUrl);
                const jsonData = await response.json();
                
                const processedData = jsonData.urls.map(item => {
                    const latestMonthData = getLatestMonthData(item);
                    return {
                        ...item,
                        latestMonth: latestMonthData.month,
                        latestMonthUsers: latestMonthData.users
                    };
                });
                
                const sortedData = processedData.sort((a, b) => b.latestMonthUsers - a.latestMonthUsers);
                setJournalsData(sortedData);
                setFilteredData(sortedData);
                
                calculateAggregateMetrics(sortedData, timeframeFilter);
            } catch (error) {
                console.error("Error fetching URL data:", error);
            }
        }
        fetchUrlData();
    }, []);

    useEffect(() => {
        calculateAggregateMetrics(filteredData, timeframeFilter);
    }, [timeframeFilter, filteredData]);

    function calculateJournalMetricsForTimeframe(journal) {
        if (!journal || !journal.timeData) {
            return { users: 0, avgDuration: 0, bounceRate: 0 };
        }
        
        const timeData = getTimeframeData(journal);
        
        let totalUsers = 0;
        let totalDuration = 0;
        let totalBounces = 0;
        
        timeData.forEach(monthData => {
            totalUsers += monthData.users || 0;
            totalDuration += (monthData.avgDuration || 0) * (monthData.users || 0);
            totalBounces += (monthData.bounceRate / 100 || 0) * (monthData.users || 0);
        });
        
        const avgDuration = totalUsers > 0 ? totalDuration / totalUsers : 0;
        const bounceRate = totalUsers > 0 ? totalBounces / totalUsers : 0;
        
        return {
            users: totalUsers,
            avgDuration,
            bounceRate
        };
    }

    const calculateAggregateMetrics = (data, timeframe) => {
        let totalUsers = 0;
        let totalDuration = 0;
        let totalBounces = 0;
        let totalSessions = 0;
        
        data.forEach(journal => {
            if (!journal.timeData) return;
            
            const timeData = getTimeframeData(journal, timeframe);
            
            timeData.forEach(monthData => {
                totalUsers += monthData.users || 0;
                totalDuration += (monthData.avgDuration || 0) * (monthData.users || 0);
                totalBounces += (monthData.bounceRate / 100 || 0) * (monthData.users || 0);
                totalSessions += monthData.users || 0;
            });
        });
        
        const avgDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
        const avgBounceRate = totalSessions > 0 ? (totalBounces / totalSessions) : 0;
        
        setAggregateMetrics({
            totalUsers,
            avgDuration,
            bounceRate: avgBounceRate
        });
    };

    const getLatestMonthData = (journal) => {
        if (!journal.timeData || Object.keys(journal.timeData).length === 0) {
            return { month: "No Data", users: 0 };
        }
        
        const months = Object.keys(journal.timeData).sort();
        const latestMonth = months[months.length - 1];
        
        return { 
            month: latestMonth, 
            users: journal.timeData[latestMonth]?.users || 0 
        };
    };

    useEffect(() => {
        function handleClickOutside(event) {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setIsModalOpen(false);
            }
        }
        
        if (isModalOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isModalOpen]);

    const handleSearchChange = (e) => {
        const searchValue = e.target.value.toLowerCase();
        setSearch(searchValue);
        
        const newFilteredData = journalsData.filter(item => {
            const titleMatch = item.title && searchValue.split(' ').every(word => 
                item.title.toLowerCase().includes(word));
            const urlMatch = item.url && searchValue.split(' ').every(word => 
                item.url.toLowerCase().includes(word));
            const fullUrlMatch = item.fullUrl && searchValue.split(' ').every(word => 
                item.fullUrl.toLowerCase().includes(word));
                
            return titleMatch || urlMatch || fullUrlMatch;
        });
        
        setFilteredData(newFilteredData);
        setCurrentPage(1);
        
        calculateAggregateMetrics(newFilteredData, timeframeFilter);
    };

    const handleRowsPerPageChange = (e) => {
        setRowsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    const handlePagination = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const handleJournalClick = (journal) => {
        setSelectedJournal(journal);
        setIsModalOpen(true);
    };

    const handleGlobalTimeframeChange = (e) => {
        setTimeframeFilter(e.target.value);
    };

    const formatTitle = (title) => {
        if (!title) return "Untitled";
        return title
            .toLowerCase()
            .replace(/\b\w/g, char => char.toUpperCase());
    };

    const formatEngagement = (seconds) => {
        if (isNaN(seconds) || seconds < 0) {
            return "0s";
        }

        seconds = Math.round(seconds);
        
        if (seconds < 60) {
            return `${seconds}s`;
        }
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (remainingSeconds === 0) {
            return `${minutes}m`;
        }
        
        return `${minutes}m ${remainingSeconds}s`;
    };
    
    const formatBounceRate = (rate) => {
        if (isNaN(rate)) return "0%";
        return `${(rate * 100).toFixed(2)}%`;
    };
    
    const formatNumber = (num) => {
        if (isNaN(num)) return "0";
        return num.toLocaleString();
    };
    
    const getTimeframeData = (journal, selectedTimeframe = timeframeFilter) => {
        if (!journal || !journal.timeData) return [];
        
        const timeDataArray = Object.entries(journal.timeData).map(([month, data]) => ({
            month,
            users: data.users || 0,
            avgDuration: data.avgDuration || 0,
            bounceRate: (data.bounceRate || 0) * 100
        }));
        
        timeDataArray.sort((a, b) => a.month.localeCompare(b.month));
        
        if (selectedTimeframe === 'all') {
            return timeDataArray;
        } else {
            const monthsToShow = parseInt(selectedTimeframe, 10);
            return timeDataArray.slice(-monthsToShow);
        }
    };

    const exportToCSV = () => {
        const header = ['Title', 'URL', 'Total Users', 'Avg Duration', 'Bounce Rate'];
    
        const rows = filteredData.map(item => [
            item.title || 'Untitled',
            item.fullUrl || item.url,
            item.totalUsers,
            item.avgDuration,
            item.bounceRate
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
        link.setAttribute("download", "digital_journals_data.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const validData = filteredData.filter(item => item.title && item.title.toLowerCase() !== "title not found");
    
    const totalPages = Math.ceil(validData.length / rowsPerPage);
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentRows = validData.slice(indexOfFirstRow, indexOfLastRow);

    const maxPageButtons = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    const endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

    return (
        <div className="table-section">
            <div className="digital-journals-header">
                <h2>Digital Journal Metrics</h2>
                <div className="search-container">
                    <input
                        type="text"
                        className="digital-journals-search-box"
                        placeholder="Search by Title or URL"
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
                            {[10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100].map((num) => (
                                <option key={num} value={num}>
                                    {num}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th className="journal-title-column">Title</th>
                        <th>Total Users</th>
                        <th>Avg Duration</th>
                        <th>Bounce Rate</th>
                    </tr>
                </thead>
                <tbody>
                    {currentRows.map((item, index) => (
                            <tr key={index}>
                                <td 
                                    className="title-cell journal-title"
                                    onClick={() => handleJournalClick(item)}
                                >
                                    {formatTitle(item.title || item.url)}
                                </td>
                                <td>{formatNumber(calculateJournalMetricsForTimeframe(item).users)}</td>
                                <td>{formatEngagement(calculateJournalMetricsForTimeframe(item).avgDuration)}</td>
                                <td>{formatBounceRate(calculateJournalMetricsForTimeframe(item).bounceRate)}</td>
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
            
            {isModalOpen && selectedJournal && (
                <div className="journal-modal-overlay">
                    <div className="journal-modal" ref={modalRef}>
                        <div className="journal-modal-header">
                            <h3>{formatTitle(selectedJournal.title || selectedJournal.url)}</h3>
                            <button 
                                className="modal-close-button"
                                onClick={() => setIsModalOpen(false)}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="journal-modal-url">
                            {selectedJournal.fullUrl || selectedJournal.url}
                        </div>
                        
                        <div className="journal-modal-controls">
                            <div className="timeframe-filter">
                                <label htmlFor="modalTimeframeFilter">Timeframe:</label>
                                <select
                                    id="modalTimeframeFilter"
                                    value={timeframeFilter}
                                    onChange={handleGlobalTimeframeChange}
                                >
                                    <option value="all">All Time</option>
                                    <option value="12">Last 12 Months</option>
                                    <option value="6">Last 6 Months</option>
                                    <option value="3">Last 3 Months</option>
                                    <option value="1">Last Month</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="journal-modal-metrics">
                            <div className="metric-card">
                                <div className="metric-label">Total Users</div>
                                <div className="metric-value">
                                    {formatNumber(calculateJournalMetricsForTimeframe(selectedJournal).users)}
                                </div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-label">Avg Duration</div>
                                <div className="metric-value">
                                    {formatEngagement(calculateJournalMetricsForTimeframe(selectedJournal).avgDuration)}
                                </div>
                            </div>
                            <div className="metric-card">
                                <div className="metric-label">Bounce Rate</div>
                                <div className="metric-value">
                                    {formatBounceRate(calculateJournalMetricsForTimeframe(selectedJournal).bounceRate)}
                                </div>
                            </div>
                        </div>

                        <div className="journal-modal-monthly">
                            <h4>Monthly Performance</h4>
                            
                            {selectedJournal.timeData && Object.keys(selectedJournal.timeData).length > 0 ? (
                                <>
                                    <table className="detail-table monthly-table">
                                        <thead>
                                            <tr>
                                                <th>Month</th>
                                                <th>Users</th>
                                                <th>Avg Duration</th>
                                                <th>Bounce Rate</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {getTimeframeData(selectedJournal).map((data, index) => (
                                                <tr key={index}>
                                                    <td>{data.month}</td>
                                                    <td>{formatNumber(data.users)}</td>
                                                    <td>{formatEngagement(data.avgDuration)}</td>
                                                    <td>{data.bounceRate.toFixed(2)}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    
                                    <div className="journal-chart-container">
                                        <ResponsiveContainer width="100%" height={300}>
                                            <LineChart
                                                data={getTimeframeData(selectedJournal)}
                                                margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="month" />
                                                <YAxis yAxisId="left" />
                                                <YAxis yAxisId="right" orientation="right" />
                                                <Tooltip />
                                                <Legend />
                                                <Line 
                                                    yAxisId="left"
                                                    type="monotone" 
                                                    dataKey="users" 
                                                    stroke="#8884d8" 
                                                    name="Users" 
                                                    activeDot={{ r: 8 }}
                                                />
                                                <Line 
                                                    yAxisId="right"
                                                    type="monotone" 
                                                    dataKey="avgDuration" 
                                                    stroke="#82ca9d" 
                                                    name="Avg Duration (sec)" 
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </>
                            ) : (
                                <p>No monthly data available</p>
                            )}
                        </div>
                        
                        <div className="journal-modal-details">
                            <div className="device-breakdown">
                                <h4>Device Breakdown</h4>
                                {selectedJournal.devices && Object.entries(selectedJournal.devices).length > 0 ? (
                                    <table className="detail-table">
                                        <thead>
                                            <tr>
                                                <th>Device</th>
                                                <th>Users</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(selectedJournal.devices)
                                                .sort(([, a], [, b]) => b - a)
                                                .map(([device, count], index) => (
                                                    <tr key={index}>
                                                        <td>{device.charAt(0).toUpperCase() + device.slice(1)}</td>
                                                        <td>{formatNumber(count)}</td>
                                                    </tr>
                                                ))
                                            }
                                        </tbody>
                                    </table>
                                ) : (
                                    <p>No device data available</p>
                                )}
                            </div>
                            
                            <div className="source-breakdown">
                                <h4>Traffic Sources</h4>
                                {selectedJournal.sources && Object.entries(selectedJournal.sources).length > 0 ? (
                                    <table className="detail-table">
                                        <thead>
                                            <tr>
                                                <th>Source</th>
                                                <th>Sessions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(selectedJournal.sources)
                                                .sort(([, a], [, b]) => b - a)
                                                .slice(0, 10) 
                                                .map(([source, count], index) => (
                                                    <tr key={index}>
                                                        <td>{source}</td>
                                                        <td>{formatNumber(count)}</td>
                                                    </tr>
                                                ))
                                            }
                                        </tbody>
                                    </table>
                                ) : (
                                    <p>No source data available</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DigitalJournals;