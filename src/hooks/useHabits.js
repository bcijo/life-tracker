import useSupabaseData from './useSupabaseData';

function useHabits() {
    const { data: habits, loading, error, insert, update, remove } = useSupabaseData('habits');

    const addHabit = async (name) => {
        const newHabit = {
            name,
            history: [], // Will store { date: 'YYYY-MM-DD', status: 'completed' | 'failed' }
        };
        return await insert(newHabit);
    };

    // Get the status for a specific date: 'completed', 'failed', or null (neutral)
    const getStatusForDate = (habit, dateStr) => {
        if (!habit.history || !Array.isArray(habit.history)) return null;

        // Handle legacy format (array of date strings)
        const entry = habit.history.find(h => {
            if (typeof h === 'string') {
                return h.startsWith(dateStr);
            }
            return h.date === dateStr;
        });

        if (!entry) return null;
        if (typeof entry === 'string') return 'completed'; // Legacy format
        return entry.status;
    };

    // Cycle through states: null -> completed -> failed -> null
    const cycleHabitStatus = async (id, dateStr = null) => {
        const habit = habits.find(h => h.id === id);
        if (!habit) return { error: 'Habit not found' };

        // Use local date format (YYYY-MM-DD) to avoid timezone issues
        const getLocalDateStr = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const targetDate = dateStr || getLocalDateStr(new Date());

        // Normalize history to new format if needed
        let newHistory = (habit.history || []).map(h => {
            if (typeof h === 'string') {
                return { date: h.split('T')[0], status: 'completed' };
            }
            return h;
        });

        const existingIndex = newHistory.findIndex(h => h.date === targetDate);
        const currentStatus = existingIndex >= 0 ? newHistory[existingIndex].status : null;

        // Determine next status in cycle: null -> completed -> failed -> null
        let nextStatus;
        if (currentStatus === null) {
            nextStatus = 'completed';
        } else if (currentStatus === 'completed') {
            nextStatus = 'failed';
        } else {
            nextStatus = null; // Remove entry
        }

        if (nextStatus === null) {
            // Remove the entry
            if (existingIndex >= 0) {
                newHistory.splice(existingIndex, 1);
            }
        } else if (existingIndex >= 0) {
            // Update existing entry
            newHistory[existingIndex].status = nextStatus;
        } else {
            // Add new entry
            newHistory.unshift({ date: targetDate, status: nextStatus });
        }

        // Sort by date descending
        newHistory.sort((a, b) => b.date.localeCompare(a.date));

        return await update(id, { history: newHistory });
    };

    // Legacy toggle function - now uses cycle
    const toggleHabit = async (id) => {
        return await cycleHabitStatus(id);
    };

    const deleteHabit = async (id) => {
        return await remove(id);
    };

    // Mark habits as missed for yesterday if no status was set
    const markMissedHabits = async () => {
        if (!habits || habits.length === 0) return;

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

        for (const habit of habits) {
            const status = getStatusForDate(habit, yesterdayStr);
            if (status === null) {
                // No entry for yesterday - mark as failed
                let newHistory = (habit.history || []).map(h => {
                    if (typeof h === 'string') {
                        return { date: h.split('T')[0], status: 'completed' };
                    }
                    return h;
                });
                newHistory.unshift({ date: yesterdayStr, status: 'failed' });
                newHistory.sort((a, b) => b.date.localeCompare(a.date));
                await update(habit.id, { history: newHistory });
            }
        }
    };

    // Calculate success rate since tracking started (or since last reset)
    const calculateSuccessRate = (habit) => {
        if (!habit.history || habit.history.length === 0) {
            return { rate: null, completedDays: 0, totalDays: 0, startDate: null };
        }

        // Normalize history to get dates
        const normalizedHistory = habit.history.map(h => {
            if (typeof h === 'string') {
                return { date: h.split('T')[0], status: 'completed' };
            }
            return h;
        });

        // Determine start date: either reset_date or the oldest entry in history
        let startDateStr = habit.tracking_start_date;
        if (!startDateStr) {
            // Find the oldest date in history
            const sortedDates = normalizedHistory.map(h => h.date).sort();
            startDateStr = sortedDates[0];
        }

        if (!startDateStr) {
            return { rate: null, completedDays: 0, totalDays: 0, startDate: null };
        }

        const startDate = new Date(startDateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);

        // Calculate total days since start (inclusive)
        const diffTime = today.getTime() - startDate.getTime();
        const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

        if (totalDays <= 0) {
            return { rate: null, completedDays: 0, totalDays: 0, startDate: startDateStr };
        }

        // Count completed days
        const completedDays = normalizedHistory.filter(h => h.status === 'completed').length;

        // Calculate rate as percentage
        const rate = Math.round((completedDays / totalDays) * 100);

        return { rate, completedDays, totalDays, startDate: startDateStr };
    };

    // Reset habit stats - clears history and sets new tracking start date
    const resetHabitStats = async (id) => {
        const habit = habits.find(h => h.id === id);
        if (!habit) return { error: 'Habit not found' };

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        return await update(id, {
            history: [],
            tracking_start_date: todayStr
        });
    };

    return {
        habits,
        loading,
        error,
        addHabit,
        toggleHabit,
        cycleHabitStatus,
        getStatusForDate,
        deleteHabit,
        markMissedHabits,
        calculateSuccessRate,
        resetHabitStats,
    };
}

export default useHabits;
