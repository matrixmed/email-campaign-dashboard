import React, { useState, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../../styles/video.css';

const VideoModal = ({ video, onClose }) => {
    const [timeframeFilter, setTimeframeFilter] = useState('7'); // Default to 7 days
    const [summaryMetrics, setSummaryMetrics] = useState({}); // Store all-time metrics
    const [displayMetrics, setDisplayMetrics] = useState({}); // Metrics to display based on timeframe
    const modalRef = useRef(null);
    const [isYoutubeVideo, setIsYoutubeVideo] = useState(false);

    useEffect(() => {
        // Determine if it's a YouTube video
        const thumbnails = video.fullData?.snippet?.thumbnails;
        const isVimeo = thumbnails && 
                      (typeof thumbnails.default === 'string' || 
                       thumbnails.default?.url?.includes('vumbnail.com'));
        setIsYoutubeVideo(!isVimeo);
        
        // Set all-time metrics on initial load
        if (video.totals) {
            const allTimeMetrics = {
                views: video.totals.views || 0,
                impressions: video.totals.impressions || 0,
                watchTimeHours: video.totals.watchTimeHours || 0,
                averageViewDuration: video.totals.averageViewDuration || 0,
                averageViewPercentage: video.totals.averageViewPercentage || 0
            };
            setSummaryMetrics(allTimeMetrics);
            setDisplayMetrics(allTimeMetrics); // Initialize display metrics with all-time values
        }
    }, [video]);

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

    useEffect(() => {
        // Update metrics based on timeframe filter
        if (timeframeFilter === 'all') {
            // Display all-time metrics
            setDisplayMetrics(summaryMetrics);
        } else if (video.history) {
            const timeframeData = getTimeframeData();
            
            // Calculate metrics based on filtered timeframe
            const views = timeframeData.reduce((sum, day) => sum + (day.views || 0), 0);
            const watchTimeHours = timeframeData.reduce((sum, day) => sum + (day.watchTimeHours || 0), 0);
            const impressions = timeframeData.reduce((sum, day) => sum + (day.impressions || 0), 0);
            
            // Calculate averages
            const avgViewDuration = views > 0 
                ? timeframeData.reduce((sum, day) => sum + ((day.averageViewDuration || 0) * (day.views || 0)), 0) / views 
                : 0;
            
            const avgViewPercentage = views > 0 
                ? timeframeData.reduce((sum, day) => sum + ((day.averageViewPercentage || 0) * (day.views || 0)), 0) / views 
                : 0;
            
            setDisplayMetrics({
                views,
                impressions,
                watchTimeHours,
                averageViewDuration: avgViewDuration,
                averageViewPercentage: avgViewPercentage
            });
        }
    }, [timeframeFilter, video.history, summaryMetrics]);

    const handleTimeframeChange = (e) => {
        setTimeframeFilter(e.target.value);
    };

    const formatDate = (isoString) => {
        if (!isoString) return "Unknown";
        const date = new Date(isoString);
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
        if (hours < 1) {
            return Math.round(hours * 60) + 'm';
        }
        return hours.toFixed(1) + 'h';
    };

    const formatDuration = (ytDuration) => {
        if (!ytDuration) return "0:00";
        
        const hourMatch = ytDuration.match(/(\d+)H/);
        const minuteMatch = ytDuration.match(/(\d+)M/);
        const secondMatch = ytDuration.match(/(\d+)S/);
        
        const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
        const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
        const seconds = secondMatch ? parseInt(secondMatch[1]) : 0;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Get data with all days filled in (including zeros for missing days)
    const getTimeframeData = () => {
        if (!video.history) return [];
        
        // Convert history object to array and sort by date
        const historyArray = Object.entries(video.history).map(([date, data]) => ({
            date,
            ...data.totals
        }));
        
        historyArray.sort((a, b) => a.date.localeCompare(b.date));
        
        if (timeframeFilter === 'all') {
            return fillMissingDates(historyArray);
        } else {
            // Get the date range
            const daysToShow = parseInt(timeframeFilter, 10);
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - daysToShow + 1);
            
            return fillMissingDates(historyArray, startDate, endDate);
        }
    };
    
    // Fill in missing dates with zero values
    const fillMissingDates = (dataArray, startDate, endDate) => {
        // If no data, return empty array
        if (dataArray.length === 0) return [];
        
        // Create a map of existing dates
        const dateMap = {};
        dataArray.forEach(item => {
            dateMap[item.date] = item;
        });
        
        // If no start/end dates provided, use min/max from data
        if (!startDate || !endDate) {
            const dates = dataArray.map(item => new Date(item.date));
            startDate = startDate || new Date(Math.min(...dates));
            endDate = endDate || new Date(Math.max(...dates));
        }
        
        // Create array with all dates in range
        const result = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const dateString = currentDate.toISOString().split('T')[0];
            
            if (dateMap[dateString]) {
                result.push(dateMap[dateString]);
            } else {
                // Add zero values for missing dates
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
        const thumbnails = video.fullData?.snippet?.thumbnails;
        
        if (thumbnails?.default && typeof thumbnails.default === 'string') {
            return thumbnails.default;
        }
        
        if (thumbnails) {
            return thumbnails.maxres?.url || 
                   thumbnails.standard?.url || 
                   thumbnails.high?.url || 
                   thumbnails.medium?.url || 
                   thumbnails.default?.url || 
                   video.thumbnail;
        }
        
        return video.thumbnail || 'https://placehold.co/320x180?text=No+Thumbnail';
    };
    
    const getVideoUrl = () => {
        if (video.fullData?.snippet?.videoUrl) {
            return video.fullData.snippet.videoUrl;
        }
        
        return `https://www.youtube.com/watch?v=${video.id}`;
    };
    
    const getMetricCardClass = (metricType) => {
        if (isYoutubeVideo && metricType === 'impressions') {
            return 'metric-card hidden';
        }
        
        // Calculate width based on visible cards (5 by default, 4 if YouTube)
        const baseClassName = 'metric-card';
        const width = isYoutubeVideo ? 'youtube-width' : '';
        
        return width ? `${baseClassName} ${width}` : baseClassName;
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
                        {video.fullData?.contentDetails?.duration && (
                            <div className="video-duration">
                                {formatDuration(video.fullData.contentDetails.duration)}
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
                                {isYoutubeVideo ? `youtube.com/watch?v=${video.id}` : 'Vimeo Video'}
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
                
                <div className="video-modal-controls">
                    <div className="timeframe-filter">
                        <label htmlFor="videoTimeframeFilter">Timeframe:</label>
                        <select
                            id="videoTimeframeFilter"
                            value={timeframeFilter}
                            onChange={handleTimeframeChange}
                        >
                            <option value="all">All Time</option>
                            <option value="60">Last 60 Days</option>
                            <option value="30">Last 30 Days</option>
                            <option value="14">Last 14 Days</option>
                            <option value="7">Last 7 Days</option>
                        </select>
                    </div>
                </div>
                
                <div className="video-modal-metrics">
                    <div className={getMetricCardClass('views')}>
                        <div className="metric-label">Views</div>
                        <div className="metric-value">{formatNumber(displayMetrics.views)}</div>
                    </div>
                    <div className={getMetricCardClass('impressions')}>
                        <div className="metric-label">Impressions</div>
                        <div className="metric-value">{formatNumber(displayMetrics.impressions)}</div>
                    </div>
                    <div className={getMetricCardClass('watchTime')}>
                        <div className="metric-label">Watch Time</div>
                        <div className="metric-value">{formatWatchTime(displayMetrics.watchTimeHours)}</div>
                    </div>
                    <div className={getMetricCardClass('averageViewDuration')}>
                        <div className="metric-label">Avg. View Duration</div>
                        <div className="metric-value">{formatTime(displayMetrics.averageViewDuration)}</div>
                    </div>
                    <div className={getMetricCardClass('averageViewPercentage')}>
                        <div className="metric-label">Avg. View Percentage</div>
                        <div className="metric-value">{formatPercent(displayMetrics.averageViewPercentage)}</div>
                    </div>
                </div>

                {hasData ? (
                    <>
                        <div className="video-modal-charts">
                            <div className="chart-container">
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
                                            <th>Avg Duration</th>
                                            <th>Subscribers +/-</th>
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
                                                    <td>{formatWatchTime(data.watchTimeHours)}</td>
                                                    <td>{formatTime(data.averageViewDuration)}</td>
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
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="no-data-message">
                        <p>No historical data available for this video. This is common for videos imported from Vimeo or recently published YouTube videos.</p>
                    </div>
                )}
                
                <div className="video-modal-description">
                    <h4>Description</h4>
                    <div className="video-description-content">
                        {video.fullData?.snippet?.description || "No description provided."}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoModal;