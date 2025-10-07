import React, { useState, useEffect } from 'react';
import _ from 'lodash';
import LiveCampaignMetrics from '../components/campaign/LiveCampaignMetrics';
import MetricsTable from '../components/campaign/MetricsTable';
import '../styles/CampaignPerformancePage.css';

const CampaignPerformancePage = () => {
  const [metricsData, setMetricsData] = useState([]);
  const [rawFilteredData, setRawFilteredData] = useState([]);
  const [processedData, setProcessedData] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedDeployment, setSelectedDeployment] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [liveSearchTerm, setLiveSearchTerm] = useState('');

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
    async function fetchBlobData() {
      const blobUrl = "https://emaildash.blob.core.windows.net/json-data/completed_campaign_metrics.json?sp=r&st=2025-05-08T18:43:13Z&se=2027-06-26T02:43:13Z&spr=https&sv=2024-11-04&sr=b&sig=%2FuZDifPilE4VzfTl%2BWjUcSmzP9M283h%2B8gH9Q1V3TUg%3D";
      try {
        const response = await fetch(blobUrl);
        const jsonData = await response.json();
        setMetricsData(jsonData);
        setRawFilteredData(jsonData);
      } catch (error) {
        console.error('Error fetching metrics data:', error);
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

  const handleSearchChange = (e) => {
    const searchValue = e.target.value.toLowerCase();
    setSearch(searchValue);
    setLiveSearchTerm(searchValue);
    setRawFilteredData(metricsData.filter(item =>
      searchValue.split(' ').every(word => item.Campaign.toLowerCase().includes(word))
    ));
    setCurrentPage(1);
  };

  const handleColumnChange = (column, metric) => {
    setSelectedColumn(prev => ({ ...prev, [column]: metric }));
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

  const sortedData = [...processedData].sort((a, b) => new Date(b.Send_Date) - new Date(a.Send_Date));
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentPageData = sortedData.slice(startIndex, startIndex + rowsPerPage);

  const calculateAggregateMetrics = () => {
    if (!processedData || processedData.length === 0) {
      return {
        uniqueOpenRate: 0,
        totalOpenRate: 0,
        uniqueClickRate: 0,
        totalClickRate: 0
      };
    }

    const totalDelivered = _.sumBy(processedData, 'Delivered');
    const totalUniqueOpens = _.sumBy(processedData, 'Unique_Opens');
    const totalTotalOpens = _.sumBy(processedData, 'Total_Opens');
    const totalUniqueClicks = _.sumBy(processedData, 'Unique_Clicks');
    const totalTotalClicks = _.sumBy(processedData, 'Total_Clicks');

    return {
      uniqueOpenRate: totalDelivered > 0 ? (totalUniqueOpens / totalDelivered * 100) : 0,
      totalOpenRate: totalDelivered > 0 ? (totalTotalOpens / totalDelivered * 100) : 0,
      uniqueClickRate: totalUniqueOpens > 0 ? (totalUniqueClicks / totalUniqueOpens * 100) : 0,
      totalClickRate: totalTotalOpens > 0 ? (totalTotalClicks / totalTotalOpens * 100) : 0
    };
  };

  const aggregateMetrics = calculateAggregateMetrics();

  return (
    <div className="campaign-performance-page">
      <div className="campaign-page-header">
        <h1>Campaign Performance</h1>
        <div className="campaign-search-bar">
          <input
            type="text"
            placeholder="Search campaigns"
            value={search}
            onChange={handleSearchChange}
            className="campaign-search-input"
          />
        </div>
      </div>

      <div className="campaign-metrics-summary">
        <div className="metric-summary-card">
          <div className="metric-summary-label">Unique Open Rate</div>
          <div className="metric-summary-value">{aggregateMetrics.uniqueOpenRate.toFixed(2)}%</div>
        </div>
        <div className="metric-summary-card">
          <div className="metric-summary-label">Total Open Rate</div>
          <div className="metric-summary-value">{aggregateMetrics.totalOpenRate.toFixed(2)}%</div>
        </div>
        <div className="metric-summary-card">
          <div className="metric-summary-label">Unique Click Rate</div>
          <div className="metric-summary-value">{aggregateMetrics.uniqueClickRate.toFixed(2)}%</div>
        </div>
        <div className="metric-summary-card">
          <div className="metric-summary-label">Total Click Rate</div>
          <div className="metric-summary-value">{aggregateMetrics.totalClickRate.toFixed(2)}%</div>
        </div>
      </div>

      <MetricsTable
        currentRows={currentPageData}
        processedFullData={processedData}
        selectedColumn={selectedColumn}
        handleColumnChange={handleColumnChange}
        currentPage={currentPage}
        rowsPerPage={rowsPerPage}
        handlePagination={handlePagination}
        availableMetrics={availableMetrics}
        totalPages={totalPages}
        handleRowsPerPageChange={handleRowsPerPageChange}
        selectedDeployment={selectedDeployment}
        handleDeploymentChange={handleDeploymentChange}
        search={search}
        handleSearchChange={handleSearchChange}
      />
      <LiveCampaignMetrics searchTerm={liveSearchTerm} />
    </div>
  );
};

export default CampaignPerformancePage;
