import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { weeklyStats } from '@/data/demoData';

export function BentoGrid() {
  const { habits, auraScore } = useApp();
  const completedCount = habits.filter((h) => h.completed).length;

  return (
    <div className="px-5 py-4">
      {/* Top row - large cards */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Aura Score - large */}
        <motion.div
          className="glass-card gradient-border glow-purple p-5 flex flex-col items-center justify-center text-center"
          style={{ minHeight: 160 }}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 25 }}
          whileTap={{ scale: 0.97 }}
        >
          <motion.span
            className="font-mono font-bold gradient-text"
            style={{ fontSize: 44, lineHeight: 1 }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
          >
            {auraScore}
          </motion.span>
          <span className="text-white/40 text-[11px] font-medium mt-2 tracking-wide">
            Aura Score
          </span>
          {/* Mini sparkline */}
          <svg width="80" height="24" viewBox="0 0 80 24" className="mt-3">
            <defs>
              <linearGradient id="spark" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
            <motion.path
              d="M0 18 L10 14 L20 16 L30 10 L40 12 L50 6 L60 8 L70 4 L80 2"
              stroke="url(#spark)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.6, duration: 1.2 }}
            />
          </svg>
        </motion.div>

        {/* Best Streak */}
        <motion.div
          className="glass-card gradient-border glow-green p-5 flex flex-col items-center justify-center text-center"
          style={{ minHeight: 160 }}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
          whileTap={{ scale: 0.97 }}
        >
          <motion.div
            initial={{ rotate: -10, scale: 0.5 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
          >
            <Flame size={28} color="#f59e0b" />
          </motion.div>
          <motion.span
            className="font-mono font-bold text-white mt-2"
            style={{ fontSize: 32, lineHeight: 1 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            {weeklyStats.bestStreak}
          </motion.span>
          <span className="text-white/40 text-[11px] font-medium mt-1 tracking-wide">
            Best Streak
          </span>
        </motion.div>
      </div>

      {/* Bottom row - smaller cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Week Avg */}
        <motion.div
          className="glass-card gradient-border glow-cyan p-4 flex flex-col items-center justify-center text-center"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 300, damping: 25 }}
          whileTap={{ scale: 0.97 }}
        >
          <motion.span
            className="font-mono font-bold gradient-text-cyan"
            style={{ fontSize: 28 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {weeklyStats.weekAverage}%
          </motion.span>
          <span className="text-white/40 text-[11px] font-medium mt-1">Week Avg</span>
          {/* Mini bar */}
          <div className="w-full mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #06b6d4, #3b82f6)' }}
              initial={{ width: 0 }}
              animate={{ width: `${weeklyStats.weekAverage}%` }}
              transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        </motion.div>

        {/* Completed */}
        <motion.div
          className="glass-card gradient-border p-4 flex flex-col items-center justify-center text-center"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 25 }}
          whileTap={{ scale: 0.97 }}
        >
          <div className="flex items-center gap-1">
            <motion.span
              className="font-mono font-bold text-[#22c55e]"
              style={{ fontSize: 28 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
            >
              {completedCount}
            </motion.span>
            <span className="font-mono text-white/20" style={{ fontSize: 20 }}>/</span>
            <motion.span
              className="font-mono font-semibold text-white/50"
              style={{ fontSize: 22 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {habits.length}
            </motion.span>
          </div>
          <span className="text-white/40 text-[11px] font-medium mt-1">Completed</span>
          {/* Pulsing dot */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"
              animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="text-[10px] text-white/30">Today</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
