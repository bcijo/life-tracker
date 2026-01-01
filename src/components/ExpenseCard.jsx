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
                boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                color: '#fff',
                transition: 'transform 0.1s',
                position: 'relative',
                overflow: 'hidden'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
            <div style={{ fontSize: '24px' }}>{card.icon}</div>
            <div>
                <p style={{ fontSize: '13px', fontWeight: '700', lineHeight: '1.2', marginBottom: '2px' }}>{card.name}</p>
                <p style={{ fontSize: '11px', opacity: 0.9 }}>
                    ₹{budgetProgress?.spent.toFixed(0) || 0}
                </p>
            </div>
            {budgetProgress?.percentage > 0 && (
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: 'rgba(0,0,0,0.2)'
                }}>
                    <div style={{
                        height: '100%', width: `${Math.min(budgetProgress.percentage, 100)}%`, background: '#fff', opacity: 0.7
                    }} />
                </div>
            )}
        </div>
    );
};

export default ExpenseCard;
