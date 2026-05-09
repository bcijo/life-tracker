import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { HabitCard } from '@/components/HabitCard';
import { useApp } from '@/context/AppContext';

export function TodaysHabitsSection() {
  const { habits, toggleHabit } = useApp();

  return (
    <section className="px-5 pb-6">
      <motion.div
        className="flex items-center justify-between mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] font-semibold text-white">Today</h2>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(168,85,247,0.15)',
              color: '#a855f7',
            }}
          >
            {habits.length} habits
          </span>
        </div>
        <motion.button
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #a855f7, #ec4899)',
          }}
          whileTap={{ scale: 0.88 }}
        >
          <Plus size={16} color="#fff" strokeWidth={2.5} />
        </motion.button>
      </motion.div>

      <div className="flex flex-col gap-3">
        {habits.map((habit, index) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            onToggle={toggleHabit}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}
