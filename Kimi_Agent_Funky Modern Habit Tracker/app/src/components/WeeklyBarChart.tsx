import { motion } from 'framer-motion';
import { dayLabels } from '@/data/demoData';

interface WeeklyBarChartProps {
  data: number[];
  highlightIndex?: number;
  avgBadge?: string;
}

export function WeeklyBarChart({ data, highlightIndex = 6, avgBadge }: WeeklyBarChartProps) {
  return (
    <div className="relative">
      {/* Avg badge */}
      {avgBadge && (
        <motion.div
          className="absolute -top-1 right-0 z-10 px-3 py-1.5 rounded-full"
          style={{
            background: 'rgba(168,85,247,0.15)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(168,85,247,0.2)',
          }}
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 25 }}
        >
          <span className="text-[11px] font-mono font-semibold text-[#a855f7]">{avgBadge}</span>
        </motion.div>
      )}

      <div className="flex items-end justify-between gap-3 h-28 pt-4">
        {data.map((value, i) => {
          const isToday = i === highlightIndex;
          const gradientColors = [
            ['#a855f7', '#7c3aed'],
            ['#a855f7', '#9333ea'],
            ['#ec4899', '#db2777'],
            ['#ec4899', '#f43f5e'],
            ['#f97316', '#ea580c'],
            ['#06b6d4', '#0891b2'],
            ['#22c55e', '#16a34a'],
          ];
          const [c1, c2] = gradientColors[i] || ['#a855f7', '#ec4899'];

          return (
            <div key={i} className="flex flex-col items-center gap-2 flex-1">
              <div className="relative w-full flex items-end justify-center" style={{ height: 70 }}>
                {/* Track */}
                <div
                  className="absolute bottom-0 rounded-full"
                  style={{
                    width: isToday ? 6 : 4,
                    height: '100%',
                    background: 'rgba(255,255,255,0.04)',
                  }}
                />
                {/* Fill */}
                <motion.div
                  className="absolute bottom-0 rounded-full"
                  style={{
                    width: isToday ? 6 : 4,
                    background: `linear-gradient(180deg, ${c1}, ${c2})`,
                    boxShadow: `0 0 12px ${c1}40`,
                  }}
                  initial={{ height: 0 }}
                  animate={{ height: `${value}%` }}
                  transition={{
                    type: 'spring',
                    stiffness: 80,
                    damping: 15,
                    delay: i * 0.07,
                  }}
                />
              </div>
              <span
                className="text-[10px] font-medium"
                style={{
                  color: isToday ? '#ffffff' : 'rgba(255,255,255,0.25)',
                  fontWeight: isToday ? 700 : 500,
                }}
              >
                {dayLabels[i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
