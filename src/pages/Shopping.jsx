import React, { useState, useEffect } from 'react';
import { ArrowRight, Trash2, Check, ChevronDown, ChevronUp, ShoppingBag, DollarSign, X, Plus } from 'lucide-react';
import useShopping from '../hooks/useShopping';
import useExpenseCards from '../hooks/useExpenseCards';
import useTransactions from '../hooks/useTransactions';
import CurrencyInput from '../components/CurrencyInput';
import { format, parseISO } from 'date-fns';

const Shopping = () => {
    const { items, loading, addItem: addItemDb, toggleBought: toggleBoughtDb, deleteItem: deleteItemDb, markAddedToExpenses } = useShopping();
    const { cards: categories, loading: cardsLoading, fetchSubcategories, addSubcategory } = useExpenseCards();
    const { addTransaction } = useTransactions();

    const [newItemName, setNewItemName] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [showCompleted, setShowCompleted] = useState(false);

    // Expense prompt state
    const [expensePromptItem, setExpensePromptItem] = useState(null);
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseSubcategories, setExpenseSubcategories] = useState([]);
    const [selectedSubcategory, setSelectedSubcategory] = useState('');
    const [showSubcategoryInput, setShowSubcategoryInput] = useState(false);
    const [newSubcategoryName, setNewSubcategoryName] = useState('');

    // Set default category once cards load
    React.useEffect(() => {
        if (categories.length > 0 && !selectedCategory) {
            setSelectedCategory(categories[0].id);
        }
    }, [categories, selectedCategory]);

    const addItem = async (e) => {
        e.preventDefault();
        if (!newItemName.trim()) return;

        await addItemDb(newItemName, selectedCategory);
        setNewItemName('');
    };

    const toggleItem = async (id) => {
        const item = items.find(i => i.id === id);
        if (!item) return;

        await toggleBoughtDb(id);

        // If marking as bought, show expense prompt and load subcategories
        if (!item.is_bought) {
            setExpensePromptItem(item);
            setExpenseAmount('');
            setSelectedSubcategory('');
            setShowSubcategoryInput(false);
            setNewSubcategoryName('');

            // Load subcategories for this item's category
            if (item.category) {
                const subs = await fetchSubcategories(item.category);
                setExpenseSubcategories(subs || []);
            }
        }
    };

    const handleAddSubcategory = async () => {
        if (!newSubcategoryName.trim() || !expensePromptItem) return;
        const newSub = await addSubcategory(expensePromptItem.category, newSubcategoryName);
        if (newSub) {
            setExpenseSubcategories([...expenseSubcategories, newSub]);
            setNewSubcategoryName('');
            setShowSubcategoryInput(false);
            setSelectedSubcategory(newSub.id);
        }
    };

    const handleAddExpense = async () => {
        if (!expensePromptItem || !expenseAmount) return;

        await addTransaction({
            amount: parseFloat(expenseAmount),
            description: expensePromptItem.name,
            type: 'expense',
            category: expensePromptItem.category,
            card_id: expensePromptItem.category,
            subcategory_id: selectedSubcategory || null,
            date: new Date().toISOString(),
        });

        await markAddedToExpenses(expensePromptItem.id);
        setExpensePromptItem(null);
        setExpenseAmount('');
        setExpenseSubcategories([]);
        setSelectedSubcategory('');
    };

    const handleSkipExpense = () => {
        setExpensePromptItem(null);
        setExpenseAmount('');
        setExpenseSubcategories([]);
        setSelectedSubcategory('');
    };

    const deleteItem = async (id) => {
        await deleteItemDb(id);
    };

    // Grouping Logic
    const activeItems = items.filter(i => !i.is_bought);
    const boughtItems = items.filter(i => i.is_bought).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Group bought items by month
    const boughtByMonth = boughtItems.reduce((acc, item) => {
        const date = item.created_at ? parseISO(item.created_at) : new Date();
        const monthKey = format(date, 'MMMM yyyy');
        if (!acc[monthKey]) acc[monthKey] = [];
        acc[monthKey].push(item);
        return acc;
    }, {});

    const getCategoryDisplay = (categoryId) => {
        const cat = categories.find(c => c.id === categoryId);
        return cat ? { name: cat.name, color: cat.color, icon: cat.icon } : { name: 'Other', color: '#ccc', icon: '📦' };
    };

    const renderItem = (item, isBought) => {
        const category = getCategoryDisplay(item.category);

        return (
            <div
                key={item.id}
                className="glass-card"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px',
                    gap: '12px',
                    opacity: isBought ? 0.6 : 1,
                    background: isBought ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.6)',
                }}
            >
                <button
                    onClick={() => toggleItem(item.id)}
                    style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        border: isBought ? 'none' : '2px solid var(--text-secondary)',
                        background: isBought ? '#48bb78' : 'transparent',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        flexShrink: 0,
                        cursor: 'pointer'
                    }}
                >
                    {isBought && <Check size={16} />}
                </button>
                <div style={{ flex: 1 }}>
                    <span style={{
                        fontSize: '16px',
                        display: 'block',
                        textDecoration: isBought ? 'line-through' : 'none',
                        color: isBought ? 'var(--text-secondary)' : 'var(--text-primary)'
                    }}>
                        {item.name}
                    </span>
                    <span style={{ fontSize: '12px', color: category.color, fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{category.icon}</span> {category.name}
                    </span>
                </div>
                <button
                    onClick={() => deleteItem(item.id)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        opacity: 0.5,
                        padding: '4px',
                        cursor: 'pointer'
                    }}
                >
                    <Trash2 size={18} />
                </button>
            </div>
        );
    };

    if (cardsLoading) {
        return <div className="page-container" style={{ paddingBottom: '90px' }}>Loading...</div>;
    }

    return (
        <div className="page-container" style={{ paddingBottom: '90px' }}>
            <header style={{ marginBottom: '24px' }}>
                <h1>Shopping List</h1>
                <p style={{ opacity: 0.7 }}>{activeItems.length} items to buy</p>
            </header>

            {/* Expense Prompt Modal */}
            {expensePromptItem && (
                <div className="glass-card" style={{
                    padding: '16px',
                    marginBottom: '16px',
                    background: 'linear-gradient(135deg, rgba(72, 187, 120, 0.15) 0%, rgba(72, 187, 120, 0.05) 100%)',
                    border: '1px solid rgba(72, 187, 120, 0.3)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <DollarSign size={18} color="#48bb78" />
                        <span style={{ fontWeight: '600', fontSize: '14px' }}>
                            Add "{expensePromptItem.name}" to expenses?
                        </span>
                    </div>

                    {/* Subcategory Selection */}
                    {expenseSubcategories.length > 0 || true ? (
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>
                                Subcategory
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {expenseSubcategories.map(sub => (
                                    <button
                                        key={sub.id}
                                        type="button"
                                        onClick={() => setSelectedSubcategory(selectedSubcategory === sub.id ? '' : sub.id)}
                                        style={{
                                            padding: '6px 10px',
                                            borderRadius: '16px',
                                            border: selectedSubcategory === sub.id ? '2px solid #48bb78' : '1px solid #ddd',
                                            background: selectedSubcategory === sub.id ? 'rgba(72, 187, 120, 0.15)' : '#fff',
                                            color: selectedSubcategory === sub.id ? '#48bb78' : '#666',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            fontWeight: '500',
                                        }}
                                    >
                                        {sub.name}
                                    </button>
                                ))}

                                {showSubcategoryInput ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <input
                                            type="text"
                                            value={newSubcategoryName}
                                            onChange={(e) => setNewSubcategoryName(e.target.value)}
                                            placeholder="New..."
                                            style={{
                                                padding: '6px 10px',
                                                borderRadius: '16px',
                                                border: '1px solid #ddd',
                                                fontSize: '12px',
                                                width: '80px'
                                            }}
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddSubcategory();
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddSubcategory}
                                            style={{
                                                background: '#48bb78',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '50%',
                                                width: '22px',
                                                height: '22px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            <Plus size={12} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowSubcategoryInput(false);
                                                setNewSubcategoryName('');
                                            }}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: '#999',
                                                cursor: 'pointer',
                                                padding: '2px'
                                            }}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setShowSubcategoryInput(true)}
                                        style={{
                                            padding: '6px 10px',
                                            borderRadius: '16px',
                                            border: '1px dashed #bbb',
                                            background: 'transparent',
                                            color: '#888',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <Plus size={12} /> Add
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : null}

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <CurrencyInput
                            value={expenseAmount}
                            onChange={(val) => setExpenseAmount(val)}
                            placeholder="Price"
                            autoFocus={!showSubcategoryInput}
                            style={{ flex: 1 }}
                            inputStyle={{
                                padding: '10px 10px 10px 28px',
                                fontSize: '16px',
                            }}
                        />
                        <button
                            onClick={handleAddExpense}
                            disabled={!expenseAmount}
                            style={{
                                padding: '10px 16px',
                                background: expenseAmount ? '#48bb78' : '#ccc',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: expenseAmount ? 'pointer' : 'not-allowed'
                            }}
                        >
                            Add
                        </button>
                        <button
                            onClick={handleSkipExpense}
                            style={{
                                padding: '10px',
                                background: 'transparent',
                                border: 'none',
                                color: '#666',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}

            <form onSubmit={addItem} style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Add item (e.g., Milk)"
                        className="glass-panel"
                        style={{
                            flex: 1,
                            padding: '16px',
                            border: 'none',
                            outline: 'none',
                            fontSize: '16px',
                            color: 'var(--text-primary)',
                            borderRadius: 'var(--radius-lg)',
                        }}
                    />
                    <button
                        type="submit"
                        style={{
                            background: 'var(--text-primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--radius-lg)',
                            width: '56px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <ArrowRight size={24} />
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedCategory(cat.id)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: 'none',
                                background: selectedCategory === cat.id ? cat.color : 'rgba(255,255,255,0.5)',
                                color: selectedCategory === cat.id ? '#fff' : 'var(--text-primary)',
                                fontSize: '14px',
                                fontWeight: '500',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <span>{cat.icon}</span> {cat.name}
                        </button>
                    ))}
                </div>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeItems.map(item => renderItem(item, false))}

                {activeItems.length === 0 && boughtItems.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                        <ShoppingBag size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <p>Your shopping list is empty.</p>
                    </div>
                )}
            </div>

            {/* Completed Items Section */}
            {boughtItems.length > 0 && (
                <div style={{ marginTop: '32px' }}>
                    <button
                        onClick={() => setShowCompleted(!showCompleted)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            padding: '8px 0',
                            width: '100%'
                        }}
                    >
                        {showCompleted ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        Completed ({boughtItems.length})
                    </button>

                    {showCompleted && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '16px' }}>
                            {Object.entries(boughtByMonth).map(([month, items]) => (
                                <div key={month}>
                                    <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '12px', letterSpacing: '1px' }}>
                                        {month}
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {items.map(item => renderItem(item, true))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Shopping;
