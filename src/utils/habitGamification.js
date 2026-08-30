import { subDays, parseISO, startOfWeek, addDays } from 'date-fns';

export const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseLocalDate = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  const parts = dateStr.split('T')[0].split('-').map(Number);
  if (parts.length < 3) return new Date(dateStr);
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

/**
 * Level & Rank definitions
 */
export const getLevelData = (xp = 0) => {
  const safeXP = Math.max(0, Math.round(xp));
  // Scaling: XP needed for level L is (L-1)^2 * 35
  const level = Math.max(1, Math.floor(Math.sqrt(safeXP / 35)) + 1);
  const currentLevelBaseXP = Math.round(Math.pow(level - 1, 2) * 35);
  const nextLevelBaseXP = Math.round(Math.pow(level, 2) * 35);
  const xpInCurrentLevel = safeXP - currentLevelBaseXP;
  const xpNeededForNext = Math.max(1, nextLevelBaseXP - currentLevelBaseXP);
  const progressPercent = Math.min(100, Math.max(0, Math.round((xpInCurrentLevel / xpNeededForNext) * 100)));

  let rankTitle = 'Habit Novice';
  let rankIcon = '🌱';
  let rankColor = '#10b981';

  if (level >= 45) {
    rankTitle = 'Mythic Titan';
    rankIcon = '🌟';
    rankColor = '#fbbf24';
  } else if (level >= 30) {
    rankTitle = 'Streak Warlord';
    rankIcon = '👑';
    rankColor = '#f59e0b';
  } else if (level >= 20) {
    rankTitle = 'Habit Master';
    rankIcon = '🔮';
    rankColor = '#ec4899';
  } else if (level >= 13) {
    rankTitle = 'Consistency Champion';
    rankIcon = '⚔️';
    rankColor = '#a855f7';
  } else if (level >= 8) {
    rankTitle = 'Discipline Knight';
    rankIcon = '🛡️';
    rankColor = '#3b82f6';
  } else if (level >= 4) {
    rankTitle = 'Daily Apprentice';
    rankIcon = '⚡';
    rankColor = '#06b6d4';
  }

  return {
    level,
    rankTitle,
    rankIcon,
    rankColor,
    currentLevelBaseXP,
    nextLevelBaseXP,
    xpInCurrentLevel,
    xpNeededForNext,
    progressPercent,
    totalXP: safeXP,
  };
};

/**
 * Calculates active streak for a single habit
 */
export const calculateHabitStreak = (habit) => {
  if (!habit || !habit.history || !Array.isArray(habit.history) || habit.history.length === 0) {
    return 0;
  }
  const completedDates = new Set();
  habit.history.forEach((entry) => {
    const dStr = typeof entry === 'string' ? entry.split('T')[0] : entry.date;
    const status = typeof entry === 'string' ? 'completed' : entry.status;
    if (status === 'completed' && dStr) {
      completedDates.add(dStr);
    }
  });

  if (completedDates.size === 0) return 0;

  const now = new Date();
  const todayStr = getLocalDateStr(now);
  const yesterdayStr = getLocalDateStr(subDays(now, 1));
  const activeDays = habit.active_days || [0, 1, 2, 3, 4, 5, 6];

  let streak = 0;
  // Check if today or yesterday was completed
  let cursor = completedDates.has(todayStr) ? now : subDays(now, 1);
  if (!completedDates.has(todayStr) && !completedDates.has(yesterdayStr)) {
    return 0;
  }

  for (let i = 0; i < 365; i++) {
    const dStr = getLocalDateStr(cursor);
    const dow = cursor.getDay();
    if (activeDays.includes(dow)) {
      if (completedDates.has(dStr)) {
        streak++;
      } else {
        break;
      }
    }
    cursor = subDays(cursor, 1);
  }

  return streak;
};

/**
 * Computes gamified profile and transparent XP math from user habits
 */
