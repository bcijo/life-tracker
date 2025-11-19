import React, { useState } from 'react';
import { Plus, Flame, Check, Calendar as CalendarIcon } from 'lucide-react';
import useLocalStorage from '../hooks/useLocalStorage';
import { v4 as uuidv4 } from 'uuid';
import { format, isToday, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, addMonths } from 'date-fns';

const Habits = () => {
    const [habits, setHabits] = useLocalStorage('habits', []);
    const [showForm, setShowForm] = useState(false);
    const [newHabitName, setNewHabitName] = useState('');
    const [selectedHabit, setSelectedHabit] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const addHabit = (e) => {
        e.preventDefault();
        if (!newHabitName.trim()) return;

        const newHabit = {
            id: uuidv4(),
            name: newHabitName,
            streak: 0,
            history: [],
            color: `hsl(${Math.random() * 360}, 70%, 60%)`,
        };

        setHabits([newHabit, ...habits]);
        setNewHabitName('');
        setShowForm(false);
    };

    const toggleHabitForToday = (id) => {
        setHabits(habits.map(habit => {
            if (habit.id !== id) return habit;

            const today = new Date().toISOString().split('T')[0];
            const lastCompleted = habit.history[0] ? habit.history[0].split('T')[0] : null;

            if (lastCompleted === today) {
                return {
                    ...habit,
                    history: habit.history.slice(1),
                    streak: Math.max(0, habit.streak - 1)
                };
            } else {
                const isConsecutive = lastCompleted === format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
                return {
                    ...habit,
                    history: [new Date().toISOString(), ...habit.history],
                    streak: isConsecutive ? habit.streak + 1 : 1
                };
            }
        }));
    };

    const isCompletedToday = (habit) => {
        if (!habit.history.length) return false;
        return isToday(parseISO(habit.history[0]));
    };

    const isCompletedOnDate = (habit, date) => {
        return habit.history.some(historyDate =>
            isSameDay(parseISO(historyDate), date)
        );
    };

    // Calendar logic
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

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
                    const completed = isCompletedToday(habit);
                    return (
                        <div key={habit.id} className="glass-card" style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <div>
                                    <h3 style={{ marginBottom: '4px' }}>{habit.name}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', opacity: 0.7 }}>
                                        <Flame size={14} color={habit.streak > 0 ? '#ff6b6b' : 'currentColor'} />
                                        <span>{habit.streak} day streak</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => toggleHabitForToday(habit.id)}
                                    style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '12px',
                                        border: completed ? 'none' : '2px solid rgba(0,0,0,0.1)',
                                        background: completed ? habit.color : 'rgba(255,255,255,0.3)',
                                        color: completed ? '#fff' : 'var(--text-secondary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        transform: completed ? 'scale(1.05)' : 'scale(1)',
                                    }}
                                >
                                    <Check size={24} strokeWidth={3} style={{ opacity: completed ? 1 : 0.3 }} />
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
                                            const isCompleted = isCompletedOnDate(habit, day);
                                            const isCurrentDay = isToday(day);
                                            return (
                                                <div
                                                    key={day.toString()}
                                                    style={{
                                                        aspectRatio: '1',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        borderRadius: '6px',
                                                        fontSize: '11px',
                                                        background: isCompleted ? habit.color : 'rgba(0,0,0,0.05)',
                                                        color: isCompleted ? '#fff' : 'var(--text-primary)',
                                                        fontWeight: isCurrentDay ? 'bold' : 'normal',
                                                        border: isCurrentDay ? '2px solid var(--text-primary)' : 'none',
                                                    }}
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
        </div>
    );
};

export default Habits;
