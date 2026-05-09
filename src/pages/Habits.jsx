import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BarChart2, CalendarDays, Check } from 'lucide-react';
import useHabits from '../hooks/useHabits';
import HabitAnalytics from '../components/HabitAnalytics';
import { format, subDays, parse, isToday as isDateToday, getDay } from 'date-fns';
import { GradientOrbs } from '../components/habits/GradientOrbs';
import { BentoGrid } from '../components/habits/BentoGrid';
import { HabitCard } from '../components/habits/HabitCard';
import { WeeklySummary } from '../components/habits/WeeklySummary';
import { HabitDetailModal } from '../components/habits/HabitDetailModal';
import { HabitReorderPage } from '../components/habits/HabitReorderPage';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const Habits = () => {
    const {
        habits,
        loading,
        addHabit: addHabitDb,
        updateHabitDays,
        updateHabitTimeOfDay,
        setHabitStatus,
        getStatusForDate,
        getWeeklyStatus,
        isTodayActive,
        deleteHabit: deleteHabitDb,
        markMissedHabits,
        calculateSuccessRate,
        resetHabitStats,
        batchUpdateHabitOrders,
        calculateCheckinStreak,
    } = useHabits();

    const [showForm, setShowForm] = useState(false);
    const [newHabitName, setNewHabitName] = useState('');
    const [selectedDays, setSelectedDays] = useState(ALL_DAYS);
    const [newHabitTimeOfDay, setNewHabitTimeOfDay] = useState('morning');
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [selectedHabitId, setSelectedHabitId] = useState(null);
    const [showReorder, setShowReorder] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);
    const [showRest, setShowRest] = useState(false);
    const [celebratingId, setCelebratingId] = useState(null);
    const [completedPulse, setCompletedPulse] = useState(false);
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const handleToggle = (id, newStatus) => {
        setHabitStatus(id, selectedDate, newStatus);
        if (newStatus === 'completed' && isViewingToday) {
            setCelebratingId(id);
            setTimeout(() => setCelebratingId(null), 850);
            setTimeout(() => {
                setCompletedPulse(true);
                setTimeout(() => setCompletedPulse(false), 600);
            }, 900);
        }
    };

    // Global tracking start date (stored in localStorage)
    const STORAGE_KEY = 'life_tracker_tracking_start';
    const [trackingStartDate, setTrackingStartDate] = useState(() => {
        return localStorage.getItem(STORAGE_KEY) || '';
    });
    const [editingTrackingDate, setEditingTrackingDate] = useState(false);
    const [trackingDateInput, setTrackingDateInput] = useState('');

    const saveTrackingDate = () => {
        if (trackingDateInput) {
            localStorage.setItem(STORAGE_KEY, trackingDateInput);
            setTrackingStartDate(trackingDateInput);
        }
        setEditingTrackingDate(false);
    };

    const clearTrackingDate = () => {
        localStorage.removeItem(STORAGE_KEY);
        setTrackingStartDate('');
        setEditingTrackingDate(false);
    };

    // Auto-mark missed habits on load
    useEffect(() => {
        if (!loading && habits.length > 0) {
            markMissedHabits();
        }
    }, [loading, habits.length]);

    const toggleDay = (day) => {
        setSelectedDays((prev) =>
            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
        );
    };

    const addHabit = async (e) => {
        e.preventDefault();
        if (!newHabitName.trim()) return;
        if (selectedDays.length === 0) { alert('Pick at least one day'); return; }
        await addHabitDb(newHabitName, selectedDays, newHabitTimeOfDay);
        setNewHabitName('');
        setSelectedDays(ALL_DAYS);
        setNewHabitTimeOfDay('morning');
        setShowForm(false);
    };

    const calculateStreak = (habit) => {
        if (!habit.history || habit.history.length === 0) return 0;
        const activeDays = habit.active_days || ALL_DAYS;
        let streak = 0;
        const today = new Date();
        for (let i = 0; i <= 365; i++) {
            const checkDate = subDays(today, i);
            const dateStr = format(checkDate, 'yyyy-MM-dd');
            // Respect global tracking start date
            if (trackingStartDate && dateStr < trackingStartDate) break;
            const dayOfWeek = checkDate.getDay();
            if (!activeDays.includes(dayOfWeek)) continue;
            const status = getStatusForDate(habit, dateStr);
            if (status === 'completed') streak++;
            else if (status === 'failed') break;
            else if (i > 0) break;
        }
        return streak;
    };

    const getDateStatus = (habit) => {
        return getStatusForDate(habit, selectedDate);
    };

    const isDateActive = (habit) => {
        const date = parse(selectedDate, 'yyyy-MM-dd', new Date());
        const dayOfWeek = getDay(date);
        const activeDays = habit.active_days || ALL_DAYS;
        return activeDays.includes(dayOfWeek);
    };

    const isViewingToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

    // Stats for the actual today (used by BentoGrid, HabitDetailModal)
    const getTodayStatus = (habit) => {
        return getStatusForDate(habit, format(new Date(), 'yyyy-MM-dd'));
    };

    const getSuccessRate = (habit) => {
        const stats = calculateSuccessRate(habit, trackingStartDate || null);
        return stats ? stats.rate : null;
    };

    // habits are already sorted by sort_order via useHabits getSortedHabits
    const sortedHabits = habits;

    const today = new Date();
    const todayStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const accentColor = '#a855f7';

    return (
        <div className="page-container" style={{ position: 'relative', zIndex: 1 }}>
            {/* Ambient orbs (only visible in dark theme) */}
            <GradientOrbs />

            {/* Header */}
            <motion.header
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: 20, position: 'relative', zIndex: 2,
                }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
            >
                <div>
                    <h1 style={{
                        margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em',
                        color: 'var(--text-primary)',
                    }}>
                        Your Habits
                    </h1>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                        Stay consistent
                    </span>
                </div>

                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {/* Date pill */}
                    <div style={{
                        padding: '6px 12px', borderRadius: 9999,
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(12px)',
                        display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {format(today, 'MMM d')}
                        </span>
                    </div>

                    {/* Analytics */}
                    <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={() => setShowAnalytics(true)}
                        style={{
                            width: 36, height: 36, borderRadius: 12,
                            background: 'rgba(104,211,145,0.12)',
                            border: 'none',
                            color: '#68d391', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                        title="View Analytics"
                    >
                        <BarChart2 size={18} />
                    </motion.button>

                    {/* Add habit */}
                    <motion.button
                        whileTap={{ scale: 0.88 }}
                        onClick={() => setShowForm((v) => !v)}
                        style={{
                            width: 36, height: 36, borderRadius: 12,
                            background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                            border: 'none',
                            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                        }}
                    >
                        <motion.div animate={{ rotate: showForm ? 45 : 0 }} transition={{ duration: 0.2 }}>
                            <Plus size={20} strokeWidth={2.5} />
                        </motion.div>
                    </motion.button>
                </div>
            </motion.header>

            {/* Tracking date banner */}
            <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{ position: 'relative', zIndex: 2, marginBottom: 16 }}
            >
                <AnimatePresence mode="wait">
                    {editingTrackingDate ? (
                        <motion.div
                            key="edit"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{
                                background: 'rgba(168,85,247,0.08)',
                                border: '1px solid rgba(168,85,247,0.2)',
                                borderRadius: 14, padding: '12px 14px',
                                display: 'flex', alignItems: 'center', gap: 10,
                            }}
                        >
                            <CalendarDays size={14} color="#a855f7" style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', flexShrink: 0 }}>Track from:</span>
                            <input
                                type="date"
                                value={trackingDateInput}
                                onChange={e => setTrackingDateInput(e.target.value)}
                                max={format(new Date(), 'yyyy-MM-dd')}
                                style={{
                                    flex: 1, background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
                                    color: '#fff', padding: '5px 8px', fontSize: 12, outline: 'none',
                                }}
                            />
                            <button onClick={saveTrackingDate}
                                style={{ padding: '5px 12px', borderRadius: 8, background: '#a855f7', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                Save
                            </button>
                            {trackingStartDate && (
                                <button onClick={clearTrackingDate}
                                    style={{ padding: '5px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer' }}>
                                    Clear
                                </button>
                            )}
                        </motion.div>
                    ) : (
                        <motion.button
                            key="display"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => { setTrackingDateInput(trackingStartDate || format(new Date(), 'yyyy-MM-dd')); setEditingTrackingDate(true); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 7,
                                padding: '7px 12px', borderRadius: 10,
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                color: 'rgba(255,255,255,0.45)', fontSize: 11,
                                cursor: 'pointer', width: '100%',
                            }}
                        >
                            <CalendarDays size={13} color={trackingStartDate ? '#a855f7' : 'rgba(255,255,255,0.3)'} />
                            {trackingStartDate
                                ? <><span style={{ color: '#a855f7', fontWeight: 600 }}>Tracking from</span> &nbsp;{format(new Date(trackingStartDate + 'T00:00:00'), 'MMM d, yyyy')} &nbsp;<span style={{ color: 'rgba(255,255,255,0.25)' }}>· tap to edit</span></>
                                : <span>Set a global tracking start date &nbsp;<span style={{ color: 'rgba(255,255,255,0.25)' }}>· tap to set</span></span>
                            }
                        </motion.button>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Analytics Page */}
            <AnimatePresence>
                {showAnalytics && (
                    <HabitAnalytics
                        habits={habits}
                        getStatusForDate={getStatusForDate}
                        onClose={() => setShowAnalytics(false)}
                    />
                )}
            </AnimatePresence>

            {/* Add Habit Form */}
            <AnimatePresence>
                {showForm && (
                    <motion.form
                        onSubmit={addHabit}
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        style={{
                            overflow: 'hidden',
                            marginBottom: 20,
                            background: 'rgba(255,255,255,0.04)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            border: '1px solid rgba(168,85,247,0.25)',
                            borderRadius: 20,
                            padding: 16,
                            position: 'relative', zIndex: 2,
                        }}
                    >
                        {/* Habit name input */}
                        <input
                            type="text"
                            value={newHabitName}
                            onChange={(e) => setNewHabitName(e.target.value)}
                            placeholder="New habit name…"
                            autoFocus
                            style={{
                                width: '100%', padding: '12px 14px', marginBottom: 14,
                                border: '1px solid rgba(255,255,255,0.10)',
                                borderRadius: 12,
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-primary)',
                                fontSize: 14, outline: 'none',
                                fontFamily: 'inherit',
                            }}
                        />

                        {/* Time of day */}
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>Time of Day</p>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                            {[
                                { val: 'morning', label: '☀️ Morning', color: '#f59e0b' },
                                { val: 'evening', label: '🌙 Evening', color: '#a855f7' },
                            ].map(({ val, label, color }) => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => setNewHabitTimeOfDay(val)}
                                    style={{
                                        flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
                                        background: newHabitTimeOfDay === val ? `${color}22` : 'rgba(255,255,255,0.04)',
                                        border: newHabitTimeOfDay === val ? `1.5px solid ${color}` : '1px solid rgba(255,255,255,0.08)',
                                        color: newHabitTimeOfDay === val ? color : 'rgba(255,255,255,0.4)',
                                        cursor: 'pointer', transition: 'all 0.15s',
                                    }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Active days */}
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>Active Days</p>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 6 }}>
                            {DAY_LABELS.map((label, idx) => {
                                const active = selectedDays.includes(idx);
                                const color = newHabitTimeOfDay === 'morning' ? '#f59e0b' : '#a855f7';
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => toggleDay(idx)}
                                        style={{
                                            width: 38, height: 38, borderRadius: 10, fontSize: 11, fontWeight: 700,
                                            background: active ? `${color}22` : 'rgba(255,255,255,0.04)',
                                            border: active ? `1.5px solid ${color}` : '1px solid rgba(255,255,255,0.08)',
                                            color: active ? color : 'rgba(255,255,255,0.3)',
                                            cursor: 'pointer', transition: 'all 0.15s',
                                        }}
                                    >
                                        {label.charAt(0)}
                                    </button>
                                );
                            })}
                        </div>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginBottom: 14 }}>
                            {selectedDays.length === 7 ? 'Every day' :
                                selectedDays.length === 5 && !selectedDays.includes(0) && !selectedDays.includes(6) ? 'Weekdays only' :
                                    selectedDays.length === 2 && selectedDays.includes(0) && selectedDays.includes(6) ? 'Weekends only' :
                                        `${selectedDays.length} days/week`}
                        </p>

                        {/* Submit */}
                        <button
                            type="submit"
                            style={{
                                width: '100%', padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                                border: 'none', color: '#fff', cursor: 'pointer',
                                fontFamily: 'inherit',
                            }}
                        >
                            Start Habit ✨
                        </button>
                    </motion.form>
                )}
            </AnimatePresence>

            {/* Bento Grid Stats */}
            {habits.length > 0 && (
                <div style={{ position: 'relative', zIndex: 2 }}>
                    <BentoGrid
                        habits={habits}
                        calculateSuccessRate={calculateSuccessRate}
                        calculateStreak={calculateStreak}
                        isTodayActive={isTodayActive}
                        getTodayStatus={getTodayStatus}
                        getStatusForDate={getStatusForDate}
                        calculateCheckinStreak={calculateCheckinStreak}
                    />
                </div>
            )}

            {/* Weekly Summary Row */}
            {habits.length > 0 && (
                <div style={{ position: 'relative', zIndex: 2 }}>
                    <WeeklySummary 
                        habits={habits} 
                        getStatusForDate={getStatusForDate}
                        selectedDate={selectedDate}
                        onSelectDate={setSelectedDate}
                    />
                </div>
            )}

            {/* Today / Morning / Evening section header */}
            {sortedHabits.length > 0 && (
                <motion.div
                    style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, position: 'relative', zIndex: 2 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                >
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {isViewingToday ? 'Today' : format(parse(selectedDate, 'yyyy-MM-dd', new Date()), 'EEE, MMM d')}
                    </h2>
                    <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999,
                        background: 'rgba(168,85,247,0.15)', color: '#a855f7',
                        fontFamily: 'monospace',
                    }}>
                        {habits.length} habits
                    </span>
                    {/* Reorder button */}
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowReorder(true)}
                        style={{
                            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px', borderRadius: 8,
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        ⠿ Reorder
                    </motion.button>
                </motion.div>
            )}

            {/* Habit Cards — split into pending, completed, and rest */}
            {(() => {
                const activeHabits    = sortedHabits.filter(h => isDateActive(h) && (getDateStatus(h) !== 'completed' || h.id === celebratingId));
                const completedHabits = sortedHabits.filter(h => isDateActive(h) && getDateStatus(h) === 'completed' && h.id !== celebratingId);
                const restHabits      = sortedHabits.filter(h => !isDateActive(h));

                const renderCard = (habit, index) => (
                    <HabitCard
                        key={habit.id}
                        habit={habit}
                        index={index}
                        todayStatus={getDateStatus(habit)}
                        streak={calculateStreak(habit)}
                        successRate={getSuccessRate(habit)}
                        weeklyStatus={getWeeklyStatus(habit)}
                        isActiveToday={isDateActive(habit)}
                        getStatusForDate={getStatusForDate}
                        onToggle={handleToggle}
                        onSelectHabit={setSelectedHabitId}
                        isCelebrating={habit.id === celebratingId}
                    />
                );

                const collapsibleSection = (habits, show, setShow, label, icon, color, bgColor, pulse = false) =>
                    habits.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={() => setShow(v => !v)}
                                animate={pulse
                                    ? { scale: [1, 1.05, 1], boxShadow: [`0 0 0px ${color}00`, `0 0 18px ${color}60`, `0 0 0px ${color}00`] }
                                    : { scale: 1 }
                                }
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '8px 12px', borderRadius: 12, marginBottom: 8,
                                    background: bgColor, border: `1px solid ${color}25`,
                                    cursor: 'pointer',
                                }}
                            >
                                <span style={{ fontSize: 13 }}>{icon}</span>
                                <span style={{ fontSize: 13, fontWeight: 700, color, flex: 1, textAlign: 'left' }}>
                                    {habits.length} {label}
                                </span>
                                <motion.span
                                    animate={{ rotate: show ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                    style={{ fontSize: 12, color: `${color}90` }}
                                >▾</motion.span>
                            </motion.button>
                            <AnimatePresence>
                                {show && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                                        style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 12 }}
                                    >
                                        {habits.map((habit, i) => (
                                            <div key={habit.id} style={{ opacity: 0.55, filter: 'saturate(0.4)' }}>
                                                {renderCard(habit, activeHabits.length + i)}
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', zIndex: 2 }}>
                        {collapsibleSection(completedHabits, showCompleted, setShowCompleted, 'Completed', '✓', '#22c55e', 'rgba(34,197,94,0.06)', completedPulse)}
                        {collapsibleSection(restHabits, showRest, setShowRest, 'Rest Day', '💤', '#64748b', 'rgba(100,116,139,0.06)')}
                        <AnimatePresence mode="popLayout">
                            {activeHabits.map((habit, i) => renderCard(habit, i))}
                        </AnimatePresence>
                    </div>
                );
            })()}

            {/* Empty state */}
            {habits.length === 0 && !loading && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    style={{
                        textAlign: 'center', padding: '60px 24px',
                        position: 'relative', zIndex: 2,
                    }}
                >
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
                    <h3 style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: 8 }}>
                        No habits yet
                    </h3>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                        Tap the + button to start building your first habit
                    </p>
                </motion.div>
            )}

            {/* Habit Detail Modal */}
            <AnimatePresence>
                {selectedHabitId && (
                    <HabitDetailModal
                        habit={habits.find((h) => h.id === selectedHabitId)}
                        todayStatus={getTodayStatus(habits.find((h) => h.id === selectedHabitId))}
                        streak={calculateStreak(habits.find((h) => h.id === selectedHabitId))}
                        successRate={getSuccessRate(habits.find((h) => h.id === selectedHabitId))}
                        isActiveToday={isTodayActive(habits.find((h) => h.id === selectedHabitId))}
                        getStatusForDate={getStatusForDate}
                        onToggle={(id, newStatus) => setHabitStatus(id, null, newStatus)}
                        onDelete={deleteHabitDb}
                        onSaveEditDays={updateHabitDays}
                        onTimeOfDayChange={updateHabitTimeOfDay}
                        onCalendarClick={(id, dateStr) => {
                            const habit = habits.find((h) => h.id === id);
                            const current = getStatusForDate(habit, dateStr);
                            const nextStatus = current === 'completed' ? 'failed' : 'completed';
                            setHabitStatus(id, dateStr, nextStatus);
                        }}
                        onClose={() => setSelectedHabitId(null)}
                    />
                )}
            </AnimatePresence>
            {/* Reorder overlay */}
            <AnimatePresence>
                {showReorder && (
                    <HabitReorderPage
                        habits={habits}
                        onSave={async (ordered) => {
                            await batchUpdateHabitOrders(ordered);
                            setShowReorder(false);
                        }}
                        onClose={() => setShowReorder(false)}
                    />
                )}
            </AnimatePresence>

        </div>
    );
};

export default Habits;
