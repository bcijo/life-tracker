import { motion } from 'framer-motion';
import { format, subDays, getDay, isToday as isDateToday } from 'date-fns';

export function WeeklySummary({ habits, getStatusForDate, selectedDate, onSelectDate }) {
  if (!habits || habits.length === 0) return null;

  const today = new Date();
  const last7Days = Array.from({ length: 7 }).map((_, i) => subDays(today, 6 - i));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.04)',
        borderRadius: 16,
        padding: '12px',
        marginBottom: 20,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 6,
        overflowX: 'auto',
      }}
    >
      {last7Days.map((day, i) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dow = getDay(day);
        const isToday = isDateToday(day);
        const isSelected = dateStr === selectedDate;

        const activeHabits = habits.filter(h => (h.active_days || [0,1,2,3,4,5,6]).includes(dow));
        
        let completedCount = 0;
        activeHabits.forEach(h => {
          if (getStatusForDate(h, dateStr) === 'completed') completedCount++;
        });

        const totalActive = activeHabits.length;
        const allDone = totalActive > 0 && completedCount === totalActive;
        const someDone = completedCount > 0;

        let textColor = 'rgba(255,255,255,0.5)';
        if (allDone) textColor = '#22c55e';
        else if (someDone) textColor = '#a855f7';

        return (
          <motion.button
            key={dateStr}
            whileTap={{ scale: 0.9 }}
            onClick={() => onSelectDate(dateStr)}
            style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', 
              minWidth: 40, cursor: 'pointer',
              background: isSelected ? 'rgba(168,85,247,0.12)' : 'transparent',
              border: isSelected ? '1px solid rgba(168,85,247,0.3)' : '1px solid transparent',
              borderRadius: 12, padding: '6px 4px',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{ 
              fontSize: 10, 
              color: isSelected ? '#a855f7' : isToday ? '#fff' : 'rgba(255,255,255,0.4)', 
              fontWeight: isSelected || isToday ? 700 : 500 
            }}>
              {format(day, 'E')}
            </span>
            <span style={{ 
              fontSize: 12, fontWeight: 700, 
              color: isSelected ? '#fff' : textColor,
              marginTop: 4, fontFamily: 'monospace',
            }}>
              {totalActive === 0 ? '-' : `${completedCount}/${totalActive}`}
            </span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
