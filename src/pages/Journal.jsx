import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    BookOpen, 
    ArrowLeft, 
    Calendar, 
    Sparkles, 
    Brain, 
    Check, 
    Loader2, 
    History, 
    Compass, 
    X, 
    Sun, 
    Layers, 
    Mic, 
    Square 
} from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import useJournal from '../hooks/useJournal';
import { transcribeAudio } from '../lib/groq';
import AppLoader from '../components/common/AppLoader';

const MOODS = [
    { value: 1, emoji: '😞', label: 'Rough', color: '#ef4444' },
    { value: 2, emoji: '😐', label: 'Meh', color: '#f59e0b' },
    { value: 3, emoji: '🙂', label: 'Okay', color: '#3b82f6' },
    { value: 4, emoji: '😊', label: 'Good', color: '#10b981' },
    { value: 5, emoji: '🤩', label: 'Amazing', color: '#a855f7' }
];

const PROMPT_TABS = [
    { id: 'all', label: 'All', shortLabel: 'All', icon: Layers },
    { id: 'how_was_today', label: 'Highlights', shortLabel: 'Wins', icon: Sun, color: '#6366f1', placeholder: 'What happened today? Notable moments, small wins, or accomplishments...' },
    { id: 'on_your_mind', label: 'Thoughts', shortLabel: 'Thoughts', icon: Brain, color: '#ec4899', placeholder: 'Unload your mind... thoughts, emotions, ideas, or things you are grateful for...' },
    { id: 'change_for_tomorrow', label: 'Tomorrow', shortLabel: 'Tomorrow', icon: Compass, color: '#10b981', placeholder: 'What is one thing you will focus on or improve tomorrow?' }
];

