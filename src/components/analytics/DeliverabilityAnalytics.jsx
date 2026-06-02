import React, { useState, useEffect, useMemo, useRef } from 'react';
import '../../styles/DeliverabilityAnalytics.css';
import '../../styles/SectionHeaders.css';
import '../../styles/AnalyticsHub.css';
import TablePagination from '../common/TablePagination';
import CampaignDrillDownModal from './CampaignDrillDownModal';
import taxonomyMapping from '../listanalysis/taxonomyMapping';

const BLOB_URL = "https://emaildash.blob.core.windows.net/json-data/deliverability_metrics.json?sp=r&st=2026-05-23T16:54:00Z&se=2028-04-13T01:09:00Z&spr=https&sv=2026-02-06&sr=b&sig=SToMQghN%2BnJYv1%2Bl5LnV5HaDegb7p6GCzUiwfkknXWc%3D";

const SUB_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'domain', label: 'Email Domain' },
  { key: 'specialty', label: 'Specialty' },
  { key: 'location', label: 'Location' },
  { key: 'campaign', label: 'Per Campaign' },
];

const METRICS = [
  { key: 'openRate', label: 'Open Rate', type: 'engagement' },
  { key: 'clickRate', label: 'Click Rate', type: 'engagement' },
  { key: 'bounceRate', label: 'Bounce Rate', type: 'risk' },
  { key: 'unsubRate', label: 'Unsub Rate', type: 'risk' },
];

const METRIC_KEYS = ['sent', 'opens', 'clicks', 'bounces', 'unsubs'];

const PALETTE = ['#0ff', '#ff6b6b', '#ffd93d', '#51c878', '#a78bfa', '#fb923c', '#38bdf8', '#f472b6', '#fbbf24', '#34d399', '#e879f9', '#60a5fa'];

const rate = (num, denom) => (denom > 0 ? (num / denom) * 100 : null);
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

const engagementClass = (value, baseline) => {
  if (value == null || baseline == null) return '';
  const pp = value - baseline;
  if (pp >= 5) return 'metric-good-strong';
  if (pp >= 2) return 'metric-good';
  if (pp <= -5) return 'metric-bad';
  if (pp <= -2) return 'metric-warn';
  return '';
};

const riskClass = (metricKey, value) => {
  if (value == null) return '';
  if (metricKey === 'bounceRate') return bounceClass(value);
  if (metricKey === 'unsubRate') return unsubClass(value);
  return '';
};

const cellClass = (metricKey, value, brandBaseline) => {
  if (metricKey === 'bounceRate' || metricKey === 'unsubRate') return riskClass(metricKey, value);
  return engagementClass(value, brandBaseline);
};

const emptyTotals = () => ({ sent: 0, opens: 0, clicks: 0, bounces: 0, unsubs: 0 });

const addInto = (target, source) => {
  METRIC_KEYS.forEach((k) => { target[k] += source[k] || 0; });
};

const sumMonths = (monthMap) => {
  const total = emptyTotals();
  Object.values(monthMap || {}).forEach((b) => addInto(total, b));
  return total;
};

const computeRates = (t) => {
  const delivered = (t.sent || 0) - (t.bounces || 0);
  return {
    ...t,
    delivered,
    openRate: rate(t.opens, delivered),
    clickRate: rate(t.clicks, t.opens),
    bounceRate: rate(t.bounces, t.sent),
    unsubRate: rate(t.unsubs, delivered),
  };
};

const allMonthsAcross = (data) => {
  const set = new Set();
  Object.values(data.by_brand || {}).forEach((monthMap) => {
    Object.keys(monthMap || {}).forEach((m) => set.add(m));
  });
  return Array.from(set).sort();
};

const specialtyLabel = (code) => taxonomyMapping[code] || code;

const FREE_WEBMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'ymail.com', 'rocketmail.com',
  'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
  'aol.com', 'aim.com',
  'icloud.com', 'me.com', 'mac.com',
  'comcast.net', 'sbcglobal.net', 'verizon.net', 'att.net',
  'cox.net', 'charter.net', 'optonline.net', 'roadrunner.com',
  'bellsouth.net', 'earthlink.net',
  'protonmail.com', 'gmx.com', 'mail.com',
  'juno.com', 'netzero.net',
]);

