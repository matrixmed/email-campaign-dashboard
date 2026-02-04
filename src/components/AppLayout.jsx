import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/AppLayout.css';

const AppLayout = ({ children }) => {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const navItems = [
    { path: '/campaigns', label: 'Campaign Performance' },
    { path: '/analytics', label: 'Campaign Analytics' },
    { path: '/ab-testing', label: 'A/B Testing' },
    { path: '/basis', label: 'Basis Optimization' },
    { path: '/dashboard-builder', label: 'Dashboard Builder' },
    { path: '/reports', label: 'Reports Management' },
    { path: '/brands', label: 'Brand Management' },
    { path: '/cmi-contracts', label: 'CMI Contracts' },
    { path: '/list-analysis', label: 'List Analysis' },
    { path: '/audience', label: 'Audience Analysis' },
    { path: '/specialty', label: 'Specialty Metrics' },
    { path: '/video', label: 'Video Metrics' },
    { path: '/journals', label: 'Journal Metrics' },
    { path: '/content-analysis', label: 'Content Analysis' },
  ];

  const isDashboardBuilder = location.pathname === '/dashboard-builder';

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="app-layout">
      <button
        className={`mobile-menu-toggle ${mobileMenuOpen ? 'active' : ''}`}
        onClick={toggleMobileMenu}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      <div
        className={`mobile-overlay ${mobileMenuOpen ? 'active' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />
      <div className="mobile-header">
        <img src={`${process.env.PUBLIC_URL}/white-matrix.png`} alt="Logo" className="mobile-header-logo" />
      </div>
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header" onClick={toggleSidebar} style={{ cursor: 'pointer' }}>
          <img src={`${process.env.PUBLIC_URL}/white-matrix.png`} alt="Logo" className="sidebar-logo" />
        </div>
        {(!sidebarCollapsed || mobileMenuOpen) && (
          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              >
                <span className="nav-label">{item.label}</span>
              </Link>
            ))}
          </nav>
        )}
      </aside>
      <main className={`main-content ${isDashboardBuilder ? 'dashboard-builder-page' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {children}
      </main>
    </div>
  );
};

export default AppLayout;