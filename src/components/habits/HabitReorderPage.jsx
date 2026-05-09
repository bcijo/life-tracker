import { useState } from 'react';
import { Reorder, motion } from 'framer-motion';
import { Check, X, GripVertical } from 'lucide-react';

function HabitRow({ habit, onToggleSection }) {
  const timeOfDay = habit.time_of_day || 'morning';
  const accentColor = timeOfDay === 'morning' ? '#f59e0b' : '#a855f7';

  return (
    <Reorder.Item
      value={habit}
      id={habit.id}
      style={{ listStyle: 'none' }}
      whileDrag={{ scale: 1.03, boxShadow: '0 12px 40px rgba(0,0,0,0.5)', zIndex: 10 }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '13px 14px', borderRadius: 16, marginBottom: 8,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          cursor: 'grab', userSelect: 'none',
          borderLeft: `3px solid ${accentColor}`,
        }}
      >
        {/* Drag handle */}
        <GripVertical size={16} color="rgba(255,255,255,0.2)" style={{ flexShrink: 0 }} />

        {/* Habit name */}
        <span style={{
          flex: 1, fontSize: 15, fontWeight: 600,
          color: 'rgba(255,255,255,0.88)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {habit.name}
        </span>

        {/* Tap badge to move between sections */}
        <button
          onClick={() => onToggleSection(habit.id)}
          title={`Move to ${timeOfDay === 'morning' ? 'Evening' : 'Morning'}`}
          style={{
            flexShrink: 0, padding: '4px 10px', borderRadius: 9999,
            background: `${accentColor}18`, border: `1px solid ${accentColor}40`,
            color: accentColor, fontSize: 11, fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          {timeOfDay === 'morning' ? '☀️ Morning' : '🌙 Evening'}
        </button>
      </div>
    </Reorder.Item>
  );
}

export function HabitReorderPage({ habits, onSave, onClose }) {
  const initialMorning = habits
    .filter(h => (h.time_of_day || 'morning') === 'morning')
    .sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));

  const initialEvening = habits
    .filter(h => h.time_of_day === 'evening')
    .sort((a, b) => (a.sort_order ?? 9999) - (b.sort_order ?? 9999));

  const [morning, setMorning] = useState(initialMorning);
  const [evening, setEvening] = useState(initialEvening);

  const toggleSection = (id) => {
    const inMorning = morning.find(h => h.id === id);
    if (inMorning) {
      setMorning(prev => prev.filter(h => h.id !== id));
      setEvening(prev => [...prev, { ...inMorning, time_of_day: 'evening' }]);
    } else {
      const inEvening = evening.find(h => h.id === id);
      if (!inEvening) return;
      setEvening(prev => prev.filter(h => h.id !== id));
      setMorning(prev => [...prev, { ...inEvening, time_of_day: 'morning' }]);
    }
  };

  const handleSave = () => {
    const result = [
      ...morning.map((h, i) => ({ ...h, time_of_day: 'morning', sort_order: i })),
      ...evening.map((h, i) => ({ ...h, time_of_day: 'evening', sort_order: morning.length + i })),
    ];
    onSave(result);
  };

  const sectionLabel = (label, color, emoji) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 10, marginTop: 0,
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {emoji} {label}
      </span>
      <div style={{ flex: 1, height: 1, background: `${color}30` }} />
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: 'spring', stiffness: 340, damping: 30 }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 100, background: '#0b1120',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 20px 16px', flexShrink: 0,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff' }}>Reorder Habits</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            Drag to reorder · tap badge to move between sections
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)', border: 'none',
              color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleSave}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 4px 16px rgba(34,197,94,0.4)',
            }}
          >
            <Check size={20} strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>

      <div style={{ padding: '0 20px 48px', flex: 1 }}>
        {/* Morning section */}
        {sectionLabel('Morning', '#f59e0b', '☀️')}
        <Reorder.Group
          axis="y"
          values={morning}
          onReorder={setMorning}
          style={{ padding: 0, margin: 0 }}
        >
          {morning.length === 0 ? (
            <div style={{
              padding: '20px', textAlign: 'center',
              border: '1px dashed rgba(245,158,11,0.2)', borderRadius: 14,
              color: 'rgba(255,255,255,0.2)', fontSize: 13, marginBottom: 8,
            }}>
              No morning habits · tap a badge below to move one here
            </div>
          ) : (
            morning.map(h => (
              <HabitRow key={h.id} habit={h} onToggleSection={toggleSection} />
            ))
          )}
        </Reorder.Group>

        {/* Evening section */}
        <div style={{ marginTop: 20 }}>
          {sectionLabel('Evening', '#a855f7', '🌙')}
          <Reorder.Group
            axis="y"
            values={evening}
            onReorder={setEvening}
            style={{ padding: 0, margin: 0 }}
          >
            {evening.length === 0 ? (
              <div style={{
                padding: '20px', textAlign: 'center',
                border: '1px dashed rgba(168,85,247,0.2)', borderRadius: 14,
                color: 'rgba(255,255,255,0.2)', fontSize: 13,
              }}>
                No evening habits · tap a badge above to move one here
              </div>
            ) : (
              evening.map(h => (
                <HabitRow key={h.id} habit={h} onToggleSection={toggleSection} />
              ))
            )}
          </Reorder.Group>
        </div>
      </div>
    </motion.div>
  );
}
