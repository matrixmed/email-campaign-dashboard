import React, { useState, useEffect } from 'react';
import VideoModal from './VideoModal';
import '../../styles/video.css';
import { matchesSearchTerm } from '../../utils/searchUtils';
import { useSearch } from '../../context/SearchContext';

const metricDisplayNames = {
  views: "Views",
  impressions: "Impressions",
  averageViewDuration: "Avg. Watch Time",
  averageViewPercentage: "Avg. Completion %",
  watchTimeHours: "Total Watch Time",
  likes: "Likes",
  comments: "Comments",
  shares: "Shares",
  subscribersGained: "Subscribers Gained",
  subscribersLost: "Subscribers Lost",
  estimatedMinutesWatched: "Minutes Watched",
  impressionsCtr: "Click-Through Rate"
};

const VideoMetrics = () => {
    const { searchTerms, setSearchTerm: setGlobalSearchTerm } = useSearch();
    const [videosData, setVideosData] = useState({});
    const [videosList, setVideosList] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [search, setSearch] = useState(searchTerms.videoMetrics || '');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [sortColumn, setSortColumn] = useState('views');
    const [sortDirection, setSortDirection] = useState('desc');

    const displayMetrics = [
        'source',
        'impressions',
        'watchTimeHours',
        'averageViewPercentage',
        'impressionsCtr'
    ];

    useEffect(() => {
        async function fetchVideoMetricsData() {
            const blobUrl = "https://emaildash.blob.core.windows.net/json-data/video_metrics.json?sp=r&st=2024-12-13T20:41:55Z&se=2026-02-02T04:41:55Z&spr=https&sv=2022-11-02&sr=b&sig=9V%2B8%2FcA1G1pIdaNAyicVWNiKfjbXbwjv4zZgLvuLoEE%3D";
            try {
                const response = await fetch(blobUrl);
                const jsonData = await response.json();
                setVideosData(jsonData);
                
                const videoIds = Object.keys(jsonData.videos || {});
                const videos = videoIds.map(id => {
                    const video = jsonData.videos[id];

                    let thumbnail;
                    if (video.snippet?.thumbnails?.default && typeof video.snippet.thumbnails.default === 'string') {
                        thumbnail = video.snippet.thumbnails.default;
                    } else {
                        thumbnail = video.snippet?.thumbnails?.medium?.url ||
                                   video.snippet?.thumbnails?.default?.url;
                    }

                    const playlists = video.playlists || [];
                    const playlistNames = playlists.map(p => p.title).join(' ');

                    const internalGroups = video.internalGroups || [];
                    const groupNames = internalGroups.join(' ');

                    const impressions = video.totals?.impressions || 0;
                    const views = video.totals?.views || 0;
                    const calculatedCtr = impressions > 0 ? (views / impressions * 100) : 0;

                    return {
                        id,
                        title: video.snippet?.title || 'Untitled',
                        thumbnail: thumbnail,
                        publishedAt: video.snippet?.publishedAt,
                        ...video.totals,
                        impressionsCtr: calculatedCtr,
                        history: video.history,
                        playlists: playlists,
                        playlist: playlistNames,
                        internalGroups: internalGroups,
                        groupTags: groupNames
                    };
                });
                
                const sortedVideos = videos.sort((a, b) => (b.views || 0) - (a.views || 0));
                setVideosList(sortedVideos);
                setFilteredData(sortedVideos);
            } catch (error) {
            }
        }
        fetchVideoMetricsData();
    }, []);

    const handleSearchChange = (e) => {
        const searchValue = e.target.value;
        setSearch(searchValue);
        setGlobalSearchTerm('videoMetrics', searchValue);
        const filtered = videosList.filter(item => {
            const searchableText = [
                item.title || '',
                item.playlist || '',
                item.groupTags || ''
            ].join(' ');
            return matchesSearchTerm(searchableText, searchValue);
        });
        setFilteredData(filtered);
        setCurrentPage(1);
    };

    const handleSort = (column) => {
        let newDirection = 'desc';
        if (sortColumn === column && sortDirection === 'desc') {
            newDirection = 'asc';
        }

        setSortColumn(column);
        setSortDirection(newDirection);

        const sorted = [...filteredData].sort((a, b) => {
            if (column === 'source') {
                const aIsYoutube = isYouTubeVideo(a);
                const bIsYoutube = isYouTubeVideo(b);

                if (newDirection === 'asc') {
                    return aIsYoutube === bIsYoutube ? 0 : aIsYoutube ? -1 : 1;
                } else {
                    return aIsYoutube === bIsYoutube ? 0 : aIsYoutube ? 1 : -1;
                }
            } else {
                const aVal = a[column] || 0;
                const bVal = b[column] || 0;

                if (newDirection === 'asc') {
                    return aVal - bVal;
                } else {
                    return bVal - aVal;
                }
            }
        });

        setFilteredData(sorted);
    };

    const calculateAggregateMetrics = () => {
        if (!filteredData || filteredData.length === 0) {
            return {
                totalImpressions: 0,
                totalWatchTime: 0,
                avgPercentViewed: 0,
                impressionsCtr: 0
            };
        }

        const totalImpressions = filteredData.reduce((sum, video) => {
            return sum + (video.impressions || 0);
        }, 0);

        const totalWatchTime = filteredData.reduce((sum, video) => {
            return sum + (video.watchTimeHours || 0);
        }, 0);

        const avgPercentViewed = filteredData.reduce((sum, video) => {
            return sum + (video.averageViewPercentage || 0);
        }, 0) / filteredData.length;

        const totalViews = filteredData.reduce((sum, video) => {
            return sum + (video.views || 0);
        }, 0);

        const impressionsCtr = totalImpressions > 0
            ? (totalViews / totalImpressions * 100)
            : 0;

        return {
            totalImpressions,
            totalWatchTime,
            avgPercentViewed,
            impressionsCtr
        };
    };

    const handleRowsPerPageChange = (e) => {
        setRowsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    const handlePagination = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const openVideoModal = (video) => {
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

    const isYouTubeVideo = (video) => {
        if (!video || !videosData.videos[video.id]) return false;
        
        const videoData = videosData.videos[video.id];
        const thumbnails = videoData?.snippet?.thumbnails;
        
        const isVimeo = thumbnails && 
                       (typeof thumbnails.default === 'string' || 
                        thumbnails.default?.url?.includes('vumbnail.com'));
        
        return !isVimeo;
    };

    const formatNumber = (num) => {
        if (num === undefined || isNaN(num)) return "0";
        return num.toLocaleString();
    };

    const formatPercent = (value) => {
        if (value === undefined || isNaN(value)) return "0%";
        return value.toFixed(1) + '%';
    };

    const formatTime = (seconds) => {
        if (seconds === undefined || isNaN(seconds)) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const formatWatchTime = (hours) => {
        if (hours === undefined || isNaN(hours)) return "0h";

        const totalSeconds = Math.round(hours * 3600);
        const d = Math.floor(totalSeconds / 86400);
        const h = Math.floor((totalSeconds % 86400) / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        if (d > 0) {
            const parts = [`${d}d`];
            if (h > 0) parts.push(`${h}h`);
            if (m > 0) parts.push(`${m}m`);
            if (s > 0) parts.push(`${s}s`);
            return parts.join(' ');
        } else if (h > 0) {
            return m > 0 ? `${h}h ${m}m` : `${h}h`;
        } else if (m > 0) {
            return `${m}m`;
        } else {
            return `${s}s`;
        }
    };

    const formatMetric = (metric, value, video) => {
        if (metric === 'source') {
            return getSourceBadge(video);
        }

        if (metric === 'averageViewPercentage' || metric === 'impressionsCtr') {
            return formatPercent(value);
        } else if (metric === 'averageViewDuration') {
            return formatTime(value);
        } else if (metric === 'watchTimeHours') {
            return formatWatchTime(value);
        } else {
            return formatNumber(value);
        }
    };

    const getSourceBadge = (video) => {
        if (!video || !videosData.videos[video.id]) return null;
        
        return isYouTubeVideo(video) ? (
            <span className="source-badge youtube">YOUTUBE</span>
        ) : (
            <span className="source-badge vimeo">VIMEO</span>
        );
    };

    const exportToCSV = () => {
        const header = ['Title', ...displayMetrics.map(metric => metric === 'source' ? 'Source' : metricDisplayNames[metric])];
        const rows = filteredData.map(item => {
            const source = isYouTubeVideo(item) ? 'YouTube' : 'Vimeo';
            return [
                item.title,
                ...displayMetrics.map(metric => {
                    if (metric === 'source') {
                        return source;
                    }
                    if (metric === 'impressionsCtr') {
                        return item[metric]?.toFixed(2) || '0';
                    }
                    return item[metric];
                })
            ];
        });

        const csvContent = [header, ...rows]
            .map(row => row.map(field =>
                `"${String(field || '').replace(/"/g, '""')}"`
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

    const maxPageButtons = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    const endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

    const aggregateMetrics = calculateAggregateMetrics();

    return (
        <div className="video-metrics-container">
            <div className="page-header">
                <h1>Video Metrics</h1>
                <div className="search-container">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search"
                        value={search}
                        onChange={handleSearchChange}
                    />
                </div>
            </div>

            <div className="video-metrics-summary">
                <div className="metric-summary-card">
                    <div className="metric-summary-label">Total Impressions</div>
                    <div className="metric-summary-value">{formatNumber(aggregateMetrics.totalImpressions)}</div>
                </div>
                <div className="metric-summary-card">
                    <div className="metric-summary-label">Total Watch Time</div>
                    <div className="metric-summary-value">{formatWatchTime(aggregateMetrics.totalWatchTime)}</div>
                </div>
                <div className="metric-summary-card">
                    <div className="metric-summary-label">Avg % Viewed</div>
                    <div className="metric-summary-value">{formatPercent(aggregateMetrics.avgPercentViewed)}</div>
                </div>
                <div className="metric-summary-card">
                    <div className="metric-summary-label">Impressions CTR</div>
                    <div className="metric-summary-value">{formatPercent(aggregateMetrics.impressionsCtr)}</div>
                </div>
            </div>

            <div className="table-section">
                <div className="table-controls">
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

                <table className="video-metrics-table">
                    <thead>
                        <tr>
                            <th className="title-column">Title</th>
                            {displayMetrics.map((metric) => (
                                <th
                                    key={metric}
                                    className={`${metric === 'source' ? 'source-column' : 'metric-column'} sortable`}
                                    onClick={() => handleSort(metric)}
                                >
                                    {metric === 'source' ? 'Source' : metricDisplayNames[metric]}
                                    {sortColumn === metric && (
                                        <span className="sort-indicator">{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {currentRows.map((item, index) => (
                            <tr key={index}>
                                <td
                                    className="title-column journal-title"
                                    onClick={() => openVideoModal(item)}
                                >
                                    {item.title}
                                </td>
                                {displayMetrics.map((metric) => (
                                    <td key={metric} className={metric === 'source' ? 'source-column' : 'metric-column'}>
                                        {formatMetric(metric, item[metric], item)}
                                    </td>
                                ))}
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