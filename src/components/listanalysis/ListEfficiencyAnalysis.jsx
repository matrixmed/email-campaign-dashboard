import React, { useState, useEffect } from 'react';
import '../../styles/ListEfficiencyAnalysis.css';

import { API_BASE_URL } from '../../config/api';

const ListEfficiencyAnalysis = () => {
    const [iqviaFile, setIqviaFile] = useState(null);
    const [targetFiles, setTargetFiles] = useState([]);
    const [uploadedData, setUploadedData] = useState(null);
    const [crossoverData, setCrossoverData] = useState(null);
    const [campaignAssignments, setCampaignAssignments] = useState({});
    const [engagementResults, setEngagementResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [availableCampaigns, setAvailableCampaigns] = useState([]);

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        try {
            const response = await fetch(`https://matrixmedcomm.blob.core.windows.net/campaign-data/completed_campaign_metrics.json`);
            const data = await response.json();

            const campaigns = data.map(item => ({
                name: item.Campaign,
                send_date: item.Send_Date
            }));

            setAvailableCampaigns(campaigns);
        } catch (err) {
            console.error('Error fetching campaigns:', err);
        }
    };

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

            const assignments = {};
            data.target_lists.forEach((list, idx) => {
                assignments[idx] = [];
            });
            setCampaignAssignments(assignments);
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

    const handleCampaignAssignment = (listIdx, selectedCampaigns) => {
        setCampaignAssignments(prev => ({
            ...prev,
            [listIdx]: selectedCampaigns
        }));
    };

    const analyzeEngagement = async () => {
        if (!uploadedData) {
            setError('Please upload lists first');
            return;
        }

        const totalAssignments = Object.values(campaignAssignments).reduce((acc, arr) => acc + arr.length, 0);
        if (totalAssignments === 0) {
            setError('Please assign at least one campaign to a target list');
            return;
        }

        setLoading(true);
        setError(null);

        const formattedAssignments = {};
        Object.entries(campaignAssignments).forEach(([listIdx, campaigns]) => {
            formattedAssignments[listIdx] = campaigns;
        });

        try {
            const response = await fetch(`${API_BASE_URL}/api/list-analysis/engagement-comparison`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target_lists: uploadedData.target_lists,
                    campaign_assignments: formattedAssignments
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Analysis failed');
            }

            const data = await response.json();
            setEngagementResults(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const exportResults = async () => {
        if (!engagementResults) {
            setError('No results to export');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/list-analysis/export-results`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ results: engagementResults.results })
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'list_efficiency_analysis.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleCampaignSelect = (listIdx, campaignName) => {
        const currentAssignments = campaignAssignments[listIdx] || [];

        if (currentAssignments.includes(campaignName)) {
            handleCampaignAssignment(listIdx, currentAssignments.filter(c => c !== campaignName));
        } else if (currentAssignments.length < 20) {
            handleCampaignAssignment(listIdx, [...currentAssignments, campaignName]);
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

            {uploadedData && (
                <div className="campaign-assignment-section">
                    <h3>Assign Campaigns to Target Lists</h3>
                    {uploadedData.target_lists.map((list, listIdx) => (
                        <div key={listIdx} className="list-assignment">
                            <h4>{list.filename}</h4>
                            <div className="campaign-selector">
                                <input
                                    type="text"
                                    placeholder="Search campaigns..."
                                    className="campaign-search"
                                    onChange={(e) => {
                                        const searchTerm = e.target.value.toLowerCase();
                                        const dropdown = document.getElementById(`dropdown-${listIdx}`);
                                        if (dropdown) {
                                            dropdown.style.display = searchTerm ? 'block' : 'none';
                                        }
                                    }}
                                />
                                <div id={`dropdown-${listIdx}`} className="campaign-dropdown">
                                    {availableCampaigns
                                        .filter(c => !campaignAssignments[listIdx]?.includes(c.name))
                                        .map((campaign, idx) => (
                                            <div
                                                key={idx}
                                                className="campaign-option"
                                                onClick={() => handleCampaignSelect(listIdx, campaign.name)}
                                            >
                                                {campaign.name}
                                            </div>
                                        ))}
                                </div>
                                <div className="selected-campaigns">
                                    {(campaignAssignments[listIdx] || []).map((campaign, idx) => (
                                        <div key={idx} className="selected-campaign">
                                            {campaign}
                                            <button onClick={() => handleCampaignSelect(listIdx, campaign)}>×</button>
                                        </div>
                                    ))}
                                    <div className="assignment-count">
                                        {(campaignAssignments[listIdx] || []).length}/20 campaigns assigned
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    <button onClick={analyzeEngagement} disabled={loading} className="btn-primary">
                        {loading ? 'Analyzing...' : 'Analyze Engagement'}
                    </button>
                </div>
            )}

            {engagementResults && (
                <div className="engagement-results">
                    <h3>Engagement Comparison Results</h3>
                    <button onClick={exportResults} className="btn-export">
                        Export Results
                    </button>
                    <div className="results-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>List Name</th>
                                    <th>Campaign</th>
                                    <th>Target List Sent</th>
                                    <th>Target Open Rate</th>
                                    <th>Target Click Rate</th>
                                    <th>Non-Target Sent</th>
                                    <th>Non-Target Open Rate</th>
                                    <th>Non-Target Click Rate</th>
                                    <th>Open Rate Diff</th>
                                    <th>Click Rate Diff</th>
                                </tr>
                            </thead>
                            <tbody>
                                {engagementResults.results.map((result, idx) => (
                                    <tr key={idx}>
                                        <td>{result.list_name}</td>
                                        <td>{result.campaign_name}</td>
                                        <td>{result.target_list_metrics.total_sent}</td>
                                        <td>{result.target_list_metrics.open_rate}%</td>
                                        <td>{result.target_list_metrics.click_rate}%</td>
                                        <td>{result.non_target_metrics.total_sent}</td>
                                        <td>{result.non_target_metrics.open_rate}%</td>
                                        <td>{result.non_target_metrics.click_rate}%</td>
                                        <td className={result.difference.open_rate > 0 ? 'positive' : 'negative'}>
                                            {result.difference.open_rate}%
                                        </td>
                                        <td className={result.difference.click_rate > 0 ? 'positive' : 'negative'}>
                                            {result.difference.click_rate}%
                                        </td>
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
};

export default ListEfficiencyAnalysis;
