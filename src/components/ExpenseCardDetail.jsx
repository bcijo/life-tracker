import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
    X, ChevronLeft, ChevronRight, Plus, Trash2, Tag, 
    BarChart3, Receipt, Settings, PieChart as PieChartIcon
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, parseISO } from 'date-fns';
import useTransactions from '../hooks/useTransactions';
import useExpenseCards from '../hooks/useExpenseCards';
import CurrencyInput from './CurrencyInput';
import { CategoryIcon, CATEGORY_ICON_LIST } from '../utils/categoryIcons';

const PRESET_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
    '#A855F7', '#EC4899', '#F59E0B', '#10B981', '#3B82F6',
    '#6366F1', '#8B5CF6', '#F43F5E', '#14B8A6'
];

const ExpenseCardDetail = ({ card, onClose, onEdit }) => {
    if (!card) return null;

    const { deleteTransaction, transactions } = useTransactions();
    const { 
        fetchSubcategories, 
        addSubcategory, 
        deleteSubcategory, 
        updateCard, 
        deleteCard 
    } = useExpenseCards();

    const [activeTab, setActiveTab] = useState('subcategories'); // 'subcategories' | 'analytics' | 'transactions' | 'settings'
    const [subcategories, setSubcategories] = useState([]);
    const [newSubcategoryName, setNewSubcategoryName] = useState('');
    const [monthOffset, setMonthOffset] = useState(0);
    const [isAddingSub, setIsAddingSub] = useState(false);

    // Edit Category Settings State
    const [editName, setEditName] = useState(card?.name || '');
    const [editIcon, setEditIcon] = useState(card?.icon || 'utensils');
    const [editBudget, setEditBudget] = useState(card?.budget_amount || '');
    const [editColor, setEditColor] = useState(card?.color || '#4ECDC4');
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    const cardColor = editColor || card?.color || '#4ECDC4';

    // Load subcategories
    useEffect(() => {
        if (!card?.id) return;
        const loadSubs = async () => {
            const data = await fetchSubcategories(card.id);
            setSubcategories(data || []);
        };
        loadSubs();
    }, [card?.id]);

    const currentDate = new Date();
    const targetMonth = monthOffset === 0 ? currentDate :
        monthOffset < 0 ? subMonths(currentDate, Math.abs(monthOffset)) : addMonths(currentDate, monthOffset);
    const monthStart = startOfMonth(targetMonth);
    const monthEnd = endOfMonth(targetMonth);

    // Filter transactions for this category
    const categoryTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (t.type !== 'expense') return false;
            return t.card_id === card.id || t.category === card.id || (card.category_ids && card.category_ids.includes(t.category));
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [transactions, card]);

    // Monthly transactions for target month
    const monthlyTransactions = useMemo(() => {
        return categoryTransactions.filter(t => {
            const d = parseISO(t.date);
            return d >= monthStart && d <= monthEnd;
        });
    }, [categoryTransactions, monthStart, monthEnd]);

    const totalMonthlySpent = useMemo(() => {
        return monthlyTransactions.reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
    }, [monthlyTransactions]);

    // Group by subcategory for Analytics Donut
    const chartData = useMemo(() => {
        const groups = {};
        let hasData = false;

        monthlyTransactions.forEach(tx => {
            const subId = tx.subcategory_id || 'other';
            if (!groups[subId]) {
                const subObj = subcategories.find(s => s.id === subId);
                const colorIdx = subcategories.findIndex(s => s.id === subId);
                groups[subId] = {
                    id: subId,
                    name: subObj ? subObj.name : (tx.description || 'General / Unassigned'),
                    amount: 0,
                    count: 0,
                    color: subObj 
                        ? (PRESET_COLORS[colorIdx % PRESET_COLORS.length] || cardColor) 
                        : 'var(--text-muted, #94a3b8)'
                };
            }
            groups[subId].amount += parseFloat(tx.amount);
            groups[subId].count += 1;
            hasData = true;
        });

        return hasData ? Object.values(groups).sort((a, b) => b.amount - a.amount) : [];
    }, [monthlyTransactions, subcategories, cardColor]);

    // Calculate subcategory spending stats (all-time & this month)
    const subcategoryStats = useMemo(() => {
        return subcategories.map(sub => {
            const subTxs = categoryTransactions.filter(t => t.subcategory_id === sub.id);
            const thisMonthTxs = monthlyTransactions.filter(t => t.subcategory_id === sub.id);
            const totalSpend = subTxs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
            const monthSpend = thisMonthTxs.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

            return {
                ...sub,
                totalSpend,
                monthSpend,
                transactionCount: subTxs.length,
                monthTransactionCount: thisMonthTxs.length,
            };
        });
    }, [subcategories, categoryTransactions, monthlyTransactions]);

    // Handlers
    const handleAddSubcategory = async (e) => {
        if (e) e.preventDefault();
        if (!newSubcategoryName.trim() || isAddingSub) return;

        setIsAddingSub(true);
        const created = await addSubcategory(card.id, newSubcategoryName.trim());
        if (created) {
            setSubcategories(prev => [...prev, created]);
            setNewSubcategoryName('');
        }
        setIsAddingSub(false);
    };

    const handleDeleteSub = async (subId) => {
        const success = await deleteSubcategory(subId);
        if (success) {
            setSubcategories(prev => prev.filter(s => s.id !== subId));
        }
    };

    const handleSaveSettings = async () => {
        setIsSavingSettings(true);
        await updateCard(card.id, {
            name: editName.trim(),
            icon: editIcon,
            color: editColor,
            budget_amount: editBudget ? parseFloat(editBudget) : null
        });
        setIsSavingSettings(false);
        onClose();
    };

    const handleDeleteCategory = async () => {
        if (!card) return;
        if (window.confirm(`Are you sure you want to delete "${card.name}" and remove all its subcategories?`)) {
            const cardId = card.id;
            onClose();
            await deleteCard(cardId);
        }
    };

    const TABS = [
        { id: 'subcategories', label: 'Subcategories', icon: Tag, count: subcategories.length },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'transactions', label: 'History', icon: Receipt, count: categoryTransactions.length },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    const budgetAmount = parseFloat(editBudget || card.budget_amount || 0);
    const budgetPct = budgetAmount > 0 ? Math.min(100, Math.round((totalMonthlySpent / budgetAmount) * 100)) : 0;

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                style={{
                    width: '100%',
                    maxWidth: '540px',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--surface-elevated, #131b2e)',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    border: '1px solid var(--glass-border, rgba(255,255,255,0.12))',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
                }}
            >
                {/* Hero Header */}
                <div style={{
                    padding: '20px 22px',
                    background: `linear-gradient(135deg, color-mix(in srgb, ${cardColor} 28%, #131b2e), color-mix(in srgb, ${cardColor} 10%, #0d121f))`,
                    borderBottom: '1px solid var(--glass-border, rgba(255,255,255,0.08))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '14px',
                            background: `color-mix(in srgb, ${cardColor} 30%, transparent)`,
                            border: `1.5px solid ${cardColor}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `0 4px 16px color-mix(in srgb, ${cardColor} 35%, transparent)`
                        }}>
                            <CategoryIcon icon={card.icon || editIcon} name={card.name} color={cardColor} size={22} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                                {card.name}
                            </h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: cardColor }}>
                                    ₹{Math.round(totalMonthlySpent).toLocaleString('en-IN')} this month
                                </span>
                                {budgetAmount > 0 && (
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        • {budgetPct}% of ₹{Math.round(budgetAmount).toLocaleString('en-IN')}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            background: 'var(--surface-input, rgba(255,255,255,0.08))',
                            border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                            borderRadius: '50%',
                            width: '34px',
                            height: '34px',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <X size={17} />
                    </button>
                </div>

                {/* Segmented Tab Bar */}
                <div style={{
                    display: 'flex',
                    background: 'var(--surface-input, rgba(255,255,255,0.03))',
                    padding: '4px',
                    margin: '12px 18px 0 18px',
                    borderRadius: '14px',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                    gap: '4px'
                }}>
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.id;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    flex: 1,
                                    padding: '8px 10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: isActive ? 'var(--surface-elevated, #1c2438)' : 'transparent',
                                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                                    fontSize: '12px',
                                    fontWeight: isActive ? '700' : '500',
                                    cursor: 'pointer',
                                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                                    transition: 'all 0.2s ease',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <Icon size={14} color={isActive ? cardColor : 'currentColor'} />
                                <span>{tab.label}</span>
                                {tab.count !== undefined && tab.count > 0 && (
                                    <span style={{
                                        fontSize: '10px',
                                        padding: '1px 6px',
                                        borderRadius: '8px',
                                        background: isActive ? `color-mix(in srgb, ${cardColor} 25%, transparent)` : 'var(--surface-input)',
                                        color: isActive ? cardColor : 'var(--text-muted)',
                                        fontWeight: '700'
                                    }}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 22px 20px' }}>
                    
                    {/* TAB 1: SUBCATEGORIES MANAGER */}
                    {activeTab === 'subcategories' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.2s ease' }}>
                            {/* Inline Subcategory Creator Form */}
                            <form onSubmit={handleAddSubcategory} style={{ display: 'flex', gap: '8px' }}>
                                <div style={{
                                    flex: 1,
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}>
                                    <Tag size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px' }} />
                                    <input
                                        type="text"
                                        placeholder="Add subcategory (e.g. Groceries, Coffee, Swiggy)..."
                                        value={newSubcategoryName}
                                        onChange={(e) => setNewSubcategoryName(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '11px 14px 11px 36px',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                                            background: 'var(--surface-input, rgba(255,255,255,0.05))',
                                            color: 'var(--text-primary)',
                                            fontSize: '13px',
                                            outline: 'none',
                                            fontWeight: '500'
                                        }}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!newSubcategoryName.trim() || isAddingSub}
                                    style={{
                                        padding: '0 18px',
                                        background: newSubcategoryName.trim() ? cardColor : 'var(--border-subtle)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontWeight: '700',
                                        fontSize: '13px',
                                        cursor: newSubcategoryName.trim() ? 'pointer' : 'not-allowed',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: newSubcategoryName.trim() ? `0 4px 12px color-mix(in srgb, ${cardColor} 30%, transparent)` : 'none',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <Plus size={15} strokeWidth={2.5} />
                                    <span>Add</span>
                                </button>
                            </form>

                            {/* Subcategories List */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                        Active Subcategories ({subcategories.length})
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        Used to tag & group expenses
                                    </span>
                                </div>

                                {subcategoryStats.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {subcategoryStats.map((sub, idx) => {
                                            const subColor = PRESET_COLORS[idx % PRESET_COLORS.length];
                                            return (
                                                <div
                                                    key={sub.id}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '12px 14px',
                                                        borderRadius: '14px',
                                                        background: 'var(--surface-input, rgba(255,255,255,0.04))',
                                                        border: '1px solid var(--border-subtle, rgba(255,255,255,0.07))',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{
                                                            width: '28px',
                                                            height: '28px',
                                                            borderRadius: '8px',
                                                            background: `${subColor}22`,
                                                            border: `1px solid ${subColor}44`,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '12px',
                                                            fontWeight: '800',
                                                            color: subColor
                                                        }}>
                                                            #
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                                {sub.name}
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span>{sub.monthTransactionCount} this month (₹{Math.round(sub.monthSpend).toLocaleString('en-IN')})</span>
                                                                <span>•</span>
                                                                <span>{sub.transactionCount} all-time</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => handleDeleteSub(sub.id)}
                                                        style={{
                                                            padding: '6px',
                                                            borderRadius: '8px',
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--text-muted)',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'color 0.15s ease'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                                        title="Delete subcategory"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div style={{
                                        padding: '36px 16px',
                                        textAlign: 'center',
                                        background: 'var(--surface-input, rgba(255,255,255,0.03))',
                                        borderRadius: '16px',
                                        border: '1px dashed var(--border-subtle, rgba(255,255,255,0.1))',
                                        color: 'var(--text-muted)'
                                    }}>
                                        <div style={{ fontSize: '28px', marginBottom: '8px' }}>🏷️</div>
                                        <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                            No subcategories yet
                                        </p>
                                        <p style={{ margin: 0, fontSize: '12px' }}>
                                            Type above to create tags like <em>Groceries, Delivery, Chai</em>.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 2: ANALYTICS & BREAKDOWN */}
                    {activeTab === 'analytics' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'fadeIn 0.2s ease' }}>
                            {/* Month Navigator */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'var(--surface-input)',
                                padding: '8px 12px',
                                borderRadius: '12px',
                                border: '1px solid var(--border-subtle)'
                            }}>
                                <button
                                    onClick={() => setMonthOffset(monthOffset - 1)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    {format(targetMonth, 'MMMM yyyy')}
                                </span>
                                <button
                                    onClick={() => setMonthOffset(monthOffset + 1)}
                                    disabled={monthOffset >= 0}
                                    style={{
                                        background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                                        cursor: monthOffset >= 0 ? 'not-allowed' : 'pointer',
                                        opacity: monthOffset >= 0 ? 0.3 : 1, display: 'flex'
                                    }}
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>

                            {/* Donut Chart */}
                            <div style={{ height: '170px', position: 'relative' }}>
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={chartData}
                                                dataKey="amount"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={75}
                                                paddingAngle={3}
                                            >
                                                {chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div style={{
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--text-muted)',
                                        gap: '6px'
                                    }}>
                                        <PieChartIcon size={28} />
                                        <span style={{ fontSize: '13px' }}>No expenses recorded this month</span>
                                    </div>
                                )}
                            </div>

                            {/* Subcategory Share Breakdown */}
                            {chartData.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {chartData.map(item => {
                                        const pct = totalMonthlySpent > 0 ? Math.round((item.amount / totalMonthlySpent) * 100) : 0;
                                        return (
                                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color }} />
                                                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{item.name}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{pct}%</span>
                                                    <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>₹{Math.round(item.amount).toLocaleString('en-IN')}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 3: TRANSACTION HISTORY */}
                    {activeTab === 'transactions' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', animation: 'fadeIn 0.2s ease' }}>
                            {categoryTransactions.length > 0 ? (
                                categoryTransactions.map(t => {
                                    const sub = subcategories.find(s => s.id === t.subcategory_id);
                                    return (
                                        <div
                                            key={t.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '12px 14px',
                                                borderRadius: '16px',
                                                background: 'var(--surface-input)',
                                                border: '1px solid var(--border-subtle)'
                                            }}
                                        >
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {t.description || (sub ? sub.name : 'Expense')}
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                                    <span>{format(parseISO(t.date), 'MMM d, yyyy')}</span>
                                                    {sub && (
                                                        <>
                                                            <span>•</span>
                                                            <span style={{
                                                                padding: '1px 6px',
                                                                borderRadius: '6px',
                                                                background: `color-mix(in srgb, ${cardColor} 20%, transparent)`,
                                                                color: cardColor,
                                                                fontWeight: '700'
                                                            }}>
                                                                #{sub.name}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                                                    -₹{parseFloat(t.amount).toLocaleString('en-IN')}
                                                </span>
                                                <button
                                                    onClick={() => deleteTransaction(t.id)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: 'var(--text-muted)',
                                                        cursor: 'pointer',
                                                        padding: '4px',
                                                        display: 'flex'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                                                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                                    title="Delete transaction"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{
                                    padding: '36px 16px',
                                    textAlign: 'center',
                                    background: 'var(--surface-input)',
                                    borderRadius: '16px',
                                    border: '1px dashed var(--border-subtle)',
                                    color: 'var(--text-muted)'
                                }}>
                                    <p style={{ margin: 0, fontSize: '13px' }}>No transactions recorded for {card.name}.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 4: SETTINGS */}
                    {activeTab === 'settings' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.2s ease' }}>
                            {/* Category Name */}
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '6px', letterSpacing: '0.5px' }}>
                                    CATEGORY NAME
                                </label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '11px 14px',
                                        borderRadius: '12px',
                                        border: '1px solid var(--border-subtle)',
                                        background: 'var(--surface-input)',
                                        color: 'var(--text-primary)',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            {/* Minimal Lucide Icon Picker */}
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '6px', letterSpacing: '0.5px' }}>
                                    CATEGORY ICON
                                </label>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(7, 1fr)',
                                    gap: '6px',
                                    padding: '10px',
                                    background: 'var(--surface-input)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--border-subtle)',
                                    maxHeight: '140px',
                                    overflowY: 'auto'
                                }}>
                                    {CATEGORY_ICON_LIST.map(item => {
                                        const IconComp = item.icon;
                                        const isSelected = editIcon === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                title={item.label}
                                                onClick={() => setEditIcon(item.id)}
                                                style={{
                                                    border: isSelected ? `2px solid ${cardColor}` : '1px solid transparent',
                                                    background: isSelected ? `${cardColor}33` : 'transparent',
                                                    borderRadius: '8px',
                                                    padding: '8px 0',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: isSelected ? cardColor : 'var(--text-secondary)'
                                                }}
                                            >
                                                <IconComp size={18} />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Color Picker */}
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '6px', letterSpacing: '0.5px' }}>
                                    THEME COLOR
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setEditColor(c)}
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '50%',
                                                background: c,
                                                border: editColor === c ? '3px solid #fff' : 'none',
                                                boxShadow: editColor === c ? '0 0 10px rgba(255,255,255,0.4)' : 'none',
                                                cursor: 'pointer'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Monthly Budget Limit */}
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)', marginBottom: '6px', letterSpacing: '0.5px' }}>
                                    MONTHLY BUDGET TARGET (OPTIONAL)
                                </label>
                                <CurrencyInput
                                    value={editBudget}
                                    onChange={(val) => setEditBudget(val)}
                                    placeholder="e.g. 5000"
                                    inputStyle={{ padding: '10px 14px', fontSize: '14px' }}
                                />
                            </div>

                            {/* Save Settings & Delete */}
                            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                                <button
                                    onClick={handleDeleteCategory}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        color: '#ef4444',
                                        fontWeight: '700',
                                        fontSize: '13px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Delete
                                </button>
                                <button
                                    onClick={handleSaveSettings}
                                    disabled={isSavingSettings || !editName.trim()}
                                    style={{
                                        flex: 2,
                                        padding: '12px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        background: cardColor,
                                        color: '#fff',
                                        fontWeight: '700',
                                        fontSize: '13px',
                                        cursor: !editName.trim() ? 'not-allowed' : 'pointer',
                                        boxShadow: `0 4px 14px color-mix(in srgb, ${cardColor} 30%, transparent)`
                                    }}
                                >
                                    {isSavingSettings ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default ExpenseCardDetail;
