import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, Sparkles, Activity, Wallet, Users } from 'lucide-react';
import { motion } from 'framer-motion';
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

      {/* Mobile Bottom Navigation (Apple Liquid Glass Dock) */}
      <nav className="bottom-nav liquid-glass-dock" aria-label="Mobile navigation">
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
              {isActive && (
                <motion.div
                  layoutId="liquidNavPill"
                  className="liquid-pill"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <motion.div
                className="nav-item-content"
                whileTap={{ scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <div className="nav-icon-wrap">
                  <Icon size={21} />
                </div>
                <span>{item.label}</span>
              </motion.div>
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
          padding-top: calc(12px + env(safe-area-inset-top, 0px));
          padding-bottom: 12px;
          padding-left: calc(20px + env(safe-area-inset-left, 0px));
          padding-right: calc(20px + env(safe-area-inset-right, 0px));
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
            padding-top: 16px;
            padding-bottom: calc(90px + env(safe-area-inset-bottom, 0px));
            padding-left: calc(16px + env(safe-area-inset-left, 0px));
            padding-right: calc(16px + env(safe-area-inset-right, 0px));
          }
        }

        /* Apple Liquid Glass Bottom Navigation */
        .bottom-nav.liquid-glass-dock {
          position: fixed;
          bottom: calc(16px + env(safe-area-inset-bottom, 0px));
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 28px);
          max-width: 420px;
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 6px 8px;
          z-index: 100;
          
          /* Layered Glass Refraction */
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 100%), var(--surface-elevated, rgba(13, 17, 28, 0.88));
          backdrop-filter: blur(30px) saturate(180%) contrast(102%);
          -webkit-backdrop-filter: blur(30px) saturate(180%) contrast(102%);
          border: 1px solid rgba(255, 255, 255, 0.18);
          
          /* Liquid Specular Highlights & Depth */
          box-shadow: 
            inset 0 1px 1px 0 rgba(255, 255, 255, 0.45),
            inset 0 -1px 2px 0 rgba(0, 0, 0, 0.25),
            0 16px 40px -8px rgba(0, 0, 0, 0.45),
            0 4px 16px 0 rgba(0, 0, 0, 0.2);
          border-radius: 32px;
          user-select: none;
          -webkit-user-select: none;
        }
        
        .nav-item {
          position: relative;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          padding: 6px 0;
          border-radius: 20px;
          color: var(--text-secondary);
          transition: color 0.2s ease, opacity 0.2s ease;
          opacity: 0.65;
          -webkit-tap-highlight-color: transparent;
        }
        
        .nav-item.active {
          color: var(--text-primary);
          opacity: 1;
        }
        
        /* Sliding Fluid Pill Indicator */
        .liquid-pill {
          position: absolute;
          inset: 1px 3px;
          border-radius: 24px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%), rgba(124, 58, 237, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 
            inset 0 1px 1px 0 rgba(255, 255, 255, 0.4),
            0 2px 12px rgba(124, 58, 237, 0.28);
          z-index: 1;
          pointer-events: none;
        }

        .nav-item-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
        }
        
        .nav-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .nav-item.active .nav-icon-wrap {
          transform: translateY(-1px);
          filter: drop-shadow(0 2px 8px rgba(168, 85, 247, 0.45));
        }

        .nav-item span {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: -0.01em;
        }
        
        .nav-item svg {
          stroke-width: 2.2px;
        }
      `}</style>
    </div>
  );
};

export default Layout;
