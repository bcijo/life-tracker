import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Wallet, CreditCard, ShoppingCart, LayoutGrid } from 'lucide-react';
import ExpensesView from '../components/finances/ExpensesView';
import AccountsView from '../components/finances/AccountsView';
import ShoppingView from '../components/finances/ShoppingView';

import useTransactions from '../hooks/useTransactions';
import useBankAccounts from '../hooks/useBankAccounts';
import useExpenseCards from '../hooks/useExpenseCards';

const Finances = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Determine active tab from URL or default to 'spend'
    const getTabFromPath = () => {
        if (location.pathname.includes('/finances/accounts')) return 'accounts';
        if (location.pathname.includes('/finances/shopping')) return 'shopping';
        return 'spend';
    };

    const [activeTab, setActiveTab] = useState(getTabFromPath());
    const [isBalanceHidden, setIsBalanceHidden] = useState(true);
    const [showAnalytics, setShowAnalytics] = useState(false);

    useEffect(() => {
        setActiveTab(getTabFromPath());
    }, [location.pathname]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === 'spend') navigate('/finances');
        else navigate(`/finances/${tab}`);
    };

    // Global Financial State for Header
    const { getTotalBalance } = useBankAccounts();
    const { transactions } = useTransactions();
    
    // Calculate Monthly Spend
    const currentMonth = new Date().getMonth();
    const monthlySpend = transactions
        .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === currentMonth)
        .reduce((acc, t) => acc + parseFloat(t.amount), 0);
        
    const monthlyRecurringSpend = transactions
        .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === currentMonth && t.description?.includes('(Recurring)'))
        .reduce((acc, t) => acc + parseFloat(t.amount), 0);

    const monthlySpendExcludingRecurring = monthlySpend - monthlyRecurringSpend;

    return (
        <div className="page-container finances-hub" style={{ paddingBottom: '100px' }}>
            {/* Unified Header */}
            <header className="finances-header" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '4px' }}>Finances</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Manage your wealth effortlessly</p>
                    </div>
                </div>

                {/* Global Financial Summary Cards */}
                <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px', WebkitOverflowScrolling: 'touch', margin: '0 -20px', padding: '0 20px 8px 20px' }}>
                    <div 
                        className="glass-card summary-card" 
                        onClick={() => setIsBalanceHidden(!isBalanceHidden)}
                        style={{ 
                            flex: '0 0 auto', 
                            width: '160px', 
                            padding: '16px', 
                            background: 'linear-gradient(135deg, rgba(72, 187, 120, 0.1), rgba(72, 187, 120, 0.05))',
                            border: '1px solid rgba(72, 187, 120, 0.2)',
                            borderLeft: '4px solid var(--success)',
                            cursor: 'pointer'
                        }}
                    >
                        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Wallet size={14} /> Net Balance
                        </div>
                        <div style={{ 
                            fontSize: '24px', 
                            fontWeight: '700', 
                            color: 'var(--text-primary)',
                            filter: isBalanceHidden ? 'blur(8px)' : 'none',
                            transition: 'filter 0.3s ease'
                        }}>
                            ₹{Math.round(getTotalBalance()).toLocaleString('en-IN')}
                        </div>
                    </div>
                    
                    <div 
                        className="glass-card summary-card" 
                        onClick={() => {
                            handleTabChange('spend');
                            setShowAnalytics(true);
                        }}
                        style={{ 
                            flex: '0 0 auto', 
                            width: '180px', 
                            padding: '16px', 
                            background: 'linear-gradient(135deg, rgba(245, 101, 101, 0.1), rgba(245, 101, 101, 0.05))',
                            border: '1px solid rgba(245, 101, 101, 0.2)',
                            borderLeft: '4px solid var(--danger)',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                        }}
                    >
                        <div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CreditCard size={14} /> Spent this Month
                            </div>
                            <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                ₹{Math.round(monthlySpend).toLocaleString('en-IN')}
                            </div>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', fontWeight: '600' }}>
                            Excl. recurring: ₹{Math.round(monthlySpendExcludingRecurring).toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>
            </header>

            {/* Segmented Control */}
            <div style={{
                display: 'flex',
                background: 'var(--surface-input)',
                padding: '4px',
                borderRadius: '16px',
                marginBottom: '24px',
                position: 'sticky',
                top: '70px',
                zIndex: 90,
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid var(--glass-border)'
            }}>
                <button 
                    onClick={() => handleTabChange('spend')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        border: 'none',
                        background: activeTab === 'spend' ? 'var(--glass-card-bg)' : 'transparent',
                        color: activeTab === 'spend' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        borderRadius: '12px',
                        fontWeight: activeTab === 'spend' ? '600' : '500',
                        fontSize: '14px',
                        boxShadow: activeTab === 'spend' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer'
                    }}
                >
                    <LayoutGrid size={16} /> Overview
                </button>
                <button 
                    onClick={() => handleTabChange('accounts')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        border: 'none',
                        background: activeTab === 'accounts' ? 'var(--glass-card-bg)' : 'transparent',
                        color: activeTab === 'accounts' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        borderRadius: '12px',
                        fontWeight: activeTab === 'accounts' ? '600' : '500',
                        fontSize: '14px',
                        boxShadow: activeTab === 'accounts' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer'
                    }}
                >
                    <Wallet size={16} /> Accounts
                </button>
                <button 
                    onClick={() => handleTabChange('shopping')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        border: 'none',
                        background: activeTab === 'shopping' ? 'var(--glass-card-bg)' : 'transparent',
                        color: activeTab === 'shopping' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        borderRadius: '12px',
                        fontWeight: activeTab === 'shopping' ? '600' : '500',
                        fontSize: '14px',
                        boxShadow: activeTab === 'shopping' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer'
                    }}
                >
                    <ShoppingCart size={16} /> Shopping
                </button>
            </div>

            {/* Tab Content with Animation Wrapper */}
            <div className="tab-content-wrapper" style={{ animation: 'fadeIn 0.4s ease' }}>
                {activeTab === 'spend' && <ExpensesView showAnalytics={showAnalytics} setShowAnalytics={setShowAnalytics} />}
                {activeTab === 'accounts' && <AccountsView />}
                {activeTab === 'shopping' && <ShoppingView />}
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .summary-card {
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .summary-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(0,0,0,0.1);
                }
            `}</style>
        </div>
    );
};

export default Finances;
