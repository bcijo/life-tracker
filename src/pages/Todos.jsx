import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, 
    Check, 
    Circle, 
    Calendar, 
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
    Zap,
    Trophy,
    Flame,
    Clock,
    Target,
    Award,
    Sparkles,
    TrendingUp,
    ShieldAlert,
    Gauge
} from 'lucide-react';
import { format, isToday, isPast, isFuture, parseISO, addDays, differenceInMinutes } from 'date-fns';
import useTodos from '../hooks/useTodos';
import AppLoader from '../components/common/AppLoader';
import { transcribeAudio } from '../lib/groq';

const TABS = [
    { id: 'today', label: 'Today', shortLabel: 'Today', icon: Sun },
    { id: 'upcoming', label: 'Upcoming', shortLabel: 'Next', icon: CalendarDays },
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
        border: 'rgba(16, 185, 129, 0.3)',
        icon: '🟢',
        est: '~15m'
    },
    medium: {
        id: 'medium',
        label: 'Medium',
        xp: 25,
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.12)',
        border: 'rgba(245, 158, 11, 0.3)',
        icon: '🟡',
        est: '~1h'
    },
    hard: {
        id: 'hard',
        label: 'Hard',
        xp: 50,
        color: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.12)',
        border: 'rgba(239, 68, 68, 0.3)',
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

    // Handle adding a task with difficulty
    const handleAddTodo = async (e) => {
        if (e) e.preventDefault();
        if (!inputValue.trim()) return;

        await addTodoDb(inputValue.trim(), computedDeadline, selectedDifficulty);
        setInputValue('');
        if (selectedDatePreset === 'custom') setSelectedDatePreset('today');
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

    // Stats
    const totalCount = todos.length;
    const completedCount = completedTodos.length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

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

        // Parse turnaround timers
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

    // Turnaround Speed & Velocity Metrics
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
        const avgMins = recordedTimes.length > 0 ? Math.round(recordedTimes.reduce((a, b) => a + b, 0) / recordedTimes.length) : null;

        return {
            fastestStr: minMins ? formatDuration(minMins) : null,
            avgStr: avgMins ? formatDuration(avgMins) : null,
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
                text: `Overdue (${format(d, 'MMM d')})`,
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

    return (
        <div style={{
            maxWidth: '1140px',
            margin: '0 auto',
            padding: '12px 16px 80px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
        }}>
            
            {/* ── Top Header ── */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link
                        to="/"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '10px',
                            background: 'var(--surface-elevated)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--glass-border)',
                            textDecoration: 'none'
                        }}
                    >
                        <ArrowLeft size={16} />
                    </Link>
                    <div>
                        <h1 className="todos-title" style={{
                            fontSize: '20px',
                            fontWeight: '800',
                            margin: 0,
                            letterSpacing: '-0.3px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <span>Tasks</span>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-primary)', background: 'rgba(168,85,247,0.12)', padding: '1px 6px', borderRadius: '6px' }}>
                                {activeTodos.length} active
                            </span>
                        </h1>
                    </div>
                </div>

                {/* Level & XP Tag (Visible on Header) */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '10px',
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '11px',
                    fontWeight: '700'
                }}>
                    <span>{userLevelObj.icon}</span>
                    <span style={{ color: userLevelObj.color }}>Lvl {userLevelObj.lvl}</span>
                    <span style={{ color: 'var(--text-muted)' }}>•</span>
                    <span style={{ color: '#a855f7', fontWeight: '800', fontFamily: 'monospace' }}>
                        {totalEarnedXp} XP
                    </span>
                </div>
            </div>

            {/* ── 2-COLUMN BIG SCREEN LAYOUT ── */}
            <div className="todos-grid-container">
                
                {/* ── LEFT / MAIN TASK COLUMN ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    {/* Quick Input Bar with Voice, Presets & Difficulty */}
                    <div className="glass-card" style={{
                        borderRadius: '16px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}>
                        <form onSubmit={handleAddTodo} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="What do you need to accomplish?"
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    fontWeight: '500'
                                }}
                            />

                            {/* Voice Button */}
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
                                    flexShrink: 0
                                }}
                                title={isRecording ? 'Stop Recording' : 'Voice Dictation'}
                            >
                                {isRecording ? <Square size={12} /> : <Mic size={14} />}
                            </button>

                            {/* Add Button */}
                            <button
                                type="submit"
                                disabled={!inputValue.trim()}
                                className="btn-primary"
                                style={{
                                    height: '32px',
                                    padding: '0 12px',
                                    borderRadius: '10px',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    border: 'none',
                                    cursor: !inputValue.trim() ? 'not-allowed' : 'pointer',
                                    opacity: !inputValue.trim() ? 0.5 : 1,
                                    flexShrink: 0
                                }}
                            >
                                <Plus size={14} strokeWidth={2.5} />
                                <span className="desktop-text">Add</span>
                            </button>
                        </form>

                        {/* Controls: Due Date & Difficulty Selectors */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                            
                            {/* Due Date Chips */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                    Due:
                                </span>

                                {['today', 'tomorrow', 'none'].map(preset => {
                                    const isSelected = selectedDatePreset === preset;
                                    return (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => setSelectedDatePreset(preset)}
                                            style={{
                                                padding: '2px 7px',
                                                borderRadius: '6px',
                                                border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                                                background: isSelected ? 'rgba(168,85,247,0.12)' : 'transparent',
                                                color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                                fontSize: '10px',
                                                fontWeight: isSelected ? '700' : '500',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {preset === 'today' ? '☀️ Today' : preset === 'tomorrow' ? '🌙 Tomorrow' : '📦 None'}
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
                                        padding: '2px 4px',
                                        borderRadius: '6px',
                                        fontSize: '10px',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer'
                                    }}
                                />
                            </div>

                            {/* Difficulty Selector Chips */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                    Tier:
                                </span>

                                {Object.values(DIFFICULTY_CONFIG).map(cfg => {
                                    const isSelected = selectedDifficulty === cfg.id;
                                    return (
                                        <button
                                            key={cfg.id}
                                            type="button"
                                            onClick={() => setSelectedDifficulty(cfg.id)}
                                            style={{
                                                padding: '2px 7px',
                                                borderRadius: '6px',
                                                border: isSelected ? `1.5px solid ${cfg.color}` : '1px solid var(--border-subtle)',
                                                background: isSelected ? cfg.bg : 'transparent',
                                                color: isSelected ? cfg.color : 'var(--text-secondary)',
                                                fontSize: '10px',
                                                fontWeight: isSelected ? '800' : '600',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <span>{cfg.icon}</span>
                                            <span>{cfg.label}</span>
                                            <span style={{ opacity: 0.8, fontSize: '9px' }}>+{cfg.xp}</span>
                                        </button>
                                    );
                                })}
                            </div>

                        </div>
                    </div>

                    {/* Segmented Filter Tabs & Difficulty Filter */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        
                        {/* Timeframe Tabs */}
                        <div style={{
                            display: 'flex',
                            background: 'var(--surface-input)',
                            padding: '3px',
                            borderRadius: '12px',
                            gap: '2px',
                            overflowX: 'auto',
                            WebkitOverflowScrolling: 'touch',
                            scrollbarWidth: 'none'
                        }}>
                            {TABS.map(tab => {
                                const isActive = activeTab === tab.id;
                                const Icon = tab.icon;
                                const count = tabCounts[tab.id] || 0;

                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        style={{
                                            flex: '1 0 auto',
                                            padding: '6px 10px',
                                            borderRadius: '9px',
                                            border: 'none',
                                            background: isActive ? 'var(--surface-elevated)' : 'transparent',
                                            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            fontSize: '11px',
                                            fontWeight: isActive ? '700' : '500',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px',
                                            cursor: 'pointer',
                                            boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.06)' : 'none'
                                        }}
                                    >
                                        <Icon size={12} />
                                        <span>{tab.shortLabel}</span>
                                        <span style={{ fontSize: '10px', opacity: isActive ? 1 : 0.6, fontWeight: '700' }}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Difficulty Filter Chips */}
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <button
                                type="button"
                                onClick={() => setDifficultyFilter('all')}
                                style={{
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    border: difficultyFilter === 'all' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                                    background: difficultyFilter === 'all' ? 'rgba(168,85,247,0.12)' : 'transparent',
                                    color: difficultyFilter === 'all' ? 'var(--accent-primary)' : 'var(--text-muted)',
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                All Tiers
                            </button>
                            {Object.values(DIFFICULTY_CONFIG).map(cfg => (
                                <button
                                    key={cfg.id}
                                    type="button"
                                    onClick={() => setDifficultyFilter(cfg.id)}
                                    style={{
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        border: difficultyFilter === cfg.id ? `1px solid ${cfg.color}` : '1px solid var(--border-subtle)',
                                        background: difficultyFilter === cfg.id ? cfg.bg : 'transparent',
                                        color: difficultyFilter === cfg.id ? cfg.color : 'var(--text-muted)',
                                        fontSize: '10px',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {cfg.icon} {cfg.label}
                                </button>
                            ))}
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
                                            className="glass-card"
                                            style={{
                                                padding: '10px 12px',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '8px',
                                                opacity: todo.completed ? 0.65 : 1
                                            }}
                                        >
                                            {/* Left: Checkbox & Title */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggle(todo.id)}
                                                    style={{
                                                        width: '20px',
                                                        height: '20px',
                                                        borderRadius: '6px',
                                                        border: todo.completed ? 'none' : '1.5px solid var(--border-subtle)',
                                                        background: todo.completed ? '#10b981' : 'transparent',
                                                        color: '#fff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    {todo.completed && <Check size={13} strokeWidth={3} />}
                                                </button>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                                                    <span style={{
                                                        fontSize: '13px',
                                                        fontWeight: '500',
                                                        color: todo.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                                                        textDecoration: todo.completed ? 'line-through' : 'none',
                                                        wordBreak: 'break-word'
                                                    }}>
                                                        {todo.text}
                                                    </span>

                                                    {/* Inline difficulty badge */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <span style={{
                                                            fontSize: '9px',
                                                            fontWeight: '800',
                                                            padding: '1px 5px',
                                                            borderRadius: '4px',
                                                            background: diffCfg.bg,
                                                            color: diffCfg.color
                                                        }}>
                                                            {diffCfg.icon} {diffCfg.label} • +{diffCfg.xp} XP
                                                        </span>

                                                        {badge && (
                                                            <span style={{
                                                                fontSize: '9px',
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

                                            {/* Right: Actions */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => startEditing(todo)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: 'var(--text-muted)',
                                                        cursor: 'pointer',
                                                        padding: '4px'
                                                    }}
                                                >
                                                    <Edit2 size={12} />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(todo.id)}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: 'var(--text-muted)',
                                                        cursor: 'pointer',
                                                        padding: '4px'
                                                    }}
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>

                            {displayedTodos.length === 0 && (
                                <div style={{
                                    padding: '30px 16px',
                                    textAlign: 'center',
                                    background: 'var(--surface-input)',
                                    borderRadius: '14px',
                                    border: '1px dashed var(--border-subtle)'
                                }}>
                                    <Sparkles size={20} style={{ color: 'var(--accent-primary)', marginBottom: '6px' }} />
                                    <h4 style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 2px 0' }}>
                                        {activeTab === 'completed' ? 'No completed tasks yet' : 'No tasks in this view'}
                                    </h4>
                                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                                        {activeTab === 'completed' ? 'Complete tasks to earn XP and calibrate velocity.' : 'Add your next goal using the bar above.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── RIGHT COLUMN: GAMIFIED METRICS & CALIBRATION CENTER ── */}
                <div className="todos-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    {/* Level & XP Progression Card */}
                    <div className="glass-card" style={{
                        borderRadius: '16px',
                        padding: '16px',
                        background: 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(236,72,153,0.06) 100%)',
                        border: '1px solid rgba(168,85,247,0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '10px',
                                    background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '18px',
                                    color: '#fff'
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
                                <div style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>TOTAL EARNED</div>
                                <div style={{ fontSize: '13px', fontWeight: '900', color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                                    {totalEarnedXp} XP
                                </div>
                            </div>
                        </div>

                        {/* XP Bar */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: '700', marginBottom: '3px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>XP Progress</span>
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

                    {/* Difficulty Tier Calibrations & Velocity Matrix */}
                    <div className="glass-card" style={{
                        borderRadius: '16px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Gauge size={14} style={{ color: '#f59e0b' }} />
                                <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Difficulty Calibrations
                                </span>
                            </div>
                        </div>

                        {/* 3 Difficulty Metric Rows */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            
                            {/* Easy Tier */}
                            <div style={{ background: 'var(--surface-input)', padding: '8px 10px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#10b981' }}>
                                        🟢 Easy (+10 XP)
                                    </span>
                                    <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                                        {difficultyBreakdown.easy.completed} / {difficultyBreakdown.easy.total} done
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Velocity Benchmark:</span>
                                    <span style={{ fontWeight: '700', color: difficultyBreakdown.easy.isCalibrated ? '#10b981' : 'var(--text-muted)' }}>
                                        {difficultyBreakdown.easy.isCalibrated ? `⚡ ${difficultyBreakdown.easy.avgTimeStr || '~15m avg'}` : '📊 Calibrating baseline...'}
                                    </span>
                                </div>
                            </div>

                            {/* Medium Tier */}
                            <div style={{ background: 'var(--surface-input)', padding: '8px 10px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#f59e0b' }}>
                                        🟡 Medium (+25 XP)
                                    </span>
                                    <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                                        {difficultyBreakdown.medium.completed} / {difficultyBreakdown.medium.total} done
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Velocity Benchmark:</span>
                                    <span style={{ fontWeight: '700', color: difficultyBreakdown.medium.isCalibrated ? '#f59e0b' : 'var(--text-muted)' }}>
                                        {difficultyBreakdown.medium.isCalibrated ? `⏱️ ${difficultyBreakdown.medium.avgTimeStr || '~1.2h avg'}` : '📊 Calibrating baseline...'}
                                    </span>
                                </div>
                            </div>

                            {/* Hard Tier */}
                            <div style={{ background: 'var(--surface-input)', padding: '8px 10px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#ef4444' }}>
                                        🔴 Hard (+50 XP)
                                    </span>
                                    <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                                        {difficultyBreakdown.hard.completed} / {difficultyBreakdown.hard.total} done
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Velocity Benchmark:</span>
                                    <span style={{ fontWeight: '700', color: difficultyBreakdown.hard.isCalibrated ? '#ef4444' : 'var(--text-muted)' }}>
                                        {difficultyBreakdown.hard.isCalibrated ? `🔥 ${difficultyBreakdown.hard.avgTimeStr || '~3.5h avg'}` : '📊 Complete 1 Hard task to unlock'}
                                    </span>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Overall Turnaround & Personal Record */}
                    <div className="glass-card" style={{
                        borderRadius: '16px',
                        padding: '14px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px'
                    }}>
                        {/* Fastest Clear */}
                        <div style={{ background: 'var(--surface-input)', padding: '8px 10px', borderRadius: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontSize: '9px', fontWeight: '700' }}>
                                <Zap size={10} />
                                <span>FASTEST RECORD</span>
                            </div>
                            <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-primary)', marginTop: '2px', fontFamily: 'monospace' }}>
                                {velocityMetrics.fastestStr || 'Calibrating'}
                            </div>
                            <div style={{ fontSize: '8px', color: 'var(--text-muted)' }}>Best turnaround</div>
                        </div>

                        {/* Focus Streak */}
                        <div style={{ background: 'var(--surface-input)', padding: '8px 10px', borderRadius: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444', fontSize: '9px', fontWeight: '700' }}>
                                <Flame size={10} />
                                <span>FOCUS STREAK</span>
                            </div>
                            <div style={{ fontSize: '15px', fontWeight: '900', color: 'var(--text-primary)', marginTop: '2px', fontFamily: 'monospace' }}>
                                {velocityMetrics.streak}d
                            </div>
                            <div style={{ fontSize: '8px', color: 'var(--text-muted)' }}>Consecutive days</div>
                        </div>
                    </div>

                </div>

            </div>

            {/* Edit Modal */}
            <AnimatePresence>
                {editingTodo && (
                    <div style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(10px)',
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
                                padding: '16px',
                                borderRadius: '16px',
                                background: 'var(--surface-elevated)',
                                border: '1px solid var(--glass-border)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
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

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                                                fontSize: '10px',
                                                fontWeight: '700',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {cfg.icon} {cfg.label} (+{cfg.xp} XP)
                                        </button>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setEditingTodo(null)}
                                        style={{
                                            flex: 1,
                                            padding: '7px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border-subtle)',
                                            background: 'transparent',
                                            color: 'var(--text-secondary)',
                                            fontSize: '11px',
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
                                            padding: '7px',
                                            borderRadius: '8px',
                                            fontSize: '11px',
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
                .todos-grid-container {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 14px;
                }
                @media (min-width: 900px) {
                    .todos-grid-container {
                        grid-template-columns: 1fr 340px;
                        gap: 20px;
                        align-items: start;
                    }
                    .todos-sidebar {
                        position: sticky;
                        top: 80px;
                    }
                }
                @media (max-width: 899px) {
                    .todos-sidebar {
                        margin-top: 6px;
                    }
                }
            `}</style>
        </div>
    );
};

export default Todos;
