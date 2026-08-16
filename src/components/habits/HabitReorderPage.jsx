import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Reorder, motion } from 'framer-motion';
import { Check, X, GripVertical, ChevronLeft } from 'lucide-react';

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
          background: 'var(--surface-elevated, rgba(255,255,255,0.04))',
          border: '1px solid var(--border-subtle, rgba(255,255,255,0.07))',
          cursor: 'grab', userSelect: 'none',
          borderLeft: `3px solid ${accentColor}`,
        }}
      >
        {/* Drag handle */}
        <GripVertical size={16} color="var(--text-muted, rgba(255,255,255,0.2))" style={{ flexShrink: 0 }} />

        {/* Habit name */}
        <span style={{
          flex: 1, fontSize: 15, fontWeight: 600,
          color: 'var(--text-primary, rgba(255,255,255,0.88))',
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
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev || 'unset';
    };
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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

  const sectionLabel = (label, color, emoji, count) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 10, marginTop: 0,
    }}>
      <span style={{ fontSize: 11, fontWeight: 800, color, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 5 }}>
        <span>{emoji}</span> {label}
      </span>
      <span style={{
        fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 9999,
        background: `${color}18`, color, fontFamily: 'monospace',
      }}>
        {count}
      </span>
      <div style={{ flex: 1, height: 1, background: `${color}25` }} />
    </div>
  );

  const reorderContent = (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: isMobile ? 18 : 20,
    }}>
      {/* Morning Section */}
      <div style={{
        background: isMobile ? 'transparent' : 'var(--surface-input, rgba(255,255,255,0.02))',
        padding: isMobile ? 0 : '14px',
        borderRadius: 18,
        border: isMobile ? 'none' : '1px solid var(--border-subtle, rgba(255,255,255,0.05))',
      }}>
        {sectionLabel('Morning Habits', '#f59e0b', '☀️', morning.length)}
        <Reorder.Group
          axis="y"
          values={morning}
          onReorder={setMorning}
          style={{ padding: 0, margin: 0 }}
        >
          {morning.length === 0 ? (
            <div style={{
              padding: '24px 16px', textAlign: 'center',
              border: '1px dashed rgba(245,158,11,0.2)', borderRadius: 14,
              color: 'var(--text-muted)', fontSize: 12, marginBottom: 8,
            }}>
              No morning habits · tap a badge to move one here
            </div>
          ) : (
            morning.map(h => (
              <HabitRow key={h.id} habit={h} onToggleSection={toggleSection} />
            ))
          )}
        </Reorder.Group>
      </div>

      {/* Evening Section */}
      <div style={{
        background: isMobile ? 'transparent' : 'var(--surface-input, rgba(255,255,255,0.02))',
        padding: isMobile ? 0 : '14px',
        borderRadius: 18,
        border: isMobile ? 'none' : '1px solid var(--border-subtle, rgba(255,255,255,0.05))',
      }}>
        {sectionLabel('Evening Habits', '#a855f7', '🌙', evening.length)}
        <Reorder.Group
          axis="y"
          values={evening}
          onReorder={setEvening}
          style={{ padding: 0, margin: 0 }}
        >
          {evening.length === 0 ? (
            <div style={{
              padding: '24px 16px', textAlign: 'center',
              border: '1px dashed rgba(168,85,247,0.2)', borderRadius: 14,
              color: 'var(--text-muted)', fontSize: 12,
            }}>
              No evening habits · tap a badge to move one here
            </div>
          ) : (
            evening.map(h => (
              <HabitRow key={h.id} habit={h} onToggleSection={toggleSection} />
            ))
          )}
        </Reorder.Group>
      </div>
    </div>
  );

  // Desktop: Floating Centered Glass Modal
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
            maxWidth: '780px',
            maxHeight: '88vh',
            background: 'var(--surface-elevated, #131b2e)',
            border: '1px solid var(--glass-card-border, rgba(255, 255, 255, 0.1))',
            borderRadius: '24px',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 22px 14px', flexShrink: 0,
            borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
            background: 'var(--surface-elevated, #131b2e)',
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary, #fff)' }}>Reorder Habits</h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                Drag cards to reorder · tap the badge to switch time of day
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={onClose}
                style={{
                  padding: '7px 14px', borderRadius: 10,
                  background: 'var(--surface-input, rgba(255,255,255,0.06))',
                  border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                  color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={handleSave}
                style={{
                  padding: '7px 16px', borderRadius: 10,
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none',
                  color: '#fff', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  boxShadow: '0 4px 16px rgba(34,197,94,0.4)',
                }}
              >
                <Check size={15} strokeWidth={2.5} /> Save Changes
              </motion.button>
            </div>
          </div>

          {/* Body */}
          <div style={{
            padding: '20px 22px 24px',
            flex: 1,
            overflowY: 'auto',
          }}>
            {reorderContent}
          </div>
        </motion.div>
      </motion.div>,
      document.body
    );
  }

  // Mobile: Full-Screen View
  return createPortal(
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        height: '100dvh', width: '100vw',
        zIndex: 99999, background: 'var(--bg-solid, #0b1120)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', flexShrink: 0,
        borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
        background: 'var(--bg-solid, #0b1120)',
        zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary, #fff)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Reorder Habits
            </h1>
            <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)' }}>
              Drag to reorder · tap badge to move
            </p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={handleSave}
          style={{
            flexShrink: 0,
            padding: '6px 14px',
            borderRadius: 10,
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            border: 'none',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(34,197,94,0.4)',
          }}
        >
          <Check size={16} strokeWidth={2.5} /> Save
        </motion.button>
      </div>

      <div style={{
        padding: '14px 14px calc(80px + env(safe-area-inset-bottom, 30px))',
        flex: 1,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain',
      }}>
        {reorderContent}
      </div>
    </motion.div>,
    document.body
  );
}
