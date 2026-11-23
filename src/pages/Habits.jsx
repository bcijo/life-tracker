import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BarChart2, CalendarDays, Check, Zap, Play, PauseCircle } from 'lucide-react';
import useHabits, { parseLocalDate, getLocalDateStr, calculateHabitStreak } from '../hooks/useHabits';
import { VITAL_SEVEN, isVitalHabit, sortVital } from '../lib/habitPacks';
import { suggestHabitEmojis, hasKeywordEmoji } from '../lib/habitEmoji';
import { suggestHabitEmojisAI } from '../lib/groq';
import useMutualHabits from '../hooks/useMutualHabits';
import { useFriends } from '../hooks/useFriends';
import HabitAnalytics from '../components/HabitAnalytics';
import LiquidGlassSegmented from '../components/common/LiquidGlassSegmented';
import { format, subDays, parse, isToday as isDateToday, getDay } from 'date-fns';
import { GradientOrbs } from '../components/habits/GradientOrbs';
import { BentoGrid } from '../components/habits/BentoGrid';
import { HabitCard } from '../components/habits/HabitCard';
import { WeeklySummary } from '../components/habits/WeeklySummary';
import { HabitDetailModal } from '../components/habits/HabitDetailModal';
import { HabitReorderPage } from '../components/habits/HabitReorderPage';
import DateDisplay from '../components/common/DateDisplay';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_OF_DAY_OPTIONS = [
    { id: 'morning', label: 'Morning', emoji: '☀️', color: '#f59e0b' },
    { id: 'evening', label: 'Evening', emoji: '🌙', color: '#a855f7' },
];

