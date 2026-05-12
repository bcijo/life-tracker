import React, { useState, useEffect, useMemo } from 'react';
import { Plus, BarChart2, BarChart3, ArrowUpRight, ArrowDownLeft, X, ChevronDown, ShoppingBag, DollarSign, Trash2, AlertTriangle } from 'lucide-react';
import useTransactions from '../../hooks/useTransactions';
import useCategories from '../../hooks/useCategories';
import useShopping from '../../hooks/useShopping';
import useExpenseCards from '../../hooks/useExpenseCards';
import useRecurringExpenses from '../../hooks/useRecurringExpenses';
import ExpenseCard, { getIconByName } from '../ExpenseCard';
import WeeklyChart from '../WeeklyChart';
import CurrencyInput from '../CurrencyInput';
import { Calendar, Settings } from 'lucide-react';

import RecurringExpensesSection from '../RecurringExpensesSection';
import ExpenseCardDetail from '../ExpenseCardDetail';
import CategorySettingsModal from '../CategorySettingsModal';
import Modal from '../Modal';
import { isToday, parseISO, isSameMonth, format } from 'date-fns';
import useBudgets from '../../hooks/useBudgets';
import BudgetsSection from '../BudgetsSection';

const EMOJI_LIST = ['🍽️', '🚗', '🛒', '💡', '🎬', '🏥', '📦', '🏠', '✈️', '🎮', '🎓', '🎁', '🔧', '💅', '🏋️', '📚', '🍕', '🍻', '👶', '🐾'];

