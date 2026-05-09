import React, { useState, useEffect } from 'react';
import { Plus, Flame, Check, X, Calendar as CalendarIcon, Trash2, RotateCcw, BarChart2, Edit2 } from 'lucide-react';
import useHabits from '../hooks/useHabits';
import HabitAnalytics from '../components/HabitAnalytics';
import { format, isToday, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, addMonths, isFuture, subDays } from 'date-fns';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LABELS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const Habits = () => {
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
    const [selectedHabit, setSelectedHabit] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [editingDaysFor, setEditingDaysFor] = useState(null);
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
        if (window.confirm('Are you sure you want to delete this habit? This will remove all history.')) {
            await deleteHabitDb(habitId);
            if (selectedHabit === habitId) {
                setSelectedHabit(null);
            }
        }
    };

    const handleResetStats = async (habitId) => {
        if (window.confirm('Reset success tracking? This will clear all history and start fresh from today.')) {
            await resetHabitStats(habitId);
        }
    };

    const startEditDays = (habit) => {
        // Toggle collapse if clicking the same habit's edit button
        if (editingDaysFor === habit.id) {
            setEditingDaysFor(null);
            setEditDays([]);
            return;
        }
        setEditingDaysFor(habit.id);
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
        await updateHabitDays(editingDaysFor, editDays);
        setEditingDaysFor(null);
        setEditDays([]);
    };

    const cancelEditDays = () => {
        setEditingDaysFor(null);
        setEditDays([]);
    };

    // Get success rate color based on percentage
    const getSuccessRateColor = (rate) => {
        if (rate === null) return 'var(--text-secondary)';
        if (rate >= 70) return 'var(--success)';
        if (rate >= 40) return 'var(--warning)';
        return 'var(--danger)';
    };

    // Calculate streak from history (only counts consecutive 'completed' days on active days)
    const calculateStreak = (habit) => {
        if (!habit.history || habit.history.length === 0) return 0;

        const activeDays = habit.active_days || ALL_DAYS;
        let streak = 0;
        const today = new Date();

        for (let i = 0; i <= 365; i++) {
            const checkDate = subDays(today, i);
            const dateStr = format(checkDate, 'yyyy-MM-dd');
            const dayOfWeek = checkDate.getDay();

            // Skip non-active days in streak calculation
            if (!activeDays.includes(dayOfWeek)) {
                continue;
            }

            const status = getStatusForDate(habit, dateStr);

            if (status === 'completed') {
                streak++;
            } else if (status === 'failed') {
                break; // Streak broken by failure
            } else if (i > 0) {
                // For past active days, no entry means streak is broken
                break;
            }
            // For today (i === 0), neutral is okay - streak can continue
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

    // Get button appearance based on status
    const getTickButtonStyle = (status) => {
        if (status === 'completed') {
            return {
                background: 'var(--success)',
                border: 'none',
                color: '#fff',
            };
        } else if (status === 'failed') {
            return {
                background: 'var(--danger)',
                border: 'none',
                color: '#fff',
            };
        }
        return {
            background: 'var(--glass-card-bg)',
            border: '1px solid var(--glass-card-border)',
            color: 'var(--text-secondary)',
        };
    };

    const getCalendarDayStyle = (status, isCurrentDay, isFutureDay, isActive) => {
        let bg = 'var(--glass-card-bg)';
        let color = 'var(--text-primary)';

        if (!isActive) {
            bg = 'var(--border-subtle)';
            color = 'var(--text-muted)';
        } else if (status === 'completed') {
            bg = 'var(--success)';
            color = '#fff';
        } else if (status === 'failed') {
            bg = 'var(--danger)';
            color = '#fff';
        }

        if (isFutureDay) {
            bg = 'var(--border-subtle)';
            color = 'var(--text-muted)';
        }

        return {
            aspectRatio: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            fontSize: '11px',
            background: bg,
            color: color,
            fontWeight: isCurrentDay ? 'bold' : 'normal',
            border: isCurrentDay ? '2px solid var(--accent-primary)' : 'none',
            cursor: isFutureDay || !isActive ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
        };
    };

    // Weekly tracker box style
    const getWeekBoxStyle = (dayStatus) => {
        const { isActive, isFuture, isToday: isCurrentDay, status } = dayStatus;

        let bg = 'var(--glass-card-bg)';
        let borderColor = 'var(--glass-card-border)';

        if (!isActive) {
            bg = 'var(--border-subtle)';
            borderColor = 'transparent';
        } else if (status === 'completed') {
            bg = 'var(--success)';
        } else if (status === 'failed') {
            bg = 'var(--danger)';
        } else if (isFuture) {
            bg = 'var(--border-subtle)';
        }

        return {
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: bg,
            border: isCurrentDay ? '2px solid var(--accent-primary)' : `1px solid ${borderColor}`,
            fontSize: '10px',
            color: status === 'completed' || status === 'failed' ? '#fff' : 'var(--text-muted)',
        };
    };

    // Day selector button component
    const DaySelector = ({ selectedDays, onToggle, size = 'normal' }) => {
        const buttonSize = size === 'small' ? '32px' : '40px';
        const fontSize = size === 'small' ? '11px' : '13px';

        return (
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                {DAY_LABELS.map((label, idx) => (
                    <button
                        key={idx}
                        type="button"
                        onClick={() => onToggle(idx)}
                        style={{
                            width: buttonSize,
                            height: buttonSize,
                            borderRadius: '8px',
                            border: selectedDays.includes(idx) ? 'none' : '1px solid var(--glass-card-border)',
                            background: selectedDays.includes(idx) ? 'var(--success)' : 'var(--glass-card-bg)',
                            color: selectedDays.includes(idx) ? '#fff' : 'var(--text-secondary)',
                            fontSize: fontSize,
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {label.charAt(0)}
                    </button>
                ))}
            </div>
        );
    };

    return (
        <div className="page-container">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1>Habits</h1>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setShowAnalytics(true)}
                        style={{
                            background: 'var(--success-bg)',
                            color: 'var(--success)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                        title="View Analytics"
                    >
                        <BarChart2 size={20} />
                    </button>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        style={{
                            background: 'var(--accent-gradient)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Plus size={24} />
                    </button>
                </div>
            </header>

            {/* Analytics Modal */}
            {showAnalytics && (
                <HabitAnalytics
                    habits={habits}
                    getStatusForDate={getStatusForDate}
                    onClose={() => setShowAnalytics(false)}
                />
            )}

            {showForm && (
                <form onSubmit={addHabit} className="glass-panel" style={{ padding: '16px', marginBottom: '24px' }}>
                    <input
                        type="text"
                        value={newHabitName}
                        onChange={(e) => setNewHabitName(e.target.value)}
                        placeholder="Habit name (e.g., Read 30 mins)"
                        style={{
                            width: '100%',
                            padding: '12px',
                            marginBottom: '12px',
                            border: '1px solid var(--glass-card-border)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--surface-input)',
                            color: 'var(--text-primary)',
                            outline: 'none',
                        }}
                        autoFocus
                    />

                    {/* Time of Day Selector */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500', opacity: 0.8 }}>
                            Time of Day
                        </label>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                                type="button"
                                onClick={() => setNewHabitTimeOfDay('morning')}
                                style={{
                                    padding: '8px 20px',
                                    borderRadius: '20px',
                                    border: 'none',
                                    background: newHabitTimeOfDay === 'morning' ? 'var(--warning)' : 'var(--glass-card-bg)',
                                    color: newHabitTimeOfDay === 'morning' ? '#fff' : 'var(--text-secondary)',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                ☀️ Morning
                            </button>
                            <button
                                type="button"
                                onClick={() => setNewHabitTimeOfDay('evening')}
                                style={{
                                    padding: '8px 20px',
                                    borderRadius: '20px',
                                    border: 'none',
                                    background: newHabitTimeOfDay === 'evening' ? 'var(--accent-primary)' : 'var(--glass-card-bg)',
                                    color: newHabitTimeOfDay === 'evening' ? '#fff' : 'var(--text-secondary)',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                🌙 Evening
                            </button>
                        </div>
                    </div>

                    {/* Day Selector */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500', opacity: 0.8 }}>
                            Active Days
                        </label>
                        <DaySelector selectedDays={selectedDays} onToggle={toggleDay} />
                        <p style={{ fontSize: '11px', opacity: 0.6, marginTop: '8px', textAlign: 'center' }}>
                            {selectedDays.length === 7 ? 'Every day' :
                                selectedDays.length === 5 && !selectedDays.includes(0) && !selectedDays.includes(6) ? 'Weekdays only' :
                                    selectedDays.length === 2 && selectedDays.includes(0) && selectedDays.includes(6) ? 'Weekends only' :
                                        `${selectedDays.length} days/week`}
                        </p>
                    </div>

                    <button
                        type="submit"
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: 'var(--accent-gradient)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: '600',
                        }}
                    >
                        Start Habit
                    </button>
                </form>
            )}

            <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
                {habits.map(habit => {
                    const todayStatus = getTodayStatus(habit);
                    const streak = calculateStreak(habit);
                    const tickStyle = getTickButtonStyle(todayStatus);
                    const successStats = calculateSuccessRate(habit);
                    const weeklyStatus = getWeeklyStatus(habit);
                    const isHabitActiveToday = isTodayActive(habit);
                    const activeDays = habit.active_days || ALL_DAYS;
                    const isEditingDays = editingDaysFor === habit.id;

                    return (
                        <div key={habit.id} className="glass-card" style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <h3 style={{ margin: 0 }}>{habit.name}</h3>
                                        {/* Time of Day Pill - Clickable to toggle */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newTime = (habit.time_of_day || 'morning') === 'morning' ? 'evening' : 'morning';
                                                handleTimeOfDayChange(habit.id, newTime);
                                            }}
                                            style={{
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontSize: '10px',
                                                fontWeight: '600',
                                                background: (habit.time_of_day || 'morning') === 'morning' ? 'var(--warning-bg)' : 'var(--glass-card-bg)',
                                                color: (habit.time_of_day || 'morning') === 'morning' ? 'var(--warning)' : 'var(--accent-primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                            }}
                                            title={`Click to switch to ${(habit.time_of_day || 'morning') === 'morning' ? 'evening' : 'morning'}`}
                                        >
                                            {(habit.time_of_day || 'morning') === 'morning' ? '☀️' : '🌙'}
                                            {(habit.time_of_day || 'morning') === 'morning' ? 'Morning' : 'Evening'}
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', opacity: 0.7 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Flame size={14} color={streak > 0 ? '#ff6b6b' : 'currentColor'} />
                                            <span>{streak} day streak</span>
                                        </div>
                                        {successStats.rate !== null && (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                color: getSuccessRateColor(successStats.rate),
                                                fontWeight: '500'
                                            }}>
                                                <span style={{ fontSize: '11px' }}>•</span>
                                                <span>{successStats.rate}% success</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Edit Days Button */}
                                <button
                                    onClick={() => startEditDays(habit)}
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: 'var(--glass-card-bg)',
                                        color: 'var(--text-secondary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        marginRight: '8px',
                                    }}
                                    title="Edit active days"
                                >
                                    <Edit2 size={14} />
                                </button>

                                {/* Delete Button */}
                                <button
                                    onClick={() => handleDeleteHabit(habit.id)}
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: 'var(--danger-bg)',
                                        color: 'var(--danger)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        marginRight: '8px',
                                    }}
                                    title="Delete habit"
                                >
                                    <Trash2 size={16} />
                                </button>

                                {/* Tri-state Toggle Button - Only show if today is an active day */}
                                {isHabitActiveToday ? (
                                    <button
                                        onClick={() => handleHabitClick(habit.id)}
                                        style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            transform: todayStatus ? 'scale(1.05)' : 'scale(1)',
                                            cursor: 'pointer',
                                            ...tickStyle,
                                        }}
                                        title={
                                            todayStatus === 'completed' ? 'Click: mark as failed' :
                                                todayStatus === 'failed' ? 'Click: clear status' :
                                                    'Click: mark as completed'
                                        }
                                    >
                                        {todayStatus === 'completed' && <Check size={24} strokeWidth={3} />}
                                        {todayStatus === 'failed' && <X size={24} strokeWidth={3} />}
                                        {!todayStatus && <Check size={24} strokeWidth={3} style={{ opacity: 0.3 }} />}
                                    </button>
                                ) : (
                                    <div
                                        style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: 'var(--border-subtle)',
                                            border: '2px dashed var(--glass-card-border)',
                                            fontSize: '9px',
                                            color: 'var(--text-secondary)',
                                            textAlign: 'center',
                                            lineHeight: '1.2',
                                        }}
                                        title="Rest day - habit not active today"
                                    >
                                        Rest<br />Day
                                    </div>
                                )}
                            </div>

                            {/* Edit Days Panel */}
                            {isEditingDays && (
                                <div style={{
                                    marginBottom: '12px',
                                    padding: '12px',
                                    background: 'rgba(0,0,0,0.03)',
                                    borderRadius: 'var(--radius-sm)'
                                }}>
                                    {/* Time of Day Toggle */}
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
                                            Time of Day
                                        </label>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleTimeOfDayChange(habit.id, 'morning')}
                                                style={{
                                                    padding: '6px 14px',
                                                    borderRadius: '16px',
                                                    border: 'none',
                                                    background: (habit.time_of_day || 'morning') === 'morning' ? 'var(--warning)' : 'var(--glass-card-bg)',
                                                    color: (habit.time_of_day || 'morning') === 'morning' ? '#fff' : 'var(--text-secondary)',
                                                    fontSize: '11px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                }}
                                            >
                                                ☀️ Morning
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleTimeOfDayChange(habit.id, 'evening')}
                                                style={{
                                                    padding: '6px 14px',
                                                    borderRadius: '16px',
                                                    border: 'none',
                                                    background: (habit.time_of_day || 'morning') === 'evening' ? 'var(--accent-primary)' : 'var(--glass-card-bg)',
                                                    color: (habit.time_of_day || 'morning') === 'evening' ? '#fff' : 'var(--text-secondary)',
                                                    fontSize: '11px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                }}
                                            >
                                                🌙 Evening
                                            </button>
                                        </div>
                                    </div>

                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
                                        Edit Active Days
                                    </label>
                                    <DaySelector selectedDays={editDays} onToggle={toggleEditDay} size="small" />
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={cancelEditDays}
                                            style={{
                                                padding: '6px 16px',
                                                background: 'var(--glass-card-bg)',
                                                border: '1px solid var(--glass-card-border)',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                color: 'var(--text-secondary)',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={saveEditDays}
                                            style={{
                                                padding: '6px 16px',
                                                background: 'var(--success)',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                fontWeight: '500',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Weekly Tracker */}
                            <div style={{
                                marginBottom: '12px',
                                padding: '10px 12px',
                                background: 'rgba(0,0,0,0.02)',
                                borderRadius: 'var(--radius-sm)'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '6px'
                                }}>
                                    <span style={{ fontSize: '11px', fontWeight: '500', opacity: 0.6 }}>This Week</span>
                                    <span style={{ fontSize: '10px', opacity: 0.5 }}>
                                        {activeDays.length === 7 ? 'Every day' : `${activeDays.length} days/week`}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'space-between' }}>
                                    {weeklyStatus.map((dayStatus, idx) => (
                                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                            <div style={getWeekBoxStyle(dayStatus)}>
                                                {dayStatus.status === 'completed' && <Check size={14} strokeWidth={3} />}
                                                {dayStatus.status === 'failed' && <X size={12} strokeWidth={3} />}
                                                {!dayStatus.isActive && <span style={{ fontSize: '8px' }}>—</span>}
                                            </div>
                                            <span style={{
                                                fontSize: '9px',
                                                opacity: dayStatus.isActive ? 0.6 : 0.3,
                                                fontWeight: dayStatus.isToday ? '700' : '400'
                                            }}>
                                                {DAY_LABELS_SHORT[idx]}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={() => setSelectedHabit(selectedHabit === habit.id ? null : habit.id)}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    background: 'var(--glass-card-bg)',
                                    border: '1px solid var(--glass-card-border)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                    opacity: 0.7,
                                    cursor: 'pointer',
                                }}
                            >
                                <CalendarIcon size={14} />
                                {selectedHabit === habit.id ? 'Hide Calendar' : 'View Calendar'}
                            </button>

                            {selectedHabit === habit.id && (
                                <div style={{ marginTop: '16px', padding: '12px', background: 'var(--glass-card-bg)', border: '1px solid var(--glass-card-border)', borderRadius: 'var(--radius-sm)' }}>
                                    {/* Success Stats Header */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '12px',
                                        padding: '8px 10px',
                                        background: 'var(--glass-card-bg)',
                                        borderRadius: '8px',
                                    }}>
                                        <div style={{ fontSize: '11px', opacity: 0.7 }}>
                                            {successStats.startDate ? (
                                                <span>Tracking since <strong>{format(new Date(successStats.startDate), 'MMM d, yyyy')}</strong></span>
                                            ) : (
                                                <span>No tracking data yet</span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleResetStats(habit.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '4px 8px',
                                                fontSize: '10px',
                                                background: 'var(--glass-card-bg)',
                                                border: '1px solid var(--glass-card-border)',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                opacity: 0.7,
                                                transition: 'opacity 0.2s',
                                            }}
                                            title="Reset tracking and start fresh"
                                        >
                                            <RotateCcw size={10} />
                                            Reset
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <button
                                            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                fontSize: '18px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            ←
                                        </button>
                                        <span style={{ fontWeight: '600', fontSize: '14px' }}>
                                            {format(currentMonth, 'MMMM yyyy')}
                                        </span>
                                        <button
                                            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                fontSize: '18px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            →
                                        </button>
                                    </div>

                                    {/* Legend */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'center',
                                        gap: '16px',
                                        marginBottom: '12px',
                                        fontSize: '10px',
                                        opacity: 0.8,
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--success)' }} />
                                            <span>Done</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--danger)' }} />
                                            <span>Missed</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--border-subtle)' }} />
                                            <span>Pending</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--glass-card-bg)', border: '1px dashed var(--glass-card-border)' }} />
                                            <span>Rest</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                                            <div key={idx} style={{
                                                textAlign: 'center',
                                                fontSize: '10px',
                                                opacity: activeDays.includes(idx) ? 0.6 : 0.3,
                                                padding: '4px',
                                                fontWeight: activeDays.includes(idx) ? '500' : '400'
                                            }}>
                                                {day}
                                            </div>
                                        ))}

                                        {/* Empty cells for days before month starts */}
                                        {Array.from({ length: monthStart.getDay() }).map((_, idx) => (
                                            <div key={`empty-${idx}`} />
                                        ))}

                                        {daysInMonth.map(day => {
                                            const dateStr = format(day, 'yyyy-MM-dd');
                                            const status = getStatusForDate(habit, dateStr);
                                            const isCurrentDay = isToday(day);
                                            const isFutureDay = isFuture(day);
                                            const dayOfWeek = day.getDay();
                                            const isActive = activeDays.includes(dayOfWeek);

                                            return (
                                                <div
                                                    key={day.toString()}
                                                    onClick={() => !isFutureDay && isActive && handleHabitClick(habit.id, dateStr)}
                                                    style={getCalendarDayStyle(status, isCurrentDay, isFutureDay, isActive)}
                                                    title={
                                                        !isActive ? 'Rest day' :
                                                            isFutureDay ? 'Cannot mark future days' :
                                                                status === 'completed' ? 'Completed - click to change' :
                                                                    status === 'failed' ? 'Missed - click to change' :
                                                                        'Click to mark as completed'
                                                    }
                                                >
                                                    {format(day, 'd')}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {habits.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: '40px', opacity: 0.6 }}>
                    <p>No habits yet. Add your first habit to start tracking!</p>
                </div>
            )}
        </div>
    );
};

export default Habits;
