import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../../config/api';
import LastUpdatedTag from './LastUpdatedTag';

const AREA_COLORS = {
  dermatology: { primary: '#00857a', bg: 'rgba(0, 133, 122, 0.15)' },
  oncology: { primary: '#2a5fa3', bg: 'rgba(42, 95, 163, 0.15)' },
  neuroscience: { primary: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' },
};

const pillStyle = (isActive) => ({
  padding: '6px 14px',
  borderRadius: '16px',
  border: isActive ? '1px solid #0ff' : '1px solid #555',
  background: isActive ? 'rgba(0, 255, 255, 0.12)' : 'rgba(255,255,255,0.05)',
  color: isActive ? '#0ff' : '#ccc',
  fontSize: '13px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  fontWeight: isActive ? 600 : 400,
});

const ResearchTrends = ({ lastUpdated }) => {
  const [subTab, setSubTab] = useState('pubmed');
  const [pubmedPill, setPubmedPill] = useState('growth');
  const [redditPill, setRedditPill] = useState('trending');

  const [pubmedData, setPubmedData] = useState(null);
  const [pubmedLoading, setPubmedLoading] = useState(true);
  const [therapeuticArea, setTherapeuticArea] = useState('all');
  const [areaDropdownOpen, setAreaDropdownOpen] = useState(false);
  const areaRef = useRef(null);

  const [topicsData, setTopicsData] = useState(null);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [redditData, setRedditData] = useState(null);
  const [redditLoading, setRedditLoading] = useState(true);
  const [redditSub, setRedditSub] = useState('all');
  const [subDropdownOpen, setSubDropdownOpen] = useState(false);
  const subRef = useRef(null);
  const [redditDisplayCount, setRedditDisplayCount] = useState(100);

  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState(null);
  const [commentsLoading, setCommentsLoading] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (areaRef.current && !areaRef.current.contains(event.target)) setAreaDropdownOpen(false);
      if (subRef.current && !subRef.current.contains(event.target)) setSubDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchPubmed = async () => {
      setPubmedLoading(true);
      try {
        const params = new URLSearchParams();
        if (therapeuticArea !== 'all') params.append('therapeutic_area', therapeuticArea);
        const res = await fetch(`${API_BASE_URL}/api/market-intelligence/pubmed-trends?${params}`);
        const json = await res.json();
        if (json.status === 'success') setPubmedData(json);
      } catch (err) {}
      setPubmedLoading(false);
    };
    fetchPubmed();
  }, [therapeuticArea]);

  useEffect(() => {
    const fetchTopics = async () => {
      setTopicsLoading(true);
      try {
        const params = new URLSearchParams();
        if (redditSub !== 'all') params.append('subreddit', redditSub);
        const res = await fetch(`${API_BASE_URL}/api/market-intelligence/reddit/topics?${params}`);
        const json = await res.json();
        if (json.status === 'success') setTopicsData(json);
      } catch (err) {}
      setTopicsLoading(false);
    };
    fetchTopics();
  }, [redditSub]);

  useEffect(() => {
    const fetchReddit = async () => {
      setRedditLoading(true);
      try {
        const params = new URLSearchParams();
        if (redditSub !== 'all') params.append('subreddit', redditSub);
        params.append('limit', '5000');
        const res = await fetch(`${API_BASE_URL}/api/market-intelligence/reddit?${params}`);
        const json = await res.json();
        if (json.status === 'success') setRedditData(json);
      } catch (err) {}
      setRedditLoading(false);
    };
    if (subTab === 'reddit') fetchReddit();
  }, [redditSub, subTab]);

  const fetchComments = useCallback(async (postId) => {
    setCommentsLoading(true);
    setSelectedPost(postId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/market-intelligence/reddit/post/${postId}/comments`);
      const json = await res.json();
      if (json.status === 'success') setComments(json.comments);
    } catch (err) {}
    setCommentsLoading(false);
  }, []);

  const getAreaStyle = (area) => {
    const c = AREA_COLORS[area];
    return c ? { background: c.bg, color: c.primary } : {};
  };

  const timeAgo = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const hours = Math.floor((now - d) / (1000 * 60 * 60));
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  const areaOptions = [
    { value: 'all', label: 'All Therapeutic Areas' },
    { value: 'oncology', label: 'Oncology' },
    { value: 'dermatology', label: 'Dermatology' },
    { value: 'neuroscience', label: 'Neuroscience' },
  ];

  const latestYear = pubmedData?.growth?.length > 0 ? Math.max(...pubmedData.growth.map(g => g.current_year)) : null;
  const latestGrowth = pubmedData?.growth?.filter(g => g.current_year === latestYear) || [];

  const yearlyByTerm = {};
  pubmedData?.trends?.filter(t => t.month === 0).forEach(t => {
    if (!yearlyByTerm[t.search_term]) yearlyByTerm[t.search_term] = { term: t.search_term, area: t.therapeutic_area, years: {} };
    yearlyByTerm[t.search_term].years[t.year] = t.publication_count;
  });
  const years = [...new Set(pubmedData?.trends?.filter(t => t.month === 0).map(t => t.year))].sort();

  const subreddits = redditData?.subreddits || [];
  const allPosts = redditData?.posts || [];
  const visiblePosts = allPosts.slice(0, redditDisplayCount);
  const postsHasMore = redditDisplayCount < allPosts.length;

  return (
    <div className="mi-tab-content">
      <div className="mi-section-header">
        <h3>Research Trends</h3>
        <LastUpdatedTag date={lastUpdated} />
      </div>

      <div className="mi-subtabs">
        <button className={`mi-subtab ${subTab === 'pubmed' ? 'active' : ''}`} onClick={() => { setSubTab('pubmed'); setSelectedPost(null); }}>
          PubMed
        </button>
        <button className={`mi-subtab ${subTab === 'reddit' ? 'active' : ''}`} onClick={() => { setSubTab('reddit'); setSelectedPost(null); }}>
          Reddit
        </button>

        {subTab === 'pubmed' && (
          <div className="filter-control" ref={areaRef} style={{marginLeft: 'auto'}}>
            <div className="custom-dropdown">
              <button className="custom-dropdown-trigger" onClick={() => setAreaDropdownOpen(!areaDropdownOpen)}>
                <span className="dropdown-value">{areaOptions.find(o => o.value === therapeuticArea)?.label}</span>
                <svg className={`dropdown-arrow ${areaDropdownOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 12 12">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {areaDropdownOpen && (
                <div className="custom-dropdown-menu">
                  {areaOptions.map(o => (
                    <div key={o.value} className={`custom-dropdown-option ${therapeuticArea === o.value ? 'selected' : ''}`}
                      onClick={() => { setTherapeuticArea(o.value); setAreaDropdownOpen(false); }}>
                      <span>{o.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {subTab === 'reddit' && (
          <div className="filter-control" ref={subRef} style={{marginLeft: 'auto'}}>
            <div className="custom-dropdown">
              <button className="custom-dropdown-trigger" onClick={() => setSubDropdownOpen(!subDropdownOpen)}>
                <span className="dropdown-value">{redditSub === 'all' ? 'All Subreddits' : `r/${redditSub}`}</span>
                <svg className={`dropdown-arrow ${subDropdownOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 12 12">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {subDropdownOpen && (
                <div className="custom-dropdown-menu" style={{maxHeight: 300, overflowY: 'auto', width: 220}}>
                  <div className={`custom-dropdown-option ${redditSub === 'all' ? 'selected' : ''}`}
                    onClick={() => { setRedditSub('all'); setSubDropdownOpen(false); setRedditDisplayCount(100); }}>
                    <span>All Subreddits</span>
                  </div>
                  {subreddits.map(s => (
                    <div key={s.subreddit} className={`custom-dropdown-option ${redditSub === s.subreddit ? 'selected' : ''}`}
                      onClick={() => { setRedditSub(s.subreddit); setSubDropdownOpen(false); setRedditDisplayCount(100); }}>
                      <span>r/{s.subreddit} ({s.post_count})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {subTab === 'pubmed' && (
        <>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '10px 0', marginBottom: 8}}>
            <button style={pillStyle(pubmedPill === 'growth')} onClick={() => setPubmedPill('growth')}>YoY Growth</button>
            <button style={pillStyle(pubmedPill === 'volume')} onClick={() => setPubmedPill('volume')}>Volume by Year</button>
          </div>

          {pubmedLoading ? (
            <div className="mi-loading"><div className="loading-spinner"></div><p>Loading PubMed data...</p></div>
          ) : pubmedPill === 'growth' ? (
            <div className="table-section">
              <table>
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th>Therapeutic Area</th>
                    <th>Growth</th>
                    <th>Previous Year</th>
                    <th>Current Year</th>
                  </tr>
                </thead>
                <tbody>
                  {latestGrowth.map((g, i) => (
                    <tr key={i}>
                      <td className="mi-bold">{g.search_term}</td>
                      <td><span className="mi-area-tag" style={getAreaStyle(g.therapeutic_area)}>{g.therapeutic_area}</span></td>
                      <td><span className={g.growth_pct >= 50 ? 'mi-growth-high' : g.growth_pct >= 20 ? 'mi-growth-mid' : 'mi-growth-low'}>+{g.growth_pct}%</span></td>
                      <td>{g.prev_total?.toLocaleString()}</td>
                      <td>{g.current_total?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-section">
              <table>
                <thead>
                  <tr>
                    <th>Topic</th>
                    <th>Area</th>
                    {years.map(y => <th key={y}>{y}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {Object.values(yearlyByTerm).map((row, i) => (
                    <tr key={i}>
                      <td className="mi-bold">{row.term}</td>
                      <td><span className="mi-area-tag" style={getAreaStyle(row.area)}>{row.area}</span></td>
                      {years.map(y => (
                        <td key={y}>{row.years[y]?.toLocaleString() || '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {subTab === 'reddit' && (
        <>
          <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '10px 0', marginBottom: 8}}>
            <button style={pillStyle(redditPill === 'trending')} onClick={() => { setRedditPill('trending'); setSelectedPost(null); }}>Trending Topics</button>
            <button style={pillStyle(redditPill === 'posts')} onClick={() => { setRedditPill('posts'); setSelectedPost(null); }}>Posts</button>
          </div>

          {redditPill === 'trending' && (
            topicsLoading ? (
              <div className="mi-loading"><div className="loading-spinner"></div><p>Analyzing topics across {topicsData?.total_posts_analyzed?.toLocaleString() || '...'} posts...</p></div>
            ) : (
              <div className="table-section">
                <table>
                  <thead>
                    <tr>
                      <th>Topic</th>
                      <th>Posts</th>
                      <th>Total Score</th>
                      <th>Total Comments</th>
                      <th>Avg Score</th>
                      <th>Top Post</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topicsData?.topics?.map((t, i) => (
                      <tr key={i}>
                        <td className="mi-bold">{t.topic}</td>
                        <td>{t.posts.toLocaleString()}</td>
                        <td className="mi-highlight">{t.total_score.toLocaleString()}</td>
                        <td>{t.total_comments.toLocaleString()}</td>
                        <td>{t.posts > 0 ? Math.round(t.total_score / t.posts) : 0}</td>
                        <td style={{whiteSpace: 'normal', lineHeight: 1.4, maxWidth: 400}}>
                          {t.top_post && (
                            <>
                              <span style={{color: '#4ade80', marginRight: 6, fontSize: 12}}>[{t.top_post.score}]</span>
                              <span style={{color: '#ccc', fontSize: 13}}>{t.top_post.title}</span>
                              <span style={{color: '#8a8a8a', fontSize: 11, marginLeft: 6}}>r/{t.top_post.subreddit}</span>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {redditPill === 'posts' && !selectedPost && (
            <>
              {redditLoading ? (
                <div className="mi-loading"><div className="loading-spinner"></div><p>Loading posts...</p></div>
              ) : (
                <>
                  <div className="table-section">
                    <table>
                      <thead>
                        <tr>
                          <th style={{width: 100}}>Subreddit</th>
                          <th>Title</th>
                          <th style={{width: 70}}>Score</th>
                          <th style={{width: 90}}>Comments</th>
                          <th style={{width: 80}}>Posted</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visiblePosts.map((p, i) => (
                          <tr key={i} className="clickable-row" onClick={() => fetchComments(p.post_id)}>
                            <td style={{color: '#0ff', fontSize: 12}}>r/{p.subreddit}</td>
                            <td style={{whiteSpace: 'normal', lineHeight: 1.4}}>
                              <span className="mi-bold">{p.title}</span>
                              {p.author_flair && <span style={{marginLeft: 8, fontSize: 11, color: '#fbbf24', background: 'rgba(251,191,36,0.1)', padding: '1px 6px', borderRadius: 4}}>{p.author_flair}</span>}
                            </td>
                            <td style={{fontWeight: 600, color: p.score > 100 ? '#4ade80' : '#ccc'}}>{p.score}</td>
                            <td>{p.num_comments}</td>
                            <td style={{color: '#8a8a8a', fontSize: 12}}>{timeAgo(p.created_utc)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {postsHasMore && (
                    <div className="load-more-container">
                      <button className="btn-load-more" onClick={() => setRedditDisplayCount(c => c + 200)}>
                        Load More ({visiblePosts.length} of {allPosts.length})
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {redditPill === 'posts' && selectedPost && (
            <>
              <button className="mi-back-btn" onClick={() => { setSelectedPost(null); setComments(null); }}>Back to Posts</button>
              {(() => {
                const post = allPosts.find(p => p.post_id === selectedPost);
                if (!post) return null;
                return (
                  <div style={{marginBottom: 24}}>
                    <div style={{fontSize: 11, color: '#0ff', marginBottom: 4}}>r/{post.subreddit} | {post.score} pts | {post.num_comments} comments | {timeAgo(post.created_utc)}</div>
                    <h3 style={{margin: '0 0 12px 0', color: '#fff', fontSize: 18, fontWeight: 600}}>{post.title}</h3>
                    {post.body && <div style={{color: '#ccc', fontSize: 14, lineHeight: 1.6, maxHeight: 200, overflow: 'auto', padding: '12px 0', borderTop: '1px solid #333', borderBottom: '1px solid #333'}}>{post.body}</div>}
                  </div>
                );
              })()}
              {commentsLoading ? (
                <div className="mi-loading"><div className="loading-spinner"></div></div>
              ) : comments && comments.length > 0 ? (
                <div className="table-section">
                  <table>
                    <thead>
                      <tr>
                        <th style={{width: 70}}>Score</th>
                        <th>Comment</th>
                        <th style={{width: 120}}>Author</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comments.map((c, i) => (
                        <tr key={i}>
                          <td style={{fontWeight: 600, color: c.score > 10 ? '#4ade80' : '#ccc'}}>{c.score}</td>
                          <td style={{whiteSpace: 'normal', lineHeight: 1.5, color: '#ccc', fontSize: 13}}>{c.body}</td>
                          <td style={{fontSize: 12, color: '#8a8a8a'}}>
                            {c.author}
                            {c.author_flair && <div style={{fontSize: 10, color: '#fbbf24'}}>{c.author_flair}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{color: '#8a8a8a', padding: 20}}>No comments loaded for this post.</div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ResearchTrends;
