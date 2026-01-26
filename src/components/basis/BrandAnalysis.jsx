import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../../config/api';

const BrandAnalysis = ({ searchTerm, startDate = null, endDate = null }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let campaignUrl = `${API_BASE_URL}/api/basis/exchange-stats?group_by=campaign`;

      if (startDate) {
        campaignUrl += `&start_date=${startDate}`;
      }
      if (endDate) {
        campaignUrl += `&end_date=${endDate}`;
      }

      const campaignRes = await fetch(campaignUrl);
      const campaignData = await campaignRes.json();

      if (campaignData.status === 'success') {
        setCampaigns(campaignData.exchanges || campaignData.data || []);
        setSummary(campaignData.summary || {});
      }
    } catch (err) {
    }
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (num) => {
    if (!num && num !== 0) return '-';
    return '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const filteredCampaigns = searchTerm
    ? campaigns.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.brand?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : campaigns;

  if (loading) {
    return (
      <div className="exchange-scorecard">
        <div className="exchange-loading">
          <div className="loading-spinner"></div>
          <p>Loading campaign data...</p>
        </div>
      </div>
    );
  }

  if (filteredCampaigns.length === 0) {
    return (
      <div className="exchange-scorecard">
        <div className="exchange-empty">
          <h3>No Campaigns Found</h3>
          <p>No campaign data available for the selected timeframe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="brand-analysis">
      <div className="exchange-scorecard">
        <div className="exchange-header">
          <div className="exchange-header-left">
            <h2>Campaign Performance by Brand</h2>
          </div>
          <div className="exchange-summary-stats">
            <div className="exchange-stat">
              <span className="exchange-stat-value">{formatNumber(summary.total_impressions)}</span>
              <span className="exchange-stat-label">Impressions</span>
            </div>
            <div className="exchange-stat">
              <span className="exchange-stat-value">{formatNumber(summary.total_clicks)}</span>
              <span className="exchange-stat-label">Clicks</span>
            </div>
            <div className="exchange-stat">
              <span className="exchange-stat-value">{formatCurrency(summary.total_spend)}</span>
              <span className="exchange-stat-label">Spend</span>
            </div>
            <div className="exchange-stat">
              <span className="exchange-stat-value">{formatCurrency(summary.avg_ecpm)}</span>
              <span className="exchange-stat-label">Avg eCPM</span>
            </div>
            <div className="exchange-stat">
              <span className="exchange-stat-value">{summary.avg_ctr?.toFixed(3)}%</span>
              <span className="exchange-stat-label">Avg CTR</span>
            </div>
          </div>
        </div>

        <div className="exchange-table-container">
          <table className="exchange-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Brand</th>
                <th className="right">Impressions</th>
                <th className="right">Clicks</th>
                <th className="right">CTR</th>
                <th className="right">Spend</th>
                <th className="right">eCPM</th>
                <th className="right">eCPC</th>
                <th className="right">eCPM vs Avg</th>
                <th className="right">eCPC vs Avg</th>
              </tr>
            </thead>
            <tbody>
              {filteredCampaigns.map((campaign, idx) => (
                <tr key={idx}>
                  <td>
                    <div className="exchange-name-cell">
                      <span className="exchange-rank">{idx + 1}</span>
                      <span className="exchange-name" title={campaign.name}>
                        {campaign.name}
                      </span>
                    </div>
                  </td>
                  <td className="brand-col">{campaign.brand || '-'}</td>
                  <td className="right">{formatNumber(campaign.impressions)}</td>
                  <td className="right">{formatNumber(campaign.clicks)}</td>
                  <td className="right">{campaign.ctr?.toFixed(3)}%</td>
                  <td className="right">{formatCurrency(campaign.spend)}</td>
                  <td className="right">{formatCurrency(campaign.ecpm)}</td>
                  <td className="right">{formatCurrency(campaign.ecpc)}</td>
                  <td className={`right variance-cell ${campaign.vs_avg_ecpm < 0 ? 'positive' : campaign.vs_avg_ecpm > 30 ? 'negative' : ''}`}>
                    {campaign.vs_avg_ecpm != null ? ((campaign.vs_avg_ecpm > 0 ? '+' : '') + campaign.vs_avg_ecpm + '%') : '-'}
                  </td>
                  <td className={`right variance-cell ${campaign.vs_avg_ecpc < 0 ? 'positive' : campaign.vs_avg_ecpc > 30 ? 'negative' : ''}`}>
                    {campaign.vs_avg_ecpc != null ? ((campaign.vs_avg_ecpc > 0 ? '+' : '') + campaign.vs_avg_ecpc + '%') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BrandAnalysis;