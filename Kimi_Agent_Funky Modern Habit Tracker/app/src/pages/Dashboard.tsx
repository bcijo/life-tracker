import { motion } from 'framer-motion';
import { GradientOrbs } from '@/components/GradientOrbs';
import { BentoGrid } from '@/components/BentoGrid';
import { Header } from '@/sections/Header';
import { TodaysHabitsSection } from '@/sections/TodaysHabitsSection';

export function Dashboard() {
  return (
    <motion.div
      className="relative min-h-screen overflow-hidden"
      style={{ background: '#060b14' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0.5, y: 20 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <GradientOrbs />
      <div className="relative z-10">
        <Header />
        <BentoGrid />
        <TodaysHabitsSection />
      </div>
    </motion.div>
  );
}
