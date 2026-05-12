import React from 'react';

const BudgetCard = ({ budget, spent, onClick }) => {
    const percentage = Math.min((spent / budget.amount) * 100, 100);
    const isOverBudget = spent > budget.amount;
    const remaining = Math.max(budget.amount - spent, 0);

    return (
        <div 
            onClick={onClick}
            style={{
                position: 'relative',
                overflow: 'hidden',
                background: 'var(--glass-card-bg)',
                border: `1px solid ${isOverBudget ? 'var(--danger)' : 'var(--glass-card-border)'}`,
                borderRadius: '16px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: 'var(--shadow-sm)',
                minHeight: '120px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                marginBottom: '12px'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
            {/* Water Fill Background */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${percentage}%`,
                background: isOverBudget ? 'rgba(245, 101, 101, 0.2)' : 'rgba(78, 205, 196, 0.2)',
                transition: 'height 1s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: 0,
                borderTop: `2px solid ${isOverBudget ? 'var(--danger)' : '#4ECDC4'}`
            }}>
                <div className="water-wave" style={{
                    position: 'absolute',
                    top: '-10px',
                    left: 0,
                    width: '200%',
                    height: '10px',
                    background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 88.7'%3E%3Cpath d='M800 56.9c-155.5 0-204.9-50-405.5-49.9-200 0-250 49.9-394.5 49.9v31.8h800v-.2-31.6z' fill='${isOverBudget ? '%23F56565' : '%234ECDC4'}' opacity='0.5'/%3E%3C/svg%3E")`,
                    backgroundSize: '200px 10px',
                    animation: 'waterWave 2s linear infinite'
                }} />
            </div>

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>{budget.name}</h3>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>Left to spend</span>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: isOverBudget ? 'var(--danger)' : 'var(--text-primary)' }}>
                            ₹{remaining.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <span>Spent: ₹{spent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    <span>Total: ₹{budget.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
            </div>
        </div>
    );
};

export default BudgetCard;
