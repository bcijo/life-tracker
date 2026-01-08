import React, { useState } from 'react';
import { Plus, X, Calendar, Repeat, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from 'lucide-react';
import Modal from './Modal';
import CurrencyInput from './CurrencyInput';

const RecurringExpensesSection = ({
    recurringExpenses,
    categories,
    onAdd,
    onDelete,
    onToggleActive,
    upcomingExpenses,
    monthlyTotal,
    isCollapsed,
    onToggleCollapse,
}) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newExpense, setNewExpense] = useState({
        name: '',
        amount: '',
        category: 'bills',
        dayOfMonth: 1
    });

    const handleAdd = () => {
        if (!newExpense.name || !newExpense.amount) return;
        onAdd(newExpense.name, newExpense.amount, newExpense.category, newExpense.dayOfMonth);
        setNewExpense({ name: '', amount: '', category: 'bills', dayOfMonth: 1 });
        setShowAddForm(false);
    };

    const expenseCategories = categories.filter(c => c.type === 'expense' || c.type === 'both');

    return (
        <div
            className="glass-card"
            style={{
                padding: '16px',
                marginBottom: '20px',
                background: 'linear-gradient(135deg, rgba(237, 137, 54, 0.1) 0%, rgba(237, 137, 54, 0.02) 100%)',
                borderLeft: '4px solid #ed8936',
            }}
        >
            {/* Header */}
            <div
                onClick={onToggleCollapse}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    marginBottom: isCollapsed ? 0 : '16px',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>🔄</span>
                    <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Recurring Expenses</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#ed8936' }}>
                        ₹{monthlyTotal.toFixed(0)}/mo
                    </span>
                    {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                </div>
            </div>

            {!isCollapsed && (
                <>
                    {/* Upcoming Alert */}
                    {upcomingExpenses.length > 0 && (
                        <div style={{
                            padding: '10px 12px',
                            background: 'rgba(237, 137, 54, 0.15)',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: '12px',
                            fontSize: '13px',
                        }}>
                            <p style={{ fontWeight: '500', marginBottom: '4px' }}>
                                📅 Upcoming this month
                            </p>
                            {upcomingExpenses.slice(0, 3).map(exp => (
                                <p key={exp.id} style={{ opacity: 0.8, fontSize: '12px' }}>
                                    Day {exp.day_of_month}: {exp.name} - ₹{parseFloat(exp.amount).toFixed(0)}
                                </p>
                            ))}
                        </div>
                    )}

                    {/* Recurring Expenses List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                        {recurringExpenses.map(exp => {
                            const category = categories.find(c => c.id === exp.category);
                            return (
                                <div
                                    key={exp.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px',
                                        background: exp.is_active ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.03)',
                                        borderRadius: 'var(--radius-sm)',
                                        opacity: exp.is_active ? 1 : 0.5,
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '10px',
                                            background: category?.color || '#ed8936',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                        }}>
                                            <Repeat size={18} />
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: '500', fontSize: '14px' }}>{exp.name}</p>
                                            <p style={{ fontSize: '11px', opacity: 0.6 }}>
                                                Day {exp.day_of_month} • {category?.name || 'Other'}
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontWeight: '600', fontSize: '14px' }}>
                                            ₹{parseFloat(exp.amount).toFixed(0)}
                                        </span>
                                        <button
                                            onClick={() => onToggleActive(exp.id, !exp.is_active)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                padding: '4px',
                                                cursor: 'pointer',
                                                color: exp.is_active ? '#48bb78' : '#a0aec0',
                                            }}
                                        >
                                            {exp.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                        </button>
                                        <button
                                            onClick={() => onDelete(exp.id)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                padding: '4px',
                                                cursor: 'pointer',
                                                color: '#a0aec0',
                                            }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {recurringExpenses.length === 0 && (
                            <p style={{ textAlign: 'center', opacity: 0.5, padding: '16px', fontSize: '13px' }}>
                                No recurring expenses set up
                            </p>
                        )}
                    </div>

                    {/* Add Button */}
                    <button
                        onClick={() => setShowAddForm(true)}
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: 'rgba(237, 137, 54, 0.15)',
                            border: '1px dashed rgba(237, 137, 54, 0.4)',
                            borderRadius: 'var(--radius-sm)',
                            color: '#ed8936',
                            fontWeight: '500',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                        }}
                    >
                        <Plus size={16} />
                        Add Recurring Expense
                    </button>
                </>
            )}

            {/* Add Form Modal */}
            <Modal
                isOpen={showAddForm}
                onClose={() => setShowAddForm(false)}
                title="Add Recurring Expense"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <input
                        type="text"
                        placeholder="Expense Name (e.g., Netflix)"
                        value={newExpense.name}
                        onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(255,255,255,0.5)',
                            fontSize: '14px',
                        }}
                        autoFocus
                    />

                    <CurrencyInput
                        value={newExpense.amount}
                        onChange={(val) => setNewExpense({ ...newExpense, amount: val })}
                        placeholder="Monthly Amount"
                        inputStyle={{
                            fontSize: '14px',
                        }}
                    />

                    <select
                        value={newExpense.category}
                        onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(255,255,255,0.5)',
                            fontSize: '14px',
                        }}
                    >
                        {expenseCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>

                    <div>
                        <label style={{ fontSize: '13px', opacity: 0.7, display: 'block', marginBottom: '6px' }}>
                            Day of Month
                        </label>
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
                                width: '100%',
                                padding: '12px',
                                border: '1px solid var(--glass-border)',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(255,255,255,0.5)',
                                fontSize: '14px',
                            }}
                        />
                    </div>

                    <button
                        onClick={handleAdd}
                        disabled={!newExpense.name || !newExpense.amount}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: newExpense.name && newExpense.amount
                                ? '#ed8936'
                                : 'rgba(0,0,0,0.1)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: '600',
                            cursor: newExpense.name && newExpense.amount ? 'pointer' : 'not-allowed',
                            marginTop: '8px'
                        }}
                    >
                        Add Recurring Expense
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default RecurringExpensesSection;
