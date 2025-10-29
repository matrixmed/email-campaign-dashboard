import React, { useState, useEffect } from 'react';
import '../../styles/ListEfficiencyAnalysis.css';

import { API_BASE_URL } from '../../config/api';

const ListEfficiencyAnalysis = () => {
    const [iqviaFile, setIqviaFile] = useState(null);
    const [targetFiles, setTargetFiles] = useState([]);
    const [uploadedData, setUploadedData] = useState(null);
    const [crossoverData, setCrossoverData] = useState(null);
    const [engagementByTier, setEngagementByTier] = useState(null);
    const [expandedTiers, setExpandedTiers] = useState(new Set());
    const [uploadLoading, setUploadLoading] = useState(false);
    const [crossoverLoading, setCrossoverLoading] = useState(false);
    const [engagementLoading, setEngagementLoading] = useState(false);
    const [error, setError] = useState(null);


    const handleIqviaUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setIqviaFile(file);
        }
    };

    const handleTargetFilesUpload = (e) => {
        const files = Array.from(e.target.files);
        setTargetFiles(files);
    };

    const handleDrop = (e, type) => {
        e.preventDefault();
        e.stopPropagation();
        const files = Array.from(e.dataTransfer.files);

        if (type === 'iqvia') {
            if (files.length > 0) {
                setIqviaFile(files[0]);
            }
        } else if (type === 'target') {
            setTargetFiles(files);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const uploadLists = async () => {
        if (!iqviaFile || targetFiles.length === 0) {
            setError('Please upload IQVIA list and at least one target list');
            return;
        }

        setUploadLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('iqvia_list', iqviaFile);
        targetFiles.forEach(file => {
            formData.append('target_lists', file);
        });

        try {
            const response = await fetch(`${API_BASE_URL}/api/list-analysis/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            const data = await response.json();
            setUploadedData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setUploadLoading(false);
        }
    };

    const calculateCrossover = async () => {
        if (!uploadedData) {
            setError('Please upload lists first');
            return;
        }

        setCrossoverLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/list-analysis/calculate-crossover`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    iqvia_npis: uploadedData.iqvia_npis,
                    target_lists: uploadedData.target_lists
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Calculation failed');
            }

            const data = await response.json();
            setCrossoverData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setCrossoverLoading(false);
        }
    };

    const analyzeEngagementByTier = async () => {
        if (!uploadedData) {
            setError('Please upload lists and calculate crossover first');
            return;
        }

        setEngagementLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/list-analysis/engagement-by-tier`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    iqvia_npis: uploadedData.iqvia_npis,
                    target_lists: uploadedData.target_lists
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Analysis failed');
            }

            const data = await response.json();
            setEngagementByTier(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setEngagementLoading(false);
        }
    };

    return (
        <div className="list-analysis-container">
            <div className="page-header">
                <h1>List Efficiency Analysis</h1>
                <div className="header-spacer"></div>
            </div>

            <div className="analysis-content">
                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                <div className="upload-section">
                <div className="file-upload-group">
                    <label>IQVIA Full List</label>
                    <div
                        className="drop-zone"
                        onDrop={(e) => handleDrop(e, 'iqvia')}
                        onDragOver={handleDragOver}
                    >
                        <input
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            onChange={handleIqviaUpload}
                            className="file-input-hidden"
                            id="iqvia-file-input"
                        />
                        <label htmlFor="iqvia-file-input" className="drop-zone-label">
                            {iqviaFile ? (
                                <span className="file-name-display">{iqviaFile.name}</span>
                            ) : (
                                <div className="drop-zone-content">
                                    <p>Drag and drop IQVIA file here</p>
                                    <p className="drop-zone-or">or</p>
                                    <span className="drop-zone-browse">Click to browse</span>
                                </div>
                            )}
                        </label>
                    </div>
                </div>

                <div className="file-upload-group">
                    <label>Target Lists</label>
                    <div
                        className="drop-zone"
                        onDrop={(e) => handleDrop(e, 'target')}
                        onDragOver={handleDragOver}
                    >
                        <input
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            multiple
                            onChange={handleTargetFilesUpload}
                            className="file-input-hidden"
                            id="target-files-input"
                        />
                        <label htmlFor="target-files-input" className="drop-zone-label">
                            {targetFiles.length > 0 ? (
                                <div className="file-list">
                                    {targetFiles.map((file, idx) => (
                                        <div key={idx} className="file-item">{file.name}</div>
                                    ))}
                                </div>
                            ) : (
                                <div className="drop-zone-content">
                                    <p>Drag and drop multiple target files here</p>
                                    <p className="drop-zone-or">or</p>
                                    <span className="drop-zone-browse">Click to browse</span>
                                </div>
                            )}
                        </label>
                    </div>
                </div>

                <button onClick={uploadLists} disabled={uploadLoading} className="btn-primary">
                    {uploadLoading ? 'Uploading...' : 'Upload Lists'}
                </button>
            </div>

            {uploadedData && (
                <>
                    <div className="data-summary">
                        <h3>Uploaded Data Summary</h3>
                        <p>IQVIA Total Users: {uploadedData.iqvia_count}</p>
                        <p>Target Lists: {uploadedData.target_lists.length}</p>
                        <div className="list-summary">
                            {uploadedData.target_lists.map((list, idx) => (
                                <div key={idx} className="list-item">
                                    <strong>{list.filename}</strong>: {list.count} users
                                </div>
                            ))}
                        </div>
                    </div>

                    <button onClick={calculateCrossover} disabled={crossoverLoading} className="btn-primary">
                        {crossoverLoading ? 'Calculating...' : 'Calculate Crossover'}
                    </button>
                </>
            )}

            {crossoverData && (
                <div className="crossover-results">
                    <h3>Crossover Distribution</h3>
                    <div className="distribution-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Lists Coverage</th>
                                    <th>User Count</th>
                                    <th>Percentage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {crossoverData.distribution.map((item, idx) => (
                                    <tr key={idx}>
                                        <td>{item.lists_count}</td>
                                        <td>{item.users_count}</td>
                                        <td>{item.percentage}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* High-level summary of target list coverage */}
                    <div className="crossover-summary">
                        <p>
                            <strong>{crossoverData.users_on_at_least_one_list?.toLocaleString() || 0}</strong> / <strong>{crossoverData.total_iqvia_users?.toLocaleString() || 0}</strong> ({crossoverData.percentage_on_at_least_one_list || 0}%)
                            people in the IQVIA full target list appeared on at least one target list
                        </p>
                    </div>
                </div>
            )}

            {crossoverData && (
                <button onClick={analyzeEngagementByTier} disabled={engagementLoading} className="btn-primary">
                    {engagementLoading ? 'Analyzing Engagement...' : 'Analyze User Engagement'}
                </button>
            )}

            {engagementByTier && (
                <div className="engagement-tier-results">
                    <h3>Engagement Analysis by List Coverage</h3>

                    {/* High-level engagement summary */}
                    {engagementByTier.engagement_summary && (
                        <div className="engagement-summary">
                            <div className="engagement-summary-stats">
                                <div className="engagement-summary-stat">
                                    <span className="summary-label">Users Who Opened At Least One Email</span>
                                    <span className="summary-value">
                                        {engagementByTier.engagement_summary.users_who_opened_at_least_one?.toLocaleString() || 0} / {engagementByTier.engagement_summary.total_npis_on_target_lists?.toLocaleString() || 0}
                                        <span className="summary-percentage"> ({engagementByTier.engagement_summary.percentage_who_opened || 0}%)</span>
                                    </span>
                                </div>
                                <div className="engagement-summary-stat">
                                    <span className="summary-label">Average Unique Open Rate (Across All Campaigns)</span>
                                    <span className="summary-value">
                                        {engagementByTier.engagement_summary.avg_unique_open_rate || 0}%
                                        <span className="summary-detail"> ({engagementByTier.engagement_summary.total_unique_opens?.toLocaleString() || 0} opens / {engagementByTier.engagement_summary.total_delivered?.toLocaleString() || 0} delivered)</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="tier-summary">
                        {engagementByTier.tiers.map((tier, idx) => {
                            const isExpanded = expandedTiers.has(tier.tier);
                            return (
                            <div
                                key={idx}
                                className={`tier-card ${isExpanded ? 'expanded' : ''}`}
                            >
                                <div
                                    className="tier-header-clickable"
                                    onClick={() => {
                                        setExpandedTiers(prev => {
                                            const newSet = new Set(prev);
                                            if (newSet.has(tier.tier)) {
                                                newSet.delete(tier.tier);
                                            } else {
                                                newSet.add(tier.tier);
                                            }
                                            return newSet;
                                        });
                                    }}
                                >
                                    <div className="tier-title">
                                        <h4>{tier.tier} Lists Coverage</h4>
                                        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                                    </div>
                                    <div className="tier-summary-stats">
                                        <div className="summary-stat">
                                            <span className="stat-label">Total NPIs</span>
                                            <span className="stat-value">{tier.user_count.toLocaleString()}</span>
                                        </div>
                                        <div className="summary-stat">
                                            <span className="stat-label">Matched in DB</span>
                                            <span className="stat-value">{tier.matched_count.toLocaleString()}</span>
                                        </div>
                                        <div className="summary-stat">
                                            <span className="stat-label">Unique Open Rate</span>
                                            <span className="stat-value">{tier.aggregate.avg_unique_open_rate}%</span>
                                        </div>
                                        <div className="summary-stat">
                                            <span className="stat-label">Total Delivered</span>
                                            <span className="stat-value">{tier.aggregate.total_delivered.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="tier-detail-view">
                                        {/* Aggregate Overview - matching Audience Analysis style */}
                                        <div className="aggregate-overview">
                                            <h5>Overview</h5>
                                            <div className="aggregate-grid">
                                                <div className="aggregate-stat">
                                                    <span className="stat-label">Total Delivered</span>
                                                    <span className="stat-value">{tier.aggregate.total_delivered.toLocaleString()}</span>
                                                </div>
                                                <div className="aggregate-stat">
                                                    <span className="stat-label">Unique Opens</span>
                                                    <span className="stat-value">{tier.aggregate.total_unique_opens.toLocaleString()}</span>
                                                </div>
                                                <div className="aggregate-stat">
                                                    <span className="stat-label">Unique Open Rate</span>
                                                    <span className="stat-value">{tier.aggregate.avg_unique_open_rate}%</span>
                                                </div>
                                                <div className="aggregate-stat">
                                                    <span className="stat-label">Total Open Rate</span>
                                                    <span className="stat-value">{tier.aggregate.avg_total_open_rate}%</span>
                                                </div>
                                                <div className="aggregate-stat">
                                                    <span className="stat-label">Unique Click Rate</span>
                                                    <span className="stat-value">{tier.aggregate.avg_unique_click_rate}%</span>
                                                </div>
                                                <div className="aggregate-stat">
                                                    <span className="stat-label">Total Click Rate</span>
                                                    <span className="stat-value">{tier.aggregate.avg_total_click_rate}%</span>
                                                </div>
                                            </div>
                                            <div className="aggregate-lists">
                                                <div className="aggregate-list-item">
                                                    <strong>Specialties:</strong> {tier.aggregate.specialties.length > 0 ? tier.aggregate.specialties.slice(0, 5).join(', ') : 'None'}
                                                    {tier.aggregate.specialties.length > 5 && ` +${tier.aggregate.specialties.length - 5} more`}
                                                </div>
                                                <div className="aggregate-list-item">
                                                    <strong>Campaigns:</strong> {tier.aggregate.campaigns.length > 0 ? tier.aggregate.campaigns.slice(0, 5).join(', ') : 'None'}
                                                    {tier.aggregate.campaigns.length > 5 && ` +${tier.aggregate.campaigns.length - 5} more`}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Sample Data Table - matching Audience Analysis style */}
                                        {tier.users && tier.users.length > 0 ? (
                                            <div className="sample-data-section">
                                                <h5>Top 10 Most Engaged Users</h5>
                                                <div className="table-container">
                                                    <table className="results-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Email</th>
                                                                <th>Name</th>
                                                                <th>Specialty</th>
                                                                <th>Campaigns</th>
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
                                                            {tier.users.map((user, userIdx) => (
                                                                <tr key={userIdx}>
                                                                    <td>{user.email}</td>
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
                                            </div>
                                        ) : (
                                            <div className="no-data-message">
                                                <p>No users found with engagement data in the database.</p>
                                                <p className="help-text">
                                                    This could mean the NPIs from this tier haven't been sent any campaigns yet,
                                                    or they don't exist in the user_profiles table.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            );
                        })}
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default ListEfficiencyAnalysis;
