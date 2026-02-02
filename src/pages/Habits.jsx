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

        await addHabitDb(newHabitName, selectedDays);
        setNewHabitName('');
        setSelectedDays(ALL_DAYS);
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
        setEditingDaysFor(habit.id);
        setEditDays(habit.active_days || ALL_DAYS);
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
        if (rate >= 70) return '#48bb78';
        if (rate >= 40) return '#ecc94b';
        return '#f56565';
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
                background: '#48bb78',
                border: 'none',
                color: '#fff',
            };
        } else if (status === 'failed') {
            return {
                background: '#f56565',
                border: 'none',
                color: '#fff',
            };
        }
        return {
            background: 'rgba(255,255,255,0.3)',
            border: '2px solid rgba(0,0,0,0.1)',
            color: 'var(--text-secondary)',
        };
    };

    const getCalendarDayStyle = (status, isCurrentDay, isFutureDay, isActive) => {
        let bg = 'rgba(0,0,0,0.05)';
        let color = 'var(--text-primary)';

        if (!isActive) {
            bg = 'rgba(0,0,0,0.02)';
            color = 'rgba(0,0,0,0.25)';
        } else if (status === 'completed') {
            bg = '#48bb78';
            color = '#fff';
        } else if (status === 'failed') {
            bg = '#f56565';
            color = '#fff';
        }

        if (isFutureDay) {
            bg = 'rgba(0,0,0,0.02)';
            color = 'rgba(0,0,0,0.3)';
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
            border: isCurrentDay ? '2px solid var(--text-primary)' : 'none',
            cursor: isFutureDay || !isActive ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
        };
    };

    // Weekly tracker box style
    const getWeekBoxStyle = (dayStatus) => {
        const { isActive, isFuture, isToday: isCurrentDay, status } = dayStatus;

        let bg = 'rgba(0,0,0,0.08)'; // Pending
        let borderColor = 'transparent';

        if (!isActive) {
            bg = 'rgba(0,0,0,0.03)';
            borderColor = 'rgba(0,0,0,0.05)';
        } else if (status === 'completed') {
            bg = '#48bb78';
        } else if (status === 'failed') {
            bg = '#f56565';
        } else if (isFuture) {
            bg = 'rgba(0,0,0,0.04)';
        }

        return {
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: bg,
            border: isCurrentDay ? '2px solid var(--text-primary)' : `1px solid ${borderColor}`,
            fontSize: '10px',
            color: status === 'completed' || status === 'failed' ? '#fff' : 'rgba(0,0,0,0.4)',
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
                            border: selectedDays.includes(idx) ? 'none' : '2px solid rgba(0,0,0,0.1)',
                            background: selectedDays.includes(idx) ? '#48bb78' : 'rgba(255,255,255,0.5)',
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
                            background: 'rgba(72, 187, 120, 0.1)',
                            color: '#48bb78',
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
                            background: 'var(--text-primary)',
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
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(255,255,255,0.5)',
                        }}
                        autoFocus
                    />

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
                            background: 'var(--text-primary)',
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
                                    <h3 style={{ marginBottom: '4px' }}>{habit.name}</h3>
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
                                        background: 'rgba(0, 0, 0, 0.05)',
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
                                        background: 'rgba(245, 101, 101, 0.1)',
                                        color: '#f56565',
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
                                            background: 'rgba(0,0,0,0.03)',
                                            border: '2px dashed rgba(0,0,0,0.1)',
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
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
                                        Edit Active Days
                                    </label>
                                    <DaySelector selectedDays={editDays} onToggle={toggleEditDay} size="small" />
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={cancelEditDays}
                                            style={{
                                                padding: '6px 16px',
                                                background: 'rgba(0,0,0,0.05)',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={saveEditDays}
                                            style={{
                                                padding: '6px 16px',
                                                background: '#48bb78',
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
                                    background: 'rgba(0,0,0,0.05)',
                                    border: 'none',
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
                                <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(255,255,255,0.3)', borderRadius: 'var(--radius-sm)' }}>
                                    {/* Success Stats Header */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '12px',
                                        padding: '8px 10px',
                                        background: 'rgba(0,0,0,0.03)',
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
                                                background: 'rgba(0,0,0,0.05)',
                                                border: 'none',
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
                                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#48bb78' }} />
                                            <span>Done</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f56565' }} />
                                            <span>Missed</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(0,0,0,0.1)' }} />
                                            <span>Pending</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(0,0,0,0.02)', border: '1px dashed rgba(0,0,0,0.2)' }} />
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
