import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../../config/api';

const RedditPulse = ({ searchTerm }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('all');
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState(null);
  const [commentsLoading, setCommentsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/market-intelligence/reddit?limit=200`);
        const json = await res.json();
        if (json.status === 'success') {
          setData(json);
        }
      } catch (err) {}
      setLoading(false);
    };
    fetchData();
  }, []);

  const fetchComments = useCallback(async (postId) => {
    setCommentsLoading(true);
    setSelectedPost(postId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/market-intelligence/reddit/post/${postId}/comments`);
      const json = await res.json();
      if (json.status === 'success') {
        setComments(json.comments);
      }
    } catch (err) {}
    setCommentsLoading(false);
  }, []);

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

  if (loading) {
    return <div className="mi-loading"><div className="loading-spinner"></div><p>Loading Reddit data...</p></div>;
  }

  if (!data || data.total === 0) {
    return (
      <div className="mi-tab-content">
        <div className="mi-section-header"><h3>HCP Pulse</h3></div>
        <div className="mi-empty"><h3>No Reddit Data</h3><p>Run reddit_hcp_loader.py to fetch posts from medical subreddits.</p></div>
      </div>
    );
  }

  const subreddits = data.subreddits || [];
  const allPosts = data.posts || [];

  const filtered = allPosts.filter(p => {
    if (subTab !== 'all' && p.subreddit !== subTab) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return p.title?.toLowerCase().includes(term) || p.body?.toLowerCase().includes(term);
  });

  return (
    <div className="mi-tab-content">
      <div className="mi-section-header">
        <h3>HCP Pulse</h3>
      </div>

      <div className="mi-subtabs">
        <button className={`mi-subtab ${subTab === 'all' ? 'active' : ''}`} onClick={() => { setSubTab('all'); setSelectedPost(null); }}>
          All ({allPosts.length})
        </button>
        {subreddits.map(s => (
          <button key={s.subreddit} className={`mi-subtab ${subTab === s.subreddit ? 'active' : ''}`}
            onClick={() => { setSubTab(s.subreddit); setSelectedPost(null); }}>
            r/{s.subreddit} ({s.post_count})
          </button>
        ))}
      </div>

      {!selectedPost ? (
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
              {filtered.map((p, i) => (
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
      ) : (
        <>
          <button className="mi-back-btn" onClick={() => { setSelectedPost(null); setComments(null); }}>
            Back to Posts
          </button>
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
    </div>
  );
};

export default RedditPulse;
