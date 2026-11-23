import { useEffect } from 'react';
import useSupabaseData from './useSupabaseData';
import { supabase } from '../lib/supabase';
import { VITAL_SEVEN, vitalDefOf, isVitalHabit } from '../lib/habitPacks';

// Default active days: all days of the week (Sunday=0 to Saturday=6)
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

// Helper to parse YYYY-MM-DD string into a Local Date (not UTC midnight)
export const parseLocalDate = (dateStr) => {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) return dateStr;
    const parts = dateStr.split('T')[0].split('-').map(Number);
    if (parts.length < 3) return new Date(dateStr);
    return new Date(parts[0], parts[1] - 1, parts[2]);
};

// Helper to get local date string in YYYY-MM-DD format
export const getLocalDateStr = (date = new Date()) => {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Calculate streak for a single habit, supporting paused / vacation days
export const calculateHabitStreak = (habit, trackingStartDate = null) => {
    if (!habit || !habit.history || !Array.isArray(habit.history) || habit.history.length === 0) {
        return 0;
    }
    const activeDays = habit.active_days || ALL_DAYS;

    const statusByDate = {};
    habit.history.forEach(entry => {
        if (typeof entry === 'string') {
            statusByDate[entry.split('T')[0]] = 'completed';
        } else if (entry && entry.date) {
            statusByDate[entry.date] = entry.status || 'completed';
        }
    });

    const today = new Date();
    let streak = 0;

    for (let i = 0; i <= 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = getLocalDateStr(checkDate);

        if (trackingStartDate && dateStr < trackingStartDate) break;
        if (habit.tracking_start_date && dateStr < habit.tracking_start_date) break;

        const dow = checkDate.getDay();
        if (!activeDays.includes(dow)) continue; // Scheduled rest day

        const status = statusByDate[dateStr] || null;

        if (status === 'completed') {
            streak++;
        } else if (status === 'paused') {
            // Paused / vacation day preserves streak
            continue;
        } else if (status === 'failed') {
            break;
        } else {
            // Neutral (unmarked)
            if (i === 0) {
                // Today not logged yet: continue looking for previous days
                continue;
            } else if (habit.is_paused && streak === 0) {
                // Habit is currently paused and we haven't reached the pre-pause streak yet:
                // skip neutral days during the pause window
                continue;
            } else {
                break;
            }
        }
    }

    return streak;
};

// Errors that mean the Vital Seven migration (emoji / pack_key columns) hasn't been run
const isMissingColumnError = (err) => {
    const msg = String(err || '').toLowerCase();
    return msg.includes('emoji') || msg.includes('pack_key') || msg.includes('column') || msg.includes('schema cache');
};

// Done Vital Seven keys for one day, from habit histories
const vitalDoneKeys = (habits, dateStr) => habits
    .filter((h) => isVitalHabit(h))
    .filter((h) => (h.history || []).some((e) => (typeof e === 'string'
        ? e.split('T')[0] === dateStr
        : e?.date === dateStr && (e.status || 'completed') === 'completed')))
    .map((h) => vitalDefOf(h).key);

/**
 * Writes Vital Seven progress for the given days to `vital_progress`, the
 * only habit data friends can read. Fails silently if the table doesn't exist.
 */
const syncVitalProgress = async (habits, dates) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId || !dates.length) return;
        const rows = dates.map((date) => {
            const keys = [...new Set(vitalDoneKeys(habits, date))];
            return { user_id: userId, date, done_keys: keys, done_count: keys.length, total: VITAL_SEVEN.habits.length, updated_at: new Date().toISOString() };
        });
        await supabase.from('vital_progress').upsert(rows, { onConflict: 'user_id,date' });
    } catch {
        // Table may not exist yet; friends features simply show no data
    }
};

// Once per user per app session
const vitalSetupDone = new Set();

