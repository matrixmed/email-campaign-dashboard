import React, { useEffect, useRef, useState } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import '../../styles/CampaignModal.css';
import { API_BASE_URL } from '../../config/api';

const CampaignModal = ({ isOpen, onClose, campaign, compareCampaigns, isCompareMode, metricDisplayNames, allCampaigns = [], onNavigate }) => {
    const modalRef = useRef(null);
    const [campaignMetadata, setCampaignMetadata] = useState(null);
    const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFiles, setUploadFiles] = useState({
        targetList: null,
        tags: null,
        adImages: []
    });
    const [uploading, setUploading] = useState(false);
    const [hasMetadata, setHasMetadata] = useState(false);
    const [metadataLoading, setMetadataLoading] = useState(false);

    const currentIndex = campaign && allCampaigns.length > 0
        ? allCampaigns.findIndex(c => c.Campaign === campaign.Campaign)
        : -1;
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex >= 0 && currentIndex < allCampaigns.length - 1;

    useEffect(() => {
        function handleClickOutside(event) {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                // Don't close if clicking on navigation arrows
                if (!event.target.closest('.modal-nav-arrow')) {
                    onClose();
                }
            }
        }

        function handleKeyDown(event) {
            if (!isOpen || isCompareMode) return;

            if (event.key === 'ArrowLeft' && hasPrev && onNavigate) {
                event.preventDefault();
                onNavigate('prev');
            } else if (event.key === 'ArrowRight' && hasNext && onNavigate) {
                event.preventDefault();
                onNavigate('next');
            } else if (event.key === 'Escape') {
                onClose();
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose, isCompareMode, hasPrev, hasNext, onNavigate]);

    useEffect(() => {
        async function fetchCampaignMetadata() {
            if (!isOpen || !campaign || isCompareMode) return;

            setIsLoadingMetadata(true);
            try {
                const blobUrl = "https://emaildash.blob.core.windows.net/json-data/completed_campaign_metadata.json?sp=r&st=2025-09-03T19:53:53Z&se=2027-09-29T04:08:53Z&spr=https&sv=2024-11-04&sr=b&sig=JWxxARzWg4FN%2FhGa17O3RGffl%2BVyJ%2FkE3npL9Iws%2FIs%3D";
                const response = await fetch(blobUrl);
                const jsonData = await response.json();

                const baseCampaignName = formatCampaignName(campaign.Campaign).toLowerCase();
                const matchingCampaigns = jsonData.filter(item =>
                    item.base_campaign_name.toLowerCase().includes(baseCampaignName) ||
                    baseCampaignName.includes(item.base_campaign_name.toLowerCase())
                );

                if (matchingCampaigns.length > 0) {
                    const combinedMetadata = combineDeploymentMetadata(matchingCampaigns);
                    setCampaignMetadata(combinedMetadata);
                }
            } catch (error) {
                console.error('Error fetching campaign metadata:', error);
            } finally {
                setIsLoadingMetadata(false);
            }
        }

        async function checkMetadataExists() {
            if (!isOpen || !campaign || isCompareMode) return;

            setMetadataLoading(true);
            try {
                const response = await fetch(`${API_BASE_URL}/api/campaigns/${encodeURIComponent(campaign.Campaign)}/metadata`);
                const data = await response.json();
                setHasMetadata(data.status === 'success');
            } catch (error) {
                setHasMetadata(false);
            } finally {
                setMetadataLoading(false);
            }
        }

        fetchCampaignMetadata();
        checkMetadataExists();
    }, [isOpen, campaign, isCompareMode]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
    
           const date = new Date(`${dateString}T00:00:00`);
        if (isNaN(date.getTime())) return dateString;
    
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatNumber = (num) => {
        if (typeof num !== 'number' || isNaN(num)) return '0';
        return num.toLocaleString();
    };

    const formatPercentage = (value) => {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        
        if (typeof numValue !== 'number' || isNaN(numValue)) return '0.00%';
        
        return `${numValue.toFixed(2)}%`;
    };

    const formatCampaignName = (name) => {
        return name.split(/\s*[-–—]\s*deployment\s*#?\d+|\s+deployment\s*#?\d+/i)[0].trim();
    };

    const combineDeploymentMetadata = (deployments) => {
        if (deployments.length === 1) {
            return deployments[0];
        }

        const combined = { ...deployments[0] };
        
        // Time-based open rates: weighted average by total_unique_opens
        if (deployments[0].time_based_open_rates) {
            let totalUniqueOpens = 0;
            let weighted1Hour = 0;
            let weighted12Hour = 0;
            let weighted24Hour = 0;
            
            deployments.forEach(d => {
                const opens = d.time_based_open_rates.total_unique_opens || 0;
                totalUniqueOpens += opens;
                weighted1Hour += (d.time_based_open_rates["1_hour_open_rate"] || 0) * opens;
                weighted12Hour += (d.time_based_open_rates["12_hour_open_rate"] || 0) * opens;
                weighted24Hour += (d.time_based_open_rates["24_hour_open_rate"] || 0) * opens;
            });
            
            combined.time_based_open_rates = {
                total_delivered: deployments.reduce((sum, d) => sum + (d.time_based_open_rates.total_delivered || 0), 0),
                total_unique_opens: totalUniqueOpens,
                "1_hour_open_rate": totalUniqueOpens > 0 ? weighted1Hour / totalUniqueOpens : 0,
                "12_hour_open_rate": totalUniqueOpens > 0 ? weighted12Hour / totalUniqueOpens : 0,
                "24_hour_open_rate": totalUniqueOpens > 0 ? weighted24Hour / totalUniqueOpens : 0
            };
        }

        // Audience breakdown: use combined opens, deployment 1 delivered for rates
        if (deployments[0].audience_breakdown) {
            combined.audience_breakdown = {};
            const allAudienceTypes = new Set();
            deployments.forEach(d => Object.keys(d.audience_breakdown || {}).forEach(key => allAudienceTypes.add(key)));
            
            // Get deployment 1 data (first deployment chronologically or marked as deployment 1)
            const deployment1 = deployments.find(d => d.campaign_name && /deployment\s*#?\s*1\s*$/i.test(d.campaign_name)) || deployments[0];
            
            // Calculate total delivered from deployment 1 only
            const totalDeliveredDeployment1 = Object.values(deployment1.audience_breakdown || {}).reduce((sum, audience) => sum + (audience.delivered || 0), 0);
            
            allAudienceTypes.forEach(audienceType => {
                const deployment1Delivered = deployment1.audience_breakdown[audienceType]?.delivered || 0;
                const totalOpens = deployments.reduce((sum, d) => sum + (d.audience_breakdown[audienceType]?.opens || 0), 0);
                
                combined.audience_breakdown[audienceType] = {
                    delivered: deployment1Delivered,
                    opens: totalOpens,
                    open_rate: deployment1Delivered > 0 ? (totalOpens / deployment1Delivered) * 100 : 0,
                    percentage_of_audience: totalDeliveredDeployment1 > 0 ? (deployment1Delivered / totalDeliveredDeployment1) * 100 : 0
                };
            });
        }

        // Geographic breakdown: use combined opens, deployment 1 delivered for rates  
        if (deployments[0].geographic_breakdown) {
            combined.geographic_breakdown = {};
            const regions = Object.keys(deployments[0].geographic_breakdown);
            
            // Get deployment 1 data
            const deployment1 = deployments.find(d => d.campaign_name && /deployment\s*#?\s*1\s*$/i.test(d.campaign_name)) || deployments[0];
            
            // Calculate total delivered from deployment 1 only
            const totalDeliveredDeployment1 = Object.values(deployment1.geographic_breakdown || {}).reduce((sum, region) => sum + (region.delivered || 0), 0);
            
            regions.forEach(region => {
                const deployment1Delivered = deployment1.geographic_breakdown[region]?.delivered || 0;
                const totalOpens = deployments.reduce((sum, d) => sum + (d.geographic_breakdown[region]?.opens || 0), 0);
                
                combined.geographic_breakdown[region] = {
                    delivered: deployment1Delivered,
                    opens: totalOpens,
                    open_rate: deployment1Delivered > 0 ? (totalOpens / deployment1Delivered) * 100 : 0,
                    percentage_of_audience: totalDeliveredDeployment1 > 0 ? (deployment1Delivered / totalDeliveredDeployment1) * 100 : 0
                };
            });
        }

        // Device breakdown: weighted average by total_opens
        if (deployments[0].device_breakdown) {
            let totalOpens = 0;
            let weightedMobile = 0;
            let weightedDesktop = 0;
            
            deployments.forEach(d => {
                const opens = d.device_breakdown.total_opens || 0;
                totalOpens += opens;
                weightedMobile += (d.device_breakdown.mobile_rate || 0) * opens;
                weightedDesktop += (d.device_breakdown.desktop_rate || 0) * opens;
            });
            
            const mobileRate = totalOpens > 0 ? weightedMobile / totalOpens : 0;
            const desktopRate = totalOpens > 0 ? weightedDesktop / totalOpens : 0;
            const unknownRate = 100 - mobileRate - desktopRate;
            
            combined.device_breakdown = {
                mobile_rate: mobileRate,
                desktop_rate: desktopRate,
                unknown_rate: Math.max(0, unknownRate), // Ensure non-negative
                total_opens: totalOpens
            };
        }

        // What was clicked: aggregate clicks and recalculate percentages
        if (deployments[0].what_was_clicked) {
            const allLinks = {};
            let totalClicksAfterFiltering = 0;
            let totalBotClicksRemoved = 0;

            deployments.forEach(d => {
                if (d.what_was_clicked) {
                    totalClicksAfterFiltering += d.what_was_clicked.total_clicks_after_filtering || 0;
                    totalBotClicksRemoved += d.what_was_clicked.total_bot_clicks_removed || 0;
                    
                    (d.what_was_clicked.links || []).forEach(link => {
                        if (allLinks[link.url]) {
                            allLinks[link.url].clicks += link.clicks;
                        } else {
                            allLinks[link.url] = { ...link };
                        }
                    });
                }
            });

            const linksArray = Object.values(allLinks).map(link => ({
                ...link,
                percentage: totalClicksAfterFiltering > 0 ? (link.clicks / totalClicksAfterFiltering) * 100 : 0
            })).sort((a, b) => b.clicks - a.clicks);

            combined.what_was_clicked = {
                links: linksArray,
                total_clicks_after_filtering: totalClicksAfterFiltering,
                total_bot_clicks_removed: totalBotClicksRemoved
            };
        }

        return combined;
    };

    const getDeploymentNumber = (campaignName) => {
        const match = campaignName.match(/\s*[-–—]\s*deployment\s*#?(\d+)|\s+deployment\s*#?(\d+)/i);
        return match ? (match[1] || match[2]) : 'N/A';
    };

    const generateComparisonData = (metrics) => {
        if (isCompareMode) {
            return metrics.map(metric => {
                const data = {};
                compareCampaigns.forEach(camp => {
                    const shortName = formatCampaignName(camp.Campaign).substring(0, 20) + 
                                     (camp.Campaign.length > 20 ? '...' : '') + 
                                     ` (D${getDeploymentNumber(camp.Campaign)})`;
                    data[shortName] = camp[metric];
                });
                return {
                    metric: metricDisplayNames[metric] || metric,
                    ...data
                };
            });
        }
        return [];
    };

    const keyMetrics = ['Unique_Open_Rate', 'Total_Open_Rate', 'Unique_Click_Rate', 'Total_Click_Rate'];
    const detailedMetrics = [
        'Sent', 'Hard_Bounces', 'Soft_Bounces', 'Total_Bounces', 'Delivered', 'Delivery_Rate',
        'Unique_Opens', 'Unique_Open_Rate', 'Total_Opens', 'Total_Open_Rate',
        'Unique_Clicks', 'Unique_Click_Rate', 'Total_Clicks', 'Total_Click_Rate',
        'Filtered_Bot_Clicks'
    ];
    const compareMetrics = [
        'Unique_Open_Rate', 'Total_Open_Rate', 'Unique_Click_Rate', 'Total_Click_Rate'
    ];
    
    const comparisonData = generateComparisonData(compareMetrics);
    
    const getComparisonColors = () => {
        const baseColors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
        return compareCampaigns.map((_, index) => baseColors[index % baseColors.length]);
    };
    
    const barColors = getComparisonColors();

    if (!isOpen) return null;

    return (
        <>
        <div className="campaign-modal-overlay">
            {!isCompareMode && hasPrev && onNavigate && (
                <button
                    className="modal-nav-arrow modal-nav-left"
                    onClick={() => onNavigate('prev')}
                    aria-label="Previous campaign"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
            )}

            {!isCompareMode && hasNext && onNavigate && (
                <button
                    className="modal-nav-arrow modal-nav-right"
                    onClick={() => onNavigate('next')}
                    aria-label="Next campaign"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>
            )}

            <div className="campaign-modal" ref={modalRef}>
                {isCompareMode ? (
                    <>
                        <div className="campaign-modal-header">
                            <h3>Campaign Comparison</h3>
                            <button 
                                className="modal-close-button"
                                onClick={onClose}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="campaign-list">
                            <h4>Selected Campaigns:</h4>
                            <ul>
                                {compareCampaigns.map((camp, index) => (
                                    <li key={index}>
                                        <span className="campaign-name">
                                            {formatCampaignName(camp.Campaign)}
                                        </span>
                                        <span className="campaign-details">
                                            Date: {formatDate(camp.Send_Date)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        
                        <div className="comparison-charts">
                            <h4>Performance Comparison</h4>
                            <div className="chart-container">
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart
                                        data={comparisonData}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis 
                                            dataKey="metric" 
                                            angle={-45} 
                                            textAnchor="end" 
                                            height={80}
                                        />
                                        <YAxis />
                                        <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, null]} />
                                        <Legend />
                                        {compareCampaigns.map((camp, index) => {
                                            const campName = formatCampaignName(camp.Campaign).substring(0, 20) + 
                                                           (camp.Campaign.length > 20 ? '...' : '') + 
                                                           ` (D${getDeploymentNumber(camp.Campaign)})`;
                                            return (
                                                <Bar 
                                                    key={index} 
                                                    dataKey={campName} 
                                                    fill={barColors[index]} 
                                                    name={campName}
                                                />
                                            );
                                        })}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        
                        <div className="comparison-table">
                            <h4>Detailed Metrics</h4>
                            <div className="table-wrapper">
                                <table className="detail-table">
                                    <thead>
                                        <tr>
                                            <th>Metric</th>
                                            {compareCampaigns.map((camp, index) => (
                                                <th key={index}>
                                                    {formatCampaignName(camp.Campaign).substring(0, 20)}
                                                    {camp.Campaign.length > 20 ? '...' : ''}
                                                    <span className="deployment-number">
                                                        (Deployment {getDeploymentNumber(camp.Campaign)})
                                                    </span>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="metric-name">Send Date</td>
                                            {compareCampaigns.map((camp, index) => (
                                                <td key={index}>{camp.Send_Date ? formatDate(camp.Send_Date) : 'N/A'}</td>
                                            ))}
                                        </tr>
                                        {detailedMetrics.map((metric, idx) => (
                                            <tr key={idx}>
                                                <td className="metric-name">{metricDisplayNames[metric] || metric}</td>
                                                {compareCampaigns.map((camp, index) => {
                                                    const isRateMetric = metric.includes('Rate');
                                                    const hasValue = camp[metric] !== undefined && camp[metric] !== null;
                                                    
                                                    return (
                                                        <td key={index}>
                                                            {hasValue 
                                                                ? (isRateMetric 
                                                                    ? formatPercentage(camp[metric]) 
                                                                    : formatNumber(camp[metric]))
                                                                : 'N/A'}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="campaign-modal-header">
                            <h3>{campaign.Campaign}</h3>
                            <button 
                                className="modal-close-button"
                                onClick={onClose}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div className="campaign-modal-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                <div className="campaign-date">
                                    <strong>Send Date:</strong> {campaign.Send_Date ? formatDate(campaign.Send_Date) : 'N/A'}
                                </div>

                                {campaign.DeploymentCount > 1 && (
                                    <div className="deployment-info">
                                        <strong>Number of Deployments:</strong> {campaign.DeploymentCount}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setShowUploadModal(true);
                                }}
                                style={{
                                    padding: '8px 16px',
                                    background: hasMetadata
                                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                        : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {hasMetadata && <span>✓</span>}
                                {hasMetadata ? 'Update Metadata' : 'Upload Metadata'}
                            </button>
                        </div>
                        
                        <div className="campaign-modal-metrics">
                            {keyMetrics.map((metric, index) => (
                                <div className="metric-card" key={index}>
                                    <div className="metric-label">
                                        {metricDisplayNames[metric] || metric}
                                    </div>
                                    <div className="metric-value">
                                        {campaign[metric] !== undefined && campaign[metric] !== null
                                            ? formatPercentage(campaign[metric])
                                            : 'N/A'}
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="campaign-modal-details">
                            <div className="delivery-stats">
                                <h4>Delivery Statistics</h4>
                                <table className="detail-table">
                                    <tbody>
                                        <tr>
                                            <td>Sent</td>
                                            <td>{campaign.Sent !== undefined ? formatNumber(campaign.Sent) : 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td>Delivered</td>
                                            <td>{campaign.Delivered !== undefined ? formatNumber(campaign.Delivered) : 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td>Delivery Rate</td>
                                            <td>{campaign.Delivery_Rate !== undefined ? formatPercentage(campaign.Delivery_Rate) : 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td>Hard Bounces</td>
                                            <td>{campaign.Hard_Bounces !== undefined ? formatNumber(campaign.Hard_Bounces) : 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td>Soft Bounces</td>
                                            <td>{campaign.Soft_Bounces !== undefined ? formatNumber(campaign.Soft_Bounces) : 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td>Total Bounces</td>
                                            <td>{campaign.Total_Bounces !== undefined ? formatNumber(campaign.Total_Bounces) : 'N/A'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            <div className="engagement-stats">
                                <h4>Engagement Statistics</h4>
                                <table className="detail-table">
                                    <tbody>
                                        <tr>
                                            <td>Engagement Rate</td>
                                            <td>{campaign.Unique_Opens !== undefined && campaign.Sent !== undefined && campaign.Sent !== 0
                                                ? formatPercentage((campaign.Unique_Opens / campaign.Sent) * 100)
                                                : 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td>Unique Opens</td>
                                            <td>{campaign.Unique_Opens !== undefined ? formatNumber(campaign.Unique_Opens) : 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td>Total Opens</td>
                                            <td>{campaign.Total_Opens !== undefined ? formatNumber(campaign.Total_Opens) : 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td>Unique Clicks</td>
                                            <td>{campaign.Unique_Clicks !== undefined ? formatNumber(campaign.Unique_Clicks) : 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td>Total Clicks</td>
                                            <td>{campaign.Total_Clicks !== undefined ? formatNumber(campaign.Total_Clicks) : 'N/A'}</td>
                                        </tr>
                                        <tr>
                                            <td>Filtered Bot Clicks</td>
                                            <td>{campaign.Filtered_Bot_Clicks !== undefined ? formatNumber(campaign.Filtered_Bot_Clicks) : 'N/A'}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <div className="campaign-chart-section">
                            <h4>Campaign Performance Visualization</h4>
                            <div className="campaign-chart">
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart
                                        data={[
                                            { name: 'Unique Open Rate', value: campaign.Unique_Open_Rate },
                                            { name: 'Total Open Rate', value: campaign.Total_Open_Rate },
                                            { name: 'Unique Click Rate', value: campaign.Unique_Click_Rate },
                                            { name: 'Total Click Rate', value: campaign.Total_Click_Rate }
                                        ]}
                                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, null]} />
                                        <Legend />
                                        <Bar dataKey="value" fill="#0088FE" name="Percentage" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {campaignMetadata && (
                            <>
                                {campaignMetadata.time_based_open_rates && (
                                    <div className="time-based-section">
                                        <h4>Time-Based Open Rates</h4>
                                        <div className="time-based-metrics">
                                            <div className="time-metric-card">
                                                <div className="time-metric-label">1 Hour</div>
                                                <div className="time-metric-value">{formatPercentage(campaignMetadata.time_based_open_rates["1_hour_open_rate"])}</div>
                                            </div>
                                            <div className="time-metric-card">
                                                <div className="time-metric-label">12 Hours</div>
                                                <div className="time-metric-value">{formatPercentage(campaignMetadata.time_based_open_rates["12_hour_open_rate"])}</div>
                                            </div>
                                            <div className="time-metric-card">
                                                <div className="time-metric-label">24 Hours</div>
                                                <div className="time-metric-value">{formatPercentage(campaignMetadata.time_based_open_rates["24_hour_open_rate"])}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {campaignMetadata.geographic_breakdown && (
                                    <div className="geographic-section">
                                        <h4>Geographic Metrics</h4>
                                        <div className="geographic-grid">
                                            {Object.entries(campaignMetadata.geographic_breakdown).map(([region, data]) => (
                                                <div key={region} className="geographic-card">
                                                    <div className="geographic-region">{region.toUpperCase()}</div>
                                                    <div className="geographic-stats">
                                                        <div className="geographic-stat">
                                                            <span className="stat-label">Delivered:</span>
                                                            <span className="stat-value">{formatNumber(data.delivered)}</span>
                                                        </div>
                                                        <div className="geographic-stat">
                                                            <span className="stat-label">Opens:</span>
                                                            <span className="stat-value">{formatNumber(data.opens)}</span>
                                                        </div>
                                                        <div className="geographic-stat">
                                                            <span className="stat-label">Open Rate:</span>
                                                            <span className="stat-value">{formatPercentage(data.open_rate)}</span>
                                                        </div>
                                                        <div className="geographic-stat">
                                                            <span className="stat-label">% of Audience:</span>
                                                            <span className="stat-value">{formatPercentage(data.percentage_of_audience)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {campaignMetadata.audience_breakdown && (
                                    <div className="audience-section">
                                        <h4>Audience Breakdowns</h4>
                                        <div className="audience-grid">
                                            {Object.entries(campaignMetadata.audience_breakdown)
                                                .sort((a, b) => b[1].percentage_of_audience - a[1].percentage_of_audience)
                                                .slice(0, 6)
                                                .map(([audienceType, data]) => (
                                                    <div key={audienceType} className="audience-card">
                                                        <div className="audience-type">{audienceType}</div>
                                                        <div className="audience-metrics">
                                                            <div className="audience-primary-metric">
                                                                <span className="primary-label">% of Audience</span>
                                                                <span className="primary-value">{formatPercentage(data.percentage_of_audience)}</span>
                                                            </div>
                                                            <div className="audience-secondary-metrics">
                                                                <div className="secondary-metric">
                                                                    <span>Delivered: {formatNumber(data.delivered)}</span>
                                                                </div>
                                                                <div className="secondary-metric">
                                                                    <span>Opens: {formatNumber(data.opens)}</span>
                                                                </div>
                                                                <div className="secondary-metric">
                                                                    <span>Open Rate: {formatPercentage(data.open_rate)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                  {campaignMetadata.device_breakdown && (
                                    <div className="device-section">
                                        <h4>Device Usage</h4>
                                        <div className="device-stats">
                                            <div className="device-card">
                                                <div className="device-label">Desktop</div>
                                                <div className="device-value">{formatPercentage(campaignMetadata.device_breakdown.desktop_rate)}</div>
                                            </div>
                                            <div className="device-card">
                                                <div className="device-label">Mobile</div>
                                                <div className="device-value">{formatPercentage(campaignMetadata.device_breakdown.mobile_rate)}</div>
                                            </div>
                                            <div className="device-card">
                                                <div className="device-label">Unknown</div>
                                                <div className="device-value">{formatPercentage(campaignMetadata.device_breakdown.unknown_rate)}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {campaignMetadata.what_was_clicked && (
                                    <div className="clicks-section">
                                        <h4>What Was Clicked</h4>
                                        <div className="clicks-summary">
                                            <div className="clicks-stat">
                                                <span className="clicks-label">Total Clicks (Filtered):</span>
                                                <span className="clicks-value">{formatNumber(campaignMetadata.what_was_clicked.total_clicks_after_filtering)}</span>
                                            </div>
                                            <div className="clicks-stat">
                                                <span className="clicks-label">Bot Clicks Removed:</span>
                                                <span className="clicks-value">{formatNumber(campaignMetadata.what_was_clicked.total_bot_clicks_removed)}</span>
                                            </div>
                                        </div>
                                        <div className="clicks-links">
                                            {campaignMetadata.what_was_clicked.links.slice(0, 5).map((link, index) => (
                                                <div key={index} className="click-link-card">
                                                    <div className="link-url">
                                                        <a href={link.url} target="_blank" rel="noopener noreferrer">
                                                            {link.url}
                                                        </a>
                                                    </div>
                                                    <div className="link-stats">
                                                        <span className="link-clicks">{formatNumber(link.clicks)} clicks</span>
                                                        <span className="link-percentage">({formatPercentage(link.percentage)})</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {isLoadingMetadata && (
                            <div className="loading-metadata">
                                <div className="loading-spinner"></div>
                                <span>Loading extended analytics...</span>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>

        {showUploadModal && (
            <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '32px',
                        maxWidth: '600px',
                        width: '90%'
                    }}>
                        <h3 style={{ marginBottom: '24px' }}>Upload Campaign Metadata</h3>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                                Target List (Excel)
                            </label>
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={(e) => setUploadFiles(prev => ({ ...prev, targetList: e.target.files[0] }))}
                                style={{ width: '100%', padding: '8px' }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                                Tags (Excel)
                            </label>
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={(e) => setUploadFiles(prev => ({ ...prev, tags: e.target.files[0] }))}
                                style={{ width: '100%', padding: '8px' }}
                            />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                                Ad Images (PNG/JPG)
                            </label>
                            <input
                                type="file"
                                accept=".png,.jpg,.jpeg"
                                multiple
                                onChange={(e) => setUploadFiles(prev => ({ ...prev, adImages: Array.from(e.target.files) }))}
                                style={{ width: '100%', padding: '8px' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    setShowUploadModal(false);
                                    setUploadFiles({ targetList: null, tags: null, adImages: [] });
                                }}
                                style={{
                                    padding: '10px 20px',
                                    background: '#e5e7eb',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    if (!uploadFiles.targetList && !uploadFiles.tags && uploadFiles.adImages.length === 0) {
                                        alert('Please select at least one file');
                                        return;
                                    }

                                    setUploading(true);
                                    const formData = new FormData();
                                    formData.append('campaign_name', campaign.Campaign);

                                    if (uploadFiles.targetList) formData.append('target_list', uploadFiles.targetList);
                                    if (uploadFiles.tags) formData.append('tags', uploadFiles.tags);
                                    uploadFiles.adImages.forEach(img => formData.append('ad_images', img));

                                    try {
                                        const response = await fetch(`${API_BASE_URL}/api/campaigns/${encodeURIComponent(campaign.Campaign)}/metadata`, {
                                            method: 'POST',
                                            body: formData
                                        });

                                        const data = await response.json();
                                        if (data.status === 'success') {
                                            alert('Metadata uploaded successfully!');
                                            setShowUploadModal(false);
                                            setUploadFiles({ targetList: null, tags: null, adImages: [] });
                                            setHasMetadata(true);
                                        } else {
                                            alert('Upload failed: ' + data.message);
                                        }
                                    } catch (error) {
                                        alert('Error uploading files: ' + error.message);
                                    } finally {
                                        setUploading(false);
                                    }
                                }}
                                disabled={uploading}
                                style={{
                                    padding: '10px 20px',
                                    background: uploading ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: uploading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {uploading ? 'Uploading...' : 'Upload'}
                            </button>
                        </div>
                    </div>
                </div>
        )}
        </>
    );
};

export default CampaignModal;