import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    LayoutGrid, BarChart3, Tag, Target, ShoppingCart 
} from 'lucide-react';
import ExpensesView from '../components/finances/ExpensesView';
import AnalyticsView from '../components/finances/AnalyticsView';
import CategoriesView from '../components/finances/CategoriesView';
import BudgetsView from '../components/finances/BudgetsView';
import ShoppingView from '../components/finances/ShoppingView';

const Finances = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Determine active tab from URL
    const getTabFromPath = () => {
        if (location.pathname.includes('/finances/analytics')) return 'analytics';
        if (location.pathname.includes('/finances/categories')) return 'categories';
        if (location.pathname.includes('/finances/budgets')) return 'budgets';
        if (location.pathname.includes('/finances/shopping')) return 'shopping';
        return 'overview';
    };

    const [activeTab, setActiveTab] = useState(getTabFromPath());

    useEffect(() => {
        setActiveTab(getTabFromPath());
    }, [location.pathname]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === 'overview') navigate('/finances');
        else navigate(`/finances/${tab}`);
    };

    const TABS = [
        { id: 'overview', label: 'Overview', icon: LayoutGrid },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'categories', label: 'Categories', icon: Tag },
        { id: 'budgets', label: 'Budgets', icon: Target },
        { id: 'shopping', label: 'Shopping', icon: ShoppingCart },
    ];

    return (
        <div className="page-container finances-hub" style={{ position: 'relative' }}>
            
            {/* Header */}
            <header className="finances-header" style={{ marginBottom: '18px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
                        Finances
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '3px 0 0 0' }}>
                        Track, forecast, and optimize your wealth
                    </p>
                </div>
            </header>

            {/* Segmented Tab Navigation - Responsive Icon-Only on Mobile */}
            <div className="finances-tab-bar" style={{
                display: 'flex',
                background: 'var(--surface-input)',
                padding: '4px',
                borderRadius: '16px',
                marginBottom: '22px',
                position: 'sticky',
                top: '70px',
                zIndex: 90,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid var(--glass-border)',
                gap: '4px'
            }}>
                {TABS.map(tab => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`finances-nav-tab ${isActive ? 'active' : ''}`}
                            title={tab.label}
                            style={{
                                flex: 1,
                                padding: '10px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '7px',
                                border: 'none',
                                background: isActive ? 'var(--glass-card-bg)' : 'transparent',
                                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                borderRadius: '12px',
                                fontWeight: isActive ? '700' : '500',
                                fontSize: '13px',
                                boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <Icon size={18} color={isActive ? 'var(--accent-primary, #4ecdc4)' : 'currentColor'} />
                            <span className="finances-tab-text">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Tab Views */}
            <div className="tab-content-wrapper" style={{ animation: 'fadeIn 0.35s ease' }}>
                {activeTab === 'overview' && <ExpensesView />}
                {activeTab === 'analytics' && <AnalyticsView />}
                {activeTab === 'categories' && <CategoriesView />}
                {activeTab === 'budgets' && <BudgetsView />}
                {activeTab === 'shopping' && <ShoppingView />}
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @media (max-width: 640px) {
                    .finances-tab-text {
                        display: none !important;
                    }
                    .finances-nav-tab {
                        padding: 10px 6px !important;
                        min-width: unset !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default Finances;
