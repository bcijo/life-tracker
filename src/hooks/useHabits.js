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

    return {
        habits,
        loading,
        error,
        addHabit,
        toggleHabit,
        cycleHabitStatus,
        getStatusForDate,
        deleteHabit,
    };
}

export default useHabits;
