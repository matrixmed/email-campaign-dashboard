import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import '../../styles/AudienceQueryBuilder.css';
import { API_BASE_URL } from '../../config/api';

const AudienceQueryBuilder = forwardRef((props, ref) => {
    const loadPersistedState = () => {
        try {
            const saved = localStorage.getItem('audienceQueryState');
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    selectedSpecialties: parsed.selectedSpecialties || [],
                    selectedCampaigns: parsed.selectedCampaigns || [],
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
            searchMode: 'specialty',
            engagementType: 'all',
            specialtyMergeMode: false
        };
    };

    const persisted = loadPersistedState();

    const [searchMode, setSearchMode] = useState(persisted.searchMode);
    const [selectedSpecialties, setSelectedSpecialties] = useState(persisted.selectedSpecialties);
    const [selectedCampaigns, setSelectedCampaigns] = useState(persisted.selectedCampaigns);
    const [engagementType, setEngagementType] = useState(persisted.engagementType);
    const [specialtyMergeMode, setSpecialtyMergeMode] = useState(persisted.specialtyMergeMode);
    const [specialties, setSpecialties] = useState([]);
    const [specialtiesLoading, setSpecialtiesLoading] = useState(true);
    const [campaigns, setCampaigns] = useState([]);
    const [showSpecialtySelector, setShowSpecialtySelector] = useState(false);
    const [showCampaignSelector, setShowCampaignSelector] = useState(false);
    const [specialtySearchTerm, setSpecialtySearchTerm] = useState('');
    const [campaignSearchTerm, setCampaignSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');

    const [findUsersTableState, setFindUsersTableState] = useState({
        displayCount: 10,
        sortColumn: null,
        sortDirection: null,
        isFullyExpanded: false
    });

    const [analysisForm, setAnalysisForm] = useState({
        userInput: '',
        inputType: 'email'
    });
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [analysisResults, setAnalysisResults] = useState(null);
    const [analysisError, setAnalysisError] = useState('');

    const [analyzeUsersTableState, setAnalyzeUsersTableState] = useState({
        displayCount: 10,
        sortColumn: null,
        sortDirection: null,
        isFullyExpanded: false
    });

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
    }, [selectedSpecialties, selectedCampaigns, searchMode, engagementType, specialtyMergeMode]);

    useEffect(() => {
        fetchSpecialties();
        fetchCampaigns();
    }, [specialtyMergeMode]);

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
            const response = await fetch(dashboardMetricsUrl);
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
        setEngagementType('all');
        setError('');
        setFindUsersTableState({
            displayCount: 10,
            sortColumn: null,
            sortDirection: null,
            isFullyExpanded: false
        });
    };

    const clearAnalyzeUsers = () => {
        setAnalysisResults(null);
        setAnalysisForm({ userInput: '', inputType: 'email' });
        setAnalysisError('');
        setAnalyzeUsersTableState({
            displayCount: 10,
            sortColumn: null,
            sortDirection: null,
            isFullyExpanded: false
        });
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
        setEngagementType('all');
        setError('');
        setFindUsersTableState({
            displayCount: 10,
            sortColumn: null,
            sortDirection: null,
            isFullyExpanded: false
        });

        setAnalysisResults(null);
        setAnalysisForm({ userInput: '', inputType: 'email' });
        setAnalysisError('');
        setAnalyzeUsersTableState({
            displayCount: 10,
            sortColumn: null,
            sortDirection: null,
            isFullyExpanded: false
        });

        clearEngagementPatterns();

        localStorage.removeItem('audienceQueryState');
    };

    useImperativeHandle(ref, () => ({
        clearAll
    }));

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
            spec.toLowerCase().includes(specialtySearchTerm.toLowerCase())
        );
        setSelectedSpecialties(filteredSpecialties);
    };

    const handleClearAllSpecialties = () => {
        setSelectedSpecialties([]);
    };

    const handleSelectAllCampaigns = () => {
        const filteredCampaigns = campaigns
            .filter(campaign =>
                campaign.campaign_name.toLowerCase().includes(campaignSearchTerm.toLowerCase())
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
                campaign_list: selectedCampaigns,
                engagement_type: engagementType,
                specialty_merge_mode: specialtyMergeMode,
                export_csv: false
            };

            if (searchMode === 'specialty') {
                if (selectedSpecialties.length === 0) {
                    throw new Error('Please select at least one specialty');
                }
            } else if (searchMode === 'campaign') {
                if (selectedCampaigns.length === 0) {
                    throw new Error('Please select at least one campaign');
                }
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

        const headers = [
            'Email', 'NPI', 'First Name', 'Last Name', 'Specialty',
            'Campaigns', 'Unique Opens', 'Total Opens', 'Unique Clicks', 'Total Clicks',
            'UOR %', 'TOR %', 'UCR %', 'TCR %'
        ];

        const rows = results.users.map(user => [
            user.email,
            user.npi || '',
            user.first_name || '',
            user.last_name || '',
            user.specialty || '',
            user.campaign_count || 0,
            user.unique_opens || 0,
            user.total_opens || 0,
            user.unique_clicks || 0,
            user.total_clicks || 0,
            user.unique_open_rate || 0,
            user.total_open_rate || 0,
            user.unique_click_rate || 0,
            user.total_click_rate || 0
        ]);

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

        try {
            const userList = analysisForm.userInput
                .split(/[\n,;]/)
                .map(item => item.trim())
                .filter(item => item);

            if (userList.length === 0) {
                throw new Error('Please provide user identifiers');
            }

            const response = await fetch(`${API_BASE}/users/analyze-list`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_list: userList,
                    input_type: analysisForm.inputType,
                    export_csv: false
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            setAnalysisResults(data);
        } catch (err) {
            setAnalysisError(err.message || 'Failed to process request');
        } finally {
            setAnalysisLoading(false);
        }
    };

    const handleExportAnalyzeUsers = () => {
        if (!analysisResults || !analysisResults.users) return;

        const headers = [
            'Email', 'NPI', 'First Name', 'Last Name', 'Specialty',
            'Campaigns', 'Unique Opens', 'Total Opens', 'Unique Clicks', 'Total Clicks',
            'UOR %', 'TOR %', 'UCR %', 'TCR %'
        ];

        const rows = analysisResults.users.map(user => [
            user.email,
            user.npi || '',
            user.first_name || '',
            user.last_name || '',
            user.specialty || '',
            user.campaign_count || 0,
            user.unique_opens || 0,
            user.total_opens || 0,
            user.unique_clicks || 0,
            user.total_clicks || 0,
            user.unique_open_rate || 0,
            user.total_open_rate || 0,
            user.unique_click_rate || 0,
            user.total_click_rate || 0
        ]);

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
        spec.toLowerCase().includes(specialtySearchTerm.toLowerCase())
    );

    const filteredCampaigns = campaigns.filter(campaign =>
        campaign.campaign_name.toLowerCase().includes(campaignSearchTerm.toLowerCase())
    );

    let findUsersDisplayData = [];
    let findUsersVisibleData = [];
    let findUsersHasMore = false;
    if (results && results.users) {
        findUsersDisplayData = results.users;
        if (findUsersTableState.sortColumn) {
            findUsersDisplayData = sortUsers(findUsersDisplayData, findUsersTableState.sortColumn, findUsersTableState.sortDirection);
        }
        const maxDisplay = Math.min(findUsersDisplayData.length, 1000);
        const displayLimit = findUsersTableState.isFullyExpanded ? maxDisplay : findUsersTableState.displayCount;
        findUsersVisibleData = findUsersDisplayData.slice(0, displayLimit);
        findUsersHasMore = findUsersDisplayData.length > findUsersVisibleData.length;
    }

    let analyzeUsersDisplayData = [];
    let analyzeUsersVisibleData = [];
    let analyzeUsersHasMore = false;
    if (analysisResults && analysisResults.users) {
        analyzeUsersDisplayData = analysisResults.users;
        if (analyzeUsersTableState.sortColumn) {
            analyzeUsersDisplayData = sortUsers(analyzeUsersDisplayData, analyzeUsersTableState.sortColumn, analyzeUsersTableState.sortDirection);
        }
        const maxDisplay = Math.min(analyzeUsersDisplayData.length, 1000);
        const displayLimit = analyzeUsersTableState.isFullyExpanded ? maxDisplay : analyzeUsersTableState.displayCount;
        analyzeUsersVisibleData = analyzeUsersDisplayData.slice(0, displayLimit);
        analyzeUsersHasMore = analyzeUsersDisplayData.length > analyzeUsersVisibleData.length;
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
                <div className="query-section discovery-section">
                    <div className="query-section-title">
                        <h3>Find Users</h3>
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
                                            <h4>User Data ({findUsersDisplayData.length.toLocaleString()} users{findUsersDisplayData.length > 1000 ? ', showing max 1,000' : ''})</h4>
                                            <div className="table-action-buttons">
                                                {findUsersDisplayData.length > 10 && (
                                                    <button
                                                        className="btn-expand-table"
                                                        onClick={() => setFindUsersTableState(prev => ({
                                                            ...prev,
                                                            isFullyExpanded: !prev.isFullyExpanded,
                                                            displayCount: prev.isFullyExpanded ? 10 : Math.min(findUsersDisplayData.length, 1000)
                                                        }))}
                                                    >
                                                        {findUsersTableState.isFullyExpanded ? 'Collapse' : `Expand All${findUsersDisplayData.length > 1000 ? ' (Max 1,000)' : ''}`}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    className="btn-export"
                                                    onClick={handleExportFindUsers}
                                                >
                                                    Export
                                                </button>
                                            </div>
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
                                                    {findUsersVisibleData.map((user, idx) => (
                                                        <tr key={idx}>
                                                            <td>{user.email}</td>
                                                            <td>{user.npi || ''}</td>
                                                            <td>{user.first_name} {user.last_name}</td>
                                                            <td>{user.specialty}</td>
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
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {findUsersHasMore && !findUsersTableState.isFullyExpanded && (
                                            <div className="load-more-container">
                                                <button
                                                    className="btn-load-more"
                                                    onClick={() => setFindUsersTableState(prev => ({
                                                        ...prev,
                                                        displayCount: prev.displayCount + 10
                                                    }))}
                                                >
                                                    Load More ({findUsersVisibleData.length} of {Math.min(findUsersDisplayData.length, 1000)})
                                                </button>
                                            </div>
                                        )}
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

                <div className="query-section analysis-section">
                    <div className="query-section-title">
                        <h3>Analyze Users</h3>
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
                                    {analysisLoading ? 'Analyzing...' : 'Analyze Users'}
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
                                            <h4>Results ({analyzeUsersDisplayData.length} users{analyzeUsersDisplayData.length > 1000 ? ', showing max 1,000' : ''})</h4>
                                            <div className="table-action-buttons">
                                                {analyzeUsersDisplayData.length > 10 && (
                                                    <button
                                                        className="btn-expand-table"
                                                        onClick={() => setAnalyzeUsersTableState(prev => ({
                                                            ...prev,
                                                            isFullyExpanded: !prev.isFullyExpanded,
                                                            displayCount: prev.isFullyExpanded ? 10 : Math.min(analyzeUsersDisplayData.length, 1000)
                                                        }))}
                                                    >
                                                        {analyzeUsersTableState.isFullyExpanded ? 'Collapse' : `Expand All${analyzeUsersDisplayData.length > 1000 ? ' (Max 1,000)' : ''}`}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    className="btn-export"
                                                    onClick={handleExportAnalyzeUsers}
                                                >
                                                    Export
                                                </button>
                                            </div>
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

                                        {analyzeUsersHasMore && !analyzeUsersTableState.isFullyExpanded && (
                                            <div className="load-more-container">
                                                <button
                                                    className="btn-load-more"
                                                    onClick={() => setAnalyzeUsersTableState(prev => ({
                                                        ...prev,
                                                        displayCount: prev.displayCount + 10
                                                    }))}
                                                >
                                                    Load More ({analyzeUsersVisibleData.length} of {Math.min(analyzeUsersDisplayData.length, 1000)})
                                                </button>
                                            </div>
                                        )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {/*
                <div className="query-section patterns-section">
                    <div className="query-section-title">
                        <h3>Engagement Patterns</h3>
                    </div>
                    <div className="query-section-content">
                        <form onSubmit={handlePatternSubmit} className="query-form">
                            <div className="form-group">
                                <label htmlFor="pattern_type">Pattern Type</label>
                                <select
                                    id="pattern_type"
                                    name="pattern_type"
                                    value={patternForm.pattern_type}
                                    onChange={handlePatternChange}
                                    className="form-select"
                                >
                                    <option value="infrequent_responders">Infrequent Responders</option>
                                    <option value="hyper_engaged">Hyper-Engaged</option>
                                    <option value="heavy_inactive">Heavy Inactive</option>
                                    <option value="click_champions">Click Champions</option>
                                    <option value="declining_engagement">Declining Engagement</option>
                                    <option value="fast_openers">Fast Openers</option>
                                    <option value="recently_reengaged">Recently Re-engaged</option>
                                    <option value="weekend_warriors">Weekend Warriors</option>
                                    <option value="binge_readers">Binge Readers</option>
                                    <option value="one_and_done">One and Done</option>
                                    <option value="early_birds_night_owls">Early Birds vs Night Owls</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="min_campaigns">Minimum Campaigns</label>
                                <input
                                    type="number"
                                    id="min_campaigns"
                                    name="min_campaigns"
                                    value={patternForm.min_campaigns}
                                    onChange={handlePatternChange}
                                    min="1"
                                    max="100"
                                    className="form-input"
                                />
                                <small>Minimum campaigns received to be included</small>
                            </div>

                            {patternForm.pattern_type === 'infrequent_responders' && (
                                <div className="form-group">
                                    <label htmlFor="infrequent_threshold">Max Open Rate (%)</label>
                                    <input
                                        type="number"
                                        id="infrequent_threshold"
                                        name="infrequent_threshold"
                                        value={patternForm.infrequent_threshold}
                                        onChange={handlePatternChange}
                                        min="1"
                                        max="100"
                                        className="form-input"
                                    />
                                    <small>Users who open {patternForm.infrequent_threshold}% or less of emails</small>
                                </div>
                            )}

                            {patternForm.pattern_type === 'hyper_engaged' && (
                                <div className="form-group">
                                    <label htmlFor="hyper_engaged_threshold">Min Open Rate (%)</label>
                                    <input
                                        type="number"
                                        id="hyper_engaged_threshold"
                                        name="hyper_engaged_threshold"
                                        value={patternForm.hyper_engaged_threshold}
                                        onChange={handlePatternChange}
                                        min="1"
                                        max="100"
                                        className="form-input"
                                    />
                                    <small>Users who open {patternForm.hyper_engaged_threshold}% or more of emails</small>
                                </div>
                            )}

                            {patternForm.pattern_type === 'fast_openers' && (
                                <div className="form-group">
                                    <label htmlFor="fast_open_minutes">Fast Open Window (minutes)</label>
                                    <input
                                        type="number"
                                        id="fast_open_minutes"
                                        name="fast_open_minutes"
                                        value={patternForm.fast_open_minutes}
                                        onChange={handlePatternChange}
                                        min="1"
                                        max="120"
                                        className="form-input"
                                    />
                                    <small>Users who open within {patternForm.fast_open_minutes} minutes at least 50% of the time</small>
                                </div>
                            )}

                            <div className="form-actions">
                                <button
                                    type="submit"
                                    className="submit-button"
                                    disabled={patternLoading}
                                >
                                    {patternLoading ? 'Analyzing...' : 'Find Pattern'}
                                </button>
                            </div>
                        </form>

                        {patternError && (
                            <div className="error-message">
                                <p>{patternError}</p>
                            </div>
                        )}

                        {patternResults && (
                            <div className="results-section">
                                <div className="pattern-summary">
                                    <h4>Pattern: {patternResults.summary.pattern_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                                    <p>Found {patternResults.summary.total_users} users matching this pattern</p>
                                </div>

                                {patternResults.users && patternResults.users.length > 0 && (
                                    <div className="sample-data-section">
                                        <div className="table-header-row">
                                            <h4>Results ({patternDisplayData.length.toLocaleString()} users{patternDisplayData.length > 1000 ? ', showing max 1,000' : ''})</h4>
                                            <div className="table-action-buttons">
                                                {patternDisplayData.length > 10 && (
                                                    <button
                                                        className="btn-expand-table"
                                                        onClick={() => setPatternTableState(prev => ({
                                                            ...prev,
                                                            isFullyExpanded: !prev.isFullyExpanded,
                                                            displayCount: prev.isFullyExpanded ? 10 : Math.min(patternDisplayData.length, 1000)
                                                        }))}
                                                    >
                                                        {patternTableState.isFullyExpanded ? 'Collapse' : `Expand All${patternDisplayData.length > 1000 ? ' (Max 1,000)' : ''}`}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    className="btn-export"
                                                    onClick={handleExportPatterns}
                                                >
                                                    Export
                                                </button>
                                            </div>
                                        </div>

                                        <div className="table-container">
                                            <table className="results-table">
                                                <thead>
                                                    <tr>
                                                        <th onClick={() => handlePatternSort('email')} className="sortable">
                                                            Email {patternTableState.sortColumn === 'email' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handlePatternSort('npi')} className="sortable">
                                                            NPI {patternTableState.sortColumn === 'npi' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handlePatternSort('name')} className="sortable">
                                                            Name {patternTableState.sortColumn === 'name' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        <th onClick={() => handlePatternSort('specialty')} className="sortable">
                                                            Specialty {patternTableState.sortColumn === 'specialty' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                        </th>
                                                        {patternForm.pattern_type === 'declining_engagement' ? (
                                                            <>
                                                                <th onClick={() => handlePatternSort('total_campaigns')} className="sortable">
                                                                    Campaigns {patternTableState.sortColumn === 'total_campaigns' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('early_open_rate')} className="sortable">
                                                                    Early OR % {patternTableState.sortColumn === 'early_open_rate' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('late_open_rate')} className="sortable">
                                                                    Late OR % {patternTableState.sortColumn === 'late_open_rate' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('engagement_decline')} className="sortable">
                                                                    Decline % {patternTableState.sortColumn === 'engagement_decline' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                            </>
                                                        ) : patternForm.pattern_type === 'fast_openers' ? (
                                                            <>
                                                                <th onClick={() => handlePatternSort('campaigns_opened')} className="sortable">
                                                                    Opened {patternTableState.sortColumn === 'campaigns_opened' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('fast_opens')} className="sortable">
                                                                    Fast Opens {patternTableState.sortColumn === 'fast_opens' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('avg_minutes_to_open')} className="sortable">
                                                                    Avg Minutes {patternTableState.sortColumn === 'avg_minutes_to_open' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('fast_open_rate')} className="sortable">
                                                                    Fast Rate % {patternTableState.sortColumn === 'fast_open_rate' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                            </>
                                                        ) : patternForm.pattern_type === 'recently_reengaged' ? (
                                                            <>
                                                                <th onClick={() => handlePatternSort('total_campaigns')} className="sortable">
                                                                    Total Campaigns {patternTableState.sortColumn === 'total_campaigns' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('recent_opens')} className="sortable">
                                                                    Recent Opens {patternTableState.sortColumn === 'recent_opens' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('historical_opens')} className="sortable">
                                                                    Historical Opens {patternTableState.sortColumn === 'historical_opens' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('recent_open_rate')} className="sortable">
                                                                    Recent OR % {patternTableState.sortColumn === 'recent_open_rate' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('historical_open_rate')} className="sortable">
                                                                    Historical OR % {patternTableState.sortColumn === 'historical_open_rate' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                            </>
                                                        ) : patternForm.pattern_type === 'weekend_warriors' ? (
                                                            <>
                                                                <th onClick={() => handlePatternSort('total_delayed_opens')} className="sortable">
                                                                    Total Opens {patternTableState.sortColumn === 'total_delayed_opens' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('weekend_opens')} className="sortable">
                                                                    Weekend {patternTableState.sortColumn === 'weekend_opens' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('weekday_opens')} className="sortable">
                                                                    Weekday {patternTableState.sortColumn === 'weekday_opens' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('weekend_open_rate')} className="sortable">
                                                                    Weekend % {patternTableState.sortColumn === 'weekend_open_rate' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('weekday_open_rate')} className="sortable">
                                                                    Weekday % {patternTableState.sortColumn === 'weekday_open_rate' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                            </>
                                                        ) : patternForm.pattern_type === 'binge_readers' ? (
                                                            <>
                                                                <th onClick={() => handlePatternSort('total_opens')} className="sortable">
                                                                    Total Opens {patternTableState.sortColumn === 'total_opens' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('rapid_opens')} className="sortable">
                                                                    Rapid Opens {patternTableState.sortColumn === 'rapid_opens' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('binge_sessions')} className="sortable">
                                                                    Binge Sessions {patternTableState.sortColumn === 'binge_sessions' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('binge_rate')} className="sortable">
                                                                    Binge Rate % {patternTableState.sortColumn === 'binge_rate' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                            </>
                                                        ) : patternForm.pattern_type === 'one_and_done' ? (
                                                            <>
                                                                <th onClick={() => handlePatternSort('total_campaigns')} className="sortable">
                                                                    Total Campaigns {patternTableState.sortColumn === 'total_campaigns' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('first_three_opens')} className="sortable">
                                                                    First 3 Opens {patternTableState.sortColumn === 'first_three_opens' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('later_opens')} className="sortable">
                                                                    Later Opens {patternTableState.sortColumn === 'later_opens' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('early_open_rate')} className="sortable">
                                                                    Early Rate % {patternTableState.sortColumn === 'early_open_rate' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                            </>
                                                        ) : patternForm.pattern_type === 'early_birds_night_owls' ? (
                                                            <>
                                                                <th onClick={() => handlePatternSort('total_delayed_opens')} className="sortable">
                                                                    Opens {patternTableState.sortColumn === 'total_delayed_opens' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('avg_hour')} className="sortable">
                                                                    Avg Hour {patternTableState.sortColumn === 'avg_hour' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('early_morning_opens')} className="sortable">
                                                                    Early (5-9am) {patternTableState.sortColumn === 'early_morning_opens' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('night_opens')} className="sortable">
                                                                    Night (8-11pm) {patternTableState.sortColumn === 'night_opens' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('reader_type')} className="sortable">
                                                                    Type {patternTableState.sortColumn === 'reader_type' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <th onClick={() => handlePatternSort('campaigns_received')} className="sortable">
                                                                    Campaigns {patternTableState.sortColumn === 'campaigns_received' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('unique_opens')} className="sortable">
                                                                    U Opens {patternTableState.sortColumn === 'unique_opens' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('total_opens')} className="sortable">
                                                                    T Opens {patternTableState.sortColumn === 'total_opens' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('unique_clicks')} className="sortable">
                                                                    U Clicks {patternTableState.sortColumn === 'unique_clicks' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('total_clicks')} className="sortable">
                                                                    T Clicks {patternTableState.sortColumn === 'total_clicks' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('unique_open_rate')} className="sortable">
                                                                    UOR % {patternTableState.sortColumn === 'unique_open_rate' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                                <th onClick={() => handlePatternSort('total_open_rate')} className="sortable">
                                                                    TOR % {patternTableState.sortColumn === 'total_open_rate' && (patternTableState.sortDirection === 'asc' ? '▲' : '▼')}
                                                                </th>
                                                            </>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {patternVisibleData.map((user, idx) => (
                                                        <tr key={idx}>
                                                            <td>{user.email}</td>
                                                            <td>{user.npi || ''}</td>
                                                            <td>{user.first_name} {user.last_name}</td>
                                                            <td>{user.specialty}</td>
                                                            {patternForm.pattern_type === 'declining_engagement' ? (
                                                                <>
                                                                    <td>{user.total_campaigns || 0}</td>
                                                                    <td>{user.early_open_rate || 0}%</td>
                                                                    <td>{user.late_open_rate || 0}%</td>
                                                                    <td>{user.engagement_decline || 0}%</td>
                                                                </>
                                                            ) : patternForm.pattern_type === 'fast_openers' ? (
                                                                <>
                                                                    <td>{user.campaigns_opened || 0}</td>
                                                                    <td>{user.fast_opens || 0}</td>
                                                                    <td>{user.avg_minutes_to_open || 0}</td>
                                                                    <td>{user.fast_open_rate || 0}%</td>
                                                                </>
                                                            ) : patternForm.pattern_type === 'recently_reengaged' ? (
                                                                <>
                                                                    <td>{user.total_campaigns || 0}</td>
                                                                    <td>{user.recent_opens || 0}</td>
                                                                    <td>{user.historical_opens || 0}</td>
                                                                    <td>{user.recent_open_rate || 0}%</td>
                                                                    <td>{user.historical_open_rate || 0}%</td>
                                                                </>
                                                            ) : patternForm.pattern_type === 'weekend_warriors' ? (
                                                                <>
                                                                    <td>{user.total_delayed_opens || 0}</td>
                                                                    <td>{user.weekend_opens || 0}</td>
                                                                    <td>{user.weekday_opens || 0}</td>
                                                                    <td>{user.weekend_open_rate || 0}%</td>
                                                                    <td>{user.weekday_open_rate || 0}%</td>
                                                                </>
                                                            ) : patternForm.pattern_type === 'binge_readers' ? (
                                                                <>
                                                                    <td>{user.total_opens || 0}</td>
                                                                    <td>{user.rapid_opens || 0}</td>
                                                                    <td>{user.binge_sessions || 0}</td>
                                                                    <td>{user.binge_rate || 0}%</td>
                                                                </>
                                                            ) : patternForm.pattern_type === 'one_and_done' ? (
                                                                <>
                                                                    <td>{user.total_campaigns || 0}</td>
                                                                    <td>{user.first_three_opens || 0}</td>
                                                                    <td>{user.later_opens || 0}</td>
                                                                    <td>{user.early_open_rate || 0}%</td>
                                                                </>
                                                            ) : patternForm.pattern_type === 'early_birds_night_owls' ? (
                                                                <>
                                                                    <td>{user.total_delayed_opens || 0}</td>
                                                                    <td>{user.avg_hour || 0}</td>
                                                                    <td>{user.early_morning_opens || 0}</td>
                                                                    <td>{user.night_opens || 0}</td>
                                                                    <td>{user.reader_type || ''}</td>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <td>{user.campaigns_received || 0}</td>
                                                                    <td>{user.campaigns_opened || user.unique_opens || 0}</td>
                                                                    <td>{user.total_opens || 0}</td>
                                                                    <td>{user.campaigns_clicked || user.unique_clicks || 0}</td>
                                                                    <td>{user.total_clicks || 0}</td>
                                                                    <td>{user.unique_open_rate || 0}%</td>
                                                                    <td>{user.total_open_rate || 0}%</td>
                                                                </>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {patternHasMore && !patternTableState.isFullyExpanded && (
                                            <div className="load-more-container">
                                                <button
                                                    className="btn-load-more"
                                                    onClick={() => setPatternTableState(prev => ({
                                                        ...prev,
                                                        displayCount: prev.displayCount + 10
                                                    }))}
                                                >
                                                    Load More ({patternVisibleData.length} of {Math.min(patternDisplayData.length, 1000)})
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {patternResults.users && patternResults.users.length === 0 && (
                                    <div className="sample-note">
                                        No users found matching this pattern.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                */}
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
        </div>
    );
});

export default AudienceQueryBuilder;