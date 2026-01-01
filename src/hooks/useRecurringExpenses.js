import useSupabaseData from './useSupabaseData';
import useTransactions from './useTransactions';
import { format, getDate, startOfMonth, endOfMonth, isAfter, isBefore, parseISO } from 'date-fns';

function useRecurringExpenses() {
    const { data: recurringExpenses, loading, error, insert, update, remove } = useSupabaseData('recurring_expenses');
    const { addTransaction } = useTransactions();

    const addRecurringExpense = async (name, amount, category, dayOfMonth = 1) => {
        const newExpense = {
            name,
            amount: parseFloat(amount),
            category,
            day_of_month: Math.min(Math.max(1, dayOfMonth), 31),
            is_active: true,
            last_processed: null,
        };
        return await insert(newExpense);
    };

    const updateRecurringExpense = async (id, updates) => {
        return await update(id, updates);
    };

    const deleteRecurringExpense = async (id) => {
        return await remove(id);
    };

    const toggleActive = async (id, isActive) => {
        return await update(id, { is_active: isActive });
    };

    // Process recurring expenses for current month
    const processRecurringExpenses = async () => {
        const today = new Date();
        const currentDay = getDate(today);
        const currentMonth = format(today, 'yyyy-MM');

        const processed = [];

        for (const expense of recurringExpenses) {
            if (!expense.is_active) continue;

            // Check if already processed this month
            const lastProcessed = expense.last_processed ? format(parseISO(expense.last_processed), 'yyyy-MM') : null;
            if (lastProcessed === currentMonth) continue;

            // Check if the day has passed this month
            if (currentDay >= expense.day_of_month) {
                // Add the transaction
                await addTransaction({
                    amount: expense.amount,
                    description: `${expense.name} (Recurring)`,
                    type: 'expense',
                    category: expense.category,
                    date: new Date().toISOString(),
                });

                // Update last_processed
                await update(expense.id, { last_processed: format(today, 'yyyy-MM-dd') });

                processed.push(expense);
            }
        }

        return processed;
    };

    // Get upcoming recurring expenses for this month
    const getUpcoming = () => {
        const today = new Date();
        const currentDay = getDate(today);
        const currentMonth = format(today, 'yyyy-MM');

        return recurringExpenses.filter(expense => {
            if (!expense.is_active) return false;

            // Check if not yet processed this month
            const lastProcessed = expense.last_processed ? format(parseISO(expense.last_processed), 'yyyy-MM') : null;
            if (lastProcessed === currentMonth) return false;

            // Check if the day is still upcoming
            return expense.day_of_month > currentDay;
        }).sort((a, b) => a.day_of_month - b.day_of_month);
    };

    // Get total monthly recurring expenses
    const getMonthlyTotal = () => {
        return recurringExpenses
            .filter(e => e.is_active)
            .reduce((acc, e) => acc + parseFloat(e.amount), 0);
    };

    return {
        recurringExpenses,
        loading,
        error,
        addRecurringExpense,
        updateRecurringExpense,
        deleteRecurringExpense,
        toggleActive,
        processRecurringExpenses,
        getUpcoming,
        getMonthlyTotal,
    };
}

export default useRecurringExpenses;
