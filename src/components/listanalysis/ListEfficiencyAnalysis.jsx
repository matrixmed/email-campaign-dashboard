import React, { useState, useEffect } from 'react';
import '../../styles/ListEfficiencyAnalysis.css';

import { API_BASE_URL } from '../../config/api';

const ListEfficiencyAnalysis = () => {
    const [iqviaFile, setIqviaFile] = useState(null);
    const [targetFiles, setTargetFiles] = useState([]);
    const [uploadedData, setUploadedData] = useState(null);
    const [crossoverData, setCrossoverData] = useState(null);
    const [engagementByTier, setEngagementByTier] = useState(null);
    const [selectedTier, setSelectedTier] = useState(null);
    const [loading, setLoading] = useState(false);
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

        setLoading(true);
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
            setLoading(false);
        }
    };

    const calculateCrossover = async () => {
        if (!uploadedData) {
            setError('Please upload lists first');
            return;
        }

        setLoading(true);
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
            setLoading(false);
        }
    };

    const analyzeEngagementByTier = async () => {
        if (!uploadedData) {
            setError('Please upload lists and calculate crossover first');
            return;
        }

        setLoading(true);
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
            setLoading(false);
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

                <button onClick={uploadLists} disabled={loading} className="btn-primary">
                    {loading ? 'Uploading...' : 'Upload Lists'}
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

                    <button onClick={calculateCrossover} disabled={loading} className="btn-secondary">
                        {loading ? 'Calculating...' : 'Calculate Crossover'}
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
                </div>
            )}

            {crossoverData && (
                <div className="engagement-analysis-section">
                    <button onClick={analyzeEngagementByTier} disabled={loading} className="btn-primary">
                        {loading ? 'Analyzing Engagement...' : 'Analyze User Engagement'}
                    </button>
                </div>
            )}

            {engagementByTier && (
                <div className="engagement-tier-results">
                    <h3>Engagement Analysis by List Coverage</h3>
                    <div className="tier-summary">
                        {engagementByTier.tiers.map((tier, idx) => (
                            <div
                                key={idx}
                                className={`tier-card ${selectedTier === tier.tier ? 'selected' : ''}`}
                                onClick={() => setSelectedTier(tier.tier === selectedTier ? null : tier.tier)}
                            >
                                <div className="tier-header">
                                    <h4>{tier.tier} Lists</h4>
                                    <span className="tier-count">{tier.user_count.toLocaleString()} users</span>
                                </div>
                                <div className="tier-metrics">
                                    <div className="metric">
                                        <span className="metric-label">Avg Open Rate</span>
                                        <span className="metric-value">{tier.aggregate.avg_open_rate}%</span>
                                    </div>
                                    <div className="metric">
                                        <span className="metric-label">Engaged Users</span>
                                        <span className="metric-value">
                                            {tier.aggregate.engaged_count} ({tier.aggregate.engaged_percentage}%)
                                        </span>
                                    </div>
                                    <div className="metric">
                                        <span className="metric-label">Avg Emails Sent</span>
                                        <span className="metric-value">{tier.aggregate.avg_emails_sent}</span>
                                    </div>
                                    <div className="metric">
                                        <span className="metric-label">Avg Emails Opened</span>
                                        <span className="metric-value">{tier.aggregate.avg_emails_opened}</span>
                                    </div>
                                </div>
                                {selectedTier === tier.tier && tier.users.length > 0 && (
                                    <div className="tier-users-detail">
                                        <h5>Top 10 Most Engaged Users</h5>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Email</th>
                                                    <th>NPI</th>
                                                    <th>Open Rate</th>
                                                    <th>Emails Sent</th>
                                                    <th>Emails Opened</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {tier.users.map((user, userIdx) => (
                                                    <tr key={userIdx}>
                                                        <td>{user.email}</td>
                                                        <td>{user.npi}</td>
                                                        <td className={user.open_rate >= 20 ? 'engaged' : ''}>{user.open_rate}%</td>
                                                        <td>{user.emails_sent}</td>
                                                        <td>{user.emails_opened}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default ListEfficiencyAnalysis;
