import React, { useState, useEffect } from 'react';

const MatrixSignIn = ({ onAuthenticated }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  useEffect(() => {
    createStars();
  }, []);
  
  const createStars = () => {
    const stars = document.getElementById('matrix-signin__stars');
    if (!stars) return;
    
    stars.innerHTML = '';
    
    const starCount = 700;
    
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div');
      star.className = 'matrix-signin__star';
      
      const left = Math.random() * 100;
      const top = Math.random() * 100;
      
      const size = Math.random() * 3;
      
      const delay = Math.random() * 4;
      
      star.style.left = `${left}%`;
      star.style.top = `${top}%`;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.animationDelay = `${delay}s`;
      
      stars.appendChild(star);
    }
  };

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
    <div className="matrix-signin__container">
      <div className="matrix-signin__starry-background">
        <div className="matrix-signin__stars" id="matrix-signin__stars"></div>
        <div className="matrix-signin__shooting-star" style={{ top: '20%', left: '10%' }}></div>
        <div className="matrix-signin__shooting-star" style={{ top: '65%', left: '30%', animationDelay: '3s' }}></div>
        <div className="matrix-signin__shooting-star" style={{ top: '35%', left: '60%', animationDelay: '5s' }}></div>
      </div>
      <div className="matrix-signin__box">
        <h1 className="matrix-signin__title">System Access</h1>
        <form onSubmit={handleSubmit} className="matrix-signin__form">
          <div className="matrix-signin__input-group">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="matrix-signin__input"
              placeholder="Username"
            />
          </div>
          <div className="matrix-signin__input-group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="matrix-signin__input matrix-signin__password-input"
              placeholder="Password"
            />
          </div>
          <button type="submit" className="matrix-signin__button">
            ENTER
          </button>
          {error && <div className="matrix-signin__error">{error}</div>}
        </form>
      </div>
    </div>
  );
};

export default MatrixSignIn;