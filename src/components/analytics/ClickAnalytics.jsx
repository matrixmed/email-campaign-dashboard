import React, { useState, useEffect, useMemo } from 'react';
import '../../styles/ClickAnalytics.css';
import '../../styles/SectionHeaders.css';
import { matchesSearchTerm } from '../../utils/searchUtils';
import { stripAbGroup } from '../../utils/campaignClassifier';

const METADATA_BLOB_URL = "https://emaildash.blob.core.windows.net/json-data/completed_campaign_metadata.json?sp=r&st=2025-09-03T19:53:53Z&se=2027-09-29T04:08:53Z&spr=https&sv=2024-11-04&sr=b&sig=JWxxARzWg4FN%2FhGa17O3RGffl%2BVyJ%2FkE3npL9Iws%2FIs%3D";

const AD_TRACKING_PATTERNS = [
  'doubleclick', 'servedbyadbutler', 'googleads', 'googlesyndication',
  'adsrvr', 'demdex', 'krxd', 'bluekai', 'openx', 'pubmatic',
  'rubiconproject', 'tapad', 'adnxs', 'criteo', 'taboola', 'outbrain'
];

const AD_TRACKING_PREFIXES = ['ad.', 'ads.', 'track.', 'pixel.', 'click.', 'trk.'];

const SPONSOR_BRAND_NAMES = [
  'verzenio', 'tagrisso', 'calquence', 'truqap', 'spevigo', 'opzelura',
  'rinvoq', 'skyrizi', 'imfinzi', 'winlevi', 'vabysmo', 'kisunla',
  'carvykti', 'breyanzi', 'phesgo', 'uplizna', 'cabometyx', 'enhertu',
  'lynparza', 'keytruda', 'farxiga', 'humira', 'darzalex', 'tremfya',
  'stelara', 'jardiance', 'taltz', 'trulicity', 'mounjaro', 'zepbound',
  'retevmo', 'jaypirca', 'ebglyss', 'omvoh', 'cyramza', 'erbitux',
  'olumiant', 'emgality', 'reyvow', 'lyumjev', 'humalog', 'humulin',
  'basaglar', 'breztri', 'symbicort', 'fasenra', 'saphnelo', 'tezspire',
  'lokelma', 'beyfortus', 'ultomiris', 'soliris', 'airsupra', 'botox',
  'vraylar', 'ubrelvy', 'qulipta', 'venclexta', 'imbruvica', 'epkinly',
  'elahere', 'linzess', 'erleada', 'tecvayli', 'talvey', 'rybrevant',
  'spravato', 'invega', 'xarelto', 'simponi', 'remicade', 'balversa',
  'akeega', 'ofev', 'trajenta', 'synjardy', 'stiolto', 'spiriva',
  'gilotrif', 'praxbind', 'pradaxa', 'ayvakyt', 'cometriq',
  'zoryve', 'skinbetter'
];

const PHARMA_COMPANY_PATTERNS = [
  'lilly', 'astrazeneca', 'abbvie', 'janssen', 'jnj', 'boehringer', 'exelixis',
  'arcutis', 'incyte', 'sunpharma', 'castlebiosciences', 'bms.com',
  'gene.com', 'azpdcentral', 'azpicentral', 'reinforcinghope'
];

const SOCIAL_DOMAINS = [
  'facebook.com', 'instagram.com', 'twitter.com',
  'linkedin.com', 'youtube.com', 'tiktok.com', 'threads.net', 'pinterest.com'
];

const SOCIAL_EXACT = ['x.com', 'www.x.com'];

const EDITORIAL_INTERNAL = [
  'jcad', 'consultant360',
  'mydigitalpublication.com', 'matrixmedicalcommunications.com',
  'oncologymatrix', 'nutritionhealthreview', 'bariatrictimes',
  'innovationscns'
];

const CONFERENCE_PLATFORMS = [
  'eventscribe', 'confex.com', 'secure-platform.com', 'cvent.me', 'cloud-cme.com'
];

const CONFERENCE_DOMAINS = [
  'cnssummit', 'sabcs.org', 'mauiderm', 'esotcongress', 'sages20',
  'wcn-neurology', 'ctad-alzheimer', 'scienceofskinsummit',
  'masterclassesindermatology', 'dermnppa', 'ctdermnppa', 'jadprolive',
  'dermsquared',
  'grc.org', 'conferences.asco', 'meetings.asco', 'meetings-api.hematology',
  'eposters.aad', 'aaic.alz', 'congress.eular', 'wclc.iaslc', 'ttlc-iaslc'
];

