import { motion } from 'framer-motion';
import { Sparkles, Trophy, Zap, CheckCircle2, Target } from 'lucide-react';
import { startOfWeek, endOfWeek, eachDayOfInterval, getDay, subDays } from 'date-fns';
import { getLocalDateStr } from '../../hooks/useHabits';

/**
 * BentoGrid — Gamified stats dashboard for the Habits page
 *
 * Stats:
 *  1. 🌟 Perfect Days    — total days where 100% of scheduled active habits were done
 *  2. 🗓️ Checkin Streak  — consecutive days with at least one logged habit
 *  3. ✅ Today's Focus   — hero progress ring + dynamic motivation status
 *  4. ⚡ This Week & 30d — weekly pace & consistency
 */
export function BentoGrid({ habits, isTodayActive, getTodayStatus, getStatusForDate, calculateCheckinStreak }) {
  if (!habits || habits.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activeHabits = habits.filter(h => !h.is_paused);

  // ── 1. PERFECT DAYS: Days with 100% completion of scheduled habits ──────────
  const calculatePerfectDays = () => {
    const globalTrackingStart = typeof window !== 'undefined' ? localStorage.getItem('life_tracker_tracking_start') : null;
    let count = 0;
    // Look back up to 365 days
    for (let i = 0; i <= 365; i++) {
      const date = subDays(today, i);
      const dateStr = getLocalDateStr(date);
      if (globalTrackingStart && dateStr < globalTrackingStart) break;

      const dow = getDay(date);
      const scheduledOnDay = activeHabits.filter(h => (h.active_days || [0, 1, 2, 3, 4, 5, 6]).includes(dow));
      if (scheduledOnDay.length === 0) continue;

      const allDone = scheduledOnDay.every(h => getStatusForDate(h, dateStr) === 'completed');
      if (allDone) {
        count++;
      }
    }
    return count;
  };
  const perfectDays = calculatePerfectDays();

  // ── 2. CHECK-IN STREAK ───────────────────────────────────────────────────
  const checkinStreak = calculateCheckinStreak ? calculateCheckinStreak() : 0;

  // ── 3. TODAY'S PROGRESS ──────────────────────────────────────────────────
  const activeTodayHabits = habits.filter((h) => !h.is_paused && isTodayActive(h));
  const completedToday = activeTodayHabits.filter((h) => getTodayStatus(h) === 'completed').length;
  const todayPct = activeTodayHabits.length > 0 ? Math.round((completedToday / activeTodayHabits.length) * 100) : 0;
  const remainingToday = activeTodayHabits.length - completedToday;

  // ── 4. THIS WEEK ─────────────────────────────────────────────────────────
  const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: today }); // up to today

  let weekCompleted = 0;
  let weekExpected = 0;
  for (const day of weekDays) {
    const dateStr = getLocalDateStr(day);
    const dow = getDay(day);
    for (const habit of activeHabits) {
      if ((habit.active_days || [0, 1, 2, 3, 4, 5, 6]).includes(dow)) {
        weekExpected++;
        if (getStatusForDate(habit, dateStr) === 'completed') weekCompleted++;
      }
    }
  }
  const weekPct = weekExpected > 0 ? Math.round((weekCompleted / weekExpected) * 100) : 0;

  // ── Card Styles ──────────────────────────────────────────────────────────
  const cardBase = {
    background: 'var(--surface-elevated, rgba(255,255,255,0.04))',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
    borderRadius: 22,
    position: 'relative',
    overflow: 'hidden',
  };

  const progressColor = todayPct === 100 ? '#22c55e' : todayPct >= 50 ? '#38bdf8' : '#a855f7';

  return (
    <div style={{ padding: '0 0 16px' }}>
      {/* Asymmetric Bento Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 10 }}>

        {/* ── HERO CARD: TODAY'S LIVE FOCUS ── */}
        <motion.div
          className="gradient-border glow-purple"
          style={{
            ...cardBase,
            gridColumn: 'span 2',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            minHeight: 105,
          }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 25 }}
        >
          {/* Left info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '2px 8px', borderRadius: 9999,
                background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.25)',
              }}>
                <motion.div
                  style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }}
                  animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                />
                <span style={{ fontSize: 9, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Today's Progress
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 2 }}>
              <span style={{
                fontSize: 28, fontWeight: 800, color: 'var(--text-primary, #fff)',
                fontFamily: "'JetBrains Mono', monospace", lineHeight: 1,
              }}>
                {completedToday}
              </span>
              <span style={{ fontSize: 16, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                /{activeTodayHabits.length}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: progressColor, marginLeft: 6, fontFamily: 'monospace' }}>
                ({todayPct}%)
              </span>
            </div>

            <p style={{
              margin: '4px 0 0', fontSize: 11, color: 'var(--text-secondary, rgba(255,255,255,0.7))',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {todayPct === 100
                ? '🎉 All habits completed today!'
                : remainingToday > 0
                ? `${remainingToday} habit${remainingToday > 1 ? 's' : ''} left to crush`
                : 'No habits scheduled for today'}
            </p>
          </div>

          {/* Right Circular Gauge */}
          <div style={{
            position: 'relative', width: 68, height: 68, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="68" height="68" viewBox="0 0 68 68" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="34" cy="34" r="28"
                fill="none"
                stroke="var(--surface-input, rgba(255,255,255,0.06))"
                strokeWidth="6"
              />
              <motion.circle
                cx="34" cy="34" r="28"
                fill="none"
                stroke={progressColor}
                strokeWidth="6"
                strokeDasharray={175.9}
                strokeDashoffset={175.9 - (175.9 * todayPct) / 100}
                strokeLinecap="round"
                initial={{ strokeDashoffset: 175.9 }}
                animate={{ strokeDashoffset: 175.9 - (175.9 * todayPct) / 100 }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
              />
            </svg>
            <div style={{
              position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle2 size={20} color={progressColor} />
            </div>
          </div>
        </motion.div>

        {/* ── CARD 1: PERFECT DAYS ── */}
        <motion.div
          className="gradient-border glow-pink"
          style={{
            ...cardBase,
            padding: '14px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 110,
          }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, type: 'spring', stiffness: 300, damping: 25 }}
          whileTap={{ scale: 0.98 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Perfect Days
            </span>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={14} color="#f59e0b" />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{
                fontSize: 30, fontWeight: 800, lineHeight: 1,
                fontFamily: "'JetBrains Mono', monospace",
                color: perfectDays > 0 ? '#f59e0b' : 'var(--text-primary)',
              }}>
                {perfectDays}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>days</span>
            </div>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
              100% habits completed
            </span>
          </div>
        </motion.div>

        {/* ── CARD 2: CHECK-IN STREAK ── */}
        <motion.div
          className="gradient-border glow-purple"
          style={{
            ...cardBase,
            padding: '14px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 110,
          }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, type: 'spring', stiffness: 300, damping: 25 }}
          whileTap={{ scale: 0.98 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Check-in Streak
            </span>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Trophy size={14} color="#a855f7" />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{
                fontSize: 30, fontWeight: 800, lineHeight: 1,
                fontFamily: "'JetBrains Mono', monospace",
                color: checkinStreak > 0 ? '#a855f7' : 'var(--text-muted)',
              }}>
                {checkinStreak}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>days</span>
            </div>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
              consecutive tracking
            </span>
          </div>
        </motion.div>
      </div>

      {/* Sleek bottom pace strip (This Week) */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px', borderRadius: 14,
        background: 'var(--surface-input, rgba(255,255,255,0.02))',
        border: '1px solid var(--border-subtle, rgba(255,255,255,0.04))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Zap size={13} color="#06b6d4" />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>This Week</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary, #fff)', fontFamily: 'monospace' }}>
            {weekCompleted}/{weekExpected}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: 140 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 9999, background: 'var(--surface-input, rgba(255,255,255,0.06))', overflow: 'hidden' }}>
            <motion.div
              style={{ height: '100%', borderRadius: 9999, background: 'linear-gradient(90deg, #06b6d4, #3b82f6)' }}
              initial={{ width: 0 }}
              animate={{ width: `${weekPct}%` }}
              transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#06b6d4', fontFamily: 'monospace', minWidth: 28, textAlign: 'right' }}>
            {weekPct}%
          </span>
        </div>
      </div>
    </div>
  );
}