const Habits = () => {
    const {
        habits,
        loading,
        addHabit: addHabitDb,
        updateHabitEmoji,
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
        togglePauseHabit,
        pauseAllHabits,
        unpauseAllHabits,
    } = useHabits();

    const {
        habitToPactMap,
        nudges,
        sendPactInvite,
        sendNudge,
        cancelPact,
        markNudgesAsRead,
    } = useMutualHabits();

    const { friends } = useFriends();

    const [showForm, setShowForm] = useState(false);
    const [newHabitEmoji, setNewHabitEmoji] = useState(null); // null = use the first suggestion
    const [showVital, setShowVital] = useState(() => {
        try { return localStorage.getItem('lt_vital_collapsed') !== '1'; } catch { return true; }
    });
    const [newHabitName, setNewHabitName] = useState('');
    const [selectedDays, setSelectedDays] = useState(ALL_DAYS);
    const [newHabitTimeOfDay, setNewHabitTimeOfDay] = useState('morning');
    const [enableDuoPact, setEnableDuoPact] = useState(false);
    const [duoPartnerId, setDuoPartnerId] = useState('');
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [selectedHabitId, setSelectedHabitId] = useState(null);
    const [showReorder, setShowReorder] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);
    const [showRest, setShowRest] = useState(false);
    const [celebratingId, setCelebratingId] = useState(null);
    const [completedPulse, setCompletedPulse] = useState(false);
    const [selectedDate, setSelectedDate] = useState(() => getLocalDateStr(new Date()));
    const [showVacationModal, setShowVacationModal] = useState(false);
    const [vacationStartDate, setVacationStartDate] = useState(() => getLocalDateStr(new Date()));
    const [vacationLoading, setVacationLoading] = useState(false);
    const [togglingHabitId, setTogglingHabitId] = useState(null);

    const isViewingToday = selectedDate === getLocalDateStr(new Date());

    const handleToggle = (id, newStatus) => {
        setHabitStatus(id, selectedDate, newStatus);
        if (newStatus === 'completed' && isViewingToday) {
            setCelebratingId(id);
            setTimeout(() => setCelebratingId(null), 300);
            setTimeout(() => {
                setCompletedPulse(true);
                setTimeout(() => setCompletedPulse(false), 400);
            }, 350);
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
        const name = newHabitName.trim();
        const chosenEmoji = newHabitEmoji || suggestHabitEmojis(name)[0];
        const res = await addHabitDb(name, selectedDays, newHabitTimeOfDay, { emoji: chosenEmoji });
        const createdHabit = res?.data;

        // No keyword match and no manual pick: let the AI choose a better emoji in the background
        if (!newHabitEmoji && !hasKeywordEmoji(name) && createdHabit?.id) {
            suggestHabitEmojisAI(name)
                .then((emojis) => { if (emojis[0]) updateHabitEmoji(createdHabit.id, emojis[0]); })
                .catch(() => {});
        }

        // If accountability partner was selected, send pact invite
        if (enableDuoPact && duoPartnerId && createdHabit?.id) {
            try {
                await sendPactInvite({
                    partnerId: duoPartnerId,
                    habitName: newHabitName,
                    activeDays: selectedDays,
                    timeOfDay: newHabitTimeOfDay,
                    existingHabitId: createdHabit.id,
                });
            } catch (pactErr) {
                console.error('Failed to send pact invite:', pactErr);
            }
        }

        setNewHabitName('');
        setNewHabitEmoji(null);
        setSelectedDays(ALL_DAYS);
        setNewHabitTimeOfDay('morning');
        setEnableDuoPact(false);
        setDuoPartnerId('');
        setShowForm(false);
    };

    const calculateStreak = (habit) => {
        return calculateHabitStreak(habit, trackingStartDate || null);
    };

    const getDateStatus = (habit) => {
        if (!habit) return null;
        return getStatusForDate(habit, selectedDate);
    };

    const isDateActive = (habit) => {
        if (!habit) return false;
        const date = parseLocalDate(selectedDate);
        const dayOfWeek = date.getDay();
        const activeDays = habit.active_days || ALL_DAYS;
        return activeDays.includes(dayOfWeek);
    };

    // Stats for the actual today (used by BentoGrid, HabitDetailModal)
    const getTodayStatus = (habit) => {
        if (!habit) return null;
        return getStatusForDate(habit, getLocalDateStr(new Date()));
    };

    const getSuccessRate = (habit) => {
        if (!habit) return null;
        const stats = calculateSuccessRate(habit, trackingStartDate || null);
        return stats ? stats.rate : null;
    };

    // habits are already sorted by sort_order via useHabits getSortedHabits
    const sortedHabits = habits;

    const accentColor = '#a855f7';

    return (
        <div className="page-container" style={{ position: 'relative', zIndex: 1, maxWidth: 1080, margin: '0 auto', width: '100%' }}>
            {/* Ambient orbs (only visible in dark theme) */}
            <GradientOrbs />

            {/* Incoming Nudge / High-Five Alert Toast */}
            <AnimatePresence>
                {nudges && nudges.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        style={{
                            marginBottom: 16,
                            padding: '10px 14px',
                            borderRadius: 14,
                            background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(168,85,247,0.18))',
                            border: '1px solid rgba(245,158,11,0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                            position: 'relative',
                            zIndex: 10,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: 8,
                                background: '#f59e0b', color: '#000',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 900, fontSize: 13
                            }}>
                                ⚡
                            </div>
                            <div>
                                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {nudges[0].message}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => markNudgesAsRead(nudges.map(n => n.id))}
                            style={{
                                padding: '5px 12px', borderRadius: 8,
                                background: 'var(--surface-elevated, rgba(255,255,255,0.12))',
                                border: '1px solid var(--border-subtle, rgba(255,255,255,0.15))',
                                color: 'var(--text-primary)', fontSize: 11, fontWeight: 700,
                                cursor: 'pointer', flexShrink: 0
                            }}
                        >
                            Dismiss
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

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
                    <DateDisplay />
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

                    {/* Minimal Pause / Resume Trigger */}
                    {habits.length > 0 && (() => {
                        const pausedCount = habits.filter(h => h.is_paused).length;
                        return (
                            <motion.button
                                whileTap={{ scale: 0.88 }}
                                onClick={() => {
                                    setVacationStartDate(getLocalDateStr(new Date()));
                                    setShowVacationModal(true);
                                }}
                                style={{
                                    height: 36,
                                    padding: pausedCount > 0 ? '0 10px' : '0',
                                    width: pausedCount > 0 ? 'auto' : 36,
                                    borderRadius: 12,
                                    background: pausedCount > 0
                                        ? 'rgba(234,179,8,0.12)'
                                        : 'var(--surface-input, rgba(255,255,255,0.04))',
                                    border: pausedCount > 0
                                        ? '1px solid rgba(234,179,8,0.28)'
                                        : '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                                    color: pausedCount > 0 ? '#eab308' : 'var(--text-secondary, rgba(255,255,255,0.7))',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                                    cursor: 'pointer',
                                    fontSize: 11, fontWeight: 700,
                                }}
                                title={pausedCount > 0 ? `${pausedCount} paused — click to pause or resume` : "Pause habits"}
                            >
                                <PauseCircle size={16} />
                                {pausedCount > 0 && (
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{pausedCount}</span>
                                )}
                            </motion.button>
                        );
                    })()}

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
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0 }}>Track from:</span>
                            <input
                                type="date"
                                value={trackingDateInput}
                                onChange={e => setTrackingDateInput(e.target.value)}
                                max={getLocalDateStr(new Date())}
                                style={{
                                    flex: 1, background: 'var(--surface-input, rgba(255,255,255,0.06))',
                                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.12))', borderRadius: 8,
                                    color: 'var(--text-primary, #fff)', padding: '5px 8px', fontSize: 12, outline: 'none',
                                }}
                            />
                            <button onClick={saveTrackingDate}
                                style={{ padding: '5px 12px', borderRadius: 8, background: '#a855f7', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                Save
                            </button>
                            {trackingStartDate && (
                                <button onClick={clearTrackingDate}
                                    style={{ padding: '5px 10px', borderRadius: 8, background: 'var(--surface-input, rgba(255,255,255,0.06))', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>
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
                            onClick={() => { setTrackingDateInput(trackingStartDate || getLocalDateStr(new Date())); setEditingTrackingDate(true); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 7,
                                padding: '7px 12px', borderRadius: 10,
                                background: 'var(--surface-input, rgba(255,255,255,0.03))',
                                border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                                color: 'var(--text-muted)', fontSize: 11,
                                cursor: 'pointer', width: '100%',
                            }}
                        >
                            <CalendarDays size={13} color={trackingStartDate ? '#a855f7' : 'var(--text-muted)'} />
                            {trackingStartDate
                                ? <><span style={{ color: '#a855f7', fontWeight: 600 }}>Tracking from</span> &nbsp;{format(parseLocalDate(trackingStartDate), 'MMM d, yyyy')} &nbsp;<span style={{ color: 'var(--text-muted)' }}>· tap to edit</span></>
                                : <span>Set a global tracking start date &nbsp;<span style={{ color: 'var(--text-muted)' }}>· tap to set</span></span>
                            }
                        </motion.button>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* Minimal Pause & Resume Modal (All or One-by-One) */}
            <AnimatePresence>
                {showVacationModal && (() => {
                    const pausedCount = habits.filter(h => h.is_paused).length;
                    const activeCount = habits.length - pausedCount;
                    return (
                        <div
                            style={{
                                position: 'fixed', inset: 0, zIndex: 100,
                                background: 'rgba(0, 0, 0, 0.72)',
                                backdropFilter: 'blur(8px)',
                                WebkitBackdropFilter: 'blur(8px)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                padding: 16,
                            }}
                            onClick={() => !vacationLoading && !togglingHabitId && setShowVacationModal(false)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                transition={{ duration: 0.18, ease: 'easeOut' }}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    width: '100%', maxWidth: 400,
                                    background: 'var(--surface-elevated, #161622)',
                                    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))',
                                    borderRadius: 22, padding: '20px',
                                    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                                    position: 'relative', overflow: 'hidden',
                                }}
                            >
                                {/* Header */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{
                                            width: 34, height: 34, borderRadius: 10,
                                            background: pausedCount > 0 ? 'rgba(234,179,8,0.14)' : 'var(--surface-input, rgba(255,255,255,0.06))',
                                            border: pausedCount > 0 ? '1px solid rgba(234,179,8,0.3)' : '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: pausedCount > 0 ? '#eab308' : 'var(--text-secondary)',
                                        }}>
                                            <PauseCircle size={17} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                                                Pause Habits
                                            </h3>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                {pausedCount > 0
                                                    ? `${pausedCount} of ${habits.length} paused · streaks frozen`
                                                    : 'Streaks stay frozen while paused'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowVacationModal(false)}
                                        style={{
                                            width: 28, height: 28, borderRadius: 8,
                                            background: 'var(--surface-input, rgba(255,255,255,0.05))',
                                            border: 'none', color: 'var(--text-muted)',
                                            fontSize: 14, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Bulk Actions Row */}
                                <div style={{
                                    display: 'flex', flexDirection: 'column', gap: 8,
                                    padding: '10px 12px', borderRadius: 14,
                                    background: 'var(--surface-input, rgba(255,255,255,0.03))',
                                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.06))',
                                    marginBottom: 14,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                        {activeCount > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>From:</span>
                                                <input
                                                    type="date"
                                                    value={vacationStartDate}
                                                    max={getLocalDateStr(new Date())}
                                                    onChange={(e) => setVacationStartDate(e.target.value)}
                                                    style={{
                                                        flex: 1, minWidth: 0, padding: '5px 8px', borderRadius: 8,
                                                        background: 'var(--surface-elevated, rgba(255,255,255,0.05))',
                                                        border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                                                        color: 'var(--text-primary, #fff)', fontSize: 11, outline: 'none',
                                                        fontFamily: 'inherit',
                                                    }}
                                                />
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                                            {activeCount > 0 && (
                                                <button
                                                    type="button"
                                                    disabled={vacationLoading}
                                                    onClick={async () => {
                                                        setVacationLoading(true);
                                                        try {
                                                            await pauseAllHabits(vacationStartDate);
                                                        } finally {
                                                            setVacationLoading(false);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '6px 11px', borderRadius: 9,
                                                        background: 'rgba(234,179,8,0.14)',
                                                        border: '1px solid rgba(234,179,8,0.3)',
                                                        color: '#eab308', fontSize: 11, fontWeight: 700,
                                                        cursor: 'pointer', whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {vacationLoading ? '…' : `Pause All (${activeCount})`}
                                                </button>
                                            )}
                                            {pausedCount > 0 && (
                                                <button
                                                    type="button"
                                                    disabled={vacationLoading}
                                                    onClick={async () => {
                                                        setVacationLoading(true);
                                                        try {
                                                            await unpauseAllHabits();
                                                        } finally {
                                                            setVacationLoading(false);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '6px 11px', borderRadius: 9,
                                                        background: 'rgba(34,197,94,0.15)',
                                                        border: '1px solid rgba(34,197,94,0.32)',
                                                        color: '#22c55e', fontSize: 11, fontWeight: 700,
                                                        cursor: 'pointer', whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {vacationLoading ? '…' : `Resume All (${pausedCount})`}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Individual Habits List (One by One) */}
                                <div style={{
                                    display: 'flex', flexDirection: 'column', gap: 6,
                                    maxHeight: 280, overflowY: 'auto', paddingRight: 2,
                                }}>
                                    {sortedHabits.map((h) => {
                                        const hStreak = calculateStreak(h);
                                        const isToggling = togglingHabitId === h.id;
                                        return (
                                            <div
                                                key={h.id}
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '9px 12px', borderRadius: 12,
                                                    background: h.is_paused
                                                        ? 'rgba(234,179,8,0.06)'
                                                        : 'var(--surface-input, rgba(255,255,255,0.03))',
                                                    border: h.is_paused
                                                        ? '1px solid rgba(234,179,8,0.18)'
                                                        : '1px solid var(--border-subtle, rgba(255,255,255,0.05))',
                                                    gap: 10,
                                                }}
                                            >
                                                <div style={{
                                                    minWidth: 0, flex: 1,
                                                    fontSize: 13, fontWeight: 600,
                                                    color: h.is_paused ? 'var(--text-secondary)' : 'var(--text-primary)',
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                }}>
                                                    {h.name}
                                                </div>

                                                {hStreak > 0 && (
                                                    <span style={{
                                                        fontSize: 11, fontWeight: 700,
                                                        color: 'var(--text-muted)',
                                                        display: 'inline-flex', alignItems: 'center', gap: 3,
                                                        flexShrink: 0,
                                                    }}>
                                                        🔥 {hStreak}
                                                    </span>
                                                )}

                                                <button
                                                    type="button"
                                                    disabled={isToggling || vacationLoading}
                                                    onClick={async () => {
                                                        setTogglingHabitId(h.id);
                                                        try {
                                                            await togglePauseHabit(h.id);
                                                        } finally {
                                                            setTogglingHabitId(null);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '5px 10px', borderRadius: 8,
                                                        background: h.is_paused
                                                            ? 'rgba(34,197,94,0.14)'
                                                            : 'var(--surface-elevated, rgba(255,255,255,0.06))',
                                                        border: h.is_paused
                                                            ? '1px solid rgba(34,197,94,0.3)'
                                                            : '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                                                        color: h.is_paused ? '#22c55e' : 'var(--text-secondary)',
                                                        fontSize: 11, fontWeight: 700,
                                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {isToggling ? '…' : h.is_paused ? (
                                                        <><Play size={10} fill="#22c55e" /> Resume</>
                                                    ) : (
                                                        <><PauseCircle size={11} /> Pause</>
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>

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
                            background: 'var(--surface-elevated, rgba(255,255,255,0.04))',
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
                                border: '1px solid var(--border-subtle, rgba(255,255,255,0.10))',
                                borderRadius: 12,
                                background: 'var(--surface-input, rgba(255,255,255,0.05))',
                                color: 'var(--text-primary)',
                                fontSize: 14, outline: 'none',
                                fontFamily: 'inherit',
                            }}
                        />
                        {/* Emoji: suggested from the name; tap another to choose it */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '-4px 0 14px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 2 }}>Icon</span>
                            {suggestHabitEmojis(newHabitName).map((emo, i) => {
                                const active = (newHabitEmoji || suggestHabitEmojis(newHabitName)[0]) === emo;
                                return (
                                    <button
                                        key={emo + i}
                                        type="button"
                                        onClick={() => setNewHabitEmoji(emo)}
                                        aria-label={`Use ${emo}`}
                                        aria-pressed={active}
                                        style={{
                                            width: 36, height: 36, borderRadius: 10, fontSize: 18, cursor: 'pointer',
                                            background: active ? 'var(--surface-input)' : 'transparent',
                                            border: active ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                                        }}
                                    >
                                        {emo}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Apple Liquid Glass Time of Day Selector */}
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Time of Day</p>
                        <div style={{ marginBottom: 14 }}>
                            <LiquidGlassSegmented
                                options={TIME_OF_DAY_OPTIONS}
                                value={newHabitTimeOfDay}
                                onChange={setNewHabitTimeOfDay}
                                size="md"
                                fullWidth={true}
                                ariaLabel="New habit time of day"
                            />
                        </div>

                        {/* Active days */}
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Active Days</p>
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
                                            background: active ? `${color}22` : 'var(--surface-input, rgba(255,255,255,0.04))',
                                            border: active ? `1.5px solid ${color}` : '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                                            color: active ? color : 'var(--text-muted)',
                                            cursor: 'pointer', transition: 'all 0.15s',
                                        }}
                                    >
                                        {label.charAt(0)}
                                    </button>
                                );
                            })}
                        </div>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 14 }}>
                            {selectedDays.length === 7 ? 'Every day' :
                                selectedDays.length === 5 && !selectedDays.includes(0) && !selectedDays.includes(6) ? 'Weekdays only' :
                                    selectedDays.length === 2 && selectedDays.includes(0) && selectedDays.includes(6) ? 'Weekends only' :
                                        `${selectedDays.length} days/week`}
                        </p>

                        {/* Track with Friend (Duo Pact) Option */}
                        {friends && friends.length > 0 && (
                            <div style={{
                                marginBottom: 14, padding: '10px 12px', borderRadius: 12,
                                background: enableDuoPact ? 'rgba(6,182,212,0.1)' : 'var(--surface-input, rgba(255,255,255,0.03))',
                                border: `1px solid ${enableDuoPact ? 'rgba(6,182,212,0.3)' : 'var(--border-subtle, rgba(255,255,255,0.06))'}`,
                                transition: 'all 0.2s',
                            }}>
                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: enableDuoPact ? '#06b6d4' : 'var(--text-secondary)' }}>
                                        🤝 Track with a Friend (Duo)
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={enableDuoPact}
                                        onChange={(e) => setEnableDuoPact(e.target.checked)}
                                        style={{ cursor: 'pointer', accentColor: '#06b6d4', width: 16, height: 16 }}
                                    />
                                </label>
                                {enableDuoPact && (
                                    <div style={{ marginTop: 8 }}>
                                        <select
                                            value={duoPartnerId}
                                            onChange={(e) => setDuoPartnerId(e.target.value)}
                                            style={{
                                                width: '100%', padding: '8px 10px', borderRadius: 8,
                                                background: 'var(--surface-elevated, #1a1a24)',
                                                border: '1px solid var(--border-subtle, rgba(255,255,255,0.15))',
                                                color: 'var(--text-primary, #fff)', fontSize: 11.5,
                                                outline: 'none',
                                            }}
                                        >
                                            <option value="">-- Choose Accountability Partner --</option>
                                            {friends.map(f => {
                                                const friendName = f.display_name?.trim() || f.full_name?.trim() || f.username || 'Friend';
                                                return (
                                                    <option key={f.id} value={f.id}>
                                                        {friendName}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}

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
                        {isViewingToday ? 'Today' : format(parseLocalDate(selectedDate), 'EEE, MMM d')}
                    </h2>
                    <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 9999,
                        background: 'rgba(168,85,247,0.15)', color: '#a855f7',
                        fontFamily: 'var(--font-mono)',
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
                            background: 'var(--surface-input, rgba(255,255,255,0.05))',
                            border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                            color: 'var(--text-secondary, rgba(255,255,255,0.6))', fontSize: 11, fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        ⠿ Reorder
                    </motion.button>
                </motion.div>
            )}

            {/* Habit Cards: the Vital Seven, then personal habits split into pending, completed and rest */}
            {(() => {
                const vitalHabits     = sortVital(sortedHabits);
                const personalHabits  = sortedHabits.filter(h => !isVitalHabit(h));
                const activeHabits    = personalHabits.filter(h => !h.is_paused && isDateActive(h) && (getDateStatus(h) !== 'completed' || h.id === celebratingId));
                const completedHabits = personalHabits.filter(h => !h.is_paused && isDateActive(h) && getDateStatus(h) === 'completed' && h.id !== celebratingId);
                const restHabits      = personalHabits.filter(h => !h.is_paused && !isDateActive(h));
                const vitalDone       = vitalHabits.filter(h => getDateStatus(h) === 'completed').length;
                const toggleVital = () => setShowVital((v) => {
                    try { localStorage.setItem('lt_vital_collapsed', v ? '1' : '0'); } catch { /* ignore */ }
                    return !v;
                });

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
                        onTogglePause={togglePauseHabit}
                        isCelebrating={habit.id === celebratingId}
                        pactInfo={habitToPactMap[habit.id] || null}
                        onSendNudge={sendNudge}
                    />
                );

                const collapsibleSection = (habitsList, show, setShow, label, icon, color, bgColor, pulse = false, dim = true) =>
                    habitsList.length > 0 && (
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
                                    {habitsList.length} {label}
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
                                        {habitsList.map((habit, i) => (
                                            <div key={habit.id} style={dim ? { opacity: 0.85 } : {}}>
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
                        {vitalHabits.length > 0 && (
                            <section className={`vital-panel ${showVital ? 'is-open' : ''}`}>
                                <button type="button" className="vital-head" onClick={toggleVital} aria-expanded={showVital}>
                                    <span className="vital-ring" style={{ '--pct': `${(vitalDone / vitalHabits.length) * 100}%` }}>
                                        <span>{vitalDone}</span>
                                    </span>
                                    <span className="vital-head-text">
                                        <span className="vital-title">{VITAL_SEVEN.name}</span>
                                        <span className="vital-sub">
                                            {vitalDone === vitalHabits.length ? 'All done today 🎉' : `${vitalDone} of ${vitalHabits.length} done today`}
                                        </span>
                                    </span>
                                    <span className="vital-dots" aria-hidden="true">
                                        {vitalHabits.map((h) => (
                                            <span key={h.id} className={getDateStatus(h) === 'completed' ? 'on' : getDateStatus(h) === 'failed' ? 'miss' : ''} />
                                        ))}
                                    </span>
                                    <motion.span animate={{ rotate: showVital ? 180 : 0 }} transition={{ duration: 0.2 }} className="vital-chev">▾</motion.span>
                                </button>
                                <AnimatePresence initial={false}>
                                    {showVital && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                                            style={{ overflow: 'hidden' }}
                                        >
                                            <div className="vital-body">
                                                {vitalHabits.map((habit, i) => (
                                                    <div key={habit.id} style={getDateStatus(habit) === 'completed' ? { opacity: 0.8 } : undefined}>
                                                        {renderCard(habit, i)}
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </section>
                        )}

                        <div className="your-habits-label">
                            <span>Your habits</span>
                            {personalHabits.length > 0 && <span className="your-habits-count">{personalHabits.length}</span>}
                        </div>
                        {personalHabits.length === 0 && !loading && (
                            <div className="your-habits-empty">
                                Add your own habits with <strong>+</strong> at the top. They're private: friends only see your Vital Seven.
                            </div>
                        )}
                        {collapsibleSection(completedHabits, showCompleted, setShowCompleted, 'Completed', '✓', '#22c55e', 'rgba(34,197,94,0.06)', completedPulse)}
                        {collapsibleSection(restHabits, showRest, setShowRest, 'Rest Day', '💤', '#64748b', 'rgba(100,116,139,0.06)')}
                        <AnimatePresence mode="popLayout">
                            {activeHabits.map((habit, i) => renderCard(habit, i))}
                        </AnimatePresence>
                    </div>
                );
            })()}


            {/* Habit Detail Modal */}
            <AnimatePresence>
                {(() => {
                    const selectedHabit = habits.find((h) => h.id === selectedHabitId);
                    if (!selectedHabit) return null;
                    return (
                        <HabitDetailModal
                            habit={selectedHabit}
                            todayStatus={getDateStatus(selectedHabit)}
                            selectedDate={selectedDate}
                            streak={calculateStreak(selectedHabit)}
                            successRate={getSuccessRate(selectedHabit)}
                            isActiveToday={isDateActive(selectedHabit)}
                            getStatusForDate={getStatusForDate}
                            onToggle={(id, newStatus) => setHabitStatus(id, selectedDate, newStatus)}
                            onEmojiChange={updateHabitEmoji}
                            onDelete={async (id) => {
                                setSelectedHabitId(null);
                                await deleteHabitDb(id);
                            }}
                            onSaveEditDays={updateHabitDays}
                            onTimeOfDayChange={updateHabitTimeOfDay}
                            onTogglePause={togglePauseHabit}
                            onCalendarClick={(id, dateStr) => {
                                const habit = habits.find((h) => h.id === id);
                                if (!habit) return;
                                const current = getStatusForDate(habit, dateStr);
                                // 3-state cycle: null -> completed -> failed -> null
                                const nextStatus = current === null ? 'completed' : current === 'completed' ? 'failed' : null;
                                setHabitStatus(id, dateStr, nextStatus);
                            }}
                            onClose={() => setSelectedHabitId(null)}
                            pactInfo={habitToPactMap[selectedHabit.id] || null}
                            friends={friends}
                            onInvitePartner={(partnerId, h) => sendPactInvite({
                                partnerId,
                                habitName: h.name,
                                activeDays: h.active_days || ALL_DAYS,
                                timeOfDay: h.time_of_day || 'morning',
                                existingHabitId: h.id,
                            })}
                            onSendNudge={sendNudge}
                            onCancelPact={cancelPact}
                        />
                    );
                })()}
            </AnimatePresence>

            {/* Reorder overlay */}
            <AnimatePresence>
                {showReorder && (
                    <HabitReorderPage
                        habits={habits.filter(h => !isVitalHabit(h))}
                        onSave={async (ordered) => {
                            await batchUpdateHabitOrders(ordered);
                            setShowReorder(false);
                        }}
                        onClose={() => setShowReorder(false)}
                    />
                )}
            </AnimatePresence>

            <style>{`
                .vital-panel {
                    border-radius: 20px;
                    border: 1px solid var(--glass-card-border);
                    background: var(--glass-card-bg);
                    overflow: hidden;
                }
                .vital-head {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 14px;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    font: inherit;
                    text-align: left;
                }
                .vital-ring {
                    --pct: 0%;
                    width: 42px;
                    height: 42px;
                    flex-shrink: 0;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: conic-gradient(var(--success) var(--pct), var(--border-subtle) 0);
                }
                .vital-ring > span {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--surface-elevated);
                    font-family: var(--font-mono);
                    font-size: 14px;
                    font-weight: 800;
                    color: var(--text-primary);
                }
                .vital-head-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
                .vital-title { font-family: var(--font-display); font-size: 16px; font-weight: 800; color: var(--text-primary); }
                .vital-sub { font-size: 12px; color: var(--text-muted); }
                .vital-dots { display: flex; gap: 4px; flex-shrink: 0; }
                .vital-dots > span {
                    width: 7px; height: 7px; border-radius: 50%;
                    background: var(--border-subtle);
                    box-shadow: inset 0 0 0 1px var(--surface-input-border);
                }
                .vital-dots > span.on { background: var(--success); box-shadow: none; }
                .vital-dots > span.miss { background: var(--danger); box-shadow: none; }
                .vital-chev { font-size: 12px; color: var(--text-muted); flex-shrink: 0; }
                .vital-body {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    padding: 0 10px 12px;
                }
                .your-habits-label {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 6px;
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    color: var(--text-muted);
                }
                .your-habits-count {
                    padding: 1px 7px;
                    border-radius: 999px;
                    background: var(--surface-input);
                    font-size: 11px;
                    letter-spacing: 0;
                }
                .your-habits-empty {
                    padding: 16px;
                    border-radius: 16px;
                    border: 1px dashed var(--border-subtle);
                    font-size: 13px;
                    line-height: 1.5;
                    color: var(--text-muted);
                    text-align: center;
                }
                @media (max-width: 380px) {
                    .vital-dots { display: none; }
                }
            `}</style>
        </div>
    );
};

export default Habits;
