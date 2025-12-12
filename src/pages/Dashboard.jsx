import React from 'react';
import useTodos from '../hooks/useTodos';
import useHabits from '../hooks/useHabits';
import useShopping from '../hooks/useShopping';
import useTransactions from '../hooks/useTransactions';
import { useProfile } from '../hooks/useProfile';
import { isToday, parseISO } from 'date-fns';

const Dashboard = () => {
    const { todos } = useTodos();
    const { habits } = useHabits();
    const { items: shoppingItems } = useShopping();
    const { transactions } = useTransactions();
    const { profile } = useProfile();

    const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    // Stats
    const activeTodos = todos.filter(t => !t.completed).length;

    const habitsDoneToday = habits.filter(h => {
        if (!h.history.length) return false;
        return isToday(parseISO(h.history[0]));
    }).length;

    const shoppingCount = shoppingItems.filter(i => !i.isBought).length;

    const todayExpense = transactions
        .filter(t => t.type === 'expense' && isToday(parseISO(t.date)))
        .reduce((acc, t) => acc + t.amount, 0);

    return (
        <div className="page-container">
            <header style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '4px' }}>{date}</p>
                <h1>Hello, {profile?.display_name || 'there'}</h1>
            </header>

            <div className="glass-card" style={{ padding: '20px', marginBottom: '20px', background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.2) 100%)' }}>
                <h3>Daily Overview</h3>
                <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                    <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{habitsDoneToday}/{habits.length}</span>
                        <p style={{ fontSize: '12px', opacity: 0.7 }}>Habits Done</p>
                    </div>
                    <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{activeTodos}</span>
                        <p style={{ fontSize: '12px', opacity: 0.7 }}>Tasks Left</p>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="glass-card" style={{ padding: '16px', height: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ fontSize: '20px', fontWeight: 'bold' }}>₹{todayExpense.toFixed(0)}</span>
                    <p style={{ fontSize: '12px', opacity: 0.7 }}>Spent Today</p>
                </div>
                <div className="glass-card" style={{ padding: '16px', height: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{shoppingCount}</span>
                    <p style={{ fontSize: '12px', opacity: 0.7 }}>To Buy</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
