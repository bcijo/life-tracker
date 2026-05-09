import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { WeeklyBarChart } from '@/components/WeeklyBarChart';
import { weeklyStats } from '@/data/demoData';

export function WeeklyPerformanceSection() {
  const weekData = [65, 80, 100, 75, 60, 85, 72];

  return (
    <motion.section
      className="px-5 pb-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className="glass-card gradient-border p-5 glow-purple">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[15px] font-semibold text-white">This Week</h2>
          <div className="flex items-center gap-1">
            <motion.button
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.04)' }}
              whileTap={{ scale: 0.88 }}
            >
              <ChevronLeft size={14} color="rgba(255,255,255,0.3)" />
            </motion.button>
            <span className="text-[10px] text-white/25 font-mono mx-1">
              May 4 - 10
            </span>
            <motion.button
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.04)' }}
              whileTap={{ scale: 0.88 }}
            >
              <ChevronRight size={14} color="rgba(255,255,255,0.3)" />
            </motion.button>
          </div>
        </div>

        <WeeklyBarChart
          data={weekData}
          highlightIndex={6}
          avgBadge={`Avg ${weeklyStats.avg}%`}
        />
      </div>
    </motion.section>
  );
}
