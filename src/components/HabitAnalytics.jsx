import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChevronLeft, ChevronRight, Target, Flame, ArrowUp, ArrowDown, TrendingUp, X } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subWeeks, addWeeks, subDays, isToday, getDay } from 'date-fns';
import { parseLocalDate, getLocalDateStr } from '../hooks/useHabits';

const HabitAnalytics = ({ habits, getStatusForDate, onClose }) => {
    const [weekOffset, setWeekOffset] = useState(0);
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth < 768 : false
    );

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Lock body scroll
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev || 'unset';
        };
    }, []);

    // Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const currentDate = new Date();
    const targetDate = weekOffset === 0 ? currentDate :
        weekOffset < 0 ? subWeeks(currentDate, Math.abs(weekOffset)) : addWeeks(currentDate, weekOffset);

    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });
    const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const getCompletionForDate = (dateStr) => {
        if (!habits || habits.length === 0) return { completed: 0, total: 0, rate: 0 };
        const dow = parseLocalDate(dateStr).getDay();
        const activeOnDay = habits.filter(h => !h.is_paused && (h.active_days || [0, 1, 2, 3, 4, 5, 6]).includes(dow));
        const total = activeOnDay.length;
        const completed = activeOnDay.filter(habit => getStatusForDate(habit, dateStr) === 'completed').length;
        return { completed, total, rate: total > 0 ? Math.round((completed / total) * 100) : 0 };
    };

    const chartData = daysOfWeek.map(day => {
        const dateStr = getLocalDateStr(day);
        const stats = getCompletionForDate(dateStr);
        return {
            day: format(day, 'EEE'),
            date: format(day, 'MMM d'),
            dateStr, ...stats,
            isFuture: day > currentDate,
            isCurrentDay: isToday(day),
        };
    });

    const todayStr = getLocalDateStr(currentDate);
    const todayStats = getCompletionForDate(todayStr);
    const yesterdayStr = getLocalDateStr(subDays(currentDate, 1));
    const yesterdayStats = getCompletionForDate(yesterdayStr);
    const todayVsYesterday = todayStats.completed - yesterdayStats.completed;

    const pastDays = chartData.filter(d => !d.isFuture);
    const weekAverage = pastDays.length > 0
        ? Math.round(pastDays.reduce((acc, d) => acc + d.rate, 0) / pastDays.length) : 0;

    const bestDay = pastDays.reduce((best, day) => day.rate > (best?.rate || 0) ? day : best, null);

    const calculateBestStreak = () => {
        if (!habits || habits.length === 0) return 0;
        const globalTrackingStart = localStorage.getItem('life_tracker_tracking_start');
        let bestStreak = 0;

        habits.filter(h => !h.is_paused).forEach(habit => {
            const activeDays = habit.active_days || [0, 1, 2, 3, 4, 5, 6];
            const startDateStr = globalTrackingStart || habit.tracking_start_date;
            let current = 0;
            let maxForHabit = 0;

            for (let i = 365; i >= 0; i--) {
                const date = subDays(currentDate, i);
                const dateStr = getLocalDateStr(date);
                if (startDateStr && dateStr < startDateStr) continue;
                if (!activeDays.includes(date.getDay())) continue; // Rest day

                const status = getStatusForDate(habit, dateStr);
                if (status === 'completed') {
                    current++;
                    maxForHabit = Math.max(maxForHabit, current);
                } else if (status === 'failed') {
                    current = 0;
                } else if (i > 0) {
                    current = 0;
                }
            }
            if (maxForHabit > bestStreak) bestStreak = maxForHabit;
        });
        return bestStreak;
    };
    const bestStreak = calculateBestStreak();

    const getBarColor = (rate, isFuture) => {
        if (isFuture) return 'var(--border-subtle, rgba(255,255,255,0.06))';
        if (rate >= 80) return '#22c55e';
        if (rate >= 50) return '#f59e0b';
        if (rate > 0) return '#a855f7';
        return 'var(--border-subtle, rgba(255,255,255,0.06))';
    };

    const progressPercent = todayStats.rate;
    const progressColor = progressPercent >= 80 ? '#22c55e' : progressPercent >= 50 ? '#f59e0b' : '#a855f7';

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            if (data.isFuture) return null;
            return (
                <div style={{
                    padding: '8px 12px', borderRadius: 12,
                    background: 'var(--surface-elevated, rgba(15,23,42,0.95))',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                    backdropFilter: 'blur(12px)',
                }}>
                    <p style={{ fontWeight: 700, color: 'var(--text-primary, #fff)', fontSize: 13, marginBottom: 2 }}>{data.date}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary, rgba(255,255,255,0.6))' }}>
                        <span style={{ color: getBarColor(data.rate, false) }}>{data.completed}/{data.total}</span> · {data.rate}%
                    </p>
                </div>
            );
        }
        return null;
    };

    const statCard = (label, value, icon, color) => (
        <div style={{
            padding: '12px 10px', borderRadius: 16,
            background: 'var(--surface-elevated, rgba(255,255,255,0.03))',
            border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
            display: 'flex', flexDirection: 'column', gap: 4,
        }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {icon && <span style={{ color }}>{icon}</span>}
                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary, #fff)', fontFamily: 'monospace' }}>{value}</span>
            </div>
        </div>
    );

    // Per-habit breakdown for the current week (only counting active scheduled days for each habit)
    const habitBreakdown = habits.map(habit => {
        const activeDays = habit.active_days || [0, 1, 2, 3, 4, 5, 6];
        const scheduledDays = pastDays.filter(d => activeDays.includes(parseLocalDate(d.dateStr).getDay()));
        const completed = scheduledDays.filter(d => getStatusForDate(habit, d.dateStr) === 'completed').length;
        const total = scheduledDays.length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        const timeOfDay = habit.time_of_day || 'morning';
        const accentColor = timeOfDay === 'morning' ? '#f59e0b' : '#a855f7';
        return { id: habit.id, name: habit.name, completed, total, rate, accentColor, timeOfDay, isPaused: habit.is_paused };
    }).sort((a, b) => b.rate - a.rate);

    const bodyContent = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Week Navigator */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', borderRadius: 16,
                background: 'var(--surface-elevated, rgba(255,255,255,0.03))',
                border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
            }}>
                <button onClick={() => setWeekOffset(w => w - 1)} style={navBtn}>
                    <ChevronLeft size={16} />
                </button>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary, #fff)', margin: 0 }}>
                        {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                        {weekOffset === 0 ? 'This Week' : weekOffset === -1 ? 'Last Week' :
                            `${Math.abs(weekOffset)} weeks ${weekOffset < 0 ? 'ago' : 'ahead'}`}
                    </p>
                </div>
                <button onClick={() => setWeekOffset(w => w + 1)} disabled={weekOffset >= 0}
                    style={{ ...navBtn, opacity: weekOffset >= 0 ? 0.25 : 1, cursor: weekOffset >= 0 ? 'default' : 'pointer' }}>
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Today's Progress Ring */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '14px 16px', borderRadius: 20,
                background: `linear-gradient(135deg, ${progressColor}12, ${progressColor}04)`,
                border: `1px solid ${progressColor}20`,
            }}>
                <div style={{
                    width: 54, height: 54, borderRadius: '50%',
                    background: `conic-gradient(${progressColor} ${progressPercent * 3.6}deg, var(--border-subtle, rgba(255,255,255,0.06)) 0deg)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                    <div style={{
                        width: 42, height: 42, borderRadius: '50%', background: 'var(--bg-solid, #0b1120)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 800, color: progressColor, fontFamily: 'monospace',
                    }}>
                        {progressPercent}%
                    </div>
                </div>
                <div>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Today's Progress</p>
                    <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary, #fff)', margin: 0, fontFamily: 'monospace' }}>
                        {todayStats.completed}<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/{todayStats.total}</span>
                    </p>
                </div>
            </div>

            {/* Chart */}
            <div style={{
                padding: 14, borderRadius: 20,
                background: 'var(--surface-elevated, rgba(255,255,255,0.03))',
                border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
            }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 10px' }}>Completion Rate</p>
                <div style={{ height: 160 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="rate" radius={[5, 5, 0, 0]}>
                                {chartData.map((entry, i) => (
                                    <Cell key={i} fill={getBarColor(entry.rate, entry.isFuture)}
                                        stroke={entry.isCurrentDay ? 'var(--text-primary)' : 'none'} strokeWidth={entry.isCurrentDay ? 1.5 : 0} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {statCard('vs Yesterday',
                    todayVsYesterday === 0 ? 'Same' : `${todayVsYesterday > 0 ? '+' : ''}${todayVsYesterday}`,
                    todayVsYesterday > 0 ? <ArrowUp size={15} /> : todayVsYesterday < 0 ? <ArrowDown size={15} /> : null,
                    todayVsYesterday > 0 ? '#22c55e' : todayVsYesterday < 0 ? '#ef4444' : 'var(--text-muted)'
                )}
                {statCard('Week Avg', `${weekAverage}%`, <Target size={15} />, getBarColor(weekAverage, false))}
                {statCard('Best Day', bestDay ? `${bestDay.day}` : '–', null, '#f59e0b')}
                {statCard('Best Streak', `${bestStreak}d`, <Flame size={15} />, bestStreak > 0 ? '#ef4444' : 'var(--text-muted)')}
            </div>

            {/* Per-Habit Breakdown */}
            <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '4px 0 10px' }}>Habit Breakdown</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {habitBreakdown.map(h => (
                        <div key={h.id} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '11px 12px', borderRadius: 14,
                            background: 'var(--surface-elevated, rgba(255,255,255,0.03))',
                            border: '1px solid var(--border-subtle, rgba(255,255,255,0.05))',
                            borderLeft: `3px solid ${h.accentColor}`,
                        }}>
                            <span style={{
                                flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{h.name} {h.isPaused && <span style={{ fontSize: 9, color: '#eab308' }}>(paused)</span>}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                {h.completed}/{h.total}
                            </span>
                            <div style={{
                                width: 38, height: 4, borderRadius: 9999,
                                background: 'var(--surface-input, rgba(255,255,255,0.06))',
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    width: `${h.rate}%`, height: '100%', borderRadius: 9999,
                                    background: getBarColor(h.rate, false),
                                    transition: 'width 0.3s ease',
                                }} />
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 800, color: getBarColor(h.rate, false), fontFamily: 'monospace', minWidth: 28, textAlign: 'right' }}>
                                {h.rate}%
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    // Desktop: Centered Floating Modal
    if (!isMobile) {
        return createPortal(
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0,
                    zIndex: 9999,
                    background: 'rgba(5, 8, 20, 0.75)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px 16px',
                }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: 15 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: '100%',
                        maxWidth: '640px',
                        maxHeight: '88vh',
                        background: 'var(--surface-elevated, #131b2e)',
                        border: '1px solid var(--glass-card-border, rgba(255, 255, 255, 0.1))',
                        borderRadius: '24px',
                        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '18px 22px 14px',
                        borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                        background: 'var(--surface-elevated, #131b2e)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexShrink: 0,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                                width: 34, height: 34, borderRadius: 10,
                                background: 'rgba(34, 197, 94, 0.12)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <TrendingUp size={18} color="#22c55e" />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary, #fff)' }}>Habit Analytics</h2>
                                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>Weekly habit insights</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: 'var(--surface-input, rgba(255,255,255,0.06))',
                                border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                                color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                            }}
                        >
                            <X size={17} />
                        </button>
                    </div>

                    {/* Body */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px 24px' }}>
                        {bodyContent}
                    </div>
                </motion.div>
            </motion.div>,
            document.body
        );
    }

    // Mobile: Full-Screen Dedicated View
    return createPortal(
        <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                height: '100dvh',
                width: '100vw',
                zIndex: 9999,
                background: 'var(--bg-solid, #0b1120)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            {/* Top Fixed Bar */}
            <div style={{
                flexShrink: 0,
                padding: '12px 14px',
                background: 'var(--bg-solid, #0b1120)',
                borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                zIndex: 20,
            }}>
                <button
                    onClick={onClose}
                    aria-label="Back"
                    style={{
                        flexShrink: 0,
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'var(--surface-elevated, rgba(255,255,255,0.08))',
                        border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                        color: 'var(--text-primary, #fff)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                    }}
                >
                    <ChevronLeft size={20} />
                </button>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <TrendingUp size={16} color="#22c55e" />
                        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary, #fff)' }}>Analytics</h1>
                    </div>
                    <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)' }}>Weekly habit insights</p>
                </div>
            </div>

            {/* Scrollable Content */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
                padding: '14px 14px calc(48px + env(safe-area-inset-bottom, 24px))',
                overscrollBehavior: 'contain',
            }}>
                {bodyContent}
            </div>
        </motion.div>,
        document.body
    );
};

const navBtn = {
    width: 30, height: 30, borderRadius: 8,
    background: 'var(--surface-input, rgba(255,255,255,0.06))', border: 'none',
    color: 'var(--text-secondary, rgba(255,255,255,0.6))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
};

export default HabitAnalytics;

