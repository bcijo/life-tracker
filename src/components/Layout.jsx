import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, CheckSquare, ShoppingCart, CreditCard, Activity, Wallet } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import ProfileMenu from './ProfileMenu';
import AskAI from './AskAI';
import '../styles/index.css';

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [touchOffset, setTouchOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(null);

  const routes = ['/', '/todos', '/habits', '/shopping', '/expenses', '/bank-accounts'];

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    if (isTransitioning) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setTouchOffset(0);
  };

  const onTouchMove = (e) => {
    if (!touchStart || isTransitioning) return;
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);
    setTouchOffset(currentTouch - touchStart);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd || isTransitioning) {
      setTouchOffset(0);
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = routes.indexOf(location.pathname);

      if (isLeftSwipe && currentIndex < routes.length - 1) {
        // Swipe left - go to next page
        setSwipeDirection('left');
        setIsTransitioning(true);
        setTimeout(() => {
          navigate(routes[currentIndex + 1]);
          setIsTransitioning(false);
          setSwipeDirection(null);
          setTouchOffset(0);
        }, 300);
      } else if (isRightSwipe && currentIndex > 0) {
        // Swipe right - go to previous page
        setSwipeDirection('right');
        setIsTransitioning(true);
        setTimeout(() => {
          navigate(routes[currentIndex - 1]);
          setIsTransitioning(false);
          setSwipeDirection(null);
          setTouchOffset(0);
        }, 300);
      } else {
        setTouchOffset(0);
      }
    } else {
      setTouchOffset(0);
    }
  };

  return (
    <div
      className="app-container"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        borderBottom: '1px solid var(--glass-border)',
        background: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          fontWeight: '700',
          fontSize: '20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '-0.5px'
        }}>
          LifeTracker
        </div>
        <ProfileMenu />
      </header>
      <main style={{
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        paddingBottom: '80px',
        transform: `translateX(${isTransitioning
          ? swipeDirection === 'left' ? '-100%' : '100%'
          : touchOffset * 0.3}px)`,
        transition: isTransitioning ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        opacity: isTransitioning ? 0 : 1 - Math.abs(touchOffset / 500),
      }}>
        <Outlet />
      </main>

      <nav className="bottom-nav glass-panel">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Home size={24} />
          <span>Home</span>
        </NavLink>
        <NavLink to="/todos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <CheckSquare size={24} />
          <span>Todos</span>
        </NavLink>
        <NavLink to="/habits" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Activity size={24} />
          <span>Habits</span>
        </NavLink>
        <NavLink to="/shopping" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <ShoppingCart size={24} />
          <span>Shop</span>
        </NavLink>
        <NavLink to="/expenses" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <CreditCard size={24} />
          <span>Expenses</span>
        </NavLink>
        <NavLink to="/bank-accounts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          {/* Using a different icon for Money/Banks */}
          <Wallet size={24} />
          <span>Money</span>
        </NavLink>
      </nav>

      <AskAI />
      <style>{`
        .bottom-nav {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          width: calc(100% - 40px);
          max-width: 440px;
          display: flex;
          justify-content: space-around;
          padding: 12px 16px;
          z-index: 100;
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
          stroke-width: 2.5px;
        }
      `}</style>
    </div>
  );
};

export default Layout;
