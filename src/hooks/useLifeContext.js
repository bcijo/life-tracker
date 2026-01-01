import { useMemo } from 'react';
import useTransactions from './useTransactions';
import useHabits from './useHabits';
import useTodos from './useTodos';
import useBankAccounts from './useBankAccounts';
import useRecurringExpenses from './useRecurringExpenses';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

/**
 * Aggregates all user data into a single context object for the AI.
 */
function useLifeContext() {
    // 1. Fetch all data
    const { transactions } = useTransactions();
    const { habits } = useHabits();
    const { todos } = useTodos();
    const { bankAccounts, getTotalBalance } = useBankAccounts();
    const { recurringExpenses, monthlyTotal: fixedExpensesTotal } = useRecurringExpenses();

    // 2. Process Data for AI Context
    const contextData = useMemo(() => {
        const today = new Date();
        const startOfCurrentWeek = startOfWeek(today);
        const startOfCurrentMonth = startOfMonth(today);

        // --- Money ---
        const totalBalance = getTotalBalance();
        const recentTransactions = transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10); // Last 10 transactions

        const thisMonthSpending = transactions
            .filter(t => t.type === 'expense' && new Date(t.date) >= startOfCurrentMonth)
            .reduce((sum, t) => sum + parseFloat(t.amount), 0);

        // --- Habits ---
        const habitStats = habits.map(h => {
            // Calculate streak (simplified)
            let streak = 0;
            const history = [...h.history].sort().reverse();
            // ... (streak logic similar to Habits.jsx) ...
            return { name: h.name, streak: streak }; // Placeholder for now, can improve
        });

        // --- Tasks ---
        const pendingTasks = todos.filter(t => !t.completed);
        const upcomingDeadlines = pendingTasks
            .filter(t => t.deadline)
            .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
            .slice(0, 5);

        // --- Context String Construction ---
        return {
            financial: {
                totalBalance,
                monthlySpending: thisMonthSpending,
                fixedExpenses: fixedExpensesTotal,
                recentActivity: recentTransactions.map(t => `${t.description}: ${t.amount} (${t.category})`),
            },
            habits: habits.map(h => h.name),
            tasks: {
                pendingCount: pendingTasks.length,
                topPriority: upcomingDeadlines.map(t => `${t.text} (Due: ${t.deadline})`),
            },
            meta: {
                currentDate: format(today, 'yyyy-MM-dd'),
            }
        };
    }, [transactions, habits, todos, bankAccounts, recurringExpenses]);

    return contextData;
}

export default useLifeContext;
