import React from 'react';
import AudienceQueryBuilder from '../components/audience/AudienceQueryBuilder';
import '../styles/AudiencePage.css';

const AudiencePage = () => {
  return (
    <div className="audience-page">
      <div className="audience-page-header">
        <h1>Audience Insights</h1>
        <div className="audience-header-spacer"></div>
      </div>

      <div className="audience-sections">
        <AudienceQueryBuilder />
      </div>
    </div>
  );
};

export default AudiencePage;
