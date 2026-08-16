import React, { useState, useRef } from 'react';
import { Plus, Calendar, Repeat, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import Modal from './Modal';
import { CategoryIcon } from '../utils/categoryIcons';

const RecurringExpensesSection = ({
    recurringExpenses = [],
    categories = [],
    onAdd,
    onDelete,
    onToggleActive,
    upcomingExpenses = [],
    monthlyTotal = 0,
    isCollapsed,
    onToggleCollapse,
}) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newExpense, setNewExpense] = useState({
        name: '',
        amount: '',
        category: categories[0]?.id || 'bills',
        dayOfMonth: 1
    });

    const amountRef = useRef(null);

    const handleAdd = (e) => {
        if (e) e.preventDefault();
        if (!newExpense.name.trim() || !newExpense.amount || parseFloat(newExpense.amount) <= 0) return;
        onAdd(newExpense.name.trim(), parseFloat(newExpense.amount), newExpense.category, newExpense.dayOfMonth);
        setNewExpense({ name: '', amount: '', category: categories[0]?.id || 'bills', dayOfMonth: 1 });
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
        <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            borderRadius: '20px',
            padding: '20px',
            marginBottom: '20px'
        }}>
            {/* Header */}
            <div
                onClick={onToggleCollapse}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                    marginBottom: isCollapsed ? 0 : '16px',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        background: 'rgba(168, 85, 247, 0.18)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#a855f7'
                    }}>
                        <Repeat size={16} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                            Recurring & Subscriptions
                        </h3>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        background: 'rgba(168, 85, 247, 0.12)',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        color: '#c084fc',
                        fontSize: '13px',
                        fontWeight: '700'
                    }}>
                        ₹{Math.round(monthlyTotal).toLocaleString('en-IN')}/mo
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                        {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </div>
                </div>
            </div>

            {!isCollapsed && (
                <>
                    {/* Upcoming Alert Pills */}
                    {upcomingExpenses.length > 0 && (
                        <div style={{
                            padding: '12px 14px',
                            background: 'rgba(245, 158, 11, 0.08)',
                            border: '1px solid rgba(245, 158, 11, 0.2)',
                            borderRadius: '14px',
                            marginBottom: '14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                <Clock size={14} /> Upcoming due this month
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {upcomingExpenses.slice(0, 4).map(exp => (
                                    <div
                                        key={exp.id}
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '8px',
                                            background: 'rgba(255, 255, 255, 0.04)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            fontSize: '12px',
                                            color: 'var(--text-primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <span style={{ color: '#f59e0b', fontWeight: '700' }}>Day {exp.day_of_month}</span>
                                        <span>{exp.name}</span>
                                        <span style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>₹{Math.round(exp.amount).toLocaleString('en-IN')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Recurring Expenses Grid / List */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                        {recurringExpenses.map(exp => {
                            const category = categories.find(c => c.id === exp.category);
                            const catColor = category?.color || '#a855f7';

                            return (
                                <div
                                    key={exp.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '14px',
                                        background: exp.is_active ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.01)',
                                        border: `1px solid ${exp.is_active ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.03)'}`,
                                        borderRadius: '16px',
                                        opacity: exp.is_active ? 1 : 0.45,
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '38px',
                                            height: '38px',
                                            borderRadius: '12px',
                                            background: `color-mix(in srgb, ${catColor} 22%, transparent)`,
                                            border: `1px solid color-mix(in srgb, ${catColor} 40%, transparent)`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: catColor,
                                            flexShrink: 0
                                        }}>
                                            <CategoryIcon icon={category?.icon} name={category?.name} color={catColor} size={18} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                                                {exp.name}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                Every {exp.day_of_month}th • {category?.name || 'General'}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text-primary)' }}>
                                                ₹{Math.round(exp.amount).toLocaleString('en-IN')}
                                            </div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                                / month
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => onToggleActive(exp.id, !exp.is_active)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                padding: '4px',
                                                cursor: 'pointer',
                                                color: exp.is_active ? '#10b981' : 'var(--text-muted)',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                            title={exp.is_active ? 'Active (click to pause)' : 'Paused (click to activate)'}
                                        >
                                            {exp.is_active ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => onDelete(exp.id)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                padding: '4px',
                                                cursor: 'pointer',
                                                color: 'var(--text-muted)',
                                                opacity: 0.6,
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                            onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                                            onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
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
                                gridColumn: '1 / -1',
                                textAlign: 'center',
                                padding: '24px',
                                color: 'var(--text-muted)',
                                fontSize: '13px'
                            }}>
                                No recurring expenses configured yet.
                            </div>
                        )}
                    </div>

                    {/* Add Button */}
                    <button
                        type="button"
                        onClick={() => {
                            setShowAddForm(true);
                            setTimeout(() => amountRef.current?.focus(), 120);
                        }}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px dashed rgba(255, 255, 255, 0.12)',
                            borderRadius: '14px',
                            color: 'var(--text-secondary)',
                            fontWeight: '600',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <Plus size={15} color="#a855f7" />
                        <span>Add Recurring Subscription</span>
                    </button>
                </>
            )}

            {/* Add Form Modal (Dark Luxe Vibe) */}
            <Modal
                isOpen={showAddForm}
                onClose={() => setShowAddForm(false)}
                title=""
            >
                <style>{styles}</style>

                <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Amount Hero */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '6px 0 14px',
                    }}>
                        <span style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: 'var(--text-muted)',
                            marginBottom: '8px',
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
                                    fontSize: '48px',
                                    fontWeight: '800',
                                    color: 'var(--text-primary)',
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    boxShadow: 'none',
                                    width: `${Math.max(1, newExpense.amount ? newExpense.amount.length : 1) * 28 + 14}px`,
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

                        {/* Glow underline */}
                        <div style={{
                            width: hasAmount ? '120px' : '40px',
                            height: '3px',
                            borderRadius: '2px',
                            background: hasAmount
                                ? `linear-gradient(90deg, transparent, ${accent}, transparent)`
                                : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
                            transition: 'all 0.4s ease',
                            marginTop: '6px',
                        }} />
                    </div>

                    {/* Subscription Name */}
                    <div>
                        <span style={{
                            display: 'block',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.8px',
                            marginBottom: '8px',
                            paddingLeft: '2px',
                        }}>Subscription Name</span>
                        <input
                            type="text"
                            placeholder="e.g. Netflix, Spotify, Gym, Rent, Internet"
                            value={newExpense.name}
                            onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '14px',
                                background: 'rgba(255,255,255,0.03)',
                                color: 'var(--text-primary)',
                                fontSize: '14px',
                                outline: 'none',
                                fontFamily: 'inherit'
                            }}
                        />
                    </div>

                    {/* Category Selection */}
                    <div>
                        <span style={{
                            display: 'block',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.8px',
                            marginBottom: '8px',
                            paddingLeft: '2px',
                        }}>Category</span>
                        <div style={{
                            display: 'flex',
                            gap: '8px',
                            overflowX: 'auto',
                            paddingBottom: '4px',
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
                                            gap: '8px',
                                            padding: '8px 14px',
                                            borderRadius: '12px',
                                            border: isSel ? `1.5px solid ${catColor}` : '1px solid rgba(255,255,255,0.07)',
                                            background: isSel ? `color-mix(in srgb, ${catColor} 20%, transparent)` : 'rgba(255,255,255,0.025)',
                                            color: isSel ? 'var(--text-primary)' : 'var(--text-muted)',
                                            fontSize: '13px',
                                            fontWeight: isSel ? '700' : '500',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <CategoryIcon icon={cat.icon} name={cat.name} color={isSel ? catColor : 'var(--text-muted)'} size={15} />
                                        <span>{cat.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Day of Month Stepper / Selector */}
                    <div>
                        <span style={{
                            display: 'block',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.8px',
                            marginBottom: '8px',
                            paddingLeft: '2px',
                        }}>Billing Day of Month</span>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '8px 14px',
                            borderRadius: '14px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)'
                        }}>
                            <Calendar size={16} color="var(--text-muted)" />
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Debits on day</span>
                            <input
                                type="number"
                                min="1"
                                max="31"
                                value={newExpense.dayOfMonth}
                                onChange={(e) => setNewExpense({
                                    ...newExpense,
                                    dayOfMonth: Math.min(31, Math.max(1, parseInt(e.target.value) || 1))
                                })}
                                style={{
                                    width: '50px',
                                    textAlign: 'center',
                                    padding: '4px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    background: 'rgba(255,255,255,0.06)',
                                    color: 'var(--text-primary)',
                                    fontWeight: '800',
                                    fontSize: '14px',
                                    outline: 'none'
                                }}
                            />
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>of each month</span>
                        </div>
                    </div>

                    {/* Action Area */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                        paddingTop: '6px',
                    }}>
                        <button
                            type="submit"
                            disabled={!newExpense.name.trim() || !hasAmount}
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '16px',
                                border: (newExpense.name.trim() && hasAmount)
                                    ? `1.5px solid color-mix(in srgb, ${accent} 70%, rgba(255,255,255,0.2))`
                                    : '1px solid rgba(255,255,255,0.06)',
                                fontWeight: '700',
                                fontSize: '14px',
                                fontFamily: 'inherit',
                                letterSpacing: '0.2px',
                                cursor: (newExpense.name.trim() && hasAmount) ? 'pointer' : 'not-allowed',
                                opacity: (newExpense.name.trim() && hasAmount) ? 1 : 0.35,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                color: '#ffffff',
                                background: (newExpense.name.trim() && hasAmount)
                                    ? `linear-gradient(135deg, color-mix(in srgb, ${accent} 85%, #1e1b4b), color-mix(in srgb, ${accent} 55%, #0f172a))`
                                    : 'rgba(255,255,255,0.03)',
                                boxShadow: (newExpense.name.trim() && hasAmount)
                                    ? `0 6px 24px color-mix(in srgb, ${accent} 30%, transparent), inset 0 1px 1px rgba(255,255,255,0.2)`
                                    : 'none',
                                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                            }}
                        >
                            <span>Add Recurring Commitment</span>
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
                                padding: '4px 12px',
                                transition: 'color 0.15s ease',
                            }}
                            onMouseOver={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                            onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default RecurringExpensesSection;
