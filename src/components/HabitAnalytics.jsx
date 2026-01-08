import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { X, TrendingUp, ChevronLeft, ChevronRight, Target, Flame, ArrowUp, ArrowDown } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, subWeeks, addWeeks, subDays, isToday } from 'date-fns';

const HabitAnalytics = ({ habits, getStatusForDate, onClose }) => {
    const [weekOffset, setWeekOffset] = useState(0);

    const currentDate = new Date();
    const targetDate = weekOffset === 0 ? currentDate :
        weekOffset < 0 ? subWeeks(currentDate, Math.abs(weekOffset)) : addWeeks(currentDate, weekOffset);

    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });
    const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // Get completion stats for a specific date
    const getCompletionForDate = (dateStr) => {
        if (!habits || habits.length === 0) return { completed: 0, total: 0, rate: 0 };

        const total = habits.length;
        const completed = habits.filter(habit => {
            const status = getStatusForDate(habit, dateStr);
            return status === 'completed';
        }).length;

        return {
            completed,
            total,
            rate: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    };

    // Build chart data for the week
    const chartData = daysOfWeek.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const stats = getCompletionForDate(dateStr);
        const isFutureDay = day > currentDate;

        return {
            day: format(day, 'EEE'),
            date: format(day, 'MMM d'),
            dateStr,
            ...stats,
            isFuture: isFutureDay,
            isCurrentDay: isToday(day),
        };
    });

    // Today's stats
    const todayStr = format(currentDate, 'yyyy-MM-dd');
    const todayStats = getCompletionForDate(todayStr);

    // Yesterday's stats for comparison
    const yesterdayStr = format(subDays(currentDate, 1), 'yyyy-MM-dd');
    const yesterdayStats = getCompletionForDate(yesterdayStr);

    // Comparison
    const todayVsYesterday = todayStats.completed - yesterdayStats.completed;

    // Week average (excluding future days)
    const pastDays = chartData.filter(d => !d.isFuture);
    const weekAverage = pastDays.length > 0
        ? Math.round(pastDays.reduce((acc, d) => acc + d.rate, 0) / pastDays.length)
        : 0;

    // Best day this week
    const bestDay = pastDays.reduce((best, day) =>
        day.rate > (best?.rate || 0) ? day : best, null);

    // Find best current streak across all habits
    const calculateBestStreak = () => {
        if (!habits || habits.length === 0) return 0;

        let bestStreak = 0;
        habits.forEach(habit => {
            let streak = 0;
            for (let i = 0; i <= 365; i++) {
                const checkDate = subDays(currentDate, i);
                const dateStr = format(checkDate, 'yyyy-MM-dd');
                const status = getStatusForDate(habit, dateStr);

                if (status === 'completed') {
                    streak++;
                } else if (status === 'failed' || i > 0) {
                    break;
                }
            }
            if (streak > bestStreak) bestStreak = streak;
        });
        return bestStreak;
    };

    const bestStreak = calculateBestStreak();

    // Get bar color based on completion rate
    const getBarColor = (rate, isFuture) => {
        if (isFuture) return 'rgba(0,0,0,0.1)';
        if (rate >= 80) return '#48bb78';
        if (rate >= 50) return '#ecc94b';
        if (rate > 0) return '#f6ad55';
        return 'rgba(0,0,0,0.15)';
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            if (data.isFuture) return null;

            return (
                <div className="glass-panel" style={{
                    padding: '10px 14px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                }}>
                    <p style={{ fontWeight: '600', marginBottom: '4px' }}>{data.date}</p>
                    <p style={{ fontSize: '13px' }}>
                        <span style={{ color: getBarColor(data.rate, false) }}>{data.completed}/{data.total}</span> habits completed
                    </p>
                    <p style={{ fontSize: '12px', opacity: 0.7 }}>{data.rate}% completion</p>
                </div>
            );
        }
        return null;
    };

    // Today's progress indicator
    const progressPercent = todayStats.rate;
    const progressColor = progressPercent >= 80 ? '#48bb78' : progressPercent >= 50 ? '#ecc94b' : '#f6ad55';

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
        }}>
            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '500px',
                maxHeight: '90vh',
                overflow: 'auto',
                padding: '20px',
                position: 'relative',
            }}>
                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(0,0,0,0.1)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                    }}
                >
                    <X size={18} />
                </button>

                {/* Header */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <TrendingUp size={20} color="#48bb78" />
                        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Habit Analytics</h2>
                    </div>

                    {/* Week Navigator */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '12px',
                    }}>
                        <button
                            onClick={() => setWeekOffset(weekOffset - 1)}
                            style={{
                                background: 'rgba(0,0,0,0.05)',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px',
                                cursor: 'pointer',
                            }}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '14px', fontWeight: '500' }}>
                                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                            </p>
                            <p style={{ fontSize: '12px', opacity: 0.7 }}>
                                {weekOffset === 0 ? 'This Week' :
                                    weekOffset === -1 ? 'Last Week' :
                                        `${Math.abs(weekOffset)} weeks ${weekOffset < 0 ? 'ago' : 'ahead'}`}
                            </p>
                        </div>
                        <button
                            onClick={() => setWeekOffset(weekOffset + 1)}
                            disabled={weekOffset >= 0}
                            style={{
                                background: weekOffset >= 0 ? 'rgba(0,0,0,0.02)' : 'rgba(0,0,0,0.05)',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px',
                                cursor: weekOffset >= 0 ? 'not-allowed' : 'pointer',
                                opacity: weekOffset >= 0 ? 0.3 : 1,
                            }}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                {/* Today's Progress */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    background: `linear-gradient(135deg, ${progressColor}15 0%, ${progressColor}05 100%)`,
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '20px',
                }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: `conic-gradient(${progressColor} ${progressPercent * 3.6}deg, rgba(0,0,0,0.1) 0deg)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: 'var(--glass-bg)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: '700',
                            color: progressColor,
                        }}>
                            {progressPercent}%
                        </div>
                    </div>
                    <div>
                        <p style={{ fontSize: '13px', opacity: 0.7 }}>Today's Progress</p>
                        <p style={{ fontSize: '20px', fontWeight: '700' }}>
                            {todayStats.completed} / {todayStats.total}
                            <span style={{ fontSize: '14px', fontWeight: '400', marginLeft: '8px', opacity: 0.7 }}>habits</span>
                        </p>
                    </div>
                </div>

                {/* Chart */}
                <div style={{ height: '180px', marginBottom: '20px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <XAxis
                                dataKey="day"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11 }}
                                tickFormatter={(value) => `${value}%`}
                                domain={[0, 100]}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={getBarColor(entry.rate, entry.isFuture)}
                                        stroke={entry.isCurrentDay ? 'var(--text-primary)' : 'none'}
                                        strokeWidth={entry.isCurrentDay ? 2 : 0}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Metrics Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                }}>
                    {/* Today vs Yesterday */}
                    <div style={{
                        padding: '12px',
                        background: 'rgba(0,0,0,0.03)',
                        borderRadius: 'var(--radius-sm)',
                    }}>
                        <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px' }}>vs Yesterday</div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '16px',
                            fontWeight: '600',
                            color: todayVsYesterday > 0 ? '#48bb78' : todayVsYesterday < 0 ? '#f56565' : 'var(--text-secondary)',
                        }}>
                            {todayVsYesterday > 0 && <ArrowUp size={16} />}
                            {todayVsYesterday < 0 && <ArrowDown size={16} />}
                            {todayVsYesterday === 0 ? 'Same' : `${Math.abs(todayVsYesterday)} habit${Math.abs(todayVsYesterday) !== 1 ? 's' : ''}`}
                        </div>
                    </div>

                    {/* Week Average */}
                    <div style={{
                        padding: '12px',
                        background: 'rgba(0,0,0,0.03)',
                        borderRadius: 'var(--radius-sm)',
                    }}>
                        <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px' }}>Week Avg</div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '16px',
                            fontWeight: '600',
                            color: getBarColor(weekAverage, false),
                        }}>
                            <Target size={16} />
                            {weekAverage}%
                        </div>
                    </div>

                    {/* Best Day */}
                    <div style={{
                        padding: '12px',
                        background: 'rgba(0,0,0,0.03)',
                        borderRadius: 'var(--radius-sm)',
                    }}>
                        <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px' }}>Best Day</div>
                        <div style={{
                            fontSize: '16px',
                            fontWeight: '600',
                        }}>
                            {bestDay ? `${bestDay.day} (${bestDay.rate}%)` : '-'}
                        </div>
                    </div>

                    {/* Best Current Streak */}
                    <div style={{
                        padding: '12px',
                        background: 'rgba(0,0,0,0.03)',
                        borderRadius: 'var(--radius-sm)',
                    }}>
                        <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px' }}>Best Streak</div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '16px',
                            fontWeight: '600',
                            color: bestStreak > 0 ? '#ff6b6b' : 'var(--text-secondary)',
                        }}>
                            <Flame size={16} />
                            {bestStreak} day{bestStreak !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HabitAnalytics;
