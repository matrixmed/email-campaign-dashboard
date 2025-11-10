import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import '../../styles/AudienceQueryBuilder.css';
import { API_BASE_URL } from '../../config/api';

const AudienceQueryBuilder = forwardRef((props, ref) => {
    // Load persisted state from localStorage on mount
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
            console.error('Error loading persisted state:', e);
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

    // Form state
    const [searchMode, setSearchMode] = useState(persisted.searchMode);
    const [selectedSpecialties, setSelectedSpecialties] = useState(persisted.selectedSpecialties);
    const [selectedCampaigns, setSelectedCampaigns] = useState(persisted.selectedCampaigns);
    const [engagementType, setEngagementType] = useState(persisted.engagementType);
    const [specialtyMergeMode, setSpecialtyMergeMode] = useState(persisted.specialtyMergeMode);

    // Data
    const [specialties, setSpecialties] = useState([]);
    const [campaigns, setCampaigns] = useState([]);

    // UI state
    const [showSpecialtySelector, setShowSpecialtySelector] = useState(false);
    const [showCampaignSelector, setShowCampaignSelector] = useState(false);
    const [specialtySearchTerm, setSpecialtySearchTerm] = useState('');
    const [campaignSearchTerm, setCampaignSearchTerm] = useState('');

    // Results
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');

    // Table state for Find Users section
    const [findUsersTableState, setFindUsersTableState] = useState({
        displayCount: 10,
        sortColumn: null,
        sortDirection: null,
        isFullyExpanded: false
    });

    // Analysis form state
    const [analysisForm, setAnalysisForm] = useState({
        userInput: '',
        inputType: 'email'
    });
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [analysisResults, setAnalysisResults] = useState(null);
    const [analysisError, setAnalysisError] = useState('');
    const [fileUpload, setFileUpload] = useState(null);

    // Table state for Analyze Users section
    const [analyzeUsersTableState, setAnalyzeUsersTableState] = useState({
        displayCount: 10,
        sortColumn: null,
        sortDirection: null,
        isFullyExpanded: false
    });

    const API_BASE = `${API_BASE_URL}/api`;

    // Persist only query parameters to localStorage (not results - they're too large)
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
            console.warn('Failed to save state to localStorage:', error);
            // If quota exceeded, clear old state and try again
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
        try {
            const url = `${API_BASE}/users/specialties?merge=${specialtyMergeMode}`;
            console.log('Fetching specialties from:', url);
            const response = await fetch(url);
            console.log('Specialties response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('Specialties data:', data);
                setSpecialties(data.specialties || []);
            } else {
                const errorText = await response.text();
                console.error('Failed to fetch specialties:', response.status, errorText);
            }
        } catch (err) {
            console.error('Error fetching specialties:', err);
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
            console.error('Error fetching campaigns:', err);
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
        setFileUpload(null);
        setAnalysisError('');
        setAnalyzeUsersTableState({
            displayCount: 10,
            sortColumn: null,
            sortDirection: null,
            isFullyExpanded: false
        });
    };

    const clearAll = () => {
        // Clear Find Users
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

        // Clear Analyze Users
        setAnalysisResults(null);
        setAnalysisForm({ userInput: '', inputType: 'email' });
        setFileUpload(null);
        setAnalysisError('');
        setAnalyzeUsersTableState({
            displayCount: 10,
            sortColumn: null,
            sortDirection: null,
            isFullyExpanded: false
        });

        // Clear localStorage
        localStorage.removeItem('audienceQueryState');
    };

    // Expose clearAll to parent component via ref
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

            console.log('Request data:', requestData);

            // Validation
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

            console.log('Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                try {
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.error || `HTTP ${response.status}`);
                } catch (parseErr) {
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }
            }

            const data = await response.json();
            console.log('Response data:', data);
            console.log('First user sample:', data.users?.[0]);
            setResults(data);

        } catch (err) {
            console.error('Error finding users:', err);
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

    // Analysis functions
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

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        setFileUpload(file);
        if (analysisResults) {
            setAnalysisResults(null);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            setFileUpload(files[0]);
            if (analysisResults) {
                setAnalysisResults(null);
            }
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleAnalysisSubmit = async (e) => {
        e.preventDefault();
        setAnalysisLoading(true);
        setAnalysisError('');
        setAnalysisResults(null);

        try {
            let userList = [];

            if (fileUpload) {
                const text = await fileUpload.text();
                const lines = text.split('\n').filter(line => line.trim());
                const headers = lines[0].toLowerCase().split(',');

                const npiIndex = headers.findIndex(h =>
                    h.includes('npi') || h.includes('npi_id')
                );
                const emailIndex = headers.findIndex(h => h.includes('email'));

                if (npiIndex === -1 && emailIndex === -1) {
                    throw new Error('File must contain NPI or Email column');
                }

                const targetIndex = analysisForm.inputType === 'npi' ? npiIndex : emailIndex;

                for (let i = 1; i < lines.length; i++) {
                    const cols = lines[i].split(',');
                    if (cols[targetIndex]) {
                        userList.push(cols[targetIndex].trim());
                    }
                }
            } else if (analysisForm.userInput.trim()) {
                userList = analysisForm.userInput
                    .split(/[\n,;]/)
                    .map(item => item.trim())
                    .filter(item => item);
            }

            if (userList.length === 0) {
                throw new Error('Please provide user identifiers');
            }

            if (userList.length > 100 && !fileUpload) {
                throw new Error('For more than 100 users, please upload a file');
            }

            const requestData = {
                user_list: userList,
                input_type: analysisForm.inputType,
                export_csv: fileUpload ? true : userList.length > 100
            };

            const response = await fetch(`${API_BASE}/users/analyze-list`, {
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

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/csv')) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const filename = response.headers.get('content-disposition')?.split('filename=')[1] || 'user_analysis.csv';
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                setAnalysisResults({ type: 'download', message: 'Analysis downloaded successfully' });
            } else {
                const data = await response.json();
                setAnalysisResults(data);
            }

        } catch (err) {
            console.error('Error analyzing users:', err);
            setAnalysisError(err.message || 'Failed to process request');
        } finally {
            setAnalysisLoading(false);
        }
    };

    const handleExportAnalyzeUsers = () => {
        if (!analysisResults || !analysisResults.users) return;

        const headers = [
            'Email', 'NPI', 'First Name', 'Last Name', 'Specialty',
            'Sends', 'Unique Opens', 'Total Opens', 'Unique Clicks', 'Total Clicks',
            'UOR %', 'TOR %', 'UCR %', 'TCR %'
        ];

        const rows = analysisResults.users.map(user => [
            user.email,
            user.npi || '',
            user.first_name || '',
            user.last_name || '',
            user.specialty || '',
            user.total_sends || 0,
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

    // Sort users by column
    const sortUsers = useCallback((users, column, direction) => {
        if (!column || !direction) return users;

        const sorted = [...users];
        sorted.sort((a, b) => {
            let aVal = a[column];
            let bVal = b[column];

            // Handle name specially
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

    // Handle column header click for sorting (Find Users)
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

    // Handle column header click for sorting (Analyze Users)
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

    const filteredSpecialties = specialties.filter(spec =>
        spec.toLowerCase().includes(specialtySearchTerm.toLowerCase())
    );

    const filteredCampaigns = campaigns.filter(campaign =>
        campaign.campaign_name.toLowerCase().includes(campaignSearchTerm.toLowerCase())
    );

    // Process Find Users table data
    let findUsersDisplayData = [];
    let findUsersVisibleData = [];
    let findUsersHasMore = false;
    if (results && results.users) {
        findUsersDisplayData = results.users;
        if (findUsersTableState.sortColumn) {
            findUsersDisplayData = sortUsers(findUsersDisplayData, findUsersTableState.sortColumn, findUsersTableState.sortDirection);
        }
        // Limit to 1,000 for expand
        const maxDisplay = Math.min(findUsersDisplayData.length, 1000);
        const displayLimit = findUsersTableState.isFullyExpanded ? maxDisplay : findUsersTableState.displayCount;
        findUsersVisibleData = findUsersDisplayData.slice(0, displayLimit);
        findUsersHasMore = findUsersDisplayData.length > findUsersVisibleData.length;
    }

    // Process Analyze Users table data
    let analyzeUsersDisplayData = [];
    let analyzeUsersVisibleData = [];
    let analyzeUsersHasMore = false;
    if (analysisResults && analysisResults.users) {
        analyzeUsersDisplayData = analysisResults.users;
        if (analyzeUsersTableState.sortColumn) {
            analyzeUsersDisplayData = sortUsers(analyzeUsersDisplayData, analyzeUsersTableState.sortColumn, analyzeUsersTableState.sortDirection);
        }
        // Limit to 1,000 for expand
        const maxDisplay = Math.min(analyzeUsersDisplayData.length, 1000);
        const displayLimit = analyzeUsersTableState.isFullyExpanded ? maxDisplay : analyzeUsersTableState.displayCount;
        analyzeUsersVisibleData = analyzeUsersDisplayData.slice(0, displayLimit);
        analyzeUsersHasMore = analyzeUsersDisplayData.length > analyzeUsersVisibleData.length;
    }

    return (
        <div className="audience-query-builder">
            <div className="query-sections-wrapper">
                {/* FIND USERS SECTION */}
                <div className="query-section discovery-section">
                    <div className="query-section-title">
                        <h3>Find Users</h3>
                        <p className="section-subtitle">Discover users by specialty or campaign with engagement filtering</p>
                    </div>
                    <div className="query-section-content">
                        <div className="query-form">
                            {/* Search Mode Toggle */}
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
                                {/* Specialty Selection */}
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

                                {/* Campaign Selection */}
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

                                {/* Engagement Type */}
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
                                {/* Aggregate Overview */}
                                <div className="aggregate-overview">
                                    <h4>Overview</h4>
                                    <div className="aggregate-grid">
                                        <div className="aggregate-stat">
                                            <span className="stat-label">Total Delivered</span>
                                            <span className="stat-value">{(results.aggregate.total_delivered || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="aggregate-stat">
                                            <span className="stat-label">Unique Opens</span>
                                            <span className="stat-value">{(results.aggregate.total_unique_opens || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="aggregate-stat">
                                            <span className="stat-label">Unique Open Rate</span>
                                            <span className="stat-value">{results.aggregate.avg_unique_open_rate || 0}%</span>
                                        </div>
                                        <div className="aggregate-stat">
                                            <span className="stat-label">Total Open Rate</span>
                                            <span className="stat-value">{results.aggregate.avg_total_open_rate || 0}%</span>
                                        </div>
                                        <div className="aggregate-stat">
                                            <span className="stat-label">Unique Click Rate</span>
                                            <span className="stat-value">{results.aggregate.avg_unique_click_rate || 0}%</span>
                                        </div>
                                        <div className="aggregate-stat">
                                            <span className="stat-label">Total Click Rate</span>
                                            <span className="stat-value">{results.aggregate.avg_total_click_rate || 0}%</span>
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

                                {/* Sample Data Table */}
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

                {/* ANALYZE USERS SECTION */}
                <div className="query-section analysis-section">
                    <div className="query-section-title">
                        <h3>Analyze Users</h3>
                        <p className="section-subtitle">Analyze specific users by email or NPI</p>
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
                                <label htmlFor="userInput">Paste User Identifiers (Max 100)</label>
                                <textarea
                                    id="userInput"
                                    name="userInput"
                                    value={analysisForm.userInput}
                                    onChange={handleAnalysisChange}
                                    placeholder="user@example.com&#10;another@example.com&#10;..."
                                    rows="6"
                                />
                                <small>One per line, comma, or semicolon separated</small>
                            </div>

                            <div className="form-group full-width">
                                <label>Or Upload File (CSV/Excel with NPI or Email column)</label>
                                <div
                                    className="drop-zone"
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                >
                                    <input
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        onChange={handleFileUpload}
                                        className="file-input-hidden"
                                        id="analysis-file-input"
                                    />
                                    <label htmlFor="analysis-file-input" className="drop-zone-label">
                                        {fileUpload ? (
                                            <span className="file-name-display">{fileUpload.name}</span>
                                        ) : (
                                            <div className="drop-zone-content">
                                                <p>Drag and drop file here</p>
                                                <p className="drop-zone-or">or</p>
                                                <span className="drop-zone-browse">Click to browse</span>
                                            </div>
                                        )}
                                    </label>
                                </div>
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

                        {analysisResults && (
                            <div className="results-section">
                                {analysisResults.type === 'download' ? (
                                    <div className="download-success">
                                        <p>{analysisResults.message}</p>
                                    </div>
                                ) : analysisResults.success && analysisResults.users ? (
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
                                                        <th onClick={() => handleAnalyzeUsersSort('total_sends')} className="sortable">
                                                            Sends {analyzeUsersTableState.sortColumn === 'total_sends' && (analyzeUsersTableState.sortDirection === 'asc' ? '▲' : '▼')}
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
                                                            <td>{user.total_sends}</td>
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
                                ) : null}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Specialty Selector Modal */}
            {showSpecialtySelector && (
                <div className="modal-overlay" onClick={() => setShowSpecialtySelector(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Select Specialties</h2>
                            <button
                                className="modal-close"
                                onClick={() => setShowSpecialtySelector(false)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="modal-search">
                            <input
                                type="text"
                                placeholder="Search specialties..."
                                value={specialtySearchTerm}
                                onChange={(e) => setSpecialtySearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>

                        <div className="modal-actions">
                            <button
                                type="button"
                                onClick={handleSelectAllSpecialties}
                                className="action-button select-all"
                            >
                                Select All
                            </button>
                            <button
                                type="button"
                                onClick={handleClearAllSpecialties}
                                className="action-button clear-all"
                            >
                                Clear All
                            </button>
                            <div className="selection-count">
                                {selectedSpecialties.length} selected
                            </div>
                        </div>

                        <div className="modal-list">
                            {filteredSpecialties.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary, #b8b8b8)' }}>
                                    {specialties.length === 0 ? (
                                        <>
                                            <p>No specialties found in the database.</p>
                                            <p style={{ fontSize: '0.875rem', marginTop: '8px' }}>
                                                Please check your database connection and ensure the user_profiles table has specialty data.
                                            </p>
                                        </>
                                    ) : (
                                        <p>No specialties match your search.</p>
                                    )}
                                </div>
                            ) : (
                                filteredSpecialties.map(specialty => {
                                    const isSelected = selectedSpecialties.includes(specialty);
                                    return (
                                        <div
                                            key={specialty}
                                            className={`modal-list-item ${isSelected ? 'selected' : ''}`}
                                            onClick={() => handleSpecialtyToggle(specialty)}
                                        >
                                            <div className="item-checkbox">
                                                {isSelected && <span className="checkmark">✓</span>}
                                            </div>
                                            <div className="item-info">
                                                <div className="item-name">{specialty}</div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="modal-footer">
                            <button
                                type="button"
                                onClick={() => setShowSpecialtySelector(false)}
                                className="done-button"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Campaign Selector Modal */}
            {showCampaignSelector && (
                <div className="modal-overlay" onClick={() => setShowCampaignSelector(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Select Campaigns</h2>
                            <button
                                className="modal-close"
                                onClick={() => setShowCampaignSelector(false)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="modal-search">
                            <input
                                type="text"
                                placeholder="Search campaigns..."
                                value={campaignSearchTerm}
                                onChange={(e) => setCampaignSearchTerm(e.target.value)}
                                className="search-input"
                            />
                        </div>

                        <div className="modal-actions">
                            <button
                                type="button"
                                onClick={handleSelectAllCampaigns}
                                className="action-button select-all"
                            >
                                Select All
                            </button>
                            <button
                                type="button"
                                onClick={handleClearAllCampaigns}
                                className="action-button clear-all"
                            >
                                Clear All
                            </button>
                            <div className="selection-count">
                                {selectedCampaigns.length} selected
                            </div>
                        </div>

                        <div className="modal-list">
                            {filteredCampaigns.map(campaign => {
                                const isSelected = selectedCampaigns.includes(campaign.campaign_name);
                                return (
                                    <div
                                        key={campaign.campaign_name}
                                        className={`modal-list-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleCampaignToggle(campaign)}
                                    >
                                        <div className="item-checkbox">
                                            {isSelected && <span className="checkmark">✓</span>}
                                        </div>
                                        <div className="item-info">
                                            <div className="item-name">{campaign.campaign_name}</div>
                                            <div className="item-stats">
                                                <span>Opens: {campaign.volume_metrics?.unique_opens?.toLocaleString() || 'N/A'}</span>
                                                <span>Rate: {campaign.core_metrics?.unique_open_rate?.toFixed(1) || 'N/A'}%</span>
                                                <span>Delivered: {campaign.volume_metrics?.delivered?.toLocaleString() || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="modal-footer">
                            <button
                                type="button"
                                onClick={() => setShowCampaignSelector(false)}
                                className="done-button"
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
