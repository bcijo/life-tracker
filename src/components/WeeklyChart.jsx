import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { X, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, isSameDay, subWeeks, addWeeks } from 'date-fns';

const WeeklyChart = ({ transactions, categories, onClose }) => {
    const [weekOffset, setWeekOffset] = useState(0);

    const currentDate = new Date();
    const targetDate = weekOffset === 0 ? currentDate :
        weekOffset < 0 ? subWeeks(currentDate, Math.abs(weekOffset)) : addWeeks(currentDate, weekOffset);

    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });
    const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // Get expense categories
    const expenseCategories = categories.filter(c => c.type === 'expense' || c.type === 'both');

    // Build chart data
    const chartData = daysOfWeek.map(day => {
        const dayData = {
            day: format(day, 'EEE'),
            date: format(day, 'MMM d'),
            total: 0,
        };

        expenseCategories.forEach(cat => {
            const categoryTotal = transactions
                .filter(t =>
                    t.type === 'expense' &&
                    t.category === cat.id &&
                    isSameDay(parseISO(t.date), day)
                )
                .reduce((acc, t) => acc + parseFloat(t.amount), 0);

            dayData[cat.id] = categoryTotal;
            dayData.total += categoryTotal;
        });

        return dayData;
    });

    // Calculate week totals
    const weekTotal = chartData.reduce((acc, day) => acc + day.total, 0);

    // Category totals for the legend
    const categoryTotals = expenseCategories.map(cat => ({
        ...cat,
        total: chartData.reduce((acc, day) => acc + (day[cat.id] || 0), 0),
    })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="glass-panel" style={{
                    padding: '12px',
                    minWidth: '120px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                }}>
                    <p style={{ fontWeight: '600', marginBottom: '8px' }}>{data.date}</p>
                    {categoryTotals.map(cat => {
                        const value = data[cat.id];
                        if (!value || value === 0) return null;
                        return (
                            <div key={cat.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '12px',
                                fontSize: '12px',
                                marginBottom: '4px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '2px',
                                        background: cat.color,
                                    }} />
                                    <span>{cat.name}</span>
                                </div>
                                <span style={{ fontWeight: '500' }}>₹{value.toFixed(0)}</span>
                            </div>
                        );
                    })}
                    <div style={{
                        borderTop: '1px solid rgba(0,0,0,0.1)',
                        marginTop: '8px',
                        paddingTop: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: '600',
                    }}>
                        <span>Total</span>
                        <span>₹{data.total.toFixed(0)}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

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
                        <TrendingUp size={20} color="#4ecdc4" />
                        <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Weekly Spending</h2>
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

                {/* Total */}
                <div style={{
                    textAlign: 'center',
                    padding: '16px',
                    background: 'linear-gradient(135deg, rgba(78, 205, 196, 0.1) 0%, rgba(78, 205, 196, 0.02) 100%)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '20px',
                }}>
                    <p style={{ fontSize: '12px', opacity: 0.7, marginBottom: '4px' }}>Total Spent</p>
                    <p style={{ fontSize: '28px', fontWeight: '700', color: '#4ecdc4' }}>
                        ₹{weekTotal.toFixed(0)}
                    </p>
                </div>

                {/* Chart */}
                <div style={{ height: '220px', marginBottom: '20px' }}>
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
                                tickFormatter={(value) => `₹${value}`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            {categoryTotals.map((cat, index) => (
                                <Bar
                                    key={cat.id}
                                    dataKey={cat.id}
                                    stackId="a"
                                    fill={cat.color}
                                    radius={index === categoryTotals.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Category Legend */}
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    justifyContent: 'center',
                }}>
                    {categoryTotals.slice(0, 6).map(cat => (
                        <div
                            key={cat.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 10px',
                                background: `${cat.color}15`,
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '11px',
                            }}
                        >
                            <div style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '3px',
                                background: cat.color,
                            }} />
                            <span>{cat.name}</span>
                            <span style={{ fontWeight: '600' }}>₹{cat.total.toFixed(0)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WeeklyChart;
