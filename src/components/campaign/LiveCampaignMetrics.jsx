import React, { useState, useEffect } from 'react';
import _ from 'lodash';
import CampaignModal from './CampaignModal';
import { metricDisplayNames } from '../utils/metricDisplayNames';
import { matchesSearchTerm } from '../../utils/searchUtils';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const LiveCampaignMetrics = ({ searchTerm = '' }) => {
    const [metrics, setMetrics] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [validationFlags, setValidationFlags] = useState([]);
    const [flagsByCampaign, setFlagsByCampaign] = useState({});
    const [flagSummary, setFlagSummary] = useState({ high: 0, medium: 0, low: 0 });
    const [showFlagDetails, setShowFlagDetails] = useState(null);
    const campaignsPerPage = 2;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const blobUrl = "https://emaildash.blob.core.windows.net/json-data/live_campaign_metrics.json?sp=r&st=2025-02-05T20:36:54Z&se=2026-07-31T03:36:54Z&spr=https&sv=2022-11-02&sr=b&sig=7Ywfk4UlVByj1PeeOo%2BjdliKQSVAWYDU5ZR%2Fcrc7eBE%3D";
                const response = await fetch(blobUrl);
                const data = await response.json();

                const getBaseName = (name) => {
                    return name.replace(/\s*-?\s*Deployment\s+(?:#?\d+|\w+)(?:\s+.*)?$/i, '').trim();
                };

                const isDeploymentOne = (campaignName) => {
                    return /deployment\s*(?:#?\s*1|one|1st|\bfirst\b)/i.test(campaignName);
                };

                const tempGrouped = _.groupBy(data, item => getBaseName(item.Campaign));
                const processedMetrics = [];

                Object.entries(tempGrouped).forEach(([baseName, campaigns]) => {
                    const validDeployments = campaigns.filter(c => c.Sent > 0 && c.Delivered > 20 && c.Unique_Opens !== "NA");

                    if (validDeployments.length === 0) return;

                    const displayName = validDeployments.length === 1 
                        ? validDeployments[0].Campaign
                        : baseName;

                    const deployment1 = validDeployments.find(c => isDeploymentOne(c.Campaign)) || validDeployments[0];

                    const sumMetric = (key) => {
                        return _.sum(validDeployments.map(c => (c[key] !== "NA" ? c[key] : 0)));
                    };

                    const combined = {
                        Campaign: displayName,
                        Send_Date:
                            validDeployments.length === 1
                                ? validDeployments[0].Send_Date
                                : (deployment1?.Send_Date || _.minBy(validDeployments, 'Send_Date').Send_Date),
                        Sent: deployment1.Sent,
                        Delivered: deployment1.Delivered,
                        Total_Bounces: sumMetric('Total_Bounces'),
                        Hard_Bounces: sumMetric('Hard_Bounces'),
                        Soft_Bounces: sumMetric('Soft_Bounces'),
                        Unique_Opens: sumMetric('Unique_Opens'),
                        Total_Opens: sumMetric('Total_Opens'),
                        Unique_Clicks: sumMetric('Unique_Clicks'),
                        Total_Clicks: sumMetric('Total_Clicks'),
                        Filtered_Bot_Clicks: sumMetric('Filtered_Bot_Clicks'),
                        DeploymentCount: validDeployments.length,
                        Deployments: validDeployments.map(d => d.Campaign)
                    };

                    combined.Delivery_Rate = Number(((combined.Delivered / deployment1.Sent) * 100).toFixed(2));
                    combined.Unique_Open_Rate = Number(((combined.Unique_Opens / deployment1.Delivered) * 100).toFixed(2));
                    combined.Total_Open_Rate = Number(((combined.Total_Opens / deployment1.Delivered) * 100).toFixed(2));
                    combined.Unique_Click_Rate = Number(((combined.Unique_Clicks / combined.Unique_Opens) * 100).toFixed(2));
                    combined.Total_Click_Rate = Number(((combined.Total_Clicks / combined.Total_Opens) * 100).toFixed(2));

                    processedMetrics.push(combined);
                });

                const sortedMetrics = _.orderBy(processedMetrics, ['Send_Date'], ['desc']);
                setMetrics(sortedMetrics);

            } catch (error) {
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        const fetchFlags = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/validation-flags/active`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        setValidationFlags(data.flags || []);
                        setFlagSummary(data.summary || { high: 0, medium: 0, low: 0 });

                        const byName = {};
                        (data.flags || []).forEach(flag => {
                            const name = flag.campaign_name;
                            if (!byName[name]) {
                                byName[name] = [];
                            }
                            byName[name].push(flag);
                        });
                        setFlagsByCampaign(byName);
                    }
                }
            } catch (error) {
            }
        };

        fetchFlags();
        const interval = setInterval(fetchFlags, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const getCampaignFlags = (campaignName, currentMetrics) => {
        let flags = [];

        const namesToCheck = [campaignName];
        if (currentMetrics?.Deployments) {
            namesToCheck.push(...currentMetrics.Deployments);
        }

        for (const nameToCheck of namesToCheck) {
            if (flagsByCampaign[nameToCheck]) {
                flags = [...flags, ...flagsByCampaign[nameToCheck]];
            }
            for (const flagName of Object.keys(flagsByCampaign)) {
                if (nameToCheck.includes(flagName) || flagName.includes(nameToCheck)) {
                    const matchedFlags = flagsByCampaign[flagName];
                    for (const f of matchedFlags) {
                        if (!flags.find(existing => existing.id === f.id)) {
                            flags.push(f);
                        }
                    }
                }
            }
        }

        if (flags.length === 0) return [];

        const now = new Date();

        flags = flags.filter(flag => {
            const flagTime = flag.detected_at ? new Date(flag.detected_at) : null;
            if (flagTime) {
                const hoursSinceDetected = (now - flagTime) / (1000 * 60 * 60);
                if (hoursSinceDetected > 24) {
                    return false; 
                }
            }

            if (flag.issue_type === 'sent_deviation' && flag.campaign_name) {
                const isDeployment1 = /deployment\s*#?\s*1\b/i.test(flag.campaign_name);
                const hasDeploymentNumber = /deployment\s*#?\s*\d+/i.test(flag.campaign_name);

                if (hasDeploymentNumber && !isDeployment1) {
                    return false;
                }
            }

            if (flag.api_value && currentMetrics?.Sent) {
                const deviation = Math.abs(currentMetrics.Sent - flag.api_value) / flag.api_value;
                if (deviation < 0.01) {
                    return false; 
                }
            }

            return true; 
        });

        return flags;
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'HIGH': return '#d32f2f';
            case 'MEDIUM': return '#ff9800';
            case 'LOW': return '#2196f3';
            default: return '#757575';
        }
    };

    const getSeverityBg = (severity) => {
        switch (severity) {
            case 'HIGH': return '#ffebee';
            case 'MEDIUM': return '#fff3e0';
            case 'LOW': return '#e3f2fd';
            default: return '#f5f5f5';
        }
    };

    const filteredMetrics = searchTerm
        ? metrics.filter(item => matchesSearchTerm(item.Campaign, searchTerm))
        : metrics;

    const indexOfLastCampaign = currentPage * campaignsPerPage;
    const indexOfFirstCampaign = indexOfLastCampaign - campaignsPerPage;
    const currentCampaigns = filteredMetrics.slice(indexOfFirstCampaign, indexOfLastCampaign);
    const totalPages = Math.ceil(filteredMetrics.length / campaignsPerPage);

    const handleCampaignClick = (campaign) => {
        setSelectedCampaign(campaign);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedCampaign(null);
    };

    const handleModalNavigate = (direction) => {
        const currentIndex = metrics.findIndex(c => c.Campaign === selectedCampaign.Campaign);
        if (direction === 'next' && currentIndex < metrics.length - 1) {
            setSelectedCampaign(metrics[currentIndex + 1]);
        } else if (direction === 'prev' && currentIndex > 0) {
            setSelectedCampaign(metrics[currentIndex - 1]);
        }
    };

    const exportToCSV = () => {
        const headers = [
            'Campaign',
            'Send_Date',
            'Sent',
            'Delivered',
            'Delivery_Rate',
            'Total_Bounces',
            'Hard_Bounces',
            'Soft_Bounces',
            'Unique_Opens',
            'Unique_Open_Rate',
            'Total_Opens',
            'Total_Open_Rate',
            'Unique_Clicks',
            'Unique_Click_Rate',
            'Total_Clicks',
            'Total_Click_Rate',
            'Filtered_Bot_Clicks',
            'DeploymentCount'
        ];

        const rows = metrics.map(item => [
            item.Campaign,
            item.Send_Date || '',
            item.Sent,
            item.Delivered,
            item.Delivery_Rate,
            item.Total_Bounces,
            item.Hard_Bounces,
            item.Soft_Bounces,
            item.Unique_Opens,
            item.Unique_Open_Rate,
            item.Total_Opens,
            item.Total_Open_Rate,
            item.Unique_Clicks,
            item.Unique_Click_Rate,
            item.Total_Clicks,
            item.Total_Click_Rate,
            item.Filtered_Bot_Clicks,
            item.DeploymentCount
        ]);
        
        const csvContent = [
            headers.map(h => `"${h}"`).join(','),
            ...rows.map(row => 
                row.map(cell => 
                    `"${String(cell).replace(/"/g, '""')}"`
                ).join(',')
            )
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'live_campaign_metrics.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="live-campaign-metrics">
            <h2>Live Campaign Metrics</h2>

            {(() => {
                const activeFlagCount = { high: 0, medium: 0, low: 0, total: 0 };
                const seenCampaigns = new Set();

                metrics.forEach(campaign => {
                    const activeFlags = getCampaignFlags(campaign.Campaign, campaign);
                    if (activeFlags.length > 0 && !seenCampaigns.has(campaign.Campaign)) {
                        seenCampaigns.add(campaign.Campaign);
                        activeFlagCount.total++;
                        activeFlags.forEach(f => {
                            if (f.severity === 'HIGH') activeFlagCount.high++;
                            else if (f.severity === 'MEDIUM') activeFlagCount.medium++;
                            else if (f.severity === 'LOW') activeFlagCount.low++;
                        });
                    }
                });

                if (activeFlagCount.total === 0) return null;

                return (
                    <div style={{
                        background: '#2a2a3e',
                        border: '1px solid #444',
                        borderRadius: '6px',
                        padding: '12px 16px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '14px', color: '#ccc' }}>
                                Data Validation Alerts
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {activeFlagCount.high > 0 && (
                                    <span style={{
                                        background: '#d32f2f',
                                        color: '#fff',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        fontSize: '11px',
                                        fontWeight: 'bold'
                                    }}>
                                        {activeFlagCount.high} HIGH
                                    </span>
                                )}
                                {activeFlagCount.medium > 0 && (
                                    <span style={{
                                        background: '#ff9800',
                                        color: '#fff',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        fontSize: '11px',
                                        fontWeight: 'bold'
                                    }}>
                                        {activeFlagCount.medium} MEDIUM
                                    </span>
                                )}
                                {activeFlagCount.low > 0 && (
                                    <span style={{
                                        background: '#2196f3',
                                        color: '#fff',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        fontSize: '11px',
                                        fontWeight: 'bold'
                                    }}>
                                        {activeFlagCount.low} LOW
                                    </span>
                                )}
                            </div>
                        </div>
                        <span style={{ fontSize: '12px', color: '#888' }}>
                            {activeFlagCount.total} campaign{activeFlagCount.total !== 1 ? 's' : ''} flagged.
                        </span>
                    </div>
                );
            })()}

            <div className="campaign-grid">
                {currentCampaigns.map((campaign, index) => {
                    const campaignFlags = getCampaignFlags(campaign.Campaign, campaign);
                    const hasFlagsForCampaign = campaignFlags.length > 0;
                    const highestSeverity = campaignFlags.length > 0
                        ? campaignFlags.reduce((max, f) => {
                            const order = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
                            return order[f.severity] > order[max] ? f.severity : max;
                        }, 'LOW')
                        : null;

                    return (
                        <div
                            key={index}
                            className="campaign-box"
                            style={{ position: 'relative' }}
                        >
                            <h3
                                className="campaign-name-clickable"
                                onClick={() => handleCampaignClick(campaign)}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                {campaign.Campaign}
                                {hasFlagsForCampaign && (
                                    <div
                                        className="flag-icon-wrapper"
                                        onMouseEnter={() => setShowFlagDetails(index)}
                                        onMouseLeave={() => setShowFlagDetails(null)}
                                        style={{ position: 'relative', display: 'inline-flex' }}
                                    >
                                        <svg
                                            viewBox="0 0 20 20"
                                            fill={getSeverityColor(highestSeverity)}
                                            width="22"
                                            height="22"
                                            style={{ cursor: 'pointer', flexShrink: 0 }}
                                        >
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        {showFlagDetails === index && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '24px',
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                background: '#1e1e2e',
                                                border: '1px solid #444',
                                                borderRadius: '6px',
                                                padding: '10px 12px',
                                                width: '280px',
                                                zIndex: 1000,
                                                boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
                                            }}>
                                                <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '8px' }}>
                                                    Validation Issue{campaignFlags.length > 1 ? 's' : ''}
                                                </div>
                                                {campaignFlags.map((flag, fIdx) => (
                                                    <div key={fIdx} style={{
                                                        borderLeft: `3px solid ${getSeverityColor(flag.severity)}`,
                                                        paddingLeft: '8px',
                                                        marginBottom: fIdx < campaignFlags.length - 1 ? '8px' : 0,
                                                        fontSize: '11px'
                                                    }}>
                                                        <div style={{ color: '#fff', marginBottom: '2px' }}>
                                                            <span style={{
                                                                color: getSeverityColor(flag.severity),
                                                                fontWeight: 'bold',
                                                                marginRight: '6px'
                                                            }}>
                                                                {flag.severity}
                                                            </span>
                                                            {flag.category}
                                                        </div>
                                                        {flag.local_value && flag.api_value && (
                                                            <div style={{ color: '#888' }}>
                                                                Local: {flag.local_value.toLocaleString()} | API: {flag.api_value.toLocaleString()}
                                                            </div>
                                                        )}
                                                        {flag.deviation_pct && (
                                                            <div style={{ color: '#888' }}>
                                                                {flag.deviation_pct.toFixed(1)}% deviation
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </h3>
                            <p className="text-sm text-gray-600">
                                Deployment date {campaign.Send_Date} ({campaign.DeploymentCount} deployment{campaign.DeploymentCount !== 1 ? 's' : ''})
                            </p>
                            <table>
                                <tbody>
                                    <tr><td>Sent:</td><td>{campaign.Sent.toLocaleString()}</td></tr>
                                    <tr><td>Hard Bounces:</td><td>{campaign.Hard_Bounces.toLocaleString()}</td></tr>
                                    <tr><td>Soft Bounces:</td><td>{campaign.Soft_Bounces.toLocaleString()}</td></tr>
                                    <tr><td>Total Bounces:</td><td>{campaign.Total_Bounces.toLocaleString()}</td></tr>
                                    <tr><td>Delivered:</td><td>{campaign.Delivered.toLocaleString()}</td></tr>
                                    <tr><td>Delivery Rate:</td><td>{campaign.Delivery_Rate.toFixed(2)}%</td></tr>
                                    <tr><td>Unique Opens:</td><td>{campaign.Unique_Opens.toLocaleString()}</td></tr>
                                    <tr><td>Unique Open Rate:</td><td>{campaign.Unique_Open_Rate.toFixed(2)}%</td></tr>
                                    <tr><td>Total Opens:</td><td>{campaign.Total_Opens.toLocaleString()}</td></tr>
                                    <tr><td>Total Open Rate:</td><td>{campaign.Total_Open_Rate.toFixed(2)}%</td></tr>
                                    <tr><td>Unique Clicks:</td><td>{campaign.Unique_Clicks.toLocaleString()}</td></tr>
                                    <tr><td>Unique Click Rate:</td><td>{campaign.Unique_Click_Rate.toFixed(2)}%</td></tr>
                                    <tr><td>Total Clicks:</td><td>{campaign.Total_Clicks.toLocaleString()}</td></tr>
                                    <tr><td>Total Click Rate:</td><td>{campaign.Total_Click_Rate.toFixed(2)}%</td></tr>
                                    <tr><td>Bot Clicks:</td><td>{campaign.Filtered_Bot_Clicks.toLocaleString()}</td></tr>
                                </tbody>
                            </table>
                        </div>
                    );
                })}
            </div>
            <div className="pagination">
                {currentPage > 1 && (
                    <button onClick={() => setCurrentPage(p => p - 1)}>Previous</button>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(num => {
                        if (num === 1 || num === totalPages) return true;
                        if (Math.abs(currentPage - num) <= 2) return true;
                        if (currentPage <= 4 && num <= 5) return true;
                        if (currentPage >= totalPages - 3 && num >= totalPages - 4) return true;
                        return false;
                    })
                    .map((num, index, array) => {
                        if (index > 0 && array[index - 1] !== num - 1) {
                            return [
                                <span key={`ellipsis-${num}`} className="pagination-ellipsis">...</span>,
                                <button
                                    key={num}
                                    onClick={() => setCurrentPage(num)}
                                    className={currentPage === num ? 'active' : ''}
                                >
                                    {num}
                                </button>
                            ];
                        }
                        return (
                            <button
                                key={num}
                                onClick={() => setCurrentPage(num)}
                                className={currentPage === num ? 'active' : ''}
                            >
                                {num}
                            </button>
                        );
                    })}
                {currentPage < totalPages && (
                    <button onClick={() => setCurrentPage(p => p + 1)}>Next</button>
                )}
            </div>
            <div className="export-button-container">
                <button
                    className="export-button"
                    onClick={exportToCSV}
                >
                    Export CSV
                </button>
            </div>

            <CampaignModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                campaign={selectedCampaign}
                compareCampaigns={[]}
                isCompareMode={false}
                metricDisplayNames={metricDisplayNames}
                allCampaigns={metrics}
                onNavigate={handleModalNavigate}
            />
        </div>
    );
};

export default LiveCampaignMetrics;