import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import './Dashboard.css';

const Dashboard = () => {
    const [metricsData, setMetricsData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [selectedMetric, setSelectedMetric] = useState('');
    const [selectedChartType, setSelectedChartType] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 7;
    const dynamicChartRef = useRef(null);
    const chartRef = useRef(null);
    const lineChartRef = useRef(null); 
    const [selectedColumn, setSelectedColumn] = useState({
        column1: 'Unique_Opens',
        column2: 'Unique_Open_Rate',
        column3: 'Total_Opens',
        column4: 'Delivery_Rate',
    });
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

    const [dropdownOpen, setDropdownOpen] = useState({});

    useEffect(() => {
        fetch('/combined_data.json')
            .then((res) => res.json())
            .then((data) => {
                setMetricsData(data);
                setFilteredData(data);

                const subjects = Array.from(new Set(data.map((item) => item.Publication.split(" ")[0])));
                setAvailableSubjects(subjects);
            });
    }, []);

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

    const handleGenerateChart = () => {
        if (dynamicChartRef.current) {
            dynamicChartRef.current.destroy();
        }

        const ctx = document.getElementById('dynamicChart').getContext('2d');
        const selectedData = metricsData.filter(item =>
            item.Publication.toLowerCase().includes(selectedSubject.toLowerCase())
        );

        const labels = selectedData.map((item) => item.Send_Date);
        const data = selectedData.map((item) => item[selectedMetric]);

        if (labels.length === 0 || data.length === 0) return;

        dynamicChartRef.current = new Chart(ctx, {
            type: selectedChartType || 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: selectedMetric,
                    data: data,
                    backgroundColor: 'rgba(0, 128, 255, 0.7)',
                    borderColor: 'rgba(0, 128, 255, 1)',
                    borderWidth: 2,
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
                <h1>Email Metrics Dashboard</h1>
                <input
                    type="text"
                    className="search-box"
                    placeholder="Search by Publication, Brand, Month, Year"
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
                    <div>
                        <label>Subject:</label>
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                        >
                            <option value="">Select Subject</option>
                            {availableSubjects.map((subject, index) => (
                                <option key={index} value={subject}>{subject}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label>Metric:</label>
                        <select
                            value={selectedMetric}
                            onChange={(e) => setSelectedMetric(e.target.value)}
                        >
                            <option value="">Select Metric</option>
                            <option value="Unique_Open_Rate">Unique Open Rate</option>
                            <option value="Total_Opens">Total Opens</option>
                            <option value="Delivery_Rate">Delivery Rate</option>
                        </select>
                    </div>
                    <div>
                        <label>Chart Type:</label>
                        <select
                            value={selectedChartType}
                            onChange={(e) => setSelectedChartType(e.target.value)}
                        >
                            <option value="">Select Chart Type</option>
                            <option value="line">Line Chart</option>
                            <option value="bar">Bar Chart</option>
                            <option value="pie">Pie Chart</option>
                        </select>
                    </div>
                    <button onClick={handleGenerateChart}>Generate Chart</button>
                </div>
                <div className="dynamic-chart-section">
                    <canvas id="dynamicChart" width="400" height="300"></canvas>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
