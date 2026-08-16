import { motion, useAnimation } from 'framer-motion';
import { useEffect } from 'react';
import { Flame, Play, PauseCircle } from 'lucide-react';
import { AuraSpringToggle } from './AuraSpringToggle';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

export function HabitCard({
  habit,
  index,
  todayStatus,
  streak,
  successRate,
  weeklyStatus,
  isActiveToday,
  getStatusForDate,
  onToggle,
  onSelectHabit,
  onTogglePause,
  isCelebrating = false,
}) {
  const timeOfDay = habit.time_of_day || 'morning';
  const accentColor = habit.is_paused ? '#eab308' : (timeOfDay === 'morning' ? '#f59e0b' : '#a855f7');

  const glowControls = useAnimation();

  useEffect(() => {
    if (isCelebrating) {
      glowControls.start({
        opacity: [0, 0.55, 0.3, 0],
        scale: [1, 1.025, 1.01, 1],
        transition: { duration: 0.85, ease: 'easeOut' },
      });
    }
  }, [isCelebrating]);

  return (
    <motion.div
      layoutId={`habit-${habit.id}`}
      style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, cursor: 'pointer' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16, scale: 0.96, transition: { duration: 0.35, ease: 'easeIn' } }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.35 + index * 0.08 }}
      whileTap={{ scale: 0.985 }}
      onClick={() => onSelectHabit(habit.id)}
      layout
    >
      {/* Green celebration flash overlay */}
      <motion.div
        animate={glowControls}
        initial={{ opacity: 0, scale: 1 }}
        style={{
          position: 'absolute', inset: 0, borderRadius: 20,
          background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.45) 0%, rgba(34,197,94,0.15) 100%)',
          zIndex: 20, pointerEvents: 'none',
        }}
      />

      {/* Glass card */}
      <motion.div
        className="habit-glass-card"
        animate={isCelebrating
          ? { borderColor: ['var(--border-subtle, rgba(255,255,255,0.06))', 'rgba(34,197,94,0.7)', 'var(--border-subtle, rgba(255,255,255,0.06))'] }
          : { borderColor: 'var(--border-subtle, rgba(255,255,255,0.06))' }
        }
        transition={{ duration: 0.8 }}
        style={{
          borderRadius: 20,
          position: 'relative',
          border: `1px solid var(--border-subtle, rgba(255,255,255,0.06))`,
          background: 'var(--surface-elevated, rgba(255,255,255,0.04))',
          opacity: habit.is_paused ? 0.75 : 1,
        }}
      >
        {/* Left accent bar */}
        <div
          style={{
            position: 'absolute',
            left: 0, top: 16, bottom: 16,
            width: 3, borderRadius: 9999,
            background: habit.is_paused
              ? 'linear-gradient(180deg, #eab308, rgba(234,179,8,0.3))'
              : `linear-gradient(180deg, ${accentColor}, ${accentColor}40)`,
          }}
        />

        <div style={{ padding: '16px 16px 16px 20px' }}>
          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {/* Left info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Category pill + streak */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 9999,
                    background: `${accentColor}18`, color: accentColor,
                  }}
                >
                  {timeOfDay === 'morning' ? '☀️ Morning' : '🌙 Evening'}
                </span>

                {habit.is_paused && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 9999, background: 'rgba(234,179,8,0.18)', color: '#eab308', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <PauseCircle size={10} /> Paused
                  </span>
                )}

                {streak >= 3 && !habit.is_paused && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 10, fontWeight: 600, color: '#f59e0b' }}>
                    <Flame size={10} />
                    {streak}
                  </span>
                )}
              </div>

              {/* Habit name */}
              <h3 style={{
                margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {habit.name}
              </h3>

              {/* Success rate */}
              <span style={{
                fontSize: 10, color: 'var(--text-muted)',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {habit.is_paused
                  ? `Streak protected · ${streak} d`
                  : successRate !== null ? `${successRate}% success · ${streak} day streak` : `${streak} day streak`
                }
              </span>
            </div>

            {/* Right controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {habit.is_paused ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onTogglePause) onTogglePause(habit.id);
                  }}
                  style={{
                    padding: '6px 12px', borderRadius: 9999,
                    background: 'rgba(234,179,8,0.15)',
                    border: '1px solid rgba(234,179,8,0.3)',
                    color: '#eab308', fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <Play size={12} fill="#eab308" /> Resume
                </button>
              ) : isActiveToday ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <AuraSpringToggle status={todayStatus} onToggle={(newStatus) => onToggle(habit.id, newStatus)} />
                </div>
              ) : (
                <div style={{
                  width: 52, height: 30, borderRadius: 9999,
                  background: 'var(--surface-input, rgba(255,255,255,0.03))',
                  border: '1px dashed var(--border-subtle, rgba(255,255,255,0.1))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, color: 'var(--text-muted)',
                }}>
                  rest
                </div>
              )}
            </div>
          </div>

          {/* Weekly dot tracker */}
          <div
            style={{
              marginTop: 14, paddingTop: 12,
              borderTop: '1px solid var(--border-subtle, rgba(255,255,255,0.04))',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {weeklyStatus.map((dayStatus, i) => {
              const isActive = dayStatus.isActive;
              const s = dayStatus.status;
              let bg = 'var(--border-subtle, rgba(255,255,255,0.06))';
              if (s === 'completed') bg = '#22c55e';
              else if (s === 'failed') bg = '#ef4444';
              else if (!isActive) bg = 'transparent';

              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'center', width: 8 }}>
                  <motion.div
                    style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: bg,
                      border: !isActive ? '1px dashed var(--border-subtle, rgba(255,255,255,0.1))' : 'none',
                      opacity: dayStatus.isFuture ? 0.3 : 1
                    }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.04, type: 'spring' }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
