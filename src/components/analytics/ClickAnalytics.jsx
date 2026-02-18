import React, { useState, useEffect, useMemo } from 'react';
import '../../styles/ClickAnalytics.css';
import '../../styles/SectionHeaders.css';
import { matchesSearchTerm } from '../../utils/searchUtils';
import { classifyCampaign, stripAbGroup } from '../../utils/campaignClassifier';

const METADATA_BLOB_URL = "https://emaildash.blob.core.windows.net/json-data/completed_campaign_metadata.json?sp=r&st=2025-09-03T19:53:53Z&se=2027-09-29T04:08:53Z&spr=https&sv=2024-11-04&sr=b&sig=JWxxARzWg4FN%2FhGa17O3RGffl%2BVyJ%2FkE3npL9Iws%2FIs%3D";

const combineDeploymentClicks = (deployments) => {
  const allLinks = {};
  let totalClicksAfterFiltering = 0;
  let totalBotClicksRemoved = 0;

  deployments.forEach(d => {
    if (d.what_was_clicked) {
      totalClicksAfterFiltering += d.what_was_clicked.total_clicks_after_filtering || 0;
      totalBotClicksRemoved += d.what_was_clicked.total_bot_clicks_removed || 0;
      (d.what_was_clicked.links || []).forEach(link => {
        if (allLinks[link.url]) {
          allLinks[link.url].clicks += link.clicks;
        } else {
          allLinks[link.url] = { ...link };
        }
      });
    }
  });

  const linksArray = Object.values(allLinks).sort((a, b) => b.clicks - a.clicks);
  return {
    links: linksArray,
    total_clicks_after_filtering: totalClicksAfterFiltering,
    total_bot_clicks_removed: totalBotClicksRemoved
  };
};

const processMetadata = (rawData) => {
  const groups = {};
  rawData.forEach(item => {
    const key = stripAbGroup(item.base_campaign_name || item.campaign_name || '');
    if (!key) return;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });

  const globalLinks = {};
  const byCampaign = [];
  const domainMap = {};
  let totalClicks = 0;
  let totalCampaigns = 0;

  Object.entries(groups).forEach(([baseName, deployments]) => {
    const combined = combineDeploymentClicks(deployments);
    if (combined.links.length === 0) return;

    totalCampaigns++;
    const classification = classifyCampaign(baseName);
    const campaignTotal = combined.total_clicks_after_filtering;
    totalClicks += campaignTotal;

    const campaignLinks = combined.links.map(l => ({
      url: l.url,
      total_clicks: l.clicks
    }));

    byCampaign.push({
      campaign_name: baseName,
      bucket: classification.bucket,
      topic: classification.topic,
      total_clicks: campaignTotal,
      bot_clicks_removed: combined.total_bot_clicks_removed,
      links: campaignLinks
    });

    combined.links.forEach(link => {
      if (globalLinks[link.url]) {
        globalLinks[link.url].total_clicks += link.clicks;
        globalLinks[link.url].campaigns_appeared_in += 1;
      } else {
        globalLinks[link.url] = {
          url: link.url,
          total_clicks: link.clicks,
          campaigns_appeared_in: 1
        };
      }

      try {
        const urlObj = new URL(link.url);
        const domain = urlObj.hostname;
        if (domainMap[domain]) {
          domainMap[domain].total_clicks += link.clicks;
        } else {
          domainMap[domain] = { domain, total_clicks: link.clicks };
        }
      } catch (e) {}
    });
  });

  const topLinks = Object.values(globalLinks).sort((a, b) => b.total_clicks - a.total_clicks).slice(0, 100);
  const byDomain = Object.values(domainMap).sort((a, b) => b.total_clicks - a.total_clicks).slice(0, 50);
  byCampaign.sort((a, b) => b.total_clicks - a.total_clicks);

  return {
    top_links: topLinks,
    by_campaign: byCampaign,
    by_domain: byDomain,
    summary: {
      total_clicks: totalClicks,
      total_unique_urls: topLinks.length,
      total_campaigns: totalCampaigns
    }
  };
};

