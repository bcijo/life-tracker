import { motion } from 'framer-motion';
import { Flame, ArrowUp, ArrowDown, Target, Zap, Calendar } from 'lucide-react';
import { AnalyticRow } from '@/components/AnalyticRow';
import { CompletionRing } from '@/components/CompletionRing';
import { SegmentedProgress } from '@/components/SegmentedProgress';
import { weeklyStats } from '@/data/demoData';
import { useApp } from '@/context/AppContext';

export function HabitAnalyticsSection() {
  const { habits } = useApp();
  const completedCount = habits.filter((h) => h.completed).length;
  const isPositive = weeklyStats.yesterdayComparison.startsWith('+');

  return (
    <motion.section
      className="px-5 pb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
    >
      <div className="glass-card gradient-border p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[15px] font-semibold text-white">Habit Analytics</h2>
          <Target size={14} color="rgba(255,255,255,0.2)" />
        </div>
        <p className="text-[10px] text-white/20 font-mono mb-4">
          Compared to last week
        </p>

        <AnalyticRow label="Today's Progress" delay={0.1}>
          <SegmentedProgress current={completedCount} total={habits.length} />
        </AnalyticRow>

        <AnalyticRow label="Yesterday" delay={0.15}>
          <span
            className="flex items-center gap-1 text-[13px] font-mono font-semibold"
            style={{ color: isPositive ? '#22c55e' : '#ef4444' }}
          >
            {isPositive ? (
              <ArrowUp size={13} strokeWidth={2.5} />
            ) : (
              <ArrowDown size={13} strokeWidth={2.5} />
            )}
            {weeklyStats.yesterdayComparison}
          </span>
        </AnalyticRow>

        <AnalyticRow label="Week Average" delay={0.2}>
          <div className="flex items-center gap-1.5">
            <Zap size={13} color="#06b6d4" />
            <span className="text-[20px] font-mono font-bold gradient-text-cyan">
              {weeklyStats.weekAverage}%
            </span>
          </div>
        </AnalyticRow>

        <AnalyticRow label="Best Day" delay={0.25}>
          <div className="flex items-center gap-1.5">
            <Calendar size={13} color="#a855f7" />
            <span className="text-[13px] font-mono font-semibold text-white">
              {weeklyStats.bestDay} ({weeklyStats.bestDayRate}%)
            </span>
          </div>
        </AnalyticRow>

        <AnalyticRow label="Best Streak" delay={0.3}>
          <div className="flex items-center gap-1.5">
            <Flame size={14} color="#f59e0b" />
            <span className="text-[13px] font-mono font-semibold text-[#f59e0b]">
              {weeklyStats.bestStreak} days
            </span>
          </div>
        </AnalyticRow>

        <motion.div
          className="flex items-center justify-between py-3.5"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35, type: 'spring', stiffness: 300, damping: 25 }}
        >
          <span className="text-[12px] text-white/30">Completion Rate</span>
          <CompletionRing percentage={weeklyStats.completionRate} size={56} />
        </motion.div>
      </div>
    </motion.section>
  );
}
