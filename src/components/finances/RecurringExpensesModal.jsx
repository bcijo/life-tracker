import React, { useState, useRef } from 'react';
import { Plus, Repeat, Trash2, ToggleLeft, ToggleRight, ArrowRight } from 'lucide-react';
import Modal from '../Modal';
import { CategoryIcon } from '../../utils/categoryIcons';

// Smart preset mappings for instant accurate category tags & colors
const PRESET_ACCENTS = [
    { keywords: ['rent', 'house', 'flat', 'apartment', 'pg', 'landlord'], label: 'Housing', color: '#f97316', icon: 'home' },
    { keywords: ['icloud', 'apple', 'google', 'cloud', 'drive', 'storage', 'dropbox'], label: 'Cloud Storage', color: '#06b6d4', icon: 'wifi' },
    { keywords: ['phone', 'mobile', 'airtel', 'jio', 'vi', 'vodafone', 'recharge', 'broadband', 'wifi', 'internet'], label: 'Mobile & Net', color: '#3b82f6', icon: 'smartphone' },
    { keywords: ['milk', 'grocery', 'blinkit', 'zepto', 'instamart', 'country delight', 'vegetable', 'meat'], label: 'Food & Dairy', color: '#10b981', icon: 'utensils' },
    { keywords: ['netflix', 'spotify', 'prime', 'hotstar', 'youtube', 'music', 'disney', 'video', 'hbo'], label: 'Entertainment', color: '#ec4899', icon: 'film' },
    { keywords: ['gym', 'cult', 'fitness', 'workout', 'trainer'], label: 'Fitness & Gym', color: '#e11d48', icon: 'dumbbell' },
    { keywords: ['electricity', 'water', 'gas', 'bill', 'utility', 'eb', 'power'], label: 'Utilities', color: '#eab308', icon: 'zap' }
];

const getSubscriptionDetails = (exp, categories = []) => {
    // 1. Check intelligent keyword mapping based on subscription name first
    const lowerName = (exp.name || '').toLowerCase();
    const preset = PRESET_ACCENTS.find(p => p.keywords.some(k => lowerName.includes(k)));
    if (preset) {
        return {
            name: preset.label,
            color: preset.color,
            icon: preset.icon
        };
    }

    // 2. Try to find matched category from user's expense cards
    const matchedCategory = categories.find(c => 
        c.id === exp.category || 
        c.name.toLowerCase() === exp.category?.toLowerCase()
    );

    if (matchedCategory && matchedCategory.color) {
        return {
            name: matchedCategory.name,
            color: matchedCategory.color,
            icon: matchedCategory.icon
        };
    }

    // 3. Fallback
    return {
        name: exp.category ? exp.category.charAt(0).toUpperCase() + exp.category.slice(1) : 'Fixed',
        color: '#a855f7',
        icon: 'repeat'
    };
};

