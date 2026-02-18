import React, { useState, useEffect, useMemo } from 'react';
import '../../styles/SubjectLineAnalysis.css';
import '../../styles/SectionHeaders.css';
import { matchesSearchTerm } from '../../utils/searchUtils';
import { stripAbGroup } from '../../utils/campaignClassifier';

const BLOB_URL = "https://emaildash.blob.core.windows.net/json-data/completed_campaign_metrics.json?sp=r&st=2025-05-08T18:43:13Z&se=2027-06-26T02:43:13Z&spr=https&sv=2024-11-04&sr=b&sig=%2FuZDifPilE4VzfTl%2BWjUcSmzP9M283h%2B8gH9Q1V3TUg%3D";

const INITIAL_ROWS = 25;

const getBaseName = (name) => {
  return stripAbGroup(
    name
      .replace(/\s*[-\u2013\u2014]\s*deployment\s*#?\d+/i, '')
      .replace(/\s+deployment\s*#?\d+/i, '')
      .replace(/\s*[-\u2013\u2014]\s*deployment\s+(one|two|three)/i, '')
  ).trim();
};

const SubjectLineAnalysis = ({ searchTerm = '' }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('insights');
  const [showMoreSubjects, setShowMoreSubjects] = useState(false);
  const [showMoreKeywords, setShowMoreKeywords] = useState(false);

  useEffect(() => {
    fetchAndAnalyze();
  }, []);

  const fetchAndAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(BLOB_URL);
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
      const firstWordCounts = {};
      const wordCountBuckets = { '1-3': { count: 0, total: 0 }, '4-6': { count: 0, total: 0 }, '7-9': { count: 0, total: 0 }, '10-12': { count: 0, total: 0 }, '13+': { count: 0, total: 0 } };
      const structureStats = {
        question: { count: 0, total: 0 }, statement: { count: 0, total: 0 },
        with_number: { count: 0, total: 0 }, without_number: { count: 0, total: 0 },
        with_colon: { count: 0, total: 0 }, without_colon: { count: 0, total: 0 },
        personalized: { count: 0, total: 0 }, not_personalized: { count: 0, total: 0 }
      };
      const keywordMap = {};

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
        const firstWord = words[0] ? words[0].toLowerCase().replace(/[:,!?]+$/, '') : '';
        const hasQuestion = subject.includes('?');
        const hasNumber = /\d/.test(subject);
        const hasColon = subject.includes(':');
        const lower = subject.toLowerCase();
        const isPersonalized = lower.includes('your') || lower.includes('you') || lower.includes('dr.');

        const bucket = wc <= 3 ? '1-3' : wc <= 6 ? '4-6' : wc <= 9 ? '7-9' : wc <= 12 ? '10-12' : '13+';

        subjects.push({
          subject, campaign_name: baseName, sent, delivered,
          unique_opens: totalOpens, open_rate: openRate, word_count: wc
        });

        if (firstWord) {
          if (!firstWordCounts[firstWord]) firstWordCounts[firstWord] = { count: 0, total: 0 };
          firstWordCounts[firstWord].count++;
          firstWordCounts[firstWord].total += openRate;
        }

        wordCountBuckets[bucket].count++;
        wordCountBuckets[bucket].total += openRate;

        structureStats[hasQuestion ? 'question' : 'statement'].count++;
        structureStats[hasQuestion ? 'question' : 'statement'].total += openRate;
        structureStats[hasNumber ? 'with_number' : 'without_number'].count++;
        structureStats[hasNumber ? 'with_number' : 'without_number'].total += openRate;
        structureStats[hasColon ? 'with_colon' : 'without_colon'].count++;
        structureStats[hasColon ? 'with_colon' : 'without_colon'].total += openRate;
        structureStats[isPersonalized ? 'personalized' : 'not_personalized'].count++;
        structureStats[isPersonalized ? 'personalized' : 'not_personalized'].total += openRate;

        for (const w of words) {
          const kw = w.toLowerCase().replace(/^[,:;!?.()]+|[,:;!?.()]+$/g, '');
          if (kw.length >= 3) {
            if (!keywordMap[kw]) keywordMap[kw] = { count: 0, total: 0 };
            keywordMap[kw].count++;
            keywordMap[kw].total += openRate;
          }
        }
      }

      subjects.sort((a, b) => b.open_rate - a.open_rate);

      const firstWordAnalysis = Object.entries(firstWordCounts)
        .filter(([, s]) => s.count >= 3)
        .map(([word, s]) => ({ word, count: s.count, avg_open_rate: Math.round((s.total / s.count) * 100) / 100 }))
        .sort((a, b) => b.avg_open_rate - a.avg_open_rate)
        .slice(0, 50);

      const wordCountAnalysis = ['1-3', '4-6', '7-9', '10-12', '13+'].map(b => ({
        bucket: b, count: wordCountBuckets[b].count,
        avg_open_rate: wordCountBuckets[b].count > 0 ? Math.round((wordCountBuckets[b].total / wordCountBuckets[b].count) * 100) / 100 : 0
      }));

      const structureAnalysis = {};
      for (const [key, s] of Object.entries(structureStats)) {
        structureAnalysis[key] = { count: s.count, avg_open_rate: s.count > 0 ? Math.round((s.total / s.count) * 100) / 100 : 0 };
      }

      const keywordAnalysis = Object.entries(keywordMap)
        .filter(([, s]) => s.count >= 5)
        .map(([keyword, s]) => ({ keyword, count: s.count, avg_open_rate: Math.round((s.total / s.count) * 100) / 100 }))
        .sort((a, b) => b.avg_open_rate - a.avg_open_rate)
        .slice(0, 100);

      const allRates = subjects.map(s => s.open_rate);
      const summary = {
        total_subjects: subjects.length,
        avg_open_rate: allRates.length > 0 ? Math.round((allRates.reduce((a, b) => a + b, 0) / allRates.length) * 100) / 100 : 0,
        avg_word_count: subjects.length > 0 ? Math.round((subjects.reduce((a, s) => a + s.word_count, 0) / subjects.length) * 10) / 10 : 0
      };

      setData({
        subjects: subjects.slice(0, 200),
        first_word_analysis: firstWordAnalysis,
        word_count_analysis: wordCountAnalysis,
        structure_analysis: structureAnalysis,
        keyword_analysis: keywordAnalysis,
        summary
      });
    } catch (err) {
      setError('Failed to load subject line data.');
    } finally {
      setLoading(false);
    }
  };

  const filteredSubjects = useMemo(() => {
    if (!data?.subjects) return [];
    if (!searchTerm.trim()) return data.subjects;
    return data.subjects.filter(s =>
      matchesSearchTerm(s.subject, searchTerm) || matchesSearchTerm(s.campaign_name, searchTerm)
    );
  }, [data, searchTerm]);

  const filteredFirstWords = useMemo(() => {
    if (!data?.first_word_analysis) return [];
    if (!searchTerm.trim()) return data.first_word_analysis;
    return data.first_word_analysis.filter(w => matchesSearchTerm(w.word, searchTerm));
  }, [data, searchTerm]);

  const filteredKeywords = useMemo(() => {
    if (!data?.keyword_analysis) return [];
    if (!searchTerm.trim()) return data.keyword_analysis;
    return data.keyword_analysis.filter(k => matchesSearchTerm(k.keyword, searchTerm));
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

  const summary = data?.summary || {};
  const wordCountAnalysis = data?.word_count_analysis || [];
  const structureAnalysis = data?.structure_analysis || {};

  const bestWordCount = wordCountAnalysis.reduce((best, wc) =>
    wc.avg_open_rate > (best?.avg_open_rate || 0) ? wc : best, null);

  const renderStructureCard = (title, keyA, keyB, labelA, labelB) => {
    const a = structureAnalysis[keyA] || { count: 0, avg_open_rate: 0 };
    const b = structureAnalysis[keyB] || { count: 0, avg_open_rate: 0 };
    const diff = Math.abs(a.avg_open_rate - b.avg_open_rate).toFixed(1);
    const winnerA = a.avg_open_rate > b.avg_open_rate;
    return (
      <div className="sla-structure-card">
        <h4>{title}</h4>
        <div className="sla-structure-comparison">
          <div className={`sla-structure-item ${winnerA ? 'sla-winner' : ''}`}>
            <div className="sla-structure-label">{labelA}</div>
            <div className="sla-structure-rate">{a.avg_open_rate}%</div>
            <div className="sla-structure-count">{a.count} subjects</div>
          </div>
          <div className={`sla-structure-item ${!winnerA ? 'sla-winner' : ''}`}>
            <div className="sla-structure-label">{labelB}</div>
            <div className="sla-structure-rate">{b.avg_open_rate}%</div>
            <div className="sla-structure-count">{b.count} subjects</div>
          </div>
        </div>
        <div className="sla-structure-diff">
          {winnerA ? labelA : labelB} by {diff}pp
        </div>
      </div>
    );
  };

  const visibleSubjects = showMoreSubjects ? filteredSubjects : filteredSubjects.slice(0, INITIAL_ROWS);
  const subjectsRemaining = filteredSubjects.length - INITIAL_ROWS;

  const visibleKeywords = showMoreKeywords ? filteredKeywords : filteredKeywords.slice(0, INITIAL_ROWS);
  const keywordsRemaining = filteredKeywords.length - INITIAL_ROWS;

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

      <div className="viz-tabs">
        <button className={`viz-tab ${activeTab === 'insights' ? 'active' : ''}`} onClick={() => setActiveTab('insights')}>Insights</button>
        <button className={`viz-tab ${activeTab === 'subjects' ? 'active' : ''}`} onClick={() => setActiveTab('subjects')}>Subject Lines</button>
        <button className={`viz-tab ${activeTab === 'keywords' ? 'active' : ''}`} onClick={() => setActiveTab('keywords')}>Keywords</button>
      </div>

      {activeTab === 'insights' && (
        <>
          <div className="sla-structure-grid">
            {renderStructureCard('Question vs Statement', 'question', 'statement', 'Question (?)', 'Statement')}
            {renderStructureCard('Numbers', 'with_number', 'without_number', 'With Number', 'No Number')}
            {renderStructureCard('Colon Usage', 'with_colon', 'without_colon', 'With Colon (:)', 'No Colon')}
          </div>

          <div className="sla-insights-row">
            <div className="sla-table-section">
              <div className="sla-table-title">Word Count vs Open Rate</div>
              <table className="sla-table">
                <thead>
                  <tr>
                    <th>Words</th>
                    <th>Avg Open Rate</th>
                    <th>Subjects</th>
                  </tr>
                </thead>
                <tbody>
                  {wordCountAnalysis.map(wc => (
                    <tr key={wc.bucket} className={wc === bestWordCount ? 'sla-best-row' : ''}>
                      <td className="sla-accent-cell">{wc.bucket}</td>
                      <td>{wc.avg_open_rate}%</td>
                      <td>{wc.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sla-table-section">
              <div className="sla-table-title">Top First Words</div>
              <table className="sla-table">
                <thead>
                  <tr>
                    <th>Word</th>
                    <th>Avg Open Rate</th>
                    <th>Used</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFirstWords.slice(0, 10).map(w => (
                    <tr key={w.word}>
                      <td className="sla-accent-cell">{w.word}</td>
                      <td>{w.avg_open_rate}%</td>
                      <td>{w.count}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'subjects' && (
        <div className="sla-table-section">
          <table className="sla-table">
            <thead>
              <tr>
                <th>Subject Line</th>
                <th>Open Rate</th>
                <th>Sent</th>
                <th>Words</th>
              </tr>
            </thead>
            <tbody>
              {visibleSubjects.map((s, i) => (
                <tr key={i}>
                  <td className="sla-subject-cell" title={s.subject}>{s.subject}</td>
                  <td>{s.open_rate}%</td>
                  <td>{s.sent?.toLocaleString()}</td>
                  <td>{s.word_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {subjectsRemaining > 0 && (
            <button className="sla-show-more" onClick={() => setShowMoreSubjects(!showMoreSubjects)}>
              {showMoreSubjects ? 'Show less' : `Show ${subjectsRemaining} more`}
            </button>
          )}
        </div>
      )}

      {activeTab === 'keywords' && (
        <div className="sla-table-section">
          <table className="sla-table">
            <thead>
              <tr>
                <th>Keyword</th>
                <th>Avg Open Rate</th>
                <th>Appearances</th>
              </tr>
            </thead>
            <tbody>
              {visibleKeywords.map((k, i) => (
                <tr key={i}>
                  <td className="sla-accent-cell">{k.keyword}</td>
                  <td>{k.avg_open_rate}%</td>
                  <td>{k.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {keywordsRemaining > 0 && (
            <button className="sla-show-more" onClick={() => setShowMoreKeywords(!showMoreKeywords)}>
              {showMoreKeywords ? 'Show less' : `Show ${keywordsRemaining} more`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SubjectLineAnalysis;