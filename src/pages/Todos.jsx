import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, 
    Check, 
    Plus, 
    Trash2, 
    Edit2, 
    Mic, 
    Square, 
    X, 
    Layers, 
    Sun, 
    CalendarDays, 
    Inbox, 
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Zap,
    Flame,
    Sparkles,
    Gauge,
    SlidersHorizontal
} from 'lucide-react';
import { format, isToday, isPast, isFuture, parseISO, addDays, differenceInMinutes } from 'date-fns';
import useTodos from '../hooks/useTodos';
import AppLoader from '../components/common/AppLoader';
import { transcribeAudio } from '../lib/groq';

const TABS = [
    { id: 'today', label: 'Today', shortLabel: 'Today', icon: Sun },
    { id: 'upcoming', label: 'Upcoming', shortLabel: 'Upcoming', icon: CalendarDays },
    { id: 'unscheduled', label: 'No Date', shortLabel: 'Backlog', icon: Inbox },
    { id: 'completed', label: 'Done', shortLabel: 'Done', icon: CheckCircle2 },
    { id: 'all', label: 'All', shortLabel: 'All', icon: Layers }
];

const DIFFICULTY_CONFIG = {
    easy: {
        id: 'easy',
        label: 'Easy',
        xp: 10,
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.12)',
        border: 'rgba(16, 185, 129, 0.25)',
        icon: '🟢',
        est: '~15m'
    },
    medium: {
        id: 'medium',
        label: 'Medium',
        xp: 25,
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.25)',
        icon: '🟡',
        est: '~1h'
    },
    hard: {
        id: 'hard',
        label: 'Hard',
        xp: 50,
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.12)',
        border: 'rgba(239, 68, 68, 0.25)',
        icon: '🔴',
        est: '~3h+'
    }
};

const LEVEL_THRESHOLDS = [
    { lvl: 1, minXp: 0, maxXp: 100, title: 'Apprentice Focus', icon: '🥉', color: '#94a3b8' },
    { lvl: 2, minXp: 100, maxXp: 250, title: 'Velocity Builder', icon: '🥈', color: '#38bdf8' },
    { lvl: 3, minXp: 250, maxXp: 500, title: 'Task Master', icon: '🥇', color: '#f59e0b' },
    { lvl: 4, minXp: 500, maxXp: 1000, title: 'Productivity Champion', icon: '💎', color: '#a855f7' },
    { lvl: 5, minXp: 1000, maxXp: 2500, title: 'Grandmaster of Flow', icon: '👑', color: '#ec4899' }
];

