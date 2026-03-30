import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../../config/api';

const AREA_COLORS = {
  dermatology: { primary: '#00857a', bg: 'rgba(0, 133, 122, 0.15)' },
  oncology: { primary: '#2a5fa3', bg: 'rgba(42, 95, 163, 0.15)' },
  neuroscience: { primary: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' },
};

const ResearchTrends = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState('growth');
  const [therapeuticArea, setTherapeuticArea] = useState('all');
  const [areaDropdownOpen, setAreaDropdownOpen] = useState(false);
  const areaRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (areaRef.current && !areaRef.current.contains(event.target)) {
        setAreaDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (therapeuticArea !== 'all') params.append('therapeutic_area', therapeuticArea);
        const res = await fetch(`${API_BASE_URL}/api/market-intelligence/pubmed-trends?${params}`);
        const json = await res.json();
        if (json.status === 'success') {
          setData(json);
        }
      } catch (err) {}
      setLoading(false);
    };
    fetchData();
  }, [therapeuticArea]);

  const areaOptions = [
    { value: 'all', label: 'All Therapeutic Areas' },
    { value: 'oncology', label: 'Oncology' },
    { value: 'dermatology', label: 'Dermatology' },
    { value: 'neuroscience', label: 'Neuroscience' },
  ];

  const getAreaStyle = (area) => {
    const c = AREA_COLORS[area];
    if (!c) return {};
    return { background: c.bg, color: c.primary };
  };

  if (loading) {
    return <div className="mi-loading"><div className="loading-spinner"></div><p>Loading research trends...</p></div>;
  }

  const latestYear = data?.growth?.length > 0 ? Math.max(...data.growth.map(g => g.current_year)) : null;
  const latestGrowth = data?.growth?.filter(g => g.current_year === latestYear) || [];

  const yearlyByTerm = {};
  data?.trends?.filter(t => t.month === 0).forEach(t => {
    if (!yearlyByTerm[t.search_term]) {
      yearlyByTerm[t.search_term] = { term: t.search_term, area: t.therapeutic_area, years: {} };
    }
    yearlyByTerm[t.search_term].years[t.year] = t.publication_count;
  });
  const years = [...new Set(data?.trends?.filter(t => t.month === 0).map(t => t.year))].sort();

  const subtabTitle = subTab === 'growth'
    ? `Fastest Growing Topics (${latestGrowth.length})`
    : `Publication Volume by Year (${Object.keys(yearlyByTerm).length})`;

  return (
    <div className="mi-tab-content">
      <div className="mi-section-header">
        <h3>Research Trends</h3>
      </div>

      <div className="mi-subtabs">
        <button className={`mi-subtab ${subTab === 'growth' ? 'active' : ''}`} onClick={() => setSubTab('growth')}>
          YoY Growth
        </button>
        <button className={`mi-subtab ${subTab === 'volume' ? 'active' : ''}`} onClick={() => setSubTab('volume')}>
          Volume by Year
        </button>
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
      </div>

      {subTab === 'growth' && (
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
      )}

      {subTab === 'volume' && (
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
    </div>
  );
};

export default ResearchTrends;