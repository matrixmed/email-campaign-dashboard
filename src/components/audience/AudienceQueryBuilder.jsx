import React, { useState, useEffect } from 'react';
import '../../styles/AudienceQueryBuilder.css';
import { API_BASE_URL } from '../../config/api';

const AudienceQueryBuilder = () => {
    const [discoveryForm, setDiscoveryForm] = useState({
        specialty: 'all',
        engagement_level: 'all',
        limit: '',
        campaign_list: []
    });

    const [analysisForm, setAnalysisForm] = useState({
        userInput: '',
        inputType: 'email'
    });

    const [specialties, setSpecialties] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [discoveryLoading, setDiscoveryLoading] = useState(false);
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [discoveryResults, setDiscoveryResults] = useState(null);
    const [analysisResults, setAnalysisResults] = useState(null);
    const [discoveryError, setDiscoveryError] = useState('');
    const [analysisError, setAnalysisError] = useState('');
    const [discoveryPage, setDiscoveryPage] = useState(1);
    const [analysisPage, setAnalysisPage] = useState(1);
    const [fileUpload, setFileUpload] = useState(null);
    const [showCampaignSelector, setShowCampaignSelector] = useState(false);
    const [campaignSearchTerm, setCampaignSearchTerm] = useState('');
    const resultsPerPage = 100;
    const API_BASE = `${API_BASE_URL}/api`;

    useEffect(() => {
        fetchSpecialties();
        fetchCampaigns();
    }, []);

    const fetchSpecialties = async () => {
        setSpecialties([
            'Dermatology',
            'Oncology',
            'Neurology',
            'Gastroenterology',
            'Ophthalmology',
            'Hematology',
            'NPPA'
        ]);
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

    const handleDiscoveryChange = (e) => {
        const { name, value } = e.target;
        setDiscoveryForm(prev => ({
            ...prev,
            [name]: value
        }));
        if (discoveryResults) {
            setDiscoveryResults(null);
        }
        setDiscoveryPage(1);
    };

    const handleDiscoveryCampaignToggle = (campaign) => {
        setDiscoveryForm(prev => {
            const currentList = prev.campaign_list || [];
            const isSelected = currentList.includes(campaign.campaign_name);

            return {
                ...prev,
                campaign_list: isSelected
                    ? currentList.filter(c => c !== campaign.campaign_name)
                    : [...currentList, campaign.campaign_name]
            };
        });
        if (discoveryResults) {
            setDiscoveryResults(null);
        }
    };

    const handleSelectAllCampaigns = () => {
        const filteredCampaignNames = campaigns
            .filter(campaign =>
                campaign.campaign_name.toLowerCase().includes(campaignSearchTerm.toLowerCase())
            )
            .map(c => c.campaign_name);
        setDiscoveryForm(prev => ({
            ...prev,
            campaign_list: filteredCampaignNames
        }));
    };

    const handleClearAllCampaigns = () => {
        setDiscoveryForm(prev => ({
            ...prev,
            campaign_list: []
        }));
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

    const handleDiscoverySubmit = async (e) => {
        e.preventDefault();
        setDiscoveryLoading(true);
        setDiscoveryError('');
        setDiscoveryResults(null);
        setDiscoveryPage(1);

        try {
            const requestData = {
                specialty: discoveryForm.specialty !== 'all' ? discoveryForm.specialty : null,
                engagement_level: discoveryForm.engagement_level !== 'all' ? discoveryForm.engagement_level : null,
                campaign_list: discoveryForm.campaign_list.length > 0 ? discoveryForm.campaign_list : null,
                limit: discoveryForm.limit && parseInt(discoveryForm.limit) > 0 ? parseInt(discoveryForm.limit) : null,
                export_csv: false
            };

            const response = await fetch(`${API_BASE}/users/engagement-query`, {
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
            setDiscoveryResults(data);

        } catch (err) {
            console.error('Error querying users:', err);
            setDiscoveryError(err.message || 'Failed to process request');
        } finally {
            setDiscoveryLoading(false);
        }
    };

    const handleAnalysisSubmit = async (e) => {
        e.preventDefault();
        setAnalysisLoading(true);
        setAnalysisError('');
        setAnalysisResults(null);
        setAnalysisPage(1);

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

    const getEngagementLevelOptions = () => [
        { value: 'all', label: 'All Engagement Levels' },
        { value: 'high', label: 'High Engagement (>50% open rate)' },
        { value: 'medium', label: 'Medium Engagement (20-50% open rate)' },
        { value: 'low', label: 'Low Engagement (<20% open rate)' },
        { value: 'none', label: 'No Engagement' }
    ];

    const getPaginatedUsers = (results, page) => {
        if (!results || !results.users) return [];
        const startIndex = (page - 1) * resultsPerPage;
        const endIndex = startIndex + resultsPerPage;
        return results.users.slice(startIndex, endIndex);
    };

    const getTotalPages = (results) => {
        if (!results || !results.users) return 0;
        return Math.ceil(results.users.length / resultsPerPage);
    };

    return (
        <div className="audience-query-builder">
            <div className="query-sections-wrapper">
                <div className="query-section discovery-section">
                    <div className="query-section-title">
                        <h3>Find Users</h3>
                    </div>
                    <div className="query-section-content">
                        <form onSubmit={handleDiscoverySubmit} className="query-form">
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="specialty">Specialty</label>
                                <select
                                    id="specialty"
                                    name="specialty"
                                    value={discoveryForm.specialty}
                                    onChange={handleDiscoveryChange}
                                >
                                    <option value="all">All Specialties</option>
                                    {specialties.map(specialty => (
                                        <option key={specialty} value={specialty}>
                                            {specialty}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="engagement_level">Engagement Level</label>
                                <select
                                    id="engagement_level"
                                    name="engagement_level"
                                    value={discoveryForm.engagement_level}
                                    onChange={handleDiscoveryChange}
                                >
                                    {getEngagementLevelOptions().map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="limit">Result Limit</label>
                                <input
                                    type="number"
                                    id="limit"
                                    name="limit"
                                    value={discoveryForm.limit}
                                    onChange={handleDiscoveryChange}
                                    placeholder="All"
                                    min="1"
                                />
                            </div>

                            <div className="form-group full-width">
                                <label>Filter by Campaigns</label>
                                <button
                                    type="button"
                                    className="campaign-selector-button"
                                    onClick={() => setShowCampaignSelector(true)}
                                >
                                    {discoveryForm.campaign_list.length === 0
                                        ? 'Select Campaigns'
                                        : `${discoveryForm.campaign_list.length} Campaign${discoveryForm.campaign_list.length !== 1 ? 's' : ''} Selected`
                                    }
                                </button>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button
                                type="submit"
                                className="submit-button"
                                disabled={discoveryLoading}
                            >
                                {discoveryLoading ? 'Searching...' : 'Find Users'}
                            </button>
                        </div>
                    </form>

                    {discoveryError && (
                        <div className="error-message">
                            <p>{discoveryError}</p>
                        </div>
                    )}

                    {discoveryResults && discoveryResults.success && discoveryResults.users && (
                        <div className="results-section">
                            <div className="results-header">
                                <h4>Results</h4>
                                <div className="results-summary">
                                    <span>Total: {discoveryResults.total_count}</span>
                                    <span>Page {discoveryPage} of {getTotalPages(discoveryResults)}</span>
                                </div>
                            </div>

                            <div className="table-container">
                                <table className="results-table">
                                    <thead>
                                        <tr>
                                            <th>Email</th>
                                            <th>Name</th>
                                            <th>Specialty</th>
                                            <th>Sends</th>
                                            <th>U Opens</th>
                                            <th>T Opens</th>
                                            <th>U Clicks</th>
                                            <th>T Clicks</th>
                                            <th>UOR %</th>
                                            <th>TOR %</th>
                                            <th>UCR %</th>
                                            <th>TCR %</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {getPaginatedUsers(discoveryResults, discoveryPage).map((user, idx) => (
                                            <tr key={idx}>
                                                <td>{user.email}</td>
                                                <td>{user.first_name} {user.last_name}</td>
                                                <td>{user.specialty}</td>
                                                <td>{user.total_sends}</td>
                                                <td>{user.unique_opens}</td>
                                                <td>{user.total_opens}</td>
                                                <td>{user.unique_clicks}</td>
                                                <td>{user.total_clicks}</td>
                                                <td>{user.unique_open_rate}</td>
                                                <td>{user.total_open_rate}</td>
                                                <td>{user.unique_click_rate}</td>
                                                <td>{user.total_click_rate}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {getTotalPages(discoveryResults) > 1 && (
                                <div className="pagination">
                                    <button
                                        onClick={() => setDiscoveryPage(p => Math.max(1, p - 1))}
                                        disabled={discoveryPage === 1}
                                    >
                                        Previous
                                    </button>
                                    <span>Page {discoveryPage} of {getTotalPages(discoveryResults)}</span>
                                    <button
                                        onClick={() => setDiscoveryPage(p => Math.min(getTotalPages(discoveryResults), p + 1))}
                                        disabled={discoveryPage === getTotalPages(discoveryResults)}
                                    >
                                        Next
                                    </button>
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
                                <>
                                    <div className="results-header">
                                        <h4>Results</h4>
                                        <div className="results-summary">
                                            <span>Total: {analysisResults.total_count}</span>
                                            <span>Page {analysisPage} of {getTotalPages(analysisResults)}</span>
                                        </div>
                                    </div>

                                    <div className="table-container">
                                        <table className="results-table">
                                            <thead>
                                                <tr>
                                                    <th>Email</th>
                                                    <th>Name</th>
                                                    <th>Specialty</th>
                                                    <th>Sends</th>
                                                    <th>U Opens</th>
                                                    <th>T Opens</th>
                                                    <th>U Clicks</th>
                                                    <th>T Clicks</th>
                                                    <th>UOR %</th>
                                                    <th>TOR %</th>
                                                    <th>UCR %</th>
                                                    <th>TCR %</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {getPaginatedUsers(analysisResults, analysisPage).map((user, idx) => (
                                                    <tr key={idx}>
                                                        <td>{user.email}</td>
                                                        <td>{user.first_name} {user.last_name}</td>
                                                        <td>{user.specialty}</td>
                                                        <td>{user.total_sends}</td>
                                                        <td>{user.unique_opens}</td>
                                                        <td>{user.total_opens}</td>
                                                        <td>{user.unique_clicks}</td>
                                                        <td>{user.total_clicks}</td>
                                                        <td>{user.unique_open_rate}</td>
                                                        <td>{user.total_open_rate}</td>
                                                        <td>{user.unique_click_rate}</td>
                                                        <td>{user.total_click_rate}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {getTotalPages(analysisResults) > 1 && (
                                        <div className="pagination">
                                            <button
                                                onClick={() => setAnalysisPage(p => Math.max(1, p - 1))}
                                                disabled={analysisPage === 1}
                                            >
                                                Previous
                                            </button>
                                            <span>Page {analysisPage} of {getTotalPages(analysisResults)}</span>
                                            <button
                                                onClick={() => setAnalysisPage(p => Math.min(getTotalPages(analysisResults), p + 1))}
                                                disabled={analysisPage === getTotalPages(analysisResults)}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : null}
                        </div>
                    )}
                    </div>
                </div>
            </div>

            {showCampaignSelector && (
                <div className="audience-campaign-modal-overlay" onClick={() => setShowCampaignSelector(false)}>
                    <div className="audience-campaign-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="audience-campaign-modal-header">
                            <h2>Select Campaigns</h2>
                            <button
                                className="audience-campaign-modal-close"
                                onClick={() => setShowCampaignSelector(false)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="audience-campaign-modal-search">
                            <input
                                type="text"
                                placeholder="Search campaigns..."
                                value={campaignSearchTerm}
                                onChange={(e) => setCampaignSearchTerm(e.target.value)}
                                className="audience-campaign-search-input"
                            />
                        </div>

                        <div className="audience-campaign-modal-actions">
                            <button
                                type="button"
                                onClick={handleSelectAllCampaigns}
                                className="audience-select-all-button"
                            >
                                Select All
                            </button>
                            <button
                                type="button"
                                onClick={handleClearAllCampaigns}
                                className="audience-clear-all-button"
                            >
                                Clear All
                            </button>
                            <div className="audience-campaign-count">
                                {discoveryForm.campaign_list.length} selected
                            </div>
                        </div>

                        <div className="audience-campaign-modal-list">
                            {campaigns
                                .filter(campaign =>
                                    campaign.campaign_name.toLowerCase().includes(campaignSearchTerm.toLowerCase())
                                )
                                .map(campaign => {
                                    const isSelected = discoveryForm.campaign_list.includes(campaign.campaign_name);
                                    return (
                                        <div
                                            key={campaign.campaign_name}
                                            className={`audience-campaign-modal-item ${isSelected ? 'selected' : ''}`}
                                            onClick={() => handleDiscoveryCampaignToggle(campaign)}
                                        >
                                            <div className="audience-campaign-checkbox">
                                                {isSelected && <span className="checkmark">✓</span>}
                                            </div>
                                            <div className="audience-campaign-info">
                                                <div className="audience-campaign-name">{campaign.campaign_name}</div>
                                                <div className="audience-campaign-stats">
                                                    <span>Opens: {campaign.volume_metrics?.unique_opens?.toLocaleString() || 'N/A'}</span>
                                                    <span>Rate: {campaign.core_metrics?.unique_open_rate?.toFixed(1) || 'N/A'}%</span>
                                                    <span>Delivered: {campaign.volume_metrics?.delivered?.toLocaleString() || 'N/A'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>

                        <div className="audience-campaign-modal-footer">
                            <button
                                type="button"
                                onClick={() => setShowCampaignSelector(false)}
                                className="audience-campaign-done-button"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AudienceQueryBuilder;
