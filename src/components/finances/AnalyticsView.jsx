import React, { useState, useMemo } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, 
    PieChart, Pie 
} from 'recharts';
import { 
    TrendingUp, Calendar, ChevronLeft, ChevronRight, Zap, 
    AlertTriangle, ShoppingBag, ArrowUpRight, Award, Compass 
} from 'lucide-react';
import { 
    format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, 
    isSameDay, subWeeks, addWeeks, startOfMonth, endOfMonth, 
    subMonths, addMonths, isWeekend, getDay 
} from 'date-fns';
import { getIconByName } from '../ExpenseCard';

const PRESET_COLORS = [
    '#4ecdc4', '#ff6b6b', '#ffd166', '#06d6a0', '#118ab2',
    '#8338ec', '#3a86ff', '#f72585', '#7209b7', '#4361ee'
];

const AnalyticsView = ({ transactions = [], categories = [] }) => {
    const [timeframe, setTimeframe] = useState('monthly'); // 'weekly' | 'monthly'
    const [monthOffset, setMonthOffset] = useState(0);
    const [weekOffset, setWeekOffset] = useState(0);
    const [outlierThreshold, setOutlierThreshold] = useState(3000);

    const currentDate = new Date();

    // Target Interval Calculations
    const targetMonth = monthOffset === 0 ? currentDate :
        monthOffset < 0 ? subMonths(currentDate, Math.abs(monthOffset)) : addMonths(currentDate, monthOffset);
    const monthStart = startOfMonth(targetMonth);
    const monthEnd = endOfMonth(targetMonth);

    const targetWeek = weekOffset === 0 ? currentDate :
        weekOffset < 0 ? subWeeks(currentDate, Math.abs(weekOffset)) : addWeeks(currentDate, weekOffset);
    const weekStart = startOfWeek(targetWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(targetWeek, { weekStartsOn: 1 });

    // Filter transactions for active interval
    const periodTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (t.type !== 'expense') return false;
            const d = parseISO(t.date);
            if (timeframe === 'monthly') {
                return d >= monthStart && d <= monthEnd;
            } else {
                return d >= weekStart && d <= weekEnd;
            }
        });
    }, [transactions, timeframe, monthOffset, weekOffset]);

    const totalSpent = useMemo(() => {
        return periodTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    }, [periodTransactions]);

    // Daily Chart Data
    const chartData = useMemo(() => {
        if (timeframe === 'weekly') {
            const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
            return days.map(day => {
                const dayTotal = periodTransactions
                    .filter(t => isSameDay(parseISO(t.date), day))
                    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
                return {
                    label: format(day, 'EEE'),
                    fullDate: format(day, 'MMM d'),
                    amount: Math.round(dayTotal)
                };
            });
        } else {
            // Group by days of month
            const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
            return daysInMonth.map(day => {
                const dayTotal = periodTransactions
                    .filter(t => isSameDay(parseISO(t.date), day))
                    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
                return {
                    label: format(day, 'd'),
                    fullDate: format(day, 'MMM d'),
                    amount: Math.round(dayTotal)
                };
            });
        }
    }, [periodTransactions, timeframe, weekStart, weekEnd, monthStart, monthEnd]);

    // Category Breakdown
    const categoryBreakdown = useMemo(() => {
        const map = {};
        periodTransactions.forEach(t => {
            const card = categories.find(c => c.id === t.card_id || c.id === t.category || (c.category_ids && c.category_ids.includes(t.category)));
            const catName = card?.name || 'Uncategorized';
            const catColor = card?.color || '#94a3b8';
            if (!map[catName]) {
                map[catName] = { name: catName, color: catColor, amount: 0, count: 0 };
            }
            map[catName].amount += parseFloat(t.amount);
            map[catName].count += 1;
        });

        return Object.values(map)
            .sort((a, b) => b.amount - a.amount)
            .map((item, idx) => ({
                ...item,
                percentage: totalSpent > 0 ? Math.round((item.amount / totalSpent) * 100) : 0,
                color: item.color || PRESET_COLORS[idx % PRESET_COLORS.length]
            }));
    }, [periodTransactions, categories, totalSpent]);

    // Behavioral Insights
    const insights = useMemo(() => {
        let weekdayTotal = 0;
        let weekendTotal = 0;
        let highestDay = { label: 'None', amount: 0 };

        chartData.forEach(d => {
            if (d.amount > highestDay.amount) {
                highestDay = d;
            }
        });

        periodTransactions.forEach(t => {
            const d = parseISO(t.date);
            const amt = parseFloat(t.amount) || 0;
            if (isWeekend(d)) {
                weekendTotal += amt;
            } else {
                weekdayTotal += amt;
            }
        });

        const activeDaysCount = timeframe === 'weekly' ? 7 : new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
        const dailyAverage = totalSpent / Math.max(1, activeDaysCount);

        return {
            weekdayPercentage: totalSpent > 0 ? Math.round((weekdayTotal / totalSpent) * 100) : 0,
            weekendPercentage: totalSpent > 0 ? Math.round((weekendTotal / totalSpent) * 100) : 0,
            dailyAverage: Math.round(dailyAverage),
            highestDay,
            topCategory: categoryBreakdown[0] || null
        };
    }, [periodTransactions, chartData, totalSpent, timeframe, targetMonth, categoryBreakdown]);

    // Outlier Transactions (> threshold)
    const outliers = useMemo(() => {
        return periodTransactions
            .filter(t => parseFloat(t.amount) >= outlierThreshold)
            .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
    }, [periodTransactions, outlierThreshold]);

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div style={{
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--glass-card-border)',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    boxShadow: 'var(--shadow-md)'
                }}>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>{data.fullDate}</p>
                    <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        ₹{data.amount.toLocaleString('en-IN')}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="finances-subview" style={{ animation: 'fadeIn 0.3s ease' }}>
            
            {/* Header & Interval Controls */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px'
            }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                        Spending Analytics
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                        Track velocity, category share, and big anomalies
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Timeframe Switcher */}
                    <div style={{
                        display: 'flex',
                        background: 'var(--surface-input)',
                        padding: '3px',
                        borderRadius: '12px',
                        border: '1px solid var(--glass-card-border)'
                    }}>
                        <button
                            onClick={() => { setTimeframe('weekly'); setWeekOffset(0); }}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                background: timeframe === 'weekly' ? 'var(--glass-card-bg)' : 'transparent',
                                color: timeframe === 'weekly' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                fontSize: '13px',
                                fontWeight: timeframe === 'weekly' ? '700' : '500',
                                cursor: 'pointer'
                            }}
                        >
                            Weekly
                        </button>
                        <button
                            onClick={() => { setTimeframe('monthly'); setMonthOffset(0); }}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                background: timeframe === 'monthly' ? 'var(--glass-card-bg)' : 'transparent',
                                color: timeframe === 'monthly' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                fontSize: '13px',
                                fontWeight: timeframe === 'monthly' ? '700' : '500',
                                cursor: 'pointer'
                            }}
                        >
                            Monthly
                        </button>
                    </div>

                    {/* Date Stepper */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'var(--surface-input)',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        border: '1px solid var(--glass-card-border)'
                    }}>
                        <button
                            onClick={() => timeframe === 'monthly' ? setMonthOffset(m => m - 1) : setWeekOffset(w => w - 1)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex' }}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span style={{ fontSize: '13px', fontWeight: '600', minWidth: '100px', textAlign: 'center' }}>
                            {timeframe === 'monthly'
                                ? format(targetMonth, 'MMMM yyyy')
                                : `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`}
                        </span>
                        <button
                            onClick={() => timeframe === 'monthly' ? setMonthOffset(m => m + 1) : setWeekOffset(w => w + 1)}
                            disabled={(timeframe === 'monthly' && monthOffset >= 0) || (timeframe === 'weekly' && weekOffset >= 0)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-primary)',
                                cursor: (timeframe === 'monthly' && monthOffset >= 0) || (timeframe === 'weekly' && weekOffset >= 0) ? 'not-allowed' : 'pointer',
                                opacity: (timeframe === 'monthly' && monthOffset >= 0) || (timeframe === 'weekly' && weekOffset >= 0) ? 0.3 : 1,
                                display: 'flex'
                            }}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Metrics Bar */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '12px',
                marginBottom: '20px'
            }}>
                <div className="glass-card" style={{ padding: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Total Spent
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        ₹{Math.round(totalSpent).toLocaleString('en-IN')}
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Daily Average
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-primary, #4ecdc4)' }}>
                        ₹{insights.dailyAverage.toLocaleString('en-IN')}<span style={{ fontSize: '12px', fontWeight: '500' }}>/day</span>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Top Category
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {insights.topCategory ? insights.topCategory.name : '—'}
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                        Peak Spend Day
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {insights.highestDay.amount > 0 ? `${insights.highestDay.fullDate}` : '—'}
                    </div>
                </div>
            </div>

            {/* Spending Velocity Bar Chart */}
            <div className="glass-card" style={{ padding: '20px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={18} color="var(--accent-primary, #4ecdc4)" /> Spending Trend Over Time
                </h3>
                <div style={{ width: '100%', height: '220px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <XAxis 
                                dataKey="label" 
                                stroke="var(--text-secondary)" 
                                fontSize={11} 
                                tickLine={false} 
                                axisLine={false} 
                            />
                            <YAxis 
                                stroke="var(--text-secondary)" 
                                fontSize={11} 
                                tickLine={false} 
                                axisLine={false} 
                                tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={entry.amount === insights.highestDay.amount && entry.amount > 0 ? '#ff6b6b' : 'var(--accent-primary, #4ecdc4)'} 
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Category Share & Behavioral Distribution */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
                marginBottom: '20px'
            }}>
                
                {/* Category Donut & List */}
                <div className="glass-card" style={{ padding: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>
                        Category Distribution
                    </h3>
                    
                    {categoryBreakdown.length > 0 ? (
                        <div>
                            <div style={{ width: '100%', height: '160px', marginBottom: '12px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryBreakdown}
                                            dataKey="amount"
                                            nameKey="name"
                                            innerRadius={45}
                                            outerRadius={70}
                                            paddingAngle={3}
                                        >
                                            {categoryBreakdown.map((entry, index) => (
                                                <Cell key={`slice-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                                {categoryBreakdown.map(cat => (
                                    <div key={cat.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: cat.color }} />
                                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{cat.name}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>{cat.percentage}%</span>
                                            <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>₹{Math.round(cat.amount).toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '30px 0' }}>
                            No expenses recorded for this period.
                        </p>
                    )}
                </div>

                {/* Behavioral Habits */}
                <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>
                            Spending Rhythm
                        </h3>

                        {/* Weekday vs Weekend Split */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', marginBottom: '6px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Weekdays ({insights.weekdayPercentage}%)</span>
                                <span style={{ color: 'var(--text-secondary)' }}>Weekends ({insights.weekendPercentage}%)</span>
                            </div>
                            <div style={{ width: '100%', height: '10px', background: 'var(--surface-input)', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
                                <div style={{ width: `${insights.weekdayPercentage}%`, background: 'var(--accent-primary, #4ecdc4)', transition: 'width 0.3s ease' }} />
                                <div style={{ width: `${insights.weekendPercentage}%`, background: '#ff6b6b', transition: 'width 0.3s ease' }} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ padding: '10px', background: 'var(--surface-input)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Zap size={18} color="var(--accent-primary, #4ecdc4)" />
                                <div>
                                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>Burn Velocity</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                        Spending approximately ₹{insights.dailyAverage.toLocaleString('en-IN')} each day.
                                    </div>
                                </div>
                            </div>

                            <div style={{ padding: '10px', background: 'var(--surface-input)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Compass size={18} color="#ffd166" />
                                <div>
                                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>Dominant Habit</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                        {insights.topCategory ? `${insights.topCategory.name} represents ${insights.topCategory.percentage}% of all expenses.` : 'No data yet.'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Outlier Spotlight */}
            <div className="glass-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AlertTriangle size={18} color="#ffd166" /> Outlier & Big Purchases
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                            Purchases ≥ ₹{outlierThreshold.toLocaleString('en-IN')} that impact your baseline runway
                        </p>
                    </div>

                    {/* Threshold selector */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {[2000, 3000, 5000].map(val => (
                            <button
                                key={val}
                                onClick={() => setOutlierThreshold(val)}
                                style={{
                                    padding: '4px 8px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--glass-card-border)',
                                    background: outlierThreshold === val ? 'var(--accent-primary, #4ecdc4)' : 'var(--surface-input)',
                                    color: outlierThreshold === val ? '#fff' : 'var(--text-secondary)',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                ≥₹{(val/1000).toFixed(0)}k
                            </button>
                        ))}
                    </div>
                </div>

                {outliers.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {outliers.map(tx => {
                            const card = categories.find(c => c.id === tx.card_id);
                            return (
                                <div
                                    key={tx.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px',
                                        borderRadius: '10px',
                                        background: 'var(--surface-input)',
                                        border: '1px solid var(--glass-card-border)'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '8px',
                                            background: card ? `${card.color}22` : 'rgba(255, 209, 102, 0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {card ? React.cloneElement(getIconByName(card.name), { color: card.color, size: 16 }) : <ShoppingBag size={16} color="#ffd166" />}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{tx.description}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                {card?.name || 'Expense'} • {format(parseISO(tx.date), 'MMM d, yyyy')}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--danger)' }}>
                                        -₹{parseFloat(tx.amount).toLocaleString('en-IN')}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0, padding: '12px 0' }}>
                        No big outlier purchases over ₹{outlierThreshold.toLocaleString('en-IN')} found in this period.
                    </p>
                )}
            </div>
        </div>
    );
};

export default AnalyticsView;
