import React, { useState } from 'react';
import { Target, Repeat, Plus, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import BudgetsSection from '../BudgetsSection';
import RecurringExpensesSection from '../RecurringExpensesSection';
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
        getUpcoming,
        getMonthlyTotal,
        upcomingExpenses,
        monthlyTotal: recurringTotal
    } = useRecurringExpenses();
    const { cards } = useExpenseCards();
    const { transactions } = useTransactions();

    const [recurringCollapsed, setRecurringCollapsed] = useState(false);

    // Calculate total monthly budget allocation vs actual spend
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const monthlyExpenses = transactions
        .filter(t => {
            if (t.type !== 'expense') return false;
            const d = new Date(t.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

    const totalBudgetCap = budgets.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
    const recurringMonthlyAmount = getMonthlyTotal();

    const budgetUtilizationPct = totalBudgetCap > 0 ? Math.min(100, Math.round((monthlyExpenses / totalBudgetCap) * 100)) : 0;

    return (
        <div className="finances-subview" style={{ animation: 'fadeIn 0.3s ease' }}>
            
            {/* Header / Summary Card */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                marginBottom: '20px'
            }}>
                <div className="glass-card" style={{ padding: '16px', borderLeft: '4px solid var(--accent-primary, #4ecdc4)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Target size={14} color="var(--accent-primary, #4ecdc4)" /> Total Category Budgets
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        ₹{Math.round(totalBudgetCap).toLocaleString('en-IN')}
                    </div>
                    {totalBudgetCap > 0 && (
                        <div style={{ marginTop: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                <span>Used {budgetUtilizationPct}%</span>
                                <span>₹{Math.round(monthlyExpenses).toLocaleString('en-IN')} Spent</span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: 'var(--surface-input)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${budgetUtilizationPct}%`,
                                    height: '100%',
                                    background: budgetUtilizationPct > 90 ? 'var(--danger)' : 'var(--accent-primary, #4ecdc4)',
                                    borderRadius: '4px',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                        </div>
                    )}
                </div>

                <div className="glass-card" style={{ padding: '16px', borderLeft: '4px solid #ffd166' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Repeat size={14} color="#ffd166" /> Fixed Monthly Subscriptions
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        ₹{Math.round(recurringMonthlyAmount).toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                        {recurringExpenses.filter(r => r.is_active).length} active recurring commitments
                    </div>
                </div>
            </div>

            {/* Budgets Section */}
            <div style={{ marginBottom: '24px' }}>
                <BudgetsSection
                    budgets={budgets}
                    transactions={transactions}
                    onAddBudget={addBudget}
                    onUpdateBudget={updateBudget}
                    onDeleteBudget={deleteBudget}
                />
            </div>

            {/* Recurring Expenses Section */}
            <div>
                <RecurringExpensesSection
                    recurringExpenses={recurringExpenses}
                    categories={cards}
                    onAdd={addRecurringExpense}
                    onDelete={deleteRecurringExpense}
                    onToggleActive={toggleActive}
                    upcomingExpenses={getUpcoming()}
                    monthlyTotal={recurringMonthlyAmount}
                    isCollapsed={recurringCollapsed}
                    onToggleCollapse={() => setRecurringCollapsed(!recurringCollapsed)}
                />
            </div>
        </div>
    );
};

export default BudgetsView;
