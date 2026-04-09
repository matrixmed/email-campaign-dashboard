import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import _ from 'lodash';

const LINKEDIN_PROFILE_BLOB_URL = 'https://emaildash.blob.core.windows.net/json-data/linkedin_profile_metrics.json?sp=r&st=2026-03-03T19:38:32Z&se=2027-08-05T02:53:32Z&spr=https&sv=2024-11-04&sr=b&sig=gCWLltCNiATBL6XysEg4WNh4JW%2FMD%2B16BkTt8jOP914%3D';
const LINKEDIN_ENGAGEMENT_BLOB_URL = 'https://emaildash.blob.core.windows.net/json-data/linkedin_engagement_metrics.json?sp=r&st=2026-03-03T19:33:54Z&se=2028-03-22T02:48:54Z&spr=https&sv=2024-11-04&sr=b&sig=rAHmId4vA4G20FmRltPMwqoFMmpmQEmD1Y8CbUsZiU0%3D';
const FB_PROFILE_BLOB_URL = 'https://emaildash.blob.core.windows.net/json-data/facebook_profile_metrics.json?sp=r&st=2026-02-18T21:02:49Z&se=2028-05-21T04:17:49Z&spr=https&sv=2024-11-04&sr=b&sig=uE7Yej8V8qJ6W3FKIzWkexVON7c074h9Xnkd1RWqOPE%3D';
const FB_ENGAGEMENT_BLOB_URL = 'https://emaildash.blob.core.windows.net/json-data/facebook_engagement_metrics.json?sp=r&st=2026-02-18T21:03:59Z&se=2028-05-17T04:18:59Z&spr=https&sv=2024-11-04&sr=b&sig=mZyVxrFi1U5Z234HHVICAxysq73m14Jpm3r%2BzCOzvKs%3D';
const IG_PROFILE_BLOB_URL = 'https://emaildash.blob.core.windows.net/json-data/instagram_profile_metrics.json?sp=r&st=2026-02-18T21:03:17Z&se=2028-05-27T04:18:17Z&spr=https&sv=2024-11-04&sr=b&sig=Iu%2B57JgpeateOx9zTPFEMnOEUMMFA8JMsXX8OPz5SXY%3D';
const IG_ENGAGEMENT_BLOB_URL = 'https://emaildash.blob.core.windows.net/json-data/instagram_engagement_metrics.json?sp=r&st=2026-02-18T21:03:38Z&se=2028-05-16T04:18:38Z&spr=https&sv=2024-11-04&sr=b&sig=ZkHZS8lQQmkvTGjkxy3fFZVUtWNO5WGMOazVdkPNYVI%3D';

const CHANNEL_DISPLAY = {
  'matrix': 'Matrix',
  'oncology': 'Oncology',
  'icns': 'ICNS',
  'jcad': 'JCAD',
  'nppa': 'NPPA',
};

const CHANNEL_COLORS = {
  'Matrix': '#0ff',
  'Oncology': '#ff6b6b',
  'ICNS': '#38bdf8',
  'JCAD': '#ffd93d',
  'NPPA': '#8b5cf6',
};

const PLATFORM_COLORS = {
  linkedin: '#0a66c2',
  facebook: '#1877f2',
  instagram: '#e4405f',
};

const PLATFORM_GRADIENTS = {
  linkedin: 'linear-gradient(135deg, rgba(10, 102, 194, 0.15), rgba(10, 102, 194, 0.05))',
  facebook: 'linear-gradient(135deg, rgba(24, 119, 242, 0.15), rgba(24, 119, 242, 0.05))',
  instagram: 'linear-gradient(135deg, rgba(228, 64, 95, 0.15), rgba(228, 64, 95, 0.05))',
};

const PLATFORM_ICONS = {
  linkedin: 'in',
  facebook: 'f',
  instagram: 'IG',
};

const getChannelName = (key) => CHANNEL_DISPLAY[key] || key.charAt(0).toUpperCase() + key.slice(1);

