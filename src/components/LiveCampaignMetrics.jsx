import React, { useState, useEffect } from 'react';
import _ from 'lodash';

const LiveCampaignMetrics = () => {
    const [metrics, setMetrics] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const campaignsPerPage = 2;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const blobUrl = "https://emaildash.blob.core.windows.net/json-data/live_campaign_metrics.json?sp=r&st=2024-11-01T19:35:00Z&se=2025-11-02T03:35:00Z&spr=https&sv=2022-11-02&sr=b&sig=VmCyzleKLfUbndjXa1PUvVB5gMgjZ2mFKCBacbmC6Ds%3D";
                const response = await fetch(blobUrl);
                const data = await response.json();
                
                const getBaseName = (name) => {
                    return name.replace(/\s*-?\s*(?:Deployment\s+(?:#?\d+|\w+)|(?:Matrix|Oncology & Matrix)\s+Deployment)$/i, '');
                };

                const groupedByBase = _.groupBy(data, item => getBaseName(item.Campaign));

                const processedMetrics = Object.entries(groupedByBase).map(([baseName, campaigns]) => {
                    const combined = {
                        Campaign: baseName,
                        Date: _.maxBy(campaigns, 'Date').Date,
                        Sent: _.sum(campaigns.map(c => c.Sent)),
                        Delivered: _.sum(campaigns.map(c => c.Delivered)),
                        Unique_Opens: _.sum(campaigns.map(c => c.Unique_Opens)),
                        Total_Opens: _.sum(campaigns.map(c => c.Total_Opens)),
                        Unique_Clicks: _.sum(campaigns.map(c => c.Unique_Clicks)),
                        Total_Clicks: _.sum(campaigns.map(c => c.Total_Clicks)),
                        DeploymentCount: campaigns.length,
                        Deployments: campaigns.map(d => d.Campaign) 
                    };

                    const sent = combined.Sent || 1;
                    combined.Delivery_Rate = combined.Delivered / sent;
                    combined.Unique_Open_Rate = combined.Unique_Opens / combined.Delivered;
                    combined.Total_Open_Rate = combined.Total_Opens / combined.Delivered;
                    combined.Unique_Click_Rate = combined.Unique_Clicks / combined.Delivered;
                    combined.Total_Click_Rate = combined.Total_Clicks / combined.Delivered;

                    return combined;
                });

                const sortedMetrics = _.orderBy(processedMetrics, ['Date'], ['desc']);
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
                            Deployment date {new Date(campaign.Date).toLocaleDateString()} ({campaign.DeploymentCount} deployment{campaign.DeploymentCount !== 1 ? 's' : ''})
                        </p>
                        <table>
                            <tbody>
                                <tr><td>Sent:</td><td>{campaign.Sent.toLocaleString()}</td></tr>
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
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>
            <div className="pagination">
                {currentPage > 1 && (
                    <button onClick={() => setCurrentPage(p => p - 1)}>Previous</button>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                    <button
                        key={num}
                        onClick={() => setCurrentPage(num)}
                        className={currentPage === num ? 'active' : ''}
                    >
                        {num}
                    </button>
                ))}
                {currentPage < totalPages && (
                    <button onClick={() => setCurrentPage(p => p + 1)}>Next</button>
                )}
            </div>
        </div>
    );
};

export default LiveCampaignMetrics;