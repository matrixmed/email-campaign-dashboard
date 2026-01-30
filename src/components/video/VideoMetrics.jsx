import React, { useState, useEffect } from 'react';
import VideoModal from './VideoModal';
import '../../styles/video.css';
import { matchesSearchTerm } from '../../utils/searchUtils';
import { useSearch } from '../../context/SearchContext';

const VideoMetrics = () => {
    const { searchTerms, setSearchTerm: setGlobalSearchTerm } = useSearch();
    const [videoSource, setVideoSource] = useState('youtube');
    const [youtubeData, setYoutubeData] = useState({ videos: {}, playlists: {} });
    const [vimeoData, setVimeoData] = useState({ videos: [] });
    const [videosList, setVideosList] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [search, setSearch] = useState(searchTerms.videoMetrics || '');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [sortColumn, setSortColumn] = useState('views');
    const [sortDirection, setSortDirection] = useState('desc');
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState('all');
    const [selectedPlaylists, setSelectedPlaylists] = useState([]);

    const togglePlaylist = (playlistId) => {
        setSelectedPlaylists(prev =>
            prev.includes(playlistId) ? prev.filter(p => p !== playlistId) : [...prev, playlistId]
        );
    };

    const YOUTUBE_BLOB_URL = "https://emaildash.blob.core.windows.net/json-data/youtube_metrics.json?sp=r&st=2026-01-23T22:10:53Z&se=2028-02-03T06:25:53Z&spr=https&sv=2024-11-04&sr=b&sig=5a4p0mFtPn4d9In830LMCQOJlaqkcuPCt7okIDLSHBA%3D";
    const VIMEO_BLOB_URL = "https://emaildash.blob.core.windows.net/json-data/vimeo_metrics.json?sp=r&st=2026-01-16T21:10:17Z&se=2028-06-21T04:25:17Z&spr=https&sv=2024-11-04&sr=b&sig=KxSCICZ7CgOWv07ct%2Bv2ZViTuZoNtdd5osIS5PgfKa8%3D";

    useEffect(() => {
        async function fetchVideoData() {
            setIsLoading(true);
            const cacheBuster = `&_t=${Date.now()}`;

            try {
                const ytResponse = await fetch(YOUTUBE_BLOB_URL + cacheBuster);
                if (ytResponse.ok) {
                    const ytData = await ytResponse.json();
                    setYoutubeData(ytData);
                }
            } catch (error) {
            }

            try {
                const vimeoResponse = await fetch(VIMEO_BLOB_URL + cacheBuster);
                if (vimeoResponse.ok) {
                    const vimeoJsonData = await vimeoResponse.json();
                    setVimeoData(vimeoJsonData);
                }
            } catch (error) {
            }

            setIsLoading(false);
        }
        fetchVideoData();
    }, []);

    useEffect(() => {
        const sourceData = videoSource === 'youtube' ? youtubeData : vimeoData;
        let videosArray = [];

        if (videoSource === 'youtube') {
            const videosObj = sourceData.videos || {};
            videosArray = Object.entries(videosObj).map(([videoId, video]) => {
                const current = video.current || {};
                const views = current.views || 0;
                const impressions = current.impressions || 0;
                const ctr = impressions > 0 ? (views / impressions * 100) : 0;
                const watchTimeHours = current.watchTimeHours || (current.estimatedMinutesWatched || 0) / 60;
                const totalWatchTimeSeconds = watchTimeHours * 3600;
                const avgPercentWatched = current.averageViewPercentage || 0;

                return {
                    id: videoId,
                    title: video.title || 'Untitled',
                    views,
                    impressions,
                    ctr,
                    avgPercentWatched,
                    totalWatchTimeSeconds,
                    history: video.history || {},
                    publishedAt: video.publishedAt,
                    thumbnail: video.thumbnail,
                    duration: video.duration,
                    durationFormatted: video.durationFormatted,
                    tags: video.tags || [],
                    playlists: video.playlists || [],
                    breakdowns: video.breakdowns || {},
                    current: current
                };
            });
        } else {
            videosArray = (sourceData.videos || []).map(video => {
                const current = video.current || {};
                const views = current.views || 0;
                const impressions = current.impressions || 0;
                const ctr = impressions > 0 ? (views / impressions * 100) : 0;

                return {
                    id: video.video_id,
                    title: video.title || 'Untitled',
                    views,
                    impressions,
                    ctr,
                    avgPercentWatched: current.mean_percent_watched || 0,
                    totalWatchTimeSeconds: current.total_seconds_watched || 0,
                    history: video.history || [],
                    publishedAt: video.created_time || video.release_time,
                    thumbnail: video.thumbnail,
                    duration: video.duration,
                    breakdowns: {},
                    current: current
                };
            });
        }

        const sortedVideos = videosArray.sort((a, b) => (b.views || 0) - (a.views || 0));
        setVideosList(sortedVideos);

        let filtered = sortedVideos;

        if (viewMode === 'playlist' && selectedPlaylists.length > 0 && videoSource === 'youtube') {
            const allPlaylistVideoIds = new Set();
            selectedPlaylists.forEach(playlistId => {
                const playlist = youtubeData.playlists?.[playlistId];
                if (playlist && playlist.videoIds) {
                    playlist.videoIds.forEach(id => allPlaylistVideoIds.add(id));
                }
            });
            filtered = filtered.filter(v => allPlaylistVideoIds.has(v.id));
        }

        if (search) {
            filtered = filtered.filter(item => matchesSearchTerm(item.title || '', search));
        }

        setFilteredData(filtered);
        setCurrentPage(1);
    }, [videoSource, youtubeData, vimeoData, search, viewMode, selectedPlaylists]);

    const handleSearchChange = (e) => {
        const searchValue = e.target.value;
        setSearch(searchValue);
        setGlobalSearchTerm('videoMetrics', searchValue);
        const filtered = videosList.filter(item => {
            return matchesSearchTerm(item.title || '', searchValue);
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
            const aVal = a[column] || 0;
            const bVal = b[column] || 0;

            if (newDirection === 'asc') {
                return aVal - bVal;
            } else {
                return bVal - aVal;
            }
        });

        setFilteredData(sorted);
    };

    const calculateAggregateMetrics = () => {
        if (!filteredData || filteredData.length === 0) {
            return {
                totalViews: 0,
                avgPercentWatched: 0,
                totalWatchTimeSeconds: 0,
                totalLikes: 0,
                totalComments: 0,
                totalShares: 0,
                netSubscribers: 0
            };
        }

        const totalViews = filteredData.reduce((sum, v) => sum + (v.views || 0), 0);
        const totalImpressions = filteredData.reduce((sum, v) => sum + (v.impressions || 0), 0);
        const avgPercentWatched = totalViews > 0
            ? filteredData.reduce((sum, v) => sum + ((v.avgPercentWatched || 0) * (v.views || 0)), 0) / totalViews
            : 0;
        const totalWatchTimeSeconds = filteredData.reduce((sum, v) => sum + (v.totalWatchTimeSeconds || 0), 0);
        const totalLikes = filteredData.reduce((sum, v) => sum + (v.current?.likes || 0), 0);
        const totalComments = filteredData.reduce((sum, v) => sum + (v.current?.comments || 0), 0);
        const totalShares = filteredData.reduce((sum, v) => sum + (v.current?.shares || 0), 0);
        const netSubscribers = filteredData.reduce((sum, v) => sum + (v.current?.netSubscribers || 0), 0);

        return {
            totalViews,
            totalImpressions,
            avgPercentWatched,
            totalWatchTimeSeconds,
            totalLikes,
            totalComments,
            totalShares,
            netSubscribers
        };
    };

    const getPlaylists = () => {
        if (videoSource !== 'youtube') return [];
        const playlists = youtubeData.playlists || {};
        return Object.entries(playlists).map(([id, pl]) => ({
            id,
            title: pl.title,
            itemCount: pl.itemCount,
            videoIds: pl.videoIds || []
        })).sort((a, b) => b.itemCount - a.itemCount);
    };

    const handleRowsPerPageChange = (e) => {
        setRowsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    const handlePagination = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const openVideoModal = (video) => {
        setSelectedVideo(video);
        setIsModalOpen(true);
    };

    const closeVideoModal = () => {
        setIsModalOpen(false);
    };

    const formatNumber = (num) => {
        if (num === undefined || isNaN(num)) return "0";
        return num.toLocaleString();
    };

    const formatPercent = (value) => {
        if (value === undefined || isNaN(value)) return "0%";
        return value.toFixed(1) + '%';
    };

    const formatWatchTime = (seconds) => {
        if (seconds === undefined || isNaN(seconds) || seconds === 0) return "0s";

        const d = Math.floor(seconds / 86400);
        const h = Math.floor((seconds % 86400) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        if (d > 0) {
            const parts = [`${d}d`];
            if (h > 0) parts.push(`${h}h`);
            if (m > 0) parts.push(`${m}m`);
            return parts.join(' ');
        } else if (h > 0) {
            return m > 0 ? `${h}h ${m}m` : `${h}h`;
        } else if (m > 0) {
            return `${m}m ${s}s`;
        } else {
            return `${s}s`;
        }
    };

    const formatWatchTimeMs = (ms) => {
        if (ms === undefined || isNaN(ms) || ms === 0) return "0s";
        return formatWatchTime(ms / 1000);
    };

    const exportToCSV = () => {
        const headers = ['Title', 'Views', 'Avg % Watched', 'Total Watch Time'];

        const rows = filteredData.map(item => [
            item.title,
            item.views,
            item.avgPercentWatched?.toFixed(2) || '0',
            formatWatchTime(item.totalWatchTimeSeconds)
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field =>
                `"${String(field || '').replace(/"/g, '""')}"`
            ).join(","))
            .join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${videoSource}_metrics_data.csv`);
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

            <div className="data-source-toggle">
                <div
                    className={`data-source-option ${videoSource === 'youtube' ? 'active' : ''}`}
                    onClick={() => { setVideoSource('youtube'); setCurrentPage(1); setViewMode('all'); setSelectedPlaylists([]); }}
                >
                    YouTube
                </div>
                <div
                    className={`data-source-option ${videoSource === 'vimeo' ? 'active' : ''}`}
                    onClick={() => { setVideoSource('vimeo'); setCurrentPage(1); setViewMode('all'); setSelectedPlaylists([]); }}
                >
                    Vimeo
                </div>
            </div>

            <div className="video-metrics-summary">
                <div className="metric-summary-card">
                    <div className="metric-summary-label">Total Views</div>
                    <div className="metric-summary-value">{formatNumber(aggregateMetrics.totalViews)}</div>
                </div>
                {videoSource === 'vimeo' && (
                    <div className="metric-summary-card">
                        <div className="metric-summary-label">Total Impressions</div>
                        <div className="metric-summary-value">{formatNumber(aggregateMetrics.totalImpressions)}</div>
                    </div>
                )}
                <div className="metric-summary-card">
                    <div className="metric-summary-label">Avg % Watched</div>
                    <div className="metric-summary-value">{formatPercent(aggregateMetrics.avgPercentWatched)}</div>
                </div>
                <div className="metric-summary-card">
                    <div className="metric-summary-label">Total Watch Time</div>
                    <div className="metric-summary-value">{formatWatchTime(aggregateMetrics.totalWatchTimeSeconds)}</div>
                </div>
            </div>

            {isLoading ? (
                <div className="loading-indicator">Loading video data...</div>
            ) : (
                <div className="table-section">
                    <div className="table-header-row">
                        <h2 className="table-title">{videoSource === 'youtube' ? 'YouTube Metrics' : 'Vimeo Metrics'}</h2>
                        <div className="table-header-controls">
                            <div className="rows-per-page-control">
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
                            {videoSource === 'youtube' && getPlaylists().length > 0 && (
                                <div className="playlist-toggle">
                                    <div
                                        className={`playlist-toggle-option ${viewMode === 'all' ? 'active' : ''}`}
                                        onClick={() => { setViewMode('all'); setSelectedPlaylists([]); }}
                                    >
                                        All Videos ({videosList.length})
                                    </div>
                                    <div
                                        className={`playlist-toggle-option ${viewMode === 'playlist' ? 'active' : ''}`}
                                        onClick={() => setViewMode('playlist')}
                                    >
                                        By Playlist
                                    </div>
                                </div>
                            )}
                            {(videoSource === 'youtube' ? (youtubeData.lastUpdated || youtubeData.last_updated) : vimeoData.last_updated) && (
                                <div className="last-updated-tag">
                                    Last Updated: {new Date(videoSource === 'youtube' ? (youtubeData.lastUpdated || youtubeData.last_updated) : vimeoData.last_updated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                            )}
                            
                        </div>
                    </div>

                    {viewMode === 'playlist' && videoSource === 'youtube' && (
                        <div className="playlist-selector">
                            {getPlaylists().map(pl => (
                                <div
                                    key={pl.id}
                                    className={`playlist-selector-item ${selectedPlaylists.includes(pl.id) ? 'active' : ''}`}
                                    onClick={() => togglePlaylist(pl.id)}
                                >
                                    <span className="playlist-selector-title">{pl.title}</span>
                                    <span className="playlist-selector-count">{pl.itemCount}</span>
                                </div>
                            ))}
                            {selectedPlaylists.length > 0 && (
                                <div
                                    className="playlist-selector-item clear-all"
                                    onClick={() => setSelectedPlaylists([])}
                                >
                                    Clear All
                                </div>
                            )}
                        </div>
                    )}

                    <table className="video-metrics-table">
                        <thead>
                            <tr>
                                <th className="title-column">Title</th>
                                {videoSource === 'youtube' && (
                                    <th className="playlist-column">Playlist</th>
                                )}
                                <th className="metric-column sortable" onClick={() => handleSort('views')}>
                                    Views {sortColumn === 'views' && <span className="sort-indicator">{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
                                </th>
                                {videoSource === 'vimeo' && (
                                    <th className="metric-column sortable" onClick={() => handleSort('impressions')}>
                                        Impressions {sortColumn === 'impressions' && <span className="sort-indicator">{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
                                    </th>
                                )}
                                {videoSource === 'vimeo' && (
                                    <th className="metric-column sortable" onClick={() => handleSort('ctr')}>
                                        CTR {sortColumn === 'ctr' && <span className="sort-indicator">{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
                                    </th>
                                )}
                                <th className="metric-column sortable" onClick={() => handleSort('avgPercentWatched')}>
                                    Avg % Watched {sortColumn === 'avgPercentWatched' && <span className="sort-indicator">{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
                                </th>
                                <th className="metric-column sortable" onClick={() => handleSort('totalWatchTimeSeconds')}>
                                    Total Watch Time {sortColumn === 'totalWatchTimeSeconds' && <span className="sort-indicator">{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentRows.map((item, index) => (
                                <tr key={item.id || index}>
                                    <td
                                        className="title-column journal-title"
                                        onClick={() => openVideoModal(item)}
                                    >
                                        <div className="video-title-cell">
                                            <span className="video-title-text">{item.title}</span>
                                        </div>
                                    </td>
                                    {videoSource === 'youtube' && (
                                        <td className="playlist-column">
                                            {item.playlists && item.playlists.length > 0 && (
                                                <div className="video-playlist-badges">
                                                    {item.playlists.slice(0, 2).map((pl, i) => (
                                                        <span key={i} className="playlist-badge">{pl.title}</span>
                                                    ))}
                                                    {item.playlists.length > 2 && (
                                                        <span className="playlist-badge more">+{item.playlists.length - 2}</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    )}
                                    <td className="metric-column">{formatNumber(item.views)}</td>
                                    {videoSource === 'vimeo' && <td className="metric-column">{formatNumber(item.impressions)}</td>}
                                    {videoSource === 'vimeo' && <td className="metric-column">{formatPercent(item.ctr)}</td>}
                                    <td className="metric-column">{formatPercent(item.avgPercentWatched)}</td>
                                    <td className="metric-column">{formatWatchTime(item.totalWatchTimeSeconds)}</td>
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
            )}

            {isModalOpen && selectedVideo && (
                <VideoModal
                    video={selectedVideo}
                    onClose={closeVideoModal}
                    videoSource={videoSource}
                />
            )}
        </div>
    );
};

export default VideoMetrics;