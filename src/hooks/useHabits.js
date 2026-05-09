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

    const addHabit = async (name, activeDays = ALL_DAYS, timeOfDay = 'morning') => {
        const newHabit = {
            name,
            history: [], // Will store { date: 'YYYY-MM-DD', status: 'completed' | 'failed' }
            active_days: activeDays,
            time_of_day: timeOfDay, // 'morning' or 'evening'
        };
        return await insert(newHabit);
    };

    // Update habit's active days
    const updateHabitDays = async (id, activeDays) => {
        return await update(id, { active_days: activeDays });
    };

    // Update habit's time of day
    const updateHabitTimeOfDay = async (id, timeOfDay) => {
        return await update(id, { time_of_day: timeOfDay });
    };

    // Sort habits: by sort_order if set, otherwise morning before evening
    const getSortedHabits = () => {
        if (!habits || !Array.isArray(habits)) return [];
        return [...habits].sort((a, b) => {
            const aOrder = a.sort_order ?? 9999;
            const bOrder = b.sort_order ?? 9999;
            if (aOrder !== bOrder) return aOrder - bOrder;
            // Fallback: morning before evening
            const timeA = a.time_of_day || 'morning';
            const timeB = b.time_of_day || 'morning';
            if (timeA === timeB) return 0;
            return timeA === 'morning' ? -1 : 1;
        });
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

    // Explicitly set status to 'completed' or 'failed'
    const setHabitStatus = async (id, dateStr, status) => {
        if (status !== 'completed' && status !== 'failed') {
            return { error: 'Invalid status' };
        }
        
        const habit = habits.find(h => h.id === id);
        if (!habit) return { error: 'Habit not found' };

        const targetDate = dateStr || getLocalDateStr(new Date());

        let newHistory = (habit.history || []).map(h => {
            if (typeof h === 'string') {
                return { date: h.split('T')[0], status: 'completed' };
            }
            return h;
        });

        const existingIndex = newHistory.findIndex(h => h.date === targetDate);

        if (existingIndex >= 0) {
            newHistory[existingIndex].status = status;
        } else {
            newHistory.unshift({ date: targetDate, status });
        }

        newHistory.sort((a, b) => b.date.localeCompare(a.date));

        return await update(id, { history: newHistory });
    };

    // Calculate Habit Check-in Streak
    const calculateCheckinStreak = () => {
        if (!habits || habits.length === 0) return 0;
        
        // Get all unique dates where ANY habit was logged (completed or failed)
        const checkinDates = new Set();
        habits.forEach(habit => {
            if (habit.history && Array.isArray(habit.history)) {
                habit.history.forEach(h => {
                    const date = typeof h === 'string' ? h.split('T')[0] : h.date;
                    checkinDates.add(date);
                });
            }
        });
        
        const sortedDates = Array.from(checkinDates).sort((a, b) => b.localeCompare(a));
        if (sortedDates.length === 0) return 0;

        let streak = 0;
        const today = new Date();
        const todayStr = getLocalDateStr(today);
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateStr(yesterday);
        
        // If they haven't checked in today or yesterday, streak is broken
        if (!checkinDates.has(todayStr) && !checkinDates.has(yesterdayStr)) {
            return 0;
        }

        let currentDate = new Date(checkinDates.has(todayStr) ? today : yesterday);
        
        for (let i = 0; i < 365; i++) {
            const dateStr = getLocalDateStr(currentDate);
            if (checkinDates.has(dateStr)) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }
        
        return streak;
    };

    const toggleHabit = async (id) => {
        return await setHabitStatus(id, null, 'completed');
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
    // globalStartDate (YYYY-MM-DD) overrides per-habit tracking_start_date when provided
    const calculateSuccessRate = (habit, globalStartDate = null) => {
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

        // Global start date takes priority, then per-habit, then oldest entry
        let startDateStr = globalStartDate || habit.tracking_start_date;
        if (!startDateStr) {
            const sortedDates = normalizedHistory.map(h => h.date).sort();
            startDateStr = sortedDates[0];
        }

        if (!startDateStr) {
            return { rate: null, completedDays: 0, totalDays: 0, startDate: null };
        }

        const startDate = new Date(startDateStr + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);

        // Count active days from start to today
        let totalActiveDays = 0;
        let currentDate = new Date(startDate);
        while (currentDate <= today) {
            if (activeDays.includes(currentDate.getDay())) totalActiveDays++;
            currentDate.setDate(currentDate.getDate() + 1);
        }

        if (totalActiveDays <= 0) {
            return { rate: null, completedDays: 0, totalDays: 0, startDate: startDateStr };
        }

        // Count completed days (only on active days, only from startDate onwards)
        const completedDays = normalizedHistory.filter(h => {
            if (h.status !== 'completed') return false;
            if (h.date < startDateStr) return false;
            return activeDays.includes(new Date(h.date + 'T00:00:00').getDay());
        }).length;

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

    // Batch-update sort_order and time_of_day for all habits (used by reorder page)
    const batchUpdateHabitOrders = async (orderedHabits) => {
        // orderedHabits: array of { id, sort_order, time_of_day, ...rest }
        const promises = orderedHabits.map(h =>
            update(h.id, { sort_order: h.sort_order, time_of_day: h.time_of_day })
        );
        return await Promise.all(promises);
    };

    return {
        habits: getSortedHabits(),
        loading,
        error,
        addHabit,
        updateHabitDays,
        updateHabitTimeOfDay,
        toggleHabit,
        setHabitStatus,
        getStatusForDate,
        getWeeklyStatus,
        isActiveDay,
        isTodayActive,
        deleteHabit,
        markMissedHabits,
        calculateSuccessRate,
        resetHabitStats,
        batchUpdateHabitOrders,
        calculateCheckinStreak,
    };
}

export default useHabits;
