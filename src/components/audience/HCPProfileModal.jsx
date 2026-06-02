import React, { useState, useEffect, useMemo, useRef } from 'react';
import { API_BASE_URL } from '../../config/api';
import { matchesSearchTerm } from '../../utils/searchUtils';
import '../../styles/HCPProfileModal.css';

const TAB_LABELS = {
  timeline: 'Timeline',
  state: 'Current State',
  engagement: 'Engagement',
  campaigns: 'Campaigns',
  ga: 'GA Match',
};

const FILTER_LABELS = {
  all: 'All',
  engagement: 'Engagement',
  membership: 'List & Tag',
  target: 'Target Lists',
  bounce: 'Bounces',
  unsub: 'Unsubs',
};

const formatRelative = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays < 0) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
};

const formatDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const formatDayKey = (iso) => {
  if (!iso) return 'undated';
  return iso.slice(0, 10);
};

const formatDayLabel = (key) => {
  if (!key || key === 'undated') return 'Undated';
  const d = new Date(key + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yest = new Date(today.getTime() - 86400000);
  const dKey = d.toISOString().slice(0, 10);
  if (dKey === today.toISOString().slice(0, 10)) return 'Today';
  if (dKey === yest.toISOString().slice(0, 10)) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDuration = (ms) => {
  if (!ms) return '—';
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(0)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
};

const stripUrl = (url) => {
  if (!url) return '';
  return url.replace(/^https?:\/\/(www\.)?/, '').split('?')[0];
};

const eventDotClass = (e) => {
  if (e.category === 'unsub') return 'unsub';
  if (e.category === 'bounce') return 'bounce';
  if (e.category === 'membership') return 'membership';
  if (e.from_target_list) return 'target';
  return 'engagement';
};

const eventBadgeClass = (e) => {
  if (e.category === 'unsub') return 'unsub';
  if (e.category === 'bounce') return 'bounce';
  if (e.category === 'membership') return e.event === 'removed' ? 'membership-removed' : 'membership-added';
  if (e.event === 'click') return 'engagement-click';
  if (e.event === 'open') return 'engagement-open';
  return 'engagement-sent';
};

const eventBadgeText = (e) => {
  if (e.category === 'unsub') return 'unsub';
  if (e.category === 'bounce') return 'bounce';
  if (e.category === 'membership') {
    if (e.dimension === 'list') return e.event === 'added' ? 'list +' : 'list −';
    if (e.dimension === 'tag') return e.event === 'added' ? 'tag +' : 'tag −';
    if (e.dimension === 'segment') return e.event === 'added' ? 'seg +' : 'seg −';
    if (e.dimension === 'master') return e.event === 'added' ? 'master +' : 'master −';
    return e.event;
  }
  return e.event || 'event';
};

const filterMatches = (e, filter) => {
  if (filter === 'all') return true;
  if (filter === 'engagement') return e.category === 'engagement';
  if (filter === 'membership') return e.category === 'membership';
  if (filter === 'target') return e.from_target_list === true;
  if (filter === 'bounce') return e.category === 'bounce';
  if (filter === 'unsub') return e.category === 'unsub';
  return true;
};

const eventSearchText = (e) =>
  [e.name, e.campaign_name, e.campaign_subject, e.brand, e.agency, e.url, e.dimension]
    .filter(Boolean)
    .join(' ');

const HCPProfileModal = ({ hcp, position, hasPrev, hasNext, onPrev, onNext, onClose }) => {
  const [activeTab, setActiveTab] = useState('timeline');
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedSession, setExpandedSession] = useState(null);
  const overlayRef = useRef(null);

  const isAnonymous = !!hcp?.is_anonymous_ga;
  const hcpEmail = (hcp?.email || '').trim();
  const hcpNpi = (hcp?.npi || '').trim();
  const hasGA = !!(hcp?.user_pseudo_id || hcp?.ga_profile?.recent_events?.length || hcp?.ga_sessions?.length);

  const tabs = useMemo(() => {
    const base = isAnonymous
      ? ['ga']
      : ['timeline', 'state', 'engagement', 'campaigns'];
    if (!isAnonymous && hasGA) base.push('ga');
    return base;
  }, [isAnonymous, hasGA]);

  useEffect(() => {
    if (!tabs.includes(activeTab)) setActiveTab(tabs[0]);
  }, [tabs, activeTab]);

  useEffect(() => {
    setFilter('all');
    setSearch('');
    setExpandedSession(null);
  }, [hcpEmail, hcpNpi]);

  useEffect(() => {
    if (isAnonymous || (!hcpEmail && !hcpNpi)) {
      setProfileData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE_URL}/api/users/profile-timeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: hcpEmail, npi: hcpNpi }),
    })
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (d.success) {
          setProfileData(d);
        } else {
          setError(d.error || 'Failed to load profile');
        }
        setLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err.message || 'Network error');
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [hcpEmail, hcpNpi, isAnonymous]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      else if (e.key === 'ArrowRight' && hasNext) onNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hasPrev, hasNext, onPrev, onNext, onClose]);

  const profile = profileData?.profile;
  const currentState = profileData?.current_state;
  const totals = profileData?.totals;
  const timeline = profileData?.timeline || [];
  const campaignsSummary = profileData?.campaigns_summary || [];

  const displayName = useMemo(() => {
    if (isAnonymous) return 'Anonymous GA User';
    return (profile?.name || hcp?.name || '').trim() || hcpEmail || (hcpNpi ? `NPI ${hcpNpi}` : 'Unknown');
  }, [isAnonymous, profile, hcp, hcpEmail, hcpNpi]);

  const sourceLabel = profile?.source || null;
  const isActive = profile?.is_active;

  const filterCounts = useMemo(() => {
    const c = { all: timeline.length, engagement: 0, membership: 0, target: 0, bounce: 0, unsub: 0 };
    timeline.forEach(e => {
      if (e.category === 'engagement') c.engagement += 1;
      if (e.category === 'membership') c.membership += 1;
      if (e.from_target_list) c.target += 1;
      if (e.category === 'bounce') c.bounce += 1;
      if (e.category === 'unsub') c.unsub += 1;
    });
    return c;
  }, [timeline]);

  const filteredTimeline = useMemo(() => {
    const q = search.trim();
    return timeline.filter(e => {
      if (!filterMatches(e, filter)) return false;
      if (q && !matchesSearchTerm(eventSearchText(e), q)) return false;
      return true;
    });
  }, [timeline, filter, search]);

  const timelineByDay = useMemo(() => {
    const groups = [];
    let currentKey = null;
    let currentBucket = null;
    filteredTimeline.forEach(e => {
      const key = formatDayKey(e.ts);
      if (key !== currentKey) {
        currentKey = key;
        currentBucket = { key, label: formatDayLabel(key), events: [] };
        groups.push(currentBucket);
      }
      currentBucket.events.push(e);
    });
    return groups;
  }, [filteredTimeline]);

  const campaignsAgg = useMemo(() => {
    if (campaignsSummary.length > 0) return campaignsSummary;
    const out = {};
    Object.entries(hcp?.campaigns || {}).forEach(([id, c]) => {
      out[id] = {
        campaign_id: id,
        name: c.name || `Campaign #${id}`,
        sent: c.sent || 0,
        opens: c.opens || 0,
        clicks: c.clicks || 0,
        bounces: 0,
        brand: null,
        agency: null,
        from_target_list: false,
        last_event: null,
      };
    });
    return Object.values(out).sort((a, b) => (b.opens + b.clicks) - (a.opens + a.clicks));
  }, [campaignsSummary, hcp]);

  const engagementByDisease = useMemo(() => {
    const out = {};
    Object.values(hcp?.campaigns || {}).forEach(c => {
      const sent = c.sent || 0, opens = c.opens || 0, clicks = c.clicks || 0;
      (c.diseases || []).forEach(d => {
        if (!out[d]) out[d] = { sent: 0, opens: 0, clicks: 0, u_sent: 0, u_opened: 0, u_clicked: 0 };
        out[d].sent += sent; out[d].opens += opens; out[d].clicks += clicks;
        if (sent > 0) out[d].u_sent += 1;
        if (opens > 0) out[d].u_opened += 1;
        if (clicks > 0) out[d].u_clicked += 1;
      });
    });
    return Object.entries(out).sort((a, b) => {
      const ar = a[1].u_sent > 0 ? a[1].u_clicked / a[1].u_sent : 0;
      const br = b[1].u_sent > 0 ? b[1].u_clicked / b[1].u_sent : 0;
      return br - ar;
    });
  }, [hcp]);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  const totalsForCounts = totals || {};
  const stateForCounts = currentState || {};

  const recentClicksFromBlob = hcp?.recent_clicks || [];

  return (
    <div className="hpm-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      {hasPrev && (
        <button className="hpm-nav hpm-nav-left" onClick={onPrev} aria-label="Previous">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
      )}
      {hasNext && (
        <button className="hpm-nav hpm-nav-right" onClick={onNext} aria-label="Next">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      )}

      <div className="hpm-modal" onClick={e => e.stopPropagation()}>
        <div className="hpm-header">
          <div className="hpm-header-top">
            <div className="hpm-title-block">
              <h2 className={`hpm-name ${isAnonymous ? 'hpm-name-anon' : ''}`}>{displayName}</h2>
              <div className="hpm-subtitle">
                {hcp?.specialty && <span>{hcp.specialty}</span>}
                {hcp?.specialty && (hcp?.city || hcp?.state) && <span className="hpm-subtitle-sep">•</span>}
                {(hcp?.city || hcp?.state) && <span>{[hcp.city, hcp.state].filter(Boolean).join(', ')}</span>}
                {(profile?.first_seen || profile?.last_activity) && <span className="hpm-subtitle-sep">•</span>}
                {profile?.last_activity && <span>last activity {formatRelative(profile.last_activity)}</span>}
              </div>
            </div>
            <div className="hpm-header-actions">
              <div className="hpm-badges">
                {sourceLabel === 'Owned' && <span className="hpm-badge hpm-badge-owned">Owned</span>}
                {sourceLabel === 'Licensed' && <span className="hpm-badge hpm-badge-licensed">Licensed</span>}
                {isActive === true && <span className="hpm-badge hpm-badge-active">Active</span>}
                {isActive === false && <span className="hpm-badge hpm-badge-inactive">Inactive</span>}
                {hasGA && <span className="hpm-badge hpm-badge-ga">GA Match</span>}
              </div>
              {position && <span className="hpm-position">{position}</span>}
              <button className="hpm-close" onClick={onClose} aria-label="Close">×</button>
            </div>
          </div>

          <div className="hpm-meta-row">
            {hcp?.npi && (
              <span className="hpm-meta-item">
                <span className="hpm-meta-label">NPI</span>
                <span className="hpm-meta-value hpm-meta-mono">{hcp.npi}</span>
              </span>
            )}
            {hcp?.email && (
              <span className="hpm-meta-item">
                <span className="hpm-meta-label">Email</span>
                <span className="hpm-meta-value">{hcp.email}</span>
              </span>
            )}
            {hcp?.degree && (
              <span className="hpm-meta-item">
                <span className="hpm-meta-label">Degree</span>
                <span className="hpm-meta-value">{hcp.degree}</span>
              </span>
            )}
            {profile?.first_seen && (
              <span className="hpm-meta-item">
                <span className="hpm-meta-label">First seen</span>
                <span className="hpm-meta-value">{formatDate(profile.first_seen)}</span>
              </span>
            )}
            {hcp?.user_pseudo_id && hasGA && (
              <span className="hpm-meta-item">
                <span className="hpm-meta-label">GA ID</span>
                <span className="hpm-meta-value hpm-meta-mono">{hcp.user_pseudo_id}</span>
              </span>
            )}
          </div>
        </div>

        {!isAnonymous && (
          <div className="hpm-counts">
            <span className="hpm-count"><span className="hpm-count-value">{(stateForCounts.digital_lists || []).length}</span><span className="hpm-count-label">lists</span></span>
            <span className="hpm-count"><span className="hpm-count-value">{(stateForCounts.tags || []).length}</span><span className="hpm-count-label">tags</span></span>
            <span className="hpm-count"><span className="hpm-count-value">{(stateForCounts.segments || []).length}</span><span className="hpm-count-label">segments</span></span>
            <span className="hpm-count"><span className="hpm-count-value">{(stateForCounts.target_lists || []).length}</span><span className="hpm-count-label">target lists</span></span>
            <span className="hpm-count"><span className="hpm-count-value">{totalsForCounts.sent || 0}</span><span className="hpm-count-label">sent</span></span>
            <span className="hpm-count"><span className="hpm-count-value">{totalsForCounts.opens || 0}</span><span className="hpm-count-label">opens</span></span>
            <span className="hpm-count"><span className="hpm-count-value">{totalsForCounts.clicks || 0}</span><span className="hpm-count-label">clicks</span></span>
            {totalsForCounts.bounces > 0 && <span className="hpm-count"><span className="hpm-count-value">{totalsForCounts.bounces}</span><span className="hpm-count-label">bounces</span></span>}
            {totalsForCounts.unsubs > 0 && <span className="hpm-count"><span className="hpm-count-value">{totalsForCounts.unsubs}</span><span className="hpm-count-label">unsubs</span></span>}
          </div>
        )}

        <div className="hpm-tabs">
          {tabs.map(t => (
            <button key={t} className={`hpm-tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="hpm-body">
          {activeTab === 'timeline' && (
            <TimelineView
              loading={loading}
              error={error}
              timeline={filteredTimeline}
              grouped={timelineByDay}
              filter={filter}
              setFilter={setFilter}
              filterCounts={filterCounts}
              search={search}
              setSearch={setSearch}
              isAnonymous={isAnonymous}
            />
          )}

          {activeTab === 'state' && (
            <CurrentStateView loading={loading} error={error} currentState={currentState} />
          )}

          {activeTab === 'engagement' && (
            <EngagementView hcp={hcp} totals={totals} engagementByDisease={engagementByDisease} />
          )}

          {activeTab === 'campaigns' && (
            <CampaignsView campaigns={campaignsAgg} recentClicks={recentClicksFromBlob} />
          )}

          {activeTab === 'ga' && (
            <GAView hcp={hcp} expandedSession={expandedSession} setExpandedSession={setExpandedSession} />
          )}
        </div>
      </div>
    </div>
  );
};

const TimelineView = ({ loading, error, timeline, grouped, filter, setFilter, filterCounts, search, setSearch, isAnonymous }) => {
  if (isAnonymous) {
    return <div className="hpm-empty">Anonymous GA users have no profile or list history. See the GA Match tab for browsing data.</div>;
  }
  if (loading) {
    return (
      <div className="hpm-loading">
        <span className="hpm-loading-dot" /><span className="hpm-loading-dot" /><span className="hpm-loading-dot" />
        <div style={{ marginTop: 12 }}>Loading timeline...</div>
      </div>
    );
  }
  if (error) {
    return <div className="hpm-empty">Failed to load timeline: {error}</div>;
  }
  if (!timeline.length && filter === 'all' && !search) {
    return <div className="hpm-empty">No timeline events recorded for this user yet.</div>;
  }

  return (
    <>
      <div className="hpm-filter-row">
        {Object.entries(FILTER_LABELS).map(([key, label]) => {
          const count = filterCounts[key] ?? 0;
          if (key !== 'all' && count === 0) return null;
          return (
            <button key={key} className={`hpm-filter ${filter === key ? 'active' : ''}`} onClick={() => setFilter(key)}>
              {label}<span className="hpm-filter-count">{count}</span>
            </button>
          );
        })}
        <input
          className="hpm-search"
          placeholder="Search events..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {timeline.length === 0 ? (
        <div className="hpm-empty">No events match the current filter.</div>
      ) : (
        <div className="hpm-timeline">
          {grouped.map(group => (
            <div key={group.key} className="hpm-day">
              <div className="hpm-day-header">{group.label}</div>
              {group.events.map((e, i) => <TimelineEvent key={`${group.key}-${i}`} event={e} />)}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

const TimelineEvent = ({ event: e }) => {
  const dot = eventDotClass(e);
  const badgeClass = eventBadgeClass(e);
  const badgeText = eventBadgeText(e);

  let mainText = null;
  if (e.category === 'membership') {
    const verb = e.event === 'added' ? 'Added to' : 'Removed from';
    mainText = (
      <>
        <span className="hpm-event-text-secondary">{verb} </span>
        <strong>{e.name}</strong>
      </>
    );
  } else if (e.category === 'unsub') {
    mainText = (
      <>
        <span className="hpm-event-text-secondary">Unsubscribed from </span>
        <strong>{e.name}</strong>
      </>
    );
  } else if (e.category === 'engagement' || e.category === 'bounce') {
    const verbMap = { sent: 'Sent', open: 'Opened', click: 'Clicked', bounce: 'Bounced on' };
    const verb = verbMap[e.event] || e.event;
    mainText = (
      <>
        <span className="hpm-event-text-secondary">{verb} </span>
        <strong>{e.campaign_name || e.campaign_subject || 'Campaign'}</strong>
      </>
    );
  }

  return (
    <div className="hpm-event">
      <div className={`hpm-event-dot ${dot}`} />
      <div className="hpm-event-row">
        <span className="hpm-event-time">{formatTime(e.ts)}</span>
        <span className={`hpm-event-badge ${badgeClass}`}>{badgeText}</span>
        <span className="hpm-event-text">{mainText}</span>
      </div>
      <div className="hpm-event-meta">
        {e.from_target_list && (
          <span className="hpm-event-meta-chip"><span className={`hpm-event-badge target`}>Target List</span></span>
        )}
        {e.brand && <span className="hpm-event-meta-chip"><strong>{e.brand}</strong></span>}
        {e.agency && <span className="hpm-event-meta-chip">/ {e.agency}</span>}
        {e.reason && <span className="hpm-event-meta-chip">reason: {e.reason}</span>}
        {e.url && e.event === 'click' && <span className="hpm-event-meta-chip" title={e.url}>{stripUrl(e.url)}</span>}
      </div>
    </div>
  );
};

const CurrentStateView = ({ loading, error, currentState }) => {
  if (loading) {
    return (
      <div className="hpm-loading">
        <span className="hpm-loading-dot" /><span className="hpm-loading-dot" /><span className="hpm-loading-dot" />
        <div style={{ marginTop: 12 }}>Loading...</div>
      </div>
    );
  }
  if (error || !currentState) {
    return <div className="hpm-empty">{error || 'No current state data available.'}</div>;
  }

  const cards = [
    { label: 'Digital Lists', items: currentState.digital_lists, cls: '' },
    { label: 'Tags', items: currentState.tags, cls: 'tag' },
    { label: 'Segments', items: currentState.segments, cls: 'segment' },
    { label: 'Target Lists', items: currentState.target_lists, cls: 'target' },
    { label: 'Print Lists', items: currentState.print_lists, cls: 'print' },
    { label: 'Unsubscribed From', items: currentState.digital_lists_unsubscribed, cls: 'unsub' },
  ];

  const anyData = cards.some(c => (c.items || []).length > 0);
  if (!anyData) {
    return <div className="hpm-empty">This user is not currently on any lists, tags, or segments.</div>;
  }

  const pillLabel = (item) => {
    if (item == null) return '';
    if (typeof item === 'string') return item;
    if (typeof item === 'number') return String(item);
    return item.name || item.campaign_name || item.target_list_id || item.list_name || JSON.stringify(item);
  };

  return (
    <div className="hpm-state-grid">
      {cards.map(card => (
        (card.items || []).length > 0 ? (
          <div key={card.label} className="hpm-state-card">
            <div className="hpm-state-header">
              <span className="hpm-state-label">{card.label}</span>
              <span className="hpm-state-count">{card.items.length}</span>
            </div>
            <div className="hpm-pills">
              {card.items.map((item, i) => (
                <span key={i} className={`hpm-pill ${card.cls}`} title={typeof item === 'object' && item ? JSON.stringify(item) : undefined}>{pillLabel(item)}</span>
              ))}
            </div>
          </div>
        ) : null
      ))}
    </div>
  );
};

const EngagementView = ({ hcp, totals, engagementByDisease }) => {
  const sent = totals?.sent ?? 0;
  const opens = totals?.opens ?? 0;
  const clicks = totals?.clicks ?? 0;
  const openRate = sent > 0 ? (opens / sent) * 100 : null;
  const clickRate = opens > 0 ? (clicks / opens) * 100 : null;
  const totalEngagementEvents = sent + opens + clicks;
  const topics = hcp?.topics || [];
  const clickCategories = hcp?.click_categories || {};

  if (totalEngagementEvents === 0 && topics.length === 0 && Object.keys(clickCategories).length === 0) {
    return <div className="hpm-empty">No email engagement data for this user yet.</div>;
  }

  return (
    <>
      <div className="hpm-stat-grid">
        <div className="hpm-stat">
          <div className="hpm-stat-label">Sent</div>
          <div className="hpm-stat-value">{sent}</div>
        </div>
        <div className="hpm-stat">
          <div className="hpm-stat-label">Opens</div>
          <div className="hpm-stat-value">{opens}</div>
          {openRate !== null && <div className="hpm-stat-sub">{openRate.toFixed(0)}% open rate</div>}
        </div>
        <div className="hpm-stat">
          <div className="hpm-stat-label">Clicks</div>
          <div className="hpm-stat-value">{clicks}</div>
          {clickRate !== null && <div className="hpm-stat-sub">{clickRate.toFixed(1)}% click-through</div>}
        </div>
        {totals?.bounces > 0 && (
          <div className="hpm-stat">
            <div className="hpm-stat-label">Bounces</div>
            <div className="hpm-stat-value" style={{ color: 'var(--color-warning, #f59e0b)' }}>{totals.bounces}</div>
          </div>
        )}
      </div>

      {engagementByDisease.length > 0 && (
        <div className="hpm-section">
          <div className="hpm-section-title">Engagement by Disease State</div>
          {engagementByDisease.map(([disease, stats]) => {
            const cr = stats.u_sent > 0 ? (stats.u_clicked / stats.u_sent) * 100 : 0;
            return (
              <div key={disease} className="hpm-aff-row">
                <div className="hpm-aff-label">{disease}</div>
                <div className="hpm-aff-bar"><div className="hpm-aff-fill" style={{ width: `${Math.min(cr * 4, 100)}%` }} /></div>
                <div className="hpm-aff-value">{stats.u_clicked}/{stats.u_sent}</div>
              </div>
            );
          })}
        </div>
      )}

      {topics.length > 0 && (
        <div className="hpm-section">
          <div className="hpm-section-title">Topic Affinity</div>
          {topics.map((t, i) => (
            <div key={i} className="hpm-aff-row">
              <div className="hpm-aff-label">
                {t.ta}
                {t.browsed > 0 && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: 'var(--color-success, #10b981)' }} title="Corroborated by on-site reading">read {t.browsed}</span>}
              </div>
              <div className="hpm-aff-bar"><div className="hpm-aff-fill" style={{ width: `${Math.min(t.score, 100)}%` }} /></div>
              <div className="hpm-aff-value">{t.score.toFixed(0)}</div>
            </div>
          ))}
        </div>
      )}

      {Object.keys(clickCategories).length > 0 && (
        <div className="hpm-section">
          <div className="hpm-section-title">Click Categories</div>
          <div className="hpm-pills">
            {Object.entries(clickCategories).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
              <span key={cat} className="hpm-pill">{cat} <span style={{ marginLeft: 4, color: 'var(--color-text-tertiary, #8a8a8a)' }}>{count}</span></span>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

const CampaignsView = ({ campaigns, recentClicks }) => {
  if (!campaigns.length && !recentClicks.length) {
    return <div className="hpm-empty">No campaign history.</div>;
  }

  return (
    <>
      {campaigns.length > 0 && (
        <div className="hpm-section">
          <div className="hpm-section-title">
            Campaign History
            <span className="hpm-section-count">{campaigns.length} campaigns</span>
          </div>
          <table className="hpm-camp-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Brand</th>
                <th>Agency</th>
                <th>Last Activity</th>
                <th>Sent</th>
                <th>Opens</th>
                <th>Clicks</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.campaign_id || c.id}>
                  <td>
                    <span className="hpm-camp-name">{c.name}</span>
                    {c.from_target_list && <span className="hpm-camp-target">Target</span>}
                  </td>
                  <td>{c.brand || '—'}</td>
                  <td>{c.agency || '—'}</td>
                  <td>{c.last_event ? formatDate(c.last_event) : '—'}</td>
                  <td>{c.sent || 0}</td>
                  <td>{c.opens || 0}</td>
                  <td>{c.clicks || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {recentClicks.length > 0 && (
        <div className="hpm-section">
          <div className="hpm-section-title">
            Recent Clicks
            <span className="hpm-section-count">{recentClicks.length} URLs</span>
          </div>
          <table className="hpm-camp-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>URL</th>
                <th>Campaign</th>
              </tr>
            </thead>
            <tbody>
              {recentClicks.map((c, i) => (
                <tr key={i}>
                  <td>{formatDate(c.ts)}</td>
                  <td title={c.url}>{stripUrl(c.url)}</td>
                  <td>{c.campaign || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

const GAView = ({ hcp, expandedSession, setExpandedSession }) => {
  const upid = (hcp?.user_pseudo_id || '').trim();
  const [fetched, setFetched] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!upid) { setFetched(null); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE_URL}/api/ga-insights/user-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_pseudo_id: upid }),
    })
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (d.success) setFetched(d); else setError(d.error || 'Failed to load events');
        setLoading(false);
      })
      .catch(e => { if (!cancelled) { setError(e.message || 'Network error'); setLoading(false); } });
    return () => { cancelled = true; };
  }, [upid]);

  const blobEvents = hcp?.ga_profile?.recent_events || [];
  const events = (fetched?.events?.length ? fetched.events : blobEvents);
  const summary = fetched?.summary;
  const topicsBrowsed = fetched?.topics_browsed || [];
  const gaProfile = hcp?.ga_profile;
  const probabilisticMatches = hcp?.ga_sessions || [];

  if (loading && events.length === 0) {
    return (
      <div className="hpm-loading">
        <span className="hpm-loading-dot" /><span className="hpm-loading-dot" /><span className="hpm-loading-dot" />
        <div style={{ marginTop: 12 }}>Loading full browsing history...</div>
      </div>
    );
  }

  if (events.length === 0 && probabilisticMatches.length === 0) {
    return <div className="hpm-empty">{error ? `Could not load GA events: ${error}` : 'No GA session data for this user.'}</div>;
  }

  const sessionsCount = summary?.total_sessions ?? gaProfile?.total_sessions ?? 0;
  const pageViewsCount = summary?.page_views ?? gaProfile?.page_views ?? 0;
  const engSec = summary?.total_engagement_sec ?? gaProfile?.total_engagement_sec ?? 0;
  const scrollsCount = summary?.scrolls ?? gaProfile?.scrolls ?? 0;

  return (
    <>
      {events.length > 0 && (
        <div className="hpm-stat-grid">
          <div className="hpm-stat">
            <div className="hpm-stat-label">Sessions</div>
            <div className="hpm-stat-value">{sessionsCount}</div>
          </div>
          <div className="hpm-stat">
            <div className="hpm-stat-label">Page Views</div>
            <div className="hpm-stat-value">{pageViewsCount}</div>
          </div>
          <div className="hpm-stat">
            <div className="hpm-stat-label">Total Time</div>
            <div className="hpm-stat-value">{formatDuration(engSec * 1000)}</div>
          </div>
          <div className="hpm-stat">
            <div className="hpm-stat-label">Scrolls</div>
            <div className="hpm-stat-value">{scrollsCount}</div>
          </div>
        </div>
      )}

      {topicsBrowsed.length > 0 && (
        <div className="hpm-section">
          <div className="hpm-section-title">Topics Read On-Site</div>
          {topicsBrowsed.map((t, i) => (
            <div key={i} className="hpm-aff-row">
              <div className="hpm-aff-label">{t.ta}</div>
              <div className="hpm-aff-bar"><div className="hpm-aff-fill" style={{ width: `${Math.min(t.page_views / Math.max(topicsBrowsed[0].page_views, 1) * 100, 100)}%` }} /></div>
              <div className="hpm-aff-value">{t.page_views} {t.page_views === 1 ? 'page' : 'pages'}</div>
            </div>
          ))}
        </div>
      )}

      {events.length > 0 && (
        <div className="hpm-section">
          <div className="hpm-section-title">
            Sessions
            <span className="hpm-section-count">{events.length} events{fetched ? '' : ' (recent)'}{fetched?.truncated ? ' — capped at 5,000' : ''}</span>
          </div>
          {(() => {
            const sessions = {};
            events.forEach(e => {
              const sid = e.session_id || 'unknown';
              if (!sessions[sid]) sessions[sid] = { events: [], firstTs: e.ts, city: e.city, device: e.device, source: e.source };
              sessions[sid].events.push(e);
              if (e.ts && (!sessions[sid].firstTs || e.ts < sessions[sid].firstTs)) sessions[sid].firstTs = e.ts;
            });
            return Object.entries(sessions)
              .sort((a, b) => (b[1].firstTs || '').localeCompare(a[1].firstTs || ''))
              .map(([sid, sess]) => {
                const totalEng = sess.events.reduce((s, e) => s + (e.engagement_ms || 0), 0);
                const pageViews = sess.events.filter(e => e.event === 'page_view').length;
                const isExpanded = expandedSession === sid;
                return (
                  <div key={sid} className="hpm-ga-session">
                    <div className="hpm-ga-session-head" onClick={() => setExpandedSession(isExpanded ? null : sid)}>
                      <div className="hpm-ga-session-meta">
                        <span className="hpm-ga-session-ts">{formatDate(sess.firstTs)} {formatTime(sess.firstTs)}</span>
                        <span>{pageViews} pages</span>
                        <span>{formatDuration(totalEng)}</span>
                        <span style={{ color: 'var(--color-text-tertiary, #8a8a8a)' }}>{sess.city || '—'} / {sess.device || '—'}</span>
                      </div>
                      <span style={{ color: 'var(--color-text-tertiary, #8a8a8a)', fontSize: '0.75rem' }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                    {isExpanded && (
                      <div className="hpm-ga-session-body">
                        {sess.events.sort((a, b) => (a.ts || '').localeCompare(b.ts || '')).map((e, i) => (
                          <div key={i} className="hpm-ga-event">
                            <span className="hpm-ga-event-ts">{e.ts ? new Date(e.ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }) : '—'}</span>
                            <span className={`hpm-ga-event-type ${e.event || ''}`}>{e.event}</span>
                            <span className="hpm-ga-event-url" title={e.url}>{stripUrl(e.url)}</span>
                            {e.engagement_ms && <span style={{ color: 'var(--color-text-tertiary, #8a8a8a)', fontSize: '0.75rem' }}>{formatDuration(e.engagement_ms)}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              });
          })()}
        </div>
      )}

      {events.length === 0 && probabilisticMatches.length > 0 && (
        <div className="hpm-section">
          <div className="hpm-section-title">Probabilistic GA Matches</div>
          <table className="hpm-camp-table">
            <thead>
              <tr>
                <th>Confidence</th>
                <th>Landing Page</th>
                <th>City</th>
                <th>Device</th>
                <th>Email URL</th>
              </tr>
            </thead>
            <tbody>
              {probabilisticMatches.map((s, i) => (
                <tr key={i}>
                  <td style={{ color: s.confidence >= 80 ? 'var(--color-success, #10b981)' : s.confidence >= 60 ? 'var(--color-warning, #f59e0b)' : 'var(--color-text-tertiary, #8a8a8a)', fontWeight: 600 }}>{s.confidence?.toFixed(0)}%</td>
                  <td title={s.landing}>{stripUrl(s.landing) || '—'}</td>
                  <td>{s.city || '—'}</td>
                  <td>{s.device || '—'}</td>
                  <td title={s.email_url}>{stripUrl(s.email_url)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

export default HCPProfileModal;