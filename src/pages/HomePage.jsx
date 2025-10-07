import React from 'react';
import '../styles/HomePage.css';

const HomePage = () => {
  return (
    <div className="home-page">
      <h1>Email Campaign Dashboard</h1>
      <p className="subtitle">Matrix Medical Communications Analytics Platform</p>

      <div className="quick-stats">
        <div className="stat-card">
          <h3>Active Campaigns</h3>
          <p className="stat-value">--</p>
        </div>
        <div className="stat-card">
          <h3>Total Sends</h3>
          <p className="stat-value">--</p>
        </div>
        <div className="stat-card">
          <h3>Avg Open Rate</h3>
          <p className="stat-value">--</p>
        </div>
        <div className="stat-card">
          <h3>Avg Click Rate</h3>
          <p className="stat-value">--</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