const EXTERNAL_EDU_PUBLISHERS = [
  'pubmed', 'ncbi', 'doi.org', 'nejm', 'thelancet', 'bmj',
  'wiley', 'springer', 'elsevier', 'nature.com', 'frontiersin.org',
  'journals.lww.com', 'journals.plos.org', 'academic.oup.com',
  'dovepress.com', 'jci.org', 'medicaljournalssweden'
];

const EXTERNAL_EDU_MEDICAL = [
  'healio.com', 'medicalxpress.com', 'sciencedaily.com', 'news-medical.net',
  'rarediseaseadvisor.com', 'medpagetoday.com', 'medscape.com', 'mdedge.com',
  'gastroendonews.com', 'ajmc.com', 'the-scientist.com', 'scitechdaily.com',
  'eurekalert.org', 'ascopost.com', 'endocrinologyadvisor.com',
  'technologynetworks.com', 'chiroeco.com', 'gotoper.com',
  'hcplive.com', 'neurologylive.com', 'nccn.org', 'jnccn'
];

const EXTERNAL_EDU_ORGS = [
  'asco.org', 'ascopubs.org', 'hematology.org', 'aan.com', 'aad.org',
  'heart.org', 'facs.org', 'acc.org', 'esmo.org',
  'gastro.org', 'asmbs.org', 'rheumatology.org', 'eadv.org',
  'psoriasis.org', 'copdfoundation.org', 'diabetes.org', 'aaaai.org',
  'aafa.org', 'alz.org', 'cancer.gov', 'fda.gov', 'cdc.gov', 'who.int',
  'seer.cancer.gov', 'clevelandclinic.org', 'hopkinsmedicine.org',
  'uclahealth.org', 'mayo.edu', 'scai.org', 'snmmi.org',
  'iaslc.org', 'eular.org', 'aacr.org', 'myelomasociety.org',
  'jax.org', 'asm.org', 'neurochemistry.org',
  'fightingblindness.org', 'healthandwellnessalliance.org',
  'diversityindermatology.com',
  'oxfordbrc.nihr.ac.uk', 'alleninstitute.org'
];

const PODCAST_PATTERNS = ['open.spotify.com', 'podcasts.apple.com', 'buzzsprout.com'];

const EMAIL_INFRA_PATTERNS = [
  'activecampaign', 'activehosted', 'unsubscribe', 'manage-preferences',
  'email-preferences', 'emlnk', 'acemlna', 'getbee.io', 'urldefense'
];

const CATEGORY_CONFIG = {
  'Ad Network / Tracking': { color: '#ff6b6b', order: 0 },
  'Sponsor / Brand': { color: '#ffd93d', order: 1 },
  'Editorial / Content': { color: '#51cf66', order: 2 },
  'External Education': { color: '#20c997', order: 3 },
  'Conferences': { color: '#f783ac', order: 4 },
  'Social Media': { color: '#339af0', order: 5 },
  'Podcasts': { color: '#e599f7', order: 6 },
  'Email Infrastructure': { color: '#868e96', order: 7 },
  'Other': { color: '#cc5de8', order: 8 }
};

const categorizeDomain = (domain) => {
  const d = domain.toLowerCase();

  // Email Infrastructure
  if (EMAIL_INFRA_PATTERNS.some(p => d.includes(p)) || d.includes('mailto:')) {
    return 'Email Infrastructure';
  }

  // Ad Network / Tracking
  if (AD_TRACKING_PATTERNS.some(p => d.includes(p))) return 'Ad Network / Tracking';
  if (AD_TRACKING_PREFIXES.some(p => d.startsWith(p))) return 'Ad Network / Tracking';

  // Sponsor / Brand
  if (SPONSOR_BRAND_NAMES.some(b => d.includes(b))) return 'Sponsor / Brand';
  if (PHARMA_COMPANY_PATTERNS.some(p => d.includes(p))) return 'Sponsor / Brand';

  // Social Media
  if (SOCIAL_DOMAINS.some(s => d.includes(s))) return 'Social Media';
  if (SOCIAL_EXACT.includes(d)) return 'Social Media';

  // Podcasts
  if (PODCAST_PATTERNS.some(p => d.includes(p))) return 'Podcasts';

  // Editorial
  if (EDITORIAL_INTERNAL.some(e => d.includes(e))) return 'Editorial / Content';

  // Conferences
  if (CONFERENCE_PLATFORMS.some(p => d.includes(p))) return 'Conferences';
  if (CONFERENCE_DOMAINS.some(p => d.includes(p))) return 'Conferences';

  // External Education
  if (EXTERNAL_EDU_PUBLISHERS.some(e => d.includes(e))) return 'External Education';
  if (EXTERNAL_EDU_MEDICAL.some(e => d.includes(e))) return 'External Education';
  if (EXTERNAL_EDU_ORGS.some(e => d.includes(e))) return 'External Education';
  if (d.endsWith('.edu') || d.includes('.edu.')) return 'External Education';

  return 'Other';
};

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

  return {
    links: Object.values(allLinks).sort((a, b) => b.clicks - a.clicks),
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

  const domainMap = {};
  let totalClicks = 0;
  let totalBotClicks = 0;

  Object.values(groups).forEach(deployments => {
    const combined = combineDeploymentClicks(deployments);
    if (combined.links.length === 0) return;

    totalClicks += combined.total_clicks_after_filtering;
    totalBotClicks += combined.total_bot_clicks_removed;

    combined.links.forEach(link => {
      try {
        const hostname = new URL(link.url).hostname;
        if (domainMap[hostname]) {
          domainMap[hostname].clicks += link.clicks;
          domainMap[hostname].urls.add(link.url);
        } else {
          domainMap[hostname] = {
            domain: hostname,
            clicks: link.clicks,
            category: categorizeDomain(hostname),
            urls: new Set([link.url])
          };
        }
      } catch (e) {}
    });
  });

  const domains = Object.values(domainMap).map(d => ({
    domain: d.domain,
    clicks: d.clicks,
    category: d.category,
    urlCount: d.urls.size
  })).sort((a, b) => b.clicks - a.clicks);

  const categorySummary = {};
  domains.forEach(d => {
    if (!categorySummary[d.category]) {
      categorySummary[d.category] = { clicks: 0, domainCount: 0, domains: [] };
    }
    categorySummary[d.category].clicks += d.clicks;
    categorySummary[d.category].domainCount += 1;
    categorySummary[d.category].domains.push(d);
  });

  return {
    domains,
    categorySummary,
    totalClicks,
    totalBotClicks,
    uniqueDomains: domains.length
  };
};

const INITIAL_DOMAINS = 10;

const generateInsights = (categorySummary, totalClicks) => {
  const insights = [];
  if (totalClicks === 0) return insights;

  const cats = Object.entries(categorySummary)
    .map(([name, data]) => ({
      name, ...data,
      pct: data.clicks / totalClicks * 100
    }))
    .sort((a, b) => b.clicks - a.clicks);

  const infraClicks = cats
    .filter(c => c.name === 'Email Infrastructure' || c.name === 'Other')
    .reduce((sum, c) => sum + c.clicks, 0);
  const engagementClicks = totalClicks - infraClicks;

  const editorial = cats.find(c => c.name === 'Editorial / Content');
  const external = cats.find(c => c.name === 'External Education');
  if (editorial && external && external.clicks > 0) {
    const ratio = editorial.clicks / external.clicks;
    insights.push({
      type: ratio >= 2 ? 'positive' : ratio >= 1 ? 'info' : 'warning',
      title: 'Our Content vs External',
      value: `${ratio.toFixed(1)}:1`,
      detail: ratio >= 1
        ? `Readers click our editorial content ${ratio.toFixed(1)}x more than third-party sources. Strong content retention.`
        : `Third-party educational sources receive ${(1 / ratio).toFixed(1)}x more clicks than our content. Opportunity to strengthen internal linking.`
    });
  }

  const adCat = cats.find(c => c.name === 'Ad Network / Tracking');
  if (adCat && engagementClicks > 0) {
    const adEngPct = adCat.clicks / engagementClicks * 100;
    insights.push({
      type: adEngPct > 15 ? 'warning' : 'info',
      title: 'Ad & Tracking Click Share',
      value: `${adEngPct.toFixed(1)}%`,
      detail: adEngPct > 15
        ? `${adEngPct.toFixed(1)}% of engagement clicks go to ad/tracking pixels. High ad density may dilute meaningful engagement.`
        : `${adEngPct.toFixed(1)}% of engagement clicks route to ad/tracking — within normal range.`
    });
  }

  const sponsorCat = cats.find(c => c.name === 'Sponsor / Brand');
  if (sponsorCat && sponsorCat.clicks > 0) {
    insights.push({
      type: 'sponsor',
      title: 'Sponsor Brand Engagement',
      value: `${sponsorCat.pct.toFixed(1)}%`,
      detail: `${sponsorCat.clicks.toLocaleString()} clicks across ${sponsorCat.domainCount} sponsor domain${sponsorCat.domainCount !== 1 ? 's' : ''}. Sponsor content captures ${sponsorCat.pct.toFixed(1)}% of total click volume.`
    });
  }

  const confCat = cats.find(c => c.name === 'Conferences');
  if (confCat && confCat.clicks > 0) {
    insights.push({
      type: 'info',
      title: 'Conference Engagement',
      value: confCat.clicks.toLocaleString(),
      detail: `${confCat.domainCount} conference site${confCat.domainCount !== 1 ? 's' : ''} received ${confCat.clicks.toLocaleString()} clicks (${confCat.pct.toFixed(1)}% of total). Active conference attendance interest from recipients.`
    });
  }

  const podCat = cats.find(c => c.name === 'Podcasts');
  if (podCat && podCat.clicks > 0) {
    insights.push({
      type: 'info',
      title: 'Podcast Engagement',
      value: podCat.clicks.toLocaleString(),
      detail: `${podCat.clicks.toLocaleString()} clicks to podcast platforms across ${podCat.domainCount} service${podCat.domainCount !== 1 ? 's' : ''} (${podCat.pct.toFixed(1)}% of total). Audio content is ${podCat.pct > 3 ? 'a significant' : 'an emerging'} engagement channel.`
    });
  }

  const allDomains = cats.flatMap(c => c.domains || []);
  if (allDomains.length > 1) {
    const sorted = [...allDomains].sort((a, b) => b.clicks - a.clicks);
    const top = sorted[0];
    const topPct = top.clicks / totalClicks * 100;
    const top3Clicks = sorted.slice(0, 3).reduce((s, d) => s + d.clicks, 0);
    const top3Pct = top3Clicks / totalClicks * 100;
    if (topPct > 5) {
      insights.push({
        type: top3Pct > 50 ? 'warning' : 'info',
        title: 'Domain Concentration',
        value: `Top 3: ${top3Pct.toFixed(0)}%`,
        detail: top3Pct > 50
          ? `The top 3 domains account for ${top3Pct.toFixed(1)}% of all clicks. ${top.domain} alone drives ${topPct.toFixed(1)}% (${top.clicks.toLocaleString()}). Heavy traffic concentration.`
          : `${top.domain} leads with ${topPct.toFixed(1)}% of all clicks (${top.clicks.toLocaleString()}). Top 3 domains account for ${top3Pct.toFixed(1)}% of traffic.`
      });
    }
  }

  const socialCat = cats.find(c => c.name === 'Social Media');
  if (socialCat && socialCat.clicks > 0 && socialCat.domains?.length > 0) {
    const topSocial = [...socialCat.domains].sort((a, b) => b.clicks - a.clicks)[0];
    insights.push({
      type: 'info',
      title: 'Social Media Clicks',
      value: socialCat.clicks.toLocaleString(),
      detail: `${socialCat.clicks.toLocaleString()} clicks to ${socialCat.domainCount} social platform${socialCat.domainCount !== 1 ? 's' : ''}. ${topSocial.domain} leads with ${topSocial.clicks.toLocaleString()} clicks.`
    });
  }

  return insights;
};

