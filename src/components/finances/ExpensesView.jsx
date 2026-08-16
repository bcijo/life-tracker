import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
    Plus, Sparkles, Flame, Eye, EyeOff, ShieldAlert, ShieldCheck, 
    ArrowUpRight, ArrowDownLeft, ChevronRight, ShoppingBag, 
    Edit3, Trash2, Settings, Search, X, Filter, Calendar, Tag,
    Clock, MoreVertical, Loader2
} from 'lucide-react';
import useTransactions from '../../hooks/useTransactions';
import useShopping from '../../hooks/useShopping';
import useExpenseCards from '../../hooks/useExpenseCards';
import useBudgets from '../../hooks/useBudgets';
import useRecurringExpenses from '../../hooks/useRecurringExpenses';
import CategoryIcon from '../../utils/categoryIcons';
import ExpenseCardDetail from '../ExpenseCardDetail';
import QuickAddExpenseModal from './QuickAddExpenseModal';
import QuickEditExpenseModal from './QuickEditExpenseModal';
import Modal from '../Modal';
import CurrencyInput from '../CurrencyInput';
import { format, parseISO, isSameMonth, addDays, differenceInCalendarDays, subMonths, subDays } from 'date-fns';

const PAGE_SIZE = 25;

const ExpensesView = () => {
    const { transactions, addTransaction: addTransactionDb, updateTransaction: updateTransactionDb, deleteTransaction: deleteTransactionDb } = useTransactions();
    const { items: shoppingItems, markAddedToExpenses } = useShopping();
    const { cards, addCard, getBudgetProgress, initializeDefaults, loading: cardsLoading, fetchSubcategories } = useExpenseCards();
    const { budgets } = useBudgets();
    const { recurringExpenses, getMonthlyTotal: getRecurringMonthlyTotal } = useRecurringExpenses();

    // UI state
    const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [isBalanceHidden, setIsBalanceHidden] = useState(false);
    
    // Outlier filter state for burn rate
    const [ignoreOutliers, setIgnoreOutliers] = useState(true);
    const [outlierThreshold, setOutlierThreshold] = useState(5000);

    // Transaction search/filter & time filter
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [timeFilter, setTimeFilter] = useState('all');
    const [customMonth, setCustomMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [customDate, setCustomDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [showFilters, setShowFilters] = useState(false);

    // Progressive Chunking / Infinite Scrolling state
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const sentinelRef = useRef(null);

    // Shopping Suggestions State
    const [suggestionAmounts, setSuggestionAmounts] = useState({});

    // Reset pagination when search or filters change
    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [searchQuery, filterCategory, timeFilter, customMonth, customDate]);

    // Fast Card Lookup Map
    const cardLookup = useMemo(() => {
        const map = new Map();
        cards.forEach(c => {
            map.set(c.id, c);
            if (c.category_ids && Array.isArray(c.category_ids)) {
                c.category_ids.forEach(cid => map.set(cid, c));
            }
        });
        return map;
    }, [cards]);

    // Initialize defaults if no cards exist
    useEffect(() => {
        if (!cardsLoading && cards.length === 0) {
            initializeDefaults();
        }
    }, [cardsLoading, cards.length]);

    // Financial Calculations
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysRemaining = Math.max(1, daysInMonth - dayOfMonth);

    const thisMonthExpenses = useMemo(() => {
        return transactions.filter(t => {
            if (t.type !== 'expense') return false;
            const d = parseISO(t.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
    }, [transactions, currentMonth, currentYear]);

    const totalMonthlySpend = useMemo(() => {
        return thisMonthExpenses.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    }, [thisMonthExpenses]);

    // Outlier-adjusted baseline spend
    const { baselineSpend, outlierPurchasesTotal } = useMemo(() => {
        let baseline = 0;
        let outliers = 0;
        thisMonthExpenses.forEach(t => {
            const amt = parseFloat(t.amount) || 0;
            if (ignoreOutliers && amt >= outlierThreshold) {
                outliers += amt;
            } else {
                baseline += amt;
            }
        });
        return { baselineSpend: baseline, outlierPurchasesTotal: outliers };
    }, [thisMonthExpenses, ignoreOutliers, outlierThreshold]);

    // Burn Rate & Runway Forecaster
    const dailyBurnRate = useMemo(() => {
        return Math.round(baselineSpend / Math.max(1, dayOfMonth));
    }, [baselineSpend, dayOfMonth]);

    const totalBudgetCap = useMemo(() => {
        return budgets.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
    }, [budgets]);

    const remainingBudget = totalBudgetCap > 0 ? (totalBudgetCap - totalMonthlySpend) : null;

    const safeToSpendToday = useMemo(() => {
        if (remainingBudget !== null) {
            return Math.max(0, Math.round(remainingBudget / daysRemaining));
        }
        return null;
    }, [remainingBudget, daysRemaining]);

    const runwayData = useMemo(() => {
        if (totalBudgetCap > 0 && remainingBudget !== null) {
            if (remainingBudget <= 0) {
                return {
                    status: 'exhausted',
                    daysLeft: 0,
                    text: 'Monthly budget has been exceeded!',
                    exhaustionDate: today
                };
            }
            if (dailyBurnRate > 0) {
                const daysUntilExhausted = Math.round(remainingBudget / dailyBurnRate);
                const projectedDate = addDays(today, daysUntilExhausted);
                const isOverspending = daysUntilExhausted < daysRemaining;

                return {
                    status: isOverspending ? 'warning' : 'good',
                    daysLeft: daysUntilExhausted,
                    isOverspending,
                    text: isOverspending
                        ? `At current pace, budget runs out in ${daysUntilExhausted} days (~${format(projectedDate, 'MMM d')})`
                        : `On track! Expected surplus of ₹${Math.round(remainingBudget - (dailyBurnRate * daysRemaining)).toLocaleString('en-IN')}`,
                    exhaustionDate: projectedDate
                };
            }
        }
        return {
            status: 'neutral',
            daysLeft: null,
            text: `Burning ~₹${dailyBurnRate.toLocaleString('en-IN')}/day based on past ${dayOfMonth} days`,
            exhaustionDate: null
        };
    }, [totalBudgetCap, remainingBudget, dailyBurnRate, daysRemaining, today, dayOfMonth]);

    // Fixed vs Discretionary Breakdown
    const recurringMonthlyAmount = getRecurringMonthlyTotal();
    const discretionarySpend = Math.max(0, totalMonthlySpend - recurringMonthlyAmount);
    const fixedPct = totalMonthlySpend > 0 ? Math.round((recurringMonthlyAmount / totalMonthlySpend) * 100) : 0;
    const discretionaryPct = totalMonthlySpend > 0 ? Math.min(100, 100 - fixedPct) : 100;

    // Filtered expenses for search, category filter, and time filter
    const filteredModalExpenses = useMemo(() => {
        const todayDate = new Date();
        return transactions
            .filter(t => {
                if (t.type !== 'expense') return false;

                // Category filter
                if (filterCategory !== 'all') {
                    const matchesCategory = t.card_id === filterCategory || t.category === filterCategory;
                    if (!matchesCategory) return false;
                }

                // Search query
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    const card = cardLookup.get(t.card_id) || cardLookup.get(t.category);
                    const descMatch = (t.description || '').toLowerCase().includes(q);
                    const catMatch = (card?.name || '').toLowerCase().includes(q);
                    if (!descMatch && !catMatch) return false;
                }

                // Time filter
                if (timeFilter !== 'all' && t.date) {
                    const txDate = parseISO(t.date);
                    if (timeFilter === 'today') {
                        if (differenceInCalendarDays(todayDate, txDate) !== 0) return false;
                    } else if (timeFilter === 'yesterday') {
                        if (differenceInCalendarDays(todayDate, txDate) !== 1) return false;
                    } else if (timeFilter === 'last7') {
                        const diff = differenceInCalendarDays(todayDate, txDate);
                        if (diff < 0 || diff > 7) return false;
                    } else if (timeFilter === 'this_month') {
                        if (!isSameMonth(txDate, todayDate) || txDate.getFullYear() !== todayDate.getFullYear()) return false;
                    } else if (timeFilter === 'last_month') {
                        const lastMonthDate = subMonths(todayDate, 1);
                        if (!isSameMonth(txDate, lastMonthDate) || txDate.getFullYear() !== lastMonthDate.getFullYear()) return false;
                    } else if (timeFilter === 'custom_month' && customMonth) {
                        const [yr, mo] = customMonth.split('-');
                        if (txDate.getFullYear() !== parseInt(yr) || (txDate.getMonth() + 1) !== parseInt(mo)) return false;
                    } else if (timeFilter === 'custom_date' && customDate) {
                        const dStr = format(txDate, 'yyyy-MM-dd');
                        if (dStr !== customDate) return false;
                    }
                }

                return true;
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [transactions, filterCategory, searchQuery, timeFilter, customMonth, customDate, cardLookup]);

    const totalMatchingCount = filteredModalExpenses.length;

    // Slice only the visible count for rendering in the DOM
    const paginatedExpenses = useMemo(() => {
        return filteredModalExpenses.slice(0, visibleCount);
    }, [filteredModalExpenses, visibleCount]);

    // Group paginated expenses by dynamic timeline: Today, Yesterday, Last 7 Days, Earlier This Month, and Monthly Buckets
    const groupedExpenseTimeline = useMemo(() => {
        const todayDate = new Date();
        const buckets = {
            today: { title: 'Today', key: 'today', items: [], total: 0, tagColor: '#10b981' },
            yesterday: { title: 'Yesterday', key: 'yesterday', items: [], total: 0, tagColor: '#38bdf8' },
            last7Days: { title: 'Last 7 Days', key: 'last7', items: [], total: 0, tagColor: '#a855f7' },
            earlierThisMonth: { title: `Earlier in ${format(todayDate, 'MMMM')}`, key: 'earlier_month', items: [], total: 0, tagColor: '#f59e0b' }
        };

        const monthBuckets = {};

        paginatedExpenses.forEach(tx => {
            if (!tx.date) return;
            const txDate = parseISO(tx.date);
            const amt = parseFloat(tx.amount) || 0;
            const daysDiff = differenceInCalendarDays(todayDate, txDate);

            if (daysDiff === 0) {
                buckets.today.items.push(tx);
                buckets.today.total += amt;
            } else if (daysDiff === 1) {
                buckets.yesterday.items.push(tx);
                buckets.yesterday.total += amt;
            } else if (daysDiff <= 7 && daysDiff > 1) {
                buckets.last7Days.items.push(tx);
                buckets.last7Days.total += amt;
            } else if (isSameMonth(txDate, todayDate) && txDate.getFullYear() === todayDate.getFullYear()) {
                buckets.earlierThisMonth.items.push(tx);
                buckets.earlierThisMonth.total += amt;
            } else {
                const monthKey = format(txDate, 'MMMM yyyy');
                if (!monthBuckets[monthKey]) {
                    monthBuckets[monthKey] = {
                        title: monthKey,
                        key: monthKey,
                        items: [],
                        total: 0,
                        date: txDate,
                        tagColor: '#64748b'
                    };
                }
                monthBuckets[monthKey].items.push(tx);
                monthBuckets[monthKey].total += amt;
            }
        });

        const groups = [];
        if (buckets.today.items.length > 0) groups.push(buckets.today);
        if (buckets.yesterday.items.length > 0) groups.push(buckets.yesterday);
        if (buckets.last7Days.items.length > 0) groups.push(buckets.last7Days);
        if (buckets.earlierThisMonth.items.length > 0) groups.push(buckets.earlierThisMonth);

        // Sort older months descending
        const sortedOlderMonths = Object.values(monthBuckets).sort((a, b) => b.date - a.date);
        groups.push(...sortedOlderMonths);

        return groups;
    }, [paginatedExpenses]);

    // Infinite Scroll IntersectionObserver
    useEffect(() => {
        if (!sentinelRef.current) return;

        const observer = new IntersectionObserver((entries) => {
            const [entry] = entries;
            if (entry.isIntersecting && visibleCount < totalMatchingCount && !isLoadingMore) {
                setIsLoadingMore(true);
                setTimeout(() => {
                    setVisibleCount(prev => Math.min(prev + PAGE_SIZE, totalMatchingCount));
                    setIsLoadingMore(false);
                }, 150);
            }
        }, {
            root: null,
            rootMargin: '300px 0px',
            threshold: 0.01,
        });

        const currentSentinel = sentinelRef.current;
        observer.observe(currentSentinel);

        return () => {
            if (currentSentinel) observer.unobserve(currentSentinel);
            observer.disconnect();
        };
    }, [visibleCount, totalMatchingCount, isLoadingMore]);

    // Shopping suggestions logic
    const shoppingSuggestions = shoppingItems.filter(item => item.is_bought && !item.added_to_expenses);
    const addTransactionFromSuggestion = async (item, price) => {
        await addTransactionDb({
            amount: parseFloat(price),
            description: item.name,
            type: 'expense',
            category: 'shopping',
            date: new Date().toISOString(),
        });
        await markAddedToExpenses(item.id);
    };

    return (
        <div className="finances-subview" style={{ animation: 'fadeIn 0.3s ease' }}>
            
            {/* HERO FINANCIAL HEALTH & RUNWAY CARD */}
            <div className="glass-card" style={{
                padding: '20px',
                marginBottom: '20px',
                background: 'linear-gradient(135deg, rgba(78, 205, 196, 0.08), rgba(17, 138, 178, 0.04))',
                border: '1px solid var(--glass-card-border)',
                borderRadius: '20px',
                boxShadow: 'var(--shadow-sm)'
            }}>
                {/* Top Row: Net Balance & Burn Rate */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                This Month's Spend
                            </span>
                            <button
                                onClick={() => setIsBalanceHidden(!isBalanceHidden)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: 0 }}
                                title={isBalanceHidden ? 'Show spend' : 'Hide spend'}
                            >
                                {isBalanceHidden ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                        <div style={{
                            fontSize: '30px',
                            fontWeight: '800',
                            color: 'var(--text-primary)',
                            filter: isBalanceHidden ? 'blur(8px)' : 'none',
                            transition: 'filter 0.25s ease'
                        }}>
                            ₹{Math.round(totalMonthlySpend).toLocaleString('en-IN')}
                        </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                            <Flame size={14} color="#ff6b6b" /> Daily Burn Rate
                        </div>
                        <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>
                            ₹{dailyBurnRate.toLocaleString('en-IN')}<span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>/day</span>
                        </div>
                    </div>
                </div>

                {/* Runway & Forecasting Banner */}
                <div style={{
                    padding: '12px 14px',
                    borderRadius: '14px',
                    background: runwayData.status === 'warning'
                        ? 'rgba(245, 101, 101, 0.12)'
                        : runwayData.status === 'good'
                        ? 'rgba(72, 187, 120, 0.12)'
                        : 'var(--surface-input)',
                    border: `1px solid ${
                        runwayData.status === 'warning'
                            ? 'rgba(245, 101, 101, 0.25)'
                            : runwayData.status === 'good'
                            ? 'rgba(72, 187, 120, 0.25)'
                            : 'var(--glass-card-border)'
                    }`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '16px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {runwayData.status === 'warning' ? (
                            <ShieldAlert size={18} color="var(--danger)" />
                        ) : (
                            <ShieldCheck size={18} color="var(--success)" />
                        )}
                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                            {runwayData.text}
                        </span>
                    </div>

                    {/* Outlier Exclusion Toggle */}
                    <button
                        onClick={() => setIgnoreOutliers(!ignoreOutliers)}
                        style={{
                            padding: '4px 10px',
                            borderRadius: '16px',
                            border: '1px solid var(--glass-card-border)',
                            background: ignoreOutliers ? 'var(--accent-primary, #4ecdc4)22' : 'transparent',
                            color: ignoreOutliers ? 'var(--accent-primary, #4ecdc4)' : 'var(--text-secondary)',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        title={`Toggle whether purchases ≥ ₹${outlierThreshold.toLocaleString('en-IN')} are excluded from daily burn pace`}
                    >
                        {ignoreOutliers ? `Ignoring >₹${(outlierThreshold/1000).toFixed(0)}k outliers` : 'All expenses included'}
                    </button>
                </div>

                {/* Safe-to-Spend & Fixed vs Discretionary Meter */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--glass-card-border)'
                }}>
                    {/* Safe to Spend Today */}
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>
                            Safe to Spend Today
                        </div>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--success)' }}>
                            {safeToSpendToday !== null ? `₹${safeToSpendToday.toLocaleString('en-IN')}` : `₹${dailyBurnRate.toLocaleString('en-IN')}`}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {daysRemaining} days left in {format(today, 'MMMM')}
                        </div>
                    </div>

                    {/* Fixed vs Discretionary Split */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
                            <span>Fixed ({fixedPct}%)</span>
                            <span>Daily ({discretionaryPct}%)</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'var(--surface-input)', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
                            <div style={{ width: `${fixedPct}%`, background: '#ffd166', transition: 'width 0.3s ease' }} title={`Fixed / Subscriptions: ₹${Math.round(recurringMonthlyAmount).toLocaleString('en-IN')}`} />
                            <div style={{ width: `${discretionaryPct}%`, background: 'var(--accent-primary, #4ecdc4)', transition: 'width 0.3s ease' }} title={`Discretionary / Daily: ₹${Math.round(discretionarySpend).toLocaleString('en-IN')}`} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            <span>₹{Math.round(recurringMonthlyAmount).toLocaleString('en-IN')}</span>
                            <span>₹{Math.round(discretionarySpend).toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* SHOPPING SUGGESTIONS (if any) */}
            {shoppingSuggestions.length > 0 && (
                <div className="glass-card" style={{ padding: '16px', marginBottom: '20px', borderLeft: '4px solid var(--accent-primary, #4ecdc4)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 0' }}>
                        <ShoppingBag size={18} color="var(--accent-primary, #4ecdc4)" /> Add recent purchases to expenses?
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {shoppingSuggestions.map(item => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ flex: 1, fontSize: '14px', fontWeight: '500' }}>{item.name}</span>
                                <CurrencyInput
                                    value={suggestionAmounts[item.id] || ''}
                                    onChange={(val) => setSuggestionAmounts({ ...suggestionAmounts, [item.id]: val })}
                                    placeholder="Amount"
                                    style={{ width: '100px' }}
                                    inputStyle={{ padding: '6px 8px', fontSize: '13px' }}
                                />
                                <button
                                    onClick={() => {
                                        if (suggestionAmounts[item.id]) {
                                            addTransactionFromSuggestion(item, suggestionAmounts[item.id]);
                                            setSuggestionAmounts({ ...suggestionAmounts, [item.id]: '' });
                                        }
                                    }}
                                    disabled={!suggestionAmounts[item.id]}
                                    style={{
                                        padding: '6px 12px',
                                        background: 'var(--accent-primary, #4ecdc4)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Add
                                </button>
                                <button onClick={() => markAddedToExpenses(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}>
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TRANSACTIONS ACTIVITY FEED */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                            Activity & Transactions
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                            {filteredModalExpenses.length} transactions recorded
                        </p>
                    </div>

                    {/* Filter Toggle Button */}
                    <button
                        type="button"
                        onClick={() => setShowFilters(!showFilters)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '12px',
                            background: (showFilters || searchQuery || filterCategory !== 'all' || timeFilter !== 'all') ? 'rgba(78, 205, 196, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                            border: `1px solid ${(showFilters || searchQuery || filterCategory !== 'all' || timeFilter !== 'all') ? 'rgba(78, 205, 196, 0.35)' : 'rgba(255, 255, 255, 0.07)'}`,
                            color: (showFilters || searchQuery || filterCategory !== 'all' || timeFilter !== 'all') ? 'var(--accent-primary, #4ecdc4)' : 'var(--text-secondary)',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <Filter size={13} />
                        <span>Filter</span>
                        {(searchQuery || filterCategory !== 'all' || timeFilter !== 'all') && (
                            <span style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: 'var(--accent-primary, #4ecdc4)',
                                boxShadow: '0 0 6px var(--accent-primary, #4ecdc4)'
                            }} />
                        )}
                    </button>
                </div>

                {/* Collapsible Search, Time & Category Filter Panel */}
                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            marginBottom: '16px',
                            padding: '14px',
                            borderRadius: '18px',
                            background: 'rgba(255, 255, 255, 0.025)',
                            border: '1px solid rgba(255, 255, 255, 0.07)'
                        }}
                    >
                        {/* 1. Search Bar */}
                        <div style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            background: 'var(--surface-input)',
                            borderRadius: '12px',
                            border: '1px solid var(--border-subtle)',
                            padding: '0 12px'
                        }}>
                            <Search size={15} color="var(--text-muted)" style={{ marginRight: '8px', flexShrink: 0 }} />
                            <input
                                type="text"
                                placeholder="Search description, note, category..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px 0',
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    fontWeight: '500'
                                }}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        {/* 2. Time Period Filter */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Calendar size={11} /> Time Period
                                </span>
                            </div>

                            <div style={{
                                display: 'flex',
                                gap: '5px',
                                overflowX: 'auto',
                                paddingBottom: '2px',
                                WebkitOverflowScrolling: 'touch',
                                scrollbarWidth: 'none'
                            }}>
                                {[
                                    { id: 'all', label: 'All Time' },
                                    { id: 'today', label: 'Today' },
                                    { id: 'yesterday', label: 'Yesterday' },
                                    { id: 'last7', label: 'Last 7 Days' },
                                    { id: 'this_month', label: 'This Month' },
                                    { id: 'last_month', label: 'Last Month' },
                                    { id: 'custom_month', label: 'Month...' },
                                    { id: 'custom_date', label: 'Specific Date...' }
                                ].map(p => {
                                    const isSel = timeFilter === p.id;
                                    return (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setTimeFilter(p.id)}
                                            style={{
                                                flex: '0 0 auto',
                                                padding: '5px 10px',
                                                borderRadius: '10px',
                                                border: isSel ? '1.5px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.06)',
                                                background: isSel ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                                                color: isSel ? '#38bdf8' : 'var(--text-secondary)',
                                                fontSize: '11px',
                                                fontWeight: isSel ? '700' : '500',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {p.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Inline Custom Pickers */}
                            {timeFilter === 'custom_month' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Select month:</span>
                                    <input
                                        type="month"
                                        value={customMonth}
                                        onChange={(e) => setCustomMonth(e.target.value)}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            color: 'var(--text-primary)',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            )}

                            {timeFilter === 'custom_date' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Select date:</span>
                                    <input
                                        type="date"
                                        value={customDate}
                                        onChange={(e) => setCustomDate(e.target.value)}
                                        style={{
                                            padding: '4px 8px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            color: 'var(--text-primary)',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* 3. Category Filter */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Tag size={11} /> Category
                                </span>
                            </div>

                            <div style={{
                                display: 'flex',
                                gap: '5px',
                                overflowX: 'auto',
                                paddingBottom: '2px',
                                WebkitOverflowScrolling: 'touch',
                                scrollbarWidth: 'none'
                            }}>
                                <button
                                    onClick={() => setFilterCategory('all')}
                                    style={{
                                        flex: '0 0 auto',
                                        padding: '5px 10px',
                                        borderRadius: '10px',
                                        border: filterCategory === 'all' ? '1.5px solid var(--accent-primary, #4ecdc4)' : '1px solid rgba(255, 255, 255, 0.06)',
                                        background: filterCategory === 'all' ? 'color-mix(in srgb, var(--accent-primary, #4ecdc4) 18%, transparent)' : 'rgba(255, 255, 255, 0.02)',
                                        color: filterCategory === 'all' ? 'var(--text-primary)' : 'var(--text-secondary)',
                                        fontSize: '11px',
                                        fontWeight: filterCategory === 'all' ? '700' : '500',
                                        cursor: 'pointer'
                                    }}
                                >
                                    All
                                </button>
                                {cards.map(c => {
                                    const isSelected = filterCategory === c.id;
                                    const cardColor = c.color || '#4ecdc4';
                                    return (
                                        <button
                                            key={c.id}
                                            onClick={() => setFilterCategory(isSelected ? 'all' : c.id)}
                                            style={{
                                                flex: '0 0 auto',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                padding: '5px 10px',
                                                borderRadius: '10px',
                                                border: isSelected ? `1.5px solid ${cardColor}` : '1px solid rgba(255, 255, 255, 0.06)',
                                                background: isSelected ? `color-mix(in srgb, ${cardColor} 20%, transparent)` : 'rgba(255, 255, 255, 0.02)',
                                                color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                fontSize: '11px',
                                                fontWeight: isSelected ? '700' : '500',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <CategoryIcon icon={c.icon} name={c.name} size={12} color={cardColor} />
                                            <span>{c.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Reset Filters Option (if any filter active) */}
                        {(searchQuery || filterCategory !== 'all' || timeFilter !== 'all') && (
                            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '2px' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setFilterCategory('all');
                                        setTimeFilter('all');
                                    }}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#ef4444',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        padding: '4px 8px'
                                    }}
                                >
                                    Reset all filters
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Grouped Transactions Feed - Dynamic Timeline (Today, Yesterday, Last 7 Days, Months) */}
                {groupedExpenseTimeline.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {groupedExpenseTimeline.map((group) => (
                            <div key={group.key}>
                                {/* Timeline Group Header */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '4px 6px 10px',
                                    marginBottom: '8px',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: group.tagColor,
                                            boxShadow: `0 0 8px ${group.tagColor}`
                                        }} />
                                        <span style={{
                                            fontSize: '12px',
                                            fontWeight: '800',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.6px',
                                            color: group.tagColor
                                        }}>
                                            {group.title}
                                        </span>
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            color: 'var(--text-muted)',
                                            background: 'rgba(255, 255, 255, 0.04)',
                                            padding: '1px 7px',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(255, 255, 255, 0.06)'
                                        }}>
                                            {group.items.length} {group.items.length === 1 ? 'txn' : 'txns'}
                                        </span>
                                    </div>

                                    <div style={{
                                        fontSize: '13px',
                                        fontWeight: '800',
                                        color: 'var(--text-primary)',
                                        fontFamily: 'monospace',
                                        letterSpacing: '-0.2px'
                                    }}>
                                        ₹{Math.round(group.total).toLocaleString('en-IN')}
                                    </div>
                                </div>

                                {/* Transaction Items List */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {group.items.map(tx => {
                                        const card = cardLookup.get(tx.card_id) || cardLookup.get(tx.category);
                                        const isExpense = tx.type !== 'income';
                                        const cardColor = card?.color || (isExpense ? '#FF6B6B' : '#10B981');
                                        
                                        return (
                                            <motion.div
                                                key={tx.id}
                                                whileHover={{ y: -1, backgroundColor: 'var(--surface-elevated, #172033)' }}
                                                transition={{ duration: 0.15 }}
                                                className="transaction-card glass-card"
                                                onClick={() => setEditingTransaction(tx)}
                                                style={{
                                                    padding: '12px 14px',
                                                    borderRadius: '16px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: '12px',
                                                    cursor: 'pointer',
                                                    background: 'var(--surface-elevated, #131b2e)',
                                                    border: '1px solid var(--glass-border, rgba(255,255,255,0.08))',
                                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                {/* Left: Minimal Icon Badge + Details */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                                                    {/* Icon Badge */}
                                                    <div style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '12px',
                                                        background: `color-mix(in srgb, ${cardColor} 18%, transparent)`,
                                                        border: `1.2px solid color-mix(in srgb, ${cardColor} 32%, transparent)`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                        boxShadow: `0 2px 10px color-mix(in srgb, ${cardColor} 20%, transparent)`
                                                    }}>
                                                        <CategoryIcon 
                                                            icon={card?.icon} 
                                                            name={card?.name || tx.description} 
                                                            size={18} 
                                                            color={cardColor} 
                                                            strokeWidth={2.2} 
                                                        />
                                                    </div>

                                                    {/* Transaction Title & Tags */}
                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                        <p style={{
                                                            fontSize: '14px',
                                                            fontWeight: '700',
                                                            color: 'var(--text-primary)',
                                                            margin: 0,
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            letterSpacing: '-0.2px'
                                                        }}>
                                                            {tx.description || card?.name || 'Expense'}
                                                        </p>
                                                        
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            flexWrap: 'wrap',
                                                            gap: '6px',
                                                            marginTop: '3px'
                                                        }}>
                                                            {/* Category Pill */}
                                                            <span style={{
                                                                fontSize: '11px',
                                                                fontWeight: '600',
                                                                color: cardColor,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px'
                                                            }}>
                                                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: cardColor }} />
                                                                {card?.name || 'General'}
                                                            </span>

                                                            {/* Date Formatted for group */}
                                                            {tx.date && (
                                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                                    • {group.key === 'today' || group.key === 'yesterday'
                                                                        ? format(parseISO(tx.date), 'h:mm a')
                                                                        : format(parseISO(tx.date), 'MMM d')}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Amount & Actions */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                                                    <div style={{
                                                        fontSize: '16px',
                                                        fontWeight: '800',
                                                        color: isExpense ? 'var(--text-primary)' : 'var(--success, #10b981)',
                                                        fontFamily: 'monospace',
                                                        letterSpacing: '-0.3px',
                                                        textAlign: 'right'
                                                    }}>
                                                        {isExpense ? '-' : '+'}₹{parseFloat(tx.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                                    </div>

                                                    <button
                                                        onClick={(e) => {
                                                             e.stopPropagation();
                                                             setEditingTransaction(tx);
                                                        }}
                                                        style={{
                                                            padding: '6px',
                                                            borderRadius: '8px',
                                                            background: 'var(--surface-input, rgba(255,255,255,0.05))',
                                                            border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                                                            color: 'var(--text-muted)',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                                                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                                        title="Edit Transaction"
                                                    >
                                                        <Edit3 size={13} />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        {/* Infinite Scroll Bottom Sentinel */}
                        <div ref={sentinelRef} style={{ height: '4px', width: '100%', margin: '4px 0' }} />

                        {/* Loading State Spinner for Next Batch */}
                        {isLoadingMore && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    padding: '16px 20px',
                                    background: 'var(--surface-elevated, rgba(13, 17, 28, 0.6))',
                                    border: '1px solid var(--glass-border, rgba(255,255,255,0.08))',
                                    borderRadius: '16px',
                                    color: 'var(--text-secondary)',
                                    fontSize: '13px',
                                    fontWeight: '600'
                                }}
                            >
                                <Loader2 size={18} className="spin-animation" style={{ color: 'var(--accent-primary, #a855f7)' }} />
                                <span>Loading more transactions...</span>
                            </motion.div>
                        )}

                        {/* Fallback Manual Load More Button if Sentinel isn't triggered */}
                        {!isLoadingMore && visibleCount < totalMatchingCount && (
                            <div style={{ textAlign: 'center', marginTop: '12px' }}>
                                <button
                                    onClick={() => setVisibleCount(prev => Math.min(prev + PAGE_SIZE, totalMatchingCount))}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '10px 22px',
                                        borderRadius: '14px',
                                        fontSize: '12.5px',
                                        fontWeight: '700',
                                        background: 'var(--surface-elevated, #131b2e)',
                                        border: '1px solid var(--glass-border, rgba(255,255,255,0.12))',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary, #a855f7)'}
                                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--glass-border, rgba(255,255,255,0.12))'}
                                >
                                    <span>Load More Transactions ({visibleCount} of {totalMatchingCount})</span>
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{
                        padding: '48px 20px',
                        textAlign: 'center',
                        background: 'var(--surface-input)',
                        borderRadius: '20px',
                        border: '1px dashed var(--border-subtle)',
                        color: 'var(--text-muted)',
                    }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>💳</div>
                        <h3 style={{ margin: '0 0 4px', color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700' }}>
                            {searchQuery || filterCategory !== 'all' ? 'No matching transactions' : 'No transactions recorded yet'}
                        </h3>
                        <p style={{ margin: '0 0 16px', fontSize: '13px' }}>
                            {searchQuery || filterCategory !== 'all' ? 'Try adjusting your search or category filter.' : 'Tap below to log your first expense.'}
                        </p>
                        <button
                            onClick={() => setShowAddExpenseModal(true)}
                            className="btn-primary"
                            style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: '700' }}
                        >
                            + Add Expense
                        </button>
                    </div>
                )}
            </div>

            {/* Quick Add Expense Modal */}
            <QuickAddExpenseModal
                isOpen={showAddExpenseModal}
                onClose={() => setShowAddExpenseModal(false)}
                cards={cards}
                onAddExpense={addTransactionDb}
                fetchSubcategories={fetchSubcategories}
            />

            {/* Quick Edit Expense Modal */}
            <QuickEditExpenseModal
                isOpen={!!editingTransaction}
                onClose={() => setEditingTransaction(null)}
                transaction={editingTransaction}
                cards={cards}
                onUpdateExpense={updateTransactionDb}
                onDeleteExpense={deleteTransactionDb}
                fetchSubcategories={fetchSubcategories}
            />

            {/* Circular Floating Add Expense Action Button */}
            <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setShowAddExpenseModal(true)}
                title="Add Expense"
                aria-label="Add Expense"
                className="fab-add-expense"
            >
                <Plus size={26} strokeWidth={2.8} />
            </motion.button>

            <style>{`
                .fab-add-expense {
                    position: fixed;
                    bottom: calc(85px + env(safe-area-inset-bottom, 0px));
                    right: calc(20px + env(safe-area-inset-right, 0px));
                    width: 54px;
                    height: 54px;
                    border-radius: 50%;
                    background: var(--accent-gradient, linear-gradient(135deg, #a855f7 0%, #ec4899 100%));
                    color: #ffffff;
                    border: 1.5px solid rgba(255, 255, 255, 0.25);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 95;
                    box-shadow: 0 8px 24px rgba(168, 85, 247, 0.45);
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .fab-add-expense:hover {
                    box-shadow: 0 12px 30px rgba(124, 58, 237, 0.6);
                }
                @media (min-width: 768px) {
                    .fab-add-expense {
                        bottom: 36px;
                        right: 36px;
                        width: 58px;
                        height: 58px;
                    }
                }
            `}</style>
        </div>
    );
};

export default ExpensesView;
