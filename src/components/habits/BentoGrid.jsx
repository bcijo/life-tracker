import { motion } from 'framer-motion';
import { Flame, Trophy, Zap, CheckCircle2 } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, isToday, isFuture, getDay } from 'date-fns';

/**
 * BentoGrid — Gamified stats dashboard for the Habits page
 *
 * Stats:
 *  1. 🔥 On Fire       — longest CURRENT active streak across all habits
 *  2. 🗓️ Checkin Streak — consecutive days with at least one logged habit
 *  3. ⚡ This Week     — completed habit-days / expected habit-days this week
 *  4. ✅ Today         — habits done today / active today
 */
export function BentoGrid({ habits, calculateSuccessRate, calculateStreak, isTodayActive, getTodayStatus, getStatusForDate, calculateCheckinStreak }) {
  if (!habits || habits.length === 0) return null;

  // ── 1. ON FIRE: longest current streak across all habits ──────────────────
  const longestStreak = habits.reduce((max, h) => Math.max(max, calculateStreak(h)), 0);
  // Which habit has the longest streak (for sub-label)
  const onFireHabit = habits.reduce((best, h) => {
    const s = calculateStreak(h);
    return s > (best ? calculateStreak(best) : -1) ? h : best;
  }, null);

  // ── 2. CHECK-IN STREAK ───────────────────────────────────────────
  const checkinStreak = calculateCheckinStreak ? calculateCheckinStreak() : 0;

  // ── 3. THIS WEEK: completed / total expected habit-days ──────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: today }); // only up to today

  let weekCompleted = 0;
  let weekExpected = 0;
  for (const day of weekDays) {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dow = getDay(day);
    for (const habit of habits) {
      if ((habit.active_days || [0,1,2,3,4,5,6]).includes(dow)) {
        weekExpected++;
        if (getStatusForDate(habit, dateStr) === 'completed') weekCompleted++;
      }
    }
  }
  // Total expected for full week (for denominator display)
  const allWeekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
  let weekTotal = 0;
  for (const day of allWeekDays) {
    const dow = getDay(day);
    for (const habit of habits) {
      if ((habit.active_days || [0,1,2,3,4,5,6]).includes(dow)) weekTotal++;
    }
  }
  const weekPct = weekExpected > 0 ? Math.round((weekCompleted / weekExpected) * 100) : 0;

  // ── 4. TODAY ─────────────────────────────────────────────────────────────
  const activeTodayHabits = habits.filter((h) => isTodayActive(h));
  const completedToday = activeTodayHabits.filter((h) => getTodayStatus(h) === 'completed').length;
  const todayPct = activeTodayHabits.length > 0 ? Math.round((completedToday / activeTodayHabits.length) * 100) : 0;

  // ── Styles ────────────────────────────────────────────────────────────────
  const cardBase = {
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 24,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '20px 16px',
    position: 'relative',
    overflow: 'hidden',
  };

  return (
    <div style={{ padding: '0 0 20px' }}>
      {/* Top row — 2 large cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

        {/* ── CARD 1: ON FIRE (current streak) ── */}
        <motion.div
          className="gradient-border glow-pink"
          style={{ ...cardBase, minHeight: 150 }}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 25 }}
          whileTap={{ scale: 0.97 }}
        >
          {/* Flame icon with bounce */}
          <motion.div
            animate={longestStreak > 0 ? { y: [0, -4, 0], scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Flame
              size={26}
              color={longestStreak >= 7 ? '#f97316' : longestStreak >= 3 ? '#f59e0b' : '#64748b'}
              fill={longestStreak > 0 ? (longestStreak >= 7 ? 'rgba(249,115,22,0.25)' : 'rgba(245,158,11,0.2)') : 'none'}
            />
          </motion.div>

          <motion.span
            style={{
              fontSize: 42, fontWeight: 800, lineHeight: 1, marginTop: 6,
              fontFamily: "'JetBrains Mono', monospace",
              color: longestStreak >= 7 ? '#f97316' : longestStreak >= 3 ? '#f59e0b' : 'rgba(255,255,255,0.6)',
            }}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
          >
            {longestStreak}
          </motion.span>

          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, marginTop: 5, letterSpacing: '0.06em' }}>
            DAY STREAK
          </span>

          {/* Sub-label showing which habit */}
          {onFireHabit && longestStreak > 0 && (
            <span style={{
              fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 4,
              maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {onFireHabit.name}
            </span>
          )}

          {/* Badge for milestones */}
          {longestStreak >= 7 && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, type: 'spring' }}
              style={{
                position: 'absolute', top: 10, right: 10,
                fontSize: 8, fontWeight: 800, letterSpacing: '0.05em',
                padding: '2px 6px', borderRadius: 6,
                background: 'rgba(249,115,22,0.2)',
                color: '#f97316',
                border: '1px solid rgba(249,115,22,0.3)',
              }}
            >
              🔥 ON FIRE
            </motion.div>
          )}
        </motion.div>

        {/* ── CARD 2: CHECK-IN STREAK ── */}
        <motion.div
          className="gradient-border glow-purple"
          style={{ ...cardBase, minHeight: 150 }}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
          whileTap={{ scale: 0.97 }}
        >
          <motion.div
            initial={{ rotate: -10, scale: 0.5 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
          >
            <Trophy size={24} color={checkinStreak > 0 ? '#a855f7' : '#475569'} />
          </motion.div>

          <motion.span
            className={checkinStreak > 0 ? 'gradient-text-purple' : ''}
            style={{
              fontSize: 42, fontWeight: 800, lineHeight: 1, marginTop: 6,
              fontFamily: "'JetBrains Mono', monospace",
              color: checkinStreak === 0 ? 'rgba(255,255,255,0.35)' : undefined,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            {checkinStreak}
          </motion.span>

          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 600, marginTop: 5, letterSpacing: '0.06em' }}>
            CHECKIN STREAK
          </span>

          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 3 }}>
            consecutive days tracking
          </span>
        </motion.div>
      </div>

      {/* Bottom row — 2 smaller cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* ── CARD 3: THIS WEEK score ── */}
        <motion.div
          className="gradient-border glow-cyan"
          style={{ ...cardBase, padding: '16px 12px' }}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.25, type: 'spring', stiffness: 300, damping: 25 }}
          whileTap={{ scale: 0.97 }}
        >
          <Zap size={16} color="#06b6d4" style={{ marginBottom: 4 }} />

          {/* Ratio */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <motion.span
              className="gradient-text-cyan"
              style={{ fontSize: 28, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {weekCompleted}
            </motion.span>
            <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 18, fontFamily: 'monospace' }}>/{weekTotal}</span>
          </div>

          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>THIS WEEK</span>

          {/* Progress bar */}
          <div style={{ width: '100%', marginTop: 8, height: 4, borderRadius: 9999, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
            <motion.div
              style={{ height: '100%', borderRadius: 9999, background: 'linear-gradient(90deg, #06b6d4, #3b82f6)' }}
              initial={{ width: 0 }}
              animate={{ width: `${weekPct}%` }}
              transition={{ delay: 0.6, duration: 0.9, ease: 'easeOut' }}
            />
          </div>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>{weekPct}% complete</span>
        </motion.div>

        {/* ── CARD 4: TODAY ── */}
        <motion.div
          className="gradient-border glow-green"
          style={{ ...cardBase, padding: '16px 12px' }}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 25 }}
          whileTap={{ scale: 0.97 }}
        >
          <CheckCircle2 size={16} color="#22c55e" style={{ marginBottom: 4 }} />

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <motion.span
              style={{ fontSize: 28, fontWeight: 800, color: '#22c55e', fontFamily: "'JetBrains Mono', monospace" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55 }}
            >
              {completedToday}
            </motion.span>
            <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 18, fontFamily: 'monospace' }}>/{activeTodayHabits.length}</span>
          </div>

          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>TODAY</span>

          {/* Completion arc */}
          <div style={{ width: '100%', marginTop: 8, height: 4, borderRadius: 9999, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
            <motion.div
              style={{
                height: '100%', borderRadius: 9999,
                background: todayPct === 100
                  ? 'linear-gradient(90deg, #22c55e, #10b981)'
                  : 'linear-gradient(90deg, #22c55e80, #22c55e)',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${todayPct}%` }}
              transition={{ delay: 0.65, duration: 0.8, ease: 'easeOut' }}
            />
          </div>

          {/* Pulsing live dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <motion.div
              style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>
              {todayPct === 100 ? 'all done! 🎉' : 'live'}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