const RecurringExpensesModal = ({
    isOpen,
    onClose,
    recurringExpenses = [],
    categories = [],
    onAdd,
    onDelete,
    onToggleActive,
    monthlyTotal = 0,
}) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newExpense, setNewExpense] = useState({
        name: '',
        amount: '',
        category: categories[0]?.id || 'bills',
    });

    const amountRef = useRef(null);

    const handleAdd = (e) => {
        if (e) e.preventDefault();
        if (!newExpense.name.trim() || !newExpense.amount || parseFloat(newExpense.amount) <= 0) return;
        onAdd(newExpense.name.trim(), parseFloat(newExpense.amount), newExpense.category, 1);
        setNewExpense({ name: '', amount: '', category: categories[0]?.id || 'bills' });
        setShowAddForm(false);
    };

    const expenseCategories = categories.filter(c => c.type === 'expense' || c.type === 'both');
    const selectedCategory = categories.find(c => c.id === newExpense.category) || categories[0];
    const accent = selectedCategory?.color || '#a855f7';
    const hasAmount = parseFloat(newExpense.amount) > 0;

    const styles = `
        .qre-amount-input::-webkit-inner-spin-button,
        .qre-amount-input::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        .qre-amount-input[type=number] {
            -moz-appearance: textfield;
        }
        .qre-amount-input,
        .qre-amount-input:focus,
        .qre-amount-input:focus-visible,
        .qre-amount-input:active {
            outline: none !important;
            border: none !important;
            border-color: transparent !important;
            box-shadow: none !important;
            background: transparent !important;
        }
        .qre-amount-input::placeholder {
            color: rgba(255,255,255,0.18);
        }
    `;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="">
            <style>{styles}</style>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Header Summary Hero */}
                <div style={{
                    background: 'radial-gradient(ellipse at top left, rgba(168, 85, 247, 0.15), rgba(255, 255, 255, 0.02))',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '18px',
                    padding: '16px 18px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '7px',
                                    background: 'rgba(168, 85, 247, 0.25)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#c084fc'
                                }}>
                                    <Repeat size={13} />
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                    Fixed Commitments
                                </span>
                            </div>

                            <div style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1.1 }}>
                                ₹{Math.round(monthlyTotal).toLocaleString('en-IN')}
                                <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-muted)', marginLeft: '4px' }}>
                                    / month
                                </span>
                            </div>
                        </div>

                        <div style={{
                            padding: '3px 8px',
                            borderRadius: '10px',
                            background: 'rgba(168, 85, 247, 0.15)',
                            border: '1px solid rgba(168, 85, 247, 0.3)',
                            color: '#c084fc',
                            fontSize: '11px',
                            fontWeight: '700'
                        }}>
                            ₹{Math.round(monthlyTotal * 12).toLocaleString('en-IN')}/yr
                        </div>
                    </div>
                </div>

                {!showAddForm ? (
                    <>
                        {/* List of Subscriptions */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            maxHeight: '48vh',
                            overflowY: 'auto',
                            paddingRight: '2px'
                        }}>
                            {recurringExpenses.map(exp => {
                                const details = getSubscriptionDetails(exp, categories);
                                const itemColor = details.color;

                                return (
                                    <div
                                        key={exp.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '12px 14px',
                                            background: exp.is_active ? 'rgba(255, 255, 255, 0.035)' : 'rgba(255, 255, 255, 0.015)',
                                            border: `1px solid ${exp.is_active ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)'}`,
                                            borderRadius: '16px',
                                            opacity: exp.is_active ? 1 : 0.45,
                                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                            boxShadow: exp.is_active ? '0 2px 10px rgba(0, 0, 0, 0.12)' : 'none'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {/* Dynamic Colored Avatar */}
                                            <div style={{
                                                width: '38px',
                                                height: '38px',
                                                borderRadius: '11px',
                                                background: `color-mix(in srgb, ${itemColor} 20%, transparent)`,
                                                border: `1px solid color-mix(in srgb, ${itemColor} 40%, transparent)`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: itemColor,
                                                flexShrink: 0,
                                                boxShadow: `0 2px 8px color-mix(in srgb, ${itemColor} 20%, transparent)`
                                            }}>
                                                <CategoryIcon icon={details.icon} name={details.name} color={itemColor} size={17} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)', letterSpacing: '0.1px' }}>
                                                    {exp.name}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                                    <span style={{
                                                        fontSize: '11px',
                                                        fontWeight: '600',
                                                        color: itemColor,
                                                        padding: '1px 6px',
                                                        borderRadius: '6px',
                                                        background: `color-mix(in srgb, ${itemColor} 12%, transparent)`
                                                    }}>
                                                        {details.name}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-primary)' }}>
                                                    ₹{Math.round(exp.amount).toLocaleString('en-IN')}
                                                </div>
                                                <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                                    / mo
                                                </div>
                                            </div>

                                            {/* Toggle switch */}
                                            <button
                                                type="button"
                                                onClick={() => onToggleActive(exp.id, !exp.is_active)}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    padding: '2px',
                                                    cursor: 'pointer',
                                                    color: exp.is_active ? '#10b981' : 'var(--text-muted)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    transition: 'color 0.15s ease'
                                                }}
                                                title={exp.is_active ? 'Active (click to pause)' : 'Paused (click to activate)'}
                                            >
                                                {exp.is_active ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                                            </button>

                                            {/* Delete */}
                                            <button
                                                type="button"
                                                onClick={() => onDelete(exp.id)}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    padding: '4px',
                                                    cursor: 'pointer',
                                                    color: 'var(--text-muted)',
                                                    opacity: 0.5,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    transition: 'all 0.15s ease'
                                                }}
                                                onMouseOver={e => {
                                                    e.currentTarget.style.color = '#ef4444';
                                                    e.currentTarget.style.opacity = '1';
                                                }}
                                                onMouseOut={e => {
                                                    e.currentTarget.style.color = 'var(--text-muted)';
                                                    e.currentTarget.style.opacity = '0.5';
                                                }}
                                                title="Delete subscription"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            {recurringExpenses.length === 0 && (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '28px 16px',
                                    color: 'var(--text-muted)',
                                    fontSize: '13px'
                                }}>
                                    No recurring subscriptions added yet.
                                </div>
                            )}
                        </div>

                        {/* Add Button & Close Action */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowAddForm(true);
                                    setTimeout(() => amountRef.current?.focus(), 120);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '13px',
                                    borderRadius: '14px',
                                    background: 'linear-gradient(135deg, #a855f7, #6b21a8)',
                                    border: '1.5px solid rgba(255, 255, 255, 0.2)',
                                    color: '#ffffff',
                                    fontWeight: '700',
                                    fontSize: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    cursor: 'pointer',
                                    boxShadow: '0 6px 20px rgba(168, 85, 247, 0.35)',
                                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                                }}
                                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                <Plus size={16} />
                                <span>Add New Subscription</span>
                            </button>

                            <button
                                type="button"
                                onClick={onClose}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    padding: '4px 12px',
                                    transition: 'color 0.15s ease'
                                }}
                                onMouseOver={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                                onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                                Close
                            </button>
                        </div>
                    </>
                ) : (
                    /* Inline Add Subscription Form inside Modal */
                    <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* Amount Hero */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            padding: '2px 0 8px',
                        }}>
                            <span style={{
                                fontSize: '11px',
                                fontWeight: '600',
                                color: 'var(--text-muted)',
                                marginBottom: '4px',
                                letterSpacing: '0.3px',
                                textTransform: 'uppercase'
                            }}>
                                Monthly Subscription Cost
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
                                    color: hasAmount ? accent : 'rgba(255,255,255,0.25)',
                                    transition: 'color 0.3s ease',
                                    userSelect: 'none',
                                }}>₹</span>
                                <input
                                    ref={amountRef}
                                    className="qre-amount-input"
                                    type="number"
                                    inputMode="decimal"
                                    step="any"
                                    value={newExpense.amount}
                                    onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                                    placeholder="0"
                                    style={{
                                        fontSize: '44px',
                                        fontWeight: '800',
                                        color: 'var(--text-primary)',
                                        background: 'transparent',
                                        border: 'none',
                                        outline: 'none',
                                        boxShadow: 'none',
                                        width: `${Math.max(1, newExpense.amount ? newExpense.amount.length : 1) * 26 + 14}px`,
                                        minWidth: '40px',
                                        maxWidth: '240px',
                                        textAlign: 'left',
                                        fontFamily: 'inherit',
                                        lineHeight: 1,
                                        caretColor: accent,
                                        padding: '0',
                                        margin: '0',
                                    }}
                                />
                            </div>

                            <div style={{
                                width: hasAmount ? '120px' : '40px',
                                height: '3px',
                                borderRadius: '2px',
                                background: hasAmount
                                    ? `linear-gradient(90deg, transparent, ${accent}, transparent)`
                                    : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
                                transition: 'all 0.4s ease',
                                marginTop: '4px',
                            }} />
                        </div>

                        {/* Name */}
                        <div>
                            <span style={{
                                display: 'block',
                                fontSize: '11px',
                                fontWeight: '700',
                                color: 'var(--text-muted)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.8px',
                                marginBottom: '6px',
                            }}>Subscription Name</span>
                            <input
                                type="text"
                                placeholder="e.g. Netflix, Spotify, Gym, Rent, Internet"
                                value={newExpense.name}
                                onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '11px 13px',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '13px',
                                    background: 'rgba(255,255,255,0.03)',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                    outline: 'none',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>

                        {/* Categories */}
                        <div>
                            <span style={{
                                display: 'block',
                                fontSize: '11px',
                                fontWeight: '700',
                                color: 'var(--text-muted)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.8px',
                                marginBottom: '6px',
                            }}>Category</span>
                            <div style={{
                                display: 'flex',
                                gap: '6px',
                                overflowX: 'auto',
                                paddingBottom: '2px',
                                WebkitOverflowScrolling: 'touch',
                                scrollbarWidth: 'none'
                            }}>
                                {expenseCategories.map(cat => {
                                    const isSel = newExpense.category === cat.id;
                                    const catColor = cat.color || '#a855f7';
                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setNewExpense({ ...newExpense, category: cat.id })}
                                            style={{
                                                flex: '0 0 auto',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '6px 12px',
                                                borderRadius: '11px',
                                                border: isSel ? `1.5px solid ${catColor}` : '1px solid rgba(255,255,255,0.07)',
                                                background: isSel ? `color-mix(in srgb, ${catColor} 20%, transparent)` : 'rgba(255,255,255,0.025)',
                                                color: isSel ? 'var(--text-primary)' : 'var(--text-muted)',
                                                fontSize: '12px',
                                                fontWeight: isSel ? '700' : '500',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <CategoryIcon icon={cat.icon} name={cat.name} color={isSel ? catColor : 'var(--text-muted)'} size={14} />
                                            <span>{cat.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Submit & Cancel */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
                            <button
                                type="submit"
                                disabled={!newExpense.name.trim() || !hasAmount}
                                style={{
                                    width: '100%',
                                    padding: '13px',
                                    borderRadius: '14px',
                                    border: (newExpense.name.trim() && hasAmount)
                                        ? `1.5px solid color-mix(in srgb, ${accent} 70%, rgba(255,255,255,0.2))`
                                        : '1px solid rgba(255,255,255,0.06)',
                                    fontWeight: '700',
                                    fontSize: '14px',
                                    cursor: (newExpense.name.trim() && hasAmount) ? 'pointer' : 'not-allowed',
                                    opacity: (newExpense.name.trim() && hasAmount) ? 1 : 0.35,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    color: '#ffffff',
                                    background: (newExpense.name.trim() && hasAmount)
                                        ? `linear-gradient(135deg, color-mix(in srgb, ${accent} 85%, #1e1b4b), color-mix(in srgb, ${accent} 55%, #0f172a))`
                                        : 'rgba(255,255,255,0.03)',
                                    boxShadow: (newExpense.name.trim() && hasAmount)
                                        ? `0 6px 24px color-mix(in srgb, ${accent} 30%, transparent)`
                                        : 'none',
                                    transition: 'all 0.25s ease',
                                }}
                            >
                                <span>Save Subscription</span>
                                {newExpense.name.trim() && hasAmount && <ArrowRight size={15} />}
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
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
                                Back to list
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </Modal>
    );
};

export default RecurringExpensesModal;
