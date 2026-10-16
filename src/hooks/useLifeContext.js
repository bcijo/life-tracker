import { useMemo } from 'react';
import useTransactions from './useTransactions';
import useHabits, { calculateHabitStreak, getLocalDateStr } from './useHabits';
import useTodos from './useTodos';
import useRecurringExpenses from './useRecurringExpenses';
import useExpenseCards from './useExpenseCards';
import useBudgets from './useBudgets';
import useShopping from './useShopping';
import useJournal from './useJournal';
import { format, startOfMonth, parseISO } from 'date-fns';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

/**
 * Aggregates all user data into a structured context + raw dataset for AI tools.
 */
function useLifeContext() {
    const { transactions = [] } = useTransactions();
    const { habits = [], getStatusForDate, calculateSuccessRate, calculateCheckinStreak } = useHabits();
    const { todos = [] } = useTodos();
    const { recurringExpenses = [], getMonthlyTotal } = useRecurringExpenses();
    const { cards: expenseCards = [] } = useExpenseCards();
    const { budgets = [] } = useBudgets();
    const { items: shoppingItems = [] } = useShopping();
    const { weekEntries: journalEntries = [] } = useJournal();

    const contextData = useMemo(() => {
        const today = new Date();
        const todayStr = getLocalDateStr(today);
        const todayDow = today.getDay();
        const startOfCurrentMonth = startOfMonth(today);

        // Category ID -> Name map
        const categoryMap = {};
        expenseCards.forEach(c => {
            if (c?.id) categoryMap[c.id] = c.name;
            if (Array.isArray(c?.category_ids)) {
                c.category_ids.forEach(cid => { categoryMap[cid] = c.name; });
            }
        });

        const resolveCategoryName = (tx) => {
            if (!tx) return 'Uncategorized';
            if (tx.card_id && categoryMap[tx.card_id]) return categoryMap[tx.card_id];
            if (tx.category && categoryMap[tx.category]) return categoryMap[tx.category];
            if (tx.category && typeof tx.category === 'string' && !/^[0-9a-f-]{20,}$/i.test(tx.category)) {
                return tx.category.charAt(0).toUpperCase() + tx.category.slice(1);
            }
            return 'Uncategorized';
        };

        const isRecurringTx = (t) => {
            if (t?.is_recurring) return true;
            if (typeof t?.category === 'string' && t.category.toLowerCase() === 'recurring') return true;
            if (typeof t?.description === 'string' && t.description.toLowerCase().includes('(recurring)')) return true;
            return false;
        };

        // --- Money ---
        const fixedExpensesTotal = getMonthlyTotal ? getMonthlyTotal() : 0;
        const activeRecurring = (recurringExpenses || [])
            .filter(e => e.is_active !== false)
            .map(e => ({
                name: e.name,
                amount: parseFloat(e.amount) || 0,
                dayOfMonth: e.day_of_month || 1,
                category: categoryMap[e.category] || e.category || 'Recurring'
            }));

        const thisMonthDailyTx = transactions.filter(t => {
            if (t.type !== 'expense' || isRecurringTx(t) || !t.date) return false;
            const d = parseISO(t.date);
            return d >= startOfCurrentMonth && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
        });

        const dailySpendingThisMonth = Math.round(
            thisMonthDailyTx.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
        );
        const totalMonthlySpending = Math.round(dailySpendingThisMonth + fixedExpensesTotal);
        const totalBudgetCap = Math.round(
            budgets.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0)
        );

        // --- Habits ---
        const globalStart = typeof window !== 'undefined' ? localStorage.getItem('life_tracker_tracking_start') : null;
        const enrichedHabits = habits.map(h => {
            const activeDays = h.active_days || ALL_DAYS;
            const isScheduledToday = !h.is_paused && activeDays.includes(todayDow);
            const todayStatus = getStatusForDate ? getStatusForDate(h, todayStr) : null;
            const streak = calculateHabitStreak(h, globalStart);
            const rateObj = calculateSuccessRate ? calculateSuccessRate(h, globalStart) : null;
            return {
                id: h.id,
                name: h.name,
                timeOfDay: h.time_of_day || 'morning',
                isPaused: Boolean(h.is_paused),
                activeDays,
                isScheduledToday,
                todayStatus: todayStatus || 'pending',
                streak,
                successRate: rateObj?.rate ?? null,
                history: h.history || [],
            };
        });

        const scheduledToday = enrichedHabits.filter(h => h.isScheduledToday);
        const completedToday = scheduledToday.filter(h => h.todayStatus === 'completed');

        // --- Tasks ---
        const pendingTasks = todos.filter(t => !t.completed);
        const overdueTasks = pendingTasks.filter(t => t.deadline && t.deadline < todayStr);

        return {
            summary: {
                currentDate: format(today, 'yyyy-MM-dd'),
                financesThisMonth: {
                    totalSpend: totalMonthlySpending,
                    dailyDiscretionarySpend: dailySpendingThisMonth,
                    fixedCommitmentsSpend: Math.round(fixedExpensesTotal),
                    monthlyBudgetCap: totalBudgetCap,
                    budgetRemaining: totalBudgetCap > 0 ? Math.max(0, totalBudgetCap - dailySpendingThisMonth) : null,
                },
                habitsToday: {
                    completedToday: completedToday.length,
                    scheduledToday: scheduledToday.length,
                    totalActiveHabits: enrichedHabits.filter(h => !h.isPaused).length,
                    pausedHabits: enrichedHabits.filter(h => h.isPaused).length,
                    checkinStreak: calculateCheckinStreak ? calculateCheckinStreak() : 0,
                },
                tasks: {
                    pendingCount: pendingTasks.length,
                    overdueCount: overdueTasks.length,
                },
            },
            _raw: {
                transactions,
                recurringExpenses: activeRecurring,
                fixedExpensesTotal,
                expenseCards,
                categoryMap,
                resolveCategoryName,
                budgets,
                habits: enrichedHabits,
                todos,
                shoppingItems,
                journalEntries,
            }
        };
    }, [transactions, habits, todos, recurringExpenses, expenseCards, budgets, shoppingItems, journalEntries]);

    return contextData;
}

export default useLifeContext;

