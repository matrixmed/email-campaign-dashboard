import React, { useState, useEffect } from 'react';
import Chart from 'chart.js/auto';

const LiveCampaignMetrics = () => {
    const [campaignData, setCampaignData] = useState([]);
    const [aggregatedCampaigns, setAggregatedCampaigns] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const campaignsPerPage = 2;

    const getTodayDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    };

    useEffect(() => {
        async function fetchCampaignData() {
            const blobUrl = "https://emaildash.blob.core.windows.net/json-data/live_campaign_metrics.json?sp=r&st=2024-11-01T19:35:00Z&se=2025-11-02T03:35:00Z&spr=https&sv=2022-11-02&sr=b&sig=VmCyzleKLfUbndjXa1PUvVB5gMgjZ2mFKCBacbmC6Ds%3D";
            try {
                const response = await fetch(blobUrl);
                const jsonData = await response.json();
                setCampaignData(jsonData);
                const aggregatedData = aggregateCampaignData(jsonData, getTodayDate());
                setAggregatedCampaigns(aggregatedData);
            } catch (error) {
                console.error("Error fetching campaign data:", error);
            }
        }
        fetchCampaignData();
    }, []);

    const aggregateCampaignData = (data, date) => {
        const filteredData = data.filter(record => record.Date === date);
        const aggregated = {};

        filteredData.forEach(record => {
            const campaignName = record.Campaign;

            if (!aggregated[campaignName]) {
                aggregated[campaignName] = { ...record };
            } else {
                // Sum metrics
                aggregated[campaignName].Sent += record.Sent;
                aggregated[campaignName].Delivered += record.Delivered;
                aggregated[campaignName].Unique_Opens += record.Unique_Opens;
                aggregated[campaignName].Total_Opens += record.Total_Opens;
                aggregated[campaignName].Unique_Clicks += record.Unique_Clicks;
                aggregated[campaignName].Total_Clicks += record.Total_Clicks;

                // Recalculate rates
                aggregated[campaignName].Delivery_Rate = aggregated[campaignName].Delivered / aggregated[campaignName].Sent || 0;
                aggregated[campaignName].Unique_Open_Rate = aggregated[campaignName].Unique_Opens / aggregated[campaignName].Sent || 0;
                aggregated[campaignName].Total_Open_Rate = aggregated[campaignName].Total_Opens / aggregated[campaignName].Sent || 0;
                aggregated[campaignName].Unique_Click_Rate = aggregated[campaignName].Unique_Clicks / aggregated[campaignName].Sent || 0;
                aggregated[campaignName].Total_Click_Rate = aggregated[campaignName].Total_Clicks / aggregated[campaignName].Sent || 0;
            }
        });

        return Object.values(aggregated);
    };

    const generateChartData = (campaignName) => {
        const filteredData = campaignData.filter(record => record.Campaign === campaignName);
    
        const groupedByDate = {};
    
        filteredData.forEach(record => {
            const date = record.Date;
            if (!groupedByDate[date]) {
                groupedByDate[date] = { totalRate: record.Unique_Open_Rate, count: 1 };
            } else {
                groupedByDate[date].totalRate += record.Unique_Open_Rate; // Accumulate the open rates
                groupedByDate[date].count += 1; // Count the entries for averaging
            }
        });
    
        // Log grouped data to confirm accuracy
        console.log("Grouped Data by Date:", groupedByDate);
    
        // Calculate the average for each date and return the data points
        const chartData = Object.keys(groupedByDate).map(date => ({
            date,
            avgRate: groupedByDate[date].totalRate / groupedByDate[date].count, // Calculate the average
        }));
    
        // Log chart data to debug
        console.log("Chart Data:", chartData);
    
        return chartData.sort((a, b) => new Date(a.date) - new Date(b.date));
    };
    
    useEffect(() => {
        aggregatedCampaigns.forEach((campaign, index) => {
            const canvasId = `lineChart-${index}`;
            const canvasElement = document.getElementById(canvasId);
    
            if (canvasElement) {
                const ctx = canvasElement.getContext('2d');
    
                const chartData = generateChartData(campaign.Campaign);
                const labels = chartData.map(item =>
                    new Date(item.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })
                );
                const dataPoints = chartData.map(item => (item.avgRate * 100).toFixed(2)); // Convert to percentage
    
                if (canvasElement.chartInstance) {
                    canvasElement.chartInstance.destroy();
                }
    
                const chartInstance = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Unique Open Rate (%)',
                            data: dataPoints,
                            borderColor: 'rgba(75, 192, 192, 1)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            fill: false,
                            tension: 0.3,
                        }],
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    label: (context) => `${context.raw}%`,
                                },
                            },
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: { display: true, text: 'Unique Open Rate (%)' },
                            },
                            x: {
                                title: { display: true, text: 'Date' },
                            },
                        },
                    },
                });
    
                canvasElement.chartInstance = chartInstance;
            }
        });
    }, [aggregatedCampaigns, campaignData]);
    
        

    const totalPages = Math.ceil(aggregatedCampaigns.length / campaignsPerPage);
    const indexOfLastCampaign = currentPage * campaignsPerPage;
    const indexOfFirstCampaign = indexOfLastCampaign - campaignsPerPage;
    const currentCampaigns = aggregatedCampaigns.slice(indexOfFirstCampaign, indexOfLastCampaign);

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
