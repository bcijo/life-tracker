import React, { useState } from 'react';
import { Plus, ArrowUpRight, ArrowDownLeft, DollarSign, Trash2, TrendingUp, X, ChevronDown, ShoppingBag } from 'lucide-react';
import useTransactions from '../hooks/useTransactions';
import useCategories from '../hooks/useCategories';
import useShopping from '../hooks/useShopping';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const DEFAULT_CATEGORIES = [
    { id: 'food', name: 'Food & Dining', color: '#ff6b6b', type: 'expense' },
    { id: 'transport', name: 'Transportation', color: '#4ecdc4', type: 'expense' },
    { id: 'shopping', name: 'Shopping', color: '#45b7d1', type: 'expense' },
    { id: 'entertainment', name: 'Entertainment', color: '#f9ca24', type: 'expense' },
    { id: 'bills', name: 'Bills & Utilities', color: '#95afc0', type: 'expense' },
    { id: 'health', name: 'Health', color: '#eb4d4b', type: 'expense' },
    { id: 'salary', name: 'Salary', color: '#6ab04c', type: 'income' },
    { id: 'other', name: 'Other', color: '#686de0', type: 'both' },
];

const Expenses = () => {
    const { transactions, loading: transactionsLoading, addTransaction: addTransactionDb, deleteTransaction: deleteTransactionDb } = useTransactions();
    const { categories, loading: categoriesLoading, addCategory: addCategoryDb } = useCategories();
    const { items: shoppingItems, markAddedToExpenses } = useShopping();

    const [showForm, setShowForm] = useState(false);
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('expense');
    const [selectedCategory, setSelectedCategory] = useState('food');
    const [newCategoryName, setNewCategoryName] = useState('');

    const addTransaction = async (e) => {
        e.preventDefault();
        if (!amount || !description) return;

        await addTransactionDb({
            amount,
            description,
            type,
            category: selectedCategory,
            date: new Date().toISOString(),
        });

        setAmount('');
        setDescription('');
        setShowForm(false);
    };

    const addTransactionFromSuggestion = async (item, price) => {
        await addTransactionDb({
            amount: price,
            description: item.name,
            type: 'expense',
            category: 'shopping',
            date: new Date().toISOString(),
        });

        // Mark item as added to expenses
        await markAddedToExpenses(item.id);
    };

    const dismissSuggestion = async (itemId) => {
        await markAddedToExpenses(itemId);
    };

    const addCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        const categoryId = Date.now().toString();
        await addCategoryDb(
            categoryId,
            newCategoryName,
            `hsl(${Math.random() * 360}, 70%, 60%)`,
            'both'
        );

        setNewCategoryName('');
        setShowCategoryForm(false);
    };

    const deleteTransaction = async (id) => {
        await deleteTransactionDb(id);
    };

    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);

    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);

    const balance = income - expense;

    // Analytics data
    const categoryData = categories
        .filter(cat => cat.type === 'expense' || cat.type === 'both')
        .map(cat => {
            const total = transactions
                .filter(t => t.type === 'expense' && t.category === cat.id)
                .reduce((acc, t) => acc + t.amount, 0);
            return { name: cat.name, value: total, color: cat.color };
        })
        .filter(item => item.value > 0);

    const availableCategories = categories.filter(cat =>
        cat.type === type || cat.type === 'both'
    );

    const selectedCategoryObj = availableCategories.find(cat => cat.id === selectedCategory);

    // Shopping suggestions
    const shoppingSuggestions = shoppingItems.filter(item =>
        item.isBought && !item.addedToExpenses
    );

    const [suggestionAmounts, setSuggestionAmounts] = useState({});

    return (
        <div className="page-container">
            <header style={{ marginBottom: '24px' }}>
                <h1>Expenses</h1>
            </header>

            {/* Shopping Suggestions */}
            {shoppingSuggestions.length > 0 && (
                <div className="glass-card" style={{ padding: '16px', marginBottom: '24px', background: 'linear-gradient(135deg, rgba(69, 183, 209, 0.15) 0%, rgba(69, 183, 209, 0.05) 100%)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <ShoppingBag size={18} style={{ color: '#45b7d1' }} />
                        <h3 style={{ fontSize: '14px', fontWeight: '600' }}>Add expenses for bought items?</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {shoppingSuggestions.map(item => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: 'rgba(255,255,255,0.3)', borderRadius: 'var(--radius-sm)' }}>
                                <span style={{ flex: 1, fontSize: '14px' }}>{item.name}</span>
                                <input
                                    type="number"
                                    placeholder="₹"
                                    step="0.01"
                                    value={suggestionAmounts[item.id] || ''}
                                    onChange={(e) => setSuggestionAmounts({ ...suggestionAmounts, [item.id]: e.target.value })}
                                    style={{
                                        width: '80px',
                                        padding: '6px 8px',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'rgba(255,255,255,0.8)',
                                        fontSize: '14px',
                                    }}
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
                                        background: suggestionAmounts[item.id] ? '#45b7d1' : 'rgba(0,0,0,0.1)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        cursor: suggestionAmounts[item.id] ? 'pointer' : 'not-allowed',
                                    }}
                                >
                                    Add
                                </button>
                                <button
                                    onClick={() => dismissSuggestion(item.id)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-secondary)',
                                        padding: '4px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Balance Card */}
            <div className="glass-card" style={{ padding: '24px', marginBottom: '24px', background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 100%)' }}>
                <p style={{ fontSize: '14px', opacity: 0.7, marginBottom: '8px' }}>Total Balance</p>
                <h2 style={{ fontSize: '32px', marginBottom: '24px' }}>₹{balance.toFixed(2)}</h2>

                <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(72, 187, 120, 0.2)', color: '#48bb78', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ArrowDownLeft size={18} />
                        </div>
                        <div>
                            <p style={{ fontSize: '12px', opacity: 0.7 }}>Income</p>
                            <p style={{ fontWeight: '600' }}>₹{income.toFixed(2)}</p>
                        </div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(245, 101, 101, 0.2)', color: '#f56565', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ArrowUpRight size={18} />
                        </div>
                        <div>
                            <p style={{ fontSize: '12px', opacity: 0.7 }}>Expense</p>
                            <p style={{ fontWeight: '600' }}>₹{expense.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Analytics Chart */}
            {categoryData.length > 0 && (
                <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <TrendingUp size={20} />
                        <h3>Spending by Category</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={categoryData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {categoryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px', justifyContent: 'center' }}>
                        {categoryData.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: item.color }}></div>
                                <span>{item.name}: ₹{item.value.toFixed(0)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add Button */}
            <button
                onClick={() => setShowForm(!showForm)}
                style={{
                    width: '100%',
                    padding: '16px',
                    background: 'var(--text-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: '600',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                }}
            >
                <Plus size={20} />
                Add Transaction
            </button>

            {showForm && (
                <form onSubmit={addTransaction} className="glass-panel" style={{ padding: '16px', marginBottom: '24px', position: 'relative' }}>
                    {/* Close Button */}
                    <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: 'rgba(0,0,0,0.1)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                        }}
                    >
                        <X size={16} />
                    </button>

                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                        <button
                            type="button"
                            onClick={() => setType('expense')}
                            style={{
                                flex: 1,
                                padding: '8px',
                                borderRadius: 'var(--radius-sm)',
                                border: 'none',
                                background: type === 'expense' ? '#f56565' : 'rgba(0,0,0,0.05)',
                                color: type === 'expense' ? '#fff' : 'var(--text-primary)',
                                transition: 'var(--transition-fast)',
                            }}
                        >
                            Expense
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('income')}
                            style={{
                                flex: 1,
                                padding: '8px',
                                borderRadius: 'var(--radius-sm)',
                                border: 'none',
                                background: type === 'income' ? '#48bb78' : 'rgba(0,0,0,0.05)',
                                color: type === 'income' ? '#fff' : 'var(--text-primary)',
                                transition: 'var(--transition-fast)',
                            }}
                        >
                            Income
                        </button>
                    </div>

                    {/* Custom Dropdown */}
                    <div style={{ position: 'relative', marginBottom: '12px' }}>
                        <button
                            type="button"
                            onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid var(--glass-border)',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(255,255,255,0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                color: 'var(--text-primary)',
                                fontSize: '16px',
                            }}
                        >
                            <span>{selectedCategoryObj?.name || 'Select Category'}</span>
                            <ChevronDown size={18} style={{ opacity: 0.6 }} />
                        </button>

                        {showCategoryDropdown && (
                            <div
                                className="glass-panel"
                                style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    marginTop: '4px',
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    zIndex: 10,
                                    padding: '4px',
                                }}
                            >
                                {availableCategories.map(cat => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedCategory(cat.id);
                                            setShowCategoryDropdown(false);
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            border: 'none',
                                            background: selectedCategory === cat.id ? 'rgba(0,0,0,0.1)' : 'transparent',
                                            borderRadius: 'var(--radius-sm)',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s',
                                            color: 'var(--text-primary)',
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = selectedCategory === cat.id ? 'rgba(0,0,0,0.1)' : 'transparent'}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Amount"
                        step="0.01"
                        style={{
                            width: '100%',
                            padding: '12px',
                            marginBottom: '12px',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(255,255,255,0.5)',
                        }}
                        autoFocus
                    />
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Description"
                        style={{
                            width: '100%',
                            padding: '12px',
                            marginBottom: '12px',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(255,255,255,0.5)',
                        }}
                    />
                    <button
                        type="submit"
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: 'var(--text-primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: '600',
                        }}
                    >
                        Save
                    </button>
                </form>
            )}

            {/* Category Management */}
            <button
                onClick={() => setShowCategoryForm(!showCategoryForm)}
                style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.3)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    fontWeight: '500',
                    marginBottom: '24px',
                    fontSize: '14px',
                }}
            >
                + Add Custom Category
            </button>

            {showCategoryForm && (
                <form onSubmit={addCategory} className="glass-panel" style={{ padding: '16px', marginBottom: '24px', position: 'relative' }}>
                    {/* Close Button */}
                    <button
                        type="button"
                        onClick={() => setShowCategoryForm(false)}
                        style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            background: 'rgba(0,0,0,0.1)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)',
                        }}
                    >
                        <X size={16} />
                    </button>

                    <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="Category name"
                        style={{
                            width: '100%',
                            padding: '12px',
                            marginBottom: '12px',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(255,255,255,0.5)',
                        }}
                        autoFocus
                    />
                    <button
                        type="submit"
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: 'var(--text-primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: '600',
                        }}
                    >
                        Add Category
                    </button>
                </form>
            )}

            {/* Transactions List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '16px', opacity: 0.8 }}>Recent Activity</h3>
                {transactions.map(t => {
                    const category = categories.find(c => c.id === t.category);
                    return (
                        <div
                            key={t.id}
                            className="glass-card"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '16px',
                                justifyContent: 'space-between',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: category ? category.color : '#ccc',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                    }}
                                >
                                    <DollarSign size={20} />
                                </div>
                                <div>
                                    <p style={{ fontWeight: '500' }}>{t.description}</p>
                                    <p style={{ fontSize: '12px', opacity: 0.6 }}>
                                        {category?.name || 'Other'} • {new Date(t.date).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontWeight: '600', color: t.type === 'income' ? '#48bb78' : '#f56565' }}>
                                    {t.type === 'income' ? '+' : '-'}₹{t.amount.toFixed(2)}
                                </span>
                                <button
                                    onClick={() => deleteTransaction(t.id)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-secondary)',
                                        opacity: 0.3,
                                        padding: '4px',
                                    }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {transactions.length === 0 && (
                    <p style={{ textAlign: 'center', opacity: 0.5, padding: '20px' }}>No transactions yet.</p>
                )}
            </div>
        </div>
    );
};

export default Expenses;
