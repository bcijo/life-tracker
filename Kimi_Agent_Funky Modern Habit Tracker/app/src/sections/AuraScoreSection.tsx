import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { CircularProgressRing } from '@/components/CircularProgressRing';
import { useApp } from '@/context/AppContext';

export function AuraScoreSection() {
  const { habits, auraScore } = useApp();
  const completedCount = habits.filter((h) => h.completed).length;

  return (
    <motion.section
      className="flex flex-col items-center py-6"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
    >
      <CircularProgressRing
        percentage={auraScore}
        size={220}
        strokeWidth={10}
        label="Aura Score"
      />
      <motion.div
        className="flex items-center gap-1.5 mt-4"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.3 }}
      >
        <TrendingUp size={13} color="#34c759" strokeWidth={2} />
        <span className="text-[12px] text-[#64748b] font-medium">
          {completedCount} habits completed today
        </span>
      </motion.div>
    </motion.section>
  );
}
