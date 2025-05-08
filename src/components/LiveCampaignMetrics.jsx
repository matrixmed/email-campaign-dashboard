import React, { useState, useEffect } from 'react';
import _ from 'lodash';

const LiveCampaignMetrics = () => {
    const [metrics, setMetrics] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
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

                const groupedByBase = _.groupBy(data, item => getBaseName(item.Campaign));
                const processedMetrics = Object.entries(groupedByBase).map(([baseName, campaigns]) => {
                    const validDeployments = campaigns.filter(c => c.Sent > 0 && c.Delivered > 20 && c.Unique_Opens !== "NA");

                    if (validDeployments.length === 0) return null;

                    const deployment1 = validDeployments.find(c => isDeploymentOne(c.Campaign)) || validDeployments[0];

                    const sumMetric = (key) => {
                        return _.sum(validDeployments.map(c => (c[key] !== "NA" ? c[key] : 0)));
                    };

                    const combined = {
                        Campaign: baseName,
                        Send_Date: _.maxBy(validDeployments, 'Send_Date').Send_Date,
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

                    return combined;
                }).filter(Boolean);

                const sortedMetrics = _.orderBy(processedMetrics, ['Send_Date'], ['desc']);
                setMetrics(sortedMetrics);

            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, []);

    const indexOfLastCampaign = currentPage * campaignsPerPage;
    const indexOfFirstCampaign = indexOfLastCampaign - campaignsPerPage;
    const currentCampaigns = metrics.slice(indexOfFirstCampaign, indexOfLastCampaign);
    const totalPages = Math.ceil(metrics.length / campaignsPerPage);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString();
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

        // Format data rows
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
        
        // Create CSV content
        const csvContent = [
            headers.map(h => `"${h}"`).join(','),
            ...rows.map(row => 
                row.map(cell => 
                    `"${String(cell).replace(/"/g, '""')}"`
                ).join(',')
            )
        ].join('\n');
        
        // Create and trigger download
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
            <div className="campaign-grid">
                {currentCampaigns.map((campaign, index) => (
                    <div key={index} className="campaign-box">
                        <h3>{campaign.Campaign}</h3>
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
                ))}
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
        </div>
    );
};

export default LiveCampaignMetrics;