import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { THEME_INFO, AVAILABLE_METRICS } from './template/LayoutTemplates';
import { API_BASE_URL } from '../../config/api';
import { matchesSearchTerm } from '../../utils/searchUtils';
import '../../styles/DashboardBuilder.css';

const WALSWORTH_BLOB_URL = "https://emaildash.blob.core.windows.net/json-data/walsworth_metrics.json?sp=r&st=2026-01-15T18:57:16Z&se=2027-09-24T02:12:16Z&spr=https&sv=2024-11-04&sr=b&sig=w1q9PY%2FMzuTUvwwOV%2Bcub%2FV7Cygeff3ESRaC2l1KvPM%3D";
const YOUTUBE_BLOB_URL = "https://emaildash.blob.core.windows.net/json-data/youtube_metrics.json?sp=r&st=2026-01-23T22:10:53Z&se=2028-02-03T06:25:53Z&spr=https&sv=2024-11-04&sr=b&sig=5a4p0mFtPn4d9In830LMCQOJlaqkcuPCt7okIDLSHBA%3D";

const LINKEDIN_BLOB_URL = '';
const FB_PROFILE_BLOB_URL = 'https://emaildash.blob.core.windows.net/json-data/facebook_profile_metrics.json?sp=r&st=2026-02-18T21:02:49Z&se=2028-05-21T04:17:49Z&spr=https&sv=2024-11-04&sr=b&sig=uE7Yej8V8qJ6W3FKIzWkexVON7c074h9Xnkd1RWqOPE%3D';
const FB_ENGAGEMENT_BLOB_URL = 'https://emaildash.blob.core.windows.net/json-data/facebook_engagement_metrics.json?sp=r&st=2026-02-18T21:03:59Z&se=2028-05-17T04:18:59Z&spr=https&sv=2024-11-04&sr=b&sig=mZyVxrFi1U5Z234HHVICAxysq73m14Jpm3r%2BzCOzvKs%3D';
const IG_PROFILE_BLOB_URL = 'https://emaildash.blob.core.windows.net/json-data/instagram_profile_metrics.json?sp=r&st=2026-02-18T21:03:17Z&se=2028-05-27T04:18:17Z&spr=https&sv=2024-11-04&sr=b&sig=Iu%2B57JgpeateOx9zTPFEMnOEUMMFA8JMsXX8OPz5SXY%3D';
const IG_ENGAGEMENT_BLOB_URL = 'https://emaildash.blob.core.windows.net/json-data/instagram_engagement_metrics.json?sp=r&st=2026-02-18T21:03:38Z&se=2028-05-16T04:18:38Z&spr=https&sv=2024-11-04&sr=b&sig=ZkHZS8lQQmkvTGjkxy3fFZVUtWNO5WGMOazVdkPNYVI%3D';

const ABBREVIATION_MAP = {
  'nsclc': 'non-small cell lung cancer',
  'sclc': 'small cell lung cancer',
  'rcc': 'renal cell carcinoma',
  'gpp': 'generalized pustular psoriasis',
  'ht': 'hot topics',
  'icns': 'innovations in clinical neuroscience',
  'jcad': 'journal of clinical and aesthetic dermatology',
  'ad': 'atopic dermatitis',
  'hs': 'hidradenitis suppurativa',
  'net': 'neuroendocrine tumor',
  'ibd': 'inflammatory bowel disease',
  'mbc': 'metastatic breast cancer',
  'copd': 'chronic obstructive pulmonary disease',
  'crc': 'colorectal cancer',
  'hcc': 'hepatocellular carcinoma',
  'aml': 'acute myeloid leukemia',
  'cll': 'chronic lymphocytic leukemia',
  'dlbcl': 'diffuse large b-cell lymphoma',
  'pso': 'psoriasis',
  'ra': 'rheumatoid arthritis',
  'ms': 'multiple sclerosis',
  'uc': 'ulcerative colitis',
  'cd': 'crohn disease'
};

const REVERSE_ABBREVIATION_MAP = Object.fromEntries(
  Object.entries(ABBREVIATION_MAP).map(([abbr, full]) => [full, abbr])
);

const expandAbbreviations = (text) => {
  if (!text) return [text];
  const lower = text.toLowerCase();
  const variants = new Set([lower]);

  const words = lower.split(/[\s\-_]+/);
  const expandedWords = words.map(w => {
    if (ABBREVIATION_MAP[w]) return [w, ABBREVIATION_MAP[w]];
    if (REVERSE_ABBREVIATION_MAP[w]) return [w, REVERSE_ABBREVIATION_MAP[w]];
    return [w];
  });

  const expanded = words.map(w => ABBREVIATION_MAP[w] || w).join(' ');
  variants.add(expanded);

  let collapsed = lower;
  for (const [full, abbr] of Object.entries(REVERSE_ABBREVIATION_MAP)) {
    if (collapsed.includes(full)) {
      collapsed = collapsed.replace(full, abbr);
    }
  }
  variants.add(collapsed);

  return Array.from(variants);
};

const ComponentSidebar = ({
  isOpen,
  onToggle,
  campaigns = [],
  selectedCampaign,
  selectedMultiCampaigns = [],
  currentTheme,
  costComparisonMode,
  showTotalSends,
  specialtyMergeMode,
  onThemeChange,
  onCostModeChange,
  onTotalSendsToggle,
  onCampaignChange,
  onToggleSpecialtyMerge,
  onAddComponent,
  deletedCards = [],
  onRestoreCard,
  budgetedCost,
  actualCost,
  onBudgetedCostChange,
  onActualCostChange,
  currentTemplate = 'single',
  onRestoreDashboard,
  selectedRowInfo = null,
  onAddJournalMetricRow,
  hasJournalTable = false,
  onAddVideoMetricRow,
  hasVideoTable = false,
  bannerImpressionsMode = false,
  onBannerImpressionsModeToggle,
  onAddThumbnails,
  thumbnailOverlayEnabled = false,
  onThumbnailOverlayToggle,
  showPharmaLogo = true,
  onShowPharmaLogoToggle,
  showBottomLogo = true,
  onShowBottomLogoToggle,
  onAddJournalCover,
  onAddSocialMetricRow,
  hasSocialTable = false,
  onAddSocialPosts,
  socialPostOverlayEnabled = false,
  onSocialPostOverlayToggle
}) => {
  const effectiveCampaignName = selectedCampaign?.campaign_name
    || (selectedMultiCampaigns && selectedMultiCampaigns.length > 0 ? selectedMultiCampaigns[0]?.campaign_name : null);

  const [activeSection, setActiveSection] = useState('controls');
  const [searchTerm, setSearchTerm] = useState('');

  const [savedDashboards, setSavedDashboards] = useState([]);
  const [loadingDashboards, setLoadingDashboards] = useState(false);
  const [archiveSearchTerm, setArchiveSearchTerm] = useState('');

  const [walsworthData, setWalsworthData] = useState([]);
  const [selectedPublication, setSelectedPublication] = useState(null);
  const [selectedIssueIds, setSelectedIssueIds] = useState(new Set());
  const [showPublicationSelector, setShowPublicationSelector] = useState(false);
  const [showIssueList, setShowIssueList] = useState(false);
  const [journalSearchTerm, setJournalSearchTerm] = useState('');

  const [youtubeData, setYoutubeData] = useState({ videos: {}, playlists: {} });
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
  const [excludedVideoIds, setExcludedVideoIds] = useState(new Set());
  const [showVideoDropdown, setShowVideoDropdown] = useState(false);

  const [socialData, setSocialData] = useState({ facebook: {}, instagram: {} });
  const [enabledPlatforms, setEnabledPlatforms] = useState(new Set(['facebook', 'instagram']));
  const [selectedPostIds, setSelectedPostIds] = useState(new Set());
  const [showSocialPostDropdown, setShowSocialPostDropdown] = useState(false);
  const [socialPostSearchTerm, setSocialPostSearchTerm] = useState('');
  const [videoSearchTerm, setVideoSearchTerm] = useState('');
  const [issueSearchTerm, setIssueSearchTerm] = useState('');

  useEffect(() => {
    async function fetchYoutubeData() {
      try {
        const response = await fetch(YOUTUBE_BLOB_URL);
        const data = await response.json();
        setYoutubeData(data);
      } catch (error) {
      }
    }
    fetchYoutubeData();
  }, []);

  useEffect(() => {
    async function fetchSocialData() {
      try {
        const [fbProfileRes, fbEngagementRes] = await Promise.all([
          FB_PROFILE_BLOB_URL ? fetch(FB_PROFILE_BLOB_URL) : Promise.resolve(null),
          FB_ENGAGEMENT_BLOB_URL ? fetch(FB_ENGAGEMENT_BLOB_URL) : Promise.resolve(null),
        ]);
        const fbProfile = fbProfileRes?.ok ? await fbProfileRes.json() : {};
        const fbEngagement = fbEngagementRes?.ok ? await fbEngagementRes.json() : {};
        const fbMerged = { companies: {} };
        const fbKeys = new Set([...Object.keys(fbProfile.companies || {}), ...Object.keys(fbEngagement.companies || {})]);
        fbKeys.forEach(key => {
          fbMerged.companies[key] = { ...(fbProfile.companies || {})[key], ...(fbEngagement.companies || {})[key] };
        });

        const [igProfileRes, igEngagementRes] = await Promise.all([
          IG_PROFILE_BLOB_URL ? fetch(IG_PROFILE_BLOB_URL) : Promise.resolve(null),
          IG_ENGAGEMENT_BLOB_URL ? fetch(IG_ENGAGEMENT_BLOB_URL) : Promise.resolve(null),
        ]);
        const igProfile = igProfileRes?.ok ? await igProfileRes.json() : {};
        const igEngagement = igEngagementRes?.ok ? await igEngagementRes.json() : {};
        const igMerged = { companies: {} };
        const igKeys = new Set([...Object.keys(igProfile.companies || {}), ...Object.keys(igEngagement.companies || {})]);
        igKeys.forEach(key => {
          igMerged.companies[key] = { ...(igProfile.companies || {})[key], ...(igEngagement.companies || {})[key] };
        });

        setSocialData({ facebook: fbMerged, instagram: igMerged });
      } catch (error) {
      }
    }
    fetchSocialData();
  }, []);

  const youtubePlaylistsList = useMemo(() => {
    const playlists = youtubeData.playlists || {};
    return Object.entries(playlists).map(([id, pl]) => ({
      id,
      title: pl.title,
      itemCount: pl.itemCount,
      videoIds: pl.videoIds || []
    })).sort((a, b) => b.itemCount - a.itemCount);
  }, [youtubeData]);

  const selectedPlaylist = useMemo(() => {
    if (!selectedPlaylistId) return null;
    return youtubePlaylistsList.find(pl => pl.id === selectedPlaylistId) || null;
  }, [selectedPlaylistId, youtubePlaylistsList]);

  const playlistVideos = useMemo(() => {
    if (!selectedPlaylist) return [];
    const videosObj = youtubeData.videos || {};
    return selectedPlaylist.videoIds
      .map(vid => {
        const video = videosObj[vid];
        if (!video) return null;
        const current = video.current || {};
        return {
          id: vid,
          title: video.title || 'Untitled',
          views: current.views || 0,
          totalWatchTimeSeconds: (current.watchTimeHours || (current.estimatedMinutesWatched || 0) / 60) * 3600,
          avgPercentWatched: current.averageViewPercentage || 0,
          publishedAt: video.publishedAt || null
        };
      })
      .filter(Boolean);
  }, [selectedPlaylist, youtubeData]);

  const videoAggregateMetrics = useMemo(() => {
    if (!playlistVideos.length) return { totalWatchTime: 0, avgPercentWatched: 0, totalViews: 0, mostWatchedVideo: '' };
    const activeVideos = playlistVideos.filter(v => !excludedVideoIds.has(v.id));
    if (!activeVideos.length) return { totalWatchTime: 0, avgPercentWatched: 0, totalViews: 0, mostWatchedVideo: '' };

    const totalViews = activeVideos.reduce((sum, v) => sum + v.views, 0);
    const avgPercentWatched = activeVideos.reduce((sum, v) => sum + v.avgPercentWatched, 0) / activeVideos.length;
    const totalWatchTime = activeVideos.reduce((sum, v) => sum + v.totalWatchTimeSeconds, 0);
    const mostWatched = activeVideos.reduce((best, v) => v.views > best.views ? v : best, activeVideos[0]);

    return { totalWatchTime, avgPercentWatched, totalViews, mostWatchedVideo: mostWatched.title };
  }, [playlistVideos, excludedVideoIds]);

  const getChannelDisplayName = (key) => {
    const mapping = { 'matrix': 'Matrix', 'oncology': 'Oncology', 'icns': 'ICNS', 'jcad': 'JCAD', 'nppa': 'NPPA' };
    return mapping[key] || key.charAt(0).toUpperCase() + key.slice(1);
  };

  const allSocialPosts = useMemo(() => {
    const posts = [];
    for (const platform of enabledPlatforms) {
      const platformData = socialData[platform] || {};
      const companies = platformData.companies || {};
      Object.entries(companies).forEach(([channelKey, channelData]) => {
        const items = platform === 'instagram' ? (channelData.media || []) : (channelData.posts || []);
        items.forEach(item => {
          const current = item.current || {};
          posts.push({
            id: item.post_id || item.media_id || item.post_urn || item.id || `${channelKey}-${item.created_at}`,
            text: item.message || item.caption || item.text || '',
            channel: getChannelDisplayName(channelKey),
            channelKey,
            platform,
            createdAt: item.created_at || '',
            permalink: item.permalink || '',
            mediaType: item.media_type || '',
            impressions: current.impressions_unique || current.reach || current.impressions || 0,
            engagements: current.engagements || current.total_interactions || 0,
            engagementRate: current.engagement_rate || 0,
            clicks: current.clicks || 0,
            reactions: current.reactions_total || current.reactions || current.likes || 0,
            comments: current.comments || 0,
            reposts: current.shares || current.reposts || 0,
            saved: current.saved || 0,
            views: current.views || 0,
            imageUrl: item.image_url || item.media_url || '',
            thumbnailUrl: item.thumbnail_url || ''
          });
        });
      });
    }
    posts.sort((a, b) => (b.engagements || 0) - (a.engagements || 0));
    return posts;
  }, [socialData, enabledPlatforms]);

  const activeSocialPosts = useMemo(() => {
    return allSocialPosts.filter(p => selectedPostIds.has(p.id));
  }, [allSocialPosts, selectedPostIds]);

  const socialAggregateMetrics = useMemo(() => {
    if (!activeSocialPosts.length) return {
      totalImpressions: 0, totalEngagements: 0, avgEngagementRate: 0,
      totalReactions: 0, totalComments: 0, totalShares: 0, totalClicks: 0, mostEngagedPost: ''
    };
    const totalImpressions = activeSocialPosts.reduce((sum, p) => sum + p.impressions, 0);
    const totalEngagements = activeSocialPosts.reduce((sum, p) => sum + p.engagements, 0);
    const avgEngagementRate = activeSocialPosts.reduce((sum, p) => sum + p.engagementRate, 0) / activeSocialPosts.length;
    const totalReactions = activeSocialPosts.reduce((sum, p) => sum + p.reactions, 0);
    const totalComments = activeSocialPosts.reduce((sum, p) => sum + p.comments, 0);
    const totalShares = activeSocialPosts.reduce((sum, p) => sum + p.reposts, 0);
    const totalClicks = activeSocialPosts.reduce((sum, p) => sum + p.clicks, 0);
    const mostEngaged = activeSocialPosts.reduce((best, p) => p.engagements > best.engagements ? p : best, activeSocialPosts[0]);
    return { totalImpressions, totalEngagements, avgEngagementRate, totalReactions, totalComments, totalShares, totalClicks, mostEngagedPost: mostEngaged.text };
  }, [activeSocialPosts]);

  const togglePlatform = useCallback((platform) => {
    setEnabledPlatforms(prev => {
      const next = new Set(prev);
      if (next.has(platform)) {
        next.delete(platform);
      } else {
        next.add(platform);
      }
      return next;
    });
    setSelectedPostIds(new Set());
  }, []);

  const togglePostSelection = useCallback((postId) => {
    setSelectedPostIds(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  }, []);

  const handleAddSocialMetric = useCallback((metricKey, value, label) => {
    if (onAddSocialMetricRow) {
      onAddSocialMetricRow(label, value);
    }
  }, [onAddSocialMetricRow]);

  const formatVideoWatchTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0s";
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
    }
    return `${s}s`;
  };

  const handleAddVideoMetric = useCallback((metricKey, value, label) => {
    if (onAddVideoMetricRow) {
      onAddVideoMetricRow(label, value);
    }
  }, [onAddVideoMetricRow]);

  const handleSelectPlaylist = useCallback((playlist) => {
    setSelectedPlaylistId(playlist.id);
    setShowPlaylistSelector(false);
    setExcludedVideoIds(new Set());
  }, []);

  const rankedPlaylists = useMemo(() => {
    if (!effectiveCampaignName || youtubePlaylistsList.length === 0) {
      return { topMatches: [], remaining: youtubePlaylistsList };
    }
    const campaignVariants = expandAbbreviations(effectiveCampaignName);
    const campaignLower = effectiveCampaignName.toLowerCase();
    const campaignWords = campaignLower.split(/[\s\-_]+/).filter(w => w.length > 2);

    const diseaseKeywords = [
      'nsclc', 'sclc', 'rcc', 'gpp', 'ad', 'hs', 'net', 'ibd', 'mbc', 'copd',
      'non-small cell lung cancer', 'small cell lung cancer', 'renal cell carcinoma',
      'generalized pustular psoriasis', 'atopic dermatitis', 'hidradenitis suppurativa',
      'neuroendocrine tumor', 'inflammatory bowel disease', 'metastatic breast cancer',
      'chronic obstructive pulmonary disease', 'psoriasis', 'melanoma', 'oncology',
      'dermatology', 'breast cancer', 'lung', 'kras', 'bariatric'
    ];

    const scored = youtubePlaylistsList.map(pl => {
      const titleVariants = expandAbbreviations(pl.title);
      let score = 0;
      for (const kw of diseaseKeywords) {
        const kwInCampaign = campaignVariants.some(v => v.includes(kw));
        const kwInTitle = titleVariants.some(v => v.includes(kw));
        if (kwInCampaign && kwInTitle) score += 15;
      }
      for (const word of campaignWords) {
        if (pl.title.toLowerCase().includes(word) && !diseaseKeywords.includes(word)) {
          score += 5;
        }
      }
      return { ...pl, matchScore: score };
    }).sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return b.itemCount - a.itemCount;
    });

    const topMatches = scored.filter(p => p.matchScore > 0).slice(0, 3);
    const topIds = new Set(topMatches.map(p => p.id));
    const remaining = scored.filter(p => !topIds.has(p.id));
    return { topMatches, remaining };
  }, [effectiveCampaignName, youtubePlaylistsList]);

  useEffect(() => {
    if (effectiveCampaignName && !selectedPlaylistId && rankedPlaylists.topMatches.length > 0) {
      setSelectedPlaylistId(rankedPlaylists.topMatches[0].id);
      setExcludedVideoIds(new Set());
    }
  }, [effectiveCampaignName, rankedPlaylists.topMatches, selectedPlaylistId]);

  const toggleVideoExclusion = useCallback((videoId) => {
    setExcludedVideoIds(prev => {
      const next = new Set(prev);
      if (next.has(videoId)) {
        next.delete(videoId);
      } else {
        next.add(videoId);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    async function fetchWalsworthData() {
      try {
        const response = await fetch(WALSWORTH_BLOB_URL);
        const data = await response.json();
        if (data.issues) {
          setWalsworthData(data.issues);
        }
      } catch (error) {
      }
    }
    fetchWalsworthData();
  }, []);

  const getIssueDateScore = useCallback((issueName) => {
    const name = (issueName || '').toLowerCase();
    const yearMatch = name.match(/20\d{2}/);
    const year = yearMatch ? parseInt(yearMatch[0]) : 0;
    const monthOrder = {
      'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
      'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12
    };
    let month = 0;
    for (const [monthName, monthNum] of Object.entries(monthOrder)) {
      if (name.includes(monthName)) {
        month = Math.max(month, monthNum);
      }
    }
    return year * 100 + month;
  }, []);

  const publicationsGrouped = useMemo(() => {
    if (!walsworthData.length) return [];
    const groups = {};
    for (const issue of walsworthData) {
      const pub = issue.publication || 'Unknown';
      if (!groups[pub]) groups[pub] = [];
      groups[pub].push(issue);
    }
    for (const pub of Object.keys(groups)) {
      groups[pub].sort((a, b) => getIssueDateScore(b.issue_name) - getIssueDateScore(a.issue_name));
    }
    return Object.entries(groups).map(([publication, issues]) => ({ publication, issues }));
  }, [walsworthData, getIssueDateScore]);

  const matchPublicationToCampaign = useCallback((campaignName) => {
    if (!campaignName || publicationsGrouped.length === 0) return [];

    const campaignVariants = expandAbbreviations(campaignName);
    const campaignLower = campaignName.toLowerCase();
    const campaignWords = campaignLower.split(/[\s\-_]+/).filter(w => w.length > 2);

    const diseaseKeywords = [
      'inflammatory', 'myeloma', 'breast cancer', 'nsclc', 'lung', 'dermatology', 'melanoma',
      'alopecia', 'prurigo', 'gpp', 'psoriasis', 'eczema', 'acne', 'rosacea', 'vitiligo',
      'atopic', 'hidradenitis', 'net', 'rcc', 'sclc', 'oncology', 'bariatric',
      'non-small cell lung cancer', 'small cell lung cancer', 'renal cell carcinoma',
      'generalized pustular psoriasis', 'atopic dermatitis', 'hidradenitis suppurativa',
      'neuroendocrine tumor', 'inflammatory bowel disease', 'metastatic breast cancer',
      'chronic obstructive pulmonary disease', 'kras'
    ];

    return publicationsGrouped.map(({ publication, issues }) => {
      const pubLower = publication.toLowerCase();
      const pubVariants = expandAbbreviations(publication);
      let score = 0;

      const pubTypes = ['hot topics', 'ht', 'jcad', 'journal of clinical and aesthetic dermatology', 'icns', 'innovations in clinical neuroscience', 'jcad np+pa'];
      for (const pt of pubTypes) {
        const ptInCampaign = campaignVariants.some(v => v.includes(pt));
        const ptInPub = pubVariants.some(v => v.includes(pt));
        if (ptInCampaign && ptInPub) {
          score += 25;
          break;
        }
      }

      for (const kw of diseaseKeywords) {
        const kwInCampaign = campaignVariants.some(v => v.includes(kw));
        const kwInPub = pubVariants.some(v => v.includes(kw));
        if (kwInCampaign && kwInPub) {
          score += 15;
        }
      }

      for (const word of campaignWords) {
        if (pubLower.includes(word) && !diseaseKeywords.includes(word) && !pubTypes.includes(word)) {
          score += 5;
        }
      }

      return { publication, issues, matchScore: score };
    }).sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return a.publication.localeCompare(b.publication);
    });
  }, [publicationsGrouped]);

  const rankedPublications = useMemo(() => {
    if (!effectiveCampaignName) return { topMatches: [], remaining: [] };
    const all = matchPublicationToCampaign(effectiveCampaignName);
    const topMatches = all.filter(p => p.matchScore > 0).slice(0, 3);
    const topPubNames = new Set(topMatches.map(p => p.publication));
    const remaining = all.filter(p => !topPubNames.has(p.publication));
    return { topMatches, remaining };
  }, [effectiveCampaignName, matchPublicationToCampaign]);

  const filteredTopPublications = useMemo(() => {
    if (!journalSearchTerm.trim()) return rankedPublications.topMatches;
    return rankedPublications.topMatches.filter(p => matchesSearchTerm(p.publication, journalSearchTerm));
  }, [rankedPublications.topMatches, journalSearchTerm]);

  const filteredRemainingPublications = useMemo(() => {
    if (!journalSearchTerm.trim()) return rankedPublications.remaining;
    return rankedPublications.remaining.filter(p => matchesSearchTerm(p.publication, journalSearchTerm));
  }, [rankedPublications.remaining, journalSearchTerm]);

  const selectedIssues = useMemo(() => {
    if (!selectedPublication) return [];
    return selectedPublication.issues.filter(i => selectedIssueIds.has(i.issue_name));
  }, [selectedPublication, selectedIssueIds]);

  const journalAggregateMetrics = useMemo(() => {
    if (!selectedIssues.length) return { avgTime: 0, totalPageViews: 0, uniquePageViews: 0, totalIssueVisits: 0 };
    const totalPageViews = selectedIssues.reduce((sum, i) => sum + (i.current?.total_page_views || 0), 0);
    const uniquePageViews = selectedIssues.reduce((sum, i) => sum + (i.current?.unique_page_views || 0), 0);
    const totalIssueVisits = selectedIssues.reduce((sum, i) => sum + (i.current?.total_issue_visits || 0), 0);
    const totalWeight = selectedIssues.reduce((sum, i) => sum + (i.current?.total_page_views || 1), 0);
    const avgTime = selectedIssues.reduce((sum, i) => {
      const weight = i.current?.total_page_views || 1;
      return sum + (i.current?.seconds_per_visit || 0) * weight;
    }, 0) / (totalWeight || 1);
    return { avgTime, totalPageViews, uniquePageViews, totalIssueVisits };
  }, [selectedIssues]);

  const handleSelectPublication = useCallback((pub) => {
    setSelectedPublication(pub);
    if (pub.issues.length > 0) {
      setSelectedIssueIds(new Set([pub.issues[0].issue_name]));
    } else {
      setSelectedIssueIds(new Set());
    }
    setShowPublicationSelector(false);
    setJournalSearchTerm('');
  }, []);

  const toggleIssueSelection = useCallback((issueName) => {
    setSelectedIssueIds(prev => {
      const next = new Set(prev);
      if (next.has(issueName)) {
        next.delete(issueName);
      } else {
        next.add(issueName);
      }
      return next;
    });
  }, []);

  const handleAddJournalCovers = useCallback(async () => {
    if (!selectedIssues.length || !onAddJournalCover) return;
    const coverPromises = selectedIssues.map(async (issue) => {
      if (!issue.issue_url) return null;
      try {
        const resp = await fetch(`${API_BASE_URL}/api/journal-cover?issue_url=${encodeURIComponent(issue.issue_url)}`);
        const data = await resp.json();
        if (data.status === 'success' && data.cover_url) {
          return {
            coverUrl: data.cover_url,
            issueName: issue.issue_name,
            publication: issue.publication
          };
        }
      } catch (err) {
      }
      return null;
    });
    const covers = (await Promise.all(coverPromises)).filter(Boolean);
    if (covers.length > 0) {
      onAddJournalCover(covers);
    }
  }, [selectedIssues, onAddJournalCover]);

  useEffect(() => {
    if (effectiveCampaignName && publicationsGrouped.length > 0) {
      const ranked = matchPublicationToCampaign(effectiveCampaignName);
      if (ranked.length > 0) {
        const best = ranked[0];
        setSelectedPublication(best);
        if (best.issues.length > 0) {
          setSelectedIssueIds(new Set([best.issues[0].issue_name]));
        } else {
          setSelectedIssueIds(new Set());
        }
      } else {
        setSelectedPublication(null);
        setSelectedIssueIds(new Set());
      }
    } else {
      setSelectedPublication(null);
      setSelectedIssueIds(new Set());
    }
  }, [effectiveCampaignName, publicationsGrouped, matchPublicationToCampaign]);

  const formatTimeInIssue = (seconds) => {
    if (isNaN(seconds) || seconds <= 0) return "0s";
    seconds = Math.round(seconds);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const handleAddMetricToTable = useCallback((metricKey, value, label) => {
    if (onAddJournalMetricRow) {
      onAddJournalMetricRow(label, value);
    }
  }, [onAddJournalMetricRow]);


  const fetchSavedDashboards = useCallback(async () => {
    setLoadingDashboards(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboards/list?user_id=default_user`);
      const data = await response.json();
      if (data.status === 'success') {
        setSavedDashboards(data.dashboards);
      }
    } catch (error) {
    } finally {
      setLoadingDashboards(false);
    }
  }, []);

  const sections = [
    {
      id: 'controls',
      label: 'Controls',
      icon: '⚙️',
      count: 0
    },
    {
      id: 'add-components',
      label: 'Add Components',
      icon: '➕',
      count: AVAILABLE_METRICS.length + 1
    },
    {
      id: 'restore',
      label: 'Restore',
      icon: '♻️',
      count: deletedCards.length
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: '📁',
      count: savedDashboards.length
    }
  ];

  const handleAddMetricCard = useCallback((metricKey) => {
    const metricDisplayNames = {
      'unique_open_rate': 'Unique Open Rate',
      'total_open_rate': 'Total Open Rate', 
      'unique_click_rate': 'Unique Click Rate',
      'total_click_rate': 'Total Click Rate',
      'delivery_rate': 'Delivery Rate',
      '1_hour_open_rate': '1 Hour Open Rate',
      '6_hour_open_rate': '6 Hour Open Rate',
      '12_hour_open_rate': '12 Hour Open Rate',
      '24_hour_open_rate': '24 Hour Open Rate',
      'mobile_engagement_rate': 'Mobile Engagement Rate',
      'average_time_to_open_hours': 'Average Time to Open (Hours)',
      'unique_opens': 'Unique Opens',
      'total_opens': 'Total Opens',
      'unique_clicks': 'Unique Clicks',
      'total_clicks': 'Total Clicks',
      'delivered': 'Delivered',
      'sent': 'Sent',
      'bounces': 'Bounces',
      'estimated_patient_impact': 'Estimated Patient Impact'
    };
  
    const displayTitle = metricDisplayNames[metricKey];
    
    const component = {
      id: `${metricKey}-${Date.now()}`,
      type: 'metric',
      title: displayTitle,
      value: (selectedCampaign || campaigns[0]) ? getMetricValue(selectedCampaign || campaigns[0], metricKey) : 'N/A',
      originalKey: metricKey,
      position: { 
        x: 100 + Math.random() * 200, 
        y: 100 + Math.random() * 200, 
        width: 180, 
        height: 100 
      }
    };
      onAddComponent?.(component);
  }, [selectedCampaign, campaigns, onAddComponent]);

  const handleAddGenericCard = useCallback(() => {
    const component = {
      id: `card-${Date.now()}`,
      type: 'metric',
      title: 'New Card',
      value: '0',
      subtitle: '',
      position: {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        width: 180,
        height: 100
      }
    };

    onAddComponent?.(component);
  }, [onAddComponent]);

  const handleAddAuthorityMetrics = useCallback(() => {
    const component = {
      id: `authority-${Date.now()}`,
      type: 'table',
      title: 'Authority Metrics',
      config: {
        dataType: 'authority',
        customData: [
          ['Credential', 'Engagement Rate'],
          ['MD', '0.0%'],
          ['DO', '0.0%'],
          ['NP', '0.0%'],
          ['PA', '0.0%']
        ]
      },
      position: { 
        x: 100 + Math.random() * 200, 
        y: 100 + Math.random() * 200, 
        width: 320, 
        height: 160 
      }
    };

    onAddComponent?.(component);
  }, [onAddComponent]);

  const handleAddGeographicDistribution = useCallback(() => {
    const component = {
      id: `geographic-${Date.now()}`,
      type: 'table',
      title: 'Regional Geographic Distribution',
      config: {
        dataType: 'geographic',
        customData: [
          ['Region', 'Engagement Rate', 'Volume'],
          ['Northeast', '0.0%', '0'],
          ['Southeast', '0.0%', '0'],
          ['Midwest', '0.0%', '0'],
          ['West', '0.0%', '0']
        ]
      },
      position: {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        width: 380,
        height: 180
      }
    };

    onAddComponent?.(component);
  }, [onAddComponent]);

  const handleAddLandingPageImpressions = useCallback(() => {
    const component = {
      id: `landing-page-${Date.now()}`,
      type: 'table',
      title: 'Landing Page Impressions',
      config: {
        dataType: 'custom',
        customData: [
          ['728x90', ''],
          ['300x250', '']
        ]
      },
      position: {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        width: 300,
        height: 120
      }
    };

    onAddComponent?.(component);
  }, [onAddComponent]);

  const handleAddVideoMetricsTable = useCallback(() => {
    const component = {
      id: `video-metrics-${Date.now()}`,
      type: 'table',
      title: 'Video Metrics',
      config: {
        dataType: 'custom',
        customData: [
          ['Total Time Watched', ''],
          ['Avg Time Watched', ''],
          ['Total Impressions', '']
        ]
      },
      position: {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        width: 300,
        height: 120
      }
    };

    onAddComponent?.(component);
  }, [onAddComponent]);

  const handleAddJournalMetricsTable = useCallback(() => {
    const component = {
      id: `journal-metrics-${Date.now()}`,
      type: 'table',
      title: 'Online Journal Metrics',
      config: {
        dataType: 'custom',
        customData: [
          ['Avg Time in Issue', ''],
          ['Total Page Views', ''],
          ['Total Issue Visits', '']
        ]
      },
      position: {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        width: 300,
        height: 120
      }
    };

    onAddComponent?.(component);
  }, [onAddComponent]);

  const handleAddSocialMediaTable = useCallback(() => {
    const component = {
      id: `social-media-${Date.now()}`,
      type: 'table',
      title: 'LinkedIn Social Media Metrics',
      config: {
        dataType: 'custom',
        customData: [
          ['Impressions', ''],
          ['Engagement Rate', ''],
          ['CTR', '']
        ]
      },
      position: {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        width: 300,
        height: 120
      }
    };

    onAddComponent?.(component);
  }, [onAddComponent]);

  const getMetricValue = (campaign, metricKey) => {
    if (!campaign) return 'N/A';
    
    const metricMap = {
      'unique_open_rate': () => `${campaign.core_metrics?.unique_open_rate?.toFixed(1) || 0}%`,
      'total_open_rate': () => `${campaign.core_metrics?.total_open_rate?.toFixed(1) || 0}%`,
      'unique_click_rate': () => `${campaign.core_metrics?.unique_click_rate?.toFixed(1) || 0}%`,
      'total_click_rate': () => `${campaign.core_metrics?.total_click_rate?.toFixed(1) || 0}%`,
      'delivery_rate': () => `${campaign.core_metrics?.delivery_rate?.toFixed(1) || 0}%`,
      '1_hour_open_rate': () => `${campaign.core_metrics?.['1_hour_open_rate']?.toFixed(1) || 0}%`,
      '6_hour_open_rate': () => `${campaign.core_metrics?.['6_hour_open_rate']?.toFixed(1) || 0}%`,
      '12_hour_open_rate': () => `${campaign.core_metrics?.['12_hour_open_rate']?.toFixed(1) || 0}%`,
      '24_hour_open_rate': () => `${campaign.core_metrics?.['24_hour_open_rate']?.toFixed(1) || 0}%`,
      'mobile_engagement_rate': () => `${campaign.core_metrics?.mobile_engagement_rate?.toFixed(1) || 0}%`,
      'average_time_to_open_hours': () => `${campaign.core_metrics?.average_time_to_open_hours?.toFixed(1) || 0}h`,
      'unique_opens': () => (campaign.volume_metrics?.unique_opens || 0).toLocaleString(),
      'total_opens': () => (campaign.volume_metrics?.total_opens || 0).toLocaleString(),
      'unique_clicks': () => (campaign.volume_metrics?.unique_clicks || 0).toLocaleString(),
      'total_clicks': () => (campaign.volume_metrics?.total_clicks || 0).toLocaleString(),
      'delivered': () => (campaign.volume_metrics?.delivered || 0).toLocaleString(),
      'sent': () => (campaign.volume_metrics?.sent || 0).toLocaleString(),
      'bounces': () => (campaign.volume_metrics?.bounces || 0).toLocaleString(),
      'estimated_patient_impact': () => (campaign.cost_metrics?.estimated_patient_impact || 0).toLocaleString()
    };
  
    const getValue = metricMap[metricKey];
    return getValue ? getValue() : 'N/A';
  };

  const filteredMetrics = AVAILABLE_METRICS.filter(metric =>
    metric.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDashboards = savedDashboards.filter(dashboard =>
    dashboard.title.toLowerCase().includes(archiveSearchTerm.toLowerCase())
  );

  if (!isOpen) {
    return (
      <div className="dc-component-sidebar">
        <button 
          className="dc-sidebar-toggle"
          onClick={onToggle}
          aria-label="Open sidebar"

        >
          ▶
        </button>
      </div>
    );
  }

  return (
    <div className="dc-component-sidebar dc-open" style={{
      position: 'relative',
      background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
      width: '320px',
      height: '100%',
      transition: 'width 0.3s ease',
      boxShadow: '2px 0 10px rgba(0, 0, 0, 0.1)',
      zIndex: 150,
      borderRight: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>

      <div className="dc-sidebar-content" style={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: '20px 0'
      }}>
        <div className="dc-sidebar-nav" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '0 16px',
          marginBottom: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '20px'
        }}>
          {sections.map(section => (
            <button
              key={section.id}
              className={`dc-nav-button ${activeSection === section.id ? 'dc-active' : ''}`}
              onClick={() => setActiveSection(section.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: activeSection === section.id ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                color: activeSection === section.id ? 'white' : 'rgba(255, 255, 255, 0.8)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              <span>{section.icon}</span>
              <span style={{ flex: 1, textAlign: 'left' }}>{section.label}</span>
              {section.count > 0 && (
                <span style={{ 
                  background: 'rgba(255, 255, 255, 0.2)', 
                  padding: '2px 8px', 
                  borderRadius: '12px', 
                  fontSize: '12px' 
                }}>
                  {section.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="dc-sidebar-scroll" style={{ flex: 1, overflow: 'auto', padding: '0 16px' }}>
          {activeSection === 'controls' && (
            <div className="dc-sidebar-section">
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ color: 'white', margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
                  Dashboard Controls
                </h3>
              </div>

              {selectedRowInfo && (
                <div style={{
                  marginBottom: '24px',
                  padding: '16px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '2px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '8px'
                }}>
                  <div style={{ color: 'white', fontWeight: '600', marginBottom: '12px', fontSize: '14px' }}>
                    {selectedRowInfo.colIndex !== null && selectedRowInfo.colIndex !== undefined
                      ? `Cell [${selectedRowInfo.rowIndex}, ${selectedRowInfo.colIndex}] Selected`
                      : `Row ${selectedRowInfo.rowIndex} Selected`}
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px', marginBottom: '8px' }}>
                      Row Operations:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <button
                        onClick={() => {
                          selectedRowInfo.addRowBelow();
                        }}
                        style={{
                          padding: '10px 16px',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '14px'
                        }}
                      >
                        ➕ Add Row Below
                      </button>
                      <button
                        onClick={() => {
                          selectedRowInfo.deleteRow();
                        }}
                        style={{
                          padding: '10px 16px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: '14px'
                        }}
                      >
                        🗑️ Delete Row
                      </button>
                    </div>
                  </div>

                  {selectedRowInfo.colIndex !== null && selectedRowInfo.colIndex !== undefined && (
                    <div>
                      <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px', marginBottom: '8px' }}>
                        Column Operations:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button
                          onClick={() => {
                            selectedRowInfo.addColumnRight?.();
                          }}
                          style={{
                            padding: '10px 16px',
                            background: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '14px'
                          }}
                        >
                          ➕ Add Column Right
                        </button>
                        <button
                          onClick={() => {
                            selectedRowInfo.deleteColumn?.();
                          }}
                          style={{
                            padding: '10px 16px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '14px'
                          }}
                        >
                          🗑️ Delete Column
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginBottom: '24px' }}>
                <label style={{ color: 'white', display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Color Theme
                </label>
                <select 
                  value={currentTheme} 
                  onChange={(e) => onThemeChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '14px'
                  }}
                >
                  {Object.entries(THEME_INFO).map(([key, info]) => (
                    <option key={key} value={key} style={{ background: '#1e293b', color: 'white' }}>
                      {info.name}
                    </option>
                  ))}
                </select>
              </div>

              {hasJournalTable && selectedPublication && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ color: 'white', display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Online Journal Metrics
                  </label>
                  <div style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '8px',
                    padding: '12px'
                  }}>
                    <div style={{ color: '#4ade80', fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>
                      Matched Publication:
                    </div>
                    <div style={{ position: 'relative' }}>
                      <div
                        onClick={() => setShowPublicationSelector(!showPublicationSelector)}
                        style={{
                          color: 'white',
                          fontSize: '13px',
                          marginBottom: '12px',
                          lineHeight: '1.4',
                          cursor: 'pointer',
                          padding: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.borderColor = 'rgba(74, 222, 128, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        }}
                      >
                        <span style={{ flex: 1 }}>
                          {selectedPublication.publication}
                          <span style={{ opacity: 0.6, fontSize: '11px', marginLeft: '6px' }}>
                            | {selectedPublication.issues.length} issues
                          </span>
                        </span>
                        <span style={{ fontSize: '10px', opacity: 0.7 }}>
                          {showPublicationSelector ? '\u25B2' : '\u25BC'}
                        </span>
                      </div>

                      {showPublicationSelector && (
                        <>
                          <div
                            onClick={() => {
                              setShowPublicationSelector(false);
                              setJournalSearchTerm('');
                            }}
                            style={{
                              position: 'fixed',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              zIndex: 999
                            }}
                          />
                          <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            zIndex: 1000,
                            background: '#1e293b',
                            border: '1px solid rgba(74, 222, 128, 0.3)',
                            borderRadius: '8px',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                            maxHeight: '400px',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                          }}>
                            <div style={{ padding: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                              <input
                                type="text"
                                placeholder="Search publications"
                                value={journalSearchTerm}
                                onChange={(e) => setJournalSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  width: '100%',
                                  padding: '10px 12px',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  background: 'rgba(255, 255, 255, 0.1)',
                                  color: 'white',
                                  fontSize: '13px',
                                  outline: 'none',
                                  boxSizing: 'border-box'
                                }}
                                onFocus={(e) => {
                                  e.target.style.borderColor = 'rgba(74, 222, 128, 0.5)';
                                  e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                                }}
                                onBlur={(e) => {
                                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                                }}
                              />
                            </div>

                            <div style={{ flex: 1, overflow: 'auto', maxHeight: '320px' }}>
                              {filteredTopPublications.length > 0 && (
                                <div>
                                  <div style={{
                                    padding: '8px 12px',
                                    background: 'rgba(74, 222, 128, 0.1)',
                                    color: '#4ade80',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 1
                                  }}>
                                    Best Matches
                                  </div>
                                  {filteredTopPublications.map((pub, index) => (
                                    <div
                                      key={`top-pub-${index}`}
                                      onClick={() => handleSelectPublication(pub)}
                                      style={{
                                        padding: '10px 12px',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                        background: selectedPublication?.publication === pub.publication
                                          ? 'rgba(74, 222, 128, 0.2)'
                                          : 'transparent',
                                        transition: 'background 0.15s ease'
                                      }}
                                      onMouseOver={(e) => {
                                        if (selectedPublication?.publication !== pub.publication) {
                                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                        }
                                      }}
                                      onMouseOut={(e) => {
                                        if (selectedPublication?.publication !== pub.publication) {
                                          e.currentTarget.style.background = 'transparent';
                                        }
                                      }}
                                    >
                                      <div style={{
                                        color: 'white',
                                        fontSize: '12px',
                                        lineHeight: '1.4',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                      }}>
                                        <span style={{ flex: 1 }}>{pub.publication}</span>
                                        {selectedPublication?.publication === pub.publication && (
                                          <span style={{ color: '#4ade80', fontSize: '10px' }}>{'\u2713'}</span>
                                        )}
                                        <span style={{
                                          fontSize: '10px',
                                          color: 'rgba(74, 222, 128, 0.8)',
                                          background: 'rgba(74, 222, 128, 0.15)',
                                          padding: '2px 6px',
                                          borderRadius: '4px'
                                        }}>
                                          {pub.matchScore}pts
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {filteredRemainingPublications.length > 0 && (
                                <div>
                                  <div style={{
                                    padding: '8px 12px',
                                    background: 'rgba(99, 102, 241, 0.1)',
                                    color: 'rgba(165, 180, 252, 0.9)',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 1
                                  }}>
                                    All Publications
                                  </div>
                                  {filteredRemainingPublications.map((pub, index) => (
                                    <div
                                      key={`all-pub-${index}`}
                                      onClick={() => handleSelectPublication(pub)}
                                      style={{
                                        padding: '10px 12px',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                        background: selectedPublication?.publication === pub.publication
                                          ? 'rgba(74, 222, 128, 0.2)'
                                          : 'transparent',
                                        transition: 'background 0.15s ease'
                                      }}
                                      onMouseOver={(e) => {
                                        if (selectedPublication?.publication !== pub.publication) {
                                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                        }
                                      }}
                                      onMouseOut={(e) => {
                                        if (selectedPublication?.publication !== pub.publication) {
                                          e.currentTarget.style.background = 'transparent';
                                        }
                                      }}
                                    >
                                      <div style={{
                                        color: 'rgba(255, 255, 255, 0.9)',
                                        fontSize: '12px',
                                        lineHeight: '1.4',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                      }}>
                                        <span style={{ flex: 1 }}>{pub.publication}</span>
                                        {selectedPublication?.publication === pub.publication && (
                                          <span style={{ color: '#4ade80', fontSize: '10px' }}>{'\u2713'}</span>
                                        )}
                                        <span style={{
                                          fontSize: '10px',
                                          color: 'rgba(255, 255, 255, 0.4)'
                                        }}>
                                          {pub.issues.length} issues
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {filteredTopPublications.length === 0 &&
                               filteredRemainingPublications.length === 0 && (
                                <div style={{
                                  padding: '20px',
                                  textAlign: 'center',
                                  color: 'rgba(255, 255, 255, 0.5)',
                                  fontSize: '13px'
                                }}>
                                  No publications found matching "{journalSearchTerm}"
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <div style={{ position: 'relative', marginBottom: '12px' }}>
                      <div
                        onClick={() => setShowIssueList(!showIssueList)}
                        style={{
                          padding: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.borderColor = 'rgba(74, 222, 128, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        }}
                      >
                        <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
                          Issues ({selectedIssueIds.size}/{selectedPublication.issues.length} selected)
                        </span>
                        <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '10px' }}>
                          {showIssueList ? '\u25B2' : '\u25BC'}
                        </span>
                      </div>

                      {showIssueList && (
                        <div style={{
                          marginTop: '4px',
                          background: 'rgba(15, 23, 42, 0.95)',
                          border: '1px solid rgba(74, 222, 128, 0.2)',
                          borderRadius: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden'
                        }}>
                          <div style={{ padding: '6px 8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                            <input
                              type="text"
                              placeholder="Search issues..."
                              value={issueSearchTerm}
                              onChange={(e) => setIssueSearchTerm(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                borderRadius: '4px',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                background: 'rgba(255, 255, 255, 0.08)',
                                color: 'white',
                                fontSize: '11px',
                                outline: 'none',
                                boxSizing: 'border-box'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = 'rgba(74, 222, 128, 0.5)';
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                              }}
                            />
                          </div>
                          <div className="dc-dropdown-scroll" style={{ maxHeight: '200px' }}>
                          {selectedPublication.issues
                            .filter(issue => !issueSearchTerm || matchesSearchTerm(issue.issue_name || '', issueSearchTerm))
                            .map((issue, idx) => {
                            const isSelected = selectedIssueIds.has(issue.issue_name);
                            const issueMonth = (() => {
                              const n = (issue.issue_name || '').toLowerCase();
                              const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
                              const monthAbbrs = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                              for (let i = 0; i < monthNames.length; i++) {
                                if (n.includes(monthNames[i])) return monthAbbrs[i];
                              }
                              return null;
                            })();
                            const issueYear = (() => {
                              const m = (issue.issue_name || '').match(/20\d{2}/);
                              return m ? `'${m[0].slice(-2)}` : null;
                            })();
                            const issueVisits = issue.current?.total_issue_visits || 0;
                            return (
                              <div
                                key={`issue-${idx}`}
                                onClick={() => toggleIssueSelection(issue.issue_name)}
                                title={issue.issue_name}
                                style={{
                                  padding: '6px 10px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  opacity: isSelected ? 1 : 0.6,
                                  transition: 'opacity 0.15s ease',
                                  position: 'relative',
                                  minWidth: 'max-content',
                                  paddingRight: '90px'
                                }}
                              >
                                <div style={{
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '3px',
                                  border: `1px solid ${isSelected ? '#10b981' : 'rgba(255,255,255,0.3)'}`,
                                  background: isSelected ? '#10b981' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  fontSize: '9px',
                                  color: 'white',
                                  position: 'sticky',
                                  left: 0
                                }}>
                                  {isSelected && '\u2713'}
                                </div>
                                <span style={{
                                  color: 'rgba(255, 255, 255, 0.8)',
                                  fontSize: '11px',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {issue.issue_name}
                                </span>
                                <div style={{
                                  position: 'sticky',
                                  right: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  background: 'rgba(15, 23, 42, 0.95)',
                                  paddingLeft: '8px',
                                  marginLeft: 'auto',
                                  flexShrink: 0
                                }}>
                                  {issueMonth && (
                                    <span style={{
                                      fontSize: '9px',
                                      color: 'rgba(74, 222, 128, 0.7)',
                                      background: 'rgba(34, 197, 94, 0.1)',
                                      padding: '1px 4px',
                                      borderRadius: '3px'
                                    }}>
                                      {issueMonth}{issueYear ? ` ${issueYear}` : ''}
                                    </span>
                                  )}
                                  <span style={{
                                    color: 'rgba(255, 255, 255, 0.4)',
                                    fontSize: '10px'
                                  }}>
                                    {issueVisits.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '4px'
                      }}>
                        <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>Avg Time in Issue</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: 'white', fontWeight: '600', fontSize: '13px' }}>
                            {formatTimeInIssue(journalAggregateMetrics.avgTime)}
                          </span>
                          <button
                            onClick={() => handleAddMetricToTable('avgTimeInIssue', formatTimeInIssue(journalAggregateMetrics.avgTime), 'Avg Time in Issue')}
                            style={{
                              padding: '4px 8px',
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                          >+</button>
                        </div>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '4px'
                      }}>
                        <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>Total Page Views</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: 'white', fontWeight: '600', fontSize: '13px' }}>
                            {journalAggregateMetrics.totalPageViews.toLocaleString()}
                          </span>
                          <button
                            onClick={() => handleAddMetricToTable('totalPageViews', journalAggregateMetrics.totalPageViews.toLocaleString(), 'Total Page Views')}
                            style={{
                              padding: '4px 8px',
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                          >+</button>
                        </div>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '4px'
                      }}>
                        <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>Unique Page Views</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: 'white', fontWeight: '600', fontSize: '13px' }}>
                            {journalAggregateMetrics.uniquePageViews.toLocaleString()}
                          </span>
                          <button
                            onClick={() => handleAddMetricToTable('uniquePageViews', journalAggregateMetrics.uniquePageViews.toLocaleString(), 'Unique Page Views')}
                            style={{
                              padding: '4px 8px',
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                          >+</button>
                        </div>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '4px'
                      }}>
                        <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>Total Issue Visits</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: 'white', fontWeight: '600', fontSize: '13px' }}>
                            {journalAggregateMetrics.totalIssueVisits.toLocaleString()}
                          </span>
                          <button
                            onClick={() => handleAddMetricToTable('totalIssueVisits', journalAggregateMetrics.totalIssueVisits.toLocaleString(), 'Total Issue Visits')}
                            style={{
                              padding: '4px 8px',
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                          >+</button>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleAddJournalCovers}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        marginTop: '12px'
                      }}
                    >
                      {selectedIssueIds.size > 1 ? 'Add Cover Images' : 'Add Cover Image'}
                    </button>
                  </div>
                </div>
              )}

              {hasVideoTable && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ color: 'white', display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Video Metrics
                  </label>
                  <div style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    padding: '12px'
                  }}>
                    {!selectedPlaylist ? (
                      <div>
                        <div style={{ color: '#60a5fa', fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>
                          Select a YouTube Playlist:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', maxHeight: '250px', overflow: 'auto', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          {rankedPlaylists.topMatches.length > 0 && (
                            <>
                              <div style={{
                                padding: '8px 12px',
                                background: 'rgba(96, 165, 250, 0.1)',
                                color: '#60a5fa',
                                fontSize: '11px',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                position: 'sticky',
                                top: 0,
                                zIndex: 1
                              }}>
                                Best Matches
                              </div>
                              {rankedPlaylists.topMatches.map(pl => (
                                <div
                                  key={pl.id}
                                  onClick={() => handleSelectPlaylist(pl)}
                                  style={{
                                    padding: '8px 12px',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'; }}
                                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                                >
                                  <span style={{ color: 'white', fontSize: '12px', flex: 1 }}>{pl.title}</span>
                                  <span style={{
                                    fontSize: '10px',
                                    color: 'rgba(96, 165, 250, 0.8)',
                                    background: 'rgba(59, 130, 246, 0.15)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    marginRight: '4px'
                                  }}>{pl.matchScore}pts</span>
                                  <span style={{
                                    fontSize: '10px',
                                    color: 'rgba(96, 165, 250, 0.8)',
                                    background: 'rgba(59, 130, 246, 0.15)',
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                  }}>{pl.itemCount} videos</span>
                                </div>
                              ))}
                            </>
                          )}
                          {rankedPlaylists.remaining.length > 0 && (
                            <>
                              <div style={{
                                padding: '8px 12px',
                                background: 'rgba(99, 102, 241, 0.1)',
                                color: 'rgba(165, 180, 252, 0.9)',
                                fontSize: '11px',
                                fontWeight: '600',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                position: 'sticky',
                                top: 0,
                                zIndex: 1
                              }}>
                                All Playlists
                              </div>
                              {rankedPlaylists.remaining.map(pl => (
                                <div
                                  key={pl.id}
                                  onClick={() => handleSelectPlaylist(pl)}
                                  style={{
                                    padding: '8px 12px',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)'; }}
                                  onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                >
                                  <span style={{ color: 'white', fontSize: '12px', flex: 1 }}>{pl.title}</span>
                                  <span style={{
                                    fontSize: '10px',
                                    color: 'rgba(96, 165, 250, 0.8)',
                                    background: 'rgba(59, 130, 246, 0.15)',
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                  }}>{pl.itemCount} videos</span>
                                </div>
                              ))}
                            </>
                          )}
                          {youtubePlaylistsList.length === 0 && (
                            <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px', padding: '8px', textAlign: 'center' }}>
                              No playlists available
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ color: '#60a5fa', fontSize: '12px', marginBottom: '8px', fontWeight: '600' }}>
                          Selected Playlist:
                        </div>
                        <div style={{ position: 'relative' }}>
                          <div
                            onClick={() => setShowPlaylistSelector(!showPlaylistSelector)}
                            style={{
                              color: 'white',
                              fontSize: '13px',
                              marginBottom: '12px',
                              lineHeight: '1.4',
                              cursor: 'pointer',
                              padding: '8px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '6px',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                              e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.4)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            }}
                          >
                            <span style={{ flex: 1 }}>{selectedPlaylist.title}</span>
                            <span style={{ fontSize: '10px', opacity: 0.7 }}>
                              {showPlaylistSelector ? '\u25B2' : '\u25BC'}
                            </span>
                          </div>

                          {showPlaylistSelector && (
                            <>
                              <div
                                onClick={() => setShowPlaylistSelector(false)}
                                style={{
                                  position: 'fixed',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  zIndex: 999
                                }}
                              />
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                zIndex: 1000,
                                background: '#1e293b',
                                border: '1px solid rgba(96, 165, 250, 0.3)',
                                borderRadius: '8px',
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                                maxHeight: '300px',
                                overflow: 'auto'
                              }}>
                                {rankedPlaylists.topMatches.length > 0 && (
                                  <div>
                                    <div style={{
                                      padding: '8px 12px',
                                      background: 'rgba(96, 165, 250, 0.1)',
                                      color: '#60a5fa',
                                      fontSize: '11px',
                                      fontWeight: '600',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px',
                                      position: 'sticky',
                                      top: 0,
                                      zIndex: 1
                                    }}>
                                      Best Matches
                                    </div>
                                    {rankedPlaylists.topMatches.map(pl => (
                                      <div
                                        key={pl.id}
                                        onClick={() => handleSelectPlaylist(pl)}
                                        style={{
                                          padding: '10px 12px',
                                          cursor: 'pointer',
                                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                          background: selectedPlaylistId === pl.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                          transition: 'background 0.15s ease'
                                        }}
                                        onMouseOver={(e) => {
                                          if (selectedPlaylistId !== pl.id) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                        }}
                                        onMouseOut={(e) => {
                                          if (selectedPlaylistId !== pl.id) e.currentTarget.style.background = 'transparent';
                                        }}
                                      >
                                        <div style={{
                                          color: 'white',
                                          fontSize: '12px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px'
                                        }}>
                                          <span style={{ flex: 1 }}>{pl.title}</span>
                                          {selectedPlaylistId === pl.id && (
                                            <span style={{ color: '#60a5fa', fontSize: '10px' }}>{'\u2713'}</span>
                                          )}
                                          <span style={{
                                            fontSize: '10px',
                                            color: 'rgba(96, 165, 250, 0.8)',
                                            background: 'rgba(59, 130, 246, 0.15)',
                                            padding: '2px 6px',
                                            borderRadius: '4px'
                                          }}>{pl.matchScore}pts</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {rankedPlaylists.remaining.length > 0 && (
                                  <div>
                                    <div style={{
                                      padding: '8px 12px',
                                      background: 'rgba(99, 102, 241, 0.1)',
                                      color: 'rgba(165, 180, 252, 0.9)',
                                      fontSize: '11px',
                                      fontWeight: '600',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px',
                                      position: 'sticky',
                                      top: 0,
                                      zIndex: 1
                                    }}>
                                      All Playlists
                                    </div>
                                    {rankedPlaylists.remaining.map(pl => (
                                      <div
                                        key={pl.id}
                                        onClick={() => handleSelectPlaylist(pl)}
                                        style={{
                                          padding: '10px 12px',
                                          cursor: 'pointer',
                                          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                          background: selectedPlaylistId === pl.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                          transition: 'background 0.15s ease'
                                        }}
                                        onMouseOver={(e) => {
                                          if (selectedPlaylistId !== pl.id) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                        }}
                                        onMouseOut={(e) => {
                                          if (selectedPlaylistId !== pl.id) e.currentTarget.style.background = 'transparent';
                                        }}
                                      >
                                        <div style={{
                                          color: 'white',
                                          fontSize: '12px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px'
                                        }}>
                                          <span style={{ flex: 1 }}>{pl.title}</span>
                                          {selectedPlaylistId === pl.id && (
                                            <span style={{ color: '#60a5fa', fontSize: '10px' }}>{'\u2713'}</span>
                                          )}
                                          <span style={{
                                            fontSize: '10px',
                                            color: 'rgba(96, 165, 250, 0.8)',
                                            background: 'rgba(59, 130, 246, 0.15)',
                                            padding: '2px 6px',
                                            borderRadius: '4px'
                                          }}>{pl.itemCount}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        <div style={{ position: 'relative', marginBottom: '12px' }}>
                          <div
                            onClick={() => setShowVideoDropdown(!showVideoDropdown)}
                            style={{
                              padding: '8px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '6px',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                              e.currentTarget.style.borderColor = 'rgba(96, 165, 250, 0.4)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            }}
                          >
                            <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
                              Videos ({playlistVideos.length - excludedVideoIds.size}/{playlistVideos.length} selected)
                            </span>
                            <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '10px' }}>
                              {showVideoDropdown ? '\u25B2' : '\u25BC'}
                            </span>
                          </div>

                          {showVideoDropdown && (
                            <div style={{
                              marginTop: '4px',
                              background: 'rgba(15, 23, 42, 0.95)',
                              border: '1px solid rgba(96, 165, 250, 0.2)',
                              borderRadius: '6px',
                              display: 'flex',
                              flexDirection: 'column',
                              overflow: 'hidden'
                            }}>
                              <div style={{ padding: '6px 8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <input
                                  type="text"
                                  placeholder="Search videos..."
                                  value={videoSearchTerm}
                                  onChange={(e) => setVideoSearchTerm(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    color: 'white',
                                    fontSize: '11px',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                  }}
                                  onFocus={(e) => {
                                    e.target.style.borderColor = 'rgba(96, 165, 250, 0.5)';
                                  }}
                                  onBlur={(e) => {
                                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                                  }}
                                />
                              </div>
                              <div className="dc-dropdown-scroll" style={{ maxHeight: '180px' }}>
                              {playlistVideos
                                .filter(video => !videoSearchTerm || matchesSearchTerm(video.title || '', videoSearchTerm))
                                .map(video => {
                                const isExcluded = excludedVideoIds.has(video.id);
                                return (
                                  <div
                                    key={video.id}
                                    onClick={() => toggleVideoExclusion(video.id)}
                                    style={{
                                      padding: '6px 10px',
                                      cursor: 'pointer',
                                      borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      opacity: isExcluded ? 0.4 : 1,
                                      transition: 'opacity 0.15s ease',
                                      position: 'relative',
                                      minWidth: 'max-content',
                                      paddingRight: '90px'
                                    }}
                                  >
                                    <div style={{
                                      width: '14px',
                                      height: '14px',
                                      borderRadius: '3px',
                                      border: `1px solid ${isExcluded ? 'rgba(255,255,255,0.3)' : '#3b82f6'}`,
                                      background: isExcluded ? 'transparent' : '#3b82f6',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0,
                                      fontSize: '9px',
                                      color: 'white',
                                      position: 'sticky',
                                      left: 0
                                    }}>
                                      {!isExcluded && '\u2713'}
                                    </div>
                                    <span title={video.title} style={{
                                      color: 'rgba(255, 255, 255, 0.8)',
                                      fontSize: '11px',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {video.title}
                                    </span>
                                    <div style={{
                                      position: 'sticky',
                                      right: 0,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      background: 'rgba(15, 23, 42, 0.95)',
                                      paddingLeft: '8px',
                                      marginLeft: 'auto',
                                      flexShrink: 0
                                    }}>
                                      {video.publishedAt && (
                                        <span style={{
                                          fontSize: '9px',
                                          color: 'rgba(96, 165, 250, 0.7)',
                                          background: 'rgba(59, 130, 246, 0.1)',
                                          padding: '1px 4px',
                                          borderRadius: '3px'
                                        }}>
                                          {(() => {
                                            const d = new Date(video.publishedAt);
                                            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                                            return `${months[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`;
                                          })()}
                                        </span>
                                      )}
                                      <span style={{
                                        color: 'rgba(255, 255, 255, 0.4)',
                                        fontSize: '10px'
                                      }}>
                                        {video.views.toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                              </div>
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '4px'
                          }}>
                            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>Total Watch Time</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: 'white', fontWeight: '600', fontSize: '13px' }}>
                                {formatVideoWatchTime(videoAggregateMetrics.totalWatchTime)}
                              </span>
                              <button
                                onClick={() => handleAddVideoMetric('totalWatchTime', formatVideoWatchTime(videoAggregateMetrics.totalWatchTime), 'Total Time Watched')}
                                style={{
                                  padding: '4px 8px',
                                  background: '#3b82f6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  cursor: 'pointer'
                                }}
                              >+</button>
                            </div>
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '4px'
                          }}>
                            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>Avg Time Watched</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: 'white', fontWeight: '600', fontSize: '13px' }}>
                                {videoAggregateMetrics.avgPercentWatched.toFixed(1)}%
                              </span>
                              <button
                                onClick={() => handleAddVideoMetric('avgTimeWatched', `${videoAggregateMetrics.avgPercentWatched.toFixed(1)}%`, 'Avg Time Watched')}
                                style={{
                                  padding: '4px 8px',
                                  background: '#3b82f6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  cursor: 'pointer'
                                }}
                              >+</button>
                            </div>
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '4px'
                          }}>
                            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>Total Views</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: 'white', fontWeight: '600', fontSize: '13px' }}>
                                {videoAggregateMetrics.totalViews.toLocaleString()}
                              </span>
                              <button
                                onClick={() => handleAddVideoMetric('totalViews', videoAggregateMetrics.totalViews.toLocaleString(), 'Total Views')}
                                style={{
                                  padding: '4px 8px',
                                  background: '#3b82f6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  cursor: 'pointer'
                                }}
                              >+</button>
                            </div>
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: '4px'
                          }}>
                            <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>Most Watched Video</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: 'white', fontWeight: '600', fontSize: '11px', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {videoAggregateMetrics.mostWatchedVideo || 'N/A'}
                              </span>
                              <button
                                onClick={() => handleAddVideoMetric('mostWatchedVideo', videoAggregateMetrics.mostWatchedVideo || 'N/A', 'Most Watched Video')}
                                style={{
                                  padding: '4px 8px',
                                  background: '#3b82f6',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  cursor: 'pointer'
                                }}
                              >+</button>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (!onAddThumbnails) return;
                            const activeVideos = playlistVideos.filter(v => !excludedVideoIds.has(v.id));
                            const top3 = [...activeVideos].sort((a, b) => b.views - a.views).slice(0, 3);
                            onAddThumbnails(top3.map(v => ({
                              videoId: v.id,
                              title: v.title,
                              views: v.views,
                              avgPercentWatched: v.avgPercentWatched
                            })));
                          }}
                          style={{
                            width: '100%',
                            padding: '10px 16px',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            marginTop: '12px'
                          }}
                        >
                          Add Top Thumbnails
                        </button>
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px',
                          marginTop: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}>
                          <input
                            type="checkbox"
                            checked={thumbnailOverlayEnabled}
                            onChange={onThumbnailOverlayToggle}
                            style={{ margin: 0 }}
                          />
                          <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
                            Show View Overlay
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {hasSocialTable && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ color: 'white', display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Social Media Metrics
                  </label>
                  <div style={{
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '8px',
                    padding: '12px'
                  }}>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                      {['facebook', 'instagram', 'linkedin'].map(plat => {
                        const isEnabled = enabledPlatforms.has(plat);
                        const platLabel = { facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn' }[plat];
                        const platPostCount = (() => {
                          const platData = socialData[plat] || {};
                          const companies = platData.companies || {};
                          let count = 0;
                          Object.values(companies).forEach(ch => {
                            count += (plat === 'instagram' ? (ch.media || []) : (ch.posts || [])).length;
                          });
                          return count;
                        })();
                        return (
                          <button
                            key={plat}
                            onClick={() => togglePlatform(plat)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '12px',
                              border: `1px solid ${isEnabled ? 'rgba(167, 139, 250, 0.6)' : 'rgba(255, 255, 255, 0.15)'}`,
                              background: isEnabled ? 'rgba(139, 92, 246, 0.3)' : 'transparent',
                              color: isEnabled ? '#a78bfa' : 'rgba(255, 255, 255, 0.4)',
                              fontSize: '11px',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {platLabel} ({platPostCount})
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ position: 'relative', marginBottom: '12px' }}>
                      <div
                        onClick={() => setShowSocialPostDropdown(!showSocialPostDropdown)}
                        style={{
                          padding: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.borderColor = 'rgba(167, 139, 250, 0.4)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        }}
                      >
                        <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
                          Posts ({selectedPostIds.size}/{allSocialPosts.length} selected)
                        </span>
                        <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '10px' }}>
                          {showSocialPostDropdown ? '\u25B2' : '\u25BC'}
                        </span>
                      </div>

                      {showSocialPostDropdown && (
                        <div style={{
                          marginTop: '4px',
                          background: 'rgba(15, 23, 42, 0.95)',
                          border: '1px solid rgba(167, 139, 250, 0.2)',
                          borderRadius: '6px',
                          display: 'flex',
                          flexDirection: 'column',
                          overflow: 'hidden'
                        }}>
                          <div style={{ padding: '6px 8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                            <input
                              type="text"
                              placeholder="Search posts..."
                              value={socialPostSearchTerm}
                              onChange={(e) => setSocialPostSearchTerm(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: '100%',
                                padding: '6px 10px',
                                borderRadius: '4px',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                background: 'rgba(255, 255, 255, 0.08)',
                                color: 'white',
                                fontSize: '11px',
                                outline: 'none',
                                boxSizing: 'border-box'
                              }}
                              onFocus={(e) => {
                                e.target.style.borderColor = 'rgba(167, 139, 250, 0.5)';
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                              }}
                            />
                          </div>
                          <div className="dc-dropdown-scroll" style={{ maxHeight: '180px' }}>
                          {allSocialPosts
                            .filter(post => !socialPostSearchTerm || matchesSearchTerm(post.text || '', socialPostSearchTerm))
                            .map(post => {
                            const isSelected = selectedPostIds.has(post.id);
                            const platBadge = { facebook: 'FB', instagram: 'IG', linkedin: 'LI' }[post.platform] || post.platform;
                            const dateStr = (() => {
                              if (!post.createdAt) return null;
                              try {
                                const d = new Date(post.createdAt);
                                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                                return `${months[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`;
                              } catch { return null; }
                            })();
                            return (
                              <div
                                key={post.id}
                                onClick={() => togglePostSelection(post.id)}
                                title={post.text}
                                style={{
                                  padding: '6px 10px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  opacity: isSelected ? 1 : 0.4,
                                  transition: 'opacity 0.15s ease',
                                  position: 'relative',
                                  minWidth: 'max-content',
                                  paddingRight: '110px'
                                }}
                              >
                                <div style={{
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '3px',
                                  border: `1px solid ${isSelected ? '#8b5cf6' : 'rgba(255,255,255,0.3)'}`,
                                  background: isSelected ? '#8b5cf6' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  fontSize: '9px',
                                  color: 'white',
                                  position: 'sticky',
                                  left: 0
                                }}>
                                  {isSelected && '\u2713'}
                                </div>
                                <span style={{
                                  color: 'rgba(255, 255, 255, 0.8)',
                                  fontSize: '11px',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {post.text ? (post.text.length > 60 ? post.text.slice(0, 60) + '...' : post.text) : '(no text)'}
                                </span>
                                <div style={{
                                  position: 'sticky',
                                  right: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  background: 'rgba(15, 23, 42, 0.95)',
                                  paddingLeft: '8px',
                                  marginLeft: 'auto',
                                  flexShrink: 0
                                }}>
                                  <span style={{
                                    fontSize: '9px',
                                    color: 'rgba(167, 139, 250, 0.8)',
                                    background: 'rgba(139, 92, 246, 0.15)',
                                    padding: '1px 4px',
                                    borderRadius: '3px'
                                  }}>
                                    {platBadge}
                                  </span>
                                  {dateStr && (
                                    <span style={{
                                      fontSize: '9px',
                                      color: 'rgba(167, 139, 250, 0.7)',
                                      background: 'rgba(139, 92, 246, 0.1)',
                                      padding: '1px 4px',
                                      borderRadius: '3px'
                                    }}>
                                      {dateStr}
                                    </span>
                                  )}
                                  <span style={{
                                    color: 'rgba(255, 255, 255, 0.4)',
                                    fontSize: '10px'
                                  }}>
                                    {(post.engagements || 0).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {[
                        { label: 'Total Impressions', value: socialAggregateMetrics.totalImpressions.toLocaleString(), key: 'totalImpressions' },
                        { label: 'Total Engagements', value: socialAggregateMetrics.totalEngagements.toLocaleString(), key: 'totalEngagements' },
                        { label: 'Avg Engagement Rate', value: `${socialAggregateMetrics.avgEngagementRate.toFixed(2)}%`, key: 'avgEngagementRate' },
                        { label: 'Total Reactions', value: socialAggregateMetrics.totalReactions.toLocaleString(), key: 'totalReactions' },
                        { label: 'Total Comments', value: socialAggregateMetrics.totalComments.toLocaleString(), key: 'totalComments' },
                        { label: 'Total Shares', value: socialAggregateMetrics.totalShares.toLocaleString(), key: 'totalShares' },
                        { label: 'Most Engaged Post', value: socialAggregateMetrics.mostEngagedPost ? (socialAggregateMetrics.mostEngagedPost.length > 40 ? socialAggregateMetrics.mostEngagedPost.slice(0, 40) + '...' : socialAggregateMetrics.mostEngagedPost) : 'N/A', key: 'mostEngagedPost' }
                      ].map(metric => (
                        <div key={metric.key} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '4px'
                        }}>
                          <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>{metric.label}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              color: 'white',
                              fontWeight: '600',
                              fontSize: metric.key === 'mostEngagedPost' ? '11px' : '13px',
                              maxWidth: metric.key === 'mostEngagedPost' ? '100px' : 'none',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {metric.value}
                            </span>
                            <button
                              onClick={() => handleAddSocialMetric(metric.key, metric.value, metric.label)}
                              style={{
                                padding: '4px 8px',
                                background: '#8b5cf6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer'
                              }}
                            >+</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        if (!onAddSocialPosts) return;
                        const postsWithImages = activeSocialPosts.filter(p => p.imageUrl || p.thumbnailUrl);
                        const top3 = postsWithImages.slice(0, 3);
                        if (top3.length > 0) {
                          onAddSocialPosts(top3.map(p => ({
                            imageUrl: p.imageUrl || p.thumbnailUrl,
                            text: p.text,
                            engagements: p.engagements,
                            platform: p.platform,
                            postId: p.id
                          })));
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        marginTop: '12px'
                      }}
                    >
                      Add Top Posts
                    </button>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      marginTop: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={socialPostOverlayEnabled}
                        onChange={onSocialPostOverlayToggle}
                        style={{ margin: 0 }}
                      />
                      <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
                        Show Engagement Overlay
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {!(currentTemplate?.includes?.('hot-topics') || currentTemplate?.includes?.('expert-perspectives') || (typeof currentTemplate === 'object' && (currentTemplate?.id?.includes('hot-topics') || currentTemplate?.id?.includes('expert-perspectives')))) && (<>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ color: 'white', display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Cost Comparison Model
                </label>
                <select
                  value={costComparisonMode}
                  onChange={(e) => onCostModeChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '14px'
                  }}
                >
                  <option value="none" style={{ background: '#1e293b', color: 'white' }}>
                    None
                  </option>
                  <option value="side-by-side" style={{ background: '#1e293b', color: 'white' }}>
                    Side-by-Side
                  </option>
                  <option value="gauge" style={{ background: '#1e293b', color: 'white' }}>
                    Progress Gauge
                  </option>
                  <option value="stacked" style={{ background: '#1e293b', color: 'white' }}>
                    Compact Stacked
                  </option>
                  <option value="percentage" style={{ background: '#1e293b', color: 'white' }}>
                    Percentage Focus
                  </option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ color: 'white', display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Budgeted Cost ($)
                </label>
                <input
                  type="number"
                  value={budgetedCost}
                  onChange={(e) => onBudgetedCostChange(parseFloat(e.target.value) || 0)}
                  placeholder="Enter budgeted amount"
                  step="0.01"
                  min=""
                  style={{
                    width: '90%',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ color: 'white', display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                  Actual Cost ($)
                </label>
                <input
                  type="number"
                  value={actualCost}
                  onChange={(e) => onActualCostChange(parseFloat(e.target.value) || 0)}
                  placeholder="Enter actual amount"
                  step="0.01"
                  min="0"
                  style={{
                    width: '90%',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '14px'
                  }}
                />
              </div>
              </>)}

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={specialtyMergeMode}
                    onChange={onToggleSpecialtyMerge}
                    style={{ margin: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontWeight: '600', marginBottom: '4px' }}>
                      Merge Subspecialties
                    </div>
                  </div>
                </label>
              </div>

              {!(currentTemplate?.includes?.('hot-topics') || currentTemplate?.includes?.('expert-perspectives') || (typeof currentTemplate === 'object' && (currentTemplate?.id?.includes('hot-topics') || currentTemplate?.id?.includes('expert-perspectives')))) && (<>
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={showTotalSends}
                    onChange={onTotalSendsToggle}
                    style={{ margin: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontWeight: '600', marginBottom: '4px' }}>
                      Show Total Sends
                    </div>
                  </div>
                </label>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={bannerImpressionsMode}
                    onChange={onBannerImpressionsModeToggle}
                    style={{ margin: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontWeight: '600', marginBottom: '4px' }}>
                      Banner Impressions
                    </div>
                  </div>
                </label>
              </div>
              </>)}

              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '24px',
                  gap: '12px',
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={showPharmaLogo}
                    onChange={onShowPharmaLogoToggle}
                    style={{ margin: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontWeight: '600', marginBottom: '4px' }}>
                      Show Pharma Logo
                    </div>
                  </div>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={showBottomLogo}
                    onChange={onShowBottomLogoToggle}
                    style={{ margin: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontWeight: '600', marginBottom: '4px' }}>
                      Show Matrix Logo
                    </div>
                  </div>
                </label>
              </div>

            </div>
          )}

          {activeSection === 'add-components' && (
            <div className="dc-sidebar-section">

              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: 'white', margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
                  Ready-Made Tables
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <button
                    onClick={handleAddLandingPageImpressions}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    Landing Page Impressions
                  </button>
                  <button
                    onClick={handleAddVideoMetricsTable}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    Video Metrics
                  </button>
                  <button
                    onClick={handleAddJournalMetricsTable}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    Online Journal Metrics
                  </button>
                  <button
                    onClick={handleAddSocialMediaTable}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    LinkedIn Social Media Metrics
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: 'white', margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
                  Basic Components
                </h4>
                <button
                  onClick={handleAddGenericCard}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    marginBottom: '8px'
                  }}
                >
                  Add Card
                </button>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: 'white', margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
                  Engagement & Volume Metrics
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {filteredMetrics.map(metric => (
                    <button
                      key={metric}
                      onClick={() => handleAddMetricCard(metric)}
                      style={{
                        padding: '8px 12px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: 'white', margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>
                  Special Metrics
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <button
                    onClick={handleAddAuthorityMetrics}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    Authority Metrics
                  </button>
                  <button
                    onClick={handleAddGeographicDistribution}
                    style={{
                      padding: '8px 12px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    Regional Geographic Distribution
                  </button>
                </div>
              </div>

            </div>
          )}

          {activeSection === 'restore' && (
            <div className="dc-sidebar-section">
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ color: 'white', margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
                  Restore Components
                </h3>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', margin: '0 0 16px 0' }}>
                  Click to restore deleted components
                </p>
              </div>

              {deletedCards.length === 0 ? (
                <div style={{
                  padding: '20px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                    No deleted components to restore
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {deletedCards.map((card, index) => (
                    <button
                      key={`${card.id}-${index}`}
                      onClick={() => onRestoreCard?.(card)}
                      style={{
                        padding: '12px',
                        background: 'rgba(34, 197, 94, 0.1)',
                        color: 'white',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = 'rgba(34, 197, 94, 0.2)';
                        e.target.style.borderColor = 'rgba(34, 197, 94, 0.5)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = 'rgba(34, 197, 94, 0.1)';
                        e.target.style.borderColor = 'rgba(34, 197, 94, 0.3)';
                      }}
                    >
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                        {card.title || 'Untitled Component'}
                      </div>
                      <div style={{ fontSize: '12px', opacity: 0.8 }}>
                        {card.type} • {card.value || 'No value'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeSection === 'archive' && (
            <div className="dc-sidebar-section">
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ color: 'white', margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
                  Saved Dashboards
                </h3>
                <input
                  type="text"
                  placeholder="Search dashboards..."
                  value={archiveSearchTerm}
                  onChange={(e) => setArchiveSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    marginBottom: '12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(99, 102, 241, 0.6)';
                    e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                />
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', margin: '0 0 12px 0' }}>
                  Load a previously saved dashboard
                </p>
                <button
                  onClick={fetchSavedDashboards}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(59, 130, 246, 0.2)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    borderRadius: '6px',
                    color: 'white',
                    fontSize: '13px',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  {loadingDashboards ? 'Loading...' : 'Refresh List'}
                </button>
              </div>

              {savedDashboards.length === 0 ? (
                <div style={{
                  padding: '20px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                    No saved dashboards found
                  </div>
                </div>
              ) : filteredDashboards.length === 0 ? (
                <div style={{
                  padding: '20px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                    No matching dashboards
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredDashboards.map((dashboard) => (
                    <div
                      key={dashboard.id}
                      style={{
                        padding: '12px',
                        background: 'rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: '6px'
                      }}
                    >
                      <div style={{ fontWeight: '600', color: 'white', marginBottom: '6px' }}>
                        {dashboard.title}
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                        {new Date(dashboard.updated_at).toLocaleDateString()}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => onRestoreDashboard?.(dashboard.id)}
                          style={{
                            flex: 1,
                            padding: '6px 12px',
                            background: 'rgba(99, 102, 241, 0.2)',
                            border: '1px solid rgba(99, 102, 241, 0.4)',
                            borderRadius: '4px',
                            color: 'white',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Load
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch(`${API_BASE_URL}/api/dashboards/${dashboard.id}`, {
                                method: 'DELETE'
                              });
                              const data = await response.json();
                              if (data.status === 'success') {
                                fetchSavedDashboards();
                              }
                            } catch (error) {
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            borderRadius: '4px',
                            color: 'white',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComponentSidebar;