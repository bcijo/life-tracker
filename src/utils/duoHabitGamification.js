import { subDays } from 'date-fns';

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Format a Date object to local YYYY-MM-DD
 */
export const getLocalDateStr = (date = new Date()) => {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parse YYYY-MM-DD into a local Date object
 */
export const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  const parts = dateStr.split('T')[0].split('-').map(Number);
  if (parts.length < 3) return new Date(dateStr);
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

/**
 * Extract habit status for a given dateStr ('completed', 'failed', or null)
 */
export const getHabitStatusForDate = (habit, dateStr) => {
  if (!habit || !habit.history || !Array.isArray(habit.history)) return null;

  const entry = habit.history.find(h => {
    if (typeof h === 'string') {
      return h.startsWith(dateStr);
    }
    return h.date === dateStr;
  });

  if (!entry) return null;
  if (typeof entry === 'string') return 'completed';
  return entry.status || null;
};

/**
 * Check if day of week for dateStr is an active day
 */
export const isDayActive = (activeDays = ALL_DAYS, dateStr) => {
  const days = activeDays && activeDays.length > 0 ? activeDays : ALL_DAYS;
  const date = parseLocalDate(dateStr);
  return days.includes(date.getDay());
};

/**
 * Get partner's status for a date ('completed', 'failed', 'pending', or 'rest')
 */
export const getPartnerDailyStatus = (partnerHabit, activeDays = ALL_DAYS, dateStr = getLocalDateStr(new Date())) => {
  if (!isDayActive(activeDays, dateStr)) {
    return { status: 'rest', label: 'Rest Day', color: 'var(--text-muted)' };
  }

  const status = getHabitStatusForDate(partnerHabit, dateStr);
  if (status === 'completed') {
    return { status: 'completed', label: 'Completed', color: '#22c55e' };
  }
  if (status === 'failed') {
    return { status: 'failed', label: 'Missed', color: '#ef4444' };
  }
  return { status: 'pending', label: 'Pending', color: '#f59e0b' };
};

/**
 * Calculate Duo Streak: Consecutive active days where BOTH completed the habit
 */
export const computeDuoStreak = (pact, myHabit, partnerHabit) => {
  if (!pact || !myHabit || !partnerHabit) return 0;
  const activeDays = pact.active_days && pact.active_days.length > 0 ? pact.active_days : ALL_DAYS;

  const today = new Date();
  const todayStr = getLocalDateStr(today);
  let streak = 0;

  // Check today first
  const myTodayStatus = getHabitStatusForDate(myHabit, todayStr);
  const partnerTodayStatus = getHabitStatusForDate(partnerHabit, todayStr);
  const isTodayActive = isDayActive(activeDays, todayStr);

  let startIndex = 1; // start checking from yesterday by default
  if (isTodayActive) {
    if (myTodayStatus === 'completed' && partnerTodayStatus === 'completed') {
      streak = 1;
    }
  }

  // Iterate backwards through past year
  for (let i = startIndex; i <= 365; i++) {
    const checkDate = subDays(today, i);
    const dateStr = getLocalDateStr(checkDate);

    // Stop if before pact creation
    if (pact.created_at && dateStr < pact.created_at.split('T')[0]) break;

    // Skip if rest day
    if (!isDayActive(activeDays, dateStr)) continue;

    const myStatus = getHabitStatusForDate(myHabit, dateStr);
    const partnerStatus = getHabitStatusForDate(partnerHabit, dateStr);

    if (myStatus === 'completed' && partnerStatus === 'completed') {
      streak++;
    } else {
      // Both didn't complete on an active day, streak breaks
      break;
    }
  }

  return streak;
};

/**
 * Calculate Synergy Score (% of active days in last 30 days where both completed)
 */
export const computeSynergyScore = (pact, myHabit, partnerHabit, days = 30) => {
  if (!pact || !myHabit || !partnerHabit) return 0;
  const activeDays = pact.active_days && pact.active_days.length > 0 ? pact.active_days : ALL_DAYS;

  const today = new Date();
  let totalActiveDays = 0;
  let mutualCompletions = 0;

  for (let i = 0; i < days; i++) {
    const checkDate = subDays(today, i);
    const dateStr = getLocalDateStr(checkDate);

    // Don't calculate days before pact was made
    if (pact.created_at && dateStr < pact.created_at.split('T')[0]) break;

    if (!isDayActive(activeDays, dateStr)) continue;

    totalActiveDays++;
    const myStatus = getHabitStatusForDate(myHabit, dateStr);
    const partnerStatus = getHabitStatusForDate(partnerHabit, dateStr);

    if (myStatus === 'completed' && partnerStatus === 'completed') {
      mutualCompletions++;
    }
  }

  if (totalActiveDays === 0) return 100;
  return Math.round((mutualCompletions / totalActiveDays) * 100);
};

/**
 * Get Duo Milestone Badge based on streak count
 */
export const getDuoBadge = (streak) => {
  if (streak >= 100) {
    return { name: 'Titan Duo', icon: '👑', color: '#ec4899', tier: 5 };
  }
  if (streak >= 50) {
    return { name: 'Unbreakable Bond', icon: '🛡️', color: '#a855f7', tier: 4 };
  }
  if (streak >= 21) {
    return { name: 'Habit Synergy', icon: '🤝', color: '#06b6d4', tier: 3 };
  }
  if (streak >= 7) {
    return { name: 'Duo Spark', icon: '⚡', color: '#f59e0b', tier: 2 };
  }
  return { name: 'Duo Seed', icon: '🌱', color: '#22c55e', tier: 1 };
};

/**
 * Generate 7-day comparative matrix for You vs Partner
 */
export const computeDuoWeeklyMatrix = (pact, myHabit, partnerHabit, numDays = 7) => {
  const activeDays = pact?.active_days && pact.active_days.length > 0 ? pact.active_days : ALL_DAYS;
  const today = new Date();
  const matrix = [];

  for (let i = numDays - 1; i >= 0; i--) {
    const d = subDays(today, i);
    const dateStr = getLocalDateStr(d);
    const dayOfWeek = d.getDay();
    const isActive = activeDays.includes(dayOfWeek);

    const myStatus = getHabitStatusForDate(myHabit, dateStr);
    const partnerStatus = getHabitStatusForDate(partnerHabit, dateStr);
    const isSynced = isActive && myStatus === 'completed' && partnerStatus === 'completed';

    matrix.push({
      dateStr,
      dayLabel: DAY_LABELS[dayOfWeek],
      isActive,
      myStatus,
      partnerStatus,
      isSynced,
      isToday: i === 0,
    });
  }

  return matrix;
};
