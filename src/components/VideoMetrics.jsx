import React, { useState, useEffect } from 'react';
import { videoMetricDisplayNames } from './metricDisplayNames';
import VideoModal from './VideoModal';

const VideoMetrics = () => {
    const [videosData, setVideosData] = useState({});
    const [videosList, setVideosList] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [selectedMetrics, setSelectedMetrics] = useState({
        col1: 'views',
        col2: 'impressions',
        col3: 'averageViewPercentage',
        col4: 'watchTimeHours'
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);

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
            const blobUrl = "https://emaildash.blob.core.windows.net/json-data/youtube_metrics.json?sp=r&st=2024-12-13T20:41:55Z&se=2026-02-02T04:41:55Z&spr=https&sv=2022-11-02&sr=b&sig=9V%2B8%2FcA1G1pIdaNAyicVWNiKfjbXbwjv4zZgLvuLoEE%3D";
            try {
                const response = await fetch(blobUrl);
                const jsonData = await response.json();
                setVideosData(jsonData);
                
                // Transform videos object to array for table display
                const videoIds = Object.keys(jsonData.videos || {});
                const videos = videoIds.map(id => {
                    const video = jsonData.videos[id];
                    
                    // Calculate recent performance (last 7 days)
                    let recentViews = 0;
                    const today = new Date();
                    const history = video.history || {};
                    
                    // Get dates for the last 7 days
                    const last7Days = [];
                    for (let i = 0; i < 7; i++) {
                        const date = new Date(today);
                        date.setDate(date.getDate() - i);
                        last7Days.push(date.toISOString().split('T')[0]);
                    }
                    
                    // Sum views from the last 7 days
                    last7Days.forEach(dateString => {
                        if (history[dateString] && history[dateString].totals) {
                            recentViews += history[dateString].totals.views || 0;
                        }
                    });
                    
                    return {
                        id,
                        title: video.snippet?.title || 'Untitled',
                        thumbnail: video.snippet?.thumbnails?.medium?.url,
                        publishedAt: video.snippet?.publishedAt,
                        recentViews, // Add recent views as a sorting metric
                        ...video.totals,
                        history: history
                    };
                });
                
                // Sort by recent views (last 7 days)
                const sortedVideos = videos.sort((a, b) => (b.recentViews || 0) - (a.recentViews || 0));
                setVideosList(sortedVideos);
                setFilteredData(sortedVideos);
            } catch (error) {
                console.error("Error fetching video metrics data:", error);
            }
        }
        fetchVideoMetricsData();
    }, []);

    const handleSearchChange = (e) => {
        const searchValue = e.target.value.toLowerCase();
        setSearch(searchValue);
        setFilteredData(videosList.filter(item =>
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

    const openVideoModal = (video) => {
        // Get full video data from original source
        const fullVideoData = videosData.videos[video.id];
        setSelectedVideo({
            ...video,
            fullData: fullVideoData
        });
        setIsModalOpen(true);
    };

    const closeVideoModal = () => {
        setIsModalOpen(false);
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

    // Available metrics based on your YouTube data structure
    const availableMetrics = [
        'views', 
        'watchTimeHours', 
        'estimatedMinutesWatched', 
        'averageViewDuration', 
        'averageViewPercentage',
        'impressions', 
        'impressionsCtr', 
        'likes', 
        'comments', 
        'shares',
        'subscribersGained', 
        'subscribersLost'
    ];

    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow);

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
                        <th className="title-column">Title</th>
                        <th>Recent Views (7d)</th>
                        {Object.entries(selectedMetrics).map(([colKey, colValue]) => (
                            <th 
                                key={colKey}
                                className="sortable-header relative"
                            >
                                <div 
                                    className="header-content cursor-pointer"
                                    onClick={() => toggleDropdown(colKey)}
                                >
                                    <span>{videoMetricDisplayNames[colValue] || colValue}</span>
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
                                        {availableMetrics.map((metric) => (
                                            <div
                                                key={metric}
                                                onClick={() => handleMetricChange(colKey, metric)}
                                                className="dropdown-item"
                                            >
                                                {videoMetricDisplayNames[metric] || metric}
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
                            <td 
                                className="journal-title"
                                onClick={() => openVideoModal(item)}
                            >
                                {item.title}
                            </td>
                            <td>{item.recentViews.toLocaleString()}</td>
                            {Object.values(selectedMetrics).map((metric, idx) => (
                                <td key={idx}>
                                    {typeof item[metric] === 'number' 
                                        ? (metric.includes('percentage') || metric === 'impressionsCtr' 
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

            {isModalOpen && selectedVideo && (
                <VideoModal 
                    video={selectedVideo} 
                    onClose={closeVideoModal} 
                />
            )}
        </div>
    );
};

export default VideoMetrics;