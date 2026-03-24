import React, { useState, useEffect } from 'react';

const NormalDistributionModal = ({ anomaly, groupCampaigns, onClose, showOverperforming, detectByDisease }) => {
  const [hoveredDot, setHoveredDot] = useState(null);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const mean = anomaly.topicMean;
  const stdDev = anomaly.topicStdDev;

  if (!stdDev || stdDev <= 0) {
    return (
      <div className="nd-modal-overlay" onClick={onClose}>
        <div className="nd-modal" onClick={e => e.stopPropagation()}>
          <button className="nd-modal-close" onClick={onClose}>&times;</button>
          <p style={{ color: '#aaa', textAlign: 'center', padding: '40px 20px' }}>
            Cannot generate distribution — standard deviation is zero.
          </p>
        </div>
      </div>
    );
  }

  const W = 720, H = 380;
  const M = { top: 25, right: 40, bottom: 65, left: 40 };
  const cW = W - M.left - M.right, cH = H - M.top - M.bottom;

  const pdf = (x) =>
    (1 / (stdDev * Math.sqrt(2 * Math.PI))) *
    Math.exp(-0.5 * ((x - mean) / stdDev) ** 2);

  const xMin = mean - 4.5 * stdDev;
  const xMax = mean + 4.5 * stdDev;
  const yMax = pdf(mean) * 1.15;

  const sx = v => M.left + ((v - xMin) / (xMax - xMin)) * cW;
  const sy = v => M.top + (1 - v / yMax) * cH;
  const baseY = sy(0);

  const curvePts = Array.from({ length: 301 }, (_, i) => {
    const x = xMin + (xMax - xMin) * (i / 300);
    return { x, y: pdf(x) };
  });
  const curveLine = curvePts.map((p, i) =>
    `${i ? 'L' : 'M'}${sx(p.x).toFixed(2)},${sy(p.y).toFixed(2)}`
  ).join('');
  const curveArea = `${curveLine}L${sx(xMax).toFixed(2)},${baseY.toFixed(2)}L${sx(xMin).toFixed(2)},${baseY.toFixed(2)}Z`;

  const tLow = mean - 1.5 * stdDev;
  const tHigh = mean + 1.5 * stdDev;

  const tailPath = (from, to) => {
    const pts = Array.from({ length: 61 }, (_, i) => {
      const x = from + (to - from) * (i / 60);
      return { x, y: pdf(x) };
    });
    const line = pts.map((p, i) =>
      `${i ? 'L' : 'M'}${sx(p.x).toFixed(2)},${sy(p.y).toFixed(2)}`
    ).join('');
    return `${line}L${sx(to).toFixed(2)},${baseY.toFixed(2)}L${sx(from).toFixed(2)},${baseY.toFixed(2)}Z`;
  };

  const dots = groupCampaigns.map(c => {
    const rate = c.Unique_Open_Rate;
    const clamped = Math.max(xMin, Math.min(xMax, rate));
    const isSel = c.CleanedName === anomaly.CleanedName && c.Send_Date === anomaly.Send_Date;
    return {
      c, x: sx(clamped), y: sy(pdf(clamped)), rate,
      isSel, isOver: rate > tHigh, isUnder: rate < tLow, isLive: c.isLive
    };
  }).sort((a, b) => (a.isSel ? 1 : 0) - (b.isSel ? 1 : 0));

  const sigmas = [-3, -2, -1, 0, 1, 2, 3]
    .map(s => ({ v: mean + s * stdDev, s }))
    .filter(t => t.v >= xMin && t.v <= xMax);

  const tipPos = (d) => {
    let tx = d.x + 14, ty = d.y - 70;
    if (tx + 320 > W - M.right) tx = d.x - 334;
    if (ty < M.top) ty = d.y + 14;
    return { tx, ty };
  };

  const groupLabel = detectByDisease
    ? `${anomaly.Bucket} · ${anomaly.Topic}`
    : anomaly.Bucket;

  return (
    <div className="nd-modal-overlay" onClick={onClose}>
      <div className="nd-modal" onClick={e => e.stopPropagation()}>
        <button className="nd-modal-close" onClick={onClose}>&times;</button>
        <div className="nd-modal-header">
          <h3 className="nd-modal-title">{groupLabel}</h3>
          <div className="nd-modal-stats">
            <span>{groupCampaigns.length} campaigns</span>
            <span>μ = {mean.toFixed(2)}%</span>
            <span>σ = {stdDev.toFixed(2)}%</span>
          </div>
        </div>

        <div className="nd-chart-wrapper">
          <svg viewBox={`0 0 ${W} ${H}`} className="nd-chart-svg">
            <defs>
              <linearGradient id="ndCurveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(0,255,255,0.2)" />
                <stop offset="100%" stopColor="rgba(0,255,255,0.01)" />
              </linearGradient>
              <filter id="ndGlow">
                <feGaussianBlur stdDeviation="3" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            <path d={tailPath(xMin, tLow)} fill="rgba(255,107,107,0.1)" />
            <path d={tailPath(tHigh, xMax)} fill="rgba(76,175,80,0.1)" />

            <path d={curveArea} fill="url(#ndCurveGrad)" />
            <path d={curveLine} fill="none" stroke="rgba(0,255,255,0.45)" strokeWidth="2" />

            <line x1={sx(tLow)} y1={M.top} x2={sx(tLow)} y2={baseY}
              stroke="rgba(255,107,107,0.3)" strokeWidth="1" strokeDasharray="5,4" />
            <line x1={sx(tHigh)} y1={M.top} x2={sx(tHigh)} y2={baseY}
              stroke="rgba(76,175,80,0.3)" strokeWidth="1" strokeDasharray="5,4" />

            <text x={sx(tLow)} y={M.top - 5} textAnchor="middle"
              fill="rgba(255,107,107,0.55)" fontSize="10">{'\u2212'}1.5σ</text>
            <text x={sx(tHigh)} y={M.top - 5} textAnchor="middle"
              fill="rgba(76,175,80,0.55)" fontSize="10">+1.5σ</text>

            <line x1={sx(mean)} y1={M.top} x2={sx(mean)} y2={baseY}
              stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeDasharray="3,5" />

            <line x1={M.left} y1={baseY} x2={M.left + cW} y2={baseY}
              stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

            {sigmas.map((t, i) => (
              <g key={i}>
                <line x1={sx(t.v)} y1={baseY} x2={sx(t.v)} y2={baseY + 5}
                  stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                <text x={sx(t.v)} y={baseY + 18} textAnchor="middle" fill="#666" fontSize="10">
                  {t.s === 0 ? 'μ' : `${t.s > 0 ? '+' : ''}${t.s}σ`}
                </text>
                <text x={sx(t.v)} y={baseY + 31} textAnchor="middle" fill="#555" fontSize="9">
                  {t.v.toFixed(1)}%
                </text>
              </g>
            ))}

            <text x={M.left + cW / 2} y={H - 6} textAnchor="middle" fill="#555" fontSize="11">
              Unique Open Rate (%)
            </text>

            {dots.filter(d => d.isSel).map((d, i) => (
              <line key={`vl-${i}`} x1={d.x} y1={baseY} x2={d.x} y2={d.y}
                stroke="rgba(0,255,255,0.25)" strokeWidth="1" strokeDasharray="3,3" />
            ))}

            {dots.map((d, i) => (
              <g key={i}
                onMouseEnter={() => setHoveredDot(d)}
                onMouseLeave={() => setHoveredDot(null)}
                style={{ cursor: 'pointer' }}>
                <circle cx={d.x} cy={d.y} r="12" fill="transparent" />
                {d.isSel ? (
                  <>
                    <circle cx={d.x} cy={d.y} r="10" fill="rgba(0,255,255,0.12)" />
                    <circle cx={d.x} cy={d.y} r="6" fill="#0ff" stroke="#fff" strokeWidth="2"
                      filter="url(#ndGlow)" />
                  </>
                ) : (
                  <circle cx={d.x} cy={d.y}
                    r={hoveredDot === d ? 6 : 4.5}
                    fill={d.isUnder ? 'rgba(255,107,107,0.7)'
                      : d.isOver ? 'rgba(76,175,80,0.7)'
                      : 'rgba(255,255,255,0.3)'}
                    stroke={hoveredDot === d ? '#fff' : 'none'}
                    strokeWidth="1.5"
                    style={{ transition: 'all 0.15s ease' }} />
                )}
              </g>
            ))}

            {dots.filter(d => d.isSel).map((d, i) => (
              <text key={`sl-${i}`} x={d.x} y={d.y - 16}
                textAnchor="middle" fill="#0ff" fontSize="12" fontWeight="600">
                {d.rate.toFixed(1)}%
              </text>
            ))}

            {hoveredDot && !hoveredDot.isSel && (() => {
              const { tx, ty } = tipPos(hoveredDot);
              return (
                <foreignObject x={tx} y={ty} width="320" height="120"
                  style={{ pointerEvents: 'none', overflow: 'visible' }}>
                  <div className="nd-svg-tooltip">
                    <div className="nd-svg-tooltip-name">{hoveredDot.c.CleanedName}</div>
                    <div className="nd-svg-tooltip-rate">
                      {hoveredDot.rate.toFixed(2)}% open rate
                      {hoveredDot.isLive && <span className="nd-svg-tooltip-live"> · LIVE</span>}
                    </div>
                  </div>
                </foreignObject>
              );
            })()}
          </svg>
        </div>

        <div className="nd-legend">
          <div className="nd-legend-item">
            <span className="nd-legend-dot nd-legend-selected" />
            <span>Selected</span>
          </div>
          <div className="nd-legend-item">
            <span className="nd-legend-dot nd-legend-normal" />
            <span>Normal range</span>
          </div>
          <div className="nd-legend-item">
            <span className="nd-legend-dot nd-legend-under" />
            <span>Underperforming</span>
          </div>
          <div className="nd-legend-item">
            <span className="nd-legend-dot nd-legend-over" />
            <span>Overperforming</span>
          </div>
        </div>

        <div className="nd-selected-bar">
          <span className="nd-selected-bar-name">{anomaly.CleanedName}</span>
          <div className="nd-selected-bar-stats">
            <span>{anomaly.Unique_Open_Rate.toFixed(2)}%</span>
            <span className="nd-selected-bar-divider">·</span>
            <span>Z: {anomaly.zScore >= 0 ? '+' : ''}{anomaly.zScore.toFixed(2)}</span>
            <span className="nd-selected-bar-divider">·</span>
            <span>{anomaly.deviationPercent >= 0 ? '+' : ''}{anomaly.deviationPercent.toFixed(1)}% from μ</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NormalDistributionModal;