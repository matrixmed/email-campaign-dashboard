import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/AppLayout.css';

const AppLayout = ({ children }) => {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const navItems = [
    { path: '/campaigns', label: 'Campaign Performance' },
    { path: '/analytics', label: 'Campaign Analytics' },
    { path: '/dashboard-builder', label: 'Dashboard Builder' },
    { path: '/reports', label: 'Reports Manager' },
    { path: '/brands', label: 'Brand Management' },
    { path: '/cmi-contracts', label: 'CMI Contracts' },
    { path: '/list-analysis', label: 'List Analysis' },
    { path: '/audience', label: 'Audience Analysis' },
    { path: '/specialty', label: 'Specialty Metrics' },
    { path: '/video', label: 'Video Metrics' },
    { path: '/journals', label: 'Journal Metrics' },
  ];

  const isDashboardBuilder = location.pathname === '/dashboard-builder';

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header" onClick={toggleSidebar} style={{ cursor: 'pointer' }}>
          <img src={`${process.env.PUBLIC_URL}/white-matrix.png`} alt="Logo" className="sidebar-logo" />
        </div>
        {!sidebarCollapsed && (
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
