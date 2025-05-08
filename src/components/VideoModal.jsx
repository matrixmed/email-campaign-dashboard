import React, { useState, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import '../video.css';

const VideoModal = ({ video, onClose }) => {
    const [timeframeFilter, setTimeframeFilter] = useState('12');
    const modalRef = useRef(null);

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
        setTimeframeFilter(e.target.value);
    };

    // Format YouTube timestamp (ISO) to readable date
    const formatDate = (isoString) => {
        if (!isoString) return "Unknown";
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Format numbers with comma separators
    const formatNumber = (num) => {
        if (num === undefined || isNaN(num)) return "0";
        return num.toLocaleString();
    };

    // Format percent values
    const formatPercent = (value) => {
        if (value === undefined || isNaN(value)) return "0%";
        return value.toFixed(2) + '%';
    };

    // Format time (seconds) to human-readable format
    const formatTime = (seconds) => {
        if (seconds === undefined || isNaN(seconds)) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Format watch time (hours) to appropriate unit
    const formatWatchTime = (hours) => {
        if (hours === undefined || isNaN(hours)) return "0h";
        if (hours < 1) {
            return Math.round(hours * 60) + 'm';
        }
        return hours.toFixed(1) + 'h';
    };

    // Format YouTube duration string (PT3M33S) to readable time
    const formatDuration = (ytDuration) => {
        if (!ytDuration) return "0:00";
        
        // Extract hours, minutes, seconds from YouTube's PT3M33S format
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

    const getTimeframeData = () => {
        if (!video.history) return [];
        
        // Convert history object to array, sorted by date
        const historyArray = Object.entries(video.history).map(([date, data]) => ({
            date,
            ...data.totals
        }));
        
        historyArray.sort((a, b) => a.date.localeCompare(b.date));
        
        if (timeframeFilter === 'all') {
            return historyArray;
        } else {
            const daysToShow = parseInt(timeframeFilter, 10);
            return historyArray.slice(-daysToShow);
        }
    };

    const getTrafficSourceData = () => {
        if (!video.history) return [];
        
        // Aggregate traffic sources across dates
        const aggregatedSources = {};
        
        Object.values(video.history).forEach(dayData => {
            if (dayData.byTraffic) {
                Object.entries(dayData.byTraffic).forEach(([sourceType, data]) => {
                    aggregatedSources[sourceType] = (aggregatedSources[sourceType] || 0) + (data.views || 0);
                });
            }
        });
        
        // Map numeric source types to readable names
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
                value: views // for PieChart
            }))
            .sort((a, b) => b.views - a.views);
    };

    const getLocationData = () => {
        if (!video.history) return [];
        
        // Aggregate playback locations across dates
        const aggregatedLocations = {};
        
        Object.values(video.history).forEach(dayData => {
            if (dayData.byLocation) {
                Object.entries(dayData.byLocation).forEach(([locationType, data]) => {
                    aggregatedLocations[locationType] = (aggregatedLocations[locationType] || 0) + (data.views || 0);
                });
            }
        });
        
        // Map numeric location types to readable names
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
                value: views // for PieChart
            }))
            .sort((a, b) => b.views - a.views);
    };

    const timeframeData = getTimeframeData();
    const trafficSourceData = getTrafficSourceData();
    const locationData = getLocationData();

    // Colors for pie charts
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

    // Check if the video has data
    const hasData = timeframeData.length > 0;

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
                            src={video.fullData.snippet.thumbnails.maxres?.url || 
                                 video.fullData.snippet.thumbnails.standard?.url || 
                                 video.fullData.snippet.thumbnails.high?.url || 
                                 video.thumbnail} 
                            alt={video.title} 
                        />
                        <div className="video-duration">
                            {formatDuration(video.fullData.contentDetails.duration)}
                        </div>
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
                                href={`https://www.youtube.com/watch?v=${video.id}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="video-url"
                            >
                                youtube.com/watch?v={video.id}
                            </a>
                        </div>
                        {video.fullData.snippet.tags && (
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
                            <option value="30">Last 30 Days</option>
                            <option value="14">Last 14 Days</option>
                            <option value="7">Last 7 Days</option>
                        </select>
                    </div>
                </div>
                
                <div className="video-modal-metrics">
                    <div className="metric-card">
                        <div className="metric-label">Views</div>
                        <div className="metric-value">{formatNumber(video.views)}</div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-label">Watch Time</div>
                        <div className="metric-value">{formatWatchTime(video.watchTimeHours)}</div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-label">Avg. View Duration</div>
                        <div className="metric-value">{formatTime(video.averageViewDuration)}</div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-label">Avg. View Percentage</div>
                        <div className="metric-value">{formatPercent(video.averageViewPercentage)}</div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-label">Likes</div>
                        <div className="metric-value">{formatNumber(video.likes)}</div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-label">Comments</div>
                        <div className="metric-value">{formatNumber(video.comments)}</div>
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
                                        <YAxis />
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
                            
                            <div className="charts-grid">
                                <div className="chart-container half-width">
                                    <h4>Traffic Sources</h4>
                                    <div className="chart-with-legend">
                                        <ResponsiveContainer width="100%" height={220}>
                                            <PieChart>
                                                <Pie
                                                    data={trafficSourceData}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                >
                                                    {trafficSourceData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    formatter={(value) => [formatNumber(value), "Views"]}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="traffic-legend">
                                            {trafficSourceData.map((entry, index) => (
                                                <div key={index} className="legend-item">
                                                    <div 
                                                        className="color-box" 
                                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                    ></div>
                                                    <div className="legend-label">{entry.source}: {formatNumber(entry.views)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="chart-container half-width">
                                    <h4>Playback Locations</h4>
                                    <div className="chart-with-legend">
                                        <ResponsiveContainer width="100%" height={220}>
                                            <PieChart>
                                                <Pie
                                                    data={locationData}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    outerRadius={80}
                                                    fill="#82ca9d"
                                                    dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                >
                                                    {locationData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    formatter={(value) => [formatNumber(value), "Views"]}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="traffic-legend">
                                            {locationData.map((entry, index) => (
                                                <div key={index} className="legend-item">
                                                    <div 
                                                        className="color-box" 
                                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                                    ></div>
                                                    <div className="legend-label">{entry.location}: {formatNumber(entry.views)}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
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
                                            <th>Impressions</th>
                                            <th>CTR</th>
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
                                                    <td>{formatNumber(data.impressions)}</td>
                                                    <td>{formatPercent(data.impressionsCtr)}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="no-data-message">
                        <p>No historical data available for this video. Analytics data may take 24-48 hours to appear after a video is published.</p>
                    </div>
                )}
                
                <div className="video-modal-description">
                    <h4>Description</h4>
                    <div className="video-description-content">
                        {video.fullData.snippet.description || "No description provided."}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoModal;