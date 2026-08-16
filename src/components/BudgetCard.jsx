import React from 'react';
import { Target, AlertTriangle, CheckCircle, TrendingUp, ChevronRight } from 'lucide-react';

const BudgetCard = ({ budget, spent, onClick }) => {
    const totalAmount = parseFloat(budget.amount) || 1;
    const percentage = Math.min(Math.round((spent / totalAmount) * 100), 100);
    const isOverBudget = spent > totalAmount;
    const isNearLimit = percentage >= 80 && !isOverBudget;
    const remaining = Math.max(totalAmount - spent, 0);

    // Accent colors based on utilization status
    const statusColor = isOverBudget
        ? '#ef4444'
        : isNearLimit
            ? '#f59e0b'
            : '#10b981';

    return (
        <div
            onClick={onClick}
            style={{
                position: 'relative',
                overflow: 'hidden',
                background: 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${isOverBudget ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255, 255, 255, 0.07)'}`,
                borderRadius: '18px',
                padding: '18px',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: isOverBudget
                    ? '0 4px 20px rgba(239, 68, 68, 0.12)'
                    : '0 2px 12px rgba(0, 0, 0, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.borderColor = `color-mix(in srgb, ${statusColor} 45%, rgba(255,255,255,0.15))`;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = isOverBudget ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255, 255, 255, 0.07)';
            }}
        >
            {/* Top Row: Name + Status Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        background: `color-mix(in srgb, ${statusColor} 20%, transparent)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: statusColor
                    }}>
                        <Target size={16} />
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {budget.name}
                    </span>
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: `color-mix(in srgb, ${statusColor} 15%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${statusColor} 30%, transparent)`,
                    color: statusColor,
                    fontSize: '11px',
                    fontWeight: '700'
                }}>
                    {isOverBudget ? (
                        <>
                            <AlertTriangle size={12} />
                            <span>Over Budget ({percentage}%)</span>
                        </>
                    ) : isNearLimit ? (
                        <>
                            <TrendingUp size={12} />
                            <span>Near Limit ({percentage}%)</span>
                        </>
                    ) : (
                        <>
                            <CheckCircle size={12} />
                            <span>{percentage}% Used</span>
                        </>
                    )}
                </div>
            </div>

            {/* Middle Row: Progress Bar */}
            <div>
                <div style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    overflow: 'hidden',
                    position: 'relative'
                }}>
                    <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        borderRadius: '10px',
                        background: isOverBudget
                            ? 'linear-gradient(90deg, #ef4444, #f87171)'
                            : isNearLimit
                                ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                                : 'linear-gradient(90deg, #10b981, #34d399)',
                        boxShadow: `0 0 10px color-mix(in srgb, ${statusColor} 50%, transparent)`,
                        transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                    }} />
                </div>
            </div>

            {/* Bottom Row: Numbers breakdown */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '2px' }}>
                <div>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '2px' }}>
                        Spent vs Budget
                    </span>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        ₹{Math.round(spent).toLocaleString('en-IN')}
                        <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', marginLeft: '4px' }}>
                            / ₹{Math.round(totalAmount).toLocaleString('en-IN')}
                        </span>
                    </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '2px' }}>
                        {isOverBudget ? 'Exceeded by' : 'Remaining'}
                    </span>
                    <div style={{
                        fontSize: '15px',
                        fontWeight: '800',
                        color: isOverBudget ? '#ef4444' : '#10b981'
                    }}>
                        ₹{Math.round(isOverBudget ? spent - totalAmount : remaining).toLocaleString('en-IN')}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BudgetCard;
