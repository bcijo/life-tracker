import React, { useRef, useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Home, Flame, Activity, Wallet, Users } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
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
  const rectRef = useRef(null);

  const desktopNavItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/habits', label: 'Habits', icon: Activity },
    { to: '/calories', label: 'Calories', icon: Flame },
    { to: '/finances', label: 'Finances', icon: Wallet, matchPrefix: '/finances' },
    { to: '/friends', label: 'Friends', icon: Users },
  ];

  const mobileNavItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/habits', label: 'Habits', icon: Activity },
    { to: '/calories', label: 'Calories', icon: Flame },
    { to: '/finances', label: 'Finances', icon: Wallet, matchPrefix: '/finances' },
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

  // Motion value in slot units (0 .. mobileNavItems.length - 1) for 120fps zero-rerender dragging
  const slotProgress = useMotionValue(currentActive);
  const bubbleX = useTransform(slotProgress, (v) => `${v * 100}%`);

  const pointerStateRef = useRef({
    isPressed: false,
    isDragging: false,
    startX: 0,
    startY: 0,
    startSlot: currentActive,
    startProgress: currentActive,
    grabbedBubble: false,
    hoveredSlot: currentActive,
  });

  // Smooth spring animation when currentActive changes externally or via tap
  useEffect(() => {
    if (!pointerStateRef.current.isDragging) {
      setHoveredIndex(currentActive);
      pointerStateRef.current.hoveredSlot = currentActive;
      const controls = animate(slotProgress, currentActive, {
        type: 'spring',
        stiffness: 450,
        damping: 32,
      });
      return () => controls.stop();
    }
  }, [currentActive, slotProgress]);

  const computeSlotFromX = (clientX) => {
    const rect = rectRef.current || trackRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return { slot: currentActive, raw: currentActive };
    const numItems = mobileNavItems.length;
    const slotWidth = rect.width / numItems;
    const relX = clientX - rect.left;
    const rawFloat = (relX - slotWidth / 2) / slotWidth;

    let clampedFloat = rawFloat;
    if (rawFloat < 0) {
      clampedFloat = rawFloat * 0.12;
    } else if (rawFloat > numItems - 1) {
      clampedFloat = (numItems - 1) + (rawFloat - (numItems - 1)) * 0.12;
    }

    const nearestSlot = Math.max(
      0,
      Math.min(numItems - 1, Math.floor(relX / slotWidth))
    );
    return { slot: nearestSlot, raw: clampedFloat, slotWidth };
  };

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (!trackRef.current) return;

    rectRef.current = trackRef.current.getBoundingClientRect();
    const { slot } = computeSlotFromX(e.clientX);
    const currentPos = slotProgress.get();

    pointerStateRef.current = {
      isPressed: true,
      isDragging: false,
      startX: e.clientX,
      startY: e.clientY,
      startSlot: slot,
      startProgress: currentPos,
      grabbedBubble: slot === currentActive,
      hoveredSlot: currentActive,
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const handlePointerMove = (e) => {
    const state = pointerStateRef.current;
    if (!state.isPressed) return;

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;

    if (!state.isDragging && Math.abs(dx) > 4 && Math.abs(dx) > Math.abs(dy)) {
      state.isDragging = true;
      setIsDragging(true);
      if (!state.grabbedBubble) {
        const { raw, slot } = computeSlotFromX(e.clientX);
        animate(slotProgress, raw, {
          type: 'spring',
          stiffness: 600,
          damping: 35,
        });
        if (slot !== state.hoveredSlot) {
          state.hoveredSlot = slot;
          setHoveredIndex(slot);
        }
        return;
      }
    }

    if (state.isDragging) {
      const rect = rectRef.current;
      if (!rect || !rect.width) return;
      const numItems = mobileNavItems.length;
      const slotWidth = rect.width / numItems;

      let raw;
      if (state.grabbedBubble) {
        raw = state.startProgress + dx / slotWidth;
        if (raw < 0) raw = raw * 0.12;
        else if (raw > numItems - 1) raw = (numItems - 1) + (raw - (numItems - 1)) * 0.12;
      } else {
        raw = computeSlotFromX(e.clientX).raw;
      }

      // Direct 120fps motion-value update without React re-render
      slotProgress.set(raw);

      const targetIdx = Math.max(0, Math.min(numItems - 1, Math.round(raw)));
      if (targetIdx !== state.hoveredSlot) {
        state.hoveredSlot = targetIdx;
        setHoveredIndex(targetIdx);
        if (navigator.vibrate) {
          try {
            navigator.vibrate(10);
          } catch (err) {}
        }
      }
    }
  };

  const handlePointerUpOrCancel = (e) => {
    const state = pointerStateRef.current;
    if (!state.isPressed) return;

    const wasDragging = state.isDragging;
    state.isPressed = false;
    state.isDragging = false;
    setIsDragging(false);

    const targetSlot = wasDragging ? state.hoveredSlot : state.startSlot;
    setHoveredIndex(targetSlot);

    animate(slotProgress, targetSlot, {
      type: 'spring',
      stiffness: 450,
      damping: 32,
    });

    if (targetSlot >= 0 && targetSlot < mobileNavItems.length && targetSlot !== currentActive) {
      if (!wasDragging && navigator.vibrate) {
        try {
          navigator.vibrate(6);
        } catch (err) {}
      }
      navigate(mobileNavItems[targetSlot].to);
    }
  };

  const activeVisualSlot = isDragging ? hoveredIndex : currentActive;

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

      {/* Mobile Bottom Navigation (Apple iOS 26 / visionOS Liquid Glass Bar) */}
      <nav
        ref={dockRef}
        className="bottom-nav liquid-glass-dock"
        aria-label="Mobile navigation"
      >
        <div
          className="dock-track"
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUpOrCancel}
          onPointerCancel={handlePointerUpOrCancel}
        >
          {/* Hardware-Accelerated Liquid Glass Capsule */}
          <motion.div
            className={`liquid-bubble ${isDragging ? 'dragging' : ''}`}
            style={{
              width: `${100 / mobileNavItems.length}%`,
              x: bubbleX,
            }}
          >
            <div className="liquid-bubble-glass">
              <div className="liquid-bubble-rim" />
            </div>
          </motion.div>

          {/* Tab Items */}
          {mobileNavItems.map((item, idx) => {
            const Icon = item.icon;
            const isSelected = idx === activeVisualSlot;

            return (
              <button
                key={item.to}
                type="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(item.to);
                  }
                }}
                className={`nav-item ${isSelected ? 'active' : ''}`}
                aria-label={item.label}
                aria-current={idx === currentActive ? 'page' : undefined}
              >
                <motion.div
                  className="nav-item-content"
                  animate={{
                    scale: isSelected ? 1.05 : 0.95,
                    y: isSelected ? -1 : 0,
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  <div className="nav-icon-wrap">
                    <Icon
                      size={20}
                      strokeWidth={isSelected ? 2.35 : 1.85}
                    />
                  </div>
                  <span className="nav-label">{item.label}</span>
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
            padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px));
            padding-left: calc(16px + env(safe-area-inset-left, 0px));
            padding-right: calc(16px + env(safe-area-inset-right, 0px));
          }
        }

        /* ============================================================
           APPLE LIQUID GLASS TOKENS (Clean Uniform Surface + Rim Light)
           ============================================================ */
        :root,
        .theme-light {
          --apple-dock-bg: rgba(255, 255, 255, 0.55);
          --apple-dock-rim: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.85) 0%,
            rgba(255, 255, 255, 0.35) 50%,
            rgba(255, 255, 255, 0.7) 100%
          );
          --apple-dock-shadow:
            inset 0 1px 0 0 rgba(255, 255, 255, 0.75),
            0 12px 32px -6px rgba(24, 28, 48, 0.14),
            0 4px 12px -2px rgba(24, 28, 48, 0.06);
          --apple-lens-bg: rgba(255, 255, 255, 0.78);
          --apple-lens-rim: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.95) 0%,
            rgba(255, 255, 255, 0.45) 50%,
            rgba(255, 255, 255, 0.8) 100%
          );
          --apple-lens-shadow:
            inset 0 1px 0 0 rgba(255, 255, 255, 0.9),
            0 4px 14px -2px rgba(30, 40, 80, 0.12);
          --apple-tab-inactive: rgba(45, 55, 72, 0.6);
          --apple-tab-active: #1a202c;
          --apple-tab-icon-active: var(--accent-primary, #5a67d8);
          --apple-tab-glow: rgba(102, 126, 234, 0.28);
        }

        .theme-dark {
          --apple-dock-bg: rgba(22, 22, 34, 0.52);
          --apple-dock-rim: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.32) 0%,
            rgba(255, 255, 255, 0.08) 50%,
            rgba(255, 255, 255, 0.22) 100%
          );
          --apple-dock-shadow:
            inset 0 1px 0 0 rgba(255, 255, 255, 0.22),
            0 16px 36px -6px rgba(0, 0, 0, 0.55),
            0 4px 14px -2px rgba(0, 0, 0, 0.35);
          --apple-lens-bg: rgba(255, 255, 255, 0.12);
          --apple-lens-rim: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.48) 0%,
            rgba(255, 255, 255, 0.12) 50%,
            rgba(255, 255, 255, 0.32) 100%
          );
          --apple-lens-shadow:
            inset 0 1px 0 0 rgba(255, 255, 255, 0.35),
            0 4px 16px -2px rgba(0, 0, 0, 0.38);
          --apple-tab-inactive: rgba(226, 232, 240, 0.56);
          --apple-tab-active: #ffffff;
          --apple-tab-icon-active: #ffffff;
          --apple-tab-glow: rgba(168, 85, 247, 0.45);
        }

        .theme-ocean {
          --apple-dock-bg: rgba(10, 25, 47, 0.54);
          --apple-dock-rim: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.3) 0%,
            rgba(100, 255, 218, 0.1) 50%,
            rgba(100, 255, 218, 0.24) 100%
          );
          --apple-dock-shadow:
            inset 0 1px 0 0 rgba(255, 255, 255, 0.22),
            0 16px 36px -6px rgba(2, 10, 24, 0.6),
            0 4px 14px -2px rgba(2, 10, 24, 0.4);
          --apple-lens-bg: rgba(100, 255, 218, 0.11);
          --apple-lens-rim: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.45) 0%,
            rgba(100, 255, 218, 0.15) 50%,
            rgba(100, 255, 218, 0.35) 100%
          );
          --apple-lens-shadow:
            inset 0 1px 0 0 rgba(255, 255, 255, 0.32),
            0 4px 16px -2px rgba(0, 0, 0, 0.42);
          --apple-tab-inactive: rgba(204, 214, 246, 0.56);
          --apple-tab-active: #ffffff;
          --apple-tab-icon-active: #64ffda;
          --apple-tab-glow: rgba(100, 255, 218, 0.42);
        }

        /* ============================================================
           APPLE LIQUID GLASS BOTTOM NAVIGATION BAR
           ============================================================ */
        .bottom-nav.liquid-glass-dock {
          position: fixed;
          bottom: calc(14px + env(safe-area-inset-bottom, 0px));
          left: 50%;
          transform: translateX(-50%) translateZ(0);
          width: calc(100% - 28px);
          max-width: 416px;
          height: 60px;
          padding: 4px;
          z-index: 100;
          border-radius: 9999px;

          /* Clean, uniform translucent glass */
          background: var(--apple-dock-bg);
          backdrop-filter: blur(28px) saturate(190%);
          -webkit-backdrop-filter: blur(28px) saturate(190%);
          box-shadow: var(--apple-dock-shadow);

          user-select: none;
          -webkit-user-select: none;
          touch-action: pan-y;
        }

        /* 1px Fresnel Specular Rim Border */
        .bottom-nav.liquid-glass-dock::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: var(--apple-dock-rim);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          z-index: 3;
        }

        .dock-track {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
          height: 100%;
          border-radius: 9999px;
          cursor: grab;
          touch-action: none;
        }

        .dock-track:active {
          cursor: grabbing;
        }

        /* ============================================================
           FLOATING LIQUID CAPSULE (ACTIVE PILL)
           ============================================================ */
        .liquid-bubble {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          height: 100%;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1px 2px;
          pointer-events: none;
          box-sizing: border-box;
          will-change: transform;
        }

        /* Clean Optical Glass Capsule */
        .liquid-bubble-glass {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 9999px;
          background: var(--apple-lens-bg);
          box-shadow: var(--apple-lens-shadow);
          transition:
            transform 0.15s ease,
            background 0.15s ease,
            box-shadow 0.15s ease;
        }

        .liquid-bubble.dragging .liquid-bubble-glass {
          transform: scale(1.05);
          background: rgba(255, 255, 255, 0.18);
        }

        .theme-light .liquid-bubble.dragging .liquid-bubble-glass {
          background: rgba(255, 255, 255, 0.9);
        }

        /* 1px Specular Edge Rim on the Active Pill */
        .liquid-bubble-rim {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: var(--apple-lens-rim);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        /* ============================================================
           TAB ITEMS & ICON CHOREOGRAPHY
           ============================================================ */
        .bottom-nav .nav-item {
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
          color: var(--apple-tab-inactive);
          transition: color 0.2s ease;
          -webkit-tap-highlight-color: transparent;
          cursor: pointer;
          z-index: 2;
          pointer-events: none;
        }

        /* Prevent global button:active scale from fighting Framer Motion */
        .bottom-nav .nav-item:active {
          transform: none !important;
        }

        .bottom-nav .nav-item.active {
          color: var(--apple-tab-active);
        }

        .nav-item-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2.5px;
          pointer-events: none;
        }

        .nav-icon-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          transition:
            color 0.2s ease,
            filter 0.25s ease,
            transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .bottom-nav .nav-item.active .nav-icon-wrap {
          color: var(--apple-tab-icon-active);
          filter: drop-shadow(0 2px 8px var(--apple-tab-glow));
        }

        .nav-label {
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: -0.1px;
          line-height: 1.1;
          transition: font-weight 0.15s ease, opacity 0.2s ease;
        }

        .bottom-nav .nav-item.active .nav-label {
          font-weight: 700;
        }
      `}</style>
    </div>
  );
};

export default Layout;
