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
    ChevronRight,
    X,
    Clock,
    Sun,
    Layers,
    Mic,
    MicOff,
    Square,
    Volume2,
    RotateCcw
} from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import useJournal from '../hooks/useJournal';
import { transcribeAudio } from '../lib/groq';

const MOODS = [
    { value: 1, emoji: '😞', label: 'Rough', color: '#ef4444', desc: 'A challenging day' },
    { value: 2, emoji: '😐', label: 'Meh', color: '#f59e0b', desc: 'Could have been better' },
    { value: 3, emoji: '🙂', label: 'Okay', color: '#3b82f6', desc: 'Normal & steady' },
    { value: 4, emoji: '😊', label: 'Good', color: '#10b981', desc: 'Productive & happy' },
    { value: 5, emoji: '🤩', label: 'Amazing', color: '#a855f7', desc: 'Full of wins & energy' }
];

const PROMPT_TABS = [
    { id: 'all', label: 'All', icon: Layers },
    { id: 'how_was_today', label: 'Highlights', icon: Sun, color: '#6366f1', placeholder: 'What happened today? Notable moments, small wins, or accomplishments...' },
    { id: 'on_your_mind', label: 'Thoughts', icon: Brain, color: '#ec4899', placeholder: 'Unload your mind... thoughts, emotions, ideas, or things you are grateful for...' },
    { id: 'change_for_tomorrow', label: 'Tomorrow', icon: Compass, color: '#10b981', placeholder: 'What is one thing you will focus on or improve tomorrow?' }
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

    const todayDateStr = format(new Date(), 'yyyy-MM-dd');
    const todayFormatted = format(new Date(), 'EEEE, MMMM d');

    // Sync state with fetched today's entry
    useEffect(() => {
        if (todayEntry) {
            setLocalEntry({
                mood_score: todayEntry.mood_score || 3,
                how_was_today: todayEntry.how_was_today || '',
                on_your_mind: todayEntry.on_your_mind || '',
                change_for_tomorrow: todayEntry.change_for_tomorrow || ''
            });
        }
    }, [todayEntry]);

    // Debounced auto-save (1.2s delay after user stops typing)
    useEffect(() => {
        const timer = setTimeout(() => {
            if (
                localEntry.how_was_today || 
                localEntry.on_your_mind || 
                localEntry.change_for_tomorrow || 
                localEntry.mood_score !== 3
            ) {
                saveEntry(localEntry);
                setSavedNotice(true);
                setTimeout(() => setSavedNotice(false), 2000);
            }
        }, 1200);

        return () => clearTimeout(timer);
    }, [localEntry, saveEntry]);

    // Cleanup recording resources on unmount
    useEffect(() => {
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (speechRecognitionRef.current) speechRecognitionRef.current.stop();
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleFieldChange = (field, value) => {
        setLocalEntry(prev => ({ ...prev, [field]: value }));
        updateField(field, value);
    };

    const handleMoodSelect = (moodValue) => {
        handleFieldChange('mood_score', moodValue);
    };

    const handleManualSave = async () => {
        await saveEntry(localEntry);
        setManualSaveSuccess(true);
        setTimeout(() => setManualSaveSuccess(false), 2500);
    };

    // ─── SPEECH TO TEXT / AUDIO RECORDING LOGIC ─────────────────────────────
    const startRecording = async (field) => {
        try {
            // If already recording for another field, stop first
            if (isRecording) {
                stopRecording();
                return;
            }

            const targetField = field || (activeTab !== 'all' ? activeTab : 'how_was_today');
            setRecordingField(targetField);
            setInterimText('');
            setRecordingSeconds(0);
            setVoiceFeedback('Listening...');

            // 1. Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            // 2. Select best supported audio format
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

            mediaRecorder.start(250); // Slice chunks every 250ms
            setIsRecording(true);

            // 3. Start timer
            timerIntervalRef.current = setInterval(() => {
                setRecordingSeconds(sec => sec + 1);
            }, 1000);

            // 4. Start interim live Web Speech recognition if browser supports it
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
                        console.warn('[Live Speech Preview Warning]:', e.error);
                    };

                    recognition.start();
                    speechRecognitionRef.current = recognition;
                } catch (e) {
                    console.warn('SpeechRecognition init error:', e);
                }
            }

        } catch (err) {
            console.error('Microphone error:', err);
            alert('Microphone access is required to dictate your journal. Please allow microphone permissions in your browser.');
            setIsRecording(false);
            setRecordingField(null);
        }
    };

    const stopRecording = async () => {
        if (!mediaRecorderRef.current || !isRecording) return;

        // Stop timer & interim recognition
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
        if (speechRecognitionRef.current) {
            try { speechRecognitionRef.current.stop(); } catch (e) {}
        }

        setIsRecording(false);
        setIsTranscribing(true);
        setVoiceFeedback('Transcribing with Groq Whisper Large V3...');

        const currentField = recordingField;

        mediaRecorderRef.current.onstop = async () => {
            try {
                // Stop audio tracks
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

                // Call Groq Whisper Large V3 API
                const promptContext = "Daily personal reflection journal about events, feelings, habits, goals, accomplishments.";
                const transcribedText = await transcribeAudio(audioBlob, promptContext);

                if (transcribedText && currentField) {
                    const prevContent = localEntry[currentField]?.trim() || '';
                    const updatedContent = prevContent ? `${prevContent} ${transcribedText}` : transcribedText;
                    
                    handleFieldChange(currentField, updatedContent);
                    
                    // Trigger immediate database save
                    await saveEntry({
                        ...localEntry,
                        [currentField]: updatedContent
                    });

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
        <div className="page-container" style={{ maxWidth: '840px', margin: '0 auto', position: 'relative' }}>
            
            {/* Header */}
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link 
                        to="/" 
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            width: '38px', 
                            height: '38px', 
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h1 style={{ fontSize: '22px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
                                Daily Journal
                            </h1>
                            <span style={{ 
                                padding: '2px 8px', 
                                borderRadius: '10px', 
                                fontSize: '11px', 
                                fontWeight: '700',
                                background: saving 
                                    ? 'rgba(234, 179, 8, 0.15)' 
                                    : (savedNotice || manualSaveSuccess) 
                                        ? 'var(--success-bg)' 
                                        : 'var(--surface-input)',
                                color: saving 
                                    ? '#eab308' 
                                    : (savedNotice || manualSaveSuccess) 
                                        ? 'var(--success)' 
                                        : 'var(--text-muted)'
                            }}>
                                {saving ? 'Saving...' : (savedNotice || manualSaveSuccess) ? 'Saved ✓' : 'Auto-saved'}
                            </span>
                        </div>
                        <p style={{ margin: 0, marginTop: '2px', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} />
                            {todayFormatted}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Quick Dictation Header Pill */}
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={() => {
                            const field = activeTab !== 'all' ? activeTab : 'how_was_today';
                            if (isRecording) stopRecording();
                            else startRecording(field);
                        }}
                        style={{
                            padding: '8px 14px',
                            borderRadius: '12px',
                            border: isRecording ? '1.5px solid #ef4444' : '1px solid var(--border-subtle)',
                            background: isRecording ? 'rgba(239, 68, 68, 0.15)' : 'var(--surface-input)',
                            color: isRecording ? '#ef4444' : 'var(--text-primary)',
                            fontSize: '13px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            cursor: 'pointer'
                        }}
                    >
                        {isRecording ? <Square size={14} /> : <Mic size={14} style={{ color: 'var(--accent-primary)' }} />}
                        <span>{isRecording ? formatTimer(recordingSeconds) : 'Speak'}</span>
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleManualSave}
                        disabled={saving}
                        className="btn-primary"
                        style={{
                            padding: '8px 16px',
                            fontSize: '13px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            flexShrink: 0
                        }}
                    >
                        {saving ? <Loader2 size={15} className="spin" /> : <Check size={15} />}
                        <span>{manualSaveSuccess ? 'Saved!' : 'Save'}</span>
                    </motion.button>
                </div>
            </header>

            {/* LIVE ACTIVE RECORDING BANNER (Floating feedback) */}
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
                            padding: '14px 18px',
                            marginBottom: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {isRecording && (
                                    <span style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        background: '#ef4444',
                                        display: 'inline-block',
                                        animation: 'pulse-record 1.2s infinite'
                                    }} />
                                )}
                                {isTranscribing && <Loader2 size={16} className="spin" style={{ color: 'var(--accent-primary)' }} />}
                                <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                    {isRecording 
                                        ? `Recording for ${recordingField === 'how_was_today' ? 'Highlights' : recordingField === 'on_your_mind' ? 'Thoughts' : "Tomorrow's Focus"} (${formatTimer(recordingSeconds)})`
                                        : voiceFeedback || 'Ready'}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {isRecording && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={cancelRecording}
                                            style={{
                                                padding: '5px 10px',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border-subtle)',
                                                background: 'transparent',
                                                color: 'var(--text-muted)',
                                                fontSize: '12px',
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
                                                padding: '6px 14px',
                                                borderRadius: '10px',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <Check size={14} />
                                            <span>Done</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Live streaming interim preview if talking */}
                        {interimText && (
                            <p style={{
                                fontSize: '13px',
                                color: 'var(--text-secondary)',
                                fontStyle: 'italic',
                                margin: 0,
                                background: 'rgba(0,0,0,0.15)',
                                padding: '8px 12px',
                                borderRadius: '10px'
                            }}>
                                "{interimText}"
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 7-Day Visual Streak Strip */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '8px',
                background: 'var(--surface-input)',
                padding: '10px 12px',
                borderRadius: '18px',
                border: '1px solid var(--border-subtle)',
                marginBottom: '20px',
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
                            style={{
                                flex: '1 0 40px',
                                minWidth: '40px',
                                padding: '6px 4px',
                                borderRadius: '12px',
                                border: item.isToday 
                                    ? '1.5px solid var(--accent-primary)' 
                                    : isSelected 
                                        ? '1.5px solid var(--text-primary)' 
                                        : '1px solid transparent',
                                background: item.isToday 
                                    ? 'color-mix(in srgb, var(--accent-primary) 12%, transparent)' 
                                    : isSelected 
                                        ? 'var(--surface-elevated)' 
                                        : 'transparent',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '3px',
                                cursor: item.entry || item.isToday ? 'pointer' : 'default',
                                opacity: item.entry || item.isToday ? 1 : 0.45,
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>
                                {item.dayName}
                            </span>
                            <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                background: item.mood ? `color-mix(in srgb, ${item.mood.color} 20%, transparent)` : 'var(--surface-input)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: item.mood ? '16px' : '11px',
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
                <div style={{ padding: '50px 0', textAlign: 'center', color: 'var(--accent-primary)' }}>
                    <Loader2 className="spin" size={32} style={{ margin: '0 auto 10px' }} />
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading journal...</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Past Entry Viewer Card (if clicked from streak strip) */}
                    {selectedPastEntry && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="glass-card"
                            style={{ 
                                padding: '18px 20px', 
                                border: '1.5px solid var(--accent-primary)',
                                background: 'var(--surface-elevated)',
                                position: 'relative'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '20px' }}>
                                        {MOODS.find(m => m.value === selectedPastEntry.mood_score)?.emoji || '📝'}
                                    </span>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '700' }}>
                                            Memory from {format(parseISO(selectedPastEntry.date), 'EEEE, MMMM d')}
                                        </h3>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
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

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                                {selectedPastEntry.how_was_today && (
                                    <div>
                                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Highlights</span>
                                        <p style={{ margin: '2px 0 0 0', color: 'var(--text-primary)', lineHeight: '1.5' }}>{selectedPastEntry.how_was_today}</p>
                                    </div>
                                )}
                                {selectedPastEntry.on_your_mind && (
                                    <div>
                                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Thoughts</span>
                                        <p style={{ margin: '2px 0 0 0', color: 'var(--text-primary)', lineHeight: '1.5' }}>{selectedPastEntry.on_your_mind}</p>
                                    </div>
                                )}
                                {selectedPastEntry.change_for_tomorrow && (
                                    <div>
                                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tomorrow's Focus</span>
                                        <p style={{ margin: '2px 0 0 0', color: 'var(--text-primary)', lineHeight: '1.5' }}>{selectedPastEntry.change_for_tomorrow}</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* REDESIGNED MOOD SELECTOR: Horizontal, Fluid, No Vertical Distortion */}
                    <div className="glass-card" style={{ padding: '20px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', padding: '0 4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Sparkles size={15} style={{ color: 'var(--accent-primary)' }} />
                                How's your mood today?
                            </span>
                            
                            {/* Live Active Mood Badge */}
                            <span style={{
                                fontSize: '12px',
                                fontWeight: '700',
                                padding: '3px 10px',
                                borderRadius: '12px',
                                background: `color-mix(in srgb, ${selectedMoodObj.color} 18%, transparent)`,
                                color: selectedMoodObj.color,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}>
                                <span>{selectedMoodObj.emoji}</span>
                                <span>{selectedMoodObj.label}</span>
                            </span>
                        </div>

                        {/* Fluid 5-Emoji Bubble Row */}
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-around', 
                            alignItems: 'center', 
                            gap: '8px',
                            padding: '4px 0'
                        }}>
                            {MOODS.map(mood => {
                                const isSelected = localEntry.mood_score === mood.value;
                                return (
                                    <motion.button
                                        key={mood.value}
                                        type="button"
                                        whileHover={{ scale: 1.15 }}
                                        whileTap={{ scale: 0.92 }}
                                        onClick={() => handleMoodSelect(mood.value)}
                                        style={{
                                            flex: '1',
                                            maxWidth: '68px',
                                            height: '56px',
                                            borderRadius: '20px',
                                            border: isSelected ? `2.5px solid ${mood.color}` : '1px solid var(--border-subtle)',
                                            background: isSelected 
                                                ? `color-mix(in srgb, ${mood.color} 22%, transparent)` 
                                                : 'var(--surface-input)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '28px',
                                            cursor: 'pointer',
                                            transition: 'background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                                            boxShadow: isSelected ? `0 6px 18px color-mix(in srgb, ${mood.color} 28%, transparent)` : 'none'
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
                    <div style={{
                        display: 'flex',
                        background: 'var(--surface-input)',
                        padding: '4px',
                        borderRadius: '16px',
                        border: '1px solid var(--border-subtle)',
                        gap: '4px',
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
                                        whiteSpace: 'nowrap',
                                        position: 'relative'
                                    }}
                                >
                                    <Icon size={14} color={isTabActive ? (tab.color || 'var(--accent-primary)') : 'currentColor'} />
                                    <span>{tab.label}</span>
                                    {hasContent && (
                                        <span style={{
                                            width: '5px',
                                            height: '5px',
                                            borderRadius: '50%',
                                            background: tab.color || 'var(--accent-primary)'
                                        }} />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* REFLECTION CARDS WITH DEDICATED MIC BUTTONS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        
                        {/* Section 1: Highlights & Summary */}
                        {(activeTab === 'all' || activeTab === 'how_was_today') && (
                            <motion.div 
                                layout
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card" 
                                style={{ 
                                    padding: '18px 20px', 
                                    borderLeft: '4px solid #6366f1',
                                    border: isRecording && recordingField === 'how_was_today' ? '1.5px solid #ef4444' : undefined,
                                    borderLeftWidth: '4px'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Sun size={16} style={{ color: '#6366f1' }} />
                                        Daily Highlights & Summary
                                    </label>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                                                padding: '4px 8px',
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
                                            {isRecording && recordingField === 'how_was_today' ? <Square size={12} /> : <Mic size={12} />}
                                            <span>{isRecording && recordingField === 'how_was_today' ? 'Stop' : 'Voice'}</span>
                                        </button>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                            {localEntry.how_was_today?.length || 0} chars
                                        </span>
                                    </div>
                                </div>
                                <textarea
                                    placeholder="What happened today? Notable moments, key accomplishments, or pleasant surprises (or tap Voice to speak)..."
                                    value={localEntry.how_was_today}
                                    onChange={(e) => handleFieldChange('how_was_today', e.target.value)}
                                    className="surface-input styled-input"
                                    style={{
                                        width: '100%',
                                        minHeight: activeTab === 'how_was_today' ? '180px' : '90px',
                                        resize: 'vertical',
                                        borderRadius: '12px',
                                        fontSize: '14px',
                                        lineHeight: '1.6'
                                    }}
                                />
                            </motion.div>
                        )}

                        {/* Section 2: Brain Dump & Thoughts */}
                        {(activeTab === 'all' || activeTab === 'on_your_mind') && (
                            <motion.div 
                                layout
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card" 
                                style={{ 
                                    padding: '18px 20px', 
                                    borderLeft: '4px solid #ec4899',
                                    border: isRecording && recordingField === 'on_your_mind' ? '1.5px solid #ef4444' : undefined,
                                    borderLeftWidth: '4px'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Brain size={16} style={{ color: '#ec4899' }} />
                                        Thoughts & Brain Dump
                                    </label>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                                                padding: '4px 8px',
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
                                            {isRecording && recordingField === 'on_your_mind' ? <Square size={12} /> : <Mic size={12} />}
                                            <span>{isRecording && recordingField === 'on_your_mind' ? 'Stop' : 'Voice'}</span>
                                        </button>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                            {localEntry.on_your_mind?.length || 0} chars
                                        </span>
                                    </div>
                                </div>
                                <textarea
                                    placeholder="Unload your mind... thoughts, ideas, gratitude, worries, or freeform feelings (or tap Voice to speak)..."
                                    value={localEntry.on_your_mind}
                                    onChange={(e) => handleFieldChange('on_your_mind', e.target.value)}
                                    className="surface-input styled-input"
                                    style={{
                                        width: '100%',
                                        minHeight: activeTab === 'on_your_mind' ? '180px' : '90px',
                                        resize: 'vertical',
                                        borderRadius: '12px',
                                        fontSize: '14px',
                                        lineHeight: '1.6'
                                    }}
                                />
                            </motion.div>
                        )}

                        {/* Section 3: Tomorrow's Vision */}
                        {(activeTab === 'all' || activeTab === 'change_for_tomorrow') && (
                            <motion.div 
                                layout
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="glass-card" 
                                style={{ 
                                    padding: '18px 20px', 
                                    borderLeft: '4px solid #10b981',
                                    border: isRecording && recordingField === 'change_for_tomorrow' ? '1.5px solid #ef4444' : undefined,
                                    borderLeftWidth: '4px'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Compass size={16} style={{ color: '#10b981' }} />
                                        Tomorrow's Focus & Vision
                                    </label>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                                                padding: '4px 8px',
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
                                            {isRecording && recordingField === 'change_for_tomorrow' ? <Square size={12} /> : <Mic size={12} />}
                                            <span>{isRecording && recordingField === 'change_for_tomorrow' ? 'Stop' : 'Voice'}</span>
                                        </button>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                            {localEntry.change_for_tomorrow?.length || 0} chars
                                        </span>
                                    </div>
                                </div>
                                <textarea
                                    placeholder="What is one thing you will prioritize, do differently, or achieve tomorrow (or tap Voice to speak)..."
                                    value={localEntry.change_for_tomorrow}
                                    onChange={(e) => handleFieldChange('change_for_tomorrow', e.target.value)}
                                    className="surface-input styled-input"
                                    style={{
                                        width: '100%',
                                        minHeight: activeTab === 'change_for_tomorrow' ? '180px' : '85px',
                                        resize: 'vertical',
                                        borderRadius: '12px',
                                        fontSize: '14px',
                                        lineHeight: '1.6'
                                    }}
                                />
                            </motion.div>
                        )}
                    </div>

                    {/* RECENT ENTRIES LIST */}
                    {pastEntriesList.length > 0 && (
                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <History size={16} style={{ color: 'var(--accent-primary)' }} />
                                <h2 style={{ fontSize: '15px', fontWeight: '700', margin: 0 }}>Recent Entries</h2>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
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
                                                padding: '14px 16px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '8px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontSize: '18px' }}>{moodObj.emoji}</span>
                                                    <span style={{ fontSize: '12px', fontWeight: '700' }}>{dateStr}</span>
                                                </div>
                                                <span style={{
                                                    fontSize: '10px',
                                                    padding: '2px 6px',
                                                    borderRadius: '6px',
                                                    background: `color-mix(in srgb, ${moodObj.color} 15%, transparent)`,
                                                    color: moodObj.color,
                                                    fontWeight: '700'
                                                }}>
                                                    {moodObj.label}
                                                </span>
                                            </div>

                                            <p style={{
                                                fontSize: '12px',
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
            `}</style>
        </div>
    );
};

export default Journal;
