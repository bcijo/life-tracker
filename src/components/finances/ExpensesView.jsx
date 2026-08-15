import React, { useState, useEffect, useMemo } from 'react';
import { 
    Plus, Sparkles, Flame, Eye, EyeOff, ShieldAlert, ShieldCheck, 
    ArrowUpRight, ArrowDownLeft, ChevronRight, ShoppingBag, 
    Edit3, Trash2, Settings, Search, X, Filter, Calendar 
} from 'lucide-react';
import useTransactions from '../../hooks/useTransactions';
import useShopping from '../../hooks/useShopping';
import useExpenseCards from '../../hooks/useExpenseCards';
import useBudgets from '../../hooks/useBudgets';
import useBankAccounts from '../../hooks/useBankAccounts';
import useRecurringExpenses from '../../hooks/useRecurringExpenses';
import ExpenseCard, { getIconByName } from '../ExpenseCard';
import ExpenseCardDetail from '../ExpenseCardDetail';
import CategorySettingsModal from '../CategorySettingsModal';
import QuickAddExpenseModal from './QuickAddExpenseModal';
import QuickEditExpenseModal from './QuickEditExpenseModal';
import Modal from '../Modal';
import CurrencyInput from '../CurrencyInput';
import { format, parseISO, isSameMonth, addDays } from 'date-fns';