const domainTypeBucket = (domain) => {
  if (!domain || domain === 'unknown') return 'Unknown';
  const d = domain.toLowerCase();
  if (FREE_WEBMAIL_DOMAINS.has(d)) return 'Free Webmail (consumer)';
  if (d.endsWith('.edu')) return 'Education (.edu)';
  if (d.endsWith('.gov')) return 'Government (.gov)';
  if (d.endsWith('.mil')) return 'Military (.mil)';
  if (d.endsWith('.org')) return 'Organization (.org)';
  if (d.endsWith('.net')) return 'Network (.net) — non-ISP';
  if (d.endsWith('.com')) return 'Corporate (.com)';
  return 'Other';
};

const aggregateRowsByGroup = (rows, groupFn) => {
  const buckets = {};
  rows.forEach((r) => {
    const groupKey = groupFn(r.key);
    if (!buckets[groupKey]) {
      buckets[groupKey] = { key: groupKey, label: groupKey, totalSent: 0, byBrand: {} };
    }
    buckets[groupKey].totalSent += r.totalSent || 0;
    Object.entries(r.byBrand || {}).forEach(([brand, vals]) => {
      const bb = buckets[groupKey].byBrand[brand] = buckets[groupKey].byBrand[brand] || {
        sent: 0, opens: 0, clicks: 0, bounces: 0, unsubs: 0,
      };
      bb.sent += vals.sent || 0;
      bb.opens += vals.opens || 0;
      bb.clicks += vals.clicks || 0;
      bb.bounces += vals.bounces || 0;
      bb.unsubs += vals.unsubs || 0;
    });
  });
  Object.values(buckets).forEach((bucket) => {
    Object.entries(bucket.byBrand).forEach(([brand, raw]) => {
      bucket.byBrand[brand] = computeRates(raw);
    });
  });
  return Object.values(buckets);
};

const niceScale = (maxValue) => {
  if (maxValue <= 1) return { max: 1, step: 0.2 };
  if (maxValue <= 2) return { max: 2, step: 0.5 };
  if (maxValue <= 5) return { max: 5, step: 1 };
  if (maxValue <= 10) return { max: 10, step: 2 };
  if (maxValue <= 20) return { max: 20, step: 5 };
  if (maxValue <= 30) return { max: 30, step: 5 };
  if (maxValue <= 50) return { max: 50, step: 10 };
  if (maxValue <= 100) return { max: 100, step: 20 };
  return { max: Math.ceil(maxValue / 10) * 10, step: 10 };
};