const INITIAL_ROWS = 25;
const INITIAL_LINKS = 5;

const ClickAnalytics = ({ searchTerm = '' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('top-links');
  const [expandedCampaign, setExpandedCampaign] = useState(null);
  const [showMoreTopLinks, setShowMoreTopLinks] = useState(false);
  const [showMoreCampaigns, setShowMoreCampaigns] = useState(false);
  const [showMoreDomains, setShowMoreDomains] = useState(false);
  const [expandedLinkLimits, setExpandedLinkLimits] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(METADATA_BLOB_URL);
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const rawData = await response.json();
      const processed = processMetadata(rawData);
      setData(processed);
    } catch (err) {
      setError('Failed to load click analytics data.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTopLinks = useMemo(() => {
    if (!data?.top_links) return [];
    if (!searchTerm.trim()) return data.top_links;
    return data.top_links.filter(l => matchesSearchTerm(l.url, searchTerm));
  }, [data, searchTerm]);

  const filteredCampaigns = useMemo(() => {
    if (!data?.by_campaign) return [];
    if (!searchTerm.trim()) return data.by_campaign;
    return data.by_campaign.filter(c =>
      matchesSearchTerm(c.campaign_name, searchTerm) || matchesSearchTerm(c.bucket, searchTerm) || matchesSearchTerm(c.topic, searchTerm)
    );
  }, [data, searchTerm]);

  const filteredDomains = useMemo(() => {
    if (!data?.by_domain) return [];
    if (!searchTerm.trim()) return data.by_domain;
    return data.by_domain.filter(d => matchesSearchTerm(d.domain, searchTerm));
  }, [data, searchTerm]);

  if (loading) {
    return (
      <div className="ca-container">
        <div className="sb-loader">
          <div className="sb-spinner"><div></div><div></div><div></div><div></div><div></div><div></div></div>
          <p>Loading click analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="ca-container"><div className="ca-empty">{error}</div></div>;
  }

  const visibleTopLinks = showMoreTopLinks ? filteredTopLinks : filteredTopLinks.slice(0, INITIAL_ROWS);
  const topLinksRemaining = filteredTopLinks.length - INITIAL_ROWS;

  const visibleCampaigns = showMoreCampaigns ? filteredCampaigns : filteredCampaigns.slice(0, INITIAL_ROWS);
  const campaignsRemaining = filteredCampaigns.length - INITIAL_ROWS;

  const visibleDomains = showMoreDomains ? filteredDomains : filteredDomains.slice(0, INITIAL_ROWS);
  const domainsRemaining = filteredDomains.length - INITIAL_ROWS;

  return (
    <div className="ca-container">
      <div className="section-header-bar">
        <h3>Click Analytics</h3>
        {data?.summary && (
          <div className="section-header-stats">
            <div className="section-header-stat-item">
              <span className="section-header-stat-label">Total Clicks</span>
              <span className="section-header-stat-value">{data.summary.total_clicks?.toLocaleString()}</span>
            </div>
            <div className="section-header-stat-item">
              <span className="section-header-stat-label">Unique URLs</span>
              <span className="section-header-stat-value">{data.summary.total_unique_urls}</span>
            </div>
            <div className="section-header-stat-item">
              <span className="section-header-stat-label">Campaigns</span>
              <span className="section-header-stat-value">{data.summary.total_campaigns}</span>
            </div>
          </div>
        )}
      </div>

      <div className="viz-tabs">
        <button className={`viz-tab ${activeTab === 'top-links' ? 'active' : ''}`} onClick={() => setActiveTab('top-links')}>Top Links</button>
        <button className={`viz-tab ${activeTab === 'by-campaign' ? 'active' : ''}`} onClick={() => setActiveTab('by-campaign')}>By Campaign</button>
        <button className={`viz-tab ${activeTab === 'by-domain' ? 'active' : ''}`} onClick={() => setActiveTab('by-domain')}>By Domain</button>
      </div>

      {activeTab === 'top-links' && (
        <div className="ca-table-section">
          <table className="ca-table">
            <thead>
              <tr>
                <th>URL</th>
                <th>Total Clicks</th>
                <th>Campaigns</th>
              </tr>
            </thead>
            <tbody>
              {visibleTopLinks.map((link, i) => (
                <tr key={i}>
                  <td className="ca-url-cell" title={link.url}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer">{link.url}</a>
                  </td>
                  <td>{link.total_clicks?.toLocaleString()}</td>
                  <td>{link.campaigns_appeared_in}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {topLinksRemaining > 0 && (
            <button className="ca-show-more" onClick={() => setShowMoreTopLinks(!showMoreTopLinks)}>
              {showMoreTopLinks ? 'Show less' : `Show ${topLinksRemaining} more`}
            </button>
          )}
        </div>
      )}

      {activeTab === 'by-campaign' && (
        <div className="ca-table-section">
          <table className="ca-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Type</th>
                <th>Clicks</th>
                <th>Bot Removed</th>
                <th>Links</th>
              </tr>
            </thead>
            <tbody>
              {visibleCampaigns.map((campaign, i) => {
                const isExpanded = expandedCampaign === i;
                const linkLimit = expandedLinkLimits[i] || INITIAL_LINKS;
                const visibleLinks = campaign.links?.slice(0, linkLimit) || [];
                const remainingLinks = (campaign.links?.length || 0) - linkLimit;

                return (
                  <React.Fragment key={i}>
                    <tr
                      className={`ca-clickable-row ${isExpanded ? 'ca-row-expanded' : ''}`}
                      onClick={() => setExpandedCampaign(isExpanded ? null : i)}
                    >
                      <td className="ca-accent-cell">{campaign.campaign_name}</td>
                      <td><span className="ca-type-badge">{campaign.bucket}</span></td>
                      <td>{campaign.total_clicks?.toLocaleString()}</td>
                      <td>{campaign.bot_clicks_removed?.toLocaleString()}</td>
                      <td>{campaign.links?.length}</td>
                    </tr>
                    {isExpanded && (
                      <tr className="ca-expanded-row">
                        <td colSpan="5">
                          <div className="ca-expanded-links">
                            {visibleLinks.map((link, j) => (
                              <div className="ca-link-detail" key={j}>
                                <span className="ca-link-url" title={link.url}>{link.url}</span>
                                <span className="ca-link-clicks">{link.total_clicks?.toLocaleString()} clicks</span>
                              </div>
                            ))}
                            {remainingLinks > 0 && (
                              <button
                                className="ca-show-more-links"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedLinkLimits(prev => ({ ...prev, [i]: (prev[i] || INITIAL_LINKS) + 20 }));
                                }}
                              >
                                Show {remainingLinks} more links
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {campaignsRemaining > 0 && (
            <button className="ca-show-more" onClick={() => setShowMoreCampaigns(!showMoreCampaigns)}>
              {showMoreCampaigns ? 'Show less' : `Show ${campaignsRemaining} more`}
            </button>
          )}
        </div>
      )}

      {activeTab === 'by-domain' && (
        <div className="ca-table-section">
          <table className="ca-table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Total Clicks</th>
              </tr>
            </thead>
            <tbody>
              {visibleDomains.map((domain, i) => (
                <tr key={i}>
                  <td className="ca-accent-cell">{domain.domain}</td>
                  <td>{domain.total_clicks?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {domainsRemaining > 0 && (
            <button className="ca-show-more" onClick={() => setShowMoreDomains(!showMoreDomains)}>
              {showMoreDomains ? 'Show less' : `Show ${domainsRemaining} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ClickAnalytics;