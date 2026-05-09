export interface Habit {
  id: string;
  name: string;
  time: string;
  completed: boolean;
  streak: number;
  weekData: boolean[];
  category: string;
}

export interface WeeklyStats {
  avg: number;
  bestDay: string;
  bestDayRate: number;
  bestStreak: number;
  yesterdayComparison: string;
  weekAverage: number;
  completionRate: number;
  todayProgress: number;
  totalHabits: number;
  completedHabits: number;
}
