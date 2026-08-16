import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ChevronLeft, ChevronRight, Target, Flame, ArrowUp, ArrowDown, TrendingUp } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subWeeks, addWeeks, subDays, isToday, getDay } from 'date-fns';
import { parseLocalDate, getLocalDateStr } from '../hooks/useHabits';

const HabitAnalytics = ({ habits, getStatusForDate, onClose }) => {
    const [weekOffset, setWeekOffset] = useState(0);

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
            padding: '14px 12px', borderRadius: 18,
            background: 'var(--surface-elevated, rgba(255,255,255,0.03))',
            border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
            display: 'flex', flexDirection: 'column', gap: 6,
        }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color }}>{icon}</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary, #fff)', fontFamily: 'monospace' }}>{value}</span>
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

    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                zIndex: 100, background: 'var(--bg-solid, #0b1120)',
                overflowY: 'auto', display: 'flex', flexDirection: 'column',
            }}
        >
            {/* Header */}
            <div style={{
                padding: '20px 20px 0',
                display: 'flex', alignItems: 'center', gap: 14,
            }}>
                <button
                    onClick={onClose}
                    style={{
                        flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
                        background: 'var(--surface-elevated, rgba(255,255,255,0.06))', border: 'none',
                        color: 'var(--text-primary, #fff)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                    }}
                >
                    <ChevronLeft size={22} />
                </button>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TrendingUp size={18} color="#22c55e" />
                        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary, #fff)' }}>Analytics</h1>
                    </div>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                        Weekly habit insights
                    </p>
                </div>
            </div>

            <div style={{ padding: '20px 20px 48px' }}>
                {/* Week Navigator */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: 16,
                    background: 'var(--surface-elevated, rgba(255,255,255,0.03))',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                    marginBottom: 20,
                }}>
                    <button onClick={() => setWeekOffset(w => w - 1)} style={navBtn}>
                        <ChevronLeft size={16} />
                    </button>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary, #fff)', margin: 0 }}>
                            {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
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
                    display: 'flex', alignItems: 'center', gap: 18,
                    padding: '18px 16px', borderRadius: 22,
                    background: `linear-gradient(135deg, ${progressColor}12, ${progressColor}04)`,
                    border: `1px solid ${progressColor}20`,
                    marginBottom: 20,
                }}>
                    <div style={{
                        width: 60, height: 60, borderRadius: '50%',
                        background: `conic-gradient(${progressColor} ${progressPercent * 3.6}deg, var(--border-subtle, rgba(255,255,255,0.06)) 0deg)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <div style={{
                            width: 46, height: 46, borderRadius: '50%', background: 'var(--bg-solid, #0b1120)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 14, fontWeight: 800, color: progressColor, fontFamily: 'monospace',
                        }}>
                            {progressPercent}%
                        </div>
                    </div>
                    <div>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Today's Progress</p>
                        <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary, #fff)', margin: 0, fontFamily: 'monospace' }}>
                            {todayStats.completed}<span style={{ fontSize: 14, color: 'var(--text-muted)' }}>/{todayStats.total}</span>
                        </p>
                    </div>
                </div>

                {/* Chart */}
                <div style={{
                    padding: 16, borderRadius: 22,
                    background: 'var(--surface-elevated, rgba(255,255,255,0.03))',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                    marginBottom: 20,
                }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>Completion Rate</p>
                    <div style={{ height: 180 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                    {statCard('vs Yesterday',
                        todayVsYesterday === 0 ? 'Same' : `${todayVsYesterday > 0 ? '+' : ''}${todayVsYesterday}`,
                        todayVsYesterday > 0 ? <ArrowUp size={16} /> : todayVsYesterday < 0 ? <ArrowDown size={16} /> : null,
                        todayVsYesterday > 0 ? '#22c55e' : todayVsYesterday < 0 ? '#ef4444' : 'var(--text-muted)'
                    )}
                    {statCard('Week Avg', `${weekAverage}%`, <Target size={16} />, getBarColor(weekAverage, false))}
                    {statCard('Best Day', bestDay ? `${bestDay.day}` : '–', null, '#f59e0b')}
                    {statCard('Best Streak', `${bestStreak}d`, <Flame size={16} />, bestStreak > 0 ? '#ef4444' : 'var(--text-muted)')}
                </div>

                {/* Per-Habit Breakdown */}
                <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>Habit Breakdown</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {habitBreakdown.map(h => (
                            <div key={h.id} style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '12px 14px', borderRadius: 14,
                                background: 'var(--surface-elevated, rgba(255,255,255,0.03))',
                                border: '1px solid var(--border-subtle, rgba(255,255,255,0.05))',
                                borderLeft: `3px solid ${h.accentColor}`,
                            }}>
                                <span style={{
                                    flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>{h.name} {h.isPaused && <span style={{ fontSize: 10, color: '#eab308' }}>(paused)</span>}</span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                    {h.completed}/{h.total}
                                </span>
                                <div style={{
                                    width: 44, height: 4, borderRadius: 9999,
                                    background: 'var(--surface-input, rgba(255,255,255,0.06))',
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        width: `${h.rate}%`, height: '100%', borderRadius: 9999,
                                        background: getBarColor(h.rate, false),
                                        transition: 'width 0.3s ease',
                                    }} />
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 800, color: getBarColor(h.rate, false), fontFamily: 'monospace', minWidth: 32, textAlign: 'right' }}>
                                    {h.rate}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const navBtn = {
    width: 32, height: 32, borderRadius: 10,
    background: 'var(--surface-input, rgba(255,255,255,0.06))', border: 'none',
    color: 'var(--text-secondary, rgba(255,255,255,0.6))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
};

export default HabitAnalytics;
