import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../../styles/journal.css';

const DigitalJournals = () => {
    const [journalsData, setJournalsData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    
    const BANNED_TITLES = [
        'no title',
        'title not found',
        'untitled',
        ''
    ];

    const isTitleBanned = (title) => {
        if (!title || typeof title !== 'string') return true;
        const normalizedTitle = title.toLowerCase().trim();
        return BANNED_TITLES.includes(normalizedTitle);
    };

    const groupJournalsByTitle = (journals) => {
        if (!groupByTitle) return journals;
        
        const grouped = {};
        
        journals.forEach(journal => {
            const title = journal.title?.trim();
            if (!title || isTitleBanned(title)) return;
            
            if (!grouped[title]) {
                grouped[title] = {
                    ...journal,
                    combinedUrls: [journal.fullUrl || journal.url],
                    originalJournals: [journal],
                    timeData: { ...journal.timeData }
                };
            } else {
                grouped[title].combinedUrls.push(journal.fullUrl || journal.url);
                grouped[title].originalJournals.push(journal);
                
                if (journal.timeData) {
                    Object.keys(journal.timeData).forEach(month => {
                        if (!grouped[title].timeData[month]) {
                            grouped[title].timeData[month] = { ...journal.timeData[month] };
                        } else {
                            const existing = grouped[title].timeData[month];
                            const current = journal.timeData[month];
                            
                            const totalUsers = (existing.users || 0) + (current.users || 0);
                            const totalDuration = ((existing.avgDuration || 0) * (existing.users || 0)) + 
                                                ((current.avgDuration || 0) * (current.users || 0));
                            const totalBounces = ((existing.bounceRate || 0) * (existing.users || 0)) + 
                                               ((current.bounceRate || 0) * (current.users || 0));
                            
                            existing.users = totalUsers;
                            existing.avgDuration = totalUsers > 0 ? totalDuration / totalUsers : 0;
                            existing.bounceRate = totalUsers > 0 ? totalBounces / totalUsers : 0;
                        }
                    });
                }
                
                const latestMonthData = getLatestMonthData(grouped[title]);
                grouped[title].latestMonth = latestMonthData.month;
                grouped[title].latestMonthUsers = latestMonthData.users;
            }
        });
        
        return Object.values(grouped);
    };
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedJournal, setSelectedJournal] = useState(null);
    const [timeframeFilter, setTimeframeFilter] = useState('12');
    const [showUrls, setShowUrls] = useState(false);
    const [groupByTitle, setGroupByTitle] = useState(true);
    const [aggregateMetrics, setAggregateMetrics] = useState({
        totalUsers: 0,
        avgDuration: 0,
        bounceRate: 0,
        mobileToDesktopRatio: 0
    });
    const modalRef = useRef(null);

    useEffect(() => {
        async function fetchUrlData() {
            const blobUrl = "https://emaildash.blob.core.windows.net/json-data/url_data.json?sp=r&st=2025-04-17T15:45:29Z&se=2026-05-16T23:45:29Z&spr=https&sv=2024-11-04&sr=b&sig=JAPRaNxToQbFGXbMjhy0zMrZoL0gm1aM23P8T21Q2kk%3D";
            try {
                const response = await fetch(blobUrl);
                const jsonData = await response.json();
                
                const processedData = jsonData.urls
                    .filter(item => !isTitleBanned(item.title))
                    .map(item => {
                        const latestMonthData = getLatestMonthData(item);
                        return {
                            ...item,
                            latestMonth: latestMonthData.month,
                            latestMonthUsers: latestMonthData.users
                        };
                    });
                
                const groupedData = groupJournalsByTitle(processedData);
                const sortedData = groupedData.sort((a, b) => b.latestMonthUsers - a.latestMonthUsers);
                setJournalsData(sortedData);
                setFilteredData(sortedData);
                
                calculateAggregateMetrics(sortedData, timeframeFilter);
            } catch (error) {
            }
        }
        fetchUrlData();
    }, []);

    useEffect(() => {
        calculateAggregateMetrics(filteredData, timeframeFilter);
    }, [timeframeFilter, filteredData]);

    useEffect(() => {
        if (journalsData.length > 0) {
            const reprocessData = async () => {
                const blobUrl = "https://emaildash.blob.core.windows.net/json-data/url_data.json?sp=r&st=2025-04-17T15:45:29Z&se=2026-05-16T23:45:29Z&spr=https&sv=2024-11-04&sr=b&sig=JAPRaNxToQbFGXbMjhy0zMrZoL0gm1aM23P8T21Q2kk%3D";
                try {
                    const response = await fetch(blobUrl);
                    const jsonData = await response.json();
                    
                    const processedData = jsonData.urls
                        .filter(item => !isTitleBanned(item.title))
                        .map(item => {
                            const latestMonthData = getLatestMonthData(item);
                            return {
                                ...item,
                                latestMonth: latestMonthData.month,
                                latestMonthUsers: latestMonthData.users
                            };
                        });
                    
                    const groupedData = groupJournalsByTitle(processedData);
                    const sortedData = groupedData.sort((a, b) => b.latestMonthUsers - a.latestMonthUsers);
                    setJournalsData(sortedData);
                    setFilteredData(sortedData);
                    
                    calculateAggregateMetrics(sortedData, timeframeFilter);
                } catch (error) {
                }
            };
            reprocessData();
        }
    }, [groupByTitle]);

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

    const calculateMobileToDesktopRatio = (journal) => {
        if (!journal.devices) return 0;

        let mobileCount = 0;
        let desktopCount = 0;

        Object.entries(journal.devices).forEach(([device, count]) => {
            const deviceLower = device.toLowerCase();
            if (deviceLower === 'mobile' || deviceLower === 'tablet') {
                mobileCount += count;
            } else if (deviceLower === 'desktop') {
                desktopCount += count;
            }
        });

        if (desktopCount === 0) return mobileCount > 0 ? 999 : 0;
        return mobileCount / desktopCount;
    };

    const formatMobileToDesktopRatio = (ratio) => {
        if (ratio === 0) return "0:1";
        if (ratio === 999) return "∞:1";
        return `${ratio.toFixed(2)}:1`;
    };

    const calculateAggregateMetrics = (data, timeframe) => {
        let totalUsers = 0;
        let totalDuration = 0;
        let totalBounces = 0;
        let totalSessions = 0;
        let totalMobile = 0;
        let totalDesktop = 0;

        data.forEach(journal => {
            if (!journal.timeData) return;

            const timeData = getTimeframeData(journal, timeframe);

            timeData.forEach(monthData => {
                totalUsers += monthData.users || 0;
                totalDuration += (monthData.avgDuration || 0) * (monthData.users || 0);
                totalBounces += (monthData.bounceRate / 100 || 0) * (monthData.users || 0);
                totalSessions += monthData.users || 0;
            });

            if (journal.devices) {
                Object.entries(journal.devices).forEach(([device, count]) => {
                    const deviceLower = device.toLowerCase();
                    if (deviceLower === 'mobile' || deviceLower === 'tablet') {
                        totalMobile += count;
                    } else if (deviceLower === 'desktop') {
                        totalDesktop += count;
                    }
                });
            }
        });

        const avgDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
        const avgBounceRate = totalSessions > 0 ? (totalBounces / totalSessions) : 0;
        const mobileToDesktopRatio = totalDesktop > 0 ? totalMobile / totalDesktop : (totalMobile > 0 ? 999 : 0);

        setAggregateMetrics({
            totalUsers,
            avgDuration,
            bounceRate: avgBounceRate,
            mobileToDesktopRatio
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
            if (isTitleBanned(item.title)) return false;
            const displayText = getDisplayTitle(item).toLowerCase();
            return searchValue.split(' ').every(word => displayText.includes(word));
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

    const getDisplayTitle = (item) => {
        if (!showUrls && item.title && item.title.trim() && !isTitleBanned(item.title)) {
            return formatTitle(item.title);
        }
        if (showUrls) {
            const title = item.title && item.title.trim() && !isTitleBanned(item.title) 
                ? formatTitle(item.title) 
                : "";
            const url = item.fullUrl || item.url || "";
            return title ? `${title} - ${url}` : url;
        }
        return item.fullUrl || item.url || "No URL";
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
            getDisplayTitle(item),
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

    const totalPages = Math.ceil(filteredData.filter(item => {
        if (isTitleBanned(item.title)) return false;
        if (!showUrls) {
            return item.title && item.title.trim();
        }
        return true;
    }).length / rowsPerPage);
    
    const validData = filteredData.filter(item => {
        if (isTitleBanned(item.title)) return false;
        if (!showUrls) {
            return item.title && item.title.trim();
        }
        return true;
    });
    
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentRows = validData.slice(indexOfFirstRow, indexOfLastRow);

    const maxPageButtons = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    const endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

    return (
        <div className="digital-journals-container">
            <div className="page-header">
                <h1>Digital Journal Metrics</h1>
                <div className="search-container">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search by Title or URL"
                        value={search}
                        onChange={handleSearchChange}
                    />
                </div>
            </div>

            <div className="journal-metrics-summary">
                <div className="metric-summary-card">
                    <div className="metric-summary-label">Total Users</div>
                    <div className="metric-summary-value">{formatNumber(aggregateMetrics.totalUsers)}</div>
                </div>
                <div className="metric-summary-card">
                    <div className="metric-summary-label">Avg Duration</div>
                    <div className="metric-summary-value">{formatEngagement(aggregateMetrics.avgDuration)}</div>
                </div>
                <div className="metric-summary-card">
                    <div className="metric-summary-label">Bounce Rate</div>
                    <div className="metric-summary-value">{formatBounceRate(aggregateMetrics.bounceRate)}</div>
                </div>
                <div className="metric-summary-card">
                    <div className="metric-summary-label">Mobile:Desktop Ratio</div>
                    <div className="metric-summary-value">{formatMobileToDesktopRatio(aggregateMetrics.mobileToDesktopRatio)}</div>
                </div>
            </div>

            <div className="table-section">
                <div className="table-controls">
                    <div className="digital-journals-toggles">
                        <div className="specialty-combine-toggle">
                            <input
                                type="checkbox"
                                id="groupByTitleToggle"
                                checked={groupByTitle}
                                onChange={(e) => setGroupByTitle(e.target.checked)}
                            />
                            <label htmlFor="groupByTitleToggle" className="specialty-toggle-slider"></label>
                            <span className="specialty-toggle-label">Group by Title</span>
                        </div>
                        <div className="specialty-combine-toggle">
                            <input
                                type="checkbox"
                                id="showUrlsToggle"
                                checked={showUrls}
                                onChange={(e) => setShowUrls(e.target.checked)}
                            />
                            <label htmlFor="showUrlsToggle" className="specialty-toggle-slider"></label>
                            <span className="specialty-toggle-label">Show URLs</span>
                        </div>
                    </div>
                    <div className="rows-per-page-control">
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

                <table className="digital-journals-table">
                    <thead>
                        <tr>
                            <th className="journal-title-column">Title</th>
                            <th>Total Users</th>
                            <th>Avg Duration</th>
                            <th>Bounce Rate</th>
                            <th>Mobile:Desktop</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentRows.map((item, index) => (
                            <tr key={index}>
                                <td
                                    className="journal-title-column journal-title"
                                    onClick={() => handleJournalClick(item)}
                                >
                                    {getDisplayTitle(item)}
                                </td>
                                <td>{formatNumber(calculateJournalMetricsForTimeframe(item).users)}</td>
                                <td>{formatEngagement(calculateJournalMetricsForTimeframe(item).avgDuration)}</td>
                                <td>{formatBounceRate(calculateJournalMetricsForTimeframe(item).bounceRate)}</td>
                                <td>{formatMobileToDesktopRatio(calculateMobileToDesktopRatio(item))}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="table-footer">
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
                <div className="export-button-container">
                    <button className="export-button" onClick={exportToCSV}>
                        Export CSV
                    </button>
                </div>
            </div>
            
            {isModalOpen && selectedJournal && (
                <div className="journal-modal-overlay">
                    <div className="journal-modal" ref={modalRef}>
                        <div className="journal-modal-header">
                            <h3>{getDisplayTitle(selectedJournal)}</h3>
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

                        {groupByTitle && selectedJournal.combinedUrls && selectedJournal.combinedUrls.length > 1 && (
                            <div className="journal-modal-combined-urls">
                                <h4>Combined Pages ({selectedJournal.combinedUrls.length} URLs)</h4>
                                <div className="combined-urls-grid">
                                    {selectedJournal.combinedUrls
                                        .sort((a, b) => {
                                            const getPageNumber = (url) => {
                                                const lastPart = url.split('/').pop();
                                                if (lastPart?.match(/^Page\s+(\d+)$/i)) {
                                                    return parseInt(lastPart.match(/(\d+)/)[1]);
                                                }
                                                if (lastPart?.match(/^S-(\d+)$/i)) {
                                                    return parseInt(lastPart.match(/(\d+)/)[1]);
                                                }
                                                return 999;
                                            };
                                            return getPageNumber(a) - getPageNumber(b);
                                        })
                                        .map((url, index) => {
                                            const fullUrl = url.startsWith('http') ? url : `https://${url}`;
                                            return (
                                                <div key={index} className="combined-url-card">
                                                    <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="url-card-link">
                                                        {url.split('/').pop() || `URL ${index + 1}`}
                                                    </a>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DigitalJournals;