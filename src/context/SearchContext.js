import React, { createContext, useContext, useState } from 'react';

const SearchContext = createContext();

export const SearchProvider = ({ children }) => {
  const [searchTerms, setSearchTerms] = useState({
    campaignPerformance: '',
    campaignAnalytics: '',
    journalMetrics: '',
    videoMetrics: '',
    specialtyMetrics: '',
    basisOptimization: '',
    socialMetrics: ''
  });

  const setSearchTerm = (key, value) => {
    setSearchTerms(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <SearchContext.Provider value={{ searchTerms, setSearchTerm }}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

export default SearchContext;