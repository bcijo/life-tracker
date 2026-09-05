import { motion, useAnimation } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Flame, Play, PauseCircle, Zap, Check } from 'lucide-react';
import { AuraSpringToggle } from './AuraSpringToggle';
import { computeDuoStreak, getPartnerDailyStatus } from '../../utils/duoHabitGamification';

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
  pactInfo = null,
  onSendNudge = null,
}) {
  const [nudged, setNudged] = useState(false);
  const timeOfDay = habit.time_of_day || 'morning';
  const accentColor = habit.is_paused ? '#eab308' : (timeOfDay === 'morning' ? '#f59e0b' : '#a855f7');

  const glowControls = useAnimation();

  useEffect(() => {
    if (isCelebrating) {
      glowControls.start({
        opacity: [0, 0.55, 0.3, 0],
        scale: [1, 1.02, 1.01, 1],
        transition: { duration: 0.3, ease: 'easeOut' },
      });
    }
  }, [isCelebrating]);

  const duoStreak = pactInfo ? computeDuoStreak(pactInfo.pact, habit, pactInfo.partnerHabit) : 0;
  const partnerDaily = pactInfo ? getPartnerDailyStatus(pactInfo.partnerHabit, pactInfo.pact.active_days) : null;
  const partnerName = pactInfo?.partnerProfile?.display_name || pactInfo?.partnerProfile?.username || 'Partner';
  const partnerInitial = partnerName[0]?.toUpperCase() || 'P';

  const handleNudge = (e, type) => {
    e.stopPropagation();
    if (onSendNudge && pactInfo) {
      onSendNudge({
        pactId: pactInfo.pact.id,
        partnerId: pactInfo.partnerId,
        type,
        habitName: habit.name,
      });
      setNudged(true);
      setTimeout(() => setNudged(false), 2200);
    }
  };

  return (
    <motion.div
      style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, cursor: 'pointer' }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, scale: 0.96, transition: { duration: 0.2, ease: 'easeOut' } }}
      transition={{
        layout: { type: 'spring', stiffness: 500, damping: 32 },
        opacity: { duration: 0.2 },
        delay: 0.15 + index * 0.04
      }}
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
          : { borderColor: pactInfo ? 'rgba(6,182,212,0.2)' : 'var(--border-subtle, rgba(255,255,255,0.06))' }
        }
        transition={{ duration: 0.3 }}
        style={{
          borderRadius: 20,
          position: 'relative',
          border: pactInfo ? `1px solid rgba(6,182,212,0.25)` : `1px solid var(--border-subtle, rgba(255,255,255,0.06))`,
          background: 'var(--surface-elevated, rgba(255,255,255,0.04))',
          opacity: habit.is_paused ? 0.75 : 1,
        }}
      >
        {/* Left accent bar */}
        <div
          style={{
            position: 'absolute',
            left: 0, top: 12, bottom: 12,
            width: 3, borderRadius: 9999,
            background: habit.is_paused
              ? 'linear-gradient(180deg, #eab308, rgba(234,179,8,0.3))'
              : pactInfo
              ? 'linear-gradient(180deg, #06b6d4, #a855f7)'
              : `linear-gradient(180deg, ${accentColor}, ${accentColor}40)`,
          }}
        />

        <div style={{ padding: '12px 14px 12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            {/* Left Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Top line: Name + Streak / Paused badge + Duo Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                <h3 style={{
                  margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {habit.name}
                </h3>

                {streak > 0 && !habit.is_paused && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    fontSize: 10, fontWeight: 800, color: streak >= 5 ? '#f97316' : '#f59e0b',
                    background: streak >= 5 ? 'rgba(249,115,22,0.15)' : 'rgba(245,158,11,0.12)',
                    padding: '1px 6px', borderRadius: 9999, flexShrink: 0,
                  }}>
                    <Flame size={10} fill={streak >= 5 ? '#f97316' : '#f59e0b'} />
                    {streak}
                  </span>
                )}

                {/* Duo Streak Flame Pill */}
                {pactInfo && (
                  <span
                    title={`Duo Pact with ${partnerName} (${duoStreak} days mutual streak)`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      fontSize: 10, fontWeight: 800, color: '#06b6d4',
                      background: 'rgba(6,182,212,0.14)', border: '1px solid rgba(6,182,212,0.28)',
                      padding: '1px 6px', borderRadius: 9999, flexShrink: 0,
                    }}
                  >
                    🤝 {duoStreak > 0 ? `${duoStreak}d Duo` : 'Duo'}
                  </span>
                )}

                {habit.is_paused && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 9999,
                    background: 'rgba(234,179,8,0.18)', color: '#eab308',
                    display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0,
                  }}>
                    <PauseCircle size={10} /> Paused
                  </span>
                )}
              </div>

              {/* Bottom line: Time icon + Success % + Inline Weekly 7-Dots + Partner Status Pill */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', gap: 3,
                }}>
                  <span>{timeOfDay === 'morning' ? '☀️' : '🌙'}</span>
                  {habit.is_paused
                    ? `Paused`
                    : successRate !== null ? `${successRate}%` : `${streak}d streak`
                  }
                </span>

                <span style={{ color: 'var(--border-subtle, rgba(255,255,255,0.15))', fontSize: 10 }}>·</span>

                {/* Inline 7-day dots */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {weeklyStatus.map((dayStatus, i) => {
                    const isActive = dayStatus.isActive;
                    const s = dayStatus.status;
                    let bg = 'var(--border-subtle, rgba(255,255,255,0.08))';
                    if (s === 'completed') bg = '#22c55e';
                    else if (s === 'failed') bg = '#ef4444';
                    else if (!isActive) bg = 'transparent';

                    return (
                      <div
                        key={i}
                        style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: bg,
                          border: !isActive ? '1px dashed var(--border-subtle, rgba(255,255,255,0.15))' : 'none',
                          opacity: dayStatus.isFuture ? 0.25 : 1,
                        }}
                      />
                    );
                  })}
                </div>

                {/* Partner Accountability Live Status Pill */}
                {pactInfo && partnerDaily && (
                  <>
                    <span style={{ color: 'var(--border-subtle, rgba(255,255,255,0.15))', fontSize: 10 }}>·</span>
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '1px 6px 1px 3px',
                        borderRadius: 9999,
                        background: partnerDaily.status === 'completed'
                          ? 'rgba(34,197,94,0.12)'
                          : 'rgba(245,158,11,0.12)',
                        border: `1px solid ${partnerDaily.status === 'completed' ? 'rgba(34,197,94,0.25)' : 'rgba(245,158,11,0.25)'}`,
                      }}
                      title={`${partnerName}: ${partnerDaily.label} today`}
                    >
                      <div style={{
                        width: 14, height: 14, borderRadius: '50%',
                        background: partnerDaily.status === 'completed' ? '#22c55e' : '#f59e0b',
                        color: '#000', fontSize: 8.5, fontWeight: 900,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {partnerInitial}
                      </div>
                      <span style={{
                        fontSize: 9, fontWeight: 700,
                        color: partnerDaily.status === 'completed' ? '#22c55e' : '#f59e0b'
                      }}>
                        {partnerDaily.status === 'completed' ? 'Done' : 'Pending'}
                      </span>

                      {/* Quick Nudge / High-Five Action */}
                      {partnerDaily.status === 'pending' ? (
                        <button
                          onClick={(e) => handleNudge(e, 'nudge')}
                          disabled={nudged}
                          title={`Nudge ${partnerName} to complete!`}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '0 2px', display: 'flex', alignItems: 'center',
                            color: nudged ? '#22c55e' : '#f59e0b',
                          }}
                        >
                          {nudged ? <Check size={10} strokeWidth={3} /> : <Zap size={10} fill="#f59e0b" />}
                        </button>
                      ) : partnerDaily.status === 'completed' ? (
                        <button
                          onClick={(e) => handleNudge(e, 'high_five')}
                          disabled={nudged}
                          title={`High five ${partnerName}!`}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '0 2px', fontSize: 9.5, lineHeight: 1
                          }}
                        >
                          {nudged ? '🎉' : '✋'}
                        </button>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {habit.is_paused ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onTogglePause) onTogglePause(habit.id);
                  }}
                  style={{
                    padding: '5px 10px', borderRadius: 9999,
                    background: 'rgba(234,179,8,0.15)',
                    border: '1px solid rgba(234,179,8,0.3)',
                    color: '#eab308', fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <Play size={11} fill="#eab308" /> Resume
                </button>
              ) : isActiveToday ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <AuraSpringToggle status={todayStatus} onToggle={(newStatus) => onToggle(habit.id, newStatus)} />
                </div>
              ) : (
                <div style={{
                  padding: '4px 9px', borderRadius: 9999,
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
        </div>
      </motion.div>
    </motion.div>
  );
}