const ExpensesView = ({ showAnalytics, setShowAnalytics }) => {
    const { transactions, addTransaction: addTransactionDb } = useTransactions();
    const { items: shoppingItems, markAddedToExpenses } = useShopping();
    const { categories } = useCategories();

    const {
        cards,
        addCard,
        getBudgetProgress,
        initializeDefaults,
        loading,
        fetchSubcategories
    } = useExpenseCards();
    const {
        recurringExpenses,
        addRecurringExpense,
        deleteRecurringExpense,
        toggleActive,
        getUpcoming,
        getMonthlyTotal,
        processRecurringExpenses,
        upcomingExpenses,
        monthlyTotal: recurringTotal
    } = useRecurringExpenses();
    
    const { budgets, addBudget, updateBudget, deleteBudget } = useBudgets();

    // UI State
    const [selectedCard, setSelectedCard] = useState(null); // The card currently opened in modal
    const [editingCategory, setEditingCategory] = useState(null); // The card being edited
    const [showAddCardModal, setShowAddCardModal] = useState(false);
    const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
    const [showRecentExpensesModal, setShowRecentExpensesModal] = useState(false);
    const [activeSubcategories, setActiveSubcategories] = useState([]);

    // Add Card Form State
    const [newCard, setNewCard] = useState({ name: '', color: '#4ecdc4' });
    const [newExpense, setNewExpense] = useState({ 
        amount: '', 
        description: '', 
        card_id: '', 
        subcategory_id: '',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        const loadSubs = async () => {
            if (newExpense.card_id) {
                const subs = await fetchSubcategories(newExpense.card_id);
                setActiveSubcategories(subs || []);
                setNewExpense(prev => ({ ...prev, subcategory_id: '' }));
            } else {
                setActiveSubcategories([]);
            }
        };
        loadSubs();
    }, [newExpense.card_id]);

    const [bankSectionCollapsed, setBankSectionCollapsed] = useState(false);
    const [recurringSectionCollapsed, setRecurringSectionCollapsed] = useState(true);
    const [hideBalance, setHideBalance] = useState(true);

    // Shopping Suggestions State
    const [suggestionAmounts, setSuggestionAmounts] = useState({});

    // Derived state
    const { todayExpenses, monthlyExpenses } = useMemo(() => {
        const today = new Date();
        const expenses = transactions.filter(t => t.type === 'expense');
        return {
            todayExpenses: expenses
                .filter(t => isToday(parseISO(t.date)))
                .reduce((acc, t) => acc + parseFloat(t.amount), 0),
            monthlyExpenses: expenses
                .filter(t => isSameMonth(parseISO(t.date), today))
                .reduce((acc, t) => acc + parseFloat(t.amount), 0)
        };
    }, [transactions]);

    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + parseFloat(t.amount), 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + parseFloat(t.amount), 0);
    const balance = income - expense;


    useEffect(() => {
        if (recurringExpenses.length > 0) processRecurringExpenses();
    }, [recurringExpenses.length]);

    // Initialize defaults if no cards exist
    useEffect(() => {
        if (!loading && cards.length === 0) {
            initializeDefaults();
        }
    }, [loading, cards.length]);

    const PRESET_COLORS = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
        '#D4A5A5', '#9B59B6', '#3498DB', '#E67E22', '#2ECC71',
        '#FECA57', '#5F27CD', '#54A0FF', '#01A3A4'
    ];

    const handleAddCard = async () => {
        if (!newCard.name) return;
        const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
        await addCard(newCard.name, randomColor, [], null, null);
        setNewCard({ name: '', color: '#4ecdc4' });
        setShowAddCardModal(false);
    };

    const handleAddExpense = async () => {
        if (!newExpense.amount || !newExpense.card_id) return;
        await addTransactionDb({
            amount: parseFloat(newExpense.amount),
            description: newExpense.description || 'Expense',
            type: 'expense',
            card_id: newExpense.card_id,
            category: newExpense.card_id,
            subcategory_id: newExpense.subcategory_id || null,
            date: new Date(newExpense.date).toISOString()
        });
        setNewExpense({ 
            amount: '', 
            description: '', 
            card_id: '', 
            subcategory_id: '',
            date: new Date().toISOString().split('T')[0] 
        });
        setShowAddExpenseModal(false);
    };

    const allExpenses = useMemo(() => {
        return transactions
            .filter(t => t.type === 'expense')
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [transactions]);

    const groupedExpenses = useMemo(() => {
        const groupsMap = new Map();
        const now = new Date();
        now.setHours(0,0,0,0);
        
        allExpenses.forEach(tx => {
            const txDate = new Date(tx.date);
            const txDay = new Date(txDate);
            txDay.setHours(0,0,0,0);
            
            const diffDays = Math.round((now - txDay) / (1000 * 60 * 60 * 24));
            
            let groupTitle = '';
            
            if (diffDays === 0) {
                groupTitle = 'TODAY';
            } else if (diffDays <= 7) {
                groupTitle = 'LAST 7 DAYS';
            } else {
                if (isSameMonth(txDay, now)) {
                    groupTitle = 'THIS MONTH';
                } else {
                    groupTitle = format(txDay, 'MMMM, yyyy').toUpperCase();
                }
            }

            if (!groupsMap.has(groupTitle)) {
                groupsMap.set(groupTitle, []);
            }
            groupsMap.get(groupTitle).push(tx);
        });

        const result = [];
        for (const [title, items] of groupsMap.entries()) {
            result.push({ title, items });
        }
        return result;
    }, [allExpenses]);

    const renderTransaction = (tx) => {
        const card = cards.find(c => c.id === tx.card_id);
        return (
            <div key={tx.id} style={{ 
                padding: '12px 16px', 
                background: 'var(--glass-card-bg)', 
                border: '1px solid var(--glass-card-border)',
                borderRadius: '12px',
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: card ? `${card.color}22` : 'var(--surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {card ? React.cloneElement(getIconByName(card.name), { color: card.color, size: 18 }) : <ShoppingBag size={18} color="var(--text-secondary)" />}
                    </div>
                    <div>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: 0, marginBottom: '2px' }}>{tx.description || card?.name || 'Expense'}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{card ? card.name : 'Uncategorized'} • {new Date(tx.date).toLocaleDateString()}</p>
                    </div>
                </div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    -₹{parseFloat(tx.amount).toLocaleString('en-IN')}
                </div>
            </div>
        );
    };

    // Shopping suggestions logic
    const shoppingSuggestions = shoppingItems.filter(item => item.is_bought && !item.added_to_expenses);
    const addTransactionFromSuggestion = async (item, price) => {
        await addTransactionDb({
            amount: price,
            description: item.name,
            type: 'expense',
            category: 'shopping',
            date: new Date().toISOString(),
        });
        await markAddedToExpenses(item.id);
    };

    return (
        <div className="finances-subview" style={{ animation: 'fadeIn 0.3s ease' }}>
            {/* Header / Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>Expenses Overview</h2>
                <button
                    onClick={() => setShowAddExpenseModal(true)}
                    style={{
                        padding: '8px 16px',
                        background: 'transparent',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--glass-card-border)',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'var(--surface-elevated)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                    }}
                >
                    <Plus size={16} /> Add Expense
                </button>
            </div>

            {/* Analytics Chart */}
            {showAnalytics && (
                <div style={{ marginBottom: '24px', animation: 'fadeIn 0.3s ease' }}>
                    <WeeklyChart
                        transactions={transactions}
                        categories={cards}
                        onClose={() => setShowAnalytics(false)}
                    />
                </div>
            )}

            {/* Recurring Expenses Section */}
            <RecurringExpensesSection
                recurringExpenses={recurringExpenses}
                categories={cards}
                onAdd={addRecurringExpense}
                onDelete={deleteRecurringExpense}
                onToggleActive={toggleActive}
                upcomingExpenses={getUpcoming()}
                monthlyTotal={getMonthlyTotal()}
                isCollapsed={recurringSectionCollapsed}
                onToggleCollapse={() => setRecurringSectionCollapsed(!recurringSectionCollapsed)}
            />

            {/* UNIFIED EXPENSE HISTORY BUTTON */}
            <div style={{ marginBottom: '24px' }}>
                <button
                    onClick={() => setShowRecentExpensesModal(true)}
                    style={{
                        width: '100%',
                        padding: '16px',
                        background: 'var(--glass-card-bg)',
                        border: '1px solid var(--glass-card-border)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: 'var(--shadow-sm)'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.background = 'var(--surface-elevated)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.background = 'var(--glass-card-bg)';
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--accent-primary)22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ShoppingBag size={20} color="var(--accent-primary)" />
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, marginBottom: '2px' }}>Recent Expenses</h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>View all your transactions</p>
                        </div>
                    </div>
                    <ChevronDown size={20} color="var(--text-secondary)" style={{ transform: 'rotate(-90deg)' }} />
                </button>
            </div>

            {/* Shopping Suggestions */}
            {shoppingSuggestions.length > 0 && (
                <div className="glass-card" style={{ padding: '16px', marginBottom: '20px', borderLeft: '3px solid var(--accent-primary)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <ShoppingBag size={18} /> Add recent purchases?
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {shoppingSuggestions.map(item => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ flex: 1, fontSize: '14px' }}>{item.name}</span>
                                <CurrencyInput
                                    value={suggestionAmounts[item.id] || ''}
                                    onChange={(val) => setSuggestionAmounts({ ...suggestionAmounts, [item.id]: val })}
                                    placeholder="Amount"
                                    style={{ width: '100px' }}
                                    inputStyle={{ padding: '6px', paddingLeft: '24px', fontSize: '13px' }}
                                />
                                <button
                                    onClick={() => {
                                        if (suggestionAmounts[item.id]) {
                                            addTransactionFromSuggestion(item, suggestionAmounts[item.id]);
                                            setSuggestionAmounts({ ...suggestionAmounts, [item.id]: '' });
                                        }
                                    }}
                                    disabled={!suggestionAmounts[item.id]}
                                    style={{ padding: '6px 12px', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    Add
                                </button>
                                <button onClick={() => markAddedToExpenses(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}><X size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* EXPENSE CARDS GRID */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Categories</h3>
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
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'scale(1.1)';
                            e.currentTarget.style.background = 'var(--surface-input)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.background = 'var(--glass-card-bg)';
                        }}
                    >
                        <Settings size={18} />
                    </button>
                </div>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>

                    {/* Expense Cards */}
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

            {/* BUDGETS SECTION */}
            <BudgetsSection 
                budgets={budgets} 
                transactions={transactions} 
                onAddBudget={addBudget} 
                onUpdateBudget={updateBudget} 
                onDeleteBudget={deleteBudget} 
            />

            {/* MODALS */}
            {selectedCard && (
                <ExpenseCardDetail
                    card={selectedCard}
                    onClose={() => setSelectedCard(null)}
                    onEdit={() => {
                        setSelectedCard(null);
                        setEditingCategory(selectedCard);
                    }}
                    onAddExpense={() => {
                        setNewExpense(prev => ({ ...prev, card_id: selectedCard.id }));
                        setSelectedCard(null);
                        setShowAddExpenseModal(true);
                    }}
                />
            )}

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
                            onClick={handleAddCard}
                            disabled={!newCard.name}
                            style={{
                                padding: '12px 20px',
                                background: newCard.name ? 'var(--text-primary)' : 'var(--border-subtle)',
                                color: 'var(--bg-primary)',
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
                        <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '12px', letterSpacing: '0.5px' }}>EXISTING CATEGORIES</p>
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
            <Modal
                isOpen={showAddExpenseModal}
                onClose={() => setShowAddExpenseModal(false)}
                title="Add Expense"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '70vh', overflowY: 'auto' }}>
                    <CurrencyInput
                        value={newExpense.amount}
                        onChange={(val) => setNewExpense({ ...newExpense, amount: val })}
                        placeholder="Amount"
                        inputStyle={{ fontSize: '32px', padding: '16px', fontWeight: 'bold', borderBottom: '2px solid var(--border-subtle)' }}
                    />
                    
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '14px',
                                background: 'var(--surface-input)',
                                borderRadius: '12px',
                                border: '1px solid var(--glass-card-border)',
                            }}>
                                <Calendar size={18} style={{ color: 'var(--text-secondary)' }} />
                                <input
                                    type="date"
                                    value={newExpense.date}
                                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                                    style={{ border: 'none', background: 'transparent', width: '100%', fontSize: '15px', color: 'var(--text-primary)', outline: 'none' }}
                                />
                            </div>
                        </div>
                    </div>

                    <input
                        type="text"
                        placeholder="What was this for? (Optional)"
                        value={newExpense.description}
                        onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                        style={{
                            width: '100%', padding: '14px', border: '1px solid var(--glass-card-border)',
                            borderRadius: '12px', background: 'var(--surface-input)', color: 'var(--text-primary)', fontSize: '15px',
                        }}
                    />

                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block', letterSpacing: '0.5px' }}>CATEGORY</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                            {cards.map(card => (
                                <button
                                    key={card.id}
                                    onClick={() => setNewExpense({ ...newExpense, card_id: card.id })}
                                    style={{
                                        padding: '12px', borderRadius: '12px', border: newExpense.card_id === card.id ? `2px solid ${card.color}` : '1px solid var(--glass-card-border)',
                                        background: newExpense.card_id === card.id ? `${card.color}15` : 'var(--glass-card-bg)',
                                        color: 'var(--text-primary)', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                                        transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '8px'
                                    }}
                                >
                                    <div style={{
                                        background: card.color, width: '24px', height: '24px', borderRadius: '6px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {React.cloneElement(getIconByName(card.name), { size: 14, color: '#fff' })}
                                    </div>
                                    {card.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {activeSubcategories.length > 0 && (
                        <div style={{ animation: 'fadeIn 0.2s ease' }}>
                            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block', letterSpacing: '0.5px' }}>SUBCATEGORY</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {activeSubcategories.map(sub => {
                                    const card = cards.find(c => c.id === newExpense.card_id);
                                    const isSelected = newExpense.subcategory_id === sub.id;
                                    return (
                                        <button
                                            key={sub.id}
                                            onClick={() => setNewExpense({ ...newExpense, subcategory_id: sub.id })}
                                            style={{
                                                padding: '8px 14px', borderRadius: '20px', 
                                                border: isSelected ? `2px solid ${card?.color || 'var(--accent-primary)'}` : '1px solid var(--glass-card-border)',
                                                background: isSelected ? `${card?.color || 'var(--accent-primary)'}15` : 'var(--glass-card-bg)',
                                                color: isSelected ? (card?.color || 'var(--accent-primary)') : 'var(--text-secondary)', 
                                                fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            {sub.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleAddExpense}
                        disabled={!newExpense.amount || !newExpense.card_id}
                        style={{
                            width: '100%', padding: '16px', background: (newExpense.amount && newExpense.card_id) ? 'var(--text-primary)' : 'var(--border-subtle)',
                            color: 'var(--bg-primary)', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '16px',
                            cursor: (newExpense.amount && newExpense.card_id) ? 'pointer' : 'not-allowed', marginTop: '12px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        Add Transaction
                    </button>
                </div>
            </Modal>

            {/* Recent Expenses Modal */}
            <Modal
                isOpen={showRecentExpensesModal}
                onClose={() => setShowRecentExpensesModal(false)}
                title="Expense History"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxHeight: '75vh', overflowY: 'auto', paddingRight: '4px' }}>
                    
                    {groupedExpenses.map(group => (
                        <div key={group.title}>
                            <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '12px', letterSpacing: '0.5px' }}>{group.title}</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {group.items.map(tx => renderTransaction(tx))}
                            </div>
                        </div>
                    ))}
                    
                    {allExpenses.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                            No expenses recorded yet.
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default ExpensesView;
