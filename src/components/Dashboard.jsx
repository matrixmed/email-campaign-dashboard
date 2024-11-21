import React, { useState, useEffect } from 'react';
import { groupPublications } from '../groupPublications';
import LiveCampaignMetrics from './LiveCampaignMetrics';
import MetricsTable from './MetricsTable';
import TotalClickRateChart from './TotalClickRateChart';
import UniqueOpenRateChart from './UniqueOpenRateChart';
import InsightsSection from './InsightsSection';

const Dashboard = () => {
    const [isDarkTheme, setIsDarkTheme] = useState(true);
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
    
    const toggleTheme = () => {
        setIsDarkTheme((prevTheme) => !prevTheme); 
    };
    
    const [selectedColumn, setSelectedColumn] = useState({
        column1: 'Unique_Open_Rate',
        column2: 'Total_Open_Rate',
        column3: 'Unique_Click_Rate',
        column4: 'Total_Click_Rate',
    });
    
    const availableMetrics = [
        'Sent', 'Delivered', 'Delivery_Rate', 'Unique_Opens', 'Unique_Open_Rate',
        'Total_Opens', 'Total_Open_Rate', 'Unique_Clicks', 'Unique_Click_Rate',
        'Total_Clicks', 'Total_Click_Rate', 'Issue_Date', 'Deployments',
    ];
    
    const rowsPerPage = 10;
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;

    useEffect(() => {
        document.body.className = isDarkTheme ? "dark" : "light";
    }, [isDarkTheme]);
      
    useEffect(() => {
        async function fetchBlobData() {
            const blobUrl = "https://emaildash.blob.core.windows.net/json-data/combined_data.json?sp=r&st=2024-10-28T20:56:43Z&se=2025-10-28T04:56:43Z&spr=https&sv=2022-11-02&sr=b&sig=OEUeFcUZVRvz4d6yJ2%2F2h2wwO9j3OmHBGNRlNzYlPiI%3D";
            try {
                const response = await fetch(blobUrl);
                const jsonData = await response.json();
                setMetricsData(jsonData);
                setFilteredData(jsonData);
                setAvailableSubjects([...new Set(jsonData.map((item) => item.Publication.split(" ")[0]))]);
            } catch (error) {
                console.error("Error fetching blob data:", error);
            }
        }
        fetchBlobData();
    }, []);

    useEffect(() => {
        const groupedPublications = groupPublications(metricsData);
        setAvailableSubjects(Object.keys(groupedPublications));
        setAveragedData(calculateAverages(groupedPublications));
    }, [metricsData]);

    const handleSearchChange = (e) => {
        const searchValue = e.target.value.toLowerCase();
        setSearch(searchValue);
        setFilteredData(metricsData.filter(item =>
            searchValue.split(' ').every(word => item.Publication.toLowerCase().includes(word))
        ));
    };

    const handleColumnChange = (column, metric) => {
        setSelectedColumn((prevState) => ({ ...prevState, [column]: metric }));
        setDropdownOpen((prevState) => ({ ...prevState, [column]: false }));
    };

    const toggleDropdown = (column) => setDropdownOpen((prevState) => ({ ...prevState, [column]: !prevState[column] }));

    const handlePagination = (pageNumber) => setCurrentPage(pageNumber);

    const handleSubjectChange = (index, value) => {
        const newSubjects = [...selectedSubjects];
        newSubjects[index] = value;
        setSelectedSubjects(newSubjects);
        if (index === newSubjects.length - 1 && value && newSubjects.length < 4) setSelectedSubjects([...newSubjects, '']);
    };

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

    return (
        <div className={`dashboard-container ${isDarkTheme ? 'dark' : 'light'}`}>
            <header className="dashboard-header">
                <h1>Matrix Email Metrics Dashboard</h1>
                <input
                    type="text"
                    className="search-box"
                    placeholder="Search by Campaign"
                    value={search}
                    onChange={handleSearchChange}
                />
                <div className="toggle-switch" onClick={toggleTheme}>
                    <label className="switch-label">
                        <input 
                            type="checkbox" 
                            className="checkbox" 
                            checked={!isDarkTheme} 
                            onChange={toggleTheme} 
                        />
                        <span className="slider"></span>
                    </label>
                </div>
            </header>
            <MetricsTable
                filteredData={filteredData.slice().reverse().slice(indexOfFirstRow, indexOfLastRow)}
                selectedColumn={selectedColumn}
                toggleDropdown={toggleDropdown}
                handleColumnChange={handleColumnChange}
                dropdownOpen={dropdownOpen}
                currentPage={currentPage}
                rowsPerPage={rowsPerPage}
                handlePagination={handlePagination}
                availableMetrics={availableMetrics}
                totalPages={totalPages}
            />
            <LiveCampaignMetrics />
            <UniqueOpenRateChart filteredData={filteredData} />
            <TotalClickRateChart filteredData={filteredData} />
            <InsightsSection
                availableSubjects={availableSubjects}
                selectedSubjects={selectedSubjects}
                handleSubjectChange={handleSubjectChange}
                selectedMetric={selectedMetric}
                setSelectedMetric={setSelectedMetric}
                selectedChartType={selectedChartType}
                setSelectedChartType={setSelectedChartType}
                averagedData={averagedData}
            />
            <div className="buffer-section"></div>
            <div className="buffer-section"></div>
        </div>
    );
};

export default Dashboard;
