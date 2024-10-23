import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import './Dashboard.css';

const Dashboard = () => {
    const [metricsData, setMetricsData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [search, setSearch] = useState('');
    const chartRef = useRef(null);

    useEffect(() => {
        fetch('/dummy_metrics_data.json')
            .then((res) => res.json())
            .then((data) => {
                setMetricsData(data);
                setFilteredData(data); 
            });
    }, []);

    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.destroy();
        }

        const ctx = document.getElementById('myChart').getContext('2d');
        const labels = filteredData.map((item) => item.Publication);
        const data = filteredData.map((item) => item.Engagements);

        chartRef.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Engagements',
                    data: data,
                    backgroundColor: 'rgba(0, 255, 128, 0.7)',
                    borderColor: 'rgba(0, 255, 128, 1)',
                    borderWidth: 1,
                }]
            },
            options: {
                maintainAspectRatio: false, 
                responsive: true,           
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

    }, [filteredData]);

    const handleSearchChange = (e) => {
        const searchValue = e.target.value.toLowerCase();
        setSearch(searchValue);

        const filtered = metricsData.filter(item =>
            item.Publication.toLowerCase().includes(searchValue) ||
            item.Brand.toLowerCase().includes(searchValue)
        );
        setFilteredData(filtered);
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Email Metrics Dashboard</h1>
                <input
                    type="text"
                    className="search-box"
                    placeholder="Search by Publication, Brand..."
                    value={search}
                    onChange={handleSearchChange}
                />
            </header>

            <div className="chart-section">
                <canvas id="myChart" width="400" height="300"></canvas>
            </div>

            <div className="d3-section">
                <h2>Interactive Data Insights</h2>
                <div id="d3Chart"></div>
            </div>
        </div>
    );
};

export default Dashboard;