export const computeGamifiedHabitMetrics = (habits, mode = 'all_time', fallbackScoreObj = null) => {
  const now = new Date();
  const todayStr = getLocalDateStr(now);
  const sevenDaysAgoStr = getLocalDateStr(subDays(now, 7));
  const thirtyDaysAgoStr = getLocalDateStr(subDays(now, 30));

  if (!habits || !Array.isArray(habits) || habits.length === 0) {
    // If no habits array, use fallback summary stats if provided
    if (fallbackScoreObj) {
      const score = Math.round(fallbackScoreObj.score || 0);
      const comps = fallbackScoreObj.completions_30d || fallbackScoreObj.completions || 0;
      const rate = Math.round(fallbackScoreObj.completion_rate || 0);
      const active = fallbackScoreObj.active_habits || 0;
      const levelData = getLevelData(score);

      return {
        ...levelData,
        score,
        completions: comps,
        thirtyDayCompletions: comps,
        sevenDayCompletions: Math.round(comps / 4),
        consistencyRate: rate,
        activeHabits: active,
        bestStreak: Math.max(1, Math.min(comps, 7)),
        perfectDays: Math.max(0, Math.round(comps / Math.max(1, active * 2))),
        breakdown: {
          checkinXP: comps * 10,
          streakXP: Math.round(active * 15),
          consistencyXP: Math.round(rate * 1.2),
          arsenalXP: active * 10,
          perfectDaysXP: 0,
        },
        dailyCompletions: {},
      };
    }

    const levelData = getLevelData(0);
    return {
      ...levelData,
      score: 0,
      completions: 0,
      thirtyDayCompletions: 0,
      sevenDayCompletions: 0,
      consistencyRate: 0,
      activeHabits: 0,
      bestStreak: 0,
      perfectDays: 0,
      breakdown: {
        checkinXP: 0,
        streakXP: 0,
        consistencyXP: 0,
        arsenalXP: 0,
        perfectDaysXP: 0,
      },
      dailyCompletions: {},
    };
  }

  let fromDateStr = thirtyDaysAgoStr;
  if (mode === 'this_week') {
    fromDateStr = getLocalDateStr(startOfWeek(now, { weekStartsOn: 1 }));
  } else if (mode === 'all_time') {
    fromDateStr = '2020-01-01';
  }

  const fromDate = parseISO(fromDateStr);

  let periodCompletions = 0;
  let thirtyDayCompletions = 0;
  let sevenDayCompletions = 0;
  let allTimeCompletions = 0;
  let activeHabitsCount = 0;
  let scheduledDaysTotal = 0;
  let completedDaysTotal = 0;
  let maxActiveStreak = 0;

  // Track completions per day to compute perfect days & daily clash
  const dayCompletedMap = {}; // { 'YYYY-MM-DD': Set(habitId) }
  const dayScheduledMap = {}; // { 'YYYY-MM-DD': number }

  habits.forEach((habit) => {
    if (habit.is_paused === true) return;
    activeHabitsCount++;

    const history = habit.history || [];
    const activeDays = habit.active_days || [0, 1, 2, 3, 4, 5, 6];
    const habitStreak = calculateHabitStreak(habit);
    if (habitStreak > maxActiveStreak) {
      maxActiveStreak = habitStreak;
    }

    const completedDates = new Set();
    history.forEach((entry) => {
      const date = typeof entry === 'string' ? entry.split('T')[0] : entry.date;
      const status = typeof entry === 'string' ? 'completed' : entry.status;
      if (status === 'completed' && date) {
        allTimeCompletions++;
        completedDates.add(date);

        if (!dayCompletedMap[date]) dayCompletedMap[date] = new Set();
        dayCompletedMap[date].add(habit.id || habit.name);

        if (date >= thirtyDaysAgoStr && date <= todayStr) {
          thirtyDayCompletions++;
        }
        if (date >= sevenDaysAgoStr && date <= todayStr) {
          sevenDayCompletions++;
        }
        if (date >= fromDateStr && date <= todayStr) {
          periodCompletions++;
        }
      }
    });

    let cursor = new Date(fromDate);
    while (cursor <= now) {
      const dow = cursor.getDay();
      const dStr = getLocalDateStr(cursor);
      if (activeDays.includes(dow)) {
        scheduledDaysTotal++;
        dayScheduledMap[dStr] = (dayScheduledMap[dStr] || 0) + 1;
        if (completedDates.has(dStr)) {
          completedDaysTotal++;
        }
      }
      cursor = addDays(cursor, 1);
    }
  });

  // Calculate Perfect Days (days where completed count >= scheduled count and scheduled > 0)
  let perfectDaysCount = 0;
  Object.keys(dayScheduledMap).forEach((dStr) => {
    if (dStr >= fromDateStr && dStr <= todayStr) {
      const scheduled = dayScheduledMap[dStr] || 0;
      const completed = dayCompletedMap[dStr]?.size || 0;
      if (scheduled > 0 && completed >= scheduled) {
        perfectDaysCount++;
      }
    }
  });

  const consistencyRate = scheduledDaysTotal > 0
    ? Math.round((completedDaysTotal / scheduledDaysTotal) * 100)
    : 0;

  // Transparent Itemized XP Calculation
  const checkinXP = mode === 'this_week' ? periodCompletions * 15 : (thirtyDayCompletions * 10) + (allTimeCompletions * 2);
  const streakXP = maxActiveStreak >= 7 ? 40 : maxActiveStreak >= 3 ? 20 : maxActiveStreak * 5;
  const consistencyXP = Math.round(consistencyRate * 1.5);
  const arsenalXP = activeHabitsCount * 10;
  const perfectDaysXP = perfectDaysCount * 20;

  const totalXP = checkinXP + streakXP + consistencyXP + arsenalXP + perfectDaysXP;
  const levelData = getLevelData(totalXP);

  // Daily completions map for the last 7 days
  const dailyCompletions = {};
  for (let i = 6; i >= 0; i--) {
    const d = subDays(now, i);
    const dStr = getLocalDateStr(d);
    dailyCompletions[dStr] = dayCompletedMap[dStr]?.size || 0;
  }

  return {
    ...levelData,
    score: totalXP,
    completions: mode === 'all_time' ? (thirtyDayCompletions || periodCompletions) : periodCompletions,
    thirtyDayCompletions,
    sevenDayCompletions,
    consistencyRate,
    activeHabits: activeHabitsCount,
    bestStreak: maxActiveStreak,
    perfectDays: perfectDaysCount,
    breakdown: {
      checkinXP,
      streakXP,
      consistencyXP,
      arsenalXP,
      perfectDaysXP,
    },
    dailyCompletions,
  };
};

/**
 * Computes 7-Day Head-to-Head Clash Matrix
 */
export const computeWeeklyClashMatrix = (myDailyComps = {}, theirDailyComps = {}) => {
  const now = new Date();
  const days = [];
  let myWins = 0;
  let theirWins = 0;
  let ties = 0;

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 6; i >= 0; i--) {
    const d = subDays(now, i);
    const dStr = getLocalDateStr(d);
    const dayLabel = dayLabels[d.getDay()];
    const isToday = i === 0;

    const myVal = myDailyComps[dStr] || 0;
    const theirVal = theirDailyComps[dStr] || 0;

    let winner = 'tie';
    if (myVal > theirVal) {
      winner = 'you';
      myWins++;
    } else if (theirVal > myVal) {
      winner = 'friend';
      theirWins++;
    } else {
      ties++;
    }

    days.push({
      dateStr: dStr,
      dayLabel,
      isToday,
      myVal,
      theirVal,
      winner,
    });
  }

  return {
    days,
    myWins,
    theirWins,
    ties,
    leader: myWins > theirWins ? 'you' : theirWins > myWins ? 'friend' : 'tie',
  };
};
