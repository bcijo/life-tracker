import { motion } from 'framer-motion';

interface CircularProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  label?: string;
  sublabel?: string;
  gradient?: string;
}

export function CircularProgressRing({
  percentage,
  size = 200,
  strokeWidth = 8,
  showPercentage = true,
  label,
  sublabel,
  gradient = 'grad-primary',
}: CircularProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percentage / 100) * circumference;

  const gradientId = `grad-${Math.random().toString(36).slice(2, 9)}`;

  const gradColors: Record<string, [string, string]> = {
    'grad-primary': ['#a855f7', '#ec4899'],
    'grad-cyan': ['#06b6d4', '#3b82f6'],
    'grad-green': ['#22c55e', '#10b981'],
  };

  const [c1, c2] = gradColors[gradient] || gradColors['grad-primary'];

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Glow */}
      <div
        className="absolute rounded-full"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle, ${c1}20 0%, transparent 70%)`,
          filter: 'blur(20px)',
        }}
      />
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{
            type: 'spring',
            stiffness: 50,
            damping: 15,
            duration: 2,
          }}
        />
      </svg>
      {/* Center content */}
      {showPercentage && (
        <div className="absolute flex flex-col items-center justify-center">
          <span
            className="font-mono font-bold gradient-text"
            style={{ fontSize: size * 0.22, lineHeight: 1.1 }}
          >
            {percentage}%
          </span>
          {label && (
            <span
              className="text-white/40 mt-1 font-medium"
              style={{ fontSize: size * 0.065, letterSpacing: '0.02em' }}
            >
              {label}
            </span>
          )}
          {sublabel && (
            <span
              className="text-white/25 mt-0.5"
              style={{ fontSize: size * 0.05 }}
            >
              {sublabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
