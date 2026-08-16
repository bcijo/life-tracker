import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Flame, Trash2, Edit2, ChevronLeft, X, Check, Trophy, Target, TrendingUp, PauseCircle, Play } from 'lucide-react';
import { AuraSpringToggle } from './AuraSpringToggle';
import { format, subMonths, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isFuture, isToday, subDays } from 'date-fns';
import { parseLocalDate, getLocalDateStr } from '../../hooks/useHabits';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function computeBestStreak(habit) {
  if (!habit || !habit.history || habit.history.length === 0) return 0;
  const activeDays = habit.active_days || ALL_DAYS;
  const globalTrackingStart = localStorage.getItem('life_tracker_tracking_start');
  const startDateStr = globalTrackingStart || habit.tracking_start_date;

  const normalized = habit.history.map(h =>
    typeof h === 'string' ? { date: h.split('T')[0], status: 'completed' } : h
  );
  const completed = new Set(normalized.filter(h => h.status === 'completed').map(h => h.date));
  let best = 0, current = 0;
  
  for (let i = 365; i >= 0; i--) {
    const d = subDays(new Date(), i);
    const dateStr = getLocalDateStr(d);
    if (startDateStr && dateStr < startDateStr) continue;
    if (!activeDays.includes(d.getDay())) continue;
    
    if (completed.has(dateStr)) {
      current++;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

function computeTotalCompleted(habit) {
  if (!habit || !habit.history) return 0;
  return habit.history.filter(h =>
    (typeof h === 'string') || h.status === 'completed'
  ).length;
}

export function HabitDetailModal({
  habit,
  todayStatus,
  selectedDate,
  streak,
  successRate,
  isActiveToday,
  getStatusForDate,
  onToggle,
  onDelete,
  onSaveEditDays,
  onTimeOfDayChange,
  onCalendarClick,
  onTogglePause,
  onClose,
}) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [editingDays, setEditingDays] = useState(false);
  const [editDays, setEditDays] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Listen to window resize for responsive mode
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock body scroll while modal is open
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow || 'unset';
    };
  }, []);

  // Listen to Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!habit) return null;

  const timeOfDay = habit.time_of_day || 'morning';
  const accentColor = timeOfDay === 'morning' ? '#f59e0b' : '#a855f7';
  const activeDays = habit.active_days || ALL_DAYS;
  const bestStreak = computeBestStreak(habit);
  const totalCompleted = computeTotalCompleted(habit);

  const isSelectedToday = !selectedDate || selectedDate === getLocalDateStr(new Date());
  const dateLabel = isSelectedToday ? 'Today' : format(parseLocalDate(selectedDate), 'MMM d');

  const toggleEditDay = (day) =>
    setEditDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort((a, b) => a - b));

  const handleSaveEditDays = async () => {
    if (editDays.length === 0) return;
    await onSaveEditDays(habit.id, editDays);
    setEditingDays(false);
    setEditDays([]);
  };

  const handleDelete = async () => {
    if (window.confirm(`Delete "${habit.name}"? All history will be lost.`)) {
      await onDelete(habit.id);
      onClose();
    }
  };

  const handleTimeToggle = async () => {
    await onTimeOfDayChange(habit.id, timeOfDay === 'morning' ? 'evening' : 'morning');
  };

  const monthStart = startOfMonth(calendarMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: endOfMonth(calendarMonth) });

  const dayStyle = (status, isCurrentDay, isFutureDay, isActive) => {
    let bg = 'var(--surface-input, rgba(255,255,255,0.04))', color = 'var(--text-secondary, rgba(255,255,255,0.6))';
    let borderStyle = isCurrentDay ? `1.5px solid ${accentColor}` : (!isActive ? '1px dashed var(--border-subtle, rgba(255,255,255,0.1))' : '1px solid transparent');

    if (!isActive || isFutureDay) {
      bg = 'transparent';
      color = 'var(--text-muted, rgba(255,255,255,0.2))';
    } else if (status === 'completed') {
      bg = 'rgba(34, 197, 94, 0.18)';
      color = '#22c55e';
      borderStyle = isCurrentDay ? '1.5px solid #22c55e' : '1px solid rgba(34, 197, 94, 0.35)';
    } else if (status === 'failed') {
      bg = 'rgba(239, 68, 68, 0.16)';
      color = '#ef4444';
      borderStyle = isCurrentDay ? '1.5px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.3)';
    }

    return {
      aspectRatio: '1',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      fontSize: isMobile ? 12 : 13,
      background: bg,
      color,
      fontWeight: isCurrentDay ? '700' : '600',
      border: borderStyle,
      cursor: isFutureDay || !isActive ? 'default' : 'pointer',
      transition: 'all 0.15s',
      position: 'relative',
      padding: '2px 0',
    };
  };

  const statCard = (icon, value, label, color) => (
    <div style={{
      background: 'var(--surface-elevated, rgba(255,255,255,0.03))',
      borderRadius: 14,
      padding: isMobile ? '10px 4px' : '14px 10px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
      border: '1px solid var(--border-subtle, rgba(255,255,255,0.05))',
    }}>
      <div style={{ color }}>{icon}</div>
      <span style={{ fontSize: isMobile ? 17 : 20, fontWeight: 800, color: 'var(--text-primary, #fff)', fontFamily: 'monospace', lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 9, color: 'var(--text-muted, rgba(255,255,255,0.4))', textAlign: 'center', letterSpacing: '0.04em', fontWeight: 600 }}>{label}</span>
    </div>
  );

  const modalBodyContent = (
    <>
      {/* ── 4-STAT GRID ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: isMobile ? 6 : 8, marginBottom: 16 }}
      >
        {statCard(<Flame size={isMobile ? 15 : 18} />, streak, 'STREAK', '#f59e0b')}
        {statCard(<Trophy size={isMobile ? 15 : 18} />, bestStreak, 'BEST', '#a855f7')}
        {statCard(<Target size={isMobile ? 15 : 18} />, `${successRate ?? 0}%`, 'SUCCESS', '#22c55e')}
        {statCard(<TrendingUp size={isMobile ? 15 : 18} />, totalCompleted, 'TOTAL', '#38bdf8')}
      </motion.div>

      {/* ── CALENDAR ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{
          padding: isMobile ? 12 : 16,
          borderRadius: 18,
          background: 'var(--surface-elevated, rgba(255,255,255,0.03))',
          border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <button onClick={() => setCalendarMonth(m => subMonths(m, 1))}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 18, cursor: 'pointer', padding: '4px 8px' }}>←</button>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary, #fff)' }}>{format(calendarMonth, 'MMMM yyyy')}</span>
          <button onClick={() => setCalendarMonth(m => addMonths(m, 1))}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 18, cursor: 'pointer', padding: '4px 8px' }}>→</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {Array.from({ length: monthStart.getDay() }).map((_, i) => <div key={`e${i}`} />)}
          {daysInMonth.map(day => {
            const dateStr = getLocalDateStr(day);
            const status = getStatusForDate(habit, dateStr);
            const isCurrentDay = isToday(day);
            const isFutureDay = isFuture(day);
            const isActive = activeDays.includes(day.getDay());
            const hasStatus = status === 'completed' || status === 'failed';

            return (
              <motion.div key={dateStr} whileTap={{ scale: 0.88 }}
                onClick={() => !isFutureDay && isActive && onCalendarClick(habit.id, dateStr)}
                style={dayStyle(status, isCurrentDay, isFutureDay, isActive)}
                title={`${dateStr}: ${status || 'neutral'} (tap to cycle)`}
              >
                {hasStatus ? (
                  <>
                    <span style={{
                      position: 'absolute',
                      top: 2,
                      left: 3,
                      fontSize: 8,
                      fontWeight: 700,
                      color: 'var(--text-muted, rgba(255,255,255,0.45))',
                      lineHeight: 1,
                    }}>
                      {format(day, 'd')}
                    </span>
                    {status === 'completed' && (
                      <Check
                        size={isMobile ? 18 : 20}
                        strokeWidth={3.2}
                        color="#22c55e"
                        style={{ marginTop: 2, filter: 'drop-shadow(0 0 4px rgba(34,197,94,0.4))' }}
                      />
                    )}
                    {status === 'failed' && (
                      <X
                        size={isMobile ? 16 : 18}
                        strokeWidth={3.2}
                        color="#ef4444"
                        style={{ marginTop: 2, filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.4))' }}
                      />
                    )}
                  </>
                ) : (
                  <span style={{ fontSize: isMobile ? 12 : 13, fontWeight: isCurrentDay ? 800 : 600 }}>
                    {format(day, 'd')}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── SETTINGS ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 2px' }}>Settings</p>

        {/* Time toggle */}
        <button onClick={handleTimeToggle} style={rowBtn}>
          <span style={iconBox}>{timeOfDay === 'morning' ? '🌙' : '☀️'}</span>
          Switch to {timeOfDay === 'morning' ? 'Evening' : 'Morning'}
        </button>

        {/* Pause / Resume Habit toggle */}
        <button
          onClick={async () => {
            if (onTogglePause) await onTogglePause(habit.id);
          }}
          style={{
            ...rowBtn,
            background: habit.is_paused ? 'rgba(234,179,8,0.12)' : 'var(--surface-elevated, rgba(255,255,255,0.03))',
            border: habit.is_paused ? '1px solid rgba(234,179,8,0.3)' : '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
            color: habit.is_paused ? '#eab308' : 'var(--text-primary, #fff)',
          }}
        >
          <span style={{ ...iconBox, background: habit.is_paused ? 'rgba(234,179,8,0.2)' : 'var(--surface-input, rgba(255,255,255,0.06))' }}>
            {habit.is_paused ? <Play size={15} color="#eab308" /> : <PauseCircle size={15} color="var(--text-secondary)" />}
          </span>
          {habit.is_paused ? 'Resume Habit (Active)' : 'Pause Habit (Freeze Streak)'}
        </button>

        {/* Edit active days */}
        {!editingDays ? (
          <button onClick={() => { setEditDays(activeDays); setEditingDays(true); }} style={rowBtn}>
            <span style={iconBox}><Edit2 size={15} color="var(--text-secondary)" /></span>
            Edit Active Days
          </button>
        ) : (
          <div style={{ padding: 14, borderRadius: 16, background: 'var(--surface-elevated, rgba(255,255,255,0.03))', border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))' }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>Tap days to toggle:</p>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
              {DAY_LABELS.map((label, idx) => (
                <button key={idx} onClick={() => toggleEditDay(idx)} style={{
                  width: 36, height: 36, borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                  background: editDays.includes(idx) ? `${accentColor}22` : 'var(--surface-input, rgba(255,255,255,0.04))',
                  border: editDays.includes(idx) ? `1.5px solid ${accentColor}` : '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                  color: editDays.includes(idx) ? accentColor : 'var(--text-muted)',
                }}>{label.charAt(0)}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setEditingDays(false); setEditDays([]); }}
                style={{ padding: '7px 12px', borderRadius: 8, background: 'var(--surface-input, rgba(255,255,255,0.06))', color: 'var(--text-primary)', border: 'none', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveEditDays}
                style={{ padding: '7px 12px', borderRadius: 8, background: accentColor, color: '#000', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        )}

        <p style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '8px 0 2px' }}>Danger Zone</p>

        <button onClick={handleDelete} style={{ ...rowBtn, color: '#f87171', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <span style={{ ...iconBox, background: 'rgba(239,68,68,0.15)' }}><Trash2 size={15} color="#f87171" /></span>
          Delete Habit
        </button>
      </motion.div>
    </>
  );

  // ──────────────────────────────────────────────
  // DESKTOP LAYOUT (>= 768px): Floating Centered Glass Modal
  // ──────────────────────────────────────────────
  if (!isMobile) {
    return createPortal(
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          zIndex: 9999,
          background: 'rgba(5, 8, 20, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '620px',
            maxHeight: '88vh',
            background: 'var(--surface-elevated, #131b2e)',
            border: '1px solid var(--glass-card-border, rgba(255, 255, 255, 0.1))',
            borderRadius: '24px',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 35px rgba(168, 85, 247, 0.08)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Top Fixed Header */}
          <div
            style={{
              padding: '18px 22px 14px',
              borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
              background: 'var(--surface-elevated, #131b2e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexShrink: 0,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.1em', padding: '2px 8px', borderRadius: 9999,
                  background: `${accentColor}18`, color: accentColor,
                  display: 'inline-block',
                }}>
                  {timeOfDay === 'morning' ? '☀️ Morning' : '🌙 Evening'}
                </span>
                {habit.is_paused && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999,
                    background: 'rgba(234,179,8,0.18)', color: '#eab308', display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <PauseCircle size={11} /> Paused
                  </span>
                )}
              </div>
              <h2 style={{
                fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--text-primary, #fff)',
                lineHeight: 1.2, wordBreak: 'break-word',
              }}>
                {habit.name}
              </h2>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              {/* Quick Toggle */}
              {isActiveToday ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <AuraSpringToggle status={todayStatus} onToggle={(s) => onToggle(habit.id, s)} />
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{dateLabel}</span>
                </div>
              ) : (
                <div style={{
                  padding: '5px 9px', borderRadius: 9999,
                  border: '1px dashed var(--border-subtle, rgba(255,255,255,0.12))',
                  fontSize: 10, color: 'var(--text-muted)',
                }}>Rest Day</div>
              )}

              {/* Close 'X' Button */}
              <button
                onClick={onClose}
                aria-label="Close modal"
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--surface-input, rgba(255,255,255,0.06))', border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                  color: 'var(--text-secondary, rgba(255,255,255,0.7))', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Modal Scrollable Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px 24px' }}>
            {modalBodyContent}
          </div>
        </motion.div>
      </motion.div>,
      document.body
    );
  }

  // ──────────────────────────────────────────────
  // MOBILE LAYOUT (< 768px): Dedicated Full-Screen View
  // ──────────────────────────────────────────────
  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        height: '100dvh',
        width: '100vw',
        zIndex: 9999,
        background: 'var(--bg-solid, #0b1120)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Mobile Top Navigation — ALWAYS STAYS FIXED AT THE TOP */}
      <div
        style={{
          flexShrink: 0,
          padding: 'calc(12px + env(safe-area-inset-top, 0px)) calc(14px + env(safe-area-inset-right, 0px)) 12px calc(14px + env(safe-area-inset-left, 0px))',
          background: 'var(--bg-solid, #0b1120)',
          borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          zIndex: 20,
        }}
      >
        {/* Back Button */}
        <button
          onClick={onClose}
          aria-label="Back"
          style={{
            flexShrink: 0,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--surface-elevated, rgba(255,255,255,0.08))',
            border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
            color: 'var(--text-primary, #fff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <ChevronLeft size={20} />
        </button>

        {/* Name + badge */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', padding: '1px 6px', borderRadius: 9999,
              background: `${accentColor}18`, color: accentColor,
            }}>
              {timeOfDay === 'morning' ? '☀️ Morning' : '🌙 Evening'}
            </span>
            {habit.is_paused && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 9999, background: 'rgba(234,179,8,0.18)', color: '#eab308' }}>
                Paused
              </span>
            )}
          </div>
          <h1 style={{
            fontSize: 16,
            fontWeight: 800,
            margin: 0,
            color: 'var(--text-primary, #fff)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {habit.name}
          </h1>
        </div>

        {/* Date toggle */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          {isActiveToday ? (
            <>
              <AuraSpringToggle status={todayStatus} onToggle={(s) => onToggle(habit.id, s)} />
              <span style={{ fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{dateLabel}</span>
            </>
          ) : (
            <div style={{
              padding: '4px 8px', borderRadius: 9999,
              border: '1px dashed var(--border-subtle, rgba(255,255,255,0.12))',
              fontSize: 9, color: 'var(--text-muted)',
            }}>Rest</div>
          )}
        </div>
      </div>

      {/* Mobile Scrollable Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '14px 14px calc(48px + env(safe-area-inset-bottom, 24px))',
          overscrollBehavior: 'contain',
        }}
      >
        {modalBodyContent}
      </div>
    </motion.div>,
    document.body
  );
}

const rowBtn = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '11px 12px', borderRadius: 14,
  background: 'var(--surface-elevated, rgba(255,255,255,0.03))',
  border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
  color: 'var(--text-primary, #fff)', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%',
};

const iconBox = {
  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
  background: 'var(--surface-input, rgba(255,255,255,0.06))',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 14,
};

