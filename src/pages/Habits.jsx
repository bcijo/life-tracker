import React, { useState } from 'react';
import { Plus, Flame, Check, X, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import useHabits from '../hooks/useHabits';
import { format, isToday, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, addMonths, isFuture, subDays } from 'date-fns';

const Habits = () => {
    const {
        habits,
        loading,
        addHabit: addHabitDb,
        cycleHabitStatus,
        getStatusForDate,
        deleteHabit: deleteHabitDb
    } = useHabits();
    const [showForm, setShowForm] = useState(false);
    const [newHabitName, setNewHabitName] = useState('');
    const [selectedHabit, setSelectedHabit] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const addHabit = async (e) => {
        e.preventDefault();
        if (!newHabitName.trim()) return;

        await addHabitDb(newHabitName);
        setNewHabitName('');
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

    // Calculate streak from history (only counts consecutive 'completed' days)
    const calculateStreak = (habit) => {
        if (!habit.history || habit.history.length === 0) return 0;

        let streak = 0;
        const today = new Date();

        for (let i = 0; i <= 365; i++) {
            const checkDate = subDays(today, i);
            const dateStr = format(checkDate, 'yyyy-MM-dd');

            const status = getStatusForDate(habit, dateStr);

            if (status === 'completed') {
                streak++;
            } else if (status === 'failed') {
                break; // Streak broken by failure
            } else if (i > 0) {
                // For past days, no entry means streak is broken
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

    const getCalendarDayStyle = (status, isCurrentDay, isFutureDay) => {
        let bg = 'rgba(0,0,0,0.05)';
        let color = 'var(--text-primary)';

        if (status === 'completed') {
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
            cursor: isFutureDay ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
        };
    };

    return (
        <div className="page-container">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1>Habits</h1>
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
            </header>

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

                    return (
                        <div key={habit.id} className="glass-card" style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ marginBottom: '4px' }}>{habit.name}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', opacity: 0.7 }}>
                                        <Flame size={14} color={streak > 0 ? '#ff6b6b' : 'currentColor'} />
                                        <span>{streak} day streak</span>
                                    </div>
                                </div>

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

                                {/* Tri-state Toggle Button */}
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
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                                            <div key={idx} style={{ textAlign: 'center', fontSize: '10px', opacity: 0.6, padding: '4px' }}>
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

                                            return (
                                                <div
                                                    key={day.toString()}
                                                    onClick={() => !isFutureDay && handleHabitClick(habit.id, dateStr)}
                                                    style={getCalendarDayStyle(status, isCurrentDay, isFutureDay)}
                                                    title={
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
