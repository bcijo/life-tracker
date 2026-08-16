import { motion } from 'framer-motion';
import { useState } from 'react';
import { Flame, Trash2, Edit2, ChevronLeft, Trophy, Target, TrendingUp, PauseCircle, Play } from 'lucide-react';
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
  const [editingDays, setEditingDays] = useState(false);
  const [editDays, setEditDays] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

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
    setEditingDays(false); setEditDays([]);
  };

  const handleDelete = async () => {
    if (window.confirm(`Delete "${habit.name}"? All history will be lost.`)) {
      await onDelete(habit.id); onClose();
    }
  };

  const handleTimeToggle = async () => {
    await onTimeOfDayChange(habit.id, timeOfDay === 'morning' ? 'evening' : 'morning');
  };

  const monthStart = startOfMonth(calendarMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: endOfMonth(calendarMonth) });

  const dayStyle = (status, isCurrentDay, isFutureDay, isActive) => {
    let bg = 'var(--surface-input, rgba(255,255,255,0.04))', color = 'var(--text-secondary, rgba(255,255,255,0.6))';
    if (!isActive || isFutureDay) { bg = 'transparent'; color = 'var(--text-muted, rgba(255,255,255,0.2))'; }
    else if (status === 'completed') { bg = `${accentColor}30`; color = accentColor; }
    else if (status === 'failed') { bg = 'rgba(239,68,68,0.15)'; color = '#ef4444'; }
    return {
      aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 10, fontSize: 13, background: bg, color,
      fontWeight: isCurrentDay ? '700' : '500',
      border: isCurrentDay ? `1.5px solid ${accentColor}` : (!isActive ? '1px dashed var(--border-subtle, rgba(255,255,255,0.1))' : 'none'),
      cursor: isFutureDay || !isActive ? 'default' : 'pointer',
      transition: 'all 0.15s',
    };
  };

  const statCard = (icon, value, label, color) => (
    <div style={{
      background: 'var(--surface-elevated, rgba(255,255,255,0.03))', borderRadius: 18, padding: '14px 12px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      border: '1px solid var(--border-subtle, rgba(255,255,255,0.05))',
    }}>
      <div style={{ color }}>{icon}</div>
      <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary, #fff)', fontFamily: 'monospace', lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 10, color: 'var(--text-muted, rgba(255,255,255,0.4))', textAlign: 'center', letterSpacing: '0.04em' }}>{label}</span>
    </div>
  );

  return (
    <motion.div
      layoutId={`habit-${habit.id}`}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 100, background: 'var(--bg-solid, #0b1120)', overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}
    >
      {/* ── HERO: Back + Name + Toggle in one row ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        style={{
          padding: '20px 20px 0',
          display: 'flex', alignItems: 'flex-start', gap: 14,
        }}
      >
        {/* Back */}
        <button
          onClick={onClose}
          style={{
            flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
            background: 'var(--surface-elevated, rgba(255,255,255,0.06))', border: 'none',
            color: 'var(--text-primary, #fff)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', marginTop: 4,
          }}
        >
          <ChevronLeft size={22} />
        </button>

        {/* Name + badge */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.12em', padding: '3px 10px', borderRadius: 9999,
            background: `${accentColor}18`, color: accentColor,
            display: 'inline-block', marginBottom: 6,
          }}>
            {timeOfDay === 'morning' ? '☀️ Morning' : '🌙 Evening'}
          </span>
          <h1 style={{
            fontSize: 26, fontWeight: 800, margin: 0, color: 'var(--text-primary, #fff)',
            lineHeight: 1.15, wordBreak: 'break-word',
          }}>
            {habit.name}
          </h1>
        </div>

        {/* Date toggle — anchored top-right */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 4 }}>
          {isActiveToday ? (
            <>
              <AuraSpringToggle status={todayStatus} onToggle={(s) => onToggle(habit.id, s)} />
              <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{dateLabel}</span>
            </>
          ) : (
            <div style={{
              padding: '7px 10px', borderRadius: 9999,
              border: '1px dashed var(--border-subtle, rgba(255,255,255,0.12))',
              fontSize: 10, color: 'var(--text-muted)',
            }}>Rest</div>
          )}
        </div>
      </motion.div>

      <div style={{ padding: '20px 20px 48px' }}>

        {/* ── 4-STAT GRID ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26 }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 22 }}
        >
          {statCard(<Flame size={18} />, streak, 'STREAK', '#f59e0b')}
          {statCard(<Trophy size={18} />, bestStreak, 'BEST', '#a855f7')}
          {statCard(<Target size={18} />, `${successRate ?? 0}%`, 'SUCCESS', '#22c55e')}
          {statCard(<TrendingUp size={18} />, totalCompleted, 'TOTAL', '#38bdf8')}
        </motion.div>

        {/* ── CALENDAR ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34 }}
          style={{
            padding: 18, borderRadius: 22,
            background: 'var(--surface-elevated, rgba(255,255,255,0.03))',
            border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
            marginBottom: 22,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <button onClick={() => setCalendarMonth(m => subMonths(m, 1))}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 20, cursor: 'pointer', padding: 6 }}>←</button>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #fff)' }}>{format(calendarMonth, 'MMMM yyyy')}</span>
            <button onClick={() => setCalendarMonth(m => addMonths(m, 1))}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 20, cursor: 'pointer', padding: 6 }}>→</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{d}</div>
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
              return (
                <motion.div key={dateStr} whileTap={{ scale: 0.88 }}
                  onClick={() => !isFutureDay && isActive && onCalendarClick(habit.id, dateStr)}
                  style={dayStyle(status, isCurrentDay, isFutureDay, isActive)}
                  title={`${dateStr}: ${status || 'neutral'} (tap to cycle)`}
                >
                  {format(day, 'd')}
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* ── SETTINGS ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 2px' }}>Settings</p>

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
            <div style={{ padding: 16, borderRadius: 16, background: 'var(--surface-elevated, rgba(255,255,255,0.03))', border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))' }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>Tap days to toggle:</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
                {DAY_LABELS.map((label, idx) => (
                  <button key={idx} onClick={() => toggleEditDay(idx)} style={{
                    width: 40, height: 40, borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                    background: editDays.includes(idx) ? `${accentColor}22` : 'var(--surface-input, rgba(255,255,255,0.04))',
                    border: editDays.includes(idx) ? `1.5px solid ${accentColor}` : '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                    color: editDays.includes(idx) ? accentColor : 'var(--text-muted)',
                  }}>{label.charAt(0)}</button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => { setEditingDays(false); setEditDays([]); }}
                  style={{ padding: '8px 16px', borderRadius: 10, background: 'var(--surface-input, rgba(255,255,255,0.06))', color: 'var(--text-primary)', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSaveEditDays}
                  style={{ padding: '8px 16px', borderRadius: 10, background: accentColor, color: '#000', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Save</button>
              </div>
            </div>
          )}

          <p style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '10px 0 2px' }}>Danger Zone</p>

          <button onClick={handleDelete} style={{ ...rowBtn, color: '#f87171', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <span style={{ ...iconBox, background: 'rgba(239,68,68,0.15)' }}><Trash2 size={15} color="#f87171" /></span>
            Delete Habit
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

const rowBtn = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '13px 14px', borderRadius: 16,
  background: 'var(--surface-elevated, rgba(255,255,255,0.03))',
  border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
  color: 'var(--text-primary, #fff)', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%',
};

const iconBox = {
  width: 32, height: 32, borderRadius: 9, flexShrink: 0,
  background: 'var(--surface-input, rgba(255,255,255,0.06))',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 16,
};
