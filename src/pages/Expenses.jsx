import React, { useState, useEffect, useMemo } from 'react';
import { Plus, BarChart2, BarChart3, ArrowUpRight, ArrowDownLeft, X, ChevronDown, ShoppingBag, DollarSign, Trash2, AlertTriangle } from 'lucide-react';
import useTransactions from '../hooks/useTransactions';
import useCategories from '../hooks/useCategories';
import useShopping from '../hooks/useShopping';
import useExpenseCards from '../hooks/useExpenseCards';
import useRecurringExpenses from '../hooks/useRecurringExpenses';
import ExpenseCard from '../components/ExpenseCard';
import WeeklyChart from '../components/WeeklyChart';

import RecurringExpensesSection from '../components/RecurringExpensesSection';
import ExpenseCardDetail from '../components/ExpenseCardDetail';
import Modal from '../components/Modal';
import { isToday, parseISO, isSameMonth } from 'date-fns';

const EMOJI_LIST = ['🍽️', '🚗', '🛒', '💡', '🎬', '🏥', '📦', '🏠', '✈️', '🎮', '🎓', '🎁', '🔧', '💅', '🏋️', '📚', '🍕', '🍻', '👶', '🐾'];

const Expenses = () => {
    const { transactions, addTransaction: addTransactionDb } = useTransactions();
    const { items: shoppingItems, markAddedToExpenses } = useShopping();
    const { categories } = useCategories();

    const {
        cards,
        addCard,
        getBudgetProgress,
        initializeDefaults,
        loading
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


    // UI State
    const [selectedCard, setSelectedCard] = useState(null); // The card currently opened in modal
    const [showWeeklyChart, setShowWeeklyChart] = useState(false);
    const [showAddCardModal, setShowAddCardModal] = useState(false);
    const [showGraph, setShowGraph] = useState(false);

    // Add Card Form State
    const [newCard, setNewCard] = useState({ name: '', color: '#4ecdc4', icon: '📦', budget: '' });

    const [bankSectionCollapsed, setBankSectionCollapsed] = useState(false);
    const [recurringSectionCollapsed, setRecurringSectionCollapsed] = useState(true);

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
        await addCard(newCard.name, randomColor, [], newCard.icon, newCard.budget || null);
        setNewCard({ name: '', color: '#4ecdc4', icon: '📦', budget: '' });
        setShowAddCardModal(false);
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
        <div className="page-container" style={{ paddingBottom: '80px' }}>
            <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>Expenses</h1>
                    <p style={{ fontSize: '14px', opacity: 0.7 }}>
                        Total spent: <span style={{ fontWeight: '600' }}>₹{monthlyExpenses.toFixed(0)}</span>
                    </p>
                </div>
                <button
                    onClick={() => setShowGraph(!showGraph)}
                    style={{
                        background: showGraph ? 'var(--text-primary)' : 'rgba(255,255,255,0.5)',
                        color: showGraph ? '#fff' : 'var(--text-primary)',
                        border: 'none',
                        borderRadius: '12px',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: showGraph ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                    }}
                >
                    <BarChart2 size={20} />
                </button>
            </header>

            {/* Shopping Suggestions */}
            {shoppingSuggestions.length > 0 && (
                <div className="glass-card" style={{ padding: '16px', marginBottom: '20px', background: 'linear-gradient(135deg, rgba(69, 183, 209, 0.15) 0%, rgba(69, 183, 209, 0.05) 100%)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <ShoppingBag size={18} /> Add recent purchases?
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {shoppingSuggestions.map(item => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ flex: 1, fontSize: '14px' }}>{item.name}</span>
                                <input
                                    type="number"
                                    placeholder="₹"
                                    value={suggestionAmounts[item.id] || ''}
                                    onChange={(e) => setSuggestionAmounts({ ...suggestionAmounts, [item.id]: e.target.value })}
                                    style={{ width: '80px', padding: '6px', borderRadius: '4px', border: '1px solid #ddd' }}
                                />
                                <button
                                    onClick={() => {
                                        if (suggestionAmounts[item.id]) {
                                            addTransactionFromSuggestion(item, suggestionAmounts[item.id]);
                                            setSuggestionAmounts({ ...suggestionAmounts, [item.id]: '' });
                                        }
                                    }}
                                    disabled={!suggestionAmounts[item.id]}
                                    style={{ padding: '6px 12px', background: '#45b7d1', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    Add
                                </button>
                                <button onClick={() => markAddedToExpenses(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}><X size={16} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Weekly Chart */}
            {showGraph && (
                <div style={{ marginBottom: '24px', animation: 'fadeIn 0.3s ease' }}>
                    <WeeklyChart
                        transactions={transactions}
                        categories={cards}
                        onClose={() => setShowGraph(false)}
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

            {/* EXPENSE CARDS GRID */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#2d3748', margin: 0 }}>Categories</h3>
                    <button
                        onClick={() => setShowAddCardModal(true)}
                        style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: '#edf2f7',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: '#718096',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'scale(1.1)';
                            e.currentTarget.style.background = '#e2e8f0';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.background = '#edf2f7';
                        }}
                    >
                        <Plus size={18} />
                    </button>
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                    gap: '12px'
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

            {/* MODALS */}
            {selectedCard && (
                <ExpenseCardDetail
                    card={selectedCard}
                    onClose={() => setSelectedCard(null)}
                />
            )}


            {/* Create Category Modal */}
            <Modal
                isOpen={showAddCardModal}
                onClose={() => setShowAddCardModal(false)}
                title="Create Category"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <input
                        type="text"
                        placeholder="Name (e.g. Groceries)"
                        value={newCard.name}
                        onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(255,255,255,0.5)',
                            fontSize: '16px',
                        }}
                        autoFocus
                    />

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            fontSize: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(255,255,255,0.5)',
                            borderRadius: '12px',
                            border: '1px solid var(--glass-border)'
                        }}>
                            {newCard.icon}
                        </div>

                        <div style={{
                            flex: 1,
                            height: '48px',
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: '12px',
                            fontSize: '14px',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(255,255,255,0.3)',
                            fontStyle: 'italic'
                        }}>
                            Color will be auto-generated
                        </div>
                    </div>

                    {/* Emoji Picker Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: '8px',
                        padding: '12px',
                        background: 'rgba(255,255,255,0.3)',
                        borderRadius: 'var(--radius-sm)',
                        maxHeight: '150px',
                        overflowY: 'auto'
                    }}>
                        {EMOJI_LIST.map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => setNewCard({ ...newCard, icon: emoji })}
                                style={{
                                    border: 'none',
                                    background: newCard.icon === emoji ? 'rgba(255,255,255,0.8)' : 'transparent',
                                    borderRadius: '8px',
                                    fontSize: '20px',
                                    padding: '8px',
                                    cursor: 'pointer',
                                    boxShadow: newCard.icon === emoji ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
                                    transform: newCard.icon === emoji ? 'scale(1.1)' : 'scale(1)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>

                    <input
                        type="number"
                        placeholder="Monthly Budget (₹)"
                        value={newCard.budget}
                        onChange={(e) => setNewCard({ ...newCard, budget: e.target.value })}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(255,255,255,0.5)',
                            fontSize: '16px',
                        }}
                    />

                    <button
                        onClick={handleAddCard}
                        disabled={!newCard.name}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: newCard.name ? 'var(--text-primary)' : 'rgba(0,0,0,0.1)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: '600',
                            fontSize: '16px',
                            cursor: newCard.name ? 'pointer' : 'not-allowed',
                            marginTop: '8px'
                        }}
                    >
                        Create Category
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default Expenses;
