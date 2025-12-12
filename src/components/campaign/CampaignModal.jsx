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
    const [manualPlacementId, setManualPlacementId] = useState('');
    const [dragActive, setDragActive] = useState({
        targetList: false,
        tags: false,
        adImages: false
    });
    const [audienceLimit, setAudienceLimit] = useState(8);

    const currentIndex = campaign && allCampaigns.length > 0
        ? allCampaigns.findIndex(c => c.Campaign === campaign.Campaign)
        : -1;
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex >= 0 && currentIndex < allCampaigns.length - 1;

    useEffect(() => {
        if (isOpen && campaign) {
            setShowUploadModal(false);
            setUploadFiles({ targetList: null, tags: null, adImages: [] });
            setManualPlacementId('');
            setAudienceLimit(8);
        }
    }, [campaign?.Campaign, isOpen]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (showUploadModal) return;

            if (modalRef.current && !modalRef.current.contains(event.target)) {
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
    }, [isOpen, onClose, isCompareMode, hasPrev, hasNext, onNavigate, showUploadModal]);

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

        if (deployments[0].audience_breakdown) {
            combined.audience_breakdown = {};
            const allAudienceTypes = new Set();
            deployments.forEach(d => Object.keys(d.audience_breakdown || {}).forEach(key => allAudienceTypes.add(key)));
            
            const deployment1 = deployments.find(d => d.campaign_name && /deployment\s*#?\s*1\s*$/i.test(d.campaign_name)) || deployments[0];
            
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

        if (deployments[0].geographic_breakdown) {
            combined.geographic_breakdown = {};
            const regions = Object.keys(deployments[0].geographic_breakdown);
            
            const deployment1 = deployments.find(d => d.campaign_name && /deployment\s*#?\s*1\s*$/i.test(d.campaign_name)) || deployments[0];
            
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
                unknown_rate: Math.max(0, unknownRate),
                total_opens: totalOpens
            };
        }

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
                        
                        <div className="campaign-modal-info">
                            <div className="campaign-modal-info-left">
                                <div className="info-pill">
                                    <span className="info-label">Send Date</span>
                                    <span className="info-value">{campaign.Send_Date ? formatDate(campaign.Send_Date) : 'N/A'}</span>
                                </div>

                                {campaign.DeploymentCount > 1 && (
                                    <div className="info-pill">
                                        <span className="info-label">Deployments</span>
                                        <span className="info-value">{campaign.DeploymentCount}</span>
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
                                    <div className="campaign-metric-value">
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
                                        <div className="geo-bars-container">
                                            {Object.entries(campaignMetadata.geographic_breakdown)
                                                .sort((a, b) => b[1].percentage_of_audience - a[1].percentage_of_audience)
                                                .map(([region, data]) => (
                                                    <div key={region} className="geo-bar-item">
                                                        <div className="geo-bar-header">
                                                            <span className="geo-region-name">{region.toUpperCase()}</span>
                                                            <span className="geo-open-rate">{formatPercentage(data.open_rate)}</span>
                                                        </div>
                                                        <div className="geo-bar-track">
                                                            <div
                                                                className="geo-bar-fill"
                                                                style={{ width: `${Math.min(data.percentage_of_audience, 100)}%` }}
                                                            />
                                                        </div>
                                                        <div className="geo-bar-stats">
                                                            <span>{formatPercentage(data.percentage_of_audience)} of audience</span>
                                                            <span>{formatNumber(data.delivered)} sent</span>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                {campaignMetadata.audience_breakdown && (() => {
                                    const sortedAudiences = Object.entries(campaignMetadata.audience_breakdown)
                                        .sort((a, b) => b[1].percentage_of_audience - a[1].percentage_of_audience);
                                    const visibleAudiences = sortedAudiences.slice(0, audienceLimit);
                                    const hasMore = sortedAudiences.length > audienceLimit;
                                    const remaining = sortedAudiences.length - audienceLimit;

                                    return (
                                        <div className="audience-section">
                                            <h4>Audience Breakdown <span className="audience-count">({sortedAudiences.length} specialties)</span></h4>
                                            <div className="audience-list">
                                                {visibleAudiences.map(([audienceType, data]) => (
                                                    <div key={audienceType} className="audience-row">
                                                        <span className="audience-name">{audienceType}</span>
                                                        <div className="audience-stats">
                                                            <span className="audience-pct">{formatPercentage(data.percentage_of_audience)}</span>
                                                            <span className="audience-open">{formatPercentage(data.open_rate)} open</span>
                                                            <span className="audience-sent">{formatNumber(data.delivered)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {hasMore && (
                                                <button
                                                    className="load-more-button"
                                                    onClick={() => setAudienceLimit(prev => prev + 10)}
                                                >
                                                    Show More ({remaining} remaining)
                                                </button>
                                            )}
                                        </div>
                                    );
                                })()}

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
                                            {campaignMetadata.what_was_clicked.links.map((link, index) => (
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
            <div
                className="upload-modal-overlay"
                onClick={(e) => {
                    if (e.target.className === 'upload-modal-overlay') {
                        setShowUploadModal(false);
                        setUploadFiles({ targetList: null, tags: null, adImages: [] });
                        setManualPlacementId('');
                    }
                }}
            >
                <div className="upload-modal-content">
                    <div className="upload-modal-header">
                        <div className="upload-header-text">
                            <h3>Upload Metadata</h3>
                            <p className="upload-campaign-name">{campaign.Campaign}</p>
                        </div>
                        <button
                            className="upload-modal-close"
                            onClick={() => {
                                setShowUploadModal(false);
                                setUploadFiles({ targetList: null, tags: null, adImages: [] });
                                setManualPlacementId('');
                            }}
                        >
                            ×
                        </button>
                    </div>

                    <div className="upload-modal-body">
                        <div className="upload-grid">
                            <div
                                className={`upload-card ${uploadFiles.targetList ? 'has-file' : ''} ${dragActive.targetList ? 'drag-active' : ''}`}
                                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(prev => ({ ...prev, targetList: true })); }}
                                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(prev => ({ ...prev, targetList: false })); }}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={(e) => {
                                    e.preventDefault(); e.stopPropagation();
                                    setDragActive(prev => ({ ...prev, targetList: false }));
                                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                        setUploadFiles(prev => ({ ...prev, targetList: e.dataTransfer.files[0] }));
                                    }
                                }}
                                onClick={() => document.getElementById('targetListInput').click()}
                            >
                                <div className="upload-card-icon">
                                    {uploadFiles.targetList ? <span className="check-icon">✓</span> : <span>📊</span>}
                                </div>
                                <div className="upload-card-content">
                                    <div className="upload-card-title">Target List</div>
                                    <div className="upload-card-subtitle">
                                        {uploadFiles.targetList ? uploadFiles.targetList.name : 'Excel file (.xlsx, .xls)'}
                                    </div>
                                </div>
                                {uploadFiles.targetList && (
                                    <button className="upload-card-remove" onClick={(e) => { e.stopPropagation(); setUploadFiles(prev => ({ ...prev, targetList: null })); }}>×</button>
                                )}
                            </div>
                            <input id="targetListInput" type="file" accept=".xlsx,.xls" onChange={(e) => { if (e.target.files && e.target.files[0]) setUploadFiles(prev => ({ ...prev, targetList: e.target.files[0] })); }} style={{ display: 'none' }} />

                            <div
                                className={`upload-card ${uploadFiles.tags ? 'has-file' : ''} ${dragActive.tags ? 'drag-active' : ''}`}
                                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(prev => ({ ...prev, tags: true })); }}
                                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(prev => ({ ...prev, tags: false })); }}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={(e) => {
                                    e.preventDefault(); e.stopPropagation();
                                    setDragActive(prev => ({ ...prev, tags: false }));
                                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                        setUploadFiles(prev => ({ ...prev, tags: e.dataTransfer.files[0] }));
                                    }
                                }}
                                onClick={() => document.getElementById('tagsInput').click()}
                            >
                                <div className="upload-card-icon">
                                    {uploadFiles.tags ? <span className="check-icon">✓</span> : <span>🏷️</span>}
                                </div>
                                <div className="upload-card-content">
                                    <div className="upload-card-title">Tags</div>
                                    <div className="upload-card-subtitle">
                                        {uploadFiles.tags ? uploadFiles.tags.name : 'Excel file (.xlsx, .xls)'}
                                    </div>
                                </div>
                                {uploadFiles.tags && (
                                    <button className="upload-card-remove" onClick={(e) => { e.stopPropagation(); setUploadFiles(prev => ({ ...prev, tags: null })); }}>×</button>
                                )}
                            </div>
                            <input id="tagsInput" type="file" accept=".xlsx,.xls" onChange={(e) => { if (e.target.files && e.target.files[0]) setUploadFiles(prev => ({ ...prev, tags: e.target.files[0] })); }} style={{ display: 'none' }} />

                            <div
                                className={`upload-card ${uploadFiles.adImages.length > 0 ? 'has-file' : ''} ${dragActive.adImages ? 'drag-active' : ''}`}
                                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(prev => ({ ...prev, adImages: true })); }}
                                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(prev => ({ ...prev, adImages: false })); }}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                onDrop={(e) => {
                                    e.preventDefault(); e.stopPropagation();
                                    setDragActive(prev => ({ ...prev, adImages: false }));
                                    if (e.dataTransfer.files) {
                                        setUploadFiles(prev => ({ ...prev, adImages: Array.from(e.dataTransfer.files) }));
                                    }
                                }}
                                onClick={() => document.getElementById('adImagesInput').click()}
                            >
                                <div className="upload-card-icon">
                                    {uploadFiles.adImages.length > 0 ? <span className="check-icon">✓</span> : <span>🖼️</span>}
                                </div>
                                <div className="upload-card-content">
                                    <div className="upload-card-title">Ad Images</div>
                                    <div className="upload-card-subtitle">
                                        {uploadFiles.adImages.length > 0 ? `${uploadFiles.adImages.length} file(s) selected` : 'PNG, JPG (multiple)'}
                                    </div>
                                </div>
                                {uploadFiles.adImages.length > 0 && (
                                    <button className="upload-card-remove" onClick={(e) => { e.stopPropagation(); setUploadFiles(prev => ({ ...prev, adImages: [] })); }}>×</button>
                                )}
                            </div>
                            <input id="adImagesInput" type="file" accept=".png,.jpg,.jpeg" multiple onChange={(e) => { if (e.target.files) setUploadFiles(prev => ({ ...prev, adImages: Array.from(e.target.files) })); }} style={{ display: 'none' }} />
                        </div>

                        <div className="upload-hint">
                            Click a card or drag & drop files to upload
                        </div>

                        <div className="upload-placement-id-section">
                            <label className="upload-placement-id-label">CMI Placement ID (optional)</label>
                            <input
                                type="text"
                                className="upload-placement-id-input"
                                value={manualPlacementId}
                                onChange={(e) => setManualPlacementId(e.target.value)}
                                placeholder="Enter placement ID if no files to upload"
                            />
                        </div>
                    </div>

                    <div className="upload-modal-footer">
                        <button
                            className="upload-btn-cancel"
                            onClick={() => {
                                setShowUploadModal(false);
                                setUploadFiles({ targetList: null, tags: null, adImages: [] });
                                setManualPlacementId('');
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            className="upload-btn-submit"
                            onClick={async () => {
                                const hasFiles = uploadFiles.targetList || uploadFiles.tags || uploadFiles.adImages.length > 0;
                                const hasPlacementId = manualPlacementId.trim() !== '';

                                if (!hasFiles && !hasPlacementId) {
                                    return;
                                }

                                setUploading(true);
                                const formData = new FormData();
                                formData.append('campaign_name', campaign.Campaign);
                                if (campaign.Send_Date) formData.append('send_date', campaign.Send_Date);

                                if (uploadFiles.targetList) formData.append('target_list', uploadFiles.targetList);
                                if (uploadFiles.tags) formData.append('tags', uploadFiles.tags);
                                uploadFiles.adImages.forEach(img => formData.append('ad_images', img));

                                if (hasPlacementId) formData.append('cmi_placement_id', manualPlacementId.trim());

                                try {
                                    const response = await fetch(`${API_BASE_URL}/api/campaigns/${encodeURIComponent(campaign.Campaign)}/metadata`, {
                                        method: 'POST',
                                        body: formData
                                    });

                                    const data = await response.json();
                                    if (data.status === 'success') {
                                        setShowUploadModal(false);
                                        setUploadFiles({ targetList: null, tags: null, adImages: [] });
                                        setManualPlacementId('');
                                        setHasMetadata(true);
                                    } else {
                                        console.error('Upload failed:', data.message);
                                    }
                                } catch (error) {
                                    console.error('Error uploading files:', error.message);
                                } finally {
                                    setUploading(false);
                                }
                            }}
                            disabled={uploading || (!uploadFiles.targetList && !uploadFiles.tags && uploadFiles.adImages.length === 0 && !manualPlacementId.trim())}
                        >
                            {uploading ? 'Uploading...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default CampaignModal;