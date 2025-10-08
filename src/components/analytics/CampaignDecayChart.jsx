import React, { useState, useEffect } from 'react';

const CampaignDecayChart = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [decayData, setDecayData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (selectedCampaign) {
      fetchDecayData(selectedCampaign);
    }
  }, [selectedCampaign]);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/analytics/campaign-list');
      const data = await response.json();
      setCampaigns(data.campaigns);
      if (data.campaigns.length > 0) {
        setSelectedCampaign(data.campaigns[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    }
    setIsLoading(false);
  };

  const fetchDecayData = async (campaignId) => {
    try {
      const response = await fetch('/api/analytics/campaign-decay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: campaignId })
      });
      const data = await response.json();
      setDecayData(data);
    } catch (error) {
      console.error('Failed to fetch decay data:', error);
    }
  };

  const timeIntervals = [
    { label: '1 Hour', key: 'hour_1' },
    { label: '6 Hours', key: 'hour_6' },
    { label: '12 Hours', key: 'hour_12' },
    { label: '24 Hours', key: 'hour_24' },
    { label: '3 Days', key: 'day_3' },
    { label: '7 Days', key: 'day_7' },
    { label: '14 Days', key: 'day_14' },
    { label: '30 Days', key: 'day_30' }
  ];

  return (
    <div className="decay-chart-container">
      <div className="chart-controls">
        <div className="control-group">
          <label>Select Campaign</label>
          <select
            value={selectedCampaign || ''}
            onChange={(e) => setSelectedCampaign(e.target.value)}
          >
            {campaigns.map(campaign => (
              <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="chart-loading">Loading data...</div>
      ) : decayData ? (
        <div className="decay-wrapper">
          <div className="chart-title">Campaign Engagement Decay Analysis</div>
          <div className="decay-metrics">
            <div className="metric-card">
              <span className="metric-label">Total Sent</span>
              <span className="metric-value">{decayData.total_sent?.toLocaleString()}</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Final Engagement Rate</span>
              <span className="metric-value">{decayData.final_engagement_rate?.toFixed(1)}%</span>
            </div>
            <div className="metric-card">
              <span className="metric-label">Peak Engagement Window</span>
              <span className="metric-value">{decayData.peak_window}</span>
            </div>
          </div>
          <div className="decay-timeline">
            {timeIntervals.map((interval, idx) => {
              const value = decayData[interval.key] || 0;
              const widthPercent = (value / decayData.final_engagement_rate) * 100;
              return (
                <div key={interval.key} className="timeline-row">
                  <div className="timeline-label">{interval.label}</div>
                  <div className="timeline-bar-container">
                    <div
                      className="timeline-bar"
                      style={{ width: `${widthPercent}%` }}
                    >
                      <span className="bar-value">{value.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="decay-insights">
            <h3>Key Insights</h3>
            <ul>
              <li>{decayData.hour_24?.toFixed(1)}% of total engagement happens in first 24 hours</li>
              <li>Optimal resend window: {decayData.optimal_resend_window}</li>
              <li>Average time to engagement: {decayData.avg_time_to_engage}</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="no-data">No decay data available</div>
      )}
    </div>
  );
};

export default CampaignDecayChart;
