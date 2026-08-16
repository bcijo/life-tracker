import React, { useState } from 'react';
import BudgetCard from './BudgetCard';
import BudgetModal from './BudgetModal';
import { Target, Plus, ShieldCheck } from 'lucide-react';
import { isSameMonth, parseISO } from 'date-fns';

const BudgetsSection = ({ budgets, transactions, onAddBudget, onUpdateBudget, onDeleteBudget }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState(null);

    const isRecurringTransaction = (t) => {
        if (t.is_recurring) return true;
        if (t.category && typeof t.category === 'string' && t.category.toLowerCase() === 'recurring') return true;
        if (t.description && typeof t.description === 'string' && t.description.toLowerCase().includes('(recurring)')) return true;
        return false;
    };

    const getBudgetSpent = (budget) => {
        return transactions.filter(t => {
            if (t.type !== 'expense') return false;
            // Fixed / recurring commitments should NOT be added to budget spend
            if (isRecurringTransaction(t)) return false;
            // Current month only
            if (!isSameMonth(parseISO(t.date), new Date())) return false;
            
            let matchCategory = true;
            let matchAccount = true;

            if (budget.category_ids && budget.category_ids.length > 0) {
                matchCategory = budget.category_ids.includes(t.card_id) || budget.category_ids.includes(t.category);
            }

            if (budget.account_id) {
                matchAccount = t.account_id === budget.account_id;
            }

            if ((!budget.category_ids || budget.category_ids.length === 0) && !budget.account_id) {
                return true;
            }

            if (!budget.category_ids || budget.category_ids.length === 0) matchCategory = true;
            if (!budget.account_id) matchAccount = true;

            return matchCategory && matchAccount;
        }).reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    };

    const handleSave = (name, amount, categoryIds, accountId) => {
        if (editingBudget) {
            onUpdateBudget(editingBudget.id, { name, amount, category_ids: categoryIds, account_id: accountId });
        } else {
            onAddBudget(name, amount, categoryIds, accountId);
        }
        setEditingBudget(null);
    };

    const handleDelete = (budgetId) => {
        if (onDeleteBudget && budgetId) {
            onDeleteBudget(budgetId);
        }
        setEditingBudget(null);
    };

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#10b981'
                    }}>
                        <Target size={15} />
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                        Category Spending Budgets
                    </h3>
                </div>

                <button
                    onClick={() => {
                        setEditingBudget(null);
                        setIsModalOpen(true);
                    }}
                    style={{
                        padding: '7px 14px',
                        borderRadius: '12px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                    }}
                >
                    <Plus size={13} color="#10b981" />
                    <span>New Budget</span>
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                {budgets.map(budget => (
                    <BudgetCard 
                        key={budget.id} 
                        budget={budget} 
                        spent={getBudgetSpent(budget)} 
                        onClick={() => {
                            setEditingBudget(budget);
                            setIsModalOpen(true);
                        }}
                    />
                ))}
                
                {budgets.length === 0 && (
                    <div style={{ 
                        gridColumn: '1 / -1',
                        textAlign: 'center',
                        padding: '36px 16px',
                        background: 'rgba(255, 255, 255, 0.02)', 
                        border: '1px dashed rgba(255, 255, 255, 0.08)',
                        borderRadius: '18px',
                        color: 'var(--text-secondary)' 
                    }}>
                        <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '14px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#10b981',
                            margin: '0 auto 12px auto'
                        }}>
                            <Target size={22} />
                        </div>
                        <p style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>No active budgets</p>
                        <p style={{ margin: '4px 0 14px 0', fontSize: '13px', color: 'var(--text-muted)' }}>Set monthly spending limits for categories to stay in control.</p>
                        <button
                            onClick={() => {
                                setEditingBudget(null);
                                setIsModalOpen(true);
                            }}
                            style={{
                                padding: '8px 18px',
                                borderRadius: '12px',
                                background: '#10b981',
                                border: 'none',
                                color: '#fff',
                                fontSize: '13px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                            }}
                        >
                            <Plus size={14} /> Create First Budget
                        </button>
                    </div>
                )}
            </div>

            <BudgetModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                onDelete={handleDelete}
                budgetToEdit={editingBudget}
            />
        </div>
    );
};

export default BudgetsSection;
