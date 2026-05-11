import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Home, CheckSquare, ShoppingCart, CreditCard, Activity, Wallet } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import ProfileMenu from './ProfileMenu';
import AskAI from './AskAI';
import '../styles/index.css';

const Layout = () => {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <div className="app-container">
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        borderBottom: '1px solid var(--glass-border)',
        background: 'var(--header-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        transition: 'background 0.3s ease',
      }}>
        <div className="accent-gradient-text" style={{
          fontWeight: '700',
          fontSize: '20px',
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
        <NavLink to="/finances" className={({ isActive }) => `nav-item ${isActive || location.pathname.startsWith('/finances') ? 'active' : ''}`}>
          <Wallet size={24} />
          <span>Finances</span>
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
