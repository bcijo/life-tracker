import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, X } from 'lucide-react';
import { generateReport } from '../lib/groq';
import { startOfWeek, endOfWeek, subWeeks, parseISO, isWithinInterval, format } from 'date-fns';

const WeeklySummary = ({ transactions, categories }) => {
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(true);
    const [isDismissed, setIsDismissed] = useState(false);
    const [weeklyData, setWeeklyData] = useState(null);

    const currentDate = new Date();
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const lastWeekStart = startOfWeek(subWeeks(currentDate, 1), { weekStartsOn: 1 });
    const lastWeekEnd = endOfWeek(subWeeks(currentDate, 1), { weekStartsOn: 1 });

    useEffect(() => {
        if (transactions.length > 0 && categories.length > 0) {
            computeWeeklyData();
        }
    }, [transactions, categories]);

    const computeWeeklyData = () => {
        // This week's transactions
        const thisWeekTransactions = transactions.filter(t =>
            t.type === 'expense' &&
            isWithinInterval(parseISO(t.date), { start: weekStart, end: weekEnd })
        );

        // Last week's transactions
        const lastWeekTransactions = transactions.filter(t =>
            t.type === 'expense' &&
            isWithinInterval(parseISO(t.date), { start: lastWeekStart, end: lastWeekEnd })
        );

        const thisWeekTotal = thisWeekTransactions.reduce((acc, t) => acc + parseFloat(t.amount), 0);
        const lastWeekTotal = lastWeekTransactions.reduce((acc, t) => acc + parseFloat(t.amount), 0);

        // Category breakdown
        const categoryBreakdown = categories
            .filter(c => c.type === 'expense' || c.type === 'both')
            .map(cat => {
                const amount = thisWeekTransactions
                    .filter(t => t.category === cat.id)
                    .reduce((acc, t) => acc + parseFloat(t.amount), 0);
                return {
                    id: cat.id,
                    name: cat.name,
                    amount,
                    percentage: thisWeekTotal > 0 ? (amount / thisWeekTotal) * 100 : 0,
                    color: cat.color,
                };
            })
            .filter(c => c.amount > 0)
            .sort((a, b) => b.amount - a.amount);

        const topCategory = categoryBreakdown[0] || { name: 'None', amount: 0 };

        // Daily breakdown
        const dailyTotals = {};
        thisWeekTransactions.forEach(t => {
            const day = format(parseISO(t.date), 'EEEE');
            dailyTotals[day] = (dailyTotals[day] || 0) + parseFloat(t.amount);
        });

        const highestSpendDay = Object.entries(dailyTotals)
            .sort((a, b) => b[1] - a[1])[0] || ['None', 0];

        const data = {
            thisWeekTotal,
            lastWeekTotal,
            categoryBreakdown,
            topCategory,
            dailyAverage: thisWeekTotal / 7,
            highestSpendDay: { day: highestSpendDay[0], amount: highestSpendDay[1] },
        };

        setWeeklyData(data);
    };

    const fetchInsights = async () => {
        if (!weeklyData || weeklyData.thisWeekTotal === 0) return;

        setLoading(true);
        try {
            // Simulate "Weekly" report for this specific component using the generic report generator
            // We construct a mini-context just for this chart
            const miniContext = {
                financial: {
                    weeklyData
                }
            };

            const report = await generateReport('weekly', 'this week', 'now', miniContext);
            if (report && report.highlights) {
                setInsights(report.highlights);
            }
        } catch (error) {
            console.error('Error fetching insights:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!weeklyData || weeklyData.thisWeekTotal === 0 || isDismissed) {
        return null; // Don't show if no data or dismissed
    }

    const change = weeklyData.thisWeekTotal - weeklyData.lastWeekTotal;
    const changePercent = weeklyData.lastWeekTotal > 0
        ? Math.abs((change / weeklyData.lastWeekTotal) * 100)
        : 0;

    const TrendIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
    const trendColor = change > 0 ? '#f56565' : change < 0 ? '#48bb78' : '#718096';

    return (
        <div
            className="glass-card"
            style={{
                padding: '16px',
                marginBottom: '20px',
                background: 'linear-gradient(135deg, rgba(128, 90, 213, 0.1) 0%, rgba(128, 90, 213, 0.02) 100%)',
                borderLeft: '4px solid #805ad5',
            }}
        >
            {/* Header */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>📊</span>
                    <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Weekly Summary</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: trendColor,
                        fontSize: '14px',
                        fontWeight: '600',
                    }}>
                        <TrendIcon size={16} />
                        <span>{changePercent.toFixed(0)}%</span>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsDismissed(true);
                        }}
                        style={{
                            background: 'rgba(0,0,0,0.05)',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-secondary)',
                        }}
                        title="Dismiss"
                    >
                        <X size={16} />
                    </button>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
            </div>

            {isExpanded && (
                <div style={{ marginTop: '16px' }}>
                    {/* Stats Row */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '12px',
                        marginBottom: '16px',
                    }}>
                        <div style={{
                            padding: '12px',
                            background: 'rgba(255,255,255,0.5)',
                            borderRadius: 'var(--radius-sm)',
                            textAlign: 'center',
                        }}>
                            <p style={{ fontSize: '11px', opacity: 0.7, marginBottom: '4px' }}>This Week</p>
                            <p style={{ fontSize: '20px', fontWeight: '700' }}>
                                ₹{weeklyData.thisWeekTotal.toFixed(0)}
                            </p>
                        </div>
                        <div style={{
                            padding: '12px',
                            background: 'rgba(255,255,255,0.5)',
                            borderRadius: 'var(--radius-sm)',
                            textAlign: 'center',
                        }}>
                            <p style={{ fontSize: '11px', opacity: 0.7, marginBottom: '4px' }}>Last Week</p>
                            <p style={{ fontSize: '20px', fontWeight: '700', opacity: 0.7 }}>
                                ₹{weeklyData.lastWeekTotal.toFixed(0)}
                            </p>
                        </div>
                    </div>

                    {/* Top Categories */}
                    <div style={{ marginBottom: '16px' }}>
                        <p style={{ fontSize: '12px', opacity: 0.7, marginBottom: '8px' }}>Top Categories</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {weeklyData.categoryBreakdown.slice(0, 3).map(cat => (
                                <div
                                    key={cat.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 10px',
                                        background: `${cat.color}20`,
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '12px',
                                    }}
                                >
                                    <div style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '2px',
                                        background: cat.color,
                                    }} />
                                    <span>{cat.name}</span>
                                    <span style={{ fontWeight: '600' }}>₹{cat.amount.toFixed(0)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* AI Insights */}
                    <div style={{
                        padding: '12px',
                        background: 'rgba(128, 90, 213, 0.1)',
                        borderRadius: 'var(--radius-sm)',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: insights.length > 0 ? '10px' : 0,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Sparkles size={14} color="#805ad5" />
                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#805ad5' }}>
                                    AI Insights
                                </span>
                            </div>
                            <button
                                onClick={fetchInsights}
                                disabled={loading}
                                style={{
                                    background: 'rgba(128, 90, 213, 0.2)',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '6px 10px',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '11px',
                                    color: '#805ad5',
                                    fontWeight: '500',
                                }}
                            >
                                <RefreshCw size={12} className={loading ? 'spin' : ''} />
                                {insights.length > 0 ? 'Refresh' : 'Generate'}
                            </button>
                        </div>

                        {insights.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {insights.map((insight, index) => (
                                    <p key={index} style={{ fontSize: '13px', lineHeight: '1.5' }}>
                                        💡 {insight}
                                    </p>
                                ))}
                            </div>
                        ) : (
                            <p style={{ fontSize: '12px', opacity: 0.7 }}>
                                Click "Generate" to get AI-powered spending insights
                            </p>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spin {
                    animation: spin 1s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default WeeklySummary;
