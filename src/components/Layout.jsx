import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, Sparkles, Activity, Wallet, Users, CheckSquare, Scissors } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import ProfileMenu from './ProfileMenu';
import '../styles/index.css';

const Layout = () => {
  const location = useLocation();
  const { user } = useAuth();

  const desktopNavItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/assistant', label: 'AI Assistant', icon: Sparkles },
    { to: '/habits', label: 'Habits', icon: Activity },
    { to: '/finances', label: 'Finances', icon: Wallet, matchPrefix: '/finances' },
    { to: '/friends', label: 'Friends', icon: Users },
    { to: '/todos', label: 'Todos', icon: CheckSquare },
    { to: '/split-bill', label: 'Split Bill', icon: Scissors },
  ];

  const mobileNavItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/habits', label: 'Habits', icon: Activity },
    { to: '/finances', label: 'Finances', icon: Wallet, matchPrefix: '/finances' },
    { to: '/assistant', label: 'AI', icon: Sparkles },
    { to: '/friends', label: 'Friends', icon: Users },
  ];

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'row', minHeight: '100vh' }}>
      {/* Desktop Navigation Sidebar (visible >= 768px) */}
      <aside className="desktop-sidebar glass-panel">
        <div style={{ padding: '24px 20px 16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="accent-gradient-text" style={{ fontWeight: '800', fontSize: '22px', letterSpacing: '-0.5px' }}>
            LifeTracker
          </div>
        </div>

        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {desktopNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.matchPrefix 
              ? location.pathname === item.to || location.pathname.startsWith(item.matchPrefix)
              : location.pathname === item.to;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer with Profile */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--glass-border)' }}>
          <ProfileMenu variant="sidebar" />
        </div>
      </aside>

      {/* Main Layout Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile Header (visible < 768px) */}
        <header className="mobile-header">
          <div className="accent-gradient-text" style={{ fontWeight: '700', fontSize: '20px', letterSpacing: '-0.5px' }}>
            LifeTracker
          </div>
          <ProfileMenu />
        </header>

        {/* Main Content Viewport */}
        <main className="main-content-area">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation (visible < 768px - exactly 5 items) */}
      <nav className="bottom-nav glass-panel">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.matchPrefix 
            ? location.pathname === item.to || location.pathname.startsWith(item.matchPrefix)
            : location.pathname === item.to;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={22} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <style>{`
        /* Desktop Sidebar Navigation */
        .desktop-sidebar {
          width: 240px;
          position: fixed;
          top: 16px;
          bottom: 16px;
          left: 16px;
          display: flex;
          flex-direction: column;
          z-index: 100;
          border-radius: 20px;
        }

        .sidebar-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 14px;
          text-decoration: none;
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .sidebar-nav-item:hover {
          background: var(--glass-card-bg);
          color: var(--text-primary);
        }

        .sidebar-nav-item.active {
          background: var(--accent-gradient);
          color: #fff;
          box-shadow: 0 4px 14px rgba(168, 85, 247, 0.3);
        }

        .main-content-area {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
        }

        /* Mobile Header */
        .mobile-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          border-bottom: 1px solid var(--glass-border);
          background: var(--header-bg);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          position: sticky;
          top: 0;
          z-index: 90;
        }

        /* Responsive Breakpoint Switch */
        @media (min-width: 768px) {
          .mobile-header {
            display: none !important;
          }
          .bottom-nav {
            display: none !important;
          }
          .main-content-area {
            margin-left: 260px;
            padding: 32px 40px;
          }
        }

        @media (max-width: 767px) {
          .desktop-sidebar {
            display: none !important;
          }
          .main-content-area {
            margin-left: 0;
            padding: 16px;
            padding-bottom: 90px;
          }
        }

        /* Bottom Nav Mobile */
        .bottom-nav {
          position: fixed;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 32px);
          max-width: 440px;
          display: flex;
          justify-content: space-around;
          padding: 10px 16px;
          z-index: 100;
          background: var(--surface-elevated, rgba(13, 17, 28, 0.92));
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.12));
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.4);
          border-radius: 24px;
        }
        
        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-decoration: none;
          color: var(--text-secondary);
          font-size: 10px;
          gap: 4px;
          transition: var(--transition-fast);
          opacity: 0.7;
        }
        
        .nav-item.active {
          color: var(--text-primary);
          opacity: 1;
          transform: translateY(-2px);
        }
        
        .nav-item svg {
          stroke-width: 2.2px;
        }
      `}</style>
    </div>
  );
};

export default Layout;
