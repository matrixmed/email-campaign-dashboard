import React, { useState, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import '../../styles/video.css';

const VideoModal = ({ video, onClose, videoSource }) => {
    const [timeframeFilter, setTimeframeFilter] = useState('all');
    const [displayMetrics, setDisplayMetrics] = useState({});
    const modalRef = useRef(null);
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
    const [showCustomPicker, setShowCustomPicker] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    const isYoutubeVideo = videoSource === 'youtube';
    const breakdowns = video.breakdowns || {};

    const hasHistory = video.history && (Array.isArray(video.history) ? video.history.length > 0 : Object.keys(video.history).length > 0);

    useEffect(() => {
        const allTimeMetrics = {
            views: video.views || 0,
            impressions: video.impressions || 0,
            watchTimeHours: (video.totalWatchTimeSeconds || 0) / 3600,
            averageViewPercentage: video.avgPercentWatched || 0,
            impressionsCtr: video.ctr || 0
        };

        if (timeframeFilter === 'all') {
            setDisplayMetrics(allTimeMetrics);
        } else if (hasHistory) {
            const timeframeData = getTimeframeData();

            if (timeframeData.length === 0) {
                setDisplayMetrics(allTimeMetrics);
                return;
            }

            const views = timeframeData.reduce((sum, day) => sum + (day.views || 0), 0);
            const impressions = timeframeData.reduce((sum, day) => sum + (day.impressions || 0), 0);
            const watchTimeHours = timeframeData.reduce((sum, day) => sum + (day.watchTimeHours || 0), 0);

            const avgViewPercentage = views > 0
                ? timeframeData.reduce((sum, day) => sum + ((day.averageViewPercentage || 0) * (day.views || 0)), 0) / views
                : 0;

            const impressionsCtr = impressions > 0 ? (views / impressions * 100) : 0;

            setDisplayMetrics({
                views,
                impressions,
                watchTimeHours,
                averageViewPercentage: avgViewPercentage,
                impressionsCtr
            });
        } else {
            setDisplayMetrics(allTimeMetrics);
        }
    }, [timeframeFilter, video, customDateRange, hasHistory]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);


    const handleTimeframeChange = (e) => {
        const value = e.target.value;
        setTimeframeFilter(value);
        setShowCustomPicker(value === 'custom');
    };

    const formatDate = (isoString) => {
        if (!isoString) return "Unknown";
        let date;
        if (typeof isoString === 'string' && isoString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = isoString.split('-').map(Number);
            date = new Date(year, month - 1, day);
        } else {
            date = new Date(isoString);
        }
        if (isNaN(date.getTime()) || date.getFullYear() < 2000) return "Unknown";
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatNumber = (num) => {
        if (num === undefined || isNaN(num)) return "0";
        return num.toLocaleString();
    };

    const formatPercent = (value) => {
        if (value === undefined || isNaN(value)) return "0%";
        return value.toFixed(2) + '%';
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

    const getTimeframeData = () => {
        if (!video.history) return [];

        let historyArray;

        if (Array.isArray(video.history)) {
            historyArray = video.history.map(item => ({
                date: item.date,
                views: item.views || 0,
                watchTimeHours: (item.total_seconds_watched || item.estimatedMinutesWatched * 60 || 0) / 3600,
                estimatedMinutesWatched: item.estimatedMinutesWatched || 0,
                averageViewDuration: item.avg_seconds_watched || item.averageViewDuration || 0,
                averageViewPercentage: item.mean_percent_watched || item.avg_percent_watched || item.averageViewPercentage || 0,
                subscribersGained: item.subscribersGained || 0,
                subscribersLost: item.subscribersLost || 0,
                likes: item.likes || 0,
                comments: item.comments || 0,
                shares: item.shares || 0
            }));
        } else {
            historyArray = Object.entries(video.history).map(([date, data]) => {
                const d = data.totals || data;
                return {
                    date,
                    views: d.views || 0,
                    watchTimeHours: (d.estimatedMinutesWatched || 0) / 60,
                    estimatedMinutesWatched: d.estimatedMinutesWatched || 0,
                    averageViewDuration: d.averageViewDuration || 0,
                    averageViewPercentage: d.averageViewPercentage || 0,
                    subscribersGained: d.subscribersGained || 0,
                    subscribersLost: d.subscribersLost || 0,
                    likes: d.likes || 0,
                    comments: d.comments || 0,
                    shares: d.shares || 0
                };
            });
        }

        historyArray = historyArray.filter(item => {
            if (!item.date || typeof item.date !== 'string') return false;
            if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return false;
            const year = parseInt(item.date.split('-')[0], 10);
            return year >= 2020;
        });

        historyArray.sort((a, b) => a.date.localeCompare(b.date));

        if (historyArray.length === 0) return [];

        if (timeframeFilter === 'all') {
            return getAggregatedData(historyArray);
        } else if (timeframeFilter === 'custom') {
            if (!customDateRange.start || !customDateRange.end) return historyArray;
            const startDate = new Date(customDateRange.start);
            const endDate = new Date(customDateRange.end);
            return fillMissingDates(historyArray.filter(item => {
                const itemDate = new Date(item.date);
                return itemDate >= startDate && itemDate <= endDate;
            }), startDate, endDate);
        } else {
            const daysToShow = parseInt(timeframeFilter, 10);
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - daysToShow + 1);

            return fillMissingDates(historyArray, startDate, endDate);
        }
    };
    
    const getAggregatedData = (dataArray) => {
        if (dataArray.length === 0) return [];
        
        const dates = dataArray.map(item => new Date(item.date));
        const startDate = new Date(Math.min(...dates));
        const endDate = new Date(Math.max(...dates));
        const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= 60) {
            return fillMissingDates(dataArray, startDate, endDate);
        } else if (daysDiff <= 365) {
            return aggregateByWeeks(dataArray, startDate, endDate);
        } else {
            return aggregateByMonths(dataArray, startDate, endDate);
        }
    };
    
    const aggregateByWeeks = (dataArray, startDate, endDate) => {
        const weeklyData = {};
        const dateMap = {};
        
        dataArray.forEach(item => {
            dateMap[item.date] = item;
        });
        
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const weekStart = new Date(currentDate);
            weekStart.setDate(currentDate.getDate() - currentDate.getDay());
            const weekKey = weekStart.toISOString().split('T')[0];
            
            if (!weeklyData[weekKey]) {
                weeklyData[weekKey] = {
                    date: weekKey,
                    views: 0,
                    watchTimeHours: 0,
                    averageViewDuration: 0,
                    averageViewPercentage: 0,
                    subscribersGained: 0,
                    subscribersLost: 0,
                    totalDays: 0
                };
            }
            
            const dateString = currentDate.toISOString().split('T')[0];
            if (dateMap[dateString]) {
                const dayData = dateMap[dateString];
                weeklyData[weekKey].views += dayData.views || 0;
                weeklyData[weekKey].watchTimeHours += dayData.watchTimeHours || 0;
                weeklyData[weekKey].subscribersGained += dayData.subscribersGained || 0;
                weeklyData[weekKey].subscribersLost += dayData.subscribersLost || 0;
                
                if (dayData.views > 0) {
                    weeklyData[weekKey].averageViewDuration += (dayData.averageViewDuration || 0) * dayData.views;
                    weeklyData[weekKey].averageViewPercentage += (dayData.averageViewPercentage || 0) * dayData.views;
                }
                weeklyData[weekKey].totalDays++;
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return Object.values(weeklyData).map(week => ({
            ...week,
            averageViewDuration: week.views > 0 ? week.averageViewDuration / week.views : 0,
            averageViewPercentage: week.views > 0 ? week.averageViewPercentage / week.views : 0
        })).sort((a, b) => a.date.localeCompare(b.date));
    };
    
    const aggregateByMonths = (dataArray, startDate, endDate) => {
        const monthlyData = {};
        const dateMap = {};
        
        dataArray.forEach(item => {
            dateMap[item.date] = item;
        });
        
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
            
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = {
                    date: monthKey,
                    views: 0,
                    watchTimeHours: 0,
                    averageViewDuration: 0,
                    averageViewPercentage: 0,
                    subscribersGained: 0,
                    subscribersLost: 0
                };
            }
            
            const dateString = currentDate.toISOString().split('T')[0];
            if (dateMap[dateString]) {
                const dayData = dateMap[dateString];
                monthlyData[monthKey].views += dayData.views || 0;
                monthlyData[monthKey].watchTimeHours += dayData.watchTimeHours || 0;
                monthlyData[monthKey].subscribersGained += dayData.subscribersGained || 0;
                monthlyData[monthKey].subscribersLost += dayData.subscribersLost || 0;
                
                if (dayData.views > 0) {
                    monthlyData[monthKey].averageViewDuration += (dayData.averageViewDuration || 0) * dayData.views;
                    monthlyData[monthKey].averageViewPercentage += (dayData.averageViewPercentage || 0) * dayData.views;
                }
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return Object.values(monthlyData).map(month => ({
            ...month,
            averageViewDuration: month.views > 0 ? month.averageViewDuration / month.views : 0,
            averageViewPercentage: month.views > 0 ? month.averageViewPercentage / month.views : 0
        })).sort((a, b) => a.date.localeCompare(b.date));
    };
    
    const fillMissingDates = (dataArray, startDate, endDate) => {
        if (dataArray.length === 0) return [];
        
        const dateMap = {};
        dataArray.forEach(item => {
            dateMap[item.date] = item;
        });
        
        if (!startDate || !endDate) {
            const dates = dataArray.map(item => new Date(item.date));
            startDate = startDate || new Date(Math.min(...dates));
            endDate = endDate || new Date(Math.max(...dates));
        }
        
        const result = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const dateString = currentDate.toISOString().split('T')[0];
            
            if (dateMap[dateString]) {
                result.push(dateMap[dateString]);
            } else {
                result.push({
                    date: dateString,
                    views: 0,
                    watchTimeHours: 0,
                    averageViewDuration: 0,
                    averageViewPercentage: 0,
                    subscribersGained: 0,
                    subscribersLost: 0
                });
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return result;
    };

    const getTrafficSourceData = () => {
        if (!video.history) return [];
        
        const aggregatedSources = {};
        
        Object.values(video.history).forEach(dayData => {
            if (dayData.byTraffic) {
                Object.entries(dayData.byTraffic).forEach(([sourceType, data]) => {
                    aggregatedSources[sourceType] = (aggregatedSources[sourceType] || 0) + (data.views || 0);
                });
            }
        });
        
        const sourceNames = {
            "5": "YouTube Search",
            "7": "Suggested Videos",
            "9": "External",
            "4": "Channel Page",
            "3": "Browse Features",
            "1": "Advertising",
            "17": "Notifications",
            "20": "Playlists"
        };
        
        return Object.entries(aggregatedSources)
            .map(([sourceType, views]) => ({
                source: sourceNames[sourceType] || `Source ${sourceType}`,
                views,
                value: views
            }))
            .sort((a, b) => b.views - a.views);
    };

    const getLocationData = () => {
        if (!video.history) return [];
        
        const aggregatedLocations = {};
        
        Object.values(video.history).forEach(dayData => {
            if (dayData.byLocation) {
                Object.entries(dayData.byLocation).forEach(([locationType, data]) => {
                    aggregatedLocations[locationType] = (aggregatedLocations[locationType] || 0) + (data.views || 0);
                });
            }
        });
        
        const locationNames = {
            "0": "Watch Page",
            "1": "Embedded Player",
            "7": "Browse Feed",
            "8": "YouTube Search",
            "10": "Shorts"
        };
        
        return Object.entries(aggregatedLocations)
            .map(([locationType, views]) => ({
                location: locationNames[locationType] || `Location ${locationType}`,
                views,
                value: views 
            }))
            .sort((a, b) => b.views - a.views);
    };

    const timeframeData = getTimeframeData();
    const trafficSourceData = getTrafficSourceData();
    const locationData = getLocationData();

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

    const hasData = timeframeData.length > 0;
    
    const getThumbnailUrl = () => {
        if (video.thumbnail) {
            return video.thumbnail;
        }

        if (!isYoutubeVideo && video.id) {
            return `https://vumbnail.com/${video.id}.jpg`;
        }

        if (isYoutubeVideo && video.id) {
            return `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
        }

        return 'https://placehold.co/320x180?text=No+Thumbnail';
    };

    const getVideoUrl = () => {
        if (!isYoutubeVideo) {
            return `https://vimeo.com/${video.id}`;
        }
        return `https://www.youtube.com/watch?v=${video.id}`;
    };

    const formatDurationFromSeconds = (seconds) => {
        if (!seconds || isNaN(seconds)) return null;
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;

        if (hours > 0) {
            return `${hours}:${remainingMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="video-modal-overlay">
            <div className="video-modal" ref={modalRef}>
                <div className="video-modal-header">
                    <h3>{video.title}</h3>
                    <button 
                        className="modal-close-button"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>
                
                <div className="video-preview-container">
                    <div className="video-thumbnail-preview">
                        <img
                            src={getThumbnailUrl()}
                            alt={video.title}
                        />
                        {video.duration && (
                            <div className="video-duration">
                                {formatDurationFromSeconds(video.duration)}
                            </div>
                        )}
                    </div>
                    <div className="video-details">
                        <div className="video-details-row">
                            <span className="detail-label">Published:</span>
                            <span className="detail-value">{formatDate(video.publishedAt)}</span>
                        </div>
                        <div className="video-details-row">
                            <span className="detail-label">Video ID:</span>
                            <span className="detail-value">{video.id}</span>
                        </div>
                        <div className="video-details-row">
                            <span className="detail-label">URL:</span>
                            <a
                                href={getVideoUrl()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="video-url"
                            >
                                {isYoutubeVideo ? `youtube.com/watch?v=${video.id}` : `vimeo.com/${video.id}`}
                            </a>
                        </div>
                        {video.tags && video.tags.length > 0 && (
                            <div className="video-tags">
                                {video.tags.slice(0, 5).map((tag, index) => (
                                    <span key={index} className="video-tag">{tag}</span>
                                ))}
                                {video.tags.length > 5 && (
                                    <span className="more-tags">+{video.tags.length - 5} more</span>
                                )}
                            </div>
                        )}
                    </div>
                    {isYoutubeVideo && video.current && (
                        <div className="video-engagement-stats">
                            <div className="engagement-stat">
                                <span className="engagement-label">Likes</span>
                                <span className="engagement-value">{formatNumber(video.current.likes || 0)}</span>
                            </div>
                            <div className="engagement-stat">
                                <span className="engagement-label">Comments</span>
                                <span className="engagement-value">{formatNumber(video.current.comments || 0)}</span>
                            </div>
                            <div className="engagement-stat">
                                <span className="engagement-label">Shares</span>
                                <span className="engagement-value">{formatNumber(video.current.shares || 0)}</span>
                            </div>
                            <div className="engagement-stat">
                                <span className="engagement-label">Net Subs</span>
                                <span className="engagement-value" style={{ color: (video.current.netSubscribers || 0) >= 0 ? '#0f0' : '#f00' }}>
                                    {(video.current.netSubscribers || 0) >= 0 ? '+' : ''}{formatNumber(video.current.netSubscribers || 0)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="video-modal-metrics">
                    <div className="metrics-top-row">
                        {!isYoutubeVideo && (
                            <div className="metric-card large-card">
                                <div className="metric-label">Impressions</div>
                                <div className="metric-value">{formatNumber(displayMetrics.impressions)}</div>
                            </div>
                        )}
                        <div className="metric-card large-card">
                            <div className="metric-label">Views</div>
                            <div className="metric-value">{formatNumber(displayMetrics.views)}</div>
                        </div>
                        {!isYoutubeVideo && (
                            <div className="metric-card large-card">
                                <div className="metric-label">Impressions CTR</div>
                                <div className="metric-value">{formatPercent(displayMetrics.impressions > 0 ? (displayMetrics.views / displayMetrics.impressions * 100) : 0)}</div>
                            </div>
                        )}
                        <div className="metric-card large-card">
                            <div className="metric-label">Avg. % Watched</div>
                            <div className="metric-value">{formatPercent(displayMetrics.averageViewPercentage)}</div>
                        </div>
                        <div className="metric-card large-card">
                            <div className="metric-label">Total Time Watched</div>
                            <div className="metric-value">{formatWatchTime(displayMetrics.watchTimeHours)}</div>
                        </div>
                    </div>
                </div>

                {isYoutubeVideo && Object.keys(breakdowns).length > 0 && (
                    <div className="modal-tabs">
                        <div className={`modal-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</div>
                        <div className={`modal-tab ${activeTab === 'traffic' ? 'active' : ''}`} onClick={() => setActiveTab('traffic')}>Traffic Sources</div>
                        <div className={`modal-tab ${activeTab === 'geography' ? 'active' : ''}`} onClick={() => setActiveTab('geography')}>Geography</div>
                        <div className={`modal-tab ${activeTab === 'audience' ? 'active' : ''}`} onClick={() => setActiveTab('audience')}>Audience</div>
                    </div>
                )}

                {hasData && (
                    <div className="video-modal-controls">
                        <div className="timeframe-filter">
                            <label htmlFor="videoTimeframeFilter">Timeframe:</label>
                            <select
                                id="videoTimeframeFilter"
                                value={timeframeFilter}
                                onChange={handleTimeframeChange}
                            >
                                <option value="1">Last 24 Hours</option>
                                <option value="7">Last 7 Days</option>
                                <option value="14">Last 14 Days</option>
                                <option value="30">Last 30 Days</option>
                                <option value="90">Last 3 Months</option>
                                <option value="180">Last 6 Months</option>
                                <option value="365">Last Year</option>
                                <option value="730">Last 2 Years</option>
                                <option value="all">All Time</option>
                                <option value="custom">Custom Range</option>
                            </select>
                            {showCustomPicker && (
                                <div className="custom-date-picker">
                                    <input
                                        type="date"
                                        value={customDateRange.start}
                                        onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                                        placeholder="Start Date"
                                    />
                                    <span>to</span>
                                    <input
                                        type="date"
                                        value={customDateRange.end}
                                        onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                                        placeholder="End Date"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {(activeTab === 'overview' || !isYoutubeVideo) && (
                    <>
                        {hasData ? (
                            <>
                                <div className="video-modal-charts">
                                    <div className="views-chart-container">
                                        <h4>Views Over Time</h4>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <LineChart
                                                data={timeframeData}
                                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    tickFormatter={(date) => {
                                                        const d = new Date(date);
                                                        if (timeframeFilter === 'all') {
                                                            const daysDiff = timeframeData.length > 0
                                                                ? Math.ceil((new Date(timeframeData[timeframeData.length - 1].date) - new Date(timeframeData[0].date)) / (1000 * 60 * 60 * 24))
                                                                : 0;

                                                            if (daysDiff > 365) {
                                                                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                                                            } else if (daysDiff > 60) {
                                                                return `${d.getMonth() + 1}/${d.getDate()}`;
                                                            }
                                                        }
                                                        return `${d.getMonth()+1}/${d.getDate()}`;
                                                    }}
                                                />
                                                <YAxis allowDecimals={false} />
                                                <Tooltip
                                                    formatter={(value, name) => [formatNumber(value), name]}
                                                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                                                />
                                                <Legend />
                                                <Line
                                                    type="monotone"
                                                    dataKey="views"
                                                    stroke="#0ff"
                                                    name="Views"
                                                    strokeWidth={2}
                                                    activeDot={{ r: 6 }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="video-modal-daily">
                                    <h4>Daily Performance</h4>
                                    <div className="daily-table-container">
                                        <table className="detail-table daily-table">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Views</th>
                                                    <th>Watch Time</th>
                                                    <th>Avg Duration %</th>
                                                    {isYoutubeVideo && <th>Likes</th>}
                                                    {isYoutubeVideo && <th>Subscribers +/-</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {timeframeData
                                                    .slice()
                                                    .reverse()
                                                    .map((data, index) => (
                                                        <tr key={index}>
                                                            <td>{formatDate(data.date)}</td>
                                                            <td>{formatNumber(data.views)}</td>
                                                            <td>{formatWatchTime(data.watchTimeHours || (data.estimatedMinutesWatched || 0) / 60)}</td>
                                                            <td>{formatPercent(data.averageViewPercentage)}</td>
                                                            {isYoutubeVideo && <td>{formatNumber(data.likes || 0)}</td>}
                                                            {isYoutubeVideo && (
                                                                <td>
                                                                    {data.subscribersGained || data.subscribersLost ? (
                                                                        <span className={
                                                                            ((data.subscribersGained || 0) - (data.subscribersLost || 0)) >= 0
                                                                            ? "positive-subs"
                                                                            : "negative-subs"
                                                                        }>
                                                                            {(data.subscribersGained || 0) - (data.subscribersLost || 0) > 0 ? '+' : ''}
                                                                            {(data.subscribersGained || 0) - (data.subscribersLost || 0)}
                                                                        </span>
                                                                    ) : '-'}
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="no-data-message">
                                <p>No historical data available for this video.</p>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'traffic' && isYoutubeVideo && (
                    <div className="breakdown-section">
                        <div className="breakdown-grid">
                            <div className="breakdown-card">
                                <h4>Traffic Sources</h4>
                                {breakdowns.trafficSources && Object.keys(breakdowns.trafficSources).length > 0 ? (
                                    <div className="breakdown-list">
                                        {Object.entries(breakdowns.trafficSources)
                                            .sort((a, b) => (b[1].views || 0) - (a[1].views || 0))
                                            .map(([source, data]) => (
                                                <div key={source} className="breakdown-item">
                                                    <span className="breakdown-name">{source}</span>
                                                    <span className="breakdown-value">{formatNumber(data.views || 0)} views</span>
                                                </div>
                                            ))}
                                    </div>
                                ) : (
                                    <p className="no-data-text">No traffic source data available</p>
                                )}
                            </div>

                            <div className="breakdown-card">
                                <h4>Playback Locations</h4>
                                {breakdowns.playbackLocations && Object.keys(breakdowns.playbackLocations).length > 0 ? (
                                    <div className="breakdown-list">
                                        {Object.entries(breakdowns.playbackLocations)
                                            .sort((a, b) => (b[1].views || 0) - (a[1].views || 0))
                                            .map(([location, data]) => (
                                                <div key={location} className="breakdown-item">
                                                    <span className="breakdown-name">{location}</span>
                                                    <span className="breakdown-value">{formatNumber(data.views || 0)} views</span>
                                                </div>
                                            ))}
                                    </div>
                                ) : (
                                    <p className="no-data-text">No playback location data available</p>
                                )}
                            </div>
                        </div>

                        {breakdowns.trafficDetails && (
                            <div className="breakdown-grid">
                                {breakdowns.trafficDetails.externalUrls && breakdowns.trafficDetails.externalUrls.length > 0 && (
                                    <div className="breakdown-card">
                                        <h4>Top External URLs</h4>
                                        <div className="breakdown-list">
                                            {breakdowns.trafficDetails.externalUrls.slice(0, 10).map((item, i) => (
                                                <div key={i} className="breakdown-item">
                                                    <span className="breakdown-name url">{item.url}</span>
                                                    <span className="breakdown-value">{formatNumber(item.views)} views</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {breakdowns.trafficDetails.searchTerms && breakdowns.trafficDetails.searchTerms.length > 0 && (
                                    <div className="breakdown-card">
                                        <h4>Top Search Terms</h4>
                                        <div className="breakdown-list">
                                            {breakdowns.trafficDetails.searchTerms.slice(0, 10).map((item, i) => (
                                                <div key={i} className="breakdown-item">
                                                    <span className="breakdown-name">{item.term}</span>
                                                    <span className="breakdown-value">{formatNumber(item.views)} views</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'geography' && isYoutubeVideo && (
                    <div className="breakdown-section">
                        <div className="breakdown-grid three-col">
                            <div className="breakdown-card">
                                <h4>Top Countries</h4>
                                {breakdowns.geography?.countries && Object.keys(breakdowns.geography.countries).length > 0 ? (
                                    <div className="breakdown-list">
                                        {Object.entries(breakdowns.geography.countries)
                                            .sort((a, b) => (b[1].views || 0) - (a[1].views || 0))
                                            .slice(0, 15)
                                            .map(([country, data]) => (
                                                <div key={country} className="breakdown-item">
                                                    <span className="breakdown-name">{country}</span>
                                                    <span className="breakdown-value">{formatNumber(data.views || 0)} views</span>
                                                </div>
                                            ))}
                                    </div>
                                ) : (
                                    <p className="no-data-text">No country data available</p>
                                )}
                            </div>

                            <div className="breakdown-card">
                                <h4>US States</h4>
                                {breakdowns.geography?.usStates && Object.keys(breakdowns.geography.usStates).length > 0 ? (
                                    <div className="breakdown-list">
                                        {Object.entries(breakdowns.geography.usStates)
                                            .sort((a, b) => (b[1].views || 0) - (a[1].views || 0))
                                            .slice(0, 15)
                                            .map(([state, data]) => (
                                                <div key={state} className="breakdown-item">
                                                    <span className="breakdown-name">{state.replace('US-', '')}</span>
                                                    <span className="breakdown-value">{formatNumber(data.views || 0)} views</span>
                                                </div>
                                            ))}
                                    </div>
                                ) : (
                                    <p className="no-data-text">No US state data available</p>
                                )}
                            </div>

                            <div className="breakdown-card">
                                <h4>Top Cities</h4>
                                {breakdowns.geography?.cities && breakdowns.geography.cities.length > 0 ? (
                                    <div className="breakdown-list">
                                        {breakdowns.geography.cities.slice(0, 15).map((item, i) => (
                                            <div key={i} className="breakdown-item">
                                                <span className="breakdown-name">{item.city}</span>
                                                <span className="breakdown-value">{formatNumber(item.views)} views</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="no-data-text">No city data available</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'audience' && isYoutubeVideo && (
                    <div className="breakdown-section">
                        <div className="breakdown-grid">
                            <div className="breakdown-card">
                                <h4>Devices</h4>
                                {breakdowns.devices && Object.keys(breakdowns.devices).length > 0 ? (
                                    <div className="breakdown-list">
                                        {Object.entries(breakdowns.devices)
                                            .sort((a, b) => (b[1].views || 0) - (a[1].views || 0))
                                            .map(([device, data]) => (
                                                <div key={device} className="breakdown-item">
                                                    <span className="breakdown-name">{device}</span>
                                                    <span className="breakdown-value">{formatNumber(data.views || 0)} views</span>
                                                </div>
                                            ))}
                                    </div>
                                ) : (
                                    <p className="no-data-text">No device data available</p>
                                )}
                            </div>

                            <div className="breakdown-card">
                                <h4>Operating Systems</h4>
                                {breakdowns.operatingSystems && Object.keys(breakdowns.operatingSystems).length > 0 ? (
                                    <div className="breakdown-list">
                                        {Object.entries(breakdowns.operatingSystems)
                                            .sort((a, b) => (b[1].views || 0) - (a[1].views || 0))
                                            .map(([os, data]) => (
                                                <div key={os} className="breakdown-item">
                                                    <span className="breakdown-name">{os}</span>
                                                    <span className="breakdown-value">{formatNumber(data.views || 0)} views</span>
                                                </div>
                                            ))}
                                    </div>
                                ) : (
                                    <p className="no-data-text">No OS data available</p>
                                )}
                            </div>
                        </div>

                        <div className="breakdown-grid">
                            <div className="breakdown-card">
                                <h4>Subscription Status</h4>
                                {breakdowns.subscriptionStatus && Object.keys(breakdowns.subscriptionStatus).length > 0 ? (
                                    <div className="breakdown-list">
                                        {Object.entries(breakdowns.subscriptionStatus)
                                            .sort((a, b) => (b[1].views || 0) - (a[1].views || 0))
                                            .map(([status, data]) => (
                                                <div key={status} className="breakdown-item">
                                                    <span className="breakdown-name">{status}</span>
                                                    <span className="breakdown-value">{formatNumber(data.views || 0)} views</span>
                                                </div>
                                            ))}
                                    </div>
                                ) : (
                                    <p className="no-data-text">No subscription data available</p>
                                )}
                            </div>

                        </div>

                        {breakdowns.sharingServices && Object.keys(breakdowns.sharingServices).length > 0 && (
                            <div className="breakdown-card full-width">
                                <h4>Sharing Services</h4>
                                <div className="breakdown-list horizontal">
                                    {Object.entries(breakdowns.sharingServices)
                                        .sort((a, b) => b[1] - a[1])
                                        .slice(0, 10)
                                        .map(([service, shares]) => (
                                            <div key={service} className="breakdown-item">
                                                <span className="breakdown-name">{service}</span>
                                                <span className="breakdown-value">{formatNumber(shares)} shares</span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoModal;