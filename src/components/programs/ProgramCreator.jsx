import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { API_BASE_URL } from '../../config/api';

const STEPS = [
  { key: 'info', label: 'Program Info' },
  { key: 'email', label: 'Email Campaigns' },
  { key: 'basis', label: 'Basis' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'social', label: 'Social Media' },
  { key: 'publication', label: 'Publications' },
  { key: 'ga', label: 'Google Analytics' },
  { key: 'review', label: 'Review' },
];

const SUB_STEPS = [
  { key: 'sub_name', label: 'Name' },
  { key: 'email', label: 'Email Campaigns' },
  { key: 'basis', label: 'Basis' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'social', label: 'Social Media' },
  { key: 'publication', label: 'Publications' },
  { key: 'ga', label: 'Google Analytics' },
];

const MAIN_STEPS_WITH_SUBS = [
  { key: 'info', label: 'Program Info' },
  { key: 'sub_hub', label: 'Sub-Programs' },
];

const CHANNEL_DISPLAY = {
  'matrix': 'Matrix',
  'oncology': 'Oncology',
  'icns': 'ICNS',
  'jcad': 'JCAD',
  'nppa': 'NPPA',
};

const getChannelName = (key) => CHANNEL_DISPLAY[key] || key.charAt(0).toUpperCase() + key.slice(1);

const formatNum = (n) => n != null ? Number(n).toLocaleString() : '0';

const ABBREVIATION_MAP = {
  'nsclc': 'non-small cell lung cancer',
  'sclc': 'small cell lung cancer',
  'rcc': 'renal cell carcinoma',
  'gpp': 'generalized pustular psoriasis',
  'ht': 'hot topics',
  'icns': 'innovations in clinical neuroscience',
  'ad': 'atopic dermatitis',
  'hs': 'hidradenitis suppurativa',
  'mbc': 'metastatic breast cancer',
  'copd': 'chronic obstructive pulmonary disease',
  'ibd': 'inflammatory bowel disease',
};

const expandText = (text) => {
  if (!text) return [text?.toLowerCase() || ''];
  const lower = text.toLowerCase();
  const variants = new Set([lower]);
  const words = lower.split(/[\s\-_]+/);
  const expanded = words.map(w => ABBREVIATION_MAP[w] || w).join(' ');
  variants.add(expanded);
  return Array.from(variants);
};

const scoreMatch = (name, programName) => {
  if (!programName || !name) return 0;
  const pVariants = expandText(programName);
  const nVariants = expandText(name);
  const pWords = programName.toLowerCase().split(/[\s\-_]+/).filter(w => w.length > 2);
  let score = 0;
  for (const pw of pWords) {
    for (const nv of nVariants) {
      if (nv.includes(pw)) score += 5;
    }
  }
  for (const pv of pVariants) {
    for (const nv of nVariants) {
      const shared = pv.split(/\s+/).filter(w => w.length > 3 && nv.includes(w));
      score += shared.length * 3;
    }
  }
  return score;
};

const countTypeIn = (sels, type) => Object.values(sels).filter(s => s.item_type === type || s.item_type.startsWith(type)).length;

