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
    Clock, 
    AlertCircle, 
    Sparkles, 
    Mic, 
    Square, 
    X, 
    ChevronDown, 
    ChevronUp,
    Layers,
    Sun,
    CalendarDays,
    Inbox,
    CheckCircle2
} from 'lucide-react';
import { format, isToday, isPast, isFuture, parseISO, addDays, differenceInDays } from 'date-fns';
import useTodos from '../hooks/useTodos';
import AppLoader from '../components/common/AppLoader';
import { transcribeAudio } from '../lib/groq';

const TABS = [
    { id: 'all', label: 'All', icon: Layers },
    { id: 'today', label: 'Today', icon: Sun },
    { id: 'upcoming', label: 'Upcoming', icon: CalendarDays },
    { id: 'unscheduled', label: 'No Date', icon: Inbox },
    { id: 'completed', label: 'Done', icon: CheckCircle2 }
];

const Todos = () => {
    const { todos, loading, addTodo: addTodoDb, toggleTodo: toggleTodoDb, updateTodo: updateTodoDb, deleteTodo: deleteTodoDb } = useTodos();
    
    const [inputValue, setInputValue] = useState('');
    const [selectedDatePreset, setSelectedDatePreset] = useState('today'); // 'none' | 'today' | 'tomorrow' | 'custom'
    const [customDate, setCustomDate] = useState('');
    const [activeTab, setActiveTab] = useState('today');
    const [editingTodo, setEditingTodo] = useState(null);
    const [editText, setEditText] = useState('');
    const [editDate, setEditDate] = useState('');

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

    // Handle adding a task
    const handleAddTodo = async (e) => {
        if (e) e.preventDefault();
        if (!inputValue.trim()) return;

        await addTodoDb(inputValue.trim(), computedDeadline);
        setInputValue('');
        if (selectedDatePreset === 'custom') setSelectedDatePreset('today');
    };

    const handleToggle = async (id) => {
        await toggleTodoDb(id);
    };

    const handleDelete = async (id) => {
        await deleteTodoDb(id);
    };

    const startEditing = (todo) => {
        setEditingTodo(todo);
        setEditText(todo.text);
        setEditDate(todo.deadline || '');
    };

    const saveEdit = async () => {
        if (!editingTodo || !editText.trim()) return;
        await updateTodoDb(editingTodo.id, {
            text: editText.trim(),
            deadline: editDate || null
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

    // Filtered list based on active tab
    const displayedTodos = useMemo(() => {
        switch (activeTab) {
            case 'today':
                return todayTodos;
            case 'upcoming':
                return upcomingTodos;
            case 'unscheduled':
                return unscheduledTodos;
            case 'completed':
                return completedTodos;
            case 'all':
            default:
                return [...todayTodos, ...upcomingTodos, ...unscheduledTodos];
        }
    }, [activeTab, todayTodos, upcomingTodos, unscheduledTodos, completedTodos]);

    const tabCounts = {
        all: activeTodos.length,
        today: todayTodos.length,
        upcoming: upcomingTodos.length,
        unscheduled: unscheduledTodos.length,
        completed: completedTodos.length
    };

    // Badge styling for deadlines
    const getDeadlineBadge = (deadlineStr, completed) => {
        if (!deadlineStr) return null;
        const d = parseISO(deadlineStr);
        const overdue = isPast(d) && !isToday(d);
        const dueToday = isToday(d);
        const dueTomorrow = isToday(addDays(new Date(), -1));

        if (completed) {
            return {
                text: format(d, 'MMM d'),
                color: 'var(--text-muted)',
                bg: 'transparent'
            };
        }

        if (overdue) {
            const daysAgo = differenceInDays(new Date(), d);
            return {
                text: daysAgo > 1 ? `${daysAgo}d overdue` : 'Overdue',
                color: '#ef4444',
                bg: 'rgba(239, 68, 68, 0.15)'
            };
        }

        if (dueToday) {
            return {
                text: 'Today',
                color: '#f59e0b',
                bg: 'rgba(245, 158, 11, 0.15)'
            };
        }

        return {
            text: format(d, 'MMM d'),
            color: 'var(--text-secondary)',
            bg: 'var(--surface-input)'
        };
    };

    return (
        <div className="page-container" style={{ maxWidth: '820px', margin: '0 auto' }}>
            
            {/* Header */}
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link 
                        to="/" 
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            width: '36px', 
                            height: '36px', 
                            borderRadius: '12px',
                            background: 'var(--surface-input)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)',
                            textDecoration: 'none'
                        }}
                    >
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
                            Tasks & Todos
                        </h1>
                        <p style={{ margin: 0, marginTop: '2px', fontSize: '12px', color: 'var(--text-muted)' }}>
                            {activeTodos.length} active • {completedCount} done
                        </p>
                    </div>
                </div>

                {/* Progress Pill */}
                {totalCount > 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 12px',
                        borderRadius: '12px',
                        background: progressPercent === 100 ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface-input)',
                        border: progressPercent === 100 ? '1px solid #10b981' : '1px solid var(--border-subtle)'
                    }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: progressPercent === 100 ? '#10b981' : 'var(--text-primary)' }}>
                            {progressPercent}%
                        </span>
                        <div style={{
                            width: '48px',
                            height: '6px',
                            borderRadius: '3px',
                            background: 'var(--border-subtle)',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${progressPercent}%`,
                                height: '100%',
                                background: progressPercent === 100 ? '#10b981' : 'var(--accent-gradient)',
                                borderRadius: '3px',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                    </div>
                )}
            </header>

            {/* Quick Add Bar */}
            <div className="glass-card" style={{ padding: '14px 16px', marginBottom: '20px', borderRadius: '18px' }}>
                <form onSubmit={handleAddTodo} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="What needs to be done?"
                            className="surface-input styled-input"
                            style={{
                                flex: 1,
                                padding: '10px 14px',
                                borderRadius: '12px',
                                fontSize: '14px',
                                border: '1px solid var(--border-subtle)'
                            }}
                        />

                        {/* Voice Dictation Button */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={startVoiceInput}
                            style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '12px',
                                border: isRecording ? '1.5px solid #ef4444' : '1px solid var(--border-subtle)',
                                background: isRecording ? 'rgba(239, 68, 68, 0.15)' : 'var(--surface-input)',
                                color: isRecording ? '#ef4444' : 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                flexShrink: 0
                            }}
                            title="Speak task name"
                        >
                            {isRecording ? <Square size={16} /> : <Mic size={16} style={{ color: 'var(--accent-primary)' }} />}
                        </motion.button>

                        {/* Submit Button */}
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="submit"
                            disabled={!inputValue.trim()}
                            className="btn-primary"
                            style={{
                                padding: '10px 16px',
                                borderRadius: '12px',
                                fontSize: '13px',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: inputValue.trim() ? 'pointer' : 'default',
                                opacity: inputValue.trim() ? 1 : 0.6,
                                flexShrink: 0
                            }}
                        >
                            <Plus size={16} />
                            <span>Add</span>
                        </motion.button>
                    </div>

                    {/* Date Presets Row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '2px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginRight: '2px', whiteSpace: 'nowrap' }}>
                            Due:
                        </span>

                        {[
                            { id: 'today', label: '☀️ Today' },
                            { id: 'tomorrow', label: '🌙 Tomorrow' },
                            { id: 'none', label: '📦 No date' }
                        ].map(preset => {
                            const isSelected = selectedDatePreset === preset.id;
                            return (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => setSelectedDatePreset(preset.id)}
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: '8px',
                                        border: isSelected ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                                        background: isSelected ? 'color-mix(in srgb, var(--accent-primary) 15%, transparent)' : 'var(--surface-input)',
                                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                        fontSize: '11px',
                                        fontWeight: isSelected ? '700' : '500',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {preset.label}
                                </button>
                            );
                        })}

                        {/* Custom Date Picker */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                                type="date"
                                value={customDate}
                                onChange={(e) => {
                                    setCustomDate(e.target.value);
                                    if (e.target.value) setSelectedDatePreset('custom');
                                }}
                                style={{
                                    border: selectedDatePreset === 'custom' ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                                    background: selectedDatePreset === 'custom' ? 'color-mix(in srgb, var(--accent-primary) 15%, transparent)' : 'var(--surface-input)',
                                    padding: '3px 8px',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>
                    </div>
                </form>
            </div>

            {/* Smart Focus Tabs */}
            <div style={{
                display: 'flex',
                background: 'var(--surface-input)',
                padding: '4px',
                borderRadius: '16px',
                border: '1px solid var(--border-subtle)',
                gap: '4px',
                marginBottom: '18px',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none'
            }}>
                {TABS.map(tab => {
                    const isTabActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    const count = tabCounts[tab.id] || 0;

                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                flex: '1 0 auto',
                                padding: '8px 12px',
                                borderRadius: '12px',
                                border: 'none',
                                background: isTabActive ? 'var(--surface-elevated)' : 'transparent',
                                color: isTabActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                fontSize: '12px',
                                fontWeight: isTabActive ? '700' : '500',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                boxShadow: isTabActive ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                                transition: 'all 0.15s ease',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <Icon size={14} color={isTabActive ? 'var(--accent-primary)' : 'currentColor'} />
                            <span>{tab.label}</span>
                            <span style={{
                                fontSize: '10px',
                                fontWeight: '700',
                                padding: '1px 6px',
                                borderRadius: '6px',
                                background: isTabActive ? 'color-mix(in srgb, var(--accent-primary) 15%, transparent)' : 'var(--surface-input)',
                                color: isTabActive ? 'var(--accent-primary)' : 'var(--text-muted)'
                            }}>
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Task List / Loading / Empty States */}
            {loading ? (
                <AppLoader variant="section" size="normal" message="Loading your tasks..." />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <AnimatePresence mode="popLayout">
                        {displayedTodos.map((todo) => {
                            const badge = getDeadlineBadge(todo.deadline, todo.completed);

                            return (
                                <motion.div
                                    key={todo.id}
                                    layout
                                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                                    className="glass-card hover-lift"
                                    style={{
                                        padding: '12px 14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        borderRadius: '14px',
                                        opacity: todo.completed ? 0.6 : 1,
                                        border: todo.completed ? '1px solid var(--border-subtle)' : undefined
                                    }}
                                >
                                    {/* Tactile Checkbox */}
                                    <motion.button
                                        whileHover={{ scale: 1.15 }}
                                        whileTap={{ scale: 0.85 }}
                                        type="button"
                                        onClick={() => handleToggle(todo.id)}
                                        style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            border: todo.completed ? 'none' : '2px solid var(--border-subtle)',
                                            background: todo.completed ? 'var(--success)' : 'transparent',
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
                                    </motion.button>

                                    {/* Task Text & Deadline */}
                                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                        <span style={{
                                            fontSize: '14px',
                                            fontWeight: todo.completed ? '400' : '600',
                                            color: todo.completed ? 'var(--text-secondary)' : 'var(--text-primary)',
                                            textDecoration: todo.completed ? 'line-through' : 'none',
                                            lineHeight: '1.4',
                                            wordBreak: 'break-word'
                                        }}>
                                            {todo.text}
                                        </span>

                                        {badge && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{
                                                    fontSize: '10px',
                                                    fontWeight: '700',
                                                    padding: '2px 6px',
                                                    borderRadius: '6px',
                                                    background: badge.bg,
                                                    color: badge.color,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '3px'
                                                }}>
                                                    <Calendar size={10} />
                                                    {badge.text}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                        <button
                                            type="button"
                                            onClick={() => startEditing(todo)}
                                            style={{
                                                padding: '6px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: 'transparent',
                                                color: 'var(--text-muted)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            title="Edit task"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(todo.id)}
                                            style={{
                                                padding: '6px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: 'transparent',
                                                color: 'var(--text-muted)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            title="Delete task"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {/* Empty States */}
                    {displayedTodos.length === 0 && (
                        <div style={{
                            padding: '40px 20px',
                            textAlign: 'center',
                            background: 'var(--surface-input)',
                            borderRadius: '18px',
                            border: '1px dashed var(--border-subtle)'
                        }}>
                            <div style={{ fontSize: '36px', marginBottom: '8px' }}>
                                {activeTab === 'today' ? '🎉' : activeTab === 'completed' ? '📝' : '✨'}
                            </div>
                            <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                                {activeTab === 'today' 
                                    ? 'All caught up for today!' 
                                    : activeTab === 'completed' 
                                        ? 'No completed tasks yet' 
                                        : 'No tasks found'}
                            </h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                                {activeTab === 'today' 
                                    ? 'Enjoy your free time or add a new goal above.' 
                                    : 'Add a new task using the input bar above.'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Edit Task Modal */}
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
                                maxWidth: '420px',
                                padding: '20px',
                                borderRadius: '20px',
                                background: 'var(--surface-elevated)',
                                border: '1px solid var(--glass-border)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Edit Task</h3>
                                <button
                                    onClick={() => setEditingTodo(null)}
                                    style={{
                                        background: 'var(--surface-input)',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '28px',
                                        height: '28px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                                        Task description
                                    </label>
                                    <input
                                        type="text"
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        className="surface-input styled-input"
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', fontSize: '13px' }}
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                                        Due date
                                    </label>
                                    <input
                                        type="date"
                                        value={editDate}
                                        onChange={(e) => setEditDate(e.target.value)}
                                        className="surface-input styled-input"
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '10px', fontSize: '13px' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setEditingTodo(null)}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            borderRadius: '12px',
                                            border: '1px solid var(--border-subtle)',
                                            background: 'transparent',
                                            color: 'var(--text-secondary)',
                                            fontSize: '13px',
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
                                            padding: '10px',
                                            borderRadius: '12px',
                                            fontSize: '13px',
                                            fontWeight: '700',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Todos;
