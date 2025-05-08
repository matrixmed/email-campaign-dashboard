import React, { useState, useEffect } from 'react';
import _ from 'lodash';
import { groupPublications } from '../groupPublications';
import LiveCampaignMetrics from './LiveCampaignMetrics';
import MetricsTable from './MetricsTable';
// import InsightsSection from './InsightsSection';
import DigitalJournals from './DigitalJournals';
import VideoMetrics from './VideoMetrics';
import ChatInterface from './ChatInterface';
import { createStars } from '../themes/stars';
import { createShootingStars } from '../themes/stars';

const Dashboard = () => {
    const [isDarkTheme, setIsDarkTheme] = useState(true);
    const [metricsData, setMetricsData] = useState([]);
    const [rawFilteredData, setRawFilteredData] = useState([]);
    const [processedData, setProcessedData] = useState([]);
    const [averagedData, setAveragedData] = useState({});
    const [search, setSearch] = useState('');
    const [selectedDeployment, setSelectedDeployment] = useState('all'); 
    const [availableSubjects, setAvailableSubjects] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedSubjects, setSelectedSubjects] = useState(['']);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentTheme, setCurrentTheme] = useState('dark');

    const [selectedColumn, setSelectedColumn] = useState({
        column1: 'Unique_Open_Rate',
        column2: 'Total_Open_Rate',
        column3: 'Unique_Click_Rate',
        column4: 'Total_Click_Rate',
    });

    const availableMetrics = [
        'Sent', 'Hard_Bounces', 'Soft_Bounces', 'Total_Bounces', 'Delivered', 'Delivery_Rate', 
        'Unique_Opens', 'Unique_Open_Rate', 'Total_Opens', 'Total_Open_Rate', 'Unique_Clicks', 
        'Unique_Click_Rate', 'Total_Clicks', 'Total_Click_Rate', 'Filtered_Bot_Clicks',
    ];

    const availableThemes = [
        { value: 'dark', label: 'Dark Theme' },
        { value: 'light', label: 'Light Theme' },
        { value: 'space-theme', label: 'Space Theme' }
        /*
        { value: 'cyberpunk-theme', label: 'Cyberpunk Theme' },
        { value: 'holographic-theme', label: 'Holographic Theme' },
        { value: 'synthwave-theme', label: 'Synthwave Theme' }
         */
    ];

    const cleanCampaignName = (name) => {
        return name.split(/\s*[-–—]\s*deployment\s*#?\d+|\s+deployment\s*#?\d+/i)[0].trim();
    };

    const filterByDeployment = (data) => {
        if (selectedDeployment === 'all') return data;
        
        return data.filter(item => {
            const match = item.Campaign.match(/\s*[-–—]\s*deployment\s*#?(\d+)|\s+deployment\s*#?(\d+)/i);
            
            if (selectedDeployment === 'none') {
                return !match;
            }
            
            if (match) {
                const num = match[1] || match[2];
                return num === selectedDeployment;
            }
            
            return false;
        });
    };

    const processData = (data) => {
        if (!data || !data.length) return [];
        
        if (selectedDeployment !== 'all') {
            const validDeliveries = data.filter(item => (item.Delivered || 0) >= 100);
            return validDeliveries;
        }
        
        const validDeliveries = data.filter(item => (item.Delivered || 0) >= 100);
        const groupedCampaigns = _.groupBy(validDeliveries, item => cleanCampaignName(item.Campaign));

        return Object.entries(groupedCampaigns).map(([campaignName, deployments]) => {
            if (deployments.length === 1) {
                return { ...deployments[0], Campaign: campaignName };
            }

            const deployment1 = deployments.find(d => {
                const name = d.Campaign.toLowerCase();
                return name.includes('deployment 1') || 
                    name.includes('deployment #1') || 
                    name.includes('deployment1');
            });

            const baseDeployment = deployment1 || deployments[0];
    
            const totalUniqueOpens = _.sumBy(deployments, 'Unique_Opens');
            const totalTotalOpens = _.sumBy(deployments, 'Total_Opens');
            const totalUniqueClicks = _.sumBy(deployments, 'Unique_Clicks');
            const totalTotalClicks = _.sumBy(deployments, 'Total_Clicks');
            const totalHardBounces = _.sumBy(deployments, 'Hard_Bounces');
            const totalSoftBounces = _.sumBy(deployments, 'Soft_Bounces');
            const totalBounces = _.sumBy(deployments, 'Total_Bounces');
            const totalBotClicks = _.sumBy(deployments, 'Filtered_Bot_Clicks');
    
            return {
                Campaign: campaignName,
                Send_Date: baseDeployment.Send_Date,
                Sent: baseDeployment.Sent,
                Total_Bounces: totalBounces,
                Hard_Bounces: totalHardBounces,
                Soft_Bounces: totalSoftBounces,
                Delivered: baseDeployment.Delivered,
                Delivery_Rate: (baseDeployment.Delivered / baseDeployment.Sent) * 100,
                Unique_Opens: totalUniqueOpens,
                Total_Opens: totalTotalOpens,
                Unique_Open_Rate: (totalUniqueOpens / baseDeployment.Delivered) * 100,
                Total_Open_Rate: (totalTotalOpens / baseDeployment.Delivered) * 100,
                Unique_Clicks: totalUniqueClicks,
                Total_Clicks: totalTotalClicks,
                Unique_Click_Rate: (totalUniqueClicks / totalUniqueOpens) * 100,
                Total_Click_Rate: (totalTotalClicks / totalTotalOpens) * 100,
                Filtered_Bot_Clicks: totalBotClicks,
                DeploymentCount: deployments.length
            };
        });
    };

    useEffect(() => {
        document.body.classList.remove(
            'dark', 
            'light', 
            'space-theme',
            'marble-theme',
            'cyberpunk-theme',
            'holographic-theme',
            'company-theme',
            'synthwave-theme'
        );
        
        document.body.classList.add(currentTheme);
        
        if (currentTheme === 'light') {
            document.body.style.backgroundColor = '#f9f9f9';  
        } else if (currentTheme === 'dark') {
            document.body.style.backgroundColor = '#1c1c1e';  
        } else if (currentTheme === 'space-theme') {
            document.body.style.backgroundColor = '#050a1f'; 
            createStars();
            createShootingStars();
        } else if (currentTheme === 'cyberpunk-theme') {
            document.body.style.backgroundColor = '#0a0a0f'; 
        } else if (currentTheme === 'holographic-theme') {
            document.body.style.backgroundColor = 'rgba(10, 15, 30, 0.9)';  
        } else if (currentTheme === 'synthwave-theme') {
            document.body.style.backgroundColor = '#1a1a2e'; 
        }
        
        if (currentTheme !== 'space-theme') {
            const stars = document.querySelectorAll('.star, .shooting-star');
            stars.forEach(star => star.remove());
            
            const starryBackground = document.querySelector('.starry-background');
            if (starryBackground) {
                starryBackground.remove();
            }
            
            setIsDarkTheme(currentTheme === 'dark');
        }

        if (currentTheme === 'cyberpunk-theme') {
            const heading = document.querySelector('h1');
            if (heading) {
                heading.setAttribute('data-text', heading.textContent);
            }
        }
    }, [currentTheme]);

    useEffect(() => {
        document.body.className = isDarkTheme ? "dark" : "light";
    }, [isDarkTheme]);

    useEffect(() => {
        async function fetchBlobData() {
            const blobUrl = "https://emaildash.blob.core.windows.net/json-data/completed_campaign_metrics.json?sp=r&st=2025-02-04T22:10:35Z&se=2025-08-13T05:10:35Z&spr=https&sv=2022-11-02&sr=b&sig=QtsT4dSLE2uZNhqJdIfRw%2FNgQNOZOwOXzmNZfEhyFGU%3D";
            try {
                const response = await fetch(blobUrl);
                const jsonData = await response.json();
                setMetricsData(jsonData);
                setRawFilteredData(jsonData);
            } catch (error) {
                console.error("Error fetching blob data:", error);
            }
        }
        fetchBlobData();
    }, []);

    useEffect(() => {
        const searchFiltered = metricsData.filter(item =>
            search.split(' ').every(word => item.Campaign.toLowerCase().includes(word.toLowerCase()))
        );
        
        const deploymentFiltered = filterByDeployment(searchFiltered);
        
        setRawFilteredData(deploymentFiltered);
        setCurrentPage(1);
    }, [search, selectedDeployment, metricsData]);

    useEffect(() => {
        const processed = processData(rawFilteredData);
        setProcessedData(processed);
    }, [rawFilteredData]);

    useEffect(() => {
        const groupedPublications = groupPublications(metricsData);
        const validGroups = Object.keys(groupedPublications).filter(
            (group) => groupedPublications[group].length >= 3
        );
        setAvailableSubjects(validGroups);
        setAveragedData(calculateAverages(groupedPublications, validGroups));
    }, [metricsData]);

    const handleSearchChange = (e) => {
        const searchValue = e.target.value.toLowerCase();
        setSearch(searchValue);
        setRawFilteredData(metricsData.filter(item =>
            searchValue.split(' ').every(word => item.Campaign.toLowerCase().includes(word))
        ));
        setCurrentPage(1);
    };

    const handleColumnChange = (column, metric) => {
        setSelectedColumn(prev => ({ ...prev, [column]: metric }));
        setDropdownOpen(prev => ({ ...prev, [column]: false }));
    };

    const toggleDropdown = (column) => {
        setDropdownOpen(prev => ({ ...prev, [column]: !prev[column] }));
    };

    const handlePagination = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const handleRowsPerPageChange = (e) => {
        setRowsPerPage(Number(e.target.value));
        setCurrentPage(1);
    };
    
    const handleDeploymentChange = (value) => {
        setSelectedDeployment(value);
        setCurrentPage(1);
    };

    const toggleTheme = () => {
        setCurrentTheme(prevTheme => {
            const currentIndex = availableThemes.findIndex(theme => theme.value === prevTheme);
            const nextIndex = (currentIndex + 1) % availableThemes.length;
            return availableThemes[nextIndex].value;
        });
    };

    const selectTheme = (theme) => {
        setCurrentTheme(theme);
    };

    const handleSubjectChange = (index, value) => {
        const newSubjects = [...selectedSubjects];
        newSubjects[index] = value;
        setSelectedSubjects(newSubjects);
        if (index === newSubjects.length - 1 && value && newSubjects.length < 4) {
            setSelectedSubjects([...newSubjects, '']);
        }
    };

    const calculateAverages = (groups, validGroups) => {
        const averageData = {};
        validGroups.forEach((group) => {
            const Campaigns = groups[group];
            const metricsSum = Campaigns.reduce((acc, curr) => {
                Object.keys(curr).forEach(key => {
                    if (typeof curr[key] === 'number') {
                        acc[key] = (acc[key] || 0) + (curr[key] || 0);
                    }
                });
                return acc;
            }, {});

            const count = Campaigns.length;
            averageData[group] = Object.keys(metricsSum).reduce((acc, key) => {
                acc[key] = metricsSum[key] / count;
                return acc;
            }, {});
        });
        return averageData;
    };

    const sortedData = [...processedData].sort((a, b) => new Date(b.Send_Date) - new Date(a.Send_Date));
    const totalPages = Math.ceil(sortedData.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const currentPageData = sortedData.slice(startIndex, startIndex + rowsPerPage);

    return (
        <div className={`dashboard-container ${currentTheme}`}>
            <header className="dashboard-header">
                <h1>Matrix Metrics Dashboard</h1>
                <input
                    type="text"
                    className="search-box"
                    placeholder="Search by Campaign"
                    value={search}
                    onChange={handleSearchChange}
                />
                
                <div className="theme-controls">
                    <div className="theme-selector">
                        <select 
                            value={currentTheme}
                            onChange={(e) => selectTheme(e.target.value)}
                            className="theme-select"
                        >
                            {availableThemes.map(theme => (
                                <option key={theme.value} value={theme.value}>
                                    {theme.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>
            
            <MetricsTable
                currentRows={currentPageData}
                processedFullData={processedData}
                selectedColumn={selectedColumn}
                toggleDropdown={toggleDropdown}
                handleColumnChange={handleColumnChange}
                dropdownOpen={dropdownOpen}
                currentPage={currentPage}
                rowsPerPage={rowsPerPage}
                handlePagination={handlePagination}
                availableMetrics={availableMetrics}
                totalPages={totalPages}
                handleRowsPerPageChange={handleRowsPerPageChange}
                selectedDeployment={selectedDeployment}
                handleDeploymentChange={handleDeploymentChange}
            />
            <LiveCampaignMetrics />
            <DigitalJournals />
            <VideoMetrics />
            {/*
            <ChatInterface />
           
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
            */}
        </div>
    );
};

export default Dashboard;