const ProgramCreator = ({ allData, onSave, onClose, editingProgram }) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(editingProgram?.name || '');
  const [market, setMarket] = useState(editingProgram?.description || '');
  const [search, setSearch] = useState('');
  const [markets, setMarkets] = useState([]);
  const [hasSubPrograms, setHasSubPrograms] = useState(editingProgram?.has_sub_programs || false);

  const [subPrograms, setSubPrograms] = useState(() => {
    if (!editingProgram?.has_sub_programs || !editingProgram?.sub_programs) return [];
    return editingProgram.sub_programs.map(sp => {
      const sels = {};
      (sp.items || []).forEach(item => {
        const key = `${item.item_type}::${item.item_identifier}`;
        sels[key] = { item_type: item.item_type, item_identifier: item.item_identifier, item_label: item.item_label || item.item_identifier };
      });
      return { name: sp.name, selections: sels };
    });
  });
  const [mode, setMode] = useState('main');
  const [subStep, setSubStep] = useState(0);
  const [subProgramName, setSubProgramName] = useState('');
  const [subProgramSelections, setSubProgramSelections] = useState({});
  const [editingSubIndex, setEditingSubIndex] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/ab-testing/markets`)
      .then(r => r.json())
      .then(data => { if (data.markets) setMarkets(data.markets); })
      .catch(() => {});
  }, []);

  const buildInitial = () => {
    const sel = {};
    (editingProgram?.items || []).forEach(item => {
      const key = `${item.item_type}::${item.item_identifier}`;
      sel[key] = {
        item_type: item.item_type,
        item_identifier: item.item_identifier,
        item_label: item.item_label || item.item_identifier,
      };
    });
    return sel;
  };

  const [selections, setSelections] = useState(buildInitial);

  const activeSelections = mode === 'sub_wizard' ? subProgramSelections : selections;
  const setActiveSelections = mode === 'sub_wizard' ? setSubProgramSelections : setSelections;

  const toggle = (type, id, label) => {
    const key = `${type}::${id}`;
    setActiveSelections(prev => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = { item_type: type, item_identifier: id, item_label: label };
      return next;
    });
  };

  const isOn = (type, id) => !!activeSelections[`${type}::${id}`];

  const bulkAdd = (items) => {
    setActiveSelections(prev => {
      const next = { ...prev };
      items.forEach(({ type, id, label }) => {
        next[`${type}::${id}`] = { item_type: type, item_identifier: id, item_label: label };
      });
      return next;
    });
  };

  const bulkRemove = (items) => {
    setActiveSelections(prev => {
      const next = { ...prev };
      items.forEach(({ type, id }) => { delete next[`${type}::${id}`]; });
      return next;
    });
  };

  const countType = (type) => countTypeIn(activeSelections, type);

  const sortedEmails = useMemo(() => {
    const q = search.toLowerCase();
    let list = (allData.emailCampaigns || []).filter(c => !q || c.Campaign?.toLowerCase().includes(q));
    list = list.map(c => ({ ...c, _score: name ? scoreMatch(c.Campaign, name) : 0 }));
    list.sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score;
      return new Date(b.Send_Date || 0) - new Date(a.Send_Date || 0);
    });
    return list.slice(0, 200);
  }, [allData.emailCampaigns, search, name]);

  const basisGrouped = useMemo(() => {
    const brands = allData.basisBrands || [];
    const camps = allData.basisCampaigns || [];
    const q = search.toLowerCase();

    return brands.map(brand => {
      const allCampaigns = camps.filter(c => c.brand === brand.name);
      const filteredCampaigns = q ? allCampaigns.filter(c => (c.name || '').toLowerCase().includes(q)) : allCampaigns;
      const brandMatch = !q || brand.name.toLowerCase().includes(q);
      const _score = name ? scoreMatch(brand.name + ' ' + allCampaigns.map(c => c.name).join(' '), name) : 0;
      return {
        name: brand.name,
        impressions: brand.impressions || 0,
        clicks: brand.clicks || 0,
        spend: brand.spend || 0,
        campaignCount: brand.campaign_count || allCampaigns.length,
        allCampaigns,
        filteredCampaigns,
        _score,
        visible: brandMatch || filteredCampaigns.length > 0,
      };
    }).filter(g => g.visible)
    .sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score;
      return a.name.localeCompare(b.name);
    });
  }, [allData.basisBrands, allData.basisCampaigns, search, name]);

  const ytPlaylists = useMemo(() => {
    const playlists = allData.youtubeData?.playlists || {};
    return Object.entries(playlists).map(([id, pl]) => ({
      id,
      title: pl.title,
      totalCount: pl.itemCount || (pl.videoIds || []).length,
      videoIds: pl.videoIds || [],
      _score: name ? scoreMatch(pl.title, name) : 0,
    })).sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score;
      return a.title.localeCompare(b.title);
    });
  }, [allData.youtubeData, name]);

  const ytVideos = useMemo(() => {
    const videos = allData.youtubeData?.videos || {};
    return Object.entries(videos).map(([id, v]) => ({
      id,
      title: v.title,
      views: v.current?.views || 0,
      playlists: v.playlists || [],
      publishedAt: v.publishedAt,
    }));
  }, [allData.youtubeData]);

  const getYtVideosForPlaylist = useCallback((playlistId) => {
    const pl = allData.youtubeData?.playlists?.[playlistId];
    if (!pl) return [];
    const videos = allData.youtubeData?.videos || {};
    const q = search.toLowerCase();
    return (pl.videoIds || []).map(vid => {
      const v = videos[vid];
      if (!v) return null;
      return { id: vid, title: v.title, views: v.current?.views || 0, publishedAt: v.publishedAt };
    }).filter(Boolean)
    .filter(v => !q || v.title?.toLowerCase().includes(q))
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  }, [allData.youtubeData, search]);

  const filteredYtVideos = useMemo(() => {
    const q = search.toLowerCase();
    let list = ytVideos.filter(v => !q || v.title?.toLowerCase().includes(q));
    list = list.map(v => ({ ...v, _score: name ? scoreMatch(v.title, name) : 0 }));
    list.sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score;
      return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
    });
    return list.slice(0, 200);
  }, [ytVideos, search, name]);

  const socialChannels = useMemo(() => {
    const channels = [];
    const fbCompanies = allData.facebookData?.companies || {};
    Object.entries(fbCompanies).forEach(([key, data]) => {
      const posts = data.posts || [];
      if (posts.length > 0) {
        channels.push({ key, platform: 'facebook', displayName: getChannelName(key), totalPosts: posts.length });
      }
    });
    const igCompanies = allData.instagramData?.companies || {};
    Object.entries(igCompanies).forEach(([key, data]) => {
      const media = data.media || [];
      if (media.length > 0) {
        channels.push({ key, platform: 'instagram', displayName: getChannelName(key), totalPosts: media.length });
      }
    });
    const liCompanies = allData.linkedinData?.companies || {};
    Object.entries(liCompanies).forEach(([key, data]) => {
      const posts = data.posts || [];
      if (posts.length > 0) {
        channels.push({ key, platform: 'linkedin', displayName: getChannelName(key), totalPosts: posts.length });
      }
    });
    return channels;
  }, [allData.facebookData, allData.instagramData, allData.linkedinData]);

  const getSocialPosts = useCallback((channelKey, platform) => {
    const q = search.toLowerCase();
    let posts;
    if (platform === 'facebook') {
      posts = (allData.facebookData?.companies?.[channelKey]?.posts || []).map(p => ({
        id: p.post_id || p.id,
        text: p.message || '',
        impressions: p.current?.impressions || p.current?.impressions_unique || 0,
        engagements: p.current?.engagements || p.current?.total_interactions || 0,
        createdAt: p.created_at,
      }));
    } else if (platform === 'linkedin') {
      posts = (allData.linkedinData?.companies?.[channelKey]?.posts || []).map(p => ({
        id: p.post_id || p.id,
        text: p.message || p.commentary || '',
        impressions: p.current?.impressions || p.current?.reach || 0,
        engagements: p.current?.engagements || p.current?.total_interactions || 0,
        createdAt: p.created_at,
      }));
    } else {
      posts = (allData.instagramData?.companies?.[channelKey]?.media || []).map(p => ({
        id: p.media_id || p.id,
        text: p.caption || '',
        impressions: p.current?.impressions || p.current?.reach || 0,
        engagements: p.current?.engagements || p.current?.total_interactions || 0,
        createdAt: p.created_at,
      }));
    }
    if (q) {
      posts = posts.filter(p => p.text?.toLowerCase().includes(q) || String(p.id).toLowerCase().includes(q));
    }
    posts.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return posts;
  }, [allData.facebookData, allData.instagramData, allData.linkedinData, search]);

  const pubGroups = useMemo(() => {
    const pubs = allData.walsPublications || [];
    const groups = {};
    pubs.forEach(issue => {
      const pub = issue.publication || 'Unknown';
      if (!groups[pub]) groups[pub] = [];
      groups[pub].push(issue);
    });
    const q = search.toLowerCase();
    return Object.entries(groups)
      .map(([publication, issues]) => {
        const filteredIssues = q
          ? issues.filter(i => (i.issue_name || '').toLowerCase().includes(q) || (i.issue_number || '').toString().toLowerCase().includes(q))
          : issues;
        return { publication, issues, filteredIssues };
      })
      .sort((a, b) => {
        if (name) {
          const sa = scoreMatch(a.publication, name);
          const sb = scoreMatch(b.publication, name);
          if (sb !== sa) return sb - sa;
        }
        return a.publication.localeCompare(b.publication);
      });
  }, [allData.walsPublications, search, name]);

  const gaProperties = useMemo(() => {
    const urls = allData.googleAnalytics || [];
    const groups = {};
    urls.forEach(u => {
      const prop = u.property_name || 'Unknown';
      if (!groups[prop]) groups[prop] = [];
      groups[prop].push(u);
    });
    const q = search.toLowerCase();
    return Object.entries(groups)
      .map(([property, urlList]) => {
        const filteredUrls = q
          ? urlList.filter(u => (u.url || '').toLowerCase().includes(q) || (u.title || '').toLowerCase().includes(q))
          : urlList;
        return { property, urls: urlList, filteredUrls };
      })
      .sort((a, b) => a.property.localeCompare(b.property));
  }, [allData.googleAnalytics, search]);

  const selectedItems = Object.values(selections);

  const handleSave = () => {
    if (!name.trim()) return;
    if (hasSubPrograms) {
      onSave({
        id: editingProgram?.id,
        name: name.trim(),
        market: market.trim(),
        has_sub_programs: true,
        items: [],
        sub_programs: subPrograms.map((sp, idx) => ({
          name: sp.name,
          sort_order: idx,
          items: Object.values(sp.selections),
        })),
      });
    } else {
      onSave({ id: editingProgram?.id, name: name.trim(), market: market.trim(), items: selectedItems });
    }
  };

  const [expandedGroups, setExpandedGroups] = useState({});
  const toggleGroup = (key) => setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));

  const mainSteps = hasSubPrograms ? MAIN_STEPS_WITH_SUBS : STEPS;
  const currentMainStep = mainSteps[step];

  const hasRecommendations = name.trim().length > 2;

  const renderRecommendationBanner = () => {
    if (!hasRecommendations) return null;
    return (
      <div className="pp-rec-banner">
        <span className="pp-rec-icon">&#9733;</span>
        Items are sorted by relevance to &ldquo;{name}&rdquo;
      </div>
    );
  };

  const startAddSubProgram = () => {
    setSubProgramName('');
    setSubProgramSelections({});
    setEditingSubIndex(null);
    setSubStep(0);
    setSearch('');
    setMode('sub_wizard');
  };

  const startEditSubProgram = (idx) => {
    const sp = subPrograms[idx];
    setSubProgramName(sp.name);
    setSubProgramSelections({ ...sp.selections });
    setEditingSubIndex(idx);
    setSubStep(0);
    setSearch('');
    setMode('sub_wizard');
  };

  const deleteSubProgram = (idx) => {
    setSubPrograms(prev => prev.filter((_, i) => i !== idx));
  };

  const saveSubProgram = () => {
    const sp = { name: subProgramName.trim(), selections: subProgramSelections };
    if (editingSubIndex !== null) {
      setSubPrograms(prev => prev.map((p, i) => i === editingSubIndex ? sp : p));
    } else {
      setSubPrograms(prev => [...prev, sp]);
    }
    setMode('main');
    setSearch('');
  };

  const cancelSubWizard = () => {
    setMode('main');
    setSearch('');
  };

  const currentSubStep = SUB_STEPS[subStep];
  const subCountType = (type) => countTypeIn(subProgramSelections, type);

  const activeStepKey = mode === 'sub_wizard' ? currentSubStep?.key : currentMainStep?.key;

  const totalSubItemCount = subPrograms.reduce((sum, sp) => sum + Object.keys(sp.selections).length, 0);

  const renderStepContent = (stepKey) => {
    if (stepKey === 'sub_name') {
      return (
        <div className="pp-wizard-info">
          <div className="pp-form-group">
            <label className="pp-label-lg">Sub-Program Name</label>
            <input
              type="text"
              className="pp-input pp-input-lg"
              value={subProgramName}
              onChange={e => setSubProgramName(e.target.value)}
              autoFocus
            />
          </div>
        </div>
      );
    }

    if (stepKey === 'email') {
      return (
        <div className="pp-wizard-step">
          {renderRecommendationBanner()}
          <div className="pp-step-toolbar">
            <input type="text" className="pp-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" />
            <span className="pp-selection-count">{countType('email_campaign')} selected</span>
          </div>
          <div className="pp-selectable-list">
            {sortedEmails.length === 0 ? (
              <div className="pp-empty-list">No campaigns found</div>
            ) : sortedEmails.map(c => (
              <label key={c.Campaign} className={`pp-selectable-item ${isOn('email_campaign', c.Campaign) ? 'selected' : ''} ${c._score > 0 ? 'recommended' : ''}`}>
                <input type="checkbox" checked={isOn('email_campaign', c.Campaign)} onChange={() => toggle('email_campaign', c.Campaign, c.Campaign)} />
                <div className="pp-selectable-info">
                  <span className="pp-selectable-name">{c.Campaign}</span>
                  <span className="pp-selectable-detail">
                    {c.Send_Date ? new Date(c.Send_Date).toLocaleDateString() + ' | ' : ''}{formatNum(c.Delivered)} delivered | {(c.Unique_Open_Rate || 0).toFixed(1)}% open | {(c.Unique_Click_Rate || 0).toFixed(1)}% click
                  </span>
                </div>
                {c._score > 0 && <span className="pp-match-badge">match</span>}
              </label>
            ))}
          </div>
        </div>
      );
    }

    if (stepKey === 'basis') {
      return (
        <div className="pp-wizard-step">
          {renderRecommendationBanner()}
          <div className="pp-step-toolbar">
            <input type="text" className="pp-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" />
            <span className="pp-selection-count">{countType('basis')} selected</span>
          </div>
          <div className="pp-hierarchy-info">Select entire brands (all campaigns auto-included) or expand to pick individual campaigns</div>
          <div className="pp-selectable-list">
            {basisGrouped.length === 0 ? (
              <div className="pp-empty-list">No Basis data found</div>
            ) : basisGrouped.map(g => {
              const brandKey = `basis_brand::${g.name}`;
              const isBrandSelected = !!activeSelections[brandKey];
              const isExpanded = expandedGroups[`basis-${g.name}`];
              return (
                <div key={g.name} className={`pp-group-container ${g._score > 0 ? 'recommended' : ''}`}>
                  <div className="pp-group-header">
                    <label className={`pp-group-check ${isBrandSelected ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isBrandSelected}
                        onChange={() => {
                          if (isBrandSelected) {
                            setActiveSelections(prev => { const n = { ...prev }; delete n[brandKey]; return n; });
                          } else {
                            setActiveSelections(prev => ({
                              ...prev,
                              [brandKey]: { item_type: 'basis_brand', item_identifier: g.name, item_label: g.name }
                            }));
                          }
                        }}
                      />
                      <div className="pp-group-info">
                        <span className="pp-group-name">{g.name}</span>
                        <span className="pp-group-meta">{g.filteredCampaigns.length} campaign{g.filteredCampaigns.length !== 1 ? 's' : ''}{search && g.filteredCampaigns.length !== g.allCampaigns.length ? ` (of ${g.allCampaigns.length})` : ''} | {formatNum(g.impressions)} impr | ${Number(g.spend || 0).toFixed(0)} spend</span>
                      </div>
                    </label>
                    <button className="pp-group-expand" onClick={() => toggleGroup(`basis-${g.name}`)}>
                      {isExpanded ? '\u2212' : '+'}
                    </button>
                    {g._score > 0 && <span className="pp-match-badge">match</span>}
                  </div>
                  {isExpanded && (
                    <div className="pp-group-children">
                      <div className="pp-group-children-actions">
                        <button className="pp-btn-mini" onClick={() => bulkAdd(g.filteredCampaigns.map(c => ({ type: 'basis_campaign', id: c.name || c.id, label: c.name || `Campaign ${c.id}` })))}>Select All</button>
                        <button className="pp-btn-mini" onClick={() => bulkRemove(g.filteredCampaigns.map(c => ({ type: 'basis_campaign', id: c.name || c.id })))}>Deselect All</button>
                      </div>
                      {g.filteredCampaigns.map(camp => (
                        <label key={camp.id || camp.name} className={`pp-selectable-item sub ${isOn('basis_campaign', camp.name || camp.id) ? 'selected' : ''}`}>
                          <input type="checkbox" checked={isOn('basis_campaign', camp.name || camp.id)} onChange={() => toggle('basis_campaign', camp.name || camp.id, camp.name || `Campaign ${camp.id}`)} />
                          <div className="pp-selectable-info">
                            <span className="pp-selectable-name">{camp.name || `Campaign ${camp.id}`}</span>
                            <span className="pp-selectable-detail">{formatNum(camp.impressions || 0)} impr | {formatNum(camp.clicks || 0)} clicks | ${Number(camp.spend || 0).toFixed(0)} spend</span>
                          </div>
                        </label>
                      ))}
                      {g.filteredCampaigns.length === 0 && <div className="pp-empty-children">{search ? 'No campaigns match your search' : 'No campaigns found'}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (stepKey === 'youtube') {
      return (
        <div className="pp-wizard-step">
          {renderRecommendationBanner()}
          <div className="pp-step-toolbar">
            <input type="text" className="pp-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" />
            <span className="pp-selection-count">{countType('youtube')} selected</span>
          </div>
          <div className="pp-hierarchy-info">Select playlists (new videos auto-added) or expand to pick individual videos</div>
          <div className="pp-selectable-list">
            {ytPlaylists.length > 0 && <div className="pp-list-group-label">Playlists</div>}
            {ytPlaylists.map(pl => {
              const plKey = `youtube_playlist::${pl.id}`;
              const isPlSelected = !!activeSelections[plKey];
              const isExpanded = expandedGroups[`yt-${pl.id}`];
              const videos = getYtVideosForPlaylist(pl.id);
              return (
                <div key={pl.id} className={`pp-group-container ${pl._score > 0 ? 'recommended' : ''}`}>
                  <div className="pp-group-header">
                    <label className={`pp-group-check ${isPlSelected ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isPlSelected}
                        onChange={() => {
                          if (isPlSelected) {
                            setActiveSelections(prev => { const n = { ...prev }; delete n[plKey]; return n; });
                          } else {
                            setActiveSelections(prev => ({
                              ...prev,
                              [plKey]: { item_type: 'youtube_playlist', item_identifier: pl.id, item_label: pl.title }
                            }));
                          }
                        }}
                      />
                      <div className="pp-group-info">
                        <span className="pp-group-name">{pl.title}</span>
                        <span className="pp-group-meta">{videos.length} video{videos.length !== 1 ? 's' : ''}{search && videos.length !== pl.totalCount ? ` (of ${pl.totalCount})` : ''}</span>
                      </div>
                    </label>
                    <button className="pp-group-expand" onClick={() => toggleGroup(`yt-${pl.id}`)}>
                      {isExpanded ? '\u2212' : '+'}
                    </button>
                    {pl._score > 0 && <span className="pp-match-badge">match</span>}
                  </div>
                  {isExpanded && (
                    <div className="pp-group-children">
                      <div className="pp-group-children-actions">
                        <button className="pp-btn-mini" onClick={() => bulkAdd(videos.map(v => ({ type: 'youtube_video', id: v.id, label: v.title })))}>Select All</button>
                        <button className="pp-btn-mini" onClick={() => bulkRemove(videos.map(v => ({ type: 'youtube_video', id: v.id })))}>Deselect All</button>
                      </div>
                      {videos.map(v => (
                        <label key={v.id} className={`pp-selectable-item sub ${isOn('youtube_video', v.id) ? 'selected' : ''}`}>
                          <input type="checkbox" checked={isOn('youtube_video', v.id)} onChange={() => toggle('youtube_video', v.id, v.title)} />
                          <div className="pp-selectable-info">
                            <span className="pp-selectable-name">{v.title}</span>
                            <span className="pp-selectable-detail">{formatNum(v.views)} views</span>
                          </div>
                        </label>
                      ))}
                      {videos.length === 0 && <div className="pp-empty-children">{search ? 'No videos match your search' : 'No videos in playlist'}</div>}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="pp-list-group-label">Individual Videos</div>
            {filteredYtVideos.slice(0, 50).map(v => (
              <label key={v.id} className={`pp-selectable-item ${isOn('youtube_video', v.id) ? 'selected' : ''} ${v._score > 0 ? 'recommended' : ''}`}>
                <input type="checkbox" checked={isOn('youtube_video', v.id)} onChange={() => toggle('youtube_video', v.id, v.title)} />
                <div className="pp-selectable-info">
                  <span className="pp-selectable-name">{v.title}</span>
                  <span className="pp-selectable-detail">{formatNum(v.views)} views</span>
                </div>
                {v._score > 0 && <span className="pp-match-badge">match</span>}
              </label>
            ))}
            {ytPlaylists.length === 0 && filteredYtVideos.length === 0 && (
              <div className="pp-empty-list">No YouTube data found</div>
            )}
          </div>
        </div>
      );
    }

    if (stepKey === 'social') {
      return (
        <div className="pp-wizard-step">
          {renderRecommendationBanner()}
          <div className="pp-step-toolbar">
            <input type="text" className="pp-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" />
            <span className="pp-selection-count">{countType('facebook') + countType('instagram') + countType('linkedin') + countType('social')} selected</span>
          </div>
          <div className="pp-hierarchy-info">Select entire channels (all posts auto-included) or expand to pick individual posts</div>
          <div className="pp-selectable-list">
            {socialChannels.length === 0 ? (
              <div className="pp-empty-list">No social media data found</div>
            ) : socialChannels.map(ch => {
              const chKey = `social_channel::${ch.platform}_${ch.key}`;
              const isChSelected = !!activeSelections[chKey];
              const isExpanded = expandedGroups[`social-${ch.platform}-${ch.key}`];
              const posts = getSocialPosts(ch.key, ch.platform);
              const platformLabel = ch.platform === 'facebook' ? 'FB' : ch.platform === 'linkedin' ? 'LI' : 'IG';
              return (
                <div key={`${ch.platform}-${ch.key}`} className="pp-group-container">
                  <div className="pp-group-header">
                    <label className={`pp-group-check ${isChSelected ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isChSelected}
                        onChange={() => {
                          if (isChSelected) {
                            setActiveSelections(prev => { const n = { ...prev }; delete n[chKey]; return n; });
                          } else {
                            setActiveSelections(prev => ({
                              ...prev,
                              [chKey]: { item_type: 'social_channel', item_identifier: `${ch.platform}_${ch.key}`, item_label: `${ch.displayName} (${platformLabel})` }
                            }));
                          }
                        }}
                      />
                      <div className="pp-group-info">
                        <span className="pp-group-name">{ch.displayName}</span>
                        <span className="pp-group-meta">{platformLabel} | {posts.length} post{posts.length !== 1 ? 's' : ''}{search && posts.length !== ch.totalPosts ? ` (of ${ch.totalPosts})` : ''}</span>
                      </div>
                    </label>
                    <button className="pp-group-expand" onClick={() => toggleGroup(`social-${ch.platform}-${ch.key}`)}>
                      {isExpanded ? '\u2212' : '+'}
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="pp-group-children">
                      <div className="pp-group-children-actions">
                        <button className="pp-btn-mini" onClick={() => bulkAdd(posts.map(p => ({ type: `${ch.platform}_post`, id: String(p.id), label: (p.text || '').substring(0, 80) || `Post ${p.id}` })))}>Select All</button>
                        <button className="pp-btn-mini" onClick={() => bulkRemove(posts.map(p => ({ type: `${ch.platform}_post`, id: String(p.id) })))}>Deselect All</button>
                      </div>
                      {posts.slice(0, 50).map(p => {
                        const postLabel = (p.text || '').substring(0, 80) || `Post ${p.id}`;
                        const postType = `${ch.platform}_post`;
                        return (
                          <label key={p.id} className={`pp-selectable-item sub ${isOn(postType, String(p.id)) ? 'selected' : ''}`}>
                            <input type="checkbox" checked={isOn(postType, String(p.id))} onChange={() => toggle(postType, String(p.id), postLabel)} />
                            <div className="pp-selectable-info">
                              <span className="pp-selectable-name">{postLabel}</span>
                              <span className="pp-selectable-detail">{formatNum(p.impressions)} reach | {formatNum(p.engagements)} eng</span>
                            </div>
                          </label>
                        );
                      })}
                      {posts.length === 0 && <div className="pp-empty-children">{search ? 'No posts match your search' : 'No posts found'}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (stepKey === 'publication') {
      return (
        <div className="pp-wizard-step">
          {renderRecommendationBanner()}
          <div className="pp-step-toolbar">
            <input type="text" className="pp-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" />
            <span className="pp-selection-count">{countType('walsworth')} selected</span>
          </div>
          <div className="pp-hierarchy-info">Select entire publications (all issues auto-included) or expand to pick individual issues</div>
          <div className="pp-selectable-list">
            {pubGroups.length === 0 ? (
              <div className="pp-empty-list">No publications found</div>
            ) : pubGroups.map(g => {
              const pubKey = `walsworth_publication::${g.publication}`;
              const isPubSelected = !!activeSelections[pubKey];
              const isExpanded = expandedGroups[`pub-${g.publication}`];
              return (
                <div key={g.publication} className="pp-group-container">
                  <div className="pp-group-header">
                    <label className={`pp-group-check ${isPubSelected ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isPubSelected}
                        onChange={() => {
                          if (isPubSelected) {
                            setActiveSelections(prev => { const n = { ...prev }; delete n[pubKey]; return n; });
                          } else {
                            setActiveSelections(prev => ({
                              ...prev,
                              [pubKey]: { item_type: 'walsworth_publication', item_identifier: g.publication, item_label: g.publication }
                            }));
                          }
                        }}
                      />
                      <div className="pp-group-info">
                        <span className="pp-group-name">{g.publication}</span>
                        <span className="pp-group-meta">{g.filteredIssues.length} issue{g.filteredIssues.length !== 1 ? 's' : ''}{search && g.filteredIssues.length !== g.issues.length ? ` (of ${g.issues.length})` : ''}</span>
                      </div>
                    </label>
                    <button className="pp-group-expand" onClick={() => toggleGroup(`pub-${g.publication}`)}>
                      {isExpanded ? '\u2212' : '+'}
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="pp-group-children">
                      <div className="pp-group-children-actions">
                        <button className="pp-btn-mini" onClick={() => bulkAdd(g.filteredIssues.map(i => ({ type: 'walsworth_issue', id: i.issue_id || i.issue_name || i.issue_number, label: `${g.publication} - ${i.issue_name || i.issue_number}` })))}>Select All</button>
                        <button className="pp-btn-mini" onClick={() => bulkRemove(g.filteredIssues.map(i => ({ type: 'walsworth_issue', id: i.issue_id || i.issue_name || i.issue_number })))}>Deselect All</button>
                      </div>
                      {g.filteredIssues.map((issue, idx) => {
                        const issueId = issue.issue_id || issue.issue_name || issue.issue_number || `issue-${idx}`;
                        const issueLabel = `${g.publication} - ${issue.issue_name || issue.issue_number || `Issue ${idx + 1}`}`;
                        const views = issue.current?.total_page_views || 0;
                        return (
                          <label key={issueId} className={`pp-selectable-item sub ${isOn('walsworth_issue', issueId) ? 'selected' : ''}`}>
                            <input type="checkbox" checked={isOn('walsworth_issue', issueId)} onChange={() => toggle('walsworth_issue', issueId, issueLabel)} />
                            <div className="pp-selectable-info">
                              <span className="pp-selectable-name">{issue.issue_name || issue.issue_number || `Issue ${idx + 1}`}</span>
                              <span className="pp-selectable-detail">{formatNum(views)} page views</span>
                            </div>
                          </label>
                        );
                      })}
                      {g.filteredIssues.length === 0 && <div className="pp-empty-children">{search ? 'No issues match your search' : 'No issues found'}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (stepKey === 'ga') {
      return (
        <div className="pp-wizard-step">
          <div className="pp-step-toolbar">
            <input type="text" className="pp-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" />
            <span className="pp-selection-count">{countType('ga')} selected</span>
          </div>
          <div className="pp-hierarchy-info">Select entire properties (all URLs auto-included) or expand to pick individual URLs</div>
          <div className="pp-selectable-list">
            {gaProperties.length === 0 ? (
              <div className="pp-empty-list">No Google Analytics data found</div>
            ) : gaProperties.map(g => {
              const propKey = `ga_property::${g.property}`;
              const isPropSelected = !!activeSelections[propKey];
              const isExpanded = expandedGroups[`ga-${g.property}`];
              return (
                <div key={g.property} className="pp-group-container">
                  <div className="pp-group-header">
                    <label className={`pp-group-check ${isPropSelected ? 'selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={isPropSelected}
                        onChange={() => {
                          if (isPropSelected) {
                            setActiveSelections(prev => { const n = { ...prev }; delete n[propKey]; return n; });
                          } else {
                            setActiveSelections(prev => ({
                              ...prev,
                              [propKey]: { item_type: 'ga_property', item_identifier: g.property, item_label: g.property }
                            }));
                          }
                        }}
                      />
                      <div className="pp-group-info">
                        <span className="pp-group-name">{g.property}</span>
                        <span className="pp-group-meta">{g.filteredUrls.length} URL{g.filteredUrls.length !== 1 ? 's' : ''}{search && g.filteredUrls.length !== g.urls.length ? ` (of ${g.urls.length})` : ''}</span>
                      </div>
                    </label>
                    <button className="pp-group-expand" onClick={() => toggleGroup(`ga-${g.property}`)}>
                      {isExpanded ? '\u2212' : '+'}
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="pp-group-children">
                      <div className="pp-group-children-actions">
                        <button className="pp-btn-mini" onClick={() => bulkAdd(g.filteredUrls.map(u => ({ type: 'ga_url', id: u.url, label: u.title || u.url })))}>Select All</button>
                        <button className="pp-btn-mini" onClick={() => bulkRemove(g.filteredUrls.map(u => ({ type: 'ga_url', id: u.url })))}>Deselect All</button>
                      </div>
                      {g.filteredUrls.slice(0, 50).map(u => (
                        <label key={u.url} className={`pp-selectable-item sub ${isOn('ga_url', u.url) ? 'selected' : ''}`}>
                          <input type="checkbox" checked={isOn('ga_url', u.url)} onChange={() => toggle('ga_url', u.url, u.title || u.url)} />
                          <div className="pp-selectable-info">
                            <span className="pp-selectable-name">{u.title || u.url}</span>
                            <span className="pp-selectable-detail">{formatNum(u.current?.total_users || 0)} users | {(u.current?.bounce_rate || 0).toFixed(1)}% bounce</span>
                          </div>
                        </label>
                      ))}
                      {g.filteredUrls.length === 0 && <div className="pp-empty-children">{search ? 'No URLs match your search' : 'No URLs found'}</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="pp-modal-overlay" onClick={onClose}>
      <div className="pp-modal" onClick={e => e.stopPropagation()}>
        <div className="pp-modal-header">
          <h2>
            {mode === 'sub_wizard'
              ? `${editingSubIndex !== null ? 'Edit' : 'Add'} Sub-Program${subProgramName ? `: ${subProgramName}` : ''}`
              : (editingProgram ? 'Edit Program' : 'Create Program')}
          </h2>
          <button className="pp-modal-close" onClick={mode === 'sub_wizard' ? cancelSubWizard : onClose}>&times;</button>
        </div>

        {mode === 'main' && (
          <div className="pp-step-indicator">
            {mainSteps.map((s, i) => {
              let count = 0;
              if (!hasSubPrograms) {
                if (s.key === 'email') count = countTypeIn(selections, 'email_campaign');
                if (s.key === 'basis') count = countTypeIn(selections, 'basis');
                if (s.key === 'youtube') count = countTypeIn(selections, 'youtube');
                if (s.key === 'social') count = countTypeIn(selections, 'facebook') + countTypeIn(selections, 'instagram') + countTypeIn(selections, 'linkedin') + countTypeIn(selections, 'social');
                if (s.key === 'publication') count = countTypeIn(selections, 'walsworth');
                if (s.key === 'ga') count = countTypeIn(selections, 'ga');
              } else {
                if (s.key === 'sub_hub') count = subPrograms.length;
              }
              return (
                <button
                  key={s.key}
                  className={`pp-step ${i === step ? 'active' : ''} ${count > 0 ? 'has-items' : ''}`}
                  onClick={() => { setSearch(''); setStep(i); }}
                >
                  <span className="pp-step-num">{count > 0 ? count : i + 1}</span>
                  <span className="pp-step-label">{s.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {mode === 'sub_wizard' && (
          <div className="pp-step-indicator pp-step-indicator-sub">
            {SUB_STEPS.map((s, i) => {
              let count = 0;
              if (s.key === 'email') count = subCountType('email_campaign');
              if (s.key === 'basis') count = subCountType('basis');
              if (s.key === 'youtube') count = subCountType('youtube');
              if (s.key === 'social') count = subCountType('facebook') + subCountType('instagram') + subCountType('linkedin') + subCountType('social');
              if (s.key === 'publication') count = subCountType('walsworth');
              if (s.key === 'ga') count = subCountType('ga');
              return (
                <button
                  key={s.key}
                  className={`pp-step ${i === subStep ? 'active' : ''} ${count > 0 ? 'has-items' : ''}`}
                  onClick={() => { setSearch(''); setSubStep(i); }}
                >
                  <span className="pp-step-num">{count > 0 ? count : i + 1}</span>
                  <span className="pp-step-label">{s.label}</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="pp-modal-body">
          {mode === 'main' && activeStepKey === 'info' && (
            <div className="pp-wizard-info">
              <div className="pp-form-group">
                <label className="pp-label-lg">Program Name</label>
                <input
                  type="text"
                  className="pp-input pp-input-lg"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Program name"
                  autoFocus
                />
              </div>
              <div className="pp-form-group">
                <label className="pp-label-lg">Market</label>
                <select
                  className="pp-input pp-input-lg"
                  value={market}
                  onChange={e => setMarket(e.target.value)}
                >
                  <option value="">Market</option>
                  {markets.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div
                className={`pp-sub-toggle-pill ${hasSubPrograms ? 'active' : ''}`}
                onClick={() => {
                  const val = !hasSubPrograms;
                  if (!val && subPrograms.length > 0) {
                    if (!window.confirm('Switching off sub-programs will remove all sub-programs you\'ve added. Continue?')) return;
                    setSubPrograms([]);
                  }
                  if (val && Object.keys(selections).length > 0) {
                    if (!window.confirm('Switching to sub-programs will clear your current item selections. Continue?')) return;
                    setSelections({});
                  }
                  setHasSubPrograms(val);
                  setStep(0);
                }}
              >
                <div className="pp-sub-toggle-track">
                  <div className="pp-sub-toggle-thumb" />
                </div>
                <span className="pp-sub-toggle-text">Sub-Programs</span>
              </div>
            </div>
          )}

          {mode === 'main' && activeStepKey === 'sub_hub' && (
            <div className="pp-wizard-step pp-sub-hub">
              <div className="pp-sub-hub-header">
                <h3 className="pp-sub-hub-title">Sub-Programs for &ldquo;{name || 'Untitled'}&rdquo;</h3>
                <span className="pp-sub-hub-count">{subPrograms.length} sub-program{subPrograms.length !== 1 ? 's' : ''} &middot; {totalSubItemCount} total items</span>
              </div>

              {subPrograms.length === 0 ? (
                <div className="pp-sub-hub-empty">
                  <p>No sub-programs yet. Add your first sub-program to get started.</p>
                </div>
              ) : (
                <div className="pp-sub-hub-grid">
                  {subPrograms.map((sp, idx) => {
                    const itemCount = Object.keys(sp.selections).length;
                    const types = {};
                    Object.values(sp.selections).forEach(s => {
                      const t = s.item_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                      types[t] = (types[t] || 0) + 1;
                    });
                    return (
                      <div key={idx} className="pp-sub-hub-card">
                        <div className="pp-sub-hub-card-header">
                          <span className="pp-sub-hub-card-num">{idx + 1}</span>
                          <h4 className="pp-sub-hub-card-name">{sp.name}</h4>
                          <span className="pp-sub-hub-card-count">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="pp-sub-hub-card-types">
                          {Object.entries(types).map(([t, c]) => (
                            <span key={t} className="pp-sub-hub-type-badge">{c} {t}</span>
                          ))}
                          {itemCount === 0 && <span className="pp-sub-hub-type-badge pp-sub-hub-type-empty">No items</span>}
                        </div>
                        <div className="pp-sub-hub-card-actions">
                          <button className="pp-btn pp-btn-edit pp-btn-sm" onClick={() => startEditSubProgram(idx)}>Edit</button>
                          <button className="pp-btn pp-btn-delete pp-btn-sm" onClick={() => deleteSubProgram(idx)}>Remove</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <button className="pp-btn pp-btn-create pp-sub-hub-add" onClick={startAddSubProgram}>
                + Add Sub-Program
              </button>
            </div>
          )}

          {mode === 'main' && !hasSubPrograms && activeStepKey !== 'info' && activeStepKey !== 'review' && renderStepContent(activeStepKey)}

          {mode === 'main' && !hasSubPrograms && activeStepKey === 'review' && (
            <div className="pp-wizard-step pp-review-step">
              <div className="pp-review-header">
                <h3>{name || 'Untitled Program'}</h3>
                {market && <span className="pp-review-market">{market}</span>}
              </div>
              <div className="pp-review-summary">
                <span className="pp-review-total">{selectedItems.length} total items</span>
              </div>
              {selectedItems.length === 0 ? (
                <div className="pp-empty-list">No items selected. Go back to add items to this program.</div>
              ) : (
                <div className="pp-review-groups">
                  {Object.entries(
                    selectedItems.reduce((acc, item) => {
                      const label = item.item_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                      if (!acc[label]) acc[label] = [];
                      acc[label].push(item);
                      return acc;
                    }, {})
                  ).map(([typeLabel, items]) => (
                    <div key={typeLabel} className="pp-review-group">
                      <h4>{typeLabel} ({items.length})</h4>
                      <div className="pp-review-items">
                        {items.map(i => (
                          <div key={`${i.item_type}-${i.item_identifier}`} className="pp-review-item">
                            <span>{i.item_label || i.item_identifier}</span>
                            <button
                              className="pp-review-remove"
                              onClick={() => {
                                const key = `${i.item_type}::${i.item_identifier}`;
                                setSelections(prev => { const n = { ...prev }; delete n[key]; return n; });
                              }}
                            >&times;</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {mode === 'sub_wizard' && renderStepContent(activeStepKey)}
        </div>

        <div className="pp-modal-footer">
          {mode === 'main' && (
            <>
              <button className="pp-btn pp-btn-secondary" onClick={() => step > 0 ? (setSearch(''), setStep(step - 1)) : onClose()}>
                {step === 0 ? 'Cancel' : 'Back'}
              </button>
              <div className="pp-footer-right">
                {!hasSubPrograms && step > 0 && step < mainSteps.length - 1 && (
                  <button className="pp-btn pp-btn-ghost" onClick={() => { setSearch(''); setStep(mainSteps.length - 1); }}>
                    Skip to Review
                  </button>
                )}
                {hasSubPrograms && step === mainSteps.length - 1 ? (
                  <button className="pp-btn pp-btn-primary" onClick={handleSave} disabled={!name.trim() || subPrograms.length === 0}>
                    {editingProgram ? 'Save Changes' : 'Create Program'}
                  </button>
                ) : !hasSubPrograms && step === mainSteps.length - 1 ? (
                  <button className="pp-btn pp-btn-primary" onClick={handleSave} disabled={!name.trim()}>
                    {editingProgram ? 'Save Changes' : 'Create Program'}
                  </button>
                ) : (
                  <button className="pp-btn pp-btn-primary" onClick={() => { setSearch(''); setStep(step + 1); }} disabled={step === 0 && !name.trim()}>
                    Next
                  </button>
                )}
              </div>
            </>
          )}

          {mode === 'sub_wizard' && (
            <>
              <button className="pp-btn pp-btn-secondary" onClick={() => subStep > 0 ? (setSearch(''), setSubStep(subStep - 1)) : cancelSubWizard()}>
                {subStep === 0 ? 'Cancel' : 'Back'}
              </button>
              <div className="pp-footer-right">
                {subStep < SUB_STEPS.length - 1 ? (
                  <button className="pp-btn pp-btn-primary" onClick={() => { setSearch(''); setSubStep(subStep + 1); }} disabled={subStep === 0 && !subProgramName.trim()}>
                    Next
                  </button>
                ) : (
                  <button className="pp-btn pp-btn-primary" onClick={saveSubProgram} disabled={!subProgramName.trim()}>
                    {editingSubIndex !== null ? 'Update Sub-Program' : 'Save Sub-Program'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgramCreator;