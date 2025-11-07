import React, { useRef } from 'react';
import AudienceQueryBuilder from '../components/audience/AudienceQueryBuilder';
import '../styles/AudiencePage.css';

const AudiencePage = () => {
  const audienceQueryBuilderRef = useRef();

  const handleClear = () => {
    if (audienceQueryBuilderRef.current) {
      audienceQueryBuilderRef.current.clearAll();
    }
  };

  return (
    <div className="audience-page">
      <div className="audience-page-header">
        <h1>Audience Insights</h1>
        <button onClick={handleClear} className="btn-clear-header">
          Clear
        </button>
      </div>

      <div className="audience-sections">
        <AudienceQueryBuilder ref={audienceQueryBuilderRef} />
      </div>
    </div>
  );
};

export default AudiencePage;
