import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Flame, 
  Check, 
  X, 
  Calendar as CalendarIcon, 
  Trash2, 
  RotateCcw, 
  BarChart2, 
  Edit2, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  Target,
  ArrowUp,
  ArrowDown,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';
import useHabits from '../hooks/useHabits';
import { 
  format, 
  isToday, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  subMonths, 
  addMonths, 
  isFuture, 
  subDays,
  startOfWeek,
  endOfWeek,
  subWeeks,
  addWeeks
} from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LABELS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const HabitsNew = () => {
  const {
    habits,
    loading,
    addHabit: addHabitDb,
    updateHabitDays,
    updateHabitTimeOfDay,
    cycleHabitStatus,
    getStatusForDate,
    getWeeklyStatus,
    isTodayActive,
    deleteHabit: deleteHabitDb,
    markMissedHabits,
    calculateSuccessRate,
    resetHabitStats
  } = useHabits();

  const [showForm, setShowForm] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [selectedDays, setSelectedDays] = useState(ALL_DAYS);
  const [newHabitTimeOfDay, setNewHabitTimeOfDay] = useState('morning');
  const [expandedHabit, setExpandedHabit] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [editDays, setEditDays] = useState([]);

  // Auto-mark missed habits on page load
  useEffect(() => {
    if (!loading && habits.length > 0) {
      markMissedHabits();
    }
  }, [loading, habits.length]);

  const toggleDay = (day) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    );
  };

  const toggleEditDay = (day) => {
    setEditDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    );
  };

  const addHabit = async (e) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    if (selectedDays.length === 0) {
      alert('Please select at least one day');
      return;
    }

    await addHabitDb(newHabitName, selectedDays, newHabitTimeOfDay);
    setNewHabitName('');
    setSelectedDays(ALL_DAYS);
    setNewHabitTimeOfDay('morning');
    setShowForm(false);
  };

  const handleHabitClick = async (habitId, dateStr = null) => {
    await cycleHabitStatus(habitId, dateStr);
  };

  const handleDeleteHabit = async (habitId) => {
    if (window.confirm('Are you sure you want to delete this habit?')) {
      await deleteHabitDb(habitId);
      if (expandedHabit === habitId) {
        setExpandedHabit(null);
      }
    }
  };

  const handleResetStats = async (habitId) => {
    if (window.confirm('Reset all tracking? This will clear history and start fresh.')) {
      await resetHabitStats(habitId);
    }
  };

  const startEditDays = (habit) => {
    if (editingHabit === habit.id) {
      setEditingHabit(null);
      setEditDays([]);
      return;
    }
    setEditingHabit(habit.id);
    setEditDays(habit.active_days || ALL_DAYS);
  };

  const handleTimeOfDayChange = async (habitId, newTimeOfDay) => {
    await updateHabitTimeOfDay(habitId, newTimeOfDay);
  };

  const saveEditDays = async () => {
    if (editDays.length === 0) {
      alert('Please select at least one day');
      return;
    }
    await updateHabitDays(editingHabit, editDays);
    setEditingHabit(null);
    setEditDays([]);
  };

  // Calculate streak
  const calculateStreak = (habit) => {
    if (!habit.history || habit.history.length === 0) return 0;
    const activeDays = habit.active_days || ALL_DAYS;
    let streak = 0;
    const today = new Date();

    for (let i = 0; i <= 365; i++) {
      const checkDate = subDays(today, i);
      const dateStr = format(checkDate, 'yyyy-MM-dd');
      const dayOfWeek = checkDate.getDay();

      if (!activeDays.includes(dayOfWeek)) continue;

      const status = getStatusForDate(habit, dateStr);

      if (status === 'completed') {
        streak++;
      } else if (status === 'failed') {
        break;
      } else if (i > 0) {
        break;
      }
    }

    return streak;
  };

  const getTodayStatus = (habit) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return getStatusForDate(habit, today);
  };

  // Calendar logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Calculate overall stats for header
  const todayCompletedCount = habits.filter(h => getTodayStatus(h) === 'completed').length;
  const todayTotalActive = habits.filter(h => isTodayActive(h)).length;
  const todayRate = todayTotalActive > 0 ? Math.round((todayCompletedCount / todayTotalActive) * 100) : 0;

  return (
    <div className="habits-page">
      {/* Header Stats Card */}
      <div className="habits-header">
        <div className="header-top">
          <div>
            <h1 className="page-title">Habits</h1>
            <p className="page-subtitle">{format(new Date(), 'EEEE, MMM d')}</p>
          </div>
          <div className="header-actions">
            <button 
              className="icon-btn analytics-btn"
              onClick={() => setShowAnalytics(true)}
            >
              <BarChart2 size={20} />
            </button>
            <button 
              className="icon-btn add-btn"
              onClick={() => setShowForm(!showForm)}
            >
              <Plus size={22} />
            </button>
          </div>
        </div>
        
        {/* Today's Progress */}
        <div className="today-progress">
          <div className="progress-ring-container">
            <svg className="progress-ring" viewBox="0 0 100 100">
              <circle 
                className="progress-bg" 
                cx="50" 
                cy="50" 
                r="42" 
                fill="none" 
                strokeWidth="8"
              />
              <circle 
                className="progress-fill" 
                cx="50" 
                cy="50" 
                r="42" 
                fill="none" 
                strokeWidth="8"
                strokeDasharray={`${todayRate * 2.64} 264`}
                strokeLinecap="round"
              />
            </svg>
            <div className="progress-text">
              <span className="progress-value">{todayRate}%</span>
            </div>
          </div>
          <div className="progress-details">
            <span className="progress-label">Today&apos;s Progress</span>
            <span className="progress-count">{todayCompletedCount} of {todayTotalActive} habits</span>
            {todayRate === 100 && todayTotalActive > 0 && (
              <span className="progress-badge">
                <Sparkles size={12} /> Perfect Day!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Add Habit Form */}
      {showForm && (
        <form onSubmit={addHabit} className="add-habit-form">
          <div className="form-header">
            <h3>New Habit</h3>
            <button type="button" className="close-btn" onClick={() => setShowForm(false)}>
              <X size={18} />
            </button>
          </div>
          
          <input
            type="text"
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            placeholder="What habit do you want to build?"
            className="habit-input"
            autoFocus
          />

          <div className="form-section">
            <label className="form-label">Time of Day</label>
            <div className="time-toggle">
              <button
                type="button"
                className={`time-btn ${newHabitTimeOfDay === 'morning' ? 'active morning' : ''}`}
                onClick={() => setNewHabitTimeOfDay('morning')}
              >
                <Sun size={16} />
                Morning
              </button>
              <button
                type="button"
                className={`time-btn ${newHabitTimeOfDay === 'evening' ? 'active evening' : ''}`}
                onClick={() => setNewHabitTimeOfDay('evening')}
              >
                <Moon size={16} />
                Evening
              </button>
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">Active Days</label>
            <div className="day-selector">
              {DAY_LABELS.map((label, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`day-btn ${selectedDays.includes(idx) ? 'active' : ''}`}
                  onClick={() => toggleDay(idx)}
                >
                  {label.charAt(0)}
                </button>
              ))}
            </div>
            <span className="day-hint">
              {selectedDays.length === 7 ? 'Every day' :
                selectedDays.length === 5 && !selectedDays.includes(0) && !selectedDays.includes(6) ? 'Weekdays' :
                  selectedDays.length === 2 && selectedDays.includes(0) && selectedDays.includes(6) ? 'Weekends' :
                    `${selectedDays.length} days/week`}
            </span>
          </div>

          <button type="submit" className="submit-btn">
            <Plus size={18} />
            Create Habit
          </button>
        </form>
      )}

      {/* Habits List */}
      <div className="habits-list">
        {loading ? (
          <div className="loading-state">
            <div className="spinner" />
            <span>Loading habits...</span>
          </div>
        ) : habits.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Target size={48} />
            </div>
            <h3>No habits yet</h3>
            <p>Start building better habits today</p>
            <button className="add-first-btn" onClick={() => setShowForm(true)}>
              <Plus size={18} />
              Add Your First Habit
            </button>
          </div>
        ) : (
          habits.map(habit => (
            <HabitCard
              key={habit.id}
              habit={habit}
              isExpanded={expandedHabit === habit.id}
              isEditing={editingHabit === habit.id}
              editDays={editDays}
              onToggleExpand={() => setExpandedHabit(expandedHabit === habit.id ? null : habit.id)}
              onToggleToday={() => handleHabitClick(habit.id)}
              onToggleDate={(dateStr) => handleHabitClick(habit.id, dateStr)}
              onDelete={() => handleDeleteHabit(habit.id)}
              onStartEdit={() => startEditDays(habit)}
              onToggleEditDay={toggleEditDay}
              onSaveEdit={saveEditDays}
              onCancelEdit={() => { setEditingHabit(null); setEditDays([]); }}
              onTimeOfDayChange={(time) => handleTimeOfDayChange(habit.id, time)}
              onResetStats={() => handleResetStats(habit.id)}
              getTodayStatus={() => getTodayStatus(habit)}
              calculateStreak={() => calculateStreak(habit)}
              calculateSuccessRate={() => calculateSuccessRate(habit)}
              getWeeklyStatus={() => getWeeklyStatus(habit)}
              getStatusForDate={(dateStr) => getStatusForDate(habit, dateStr)}
              isTodayActive={() => isTodayActive(habit)}
              currentMonth={currentMonth}
              onPrevMonth={() => setCurrentMonth(subMonths(currentMonth, 1))}
              onNextMonth={() => setCurrentMonth(addMonths(currentMonth, 1))}
              daysInMonth={daysInMonth}
              monthStart={monthStart}
            />
          ))
        )}
      </div>

      {/* Analytics Modal */}
      {showAnalytics && (
        <AnalyticsModal
          habits={habits}
          getStatusForDate={getStatusForDate}
          onClose={() => setShowAnalytics(false)}
        />
      )}

      <style>{`
        .habits-page {
          padding: 16px;
          padding-bottom: 100px;
          max-width: 480px;
          margin: 0 auto;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .habits-header {
          margin-bottom: 20px;
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .page-title {
          font-size: 28px;
          font-weight: 700;
          margin: 0;
          color: var(--text-primary);
        }

        .page-subtitle {
          font-size: 14px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .header-actions {
          display: flex;
          gap: 10px;
        }

        .icon-btn {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .analytics-btn {
          background: var(--success-bg);
          color: var(--success);
        }

        .analytics-btn:hover {
          background: var(--success);
          color: #fff;
        }

        .add-btn {
          background: var(--accent-gradient);
          color: #fff;
        }

        .add-btn:hover {
          opacity: 0.9;
          transform: scale(1.02);
        }

        .today-progress {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: var(--glass-card-bg);
          backdrop-filter: blur(12px);
          border: 1px solid var(--glass-card-border);
          border-radius: 20px;
        }

        .progress-ring-container {
          position: relative;
          width: 72px;
          height: 72px;
          flex-shrink: 0;
        }

        .progress-ring {
          transform: rotate(-90deg);
          width: 100%;
          height: 100%;
        }

        .progress-bg {
          stroke: var(--border-subtle);
        }

        .progress-fill {
          stroke: var(--success);
          transition: stroke-dasharray 0.5s ease;
        }

        .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .progress-value {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .progress-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .progress-label {
          font-size: 13px;
          color: var(--text-secondary);
        }

        .progress-count {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .progress-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          font-weight: 600;
          color: var(--success);
          background: var(--success-bg);
          padding: 4px 10px;
          border-radius: 20px;
          width: fit-content;
          margin-top: 4px;
        }

        /* Add Habit Form */
        .add-habit-form {
          background: var(--glass-card-bg);
          backdrop-filter: blur(12px);
          border: 1px solid var(--glass-card-border);
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 20px;
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .form-header h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }

        .close-btn {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          border: none;
          background: var(--border-subtle);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .habit-input {
          width: 100%;
          padding: 14px 16px;
          border-radius: 12px;
          border: 1px solid var(--glass-card-border);
          background: var(--surface-input);
          color: var(--text-primary);
          font-size: 15px;
          font-family: inherit;
          margin-bottom: 16px;
        }

        .habit-input:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-primary) 20%, transparent);
        }

        .form-section {
          margin-bottom: 16px;
        }

        .form-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 10px;
        }

        .time-toggle {
          display: flex;
          gap: 8px;
        }

        .time-btn {
          flex: 1;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid var(--glass-card-border);
          background: var(--glass-card-bg);
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .time-btn.active.morning {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: #fff;
          border-color: transparent;
        }

        .time-btn.active.evening {
          background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
          color: #fff;
          border-color: transparent;
        }

        .day-selector {
          display: flex;
          gap: 6px;
          justify-content: center;
        }

        .day-btn {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          border: 1px solid var(--glass-card-border);
          background: var(--glass-card-bg);
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .day-btn.active {
          background: var(--success);
          color: #fff;
          border-color: transparent;
        }

        .day-hint {
          display: block;
          text-align: center;
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 8px;
        }

        .submit-btn {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          border: none;
          background: var(--accent-gradient);
          color: #fff;
          font-size: 15px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .submit-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        /* Habits List */
        .habits-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .loading-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
        }

        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border-subtle);
          border-top-color: var(--accent-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 12px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-icon {
          width: 80px;
          height: 80px;
          border-radius: 20px;
          background: var(--glass-card-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          color: var(--text-muted);
        }

        .empty-state h3 {
          font-size: 18px;
          margin: 0 0 8px;
        }

        .empty-state p {
          color: var(--text-secondary);
          margin: 0 0 20px;
        }

        .add-first-btn {
          padding: 12px 24px;
          border-radius: 12px;
          border: none;
          background: var(--accent-gradient);
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

// Habit Card Component
const HabitCard = ({
  habit,
  isExpanded,
  isEditing,
  editDays,
  onToggleExpand,
  onToggleToday,
  onToggleDate,
  onDelete,
  onStartEdit,
  onToggleEditDay,
  onSaveEdit,
  onCancelEdit,
  onTimeOfDayChange,
  onResetStats,
  getTodayStatus,
  calculateStreak,
  calculateSuccessRate,
  getWeeklyStatus,
  getStatusForDate,
  isTodayActive,
  currentMonth,
  onPrevMonth,
  onNextMonth,
  daysInMonth,
  monthStart,
}) => {
  const todayStatus = getTodayStatus();
  const streak = calculateStreak();
  const successStats = calculateSuccessRate();
  const weeklyStatus = getWeeklyStatus();
  const isActiveToday = isTodayActive();
  const activeDays = habit.active_days || ALL_DAYS;
  const timeOfDay = habit.time_of_day || 'morning';

  const getStatusColor = (status) => {
    if (status === 'completed') return 'var(--success)';
    if (status === 'failed') return 'var(--danger)';
    return 'var(--border-subtle)';
  };

  const getSuccessRateColor = (rate) => {
    if (rate === null) return 'var(--text-secondary)';
    if (rate >= 70) return 'var(--success)';
    if (rate >= 40) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div className={`habit-card ${isExpanded ? 'expanded' : ''}`}>
      <div className="habit-main">
        <div className="habit-info">
          <div className="habit-name-row">
            <h3 className="habit-name">{habit.name}</h3>
            <button 
              className={`time-badge ${timeOfDay}`}
              onClick={(e) => {
                e.stopPropagation();
                onTimeOfDayChange(timeOfDay === 'morning' ? 'evening' : 'morning');
              }}
            >
              {timeOfDay === 'morning' ? <Sun size={12} /> : <Moon size={12} />}
              {timeOfDay === 'morning' ? 'AM' : 'PM'}
            </button>
          </div>
          <div className="habit-stats">
            <div className={`stat streak ${streak > 0 ? 'active' : ''}`}>
              <Flame size={14} />
              <span>{streak}d</span>
            </div>
            {successStats.rate !== null && (
              <div className="stat success" style={{ color: getSuccessRateColor(successStats.rate) }}>
                <Target size={14} />
                <span>{successStats.rate}%</span>
              </div>
            )}
          </div>
        </div>

        <div className="habit-actions">
          <button className="action-btn edit" onClick={onStartEdit}>
            <Edit2 size={16} />
          </button>
          <button className="action-btn delete" onClick={onDelete}>
            <Trash2 size={16} />
          </button>
          {isActiveToday ? (
            <button 
              className={`check-btn ${todayStatus || ''}`}
              onClick={onToggleToday}
            >
              {todayStatus === 'completed' && <Check size={22} strokeWidth={3} />}
              {todayStatus === 'failed' && <X size={22} strokeWidth={3} />}
              {!todayStatus && <Check size={22} strokeWidth={2} style={{ opacity: 0.3 }} />}
            </button>
          ) : (
            <div className="rest-badge">Rest</div>
          )}
        </div>
      </div>

      {/* Edit Panel */}
      {isEditing && (
        <div className="edit-panel">
          <div className="edit-section">
            <label>Time of Day</label>
            <div className="time-toggle small">
              <button
                className={`time-btn ${timeOfDay === 'morning' ? 'active morning' : ''}`}
                onClick={() => onTimeOfDayChange('morning')}
              >
                <Sun size={14} /> Morning
              </button>
              <button
                className={`time-btn ${timeOfDay === 'evening' ? 'active evening' : ''}`}
                onClick={() => onTimeOfDayChange('evening')}
              >
                <Moon size={14} /> Evening
              </button>
            </div>
          </div>
          <div className="edit-section">
            <label>Active Days</label>
            <div className="day-selector small">
              {DAY_LABELS.map((label, idx) => (
                <button
                  key={idx}
                  className={`day-btn ${editDays.includes(idx) ? 'active' : ''}`}
                  onClick={() => onToggleEditDay(idx)}
                >
                  {label.charAt(0)}
                </button>
              ))}
            </div>
          </div>
          <div className="edit-actions">
            <button className="cancel-btn" onClick={onCancelEdit}>Cancel</button>
            <button className="save-btn" onClick={onSaveEdit}>Save Changes</button>
          </div>
        </div>
      )}

      {/* Weekly Progress */}
      <div className="weekly-progress">
        <div className="weekly-header">
          <span className="weekly-label">This Week</span>
          <span className="weekly-days">{activeDays.length === 7 ? 'Daily' : `${activeDays.length}d/wk`}</span>
        </div>
        <div className="weekly-boxes">
          {weeklyStatus.map((day, idx) => (
            <div key={idx} className="day-column">
              <div 
                className={`day-box ${day.status || ''} ${!day.isActive ? 'inactive' : ''} ${day.isFuture ? 'future' : ''} ${day.isToday ? 'today' : ''}`}
              >
                {day.status === 'completed' && <Check size={12} strokeWidth={3} />}
                {day.status === 'failed' && <X size={10} strokeWidth={3} />}
                {!day.isActive && <span className="dash">-</span>}
              </div>
              <span className={`day-label ${day.isToday ? 'today' : ''}`}>
                {DAY_LABELS_SHORT[idx]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Toggle */}
      <button className="calendar-toggle" onClick={onToggleExpand}>
        <CalendarIcon size={14} />
        {isExpanded ? 'Hide Calendar' : 'View Calendar'}
      </button>

      {/* Calendar View */}
      {isExpanded && (
        <div className="calendar-view">
          <div className="calendar-nav">
            <button onClick={onPrevMonth}>
              <ChevronLeft size={18} />
            </button>
            <span>{format(currentMonth, 'MMMM yyyy')}</span>
            <button onClick={onNextMonth}>
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="calendar-grid">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} className="calendar-day-label">{d}</div>
            ))}
            {Array(monthStart.getDay()).fill(null).map((_, i) => (
              <div key={`empty-${i}`} className="calendar-day empty" />
            ))}
            {daysInMonth.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const status = getStatusForDate(dateStr);
              const dayOfWeek = day.getDay();
              const isActive = activeDays.includes(dayOfWeek);
              const isFutureDay = isFuture(day);
              const isCurrentDay = isToday(day);

              return (
                <button
                  key={dateStr}
                  className={`calendar-day ${status || ''} ${!isActive ? 'inactive' : ''} ${isFutureDay ? 'future' : ''} ${isCurrentDay ? 'current' : ''}`}
                  onClick={() => !isFutureDay && isActive && onToggleDate(dateStr)}
                  disabled={isFutureDay || !isActive}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          {/* Stats Footer */}
          <div className="calendar-stats">
            <div className="stat-item">
              <span className="stat-label">Tracking since</span>
              <span className="stat-value">
                {successStats.startDate ? format(new Date(successStats.startDate), 'MMM d, yyyy') : 'N/A'}
              </span>
            </div>
            <button className="reset-btn" onClick={onResetStats}>
              <RotateCcw size={12} />
              Reset
            </button>
          </div>
        </div>
      )}

      <style>{`
        .habit-card {
          background: var(--glass-card-bg);
          backdrop-filter: blur(12px);
          border: 1px solid var(--glass-card-border);
          border-radius: 20px;
          padding: 16px;
          transition: all 0.3s ease;
        }

        .habit-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--glass-card-hover-shadow);
        }

        .habit-card.expanded {
          background: var(--glass-bg);
        }

        .habit-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .habit-info {
          flex: 1;
          min-width: 0;
        }

        .habit-name-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .habit-name {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .time-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .time-badge.morning {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }

        .time-badge.evening {
          background: rgba(139, 92, 246, 0.15);
          color: #8b5cf6;
        }

        .habit-stats {
          display: flex;
          gap: 12px;
        }

        .stat {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .stat.streak.active {
          color: #f87171;
        }

        .habit-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .action-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-btn.edit {
          background: var(--glass-card-bg);
          color: var(--text-secondary);
        }

        .action-btn.delete {
          background: var(--danger-bg);
          color: var(--danger);
        }

        .check-btn {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          border: 2px solid var(--glass-card-border);
          background: var(--glass-card-bg);
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .check-btn.completed {
          background: var(--success);
          border-color: var(--success);
          color: #fff;
          transform: scale(1.05);
        }

        .check-btn.failed {
          background: var(--danger);
          border-color: var(--danger);
          color: #fff;
        }

        .rest-badge {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          border: 2px dashed var(--border-subtle);
          background: var(--border-subtle);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 500;
        }

        /* Edit Panel */
        .edit-panel {
          margin-top: 16px;
          padding: 16px;
          background: var(--border-subtle);
          border-radius: 14px;
          animation: slideDown 0.2s ease;
        }

        .edit-section {
          margin-bottom: 14px;
        }

        .edit-section label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .time-toggle.small {
          display: flex;
          gap: 6px;
        }

        .time-toggle.small .time-btn {
          padding: 8px 12px;
          font-size: 12px;
        }

        .day-selector.small {
          gap: 4px;
        }

        .day-selector.small .day-btn {
          width: 34px;
          height: 34px;
          font-size: 12px;
          border-radius: 10px;
        }

        .edit-actions {
          display: flex;
          gap: 8px;
          margin-top: 14px;
        }

        .cancel-btn, .save-btn {
          flex: 1;
          padding: 10px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cancel-btn {
          background: var(--glass-card-bg);
          border: 1px solid var(--glass-card-border);
          color: var(--text-secondary);
        }

        .save-btn {
          background: var(--success);
          border: none;
          color: #fff;
        }

        /* Weekly Progress */
        .weekly-progress {
          margin-top: 14px;
          padding: 12px;
          background: var(--border-subtle);
          border-radius: 12px;
        }

        .weekly-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .weekly-label {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .weekly-days {
          font-size: 10px;
          color: var(--text-muted);
        }

        .weekly-boxes {
          display: flex;
          justify-content: space-between;
          gap: 4px;
        }

        .day-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          flex: 1;
        }

        .day-box {
          width: 100%;
          aspect-ratio: 1;
          max-width: 32px;
          border-radius: 8px;
          background: var(--glass-card-bg);
          border: 1px solid var(--glass-card-border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          font-size: 10px;
          transition: all 0.2s ease;
        }

        .day-box.completed {
          background: var(--success);
          border-color: var(--success);
          color: #fff;
        }

        .day-box.failed {
          background: var(--danger);
          border-color: var(--danger);
          color: #fff;
        }

        .day-box.inactive {
          background: var(--border-subtle);
          border-color: transparent;
          opacity: 0.5;
        }

        .day-box.future {
          opacity: 0.4;
        }

        .day-box.today {
          border: 2px solid var(--accent-primary);
        }

        .day-label {
          font-size: 9px;
          color: var(--text-muted);
        }

        .day-label.today {
          font-weight: 700;
          color: var(--accent-primary);
        }

        .dash {
          font-size: 8px;
        }

        /* Calendar Toggle */
        .calendar-toggle {
          width: 100%;
          margin-top: 12px;
          padding: 10px;
          border-radius: 10px;
          border: 1px solid var(--glass-card-border);
          background: var(--glass-card-bg);
          color: var(--text-secondary);
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .calendar-toggle:hover {
          background: var(--border-subtle);
        }

        /* Calendar View */
        .calendar-view {
          margin-top: 14px;
          padding: 14px;
          background: var(--border-subtle);
          border-radius: 14px;
          animation: slideDown 0.3s ease;
        }

        .calendar-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }

        .calendar-nav button {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          background: var(--glass-card-bg);
          color: var(--text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .calendar-nav span {
          font-size: 14px;
          font-weight: 600;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }

        .calendar-day-label {
          text-align: center;
          font-size: 10px;
          font-weight: 500;
          color: var(--text-muted);
          padding: 4px 0;
        }

        .calendar-day {
          aspect-ratio: 1;
          border-radius: 8px;
          border: none;
          background: var(--glass-card-bg);
          color: var(--text-primary);
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .calendar-day.empty {
          background: transparent;
        }

        .calendar-day.completed {
          background: var(--success);
          color: #fff;
        }

        .calendar-day.failed {
          background: var(--danger);
          color: #fff;
        }

        .calendar-day.inactive {
          background: var(--border-subtle);
          color: var(--text-muted);
          cursor: not-allowed;
        }

        .calendar-day.future {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .calendar-day.current {
          border: 2px solid var(--accent-primary);
        }

        .calendar-stats {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 14px;
          padding-top: 12px;
          border-top: 1px solid var(--glass-card-border);
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .stat-label {
          font-size: 10px;
          color: var(--text-muted);
        }

        .stat-value {
          font-size: 12px;
          font-weight: 500;
        }

        .reset-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          border-radius: 8px;
          border: none;
          background: var(--glass-card-bg);
          color: var(--text-secondary);
          font-size: 11px;
          cursor: pointer;
        }

        .reset-btn:hover {
          background: var(--danger-bg);
          color: var(--danger);
        }
      `}</style>
    </div>
  );
};

// Analytics Modal Component
const AnalyticsModal = ({ habits, getStatusForDate, onClose }) => {
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  const currentDate = new Date();
  const targetDate = weekOffset === 0 ? currentDate :
    weekOffset < 0 ? subWeeks(currentDate, Math.abs(weekOffset)) : addWeeks(currentDate, weekOffset);

  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getCompletionForDate = (dateStr) => {
    if (!habits || habits.length === 0) return { completed: 0, total: 0, rate: 0 };
    const total = habits.length;
    const completed = habits.filter(habit => getStatusForDate(habit, dateStr) === 'completed').length;
    return { completed, total, rate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  const chartData = daysOfWeek.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const stats = getCompletionForDate(dateStr);
    return {
      day: format(day, 'EEE'),
      date: format(day, 'MMM d'),
      dateStr,
      ...stats,
      isFuture: day > currentDate,
      isCurrentDay: isToday(day),
    };
  });

  const todayStr = format(currentDate, 'yyyy-MM-dd');
  const todayStats = getCompletionForDate(todayStr);
  const yesterdayStr = format(subDays(currentDate, 1), 'yyyy-MM-dd');
  const yesterdayStats = getCompletionForDate(yesterdayStr);
  const todayVsYesterday = todayStats.completed - yesterdayStats.completed;

  const pastDays = chartData.filter(d => !d.isFuture);
  const weekAverage = pastDays.length > 0
    ? Math.round(pastDays.reduce((acc, d) => acc + d.rate, 0) / pastDays.length)
    : 0;

  const bestDay = pastDays.reduce((best, day) =>
    day.rate > (best?.rate || 0) ? day : best, null);

  const calculateBestStreak = () => {
    if (!habits || habits.length === 0) return 0;
    let bestStreak = 0;
    habits.forEach(habit => {
      let streak = 0;
      for (let i = 0; i <= 365; i++) {
        const checkDate = subDays(currentDate, i);
        const dateStr = format(checkDate, 'yyyy-MM-dd');
        const status = getStatusForDate(habit, dateStr);
        if (status === 'completed') {
          streak++;
        } else if (status === 'failed' || i > 0) {
          break;
        }
      }
      if (streak > bestStreak) bestStreak = streak;
    });
    return bestStreak;
  };

  const bestStreak = calculateBestStreak();

  const getBarColor = (rate, isFuture) => {
    if (isFuture) return 'var(--border-subtle)';
    if (rate >= 80) return 'var(--success)';
    if (rate >= 50) return 'var(--warning)';
    if (rate > 0) return 'var(--accent-primary)';
    return 'var(--border-subtle)';
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (data.isFuture) return null;
      return (
        <div className="chart-tooltip">
          <p className="tooltip-date">{data.date}</p>
          <p className="tooltip-value">{data.completed}/{data.total} completed</p>
          <p className="tooltip-rate">{data.rate}%</p>
        </div>
      );
    }
    return null;
  };

  const progressPercent = todayStats.rate;

  return (
    <div className="analytics-overlay">
      <div className="analytics-modal">
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="analytics-header">
          <div className="analytics-title">
            <TrendingUp size={22} className="title-icon" />
            <h2>Analytics</h2>
          </div>

          <div className="week-nav">
            <button onClick={() => setWeekOffset(weekOffset - 1)}>
              <ChevronLeft size={18} />
            </button>
            <div className="week-label">
              <span className="week-dates">{format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}</span>
              <span className="week-name">
                {weekOffset === 0 ? 'This Week' : weekOffset === -1 ? 'Last Week' : `${Math.abs(weekOffset)} weeks ago`}
              </span>
            </div>
            <button onClick={() => setWeekOffset(weekOffset + 1)} disabled={weekOffset >= 0}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="today-card">
          <div className="today-ring">
            <svg viewBox="0 0 100 100">
              <circle className="ring-bg" cx="50" cy="50" r="40" fill="none" strokeWidth="10" />
              <circle 
                className="ring-fill" 
                cx="50" 
                cy="50" 
                r="40" 
                fill="none" 
                strokeWidth="10"
                strokeDasharray={`${progressPercent * 2.51} 251`}
                strokeLinecap="round"
              />
            </svg>
            <span className="ring-value">{progressPercent}%</span>
          </div>
          <div className="today-info">
            <span className="today-label">Today&apos;s Progress</span>
            <span className="today-count">{todayStats.completed} / {todayStats.total} <span>habits</span></span>
          </div>
        </div>

        <div className="chart-container">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBarColor(entry.rate, entry.isFuture)}
                    stroke={entry.isCurrentDay ? 'var(--text-primary)' : 'none'}
                    strokeWidth={entry.isCurrentDay ? 2 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="metrics-grid">
          <div className="metric-card">
            <span className="metric-label">vs Yesterday</span>
            <div className={`metric-value ${todayVsYesterday > 0 ? 'up' : todayVsYesterday < 0 ? 'down' : ''}`}>
              {todayVsYesterday > 0 && <ArrowUp size={16} />}
              {todayVsYesterday < 0 && <ArrowDown size={16} />}
              {todayVsYesterday === 0 ? 'Same' : `${Math.abs(todayVsYesterday)} habit${Math.abs(todayVsYesterday) !== 1 ? 's' : ''}`}
            </div>
          </div>
          <div className="metric-card">
            <span className="metric-label">Week Average</span>
            <div className="metric-value">
              <Target size={16} />
              {weekAverage}%
            </div>
          </div>
          <div className="metric-card">
            <span className="metric-label">Best Day</span>
            <div className="metric-value">{bestDay ? `${bestDay.day} (${bestDay.rate}%)` : '-'}</div>
          </div>
          <div className="metric-card">
            <span className="metric-label">Best Streak</span>
            <div className="metric-value streak">
              <Flame size={16} />
              {bestStreak}d
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .analytics-overlay {
          position: fixed;
          inset: 0;
          background: var(--overlay-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
          animation: fadeIn 0.2s ease;
        }

        .analytics-modal {
          width: 100%;
          max-width: 420px;
          max-height: 90vh;
          overflow-y: auto;
          background: var(--glass-bg);
          backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          border-radius: 24px;
          padding: 20px;
          position: relative;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .modal-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 36px;
          height: 36px;
          border-radius: 12px;
          border: none;
          background: var(--glass-card-bg);
          color: var(--text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .analytics-header {
          margin-bottom: 20px;
        }

        .analytics-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
        }

        .title-icon {
          color: var(--success);
        }

        .analytics-title h2 {
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }

        .week-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .week-nav button {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid var(--glass-card-border);
          background: var(--glass-card-bg);
          color: var(--text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .week-nav button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .week-label {
          text-align: center;
        }

        .week-dates {
          display: block;
          font-size: 14px;
          font-weight: 500;
        }

        .week-name {
          display: block;
          font-size: 11px;
          color: var(--text-muted);
        }

        .today-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: var(--success-bg);
          border-radius: 16px;
          margin-bottom: 20px;
        }

        .today-ring {
          position: relative;
          width: 64px;
          height: 64px;
          flex-shrink: 0;
        }

        .today-ring svg {
          transform: rotate(-90deg);
          width: 100%;
          height: 100%;
        }

        .ring-bg {
          stroke: var(--border-subtle);
        }

        .ring-fill {
          stroke: var(--success);
          transition: stroke-dasharray 0.5s ease;
        }

        .ring-value {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 14px;
          font-weight: 700;
          color: var(--success);
        }

        .today-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .today-label {
          font-size: 12px;
          color: var(--text-secondary);
        }

        .today-count {
          font-size: 20px;
          font-weight: 700;
        }

        .today-count span {
          font-size: 14px;
          font-weight: 400;
          color: var(--text-secondary);
        }

        .chart-container {
          margin-bottom: 20px;
        }

        .chart-tooltip {
          background: var(--surface-elevated);
          padding: 10px 14px;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }

        .tooltip-date {
          font-weight: 600;
          margin: 0 0 4px;
        }

        .tooltip-value {
          font-size: 13px;
          margin: 0;
          color: var(--text-secondary);
        }

        .tooltip-rate {
          font-size: 12px;
          margin: 0;
          color: var(--text-muted);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .metric-card {
          padding: 14px;
          background: var(--glass-card-bg);
          border-radius: 14px;
        }

        .metric-label {
          display: block;
          font-size: 11px;
          color: var(--text-muted);
          margin-bottom: 6px;
        }

        .metric-value {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 16px;
          font-weight: 600;
        }

        .metric-value.up {
          color: var(--success);
        }

        .metric-value.down {
          color: var(--danger);
        }

        .metric-value.streak {
          color: #f87171;
        }
      `}</style>
    </div>
  );
};

export default HabitsNew;
