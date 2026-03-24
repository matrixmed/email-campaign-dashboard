import React, { useState, useEffect, useMemo } from 'react';
import '../../styles/SubjectLineAnalysis.css';
import '../../styles/SectionHeaders.css';
import { matchesSearchTerm } from '../../utils/searchUtils';
import { stripAbGroup } from '../../utils/campaignClassifier';

const BLOB_URL = "https://emaildash.blob.core.windows.net/json-data/completed_campaign_metrics.json?sp=r&st=2025-05-08T18:43:13Z&se=2027-06-26T02:43:13Z&spr=https&sv=2024-11-04&sr=b&sig=%2FuZDifPilE4VzfTl%2BWjUcSmzP9M283h%2B8gH9Q1V3TUg%3D";

const getBaseName = (name) => {
  return stripAbGroup(
    name
      .replace(/\s*[-\u2013\u2014]\s*deployment\s*#?\d+/i, '')
      .replace(/\s+deployment\s*#?\d+/i, '')
      .replace(/\s*[-\u2013\u2014]\s*deployment\s+(one|two|three)/i, '')
  ).trim();
};

const getCharLengthBucket = (len) => {
  if (len <= 15) return '1–15';
  if (len <= 30) return '16–30';
  if (len <= 45) return '31–45';
  if (len <= 60) return '46–60';
  if (len <= 75) return '61–75';
  return '76+';
};

const getReadabilityBucket = (subject) => {
  const words = subject.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return '< 4';
  const avgLen = words.reduce((sum, w) => sum + w.replace(/[^a-zA-Z]/g, '').length, 0) / words.length;
  if (avgLen < 4) return '< 4';
  if (avgLen < 5) return '4 – 5';
  if (avgLen < 6) return '5 – 6';
  if (avgLen < 7) return '6 – 7';
  if (avgLen < 8) return '7 – 8';
  return '8+';
};

const ACTION_VERBS = ['discover', 'explore', 'learn', 'understand', 'join', 'watch', 'see', 'hear', 'read', 'get', 'find', 'unlock', 'uncover', 'review', 'examine', 'check', 'start', 'meet', 'take', 'navigate', 'optimize', 'improve', 'manage', 'address', 'consider', 'identify', 'evaluate', 'register'];
const URGENCY_WORDS = ['now', 'new', 'coming soon', 'latest', 'just released', 'don\'t miss', 'limited', 'breaking', 'update', 'alert', 'today', 'available now'];

const getStructuralTraits = (subject) => {
  const lower = subject.toLowerCase();
  const firstWord = lower.split(/\s+/)[0]?.replace(/[^a-z]/g, '') || '';
  const traits = {};

  traits['Action verb opener'] = ACTION_VERBS.includes(firstWord);
  traits['Urgency words'] = URGENCY_WORDS.some(w => lower.includes(w));
  traits['Question mark'] = subject.includes('?');
  traits['Em/en dash'] = /[\u2013\u2014]/.test(subject) || / - /.test(subject);
  traits['Parenthetical'] = /\(.*\)/.test(subject);
  traits['Trademark symbols'] = /[\u00AE\u2122\u00A9]/.test(subject) || /®|™/.test(subject);
  traits['ALL CAPS word'] = /\b[A-Z]{2,}\b/.test(subject.replace(/\b(MD|PhD|DO|NP|PA|RN|US|FDA|MOA)\b/g, ''));
  traits['Colon separator'] = subject.includes(':');
  traits['Number/stat'] = /\d/.test(subject);

  return traits;
};

const computeAnalysis = (subjects) => {
  const overallAvg = subjects.length > 0
    ? subjects.reduce((sum, s) => sum + s.open_rate, 0) / subjects.length : 0;

  const charBucketOrder = ['1–15', '16–30', '31–45', '46–60', '61–75', '76+'];
  const charBuckets = {};
  charBucketOrder.forEach(b => { charBuckets[b] = { rates: [], count: 0 }; });
  for (const s of subjects) {
    charBuckets[s.char_bucket].rates.push(s.open_rate);
    charBuckets[s.char_bucket].count++;
  }
  const charAnalysis = charBucketOrder.map(b => ({
    bucket: b,
    count: charBuckets[b].count,
    avg_rate: charBuckets[b].count > 0 ? Math.round((charBuckets[b].rates.reduce((a, c) => a + c, 0) / charBuckets[b].count) * 100) / 100 : 0
  }));

  const readBucketOrder = ['< 4', '4 – 5', '5 – 6', '6 – 7', '7 – 8', '8+'];
  const readBuckets = {};
  readBucketOrder.forEach(b => { readBuckets[b] = { rates: [], count: 0 }; });
  for (const s of subjects) {
    readBuckets[s.readability].rates.push(s.open_rate);
    readBuckets[s.readability].count++;
  }
  const readabilityAnalysis = readBucketOrder.map(b => ({
    bucket: b,
    count: readBuckets[b].count,
    avg_rate: readBuckets[b].count > 0 ? Math.round((readBuckets[b].rates.reduce((a, c) => a + c, 0) / readBuckets[b].count) * 100) / 100 : 0
  }));

  const wcMap = {};
  for (const s of subjects) {
    const wc = s.word_count;
    if (!wcMap[wc]) wcMap[wc] = { rates: [], count: 0 };
    wcMap[wc].rates.push(s.open_rate);
    wcMap[wc].count++;
  }
  const wcKeys = Object.keys(wcMap).map(Number).sort((a, b) => a - b);
  const minWc = wcKeys[0] || 1;
  const maxWc = wcKeys[wcKeys.length - 1] || 1;
  const wordAnalysis = [];
  for (let wc = minWc; wc <= maxWc; wc++) {
    const entry = wcMap[wc];
    wordAnalysis.push({
      bucket: `${wc}`,
      count: entry?.count || 0,
      avg_rate: entry?.count > 0 ? Math.round((entry.rates.reduce((a, c) => a + c, 0) / entry.count) * 100) / 100 : 0
    });
  }

  const traitKeys = ['Action verb opener', 'Urgency words', 'Question mark', 'Em/en dash', 'Parenthetical', 'Trademark symbols', 'ALL CAPS word', 'Colon separator', 'Number/stat'];
  const traitImpact = traitKeys.map(trait => {
    const withTrait = subjects.filter(s => s.traits[trait]);
    const withoutTrait = subjects.filter(s => !s.traits[trait]);
    const avgWith = withTrait.length > 0 ? withTrait.reduce((sum, s) => sum + s.open_rate, 0) / withTrait.length : 0;
    const avgWithout = withoutTrait.length > 0 ? withoutTrait.reduce((sum, s) => sum + s.open_rate, 0) / withoutTrait.length : 0;
    return {
      trait,
      count_with: withTrait.length,
      avg_with: Math.round(avgWith * 100) / 100,
      avg_without: Math.round(avgWithout * 100) / 100,
      impact_pp: Math.round((avgWith - avgWithout) * 100) / 100
    };
  }).sort((a, b) => Math.abs(b.impact_pp) - Math.abs(a.impact_pp));

  return {
    subjects,
    overallAvg: Math.round(overallAvg * 100) / 100,
    charAnalysis,
    wordAnalysis,
    traitImpact,
    readabilityAnalysis,
    summary: {
      total_subjects: subjects.length,
      avg_open_rate: Math.round(overallAvg * 100) / 100,
      avg_word_count: subjects.length > 0 ? Math.round((subjects.reduce((a, s) => a + s.word_count, 0) / subjects.length) * 10) / 10 : 0
    }
  };
};

const SubjectLineAnalysis = ({ searchTerm = '' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAndAnalyze();
  }, []);

  const fetchAndAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BLOB_URL}&_t=${Date.now()}`);
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      const campaigns = await response.json();

      const groups = {};
      for (const c of campaigns) {
        const baseName = getBaseName(c.Campaign || '');
        if (!baseName) continue;
        if (!groups[baseName]) groups[baseName] = [];
        groups[baseName].push(c);
      }

      const subjects = [];
      for (const [baseName, deployments] of Object.entries(groups)) {
        const d1 = deployments.find(d =>
          /deployment\s*#?\s*1\s*$/i.test(d.Campaign || '')
        ) || deployments[0];

        const subject = d1.Subject_Line || '';
        if (!subject.trim()) continue;
        const sent = d1.Sent || 0;
        if (sent < 50) continue;
        const delivered = d1.Delivered || 0;
        const totalOpens = deployments.reduce((sum, d) => sum + (d.Unique_Opens || 0), 0);
        const openRate = delivered > 0 ? Math.min(Math.round((totalOpens / delivered * 100) * 100) / 100, 100) : 0;

        const words = subject.split(/\s+/);
        const wc = words.length;
        const charLen = subject.length;

        subjects.push({
          subject,
          campaign_name: baseName,
          sent,
          delivered,
          unique_opens: totalOpens,
          open_rate: openRate,
          word_count: wc,
          char_length: charLen,
          char_bucket: getCharLengthBucket(charLen),
          readability: getReadabilityBucket(subject),
          traits: getStructuralTraits(subject)
        });
      }

      setData(computeAnalysis(subjects));
    } catch (err) {
      setError('Failed to load subject line data.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!data) return null;
    if (!searchTerm.trim()) return data;

    const subjects = data.subjects.filter(s =>
      matchesSearchTerm(s.subject, searchTerm) || matchesSearchTerm(s.campaign_name, searchTerm)
    );
    if (subjects.length === 0) return null;

    return computeAnalysis(subjects);
  }, [data, searchTerm]);

  if (loading) {
    return (
      <div className="sla-container">
        <div className="sb-loader">
          <div className="sb-spinner"><div></div><div></div><div></div><div></div><div></div><div></div></div>
          <p>Loading subject line analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="sla-container"><div className="sla-empty">{error}</div></div>;
  }

  if (!filtered) {
    return <div className="sla-container"><div className="sla-empty">No matching subject lines found.</div></div>;
  }

  const { overallAvg, charAnalysis, wordAnalysis, traitImpact, readabilityAnalysis, summary } = filtered;

  const bestCharBucket = charAnalysis.filter(b => b.count >= 3).reduce((best, b) => b.avg_rate > (best?.avg_rate || 0) ? b : best, null);
  const bestReadBucket = readabilityAnalysis.filter(b => b.count >= 3).reduce((best, b) => b.avg_rate > (best?.avg_rate || 0) ? b : best, null);
  const bestWordCount = wordAnalysis.filter(b => b.count >= 3).reduce((best, b) => b.avg_rate > (best?.avg_rate || 0) ? b : best, null);
  const maxCharRate = Math.max(...charAnalysis.map(c => c.avg_rate));
  const maxReadRate = Math.max(...readabilityAnalysis.map(r => r.avg_rate));
  const maxWordRate = Math.max(...wordAnalysis.filter(w => w.count > 0).map(w => w.avg_rate), 0);

  return (
    <div className="sla-container">
      <div className="section-header-bar">
        <h3>Subject Line Analysis</h3>
        <div className="section-header-stats">
          <div className="section-header-stat-item">
            <span className="section-header-stat-label">Analyzed</span>
            <span className="section-header-stat-value">{summary.total_subjects}</span>
          </div>
          <div className="section-header-stat-item">
            <span className="section-header-stat-label">Avg Open Rate</span>
            <span className="section-header-stat-value">{summary.avg_open_rate}%</span>
          </div>
          <div className="section-header-stat-item">
            <span className="section-header-stat-label">Avg Words</span>
            <span className="section-header-stat-value">{summary.avg_word_count}</span>
          </div>
        </div>
      </div>

      <div className="sla-section">
        <div className="sla-anatomy-grid">
          <div className="sla-anatomy-card">
            <h5>Character Length</h5>
            <div className="sla-mini-chart">
              {charAnalysis.map(c => (
                <div className={`sla-mini-row ${c.bucket === bestCharBucket?.bucket ? 'sla-sweet-spot' : ''}`} key={c.bucket}>
                  <div className="sla-mini-label">{c.bucket}</div>
                  <div className="sla-mini-track">
                    <div className="sla-mini-fill" style={{ width: `${maxCharRate > 0 ? (c.avg_rate / maxCharRate) * 100 : 0}%` }} />
                  </div>
                  <div className="sla-mini-value">{c.avg_rate}%</div>
                  <div className="sla-mini-count">({c.count})</div>
                </div>
              ))}
            </div>
          </div>

          <div className="sla-anatomy-card">
            <h5>Readability (Avg Word Length)</h5>
            <div className="sla-mini-chart">
              {readabilityAnalysis.map(r => (
                <div className={`sla-mini-row ${r.bucket === bestReadBucket?.bucket ? 'sla-sweet-spot' : ''}`} key={r.bucket}>
                  <div className="sla-mini-label">{r.bucket} chars</div>
                  <div className="sla-mini-track">
                    <div className="sla-mini-fill" style={{ width: `${maxReadRate > 0 ? (r.avg_rate / maxReadRate) * 100 : 0}%` }} />
                  </div>
                  <div className="sla-mini-value">{r.avg_rate}%</div>
                  <div className="sla-mini-count">({r.count})</div>
                </div>
              ))}
            </div>
          </div>

          <div className="sla-anatomy-card">
            <h5>Structure Impact</h5>
            <div className="sla-trait-list">
              {traitImpact.filter(t => t.count_with >= 3).map(t => (
                <div className="sla-trait-row" key={t.trait}>
                  <span className={`sla-trait-arrow ${t.impact_pp >= 0 ? 'sla-up' : 'sla-down'}`}>
                    {t.impact_pp >= 0 ? '\u25B2' : '\u25BC'}
                  </span>
                  <span className="sla-trait-name">{t.trait}</span>
                  <span className={`sla-trait-impact ${t.impact_pp >= 0 ? 'sla-positive' : 'sla-negative'}`}>
                    {t.impact_pp >= 0 ? '+' : ''}{t.impact_pp}pp
                  </span>
                  <span className="sla-trait-n">({t.count_with})</span>
                </div>
              ))}
            </div>
          </div>

          <div className="sla-anatomy-card">
            <h5>Word Count</h5>
            <div className="sla-mini-chart">
              {wordAnalysis.filter(w => w.count > 0).map(w => (
                <div className={`sla-mini-row ${w.bucket === bestWordCount?.bucket ? 'sla-sweet-spot' : ''}`} key={w.bucket}>
                  <div className="sla-mini-label">{w.bucket} word{w.bucket !== '1' ? 's' : ''}</div>
                  <div className="sla-mini-track">
                    <div className="sla-mini-fill" style={{ width: `${maxWordRate > 0 ? (w.avg_rate / maxWordRate) * 100 : 0}%` }} />
                  </div>
                  <div className="sla-mini-value">{w.avg_rate}%</div>
                  <div className="sla-mini-count">({w.count})</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubjectLineAnalysis;