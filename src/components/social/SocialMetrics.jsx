import React, { useState, useEffect, useRef } from 'react';
import '../../styles/social.css';
import '../../styles/CampaignModal.css';
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
    const [sortColumn, setSortColumn] = useState('createdAt');
    const [sortDirection, setSortDirection] = useState('desc');
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState(null);
    const modalRef = useRef(null);

    const CHANNEL_COLORS = {
        'Matrix': MATRIX_COLORS.secondary,
        'Oncology': ONCOLOGY_COLORS.primary,
        'ICNS': ICNS_COLORS.primary,
        'JCAD': JCAD_COLORS.primary,
        'NPPA': '#8b5cf6',
    };

    const LINKEDIN_PROFILE_BLOB_URL = 'https://emaildash.blob.core.windows.net/json-data/linkedin_profile_metrics.json?sp=r&st=2026-03-03T19:38:32Z&se=2027-08-05T02:53:32Z&spr=https&sv=2024-11-04&sr=b&sig=gCWLltCNiATBL6XysEg4WNh4JW%2FMD%2B16BkTt8jOP914%3D';
    const LINKEDIN_ENGAGEMENT_BLOB_URL = 'https://emaildash.blob.core.windows.net/json-data/linkedin_engagement_metrics.json?sp=r&st=2026-03-03T19:33:54Z&se=2028-03-22T02:48:54Z&spr=https&sv=2024-11-04&sr=b&sig=rAHmId4vA4G20FmRltPMwqoFMmpmQEmD1Y8CbUsZiU0%3D';
    const FB_PROFILE_BLOB_URL = 'https://emaildash.blob.core.windows.net/json-data/facebook_profile_metrics.json?sp=r&st=2026-02-18T21:02:49Z&se=2028-05-21T04:17:49Z&spr=https&sv=2024-11-04&sr=b&sig=uE7Yej8V8qJ6W3FKIzWkexVON7c074h9Xnkd1RWqOPE%3D';
    const FB_ENGAGEMENT_BLOB_URL = 'https://emaildash.blob.core.windows.net/json-data/facebook_engagement_metrics.json?sp=r&st=2026-02-18T21:03:59Z&se=2028-05-17T04:18:59Z&spr=https&sv=2024-11-04&sr=b&sig=mZyVxrFi1U5Z234HHVICAxysq73m14Jpm3r%2BzCOzvKs%3D';
    const IG_PROFILE_BLOB_URL = 'https://emaildash.blob.core.windows.net/json-data/instagram_profile_metrics.json?sp=r&st=2026-02-18T21:03:17Z&se=2028-05-27T04:18:17Z&spr=https&sv=2024-11-04&sr=b&sig=Iu%2B57JgpeateOx9zTPFEMnOEUMMFA8JMsXX8OPz5SXY%3D';
    const IG_ENGAGEMENT_BLOB_URL = 'https://emaildash.blob.core.windows.net/json-data/instagram_engagement_metrics.json?sp=r&st=2026-02-18T21:03:38Z&se=2028-05-16T04:18:38Z&spr=https&sv=2024-11-04&sr=b&sig=ZkHZS8lQQmkvTGjkxy3fFZVUtWNO5WGMOazVdkPNYVI%3D';

    useEffect(() => {
        async function fetchSocialData() {
            setIsLoading(true);
            const cacheBuster = `&_t=${Date.now()}`;

            if (LINKEDIN_ENGAGEMENT_BLOB_URL) {
                try {
                    const res = await fetch(LINKEDIN_ENGAGEMENT_BLOB_URL + cacheBuster);
                    if (res.ok) setLinkedinData(await res.json());
                } catch (error) { }
            }

            try {
                const [fbProfileRes, fbEngagementRes] = await Promise.all([
                    FB_PROFILE_BLOB_URL ? fetch(FB_PROFILE_BLOB_URL + cacheBuster) : Promise.resolve(null),
                    FB_ENGAGEMENT_BLOB_URL ? fetch(FB_ENGAGEMENT_BLOB_URL + cacheBuster) : Promise.resolve(null),
                ]);
                const fbProfile = fbProfileRes?.ok ? await fbProfileRes.json() : {};
                const fbEngagement = fbEngagementRes?.ok ? await fbEngagementRes.json() : {};
                const merged = { last_updated: fbEngagement.last_updated || fbProfile.last_updated, last_synced: fbEngagement.last_synced || fbProfile.last_synced, companies: {} };
                const allKeys = new Set([...Object.keys(fbProfile.companies || {}), ...Object.keys(fbEngagement.companies || {})]);
                allKeys.forEach(key => {
                    merged.companies[key] = { ...(fbProfile.companies || {})[key], ...(fbEngagement.companies || {})[key] };
                });
                setFacebookData(merged);
            } catch (error) { }

            try {
                const [igProfileRes, igEngagementRes] = await Promise.all([
                    IG_PROFILE_BLOB_URL ? fetch(IG_PROFILE_BLOB_URL + cacheBuster) : Promise.resolve(null),
                    IG_ENGAGEMENT_BLOB_URL ? fetch(IG_ENGAGEMENT_BLOB_URL + cacheBuster) : Promise.resolve(null),
                ]);
                const igProfile = igProfileRes?.ok ? await igProfileRes.json() : {};
                const igEngagement = igEngagementRes?.ok ? await igEngagementRes.json() : {};
                const merged = { last_updated: igEngagement.last_updated || igProfile.last_updated, last_synced: igEngagement.last_synced || igProfile.last_synced, companies: {} };
                const allKeys = new Set([...Object.keys(igProfile.companies || {}), ...Object.keys(igEngagement.companies || {})]);
                allKeys.forEach(key => {
                    merged.companies[key] = { ...(igProfile.companies || {})[key], ...(igEngagement.companies || {})[key] };
                });
                setInstagramData(merged);
            } catch (error) { }

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
            const items = platform === 'instagram'
                ? (channelData.media || [])
                : (channelData.posts || []);

            items.forEach(item => {
                const current = item.current || {};
                allPosts.push({
                    id: item.post_id || item.media_id || item.post_urn || item.id || `${channelKey}-${item.created_at}`,
                    text: item.message || item.caption || item.text || '',
                    channel: getChannelDisplayName(channelKey),
                    channelKey,
                    createdAt: item.created_at || '',
                    permalink: item.permalink || '',
                    mediaType: item.media_type || '',
                    impressions: platform === 'facebook'
                        ? (current.views || current.impressions_unique || 0)
                        : platform === 'instagram'
                        ? (current.views || current.reach || 0)
                        : (current.impressions || 0),
                    reach: current.reach || current.impressions_unique || 0,
                    engagements: current.engagements || current.total_interactions || 0,
                    engagementRate: (() => {
                        if (platform === 'linkedin') {
                            const imp = current.impressions || 0;
                            return imp > 0 ? ((current.engagements || 0) / imp) * 100 : 0;
                        }
                        const reach = current.reach || current.impressions_unique || 0;
                        if (!reach) return 0;
                        if (platform === 'instagram') return ((current.total_interactions || 0) / reach) * 100;
                        return ((current.engagements || 0) / reach) * 100;
                    })(),
                    clicks: current.clicks || 0,
                    reactions: current.reactions_total || current.reactions || current.likes || 0,
                    comments: current.comments || 0,
                    reposts: current.shares || current.reposts || 0,
                    saved: current.saved || 0,
                    views: current.views || 0,
                    imageUrl: item.image_url || item.media_url || '',
                    thumbnailUrl: item.thumbnail_url || '',
                    history: item.history || [],
                    dailyDeltas: item.daily_deltas || [],
                });
            });
        });

        allPosts.sort((a, b) => {
            const aDate = new Date(a.createdAt || 0);
            const bDate = new Date(b.createdAt || 0);
            return bDate - aDate;
        });
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

            if (platform === 'facebook') {
                const pageViews = ch.daily_page_views || [];
                const totalPageViews = pageViews.reduce((sum, d) => sum + (d.page_views_total || 0), 0);
                const dailyFollows = ch.daily_followers || [];
                const totalFollowActions = dailyFollows.reduce((sum, d) => sum + (d.page_follows || 0), 0);
                setProfileData({
                    totalFollowers: ch.followers_count || ch.fan_count || 0,
                    pageName: ch.page_name || '',
                    about: ch.about || '',
                    website: ch.website || '',
                    totalPageViews,
                    totalFollowActions,
                    demographics: {},
                });
            } else if (platform === 'instagram') {
                setProfileData({
                    totalFollowers: ch.followers_count || 0,
                    username: ch.username || '',
                    name: ch.name || '',
                    biography: ch.biography || '',
                    website: ch.website || '',
                    followsCount: ch.follows_count || 0,
                    mediaCount: ch.media_count || 0,
                    demographics: ch.audience_demographics || {},
                });
            } else {
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
            }
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
        return Object.keys(companies).map(key => {
            const ch = companies[key];
            const postCount = (ch.posts || ch.media || []).length;
            return { key, name: getChannelDisplayName(key), postCount };
        });
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
        const totalReach = filteredData.reduce((sum, p) => sum + (p.reach || 0), 0);
        const rateDenominator = platform === 'linkedin' ? totalImpressions : totalReach;
        const avgEngagementRate = rateDenominator > 0 ? (totalEngagements / rateDenominator * 100) : 0;
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

    const getModalPostIndex = () => {
        if (!selectedPost || !filteredData.length) return -1;
        return filteredData.findIndex(p => p.id === selectedPost.id);
    };

    const navigatePost = (direction) => {
        const idx = getModalPostIndex();
        if (idx === -1) return;
        const nextIdx = direction === 'next' ? idx + 1 : idx - 1;
        if (nextIdx >= 0 && nextIdx < filteredData.length) {
            setSelectedPost(filteredData[nextIdx]);
        }
    };

    useEffect(() => {
        if (!isModalOpen) return;

        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                if (!event.target.closest('.modal-nav-arrow')) {
                    closePostModal();
                }
            }
        };

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                closePostModal();
            } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                navigatePost('prev');
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                navigatePost('next');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isModalOpen, selectedPost, filteredData]);

    const handlePlatformChange = (newPlatform) => {
        setPlatform(newPlatform);
        setCurrentPage(1);
        setViewMode('all');
        setSelectedChannels([]);
        setContentMode('posts');
        setSelectedProfileChannel('');
    };

    const exportToCSV = () => {
        const isIg = platform === 'instagram';
        const isFbExport = platform === 'facebook';
        const headers = ['Text', 'Channel', 'Date', 'Impressions', 'Engagements', 'Eng. Rate', isIg ? 'Likes' : 'Clicks'];

        const rows = filteredData.map(item => [
            item.text,
            item.channel,
            item.createdAt,
            item.impressions,
            item.engagements,
            item.engagementRate?.toFixed(2) || '0',
            isIg ? item.reactions : item.clicks,
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
    const hasFreshSyncDate = platformData.last_synced && platformData.last_updated && platformData.last_synced >= platformData.last_updated;
    const lastSynced = hasFreshSyncDate ? platformData.last_synced : platformData.last_updated;
    const dataThrough = platformData.last_updated;

    const isIg = platform === 'instagram';
    const isFb = platform === 'facebook';
    const lastColField = isIg ? 'reactions' : 'clicks';

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
                        <div className="metric-summary-label">Total {isIg ? 'Media' : 'Posts'}</div>
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
                        <div className="metric-summary-label">{isIg ? 'Likes' : 'Clicks'}</div>
                        <div className="metric-summary-value">{formatNumber(isIg ? aggregateMetrics.totalReactions : aggregateMetrics.totalClicks)}</div>
                    </div>
                </div>
            )}

            {contentMode === 'profile' && profileData && (
                <div className="social-metrics-summary">
                    <div className="metric-summary-card">
                        <div className="metric-summary-label">Total Followers</div>
                        <div className="metric-summary-value">{formatNumber(profileData.totalFollowers)}</div>
                    </div>
                    {platform === 'facebook' && (
                        <>
                            <div className="metric-summary-card">
                                <div className="metric-summary-label">Follow Actions</div>
                                <div className="metric-summary-value">{formatNumber(profileData.totalFollowActions)}</div>
                            </div>
                            <div className="metric-summary-card">
                                <div className="metric-summary-label">Total Page Views</div>
                                <div className="metric-summary-value">{formatNumber(profileData.totalPageViews)}</div>
                            </div>
                        </>
                    )}
                    {platform === 'instagram' && (
                        <>
                            <div className="metric-summary-card">
                                <div className="metric-summary-label">Following</div>
                                <div className="metric-summary-value">{formatNumber(profileData.followsCount)}</div>
                            </div>
                            <div className="metric-summary-card">
                                <div className="metric-summary-label">Media Count</div>
                                <div className="metric-summary-value">{formatNumber(profileData.mediaCount)}</div>
                            </div>
                        </>
                    )}
                    {platform === 'linkedin' && (
                        <>
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
                        </>
                    )}
                </div>
            )}

            {isLoading ? (
                <div className="loading-indicator">Loading social data...</div>
            ) : (
                <div className="table-section">
                    <div className="table-header-row">
                        <h2 className="table-title">
                            {platform === 'linkedin' ? 'LinkedIn' : platform === 'instagram' ? 'Instagram' : 'Facebook'} {contentMode === 'posts' ? (isIg ? 'Media' : 'Posts') : 'Profile'}
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
                            {contentMode === 'posts' && channels.length > 1 && (
                                <div className="playlist-toggle">
                                    <div
                                        className={`playlist-toggle-option ${viewMode === 'all' ? 'active' : ''}`}
                                        onClick={() => { setViewMode('all'); setSelectedChannels([]); }}
                                    >
                                        All {isIg ? 'Media' : 'Posts'} ({postsList.length})
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
                            {lastSynced && (
                                <div className="last-updated-tag">
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M7 4V7L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    <span>Last synced: {(() => { const d = new Date(lastSynced + (lastSynced.length === 10 ? 'T00:00:00' : '')); if (!hasFreshSyncDate) d.setDate(d.getDate() + 1); const now = new Date(); const diff = Math.floor((now - d) / 86400000); if (diff === 0) return 'Today'; if (diff === 1) return 'Yesterday'; if (diff < 7) return `${diff} days ago`; return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); })()}{dataThrough ? ` | Data through: ${new Date(dataThrough + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}</span>
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
                                        <th className="metric-column sortable" onClick={() => handleSort(lastColField)}>
                                            {isIg ? 'Likes' : 'Clicks'} {renderSortIndicator(lastColField)}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentRows.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#8a8a8a' }}>
                                                No {isIg ? 'media' : 'posts'} data available. Data will appear once the {platform} JSON file is configured.
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
                                                <td className="metric-column">{formatNumber(isIg ? item.reactions : item.clicks)}</td>
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
                                    {platform === 'linkedin' && (
                                        <>
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
                                        </>
                                    )}
                                    {platform === 'facebook' && (
                                        <div className="profile-info-section">
                                            {profileData.pageName && <p><strong>Page:</strong> {profileData.pageName}</p>}
                                            {profileData.about && <p><strong>About:</strong> {profileData.about}</p>}
                                            {profileData.website && <p><strong>Website:</strong> {profileData.website}</p>}
                                        </div>
                                    )}
                                    {platform === 'instagram' && (
                                        <div className="profile-info-section">
                                            {profileData.username && <p><strong>Username:</strong> @{profileData.username}</p>}
                                            {profileData.name && <p><strong>Name:</strong> {profileData.name}</p>}
                                            {profileData.biography && <p><strong>Bio:</strong> {profileData.biography}</p>}
                                            {profileData.website && <p><strong>Website:</strong> {profileData.website}</p>}
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

            {isModalOpen && selectedPost && (() => {
                const modalIdx = getModalPostIndex();
                const hasPrev = modalIdx > 0;
                const hasNext = modalIdx >= 0 && modalIdx < filteredData.length - 1;

                return (
                    <div className="social-modal-overlay">
                        {hasPrev && (
                            <button
                                className="modal-nav-arrow modal-nav-left"
                                onClick={() => navigatePost('prev')}
                                aria-label="Previous post"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                            </button>
                        )}
                        {hasNext && (
                            <button
                                className="modal-nav-arrow modal-nav-right"
                                onClick={() => navigatePost('next')}
                                aria-label="Next post"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                            </button>
                        )}

                        <div className="social-modal" ref={modalRef}>
                            <div className="social-modal-header">
                                <h3>{selectedPost.channel} — {isIg ? 'Media' : 'Post'} Details</h3>
                                <button className="modal-close-button" onClick={closePostModal}>&times;</button>
                            </div>

                            {(selectedPost.imageUrl || selectedPost.thumbnailUrl) ? (
                                <div className="social-modal-preview">
                                    <div className="social-thumbnail-preview">
                                        <img
                                            src={selectedPost.imageUrl || selectedPost.thumbnailUrl}
                                            alt={selectedPost.text ? selectedPost.text.substring(0, 60) : 'Post image'}
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                        {selectedPost.mediaType && (
                                            <div className="social-media-badge">{selectedPost.mediaType}</div>
                                        )}
                                    </div>
                                    <div className="social-preview-details">
                                        <div className="social-preview-pills">
                                            <div className="info-pill">
                                                <span className="info-label">Platform</span>
                                                <span className="info-value">{platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
                                            </div>
                                            <div className="info-pill">
                                                <span className="info-label">Channel</span>
                                                <span className="info-value">
                                                    <span className="channel-badge" style={{ '--channel-color': CHANNEL_COLORS[selectedPost.channel] || '#575757' }}>
                                                        {selectedPost.channel}
                                                    </span>
                                                </span>
                                            </div>
                                            <div className="info-pill">
                                                <span className="info-label">Posted</span>
                                                <span className="info-value">{formatDate(selectedPost.createdAt)}</span>
                                            </div>
                                            {selectedPost.mediaType && (
                                                <div className="info-pill">
                                                    <span className="info-label">Type</span>
                                                    <span className="info-value">{selectedPost.mediaType}</span>
                                                </div>
                                            )}
                                        </div>
                                        {selectedPost.text && (
                                            <div className="social-preview-text">{selectedPost.text}</div>
                                        )}
                                        {selectedPost.permalink && (
                                            <a href={selectedPost.permalink} target="_blank" rel="noopener noreferrer" className="social-preview-link">
                                                {selectedPost.permalink}
                                            </a>
                                        )}
                                        <span className="social-modal-position">{modalIdx + 1} of {filteredData.length}</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="social-modal-info">
                                        <div className="social-modal-info-left">
                                            <div className="info-pill">
                                                <span className="info-label">Platform</span>
                                                <span className="info-value">{platform.charAt(0).toUpperCase() + platform.slice(1)}</span>
                                            </div>
                                            <div className="info-pill">
                                                <span className="info-label">Channel</span>
                                                <span className="info-value">
                                                    <span className="channel-badge" style={{ '--channel-color': CHANNEL_COLORS[selectedPost.channel] || '#575757' }}>
                                                        {selectedPost.channel}
                                                    </span>
                                                </span>
                                            </div>
                                            <div className="info-pill">
                                                <span className="info-label">Posted</span>
                                                <span className="info-value">{formatDate(selectedPost.createdAt)}</span>
                                            </div>
                                            {selectedPost.mediaType && (
                                                <div className="info-pill">
                                                    <span className="info-label">Type</span>
                                                    <span className="info-value">{selectedPost.mediaType}</span>
                                                </div>
                                            )}
                                        </div>
                                        <span className="social-modal-position">{modalIdx + 1} of {filteredData.length}</span>
                                    </div>

                                    {selectedPost.text && (
                                        <div className="social-modal-post-text">
                                            <span className="post-text-label">{isIg ? 'Caption' : 'Post'}</span>
                                            <span className="post-text-value">{selectedPost.text}</span>
                                        </div>
                                    )}

                                    {selectedPost.permalink && (
                                        <div className="social-modal-url">
                                            <a href={selectedPost.permalink} target="_blank" rel="noopener noreferrer">{selectedPost.permalink}</a>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="social-modal-metrics-top">
                                <div className="social-metric-card large-card">
                                    <div className="metric-label">Impressions</div>
                                    <div className="metric-value">{formatNumber(selectedPost.impressions)}</div>
                                </div>
                                {(isFb || isIg) && (
                                    <div className="social-metric-card large-card">
                                        <div className="metric-label">Reach</div>
                                        <div className="metric-value">{formatNumber(selectedPost.reach)}</div>
                                    </div>
                                )}
                                <div className="social-metric-card large-card">
                                    <div className="metric-label">Engagements</div>
                                    <div className="metric-value">{formatNumber(selectedPost.engagements)}</div>
                                </div>
                                {!isIg && (
                                    <div className="social-metric-card large-card">
                                        <div className="metric-label">Clicks</div>
                                        <div className="metric-value">{formatNumber(selectedPost.clicks)}</div>
                                    </div>
                                )}
                            </div>

                            <div className="social-modal-details">
                                <div className="social-detail-card">
                                    <h4>Engagement Breakdown</h4>
                                    <table className="detail-table">
                                        <tbody>
                                            <tr>
                                                <td>{isIg ? 'Likes' : 'Reactions'}</td>
                                                <td>{formatNumber(selectedPost.reactions)}</td>
                                            </tr>
                                            <tr>
                                                <td>Comments</td>
                                                <td>{formatNumber(selectedPost.comments)}</td>
                                            </tr>
                                            <tr>
                                                <td>{platform === 'linkedin' ? 'Reposts' : 'Shares'}</td>
                                                <td>{formatNumber(selectedPost.reposts)}</td>
                                            </tr>
                                            {isIg && (
                                                <tr>
                                                    <td>Saved</td>
                                                    <td>{formatNumber(selectedPost.saved)}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="social-detail-card">
                                    <h4>Computed Rates</h4>
                                    <table className="detail-table">
                                        <tbody>
                                            <tr>
                                                <td>Engagement Rate</td>
                                                <td>{formatPercent((() => {
                                                    if (platform === 'linkedin') return selectedPost.impressions > 0 ? (selectedPost.engagements / selectedPost.impressions) * 100 : 0;
                                                    return selectedPost.reach > 0 ? (selectedPost.engagements / selectedPost.reach) * 100 : 0;
                                                })())}</td>
                                            </tr>
                                            {!isIg && (
                                                <tr>
                                                    <td>Click Rate</td>
                                                    <td>{formatPercent(selectedPost.impressions > 0 ? (selectedPost.clicks / selectedPost.impressions) * 100 : 0)}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {selectedPost.dailyDeltas && selectedPost.dailyDeltas.length > 0 && (
                                <div className="social-modal-daily">
                                    <h4>Daily Performance</h4>
                                    <div className="daily-table-container">
                                        <table className="detail-table social-daily-table">
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Impressions</th>
                                                    <th>Engagements</th>
                                                    <th>{isIg ? 'Likes' : 'Reactions'}</th>
                                                    <th>Comments</th>
                                                    <th>Shares</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedPost.dailyDeltas.slice().reverse().slice(0, 30).map((delta, idx) => (
                                                    <tr key={idx}>
                                                        <td>{formatDate(delta.date)}</td>
                                                        <td>{formatNumber(isFb ? (delta.views || delta.impressions_unique || 0) : isIg ? (delta.views || delta.reach || 0) : (delta.impressions || 0))}</td>
                                                        <td>{formatNumber(delta.engagements || delta.total_interactions || 0)}</td>
                                                        <td>{formatNumber(isIg ? (delta.likes || 0) : (delta.reactions_total || delta.reactions || 0))}</td>
                                                        <td>{formatNumber(delta.comments || 0)}</td>
                                                        <td>{formatNumber(delta.shares || 0)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default SocialMetrics;