import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    LayoutGrid, BarChart3, Wallet, Target, ShoppingCart, 
    Plus, Sparkles 
} from 'lucide-react';
import ExpensesView from '../components/finances/ExpensesView';
import AnalyticsView from '../components/finances/AnalyticsView';
import AccountsView from '../components/finances/AccountsView';
import BudgetsView from '../components/finances/BudgetsView';
import ShoppingView from '../components/finances/ShoppingView';
import QuickAddExpenseModal from '../components/finances/QuickAddExpenseModal';

import useTransactions from '../hooks/useTransactions';
import useExpenseCards from '../hooks/useExpenseCards';

const Finances = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Determine active tab from URL
    const getTabFromPath = () => {
        if (location.pathname.includes('/finances/analytics')) return 'analytics';
        if (location.pathname.includes('/finances/accounts')) return 'accounts';
        if (location.pathname.includes('/finances/budgets')) return 'budgets';
        if (location.pathname.includes('/finances/shopping')) return 'shopping';
        return 'overview';
    };

    const [activeTab, setActiveTab] = useState(getTabFromPath());
    const [showGlobalAddModal, setShowGlobalAddModal] = useState(false);

    const { transactions, addTransaction } = useTransactions();
    const { cards, fetchSubcategories } = useExpenseCards();

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
        { id: 'accounts', label: 'Accounts', icon: Wallet },
        { id: 'budgets', label: 'Budgets', icon: Target },
        { id: 'shopping', label: 'Shopping', icon: ShoppingCart },
    ];

    return (
        <div className="page-container finances-hub" style={{ position: 'relative' }}>
            
            {/* Header */}
            <header className="finances-header" style={{ marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
                        Finances
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '3px 0 0 0' }}>
                        Track, forecast, and optimize your wealth
                    </p>
                </div>

                <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowGlobalAddModal(true)}
                    className="btn-primary"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 18px',
                        borderRadius: '14px',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
                        border: 'none',
                        flexShrink: 0
                    }}
                >
                    <Plus size={18} strokeWidth={2.5} />
                    <span>Add Expense</span>
                </motion.button>
            </header>

            {/* Segmented Tab Navigation */}
            <div style={{
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
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none'
            }}>
                {TABS.map(tab => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            style={{
                                flex: '1 0 auto',
                                minWidth: '70px',
                                padding: '10px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                border: 'none',
                                background: isActive ? 'var(--glass-card-bg)' : 'transparent',
                                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                borderRadius: '12px',
                                fontWeight: isActive ? '700' : '500',
                                fontSize: '13px',
                                boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <Icon size={16} color={isActive ? 'var(--accent-primary, #4ecdc4)' : 'currentColor'} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Tab Views */}
            <div className="tab-content-wrapper" style={{ animation: 'fadeIn 0.35s ease' }}>
                {activeTab === 'overview' && <ExpensesView />}
                {activeTab === 'analytics' && <AnalyticsView transactions={transactions} categories={cards} />}
                {activeTab === 'accounts' && <AccountsView />}
                {activeTab === 'budgets' && <BudgetsView />}
                {activeTab === 'shopping' && <ShoppingView />}
            </div>

            {/* Mobile Floating Action Pill (visible on mobile only) */}
            <div className="mobile-fab-container">
                <motion.button
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setShowGlobalAddModal(true)}
                    className="mobile-fab-button btn-primary"
                    style={{
                        position: 'fixed',
                        bottom: '86px',
                        right: '20px',
                        height: '46px',
                        padding: '0 18px',
                        borderRadius: '23px',
                        color: '#fff',
                        border: 'none',
                        boxShadow: '0 8px 24px rgba(124, 58, 237, 0.45)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        zIndex: 99,
                        fontWeight: '700',
                        fontSize: '13px'
                    }}
                >
                    <Plus size={18} strokeWidth={2.8} />
                    <span>Expense</span>
                </motion.button>
            </div>

            {/* Global Quick Add Expense Modal */}
            <QuickAddExpenseModal
                isOpen={showGlobalAddModal}
                onClose={() => setShowGlobalAddModal(false)}
                cards={cards}
                onAddExpense={addTransaction}
                fetchSubcategories={fetchSubcategories}
            />

            <style>{`
                @media (min-width: 768px) {
                    .mobile-fab-container {
                        display: none !important;
                    }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default Finances;
