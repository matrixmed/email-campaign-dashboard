import React, { useState, useRef, useEffect } from 'react';
import QueryEngine from '../backend/query-engine';
import DisplayComponents from './DisplayComponents';
import QueryQuestions from './QueryQuestions';
const { 
  TopUsersDisplay, 
  ContentPerformanceDisplay, 
  TimingInsightsDisplay, 
  AudienceOverviewDisplay, 
  UserProfileDisplay,
  SpecialtyEngagementDisplay,
  SpecialtyComparisonDisplay,
  UserCountDisplay,
  ErrorDisplay
} = DisplayComponents;

const ChatInterface = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [queryHistory, setQueryHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const resultsEndRef = useRef(null);
  const queryEngineRef = useRef(null);
  
  if (!queryEngineRef.current) {
    queryEngineRef.current = new QueryEngine();
  }
  
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('queryHistory');
      if (savedHistory) {
        setQueryHistory(JSON.parse(savedHistory));
      }
      
      const savedResults = localStorage.getItem('results');
      if (savedResults) {
        setResults(JSON.parse(savedResults));
      }
    } catch (e) {
      console.log('Error loading from localStorage:', e);
    }
  }, []);
  
  useEffect(() => {
    try {
      localStorage.setItem('queryHistory', JSON.stringify(queryHistory));
      localStorage.setItem('results', JSON.stringify(results));
    } catch (e) {
      console.log('Error saving to localStorage:', e);
    }
  }, [queryHistory, results]);

  useEffect(() => {
    const allQuestions = [...QueryQuestions];
    const selectedQuestions = [];
    
    for (let i = 0; i < 5; i++) {
      if (allQuestions.length === 0) break;
      
      const randomIndex = Math.floor(Math.random() * allQuestions.length);
      selectedQuestions.push(allQuestions[randomIndex]);
      allQuestions.splice(randomIndex, 1);
    }
    
    setSuggestions(selectedQuestions);
  }, []);
  
  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
  };
  
  const handleClearResults = () => {
    setResults([]);
    localStorage.removeItem('results');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      if (!queryEngineRef.current) {
        queryEngineRef.current = new QueryEngine();
        await queryEngineRef.current.initialize();
      }
      
      const result = await queryEngineRef.current.processQuery(query);
      
      setResults(prevResults => [result, ...prevResults]);
      
      if (!queryHistory.includes(query)) {
        setQueryHistory(prevHistory => [...prevHistory, query]);
      }
      
      setQuery('');
      
      if (resultsEndRef.current) {
        resultsEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Error processing query:', err);
      setError(`Failed to process query: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const safeRender = (component) => {
    try {
      return component;
    } catch (err) {
      console.error("Error rendering component:", err);
      return (
        <div className="error-message">
          <h3>Error Rendering Results</h3>
          <p>There was an error displaying the results: {err.message}</p>
          <p>Please try a different query or refresh the page.</p>
        </div>
      );
    }
  };
  
  const renderResult = (result) => {
    if (!result) return null;
    
    const defaultData = {
      users: [],
      content: [],
      peakHours: [],
      overallMetrics: {
        totalUsers: 0,
        avgOpenRate: 0,
        avgClickRate: 0
      },
      topSpecialties: [],
      specialties: [],
      contentPreferences: {
        bestTopics: [],
        timing: { bestHours: [] }
      },
      segmentSummary: {},
      email: '',
      personalInfo: {},
      engagementMetrics: {},
      journeyPatterns: {}
    };
    
    const data = result;
    
    switch (result.responseType) {
      case 'top_users':
        return safeRender(<TopUsersDisplay data={data} />);
      case 'content_performance':
        return safeRender(<ContentPerformanceDisplay data={data} />);
      case 'timing_insights':
        return safeRender(<TimingInsightsDisplay data={data} />);
      case 'audience_overview':
        return safeRender(<AudienceOverviewDisplay data={data} />);
      case 'user_profile':
        return safeRender(<UserProfileDisplay data={data} />);
      case 'specialty_engagement':
        return safeRender(<SpecialtyEngagementDisplay data={data} />);
      case 'specialty_comparison':
        return safeRender(<SpecialtyComparisonDisplay data={data} />);
      case 'user_count':
        return safeRender(<UserCountDisplay data={data} />);
      case 'error':
        return safeRender(<ErrorDisplay data={data} />);
      default:
        return (
          <div className="unknown-response">
            <p>Unknown response type: {result.responseType}</p>
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        );
    }
  };
  
  const formatRelativeTime = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    
    if (diffSecs < 60) return '  •  Just now';
    if (diffSecs < 3600) return `  •  ${Math.floor(diffSecs / 60)} min ago`;
    if (diffSecs < 86400) return `  •  ${Math.floor(diffSecs / 3600)} hr ago`;
    
    return date.toLocaleDateString();
  };
  
  return (
    <div className="chat-interface">
      <h2>Metric Intelligence</h2>
      
      <form onSubmit={handleSubmit} className="query-form">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask about audience"
          className="query-input"
          disabled={loading}
        />
        <button 
          type="submit" 
          disabled={loading} 
          className="query-button"
        >
          {loading ? 'Processing...' : 'Ask'}
        </button>
      </form>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="result-container">
      {loading ? (
        <div className="loading">
          <div className="loader">
            <div class="spinner">
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            <div></div>
            </div>
          </div>
        </div>
      ) : (
          <>
            {results.length > 0 ? (
              <div className="result-list">
                {results.map((result, index) => (
                  <div key={`result-${index}`} className="result-item">
                    <div className="result-query">
                      <span className="query-text">{result.originalQuery}</span>
                      <span className="query-time">{formatRelativeTime(result.timestamp)}</span>
                    </div>
                    {renderResult(result)}
                  </div>
                ))}
                {results.length > 1 && (
                  <div className="clear-results">
                    <button onClick={handleClearResults}>Clear Results</button>
                  </div>
                )}
                <div ref={resultsEndRef} />
              </div>
            ) : (
              <div className="no-results">
              </div>
            )}
          </>
        )}
      </div>
      
      <div className="sample-queries">
        <h3>Try asking about:</h3>
        <ul>
          {suggestions.map((suggestion, idx) => (
            <li 
              key={idx} 
              onClick={() => handleSuggestionClick(suggestion)}
              className="suggestion-item"
            >
              {suggestion}
            </li>
          ))}
        </ul>
      </div>
      
      {queryHistory.length > 0 && (
        <div className="query-history">
          <h4>Recent Questions</h4>
          <ul>
            {queryHistory.slice(-5).reverse().map((q, idx) => (
              <li 
                key={idx} 
                onClick={() => setQuery(q)}
                className="history-item"
              >
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;