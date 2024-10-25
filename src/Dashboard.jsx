import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { groupPublications } from './groupPublications';
import './Dashboard.css';

const Dashboard = () => {
    const [metricsData, setMetricsData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [averagedData, setAveragedData] = useState({});
    const [search, setSearch] = useState('');
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState({});
    const [selectedMetric, setSelectedMetric] = useState('');
    const [selectedChartType, setSelectedChartType] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedSubjects, setSelectedSubjects] = useState(['']);
    const rowsPerPage = 7;
    const dynamicChartRef = useRef(null);
    const chartRef = useRef(null);
    const lineChartRef = useRef(null); 
    const [selectedColumn, setSelectedColumn] = useState({
        column1: 'Unique_Opens',
        column2: 'Unique_Open_Rate',
        column3: 'Total_Clicks',
        column4: 'Total_Click_Rate',
    });
    const availableChartTypes = ['line', 'bar', 'pie', 'radar', 'polarArea'];
    const availableMetrics = [
        'Unique_Opens',
        'Unique_Open_Rate',
        'Total_Opens',
        'Delivery_Rate',
        'Journal',
        'Type',
        'Issue_Date',
        'Deployments',
        'Sent',
        'Delivered',
        'Total_Open_Rate',
        'Unique_Clicks',
        'Unique_Click_Rate',
        'Total_Clicks',
        'Total_Click_Rate',
        'Format',
    ];
    const insightMetrics = [
        'Total_Opens',
        'Total_Open_Rate',
        'Unique_Opens',
        'Unique_Open_Rate',
        'Total_Clicks',
        'Total_Click_Rate',
        'Unique_Clicks',
        'Unique_Click_Rate',
        'Sent',
        'Delivered',
        'Delivery_Rate',
    ];

    useEffect(() => {
        async function fetchBlobData() {
            const blobUrl = "https://emaildash.blob.core.windows.net/json-data/combined_data.json?sp=r&st=2024-10-24T18:43:26Z&se=2025-10-25T02:43:26Z&sv=2022-11-02&sr=b&sig=SMe2MeMqHNbxjSOHuEuspIaEQtA8hMiHbnlt1nAZjn4%3D"; 
    
            try {    
                const response = await fetch(blobUrl);
                const jsonData = await response.json();
    
                setMetricsData(jsonData);
                setFilteredData(jsonData);
    
                const subjects = Array.from(new Set(jsonData.map((item) => item.Publication.split(" ")[0])));
                setAvailableSubjects(subjects);
            } catch (error) {
                console.error("Error fetching blob data:", error);
            }
        }
    
        fetchBlobData();
    }, []);

    useEffect(() => {
        const groupedPublications = groupPublications(metricsData);
        const subjects = Object.keys(groupedPublications); 
        setAvailableSubjects(subjects);
    
        const averages = calculateAverages(groupedPublications);
        setAveragedData(averages);
    }, [metricsData]);
    

    const handleSearchChange = (e) => {
        const searchValue = e.target.value.toLowerCase();
        setSearch(searchValue);
    
        const searchWords = searchValue.split(' ');
    
        const filtered = metricsData.filter(item => {
            return searchWords.every(word => item.Publication.toLowerCase().includes(word));
        });
    
        setFilteredData(filtered);
    };    

    const handleColumnChange = (column, metric) => {
        setSelectedColumn((prevState) => ({
            ...prevState,
            [column]: metric,
        }));
        setDropdownOpen((prevState) => ({
            ...prevState,
            [column]: false,
        }));
    };

    const toggleDropdown = (column) => {
        setDropdownOpen((prevState) => ({
            ...prevState,
            [column]: !prevState[column],
        }));
    };

    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.destroy();
        }
        const ctx = document.getElementById('myChart').getContext('2d');
        const reversedData = filteredData.slice().reverse();
        const last10Data = reversedData.slice(-10); 
        const labels = last10Data.map((item) => item.Publication);
        const data = last10Data.map((item) => item.Total_Clicks);

        if (labels.length === 0 || data.length === 0) return;

        chartRef.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Clicks', 
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

    useEffect(() => {
        if (lineChartRef.current) {
            lineChartRef.current.destroy();
        }
    
        const ctx = document.getElementById('lineChart').getContext('2d');
        const reversedData = filteredData.slice().reverse();
        const last15Data = reversedData.slice(-40); 
        const labels = last15Data.map((item) => item.Publication);
        const data = last15Data.map((item) => item.Total_Opens);
    
        if (labels.length === 0 || data.length === 0) return;
    
        const minValue = Math.min(...data);
        const maxValue = Math.max(...data);
    
        const buffer = 50;
        const suggestedMin = minValue - buffer < 0 ? 0 : minValue - buffer;
        const suggestedMax = maxValue + buffer;
    
        lineChartRef.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Opens',
                    data: data,
                    backgroundColor: 'rgba(128, 128, 255, 0.7)',
                    borderColor: 'rgba(128, 128, 255, 1)',
                    borderWidth: 2,
                }]
            },
            options: {
                maintainAspectRatio: false,
                responsive: true,
                scales: {
                    x: {
                        display: false,
                    },
                    y: {
                        beginAtZero: false,
                        min: suggestedMin,
                        max: suggestedMax
                    }
                }
            }
        });
    }, [filteredData]); 
    
    const calculateAverages = (groups) => {
        const averageData = {};
        
        for (const group in groups) {
            const publications = groups[group];
            if (publications.length === 0) continue;
    
            const metricsSum = publications.reduce((acc, curr) => {
                acc.Total_Opens += curr.Total_Opens || 0;
                acc.Total_Open_Rate += curr.Total_Open_Rate || 0;
                acc.Unique_Opens += curr.Unique_Opens || 0;
                acc.Unique_Open_Rate += curr.Unique_Open_Rate || 0;
                acc.Total_Clicks += curr.Total_Clicks || 0;
                acc.Total_Click_Rate += curr.Total_Click_Rate || 0;
                acc.Unique_Clicks += curr.Unique_Clicks || 0;
                acc.Unique_Click_Rate += curr.Unique_Click_Rate || 0;
                acc.Sent += curr.Sent || 0;
                acc.Delivered += curr.Delivered || 0;
                acc.Delivery_Rate += curr.Delivery_Rate || 0;
                return acc;
            }, { Total_Opens: 0, Total_Open_Rate: 0, Unique_Opens: 0, Unique_Open_Rate: 0, Total_Clicks: 0, Total_Click_Rate: 0, Unique_Clicks: 0, Unique_Click_Rate: 0, Sent: 0, Delivered: 0, Delivery_Rate: 0 });
    
            const count = publications.length;
            averageData[group] = {
                Total_Opens: metricsSum.Total_Opens / count || 0,
                Total_Open_Rate: metricsSum.Total_Open_Rate / count || 0,
                Unique_Opens: metricsSum.Unique_Opens / count || 0,
                Unique_Open_Rate: metricsSum.Unique_Open_Rate / count || 0,
                Total_Clicks: metricsSum.Total_Clicks / count || 0,
                Total_Click_Rate: metricsSum.Total_Click_Rate / count || 0,
                Unique_Clicks: metricsSum.Unique_Clicks / count || 0,
                Unique_Click_Rate: metricsSum.Unique_Click_Rate / count || 0,
                Sent: metricsSum.Sent / count || 0,
                Delivered: metricsSum.Delivered / count || 0,
                Delivery_Rate: metricsSum.Delivery_Rate / count || 0
            };
        }
    
        return averageData;
    };
    
    const handleGenerateChart = () => {
        if (!selectedMetric || !selectedChartType || selectedSubjects.every(subject => !subject)) {
            alert("Please fill out all parameters before generating the chart.");
            return;
        }
        if (dynamicChartRef.current) {
            dynamicChartRef.current.destroy();
        }
    
        const ctx = document.getElementById('dynamicChart').getContext('2d');
        
        const selectedData = selectedSubjects
            .filter(subject => subject)
            .map(subject => {
                return averagedData[subject] ? averagedData[subject][selectedMetric] : 0;
            });
        
        const datasets = [{
            label: 'Publication Averages Comparison',
            data: selectedData,
            backgroundColor: selectedSubjects.map((_, index) =>
                `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.7)`
            ),
            borderColor: selectedSubjects.map((_, index) =>
                `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 1)`
            ),
            borderWidth: 1,
        }];
        
        dynamicChartRef.current = new Chart(ctx, {
            type: selectedChartType || 'bar',
            data: {
                labels: selectedSubjects,
                datasets: datasets,
            },
            options: {
                maintainAspectRatio: true, 
                scales: {
                    y: { 
                        beginAtZero: true
                    }
                }
            }
            
        });
    };
    
    const handleAddSubjectDropdown = () => {
        if (selectedSubjects.length < 4) {
            setSelectedSubjects([...selectedSubjects, '']);
        }
    };
    
    const handleSubjectChange = (index, value) => {
        const newSubjects = [...selectedSubjects];
        newSubjects[index] = value;
        setSelectedSubjects(newSubjects);
        if (index === selectedSubjects.length - 1 && value) {
            handleAddSubjectDropdown(); 
        }
    };
    
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentRows = filteredData.slice(indexOfFirstRow, indexOfLastRow); 
    const totalPages = Math.ceil(filteredData.length / rowsPerPage); 
    const maxPageButtons = 5;

    const startPage = Math.max(1, currentPage - Math.floor(maxPageButtons / 2));
    const endPage = Math.min(totalPages, startPage + maxPageButtons - 1);

    const handlePagination = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Matrix Email Metrics Dashboard</h1>
                <input
                    type="text"
                    className="search-box"
                    placeholder="Search by Publication"
                    value={search}
                    onChange={handleSearchChange}
                />
            </header>

            <div className="table-section">
                <h2>Key Metrics Table</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Publication</th>
                            <th onClick={() => toggleDropdown('column1')}>
                                {selectedColumn.column1}{' '}
                                <span className="dropdown-arrow">▼</span>
                                {dropdownOpen.column1 && (
                                    <div className="dropdown">
                                        {availableMetrics.map((metric, index) => (
                                            <div
                                                key={index}
                                                onClick={() => handleColumnChange('column1', metric)}
                                                className="dropdown-item"
                                            >
                                                {metric}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </th>
                            <th onClick={() => toggleDropdown('column2')}>
                                {selectedColumn.column2}{' '}
                                <span className="dropdown-arrow">▼</span>
                                {dropdownOpen.column2 && (
                                    <div className="dropdown">
                                        {availableMetrics.map((metric, index) => (
                                            <div
                                                key={index}
                                                onClick={() => handleColumnChange('column2', metric)}
                                                className="dropdown-item"
                                            >
                                                {metric}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </th>
                            <th onClick={() => toggleDropdown('column3')}>
                                {selectedColumn.column3}{' '}
                                <span className="dropdown-arrow">▼</span>
                                {dropdownOpen.column3 && (
                                    <div className="dropdown">
                                        {availableMetrics.map((metric, index) => (
                                            <div
                                                key={index}
                                                onClick={() => handleColumnChange('column3', metric)}
                                                className="dropdown-item"
                                            >
                                                {metric}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </th>
                            <th onClick={() => toggleDropdown('column4')}>
                                {selectedColumn.column4}{' '}
                                <span className="dropdown-arrow">▼</span>
                                {dropdownOpen.column4 && (
                                    <div className="dropdown">
                                        {availableMetrics.map((metric, index) => (
                                            <div
                                                key={index}
                                                onClick={() => handleColumnChange('column4', metric)}
                                                className="dropdown-item"
                                            >
                                                {metric}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentRows.map((item, index) => (
                            <tr key={index}>
                                <td>{item.Publication}</td>
                                <td>{item[selectedColumn.column1]}</td>
                                <td>{item[selectedColumn.column2]}</td>
                                <td>{item[selectedColumn.column3]}</td>
                                <td>{item[selectedColumn.column4]}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="pagination">
                    {currentPage > 1 && (
                        <button onClick={() => handlePagination(currentPage - 1)}>
                            Previous
                        </button>
                    )}

                    {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(num => (
                        <button
                            key={num}
                            onClick={() => handlePagination(num)}
                            className={currentPage === num ? 'active' : ''}
                        >
                            {num}
                        </button>
                    ))}

                    {currentPage < totalPages && (
                        <button onClick={() => handlePagination(currentPage + 1)}>
                            Next
                        </button>
                    )}
                </div>
            </div>

            <div className="chart-section">
                <canvas id="myChart" width="400" height="300"></canvas>
            </div>

            <div className="line-chart-section">
                <canvas id="lineChart" width="400" height="300"></canvas>
            </div>

            <div className="insights-section">
                <h2>Interactive Data Insights</h2>
                <div className="input-section">
                    <div className="subject-selection-column">
                        {selectedSubjects.map((subject, index) => (
                            <div className='subject-select' key={index}>
                                <label>Subject {index + 1}:</label>
                                <select
                                    value={subject}
                                    onChange={(e) => handleSubjectChange(index, e.target.value)}
                                >
                                    <option value="">Select Subject</option>
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
                                {availableChartTypes.map((type, idx) => (
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


            <div className="buffer-section">
            </div>
        </div>
    );
};

export default Dashboard;
