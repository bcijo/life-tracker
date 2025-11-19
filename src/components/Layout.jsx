import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, CheckSquare, ShoppingCart, CreditCard, Activity } from 'lucide-react';
import '../styles/index.css';

const Layout = () => {
    return (
        <div className="app-container">
            <main style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
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
                    <span>Money</span>
                </NavLink>
            </nav>

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