const SocialProfileInsights = ({ searchTerm = '', activeSection = 'followers' }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [linkedinData, setLinkedinData] = useState({});
  const [facebookData, setFacebookData] = useState({});
  const [instagramData, setInstagramData] = useState({});
  const [growthPlatform, setGrowthPlatform] = useState('linkedin');
  const [pageViewPlatform, setPageViewPlatform] = useState('linkedin');
  const [demoChannel, setDemoChannel] = useState('');
  const [igDemoChannel, setIgDemoChannel] = useState('');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setIsLoading(true);
    const cacheBuster = `&_t=${Date.now()}`;

    try {
      const [liProfileRes, liEngRes, fbProfileRes, fbEngRes, igProfileRes, igEngRes] = await Promise.all([
        fetch(LINKEDIN_PROFILE_BLOB_URL + cacheBuster).catch(() => null),
        fetch(LINKEDIN_ENGAGEMENT_BLOB_URL + cacheBuster).catch(() => null),
        fetch(FB_PROFILE_BLOB_URL + cacheBuster).catch(() => null),
        fetch(FB_ENGAGEMENT_BLOB_URL + cacheBuster).catch(() => null),
        fetch(IG_PROFILE_BLOB_URL + cacheBuster).catch(() => null),
        fetch(IG_ENGAGEMENT_BLOB_URL + cacheBuster).catch(() => null),
      ]);

      const liProfile = liProfileRes?.ok ? await liProfileRes.json() : {};
      const liEng = liEngRes?.ok ? await liEngRes.json() : {};
      const liMerged = { companies: {} };
      const liKeys = new Set([...Object.keys(liProfile.companies || {}), ...Object.keys(liEng.companies || {})]);
      liKeys.forEach(key => {
        liMerged.companies[key] = { ...(liProfile.companies || {})[key], ...(liEng.companies || {})[key] };
      });
      setLinkedinData(liMerged);

      const fbProfile = fbProfileRes?.ok ? await fbProfileRes.json() : {};
      const fbEng = fbEngRes?.ok ? await fbEngRes.json() : {};
      const fbMerged = { companies: {} };
      const fbKeys = new Set([...Object.keys(fbProfile.companies || {}), ...Object.keys(fbEng.companies || {})]);
      fbKeys.forEach(key => {
        fbMerged.companies[key] = { ...(fbProfile.companies || {})[key], ...(fbEng.companies || {})[key] };
      });
      setFacebookData(fbMerged);

      const igProfile = igProfileRes?.ok ? await igProfileRes.json() : {};
      const igEng = igEngRes?.ok ? await igEngRes.json() : {};
      const igMerged = { companies: {} };
      const igKeys = new Set([...Object.keys(igProfile.companies || {}), ...Object.keys(igEng.companies || {})]);
      igKeys.forEach(key => {
        igMerged.companies[key] = { ...(igProfile.companies || {})[key], ...(igEng.companies || {})[key] };
      });
      setInstagramData(igMerged);

      const firstLiKey = Object.keys(liMerged.companies || {})[0] || '';
      const firstIgKey = Object.keys(igMerged.companies || {})[0] || '';
      setDemoChannel(firstLiKey);
      setIgDemoChannel(firstIgKey);
    } catch (err) {
    }
    setIsLoading(false);
  };

  const followersByPlatform = useMemo(() => {
    const platforms = [
      { key: 'linkedin', label: 'LinkedIn', data: linkedinData, getFollowers: (ch) => ch.total_followers || 0 },
      { key: 'facebook', label: 'Facebook', data: facebookData, getFollowers: (ch) => ch.followers_count || ch.fan_count || 0 },
      { key: 'instagram', label: 'Instagram', data: instagramData, getFollowers: (ch) => ch.followers_count || 0 },
    ];

    return platforms.map(p => {
      const channels = [];
      let total = 0;
      Object.entries(p.data.companies || {}).forEach(([key, ch]) => {
        const followers = p.getFollowers(ch);
        total += followers;
        channels.push({ name: getChannelName(key), followers });
      });
      channels.sort((a, b) => b.followers - a.followers);
      return { ...p, channels, total };
    }).filter(p => p.total > 0);
  }, [linkedinData, facebookData, instagramData]);

  const grandTotal = useMemo(() => {
    return followersByPlatform.reduce((sum, p) => sum + p.total, 0);
  }, [followersByPlatform]);

  const growthChartData = useMemo(() => {
    const dataSource = growthPlatform === 'linkedin' ? linkedinData : facebookData;
    const companies = dataSource.companies || {};
    const dateMap = {};

    Object.entries(companies).forEach(([key, ch]) => {
      const dailyData = growthPlatform === 'linkedin'
        ? (ch.follower_daily || [])
        : (ch.daily_followers || []);

      dailyData.forEach(d => {
        const date = d.date || d.end_time?.split('T')[0];
        if (!date) return;
        if (!dateMap[date]) dateMap[date] = { date };
        const channelName = getChannelName(key);
        if (growthPlatform === 'linkedin') {
          dateMap[date][channelName] = (d.organic_follower_gain || 0) + (d.paid_follower_gain || 0);
        } else {
          dateMap[date][channelName] = d.page_follows || 0;
        }
      });
    });

    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date)).slice(-90);
  }, [growthPlatform, linkedinData, facebookData]);

  const growthInsights = useMemo(() => {
    const dataSource = growthPlatform === 'linkedin' ? linkedinData : facebookData;
    const companies = dataSource.companies || {};
    let totalOrganic = 0, totalPaid = 0, totalDays = 0;

    Object.entries(companies).forEach(([, ch]) => {
      const dailyData = growthPlatform === 'linkedin'
        ? (ch.follower_daily || [])
        : (ch.daily_followers || []);
      const recent = dailyData.slice(-90);
      totalDays = Math.max(totalDays, recent.length);
      recent.forEach(d => {
        if (growthPlatform === 'linkedin') {
          totalOrganic += d.organic_follower_gain || 0;
          totalPaid += d.paid_follower_gain || 0;
        } else {
          totalOrganic += d.page_follows || 0;
        }
      });
    });

    return {
      totalOrganic,
      totalPaid,
      avgDaily: totalDays > 0 ? ((totalOrganic + totalPaid) / totalDays).toFixed(1) : '0',
    };
  }, [growthPlatform, linkedinData, facebookData]);

  const pageViewChartData = useMemo(() => {
    const dataSource = pageViewPlatform === 'linkedin' ? linkedinData : facebookData;
    const companies = dataSource.companies || {};
    const dateMap = {};

    Object.entries(companies).forEach(([key, ch]) => {
      const dailyViews = ch.daily_page_views || [];
      dailyViews.forEach(d => {
        const date = d.date || d.end_time?.split('T')[0];
        if (!date) return;
        if (!dateMap[date]) dateMap[date] = { date };
        const channelName = getChannelName(key);
        dateMap[date][channelName] = pageViewPlatform === 'linkedin'
          ? (d.all_page_views || 0)
          : (d.page_views_total || 0);
      });
    });

    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date)).slice(-90);
  }, [pageViewPlatform, linkedinData, facebookData]);

  const linkedinDemoData = useMemo(() => {
    const ch = (linkedinData.companies || {})[demoChannel];
    if (!ch?.follower_demographics) return null;
    const demo = ch.follower_demographics;

    const processCategory = (data) => {
      if (!data) return [];
      return Object.entries(data)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    };

    return {
      byFunction: processCategory(demo.by_function),
      bySeniority: processCategory(demo.by_seniority),
      byIndustry: processCategory(demo.by_industry),
      byCountry: processCategory(demo.by_country),
    };
  }, [linkedinData, demoChannel]);

  const igDemoData = useMemo(() => {
    const ch = (instagramData.companies || {})[igDemoChannel];
    if (!ch?.audience_demographics) return null;
    const demo = ch.audience_demographics;

    const processCategory = (data) => {
      if (!data) return [];
      return Object.entries(data)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    };

    return {
      byCity: processCategory(demo.by_city || demo.city),
      byCountry: processCategory(demo.by_country || demo.country),
      byAge: processCategory(demo.by_age || demo.age),
      byGender: processCategory(demo.by_gender || demo.gender),
    };
  }, [instagramData, igDemoChannel]);

  const getChannelKeys = (data) => Object.keys(data.companies || {});

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const renderMiniBarSection = (title, items) => {
    if (!items || items.length === 0) return null;
    const maxCount = Math.max(...items.map(i => i.count));
    const total = items.reduce((s, i) => s + i.count, 0);

    return (
      <div className="sp-demo-category">
        <div className="sp-demo-category-title">{title}</div>
        <div className="sp-demo-bars">
          {items.map((item, idx) => {
            const pct = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
            const barWidth = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            return (
              <div className="sp-demo-bar-row" key={idx}>
                <div className="sp-demo-bar-label">{item.name}</div>
                <div className="sp-demo-bar-track">
                  <div className="sp-demo-bar-fill" style={{ width: `${barWidth}%` }} />
                </div>
                <div className="sp-demo-bar-value">{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="ja-custom-tooltip">
        <p className="ja-tooltip-title">{label}</p>
        {payload.map((entry, idx) => (
          <div key={idx} className="ja-tooltip-row">
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span>{formatNumber(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="ja-chart-container">
        <div className="loading-container">
          <div className="spinner">
            <div></div><div></div><div></div><div></div><div></div><div></div>
          </div>
          <p>Loading social profile data...</p>
        </div>
      </div>
    );
  }

  const liChannelKeys = getChannelKeys(linkedinData);
  const fbChannelKeys = getChannelKeys(facebookData);
  const igChannelKeys = getChannelKeys(instagramData);
  const growthChannelKeys = growthPlatform === 'linkedin' ? liChannelKeys : fbChannelKeys;
  const pvChannelKeys = pageViewPlatform === 'linkedin' ? liChannelKeys : fbChannelKeys;

  return (
    <div className="social-profile-insights">
      <div style={{ display: activeSection === 'followers' ? 'block' : 'none' }}>
        <div className="sp-followers-overview">
          <div className="sp-grand-total">
            <div className="sp-grand-total-value">{formatNumber(grandTotal)}</div>
            <div className="sp-grand-total-label">Total Followers Across All Platforms</div>
          </div>

          <div className="sp-platform-cards">
            {followersByPlatform.map(platform => (
              <div
                key={platform.key}
                className="sp-platform-card"
                style={{
                  background: PLATFORM_GRADIENTS[platform.key],
                  borderColor: `${PLATFORM_COLORS[platform.key]}33`,
                }}
              >
                <div className="sp-platform-card-header">
                  <div className="sp-platform-icon" style={{ background: PLATFORM_COLORS[platform.key] }}>
                    {PLATFORM_ICONS[platform.key]}
                  </div>
                  <div className="sp-platform-card-title">
                    <div className="sp-platform-name">{platform.label}</div>
                    <div className="sp-platform-total" style={{ color: PLATFORM_COLORS[platform.key] }}>
                      {formatNumber(platform.total)}
                    </div>
                  </div>
                </div>

                <div className="sp-platform-channels">
                  {platform.channels.map((ch, idx) => {
                    const pct = platform.total > 0 ? (ch.followers / platform.total) * 100 : 0;
                    return (
                      <div key={idx} className="sp-channel-row">
                        <div className="sp-channel-info">
                          <span className="sp-channel-dot" style={{ background: CHANNEL_COLORS[ch.name] || '#666' }}></span>
                          <span className="sp-channel-name">{ch.name}</span>
                        </div>
                        <div className="sp-channel-bar-wrapper">
                          <div
                            className="sp-channel-bar"
                            style={{
                              width: `${pct}%`,
                              background: PLATFORM_COLORS[platform.key],
                              opacity: 0.6,
                            }}
                          />
                        </div>
                        <span className="sp-channel-count">{formatNumber(ch.followers)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: activeSection === 'growth' ? 'block' : 'none' }}>
        <div className="ja-chart-container" style={{ marginBottom: '24px' }}>
          <div className="sp-section-header">
            <h4>Follower Growth <span className="sp-section-sub">(last 90 days)</span></h4>
            <div className="ja-toggle-group">
              <button className={`ja-toggle-btn ${growthPlatform === 'linkedin' ? 'active' : ''}`} onClick={() => setGrowthPlatform('linkedin')}>LinkedIn</button>
              <button className={`ja-toggle-btn ${growthPlatform === 'facebook' ? 'active' : ''}`} onClick={() => setGrowthPlatform('facebook')}>Facebook</button>
            </div>
          </div>

          {growthChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={growthChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#888" tick={{ fontSize: 11, fill: '#888' }} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
                <YAxis stroke="#888" tick={{ fontSize: 12, fill: '#888' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {growthChannelKeys.map(key => (
                  <Line key={key} type="monotone" dataKey={getChannelName(key)} stroke={CHANNEL_COLORS[getChannelName(key)] || '#0ff'} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data" style={{ minHeight: '200px' }}>No daily follower data available</div>
          )}

          <div className="sp-insight-cards">
            <div className="sp-insight-card">
              <div className="sp-insight-value">{formatNumber(growthInsights.totalOrganic)}</div>
              <div className="sp-insight-label">{growthPlatform === 'linkedin' ? 'Organic Gain' : 'Total Follows'}</div>
            </div>
            {growthPlatform === 'linkedin' && (
              <div className="sp-insight-card">
                <div className="sp-insight-value">{formatNumber(growthInsights.totalPaid)}</div>
                <div className="sp-insight-label">Paid Gain</div>
              </div>
            )}
            <div className="sp-insight-card">
              <div className="sp-insight-value">{growthInsights.avgDaily}/day</div>
              <div className="sp-insight-label">Avg Daily Growth</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: activeSection === 'pageviews' ? 'block' : 'none' }}>
        <div className="ja-chart-container" style={{ marginBottom: '24px' }}>
          <div className="sp-section-header">
            <h4>Page Views <span className="sp-section-sub">(last 90 days)</span></h4>
            <div className="ja-toggle-group">
              <button className={`ja-toggle-btn ${pageViewPlatform === 'linkedin' ? 'active' : ''}`} onClick={() => setPageViewPlatform('linkedin')}>LinkedIn</button>
              <button className={`ja-toggle-btn ${pageViewPlatform === 'facebook' ? 'active' : ''}`} onClick={() => setPageViewPlatform('facebook')}>Facebook</button>
            </div>
          </div>

          {pageViewChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={pageViewChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#888" tick={{ fontSize: 11, fill: '#888' }} tickFormatter={d => d.slice(5)} interval="preserveStartEnd" />
                <YAxis stroke="#888" tick={{ fontSize: 12, fill: '#888' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {pvChannelKeys.map(key => (
                  <Line key={key} type="monotone" dataKey={getChannelName(key)} stroke={CHANNEL_COLORS[getChannelName(key)] || '#0ff'} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data" style={{ minHeight: '200px' }}>No page view data available</div>
          )}
        </div>
      </div>

      <div style={{ display: activeSection === 'linkedin-demo' ? 'block' : 'none' }}>
        {liChannelKeys.length > 0 ? (
          <div className="ja-chart-container" style={{ marginBottom: '24px' }}>
            <div className="sp-section-header">
              <h4>LinkedIn Demographics</h4>
              {liChannelKeys.length > 1 && (
                <select className="ja-select" value={demoChannel} onChange={e => setDemoChannel(e.target.value)}>
                  {liChannelKeys.map(key => (
                    <option key={key} value={key}>{getChannelName(key)}</option>
                  ))}
                </select>
              )}
            </div>

            {linkedinDemoData ? (
              <div className="sp-demo-grid">
                {renderMiniBarSection('By Function', linkedinDemoData.byFunction)}
                {renderMiniBarSection('By Seniority', linkedinDemoData.bySeniority)}
                {renderMiniBarSection('By Industry', linkedinDemoData.byIndustry)}
                {renderMiniBarSection('By Country', linkedinDemoData.byCountry)}
              </div>
            ) : (
              <div className="no-data" style={{ minHeight: '150px' }}>No demographic data available for this channel</div>
            )}
          </div>
        ) : (
          <div className="ja-chart-container">
            <div className="no-data" style={{ minHeight: '200px' }}>No LinkedIn data available</div>
          </div>
        )}
      </div>

      <div style={{ display: activeSection === 'instagram-demo' ? 'block' : 'none' }}>
        {igChannelKeys.length > 0 ? (
          <div className="ja-chart-container">
            <div className="sp-section-header">
              <h4>Instagram Audience</h4>
              {igChannelKeys.length > 1 && (
                <select className="ja-select" value={igDemoChannel} onChange={e => setIgDemoChannel(e.target.value)}>
                  {igChannelKeys.map(key => (
                    <option key={key} value={key}>{getChannelName(key)}</option>
                  ))}
                </select>
              )}
            </div>

            {igDemoData ? (
              <div className="sp-demo-grid">
                {renderMiniBarSection('By City', igDemoData.byCity)}
                {renderMiniBarSection('By Country', igDemoData.byCountry)}
                {renderMiniBarSection('By Age', igDemoData.byAge)}
                {renderMiniBarSection('By Gender', igDemoData.byGender)}
              </div>
            ) : (
              <div className="no-data" style={{ minHeight: '150px' }}>No audience data available for this channel</div>
            )}
          </div>
        ) : (
          <div className="ja-chart-container">
            <div className="no-data" style={{ minHeight: '200px' }}>No Instagram data available</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialProfileInsights;