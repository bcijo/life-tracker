import React from 'react';
import { CategoryIcon } from '../utils/categoryIcons';

export const getIconByName = (name) => {
    return <CategoryIcon name={name} size={22} color="#ffffff" />;
};

const ExpenseCard = ({ card, budgetProgress, onClick }) => {
    const cardColor = card.color || '#4ECDC4';
    
    return (
        <div
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '16px',
                background: 'var(--glass-card-bg)',
                border: '1px solid var(--glass-card-border)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: 'var(--shadow-sm)',
            }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                e.currentTarget.style.background = 'var(--surface-elevated)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                e.currentTarget.style.background = 'var(--glass-card-bg)';
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ 
                    width: '44px', 
                    height: '44px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    borderRadius: '12px',
                    background: `color-mix(in srgb, ${cardColor} 20%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${cardColor} 35%, transparent)`
                }}>
                    <CategoryIcon icon={card.icon} name={card.name} color={cardColor} size={22} />
                </div>
                <div>
                    <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, marginBottom: '2px' }}>
                        {card.name}
                    </p>
                    <p style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)', margin: 0 }}>
                        Tap to view history
                    </p>
                </div>
            </div>
            
            <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                    ₹{Math.round(budgetProgress?.spent || 0).toLocaleString('en-IN')}
                </p>
            </div>
        </div>
    );
};

export default ExpenseCard;
