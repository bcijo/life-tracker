import React, { useState } from 'react';
import { Target, Repeat, Plus, ChevronRight } from 'lucide-react';
import BudgetsSection from '../BudgetsSection';
import BudgetModal from '../BudgetModal';
import RecurringExpensesModal from './RecurringExpensesModal';
import useBudgets from '../../hooks/useBudgets';
import useRecurringExpenses from '../../hooks/useRecurringExpenses';
import useExpenseCards from '../../hooks/useExpenseCards';
import useTransactions from '../../hooks/useTransactions';

const BudgetsView = () => {
    const { budgets, addBudget, updateBudget, deleteBudget } = useBudgets();
    const {
        recurringExpenses,
        addRecurringExpense,
        deleteRecurringExpense,
        toggleActive,
        getMonthlyTotal,
    } = useRecurringExpenses();
    const { cards } = useExpenseCards();
    const { transactions } = useTransactions();

    const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
    const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState(null);

    const isRecurringTransaction = (t) => {
        if (t.is_recurring) return true;
        if (t.category && typeof t.category === 'string' && t.category.toLowerCase() === 'recurring') return true;
        if (t.description && typeof t.description === 'string' && t.description.toLowerCase().includes('(recurring)')) return true;
        return false;
    };

    // Calculate total monthly budget allocation vs actual spend (excluding fixed recurring commitments)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyExpenses = transactions
        .filter(t => {
            if (t.type !== 'expense') return false;
            if (isRecurringTransaction(t)) return false;
            const d = new Date(t.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    const totalBudgetCap = budgets.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
    const recurringMonthlyAmount = getMonthlyTotal();
    const budgetUtilizationPct = totalBudgetCap > 0 ? Math.min(100, Math.round((monthlyExpenses / totalBudgetCap) * 100)) : 0;

    const isExceeded = monthlyExpenses > totalBudgetCap && totalBudgetCap > 0;
    const isNearLimit = budgetUtilizationPct >= 80 && !isExceeded;

    const handleSaveBudget = (name, amount, categoryIds, accountId) => {
        if (editingBudget) {
            updateBudget(editingBudget.id, { name, amount, category_ids: categoryIds, account_id: accountId });
        } else {
            addBudget(name, amount, categoryIds, accountId);
        }
        setEditingBudget(null);
        setIsBudgetModalOpen(false);
    };

    const handleDeleteBudget = (budgetId) => {
        if (deleteBudget && budgetId) {
            deleteBudget(budgetId);
        }
        setEditingBudget(null);
        setIsBudgetModalOpen(false);
    };

    return (
        <div className="finances-subview" style={{ animation: 'fadeIn 0.3s ease' }}>
            
            {/* Compact Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                    Budgets & Subscriptions
                </h2>
            </div>

            {/* Summary Hero Metric Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '12px',
                marginBottom: '20px'
            }}>
                {/* Interactive Total Category Budgets Card */}
                <div
                    onClick={() => {
                        setEditingBudget(null);
                        setIsBudgetModalOpen(true);
                    }}
                    style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '18px',
                        padding: '18px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px',
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.045)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    }}
                >
                    <div style={{
                        position: 'absolute',
                        top: '-30px',
                        right: '-30px',
                        width: '100px',
                        height: '100px',
                        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
                        pointerEvents: 'none'
                    }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '9px',
                                background: 'rgba(16, 185, 129, 0.18)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#10b981'
                            }}>
                                <Target size={15} />
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Total Monthly Budgets
                            </span>
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                            <span>Manage</span>
                            <ChevronRight size={12} />
                        </div>
                    </div>

                    <div>
                        <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1 }}>
                            ₹{Math.round(totalBudgetCap).toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {budgets.length} active categories • Click to manage
                        </div>
                    </div>

                    {totalBudgetCap > 0 && (
                        <div>
                            <div style={{
                                width: '100%',
                                height: '5px',
                                background: 'rgba(255, 255, 255, 0.06)',
                                borderRadius: '6px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${budgetUtilizationPct}%`,
                                    height: '100%',
                                    background: isExceeded
                                        ? 'linear-gradient(90deg, #ef4444, #f87171)'
                                        : isNearLimit
                                            ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                                            : 'linear-gradient(90deg, #10b981, #34d399)',
                                    borderRadius: '6px',
                                    transition: 'width 0.4s ease'
                                }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>
                                <span>₹{Math.round(monthlyExpenses).toLocaleString('en-IN')} spent</span>
                                <span>{isExceeded ? 'Over limit' : `₹{Math.round(Math.max(0, totalBudgetCap - monthlyExpenses)).toLocaleString('en-IN')} left`}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Clickable Fixed Monthly Subscriptions Card */}
                <div
                    onClick={() => setIsRecurringModalOpen(true)}
                    style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '18px',
                        padding: '18px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '12px',
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.25s ease'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.045)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    }}
                >
                    <div style={{
                        position: 'absolute',
                        top: '-30px',
                        right: '-30px',
                        width: '100px',
                        height: '100px',
                        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 70%)',
                        pointerEvents: 'none'
                    }} />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '9px',
                                background: 'rgba(168, 85, 247, 0.18)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#a855f7'
                            }}>
                                <Repeat size={15} />
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Fixed Commitments
                            </span>
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            background: 'rgba(168, 85, 247, 0.15)',
                            color: '#c084fc',
                            border: '1px solid rgba(168, 85, 247, 0.3)'
                        }}>
                            <span>Manage</span>
                            <ChevronRight size={12} />
                        </div>
                    </div>

                    <div>
                        <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1 }}>
                            ₹{Math.round(recurringMonthlyAmount).toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {recurringExpenses.filter(r => r.is_active).length} active subscriptions • Click to view
                        </div>
                    </div>

                    <div style={{
                        padding: '6px 10px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.025)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '11px'
                    }}>
                        <span style={{ color: 'var(--text-muted)' }}>Projected Annual Cost:</span>
                        <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                            ₹{Math.round(recurringMonthlyAmount * 12).toLocaleString('en-IN')} / yr
                        </span>
                    </div>
                </div>
            </div>

            {/* Category Budgets Section */}
            <div>
                <BudgetsSection
                    budgets={budgets}
                    transactions={transactions}
                    onAddBudget={addBudget}
                    onUpdateBudget={updateBudget}
                    onDeleteBudget={deleteBudget}
                />
            </div>

            {/* Total Budget Manage / Create Modal */}
            <BudgetModal
                isOpen={isBudgetModalOpen}
                onClose={() => {
                    setIsBudgetModalOpen(false);
                    setEditingBudget(null);
                }}
                onSave={handleSaveBudget}
                onDelete={handleDeleteBudget}
                budget={editingBudget}
            />

            {/* Recurring Expenses Manager Modal */}
            <RecurringExpensesModal
                isOpen={isRecurringModalOpen}
                onClose={() => setIsRecurringModalOpen(false)}
                recurringExpenses={recurringExpenses}
                categories={cards}
                onAdd={addRecurringExpense}
                onDelete={deleteRecurringExpense}
                onToggleActive={toggleActive}
                monthlyTotal={recurringMonthlyAmount}
            />
        </div>
    );
};

export default BudgetsView;
