import React, { useState, useEffect } from 'react';
import '../../styles/AudienceQueryBuilder.css';

const AudienceQueryBuilder = () => {
    const [formData, setFormData] = useState({
        specialty: 'all',
        engagement_type: 'all',
        user_count: '',
        specific_emails: '',
        download_file: true
    });

    const [specialties, setSpecialties] = useState([]);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');

    // API base URL for local development
    const API_BASE = 'http://localhost:5000/api';

    useEffect(() => {
        fetchSpecialties();
    }, []);

    const fetchSpecialties = async () => {
        try {
            const response = await fetch(`${API_BASE}/specialties`);
            if (response.ok) {
                const data = await response.json();
                setSpecialties(data.specialties || []);
            }
        } catch (err) {
            console.error('Error fetching specialties:', err);
            // Fallback specialties
            setSpecialties(['Dermatology', 'Neurology', 'Oncology', 'NPPA']);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (type === 'checkbox') {
            setFormData(prev => ({
                ...prev,
                [name]: checked
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }

        // Clear previous results when form changes
        if (results) {
            setResults(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setResults(null);

        try {
            // Prepare the request data
            const requestData = {
                specialty: formData.specialty,
                engagement_type: formData.engagement_type,
                download_file: formData.download_file
            };

            // Add user count if specified
            if (formData.user_count && parseInt(formData.user_count) > 0) {
                requestData.user_count = parseInt(formData.user_count);
            }

            // Add specific emails if provided
            if (formData.specific_emails.trim()) {
                const emailList = formData.specific_emails
                    .split(/[\n,;]/)
                    .map(email => email.trim())
                    .filter(email => email);
                requestData.specific_emails = emailList;

                // Override download setting if too many specific emails
                if (emailList.length > 10) {
                    requestData.download_file = true;
                }
            }

            console.log('Sending request:', requestData);

            const response = await fetch(`${API_BASE}/audience/query`, {
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

            // Check if response is a file download
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/csv')) {
                // Handle file download
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = response.headers.get('content-disposition')?.split('filename=')[1] || 'audience_data.csv';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                setResults({ type: 'download', message: 'File downloaded successfully!' });
            } else {
                // Handle JSON response for display
                const data = await response.json();
                setResults({ type: 'display', data });
            }

        } catch (err) {
            console.error('Error querying audience:', err);
            setError(err.message || 'Failed to process request');
        } finally {
            setLoading(false);
        }
    };

    const getEngagementTypeOptions = () => [
        { value: 'all', label: 'All Users' },
        { value: 'top_engaged', label: 'Top Engaged Users' },
        { value: 'no_engagement', label: 'Users with No Engagement' },
        { value: 'random', label: 'Random Selection' }
    ];

    const renderUserCard = (user) => (
        <div key={user.email} className="aqb-user-card">
            <div className="aqb-user-header">
                <div className="aqb-user-name">
                    <strong>{user.first_name} {user.last_name}</strong>
                    <span className="aqb-user-email">{user.email}</span>
                </div>
                <div className="aqb-engagement-score">
                    Score: {user.engagement_score}
                </div>
            </div>

            <div className="aqb-user-details">
                <div className="aqb-user-info">
                    <span><strong>Specialty:</strong> {user.specialty}</span>
                    <span><strong>Location:</strong> {user.city}, {user.state}</span>
                </div>

                <div className="aqb-activity-summary">
                    <span>Campaigns: {user.activity_summary.total_campaigns}</span>
                    <span>Opens: {user.activity_summary.total_opens}</span>
                    <span>Clicks: {user.activity_summary.total_clicks}</span>
                </div>
            </div>

            {user.recent_activity && user.recent_activity.length > 0 && (
                <div className="aqb-recent-activity">
                    <h4>Recent Activity</h4>
                    <div className="aqb-activity-list">
                        {user.recent_activity.slice(0, 5).map((activity, idx) => (
                            <div key={idx} className="aqb-activity-item">
                                <span className={`aqb-action-badge ${activity.action}`}>
                                    {activity.action}
                                </span>
                                <div className="aqb-activity-details">
                                    <div className="aqb-campaign-name">{activity.campaign_subject || activity.campaign_name}</div>
                                    <div className="aqb-timestamp">{new Date(activity.timestamp).toLocaleDateString()}</div>
                                    {activity.link_url && (
                                        <div className="aqb-link-url">{activity.link_url}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="aqb-audience-query-builder">
            <div className="aqb-query-header">
                <h2>Audience Query Builder</h2>
            </div>

            <form onSubmit={handleSubmit} className="aqb-query-form">
                <div className="aqb-form-grid">
                    {/* Specialty Selection */}
                    <div className="aqb-form-group">
                        <label htmlFor="specialty">Target Specialty</label>
                        <select
                            id="specialty"
                            name="specialty"
                            value={formData.specialty}
                            onChange={handleInputChange}
                        >
                            <option value="all">All Specialties</option>
                            {specialties.map(specialty => (
                                <option key={specialty} value={specialty}>
                                    {specialty}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Engagement Type */}
                    <div className="aqb-form-group">
                        <label htmlFor="engagement_type">Engagement Level</label>
                        <select
                            id="engagement_type"
                            name="engagement_type"
                            value={formData.engagement_type}
                            onChange={handleInputChange}
                        >
                            {getEngagementTypeOptions().map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* User Count */}
                    <div className="aqb-form-group">
                        <label htmlFor="user_count">Number of Users (Optional)</label>
                        <input
                            type="number"
                            id="user_count"
                            name="user_count"
                            value={formData.user_count}
                            onChange={handleInputChange}
                            placeholder="Leave empty for all matching users"
                            min="1"
                        />
                    </div>

                    {/* Download Option */}
                    <div className="aqb-form-group aqb-checkbox-group">
                        <label className="aqb-checkbox-label">
                            <input
                                type="checkbox"
                                name="download_file"
                                checked={formData.download_file}
                                onChange={handleInputChange}
                            />
                            Download CSV file
                        </label>
                    </div>
                </div>

                {/* Specific Emails Section */}
                <div className="aqb-form-group aqb-full-width">
                    <label htmlFor="specific_emails">
                        Email Addresses (Optional)
                    </label>
                    <textarea
                        id="specific_emails"
                        name="specific_emails"
                        value={formData.specific_emails}
                        onChange={handleInputChange}
                        placeholder="john@example.com&#10;bob@example.com"
                        rows="4"
                    />
                    {formData.specific_emails && formData.specific_emails.split(/[\n,;]/).filter(e => e.trim()).length > 10 && (
                        <div className="aqb-warning-message">
                            ⚠️ More than 10 emails provided - file will be downloaded automatically
                        </div>
                    )}
                </div>

                <div className="aqb-form-actions">
                    <button
                        type="submit"
                        className="aqb-submit-button"
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : 'Run Query'}
                    </button>
                </div>
            </form>

            {/* Error Display */}
            {error && (
                <div className="aqb-error-message">
                    <h3>Error</h3>
                    <p>{error}</p>
                </div>
            )}

            {/* Results Display */}
            {results && (
                <div className="aqb-results-section">
                    {results.type === 'download' ? (
                        <div className="aqb-download-success">
                            <h3>✅ {results.message}</h3>
                            <p>Your audience data has been downloaded to your computer.</p>
                        </div>
                    ) : (
                        <div className="aqb-display-results">
                            <div className="aqb-results-header">
                                <h3>Query Results</h3>
                                <div className="aqb-results-summary">
                                    <span>Total Users: {results.data.total_count}</span>
                                    <span>Showing: {Math.min(results.data.users.length, results.data.total_count)}</span>
                                </div>
                            </div>

                            <div className="aqb-users-grid">
                                {results.data.users.map(renderUserCard)}
                            </div>

                            {results.data.total_count > results.data.users.length && (
                                <div className="aqb-more-results-notice">
                                    <p>
                                        Showing {results.data.users.length} of {results.data.total_count} users.
                                        Check "Download CSV file" to get all results.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AudienceQueryBuilder;