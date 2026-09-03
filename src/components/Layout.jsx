import React, { useRef, useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Sparkles, Activity, Wallet, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import useAuth from '../hooks/useAuth';
import ProfileMenu from './ProfileMenu';
import VaultUnlockModal from './common/VaultUnlockModal';
import '../styles/index.css';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const dockRef = useRef(null);
  const trackRef = useRef(null);

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

  const activeIndex = mobileNavItems.findIndex(item => 
    item.matchPrefix 
      ? location.pathname === item.to || location.pathname.startsWith(item.matchPrefix)
      : location.pathname === item.to
  );
  const currentActive = activeIndex !== -1 ? activeIndex : 0;

  const [hoveredIndex, setHoveredIndex] = useState(currentActive);
  const [isDragging, setIsDragging] = useState(false);

  // Sync hoveredIndex with currentActive when not dragging
  useEffect(() => {
    if (!isDragging) {
      setHoveredIndex(currentActive);
    }
  }, [currentActive, isDragging]);

  const handleDragStart = () => {
    setIsDragging(true);
    setHoveredIndex(currentActive);
  };

  const handleDrag = (e, info) => {
    const trackEl = trackRef.current || dockRef.current;
    if (!trackEl) return;
    const trackRect = trackEl.getBoundingClientRect();
    const numItems = mobileNavItems.length;
    const slotWidth = trackRect.width / numItems;
    
    // Calculate current center position of the dragged bubble in px
    const currentCenterX = (currentActive * slotWidth) + (slotWidth / 2) + info.offset.x;
    let targetIdx = Math.floor(currentCenterX / slotWidth);
    targetIdx = Math.max(0, Math.min(numItems - 1, targetIdx));
    
    if (targetIdx !== hoveredIndex) {
      setHoveredIndex(targetIdx);
      if (navigator.vibrate) {
        try { navigator.vibrate(10); } catch (err) {}
      }
    }
  };

  const handleDragEnd = (e, info) => {
    setIsDragging(false);
    const trackEl = trackRef.current || dockRef.current;
    if (!trackEl) return;
    const trackRect = trackEl.getBoundingClientRect();
    const numItems = mobileNavItems.length;
    const slotWidth = trackRect.width / numItems;
    
    const currentCenterX = (currentActive * slotWidth) + (slotWidth / 2) + info.offset.x;
    let targetIdx = Math.floor(currentCenterX / slotWidth);
    targetIdx = Math.max(0, Math.min(numItems - 1, targetIdx));
    
    setHoveredIndex(targetIdx);
    if (targetIdx !== currentActive) {
      navigate(mobileNavItems[targetIdx].to);
    }
  };

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
          <VaultUnlockModal />
        </main>
      </div>

      {/* Mobile Bottom Navigation (Apple Liquid Glass Dock with Draggable Bubble) */}
      <nav 
        ref={dockRef}
        className="bottom-nav liquid-glass-dock" 
        aria-label="Mobile navigation"
      >
        <div className="dock-track" ref={trackRef}>
          {/* Unified Draggable Liquid Glass Bubble */}
          <motion.div
            drag="x"
            dragConstraints={trackRef}
            dragElastic={0.08}
            dragMomentum={false}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            animate={isDragging ? {} : { 
              x: `${currentActive * 100}%`,
            }}
            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
            className={`liquid-bubble ${isDragging ? 'dragging' : ''}`}
            style={{
              width: `${100 / mobileNavItems.length}%`,
            }}
          >
            <div className="liquid-bubble-glass" />
          </motion.div>

          {/* Tab Items */}
          {mobileNavItems.map((item, idx) => {
            const Icon = item.icon;
            const isActive = idx === currentActive;
            const isTargeted = isDragging && idx === hoveredIndex;

            return (
              <button
                key={item.to}
                type="button"
                onClick={() => {
                  if (!isDragging) {
                    navigate(item.to);
                  }
                }}
                className={`nav-item ${isActive ? 'active' : ''} ${isTargeted ? 'targeted' : ''}`}
                aria-label={item.label}
              >
                <motion.div
                  className="nav-item-content"
                  animate={{
                    scale: (isActive && !isDragging) || isTargeted ? 1.05 : 0.95,
                    y: (isActive && !isDragging) || isTargeted ? -1 : 0
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  <div className="nav-icon-wrap">
                    <Icon size={20} strokeWidth={(isActive && !isDragging) || isTargeted ? 2.4 : 2} />
                  </div>
                  <span>{item.label}</span>
                </motion.div>
              </button>
            );
          })}
        </div>
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
          max-width: 410px;
          height: 60px;
          padding: 4px;
          z-index: 100;
          
          /* Layered Glass Refraction */
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.03) 100%), var(--surface-elevated, rgba(13, 17, 28, 0.88));
          backdrop-filter: blur(32px) saturate(190%) contrast(104%);
          -webkit-backdrop-filter: blur(32px) saturate(190%) contrast(104%);
          border: 1px solid rgba(255, 255, 255, 0.18);
          
          /* Liquid Specular Highlights & Depth */
          box-shadow: 
            inset 0 1px 1px 0 rgba(255, 255, 255, 0.45),
            inset 0 -1px 2px 0 rgba(0, 0, 0, 0.25),
            0 16px 40px -8px rgba(0, 0, 0, 0.45),
            0 4px 16px 0 rgba(0, 0, 0, 0.2);
          border-radius: 30px;
          user-select: none;
          -webkit-user-select: none;
          touch-action: pan-y;
        }

        .dock-track {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
          height: 100%;
        }
        
        .liquid-bubble {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          height: 100%;
          z-index: 1;
          display: flex;
          align-items: center;
          justifyContent: center;
          padding: 1px 2px;
          cursor: grab;
          touch-action: none;
          box-sizing: border-box;
        }

        .liquid-bubble:active, .liquid-bubble.dragging {
          cursor: grabbing;
        }

        .liquid-bubble-glass {
          width: 100%;
          height: 100%;
          border-radius: 26px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.06) 100%), rgba(147, 51, 234, 0.28);
          border: 1px solid rgba(255, 255, 255, 0.32);
          box-shadow: 
            inset 0 1px 1.5px 0 rgba(255, 255, 255, 0.6),
            inset 0 -1px 2px 0 rgba(0, 0, 0, 0.2),
            0 4px 18px rgba(147, 51, 234, 0.4),
            0 2px 8px rgba(0, 0, 0, 0.25);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
        }

        .liquid-bubble.dragging .liquid-bubble-glass {
          transform: scale(1.05);
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%), rgba(168, 85, 247, 0.4);
          box-shadow: 
            inset 0 1px 2px 0 rgba(255, 255, 255, 0.75),
            0 8px 26px rgba(168, 85, 247, 0.55),
            0 2px 10px rgba(0, 0, 0, 0.3);
        }

        .nav-item {
          position: relative;
          flex: 1;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          background: transparent;
          border: none;
          padding: 0;
          color: var(--text-secondary);
          opacity: 0.6;
          transition: opacity 0.2s ease, color 0.2s ease;
          -webkit-tap-highlight-color: transparent;
          cursor: pointer;
          z-index: 2;
        }
        
        .nav-item.active, .nav-item.targeted {
          color: var(--text-primary);
          opacity: 1;
        }
        
        .nav-item-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          pointer-events: none;
        }

        .nav-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .nav-item.active .nav-icon-wrap, .nav-item.targeted .nav-icon-wrap {
          filter: drop-shadow(0 2px 8px rgba(168, 85, 247, 0.5));
        }

        .nav-item span {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: -0.15px;
        }
      `}</style>
    </div>
  );
};

export default Layout;
