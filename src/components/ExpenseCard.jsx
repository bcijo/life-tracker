import React from 'react';

const ExpenseCard = ({ card, budgetProgress, onClick }) => {
    return (
        <div
            onClick={onClick}
            style={{
                aspectRatio: '1',
                borderRadius: '16px',
                background: card.color,
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                color: '#fff',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                position: 'relative',
                overflow: 'hidden',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.15)';
            }}
        >
            <div style={{ fontSize: '24px' }}>{card.icon}</div>
            <div>
                <p style={{ fontSize: '13px', fontWeight: '700', lineHeight: '1.2', marginBottom: '2px' }}>
                    {card.name}
                </p>
                <p style={{ fontSize: '11px', opacity: 0.9 }}>
                    ₹{budgetProgress?.spent.toFixed(0) || 0}
                </p>
            </div>
            {/* Budget progress bar */}
            {budgetProgress?.percentage > 0 && (
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: '4px', background: 'rgba(0,0,0,0.2)',
                }}>
                    <div style={{
                        height: '100%',
                        width: `${Math.min(budgetProgress.percentage, 100)}%`,
                        background: budgetProgress.percentage >= 90 ? '#ff6b6b' : '#fff',
                        opacity: 0.8,
                        transition: 'width 0.3s ease',
                    }} />
                </div>
            )}
        </div>
    );
};

export default ExpenseCard;
