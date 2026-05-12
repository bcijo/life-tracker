import React, { useState } from 'react';
import BudgetCard from './BudgetCard';
import BudgetModal from './BudgetModal';
import { Target, Plus } from 'lucide-react';
import { isSameMonth, parseISO } from 'date-fns';

const BudgetsSection = ({ budgets, transactions, onAddBudget, onUpdateBudget, onDeleteBudget }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState(null);

    const getBudgetSpent = (budget) => {
        return transactions.filter(t => {
            if (t.type !== 'expense') return false;
            // Current month only
            if (!isSameMonth(parseISO(t.date), new Date())) return false;
            
            let matchCategory = true;
            let matchAccount = true;

            if (budget.category_ids && budget.category_ids.length > 0) {
                // category logic from transactions is mapped to card_id or direct category string. 
                // We'll check both card_id and category
                matchCategory = budget.category_ids.includes(t.card_id) || budget.category_ids.includes(t.category);
            }

            if (budget.account_id) {
                matchAccount = t.account_id === budget.account_id;
            }

            // If neither is linked, we just sum up everything? No, usually if nothing is linked, it's a general budget.
            if ((!budget.category_ids || budget.category_ids.length === 0) && !budget.account_id) {
                return true; // Unlinked budget tracks all expenses
            }

            // If one is empty and the other is set, we only enforce the set one.
            if (!budget.category_ids || budget.category_ids.length === 0) matchCategory = true;
            if (!budget.account_id) matchAccount = true;

            return matchCategory && matchAccount;
        }).reduce((sum, t) => sum + parseFloat(t.amount), 0);
    };

    const handleSave = (name, amount, categoryIds, accountId) => {
        if (editingBudget) {
            onUpdateBudget(editingBudget.id, { name, amount, category_ids: categoryIds, account_id: accountId });
        } else {
            onAddBudget(name, amount, categoryIds, accountId);
        }
        setEditingBudget(null);
    };

    return (
        <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Budgets</h3>
                    <Target size={18} color="var(--accent-primary)" />
                </div>
                <button
                    onClick={() => {
                        setEditingBudget(null);
                        setIsModalOpen(true);
                    }}
                    style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        background: 'var(--surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                    }}
                >
                    <Plus size={14} /> New
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                        textAlign: 'center', padding: '32px 16px', background: 'var(--glass-card-bg)', 
                        border: '1px dashed var(--glass-card-border)', borderRadius: '16px', color: 'var(--text-secondary)' 
                    }}>
                        <Target size={32} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
                        <p style={{ margin: 0, fontSize: '14px' }}>No budgets created yet.</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.7 }}>Track your spending limits securely.</p>
                    </div>
                )}
            </div>

            <BudgetModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                budgetToEdit={editingBudget}
            />
        </div>
    );
};

export default BudgetsSection;