function useHabits() {
    const { data: habits, loading, error, insert, update, remove } = useSupabaseData('habits');

    // Check if a given date's day-of-week is in the habit's active days
    const isActiveDay = (habit, dateStr) => {
        if (!habit) return false;
        const activeDays = habit.active_days || ALL_DAYS;
        const date = parseLocalDate(dateStr);
        const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
        return activeDays.includes(dayOfWeek);
    };

    // Check if today is an active day for the habit
    const isTodayActive = (habit) => {
        if (!habit) return false;
        const today = new Date();
        const dayOfWeek = today.getDay();
        const activeDays = habit.active_days || ALL_DAYS;
        return activeDays.includes(dayOfWeek);
    };

    const addHabit = async (name, activeDays = ALL_DAYS, timeOfDay = 'morning', extra = {}) => {
        // IMPORTANT: Only insert columns that exist in the DB schema.
        // tracking_start_date and is_paused were added in migrations that may not have been applied.
        // - tracking_start_date: calculateSuccessRate falls back to created_at when absent
        // - is_paused: defaults to false behavior when the field is undefined/absent
        // Run the migration SQL from lib/add_tracking_start_date_migration.sql to enable full features.
        const newHabit = {
            name,
            history: [],
            active_days: activeDays,
            time_of_day: timeOfDay,
            ...(extra.emoji ? { emoji: extra.emoji } : {}),
            ...(extra.packKey ? { pack_key: extra.packKey } : {}),
        };
        const res = await insert(newHabit);
        // Before the Vital Seven migration, the emoji / pack_key columns don't exist
        if (res?.error && (extra.emoji || extra.packKey) && isMissingColumnError(res.error)) {
            const { emoji, pack_key, ...plain } = newHabit;
            return await insert(plain);
        }
        return res;
    };

    // Change a habit's emoji (needs the Vital Seven migration to be saved)
    const updateHabitEmoji = async (id, emoji) => update(id, { emoji });

    // Every user gets the Vital Seven. Runs once per session after habits load:
    // adds any that are missing, tags same-named habits from before, and
    // backfills the last 60 days of progress for friends.
    useEffect(() => {
        if (loading) return undefined;
        let cancelled = false;
        (async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            if (!userId || vitalSetupDone.has(userId) || cancelled) return;
            vitalSetupDone.add(userId);

            const current = habits || [];
            for (const def of VITAL_SEVEN.habits) {
                const match = current.find((h) => vitalDefOf(h)?.key === def.key);
                if (!match) {
                    await addHabit(def.name, def.activeDays, def.timeOfDay, { emoji: def.emoji, packKey: def.key });
                } else if (!match.pack_key && !String(match.id).startsWith('temp-')) {
                    // A same-named habit (e.g. added from the old starter pack): tag it
                    const res = await update(match.id, { pack_key: def.key, emoji: match.emoji || def.emoji });
                    if (res?.error) break; // columns not there yet; name matching still works
                }
            }

            const days = Array.from({ length: 60 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return getLocalDateStr(d);
            });
            syncVitalProgress(current, days);
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]);

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
        if (!habit || !habit.history || !Array.isArray(habit.history)) return null;

        // Handle legacy format (array of date strings)
        const entry = habit.history.find(h => {
            if (typeof h === 'string') {
                return h.startsWith(dateStr);
            }
            return h.date === dateStr;
        });

        if (!entry) return null;
        if (typeof entry === 'string') return 'completed'; // Legacy format
        return entry.status || null;
    };

    // Get weekly status for the current week (Sunday to Saturday or rolling)
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

    // Explicitly set status to 'completed', 'failed', or null (to uncheck/clear)
    const setHabitStatus = async (id, dateStr, status) => {
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

        if (status === null || status === undefined || status === 'neutral') {
            // Remove entry if clearing status
            if (existingIndex >= 0) {
                newHistory.splice(existingIndex, 1);
            }
        } else if (status === 'completed' || status === 'failed') {
            if (existingIndex >= 0) {
                newHistory[existingIndex].status = status;
            } else {
                newHistory.unshift({ date: targetDate, status });
            }
        } else {
            return { error: 'Invalid status' };
        }

        newHistory.sort((a, b) => b.date.localeCompare(a.date));

        const result = await update(id, { history: newHistory });
        if (isVitalHabit(habit)) {
            const nextHabits = habits.map((h) => (h.id === id ? { ...h, history: newHistory } : h));
            syncVitalProgress(nextHabits, [targetDate]);
        }
        return result;
    };

    // Calculate Habit Check-in Streak across all habits
    const calculateCheckinStreak = () => {
        if (!habits || habits.length === 0) return 0;
        
        // Get all unique dates where ANY habit was logged as completed or paused
        const checkinDates = new Set();
        const pausedDates = new Set();
        const allHabitsPaused = habits.length > 0 && habits.every(h => h.is_paused);

        habits.forEach(habit => {
            if (habit.history && Array.isArray(habit.history)) {
                habit.history.forEach(h => {
                    if (typeof h === 'string') {
                        checkinDates.add(h.split('T')[0]);
                    } else if (h.status === 'completed') {
                        checkinDates.add(h.date);
                    } else if (h.status === 'paused') {
                        pausedDates.add(h.date);
                    }
                });
            }
        });
        
        if (checkinDates.size === 0) return 0;

        let streak = 0;
        let currentDate = new Date();
        
        for (let i = 0; i <= 365; i++) {
            const dateStr = getLocalDateStr(currentDate);
            if (checkinDates.has(dateStr)) {
                streak++;
            } else if (pausedDates.has(dateStr)) {
                // Paused / vacation day: preserve checkin streak
                // continues to previous day
            } else if (i === 0) {
                // Today not logged yet: continue looking for previous days
            } else if (allHabitsPaused && streak === 0) {
                // All habits currently paused on vacation: skip neutral days
            } else {
                break;
            }
            currentDate.setDate(currentDate.getDate() - 1);
        }
        
        return streak;
    };

    const toggleHabit = async (id) => {
        const habit = habits.find(h => h.id === id);
        if (!habit) return;
        const todayStr = getLocalDateStr(new Date());
        const current = getStatusForDate(habit, todayStr);
        const nextStatus = current === 'completed' ? null : 'completed';
        return await setHabitStatus(id, todayStr, nextStatus);
    };

    const deleteHabit = async (id) => {
        const target = habits.find((h) => h.id === id);
        if (isVitalHabit(target)) return { error: 'The Vital Seven can\'t be deleted' };
        return await remove(id);
    };

    // Toggle habit paused status (streak protection for individual habit)
    const togglePauseHabit = async (id) => {
        const habit = habits.find(h => h.id === id);
        if (!habit) return { error: 'Habit not found' };

        const todayStr = getLocalDateStr(new Date());
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateStr(yesterday);
        const activeDays = habit.active_days || ALL_DAYS;

        let newHistory = (habit.history || []).map(h => {
            if (typeof h === 'string') {
                return { date: h.split('T')[0], status: 'completed' };
            }
            return { ...h };
        });

        if (!habit.is_paused) {
            // Pausing this habit
            localStorage.setItem(`life_tracker_pause_${id}`, todayStr);
            const todayIndex = newHistory.findIndex(h => h.date === todayStr);
            if (todayIndex < 0 && activeDays.includes(new Date().getDay())) {
                newHistory.unshift({ date: todayStr, status: 'paused' });
            }
            newHistory.sort((a, b) => b.date.localeCompare(a.date));
            return await update(id, { is_paused: true, history: newHistory });
        } else {
            // Resuming this habit
            const pauseStartStr = localStorage.getItem(`life_tracker_pause_${id}`) || todayStr;
            const startD = parseLocalDate(pauseStartStr);
            const endD = parseLocalDate(yesterdayStr);

            if (startD <= endD) {
                let cursor = new Date(startD);
                while (cursor <= endD) {
                    const curStr = getLocalDateStr(cursor);
                    if (activeDays.includes(cursor.getDay())) {
                        const existingIndex = newHistory.findIndex(h => h.date === curStr);
                        if (existingIndex >= 0) {
                            if (newHistory[existingIndex].status !== 'completed') {
                                newHistory[existingIndex].status = 'paused';
                            }
                        } else {
                            newHistory.unshift({ date: curStr, status: 'paused' });
                        }
                    }
                    cursor.setDate(cursor.getDate() + 1);
                }
            }

            // If today was marked 'paused', remove it so today is ready to be logged!
            const todayIndex = newHistory.findIndex(h => h.date === todayStr);
            if (todayIndex >= 0 && newHistory[todayIndex].status === 'paused') {
                newHistory.splice(todayIndex, 1);
            }

            localStorage.removeItem(`life_tracker_pause_${id}`);
            newHistory.sort((a, b) => b.date.localeCompare(a.date));
            return await update(id, { is_paused: false, history: newHistory });
        }
    };

    // Pause all habits (Vacation Mode)
    const pauseAllHabits = async (startDate = null) => {
        if (!habits || habits.length === 0) return;
        const todayStr = getLocalDateStr(new Date());
        const vacationStartStr = startDate || todayStr;
        localStorage.setItem('life_tracker_vacation_start', vacationStartStr);

        const promises = habits.map(async (habit) => {
            let newHistory = (habit.history || []).map(h => {
                if (typeof h === 'string') {
                    return { date: h.split('T')[0], status: 'completed' };
                }
                return { ...h };
            });

            // Backfill from vacationStartStr to today if startDate is earlier or today
            const startD = parseLocalDate(vacationStartStr);
            const todayD = parseLocalDate(todayStr);
            let cursor = new Date(startD);

            while (cursor <= todayD) {
                const curStr = getLocalDateStr(cursor);
                const activeDays = habit.active_days || ALL_DAYS;

                if (activeDays.includes(cursor.getDay())) {
                    const existingIndex = newHistory.findIndex(h => h.date === curStr);
                    if (existingIndex >= 0) {
                        if (newHistory[existingIndex].status !== 'completed') {
                            newHistory[existingIndex].status = 'paused';
                        }
                    } else {
                        newHistory.unshift({ date: curStr, status: 'paused' });
                    }
                }
                cursor.setDate(cursor.getDate() + 1);
            }

            newHistory.sort((a, b) => b.date.localeCompare(a.date));
            return update(habit.id, { is_paused: true, history: newHistory });
        });

        return await Promise.all(promises);
    };

    // Unpause all habits (End Vacation)
    const unpauseAllHabits = async () => {
        if (!habits || habits.length === 0) return;
        const todayStr = getLocalDateStr(new Date());
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateStr(yesterday);

        const storedVacationStart = localStorage.getItem('life_tracker_vacation_start');

        const promises = habits.map(async (habit) => {
            if (!habit.is_paused) return;

            let newHistory = (habit.history || []).map(h => {
                if (typeof h === 'string') {
                    return { date: h.split('T')[0], status: 'completed' };
                }
                return { ...h };
            });

            // Find start of pause: from storedVacationStart, or from earliest consecutive pause entries
            let pauseStartStr = storedVacationStart;
            if (!pauseStartStr) {
                const pausedEntries = newHistory.filter(h => h.status === 'paused').map(h => h.date).sort();
                if (pausedEntries.length > 0) {
                    pauseStartStr = pausedEntries[0];
                } else {
                    pauseStartStr = todayStr;
                }
            }

            // Fill all active days from pauseStartStr to yesterdayStr with status 'paused'
            const startD = parseLocalDate(pauseStartStr);
            const endD = parseLocalDate(yesterdayStr);
            const activeDays = habit.active_days || ALL_DAYS;

            if (startD <= endD) {
                let cursor = new Date(startD);
                while (cursor <= endD) {
                    const curStr = getLocalDateStr(cursor);
                    if (activeDays.includes(cursor.getDay())) {
                        const existingIndex = newHistory.findIndex(h => h.date === curStr);
                        if (existingIndex >= 0) {
                            if (newHistory[existingIndex].status !== 'completed') {
                                newHistory[existingIndex].status = 'paused';
                            }
                        } else {
                            newHistory.unshift({ date: curStr, status: 'paused' });
                        }
                    }
                    cursor.setDate(cursor.getDate() + 1);
                }
            }

            // If today was marked 'paused' earlier, remove it so today becomes active/ready for logging!
            const todayIndex = newHistory.findIndex(h => h.date === todayStr);
            if (todayIndex >= 0 && newHistory[todayIndex].status === 'paused') {
                newHistory.splice(todayIndex, 1);
            }

            newHistory.sort((a, b) => b.date.localeCompare(a.date));
            return update(habit.id, { is_paused: false, history: newHistory });
        });

        localStorage.removeItem('life_tracker_vacation_start');
        return await Promise.all(promises);
    };

    // Mark habits as missed for yesterday if no status was set (only for active days)
    const markMissedHabits = async () => {
        if (!habits || habits.length === 0) return;

        const globalTrackingStart = localStorage.getItem('life_tracker_tracking_start');
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalDateStr(yesterday);
        const yesterdayDayOfWeek = yesterday.getDay();

        // If global tracking started today or later, don't mark yesterday
        if (globalTrackingStart && yesterdayStr < globalTrackingStart) {
            return;
        }

        for (const habit of habits) {
            // Skip paused habits
            if (habit.is_paused) continue;

            // Don't mark missed if habit was created today or after yesterday
            if (habit.created_at) {
                const habitCreatedStr = getLocalDateStr(parseLocalDate(habit.created_at));
                if (yesterdayStr < habitCreatedStr) continue;
            }

            if (habit.tracking_start_date && yesterdayStr < habit.tracking_start_date) {
                continue;
            }

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

    // Calculate success rate since tracking started (only counting active days, excluding paused days)
    const calculateSuccessRate = (habit, globalStartDate = null) => {
        if (!habit || !habit.history || habit.history.length === 0) {
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

        const startDate = parseLocalDate(startDateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);

        // Count active days from start to today (excluding paused/vacation days)
        let totalActiveDays = 0;
        let currentDate = new Date(startDate);
        while (currentDate <= today) {
            const curStr = getLocalDateStr(currentDate);
            const status = getStatusForDate(habit, curStr);
            if (activeDays.includes(currentDate.getDay()) && status !== 'paused') {
                totalActiveDays++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        if (totalActiveDays <= 0) {
            return { rate: null, completedDays: 0, totalDays: 0, startDate: startDateStr };
        }

        // Count completed days (only on active days, only from startDate onwards)
        const completedDays = normalizedHistory.filter(h => {
            if (h.status !== 'completed') return false;
            if (h.date < startDateStr) return false;
            const hDate = parseLocalDate(h.date);
            return activeDays.includes(hDate.getDay());
        }).length;

        const rate = Math.round((completedDays / totalActiveDays) * 100);
        return { rate, completedDays, totalDays: totalActiveDays, startDate: startDateStr };
    };

    // Reset habit stats - clears history and sets new tracking start date
    const resetHabitStats = async (id) => {
        const habit = habits.find(h => h.id === id);
        if (!habit) return { error: 'Habit not found' };

        const todayStr = getLocalDateStr(new Date());

        return await update(id, {
            history: [],
            tracking_start_date: todayStr
        });
    };

    // Batch-update sort_order and time_of_day for all habits (used by reorder page)
    const batchUpdateHabitOrders = async (orderedHabits) => {
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
        updateHabitEmoji,
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
        calculateStreak: (h) => calculateHabitStreak(h, localStorage.getItem('life_tracker_tracking_start')),
        togglePauseHabit,
        pauseAllHabits,
        unpauseAllHabits,
    };
}

export default useHabits;