const ExpensesView = () => {
    const { transactions, addTransaction: addTransactionDb, updateTransaction: updateTransactionDb, deleteTransaction: deleteTransactionDb } = useTransactions();
    const { items: shoppingItems, markAddedToExpenses } = useShopping();
    const { cards, addCard, getBudgetProgress, initializeDefaults, loading: cardsLoading, fetchSubcategories } = useExpenseCards();
    const { budgets } = useBudgets();
    const { getTotalBalance } = useBankAccounts();
    const { recurringExpenses, getMonthlyTotal: getRecurringMonthlyTotal } = useRecurringExpenses();

    // UI state
    const [selectedCard, setSelectedCard] = useState(null);
    const [editingCategory, setEditingCategory] = useState(null);
    const [showAddCardModal, setShowAddCardModal] = useState(false);
    const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [showAllTransactionsModal, setShowAllTransactionsModal] = useState(false);
    const [isBalanceHidden, setIsBalanceHidden] = useState(false);
    
    // Outlier filter state for burn rate
    const [ignoreOutliers, setIgnoreOutliers] = useState(true);
    const [outlierThreshold, setOutlierThreshold] = useState(5000);

    // Add Card state
    const [newCard, setNewCard] = useState({ name: '', color: '#4ecdc4' });

    // Transaction search/filter in modal
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');

    // Shopping Suggestions State
    const [suggestionAmounts, setSuggestionAmounts] = useState({});

    // Initialize defaults if no cards exist
    useEffect(() => {
        if (!cardsLoading && cards.length === 0) {
            initializeDefaults();
        }
    }, [cardsLoading, cards.length]);

    // Financial Calculations
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysRemaining = Math.max(1, daysInMonth - dayOfMonth);

    const thisMonthExpenses = useMemo(() => {
        return transactions.filter(t => {
            if (t.type !== 'expense') return false;
            const d = parseISO(t.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
    }, [transactions, currentMonth, currentYear]);

    const totalMonthlySpend = useMemo(() => {
        return thisMonthExpenses.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    }, [thisMonthExpenses]);

    // Outlier-adjusted baseline spend
    const { baselineSpend, outlierPurchasesTotal } = useMemo(() => {
        let baseline = 0;
        let outliers = 0;
        thisMonthExpenses.forEach(t => {
            const amt = parseFloat(t.amount) || 0;
            if (ignoreOutliers && amt >= outlierThreshold) {
                outliers += amt;
            } else {
                baseline += amt;
            }
        });
        return { baselineSpend: baseline, outlierPurchasesTotal: outliers };
    }, [thisMonthExpenses, ignoreOutliers, outlierThreshold]);

    // Burn Rate & Runway Forecaster
    const dailyBurnRate = useMemo(() => {
        return Math.round(baselineSpend / Math.max(1, dayOfMonth));
    }, [baselineSpend, dayOfMonth]);

    const totalBudgetCap = useMemo(() => {
        return budgets.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
    }, [budgets]);

    const remainingBudget = totalBudgetCap > 0 ? (totalBudgetCap - totalMonthlySpend) : null;

    const safeToSpendToday = useMemo(() => {
        if (remainingBudget !== null) {
            return Math.max(0, Math.round(remainingBudget / daysRemaining));
        }
        return null;
    }, [remainingBudget, daysRemaining]);

    const runwayData = useMemo(() => {
        if (totalBudgetCap > 0 && remainingBudget !== null) {
            if (remainingBudget <= 0) {
                return {
                    status: 'exhausted',
                    daysLeft: 0,
                    text: 'Monthly budget has been exceeded!',
                    exhaustionDate: today
                };
            }
            if (dailyBurnRate > 0) {
                const daysUntilExhausted = Math.round(remainingBudget / dailyBurnRate);
                const projectedDate = addDays(today, daysUntilExhausted);
                const isOverspending = daysUntilExhausted < daysRemaining;

                return {
                    status: isOverspending ? 'warning' : 'good',
                    daysLeft: daysUntilExhausted,
                    isOverspending,
                    text: isOverspending
                        ? `At current pace, budget runs out in ${daysUntilExhausted} days (~${format(projectedDate, 'MMM d')})`
                        : `On track! Expected surplus of ₹${Math.round(remainingBudget - (dailyBurnRate * daysRemaining)).toLocaleString('en-IN')}`,
                    exhaustionDate: projectedDate
                };
            }
        }
        return {
            status: 'neutral',
            daysLeft: null,
            text: `Burning ~₹${dailyBurnRate.toLocaleString('en-IN')}/day based on past ${dayOfMonth} days`,
            exhaustionDate: null
        };
    }, [totalBudgetCap, remainingBudget, dailyBurnRate, daysRemaining, today, dayOfMonth]);

    // Fixed vs Discretionary Breakdown
    const recurringMonthlyAmount = getRecurringMonthlyTotal();
    const discretionarySpend = Math.max(0, totalMonthlySpend - recurringMonthlyAmount);
    const fixedPct = totalMonthlySpend > 0 ? Math.round((recurringMonthlyAmount / totalMonthlySpend) * 100) : 0;
    const discretionaryPct = totalMonthlySpend > 0 ? Math.min(100, 100 - fixedPct) : 100;

    // Recent 5 Transactions
    const recentExpenses = useMemo(() => {
        return transactions
            .filter(t => t.type === 'expense')
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);
    }, [transactions]);

    // All expenses for search modal
    const filteredModalExpenses = useMemo(() => {
        return transactions
            .filter(t => {
                if (t.type !== 'expense') return false;
                if (filterCategory !== 'all') {
                    const matchesCategory = t.card_id === filterCategory || t.category === filterCategory;
                    if (!matchesCategory) return false;
                }
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    const card = cards.find(c => c.id === t.card_id);
                    const descMatch = (t.description || '').toLowerCase().includes(q);
                    const catMatch = (card?.name || '').toLowerCase().includes(q);
                    return descMatch || catMatch;
                }
                return true;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [transactions, filterCategory, searchQuery, cards]);

    const handleAddCardSubmit = async () => {
        if (!newCard.name) return;
        const PRESET_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#9B59B6', '#3498DB', '#FECA57'];
        const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
        await addCard(newCard.name, randomColor, [], null, null);
        setNewCard({ name: '', color: '#4ecdc4' });
        setShowAddCardModal(false);
    };

    // Shopping suggestions logic
    const shoppingSuggestions = shoppingItems.filter(item => item.is_bought && !item.added_to_expenses);
    const addTransactionFromSuggestion = async (item, price) => {
        await addTransactionDb({
            amount: parseFloat(price),
            description: item.name,
            type: 'expense',
            category: 'shopping',
            date: new Date().toISOString(),
        });
        await markAddedToExpenses(item.id);
    };

    return (
        <div className="finances-subview" style={{ animation: 'fadeIn 0.3s ease' }}>
            
            {/* HERO FINANCIAL HEALTH & RUNWAY CARD */}
            <div className="glass-card" style={{
                padding: '20px',
                marginBottom: '20px',
                background: 'linear-gradient(135deg, rgba(78, 205, 196, 0.08), rgba(17, 138, 178, 0.04))',
                border: '1px solid var(--glass-card-border)',
                borderRadius: '20px',
                boxShadow: 'var(--shadow-sm)'
            }}>
                {/* Top Row: Net Balance & Burn Rate */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Total Net Balance
                            </span>
                            <button
                                onClick={() => setIsBalanceHidden(!isBalanceHidden)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: 0 }}
                                title={isBalanceHidden ? 'Show balance' : 'Hide balance'}
                            >
                                {isBalanceHidden ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                        <div style={{
                            fontSize: '30px',
                            fontWeight: '800',
                            color: 'var(--text-primary)',
                            filter: isBalanceHidden ? 'blur(8px)' : 'none',
                            transition: 'filter 0.25s ease'
                        }}>
                            ₹{Math.round(getTotalBalance()).toLocaleString('en-IN')}
                        </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                            <Flame size={14} color="#ff6b6b" /> Daily Burn Rate
                        </div>
                        <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            ₹{dailyBurnRate.toLocaleString('en-IN')}<span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>/day</span>
                        </div>
                    </div>
                </div>

                {/* Runway & Forecasting Banner */}
                <div style={{
                    padding: '12px 14px',
                    borderRadius: '14px',
                    background: runwayData.status === 'warning'
                        ? 'rgba(245, 101, 101, 0.12)'
                        : runwayData.status === 'good'
                        ? 'rgba(72, 187, 120, 0.12)'
                        : 'var(--surface-input)',
                    border: `1px solid ${
                        runwayData.status === 'warning'
                            ? 'rgba(245, 101, 101, 0.25)'
                            : runwayData.status === 'good'
                            ? 'rgba(72, 187, 120, 0.25)'
                            : 'var(--glass-card-border)'
                    }`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '16px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {runwayData.status === 'warning' ? (
                            <ShieldAlert size={18} color="var(--danger)" />
                        ) : (
                            <ShieldCheck size={18} color="var(--success)" />
                        )}
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                            {runwayData.text}
                        </span>
                    </div>

                    {/* Outlier Exclusion Toggle */}
                    <button
                        onClick={() => setIgnoreOutliers(!ignoreOutliers)}
                        style={{
                            padding: '4px 10px',
                            borderRadius: '16px',
                            border: '1px solid var(--glass-card-border)',
                            background: ignoreOutliers ? 'var(--accent-primary, #4ecdc4)22' : 'transparent',
                            color: ignoreOutliers ? 'var(--accent-primary, #4ecdc4)' : 'var(--text-secondary)',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        title={`Toggle whether purchases ≥ ₹${outlierThreshold.toLocaleString('en-IN')} are excluded from daily burn pace`}
                    >
                        {ignoreOutliers ? `Ignoring >₹${(outlierThreshold/1000).toFixed(0)}k outliers` : 'All expenses included'}
                    </button>
                </div>

                {/* Safe-to-Spend & Fixed vs Discretionary Meter */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--glass-card-border)'
                }}>
                    {/* Safe to Spend Today */}
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>
                            Safe to Spend Today
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--success)' }}>
                            {safeToSpendToday !== null ? `₹${safeToSpendToday.toLocaleString('en-IN')}` : `₹${dailyBurnRate.toLocaleString('en-IN')}`}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {daysRemaining} days left in {format(today, 'MMMM')}
                        </div>
                    </div>

                    {/* Fixed vs Discretionary Split */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                            <span>Fixed ({fixedPct}%)</span>
                            <span>Daily ({discretionaryPct}%)</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'var(--surface-input)', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
                            <div style={{ width: `${fixedPct}%`, background: '#ffd166', transition: 'width 0.3s ease' }} title={`Fixed / Subscriptions: ₹${Math.round(recurringMonthlyAmount).toLocaleString('en-IN')}`} />
                            <div style={{ width: `${discretionaryPct}%`, background: 'var(--accent-primary, #4ecdc4)', transition: 'width 0.3s ease' }} title={`Discretionary / Daily: ₹${Math.round(discretionarySpend).toLocaleString('en-IN')}`} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            <span>₹{Math.round(recurringMonthlyAmount).toLocaleString('en-IN')}</span>
                            <span>₹{Math.round(discretionarySpend).toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* SHOPPING SUGGESTIONS (if any) */}
            {shoppingSuggestions.length > 0 && (
                <div className="glass-card" style={{ padding: '16px', marginBottom: '20px', borderLeft: '4px solid var(--accent-primary, #4ecdc4)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 0' }}>
                        <ShoppingBag size={18} color="var(--accent-primary, #4ecdc4)" /> Add recent purchases to expenses?
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {shoppingSuggestions.map(item => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ flex: 1, fontSize: '14px', fontWeight: '500' }}>{item.name}</span>
                                <CurrencyInput
                                    value={suggestionAmounts[item.id] || ''}
                                    onChange={(val) => setSuggestionAmounts({ ...suggestionAmounts, [item.id]: val })}
                                    placeholder="Amount"
                                    style={{ width: '100px' }}
                                    inputStyle={{ padding: '6px 8px', fontSize: '13px' }}
                                />
                                <button
                                    onClick={() => {
                                        if (suggestionAmounts[item.id]) {
                                            addTransactionFromSuggestion(item, suggestionAmounts[item.id]);
                                            setSuggestionAmounts({ ...suggestionAmounts, [item.id]: '' });
                                        }
                                    }}
                                    disabled={!suggestionAmounts[item.id]}
                                    style={{
                                        padding: '6px 12px',
                                        background: 'var(--accent-primary, #4ecdc4)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Add
                                </button>
                                <button onClick={() => markAddedToExpenses(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}>
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CATEGORIES GRID */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                        Categories
                    </h3>
                    <button
                        onClick={() => setShowAddCardModal(true)}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'var(--glass-card-bg)',
                            border: '1px solid var(--glass-card-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                            transition: 'all 0.2s ease',
                        }}
                        title="Manage Categories"
                    >
                        <Settings size={16} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {cards.map(card => {
                        const progress = getBudgetProgress(card, transactions);
                        return (
                            <ExpenseCard
                                key={card.id}
                                card={card}
                                budgetProgress={progress}
                                onClick={() => setSelectedCard(card)}
                            />
                        );
                    })}
                </div>
            </div>

            {/* INLINE RECENT TRANSACTIONS (Last 5) */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                            Recent Activity
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                            Tap to edit or adjust transactions
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAllTransactionsModal(true)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-primary, #4ecdc4)',
                            fontSize: '13px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        View All <ChevronRight size={15} />
                    </button>
                </div>

                {recentExpenses.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {recentExpenses.map(tx => {
                            const card = cards.find(c => c.id === tx.card_id);
                            return (
                                <div
                                    key={tx.id}
                                    className="glass-card"
                                    style={{
                                        padding: '12px 14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        transition: 'transform 0.15s ease, background 0.15s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '38px',
                                            height: '38px',
                                            borderRadius: '10px',
                                            background: card ? `${card.color}22` : 'var(--surface-elevated)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {card ? React.cloneElement(getIconByName(card.name), { color: card.color, size: 18 }) : <ShoppingBag size={18} color="var(--text-secondary)" />}
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, marginBottom: '2px' }}>
                                                {tx.description || card?.name || 'Expense'}
                                            </p>
                                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                                                {card?.name || 'Uncategorized'} • {format(parseISO(tx.date), 'MMM d')}
                                            </p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                            -₹{parseFloat(tx.amount).toLocaleString('en-IN')}
                                        </div>
                                        <button
                                            onClick={() => setEditingTransaction(tx)}
                                            style={{
                                                padding: '6px',
                                                borderRadius: '8px',
                                                background: 'var(--surface-input)',
                                                border: '1px solid var(--glass-card-border)',
                                                color: 'var(--text-secondary)',
                                                cursor: 'pointer',
                                                display: 'flex'
                                            }}
                                            title="Quick Edit"
                                        >
                                            <Edit3 size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <p style={{ margin: 0, fontSize: '14px' }}>No recent expenses yet.</p>
                    </div>
                )}
            </div>

            {/* MODALS */}
            
            {/* Quick Add Expense Modal */}
            <QuickAddExpenseModal
                isOpen={showAddExpenseModal}
                onClose={() => setShowAddExpenseModal(false)}
                cards={cards}
                onAddExpense={addTransactionDb}
                fetchSubcategories={fetchSubcategories}
            />

            {/* Quick Edit Expense Modal */}
            <QuickEditExpenseModal
                isOpen={!!editingTransaction}
                onClose={() => setEditingTransaction(null)}
                transaction={editingTransaction}
                cards={cards}
                onUpdateExpense={updateTransactionDb}
                onDeleteExpense={deleteTransactionDb}
                fetchSubcategories={fetchSubcategories}
            />

            {/* Category Detail Modal */}
            {selectedCard && (
                <ExpenseCardDetail
                    card={selectedCard}
                    onClose={() => setSelectedCard(null)}
                    onEdit={() => {
                        setSelectedCard(null);
                        setEditingCategory(selectedCard);
                    }}
                    onAddExpense={() => {
                        setSelectedCard(null);
                        setShowAddExpenseModal(true);
                    }}
                />
            )}

            {/* Category Edit Modal */}
            {editingCategory && (
                <CategorySettingsModal
                    card={editingCategory}
                    onClose={() => setEditingCategory(null)}
                />
            )}

            {/* Manage Categories Modal */}
            <Modal
                isOpen={showAddCardModal}
                onClose={() => setShowAddCardModal(false)}
                title="Manage Categories"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                            type="text"
                            placeholder="New Category Name"
                            value={newCard.name}
                            onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                            style={{
                                flex: 1,
                                padding: '12px',
                                border: '1px solid var(--glass-card-border)',
                                borderRadius: '12px',
                                background: 'var(--surface-input)',
                                color: 'var(--text-primary)',
                                fontSize: '15px',
                            }}
                        />
                        <button
                            onClick={handleAddCardSubmit}
                            disabled={!newCard.name}
                            style={{
                                padding: '12px 20px',
                                background: newCard.name ? 'var(--accent-primary, #4ecdc4)' : 'var(--border-subtle)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: '700',
                                fontSize: '15px',
                                cursor: newCard.name ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            Add
                        </button>
                    </div>

                    <div>
                        <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '12px', letterSpacing: '0.5px' }}>
                            EXISTING CATEGORIES
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '40vh', overflowY: 'auto' }}>
                            {cards.map(card => (
                                <div key={card.id} style={{ 
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                    padding: '12px 16px', background: 'var(--glass-card-bg)', 
                                    borderRadius: '12px', border: '1px solid var(--glass-card-border)' 
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ 
                                            width: '32px', height: '32px', borderRadius: '8px', 
                                            background: `${card.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' 
                                        }}>
                                            {React.cloneElement(getIconByName(card.name), { color: card.color, size: 16 })}
                                        </div>
                                        <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>{card.name}</span>
                                    </div>
                                    <button 
                                        onClick={() => { 
                                            setShowAddCardModal(false); 
                                            setEditingCategory(card); 
                                        }}
                                        style={{
                                            padding: '6px 12px',
                                            background: 'var(--surface-elevated)',
                                            color: 'var(--text-secondary)',
                                            border: '1px solid var(--border-subtle)',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Edit
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* All Transactions Modal with Search & Category Filter */}
            <Modal
                isOpen={showAllTransactionsModal}
                onClose={() => setShowAllTransactionsModal(false)}
                title="All Transactions"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '75vh' }}>
                    {/* Search & Filter Controls */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{
                            flex: 1,
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px' }} />
                            <input
                                type="text"
                                placeholder="Search by name or note..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px 10px 36px',
                                    borderRadius: '12px',
                                    border: '1px solid var(--glass-card-border)',
                                    background: 'var(--surface-input)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        <select
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                            style={{
                                padding: '10px 12px',
                                borderRadius: '12px',
                                border: '1px solid var(--glass-card-border)',
                                background: 'var(--surface-input)',
                                color: 'var(--text-primary)',
                                fontSize: '13px',
                                fontWeight: '600',
                                outline: 'none'
                            }}
                        >
                            <option value="all">All Categories</option>
                            {cards.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Transactions List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '55vh' }}>
                        {filteredModalExpenses.length > 0 ? (
                            filteredModalExpenses.map(tx => {
                                const card = cards.find(c => c.id === tx.card_id);
                                return (
                                    <div
                                        key={tx.id}
                                        style={{
                                            padding: '12px 14px',
                                            borderRadius: '12px',
                                            background: 'var(--surface-input)',
                                            border: '1px solid var(--glass-card-border)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '8px',
                                                background: card ? `${card.color}22` : 'var(--surface-elevated)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                {card ? React.cloneElement(getIconByName(card.name), { color: card.color, size: 16 }) : <ShoppingBag size={16} color="var(--text-secondary)" />}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                    {tx.description}
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                    {card?.name || 'Expense'} • {format(parseISO(tx.date), 'MMM d, yyyy')}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                                -₹{parseFloat(tx.amount).toLocaleString('en-IN')}
                                            </span>
                                            <button
                                                onClick={() => {
                                                    setShowAllTransactionsModal(false);
                                                    setEditingTransaction(tx);
                                                }}
                                                style={{
                                                    padding: '6px',
                                                    borderRadius: '6px',
                                                    background: 'var(--glass-card-bg)',
                                                    border: '1px solid var(--glass-card-border)',
                                                    color: 'var(--text-secondary)',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Edit3 size={13} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px 0', fontSize: '14px' }}>
                                No transactions found.
                            </p>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ExpensesView;
