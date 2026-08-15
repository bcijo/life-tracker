import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import useTodos from '../hooks/useTodos';
import useHabits from '../hooks/useHabits';
import useShopping from '../hooks/useShopping';
import useTransactions from '../hooks/useTransactions';
import useBudgets from '../hooks/useBudgets';
import { useProfile } from '../hooks/useProfile';
import { isToday, parseISO, format, subDays } from 'date-fns';
import { 
    TrendingUp, 
    CheckSquare, 
    Activity, 
    ArrowUpRight, 
    Calendar,
    Plus,
    BookOpen,
    Scissors
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const getUserDisplayName = (profile) => {
    if (!profile) return '';
    let rawName = profile.full_name || profile.display_name || '';
    if (!rawName) return '';
    const words = rawName.replace(/[._]/g, ' ').split(' ').filter(Boolean);
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const Dashboard = () => {
    const { todos } = useTodos();
    const { habits } = useHabits();
    const { items: shoppingItems } = useShopping();
    const { transactions } = useTransactions();
    const { profile, updateProfile } = useProfile();
    const { budgets } = useBudgets();

    const [nameInput, setNameInput] = useState('');
    const [savingName, setSavingName] = useState(false);

    // Stats calculations
    const activeTodos = todos.filter(t => !t.completed).length;
    const shoppingCount = shoppingItems.filter(i => !i.isBought).length;

    const todayDayOfWeek = new Date().getDay();
    const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
    
    const habitsActiveToday = habits.filter(h => {
        if (h.is_paused) return false;
        const activeDays = h.active_days || ALL_DAYS;
        return activeDays.includes(todayDayOfWeek);
    });

    const habitsDoneToday = habitsActiveToday.filter(h => {
        if (!h.history || !h.history.length) return false;
        const firstEntry = h.history[0];
        if (typeof firstEntry === 'string') {
            return isToday(parseISO(firstEntry));
        } else if (firstEntry && firstEntry.date) {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            return firstEntry.date === todayStr && firstEntry.status === 'completed';
        }
        return false;
    }).length;

    const todayExpense = transactions
        .filter(t => t.type === 'expense' && isToday(parseISO(t.date)))
        .reduce((acc, t) => acc + parseFloat(t.amount), 0);

    // Compute 7-day visual graph data
    const chartData = useMemo(() => {
        const data = [];
        for (let i = 6; i >= 0; i--) {
            const date = subDays(new Date(), i);
            const dateStr = format(date, 'yyyy-MM-dd');
            const formattedDay = format(date, 'EEE');
            
            const totalSpent = transactions
                .filter(t => t.type === 'expense' && format(parseISO(t.date), 'yyyy-MM-dd') === dateStr)
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);

            data.push({
                name: formattedDay,
                amount: totalSpent
            });
        }
        return data;
    }, [transactions]);

    const dateFormatted = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <div className="page-container" style={{ position: 'relative', overflow: 'hidden' }}>
            {/* Ambient Background Glowing Orbs */}
            <div className="habit-orbs-container" style={{ zIndex: 0, pointerEvents: 'none' }}>
                <div style={{
                    position: 'absolute', top: '10%', left: '-10%', width: '300px', height: '300px',
                    borderRadius: '50%', background: 'radial-gradient(circle, rgba(102,126,234,0.15) 0%, transparent 70%)',
                    filter: 'blur(40px)', pointerEvents: 'none'
                }} />
                <div style={{
                    position: 'absolute', top: '40%', right: '-10%', width: '300px', height: '300px',
                    borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)',
                    filter: 'blur(40px)', pointerEvents: 'none'
                }} />
            </div>

            {/* Main Content (Z-indexed above orbs) */}
            <div style={{ position: 'relative', zIndex: 1 }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={14} />
                            {dateFormatted}
                        </p>
                        <h1 style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.5px' }}>
                            {getUserDisplayName(profile) ? (
                                <>Hello, <span className="accent-gradient-text">{getUserDisplayName(profile)}</span></>
                            ) : (
                                <>Hello! <span style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-muted)' }}>What's your name?</span></>
                            )}
                        </h1>
                        {!getUserDisplayName(profile) && (
                            <form
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (!nameInput.trim()) return;
                                    setSavingName(true);
                                    await updateProfile({ full_name: nameInput.trim() });
                                    setSavingName(false);
                                }}
                                style={{ display: 'flex', gap: '8px', marginTop: '8px' }}
                            >
                                <input
                                    type="text"
                                    value={nameInput}
                                    onChange={(e) => setNameInput(e.target.value)}
                                    placeholder="Enter your name"
                                    className="surface-input"
                                    style={{ padding: '6px 12px', fontSize: '14px', borderRadius: '8px', maxWidth: '200px' }}
                                />
                                <button
                                    type="submit"
                                    disabled={savingName}
                                    className="btn-primary"
                                    style={{ padding: '6px 14px', fontSize: '13px', borderRadius: '8px' }}
                                >
                                    {savingName ? 'Saving...' : 'Save'}
                                </button>
                            </form>
                        )}
                    </div>

                    <Link to="/journal" style={{ textDecoration: 'none' }}>
                        <motion.div
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="hover-lift"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 16px',
                                borderRadius: '16px',
                                background: 'var(--surface-elevated)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                            }}
                        >
                            <BookOpen size={17} style={{ color: 'var(--accent-primary)' }} />
                            <span style={{ fontSize: '13px', fontWeight: '600' }}>Journal</span>
                        </motion.div>
                    </Link>
                </header>

                {/* Grid Layout: Hero Stats & Features */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                    
                    {/* Quick Daily Status Card */}
                    <div className="glass-card" style={{ padding: '20px', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ padding: '8px', borderRadius: '12px', background: 'rgba(102,126,234,0.15)', color: 'var(--accent-primary)' }}>
                                    <Activity size={20} />
                                </div>
                                <span style={{ fontSize: '15px', fontWeight: '700' }}>Daily Status</span>
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: '700', padding: '2px 8px', borderRadius: '10px', background: 'var(--success-bg)', color: 'var(--success)' }}>
                                Keep it up!
                            </span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div style={{ background: 'var(--surface-input)', padding: '14px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Habits Completed</p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                    <span style={{ fontSize: '24px', fontWeight: '800' }}>{habitsDoneToday}</span>
                                    <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/{habitsActiveToday.length}</span>
                                </div>
                            </div>
                            <div style={{ background: 'var(--surface-input)', padding: '14px', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Tasks Remaining</p>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                    <span style={{ fontSize: '24px', fontWeight: '800' }}>{activeTodos}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Weekly Spending Graph Card */}
                    <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ padding: '8px', borderRadius: '12px', background: 'rgba(236,72,153,0.15)', color: '#ec4899' }}>
                                    <TrendingUp size={20} />
                                </div>
                                <span style={{ fontSize: '15px', fontWeight: '700' }}>Spending Trend (7d)</span>
                            </div>
                            <Link to="/finances" style={{ fontSize: '12px', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                View All <ArrowUpRight size={14} />
                            </Link>
                        </div>

                        <div style={{ width: '100%', height: '100px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis hide domain={[0, 'auto']} />
                                    <Tooltip
                                        contentStyle={{ background: 'var(--surface-elevated)', border: '1px solid var(--glass-border)', borderRadius: '8px', fontSize: '12px' }}
                                        formatter={(val) => [`₹${val}`, 'Spent']}
                                    />
                                    <Area type="monotone" dataKey="amount" stroke="var(--accent-primary)" strokeWidth={2} fillOpacity={1} fill="url(#spendGrad)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Module Quick Nav Cards */}
                <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                    Quick Access
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <Link to="/todos" style={{ textDecoration: 'none' }}>
                        <div className="glass-card hover-lift" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(99,102,241,0.15)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CheckSquare size={22} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Todos</h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>{activeTodos} pending tasks</p>
                            </div>
                        </div>
                    </Link>

                    <Link to="/split-bill" style={{ textDecoration: 'none' }}>
                        <div className="glass-card hover-lift" style={{ padding: '18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(14,165,233,0.15)', color: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Scissors size={22} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Split a Bill</h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>Divide & share expenses</p>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
            
            <style>{`
                .spin { animation: spin 2s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .hover-lift {
                    transition: transform var(--transition-fast), box-shadow var(--transition-fast);
                }
                .hover-lift:hover {
                    transform: translateY(-3px) scale(1.02);
                }
            `}</style>
        </div>
    );
};

export default Dashboard;
