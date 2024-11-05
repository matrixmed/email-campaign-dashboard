import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

const TotalClickChartSection = ({ filteredData }) => {
    const chartRef = useRef(null);

    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.destroy();
        }

        const ctx = document.getElementById('TotalClickChart').getContext('2d');
        const labels = filteredData.slice(-10).map((item) => item.Publication);
        const data = filteredData.slice(-10).map((item) => item.Total_Click_Rate);

        if (labels.length === 0 || data.length === 0) return;

        chartRef.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Total Click Rate',
                    data,
                    backgroundColor: 'rgba(0, 255, 128, 0.7)',
                    borderColor: 'rgba(0, 255, 128, 1)',
                    borderWidth: 1,
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

    return <div className="chart-section"><canvas id="TotalClickChart" width="400" height="300"></canvas></div>;
};

export default TotalClickChartSection;
