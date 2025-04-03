import React, { useState, useEffect, useRef } from 'react';

const MatrixSignIn = ({ onAuthenticated }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const containerRef = useRef(null);
  const boxRef = useRef(null);
  const lastMousePosition = useRef({ x: 0, y: 0 });
  const throttleRef = useRef(false);

  useEffect(() => {
    createStars();
    
    return () => {
      const particles = document.querySelectorAll('.space-particle');
      particles.forEach(particle => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      });
    };
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

  const createParticle = (x, y) => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const particle = document.createElement('div');
    particle.className = 'space-particle';

    const rect = container.getBoundingClientRect();
    const relX = x - rect.left;
    const relY = y - rect.top;
    
    const size = 3 + Math.random() * 8;
    const lifespan = 1000; 
    
    const colors = ['#8A2BE2', '#9370DB', '#4B0082', '#9932CC', '#BA55D3', '#4169E1'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${relX}px`;
    particle.style.top = `${relY}px`;
    particle.style.backgroundColor = color;
    particle.style.position = 'absolute';
    particle.style.borderRadius = '50%';
    particle.style.pointerEvents = 'none';
    particle.style.boxShadow = `0 0 ${size}px ${color}`;
    particle.style.zIndex = '5';
    
    container.appendChild(particle);
    
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    
    let opacity = 1;
    let currentSize = size;
    let posX = relX;
    let posY = relY;
    
    const animate = () => {
      opacity -= 1 / (lifespan / 16); 
      currentSize = size * opacity;
      posX += vx;
      posY += vy;
      
      particle.style.opacity = opacity;
      particle.style.width = `${currentSize}px`;
      particle.style.height = `${currentSize}px`;
      particle.style.left = `${posX}px`;
      particle.style.top = `${posY}px`;
      
      if (opacity > 0) {
        requestAnimationFrame(animate);
      } else {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }
    };
    
    requestAnimationFrame(animate);
  };

  const handleMouseMove = (e) => {
    if (boxRef.current) {
      const boxRect = boxRef.current.getBoundingClientRect();
      const isInBox = 
        e.clientX >= boxRect.left &&
        e.clientX <= boxRect.right &&
        e.clientY >= boxRect.top &&
        e.clientY <= boxRect.bottom;
      
      if (isInBox) return;
    }
    
    const dx = e.clientX - lastMousePosition.current.x;
    const dy = e.clientY - lastMousePosition.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 5 && !throttleRef.current) {
      createParticle(e.clientX, e.clientY);
      
      throttleRef.current = true;
      setTimeout(() => {
        throttleRef.current = false;
      }, 10);
    }
    
    lastMousePosition.current = { x: e.clientX, y: e.clientY };
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
    <div 
      className="matrix-signin__container"
      ref={containerRef}
      onMouseMove={handleMouseMove}
    >
      <div className="matrix-signin__starry-background">
        <div className="matrix-signin__stars" id="matrix-signin__stars"></div>
        <div className="matrix-signin__shooting-star" style={{ top: '20%', left: '10%' }}></div>
        <div className="matrix-signin__shooting-star" style={{ top: '65%', left: '30%', animationDelay: '3s' }}></div>
        <div className="matrix-signin__shooting-star" style={{ top: '35%', left: '60%', animationDelay: '5s' }}></div>
      </div>
      <div className="matrix-signin__box" ref={boxRef}>
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