const TrendOverlay = ({ data, allBrands, allMonths, brandColor, selectedBrands, onToggleBrand }) => {
  const [metric, setMetric] = useState('openRate');
  const [metricOpen, setMetricOpen] = useState(false);
  const [brandsOpen, setBrandsOpen] = useState(false);
  const [chartWidth, setChartWidth] = useState(1200);
  const metricRef = useRef(null);
  const brandsRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const onClickOut = (e) => {
      if (metricRef.current && !metricRef.current.contains(e.target)) setMetricOpen(false);
      if (brandsRef.current && !brandsRef.current.contains(e.target)) setBrandsOpen(false);
    };
    document.addEventListener('mousedown', onClickOut);
    return () => document.removeEventListener('mousedown', onClickOut);
  }, []);

  useEffect(() => {
    const update = () => {
      if (containerRef.current) setChartWidth(containerRef.current.offsetWidth - 40);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const series = useMemo(() => selectedBrands.map((brand) => {
    const monthMap = data.by_brand?.[brand] || {};
    const points = allMonths.map((m) => {
      const b = monthMap[m];
      if (!b) return null;
      const r = computeRates(b);
      return r[metric] == null ? null : r[metric];
    });
    return { brand, points };
  }), [data, selectedBrands, allMonths, metric]);

  const allValues = series.flatMap((s) => s.points).filter((v) => v != null);
  const rawMax = allValues.length ? Math.max(...allValues) : 1;
  const { max: yMax, step: yStep } = niceScale(rawMax);

  const chartHeight = 500;
  const padding = { top: 20, right: 40, bottom: 60, left: 80 };
  const innerW = chartWidth - padding.left - padding.right;
  const innerH = chartHeight - padding.top - padding.bottom;

  const xFor = (i) => padding.left + (allMonths.length > 1 ? (i * innerW) / (allMonths.length - 1) : innerW / 2);
  const yFor = (v) => padding.top + innerH - (v / yMax) * innerH;

  const buildPath = (points) => {
    let d = '';
    let openSeg = false;
    points.forEach((v, i) => {
      if (v == null) { openSeg = false; return; }
      d += `${openSeg ? 'L' : 'M'} ${xFor(i).toFixed(1)} ${yFor(v).toFixed(1)} `;
      openSeg = true;
    });
    return d.trim();
  };

  const yTicks = [];
  for (let v = 0; v <= yMax + 0.0001; v += yStep) yTicks.push(v);

  const monthsCount = allMonths.length;
  const labelStride = Math.max(1, Math.ceil(monthsCount / 12));

  const metricLabel = METRICS.find((m) => m.key === metric)?.label || '';
  const brandsLabel = selectedBrands.length === allBrands.length
    ? `All ${allBrands.length} brands`
    : selectedBrands.length <= 2
      ? selectedBrands.join(', ')
      : `${selectedBrands.length} brands selected`;

  return (
    <div className="da-trend-section">
      <div className="section-header-bar">
        <h3>Monthly Trends by Brand</h3>
        <div className="section-header-stats">
          <div className="metric-selector" ref={metricRef}>
            <label>Metric:</label>
            <div className="custom-dropdown">
              <button className="custom-dropdown-trigger" onClick={() => setMetricOpen(!metricOpen)}>
                <span className="dropdown-value">{metricLabel}</span>
                <svg className={`dropdown-arrow ${metricOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 12 12">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {metricOpen && (
                <div className="custom-dropdown-menu">
                  {METRICS.map((m) => (
                    <div
                      key={m.key}
                      className={`custom-dropdown-option ${metric === m.key ? 'selected' : ''}`}
                      onClick={() => { setMetric(m.key); setMetricOpen(false); }}
                    >
                      <span>{m.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="metric-selector" ref={brandsRef}>
            <label>Brands:</label>
            <div className="custom-dropdown">
              <button className="custom-dropdown-trigger" onClick={() => setBrandsOpen(!brandsOpen)}>
                <span className="dropdown-value">{brandsLabel}</span>
                <svg className={`dropdown-arrow ${brandsOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 12 12">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {brandsOpen && (
                <div className="custom-dropdown-menu multi-select" onMouseDown={(e) => e.stopPropagation()}>
                  <div className="year-dropdown-scroll">
                    {allBrands.map((b) => (
                      <label
                        key={b}
                        className={`custom-dropdown-option ${selectedBrands.includes(b) ? 'selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedBrands.includes(b)}
                          onChange={() => onToggleBrand(b)}
                        />
                        <span className="metric-color-dot" style={{ backgroundColor: brandColor(b) }}></span>
                        <span>{b}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="monthly-chart-container" ref={containerRef}>
        <div className="chart-wrapper">
          <svg width={chartWidth} height={chartHeight} className="line-chart">
            {yTicks.map((val) => {
              const y = yFor(val);
              return (
                <g key={val}>
                  <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="#3a3a3a" strokeWidth="1" />
                  <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#8a8a8a">
                    {val.toFixed(val < 1 ? 1 : 0)}%
                  </text>
                </g>
              );
            })}

            {allMonths.map((m, i) => (
              (i % labelStride === 0 || i === monthsCount - 1) ? (
                <text key={m} x={xFor(i)} y={chartHeight - padding.bottom + 20} textAnchor="middle" fontSize="12" fill="#8a8a8a">
                  {m}
                </text>
              ) : null
            ))}

            {series.map((s) => {
              const pathData = buildPath(s.points);
              if (!pathData) return null;
              return (
                <g key={s.brand}>
                  <path d={pathData} stroke={brandColor(s.brand)} strokeWidth="2" fill="none" />
                  {s.points.map((v, i) => v == null ? null : (
                    <circle key={i} cx={xFor(i)} cy={yFor(v)} r="4" fill={brandColor(s.brand)}>
                      <title>{`${s.brand} — ${allMonths[i]}: ${v.toFixed(2)}%`}</title>
                    </circle>
                  ))}
                </g>
              );
            })}
          </svg>

          <div className="chart-legend">
            {series.map((s) => (
              <div key={s.brand} className="legend-item">
                <span className="legend-color" style={{ backgroundColor: brandColor(s.brand) }}></span>
                <span>{s.brand}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const InsightCallouts = ({ rows }) => {
  if (!rows.length) return null;
  const valid = rows.filter((r) => r.sent >= 5000);
  if (!valid.length) return null;

  const highestBounce = [...valid].sort((a, b) => (b.bounceRate || 0) - (a.bounceRate || 0))[0];
  const highestUnsub = [...valid].sort((a, b) => (b.unsubRate || 0) - (a.unsubRate || 0))[0];
  const lowestOpen = [...valid].sort((a, b) => (a.openRate || 0) - (b.openRate || 0))[0];
  const highestOpen = [...valid].sort((a, b) => (b.openRate || 0) - (a.openRate || 0))[0];

  return (
    <div className="da-callouts">
      <div className="da-callout">
        <div className="da-callout-label">Highest open rate</div>
        <div className="da-callout-value metric-good-strong">{fmtPct(highestOpen.openRate)}</div>
        <div className="da-callout-sub">{highestOpen.brand}</div>
      </div>
      <div className="da-callout">
        <div className="da-callout-label">Lowest open rate</div>
        <div className="da-callout-value metric-warn">{fmtPct(lowestOpen.openRate)}</div>
        <div className="da-callout-sub">{lowestOpen.brand}</div>
      </div>
      <div className="da-callout">
        <div className="da-callout-label">Highest bounce rate</div>
        <div className={`da-callout-value ${bounceClass(highestBounce.bounceRate)}`}>{fmtPct(highestBounce.bounceRate)}</div>
        <div className="da-callout-sub">{highestBounce.brand}</div>
      </div>
      <div className="da-callout">
        <div className="da-callout-label">Highest unsub rate</div>
        <div className={`da-callout-value ${unsubClass(highestUnsub.unsubRate)}`}>{fmtPct(highestUnsub.unsubRate)}</div>
        <div className="da-callout-sub">{highestUnsub.brand}</div>
      </div>
    </div>
  );
};

const OverviewTable = ({ rows }) => {
  const [sortKey, setSortKey] = useState('sent');
  const [sortDir, setSortDir] = useState('desc');

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'string') return av.localeCompare(bv) * dir;
      return (av - bv) * dir;
    });
  }, [rows, sortKey, sortDir]);

  const onSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };
  const arrow = (k) => (sortKey === k ? (sortDir === 'desc' ? ' ▼' : ' ▲') : '');

  return (
    <div className="da-table-wrap">
      <table className="da-table">
        <thead>
          <tr>
            <th onClick={() => onSort('brand')}>Brand{arrow('brand')}</th>
            <th onClick={() => onSort('sent')} className="num">Sends{arrow('sent')}</th>
            <th onClick={() => onSort('delivered')} className="num">Delivered{arrow('delivered')}</th>
            <th onClick={() => onSort('openRate')} className="num">Open Rate{arrow('openRate')}</th>
            <th onClick={() => onSort('clickRate')} className="num">Click Rate{arrow('clickRate')}</th>
            <th onClick={() => onSort('bounceRate')} className="num">Bounce Rate{arrow('bounceRate')}</th>
            <th onClick={() => onSort('unsubRate')} className="num">Unsub Rate{arrow('unsubRate')}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.brand}>
              <td className="da-brand-cell">{r.brand}</td>
              <td className="num">{fmtInt(r.sent)}</td>
              <td className="num">{fmtInt(r.delivered)}</td>
              <td className="num">{fmtPct(r.openRate)}</td>
              <td className="num">{fmtPct(r.clickRate)}</td>
              <td className={`num ${bounceClass(r.bounceRate)}`}>{fmtPct(r.bounceRate)}</td>
              <td className={`num ${unsubClass(r.unsubRate)}`}>{fmtPct(r.unsubRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const MATRIX_PAGE_SIZE = 50;

const MatrixTable = ({ dimensionLabel, dimRows, brands, brandBaselines, searchTerm = '', groupByOption = null }) => {
  const [metric, setMetric] = useState('openRate');
  const [page, setPage] = useState(1);
  const [grouped, setGrouped] = useState(false);

  const sourceRows = useMemo(() => {
    if (grouped && groupByOption) {
      return aggregateRowsByGroup(dimRows, groupByOption.groupFn);
    }
    return dimRows;
  }, [dimRows, grouped, groupByOption]);

  const filteredRows = useMemo(() => {
    const filtered = sourceRows.filter((r) => {
      if (searchTerm && !String(r.label).toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
    filtered.sort((a, b) => (b.totalSent || 0) - (a.totalSent || 0));
    return filtered;
  }, [sourceRows, searchTerm]);

  useEffect(() => { setPage(1); }, [searchTerm, dimRows, grouped]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / MATRIX_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * MATRIX_PAGE_SIZE;
  const visibleRows = filteredRows.slice(startIdx, startIdx + MATRIX_PAGE_SIZE);
  const effectiveLabel = grouped && groupByOption ? groupByOption.groupedLabel : dimensionLabel;

  return (
    <div className="da-matrix-section">
      <div className="da-matrix-toolbar">
        <div className="da-matrix-legend">
          {metric === 'bounceRate' || metric === 'unsubRate' ? (
            <>
              <span className="da-legend-text">Color = absolute threshold</span>
              <span className="da-legend-chip metric-good">good</span>
              <span className="da-legend-chip metric-warn">elevated</span>
              <span className="da-legend-chip metric-bad">high</span>
            </>
          ) : (
            <>
              <span className="da-legend-text">Color = ±pp vs that brand&rsquo;s overall rate</span>
              <span className="da-legend-chip metric-good-strong">+5pp+</span>
              <span className="da-legend-chip metric-good">+2pp</span>
              <span className="da-legend-chip metric-warn">−2pp</span>
              <span className="da-legend-chip metric-bad">−5pp+</span>
            </>
          )}
        </div>
        <div className="da-matrix-right">
          <span className="da-row-count">{filteredRows.length} {effectiveLabel}</span>
          {groupByOption && (
            <button
              className={`da-toggle-btn ${grouped ? 'active' : ''}`}
              onClick={() => setGrouped(!grouped)}
              title={groupByOption.title || ''}
            >
              {groupByOption.label}
            </button>
          )}
          <div className="da-metric-toggle">
            {METRICS.map((m) => (
              <button
                key={m.key}
                className={`da-metric-toggle-btn ${metric === m.key ? 'active' : ''}`}
                onClick={() => setMetric(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="da-matrix-scroll">
        <table className="da-matrix">
          <thead>
            <tr>
              <th className="da-matrix-rowhead">{effectiveLabel}</th>
              <th className="da-matrix-rowhead num">Sends</th>
              {brands.map((b) => (
                <th key={b} className="da-matrix-brand-head" title={b}>
                  <div className="da-matrix-brand-name">{b}</div>
                  <div className="da-matrix-brand-baseline">
                    {fmtPct(brandBaselines[b]?.[metric])}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={row.key}>
                <td className="da-matrix-rowhead">{row.label}</td>
                <td className="da-matrix-rowhead num">{fmtInt(row.totalSent)}</td>
                {brands.map((b) => {
                  const cell = row.byBrand[b];
                  const value = cell ? cell[metric] : null;
                  const baseline = brandBaselines[b]?.[metric];
                  return (
                    <td
                      key={b}
                      className={`da-matrix-cell num ${cellClass(metric, value, baseline)}`}
                      title={cell ? `${b} → ${row.label}\nSends: ${fmtInt(cell.sent)}\nDelivered: ${fmtInt(cell.delivered)}\nOpen: ${fmtPct(cell.openRate)}\nClick: ${fmtPct(cell.clickRate)}\nBounce: ${fmtPct(cell.bounceRate)}\nUnsub: ${fmtPct(cell.unsubRate)}` : `${b} → ${row.label} (no data)`}
                    >
                      {value == null ? '—' : fmtPct(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr><td colSpan={brands.length + 2} className="da-empty">No rows match the filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
};

const CampaignTable = ({ campaigns, brands, searchTerm = '' }) => {
  const [sortKey, setSortKey] = useState('sent_date');
  const [sortDir, setSortDir] = useState('desc');
  const [brandFilter, setBrandFilter] = useState(['__all__']);
  const [brandsOpen, setBrandsOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const brandsRef = useRef(null);

  useEffect(() => {
    const onClickOut = (e) => {
      if (brandsRef.current && !brandsRef.current.contains(e.target)) setBrandsOpen(false);
    };
    document.addEventListener('mousedown', onClickOut);
    return () => document.removeEventListener('mousedown', onClickOut);
  }, []);

  const allSelected = brandFilter.includes('__all__');

  const toggleBrand = (b) => {
    if (b === '__all__') {
      setBrandFilter(['__all__']);
      return;
    }
    setBrandFilter((prev) => {
      const withoutAll = prev.filter((x) => x !== '__all__');
      if (withoutAll.includes(b)) {
        const next = withoutAll.filter((x) => x !== b);
        return next.length === 0 ? ['__all__'] : next;
      }
      return [...withoutAll, b];
    });
  };

  const enriched = useMemo(() => campaigns
    .filter((c) => allSelected || brandFilter.includes(c.brand))
    .map((c) => ({ ...c, ...computeRates(c) })), [campaigns, brandFilter, allSelected]);

  const rows = useMemo(() => {
    const filtered = enriched.filter((c) =>
      !searchTerm || (c.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'string') return av.localeCompare(bv) * dir;
      return (av - bv) * dir;
    });
  }, [enriched, sortKey, sortDir, searchTerm]);

  const onSort = (k) => {
    if (sortKey === k) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
  };
  const arrow = (k) => (sortKey === k ? (sortDir === 'desc' ? ' ▼' : ' ▲') : '');

  const brandsLabel = allSelected
    ? 'All brands'
    : brandFilter.length <= 2
      ? brandFilter.join(', ')
      : `${brandFilter.length} brands selected`;

  return (
    <div className="da-table-wrap">
      <div className="da-table-controls">
        <div className="metric-selector" ref={brandsRef}>
          <label>Brands:</label>
          <div className="custom-dropdown">
            <button className="custom-dropdown-trigger" onClick={() => setBrandsOpen(!brandsOpen)}>
              <span className="dropdown-value">{brandsLabel}</span>
              <svg className={`dropdown-arrow ${brandsOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 12 12">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {brandsOpen && (
              <div className="custom-dropdown-menu multi-select" onMouseDown={(e) => e.stopPropagation()}>
                <div className="year-dropdown-scroll">
                  <label className={`custom-dropdown-option ${allSelected ? 'selected' : ''}`}>
                    <input type="checkbox" checked={allSelected} onChange={() => toggleBrand('__all__')} />
                    <span>All</span>
                  </label>
                  {brands.map((b) => (
                    <label key={b} className={`custom-dropdown-option ${brandFilter.includes(b) ? 'selected' : ''}`}>
                      <input type="checkbox" checked={brandFilter.includes(b)} onChange={() => toggleBrand(b)} />
                      <span>{b}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <span className="da-row-count">{rows.length} campaigns</span>
      </div>
      <div className="da-table-scroll">
        <table className="da-table">
          <thead>
            <tr>
              <th onClick={() => onSort('sent_date')}>Sent{arrow('sent_date')}</th>
              <th onClick={() => onSort('name')}>Campaign{arrow('name')}</th>
              <th onClick={() => onSort('brand')}>Brand{arrow('brand')}</th>
              <th onClick={() => onSort('sent')} className="num">Sends{arrow('sent')}</th>
              <th onClick={() => onSort('openRate')} className="num">Open{arrow('openRate')}</th>
              <th onClick={() => onSort('clickRate')} className="num">Click{arrow('clickRate')}</th>
              <th onClick={() => onSort('bounceRate')} className="num">Bounce{arrow('bounceRate')}</th>
              <th onClick={() => onSort('unsubRate')} className="num">Unsub{arrow('unsubRate')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr
                key={c.campaign_id}
                className="da-campaign-row"
                onClick={() => setSelectedCampaign(c)}
                title="Click to drill into per-domain and per-state breakdown"
              >
                <td>{c.sent_date}</td>
                <td className="da-campaign-name">{c.name || c.campaign_id}</td>
                <td>{c.brand}</td>
                <td className="num">{fmtInt(c.sent)}</td>
                <td className="num">{fmtPct(c.openRate)}</td>
                <td className="num">{fmtPct(c.clickRate)}</td>
                <td className={`num ${bounceClass(c.bounceRate)}`}>{fmtPct(c.bounceRate)}</td>
                <td className={`num ${unsubClass(c.unsubRate)}`}>{fmtPct(c.unsubRate)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="da-empty">No campaigns match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedCampaign && (
        <CampaignDrillDownModal
          campaign={selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
        />
      )}
    </div>
  );
};

const buildDimRows = (data, dimKey, labelFn) => {
  const dimMap = data[dimKey] || {};
  const byKey = {};
  Object.entries(dimMap).forEach(([brand, dimValueMap]) => {
    Object.entries(dimValueMap).forEach(([dimValue, monthMap]) => {
      const totals = sumMonths(monthMap);
      const r = computeRates(totals);
      if (!byKey[dimValue]) {
        byKey[dimValue] = { key: dimValue, label: labelFn(dimValue), totalSent: 0, byBrand: {} };
      }
      byKey[dimValue].byBrand[brand] = r;
      byKey[dimValue].totalSent += r.sent || 0;
    });
  });
  return Object.values(byKey);
};

const DeliverabilityAnalytics = ({ searchTerm = '' }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [trendSelectedBrands, setTrendSelectedBrands] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await fetch(`${BLOB_URL}&_t=${Date.now()}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = await r.json();
        setData(json);
      } catch (e) {
        setError('Failed to load deliverability data.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const brandRows = useMemo(() => {
    if (!data) return [];
    const rows = Object.entries(data.by_brand || {}).map(([brand, monthMap]) => {
      const totals = sumMonths(monthMap);
      return { brand, ...computeRates(totals) };
    });
    return rows.sort((a, b) => (b.sent || 0) - (a.sent || 0));
  }, [data]);

  const allBrands = useMemo(() => brandRows.map((r) => r.brand), [brandRows]);

  const defaultTrendBrands = useMemo(() => allBrands.slice(0, 6), [allBrands]);
  const effectiveTrendBrands = trendSelectedBrands ?? defaultTrendBrands;

  const toggleTrendBrand = (b) => {
    setTrendSelectedBrands((prev) => {
      const cur = prev ?? defaultTrendBrands;
      if (cur.includes(b)) return cur.filter((x) => x !== b);
      return [...cur, b];
    });
  };

  const brandBaselines = useMemo(() => {
    const out = {};
    brandRows.forEach((r) => { out[r.brand] = r; });
    return out;
  }, [brandRows]);

  const overallTotals = useMemo(() => {
    const total = emptyTotals();
    brandRows.forEach((r) => addInto(total, r));
    return total;
  }, [brandRows]);

  const allMonths = useMemo(() => (data ? allMonthsAcross(data) : []), [data]);

  const domainRows = useMemo(() => data ? buildDimRows(data, 'by_brand_domain', (v) => v) : [], [data]);
  const specialtyRows = useMemo(() => data ? buildDimRows(data, 'by_brand_specialty', specialtyLabel) : [], [data]);
  const stateRows = useMemo(() => data ? buildDimRows(data, 'by_brand_state', (v) => v) : [], [data]);

  const brandColor = useMemo(() => {
    const m = {};
    allBrands.forEach((b, i) => { m[b] = PALETTE[i % PALETTE.length]; });
    return (b) => m[b] || '#888';
  }, [allBrands]);

  if (loading) return (
    <div className="da-status">
      <div className="da-spinner" />
      <div>Loading…</div>
    </div>
  );
  if (error) return <div className="da-status da-status-error">{error}</div>;
  if (!data || brandRows.length === 0) return <div className="da-status">No data yet.</div>;

  const overallRates = computeRates(overallTotals);

  return (
    <div className="deliverability-analytics">
      <div className="section-header-bar">
        <h3>Domain Reputation & Deliverability</h3>
        <div className="section-header-stats">
          <div className="section-header-stat-item">
            <span className="section-header-stat-label">Total sends</span>
            <span className="section-header-stat-value">{fmtInt(overallRates.sent)}</span>
          </div>
          <div className="section-header-stat-item">
            <span className="section-header-stat-label">Open</span>
            <span className="section-header-stat-value">{fmtPct(overallRates.openRate)}</span>
          </div>
          <div className="section-header-stat-item">
            <span className="section-header-stat-label">Bounce</span>
            <span className={`section-header-stat-value ${bounceClass(overallRates.bounceRate)}`}>{fmtPct(overallRates.bounceRate)}</span>
          </div>
          <div className="section-header-stat-item">
            <span className="section-header-stat-label">Unsub</span>
            <span className={`section-header-stat-value ${unsubClass(overallRates.unsubRate)}`}>{fmtPct(overallRates.unsubRate)}</span>
          </div>
          <div className="section-header-stat-item">
            <span className="section-header-stat-label">Brands</span>
            <span className="section-header-stat-value">{brandRows.length}</span>
          </div>
          <div className="section-header-stat-item">
            <span className="section-header-stat-label">Updated</span>
            <span className="section-header-stat-value">{data.last_updated ? data.last_updated.slice(0, 10) : '—'}</span>
          </div>
        </div>
      </div>

      <div className="analytics-tabs da-sub-tabs">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-button ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <InsightCallouts rows={brandRows} />
          <OverviewTable rows={brandRows} />
          <TrendOverlay
            data={data}
            allBrands={allBrands}
            allMonths={allMonths}
            brandColor={brandColor}
            selectedBrands={effectiveTrendBrands}
            onToggleBrand={toggleTrendBrand}
          />
        </>
      )}

      {activeTab === 'domain' && (
        <MatrixTable
          dimensionLabel="Email Domain"
          dimRows={domainRows}
          brands={allBrands}
          brandBaselines={brandBaselines}
          searchTerm={searchTerm}
          groupByOption={{
            label: 'Group by domain type',
            groupedLabel: 'Domain Type',
            groupFn: domainTypeBucket,
            title: 'Aggregate by .edu / .gov / Free Webmail / Corporate / etc.',
          }}
        />
      )}

      {activeTab === 'specialty' && (
        <MatrixTable
          dimensionLabel="Specialty"
          dimRows={specialtyRows}
          brands={allBrands}
          brandBaselines={brandBaselines}
          searchTerm={searchTerm}
        />
      )}

      {activeTab === 'location' && (
        <MatrixTable
          dimensionLabel="State"
          dimRows={stateRows}
          brands={allBrands}
          brandBaselines={brandBaselines}
          searchTerm={searchTerm}
        />
      )}

      {activeTab === 'campaign' && (
        <CampaignTable
          campaigns={data.by_campaign || []}
          brands={brandRows.map((r) => r.brand)}
          searchTerm={searchTerm}
        />
      )}
    </div>
  );
};

export default DeliverabilityAnalytics;