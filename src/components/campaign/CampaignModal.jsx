import React, { useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import '../../styles/CampaignModal.css';

const CampaignModal = ({ 
    isOpen, 
    onClose, 
    campaign, 
    compareCampaigns, 
    isCompareMode,
    metricDisplayNames 
}) => {
    const modalRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        }
        
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

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
        // Check if value is a string that can be converted to a number
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        
        // If value is not a number or is NaN after conversion, return '0.00%'
        if (typeof numValue !== 'number' || isNaN(numValue)) return '0.00%';
        
        // Format the percentage with 2 decimal places
        return `${numValue.toFixed(2)}%`;
    };

    const formatCampaignName = (name) => {
        return name.split(/\s*[-–—]\s*deployment\s*#?\d+|\s+deployment\s*#?\d+/i)[0].trim();
    };

    const getDeploymentNumber = (campaignName) => {
        const match = campaignName.match(/\s*[-–—]\s*deployment\s*#?(\d+)|\s+deployment\s*#?(\d+)/i);
        return match ? (match[1] || match[2]) : 'N/A';
    };

    // Generate comparison data for charts
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

    // Key metrics to show in the top cards
    const keyMetrics = ['Unique_Open_Rate', 'Total_Open_Rate', 'Unique_Click_Rate', 'Total_Click_Rate'];
    
    // Detailed metrics for the tables
    const detailedMetrics = [
        'Sent', 'Hard_Bounces', 'Soft_Bounces', 'Total_Bounces', 'Delivered', 'Delivery_Rate',
        'Unique_Opens', 'Unique_Open_Rate', 'Total_Opens', 'Total_Open_Rate',
        'Unique_Clicks', 'Unique_Click_Rate', 'Total_Clicks', 'Total_Click_Rate',
        'Filtered_Bot_Clicks'
    ];
    
    // For comparison charts
    const compareMetrics = [
        'Unique_Open_Rate', 'Total_Open_Rate', 'Unique_Click_Rate', 'Total_Click_Rate'
    ];
    
    const comparisonData = generateComparisonData(compareMetrics);
    
    // Get random colors for the bars in comparison mode
    const getComparisonColors = () => {
        const baseColors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
        return compareCampaigns.map((_, index) => baseColors[index % baseColors.length]);
    };
    
    const barColors = getComparisonColors();

    if (!isOpen) return null;

    return (
        <div className="campaign-modal-overlay">
            <div className="campaign-modal" ref={modalRef}>
                {isCompareMode ? (
                    // COMPARISON MODE VIEW
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
                                                    // For Rate metrics, ensure we format as percentage
                                                    const isRateMetric = metric.includes('Rate');
                                                    // Check if the value exists
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
                    // SINGLE CAMPAIGN VIEW
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
                            <div className="campaign-date">
                                <strong>Send Date:</strong> {campaign.Send_Date ? formatDate(campaign.Send_Date) : 'N/A'}
                            </div>
                            
                            {campaign.DeploymentCount > 1 && (
                                <div className="deployment-info">
                                    <strong>Number of Deployments:</strong> {campaign.DeploymentCount}
                                </div>
                            )}
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
                    </>
                )}
            </div>
        </div>
    );
};

export default CampaignModal;