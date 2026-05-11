import React from 'react';
import * as LucideIcons from 'lucide-react';

export const getIconByName = (name) => {
    const iconMap = {
        'food': 'Utensils',
        'dining': 'Utensils',
        'eat': 'Utensils',
        'grocery': 'ShoppingCart',
        'groceries': 'ShoppingCart',
        'transport': 'Car',
        'travel': 'Plane',
        'flight': 'Plane',
        'car': 'Car',
        'shopping': 'ShoppingBag',
        'health': 'HeartPulse',
        'medical': 'Stethoscope',
        'entertainment': 'Film',
        'movies': 'Film',
        'game': 'Gamepad2',
        'bills': 'FileText',
        'utilities': 'Zap',
        'home': 'Home',
        'rent': 'Home',
        'education': 'GraduationCap',
        'study': 'BookOpen',
        'gifts': 'Gift',
        'personal': 'User',
        'fitness': 'Dumbbell',
        'gym': 'Dumbbell',
        'pets': 'Dog',
        'subscriptions': 'Repeat',
        'tech': 'Laptop',
        'electronics': 'Smartphone'
    };
    
    let IconName = 'CircleDollarSign';
    const lowerName = name.toLowerCase();
    for (const [key, value] of Object.entries(iconMap)) {
        if (lowerName.includes(key)) {
            IconName = value;
            break;
        }
    }
    
    const IconComponent = LucideIcons[IconName];
    return IconComponent ? <IconComponent size={24} strokeWidth={2} color="#ffffff" /> : <LucideIcons.CircleDollarSign size={24} color="#ffffff" />;
};

const ExpenseCard = ({ card, budgetProgress, onClick }) => {
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
                    background: `${card.color}22`,
                }}>
                    {React.cloneElement(getIconByName(card.name), { color: card.color, size: 22 })}
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
