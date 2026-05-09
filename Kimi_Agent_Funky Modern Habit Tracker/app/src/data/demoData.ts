import type { Habit, WeeklyStats } from '@/types/habit';

export const initialHabits: Habit[] = [
  {
    id: '1',
    name: 'Morning Jog',
    time: '6:30 AM',
    completed: true,
    streak: 5,
    category: 'Fitness',
    weekData: [true, true, false, true, true, false, true],
  },
  {
    id: '2',
    name: 'Read 30 Pages',
    time: '8:00 AM',
    completed: true,
    streak: 12,
    category: 'Learning',
    weekData: [true, true, true, true, true, true, false],
  },
  {
    id: '3',
    name: 'Drink 8 Glasses',
    time: 'All Day',
    completed: false,
    streak: 3,
    category: 'Health',
    weekData: [true, false, true, true, false, true, false],
  },
  {
    id: '4',
    name: 'Meditation',
    time: '9:00 PM',
    completed: false,
    streak: 8,
    category: 'Wellness',
    weekData: [true, true, true, false, true, true, false],
  },
  {
    id: '5',
    name: 'No Sugar',
    time: 'All Day',
    completed: true,
    streak: 2,
    category: 'Health',
    weekData: [false, false, true, true, false, true, true],
  },
];

export const weeklyStats: WeeklyStats = {
  avg: 72,
  bestDay: 'Tue',
  bestDayRate: 100,
  bestStreak: 12,
  yesterdayComparison: '+14%',
  weekAverage: 72,
  completionRate: 78,
  todayProgress: 60,
  totalHabits: 5,
  completedHabits: 3,
};

export const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
