import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { Habit } from '@/types/habit';
import { initialHabits } from '@/data/demoData';

type Page = 'dashboard' | 'insights';

interface AppContextType {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  habits: Habit[];
  toggleHabit: (id: string) => void;
  auraScore: number;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [habits, setHabits] = useState<Habit[]>(initialHabits);

  const toggleHabit = (id: string) => {
    setHabits((prev) =>
      prev.map((h) =>
        h.id === id ? { ...h, completed: !h.completed } : h
      )
    );
  };

  const completedCount = habits.filter((h) => h.completed).length;
  const auraScore = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

  return (
    <AppContext.Provider
      value={{ currentPage, setCurrentPage, habits, toggleHabit, auraScore }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
