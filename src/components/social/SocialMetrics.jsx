import React, { useState, useEffect } from 'react';
import '../../styles/social.css';
import { matchesSearchTerm } from '../../utils/searchUtils';
import { useSearch } from '../../context/SearchContext';
import { MATRIX_COLORS, JCAD_COLORS, ICNS_COLORS, ONCOLOGY_COLORS } from '../dashboardBuilder/template/LayoutTemplates';

const SocialMetrics = ({ embedded, externalSearch, forcePlatform }) => {
    const { searchTerms, setSearchTerm: setGlobalSearchTerm } = useSearch();
    const [platform, setPlatform] = useState(forcePlatform || 'linkedin');
    const [contentMode, setContentMode] = useState('posts');
    const [viewMode, setViewMode] = useState('all');
    const [selectedChannels, setSelectedChannels] = useState([]);
    const [linkedinData, setLinkedinData] = useState({});
    const [instagramData, setInstagramData] = useState({});
    const [facebookData, setFacebookData] = useState({});
    const [postsList, setPostsList] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [profileData, setProfileData] = useState(null);
    const [selectedProfileChannel, setSelectedProfileChannel] = useState('');
    const [search, setSearch] = useState(searchTerms.socialMetrics || '');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [sortColumn, setSortColumn] = useState('impressions');
    const [sortDirection, setSortDirection] = useState('desc');
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);

    const CHANNEL_COLORS = {
        'Matrix': MATRIX_COLORS.secondary,
        'Oncology': ONCOLOGY_COLORS.primary,
        'ICNS': ICNS_COLORS.primary,
        'JCAD': JCAD_COLORS.primary,
        'NPPA': '#8b5cf6',
    };

    const LINKEDIN_BLOB_URL = '';
    const INSTAGRAM_BLOB_URL = '';
    const FACEBOOK_BLOB_URL = '';

    useEffect(() => {
        async function fetchSocialData() {
            setIsLoading(true);
            const cacheBuster = `&_t=${Date.now()}`;

            if (LINKEDIN_BLOB_URL) {
                try {
                    const res = await fetch(LINKEDIN_BLOB_URL + cacheBuster);
                    if (res.ok) {
                        const data = await res.json();
                        setLinkedinData(data);
                    }
                } catch (error) { }
            }

            if (INSTAGRAM_BLOB_URL) {
                try {
                    const res = await fetch(INSTAGRAM_BLOB_URL + cacheBuster);
                    if (res.ok) {
                        const data = await res.json();
                        setInstagramData(data);
                    }
                } catch (error) { }
            }

            if (FACEBOOK_BLOB_URL) {
                try {
                    const res = await fetch(FACEBOOK_BLOB_URL + cacheBuster);
                    if (res.ok) {
                        const data = await res.json();
                        setFacebookData(data);
                    }
                } catch (error) { }
            }

            setIsLoading(false);
        }
        fetchSocialData();
    }, []);

    const getPlatformData = () => {
        switch (platform) {
            case 'linkedin': return linkedinData;
            case 'instagram': return instagramData;
            case 'facebook': return facebookData;
            default: return {};
        }
    };

    const getChannelDisplayName = (key) => {
        const mapping = {
            'matrix': 'Matrix',
            'oncology': 'Oncology',
            'icns': 'ICNS',
            'jcad': 'JCAD',
            'nppa': 'NPPA',
        };
        return mapping[key] || key.charAt(0).toUpperCase() + key.slice(1);
    };

    useEffect(() => {
        const data = getPlatformData();
        const companies = data.companies || {};
        let allPosts = [];

        Object.entries(companies).forEach(([channelKey, channelData]) => {
            const posts = channelData.posts || [];
            posts.forEach(post => {
                const current = post.current || {};
                allPosts.push({
                    id: post.post_urn || post.id || `${channelKey}-${post.created_at}`,
                    text: post.text || '',
                    channel: getChannelDisplayName(channelKey),
                    channelKey,
                    createdAt: post.created_at || '',
                    impressions: current.impressions || 0,
                    engagements: current.engagements || 0,
                    engagementRate: current.engagement_rate || 0,
                    clicks: current.clicks || 0,
                    reactions: current.reactions || 0,
                    comments: current.comments || 0,
                    reposts: current.reposts || current.shares || 0,
                    history: post.history || [],
                    dailyDeltas: post.daily_deltas || [],
                });
            });
        });

        allPosts.sort((a, b) => (b.impressions || 0) - (a.impressions || 0));
        setPostsList(allPosts);

        let filtered = allPosts;

        if (viewMode === 'channel' && selectedChannels.length > 0) {
            filtered = filtered.filter(p => selectedChannels.includes(p.channel));
        }

        if (search) {
            filtered = filtered.filter(p => matchesSearchTerm(p.text || '', search));
        }

        setFilteredData(filtered);
        setCurrentPage(1);
    }, [platform, linkedinData, instagramData, facebookData, search, viewMode, selectedChannels]);

    useEffect(() => {
        if (contentMode !== 'profile') return;

        const data = getPlatformData();
        const companies = data.companies || {};
        const channelKeys = Object.keys(companies);

        if (channelKeys.length > 0 && !selectedProfileChannel) {
            setSelectedProfileChannel(channelKeys[0]);
        }

        if (selectedProfileChannel && companies[selectedProfileChannel]) {
            const ch = companies[selectedProfileChannel];
            const followerDaily = ch.follower_daily || [];
            const organicGain = followerDaily.reduce((sum, d) => sum + (d.organic_follower_gain || 0), 0);
            const paidGain = followerDaily.reduce((sum, d) => sum + (d.paid_follower_gain || 0), 0);

            const pageViews = ch.daily_page_views || [];
            const totalPageViews = pageViews.reduce((sum, d) => sum + (d.all_page_views || 0), 0);

            setProfileData({
                totalFollowers: ch.total_followers || 0,
                organicGain,
                paidGain,
                totalPageViews,
                demographics: ch.follower_demographics || {},
            });
        } else {
            setProfileData(null);
        }
    }, [contentMode, platform, linkedinData, instagramData, facebookData, selectedProfileChannel]);

    useEffect(() => {
        if (externalSearch !== undefined) {
            setSearch(externalSearch);
            setCurrentPage(1);
        }
    }, [externalSearch]);

    const handleSearchChange = (e) => {
        const searchValue = e.target.value;
        setSearch(searchValue);
        setGlobalSearchTerm('socialMetrics', searchValue);
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
            return newDirection === 'asc' ? aVal - bVal : bVal - aVal;
        });
        setFilteredData(sorted);
    };

    const handleDateSort = () => {
        let newDirection = 'desc';
        if (sortColumn === 'createdAt' && sortDirection === 'desc') {
            newDirection = 'asc';
        }
        setSortColumn('createdAt');
        setSortDirection(newDirection);

        const sorted = [...filteredData].sort((a, b) => {
            const aDate = new Date(a.createdAt || 0);
            const bDate = new Date(b.createdAt || 0);
            return newDirection === 'asc' ? aDate - bDate : bDate - aDate;
        });
        setFilteredData(sorted);
    };

    const toggleChannel = (channelName) => {
        setSelectedChannels(prev =>
            prev.includes(channelName) ? prev.filter(c => c !== channelName) : [...prev, channelName]
        );
    };

    const getChannels = () => {
        const data = getPlatformData();
        const companies = data.companies || {};
        return Object.keys(companies).map(key => ({
            key,
            name: getChannelDisplayName(key),
            postCount: (companies[key].posts || []).length,
        }));
    };

    const calculateAggregateMetrics = () => {
        if (!filteredData || filteredData.length === 0) {
            return {
                totalPosts: 0,
                totalImpressions: 0,
                totalEngagements: 0,
                avgEngagementRate: 0,
                totalClicks: 0,
                totalReactions: 0,
            };
        }

        const totalPosts = filteredData.length;
        const totalImpressions = filteredData.reduce((sum, p) => sum + (p.impressions || 0), 0);
        const totalEngagements = filteredData.reduce((sum, p) => sum + (p.engagements || 0), 0);
        const avgEngagementRate = totalImpressions > 0 ? (totalEngagements / totalImpressions * 100) : 0;
        const totalClicks = filteredData.reduce((sum, p) => sum + (p.clicks || 0), 0);
        const totalReactions = filteredData.reduce((sum, p) => sum + (p.reactions || 0), 0);

        return { totalPosts, totalImpressions, totalEngagements, avgEngagementRate, totalClicks, totalReactions };
    };

    const formatNumber = (num) => {
        if (num === undefined || isNaN(num)) return "0";
        return num.toLocaleString();
    };

    const formatPercent = (value) => {
        if (value === undefined || isNaN(value)) return "0%";
        return value.toFixed(2) + '%';
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const truncateText = (text, maxLen = 100) => {
        if (!text) return '';
        return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
    };

    const handleRowsPerPageChange = (e) => {
        setRowsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };

    const handlePagination = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const openPostModal = (post) => {
        setSelectedPost(post);
        setIsModalOpen(true);
    };

    const closePostModal = () => {
        setIsModalOpen(false);
        setSelectedPost(null);
    };

    const handlePlatformChange = (newPlatform) => {
        setPlatform(newPlatform);
        setCurrentPage(1);
        setViewMode('all');
        setSelectedChannels([]);
        setContentMode('posts');
        setSelectedProfileChannel('');
    };

    const exportToCSV = () => {
        const headers = ['Text', 'Channel', 'Date', 'Impressions', 'Engagements', 'Eng. Rate', 'Clicks'];

        const rows = filteredData.map(item => [
            item.text,
            item.channel,
            item.createdAt,
            item.impressions,
            item.engagements,
            item.engagementRate?.toFixed(2) || '0',
            item.clicks,
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
        link.setAttribute("download", `${platform}_social_metrics.csv`);
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
    const channels = getChannels();
    const platformData = getPlatformData();
    const lastUpdated = platformData.last_updated;

    const renderSortIndicator = (column) => {
        if (sortColumn !== column) return null;
        return <span className="sort-indicator">{sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>;
    };

    const renderDemographicsTable = (title, data) => {
        if (!data || data.length === 0) return null;
        return (
            <div className="demographics-card">
                <h4>{title}</h4>
                <table className="demographics-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Organic</th>
                            <th>Paid</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item, idx) => (
                            <tr key={idx}>
                                <td>{item.name || item.geo || item.function || item.seniority || item.industry || item.country || 'Unknown'}</td>
                                <td>{formatNumber(item.organic || item.organicFollowerCount || 0)}</td>
                                <td>{formatNumber(item.paid || item.paidFollowerCount || 0)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="social-metrics-container">
            {!embedded && (
                <div className="page-header">
                    <h1>Social Metrics</h1>
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
            )}

            {!forcePlatform && (
                <div className="data-source-toggle">
                    <div
                        className={`data-source-option ${platform === 'linkedin' ? 'active' : ''}`}
                        onClick={() => handlePlatformChange('linkedin')}
                    >
                        LinkedIn
                    </div>
                    <div
                        className={`data-source-option ${platform === 'instagram' ? 'active' : ''}`}
                        onClick={() => handlePlatformChange('instagram')}
                    >
                        Instagram
                    </div>
                    <div
                        className={`data-source-option ${platform === 'facebook' ? 'active' : ''}`}
                        onClick={() => handlePlatformChange('facebook')}
                    >
                        Facebook
                    </div>
                </div>
            )}

            {contentMode === 'posts' && (
                <div className="social-metrics-summary">
                    <div className="metric-summary-card">
                        <div className="metric-summary-label">Total Posts</div>
                        <div className="metric-summary-value">{formatNumber(aggregateMetrics.totalPosts)}</div>
                    </div>
                    <div className="metric-summary-card">
                        <div className="metric-summary-label">Impressions</div>
                        <div className="metric-summary-value">{formatNumber(aggregateMetrics.totalImpressions)}</div>
                    </div>
                    <div className="metric-summary-card">
                        <div className="metric-summary-label">Engagements</div>
                        <div className="metric-summary-value">{formatNumber(aggregateMetrics.totalEngagements)}</div>
                    </div>
                    <div className="metric-summary-card">
                        <div className="metric-summary-label">Eng. Rate</div>
                        <div className="metric-summary-value">{formatPercent(aggregateMetrics.avgEngagementRate)}</div>
                    </div>
                    <div className="metric-summary-card">
                        <div className="metric-summary-label">Clicks</div>
                        <div className="metric-summary-value">{formatNumber(aggregateMetrics.totalClicks)}</div>
                    </div>
                </div>
            )}

            {contentMode === 'profile' && profileData && (
                <div className="social-metrics-summary">
                    <div className="metric-summary-card">
                        <div className="metric-summary-label">Total Followers</div>
                        <div className="metric-summary-value">{formatNumber(profileData.totalFollowers)}</div>
                    </div>
                    <div className="metric-summary-card">
                        <div className="metric-summary-label">Organic Gain</div>
                        <div className="metric-summary-value">{formatNumber(profileData.organicGain)}</div>
                    </div>
                    <div className="metric-summary-card">
                        <div className="metric-summary-label">Paid Gain</div>
                        <div className="metric-summary-value">{formatNumber(profileData.paidGain)}</div>
                    </div>
                    <div className="metric-summary-card">
                        <div className="metric-summary-label">Total Page Views</div>
                        <div className="metric-summary-value">{formatNumber(profileData.totalPageViews)}</div>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="loading-indicator">Loading social data...</div>
            ) : (
                <div className="table-section">
                    <div className="table-header-row">
                        <h2 className="table-title">
                            {platform === 'linkedin' ? 'LinkedIn' : platform === 'instagram' ? 'Instagram' : 'Facebook'} {contentMode === 'posts' ? 'Posts' : 'Profile'}
                        </h2>
                        <div className="table-header-controls">
                            {contentMode === 'posts' && (
                                <div className="rows-per-page-control">
                                    <label htmlFor="socialRowsPerPage">Rows per page:</label>
                                    <select
                                        id="socialRowsPerPage"
                                        value={rowsPerPage}
                                        onChange={handleRowsPerPageChange}
                                    >
                                        {[10, 15, 20, 25, 30, 35, 40, 45, 50].map((num) => (
                                            <option key={num} value={num}>{num}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="playlist-toggle">
                                <div
                                    className={`playlist-toggle-option ${contentMode === 'posts' ? 'active' : ''}`}
                                    onClick={() => { setContentMode('posts'); setCurrentPage(1); }}
                                >
                                    Posts
                                </div>
                                <div
                                    className={`playlist-toggle-option ${contentMode === 'profile' ? 'active' : ''}`}
                                    onClick={() => { setContentMode('profile'); }}
                                >
                                    Profile
                                </div>
                            </div>
                            {contentMode === 'posts' && channels.length > 1 && (
                                <div className="playlist-toggle">
                                    <div
                                        className={`playlist-toggle-option ${viewMode === 'all' ? 'active' : ''}`}
                                        onClick={() => { setViewMode('all'); setSelectedChannels([]); }}
                                    >
                                        All Posts ({postsList.length})
                                    </div>
                                    <div
                                        className={`playlist-toggle-option ${viewMode === 'channel' ? 'active' : ''}`}
                                        onClick={() => { setViewMode('channel'); }}
                                    >
                                        By Channel
                                    </div>
                                </div>
                            )}
                            {contentMode === 'profile' && channels.length > 0 && (
                                <div className="profile-channel-selector">
                                    <label htmlFor="profileChannel">Channel:</label>
                                    <select
                                        id="profileChannel"
                                        value={selectedProfileChannel}
                                        onChange={(e) => setSelectedProfileChannel(e.target.value)}
                                    >
                                        {channels.map(ch => (
                                            <option key={ch.key} value={ch.key}>{ch.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {lastUpdated && (
                                <div className="last-updated-tag">
                                    Last Updated: {new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                            )}
                        </div>
                    </div>

                    {contentMode === 'posts' && viewMode === 'channel' && channels.length > 1 && (
                        <div className="channel-selector">
                            {channels.map(ch => (
                                <div
                                    key={ch.key}
                                    className={`channel-selector-item ${selectedChannels.includes(ch.name) ? 'active' : ''}`}
                                    onClick={() => toggleChannel(ch.name)}
                                    style={{
                                        '--channel-color': CHANNEL_COLORS[ch.name] || '#575757',
                                    }}
                                >
                                    <span
                                        className="channel-color-dot"
                                        style={{ backgroundColor: CHANNEL_COLORS[ch.name] || '#575757' }}
                                    ></span>
                                    <span className="channel-selector-title">{ch.name}</span>
                                    <span className="channel-selector-count">{ch.postCount}</span>
                                </div>
                            ))}
                            {selectedChannels.length > 0 && (
                                <div
                                    className="channel-selector-item clear-all"
                                    onClick={() => setSelectedChannels([])}
                                >
                                    Clear All
                                </div>
                            )}
                        </div>
                    )}

                    {contentMode === 'posts' && (
                        <>
                            <table className="social-metrics-table">
                                <thead>
                                    <tr>
                                        <th className="text-column">Text</th>
                                        <th className="channel-column">Channel</th>
                                        <th className="metric-column sortable" onClick={handleDateSort}>
                                            Date {renderSortIndicator('createdAt')}
                                        </th>
                                        <th className="metric-column sortable" onClick={() => handleSort('impressions')}>
                                            Impressions {renderSortIndicator('impressions')}
                                        </th>
                                        <th className="metric-column sortable" onClick={() => handleSort('engagements')}>
                                            Engagements {renderSortIndicator('engagements')}
                                        </th>
                                        <th className="metric-column sortable" onClick={() => handleSort('engagementRate')}>
                                            Eng. Rate {renderSortIndicator('engagementRate')}
                                        </th>
                                        <th className="metric-column sortable" onClick={() => handleSort('clicks')}>
                                            Clicks {renderSortIndicator('clicks')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentRows.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#8a8a8a' }}>
                                                No posts data available. Data will appear once the {platform} JSON file is configured.
                                            </td>
                                        </tr>
                                    ) : (
                                        currentRows.map((item, index) => (
                                            <tr key={item.id || index}>
                                                <td className="text-column post-text" onClick={() => openPostModal(item)}>
                                                    <span className="post-text-content">{truncateText(item.text)}</span>
                                                </td>
                                                <td className="channel-column">
                                                    <span
                                                        className="channel-badge"
                                                        style={{
                                                            '--channel-color': CHANNEL_COLORS[item.channel] || '#575757'
                                                        }}
                                                    >
                                                        {item.channel}
                                                    </span>
                                                </td>
                                                <td className="metric-column">{formatDate(item.createdAt)}</td>
                                                <td className="metric-column">{formatNumber(item.impressions)}</td>
                                                <td className="metric-column">{formatNumber(item.engagements)}</td>
                                                <td className="metric-column">{formatPercent(item.engagementRate)}</td>
                                                <td className="metric-column">{formatNumber(item.clicks)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>

                            {totalPages > 1 && (
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
                            )}

                            <div className="export-button-container">
                                <button className="export-button" onClick={exportToCSV}>
                                    Export CSV
                                </button>
                            </div>
                        </>
                    )}

                    {contentMode === 'profile' && (
                        <>
                            {profileData ? (
                                <div className="demographics-section-inner">
                                    <h3 className="demographics-heading">Follower Demographics</h3>
                                    <div className="demographics-grid">
                                        {renderDemographicsTable('By Function', profileData.demographics.followerCountsByFunction)}
                                        {renderDemographicsTable('By Seniority', profileData.demographics.followerCountsBySeniority)}
                                        {renderDemographicsTable('By Industry', profileData.demographics.followerCountsByIndustry)}
                                        {renderDemographicsTable('By Country', profileData.demographics.followerCountsByGeoCountry)}
                                    </div>
                                    {(!profileData.demographics.followerCountsByFunction &&
                                      !profileData.demographics.followerCountsBySeniority &&
                                      !profileData.demographics.followerCountsByIndustry &&
                                      !profileData.demographics.followerCountsByGeoCountry) && (
                                        <div className="no-data-message">
                                            No demographics data available for this channel.
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="no-data-message">
                                    No profile data available. Data will appear once the {platform} JSON file is configured.
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {isModalOpen && selectedPost && (
                <div className="social-modal-overlay" onClick={closePostModal}>
                    <div className="social-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="social-modal-header">
                            <h3>Post Details</h3>
                            <button className="modal-close-button" onClick={closePostModal}>&times;</button>
                        </div>
                        <div className="social-modal-body">
                            <div className="post-full-text">{selectedPost.text}</div>
                            <div className="post-meta">
                                <span className="channel-badge" style={{ '--channel-color': CHANNEL_COLORS[selectedPost.channel] || '#575757' }}>
                                    {selectedPost.channel}
                                </span>
                                <span className="post-date">{formatDate(selectedPost.createdAt)}</span>
                            </div>
                            <div className="post-metrics-grid">
                                <div className="metric-card">
                                    <div className="metric-label">Impressions</div>
                                    <div className="metric-value">{formatNumber(selectedPost.impressions)}</div>
                                </div>
                                <div className="metric-card">
                                    <div className="metric-label">Engagements</div>
                                    <div className="metric-value">{formatNumber(selectedPost.engagements)}</div>
                                </div>
                                <div className="metric-card">
                                    <div className="metric-label">Eng. Rate</div>
                                    <div className="metric-value">{formatPercent(selectedPost.engagementRate)}</div>
                                </div>
                                <div className="metric-card">
                                    <div className="metric-label">Clicks</div>
                                    <div className="metric-value">{formatNumber(selectedPost.clicks)}</div>
                                </div>
                                <div className="metric-card">
                                    <div className="metric-label">Reactions</div>
                                    <div className="metric-value">{formatNumber(selectedPost.reactions)}</div>
                                </div>
                                <div className="metric-card">
                                    <div className="metric-label">Comments</div>
                                    <div className="metric-value">{formatNumber(selectedPost.comments)}</div>
                                </div>
                                <div className="metric-card">
                                    <div className="metric-label">Reposts</div>
                                    <div className="metric-value">{formatNumber(selectedPost.reposts)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SocialMetrics;