const Journal = () => {
    const { todayEntry, weekEntries, loading, saving, saveEntry, updateField } = useJournal();
    
    const [localEntry, setLocalEntry] = useState({
        mood_score: 3,
        how_was_today: '',
        on_your_mind: '',
        change_for_tomorrow: ''
    });

    const [activeTab, setActiveTab] = useState('all');
    const [savedNotice, setSavedNotice] = useState(false);
    const [manualSaveSuccess, setManualSaveSuccess] = useState(false);
    const [selectedPastEntry, setSelectedPastEntry] = useState(null);

    // Audio recording & Speech-to-Text state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingField, setRecordingField] = useState(null);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const [interimText, setInterimText] = useState('');
    const [voiceFeedback, setVoiceFeedback] = useState('');

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const streamRef = useRef(null);
    const timerIntervalRef = useRef(null);
    const speechRecognitionRef = useRef(null);

    // Track dirty state & refs for unmount auto-saving
    const [isDirty, setIsDirty] = useState(false);
    const isDirtyRef = useRef(false);
    const localEntryRef = useRef(localEntry);
    const longIdleTimerRef = useRef(null);

    const todayDateStr = format(new Date(), 'yyyy-MM-dd');
    const todayFormatted = format(new Date(), 'EEEE, MMMM d');

    // Sync state with fetched today's entry on load
    useEffect(() => {
        if (todayEntry) {
            const loaded = {
                mood_score: todayEntry.mood_score || 3,
                how_was_today: todayEntry.how_was_today || '',
                on_your_mind: todayEntry.on_your_mind || '',
                change_for_tomorrow: todayEntry.change_for_tomorrow || ''
            };
            setLocalEntry(loaded);
            localEntryRef.current = loaded;
            isDirtyRef.current = false;
            setIsDirty(false);
        }
    }, [todayEntry]);

    // Keep localEntryRef in sync
    useEffect(() => {
        localEntryRef.current = localEntry;
    }, [localEntry]);

    // Handle field updates & set dirty state
    const handleFieldChange = (field, value) => {
        setLocalEntry(prev => {
            const next = { ...prev, [field]: value };
            localEntryRef.current = next;
            return next;
        });
        updateField(field, value);
        
        isDirtyRef.current = true;
        setIsDirty(true);

        // Reset long-idle timer (45s)
        if (longIdleTimerRef.current) clearTimeout(longIdleTimerRef.current);
        longIdleTimerRef.current = setTimeout(async () => {
            if (isDirtyRef.current) {
                await saveEntry(localEntryRef.current);
                isDirtyRef.current = false;
                setIsDirty(false);
                setSavedNotice(true);
                setTimeout(() => setSavedNotice(false), 2500);
            }
        }, 45000);
    };

    const handleMoodSelect = (moodValue) => {
        handleFieldChange('mood_score', moodValue);
    };

    const handleManualSave = async () => {
        if (longIdleTimerRef.current) clearTimeout(longIdleTimerRef.current);
        await saveEntry(localEntryRef.current);
        isDirtyRef.current = false;
        setIsDirty(false);
        setManualSaveSuccess(true);
        setTimeout(() => setManualSaveSuccess(false), 2500);
    };

    // Autosave when user leaves the page or closes the tab
    useEffect(() => {
        const handleLeave = () => {
            if (isDirtyRef.current) {
                saveEntry(localEntryRef.current);
                isDirtyRef.current = false;
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && isDirtyRef.current) {
                saveEntry(localEntryRef.current);
                isDirtyRef.current = false;
            }
        };

        window.addEventListener('pagehide', handleLeave);
        window.addEventListener('beforeunload', handleLeave);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            if (isDirtyRef.current) {
                saveEntry(localEntryRef.current);
                isDirtyRef.current = false;
            }
            if (longIdleTimerRef.current) clearTimeout(longIdleTimerRef.current);
            window.removeEventListener('pagehide', handleLeave);
            window.removeEventListener('beforeunload', handleLeave);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [saveEntry]);

    // ─── SPEECH TO TEXT WITH GROQ WHISPER LARGE V3 ──────────────────────────
    const startRecording = async (field) => {
        try {
            if (isRecording) {
                stopRecording();
                return;
            }

            const targetField = field || (activeTab !== 'all' ? activeTab : 'how_was_today');
            setRecordingField(targetField);
            setInterimText('');
            setRecordingSeconds(0);
            setVoiceFeedback('Listening...');

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mimeTypes = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/mp4',
                'audio/ogg;codecs=opus',
                'audio/wav'
            ];
            const supportedMime = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || '';
            const mediaRecorder = supportedMime 
                ? new MediaRecorder(stream, { mimeType: supportedMime }) 
                : new MediaRecorder(stream);

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.start(250);
            setIsRecording(true);

            timerIntervalRef.current = setInterval(() => {
                setRecordingSeconds(sec => sec + 1);
            }, 1000);

            // Live speech preview if supported
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                try {
                    const recognition = new SpeechRecognition();
                    recognition.continuous = true;
                    recognition.interimResults = true;
                    recognition.lang = 'en-US';

                    recognition.onresult = (event) => {
                        let currentInterim = '';
                        for (let i = event.resultIndex; i < event.results.length; ++i) {
                            currentInterim += event.results[i][0].transcript;
                        }
                        setInterimText(currentInterim);
                    };

                    recognition.onerror = (e) => {
                        console.warn('[SpeechRecognition Warning]:', e.error);
                    };

                    recognition.start();
                    speechRecognitionRef.current = recognition;
                } catch (e) {
                    console.warn('SpeechRecognition error:', e);
                }
            }

        } catch (err) {
            console.error('Microphone error:', err);
            alert('Microphone access is required for dictation. Please allow microphone permissions in your browser settings.');
            setIsRecording(false);
            setRecordingField(null);
        }
    };

    const stopRecording = async () => {
        if (!mediaRecorderRef.current || !isRecording) return;

        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (speechRecognitionRef.current) {
            try { speechRecognitionRef.current.stop(); } catch (e) {}
        }

        setIsRecording(false);
        setIsTranscribing(true);
        setVoiceFeedback('Transcribing with Whisper Large V3...');

        const currentField = recordingField;

        mediaRecorderRef.current.onstop = async () => {
            try {
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }

                const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

                if (audioBlob.size < 1000) {
                    setIsTranscribing(false);
                    setRecordingField(null);
                    setInterimText('');
                    return;
                }

                const promptContext = "Personal reflection journal about daily highlights, thoughts, feelings, habits, goals, accomplishments.";
                const transcribedText = await transcribeAudio(audioBlob, promptContext);

                if (transcribedText && currentField) {
                    const prevContent = localEntry[currentField]?.trim() || '';
                    const updatedContent = prevContent ? `${prevContent} ${transcribedText}` : transcribedText;
                    
                    handleFieldChange(currentField, updatedContent);
                    
                    await saveEntry({
                        ...localEntry,
                        [currentField]: updatedContent
                    });
                    isDirtyRef.current = false;
                    setIsDirty(false);

                    setVoiceFeedback('Transcribed & Saved ✓');
                    setTimeout(() => setVoiceFeedback(''), 3000);
                }
            } catch (err) {
                console.error('Transcription error:', err);
                setVoiceFeedback('Transcription failed. Check Groq API key.');
                setTimeout(() => setVoiceFeedback(''), 4000);
            } finally {
                setIsTranscribing(false);
                setRecordingField(null);
                setInterimText('');
                setRecordingSeconds(0);
            }
        };

        mediaRecorderRef.current.stop();
    };

    const cancelRecording = () => {
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (speechRecognitionRef.current) {
            try { speechRecognitionRef.current.stop(); } catch (e) {}
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        setIsRecording(false);
        setIsTranscribing(false);
        setRecordingField(null);
        setInterimText('');
        setRecordingSeconds(0);
        setVoiceFeedback('');
    };

    const formatTimer = (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const secs = (totalSeconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    const selectedMoodObj = useMemo(() => {
        return MOODS.find(m => m.value === localEntry.mood_score) || MOODS[2];
    }, [localEntry.mood_score]);

    // Build 7-day mini calendar strip
    const last7Days = useMemo(() => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = subDays(new Date(), i);
            const dStr = format(d, 'yyyy-MM-dd');
            const entry = weekEntries.find(e => e.date === dStr) || (dStr === todayDateStr ? todayEntry : null);
            const mood = entry?.mood_score ? MOODS.find(m => m.value === entry.mood_score) : null;
            days.push({
                date: d,
                dateStr: dStr,
                dayName: format(d, 'EEE'),
                dayLetter: format(d, 'EEEEE'),
                dayNum: format(d, 'd'),
                isToday: i === 0,
                entry,
                mood
            });
        }
        return days;
    }, [weekEntries, todayEntry, todayDateStr]);

    const pastEntriesList = weekEntries.filter(e => e.date !== todayDateStr);

    return (
        <div className="page-container journal-page-root" style={{ maxWidth: '840px', margin: '0 auto', position: 'relative' }}>
            
            {/* Header */}
            <header className="journal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <Link 
                        to="/" 
                        className="journal-back-btn"
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
                            textDecoration: 'none',
                            flexShrink: 0
                        }}
                    >
                        <ArrowLeft size={18} />
                    </Link>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                            <h1 className="journal-title" style={{ fontSize: '20px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px', whiteSpace: 'nowrap' }}>
                                Daily Journal
                            </h1>
                            <span className="journal-status-badge" style={{ 
                                padding: '2px 7px', 
                                borderRadius: '8px', 
                                fontSize: '10px', 
                                fontWeight: '700',
                                whiteSpace: 'nowrap',
                                background: saving 
                                    ? 'rgba(234, 179, 8, 0.15)' 
                                    : isDirty
                                        ? 'rgba(245, 158, 11, 0.15)'
                                        : 'var(--success-bg)',
                                color: saving 
                                    ? '#eab308' 
                                    : isDirty
                                        ? '#f59e0b'
                                        : 'var(--success)'
                            }}>
                                {saving ? 'Saving...' : isDirty ? 'Unsaved' : (savedNotice ? 'Auto-saved ✓' : 'Saved ✓')}
                            </span>
                        </div>
                        <p style={{ margin: 0, marginTop: '1px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                            <Calendar size={11} />
                            {todayFormatted}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleManualSave}
                        disabled={saving}
                        className="btn-primary journal-header-btn"
                        style={{
                            padding: '7px 14px',
                            fontSize: '12px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            flexShrink: 0
                        }}
                    >
                        {saving ? <Loader2 size={13} className="spin" /> : <Check size={13} />}
                        <span>{manualSaveSuccess ? 'Saved!' : 'Save'}</span>
                    </motion.button>
                </div>
            </header>

            {/* LIVE ACTIVE RECORDING BANNER */}
            <AnimatePresence>
                {(isRecording || isTranscribing || voiceFeedback) && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.98 }}
                        style={{
                            background: isRecording 
                                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(168, 85, 247, 0.15))' 
                                : 'var(--surface-elevated)',
                            border: isRecording ? '1.5px solid #ef4444' : '1px solid var(--glass-border)',
                            borderRadius: '16px',
                            padding: '12px 16px',
                            marginBottom: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {isRecording && (
                                    <span style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: '#ef4444',
                                        display: 'inline-block',
                                        animation: 'pulse-record 1.2s infinite'
                                    }} />
                                )}
                                {isTranscribing && <Loader2 size={14} className="spin" style={{ color: 'var(--accent-primary)' }} />}
                                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    {isRecording 
                                        ? `Recording for ${recordingField === 'how_was_today' ? 'Highlights' : recordingField === 'on_your_mind' ? 'Thoughts' : 'Tomorrow'} (${formatTimer(recordingSeconds)})`
                                        : voiceFeedback || 'Ready'}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {isRecording && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={cancelRecording}
                                            style={{
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                border: '1px solid var(--border-subtle)',
                                                background: 'transparent',
                                                color: 'var(--text-muted)',
                                                fontSize: '11px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={stopRecording}
                                            className="btn-primary"
                                            style={{
                                                padding: '5px 12px',
                                                borderRadius: '8px',
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <Check size={12} />
                                            <span>Done</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {interimText && (
                            <p style={{
                                fontSize: '12px',
                                color: 'var(--text-secondary)',
                                fontStyle: 'italic',
                                margin: 0,
                                background: 'rgba(0,0,0,0.15)',
                                padding: '6px 10px',
                                borderRadius: '8px'
                            }}>
                                "{interimText}"
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 7-Day Visual Streak Strip */}
            <div className="journal-streak-strip" style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '6px',
                background: 'var(--surface-input)',
                padding: '8px 10px',
                borderRadius: '16px',
                border: '1px solid var(--border-subtle)',
                marginBottom: '16px',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none'
            }}>
                {last7Days.map(item => {
                    const isSelected = selectedPastEntry?.date === item.dateStr;
                    return (
                        <button
                            key={item.dateStr}
                            type="button"
                            onClick={() => {
                                if (item.isToday) {
                                    setSelectedPastEntry(null);
                                } else if (item.entry) {
                                    setSelectedPastEntry(item.entry);
                                }
                            }}
                            className="journal-day-node"
                            style={{
                                flex: '1 0 36px',
                                minWidth: '36px',
                                padding: '5px 2px',
                                borderRadius: '12px',
                                border: item.isToday 
                                    ? '1.5px solid var(--accent-primary)' 
                                    : isSelected 
                                        ? '1.5px solid var(--text-primary)' 
                                        : '1px solid transparent',
                                background: item.isToday 
                                    ? 'color-mix(in srgb, var(--accent-primary) 14%, transparent)' 
                                    : isSelected 
                                        ? 'var(--surface-elevated)' 
                                        : 'transparent',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '3px',
                                cursor: item.entry || item.isToday ? 'pointer' : 'default',
                                opacity: item.entry || item.isToday ? 1 : 0.4,
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>
                                <span className="desktop-text">{item.dayName}</span>
                                <span className="mobile-text">{item.dayLetter}</span>
                            </span>
                            <div style={{
                                width: '26px',
                                height: '26px',
                                borderRadius: '50%',
                                background: item.mood ? `color-mix(in srgb, ${item.mood.color} 20%, transparent)` : 'var(--surface-input)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: item.mood ? '15px' : '11px',
                                fontWeight: '700',
                                color: item.isToday ? 'var(--accent-primary)' : 'var(--text-secondary)'
                            }}>
                                {item.mood ? item.mood.emoji : item.dayNum}
                            </div>
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <AppLoader variant="section" size="small" message="Loading your reflections..." />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Past Entry Viewer Card */}
                    {selectedPastEntry && (
                        <motion.div 
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-card"
                            style={{ 
                                padding: '14px 16px', 
                                border: '1.5px solid var(--accent-primary)',
                                background: 'var(--surface-elevated)',
                                position: 'relative'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '18px' }}>
                                        {MOODS.find(m => m.value === selectedPastEntry.mood_score)?.emoji || '📝'}
                                    </span>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '700' }}>
                                            Memory from {format(parseISO(selectedPastEntry.date), 'EEEE, MMMM d')}
                                        </h3>
                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                            {MOODS.find(m => m.value === selectedPastEntry.mood_score)?.label}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedPastEntry(null)}
                                    style={{
                                        background: 'var(--surface-input)',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '26px',
                                        height: '26px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--text-primary)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={13} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                                {selectedPastEntry.how_was_today && (
                                    <div>
                                        <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Highlights</span>
                                        <p style={{ margin: '2px 0 0 0', color: 'var(--text-primary)', lineHeight: '1.4' }}>{selectedPastEntry.how_was_today}</p>
                                    </div>
                                )}
                                {selectedPastEntry.on_your_mind && (
                                    <div>
                                        <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Thoughts</span>
                                        <p style={{ margin: '2px 0 0 0', color: 'var(--text-primary)', lineHeight: '1.4' }}>{selectedPastEntry.on_your_mind}</p>
                                    </div>
                                )}
                                {selectedPastEntry.change_for_tomorrow && (
                                    <div>
                                        <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tomorrow</span>
                                        <p style={{ margin: '2px 0 0 0', color: 'var(--text-primary)', lineHeight: '1.4' }}>{selectedPastEntry.change_for_tomorrow}</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* MOOD SELECTOR: Beautiful, Horizontal, Perfectly Spaced */}
                    <div className="glass-card journal-mood-card" style={{ padding: '16px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 2px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Sparkles size={14} style={{ color: 'var(--accent-primary)' }} />
                                <span>How's your mood?</span>
                            </span>
                            
                            <span style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                background: `color-mix(in srgb, ${selectedMoodObj.color} 18%, transparent)`,
                                color: selectedMoodObj.color,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                <span>{selectedMoodObj.emoji}</span>
                                <span>{selectedMoodObj.label}</span>
                            </span>
                        </div>

                        {/* Fluid 5-Emoji Bubble Row */}
                        <div className="journal-mood-bubbles" style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            gap: '6px',
                            padding: '2px 0'
                        }}>
                            {MOODS.map(mood => {
                                const isSelected = localEntry.mood_score === mood.value;
                                return (
                                    <motion.button
                                        key={mood.value}
                                        type="button"
                                        whileHover={{ scale: 1.12 }}
                                        whileTap={{ scale: 0.92 }}
                                        onClick={() => handleMoodSelect(mood.value)}
                                        className={`mood-bubble-btn ${isSelected ? 'selected' : ''}`}
                                        style={{
                                            flex: '1',
                                            maxWidth: '60px',
                                            height: '50px',
                                            borderRadius: '16px',
                                            border: isSelected ? `2px solid ${mood.color}` : '1px solid var(--border-subtle)',
                                            background: isSelected 
                                                ? `color-mix(in srgb, ${mood.color} 20%, transparent)` 
                                                : 'var(--surface-input)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '24px',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                                            boxShadow: isSelected ? `0 4px 14px color-mix(in srgb, ${mood.color} 25%, transparent)` : 'none'
                                        }}
                                        title={mood.label}
                                    >
                                        <span style={{ lineHeight: 1 }}>{mood.emoji}</span>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    {/* FOCUS TAB SWITCHER */}
                    <div className="journal-tabs-bar" style={{
                        display: 'flex',
                        background: 'var(--surface-input)',
                        padding: '3px',
                        borderRadius: '14px',
                        border: '1px solid var(--border-subtle)',
                        gap: '3px',
                        overflowX: 'auto',
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'none'
                    }}>
                        {PROMPT_TABS.map(tab => {
                            const isTabActive = activeTab === tab.id;
                            const Icon = tab.icon;
                            const hasContent = tab.id !== 'all' && Boolean(localEntry[tab.id]?.trim());

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`journal-tab-item ${isTabActive ? 'active' : ''}`}
                                    style={{
                                        flex: '1 0 auto',
                                        padding: '7px 10px',
                                        borderRadius: '11px',
                                        border: 'none',
                                        background: isTabActive ? 'var(--surface-elevated)' : 'transparent',
                                        color: isTabActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                        fontSize: '11px',
                                        fontWeight: isTabActive ? '700' : '500',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '5px',
                                        cursor: 'pointer',
                                        boxShadow: isTabActive ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                                        transition: 'all 0.15s ease',
                                        whiteSpace: 'nowrap',
                                        position: 'relative'
                                    }}
                                >
                                    <Icon size={13} color={isTabActive ? (tab.color || 'var(--accent-primary)') : 'currentColor'} />
                                    <span className="desktop-text">{tab.label}</span>
                                    <span className="mobile-text">{tab.shortLabel}</span>
                                    {hasContent && (
                                        <span style={{
                                            width: '4px',
                                            height: '4px',
                                            borderRadius: '50%',
                                            background: tab.color || 'var(--accent-primary)'
                                        }} />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* REFLECTION PROMPT CARDS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        
                        {/* Section 1: Highlights */}
                        {(activeTab === 'all' || activeTab === 'how_was_today') && (
                            <motion.div 
                                layout
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card journal-prompt-card" 
                                style={{ 
                                    padding: '16px 18px', 
                                    borderLeft: '4px solid #6366f1',
                                    border: isRecording && recordingField === 'how_was_today' ? '1.5px solid #ef4444' : undefined,
                                    borderLeftWidth: '4px'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Sun size={15} style={{ color: '#6366f1' }} />
                                        <span className="desktop-text">Daily Highlights & Summary</span>
                                        <span className="mobile-text">Highlights</span>
                                    </label>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (isRecording && recordingField === 'how_was_today') stopRecording();
                                                else startRecording('how_was_today');
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '3px 8px',
                                                borderRadius: '8px',
                                                border: isRecording && recordingField === 'how_was_today' ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
                                                background: isRecording && recordingField === 'how_was_today' ? 'rgba(239, 68, 68, 0.15)' : 'var(--surface-input)',
                                                color: isRecording && recordingField === 'how_was_today' ? '#ef4444' : 'var(--text-muted)',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}
                                            title="Dictate with Whisper"
                                        >
                                            {isRecording && recordingField === 'how_was_today' ? <Square size={11} /> : <Mic size={11} />}
                                            <span className="desktop-text">{isRecording && recordingField === 'how_was_today' ? 'Stop' : 'Voice'}</span>
                                        </button>
                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                            {localEntry.how_was_today?.length || 0}c
                                        </span>
                                    </div>
                                </div>
                                <textarea
                                    placeholder="What happened today? Notable moments or small wins..."
                                    value={localEntry.how_was_today}
                                    onChange={(e) => handleFieldChange('how_was_today', e.target.value)}
                                    className="surface-input styled-input"
                                    style={{
                                        width: '100%',
                                        minHeight: activeTab === 'how_was_today' ? '170px' : '85px',
                                        resize: 'vertical',
                                        borderRadius: '12px',
                                        fontSize: '13px',
                                        lineHeight: '1.5'
                                    }}
                                />
                            </motion.div>
                        )}

                        {/* Section 2: Thoughts */}
                        {(activeTab === 'all' || activeTab === 'on_your_mind') && (
                            <motion.div 
                                layout
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card journal-prompt-card" 
                                style={{ 
                                    padding: '16px 18px', 
                                    borderLeft: '4px solid #ec4899',
                                    border: isRecording && recordingField === 'on_your_mind' ? '1.5px solid #ef4444' : undefined,
                                    borderLeftWidth: '4px'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Brain size={15} style={{ color: '#ec4899' }} />
                                        <span className="desktop-text">Thoughts & Brain Dump</span>
                                        <span className="mobile-text">Thoughts</span>
                                    </label>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (isRecording && recordingField === 'on_your_mind') stopRecording();
                                                else startRecording('on_your_mind');
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '3px 8px',
                                                borderRadius: '8px',
                                                border: isRecording && recordingField === 'on_your_mind' ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
                                                background: isRecording && recordingField === 'on_your_mind' ? 'rgba(239, 68, 68, 0.15)' : 'var(--surface-input)',
                                                color: isRecording && recordingField === 'on_your_mind' ? '#ef4444' : 'var(--text-muted)',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}
                                            title="Dictate with Whisper"
                                        >
                                            {isRecording && recordingField === 'on_your_mind' ? <Square size={11} /> : <Mic size={11} />}
                                            <span className="desktop-text">{isRecording && recordingField === 'on_your_mind' ? 'Stop' : 'Voice'}</span>
                                        </button>
                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                            {localEntry.on_your_mind?.length || 0}c
                                        </span>
                                    </div>
                                </div>
                                <textarea
                                    placeholder="Unload your mind... thoughts, ideas, gratitude, or feelings..."
                                    value={localEntry.on_your_mind}
                                    onChange={(e) => handleFieldChange('on_your_mind', e.target.value)}
                                    className="surface-input styled-input"
                                    style={{
                                        width: '100%',
                                        minHeight: activeTab === 'on_your_mind' ? '170px' : '85px',
                                        resize: 'vertical',
                                        borderRadius: '12px',
                                        fontSize: '13px',
                                        lineHeight: '1.5'
                                    }}
                                />
                            </motion.div>
                        )}

                        {/* Section 3: Tomorrow's Focus */}
                        {(activeTab === 'all' || activeTab === 'change_for_tomorrow') && (
                            <motion.div 
                                layout
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card journal-prompt-card" 
                                style={{ 
                                    padding: '16px 18px', 
                                    borderLeft: '4px solid #10b981',
                                    border: isRecording && recordingField === 'change_for_tomorrow' ? '1.5px solid #ef4444' : undefined,
                                    borderLeftWidth: '4px'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Compass size={15} style={{ color: '#10b981' }} />
                                        <span className="desktop-text">Tomorrow's Focus & Vision</span>
                                        <span className="mobile-text">Tomorrow</span>
                                    </label>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (isRecording && recordingField === 'change_for_tomorrow') stopRecording();
                                                else startRecording('change_for_tomorrow');
                                            }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                padding: '3px 8px',
                                                borderRadius: '8px',
                                                border: isRecording && recordingField === 'change_for_tomorrow' ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
                                                background: isRecording && recordingField === 'change_for_tomorrow' ? 'rgba(239, 68, 68, 0.15)' : 'var(--surface-input)',
                                                color: isRecording && recordingField === 'change_for_tomorrow' ? '#ef4444' : 'var(--text-muted)',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}
                                            title="Dictate with Whisper"
                                        >
                                            {isRecording && recordingField === 'change_for_tomorrow' ? <Square size={11} /> : <Mic size={11} />}
                                            <span className="desktop-text">{isRecording && recordingField === 'change_for_tomorrow' ? 'Stop' : 'Voice'}</span>
                                        </button>
                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                            {localEntry.change_for_tomorrow?.length || 0}c
                                        </span>
                                    </div>
                                </div>
                                <textarea
                                    placeholder="What is one thing you will prioritize or achieve tomorrow..."
                                    value={localEntry.change_for_tomorrow}
                                    onChange={(e) => handleFieldChange('change_for_tomorrow', e.target.value)}
                                    className="surface-input styled-input"
                                    style={{
                                        width: '100%',
                                        minHeight: activeTab === 'change_for_tomorrow' ? '170px' : '80px',
                                        resize: 'vertical',
                                        borderRadius: '12px',
                                        fontSize: '13px',
                                        lineHeight: '1.5'
                                    }}
                                />
                            </motion.div>
                        )}
                    </div>

                    {/* RECENT ENTRIES LIST */}
                    {pastEntriesList.length > 0 && (
                        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <History size={15} style={{ color: 'var(--accent-primary)' }} />
                                <h2 style={{ fontSize: '14px', fontWeight: '700', margin: 0 }}>Recent Entries</h2>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
                                {pastEntriesList.slice(0, 4).map(entry => {
                                    const moodObj = MOODS.find(m => m.value === entry.mood_score) || MOODS[2];
                                    const entryDate = parseISO(entry.date);
                                    const dateStr = format(entryDate, 'EEE, MMM d');

                                    return (
                                        <div
                                            key={entry.id || entry.date}
                                            onClick={() => setSelectedPastEntry(entry)}
                                            className="glass-card hover-lift"
                                            style={{
                                                padding: '12px 14px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '6px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <span style={{ fontSize: '16px' }}>{moodObj.emoji}</span>
                                                    <span style={{ fontSize: '12px', fontWeight: '700' }}>{dateStr}</span>
                                                </div>
                                                <span style={{
                                                    fontSize: '10px',
                                                    padding: '1px 5px',
                                                    borderRadius: '6px',
                                                    background: `color-mix(in srgb, ${moodObj.color} 15%, transparent)`,
                                                    color: moodObj.color,
                                                    fontWeight: '700'
                                                }}>
                                                    {moodObj.label}
                                                </span>
                                            </div>

                                            <p style={{
                                                fontSize: '11px',
                                                color: 'var(--text-secondary)',
                                                margin: 0,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                lineHeight: '1.4'
                                            }}>
                                                {entry.how_was_today || entry.on_your_mind || entry.change_for_tomorrow || 'No text written'}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <style>{`
                @keyframes pulse-record {
                    0% { transform: scale(0.95); opacity: 0.8; }
                    50% { transform: scale(1.3); opacity: 1; }
                    100% { transform: scale(0.95); opacity: 0.8; }
                }

                /* Mobile vs Tablet/Desktop responsive styling */
                @media (min-width: 768px) {
                    .mobile-text {
                        display: none !important;
                    }
                    .desktop-text {
                        display: inline !important;
                    }
                }

                @media (max-width: 767px) {
                    .desktop-text {
                        display: none !important;
                    }
                    .mobile-text {
                        display: inline !important;
                    }
                    .journal-title {
                        font-size: 18px !important;
                    }
                    .journal-prompt-card {
                        padding: 14px 14px !important;
                    }
                    .journal-mood-card {
                        padding: 14px 12px !important;
                    }
                    .mood-bubble-btn {
                        height: 44px !important;
                        max-width: 48px !important;
                        font-size: 20px !important;
                        border-radius: 14px !important;
                    }
                    .journal-streak-strip {
                        padding: 6px 8px !important;
                    }
                    .journal-day-node {
                        min-width: 32px !important;
                        padding: 4px 1px !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default Journal;