const ClickAnalytics = ({ searchTerm = '' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openCategories, setOpenCategories] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${METADATA_BLOB_URL}&_t=${Date.now()}`);
        if (!response.ok) throw new Error(`Error: ${response.status}`);
        const rawData = await response.json();
        setData(processMetadata(rawData));
      } catch (err) {
        setError('Failed to load click analytics data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleCategory = (cat) => {
    setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const filteredData = useMemo(() => {
    if (!data) return null;
    if (!searchTerm.trim()) return data;

    const filtered = data.domains.filter(d =>
      matchesSearchTerm(d.domain, searchTerm) || matchesSearchTerm(d.category, searchTerm)
    );

    const categorySummary = {};
    let totalClicks = 0;
    filtered.forEach(d => {
      totalClicks += d.clicks;
      if (!categorySummary[d.category]) {
        categorySummary[d.category] = { clicks: 0, domainCount: 0, domains: [] };
      }
      categorySummary[d.category].clicks += d.clicks;
      categorySummary[d.category].domainCount += 1;
      categorySummary[d.category].domains.push(d);
    });

    return {
      ...data,
      domains: filtered,
      categorySummary,
      totalClicks,
      uniqueDomains: filtered.length
    };
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

  if (!filteredData) return null;

  const { categorySummary, totalClicks, totalBotClicks, uniqueDomains } = filteredData;
  const sortedCategories = Object.entries(categorySummary)
    .sort(([a], [b]) => (CATEGORY_CONFIG[a]?.order ?? 99) - (CATEGORY_CONFIG[b]?.order ?? 99));

  const insights = generateInsights(data.categorySummary, data.totalClicks);

  return (
    <div className="ca-container">
      <div className="section-header-bar">
        <h3>Click Analytics</h3>
        <div className="section-header-stats">
          <div className="section-header-stat-item">
            <span className="section-header-stat-label">Total Clicks</span>
            <span className="section-header-stat-value">{totalClicks.toLocaleString()}</span>
          </div>
          <div className="section-header-stat-item">
            <span className="section-header-stat-label">Unique Domains</span>
            <span className="section-header-stat-value">{uniqueDomains}</span>
          </div>
          <div className="section-header-stat-item">
            <span className="section-header-stat-label">Bot Clicks Removed</span>
            <span className="section-header-stat-value">{totalBotClicks.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="ca-distribution">
        {sortedCategories.map(([category, stats]) => {
          const pct = totalClicks > 0 ? (stats.clicks / totalClicks * 100) : 0;
          const color = CATEGORY_CONFIG[category]?.color || '#888';
          return (
            <div className="ca-category-card" key={category}>
              <div className="ca-category-header">
                <span className="ca-category-dot" style={{ background: color }} />
                <span className="ca-category-name">{category}</span>
              </div>
              <div className="ca-category-clicks">{stats.clicks.toLocaleString()}</div>
              <div className="ca-category-meta">
                <span className="ca-category-pct">{pct.toFixed(1)}%</span>
                <span className="ca-category-domains">{stats.domainCount} domain{stats.domainCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="ca-domain-groups">
        {sortedCategories.map(([category, stats]) => {
          const color = CATEGORY_CONFIG[category]?.color || '#888';
          const isCollapsed = !openCategories[category];
          const domainsSorted = [...stats.domains].sort((a, b) => b.clicks - a.clicks);
          const isExpanded = expandedGroups[category];
          const visibleDomains = isExpanded ? domainsSorted : domainsSorted.slice(0, INITIAL_DOMAINS);
          const remaining = domainsSorted.length - INITIAL_DOMAINS;

          return (
            <div className="ca-domain-group" key={category}>
              <button
                className={`ca-group-header ${isCollapsed ? 'collapsed' : ''}`}
                onClick={() => toggleCategory(category)}
              >
                <div className="ca-group-header-left">
                  <span className="ca-group-chevron">{isCollapsed ? '▸' : '▾'}</span>
                  <span className="ca-group-dot" style={{ background: color }} />
                  <span className="ca-group-name">{category}</span>
                </div>
                <div className="ca-group-header-right">
                  <span className="ca-group-stat">{stats.clicks.toLocaleString()} clicks</span>
                  <span className="ca-group-stat-sep">·</span>
                  <span className="ca-group-stat">{stats.domainCount} domain{stats.domainCount !== 1 ? 's' : ''}</span>
                </div>
              </button>
              {!isCollapsed && (
                <div className="ca-group-body">
                  {visibleDomains.map((d, i) => {
                    const domainPct = stats.clicks > 0 ? (d.clicks / stats.clicks * 100) : 0;
                    return (
                      <div className="ca-domain-row" key={i}>
                        <span className="ca-domain-name">{d.domain}</span>
                        <div className="ca-domain-bar-wrap">
                          <div className="ca-domain-bar" style={{ width: `${domainPct}%`, background: color }} />
                        </div>
                        <span className="ca-domain-clicks">{d.clicks.toLocaleString()}</span>
                      </div>
                    );
                  })}
                  {remaining > 0 && (
                    <button
                      className="ca-group-show-more"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedGroups(prev => ({ ...prev, [category]: !prev[category] }));
                      }}
                    >
                      {isExpanded ? 'Show less' : `Show ${remaining} more domain${remaining !== 1 ? 's' : ''}`}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClickAnalytics;