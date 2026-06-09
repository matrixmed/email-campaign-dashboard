import React, { useState, useEffect, useCallback } from 'react';
import '../../styles/AudienceQueryBuilder.css';
import '../../styles/SectionHeaders.css';
import '../../styles/NPIQuickLookup.css';
import { API_BASE_URL } from '../../config/api';
import { matchesSearchTerm } from '../../utils/searchUtils';
import ListPickerModal from '../common/ListPickerModal';
import TablePagination from '../common/TablePagination';

const AudienceQueryBuilder = ({ activeSection }) => {
    const loadPersistedState = () => {
        try {
            const saved = localStorage.getItem('audienceQueryState');
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    selectedSpecialties: parsed.selectedSpecialties || [],
                    selectedCampaigns: parsed.selectedCampaigns || [],
                    selectedLists: parsed.selectedLists || [],
                    selectedTags: parsed.selectedTags || [],
                    selectedSegments: parsed.selectedSegments || [],
                    searchMode: parsed.searchMode || 'specialty',
                    engagementType: parsed.engagementType || 'all',
                    specialtyMergeMode: parsed.specialtyMergeMode || false
                };
            }
        } catch (e) {
            localStorage.removeItem('audienceQueryState');
        }
        return {
            selectedSpecialties: [],
            selectedCampaigns: [],
            selectedLists: [],
            selectedTags: [],
            selectedSegments: [],
            searchMode: 'specialty',
            engagementType: 'all',
            specialtyMergeMode: false
        };
    };

    const persisted = loadPersistedState();

    const [searchMode, setSearchMode] = useState(persisted.searchMode);
    const [selectedSpecialties, setSelectedSpecialties] = useState(persisted.selectedSpecialties);
    const [selectedCampaigns, setSelectedCampaigns] = useState(persisted.selectedCampaigns);
    const [selectedLists, setSelectedLists] = useState(persisted.selectedLists);
    const [selectedTags, setSelectedTags] = useState(persisted.selectedTags);
    const [selectedSegments, setSelectedSegments] = useState(persisted.selectedSegments);
    const [engagementType, setEngagementType] = useState(persisted.engagementType);
    const [specialtyMergeMode, setSpecialtyMergeMode] = useState(persisted.specialtyMergeMode);
    const [availableLists, setAvailableLists] = useState([]);
    const [availableTags, setAvailableTags] = useState([]);
    const [availableSegments, setAvailableSegments] = useState([]);
    const [listsLoading, setListsLoading] = useState(true);
    const [tagsLoading, setTagsLoading] = useState(true);
    const [segmentsLoading, setSegmentsLoading] = useState(true);
    const [specialties, setSpecialties] = useState([]);
    const [specialtiesLoading, setSpecialtiesLoading] = useState(true);
    const [campaigns, setCampaigns] = useState([]);
    const [showSpecialtySelector, setShowSpecialtySelector] = useState(false);
    const [showCampaignSelector, setShowCampaignSelector] = useState(false);
    const [showListSelector, setShowListSelector] = useState(false);
    const [showTagSelector, setShowTagSelector] = useState(false);
    const [showSegmentSelector, setShowSegmentSelector] = useState(false);
    const [specialtySearchTerm, setSpecialtySearchTerm] = useState('');
    const [campaignSearchTerm, setCampaignSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');

    const [findUsersTableState, setFindUsersTableState] = useState({
        sortColumn: null,
        sortDirection: null
    });
    const [findUsersPage, setFindUsersPage] = useState(1);

    const [analysisForm, setAnalysisForm] = useState({
        userInput: '',
        inputType: 'email'
    });
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [analysisResults, setAnalysisResults] = useState(null);
    const [analysisError, setAnalysisError] = useState('');
    const [analysisProgress, setAnalysisProgress] = useState(null);

    const [analyzeUsersTableState, setAnalyzeUsersTableState] = useState({
        sortColumn: null,
        sortDirection: null
    });
    const [analyzeUsersPage, setAnalyzeUsersPage] = useState(1);

    const [patternForm, setPatternForm] = useState({
        pattern_type: 'infrequent_responders',
        min_campaigns: 15,
        infrequent_threshold: 10,
        hyper_engaged_threshold: 65,
        fast_open_minutes: 30
    });
    const [patternLoading, setPatternLoading] = useState(false);
    const [patternResults, setPatternResults] = useState(null);
    const [patternError, setPatternError] = useState('');

    const [patternTableState, setPatternTableState] = useState({
        displayCount: 10,
        sortColumn: null,
        sortDirection: null,
        isFullyExpanded: false
    });

    const API_BASE = `${API_BASE_URL}/api`;

    useEffect(() => {
        try {
            const stateToPersist = {
                selectedSpecialties,
                selectedCampaigns,
                selectedLists,
                selectedTags,
                selectedSegments,
                searchMode,
                engagementType,
                specialtyMergeMode
            };
            localStorage.setItem('audienceQueryState', JSON.stringify(stateToPersist));
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                localStorage.removeItem('audienceQueryState');
            }
        }
    }, [selectedSpecialties, selectedCampaigns, selectedLists, selectedTags, selectedSegments, searchMode, engagementType, specialtyMergeMode]);

    useEffect(() => {
        fetchSpecialties();
        fetchCampaigns();
    }, [specialtyMergeMode]);

    useEffect(() => {
        const CACHE_KEY = 'aqb_overviews_cache_v1';
        const CACHE_TTL_MS = 10 * 60 * 1000;

        try {
            const cached = sessionStorage.getItem(CACHE_KEY);
            if (cached) {
                const { ts, lists, tags, segments } = JSON.parse(cached);
                if (Date.now() - ts < CACHE_TTL_MS) {
                    setAvailableLists(lists || []);
                    setAvailableTags(tags || []);
                    setAvailableSegments(segments || []);
                    setListsLoading(false);
                    setTagsLoading(false);
                    setSegmentsLoading(false);
                    return;
                }
            }
        } catch (e) {}

        const result = { lists: null, tags: null, segments: null };
        const writeCache = () => {
            if (result.lists && result.tags && result.segments) {
                try {
                    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), ...result }));
                } catch (e) {}
            }
        };

        fetch(`${API_BASE_URL}/api/list-management/digital-lists/overview`)
            .then(r => r.json()).catch(() => ({}))
            .then(l => {
                result.lists = Object.entries(l.subscribed_counts || {}).sort((a, b) => b[1] - a[1]).map(([v, n]) => ({ value: v, count: n }));
                setAvailableLists(result.lists);
                setListsLoading(false);
                writeCache();
            });

        fetch(`${API_BASE_URL}/api/list-management/tags/overview`)
            .then(r => r.json()).catch(() => ({}))
            .then(t => {
                result.tags = Object.entries(t.counts || {}).sort((a, b) => b[1] - a[1]).map(([v, n]) => ({ value: v, count: n }));
                setAvailableTags(result.tags);
                setTagsLoading(false);
                writeCache();
            });

        fetch(`${API_BASE_URL}/api/list-management/segments/overview`)
            .then(r => r.json()).catch(() => ({}))
            .then(s => {
                result.segments = Object.entries(s.counts || {}).sort((a, b) => b[1] - a[1]).map(([v, n]) => ({ value: v, count: n }));
                setAvailableSegments(result.segments);
                setSegmentsLoading(false);
                writeCache();
            });
    }, []);

    const fetchSpecialties = async () => {
        setSpecialtiesLoading(true);
        try {
            const url = `${API_BASE}/users/specialties?merge=${specialtyMergeMode}`;
            const response = await fetch(url);

            if (response.ok) {
                const data = await response.json();
                setSpecialties(data.specialties || []);
            }
        } catch (err) {
        } finally {
            setSpecialtiesLoading(false);
        }
    };

    const fetchCampaigns = async () => {
        try {
            const dashboardMetricsUrl = 'https://emaildash.blob.core.windows.net/json-data/dashboard_metrics.json?sp=r&st=2025-06-09T18:55:36Z&se=2027-06-17T02:55:36Z&spr=https&sv=2024-11-04&sr=b&sig=9o5%2B%2BHmlqiFuAQmw9bGl0D2485Z8xTy0XXsb10S2aCI%3D';
            const response = await fetch(`${dashboardMetricsUrl}&_t=${Date.now()}`);
            if (response.ok) {
                const data = await response.json();
                const validCampaigns = Array.isArray(data) ? data : [];
                setCampaigns(validCampaigns);
            }
        } catch (err) {
                    }
    };

    const clearFindUsers = () => {
        setResults(null);
        setSelectedSpecialties([]);
        setSelectedCampaigns([]);
        setSelectedLists([]);
        setSelectedTags([]);
        setSelectedSegments([]);
        setEngagementType('all');
        setError('');
        setFindUsersTableState({
            sortColumn: null,
            sortDirection: null
        });
        setFindUsersPage(1);
    };

    const clearAnalyzeUsers = () => {
        setAnalysisResults(null);
        setAnalysisForm({ userInput: '', inputType: 'email' });
        setAnalysisError('');
        setAnalyzeUsersTableState({
            sortColumn: null,
            sortDirection: null
        });
        setAnalyzeUsersPage(1);
    };

    const clearEngagementPatterns = () => {
        setPatternResults(null);
        setPatternForm({
            pattern_type: 'infrequent_responders',
            min_campaigns: 5,
            infrequent_threshold: 30,
            hyper_engaged_threshold: 70,
            fast_open_minutes: 30
        });
        setPatternError('');
        setPatternTableState({
            displayCount: 10,
            sortColumn: null,
            sortDirection: null,
            isFullyExpanded: false
        });
    };

    const clearAll = () => {
        setResults(null);
        setSelectedSpecialties([]);
        setSelectedCampaigns([]);
        setSelectedLists([]);
        setSelectedTags([]);
        setSelectedSegments([]);
        setEngagementType('all');
        setError('');
        setFindUsersTableState({
            sortColumn: null,
            sortDirection: null
        });
        setFindUsersPage(1);

        setAnalysisResults(null);
        setAnalysisForm({ userInput: '', inputType: 'email' });
        setAnalysisError('');
        setAnalyzeUsersTableState({
            sortColumn: null,
            sortDirection: null
        });
        setAnalyzeUsersPage(1);

        clearEngagementPatterns();

        localStorage.removeItem('audienceQueryState');
    };

    const handleSpecialtyToggle = (specialty) => {
        setSelectedSpecialties(prev => {
            const isSelected = prev.includes(specialty);
            return isSelected
                ? prev.filter(s => s !== specialty)
                : [...prev, specialty];
        });
    };

    const handleCampaignToggle = (campaign) => {
        setSelectedCampaigns(prev => {
            const isSelected = prev.includes(campaign.campaign_name);
            return isSelected
                ? prev.filter(c => c !== campaign.campaign_name)
                : [...prev, campaign.campaign_name];
        });
    };

    const handleSelectAllSpecialties = () => {
        const filteredSpecialties = specialties.filter(spec =>
            matchesSearchTerm(spec, specialtySearchTerm)
        );
        setSelectedSpecialties(filteredSpecialties);
    };

    const handleClearAllSpecialties = () => {
        setSelectedSpecialties([]);
    };

    const handleSelectAllCampaigns = () => {
        const filteredCampaigns = campaigns
            .filter(campaign =>
                matchesSearchTerm(campaign.campaign_name, campaignSearchTerm)
            )
            .map(c => c.campaign_name);
        setSelectedCampaigns(filteredCampaigns);
    };

    const handleClearAllCampaigns = () => {
        setSelectedCampaigns([]);
    };

    const handleFindUsers = async () => {
        setLoading(true);
        setError('');
        setResults(null);

        try {
            const requestData = {
                search_mode: searchMode,
                specialty_list: searchMode === 'specialty' ? selectedSpecialties : [],
                campaign_list: searchMode === 'campaign' ? selectedCampaigns : [],
                list_filter: searchMode === 'list' ? selectedLists : [],
                tag_filter: searchMode === 'tag' ? selectedTags : [],
                segment_filter: searchMode === 'segment' ? selectedSegments : [],
                engagement_type: engagementType,
                specialty_merge_mode: specialtyMergeMode,
                export_csv: false
            };

            if (searchMode === 'specialty' && selectedSpecialties.length === 0) {
                throw new Error('Please select at least one specialty');
            } else if (searchMode === 'campaign' && selectedCampaigns.length === 0) {
                throw new Error('Please select at least one campaign');
            } else if (searchMode === 'list' && selectedLists.length === 0) {
                throw new Error('Please select at least one list');
            } else if (searchMode === 'tag' && selectedTags.length === 0) {
                throw new Error('Please select at least one tag');
            } else if (searchMode === 'segment' && selectedSegments.length === 0) {
                throw new Error('Please select at least one segment');
            }

            const response = await fetch(`${API_BASE}/users/engagement-query`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.error || `HTTP ${response.status}`);
                } catch (parseErr) {
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }
            }

            const data = await response.json();
            setResults(data);

        } catch (err) {
            setError(err.message || 'Failed to process request');
        } finally {
            setLoading(false);
        }
    };

    const handleExportFindUsers = () => {
        if (!results || !results.users) return;

        const isMembership = ['list', 'tag', 'segment'].includes(searchMode);
        const headers = [
            'Email', 'NPI', 'First Name', 'Last Name', 'Specialty', 'Source', 'Status',
            ...(isMembership ? ['Membership Status', 'Current Memberships'] : []),
            'Campaigns', 'Unique Opens', 'Total Opens', 'Unique Clicks', 'Total Clicks',
            'UOR %', 'TOR %', 'UCR %', 'TCR %'
        ];

        const rows = results.users.map(user => {
            const isActive = user.user_is_active !== undefined ? user.user_is_active : user.is_active;
            const statusVal = isActive === true ? 'Active' : (isActive === false ? 'Inactive' : '');
            return [
                user.email,
                user.npi || '',
                user.first_name || '',
                user.last_name || '',
                user.specialty || '',
                user.source || '',
                statusVal,
                ...(isMembership ? [user.membership_status || '', (user.current_membership || []).join(' | ')] : []),
                user.campaign_count || 0,
                user.unique_opens || 0,
                user.total_opens || 0,
                user.unique_clicks || 0,
                user.total_clicks || 0,
                user.unique_open_rate || 0,
                user.total_open_rate || 0,
                user.unique_click_rate || 0,
                user.total_click_rate || 0
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', 'audience_query_results.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleAnalysisChange = (e) => {
        const { name, value } = e.target;
        setAnalysisForm(prev => ({
            ...prev,
            [name]: value
        }));
        if (analysisResults) {
            setAnalysisResults(null);
        }
    };

    const handleAnalysisSubmit = async (e) => {
        e.preventDefault();
        setAnalysisLoading(true);
        setAnalysisError('');
        setAnalysisResults(null);
        setAnalysisProgress(null);

        try {
            const userList = analysisForm.userInput
                .split(/[\n,;]/)
                .map(item => item.trim())
                .filter(item => item);

            if (userList.length === 0) {
                throw new Error('Please provide user identifiers');
            }

            const CHUNK_SIZE = 1500;
            const chunks = [];
            for (let i = 0; i < userList.length; i += CHUNK_SIZE) {
                chunks.push(userList.slice(i, i + CHUNK_SIZE));
            }

            const allUsers = [];
            const seenKeys = new Set();
            let processed = 0;

            for (const chunk of chunks) {
                const response = await fetch(`${API_BASE}/users/analyze-list`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user_list: chunk,
                        input_type: analysisForm.inputType,
                        export_csv: false
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP ${response.status}`);
                }

                const data = await response.json();
                if (data.users) {
                    for (const user of data.users) {
                        const key = (user.email || user.npi || '').toLowerCase();
                        if (key && seenKeys.has(key)) continue;
                        if (key) seenKeys.add(key);
                        allUsers.push(user);
                    }
                }

                processed += chunk.length;
                if (chunks.length > 1) {
                    setAnalysisProgress({ processed, total: userList.length });
                }
            }

            setAnalysisResults({
                success: true,
                total_count: allUsers.length,
                users: allUsers
            });
        } catch (err) {
            setAnalysisError(err.message || 'Failed to process request');
        } finally {
            setAnalysisLoading(false);
            setAnalysisProgress(null);
        }
    };

    const handleExportAnalyzeUsers = () => {
        if (!analysisResults || !analysisResults.users) return;

        const headers = [
            'Email', 'NPI', 'First Name', 'Last Name', 'Specialty', 'Source', 'Status',
            'Campaigns', 'Unique Opens', 'Total Opens', 'Unique Clicks', 'Total Clicks',
            'UOR %', 'TOR %', 'UCR %', 'TCR %'
        ];

        const rows = analysisResults.users.map(user => {
            const statusVal = user.is_active === true ? 'Active' : (user.is_active === false ? 'Inactive' : '');
            return [
                user.email,
                user.npi || '',
                user.first_name || '',
                user.last_name || '',
                user.specialty || '',
                user.source || '',
                statusVal,
                user.campaign_count || 0,
                user.unique_opens || 0,
                user.total_opens || 0,
                user.unique_clicks || 0,
                user.total_clicks || 0,
                user.unique_open_rate || 0,
                user.total_open_rate || 0,
                user.unique_click_rate || 0,
                user.total_click_rate || 0
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', 'user_analysis_results.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePatternChange = (e) => {
        const { name, value } = e.target;
        setPatternForm(prev => ({
            ...prev,
            [name]: name === 'pattern_type' ? value : Number(value)
        }));
        if (patternResults) {
            setPatternResults(null);
        }
    };

    const handlePatternSubmit = async (e) => {
        e.preventDefault();
        setPatternLoading(true);
        setPatternError('');
        setPatternResults(null);

        try {
            const requestData = {
                pattern_type: patternForm.pattern_type,
                min_campaigns: patternForm.min_campaigns,
                infrequent_threshold: patternForm.infrequent_threshold,
                hyper_engaged_threshold: patternForm.hyper_engaged_threshold,
                fast_open_minutes: patternForm.fast_open_minutes,
                export_csv: false
            };

            const response = await fetch(`${API_BASE}/users/engagement-patterns`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            setPatternResults(data);

        } catch (err) {
            setPatternError(err.message || 'Failed to process request');
        } finally {
            setPatternLoading(false);
        }
    };

    const handleExportPatterns = () => {
        if (!patternResults || !patternResults.users) return;

        const pattern_type = patternResults.summary.pattern_type;

        let headers, rows;

        if (pattern_type === 'declining_engagement') {
            headers = ['Email', 'NPI', 'First Name', 'Last Name', 'Specialty', 'Total Campaigns',
                      'Early Open Rate (%)', 'Late Open Rate (%)', 'Engagement Decline (%)'];
            rows = patternResults.users.map(user => [
                user.email, user.npi || '', user.first_name || '', user.last_name || '', user.specialty || '',
                user.total_campaigns || 0, user.early_open_rate || 0, user.late_open_rate || 0, user.engagement_decline || 0
            ]);
        } else if (pattern_type === 'fast_openers') {
            headers = ['Email', 'NPI', 'First Name', 'Last Name', 'Specialty', 'Campaigns Opened',
                      'Fast Opens', 'Avg Minutes to Open', 'Fast Open Rate (%)'];
            rows = patternResults.users.map(user => [
                user.email, user.npi || '', user.first_name || '', user.last_name || '', user.specialty || '',
                user.campaigns_opened || 0, user.fast_opens || 0, user.avg_minutes_to_open || 0, user.fast_open_rate || 0
            ]);
        } else if (pattern_type === 'recently_reengaged') {
            headers = ['Email', 'NPI', 'First Name', 'Last Name', 'Specialty', 'Total Campaigns',
                      'Recent Opens', 'Historical Opens', 'Recent Open Rate (%)', 'Historical Open Rate (%)'];
            rows = patternResults.users.map(user => [
                user.email, user.npi || '', user.first_name || '', user.last_name || '', user.specialty || '',
                user.total_campaigns || 0, user.recent_opens || 0, user.historical_opens || 0,
                user.recent_open_rate || 0, user.historical_open_rate || 0
            ]);
        } else if (pattern_type === 'weekend_warriors') {
            headers = ['Email', 'NPI', 'First Name', 'Last Name', 'Specialty', 'Total Opens',
                      'Weekend Opens', 'Weekday Opens', 'Weekend Rate (%)', 'Weekday Rate (%)'];
            rows = patternResults.users.map(user => [
                user.email, user.npi || '', user.first_name || '', user.last_name || '', user.specialty || '',
                user.total_delayed_opens || 0, user.weekend_opens || 0, user.weekday_opens || 0,
                user.weekend_open_rate || 0, user.weekday_open_rate || 0
            ]);
        } else if (pattern_type === 'binge_readers') {
            headers = ['Email', 'NPI', 'First Name', 'Last Name', 'Specialty', 'Total Opens',
                      'Rapid Opens', 'Binge Sessions', 'Binge Rate (%)'];
            rows = patternResults.users.map(user => [
                user.email, user.npi || '', user.first_name || '', user.last_name || '', user.specialty || '',
                user.total_opens || 0, user.rapid_opens || 0, user.binge_sessions || 0, user.binge_rate || 0
            ]);
        } else if (pattern_type === 'one_and_done') {
            headers = ['Email', 'NPI', 'First Name', 'Last Name', 'Specialty', 'Total Campaigns',
                      'First 3 Opens', 'Later Opens', 'Early Rate (%)'];
            rows = patternResults.users.map(user => [
                user.email, user.npi || '', user.first_name || '', user.last_name || '', user.specialty || '',
                user.total_campaigns || 0, user.first_three_opens || 0, user.later_opens || 0, user.early_open_rate || 0
            ]);
        } else if (pattern_type === 'early_birds_night_owls') {
            headers = ['Email', 'NPI', 'First Name', 'Last Name', 'Specialty', 'Total Opens',
                      'Avg Hour', 'Early Morning Opens', 'Night Opens', 'Reader Type'];
            rows = patternResults.users.map(user => [
                user.email, user.npi || '', user.first_name || '', user.last_name || '', user.specialty || '',
                user.total_delayed_opens || 0, user.avg_hour || 0, user.early_morning_opens || 0,
                user.night_opens || 0, user.reader_type || ''
            ]);
        } else {
            headers = ['Email', 'NPI', 'First Name', 'Last Name', 'Specialty', 'Campaigns Received',
                      'Campaigns Opened', 'Campaigns Clicked', 'Total Opens', 'Total Clicks',
                      'UOR %', 'TOR %', 'UCR %', 'TCR %'];
            rows = patternResults.users.map(user => [
                user.email, user.npi || '', user.first_name || '', user.last_name || '', user.specialty || '',
                user.campaigns_received || 0, user.campaigns_opened || 0, user.campaigns_clicked || 0,
                user.total_opens || 0, user.total_clicks || 0, user.unique_open_rate || 0,
                user.total_open_rate || 0, user.unique_click_rate || 0, user.total_click_rate || 0
            ]);
        }

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `engagement_pattern_${pattern_type}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const sortUsers = useCallback((users, column, direction) => {
        if (!column || !direction) return users;

        const sorted = [...users];
        sorted.sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];

            if (column === 'name') {
                aVal = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
                bVal = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
            } else if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = (bVal || '').toLowerCase();
            }

            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, []);

    const handleFindUsersSort = useCallback((column) => {
        let newDirection = 'desc';

        if (findUsersTableState.sortColumn === column) {
            newDirection = findUsersTableState.sortDirection === 'asc' ? 'desc' : 'asc';
        }

        setFindUsersTableState(prev => ({
            ...prev,
            sortColumn: column,
            sortDirection: newDirection
        }));
    }, [findUsersTableState]);

    const handleAnalyzeUsersSort = useCallback((column) => {
        let newDirection = 'desc';

        if (analyzeUsersTableState.sortColumn === column) {
            newDirection = analyzeUsersTableState.sortDirection === 'asc' ? 'desc' : 'asc';
        }

        setAnalyzeUsersTableState(prev => ({
            ...prev,
            sortColumn: column,
            sortDirection: newDirection
        }));
    }, [analyzeUsersTableState]);

    const handlePatternSort = useCallback((column) => {
        let newDirection = 'desc';

        if (patternTableState.sortColumn === column) {
            newDirection = patternTableState.sortDirection === 'asc' ? 'desc' : 'asc';
        }

        setPatternTableState(prev => ({
            ...prev,
            sortColumn: column,
            sortDirection: newDirection
        }));
    }, [patternTableState]);

    const filteredSpecialties = specialties.filter(spec =>
        matchesSearchTerm(spec, specialtySearchTerm)
    );

    const filteredCampaigns = campaigns.filter(campaign =>
        matchesSearchTerm(campaign.campaign_name, campaignSearchTerm)
    );

    const PER_PAGE = 100;

    let findUsersDisplayData = [];
    let findUsersVisibleData = [];
    let findUsersTotalPages = 1;
    if (results && results.users) {
        findUsersDisplayData = results.users;
        if (findUsersTableState.sortColumn) {
            findUsersDisplayData = sortUsers(findUsersDisplayData, findUsersTableState.sortColumn, findUsersTableState.sortDirection);
        }
        findUsersTotalPages = Math.max(1, Math.ceil(findUsersDisplayData.length / PER_PAGE));
        const findStart = (findUsersPage - 1) * PER_PAGE;
        findUsersVisibleData = findUsersDisplayData.slice(findStart, findStart + PER_PAGE);
    }

    let analyzeUsersDisplayData = [];
    let analyzeUsersVisibleData = [];
    let analyzeUsersTotalPages = 1;
    if (analysisResults && analysisResults.users) {
        analyzeUsersDisplayData = analysisResults.users;
        if (analyzeUsersTableState.sortColumn) {
            analyzeUsersDisplayData = sortUsers(analyzeUsersDisplayData, analyzeUsersTableState.sortColumn, analyzeUsersTableState.sortDirection);
        }
        analyzeUsersTotalPages = Math.max(1, Math.ceil(analyzeUsersDisplayData.length / PER_PAGE));
        const analyzeStart = (analyzeUsersPage - 1) * PER_PAGE;
        analyzeUsersVisibleData = analyzeUsersDisplayData.slice(analyzeStart, analyzeStart + PER_PAGE);
    }

    let patternDisplayData = [];
    let patternVisibleData = [];
    let patternHasMore = false;
    if (patternResults && patternResults.users) {
        patternDisplayData = patternResults.users;
        if (patternTableState.sortColumn) {
            patternDisplayData = sortUsers(patternDisplayData, patternTableState.sortColumn, patternTableState.sortDirection);
        }
        const maxDisplay = Math.min(patternDisplayData.length, 1000);
        const displayLimit = patternTableState.isFullyExpanded ? maxDisplay : patternTableState.displayCount;
        patternVisibleData = patternDisplayData.slice(0, displayLimit);
        patternHasMore = patternDisplayData.length > patternVisibleData.length;
    }

    return (
        <div className="audience-query-builder">
            <div className="query-sections-wrapper">
                <div className="query-section discovery-section" style={activeSection && activeSection !== 'find' ? { display: 'none' } : undefined}>
                    <div className="section-header-bar">
                        <h3>Find Users</h3>
                        <button className="section-header-clear-btn" onClick={clearFindUsers}>Clear</button>
                    </div>
                    <div className="query-section-content">
                        <div className="query-form">
                            <div className="form-group full-width">
                                <label>Search By</label>
                                <div className="search-mode-toggle">
                                    <button
                                        type="button"
                                        className={`mode-button ${searchMode === 'specialty' ? 'active' : ''}`}
                                        onClick={() => setSearchMode('specialty')}
                                    >
                                        Specialty
                                    </button>
                                    <button
                                        type="button"
                                        className={`mode-button ${searchMode === 'campaign' ? 'active' : ''}`}
                                        onClick={() => setSearchMode('campaign')}
                                    >
                                        Campaign
                                    </button>
                                    <button
                                        type="button"
                                        className={`mode-button ${searchMode === 'list' ? 'active' : ''}`}
                                        onClick={() => setSearchMode('list')}
                                    >
                                        List
                                    </button>
                                    <button
                                        type="button"
                                        className={`mode-button ${searchMode === 'tag' ? 'active' : ''}`}
                                        onClick={() => setSearchMode('tag')}
                                    >
                                        Tag
                                    </button>
                                    <button
                                        type="button"
                                        className={`mode-button ${searchMode === 'segment' ? 'active' : ''}`}
                                        onClick={() => setSearchMode('segment')}
                                    >
                                        Segment
                                    </button>
                                </div>
                            </div>

                            <div className="form-grid">
                                {searchMode === 'specialty' && (
                                    <div className="form-group full-width">
                                        <div className="form-group-header">
                                            <label>Select Specialties</label>
                                            <label className="checkbox-label">
                                                <input
                                                    type="checkbox"
                                                    checked={specialtyMergeMode}
                                                    onChange={(e) => {
                                                        setSpecialtyMergeMode(e.target.checked);
                                                        setSelectedSpecialties([]);
                                                    }}
                                                />
                                                <span>Merge Subspecialties</span>
                                            </label>
                                        </div>
                                        <button
                                            type="button"
                                            className="selector-button"
                                            onClick={() => setShowSpecialtySelector(true)}
                                        >
                                            {selectedSpecialties.length === 0
                                                ? 'Select Specialties'
                                                : `${selectedSpecialties.length} Specialt${selectedSpecialties.length !== 1 ? 'ies' : 'y'} Selected`
                                            }
                                        </button>
                                    </div>
                                )}

                                {(searchMode === 'specialty' || searchMode === 'campaign') && (
                                    <div className="form-group full-width">
                                        <label>
                                            {searchMode === 'campaign' ? 'Select Campaigns' : 'Filter by Campaigns'}
                                        </label>
                                        <button
                                            type="button"
                                            className="selector-button"
                                            onClick={() => setShowCampaignSelector(true)}
                                        >
                                            {selectedCampaigns.length === 0
                                                ? 'Select Campaigns'
                                                : `${selectedCampaigns.length} Campaign${selectedCampaigns.length !== 1 ? 's' : ''} Selected`
                                            }
                                        </button>
                                    </div>
                                )}

                                {searchMode === 'list' && (
                                    <div className="form-group full-width">
                                        <label>Select Lists</label>
                                        <button
                                            type="button"
                                            className="selector-button"
                                            onClick={() => setShowListSelector(true)}
                                        >
                                            {selectedLists.length === 0
                                                ? 'Select Lists'
                                                : `${selectedLists.length} List${selectedLists.length !== 1 ? 's' : ''} Selected`}
                                        </button>
                                    </div>
                                )}

                                {searchMode === 'tag' && (
                                    <div className="form-group full-width">
                                        <label>Select Tags</label>
                                        <button
                                            type="button"
                                            className="selector-button"
                                            onClick={() => setShowTagSelector(true)}
                                        >
                                            {selectedTags.length === 0
                                                ? 'Select Tags'
                                                : `${selectedTags.length} Tag${selectedTags.length !== 1 ? 's' : ''} Selected`}
                                        </button>
                                    </div>
                                )}

                                {searchMode === 'segment' && (
                                    <div className="form-group full-width">
                                        <label>Select Segments</label>
                                        <button
                                            type="button"
                                            className="selector-button"
                                            onClick={() => setShowSegmentSelector(true)}
                                        >
                                            {selectedSegments.length === 0
                                                ? 'Select Segments'
                                                : `${selectedSegments.length} Segment${selectedSegments.length !== 1 ? 's' : ''} Selected`}
                                        </button>
                                    </div>
                                )}

                                <div className="form-group">
                                    <label htmlFor="engagement_type">Engagement Status</label>
                                    <select
                                        id="engagement_type"
                                        value={engagementType}
                                        onChange={(e) => setEngagementType(e.target.value)}
                                        className="form-select"
                                    >
                                        <option value="all">All Users</option>
                                        <option value="opened">Opened Emails</option>
                                        <option value="unopened">Never Opened</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-actions">
                                <button
                                    type="button"
                                    className="submit-button"
                                    disabled={loading}
                                    onClick={handleFindUsers}
                                >
                                    {loading ? 'Searching...' : 'Find Users'}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="error-message">
                                <p>{error}</p>
                            </div>
                        )}

                        {results && results.success && results.aggregate && (
                            <div className="results-section">
                                <div className="aggregate-overview">
                                    <h4>Overview</h4>
                                    <div className="aggregate-grid">
                                        <div className="aggregate-stat">
                                            <span className="aqb-stat-label">Total Delivered</span>
                                            <span className="aqb-stat-value">{(results.aggregate.total_delivered || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="aggregate-stat">
                                            <span className="aqb-stat-label">Unique Opens</span>
                                            <span className="aqb-stat-value">{(results.aggregate.total_unique_opens || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="aggregate-stat">
                                            <span className="aqb-stat-label">Unique Open Rate</span>
                                            <span className="aqb-stat-value">{results.aggregate.avg_unique_open_rate || 0}%</span>
                                        </div>
                                        <div className="aggregate-stat">
                                            <span className="aqb-stat-label">Total Open Rate</span>
                                            <span className="aqb-stat-value">{results.aggregate.avg_total_open_rate || 0}%</span>
                                        </div>
                                        <div className="aggregate-stat">
                                            <span className="aqb-stat-label">Unique Click Rate</span>
                                            <span className="aqb-stat-value">{results.aggregate.avg_unique_click_rate || 0}%</span>
                                        </div>
                                        <div className="aggregate-stat">
                                            <span className="aqb-stat-label">Total Click Rate</span>
                                            <span className="aqb-stat-value">{results.aggregate.avg_total_click_rate || 0}%</span>
                                        </div>
                                    </div>
                                    <div className="aggregate-lists">
                                        <div className="aggregate-list-item">
                                            <strong>Specialties:</strong> {(results.aggregate.specialties || []).join(', ') || 'None'}
                                        </div>
                                        <div className="aggregate-list-item">
                                            <strong>Campaigns:</strong> {(results.aggregate.campaigns || []).slice(0, 5).join(', ') || 'None'}
                                            {(results.aggregate.campaigns || []).length > 5 && ` +${results.aggregate.campaigns.length - 5} more`}
                                        </div>
                                    </div>
                                </div>

                                {results.users && results.users.length > 0 && (
                                    <div className="sample-data-section">
                                        <div className="table-header-row">
                                            <h4>User Data ({findUsersDisplayData.length.toLocaleString()} users)</h4>
                                            {findUsersDisplayData.length > 0 && (
                                                <button className="export-button" onClick={handleExportFindUsers}>Export CSV</button>
                                            )}
                                        </div>

                                        <div className="table-container">
                                            <table className="results-table">
                                                <thead>
                                                    <tr>
                                                        <th onClick={() => handleFindUsersSort('email')} className="sortable">
                                                            Email {findUsersTableState.sortColumn === 'email' && (findUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleFindUsersSort('npi')} className="sortable">
                                                            NPI {findUsersTableState.sortColumn === 'npi' && (findUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleFindUsersSort('name')} className="sortable">
                                                            Name {findUsersTableState.sortColumn === 'name' && (findUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleFindUsersSort('specialty')} className="sortable">
                                                            Specialty {findUsersTableState.sortColumn === 'specialty' && (findUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleFindUsersSort('source')} className="sortable">
                                                            Source {findUsersTableState.sortColumn === 'source' && (findUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleFindUsersSort('user_is_active')} className="sortable">
                                                            Status {findUsersTableState.sortColumn === 'user_is_active' && (findUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleFindUsersSort('campaign_count')} className="sortable">
                                                            Campaigns {findUsersTableState.sortColumn === 'campaign_count' && (findUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleFindUsersSort('unique_opens')} className="sortable">
                                                            U Opens {findUsersTableState.sortColumn === 'unique_opens' && (findUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleFindUsersSort('total_opens')} className="sortable">
                                                            T Opens {findUsersTableState.sortColumn === 'total_opens' && (findUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleFindUsersSort('unique_clicks')} className="sortable">
                                                            U Clicks {findUsersTableState.sortColumn === 'unique_clicks' && (findUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleFindUsersSort('total_clicks')} className="sortable">
                                                            T Clicks {findUsersTableState.sortColumn === 'total_clicks' && (findUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleFindUsersSort('unique_open_rate')} className="sortable">
                                                            UOR % {findUsersTableState.sortColumn === 'unique_open_rate' && (findUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleFindUsersSort('total_open_rate')} className="sortable">
                                                            TOR % {findUsersTableState.sortColumn === 'total_open_rate' && (findUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleFindUsersSort('unique_click_rate')} className="sortable">
                                                            UCR % {findUsersTableState.sortColumn === 'unique_click_rate' && (findUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleFindUsersSort('total_click_rate')} className="sortable">
                                                            TCR % {findUsersTableState.sortColumn === 'total_click_rate' && (findUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {findUsersVisibleData.map((user, idx) => {
                                                        const statusBadge = user.membership_status === 'former'
                                                            ? <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '3px', border: '1px solid #b45309', background: 'rgba(180, 83, 9, 0.15)', color: '#fbbf24', fontSize: '0.7rem', fontWeight: 600, marginRight: '6px' }} title={`Was on ${searchMode} at some point; no longer`}>former</span>
                                                            : user.membership_status === 'partial'
                                                                ? <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '3px', border: '1px solid #4b5563', background: 'rgba(75, 85, 99, 0.2)', color: '#d1d5db', fontSize: '0.7rem', fontWeight: 600, marginRight: '6px' }} title={`Currently on: ${(user.current_membership || []).join(', ')}`}>partial</span>
                                                                : user.membership_status === 'current'
                                                                    ? <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '3px', border: '1px solid #166534', background: 'rgba(22, 101, 52, 0.2)', color: '#86efac', fontSize: '0.7rem', fontWeight: 600, marginRight: '6px' }} title="Currently on all selected">current</span>
                                                                    : null;
                                                        const rowStyle = user.membership_status === 'former' || user.user_is_active === false ? { opacity: 0.7 } : undefined;
                                                        return (
                                                            <tr key={idx} style={rowStyle}>
                                                                <td>{statusBadge}{user.email}</td>
                                                                <td>{user.npi || ''}</td>
                                                                <td>{user.first_name} {user.last_name}</td>
                                                                <td>{user.specialty}</td>
                                                                <td>
                                                                    {user.source ? (
                                                                        <span className={`source-badge ${user.source.toLowerCase()}`}>{user.source}</span>
                                                                    ) : ''}
                                                                </td>
                                                                <td>
                                                                    {user.user_is_active === true ? (
                                                                        <span className="status-badge active">Active</span>
                                                                    ) : user.user_is_active === false ? (
                                                                        <span className="status-badge inactive">Inactive</span>
                                                                    ) : ''}
                                                                </td>
                                                                <td title={(user.campaigns_sent || []).join(', ')}>
                                                                    {user.campaign_count || 0} campaign{user.campaign_count !== 1 ? 's' : ''}
                                                                </td>
                                                                <td>{user.unique_opens || 0}</td>
                                                                <td>{user.total_opens || 0}</td>
                                                                <td>{user.unique_clicks || 0}</td>
                                                                <td>{user.total_clicks || 0}</td>
                                                                <td>{user.unique_open_rate || 0}%</td>
                                                                <td>{user.total_open_rate || 0}%</td>
                                                                <td>{user.unique_click_rate || 0}%</td>
                                                                <td>{user.total_click_rate || 0}%</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        <TablePagination
                                            currentPage={findUsersPage}
                                            totalPages={findUsersTotalPages}
                                            onPageChange={setFindUsersPage}
                                        />
                                    </div>
                                )}

                                {results.users && results.users.length === 0 && (
                                    <div className="sample-note">
                                        No users found matching the criteria.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="query-section analysis-section" style={activeSection && activeSection !== 'analyze' ? { display: 'none' } : undefined}>
                    <div className="section-header-bar">
                        <h3>Analyze Users</h3>
                        <button className="section-header-clear-btn" onClick={clearAnalyzeUsers}>Clear</button>
                    </div>
                    <div className="query-section-content">
                        <form onSubmit={handleAnalysisSubmit} className="query-form">
                            <div className="form-group">
                                <label htmlFor="inputType">Identifier Type</label>
                                <select
                                    id="inputType"
                                    name="inputType"
                                    value={analysisForm.inputType}
                                    onChange={handleAnalysisChange}
                                    className="form-select"
                                >
                                    <option value="email">Email</option>
                                    <option value="npi">NPI</option>
                                </select>
                            </div>

                            <div className="form-group full-width">
                                <label htmlFor="userInput">Paste User Identifiers</label>
                                <textarea
                                    id="userInput"
                                    name="userInput"
                                    value={analysisForm.userInput}
                                    onChange={handleAnalysisChange}
                                    placeholder=""
                                    rows="6"
                                />
                            </div>
                            <div className="form-actions">
                                <button
                                    type="submit"
                                    className="submit-button"
                                    disabled={analysisLoading}
                                >
                                    {analysisLoading
                                        ? (analysisProgress
                                            ? `Analyzing ${analysisProgress.processed.toLocaleString()} / ${analysisProgress.total.toLocaleString()}...`
                                            : 'Analyzing...')
                                        : 'Analyze Users'}
                                </button>
                            </div>
                        </form>

                        {analysisError && (
                            <div className="error-message">
                                <p>{analysisError}</p>
                            </div>
                        )}

                        {analysisResults && analysisResults.success && analysisResults.users && (
                            <div className="results-section">
                                <div className="sample-data-section">
                                        <div className="table-header-row">
                                            <h4>Results ({analyzeUsersDisplayData.length} users)</h4>
                                            {analyzeUsersDisplayData.length > 0 && (
                                                <button className="export-button" onClick={handleExportAnalyzeUsers}>Export CSV</button>
                                            )}
                                        </div>

                                        <div className="table-container">
                                            <table className="results-table">
                                                <thead>
                                                    <tr>
                                                        <th onClick={() => handleAnalyzeUsersSort('email')} className="sortable">
                                                            Email {analyzeUsersTableState.sortColumn === 'email' && (analyzeUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleAnalyzeUsersSort('npi')} className="sortable">
                                                            NPI {analyzeUsersTableState.sortColumn === 'npi' && (analyzeUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleAnalyzeUsersSort('name')} className="sortable">
                                                            Name {analyzeUsersTableState.sortColumn === 'name' && (analyzeUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleAnalyzeUsersSort('specialty')} className="sortable">
                                                            Specialty {analyzeUsersTableState.sortColumn === 'specialty' && (analyzeUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleAnalyzeUsersSort('source')} className="sortable">
                                                            Source {analyzeUsersTableState.sortColumn === 'source' && (analyzeUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleAnalyzeUsersSort('is_active')} className="sortable">
                                                            Status {analyzeUsersTableState.sortColumn === 'is_active' && (analyzeUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleAnalyzeUsersSort('campaign_count')} className="sortable">
                                                            Campaigns {analyzeUsersTableState.sortColumn === 'campaign_count' && (analyzeUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleAnalyzeUsersSort('unique_opens')} className="sortable">
                                                            U Opens {analyzeUsersTableState.sortColumn === 'unique_opens' && (analyzeUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleAnalyzeUsersSort('total_opens')} className="sortable">
                                                            T Opens {analyzeUsersTableState.sortColumn === 'total_opens' && (analyzeUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleAnalyzeUsersSort('unique_clicks')} className="sortable">
                                                            U Clicks {analyzeUsersTableState.sortColumn === 'unique_clicks' && (analyzeUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleAnalyzeUsersSort('total_clicks')} className="sortable">
                                                            T Clicks {analyzeUsersTableState.sortColumn === 'total_clicks' && (analyzeUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleAnalyzeUsersSort('unique_open_rate')} className="sortable">
                                                            UOR % {analyzeUsersTableState.sortColumn === 'unique_open_rate' && (analyzeUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleAnalyzeUsersSort('total_open_rate')} className="sortable">
                                                            TOR % {analyzeUsersTableState.sortColumn === 'total_open_rate' && (analyzeUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleAnalyzeUsersSort('unique_click_rate')} className="sortable">
                                                            UCR % {analyzeUsersTableState.sortColumn === 'unique_click_rate' && (analyzeUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handleAnalyzeUsersSort('total_click_rate')} className="sortable">
                                                            TCR % {analyzeUsersTableState.sortColumn === 'total_click_rate' && (analyzeUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {analyzeUsersVisibleData.map((user, idx) => (
                                                        <tr key={idx}>
                                                            <td>{user.email}</td>
                                                            <td>{user.npi || ''}</td>
                                                            <td>{user.first_name} {user.last_name}</td>
                                                            <td>{user.specialty}</td>
                                                            <td>
                                                                {user.source ? (
                                                                    <span className={`source-badge ${user.source.toLowerCase()}`}>{user.source}</span>
                                                                ) : ''}
                                                            </td>
                                                            <td>
                                                                {user.is_active === true ? (
                                                                    <span className="status-badge active">Active</span>
                                                                ) : user.is_active === false ? (
                                                                    <span className="status-badge inactive">Inactive</span>
                                                                ) : ''}
                                                            </td>
                                                            <td title={(user.campaigns_sent || []).join(', ')}>
                                                                {user.campaign_count || 0} campaign{user.campaign_count !== 1 ? 's' : ''}
                                                            </td>
                                                            <td>{user.unique_opens}</td>
                                                            <td>{user.total_opens}</td>
                                                            <td>{user.unique_clicks}</td>
                                                            <td>{user.total_clicks}</td>
                                                            <td>{user.unique_open_rate}%</td>
                                                            <td>{user.total_open_rate}%</td>
                                                            <td>{user.unique_click_rate}%</td>
                                                            <td>{user.total_click_rate}%</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <TablePagination
                                            currentPage={analyzeUsersPage}
                                            totalPages={analyzeUsersTotalPages}
                                            onPageChange={setAnalyzeUsersPage}
                                        />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            

            {showSpecialtySelector && (
                <div className="aqb-modal-overlay" onClick={() => setShowSpecialtySelector(false)}>
                    <div className="aqb-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="aqb-modal-header">
                            <h2>Select Specialties</h2>
                            <button
                                className="aqb-modal-close"
                                onClick={() => setShowSpecialtySelector(false)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="aqb-modal-search">
                            <input
                                type="text"
                                placeholder="Search specialties"
                                value={specialtySearchTerm}
                                onChange={(e) => setSpecialtySearchTerm(e.target.value)}
                                className="aqb-search-input"
                            />
                        </div>

                        <div className="aqb-modal-actions">
                            <button
                                type="button"
                                onClick={handleSelectAllSpecialties}
                                className="aqb-action-button select-all"
                            >
                                Select All
                            </button>
                            <button
                                type="button"
                                onClick={handleClearAllSpecialties}
                                className="aqb-action-button clear-all"
                            >
                                Clear All
                            </button>
                            <div className="aqb-selection-count">
                                {selectedSpecialties.length} selected
                            </div>
                        </div>

                        <div className="aqb-modal-list">
                            {specialtiesLoading ? (
                                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-secondary, #b8b8b8)' }}>
                                    <div style={{
                                        width: '24px',
                                        height: '24px',
                                        border: '2px solid #333',
                                        borderTopColor: '#0ff',
                                        borderRadius: '50%',
                                        animation: 'spin 0.8s linear infinite',
                                        margin: '0 auto 12px'
                                    }}></div>
                                    <p style={{ fontSize: '13px', margin: 0 }}>Loading specialties...</p>
                                </div>
                            ) : filteredSpecialties.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-secondary, #b8b8b8)' }}>
                                    {specialties.length === 0 ? (
                                        <>
                                            <p>No specialties found in the database.</p>
                                            <p style={{ fontSize: '0.875rem', marginTop: '8px' }}>
                                                Database connection error. Ensure the user_profiles table has specialty data.
                                            </p>
                                        </>
                                    ) : (
                                        <p>No matching specialties.</p>
                                    )}
                                </div>
                            ) : (
                                filteredSpecialties.map(specialty => {
                                    const isSelected = selectedSpecialties.includes(specialty);
                                    return (
                                        <div
                                            key={specialty}
                                            className={`aqb-modal-list-item ${isSelected ? 'selected' : ''}`}
                                            onClick={() => handleSpecialtyToggle(specialty)}
                                        >
                                            <div className="aqb-item-checkbox">
                                                {isSelected && <span className="checkmark">✓</span>}
                                            </div>
                                            <div className="aqb-item-info">
                                                <div className="aqb-item-name">{specialty}</div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="aqb-modal-footer">
                            <button
                                type="button"
                                onClick={() => setShowSpecialtySelector(false)}
                                className="aqb-done-button"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showCampaignSelector && (
                <div className="aqb-modal-overlay" onClick={() => setShowCampaignSelector(false)}>
                    <div className="aqb-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="aqb-modal-header">
                            <h2>Select Campaigns</h2>
                            <button
                                className="aqb-modal-close"
                                onClick={() => setShowCampaignSelector(false)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="aqb-modal-search">
                            <input
                                type="text"
                                placeholder="Search campaigns"
                                value={campaignSearchTerm}
                                onChange={(e) => setCampaignSearchTerm(e.target.value)}
                                className="aqb-search-input"
                            />
                        </div>

                        <div className="aqb-modal-actions">
                            <button
                                type="button"
                                onClick={handleSelectAllCampaigns}
                                className="aqb-action-button select-all"
                            >
                                Select All
                            </button>
                            <button
                                type="button"
                                onClick={handleClearAllCampaigns}
                                className="aqb-action-button clear-all"
                            >
                                Clear All
                            </button>
                            <div className="aqb-selection-count">
                                {selectedCampaigns.length} selected
                            </div>
                        </div>

                        <div className="aqb-modal-list">
                            {[...filteredCampaigns].sort((a, b) => new Date(b.send_date) - new Date(a.send_date)).map(campaign => {
                                const isSelected = selectedCampaigns.includes(campaign.campaign_name);
                                return (
                                    <div
                                        key={campaign.campaign_name}
                                        className={`aqb-modal-list-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleCampaignToggle(campaign)}
                                    >
                                        <div className="aqb-item-checkbox">
                                            {isSelected && <span className="checkmark">✓</span>}
                                        </div>
                                        <div className="aqb-item-info">
                                            <div className="aqb-item-name">{campaign.campaign_name}</div>
                                            <div className="aqb-item-stats">
                                                <span>Opens: {campaign.volume_metrics?.unique_opens?.toLocaleString() || 'N/A'}</span>
                                                <span>Rate: {campaign.core_metrics?.unique_open_rate?.toFixed(1) || 'N/A'}%</span>
                                                <span>Delivered: {campaign.volume_metrics?.delivered?.toLocaleString() || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="aqb-modal-footer">
                            <button
                                type="button"
                                onClick={() => setShowCampaignSelector(false)}
                                className="aqb-done-button"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showListSelector && (
                <ListPickerModal
                    title="Select Lists"
                    options={availableLists}
                    selected={selectedLists}
                    onChange={setSelectedLists}
                    onClose={() => setShowListSelector(false)}
                    searchPlaceholder="Search lists"
                    loading={listsLoading}
                    emptyLabel="No lists available."
                />
            )}

            {showTagSelector && (
                <ListPickerModal
                    title="Select Tags"
                    options={availableTags}
                    selected={selectedTags}
                    onChange={setSelectedTags}
                    onClose={() => setShowTagSelector(false)}
                    searchPlaceholder="Search tags"
                    loading={tagsLoading}
                    emptyLabel="No tags available."
                />
            )}

            {showSegmentSelector && (
                <ListPickerModal
                    title="Select Segments"
                    options={availableSegments}
                    selected={selectedSegments}
                    onChange={setSelectedSegments}
                    onClose={() => setShowSegmentSelector(false)}
                    searchPlaceholder="Search segments"
                    loading={segmentsLoading}
                    emptyLabel="No segments available."
                />
            )}
        </div>
    );
};

export default AudienceQueryBuilder;