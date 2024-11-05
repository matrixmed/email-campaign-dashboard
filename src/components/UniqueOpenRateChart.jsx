import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const UniqueOpenRateChart = ({ filteredData }) => {
    const chartRef = useRef(null);

    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.destroy();
        }

        const ctx = document.getElementById('UniqueOpenRate').getContext('2d');
        const labels = filteredData.slice(-10).map((item) => item.Publication);
        const data = filteredData.slice(-10).map((item) => item.Unique_Open_Rate);

        if (labels.length === 0 || data.length === 0) return;

        chartRef.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Unique Open Rate',
                    data,
                    backgroundColor: 'rgba(128, 128, 255, 0.7)',
                    borderColor: 'rgba(128, 128, 255, 1)',
                    borderWidth: 2,
                }]
            },
            options: {
                maintainAspectRatio: false,
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }, [filteredData]);

    return <div className="chart-section"><canvas id="UniqueOpenRate" width="400" height="300"></canvas></div>;
};

export default UniqueOpenRateChart;
