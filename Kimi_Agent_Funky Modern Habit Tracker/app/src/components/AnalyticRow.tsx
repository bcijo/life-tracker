import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface AnalyticRowProps {
  label: string;
  children: ReactNode;
  delay?: number;
}

export function AnalyticRow({ label, children, delay = 0 }: AnalyticRowProps) {
  return (
    <motion.div
      className="flex items-center justify-between py-3.5"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 25 }}
    >
      <span className="text-[12px] text-white/30">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </motion.div>
  );
}
