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

                const getDeploymentNumber = (name) => {
                    const match = name.match(/Deployment\s+(?:#?\d+|\w+)/i);
                    if (match) {
                        const num = match[0].match(/\d+/);
                        return num ? parseInt(num[0]) : null;
                    }
                    return null;
                };

                const validDeliveries = data.filter(item => (item.Delivered || 0) >= 100);
                const groupedByBase = _.groupBy(validDeliveries, item => getBaseName(item.Campaign)); 

                const processedMetrics = Object.entries(groupedByBase).map(([baseName, campaigns]) => {
                    const deployment1 = campaigns.find(c => {
                        const name = c.Campaign.toLowerCase(); 
                        return name.includes('deployment 1') || 
                            name.includes('deployment #1') || 
                            name.includes('deployment1');
                    });

                    const baseDeployment = deployment1 || campaigns[0];
                
                    const combined = {
                        Campaign: baseName,
                        Send_Date: _.maxBy(campaigns, 'Send_Date').Send_Date,
                        Sent: baseDeployment.Sent,
                        Delivered: baseDeployment.Delivered,
                        Total_Bounces: _.sum(campaigns.map(c => c.Total_Bounces)),
                        Hard_Bounces: _.sum(campaigns.map(c => c.Hard_Bounces)),
                        Soft_Bounces: _.sum(campaigns.map(c => c.Soft_Bounces)),
                        Unique_Opens: _.sum(campaigns.map(c => c.Unique_Opens)),
                        Total_Opens: _.sum(campaigns.map(c => c.Total_Opens)),
                        Unique_Clicks: _.sum(campaigns.map(c => c.Unique_Clicks)),
                        Total_Clicks: _.sum(campaigns.map(c => c.Total_Clicks)),
                        Filtered_Bot_Clicks: _.sum(campaigns.map(c => c.Filtered_Bot_Clicks)),
                        DeploymentCount: campaigns.length,
                        Deployments: campaigns.map(d => d.Campaign)  
                    };
                
                    combined.Delivery_Rate = combined.Delivered / baseDeployment.Sent;
                    combined.Unique_Open_Rate = combined.Unique_Opens / baseDeployment.Delivered;
                    combined.Total_Open_Rate = combined.Total_Opens / baseDeployment.Delivered;
                    combined.Unique_Click_Rate = combined.Unique_Clicks / baseDeployment.Delivered;
                    combined.Total_Click_Rate = combined.Total_Clicks / baseDeployment.Delivered;
                
                    return combined;
                });

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

    return (
        <div className="live-campaign-metrics">
            <h2>Live Campaign Metrics</h2>
            <div className="campaign-grid">
                {currentCampaigns.map((campaign, index) => (
                    <div key={index} className="campaign-box">
                        <h3>{campaign.Campaign}</h3>
                        <p className="text-sm text-gray-600">
                            Deployment date {new Date(campaign.Send_Date).toLocaleDateString()} ({campaign.DeploymentCount} deployment{campaign.DeploymentCount !== 1 ? 's' : ''})
                        </p>
                        <table>
                            <tbody>
                                <tr><td>Sent:</td><td>{campaign.Sent.toLocaleString()}</td></tr>
                                <tr><td>Hard Bounces:</td><td>{campaign.Hard_Bounces.toLocaleString()}</td></tr>
                                <tr><td>Soft Bounces:</td><td>{campaign.Soft_Bounces.toLocaleString()}</td></tr>
                                <tr><td>Total Bounces:</td><td>{campaign.Total_Bounces.toLocaleString()}</td></tr>
                                <tr><td>Delivered:</td><td>{campaign.Delivered.toLocaleString()}</td></tr>
                                <tr><td>Delivery Rate:</td><td>{(campaign.Delivery_Rate * 100).toFixed(2)}%</td></tr>
                                <tr><td>Unique Opens:</td><td>{campaign.Unique_Opens.toLocaleString()}</td></tr>
                                <tr><td>Unique Open Rate:</td><td>{(campaign.Unique_Open_Rate * 100).toFixed(2)}%</td></tr>
                                <tr><td>Total Opens:</td><td>{campaign.Total_Opens.toLocaleString()}</td></tr>
                                <tr><td>Total Open Rate:</td><td>{(campaign.Total_Open_Rate * 100).toFixed(2)}%</td></tr>
                                <tr><td>Unique Clicks:</td><td>{campaign.Unique_Clicks.toLocaleString()}</td></tr>
                                <tr><td>Unique Click Rate:</td><td>{(campaign.Unique_Click_Rate * 100).toFixed(2)}%</td></tr>
                                <tr><td>Total Clicks:</td><td>{campaign.Total_Clicks.toLocaleString()}</td></tr>
                                <tr><td>Total Click Rate:</td><td>{(campaign.Total_Click_Rate * 100).toFixed(2)}%</td></tr>
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
        </div>
    );
};

export default LiveCampaignMetrics;