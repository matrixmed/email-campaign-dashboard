import React, { useRef } from 'react';
import Chart from 'chart.js/auto';

const InsightsSection = ({
    availableSubjects,
    selectedSubjects,
    handleSubjectChange,
    selectedMetric,
    setSelectedMetric,
    selectedChartType,
    setSelectedChartType,
    averagedData,
    }) => {
    const dynamicChartRef = useRef(null);
    const insightMetrics = [
        'Sent',
        'Delivered',
        'Delivery_Rate',
        'Unique_Opens',
        'Unique_Open_Rate',
        'Total_Opens',
        'Total_Open_Rate',
        'Unique_Clicks',
        'Unique_Click_Rate',
        'Total_Clicks',
        'Total_Click_Rate',
    ];

    const handleGenerateChart = () => {
        if (!selectedMetric || !selectedChartType || selectedSubjects.every(subject => !subject)) {
            return;
        }

        const validSubjects = selectedSubjects.filter(subject => subject);
        if (validSubjects.length === 0) {
            return;
        }

        if (dynamicChartRef.current) {
            dynamicChartRef.current.destroy();
        }

        const ctx = document.getElementById('dynamicChart').getContext('2d');
        const selectedData = validSubjects.map(subject => averagedData[subject] ? averagedData[subject][selectedMetric] : 0);

        const datasets = [{
            label: 'Publication Averages Comparison',
            data: selectedData,
            backgroundColor: validSubjects.map((_, index) =>
                `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.7)`
            ),
            borderColor: validSubjects.map((_, index) =>
                `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 1)`
            ),
            borderWidth: 1,
        }];

        dynamicChartRef.current = new Chart(ctx, {
            type: selectedChartType || 'bar',
            data: {
                labels: validSubjects,
                datasets
            },
            options: {
                maintainAspectRatio: true,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    };

    return (
        <div className="insights-section">
            <h2>Interactive Data Insights</h2>
            <div className="input-section">
                <div className="subject-selection-column">
                    {selectedSubjects.map((subject, index) => (
                        <div className="subject-select" key={index}>
                            <label>Campaign {index + 1}:</label>
                            <select
                                value={subject}
                                onChange={(e) => handleSubjectChange(index, e.target.value)}
                            >
                                <option value="">Select Campaign</option>
                                {availableSubjects.map((subj, idx) => (
                                    <option key={idx} value={subj}>{subj}</option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>
                <div className="metric-selection-row">
                    <div>
                        <label>Metric:</label>
                        <select
                            value={selectedMetric}
                            onChange={(e) => setSelectedMetric(e.target.value)}
                        >
                            <option value="">Select Metric</option>
                                {insightMetrics.map((metric, idx) => (
                                    <option key={idx} value={metric}>{metric}</option>
                                ))}
                        </select>
                    </div>
                    <div>
                        <label>Chart Type:</label>
                        <select
                            value={selectedChartType}
                            onChange={(e) => setSelectedChartType(e.target.value)}
                        >
                            <option value="">Select Chart Type</option>
                                {['bar', 'pie', 'radar', 'polarArea'].map((type, idx) => (
                                    <option key={idx} value={type}>{type}</option>
                                ))}
                        </select>
                    </div>
                    <button onClick={handleGenerateChart}>Generate Chart</button>
                </div>
            </div>
            <div className="dynamic-chart-section">
                <canvas id="dynamicChart" width="100" height="300"></canvas>
            </div>
        </div>
    );
};

export default InsightsSection;
