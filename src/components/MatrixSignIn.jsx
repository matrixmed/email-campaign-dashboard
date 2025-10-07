import React, { useState } from 'react';

const MatrixSignIn = ({ onAuthenticated }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === '' && password === 'matrix') {
      setError('Access Granted');
      onAuthenticated(true);
    } else {
      setError('Access Denied');
      setTimeout(() => setError(''), 2000);
    }
  };

  return (
    <div className="signin-container">
      <div className="signin-content">
        <div className="signin-header">
          <h2>Sign in to access dashboard</h2>
        </div>

        <form onSubmit={handleSubmit} className="signin-form">
          <div className="signin-input-group">
            <label htmlFor="username">Email</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="signin-input"
              placeholder="Enter email"
            />
          </div>

          <div className="signin-input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="signin-input"
              placeholder="Enter password"
            />
          </div>

          <button type="submit" className="signin-button">
            Sign In
          </button>

          {error && (
            <div className={`signin-message ${error === 'Access Granted' ? 'success' : 'error'}`}>
              {error}
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default MatrixSignIn;