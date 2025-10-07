import React, { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import MatrixSignIn from './components/MatrixSignIn';
import './App.css';
import './styles/Dashboard.css';
import './styles/MatrixSignIn.css';
import './styles/ReportsManager.css';
import './themes/SpaceTheme.css';
import './themes/MarbleTheme.css';
import './themes/CyberpunkTheme.css';
import './themes/HolographicTheme.css';
import './themes/CompanyTheme.css';
import './themes/SynthwaveTheme.css';

const SESSION_DURATION = 10 * 60 * 60 * 1000;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkSession = () => {
      const sessionData = localStorage.getItem('matrixSession');
      if (sessionData) {
        const { timestamp } = JSON.parse(sessionData);
        const now = new Date().getTime();
        const sessionAge = now - timestamp;

        if (sessionAge < SESSION_DURATION) {
          setIsAuthenticated(true);
        } else {
          if (document.visibilityState !== 'visible') {
            localStorage.removeItem('matrixSession');
            setIsAuthenticated(false);
          }
        }
      }
    };

    checkSession();

    document.addEventListener('visibilitychange', checkSession);

    return () => {
      document.removeEventListener('visibilitychange', checkSession);
    };
  }, []);

  const handleAuthentication = (authenticated) => {
    if (authenticated) {
      const sessionData = {
        timestamp: new Date().getTime(),
      };
      localStorage.setItem('matrixSession', JSON.stringify(sessionData));
    } else {
      localStorage.removeItem('matrixSession');
    }
    setIsAuthenticated(authenticated);
  };

  return (
    <div className="App">
      <BrowserRouter>
        <Dashboard
          isAuthenticated={isAuthenticated}
          onAuthenticated={handleAuthentication}
        />
      </BrowserRouter>
    </div>
  );
}

export default App;
