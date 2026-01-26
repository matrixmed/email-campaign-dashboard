import React, { useState, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../../styles/video.css';

const VideoModal = ({ video, onClose, videoSource }) => {
    const [timeframeFilter, setTimeframeFilter] = useState('all');
    const [displayMetrics, setDisplayMetrics] = useState({});
    const modalRef = useRef(null);
    const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
    const [showCustomPicker, setShowCustomPicker] = useState(false);

    const isYoutubeVideo = videoSource === 'youtube';

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
        } else if (video.history && video.history.length > 0) {
            const timeframeData = getTimeframeData();

            if (timeframeData.length === 0) {
                setDisplayMetrics(allTimeMetrics);
                return;
            }

            const views = timeframeData.reduce((sum, day) => sum + (day.views || 0), 0);
            const watchTimeHours = timeframeData.reduce((sum, day) => sum + (day.watchTimeHours || 0), 0);
            const impressions = timeframeData.reduce((sum, day) => sum + (day.impressions || 0), 0);

            const avgViewPercentage = views > 0
                ? timeframeData.reduce((sum, day) => sum + ((day.averageViewPercentage || 0) * (day.views || 0)), 0) / views
                : 0;

            const impressionsCtr = impressions > 0 ? (views / impressions * 100) : 0;

            setDisplayMetrics({
                views,
                impressions,
                watchTimeHours,
                averageViewPercentage: avgViewPercentage,
                impressionsCtr: impressionsCtr
            });
        } else {
            setDisplayMetrics(allTimeMetrics);
        }
    }, [timeframeFilter, video, customDateRange]);

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
                impressions: item.impressions || 0,
                watchTimeHours: (item.total_seconds_watched || 0) / 3600,
                averageViewDuration: item.avg_seconds_watched || 0,
                averageViewPercentage: item.mean_percent_watched || item.avg_percent_watched || 0,
                subscribersGained: item.subscribersGained || 0,
                subscribersLost: item.subscribersLost || 0
            }));
        } else {
            historyArray = Object.entries(video.history).map(([date, data]) => ({
                date,
                ...(data.totals || data)
            }));
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
                    impressions: 0,
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
                weeklyData[weekKey].impressions += dayData.impressions || 0;
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
                    impressions: 0,
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
                monthlyData[monthKey].impressions += dayData.impressions || 0;
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
                    impressions: 0,
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
                        {video.fullData?.snippet?.tags && (
                            <div className="video-tags">
                                {video.fullData.snippet.tags.slice(0, 5).map((tag, index) => (
                                    <span key={index} className="video-tag">{tag}</span>
                                ))}
                                {video.fullData.snippet.tags.length > 5 && (
                                    <span className="more-tags">+{video.fullData.snippet.tags.length - 5} more</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="video-modal-metrics">
                    <div className="metrics-top-row">
                        <div className="metric-card large-card">
                            <div className="metric-label">Impressions</div>
                            <div className="metric-value">{formatNumber(displayMetrics.impressions)}</div>
                        </div>
                        <div className="metric-card large-card">
                            <div className="metric-label">Views</div>
                            <div className="metric-value">{formatNumber(displayMetrics.views)}</div>
                        </div>
                    </div>
                    <div className="metrics-bottom-row">
                        <div className="metric-card">
                            <div className="metric-label">Impressions CTR</div>
                            <div className="metric-value">{formatPercent(displayMetrics.impressions > 0 ? (displayMetrics.views / displayMetrics.impressions * 100) : 0)}</div>
                        </div>
                        <div className="metric-card">
                            <div className="metric-label">Avg. % Watched</div>
                            <div className="metric-value">{formatPercent(displayMetrics.averageViewPercentage)}</div>
                        </div>
                        <div className="metric-card">
                            <div className="metric-label">Total Time Watched</div>
                            <div className="metric-value">{formatWatchTime(displayMetrics.watchTimeHours)}</div>
                        </div>
                    </div>
                </div>

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

                {hasData ? (
                    <>
                        <div className="video-modal-charts">
                            <div className="views-chart-container views-chart-container">
                                <h4>Views Over Time</h4>
                                <ResponsiveContainer>
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
                                            <th>Impressions</th>
                                            <th>Views</th>
                                            <th>Watch Time</th>
                                            <th>Avg Duration %</th>
                                            <th>Impressions CTR</th>
                                            {isYoutubeVideo && <th>Subscribers +/-</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {timeframeData
                                            .slice()
                                            .reverse()
                                            .map((data, index) => {
                                                const impressionsCtr = (data.impressions || 0) > 0
                                                    ? ((data.views || 0) / data.impressions * 100)
                                                    : 0;
                                                return (
                                                    <tr key={index}>
                                                        <td>{formatDate(data.date)}</td>
                                                        <td>{formatNumber(data.impressions)}</td>
                                                        <td>{formatNumber(data.views)}</td>
                                                        <td>{formatWatchTime(data.watchTimeHours)}</td>
                                                        <td>{formatPercent(data.averageViewPercentage)}</td>
                                                        <td>{formatPercent(impressionsCtr)}</td>
                                                        {isYoutubeVideo && (
                                                            <td>
                                                                {data.subscribersGained || data.subscribersLost ? (
                                                                    <span className={
                                                                        (data.subscribersGained - data.subscribersLost) >= 0
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
                                                );
                                            })}
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
            </div>
        </div>
    );
};

export default VideoModal;