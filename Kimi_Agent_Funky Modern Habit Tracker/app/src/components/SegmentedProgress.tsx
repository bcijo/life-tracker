import { motion } from 'framer-motion';

interface SegmentedProgressProps {
  current: number;
  total: number;
}

export function SegmentedProgress({ current, total }: SegmentedProgressProps) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <motion.div
          key={i}
          className="h-2 rounded-full"
          style={{
            width: 20,
            background: i < current
              ? 'linear-gradient(90deg, #a855f7, #ec4899)'
              : 'rgba(255,255,255,0.06)',
            boxShadow: i < current ? '0 0 8px rgba(168,85,247,0.3)' : 'none',
          }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{
            delay: 0.1 + i * 0.1,
            type: 'spring',
            stiffness: 300,
            damping: 25,
          }}
        />
      ))}
      <span className="text-[11px] font-mono text-white/30 ml-1">
        {current}/{total}
      </span>
    </div>
  );
}
