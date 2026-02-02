import useSupabaseData from './useSupabaseData';

// Default active days: all days of the week (Sunday=0 to Saturday=6)
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function useHabits() {
    const { data: habits, loading, error, insert, update, remove } = useSupabaseData('habits');

    // Helper to get local date string in YYYY-MM-DD format
    const getLocalDateStr = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Check if a given date's day-of-week is in the habit's active days
    const isActiveDay = (habit, dateStr) => {
        const activeDays = habit.active_days || ALL_DAYS;
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
        return activeDays.includes(dayOfWeek);
    };

    // Check if today is an active day for the habit
    const isTodayActive = (habit) => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const activeDays = habit.active_days || ALL_DAYS;
        return activeDays.includes(dayOfWeek);
    };

    const addHabit = async (name, activeDays = ALL_DAYS) => {
        const newHabit = {
            name,
            history: [], // Will store { date: 'YYYY-MM-DD', status: 'completed' | 'failed' }
            active_days: activeDays,
        };
        return await insert(newHabit);
    };

    // Update habit's active days
    const updateHabitDays = async (id, activeDays) => {
        return await update(id, { active_days: activeDays });
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

    // Get weekly status for the current week (Sunday to Saturday)
    const getWeeklyStatus = (habit) => {
        const today = new Date();
        const currentDayOfWeek = today.getDay(); // 0=Sunday, 6=Saturday

        // Get the start of the current week (Sunday)
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - currentDayOfWeek);
        weekStart.setHours(0, 0, 0, 0);

        const activeDays = habit.active_days || ALL_DAYS;
        const weeklyStatus = [];

        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            const dateStr = getLocalDateStr(date);
            const isActive = activeDays.includes(i);
            const isFuture = date > today;
            const isToday = i === currentDayOfWeek;

            let status = null;
            if (isActive && !isFuture) {
                status = getStatusForDate(habit, dateStr);
            }

            weeklyStatus.push({
                dayIndex: i,
                date: dateStr,
                isActive,
                isFuture,
                isToday,
                status, // 'completed', 'failed', or null
            });
        }

        return weeklyStatus;
    };

    // Cycle through states: null -> completed -> failed -> null
    const cycleHabitStatus = async (id, dateStr = null) => {
        const habit = habits.find(h => h.id === id);
        if (!habit) return { error: 'Habit not found' };

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

    // Mark habits as missed for yesterday if no status was set (only for active days)
    const markMissedHabits = async () => {
        if (!habits || habits.length === 0) return;

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateStr(yesterday);
        const yesterdayDayOfWeek = yesterday.getDay();

        for (const habit of habits) {
            const activeDays = habit.active_days || ALL_DAYS;

            // Only mark as missed if yesterday was an active day for this habit
            if (!activeDays.includes(yesterdayDayOfWeek)) {
                continue; // Skip - yesterday was a rest day
            }

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

    // Calculate success rate since tracking started (only counting active days)
    const calculateSuccessRate = (habit) => {
        if (!habit.history || habit.history.length === 0) {
            return { rate: null, completedDays: 0, totalDays: 0, startDate: null };
        }

        const activeDays = habit.active_days || ALL_DAYS;

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

        // Count active days from start to today
        let totalActiveDays = 0;
        let currentDate = new Date(startDate);
        while (currentDate <= today) {
            const dayOfWeek = currentDate.getDay();
            if (activeDays.includes(dayOfWeek)) {
                totalActiveDays++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        if (totalActiveDays <= 0) {
            return { rate: null, completedDays: 0, totalDays: 0, startDate: startDateStr };
        }

        // Count completed days (only on active days)
        const completedDays = normalizedHistory.filter(h => {
            if (h.status !== 'completed') return false;
            const date = new Date(h.date);
            const dayOfWeek = date.getDay();
            return activeDays.includes(dayOfWeek);
        }).length;

        // Calculate rate as percentage
        const rate = Math.round((completedDays / totalActiveDays) * 100);

        return { rate, completedDays, totalDays: totalActiveDays, startDate: startDateStr };
    };

    // Reset habit stats - clears history and sets new tracking start date
    const resetHabitStats = async (id) => {
        const habit = habits.find(h => h.id === id);
        if (!habit) return { error: 'Habit not found' };

        const today = new Date();
        const todayStr = getLocalDateStr(today);

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
        updateHabitDays,
        toggleHabit,
        cycleHabitStatus,
        getStatusForDate,
        getWeeklyStatus,
        isActiveDay,
        isTodayActive,
        deleteHabit,
        markMissedHabits,
        calculateSuccessRate,
        resetHabitStats,
    };
}

export default useHabits;
