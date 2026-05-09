import { useState } from 'react';
import { motion } from 'framer-motion';
import type { PanInfo } from 'framer-motion';

interface AuraSpringToggleProps {
  completed: boolean;
  onToggle: () => void;
}

export function AuraSpringToggle({ completed, onToggle }: AuraSpringToggleProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    setIsDragging(false);
    if (info.offset.x > 12 && !completed) {
      onToggle();
    } else if (info.offset.x < -12 && completed) {
      onToggle();
    }
  };

  return (
    <motion.div
      className="relative flex items-center rounded-full cursor-pointer"
      style={{
        width: 52,
        height: 30,
        background: completed
          ? 'linear-gradient(135deg, #22c55e, #10b981)'
          : 'rgba(255,255,255,0.08)',
        border: completed ? 'none' : '1px solid rgba(255,255,255,0.12)',
        padding: 3,
      }}
      animate={{
        scale: isDragging ? 0.93 : 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30,
      }}
    >
      {/* Glow when completed */}
      {completed && (
        <motion.div
          className="absolute inset-0 rounded-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            background: 'linear-gradient(135deg, #22c55e, #10b981)',
            filter: 'blur(8px)',
            opacity: 0.4,
            zIndex: -1,
          }}
        />
      )}

      <motion.div
        className="rounded-full flex items-center justify-center"
        style={{
          width: 24,
          height: 24,
          background: completed ? '#ffffff' : 'rgba(255,255,255,0.15)',
          boxShadow: completed
            ? '0 2px 8px rgba(34,197,94,0.4)'
            : '0 1px 4px rgba(0,0,0,0.2)',
          touchAction: 'pan-y',
        }}
        drag="x"
        dragConstraints={{ left: 0, right: 22 }}
        dragElastic={0.15}
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        animate={{
          x: completed ? 22 : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
        }}
      >
        {/* Checkmark that appears when completed */}
        <motion.svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          initial={false}
          animate={{
            opacity: completed ? 1 : 0,
            scale: completed ? 1 : 0.5,
          }}
          transition={{ duration: 0.2 }}
        >
          <motion.path
            d="M2 6L5 9L10 3"
            stroke="#22c55e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: completed ? 1 : 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
          />
        </motion.svg>
      </motion.div>
    </motion.div>
  );
}