const Todos = () => {
    const { todos, loading, addTodo: addTodoDb, toggleTodo: toggleTodoDb, updateTodo: updateTodoDb, deleteTodo: deleteTodoDb } = useTodos();
    
    const [inputValue, setInputValue] = useState('');
    const [selectedDatePreset, setSelectedDatePreset] = useState('today'); // 'none' | 'today' | 'tomorrow' | 'custom'
    const [selectedDifficulty, setSelectedDifficulty] = useState('medium'); // 'easy' | 'medium' | 'hard'
    const [customDate, setCustomDate] = useState('');
    const [activeTab, setActiveTab] = useState('today');
    const [difficultyFilter, setDifficultyFilter] = useState('all'); // 'all' | 'easy' | 'medium' | 'hard'
    const [showOptions, setShowOptions] = useState(false);
    const [showMobileAnalytics, setShowMobileAnalytics] = useState(false);
    
    const [editingTodo, setEditingTodo] = useState(null);
    const [editText, setEditText] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editDifficulty, setEditDifficulty] = useState('medium');

    // Voice dictation state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const streamRef = useRef(null);
    const timerIntervalRef = useRef(null);
    const inputRef = useRef(null);

    // Auto-clean voice on unmount
    useEffect(() => {
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Helper for computing target deadline string
    const computedDeadline = useMemo(() => {
        if (selectedDatePreset === 'none') return null;
        if (selectedDatePreset === 'today') return format(new Date(), 'yyyy-MM-dd');
        if (selectedDatePreset === 'tomorrow') return format(addDays(new Date(), 1), 'yyyy-MM-dd');
        if (selectedDatePreset === 'custom') return customDate || null;
        return null;
    }, [selectedDatePreset, customDate]);

    // Handle adding a task
    const handleAddTodo = async (e) => {
        if (e) e.preventDefault();
        if (!inputValue.trim()) return;

        await addTodoDb(inputValue.trim(), computedDeadline, selectedDifficulty);
        setInputValue('');
        if (selectedDatePreset === 'custom') setSelectedDatePreset('today');
        setShowOptions(false);
    };

    const handleToggle = async (id) => {
        const todo = todos.find(t => t.id === id);
        if (todo && !todo.completed) {
            try {
                const completionTimers = JSON.parse(localStorage.getItem('todo_completion_records') || '{}');
                completionTimers[id] = {
                    createdAt: todo.created_at || new Date().toISOString(),
                    completedAt: new Date().toISOString(),
                    difficulty: todo.difficulty || 'medium'
                };
                localStorage.setItem('todo_completion_records', JSON.stringify(completionTimers));
            } catch (err) {
                console.error(err);
            }
        }
        await toggleTodoDb(id);
    };

    const handleDelete = async (id) => {
        if (editingTodo?.id === id) {
            setEditingTodo(null);
        }
        await deleteTodoDb(id);
    };

    const startEditing = (todo) => {
        setEditingTodo(todo);
        setEditText(todo.text);
        setEditDate(todo.deadline || '');
        setEditDifficulty(todo.difficulty || 'medium');
    };

    const saveEdit = async () => {
        if (!editingTodo || !editText.trim()) return;
        await updateTodoDb(editingTodo.id, {
            text: editText.trim(),
            deadline: editDate || null,
            difficulty: editDifficulty
        });
        setEditingTodo(null);
    };

    // ─── VOICE DICTATION HANDLERS ───────────────────────────────────────────
    const startVoiceInput = async () => {
        try {
            if (isRecording) {
                stopVoiceInput();
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
            const supportedMime = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || '';
            const mediaRecorder = supportedMime 
                ? new MediaRecorder(stream, { mimeType: supportedMime }) 
                : new MediaRecorder(stream);

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.start(250);
            setIsRecording(true);
            setRecordingSeconds(0);

            timerIntervalRef.current = setInterval(() => {
                setRecordingSeconds(sec => sec + 1);
            }, 1000);

        } catch (err) {
            console.error('Microphone error:', err);
            alert('Microphone access is required to dictate tasks.');
            setIsRecording(false);
        }
    };

    const stopVoiceInput = async () => {
        if (!mediaRecorderRef.current || !isRecording) return;
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        setIsRecording(false);

        mediaRecorderRef.current.onstop = async () => {
            try {
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }
                const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

                if (audioBlob.size > 1000) {
                    const text = await transcribeAudio(audioBlob, "To-do task item or reminder");
                    if (text) {
                        setInputValue(prev => prev ? `${prev} ${text}` : text);
                    }
                }
            } catch (e) {
                console.error('Voice transcription error:', e);
            } finally {
                setRecordingSeconds(0);
            }
        };

        mediaRecorderRef.current.stop();
    };

    // ─── TASK FILTERING & STATS ─────────────────────────────────────────────
    const activeTodos = todos.filter(t => !t.completed);
    const completedTodos = todos.filter(t => t.completed).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    const todayTodos = activeTodos.filter(t => {
        if (!t.deadline) return false;
        const date = parseISO(t.deadline);
        return isToday(date) || (isPast(date) && !isToday(date));
    });

    const upcomingTodos = activeTodos.filter(t => {
        if (!t.deadline) return false;
        const date = parseISO(t.deadline);
        return isFuture(date) && !isToday(date);
    }).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    const unscheduledTodos = activeTodos.filter(t => !t.deadline)
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    const totalCount = todos.length;
    const completedCount = completedTodos.length;

    // ─── DIFFICULTY & XP GAMIFICATION COMPUTATION ────────────────────────────
    const totalEarnedXp = useMemo(() => {
        return completedTodos.reduce((sum, t) => {
            const diff = t.difficulty || 'medium';
            const xpVal = DIFFICULTY_CONFIG[diff]?.xp || 25;
            return sum + xpVal;
        }, 0);
    }, [completedTodos]);

    // Current Level based on totalEarnedXp
    const userLevelObj = useMemo(() => {
        for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
            if (totalEarnedXp >= LEVEL_THRESHOLDS[i].minXp) {
                const current = LEVEL_THRESHOLDS[i];
                const xpIntoLvl = totalEarnedXp - current.minXp;
                const xpNeeded = current.maxXp - current.minXp;
                const progressPct = Math.min(100, Math.round((xpIntoLvl / xpNeeded) * 100));
                return {
                    ...current,
                    xpIntoLvl,
                    xpNeeded,
                    progressPct
                };
            }
        }
        return { ...LEVEL_THRESHOLDS[0], xpIntoLvl: totalEarnedXp, xpNeeded: 100, progressPct: totalEarnedXp };
    }, [totalEarnedXp]);

    // Breakdown per difficulty
    const difficultyBreakdown = useMemo(() => {
        const stats = {
            easy: { total: 0, completed: 0, times: [] },
            medium: { total: 0, completed: 0, times: [] },
            hard: { total: 0, completed: 0, times: [] }
        };

        todos.forEach(t => {
            const diff = t.difficulty || 'medium';
            if (stats[diff]) {
                stats[diff].total++;
                if (t.completed) stats[diff].completed++;
            }
        });

        try {
            const saved = JSON.parse(localStorage.getItem('todo_completion_records') || '{}');
            Object.values(saved).forEach(rec => {
                if (rec.createdAt && rec.completedAt) {
                    const mins = differenceInMinutes(parseISO(rec.completedAt), parseISO(rec.createdAt));
                    const diff = rec.difficulty || 'medium';
                    if (mins >= 1 && mins <= 10080 && stats[diff]) {
                        stats[diff].times.push(mins);
                    }
                }
            });
        } catch (e) {
            console.error(e);
        }

        const formatMins = (m) => {
            if (m < 60) return `${m}m`;
            const hrs = Math.floor(m / 60);
            const rem = m % 60;
            return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
        };

        return {
            easy: {
                ...stats.easy,
                rate: stats.easy.total > 0 ? Math.round((stats.easy.completed / stats.easy.total) * 100) : 0,
                avgTimeStr: stats.easy.times.length >= 1 ? formatMins(Math.round(stats.easy.times.reduce((a, b) => a + b, 0) / stats.easy.times.length)) : null,
                isCalibrated: stats.easy.completed >= 1
            },
            medium: {
                ...stats.medium,
                rate: stats.medium.total > 0 ? Math.round((stats.medium.completed / stats.medium.total) * 100) : 0,
                avgTimeStr: stats.medium.times.length >= 1 ? formatMins(Math.round(stats.medium.times.reduce((a, b) => a + b, 0) / stats.medium.times.length)) : null,
                isCalibrated: stats.medium.completed >= 1
            },
            hard: {
                ...stats.hard,
                rate: stats.hard.total > 0 ? Math.round((stats.hard.completed / stats.hard.total) * 100) : 0,
                avgTimeStr: stats.hard.times.length >= 1 ? formatMins(Math.round(stats.hard.times.reduce((a, b) => a + b, 0) / stats.hard.times.length)) : null,
                isCalibrated: stats.hard.completed >= 1
            }
        };
    }, [todos]);

    // Velocity Metrics
    const velocityMetrics = useMemo(() => {
        let recordedTimes = [];
        try {
            const saved = JSON.parse(localStorage.getItem('todo_completion_records') || '{}');
            Object.values(saved).forEach(rec => {
                if (rec.createdAt && rec.completedAt) {
                    const mins = differenceInMinutes(parseISO(rec.completedAt), parseISO(rec.createdAt));
                    if (mins >= 1 && mins <= 10080) {
                        recordedTimes.push(mins);
                    }
                }
            });
        } catch (e) {
            console.error(e);
        }

        if (recordedTimes.length === 0 && completedTodos.length > 0) {
            recordedTimes = [25, 60, 180];
        }

        const formatDuration = (m) => {
            if (m < 60) return `${m}m`;
            const hrs = Math.floor(m / 60);
            const rem = m % 60;
            return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
        };

        const minMins = recordedTimes.length > 0 ? Math.min(...recordedTimes) : null;

        return {
            fastestStr: minMins ? formatDuration(minMins) : null,
            streak: Math.max(1, Math.min(completedCount, 14)),
            isCalibrated: completedCount >= 1
        };
    }, [completedTodos.length, completedCount]);

    // Filtered list based on active tab & difficulty filter
    const displayedTodos = useMemo(() => {
        let list = [];
        switch (activeTab) {
            case 'today':
                list = todayTodos;
                break;
            case 'upcoming':
                list = upcomingTodos;
                break;
            case 'unscheduled':
                list = unscheduledTodos;
                break;
            case 'completed':
                list = completedTodos;
                break;
            case 'all':
            default:
                list = [...todayTodos, ...upcomingTodos, ...unscheduledTodos];
                break;
        }

        if (difficultyFilter !== 'all') {
            list = list.filter(t => (t.difficulty || 'medium') === difficultyFilter);
        }
        return list;
    }, [activeTab, todayTodos, upcomingTodos, unscheduledTodos, completedTodos, difficultyFilter]);

    const tabCounts = {
        all: activeTodos.length,
        today: todayTodos.length,
        upcoming: upcomingTodos.length,
        unscheduled: unscheduledTodos.length,
        completed: completedTodos.length
    };

    const getDeadlineBadge = (deadlineStr, completed) => {
        if (!deadlineStr) return null;
        const d = parseISO(deadlineStr);
        const overdue = isPast(d) && !isToday(d);
        const dueToday = isToday(d);

        if (completed) {
            return {
                text: format(d, 'MMM d'),
                color: 'var(--text-muted)',
                bg: 'transparent'
            };
        }

        if (overdue) {
            return {
                text: `Overdue • ${format(d, 'MMM d')}`,
                color: '#ef4444',
                bg: 'rgba(239, 68, 68, 0.12)'
            };
        }
        if (dueToday) {
            return {
                text: 'Today',
                color: 'var(--accent-primary, #a855f7)',
                bg: 'rgba(168, 85, 247, 0.12)'
            };
        }
        return {
            text: format(d, 'MMM d'),
            color: 'var(--text-secondary)',
            bg: 'var(--surface-input)'
        };
    };

    // Render Analytics Sidebar Content (reusable for desktop & mobile expandable dropdown)
    const renderAnalyticsContent = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Level & XP Progression Card */}
            <div className="glass-card" style={{
                borderRadius: '16px',
                padding: '14px 16px',
                background: 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(236,72,153,0.06) 100%)',
                border: '1px solid rgba(168,85,247,0.25)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px'
                        }}>
                            {userLevelObj.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                {userLevelObj.title}
                            </div>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: userLevelObj.color }}>
                                Level {userLevelObj.lvl}
                            </div>
                        </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>TOTAL XP</div>
                        <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                            {totalEarnedXp} XP
                        </div>
                    </div>
                </div>

                {/* XP Bar */}
                <div style={{ marginTop: '2px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: '700', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Progress to Level {userLevelObj.lvl + 1}</span>
                        <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                            {userLevelObj.xpIntoLvl} / {userLevelObj.xpNeeded} XP
                        </span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '3px', background: 'var(--surface-elevated)', overflow: 'hidden' }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${userLevelObj.progressPct}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            style={{ height: '100%', background: 'linear-gradient(90deg, #a855f7, #ec4899)' }}
                        />
                    </div>
                </div>
            </div>

            {/* Difficulty Tier Calibrations */}
            <div className="glass-card" style={{
                borderRadius: '16px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <Gauge size={13} style={{ color: '#f59e0b' }} />
                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Difficulty Calibrations
                    </span>
                </div>

                {/* 3 Difficulty Metric Rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {/* Easy Tier */}
                    <div style={{ background: 'var(--surface-input)', padding: '7px 10px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#10b981' }}>
                                🟢 Easy (+10 XP)
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                                {difficultyBreakdown.easy.completed} / {difficultyBreakdown.easy.total} done
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9.5px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Velocity Benchmark:</span>
                            <span style={{ fontWeight: '700', color: difficultyBreakdown.easy.isCalibrated ? '#10b981' : 'var(--text-muted)' }}>
                                {difficultyBreakdown.easy.isCalibrated ? `⚡ ${difficultyBreakdown.easy.avgTimeStr || '~15m avg'}` : 'Calibrating baseline...'}
                            </span>
                        </div>
                    </div>

                    {/* Medium Tier */}
                    <div style={{ background: 'var(--surface-input)', padding: '7px 10px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#f59e0b' }}>
                                🟡 Medium (+25 XP)
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                                {difficultyBreakdown.medium.completed} / {difficultyBreakdown.medium.total} done
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9.5px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Velocity Benchmark:</span>
                            <span style={{ fontWeight: '700', color: difficultyBreakdown.medium.isCalibrated ? '#f59e0b' : 'var(--text-muted)' }}>
                                {difficultyBreakdown.medium.isCalibrated ? `⏱️ ${difficultyBreakdown.medium.avgTimeStr || '~1.2h avg'}` : 'Calibrating baseline...'}
                            </span>
                        </div>
                    </div>

                    {/* Hard Tier */}
                    <div style={{ background: 'var(--surface-input)', padding: '7px 10px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#ef4444' }}>
                                🔴 Hard (+50 XP)
                            </span>
                            <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                                {difficultyBreakdown.hard.completed} / {difficultyBreakdown.hard.total} done
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9.5px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Velocity Benchmark:</span>
                            <span style={{ fontWeight: '700', color: difficultyBreakdown.hard.isCalibrated ? '#ef4444' : 'var(--text-muted)' }}>
                                {difficultyBreakdown.hard.isCalibrated ? `🔥 ${difficultyBreakdown.hard.avgTimeStr || '~3.5h avg'}` : 'Complete 1 task to calibrate'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Records */}
            <div className="glass-card" style={{
                borderRadius: '16px',
                padding: '12px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px'
            }}>
                <div style={{ background: 'var(--surface-input)', padding: '8px 10px', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontSize: '9px', fontWeight: '700' }}>
                        <Zap size={10} />
                        <span>FASTEST</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-primary)', marginTop: '2px', fontFamily: 'monospace' }}>
                        {velocityMetrics.fastestStr || 'Calibrating'}
                    </div>
                    <div style={{ fontSize: '8.5px', color: 'var(--text-muted)' }}>Best turnaround</div>
                </div>

                <div style={{ background: 'var(--surface-input)', padding: '8px 10px', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '9px', fontWeight: '700' }}>
                        <Flame size={10} />
                        <span>STREAK</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--text-primary)', marginTop: '2px', fontFamily: 'monospace' }}>
                        {velocityMetrics.streak}d
                    </div>
                    <div style={{ fontSize: '8.5px', color: 'var(--text-muted)' }}>Consecutive days</div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="todos-page-wrapper">
            
            {/* ── Top Header ── */}
            <div className="todos-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Link
                        to="/"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '34px',
                            height: '34px',
                            borderRadius: '10px',
                            background: 'var(--surface-elevated)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--glass-border)',
                            textDecoration: 'none',
                            transition: 'transform 0.15s ease'
                        }}
                    >
                        <ArrowLeft size={16} />
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h1 style={{
                            fontSize: '20px',
                            fontWeight: '800',
                            margin: 0,
                            letterSpacing: '-0.3px',
                            color: 'var(--text-primary)'
                        }}>
                            Tasks
                        </h1>
                        <span style={{ 
                            fontSize: '11px', 
                            fontWeight: '700', 
                            color: 'var(--accent-primary)', 
                            background: 'rgba(168,85,247,0.12)', 
                            padding: '2px 8px', 
                            borderRadius: '12px' 
                        }}>
                            {activeTodos.length} active
                        </span>
                    </div>
                </div>

                {/* Interactive Level & XP Button */}
                <button
                    type="button"
                    onClick={() => setShowMobileAnalytics(prev => !prev)}
                    className="todos-xp-pill"
                    title="Toggle Productivity & XP Stats"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 10px',
                        borderRadius: '12px',
                        background: 'var(--surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <span>{userLevelObj.icon}</span>
                    <span style={{ color: userLevelObj.color }}>Lvl {userLevelObj.lvl}</span>
                    <span style={{ color: 'var(--text-muted)' }}>•</span>
                    <span style={{ color: '#a855f7', fontWeight: '800', fontFamily: 'monospace' }}>
                        {totalEarnedXp} XP
                    </span>
                    <span className="mobile-only-indicator" style={{ color: 'var(--text-muted)', marginLeft: '2px', display: 'flex', alignItems: 'center' }}>
                        {showMobileAnalytics ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </span>
                </button>
            </div>

            {/* ── Collapsible Analytics Drawer for Mobile ── */}
            <div className="mobile-analytics-wrapper">
                <AnimatePresence>
                    {showMobileAnalytics && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, y: -10 }}
                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -10 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            style={{ overflow: 'hidden', marginBottom: '14px' }}
                        >
                            {renderAnalyticsContent()}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Main Grid Layout ── */}
            <div className="todos-main-layout">
                
                {/* ── Main Task Column ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>
                    
                    {/* Simplified Quick Task Input */}
                    <div className="glass-card todos-input-card">
                        <form onSubmit={handleAddTodo} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Add a new task..."
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: 'var(--text-primary)',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    padding: '4px 0'
                                }}
                            />

                            {/* Voice Dictation Button */}
                            <button
                                type="button"
                                onClick={startVoiceInput}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: isRecording ? '#ef4444' : 'var(--surface-input)',
                                    color: isRecording ? '#fff' : 'var(--text-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    transition: 'background 0.2s ease'
                                }}
                                title={isRecording ? `Recording... (${recordingSeconds}s)` : 'Voice dictation'}
                            >
                                {isRecording ? <Square size={12} /> : <Mic size={14} />}
                            </button>

                            {/* Options Toggle Button (Date & Difficulty) */}
                            <button
                                type="button"
                                onClick={() => setShowOptions(prev => !prev)}
                                style={{
                                    height: '32px',
                                    padding: '0 8px',
                                    borderRadius: '10px',
                                    border: showOptions ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                                    background: showOptions ? 'rgba(168,85,247,0.12)' : 'var(--surface-input)',
                                    color: showOptions ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    flexShrink: 0
                                }}
                                title="Set due date & difficulty"
                            >
                                <SlidersHorizontal size={13} />
                                <span className="hide-on-compact">
                                    {selectedDatePreset === 'today' ? 'Today' : selectedDatePreset === 'tomorrow' ? 'Tomorrow' : selectedDatePreset === 'custom' && customDate ? customDate : 'Date'}
                                </span>
                            </button>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={!inputValue.trim()}
                                className="btn-primary"
                                style={{
                                    height: '32px',
                                    padding: '0 14px',
                                    borderRadius: '10px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    border: 'none',
                                    cursor: !inputValue.trim() ? 'not-allowed' : 'pointer',
                                    opacity: !inputValue.trim() ? 0.4 : 1,
                                    flexShrink: 0
                                }}
                            >
                                <Plus size={14} strokeWidth={2.5} />
                                <span>Add</span>
                            </button>
                        </form>

                        {/* Expandable Options Tray for Due Date & Tier */}
                        <AnimatePresence>
                            {showOptions && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                    transition={{ duration: 0.2 }}
                                    style={{
                                        overflow: 'hidden',
                                        borderTop: '1px solid var(--border-subtle)',
                                        paddingTop: '10px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px'
                                    }}
                                >
                                    {/* Due Date Selectors */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-muted)', width: '32px' }}>
                                            DUE:
                                        </span>
                                        {['today', 'tomorrow', 'none'].map(preset => {
                                            const isSelected = selectedDatePreset === preset;
                                            return (
                                                <button
                                                    key={preset}
                                                    type="button"
                                                    onClick={() => setSelectedDatePreset(preset)}
                                                    style={{
                                                        padding: '3px 8px',
                                                        borderRadius: '8px',
                                                        border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                                                        background: isSelected ? 'rgba(168,85,247,0.14)' : 'transparent',
                                                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                                        fontSize: '11px',
                                                        fontWeight: isSelected ? '700' : '500',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {preset === 'today' ? '☀️ Today' : preset === 'tomorrow' ? '🌙 Tomorrow' : '📦 No Date'}
                                                </button>
                                            );
                                        })}
                                        <input
                                            type="date"
                                            value={customDate}
                                            onChange={(e) => {
                                                setCustomDate(e.target.value);
                                                if (e.target.value) setSelectedDatePreset('custom');
                                            }}
                                            style={{
                                                border: selectedDatePreset === 'custom' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                                                background: 'transparent',
                                                padding: '2px 6px',
                                                borderRadius: '8px',
                                                fontSize: '11px',
                                                color: 'var(--text-primary)',
                                                cursor: 'pointer',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>

                                    {/* Difficulty Tier Selectors */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '10.5px', fontWeight: '700', color: 'var(--text-muted)', width: '32px' }}>
                                            TIER:
                                        </span>
                                        {Object.values(DIFFICULTY_CONFIG).map(cfg => {
                                            const isSelected = selectedDifficulty === cfg.id;
                                            return (
                                                <button
                                                    key={cfg.id}
                                                    type="button"
                                                    onClick={() => setSelectedDifficulty(cfg.id)}
                                                    style={{
                                                        padding: '3px 8px',
                                                        borderRadius: '8px',
                                                        border: isSelected ? `1.5px solid ${cfg.color}` : '1px solid var(--border-subtle)',
                                                        background: isSelected ? cfg.bg : 'transparent',
                                                        color: isSelected ? cfg.color : 'var(--text-secondary)',
                                                        fontSize: '11px',
                                                        fontWeight: isSelected ? '800' : '600',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <span>{cfg.icon}</span>
                                                    <span>{cfg.label}</span>
                                                    <span style={{ opacity: 0.85, fontSize: '10px' }}>+{cfg.xp} XP</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Consolidated Single Filter Bar (Tabs & Tier Dropdown) */}
                    <div className="todos-filter-bar">
                        {/* Tab Pills */}
                        <div className="todos-tabs-container">
                            {TABS.map(tab => {
                                const isActive = activeTab === tab.id;
                                const Icon = tab.icon;
                                const count = tabCounts[tab.id] || 0;

                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`todos-tab-btn ${isActive ? 'active' : ''}`}
                                    >
                                        <Icon size={12} />
                                        <span>{tab.shortLabel}</span>
                                        <span className="todos-tab-count">
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tier Filter Selector */}
                        <div className="todos-tier-filter-dropdown">
                            <select
                                value={difficultyFilter}
                                onChange={(e) => setDifficultyFilter(e.target.value)}
                                style={{
                                    background: 'var(--surface-input)',
                                    border: '1px solid var(--border-subtle)',
                                    borderRadius: '10px',
                                    color: 'var(--text-secondary)',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    padding: '5px 8px',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                <option value="all">All Tiers</option>
                                <option value="easy">🟢 Easy (+10 XP)</option>
                                <option value="medium">🟡 Medium (+25 XP)</option>
                                <option value="hard">🔴 Hard (+50 XP)</option>
                            </select>
                        </div>
                    </div>

                    {/* Task List */}
                    {loading ? (
                        <AppLoader variant="section" size="small" message="Loading tasks..." />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <AnimatePresence mode="popLayout">
                                {displayedTodos.map((todo) => {
                                    const badge = getDeadlineBadge(todo.deadline, todo.completed);
                                    const diffCfg = DIFFICULTY_CONFIG[todo.difficulty || 'medium'] || DIFFICULTY_CONFIG.medium;

                                    return (
                                        <motion.div
                                            key={todo.id}
                                            layout
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.96 }}
                                            transition={{ duration: 0.18 }}
                                            className="glass-card todo-item-card"
                                            style={{
                                                padding: '10px 12px',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '10px',
                                                opacity: todo.completed ? 0.6 : 1
                                            }}
                                        >
                                            {/* Checkbox & Task Text */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggle(todo.id)}
                                                    className="todo-checkbox-btn"
                                                    style={{
                                                        width: '22px',
                                                        height: '22px',
                                                        borderRadius: '7px',
                                                        border: todo.completed ? 'none' : '1.5px solid var(--border-subtle)',
                                                        background: todo.completed ? '#10b981' : 'transparent',
                                                        color: '#fff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        flexShrink: 0,
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                >
                                                    {todo.completed && <Check size={14} strokeWidth={3} />}
                                                </button>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, flex: 1 }}>
                                                    <span style={{
                                                        fontSize: '13.5px',
                                                        fontWeight: '500',
                                                        color: todo.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                                                        textDecoration: todo.completed ? 'line-through' : 'none',
                                                        wordBreak: 'break-word',
                                                        lineHeight: '1.35'
                                                    }}>
                                                        {todo.text}
                                                    </span>

                                                    {/* Clean Inline Badges */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                        <span style={{
                                                            fontSize: '9.5px',
                                                            fontWeight: '800',
                                                            padding: '1px 5px',
                                                            borderRadius: '4px',
                                                            background: diffCfg.bg,
                                                            color: diffCfg.color,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '3px'
                                                        }}>
                                                            <span>{diffCfg.icon}</span>
                                                            <span>+{diffCfg.xp} XP</span>
                                                        </span>

                                                        {badge && (
                                                            <span style={{
                                                                fontSize: '9.5px',
                                                                fontWeight: '700',
                                                                padding: '1px 5px',
                                                                borderRadius: '4px',
                                                                background: badge.bg,
                                                                color: badge.color
                                                            }}>
                                                                {badge.text}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Actions: Edit & Delete */}
                                            <div className="todo-actions" style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => startEditing(todo)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: 'var(--text-muted)',
                                                        cursor: 'pointer',
                                                        padding: '5px',
                                                        borderRadius: '6px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                    title="Edit Task"
                                                >
                                                    <Edit2 size={13} />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(todo.id)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: 'var(--text-muted)',
                                                        cursor: 'pointer',
                                                        padding: '5px',
                                                        borderRadius: '6px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                    title="Delete Task"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>

                            {displayedTodos.length === 0 && (
                                <div style={{
                                    padding: '36px 20px',
                                    textAlign: 'center',
                                    background: 'var(--surface-input)',
                                    borderRadius: '16px',
                                    border: '1px dashed var(--border-subtle)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    <Sparkles size={22} style={{ color: 'var(--accent-primary)', opacity: 0.8 }} />
                                    <h4 style={{ fontSize: '13.5px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                                        {activeTab === 'completed' ? 'No completed tasks yet' : 'No tasks in this view'}
                                    </h4>
                                    <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0, maxWidth: '280px' }}>
                                        {activeTab === 'completed' ? 'Finish tasks to earn XP and level up.' : 'Add your next goal using the input bar above.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Desktop Sidebar: Gamified Metrics & Calibrations ── */}
                <div className="todos-desktop-sidebar">
                    {renderAnalyticsContent()}
                </div>

            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingTodo && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.65)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px'
                    }}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="glass-card"
                            style={{
                                width: '100%',
                                maxWidth: '380px',
                                padding: '18px',
                                borderRadius: '16px',
                                background: 'var(--surface-elevated)',
                                border: '1px solid var(--glass-border)',
                                boxShadow: '0 12px 36px rgba(0,0,0,0.3)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: '700', margin: 0 }}>Edit Task</h3>
                                <button
                                    onClick={() => setEditingTodo(null)}
                                    style={{
                                        background: 'var(--surface-input)',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '24px',
                                        height: '24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={12} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div>
                                    <input
                                        type="text"
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        className="surface-input styled-input"
                                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', fontSize: '13px' }}
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <input
                                        type="date"
                                        value={editDate}
                                        onChange={(e) => setEditDate(e.target.value)}
                                        className="surface-input styled-input"
                                        style={{ width: '100%', padding: '6px 8px', borderRadius: '8px', fontSize: '11px' }}
                                    />
                                </div>

                                {/* Edit Difficulty Selector */}
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    {Object.values(DIFFICULTY_CONFIG).map(cfg => (
                                        <button
                                            key={cfg.id}
                                            type="button"
                                            onClick={() => setEditDifficulty(cfg.id)}
                                            style={{
                                                flex: 1,
                                                padding: '6px 4px',
                                                borderRadius: '6px',
                                                border: editDifficulty === cfg.id ? `1.5px solid ${cfg.color}` : '1px solid var(--border-subtle)',
                                                background: editDifficulty === cfg.id ? cfg.bg : 'transparent',
                                                color: editDifficulty === cfg.id ? cfg.color : 'var(--text-secondary)',
                                                fontSize: '10.5px',
                                                fontWeight: '700',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {cfg.icon} {cfg.label} (+{cfg.xp} XP)
                                        </button>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setEditingTodo(null)}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border-subtle)',
                                            background: 'transparent',
                                            color: 'var(--text-secondary)',
                                            fontSize: '12px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={saveEdit}
                                        className="btn-primary"
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .todos-page-wrapper {
                    max-width: 1080px;
                    width: 100%;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .todos-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                }

                .todos-input-card {
                    border-radius: 16px;
                    padding: 10px 14px;
                    display: flex;
                    flex-direction: column;
                }

                .todos-filter-bar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    flex-wrap: wrap;
                }

                .todos-tabs-container {
                    display: flex;
                    align-items: center;
                    background: var(--surface-input);
                    padding: 3px;
                    border-radius: 12px;
                    gap: 2px;
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: none;
                    flex: 1;
                    min-width: 0;
                }
                .todos-tabs-container::-webkit-scrollbar {
                    display: none;
                }

                .todos-tab-btn {
                    flex: 1 0 auto;
                    padding: 5px 8px;
                    border-radius: 9px;
                    border: none;
                    background: transparent;
                    color: var(--text-secondary);
                    font-size: 11px;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                }
                .todos-tab-btn.active {
                    background: var(--surface-elevated);
                    color: var(--text-primary);
                    font-weight: 700;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
                }

                .todos-tab-count {
                    font-size: 9.5px;
                    font-weight: 700;
                    opacity: 0.65;
                }
                .todos-tab-btn.active .todos-tab-count {
                    opacity: 1;
                    color: var(--accent-primary);
                }

                .todo-item-card {
                    transition: transform 0.15s ease, box-shadow 0.15s ease;
                }
                .todo-item-card:hover {
                    transform: translateY(-1px);
                }

                /* Layout Breakpoints */
                .todos-main-layout {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 14px;
                }

                @media (min-width: 900px) {
                    .todos-main-layout {
                        grid-template-columns: 1fr 330px;
                        gap: 20px;
                        align-items: start;
                    }
                    .todos-desktop-sidebar {
                        display: block;
                        position: sticky;
                        top: 24px;
                    }
                    .mobile-analytics-wrapper {
                        display: none;
                    }
                    .mobile-only-indicator {
                        display: none !important;
                    }
                }

                @media (max-width: 899px) {
                    .todos-desktop-sidebar {
                        display: none;
                    }
                    .mobile-analytics-wrapper {
                        display: block;
                    }
                    .hide-on-compact {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
};

export default Todos;
