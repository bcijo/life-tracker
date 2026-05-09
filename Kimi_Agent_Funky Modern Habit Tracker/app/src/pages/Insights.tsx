import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { GradientOrbs } from '@/components/GradientOrbs';
import { WeeklyPerformanceSection } from '@/sections/WeeklyPerformanceSection';
import { HabitAnalyticsSection } from '@/sections/HabitAnalyticsSection';
import { useApp } from '@/context/AppContext';

export function Insights() {
  const { setCurrentPage } = useApp();

  return (
    <motion.div
      className="relative min-h-screen overflow-hidden"
      style={{ background: '#060b14' }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0.5, y: 20 }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
    >
      <GradientOrbs />
      <div className="relative z-10">
        {/* Header */}
        <motion.header
          className="flex items-center gap-3 px-5 pt-8 pb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.button
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            onClick={() => setCurrentPage('dashboard')}
            whileTap={{ scale: 0.88 }}
          >
            <ArrowLeft size={16} color="#fff" strokeWidth={2} />
          </motion.button>
          <div className="flex items-center gap-2">
            <h1 className="text-[24px] font-bold gradient-text tracking-tight">Insights</h1>
            <Sparkles size={16} color="#a855f7" />
          </div>
        </motion.header>

        <WeeklyPerformanceSection />
        <HabitAnalyticsSection />

        {/* Bottom spacer for nav */}
        <div className="h-24" />
      </div>
    </motion.div>
  );
}
