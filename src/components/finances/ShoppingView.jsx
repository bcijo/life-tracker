import React, { useState, useEffect, useRef } from 'react';
import { 
    Plus, Trash2, Check, ChevronDown, ChevronUp, ShoppingBag, 
    DollarSign, X, ArrowRight, Sparkles, CheckCircle2, Circle, 
    Tag, Clock, AlertCircle, TrendingUp, Layers
} from 'lucide-react';
import useShopping from '../../hooks/useShopping';
import useExpenseCards from '../../hooks/useExpenseCards';
import useTransactions from '../../hooks/useTransactions';
import CurrencyInput from '../CurrencyInput';
import AppLoader from '../common/AppLoader';
import Modal from '../Modal';
import { CategoryIcon } from '../../utils/categoryIcons';
import { format, parseISO } from 'date-fns';

const QUICK_SUGGESTIONS = [
    { name: 'Milk & Dairy', category: 'groceries' },
    { name: 'Fresh Fruits', category: 'groceries' },
    { name: 'Coffee', category: 'food' },
    { name: 'Toiletries', category: 'lifestyle' },
    { name: 'Snacks', category: 'food' }
];

const ShoppingView = () => {
    const { items, loading, addItem: addItemDb, toggleBought: toggleBoughtDb, deleteItem: deleteItemDb, markAddedToExpenses } = useShopping();
    const { cards: categories, loading: cardsLoading, fetchSubcategories, addSubcategory } = useExpenseCards();
    const { addTransaction } = useTransactions();

    const [newItemName, setNewItemName] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [showCompleted, setShowCompleted] = useState(false);

    // Expense conversion prompt modal state
    const [expensePromptItem, setExpensePromptItem] = useState(null);
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseSubcategories, setExpenseSubcategories] = useState([]);
    const [selectedSubcategory, setSelectedSubcategory] = useState('');
    const [showSubcategoryInput, setShowSubcategoryInput] = useState(false);
    const [newSubcategoryName, setNewSubcategoryName] = useState('');
    const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

    const amountInputRef = useRef(null);

    // Set default category once cards load
    useEffect(() => {
        if (categories.length > 0 && !selectedCategory) {
            setSelectedCategory(categories[0].id);
        }
    }, [categories, selectedCategory]);

    const activeCategoryObj = categories.find(c => c.id === selectedCategory) || categories[0];
    const activeColor = activeCategoryObj?.color || '#10b981';

    const addItem = async (e) => {
        if (e) e.preventDefault();
        if (!newItemName.trim()) return;

        await addItemDb(newItemName.trim(), selectedCategory || categories[0]?.id);
        setNewItemName('');
    };

    const handleQuickAdd = async (suggestion) => {
        const matchingCat = categories.find(c => c.id.toLowerCase().includes(suggestion.category) || c.name.toLowerCase().includes(suggestion.category)) || categories[0];
        await addItemDb(suggestion.name, matchingCat?.id || categories[0]?.id);
    };

    const toggleItem = async (id) => {
        const item = items.find(i => i.id === id);
        if (!item) return;

        await toggleBoughtDb(id);

        // If marking as bought, open the dark-luxe expense conversion modal
        if (!item.is_bought) {
            setExpensePromptItem(item);
            setExpenseAmount('');
            setSelectedSubcategory('');
            setShowSubcategoryInput(false);
            setNewSubcategoryName('');

            if (item.category) {
                const subs = await fetchSubcategories(item.category);
                setExpenseSubcategories(subs || []);
            }
            setTimeout(() => amountInputRef.current?.focus(), 150);
        }
    };

    const handleAddSubcategory = async () => {
        if (!newSubcategoryName.trim() || !expensePromptItem) return;
        const newSub = await addSubcategory(expensePromptItem.category, newSubcategoryName.trim());
        if (newSub) {
            setExpenseSubcategories([...expenseSubcategories, newSub]);
            setNewSubcategoryName('');
            setShowSubcategoryInput(false);
            setSelectedSubcategory(newSub.id);
        }
    };

    const handleAddExpense = async (e) => {
        if (e) e.preventDefault();
        if (!expensePromptItem || !expenseAmount || parseFloat(expenseAmount) <= 0 || isSubmittingExpense) return;

        setIsSubmittingExpense(true);
        try {
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
        } finally {
            setIsSubmittingExpense(false);
        }
    };

    const handleSkipExpense = () => {
        setExpensePromptItem(null);
        setExpenseAmount('');
        setExpenseSubcategories([]);
        setSelectedSubcategory('');
    };

    const deleteItem = async (id, e) => {
        if (e) e.stopPropagation();
        await deleteItemDb(id);
    };

    // Grouping
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
        return cat ? { name: cat.name, color: cat.color || '#10b981', icon: cat.icon } : { name: 'General', color: '#10b981', icon: 'shopping-bag' };
    };

    if (cardsLoading || loading) {
        return (
            <div className="finances-subview" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}>
                <AppLoader variant="section" size="normal" message="Loading shopping list..." />
            </div>
        );
    }

    const styles = `
        .qsp-amount-input::-webkit-inner-spin-button,
        .qsp-amount-input::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        .qsp-amount-input[type=number] {
            -moz-appearance: textfield;
        }
        .qsp-amount-input,
        .qsp-amount-input:focus,
        .qsp-amount-input:focus-visible,
        .qsp-amount-input:active {
            outline: none !important;
            border: none !important;
            border-color: transparent !important;
            box-shadow: none !important;
            background: transparent !important;
        }
        .qsp-amount-input::placeholder {
            color: rgba(255,255,255,0.18);
        }
        .qsp-item-row:hover .qsp-delete-btn {
            opacity: 1 !important;
            transform: translateX(0) !important;
        }
    `;

    return (
        <div className="finances-subview" style={{ animation: 'fadeIn 0.3s ease' }}>
            <style>{styles}</style>

            {/* Compact Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                    Shopping List
                </h2>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    background: activeItems.length > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${activeItems.length > 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                    color: activeItems.length > 0 ? '#10b981' : 'var(--text-muted)',
                    fontSize: '11px',
                    fontWeight: '700'
                }}>
                    <ShoppingBag size={12} />
                    <span>{activeItems.length} to buy</span>
                </div>
            </div>

            {/* Compact Quick Add Card */}
            <form
                onSubmit={addItem}
                style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    padding: '12px',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    marginBottom: '14px'
                }}
            >
                {/* Input Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        background: `color-mix(in srgb, ${activeColor} 20%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${activeColor} 35%, transparent)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: activeColor,
                        flexShrink: 0
                    }}>
                        <CategoryIcon icon={activeCategoryObj?.icon} name={activeCategoryObj?.name} color={activeColor} size={16} />
                    </div>

                    <input
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Add item..."
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            fontSize: '14px',
                            fontWeight: '500',
                            color: 'var(--text-primary)',
                            fontFamily: 'inherit',
                            padding: '4px 0'
                        }}
                    />

                    <button
                        type="submit"
                        disabled={!newItemName.trim()}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '10px',
                            background: newItemName.trim()
                                ? `linear-gradient(135deg, ${activeColor}, color-mix(in srgb, ${activeColor} 70%, #000))`
                                : 'rgba(255, 255, 255, 0.05)',
                            border: newItemName.trim() ? `1px solid color-mix(in srgb, ${activeColor} 80%, rgba(255,255,255,0.3))` : '1px solid rgba(255, 255, 255, 0.06)',
                            color: '#ffffff',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: newItemName.trim() ? 'pointer' : 'not-allowed',
                            opacity: newItemName.trim() ? 1 : 0.4,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: newItemName.trim() ? `0 4px 14px color-mix(in srgb, ${activeColor} 30%, transparent)` : 'none',
                            transition: 'all 0.2s ease',
                            flexShrink: 0
                        }}
                    >
                        <Plus size={14} />
                        <span>Add</span>
                    </button>
                </div>

                {/* Categories Row */}
                <div style={{
                    display: 'flex',
                    gap: '5px',
                    overflowX: 'auto',
                    paddingBottom: '2px',
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'none'
                }}>
                    {categories.map(cat => {
                        const isSelected = selectedCategory === cat.id;
                        const catColor = cat.color || '#10b981';
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setSelectedCategory(cat.id)}
                                style={{
                                    flex: '0 0 auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '4px 10px',
                                    borderRadius: '10px',
                                    border: isSelected ? `1.5px solid ${catColor}` : '1px solid rgba(255, 255, 255, 0.06)',
                                    background: isSelected ? `color-mix(in srgb, ${catColor} 22%, transparent)` : 'rgba(255, 255, 255, 0.02)',
                                    color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                                    fontSize: '11px',
                                    fontWeight: isSelected ? '700' : '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    boxShadow: isSelected ? `0 2px 8px color-mix(in srgb, ${catColor} 20%, transparent)` : 'none'
                                }}
                            >
                                <CategoryIcon icon={cat.icon} name={cat.name} color={isSelected ? catColor : 'var(--text-muted)'} size={12} />
                                <span>{cat.name}</span>
                            </button>
                        );
                    })}
                </div>
            </form>

            {/* Active Items Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeItems.map(item => {
                    const category = getCategoryDisplay(item.category);
                    return (
                        <div
                            key={item.id}
                            className="qsp-item-row"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 14px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.07)',
                                borderRadius: '14px',
                                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                {/* Checkbox */}
                                <button
                                    type="button"
                                    onClick={() => toggleItem(item.id)}
                                    style={{
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '7px',
                                        border: '1.5px solid rgba(255, 255, 255, 0.25)',
                                        background: 'transparent',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: 0,
                                        flexShrink: 0,
                                        cursor: 'pointer'
                                    }}
                                    title="Mark as bought"
                                >
                                    <Check size={12} style={{ opacity: 0 }} />
                                </button>

                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <span style={{
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        display: 'block',
                                        color: 'var(--text-primary)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        {item.name}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            fontSize: '10px',
                                            fontWeight: '600',
                                            color: category.color,
                                            padding: '1px 6px',
                                            borderRadius: '6px',
                                            background: `color-mix(in srgb, ${category.color} 14%, transparent)`
                                        }}>
                                            <CategoryIcon icon={category.icon} name={category.name} color={category.color} size={10} />
                                            <span>{category.name}</span>
                                        </span>
                                        {item.created_at && (
                                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                                • {format(parseISO(item.created_at), 'MMM d')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                    type="button"
                                    onClick={() => toggleItem(item.id)}
                                    style={{
                                        padding: '4px 8px',
                                        borderRadius: '8px',
                                        background: 'rgba(16, 185, 129, 0.1)',
                                        border: '1px solid rgba(16, 185, 129, 0.25)',
                                        color: '#10b981',
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                    }}
                                >
                                    <Check size={11} />
                                    <span>Got it</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={(e) => deleteItem(item.id, e)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        opacity: 0.5,
                                        padding: '4px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Delete item"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {/* Compact Empty State */}
                {activeItems.length === 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '24px 16px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px dashed rgba(255, 255, 255, 0.08)',
                        borderRadius: '16px',
                        color: 'var(--text-secondary)'
                    }}>
                        <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '12px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#10b981',
                            margin: '0 auto 8px auto'
                        }}>
                            <ShoppingBag size={18} />
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                            All caught up!
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 10px 0' }}>
                            Quick ideas to add:
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px', maxWidth: '340px', margin: '0 auto' }}>
                            {QUICK_SUGGESTIONS.map(s => (
                                <button
                                    key={s.name}
                                    type="button"
                                    onClick={() => handleQuickAdd(s)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        padding: '5px 10px',
                                        borderRadius: '10px',
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        color: 'var(--text-primary)',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Plus size={11} color="#10b981" />
                                    <span>{s.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Completed Purchased Items Accordion */}
            {boughtItems.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                    <button
                        type="button"
                        onClick={() => setShowCompleted(!showCompleted)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '12px',
                            padding: '8px 12px',
                            color: 'var(--text-secondary)',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            width: '100%'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle2 size={13} color="#10b981" />
                            <span>Completed ({boughtItems.length})</span>
                        </div>
                        {showCompleted ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {showCompleted && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
                            {Object.entries(boughtByMonth).map(([month, itemsList]) => (
                                <div key={month}>
                                    <div style={{
                                        fontSize: '10px',
                                        fontWeight: '700',
                                        textTransform: 'uppercase',
                                        color: 'var(--text-muted)',
                                        marginBottom: '6px',
                                        letterSpacing: '0.6px',
                                        paddingLeft: '2px'
                                    }}>
                                        {month}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {itemsList.map(item => {
                                            const category = getCategoryDisplay(item.category);
                                            return (
                                                <div
                                                    key={item.id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '10px 12px',
                                                        background: 'rgba(255, 255, 255, 0.015)',
                                                        border: '1px solid rgba(255, 255, 255, 0.04)',
                                                        borderRadius: '12px',
                                                        opacity: 0.55
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleItem(item.id)}
                                                            style={{
                                                                width: '18px',
                                                                height: '18px',
                                                                borderRadius: '5px',
                                                                border: 'none',
                                                                background: '#10b981',
                                                                color: '#fff',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                padding: 0,
                                                                cursor: 'pointer'
                                                            }}
                                                            title="Uncheck item"
                                                        >
                                                            <Check size={11} />
                                                        </button>
                                                        <div>
                                                            <span style={{
                                                                fontSize: '13px',
                                                                textDecoration: 'line-through',
                                                                color: 'var(--text-secondary)'
                                                            }}>
                                                                {item.name}
                                                            </span>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px', fontSize: '10px', color: 'var(--text-muted)' }}>
                                                                <span>{category.name}</span>
                                                                {item.added_to_expenses && (
                                                                    <span style={{ color: '#10b981', fontWeight: '600' }}>• In expenses</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={(e) => deleteItem(item.id, e)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--text-muted)',
                                                            opacity: 0.4,
                                                            padding: '2px',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Dark-Luxe Expense Conversion Stepped Modal */}
            <Modal
                isOpen={!!expensePromptItem}
                onClose={handleSkipExpense}
                title=""
            >
                {expensePromptItem && (
                    <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Hero Amount Input */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            padding: '4px 0 12px',
                        }}>
                            <span style={{
                                fontSize: '12px',
                                fontWeight: '600',
                                color: 'var(--text-muted)',
                                marginBottom: '6px',
                                letterSpacing: '0.3px',
                                textTransform: 'uppercase'
                            }}>
                                Record Expense for "{expensePromptItem.name}"
                            </span>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                width: '100%',
                            }}>
                                <span style={{
                                    fontSize: '32px',
                                    fontWeight: '700',
                                    color: parseFloat(expenseAmount) > 0 ? '#10b981' : 'rgba(255,255,255,0.25)',
                                    transition: 'color 0.3s ease',
                                    userSelect: 'none',
                                }}>₹</span>
                                <input
                                    ref={amountInputRef}
                                    className="qsp-amount-input"
                                    type="number"
                                    inputMode="decimal"
                                    step="any"
                                    value={expenseAmount}
                                    onChange={e => setExpenseAmount(e.target.value)}
                                    placeholder="0"
                                    style={{
                                        fontSize: '48px',
                                        fontWeight: '800',
                                        color: 'var(--text-primary)',
                                        background: 'transparent',
                                        border: 'none',
                                        outline: 'none',
                                        boxShadow: 'none',
                                        width: `${Math.max(1, expenseAmount ? expenseAmount.length : 1) * 28 + 14}px`,
                                        minWidth: '40px',
                                        maxWidth: '240px',
                                        textAlign: 'left',
                                        fontFamily: 'inherit',
                                        lineHeight: 1,
                                        caretColor: '#10b981',
                                        padding: '0',
                                        margin: '0',
                                    }}
                                />
                            </div>

                            {/* Glow underline */}
                            <div style={{
                                width: parseFloat(expenseAmount) > 0 ? '120px' : '40px',
                                height: '3px',
                                borderRadius: '2px',
                                background: parseFloat(expenseAmount) > 0
                                    ? 'linear-gradient(90deg, transparent, #10b981, transparent)'
                                    : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
                                transition: 'all 0.4s ease',
                                marginTop: '6px',
                            }} />
                        </div>

                        {/* Subcategory Picker (if any) */}
                        {expenseSubcategories.length > 0 && (
                            <div>
                                <span style={{
                                    display: 'block',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    color: 'var(--text-muted)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.8px',
                                    marginBottom: '8px',
                                }}>Subcategory (Optional)</span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {expenseSubcategories.map(sub => {
                                        const isSel = selectedSubcategory === sub.id;
                                        return (
                                            <button
                                                key={sub.id}
                                                type="button"
                                                onClick={() => setSelectedSubcategory(isSel ? '' : sub.id)}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '12px',
                                                    border: isSel ? '1.5px solid #10b981' : '1px solid rgba(255,255,255,0.08)',
                                                    background: isSel ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255,255,255,0.03)',
                                                    color: isSel ? '#10b981' : 'var(--text-secondary)',
                                                    fontSize: '12px',
                                                    fontWeight: isSel ? '700' : '500',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                {sub.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '10px',
                            paddingTop: '6px',
                        }}>
                            <button
                                type="submit"
                                disabled={!expenseAmount || parseFloat(expenseAmount) <= 0 || isSubmittingExpense}
                                style={{
                                    width: '100%',
                                    padding: '14px',
                                    borderRadius: '16px',
                                    border: parseFloat(expenseAmount) > 0
                                        ? '1.5px solid rgba(16, 185, 129, 0.7)'
                                        : '1px solid rgba(255,255,255,0.06)',
                                    fontWeight: '700',
                                    fontSize: '14px',
                                    cursor: parseFloat(expenseAmount) > 0 ? 'pointer' : 'not-allowed',
                                    opacity: parseFloat(expenseAmount) > 0 ? 1 : 0.35,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    color: '#ffffff',
                                    background: parseFloat(expenseAmount) > 0
                                        ? 'linear-gradient(135deg, #10b981, #065f46)'
                                        : 'rgba(255,255,255,0.03)',
                                    boxShadow: parseFloat(expenseAmount) > 0
                                        ? '0 6px 24px rgba(16, 185, 129, 0.3)'
                                        : 'none',
                                    transition: 'all 0.25s ease',
                                }}
                            >
                                <span>Record Expense • ₹{parseFloat(expenseAmount || 0).toLocaleString('en-IN')}</span>
                                {parseFloat(expenseAmount) > 0 && <ArrowRight size={15} />}
                            </button>

                            <button
                                type="button"
                                onClick={handleSkipExpense}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    padding: '4px 12px'
                                }}
                            >
                                Skip adding to expenses
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default ShoppingView;
