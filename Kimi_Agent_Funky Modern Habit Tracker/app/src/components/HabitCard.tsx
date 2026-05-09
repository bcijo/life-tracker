import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import type { Habit } from '@/types/habit';
import { AuraSpringToggle } from './AuraSpringToggle';
import { dayLabels } from '@/data/demoData';

interface HabitCardProps {
  habit: Habit;
  onToggle: (id: string) => void;
  index: number;
}

const categoryColors: Record<string, string> = {
  Fitness: '#a855f7',
  Learning: '#06b6d4',
  Health: '#22c55e',
  Wellness: '#ec4899',
};

export function HabitCard({ habit, onToggle, index }: HabitCardProps) {
  const accentColor = categoryColors[habit.category] || '#a855f7';

  return (
    <motion.div
      className="relative overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 20,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 25,
        delay: 0.35 + index * 0.08,
      }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full"
        style={{
          background: `linear-gradient(180deg, ${accentColor}, ${accentColor}60)`,
        }}
      />

      <div className="p-4 pl-5">
        <div className="flex items-center justify-between">
          {/* Left: Habit info */}
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  background: `${accentColor}15`,
                  color: accentColor,
                }}
              >
                {habit.category}
              </span>
              {habit.streak >= 7 && (
                <span className="flex items-center gap-0.5 text-[10px] font-medium text-[#f59e0b]">
                  <Flame size={10} />
                  {habit.streak}
                </span>
              )}
            </div>
            <h3 className="text-[15px] font-semibold text-white truncate">
              {habit.name}
            </h3>
            <span className="text-[11px] text-white/30 font-mono">{habit.time}</span>
          </div>

          {/* Right: Toggle */}
          <AuraSpringToggle
            completed={habit.completed}
            onToggle={() => onToggle(habit.id)}
          />
        </div>

        {/* Week dots */}
        <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center gap-2">
            {dayLabels.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="text-[8px] text-white/20 font-medium">{day}</span>
                <motion.div
                  className="w-5 h-5 rounded-md flex items-center justify-center"
                  style={{
                    background: habit.weekData[i]
                      ? `${accentColor}25`
                      : i === 6
                      ? 'rgba(255,255,255,0.03)'
                      : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${habit.weekData[i] ? `${accentColor}30` : 'rgba(255,255,255,0.04)'}`,
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.04 }}
                >
                  {habit.weekData[i] && (
                    <svg width="8" height="6" viewBox="0 0 10 8" fill="none">
                      <path
                        d="M1 4L3.5 6.5L9 1"
                        stroke={accentColor}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  {!habit.weekData[i] && i !== 6 && (
                    <svg width="6" height="6" viewBox="0 0 8 8" fill="none">
                      <path
                        d="M1 1L7 7M7 1L1 7"
                        stroke="#ef4444"
                        strokeWidth="1"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </motion.div>
              </div>
            ))}
          </div>
          <span className="text-[10px] text-white/20 font-mono">
            {habit.weekData.filter(Boolean).length}/7
          </span>
        </div>
      </div>
    </motion.div>
  );
}
