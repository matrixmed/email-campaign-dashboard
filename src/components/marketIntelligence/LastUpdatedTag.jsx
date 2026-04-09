import React from 'react';

const LastUpdatedTag = ({ date }) => {
  if (!date) return null;
  return (
    <div className="last-updated-tag">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M7 4V7L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span>Last updated: {date}</span>
    </div>
  );
};

export default LastUpdatedTag;
