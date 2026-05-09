import { motion } from 'framer-motion';

export function Header() {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <motion.header
      className="flex items-center justify-between px-5 pt-8 pb-2"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="flex flex-col">
        <h1 className="text-[26px] font-bold text-white tracking-tight">Your Habits</h1>
        <span className="text-[12px] text-white/30 mt-0.5">Stay consistent</span>
      </div>
      <motion.div
        className="px-4 py-2 rounded-full flex items-center gap-2"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)',
        }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
        <span className="text-[11px] text-white/50 font-mono">{dateStr}</span>
      </motion.div>
    </motion.header>
  );
}
