import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useTodos from '../hooks/useTodos';
import useHabits from '../hooks/useHabits';
import useShopping from '../hooks/useShopping';
import useTransactions from '../hooks/useTransactions';
import { useProfile } from '../hooks/useProfile';
import { isToday, parseISO, startOfWeek, endOfWeek, format, isSunday } from 'date-fns';
import useSupabaseData from '../hooks/useSupabaseData';
import useLifeContext from '../hooks/useLifeContext';
import { generateReport } from '../lib/groq';
import AIReportCard from '../components/AIReportCard';
import JournalCard from '../components/JournalCard';
import { supabase } from '../lib/supabase';

const Dashboard = () => {
    const { todos } = useTodos();
    const { habits } = useHabits();
    const { items: shoppingItems } = useShopping();
    const { transactions } = useTransactions();
    const { profile } = useProfile();
    const contextData = useLifeContext();

    // AI Report State
    const [report, setReport] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);

    // Check for existing report or generate new one
    useEffect(() => {
        const checkReport = async () => {
            // Only run on Sundays or if forced (for testing, we'll run if no report exists for this week)
            if (!isSunday(new Date())) return;

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
                    .single();

                if (existing) {
                    setReport(existing.content);
                } else {
                    // 2. Generate new Report
                    console.log("Generating new weekly report...");
                    const newReport = await generateReport('weekly', start, end, contextData);

                    if (newReport) {
                        setReport(newReport);
                        // Save to DB
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
                console.error("Report Error:", err);
            } finally {
                setReportLoading(false);
            }
        };

        // Delay slightly to ensure contextData is populated
        const timer = setTimeout(checkReport, 2000);
        return () => clearTimeout(timer);
    }, [contextData.financial.totalBalance]); // Depend on some data being ready

    const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    // Stats
    const activeTodos = todos.filter(t => !t.completed).length;

    const todayDayOfWeek = new Date().getDay(); // 0=Sunday, 6=Saturday
    const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

    // Filter habits that are active today
    const habitsActiveToday = habits.filter(h => {
        const activeDays = h.active_days || ALL_DAYS;
        return activeDays.includes(todayDayOfWeek);
    });

    const habitsDoneToday = habitsActiveToday.filter(h => {
        if (!h.history || !h.history.length) return false;
        const firstEntry = h.history[0];

        // Handle both legacy format (string) and new format ({ date, status })
        if (typeof firstEntry === 'string') {
            return isToday(parseISO(firstEntry));
        } else if (firstEntry && firstEntry.date) {
            // New format - only count if status is 'completed' and date is today
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            return firstEntry.date === todayStr && firstEntry.status === 'completed';
        }
        return false;
    }).length;

    const shoppingCount = shoppingItems.filter(i => !i.isBought).length;

    const todayExpense = transactions
        .filter(t => t.type === 'expense' && isToday(parseISO(t.date)))
        .reduce((acc, t) => acc + t.amount, 0);

    return (
        <div className="page-container" style={{ paddingBottom: '90px' }}>
            <header style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '14px', opacity: 0.8, marginBottom: '4px' }}>{date}</p>
                <h1>Hello, {profile?.display_name || 'there'}</h1>
            </header>

            {/* AI Report Card (Only shows if loading or if report exists) */}
            {(report || reportLoading) && <AIReportCard report={report} loading={reportLoading} />}

            <div className="glass-card" style={{ padding: '20px', marginBottom: '20px', background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.2) 100%)' }}>
                <h3>Daily Overview</h3>
                <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                    <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{habitsDoneToday}/{habitsActiveToday.length}</span>
                        <p style={{ fontSize: '12px', opacity: 0.7 }}>Habits Done</p>
                    </div>
                    <div style={{ flex: 1 }}>
                        <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{activeTodos}</span>
                        <p style={{ fontSize: '12px', opacity: 0.7 }}>Tasks Left</p>
                    </div>
                </div>
            </div>

            {/* Daily Journal */}
            <JournalCard />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Link to="/expenses" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="glass-card" style={{ padding: '16px', height: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>₹{todayExpense.toFixed(0)}</span>
                        <p style={{ fontSize: '12px', opacity: 0.7 }}>Spent Today</p>
                    </div>
                </Link>
                <Link to="/shopping" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="glass-card" style={{ padding: '16px', height: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{shoppingCount}</span>
                        <p style={{ fontSize: '12px', opacity: 0.7 }}>To Buy</p>
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default Dashboard;
