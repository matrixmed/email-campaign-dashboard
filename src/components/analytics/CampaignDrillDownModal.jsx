import React, { useState, useEffect, useMemo } from 'react';
import '../../styles/CampaignDrillDownModal.css';
import { API_BASE_URL } from '../../config/api';

const fmtPct = (v) => (v == null ? '—' : `${v.toFixed(2)}%`);
const fmtInt = (n) => (n || 0).toLocaleString();

const bounceClass = (r) => {
  if (r == null) return '';
  if (r >= 5) return 'metric-bad';
  if (r >= 2) return 'metric-warn';
  return 'metric-good';
};

const unsubClass = (r) => {
  if (r == null) return '';
  if (r >= 0.5) return 'metric-bad';
  if (r >= 0.2) return 'metric-warn';
  return 'metric-good';
};

const DrillTable = ({ rows, labelKey, labelTitle, minSendsDefault = 50 }) => {
  const [sortKey, setSortKey] = useState('sent');
  const [sortDir, setSortDir] = useState('desc');
  const [minSends, setMinSends] = useState(minSendsDefault);

  const filtered = useMemo(() => {
    const r = rows.filter((x) => (x.sent || 0) >= minSends);
    const dir = sortDir === 'asc' ? 1 : -1;
    r.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'string') return av.localeCompare(bv) * dir;
      return (av - bv) * dir;
    });
    return r;
  }, [rows, sortKey, sortDir, minSends]);

  const onSort = (k) => {
    if (sortKey === k) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
  };
  const arrow = (k) => (sortKey === k ? (sortDir === 'desc' ? ' ▼' : ' ▲') : '');

  return (
    <div className="cdm-table-wrap">
      <div className="cdm-table-controls">
        <label className="cdm-min-sends">
          Min sends:
          <input
            type="number"
            min={0}
            value={minSends}
            onChange={(e) => setMinSends(Math.max(0, parseInt(e.target.value || '0', 10)))}
          />
        </label>
        <span className="cdm-row-count">{filtered.length} {labelTitle}</span>
      </div>
      <div className="cdm-table-scroll">
        <table className="cdm-table">
          <thead>
            <tr>
              <th onClick={() => onSort(labelKey)}>{labelTitle}{arrow(labelKey)}</th>
              <th onClick={() => onSort('sent')} className="num">Sends{arrow('sent')}</th>
              <th onClick={() => onSort('delivered')} className="num">Delivered{arrow('delivered')}</th>
              <th onClick={() => onSort('open_rate')} className="num">Open{arrow('open_rate')}</th>
              <th onClick={() => onSort('click_rate')} className="num">Click{arrow('click_rate')}</th>
              <th onClick={() => onSort('bounce_rate')} className="num">Bounce{arrow('bounce_rate')}</th>
              <th onClick={() => onSort('unsub_rate')} className="num">Unsub{arrow('unsub_rate')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r[labelKey]}>
                <td>{r[labelKey]}</td>
                <td className="num">{fmtInt(r.sent)}</td>
                <td className="num">{fmtInt(r.delivered)}</td>
                <td className="num">{fmtPct(r.open_rate)}</td>
                <td className="num">{fmtPct(r.click_rate)}</td>
                <td className={`num ${bounceClass(r.bounce_rate)}`}>{fmtPct(r.bounce_rate)}</td>
                <td className={`num ${unsubClass(r.unsub_rate)}`}>{fmtPct(r.unsub_rate)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="cdm-empty">No rows match minimum sends.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const CampaignDrillDownModal = ({ campaign, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [activeView, setActiveView] = useState('domain');

  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setData(null);

    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/deliverability/campaign-breakdown`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaign_ids: campaign.deployment_ids || [campaign.campaign_id],
            d1_id: campaign.campaign_id,
          }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        if (e.name === 'AbortError') return;
        setError(String(e.message || e));
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [campaign]);

  return (
    <div className="cdm-overlay" onClick={onClose}>
      <div className="cdm-modal" onClick={(e) => e.stopPropagation()}>
        <button className="cdm-close" onClick={onClose} aria-label="Close">&times;</button>

        <div className="cdm-header">
          <div className="cdm-brand-pill">{campaign.brand}</div>
          <h2 className="cdm-title">{campaign.name}</h2>
          <div className="cdm-meta">
            Sent {campaign.sent_date} · {campaign.deployments} deployment{campaign.deployments !== 1 ? 's' : ''} · {fmtInt(campaign.sent)} sends
          </div>
          <div className="cdm-summary">
            <div className="cdm-summary-stat"><span>Open</span><strong>{fmtPct(campaign.openRate)}</strong></div>
            <div className="cdm-summary-stat"><span>Click</span><strong>{fmtPct(campaign.clickRate)}</strong></div>
            <div className="cdm-summary-stat"><span>Bounce</span><strong className={bounceClass(campaign.bounceRate)}>{fmtPct(campaign.bounceRate)}</strong></div>
            <div className="cdm-summary-stat"><span>Unsub</span><strong className={unsubClass(campaign.unsubRate)}>{fmtPct(campaign.unsubRate)}</strong></div>
          </div>
        </div>

        <div className="cdm-view-tabs">
          <button
            className={`cdm-view-tab ${activeView === 'domain' ? 'active' : ''}`}
            onClick={() => setActiveView('domain')}
          >Email Domain</button>
          <button
            className={`cdm-view-tab ${activeView === 'state' ? 'active' : ''}`}
            onClick={() => setActiveView('state')}
          >Location</button>
        </div>

        <div className="cdm-body">
          {loading && (
            <div className="cdm-loading" role="status" aria-live="polite">
              <div className="cdm-spinner" />
              <div className="cdm-loading-title">Querying database…</div>
              <div className="cdm-loading-sub">
                Aggregating per-domain &amp; per-location breakdown for this campaign.<br />
                Can take 10–60 seconds depending on send volume.
              </div>
              <div className="cdm-loading-hint">Close the modal to cancel the query.</div>
            </div>
          )}
          {error && !loading && (
            <div className="cdm-error">
              <div>Failed to load: {error}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
                Backend might be down or the query timed out (60s limit).
              </div>
            </div>
          )}
          {!loading && !error && data && activeView === 'domain' && (
            <DrillTable
              rows={data.domains || []}
              labelKey="domain"
              labelTitle="Domain"
              minSendsDefault={50}
            />
          )}
          {!loading && !error && data && activeView === 'state' && (
            <DrillTable
              rows={data.states || []}
              labelKey="state"
              labelTitle="State"
              minSendsDefault={20}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignDrillDownModal;