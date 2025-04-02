import React, { useState } from 'react';
import '../MatrixSignIn.css';

const MatrixSignIn = ({ onAuthenticated }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === '' && password === 'matrix') {
      onAuthenticated(true);
    } else {
      setError('Access Denied');
      setTimeout(() => setError(''), 2000);
    }
  };

  return (
    <div className="matrix-signin-container">
      <div className="matrix-code-rain"></div>
      <div className="matrix-signin-box">
        <h1 className="matrix-title">System Access</h1>
        <form onSubmit={handleSubmit} className="matrix-form">
          <div className="matrix-input-group">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="matrix-input"
              placeholder="Username"
            />
            <div className="matrix-line"></div>
          </div>
          <div className="matrix-input-group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="matrix-input"
              placeholder="Password"
            />
            <div className="matrix-line"></div>
          </div>
          <button type="submit" className="matrix-button">
            <span className="button-text">ENTER</span>
            <span className="button-glitch"></span>
          </button>
          {error && <div className="matrix-error">{error}</div>}
        </form>
      </div>
    </div>
  );
};

export default MatrixSignIn;