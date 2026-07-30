import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useTodos from '../hooks/useTodos';
import useHabits from '../hooks/useHabits';
import useShopping from '../hooks/useShopping';
import useTransactions from '../hooks/useTransactions';
import useBudgets from '../hooks/useBudgets';
import { useProfile } from '../hooks/useProfile';
import { isToday, parseISO, startOfWeek, endOfWeek, format, subDays } from 'date-fns';
import useLifeContext from '../hooks/useLifeContext';
import { generateReport } from '../lib/groq';
import AIReportCard from '../components/AIReportCard';
import WeeklyReportModal from '../components/WeeklyReportModal';
import { JournalModal } from '../components/JournalModal';
import { supabase } from '../lib/supabase';
import { 
    Sparkles, 
    TrendingUp, 
    CheckSquare, 
    Activity, 
    ArrowUpRight, 
    Zap,
    Calendar,
    Plus,
    BookOpen
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const getUserDisplayName = (profile) => {
    if (!profile) return '';
    let rawName = profile.display_name || (profile.email ? profile.email.split('@')[0] : '');
    if (!rawName) return '';
    const words = rawName.replace(/[._]/g, ' ').split(' ').filter(Boolean);
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const Dashboard = () => {
    const { todos, addTodo } = useTodos();
    const { habits, addHabit } = useHabits();
    const { items: shoppingItems } = useShopping();
    const { transactions } = useTransactions();
    const { profile } = useProfile();
    const { budgets, addBudget } = useBudgets();
    const contextData = useLifeContext();

    // AI Report State
    const [report, setReport] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [acceptingId, setAcceptingId] = useState(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);

    // Fetch weekly report (only on Sundays)
    const isSunday = new Date().getDay() === 0;

    useEffect(() => {
        const fetchOrGenerateReport = async () => {
            if (!isSunday) {
                setReport(null);
                return;
            }

            try {
                setReportLoading(true);
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const start = format(startOfWeek(new Date()), 'yyyy-MM-dd');
                const end = format(endOfWeek(new Date()), 'yyyy-MM-dd');

                // 1. Check DB for existing report
                const { data: existing } = await supabase
                    .from('ai_reports')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('type', 'weekly')
                    .eq('period_start', start)
                    .maybeSingle();

                if (existing) {
                    setReport(existing.content);
                } else {
                    // Only auto-generate on Sundays if no report exists
                    console.log("Generating new weekly report for Sunday...");
                    const newReport = await generateReport('weekly', start, end, contextData);

                    if (newReport) {
                        setReport(newReport);
                        await supabase.from('ai_reports').insert({
                            user_id: user.id,
                            type: 'weekly',
                            period_start: start,
                            period_end: end,
                            content: newReport
                        });
                    }
                }
            } catch (err) {
                console.error("Report Fetch Error:", err);
            } finally {
                setReportLoading(false);
            }
        };

        // Delay slightly to ensure contextData is populated
        const timer = setTimeout(fetchOrGenerateReport, 1500);
        return () => clearTimeout(timer);
    }, [contextData.financial.totalBalance, isSunday]); // Depend on balanced state

    // On-demand manual report regeneration
    const handleForceGenerateReport = async () => {
        if (reportLoading) return;
        try {
            setReportLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const start = format(startOfWeek(new Date()), 'yyyy-MM-dd');
            const end = format(endOfWeek(new Date()), 'yyyy-MM-dd');

            console.log("Regenerating weekly report on-demand...");
            const newReport = await generateReport('weekly', start, end, contextData);

            if (newReport) {
                setReport(newReport);

                const { data: existing } = await supabase
                    .from('ai_reports')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('type', 'weekly')
                    .eq('period_start', start)
                    .maybeSingle();

                if (existing) {
                    await supabase.from('ai_reports')
                        .update({ content: newReport })
                        .eq('id', existing.id);
                } else {
                    await supabase.from('ai_reports').insert({
                        user_id: user.id,
                        type: 'weekly',
                        period_start: start,
                        period_end: end,
                        content: newReport
                    });
                }
            }
        } catch (err) {
            console.error("Manual report generation error:", err);
        } finally {
            setReportLoading(false);
        }
    };

    // Handle voluntary commitment acceptance
    const handleAcceptCommitment = async (commitmentId) => {
        if (!report || !report.voluntaryCommitments) return;
        
        const commitment = report.voluntaryCommitments.find(c => c.id === commitmentId);
        if (!commitment) return;

        setAcceptingId(commitmentId);
        try {
            // 1. Perform actual addition via context hooks
            if (commitment.type === 'todo') {
                await addTodo(commitment.title, commitment.actionData?.deadline || null);
            } else if (commitment.type === 'habit') {
                const days = commitment.actionData?.activeDays || [0, 1, 2, 3, 4, 5, 6];
                const tod = commitment.actionData?.timeOfDay || 'morning';
                await addHabit(commitment.title, days, tod);
            } else if (commitment.type === 'budget') {
                const amt = commitment.actionData?.amount || 1000;
                const cats = commitment.actionData?.categoryIds || [];
                addBudget(commitment.title, amt, cats, null);
            }

            // 2. Update local state and DB to mark as accepted
            const updatedCommitments = report.voluntaryCommitments.map(c => 
                c.id === commitmentId ? { ...c, accepted: true } : c
            );
            const updatedReport = { ...report, voluntaryCommitments: updatedCommitments };
            
            const { data: { user } } = await supabase.auth.getUser();
            const start = format(startOfWeek(new Date()), 'yyyy-MM-dd');

            await supabase.from('ai_reports')
                .update({ content: updatedReport })
                .eq('user_id', user.id)
                .eq('type', 'weekly')
                .eq('period_start', start);

            setReport(updatedReport);
        } catch (err) {
            console.error("Failed to accept commitment:", err);
        } finally {
            setAcceptingId(null);
        }
    };

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

    // Compute beautiful 7-day visual graph data
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
        <div className="page-container" style={{ paddingBottom: '90px', position: 'relative' }}>
            {/* Ambient Background Glowing Orbs */}
            <div className="habit-orbs-container" style={{ zIndex: 0 }}>
                <div style={{
                    position: 'absolute', top: '10%', left: '-20%', width: '300px', height: '300px',
                    borderRadius: '50%', background: 'radial-gradient(circle, rgba(102,126,234,0.15) 0%, transparent 70%)',
                    filter: 'blur(40px)'
                }} />
                <div style={{
                    position: 'absolute', top: '40%', right: '-20%', width: '300px', height: '300px',
                    borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)',
                    filter: 'blur(40px)'
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
                            Hello, <span className="accent-gradient-text">{getUserDisplayName(profile) || 'Abhin'}</span>
                        </h1>
                    </div>
                    
                    {/* Top Right Journal Trigger Button */}
                    <motion.button
                        whileHover={{ scale: 1.05, boxShadow: '0 6px 20px rgba(168, 85, 247, 0.25)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsJournalModalOpen(true)}
                        style={{
                            background: 'var(--glass-card-bg)',
                            border: '1px solid var(--glass-card-border)',
                            color: 'var(--text-primary)',
                            padding: '8px 14px',
                            borderRadius: '16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 14px rgba(168, 85, 247, 0.15)',
                            backdropFilter: 'blur(12px)',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <BookOpen size={17} style={{ color: 'var(--accent-primary)' }} />
                        <span style={{ fontSize: '13px', fontWeight: '600' }}>Journal</span>
                    </motion.button>
                </header>

                {/* Sunday Weekly Insights Banner Card */}
                <AnimatePresence mode="wait">
                    {isSunday && (report || reportLoading) && (
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.3 }}
                            onClick={() => setIsReportModalOpen(true)}
                            className="glass-card glow-purple"
                            style={{
                                padding: '20px 24px',
                                marginBottom: '24px',
                                position: 'relative',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                borderLeft: '4px solid var(--accent-primary, #a855f7)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '16px',
                                transition: 'all 0.3s ease'
                            }}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                                <div style={{
                                    width: '46px',
                                    height: '46px',
                                    borderRadius: '14px',
                                    background: 'var(--accent-gradient, linear-gradient(135deg, #6366f1, #a855f7))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#fff',
                                    flexShrink: 0,
                                    boxShadow: '0 8px 20px rgba(168, 85, 247, 0.3)'
                                }}>
                                    <Sparkles size={22} className={reportLoading ? 'spin' : ''} />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                                            {reportLoading ? "Generating Your Weekly Report..." : "Hey, your weekly report is here!"}
                                        </h3>
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            padding: '2px 8px',
                                            borderRadius: '10px',
                                            background: 'rgba(168, 85, 247, 0.15)',
                                            color: 'var(--accent-primary, #a855f7)',
                                            border: '1px solid rgba(168, 85, 247, 0.3)'
                                        }}>
                                            Sunday Special
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
                                        {reportLoading 
                                            ? "Analyzing your habits and transactions..." 
                                            : "Check it out to view your weekly performance & insights."}
                                    </p>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {report && report.score !== undefined && (
                                    <div style={{
                                        background: 'var(--glass-card-bg)',
                                        border: '1px solid var(--glass-card-border)',
                                        padding: '6px 14px',
                                        borderRadius: '16px',
                                        textAlign: 'center'
                                    }}>
                                        <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-primary)' }}>
                                            {report.score}
                                        </span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/100</span>
                                    </div>
                                )}
                                <div style={{
                                    background: 'var(--accent-gradient, linear-gradient(135deg, #6366f1, #a855f7))',
                                    color: '#fff',
                                    padding: '8px 16px',
                                    borderRadius: '20px',
                                    fontWeight: '600',
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                                    flexShrink: 0
                                }}>
                                    <span>Open Report</span>
                                    <ArrowUpRight size={16} />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Dashboard Widgets Responsive Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                    {/* Glassmorphic Daily Overview */}
                    <div className="glass-card glow-cyan" style={{ padding: '20px', borderLeft: '4px solid var(--accent-primary)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Zap size={16} style={{ color: 'var(--accent-primary)' }} />
                                Daily Status
                            </h3>
                            <span style={{ fontSize: '11px', background: 'var(--success-bg)', color: 'var(--success)', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
                                Keep it up!
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '16px' }}>
                            {/* Habits Link */}
                            <Link to="/habits" style={{ flex: 1, textDecoration: 'none', color: 'inherit' }}>
                                <motion.div
                                    whileHover={{ scale: 1.03, y: -3, boxShadow: '0 8px 24px rgba(168, 85, 247, 0.2)' }}
                                    whileTap={{ scale: 0.96 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                    style={{
                                        background: 'var(--glass-bg)',
                                        padding: '14px 12px',
                                        borderRadius: '14px',
                                        textAlign: 'center',
                                        border: '1px solid var(--glass-border)',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>{habitsDoneToday}/{habitsActiveToday.length}</span>
                                        <ArrowUpRight size={14} style={{ color: 'var(--accent-primary)', opacity: 0.8 }} />
                                    </div>
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>Habits Completed</p>
                                </motion.div>
                            </Link>

                            {/* Tasks Link */}
                            <Link to="/todos" style={{ flex: 1, textDecoration: 'none', color: 'inherit' }}>
                                <motion.div
                                    whileHover={{ scale: 1.03, y: -3, boxShadow: '0 8px 24px rgba(99, 102, 241, 0.2)' }}
                                    whileTap={{ scale: 0.96 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                    style={{
                                        background: 'var(--glass-bg)',
                                        padding: '14px 12px',
                                        borderRadius: '14px',
                                        textAlign: 'center',
                                        border: '1px solid var(--glass-border)',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                        <span style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>{activeTodos}</span>
                                        <ArrowUpRight size={14} style={{ color: 'var(--accent-secondary)', opacity: 0.8 }} />
                                    </div>
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>Tasks Remaining</p>
                                </motion.div>
                            </Link>
                        </div>
                    </div>

                    {/* Highly Customized Recharts Area Chart for 7-day Spending */}
                    <div className="glass-card" style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <TrendingUp size={16} style={{ color: 'var(--success)' }} />
                                Spending Trend (7d)
                            </h3>
                            <Link to="/finances" style={{ fontSize: '12px', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                View All <ArrowUpRight size={14} />
                            </Link>
                        </div>

                        <div style={{ width: '100%', height: 160 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0.0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis 
                                        dataKey="name" 
                                        tickLine={false} 
                                        axisLine={false}
                                        tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                                    />
                                    <YAxis 
                                        tickLine={false} 
                                        axisLine={false}
                                        tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            background: 'var(--surface-elevated)', 
                                            border: '1px solid var(--glass-card-border)', 
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            color: 'var(--text-primary)',
                                            boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
                                        }}
                                        itemStyle={{ color: 'var(--accent-primary)' }}
                                        labelStyle={{ fontWeight: 'bold' }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="amount" 
                                        stroke="var(--accent-primary)" 
                                        strokeWidth={3}
                                        fillOpacity={1} 
                                        fill="url(#colorAmount)" 
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Floating Quick Action split bill */}
                <div style={{ marginTop: '16px' }}>
                    <Link to="/split-bill" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="glass-card hover-lift glow-pink" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRight: '4px solid var(--accent-secondary)' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ background: 'var(--accent-gradient)', color: 'white', width: '36px', height: '36px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Plus size={20} />
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '700', display: 'block', color: 'var(--text-primary)' }}>Split a Bill</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Upload receipt and calculate shares</span>
                                </div>
                            </div>
                            <span style={{ color: 'var(--accent-secondary)', fontSize: '14px', fontWeight: 'bold' }}>→</span>
                        </div>
                    </Link>
                </div>

                {/* Weekly Report Full-Page Modal Overlay */}
                <WeeklyReportModal
                    isOpen={isReportModalOpen}
                    onClose={() => setIsReportModalOpen(false)}
                    report={report}
                    loading={reportLoading}
                    onAcceptCommitment={handleAcceptCommitment}
                    acceptingId={acceptingId}
                    onForceGenerate={handleForceGenerateReport}
                />

                {/* Daily Journal Modal */}
                <JournalModal
                    isOpen={isJournalModalOpen}
                    onClose={() => setIsJournalModalOpen(false)}
                />
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
