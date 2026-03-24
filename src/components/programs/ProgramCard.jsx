import React, { useState, useCallback, useMemo } from 'react';
import { API_BASE_URL } from '../../config/api';

const fmt = (n) => n != null ? Number(n).toLocaleString() : '0';
const fmtPct = (n) => n != null ? Number(n).toFixed(2) + '%' : '0.00%';
const fmtCur = (n) => n != null ? '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '$0.00';
const fmtDur = (s) => { if (!s) return '0:00'; const m = Math.floor(s / 60); return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`; };
const fmtWatch = (h) => { if (!h || h === 0) return '0m'; if (h < 1) return `${Math.round(h * 60)}m`; return `${h.toFixed(1)}h`; };

const AggStat = ({ label, value }) => (
  <div className="pp-agg-stat">
    <span className="pp-agg-stat-label">{label}</span>
    <span className="pp-agg-stat-value">{value}</span>
  </div>
);

const SectionHeader = ({ label, isOpen, onToggle, children }) => (
  <div className={`pp-section-header-agg ${isOpen ? 'open' : ''}`} onClick={onToggle}>
    <span className={`pp-section-chevron ${isOpen ? 'open' : ''}`}>&#9662;</span>
    <h4 className="pp-section-title-serif">{label}</h4>
    <div className="pp-agg-stats-row">
      {children}
    </div>
  </div>
);

const useResolvedData = (items, allData) => {
  const itemsByType = useMemo(() => {
    const m = {};
    (items || []).forEach(item => {
      if (!m[item.item_type]) m[item.item_type] = [];
      m[item.item_type].push(item);
    });
    return m;
  }, [items]);

  const resolvedEmails = useMemo(() => {
    return (itemsByType['email_campaign'] || []).map(item => {
      const match = (allData.emailCampaigns || []).find(c => c.Campaign?.toLowerCase() === item.item_identifier?.toLowerCase());
      return { item, data: match };
    });
  }, [itemsByType, allData.emailCampaigns]);

  const resolvedBasisCampaigns = useMemo(() => {
    return (itemsByType['basis_campaign'] || []).map(item => {
      const match = (allData.basisCampaigns || []).find(c => c.id === item.item_identifier || c.name?.toLowerCase() === item.item_identifier?.toLowerCase());
      return { item, data: match };
    });
  }, [itemsByType, allData.basisCampaigns]);

  const resolvedBasisBrands = useMemo(() => {
    return (itemsByType['basis_brand'] || []).map(item => {
      const match = (allData.basisBrands || []).find(b => b.name?.toLowerCase() === item.item_identifier?.toLowerCase());
      return { item, data: match };
    });
  }, [itemsByType, allData.basisBrands]);

  const resolvedYtPlaylists = useMemo(() => {
    const playlists = allData.youtubeData?.playlists || {};
    const videos = allData.youtubeData?.videos || {};
    return (itemsByType['youtube_playlist'] || []).map(item => {
      const pl = playlists[item.item_identifier];
      if (!pl) return { item, data: null, videos: [] };
      const vids = (pl.videoIds || []).map(vid => videos[vid]).filter(Boolean);
      return { item, data: pl, videos: vids };
    });
  }, [itemsByType, allData.youtubeData]);

  const resolvedYtVideos = useMemo(() => {
    const videos = allData.youtubeData?.videos || {};
    return (itemsByType['youtube_video'] || []).map(item => {
      const v = videos[item.item_identifier];
      return { item, data: v || null };
    });
  }, [itemsByType, allData.youtubeData]);

  const resolvedSocialChannels = useMemo(() => {
    return (itemsByType['social_channel'] || []).map(item => {
      const [platform, channelKey] = item.item_identifier.split('_');
      let posts = [];
      if (platform === 'facebook') {
        posts = allData.facebookData?.companies?.[channelKey]?.posts || [];
      } else if (platform === 'linkedin') {
        posts = allData.linkedinData?.companies?.[channelKey]?.posts || [];
      } else {
        posts = allData.instagramData?.companies?.[channelKey]?.media || [];
      }
      return { item, platform, channelKey, posts };
    });
  }, [itemsByType, allData.facebookData, allData.instagramData, allData.linkedinData]);

  const resolvedFbPosts = useMemo(() => {
    return (itemsByType['facebook_post'] || []).map(item => {
      let match = null;
      const companies = allData.facebookData?.companies || {};
      for (const ch of Object.values(companies)) {
        const found = (ch.posts || []).find(p => String(p.post_id || p.id) === String(item.item_identifier));
        if (found) { match = found; break; }
      }
      return { item, data: match };
    });
  }, [itemsByType, allData.facebookData]);

  const resolvedIgPosts = useMemo(() => {
    return (itemsByType['instagram_post'] || []).map(item => {
      let match = null;
      const companies = allData.instagramData?.companies || {};
      for (const ch of Object.values(companies)) {
        const found = (ch.media || []).find(p => String(p.media_id || p.id) === String(item.item_identifier));
        if (found) { match = found; break; }
      }
      return { item, data: match };
    });
  }, [itemsByType, allData.instagramData]);

  const resolvedLiPosts = useMemo(() => {
    return (itemsByType['linkedin_post'] || []).map(item => {
      let match = null;
      const companies = allData.linkedinData?.companies || {};
      for (const ch of Object.values(companies)) {
        const found = (ch.posts || []).find(p => String(p.post_id || p.id) === String(item.item_identifier));
        if (found) { match = found; break; }
      }
      return { item, data: match };
    });
  }, [itemsByType, allData.linkedinData]);

  const resolvedPublications = useMemo(() => {
    const issues = allData.walsPublications || [];
    return (itemsByType['walsworth_publication'] || []).map(item => {
      const matched = issues.filter(i => i.publication === item.item_identifier);
      return { item, issues: matched };
    });
  }, [itemsByType, allData.walsPublications]);

  const resolvedIssues = useMemo(() => {
    const issues = allData.walsPublications || [];
    return (itemsByType['walsworth_issue'] || []).map(item => {
      const match = issues.find(i => (i.issue_id || i.issue_name || i.issue_number) === item.item_identifier);
      return { item, data: match };
    });
  }, [itemsByType, allData.walsPublications]);

  const resolvedGaProperties = useMemo(() => {
    const urls = allData.googleAnalytics || [];
    return (itemsByType['ga_property'] || []).map(item => {
      const matched = urls.filter(u => u.property_name === item.item_identifier);
      return { item, urls: matched };
    });
  }, [itemsByType, allData.googleAnalytics]);

  const resolvedGaUrls = useMemo(() => {
    const urls = allData.googleAnalytics || [];
    return (itemsByType['ga_url'] || []).map(item => {
      const match = urls.find(u => u.url === item.item_identifier);
      return { item, data: match };
    });
  }, [itemsByType, allData.googleAnalytics]);

  const emailAgg = useMemo(() => {
    const rows = resolvedEmails.filter(r => r.data);
    const n = rows.length || 1;
    return {
      count: resolvedEmails.length,
      sent: rows.reduce((s, r) => s + (Number(r.data.Sent) || 0), 0),
      delivered: rows.reduce((s, r) => s + (Number(r.data.Delivered) || 0), 0),
      uOpen: rows.reduce((s, r) => s + (Number(r.data.Unique_Open_Rate) || 0), 0) / n,
      tOpen: rows.reduce((s, r) => s + (Number(r.data.Total_Open_Rate) || 0), 0) / n,
      uClick: rows.reduce((s, r) => s + (Number(r.data.Unique_Click_Rate) || 0), 0) / n,
      tClick: rows.reduce((s, r) => s + (Number(r.data.Total_Click_Rate) || 0), 0) / n,
    };
  }, [resolvedEmails]);

  const basisCampAgg = useMemo(() => {
    const rows = resolvedBasisCampaigns.filter(r => r.data);
    return {
      count: resolvedBasisCampaigns.length,
      impressions: rows.reduce((s, r) => s + (Number(r.data.impressions) || 0), 0),
      clicks: rows.reduce((s, r) => s + (Number(r.data.clicks) || 0), 0),
      spend: rows.reduce((s, r) => s + (Number(r.data.spend) || 0), 0),
    };
  }, [resolvedBasisCampaigns]);

  const basisBrandAgg = useMemo(() => {
    const rows = resolvedBasisBrands.filter(r => r.data);
    const totalImpr = rows.reduce((s, r) => s + (Number(r.data.impressions) || 0), 0);
    const totalClicks = rows.reduce((s, r) => s + (Number(r.data.clicks) || 0), 0);
    return {
      count: resolvedBasisBrands.length,
      impressions: totalImpr,
      clicks: totalClicks,
      spend: rows.reduce((s, r) => s + (Number(r.data.spend) || 0), 0),
      ctr: totalImpr > 0 ? (totalClicks / totalImpr) * 100 : 0,
    };
  }, [resolvedBasisBrands]);

  const youtubeAgg = useMemo(() => {
    const plVids = resolvedYtPlaylists.flatMap(p => p.videos);
    const standaloneVids = resolvedYtVideos.filter(v => v.data);
    const allVids = [...plVids, ...standaloneVids.map(v => v.data)];
    const vidsWithPct = allVids.filter(v => v?.current?.averageViewPercentage != null);
    const avgViewPct = vidsWithPct.length > 0 ? vidsWithPct.reduce((s, v) => s + Number(v.current.averageViewPercentage), 0) / vidsWithPct.length : null;
    return {
      totalVideos: allVids.length,
      totalViews: allVids.reduce((s, v) => s + (Number(v?.current?.views) || 0), 0),
      totalWatchTime: allVids.reduce((s, v) => s + (Number(v?.current?.watchTimeHours) || 0), 0),
      avgViewPct,
    };
  }, [resolvedYtPlaylists, resolvedYtVideos]);

  const getImpr = (c, platform) => {
    if (platform === 'facebook') return c.views || c.impressions_unique || 0;
    if (platform === 'instagram') return c.views || c.reach || 0;
    return c.impressions || 0;
  };

  const socialAgg = useMemo(() => {
    let totalImpr = 0, totalEng = 0, totalPosts = 0;
    for (const ch of resolvedSocialChannels) {
      for (const p of ch.posts) {
        totalImpr += getImpr(p.current || {}, ch.platform);
        totalEng += (p.current?.engagements || p.current?.total_interactions || 0);
        totalPosts++;
      }
    }
    for (const r of resolvedFbPosts) { if (r.data) { totalImpr += getImpr(r.data.current || {}, 'facebook'); totalEng += (r.data.current?.engagements || 0); totalPosts++; } }
    for (const r of resolvedIgPosts) { if (r.data) { totalImpr += getImpr(r.data.current || {}, 'instagram'); totalEng += (r.data.current?.total_interactions || 0); totalPosts++; } }
    for (const r of resolvedLiPosts) { if (r.data) { totalImpr += getImpr(r.data.current || {}, 'linkedin'); totalEng += (r.data.current?.engagements || 0); totalPosts++; } }
    return { totalPosts, impressions: totalImpr, engagements: totalEng, engRate: totalImpr > 0 ? (totalEng / totalImpr) * 100 : 0 };
  }, [resolvedSocialChannels, resolvedFbPosts, resolvedIgPosts, resolvedLiPosts]);

  const pubAgg = useMemo(() => {
    const pubIssues = resolvedPublications.flatMap(p => p.issues);
    const standaloneIssues = resolvedIssues.filter(r => r.data).map(r => r.data);
    const allIssues = [...pubIssues, ...standaloneIssues];
    return {
      totalIssues: allIssues.length,
      totalPageViews: allIssues.reduce((s, i) => s + (Number(i?.current?.total_page_views) || 0), 0),
      totalUniqueViews: allIssues.reduce((s, i) => s + (Number(i?.current?.unique_page_views) || 0), 0),
    };
  }, [resolvedPublications, resolvedIssues]);

  const gaAgg = useMemo(() => {
    const propUrls = resolvedGaProperties.flatMap(p => p.urls);
    const standaloneUrls = resolvedGaUrls.filter(r => r.data).map(r => r.data);
    const allUrls = [...propUrls, ...standaloneUrls];
    const urlsWithDur = allUrls.filter(u => u?.current?.avg_duration != null);
    const avgDuration = urlsWithDur.length > 0 ? urlsWithDur.reduce((s, u) => s + Number(u.current.avg_duration), 0) / urlsWithDur.length : null;
    return {
      totalUrls: allUrls.length,
      totalUsers: allUrls.reduce((s, u) => s + (Number(u?.current?.total_users) || 0), 0),
      avgDuration,
    };
  }, [resolvedGaProperties, resolvedGaUrls]);

  const allBasisBrandRows = useMemo(() => {
    const rows = [];
    for (const { item } of resolvedBasisBrands) {
      const brandCampaigns = (allData.basisCampaigns || []).filter(c => c.brand?.toLowerCase() === item.item_identifier?.toLowerCase());
      for (const [idx, c] of brandCampaigns.entries()) {
        rows.push({ key: `brand-${item.id}-${idx}`, label: c.name || `Campaign ${idx + 1}`, impressions: c.impressions, clicks: c.clicks, spend: c.spend, ctr: c.ctr });
      }
    }
    return rows;
  }, [resolvedBasisBrands, allData.basisCampaigns]);

  const allYtVideoRows = useMemo(() => {
    const rows = [];
    for (const { item, videos } of resolvedYtPlaylists) {
      for (const v of videos) {
        rows.push({ key: `pl-${item.id}-${v.title}`, label: v.title, views: v.current?.views, watchHours: v.current?.watchTimeHours, avgPct: v.current?.averageViewPercentage });
      }
    }
    for (const { item, data } of resolvedYtVideos) {
      rows.push({ key: `vid-${item.id}`, label: item.item_label, views: data?.current?.views, watchHours: data?.current?.watchTimeHours, avgPct: data?.current?.averageViewPercentage });
    }
    return rows;
  }, [resolvedYtPlaylists, resolvedYtVideos]);

  const allSocialRows = useMemo(() => {
    const rows = [];
    for (const { item, platform, posts } of resolvedSocialChannels) {
      for (const [idx, p] of posts.entries()) {
        const c = p.current || {};
        rows.push({ key: `ch-${item.id}-${idx}`, label: p.message?.substring(0, 80) || p.caption?.substring(0, 80) || `${item.item_label} post ${idx + 1}`, impressions: getImpr(c, platform), engagements: c.engagements || c.total_interactions || 0 });
      }
    }
    for (const { item, data } of resolvedFbPosts) {
      const c = data?.current || {};
      rows.push({ key: `fb-${item.id}`, label: item.item_label, impressions: data ? getImpr(c, 'facebook') : null, engagements: data ? (c.engagements || c.total_interactions || 0) : null });
    }
    for (const { item, data } of resolvedIgPosts) {
      const c = data?.current || {};
      rows.push({ key: `ig-${item.id}`, label: item.item_label, impressions: data ? getImpr(c, 'instagram') : null, engagements: data ? (c.engagements || c.total_interactions || 0) : null });
    }
    for (const { item, data } of resolvedLiPosts) {
      const c = data?.current || {};
      rows.push({ key: `li-${item.id}`, label: item.item_label, impressions: data ? getImpr(c, 'linkedin') : null, engagements: data ? (c.engagements || c.total_interactions || 0) : null });
    }
    return rows;
  }, [resolvedSocialChannels, resolvedFbPosts, resolvedIgPosts, resolvedLiPosts]);

  const allPubRows = useMemo(() => {
    const rows = [];
    for (const { item, issues } of resolvedPublications) {
      for (const issue of issues) {
        rows.push({ key: `pub-${item.id}-${issue.issue_id || issue.issue_name}`, label: issue.issue_name || issue.issue_number || item.item_label, pageViews: issue.current?.total_page_views, uniqueViews: issue.current?.unique_page_views, visits: issue.current?.total_issue_visits });
      }
    }
    for (const { item, data } of resolvedIssues) {
      rows.push({ key: `issue-${item.id}`, label: item.item_label, pageViews: data?.current?.total_page_views, uniqueViews: data?.current?.unique_page_views, visits: data?.current?.total_issue_visits });
    }
    return rows;
  }, [resolvedPublications, resolvedIssues]);

  const allGaRows = useMemo(() => {
    const rows = [];
    for (const { item, urls } of resolvedGaProperties) {
      for (const u of urls) {
        rows.push({ key: `prop-${item.id}-${u.url}`, label: u.title || u.url, users: u.current?.total_users, duration: u.current?.avg_duration, bounce: u.current?.bounce_rate });
      }
    }
    for (const { item, data } of resolvedGaUrls) {
      rows.push({ key: `url-${item.id}`, label: item.item_label, users: data?.current?.total_users, duration: data?.current?.avg_duration, bounce: data?.current?.bounce_rate });
    }
    return rows;
  }, [resolvedGaProperties, resolvedGaUrls]);

  const ytCount = (itemsByType['youtube_playlist'] || []).length + (itemsByType['youtube_video'] || []).length;
  const socialCount = (itemsByType['social_channel'] || []).length + (itemsByType['facebook_post'] || []).length + (itemsByType['instagram_post'] || []).length + (itemsByType['linkedin_post'] || []).length;
  const pubCount = (itemsByType['walsworth_publication'] || []).length + (itemsByType['walsworth_issue'] || []).length;
  const gaCount = (itemsByType['ga_property'] || []).length + (itemsByType['ga_url'] || []).length;

  const hasEmail = resolvedEmails.length > 0;
  const hasBasisCamp = resolvedBasisCampaigns.length > 0;
  const hasBasisBrand = resolvedBasisBrands.length > 0;
  const hasYoutube = resolvedYtPlaylists.length > 0 || resolvedYtVideos.length > 0;
  const hasSocial = resolvedSocialChannels.length > 0 || resolvedFbPosts.length > 0 || resolvedIgPosts.length > 0 || resolvedLiPosts.length > 0;
  const hasPubs = resolvedPublications.length > 0 || resolvedIssues.length > 0;
  const hasGA = resolvedGaProperties.length > 0 || resolvedGaUrls.length > 0;

  const SECTION_DEFS = [
    hasEmail && { key: 'email', label: 'Email Campaigns', badge: 'pp-badge-email', count: resolvedEmails.length },
    hasBasisCamp && { key: 'basis_camp', label: 'Basis Campaigns', badge: 'pp-badge-basis', count: resolvedBasisCampaigns.length },
    hasBasisBrand && { key: 'basis_brand', label: 'Basis Brands', badge: 'pp-badge-basis', count: resolvedBasisBrands.length },
    hasYoutube && { key: 'youtube', label: 'YouTube', badge: 'pp-badge-video', count: ytCount },
    hasSocial && { key: 'social', label: 'Social Media', badge: 'pp-badge-social', count: socialCount },
    hasPubs && { key: 'publications', label: 'Publications', badge: 'pp-badge-publication', count: pubCount },
    hasGA && { key: 'ga', label: 'Google Analytics', badge: 'pp-badge-ga', count: gaCount },
  ].filter(Boolean);

  return {
    resolvedEmails, resolvedBasisCampaigns, resolvedBasisBrands,
    resolvedYtPlaylists, resolvedYtVideos, resolvedSocialChannels,
    resolvedFbPosts, resolvedIgPosts, resolvedLiPosts,
    resolvedPublications, resolvedIssues, resolvedGaProperties, resolvedGaUrls,
    emailAgg, basisCampAgg, basisBrandAgg, youtubeAgg, socialAgg, pubAgg, gaAgg,
    allBasisBrandRows, allYtVideoRows, allSocialRows, allPubRows, allGaRows,
    hasEmail, hasBasisCamp, hasBasisBrand, hasYoutube, hasSocial, hasPubs, hasGA,
    ytCount, socialCount, pubCount, gaCount, SECTION_DEFS,
  };
};

const ChannelSections = ({ resolved, openSections, toggleSection, sectionPrefix }) => {
  const pfx = sectionPrefix ? `${sectionPrefix}-` : '';
  const {
    resolvedEmails, resolvedBasisCampaigns, resolvedBasisBrands,
    emailAgg, basisCampAgg, basisBrandAgg, youtubeAgg, socialAgg, pubAgg, gaAgg,
    allBasisBrandRows, allYtVideoRows, allSocialRows, allPubRows, allGaRows,
    hasEmail, hasBasisCamp, hasBasisBrand, hasYoutube, hasSocial, hasPubs, hasGA,
    socialCount,
  } = resolved;

  return (
    <>
      {hasEmail && (
        <div className="pp-section">
          <SectionHeader label="Email Campaigns" isOpen={openSections[`${pfx}email`] === true} onToggle={() => toggleSection(`${pfx}email`)}>
            <AggStat label="Campaigns" value={resolvedEmails.length} />
            <AggStat label="Sent" value={fmt(emailAgg.sent)} />
            <AggStat label="Delivered" value={fmt(emailAgg.delivered)} />
            <AggStat label="U. Open" value={fmtPct(emailAgg.uOpen)} />
            <AggStat label="T. Open" value={fmtPct(emailAgg.tOpen)} />
            <AggStat label="U. Click" value={fmtPct(emailAgg.uClick)} />
            <AggStat label="T. Click" value={fmtPct(emailAgg.tClick)} />
          </SectionHeader>
          {openSections[`${pfx}email`] === true && (
            <div className="pp-section-body">
              <div className="pp-metrics-table">
                <div className="pp-metrics-header-row pp-email-grid"><span>Campaign</span><span>Sent</span><span>Delivered</span><span>U. Open</span><span>T. Open</span><span>U. Click</span><span>T. Click</span></div>
                {resolvedEmails.map(({ item, data }) => (
                  <div key={item.id} className="pp-metrics-data-row pp-email-grid">
                    <span className="pp-metrics-name" title={item.item_label}>{item.item_label}</span>
                    <span>{data ? fmt(data.Sent) : '-'}</span>
                    <span>{data ? fmt(data.Delivered) : '-'}</span>
                    <span>{data ? fmtPct(data.Unique_Open_Rate) : '-'}</span>
                    <span>{data ? fmtPct(data.Total_Open_Rate) : '-'}</span>
                    <span>{data ? fmtPct(data.Unique_Click_Rate) : '-'}</span>
                    <span>{data ? fmtPct(data.Total_Click_Rate) : '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {hasBasisCamp && (
        <div className="pp-section">
          <SectionHeader label="Basis Campaigns" isOpen={openSections[`${pfx}basis_camp`] === true} onToggle={() => toggleSection(`${pfx}basis_camp`)}>
            <AggStat label="Campaigns" value={resolvedBasisCampaigns.length} />
            <AggStat label="Impressions" value={fmt(basisCampAgg.impressions)} />
            <AggStat label="Clicks" value={fmt(basisCampAgg.clicks)} />
            <AggStat label="Spend" value={fmtCur(basisCampAgg.spend)} />
          </SectionHeader>
          {openSections[`${pfx}basis_camp`] === true && (
            <div className="pp-section-body">
              <div className="pp-metrics-table">
                <div className="pp-metrics-header-row"><span>Campaign</span><span>Brand</span><span>Impressions</span><span>Clicks</span><span>Spend</span></div>
                {resolvedBasisCampaigns.map(({ item, data }) => (
                  <div key={item.id} className="pp-metrics-data-row">
                    <span className="pp-metrics-name" title={item.item_label}>{item.item_label}</span>
                    <span>{data?.brand || '-'}</span>
                    <span>{data ? fmt(data.impressions) : '-'}</span>
                    <span>{data ? fmt(data.clicks) : '-'}</span>
                    <span>{data ? fmtCur(data.spend) : '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {hasBasisBrand && (
        <div className="pp-section">
          <SectionHeader label="Basis Brands" isOpen={openSections[`${pfx}basis_brand`] === true} onToggle={() => toggleSection(`${pfx}basis_brand`)}>
            <AggStat label="Brands" value={resolvedBasisBrands.length} />
            <AggStat label="Campaigns" value={allBasisBrandRows.length} />
            <AggStat label="Impressions" value={fmt(basisBrandAgg.impressions)} />
            <AggStat label="Clicks" value={fmt(basisBrandAgg.clicks)} />
            <AggStat label="Spend" value={fmtCur(basisBrandAgg.spend)} />
            <AggStat label="Avg CTR" value={fmtPct(basisBrandAgg.ctr)} />
          </SectionHeader>
          {openSections[`${pfx}basis_brand`] === true && (
            <div className="pp-section-body">
              <div className="pp-metrics-table">
                <div className="pp-metrics-header-row"><span>Campaign</span><span>Impressions</span><span>Clicks</span><span>Spend</span><span>CTR</span></div>
                {allBasisBrandRows.map(row => (
                  <div key={row.key} className="pp-metrics-data-row">
                    <span className="pp-metrics-name" title={row.label}>{row.label}</span>
                    <span>{row.impressions != null ? fmt(row.impressions) : '-'}</span>
                    <span>{row.clicks != null ? fmt(row.clicks) : '-'}</span>
                    <span>{row.spend != null ? fmtCur(row.spend) : '-'}</span>
                    <span>{row.ctr != null ? fmtPct(row.ctr) : '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {hasYoutube && (
        <div className="pp-section">
          <SectionHeader label="YouTube" isOpen={openSections[`${pfx}youtube`] === true} onToggle={() => toggleSection(`${pfx}youtube`)}>
            <AggStat label="Videos" value={youtubeAgg.totalVideos} />
            <AggStat label="Views" value={fmt(youtubeAgg.totalViews)} />
            <AggStat label="Watch Time" value={fmtWatch(youtubeAgg.totalWatchTime)} />
            {youtubeAgg.avgViewPct != null && <AggStat label="Avg View %" value={fmtPct(youtubeAgg.avgViewPct)} />}
          </SectionHeader>
          {openSections[`${pfx}youtube`] === true && (
            <div className="pp-section-body">
              <div className="pp-metrics-table">
                <div className="pp-metrics-header-row pp-grid-4"><span>Video</span><span>Views</span><span>Watch Time</span><span>Avg View %</span></div>
                {allYtVideoRows.map(row => (
                  <div key={row.key} className="pp-metrics-data-row pp-grid-4">
                    <span className="pp-metrics-name" title={row.label}>{row.label}</span>
                    <span>{row.views != null ? fmt(row.views) : '-'}</span>
                    <span>{fmtWatch(row.watchHours)}</span>
                    <span>{row.avgPct != null ? fmtPct(row.avgPct) : '-'}</span>
                  </div>
                ))}
                {allYtVideoRows.length === 0 && <div className="pp-empty-children">No videos found</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {hasSocial && (
        <div className="pp-section">
          <SectionHeader label="Social Media" isOpen={openSections[`${pfx}social`] === true} onToggle={() => toggleSection(`${pfx}social`)}>
            <AggStat label="Items" value={socialCount} />
            <AggStat label="Impressions" value={fmt(socialAgg.impressions)} />
            <AggStat label="Engagements" value={fmt(socialAgg.engagements)} />
            <AggStat label="Eng. Rate" value={fmtPct(socialAgg.engRate)} />
          </SectionHeader>
          {openSections[`${pfx}social`] === true && (
            <div className="pp-section-body">
              <div className="pp-metrics-table">
                <div className="pp-metrics-header-row pp-grid-4"><span>Name</span><span>Impressions</span><span>Engagements</span><span>Eng. Rate</span></div>
                {allSocialRows.map(row => (
                  <div key={row.key} className="pp-metrics-data-row pp-grid-4">
                    <span className="pp-metrics-name" title={row.label}>{row.label}</span>
                    <span>{row.impressions != null ? fmt(row.impressions) : '-'}</span>
                    <span>{row.engagements != null ? fmt(row.engagements) : '-'}</span>
                    <span>{row.impressions > 0 ? fmtPct((row.engagements / row.impressions) * 100) : '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {hasPubs && (
        <div className="pp-section">
          <SectionHeader label="Publications" isOpen={openSections[`${pfx}publications`] === true} onToggle={() => toggleSection(`${pfx}publications`)}>
            <AggStat label="Issues" value={pubAgg.totalIssues} />
            <AggStat label="Page Views" value={fmt(pubAgg.totalPageViews)} />
            <AggStat label="Unique Views" value={fmt(pubAgg.totalUniqueViews)} />
          </SectionHeader>
          {openSections[`${pfx}publications`] === true && (
            <div className="pp-section-body">
              <div className="pp-metrics-table">
                <div className="pp-metrics-header-row pp-grid-4"><span>Issue</span><span>Page Views</span><span>Unique Views</span><span>Visits</span></div>
                {allPubRows.map(row => (
                  <div key={row.key} className="pp-metrics-data-row pp-grid-4">
                    <span className="pp-metrics-name" title={row.label}>{row.label}</span>
                    <span>{row.pageViews != null ? fmt(row.pageViews) : '-'}</span>
                    <span>{row.uniqueViews != null ? fmt(row.uniqueViews) : '-'}</span>
                    <span>{row.visits != null ? fmt(row.visits) : '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {hasGA && (
        <div className="pp-section">
          <SectionHeader label="Google Analytics" isOpen={openSections[`${pfx}ga`] === true} onToggle={() => toggleSection(`${pfx}ga`)}>
            <AggStat label="URLs" value={gaAgg.totalUrls} />
            <AggStat label="Users" value={fmt(gaAgg.totalUsers)} />
            {gaAgg.avgDuration != null && <AggStat label="Avg Duration" value={fmtDur(gaAgg.avgDuration)} />}
          </SectionHeader>
          {openSections[`${pfx}ga`] === true && (
            <div className="pp-section-body">
              <div className="pp-metrics-table">
                <div className="pp-metrics-header-row pp-grid-4"><span>URL / Title</span><span>Users</span><span>Avg Duration</span><span>Bounce Rate</span></div>
                {allGaRows.map(row => (
                  <div key={row.key} className="pp-metrics-data-row pp-grid-4">
                    <span className="pp-metrics-name" title={row.label}>{row.label}</span>
                    <span>{row.users != null ? fmt(row.users) : '-'}</span>
                    <span>{row.duration != null ? fmtDur(row.duration) : '-'}</span>
                    <span>{row.bounce != null ? fmtPct(row.bounce) : '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

const ProgramCard = ({ program, allData, onUpdate, onDelete, onEdit }) => {
  const [expanded, setExpanded] = useState(true);
  const [openSections, setOpenSections] = useState({});
  const [openSubPrograms, setOpenSubPrograms] = useState({});
  const [description, setDescription] = useState(program.description || '');

  const toggleSection = (k) => setOpenSections(p => ({ ...p, [k]: !p[k] }));
  const toggleSubProgram = (id) => setOpenSubPrograms(p => ({ ...p, [id]: !p[id] }));

  const hasSubPrograms = program.has_sub_programs && (program.sub_programs || []).length > 0;

  const allItems = useMemo(() => {
    if (!hasSubPrograms) return program.items || [];
    const items = [];
    (program.sub_programs || []).forEach(sp => {
      (sp.items || []).forEach(item => items.push(item));
    });
    return items;
  }, [hasSubPrograms, program.items, program.sub_programs]);

  const resolved = useResolvedData(allItems, allData);

  const handleStatusToggle = useCallback(async (e) => {
    const newStatus = e.target.value;
    try {
      const res = await fetch(`${API_BASE_URL}/api/programs/${program.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.status === 'success' && onUpdate) onUpdate(data.program);
    } catch (e) {}
  }, [program.id, onUpdate]);

  const handleDescBlur = useCallback(async () => {
    if (description === (program.description || '')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/programs/${program.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description })
      });
      const data = await res.json();
      if (data.status === 'success' && onUpdate) onUpdate(data.program);
    } catch (e) {}
  }, [program.id, description, program.description, onUpdate]);

  const handleDelete = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/programs/${program.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'success' && onDelete) onDelete(program.id);
    } catch (e) {}
  }, [program.id, onDelete]);

  const totalItems = allItems.length;

  return (
    <div className="pp-card">
      <div className="pp-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="pp-card-title-row">
          <h3 className="pp-card-name">{program.name}</h3>
          <div className="pp-card-badges">
            {hasSubPrograms && (
              <span className="pp-badge pp-badge-sub">{(program.sub_programs || []).length} sub-programs</span>
            )}
            {resolved.SECTION_DEFS.map(s => (
              <span key={s.key} className={`pp-badge ${s.badge}`}>{s.count} {s.label}</span>
            ))}
            <span className={`pp-badge pp-badge-status pp-badge-${program.status}`}>{program.status}</span>
          </div>
          <span className={`pp-expand-icon ${expanded ? 'expanded' : ''}`}>&#9662;</span>
        </div>
      </div>

      {expanded && (
        <div className="pp-card-body">
          <div className="pp-toolbar-row">
            <span className="pp-summary-label">
              {totalItems} items across {resolved.SECTION_DEFS.length} channels
              {hasSubPrograms && ` in ${(program.sub_programs || []).length} sub-programs`}
            </span>
            <div className="pp-toolbar-actions">
              <button className="pp-btn pp-btn-edit" onClick={() => onEdit && onEdit(program)}>Edit Program</button>
              <button className="pp-btn pp-btn-delete" onClick={handleDelete}>Delete</button>
            </div>
            <div className="pp-toolbar-fields">
              <input
                type="text"
                className="pp-market-input"
                value={description}
                onChange={e => setDescription(e.target.value)}
                onBlur={handleDescBlur}
                placeholder="Market"
              />
              <select className="pp-status-select" value={program.status} onChange={handleStatusToggle}>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {hasSubPrograms ? (
            <>
              <div className="pp-aggregate-banner">
                <div className="pp-aggregate-banner-title">Program Totals</div>
                <div className="pp-aggregate-banner-stats">
                  {resolved.hasEmail && <AggStat label="Emails" value={resolved.resolvedEmails.length} />}
                  {resolved.hasEmail && <AggStat label="Delivered" value={fmt(resolved.emailAgg.delivered)} />}
                  {resolved.hasEmail && <AggStat label="U. Open" value={fmtPct(resolved.emailAgg.uOpen)} />}
                  {resolved.hasEmail && <AggStat label="U. Click" value={fmtPct(resolved.emailAgg.uClick)} />}
                  {(resolved.hasBasisCamp || resolved.hasBasisBrand) && <AggStat label="Impressions" value={fmt((resolved.basisCampAgg.impressions || 0) + (resolved.basisBrandAgg.impressions || 0))} />}
                  {(resolved.hasBasisCamp || resolved.hasBasisBrand) && <AggStat label="Spend" value={fmtCur((resolved.basisCampAgg.spend || 0) + (resolved.basisBrandAgg.spend || 0))} />}
                  {resolved.hasYoutube && <AggStat label="Videos" value={resolved.youtubeAgg.totalVideos} />}
                  {resolved.hasYoutube && <AggStat label="Views" value={fmt(resolved.youtubeAgg.totalViews)} />}
                  {resolved.hasYoutube && resolved.youtubeAgg.avgViewPct != null && <AggStat label="Avg View %" value={fmtPct(resolved.youtubeAgg.avgViewPct)} />}
                  {resolved.hasSocial && <AggStat label="Posts" value={resolved.socialAgg.totalPosts} />}
                  {resolved.hasSocial && <AggStat label="Engagements" value={fmt(resolved.socialAgg.engagements)} />}
                  {resolved.hasPubs && <AggStat label="Page Views" value={fmt(resolved.pubAgg.totalPageViews)} />}
                  {resolved.hasGA && <AggStat label="Users" value={fmt(resolved.gaAgg.totalUsers)} />}
                  {resolved.hasGA && resolved.gaAgg.avgDuration != null && <AggStat label="Avg Duration" value={fmtDur(resolved.gaAgg.avgDuration)} />}
                </div>
              </div>

              {(program.sub_programs || []).map(sp => (
                <SubProgramAccordion
                  key={sp.id}
                  subProgram={sp}
                  allData={allData}
                  isOpen={openSubPrograms[sp.id]}
                  onToggle={() => toggleSubProgram(sp.id)}
                  openSections={openSections}
                  toggleSection={toggleSection}
                />
              ))}
            </>
          ) : (
            <ChannelSections resolved={resolved} openSections={openSections} toggleSection={toggleSection} sectionPrefix="" />
          )}
        </div>
      )}
    </div>
  );
};

const SubProgramAccordion = ({ subProgram, allData, isOpen, onToggle, openSections, toggleSection }) => {
  const resolved = useResolvedData(subProgram.items || [], allData);
  const itemCount = (subProgram.items || []).length;

  return (
    <div className="pp-sub-program-section">
      <div className="pp-sub-program-header" onClick={onToggle}>
        <span className={`pp-section-chevron ${isOpen ? 'open' : ''}`}>&#9662;</span>
        <h4 className="pp-sub-program-name">{subProgram.name}</h4>
        <div className="pp-sub-program-summary">
          <span className="pp-sub-program-item-count">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
          {resolved.SECTION_DEFS.map(s => (
            <span key={s.key} className={`pp-badge ${s.badge}`}>{s.count} {s.label}</span>
          ))}
        </div>
      </div>
      {isOpen && (
        <div className="pp-sub-program-body">
          <ChannelSections resolved={resolved} openSections={openSections} toggleSection={toggleSection} sectionPrefix={`sp-${subProgram.id}`} />
        </div>
      )}
    </div>
  );
};

export default ProgramCard;