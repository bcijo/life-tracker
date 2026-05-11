import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ShoppingBag, Trash2, PieChart as PieChartIcon, Plus, Settings } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, parseISO } from 'date-fns';
import useTransactions from '../hooks/useTransactions';
import useExpenseCards from '../hooks/useExpenseCards';

const PRESET_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
    '#D4A5A5', '#9B59B6', '#3498DB', '#E67E22', '#2ECC71',
    '#FECA57', '#5F27CD', '#54A0FF', '#01A3A4'
];

const ExpenseCardDetail = ({ card, onClose, onEdit, onAddExpense }) => {
    const { deleteTransaction, transactions } = useTransactions();
    const { fetchSubcategories } = useExpenseCards();

    const [subcategories, setSubcategories] = useState([]);
    const [monthOffset, setMonthOffset] = useState(0);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    useEffect(() => {
        const loadSubs = async () => {
            const data = await fetchSubcategories(card.id);
            setSubcategories(data || []);
        };
        loadSubs();
    }, [card.id]);

    const currentDate = new Date();
    const targetMonth = monthOffset === 0 ? currentDate :
        monthOffset < 0 ? subMonths(currentDate, Math.abs(monthOffset)) : addMonths(currentDate, monthOffset);
    const monthStart = startOfMonth(targetMonth);
    const monthEnd = endOfMonth(targetMonth);

    // Filter transactions for this card and selected month
    const monthlyTransactions = useMemo(() => {
        return transactions.filter(t => {
            if (t.type !== 'expense') return false;
            const d = parseISO(t.date);
            const isMatchCard = t.card_id === card.id || t.category === card.id || (card.category_ids && card.category_ids.includes(t.category));
            return isMatchCard && d >= monthStart && d <= monthEnd;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [transactions, card.id, monthOffset]);

    // Group by subcategory for Pie Chart
    const chartData = useMemo(() => {
        const groups = {};
        let hasData = false;

        monthlyTransactions.forEach(tx => {
            const subId = tx.subcategory_id || 'uncategorized';
            if (!groups[subId]) {
                const subObj = subcategories.find(s => s.id === subId);
                groups[subId] = {
                    id: subId,
                    name: subObj ? subObj.name : 'Uncategorized',
                    amount: 0,
                    // Assign a consistent color based on index or fallback
                    color: subObj ? (PRESET_COLORS[subcategories.findIndex(s => s.id === subId) % PRESET_COLORS.length] || card.color) : 'var(--text-muted)'
                };
            }
            groups[subId].amount += parseFloat(tx.amount);
            hasData = true;
        });

        return hasData ? Object.values(groups).sort((a, b) => b.amount - a.amount) : [];
    }, [monthlyTransactions, subcategories, card.color]);

    const totalSpent = monthlyTransactions.reduce((acc, t) => acc + parseFloat(t.amount), 0);

    const CustomTooltip = ({ active, payload }) => {
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
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
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
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                background: 'var(--surface-elevated)',
                padding: 0,
                overflow: 'hidden',
                border: '1px solid var(--glass-border)',
                animation: 'fadeIn 0.2s ease',
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px',
                    background: card.color,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {card.name} Analytics
                            </h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(0,0,0,0.2)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                        <button
                            onClick={onAddExpense}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: card.color,
                                color: '#fff',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Plus size={16} /> Add Expense
                        </button>
                        <button
                            onClick={onEdit}
                            style={{
                                flex: 1,
                                padding: '12px',
                                background: 'var(--surface-input)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '12px',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Settings size={16} /> Edit Category
                        </button>
                    </div>

                    {/* Time Navigator */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--glass-card-bg)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-card-border)', marginBottom: '24px' }}>
                        <button
                            onClick={() => setMonthOffset(monthOffset - 1)}
                            style={{ background: 'var(--surface-input)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: 'var(--text-primary)' }}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>
                                {format(targetMonth, 'MMMM yyyy')}
                            </p>
                            <p style={{ fontSize: '12px', opacity: 0.7, margin: 0 }}>
                                {monthOffset === 0 ? 'This Month' : monthOffset === -1 ? 'Last Month' : `${Math.abs(monthOffset)} months ago`}
                            </p>
                        </div>
                        <button
                            onClick={() => setMonthOffset(monthOffset + 1)}
                            disabled={monthOffset >= 0}
                            style={{ 
                                background: 'var(--surface-input)', border: 'none', borderRadius: '8px', padding: '8px', 
                                cursor: monthOffset >= 0 ? 'not-allowed' : 'pointer', 
                                opacity: monthOffset >= 0 ? 0.3 : 1, 
                                color: 'var(--text-primary)' 
                            }}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    {/* Chart Area */}
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600', letterSpacing: '0.5px' }}>TOTAL SPENT</p>
                        <p style={{ fontSize: '32px', fontWeight: '800', color: card.color, margin: 0, letterSpacing: '-0.5px' }}>
                            ₹{totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>
                    </div>

                    <div style={{ height: '220px', marginBottom: '24px', position: 'relative' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            {chartData.length > 0 ? (
                                <PieChart>
                                    <Pie data={chartData} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            ) : (
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5, gap: '8px' }}>
                                    <PieChartIcon size={32} />
                                    <span style={{ fontSize: '14px', fontWeight: '500' }}>No expenses this month.</span>
                                </div>
                            )}
                        </ResponsiveContainer>
                    </div>

                    {/* Legend */}
                    {chartData.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
                            {chartData.map(data => (
                                <div key={data.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--surface-input)', borderRadius: '20px', fontSize: '13px', border: '1px solid var(--border-subtle)' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: data.color }} />
                                    <span style={{ color: 'var(--text-secondary)' }}>{data.name}</span>
                                    <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>₹{data.amount.toFixed(0)}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Chronological Expenses Dropdown */}
                    <div style={{ background: 'var(--glass-card-bg)', border: '1px solid var(--glass-card-border)', borderRadius: '16px', overflow: 'hidden' }}>
                        <button
                            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: 'transparent',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                color: 'var(--text-primary)'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ background: 'var(--surface-input)', padding: '8px', borderRadius: '10px' }}>
                                    <ShoppingBag size={18} color="var(--text-secondary)" />
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <p style={{ margin: 0, fontWeight: '700', fontSize: '15px' }}>Transaction History</p>
                                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>{monthlyTransactions.length} expenses</p>
                                </div>
                            </div>
                            {isHistoryOpen ? <ChevronUp size={20} color="var(--text-secondary)" /> : <ChevronDown size={20} color="var(--text-secondary)" />}
                        </button>
                        
                        {isHistoryOpen && (
                            <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                                <div style={{ marginTop: '12px' }} />
                                {monthlyTransactions.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '20px 0', opacity: 0.5, fontSize: '14px' }}>
                                        No transactions for this month.
                                    </div>
                                ) : (
                                    monthlyTransactions.map(t => {
                                        const sub = subcategories.find(s => s.id === t.subcategory_id);
                                        return (
                                            <div
                                                key={t.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '12px',
                                                    background: 'var(--surface-input)',
                                                    borderRadius: '12px',
                                                    border: '1px solid var(--border-subtle)'
                                                }}
                                            >
                                                <div>
                                                    <p style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                                                        {t.description || (sub ? sub.name : 'Expense')}
                                                    </p>
                                                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                                                        {new Date(t.date).toLocaleDateString()}
                                                        {sub && <span style={{
                                                            marginLeft: '8px',
                                                            background: 'var(--glass-card-bg)',
                                                            border: '1px solid var(--glass-card-border)',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            color: 'var(--text-secondary)',
                                                        }}>{sub.name}</span>}
                                                    </p>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <span style={{ fontWeight: '700', fontSize: '15px' }}>
                                                        -₹{parseFloat(t.amount).toFixed(0)}
                                                    </span>
                                                    <button
                                                        onClick={() => deleteTransaction(t.id)}
                                                        style={{ border: 'none', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', opacity: 0.7 }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ExpenseCardDetail;
