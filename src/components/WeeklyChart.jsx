import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { X, TrendingUp, ChevronLeft, ChevronRight, CalendarDays, CalendarRange } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, isSameDay, subWeeks, addWeeks, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';

const WeeklyChart = ({ transactions, categories, onClose }) => {
    const [viewMode, setViewMode] = useState('monthly'); // 'monthly' | 'weekly'
    const [weekOffset, setWeekOffset] = useState(0);
    const [monthOffset, setMonthOffset] = useState(0);

    const currentDate = new Date();

    // All categories passed are expense categories
    const expenseCategories = categories;

    // --- WEEKLY LOGIC ---
    const targetWeek = weekOffset === 0 ? currentDate :
        weekOffset < 0 ? subWeeks(currentDate, Math.abs(weekOffset)) : addWeeks(currentDate, weekOffset);
    const weekStart = startOfWeek(targetWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(targetWeek, { weekStartsOn: 1 });
    const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    const weeklyChartData = daysOfWeek.map(day => {
        const dayData = {
            day: format(day, 'EEE'),
            date: format(day, 'MMM d'),
            total: 0,
        };
        expenseCategories.forEach(cat => {
            const categoryTotal = transactions
                .filter(t => {
                    if (t.type !== 'expense' || !isSameDay(parseISO(t.date), day)) return false;
                    return t.card_id === cat.id || (cat.category_ids && cat.category_ids.includes(t.category));
                })
                .reduce((acc, t) => acc + parseFloat(t.amount), 0);
            dayData[cat.id] = categoryTotal;
            dayData.total += categoryTotal;
        });
        return dayData;
    });

    const weeklyTotal = weeklyChartData.reduce((acc, day) => acc + day.total, 0);
    const weeklyCategoryTotals = expenseCategories.map(cat => ({
        ...cat,
        total: weeklyChartData.reduce((acc, day) => acc + (day[cat.id] || 0), 0),
    })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

    // --- MONTHLY LOGIC ---
    const targetMonth = monthOffset === 0 ? currentDate :
        monthOffset < 0 ? subMonths(currentDate, Math.abs(monthOffset)) : addMonths(currentDate, monthOffset);
    const monthStart = startOfMonth(targetMonth);
    const monthEnd = endOfMonth(targetMonth);

    const monthlyCategoryTotals = expenseCategories.map(cat => {
        const total = transactions
            .filter(t => {
                if (t.type !== 'expense') return false;
                const d = parseISO(t.date);
                return d >= monthStart && d <= monthEnd && (t.card_id === cat.id || (cat.category_ids && cat.category_ids.includes(t.category)));
            })
            .reduce((acc, t) => acc + parseFloat(t.amount), 0);
        return { ...cat, total };
    }).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

    const monthlyTotal = monthlyCategoryTotals.reduce((acc, cat) => acc + cat.total, 0);

    const monthlyChartData = monthlyCategoryTotals.map(cat => ({
        name: cat.name,
        color: cat.color,
        amount: cat.total
    }));

    // --- RENDER HELPERS ---
    const activeTotals = viewMode === 'monthly' ? monthlyCategoryTotals : weeklyCategoryTotals;
    const activeTotalSum = viewMode === 'monthly' ? monthlyTotal : weeklyTotal;

    const CustomTooltipWeekly = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="glass-panel" style={{ padding: '12px', minWidth: '120px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                    <p style={{ fontWeight: '600', marginBottom: '8px' }}>{data.date}</p>
                    {weeklyCategoryTotals.map(cat => {
                        const value = data[cat.id];
                        if (!value || value === 0) return null;
                        return (
                            <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', fontSize: '12px', marginBottom: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: cat.color }} />
                                    <span>{cat.name}</span>
                                </div>
                                <span style={{ fontWeight: '500' }}>₹{value.toFixed(0)}</span>
                            </div>
                        );
                    })}
                    <div style={{ borderTop: '1px solid rgba(0,0,0,0.1)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                        <span>Total</span>
                        <span>₹{data.total.toFixed(0)}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    const CustomTooltipMonthly = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="glass-panel" style={{ padding: '12px', minWidth: '120px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                    <p style={{ fontWeight: '600', marginBottom: '8px', color: data.color }}>{data.name}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                        <span>Total</span>
                        <span>₹{data.amount.toFixed(0)}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'var(--overlay-bg)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
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
                padding: '24px',
                position: 'relative',
                animation: 'fadeIn 0.3s ease',
            }}>
                {/* Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'var(--glass-card-bg)',
                        border: '1px solid var(--glass-card-border)',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--text-primary)',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <X size={18} />
                </button>

                {/* Header & Toggle */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <TrendingUp size={22} color="var(--accent-primary)" />
                        <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Expenditure Analytics</h2>
                    </div>

                    {/* Segmented Control for Monthly/Weekly */}
                    <div style={{ display: 'flex', background: 'var(--surface-input)', borderRadius: '12px', padding: '4px', marginBottom: '20px' }}>
                        <button
                            onClick={() => setViewMode('monthly')}
                            style={{
                                flex: 1, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: viewMode === 'monthly' ? '600' : '500',
                                background: viewMode === 'monthly' ? 'var(--glass-card-bg)' : 'transparent',
                                color: viewMode === 'monthly' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                boxShadow: viewMode === 'monthly' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                                cursor: 'pointer', transition: 'all 0.2s ease'
                            }}
                        >
                            <CalendarDays size={16} /> Monthly
                        </button>
                        <button
                            onClick={() => setViewMode('weekly')}
                            style={{
                                flex: 1, padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: viewMode === 'weekly' ? '600' : '500',
                                background: viewMode === 'weekly' ? 'var(--glass-card-bg)' : 'transparent',
                                color: viewMode === 'weekly' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                boxShadow: viewMode === 'weekly' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                                cursor: 'pointer', transition: 'all 0.2s ease'
                            }}
                        >
                            <CalendarRange size={16} /> Weekly
                        </button>
                    </div>

                    {/* Time Navigator */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--glass-card-bg)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-card-border)' }}>
                        <button
                            onClick={() => viewMode === 'monthly' ? setMonthOffset(monthOffset - 1) : setWeekOffset(weekOffset - 1)}
                            style={{ background: 'var(--surface-input)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: 'var(--text-primary)' }}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '14px', fontWeight: '600' }}>
                                {viewMode === 'monthly' 
                                    ? format(targetMonth, 'MMMM yyyy') 
                                    : `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`
                                }
                            </p>
                            <p style={{ fontSize: '12px', opacity: 0.7 }}>
                                {viewMode === 'monthly' 
                                    ? (monthOffset === 0 ? 'This Month' : monthOffset === -1 ? 'Last Month' : `${Math.abs(monthOffset)} months ago`)
                                    : (weekOffset === 0 ? 'This Week' : weekOffset === -1 ? 'Last Week' : `${Math.abs(weekOffset)} weeks ago`)
                                }
                            </p>
                        </div>
                        <button
                            onClick={() => viewMode === 'monthly' ? setMonthOffset(monthOffset + 1) : setWeekOffset(weekOffset + 1)}
                            disabled={viewMode === 'monthly' ? monthOffset >= 0 : weekOffset >= 0}
                            style={{ 
                                background: 'var(--surface-input)', border: 'none', borderRadius: '8px', padding: '8px', 
                                cursor: (viewMode === 'monthly' ? monthOffset >= 0 : weekOffset >= 0) ? 'not-allowed' : 'pointer', 
                                opacity: (viewMode === 'monthly' ? monthOffset >= 0 : weekOffset >= 0) ? 0.3 : 1, 
                                color: 'var(--text-primary)' 
                            }}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>

                {/* Total */}
                <div style={{ textAlign: 'center', padding: '20px', background: 'var(--glass-card-bg)', border: '1px solid var(--glass-card-border)', borderRadius: '16px', marginBottom: '24px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Spent</p>
                    <p style={{ fontSize: '32px', fontWeight: '800', color: 'var(--accent-primary)', letterSpacing: '-0.5px' }}>
                        ₹{activeTotalSum.toFixed(0)}
                    </p>
                </div>

                {/* Chart Area */}
                <div style={{ height: '220px', marginBottom: '24px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        {viewMode === 'weekly' ? (
                            <BarChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(value) => `₹${value}`} />
                                <Tooltip content={<CustomTooltipWeekly />} cursor={{ fill: 'var(--surface-input)', opacity: 0.4 }} />
                                {weeklyCategoryTotals.map((cat, index) => (
                                    <Bar key={cat.id} dataKey={cat.id} stackId="a" fill={cat.color} radius={index === weeklyCategoryTotals.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                                ))}
                            </BarChart>
                        ) : (
                            monthlyChartData.length > 0 ? (
                                <PieChart>
                                    <Pie data={monthlyChartData} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2}>
                                        {monthlyChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltipMonthly />} />
                                </PieChart>
                            ) : (
                                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5, fontSize: '14px' }}>
                                    No expenses this month.
                                </div>
                            )
                        )}
                    </ResponsiveContainer>
                </div>

                {/* Category Legend */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                    {activeTotals.map(cat => (
                        <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: `${cat.color}15`, borderRadius: '12px', fontSize: '12px', border: `1px solid ${cat.color}33` }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '4px', background: cat.color }} />
                            <span>{cat.name}</span>
                            <span style={{ fontWeight: '700', marginLeft: '4px' }}>₹{cat.total.toFixed(0)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WeeklyChart;
