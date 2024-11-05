import React, { useState, useEffect } from 'react';
import Chart from 'chart.js/auto';

const LiveCampaignMetrics = () => {
    const [campaignData, setCampaignData] = useState([]);
    const [latestCampaigns, setLatestCampaigns] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const campaignsPerPage = 2;

    useEffect(() => {
        async function fetchCampaignData() {
            const blobUrl = "https://emaildash.blob.core.windows.net/json-data/live_campaign_metrics.json?sp=r&st=2024-11-01T19:35:00Z&se=2025-11-02T03:35:00Z&spr=https&sv=2022-11-02&sr=b&sig=VmCyzleKLfUbndjXa1PUvVB5gMgjZ2mFKCBacbmC6Ds%3D";
            try {
                const response = await fetch(blobUrl);
                const jsonData = await response.json();
                setCampaignData(jsonData);
                setLatestCampaigns(getLatestCampaigns(jsonData));
            } catch (error) {
                console.error("Error fetching campaign data:", error);
            }
        }
        fetchCampaignData();
    }, []);

    const getLatestCampaigns = (data) => {
        const latestRecords = {};
        data.forEach(record => {
            const campaignName = record.Campaign;
            const recordDate = new Date(record.Date);
            if (!latestRecords[campaignName] || recordDate > new Date(latestRecords[campaignName].Date)) {
                latestRecords[campaignName] = record;
            }
        });
        return Object.values(latestRecords);
    };

    const filterLastTwoWeeks = (data, campaignName) => {
        return data
            .filter(record => record.Campaign === campaignName)
            .sort((a, b) => new Date(a.Date) - new Date(b.Date));
    };

    useEffect(() => {
        latestCampaigns.forEach((campaign, index) => {
            const canvasId = `lineChart-${index}`;
            const canvasElement = document.getElementById(canvasId);
    
            if (canvasElement) {
                const ctx = canvasElement.getContext('2d');
                
                const twoWeeksData = filterLastTwoWeeks(campaignData, campaign.Campaign);
                
                if (twoWeeksData.length === 0) {
                    console.warn(`No data available for the last two weeks for campaign: ${campaign.Campaign}`);
                    return;
                }
    
                const labels = twoWeeksData.map(record => {
                    const date = new Date(record.Date);
                    date.setDate(date.getDate() + 1);
                    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
                });
                const dataPoints = twoWeeksData.map(record => record.Unique_Opens);
                if (canvasElement.chartInstance) {
                    canvasElement.chartInstance.destroy();
                }
    
                const chartInstance = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Unique Opens',
                            data: dataPoints,
                            borderColor: 'rgba(75, 192, 192, 1)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            fill: false,
                            tension: 0.3
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    label: (context) => {
                                        const date = context.label;
                                        const rate = context.raw;
                                        return `${date} - ${rate.toFixed(2)}`;
                                    }
                                }
                            }
                        },
                        scales: {
                            y: { beginAtZero: true, title: { display: true, text: 'Unique Open Rate' } },
                            x: { title: { display: true, text: 'Date' } }
                        }
                    }
                });
                canvasElement.chartInstance = chartInstance;
            }
        });
    }, [latestCampaigns, campaignData, currentPage]);

    const totalPages = Math.ceil(latestCampaigns.length / campaignsPerPage);
    const indexOfLastCampaign = currentPage * campaignsPerPage;
    const indexOfFirstCampaign = indexOfLastCampaign - campaignsPerPage;
    const currentCampaigns = latestCampaigns.slice(indexOfFirstCampaign, indexOfLastCampaign);

    const handlePagination = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <div className="live-campaign-metrics">
            <h2>Live Campaign Metrics</h2>
            <div className="campaign-grid">
                {currentCampaigns.map((campaign, index) => (
                    <div key={index} className="campaign-box">
                        <h3>{campaign.Campaign}</h3>
                        <table>
                            <tbody>
                                <tr><td>Sent:</td><td>{campaign.Sent}</td></tr>
                                <tr><td>Delivered:</td><td>{campaign.Delivered}</td></tr>
                                <tr><td>Delivery Rate:</td><td>{(campaign.Delivery_Rate * 100).toFixed(2)}%</td></tr>
                                <tr><td>Unique Opens:</td><td>{campaign.Unique_Opens}</td></tr>
                                <tr><td>Unique Open Rate:</td><td>{(campaign.Unique_Open_Rate * 100).toFixed(2)}%</td></tr>
                                <tr><td>Total Opens:</td><td>{campaign.Total_Opens}</td></tr>
                                <tr><td>Total Open Rate:</td><td>{(campaign.Total_Open_Rate * 100).toFixed(2)}%</td></tr>
                                <tr><td>Unique Clicks:</td><td>{campaign.Unique_Clicks}</td></tr>
                                <tr><td>Unique Click Rate:</td><td>{(campaign.Unique_Click_Rate * 100).toFixed(2)}%</td></tr>
                                <tr><td>Total Clicks:</td><td>{campaign.Total_Clicks}</td></tr>
                                <tr><td>Total Click Rate:</td><td>{(campaign.Total_Click_Rate * 100).toFixed(2)}%</td></tr>
                            </tbody>
                        </table>
                        <div className="line-chart-container">
                            <canvas id={`lineChart-${index}`} width="400" height="150"></canvas>
                        </div>
                    </div>
                ))}
            </div>
            <div className="pagination">
                {currentPage > 1 && (
                    <button onClick={() => handlePagination(currentPage - 1)}>Previous</button>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                    <button
                        key={num}
                        onClick={() => handlePagination(num)}
                        className={currentPage === num ? 'active' : ''}
                    >
                        {num}
                    </button>
                ))}
                {currentPage < totalPages && (
                    <button onClick={() => handlePagination(currentPage + 1)}>Next</button>
                )}
            </div>
        </div>
    );
};

export default LiveCampaignMetrics;
