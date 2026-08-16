import { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * AuraSpringToggle
 * status: 'completed' | 'failed' | null
 * onToggle: (status) => void
 */
export function AuraSpringToggle({ status, onToggle }) {
  const [isDragging, setIsDragging] = useState(false);

  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  const handleDragEnd = (_, info) => {
    setIsDragging(false);
    if (info.offset.x > 12) {
      onToggle('completed');
    } else if (info.offset.x < -12) {
      onToggle('failed');
    }
  };

  const handleClick = () => {
    // If neutral (null) -> completed
    // If completed -> uncheck to null
    // If failed -> completed
    if (isCompleted) {
      onToggle(null);
    } else {
      onToggle('completed');
    }
  };

  const bgColor = isCompleted
    ? 'linear-gradient(135deg, #22c55e, #10b981)'
    : isFailed
    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
    : 'var(--surface-input, rgba(255,255,255,0.08))';

  const knobColor = isCompleted ? '#ffffff' : isFailed ? '#ffffff' : 'var(--text-muted, rgba(255,255,255,0.25))';

  return (
    <motion.div
      onClick={handleClick}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        borderRadius: 9999,
        cursor: 'pointer',
        width: 52,
        height: 30,
        background: bgColor,
        border: isCompleted || isFailed ? 'none' : '1px solid var(--border-subtle, rgba(255,255,255,0.12))',
        padding: 3,
        flexShrink: 0,
      }}
      animate={{ scale: isDragging ? 0.93 : 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      title={isCompleted ? 'Completed (Tap to undo)' : isFailed ? 'Failed (Tap to mark done)' : 'Tap to complete (or drag left for failed)'}
    >
      {/* Glow when completed */}
      {isCompleted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 9999,
            background: 'linear-gradient(135deg, #22c55e, #10b981)',
            filter: 'blur(8px)',
            opacity: 0.4,
            zIndex: -1,
          }}
        />
      )}
      {/* Glow when failed */}
      {isFailed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 9999,
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            filter: 'blur(8px)',
            opacity: 0.35,
            zIndex: -1,
          }}
        />
      )}

      {/* Knob */}
      <motion.div
        style={{
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          background: knobColor,
          boxShadow: isCompleted
            ? '0 2px 8px rgba(34,197,94,0.4)'
            : isFailed
            ? '0 2px 8px rgba(239,68,68,0.4)'
            : '0 1px 4px rgba(0,0,0,0.15)',
          touchAction: 'pan-y',
        }}
        drag="x"
        dragConstraints={{ left: -10, right: 22 }}
        dragElastic={0.15}
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        animate={{ x: isCompleted ? 22 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        {/* Checkmark */}
        <motion.svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          initial={false}
          animate={{ opacity: isCompleted ? 1 : 0, scale: isCompleted ? 1 : 0.5 }}
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
            animate={{ pathLength: isCompleted ? 1 : 0 }}
            transition={{ duration: 0.25, delay: 0.05 }}
          />
        </motion.svg>

        {/* X mark */}
        {isFailed && (
          <motion.svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <path
              d="M1 1L9 9M9 1L1 9"
              stroke="#fff"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </motion.svg>
        )}
      </motion.div>
    </motion.div>
  );
}
