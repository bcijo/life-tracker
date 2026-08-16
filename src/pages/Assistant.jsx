import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, 
    Send, 
    RotateCcw, 
    Database, 
    ChevronDown, 
    ChevronUp, 
    Terminal, 
    ArrowRight,
    Plus,
    Mic,
    Square,
    Loader2
} from 'lucide-react';
import { askAI, transcribeAudio, getHumanReadableQueryDescription } from '../lib/groq';
import useLifeContext from '../hooks/useLifeContext';
import MarkdownRenderer from '../components/MarkdownRenderer';

/* ─── Follow-up suggestion pools by topic ─── */
const FOLLOW_UPS = {
    finance: [
        "Compare my spending to last month",
        "Show a daily spending breakdown for this month",
        "Which day did I spend the most this month?",
        "What's my average daily spend?",
        "How much have I spent on food this week?",
        "List my 5 most expensive transactions",
        "Show income vs expenses this month",
        "Which category has increased the most?",
    ],
    habit: [
        "Show my longest active streak",
        "Which habit am I worst at maintaining?",
        "What's my weekly habit completion rate?",
        "Which habits did I miss this week?",
        "Show habit performance for the last 7 days",
        "Which morning habits am I completing?",
        "How many habits did I complete today?",
    ],
    task: [
        "Show all overdue tasks",
        "What's due this week?",
        "How many tasks have I completed this month?",
        "List tasks without a deadline",
        "What are my oldest pending tasks?",
    ],
    budget: [
        "Show remaining budget across all categories",
        "Which category is closest to its limit?",
        "Forecast my end-of-month spending",
        "Am I on track with my budget?",
        "How much budget do I have left for food?",
    ],
    general: [
        "Summarize my financial health this month",
        "What should I focus on improving?",
        "Give me a quick overview of everything",
        "What are my top priorities right now?",
        "How has my spending changed recently?",
    ]
};

const INITIAL_SUGGESTIONS = [
    {
        label: "Spending Breakdown",
        query: "How much did I spend this month and what are my top expense categories?",
        emoji: "💳"
    },
    {
        label: "Habit Streaks",
        query: "Which habits have I maintained well, and which ones did I miss recently?",
        emoji: "⚡"
    },
    {
        label: "Budget Status",
        query: "Am I currently over budget on any category this month?",
        emoji: "🎯"
    },
    {
        label: "Pending Tasks",
        query: "What urgent tasks or upcoming todos do I need to complete?",
        emoji: "📋"
    }
];

const THINKING_PHASES = [
    "Thinking...",
    "Querying your data...",
    "Analyzing results...",
    "Preparing answer...",
];

/* ─── Detect topic from text ─── */
function detectTopic(text) {
    const lower = (text || '').toLowerCase();
    if (/spend|expens|money|cost|paid|transaction|income|salary|food|transport|shopping|entertainment|bills|health/.test(lower)) return 'finance';
    if (/habit|streak|complet|morning|evening|maintain|active.?days|miss/.test(lower)) return 'habit';
    if (/todo|task|deadline|pending|overdue|due/.test(lower)) return 'task';
    if (/budget|limit|over.?budget|remain|forecast|on.?track/.test(lower)) return 'budget';
    return 'general';
}

/* ─── Pick 3 random follow-ups avoiding the query itself ─── */
function pickFollowUps(aiContent, userQuery) {
    const topic = detectTopic((aiContent || '') + ' ' + (userQuery || ''));
    const pool = [...FOLLOW_UPS[topic], ...FOLLOW_UPS.general];
    // Deduplicate and remove anything that matches the user's last query
    const unique = [...new Set(pool)].filter(
        q => q.toLowerCase() !== (userQuery || '').toLowerCase()
    );
    // Shuffle and pick 3
    const shuffled = unique.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
}

/* ─── Orbital Dots Component ─── */
const OrbitalDots = () => (
    <div className="orbital-container">
        <div className="orbital-glow" />
        <div className="orbital-dot dot-1" />
        <div className="orbital-dot dot-2" />
        <div className="orbital-dot dot-3" />
    </div>
);

/* ─── Thinking Phase Text ─── */
const ThinkingText = () => {
    const [phase, setPhase] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setPhase(p => (p + 1) % THINKING_PHASES.length);
        }, 2200);
        return () => clearInterval(interval);
    }, []);

    return (
        <AnimatePresence mode="wait">
            <motion.span
                key={phase}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                style={{ color: 'var(--text-muted)', fontSize: '14px', fontWeight: '500' }}
            >
                {THINKING_PHASES[phase]}
            </motion.span>
        </AnimatePresence>
    );
};

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
const Assistant = () => {
    const [messages, setMessages] = useState(() => {
        try {
            const saved = sessionStorage.getItem('lifetracker_ai_chat');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentQueryLogs, setCurrentQueryLogs] = useState([]);
    const [openQueryIndex, setOpenQueryIndex] = useState(null);

    // Voice dictation state
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);

    const contextData = useLifeContext();
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const scrollContainerRef = useRef(null);

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const streamRef = useRef(null);
    const timerIntervalRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, currentQueryLogs, loading]);

    useEffect(() => {
        try {
            sessionStorage.setItem('lifetracker_ai_chat', JSON.stringify(messages));
        } catch {}
    }, [messages]);

    // Clean up recording on unmount
    useEffect(() => {
        return () => {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // ─── VOICE DICTATION HANDLERS ───
    const startRecording = async () => {
        try {
            if (isRecording) {
                stopRecording();
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mimeTypes = [
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/mp4',
                'audio/ogg',
                'audio/wav'
            ];
            const supportedMime = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || '';
            const mediaRecorder = supportedMime 
                ? new MediaRecorder(stream, { mimeType: supportedMime }) 
                : new MediaRecorder(stream);

            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.start(250);
            setIsRecording(true);
            setRecordingDuration(0);

            timerIntervalRef.current = setInterval(() => {
                setRecordingDuration(sec => sec + 1);
            }, 1000);

        } catch (err) {
            console.error('Microphone error:', err);
            alert('Microphone access is required for voice input.');
            setIsRecording(false);
        }
    };

    const stopRecording = () => {
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

                if (audioBlob.size > 500) {
                    setIsTranscribing(true);
                    const text = await transcribeAudio(
                        audioBlob,
                        "Questions or prompts about expenses, tasks, habits, and budgets"
                    );
                    if (text) {
                        setInput(prev => (prev ? `${prev} ${text}` : text));
                        inputRef.current?.focus();
                    }
                }
            } catch (err) {
                console.error('Voice transcription error:', err);
            } finally {
                setIsTranscribing(false);
                setRecordingDuration(0);
            }
        };

        mediaRecorderRef.current.stop();
    };

    const handleSend = async (textToSend) => {
        const queryText = (textToSend || input).trim();
        if (!queryText || loading) return;

        setMessages(prev => [...prev, { role: 'user', content: queryText }]);
        setInput('');
        setLoading(true);
        setCurrentQueryLogs([]);

        try {
            const response = await askAI(queryText, contextData, (query) => {
                setCurrentQueryLogs(prev => [...prev, query]);
            }, messages);

            const followUps = pickFollowUps(response.content, queryText);

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: response.content,
                queries: response.queries,
                followUps,
            }]);
        } catch (error) {
            console.error('AI Error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                isError: true,
                failedQuery: queryText,
                content: "I ran into a temporary rate limit or network delay. You can retry now or ask something else.",
                followUps: ["Give me a quick overview of everything", "Summarize my financial health this month", "What should I focus on?"],
            }]);
        } finally {
            setLoading(false);
            setCurrentQueryLogs([]);
            inputRef.current?.focus();
        }
    };

    const handleClear = () => {
        if (isRecording) {
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            setIsRecording(false);
            setIsTranscribing(false);
            setRecordingDuration(0);
        }
        setMessages([]);
        sessionStorage.removeItem('lifetracker_ai_chat');
        setOpenQueryIndex(null);
        setInput('');
        inputRef.current?.focus();
    };

    const toggleQueries = (idx) => {
        setOpenQueryIndex(openQueryIndex === idx ? null : idx);
    };

    const isEmpty = messages.length === 0;

    /* ─── RENDER ─── */
    return (
        <div className="ai-page">
            {/* ─── Scrollable conversation area ─── */}
            <div className="ai-scroll-area" ref={scrollContainerRef}>

                {/* ═══ EMPTY STATE ═══ */}
                {isEmpty && !loading && (
                    <div className="ai-empty-state">
                        <motion.div
                            className="ai-hero-icon"
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        >
                            <Sparkles size={36} />
                        </motion.div>

                        <motion.h1
                            className="ai-hero-title"
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1, duration: 0.5 }}
                        >
                            What would you like to know?
                        </motion.h1>

                        <motion.p
                            className="ai-hero-subtitle"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.5 }}
                        >
                            I can query your expenses, habits, tasks, and budgets in real-time.
                        </motion.p>

                        <div className="ai-starter-grid">
                            {INITIAL_SUGGESTIONS.map((item, idx) => (
                                <motion.button
                                    key={idx}
                                    className="ai-starter-card"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 + idx * 0.08, duration: 0.4 }}
                                    onClick={() => handleSend(item.query)}
                                    whileHover={{ y: -3, transition: { duration: 0.2 } }}
                                    whileTap={{ scale: 0.97 }}
                                >
                                    <span className="ai-starter-emoji">{item.emoji}</span>
                                    <span className="ai-starter-label">{item.label}</span>
                                    <ArrowRight size={14} className="ai-starter-arrow" />
                                </motion.button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ═══ MESSAGES ═══ */}
                {messages.map((msg, idx) => {
                    const isUser = msg.role === 'user';
                    const isLast = idx === messages.length - 1;

                    return (
                        <motion.div
                            key={idx}
                            className={`ai-msg ${isUser ? 'ai-msg-user' : 'ai-msg-ai'}`}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {isUser ? (
                                <div className="ai-msg-user-bubble">
                                    {msg.content}
                                </div>
                            ) : (
                                <div className="ai-msg-ai-block">
                                    <div className="ai-msg-ai-content">
                                        <MarkdownRenderer content={msg.content} />
                                        {msg.isError && msg.failedQuery && (
                                            <button
                                                className="ai-retry-btn"
                                                onClick={() => handleSend(msg.failedQuery)}
                                                style={{
                                                    marginTop: '10px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '6px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    color: '#f87171',
                                                    fontSize: '12px',
                                                    fontWeight: '500',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <RotateCcw size={12} />
                                                <span>Retry</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Analyzed sources collapsible */}
                                    {msg.queries && msg.queries.length > 0 && (
                                        <div className="ai-sources-section">
                                            <button
                                                className="ai-sources-toggle"
                                                onClick={() => toggleQueries(idx)}
                                            >
                                                <Database size={12} />
                                                <span>{msg.queries.length} {msg.queries.length === 1 ? 'source' : 'sources'} analyzed</span>
                                                {openQueryIndex === idx ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                            </button>

                                            <AnimatePresence>
                                                {openQueryIndex === idx && (
                                                    <motion.div
                                                        className="ai-sources-panel"
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.25 }}
                                                    >
                                                        <div className="ai-sources-inner">
                                                            {msg.queries.map((q, qIdx) => {
                                                                const label = typeof q === 'object' && q?.label 
                                                                    ? q.label 
                                                                    : getHumanReadableQueryDescription(q);
                                                                return (
                                                                    <motion.div
                                                                        key={qIdx}
                                                                        className="ai-sources-entry"
                                                                        initial={{ opacity: 0, x: -8 }}
                                                                        animate={{ opacity: 1, x: 0 }}
                                                                        transition={{ delay: qIdx * 0.05 }}
                                                                    >
                                                                        <span className="ai-sources-bullet">✦</span> {label}
                                                                    </motion.div>
                                                                );
                                                            })}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}

                                    {/* Follow-up suggestions */}
                                    {isLast && msg.followUps && msg.followUps.length > 0 && !loading && (
                                        <div className="ai-followups">
                                            {msg.followUps.map((fu, fuIdx) => (
                                                <motion.button
                                                    key={fuIdx}
                                                    className="ai-followup-chip"
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.15 + fuIdx * 0.08, duration: 0.3 }}
                                                    onClick={() => handleSend(fu)}
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.97 }}
                                                >
                                                    <span>{fu}</span>
                                                    <ArrowRight size={13} />
                                                </motion.button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    );
                })}

                {/* ═══ THINKING STATE ═══ */}
                <AnimatePresence>
                    {loading && (
                        <motion.div
                            className="ai-thinking"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                        >
                            <OrbitalDots />
                            <ThinkingText />

                            {/* Human-understandable faded thinking activity indicator */}
                            <AnimatePresence>
                                {currentQueryLogs.length > 0 && (
                                    <motion.div
                                        className="ai-faded-activity"
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -6 }}
                                        transition={{ duration: 0.25 }}
                                    >
                                        <Sparkles size={13} className="ai-activity-sparkle" />
                                        <span className="ai-activity-text">
                                            {currentQueryLogs[currentQueryLogs.length - 1]?.label ||
                                             getHumanReadableQueryDescription(currentQueryLogs[currentQueryLogs.length - 1])}
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
            </div>

            {/* ─── Input bar ─── */}
            <form
                className="ai-input-bar"
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            >
                {/* Plus / New Chat button on the left */}
                <motion.button
                    type="button"
                    onClick={handleClear}
                    className="ai-new-chat-btn"
                    title="Start new chat"
                    disabled={loading || isRecording || isTranscribing}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="New chat"
                >
                    <Plus size={20} />
                </motion.button>

                {/* Input container with dynamic state */}
                <div className="ai-input-container">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={
                            isRecording 
                                ? `Listening (${recordingDuration}s)... tap mic to stop` 
                                : isTranscribing 
                                ? "Transcribing your voice..." 
                                : "Ask anything about your data..."
                        }
                        disabled={loading || isTranscribing}
                        className={`ai-input ${isRecording ? 'ai-input-recording' : ''}`}
                    />

                    {/* Recording active badge */}
                    {isRecording && (
                        <div className="ai-recording-badge">
                            <span className="ai-recording-dot" />
                            <span>{recordingDuration}s</span>
                        </div>
                    )}
                </div>

                {/* Mic button */}
                <motion.button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={loading || isTranscribing}
                    className={`ai-mic-btn ${isRecording ? 'recording' : ''} ${isTranscribing ? 'transcribing' : ''}`}
                    title={isRecording ? "Stop recording" : isTranscribing ? "Transcribing..." : "Voice input"}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Voice input"
                >
                    {isTranscribing ? (
                        <Loader2 size={18} className="ai-spin" />
                    ) : isRecording ? (
                        <Square size={16} />
                    ) : (
                        <Mic size={18} />
                    )}
                </motion.button>

                {/* Send button */}
                <button
                    type="submit"
                    disabled={!input.trim() || loading || isRecording || isTranscribing}
                    className={`ai-send-btn ${input.trim() && !loading && !isRecording && !isTranscribing ? 'active' : ''}`}
                    title="Send message"
                >
                    <Send size={18} />
                </button>
            </form>

            {/* ─── STYLES ─── */}
            <style>{`
                /* ── Page layout ── */
                .ai-page {
                    display: flex;
                    flex-direction: column;
                    height: calc(100vh - 80px);
                    position: relative;
                    width: 100%;
                    overflow: hidden;
                    margin: -24px;
                    padding: 24px;
                    width: calc(100% + 48px);
                }
                @media (min-width: 768px) {
                    .ai-page {
                        margin: -32px -40px;
                        padding: 32px 40px;
                        width: calc(100% + 80px);
                    }
                }
                @media (max-width: 767px) {
                    .ai-page {
                        height: calc(100dvh - 140px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
                        margin: -16px;
                        padding: 16px;
                        width: calc(100% + 32px);
                    }
                }

                /* ── Scroll area ── */
                .ai-scroll-area {
                    flex: 1;
                    overflow-y: auto;
                    padding: 24px 0 16px;
                    display: flex;
                    flex-direction: column;
                }

                /* ── Empty state ── */
                .ai-empty-state {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    padding: 40px 20px;
                }
                .ai-hero-icon {
                    width: 72px;
                    height: 72px;
                    border-radius: 20px;
                    background: var(--accent-gradient);
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 8px;
                    box-shadow: 0 8px 32px rgba(168, 85, 247, 0.25);
                }
                .ai-hero-title {
                    font-size: 26px;
                    font-weight: 800;
                    color: var(--text-primary);
                    margin: 0;
                    letter-spacing: -0.5px;
                    text-align: center;
                }
                .ai-hero-subtitle {
                    font-size: 15px;
                    color: var(--text-muted);
                    margin: 0 0 20px 0;
                    text-align: center;
                    max-width: 400px;
                    line-height: 1.5;
                }
                .ai-starter-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 10px;
                    width: 100%;
                    max-width: 520px;
                }
                @media (max-width: 480px) {
                    .ai-starter-grid {
                        grid-template-columns: 1fr;
                        max-width: 320px;
                    }
                    .ai-hero-title { font-size: 22px; }
                }
                .ai-starter-card {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 14px 16px;
                    border-radius: 14px;
                    border: 1px solid var(--glass-card-border);
                    background: var(--glass-card-bg);
                    color: var(--text-primary);
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: border-color 0.2s ease;
                    text-align: left;
                }
                .ai-starter-card:hover {
                    border-color: var(--accent-primary);
                }
                .ai-starter-emoji {
                    font-size: 20px;
                    flex-shrink: 0;
                }
                .ai-starter-label { flex: 1; }
                .ai-starter-arrow {
                    color: var(--text-muted);
                    flex-shrink: 0;
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                .ai-starter-card:hover .ai-starter-arrow {
                    opacity: 1;
                }

                /* ── Messages ── */
                .ai-msg {
                    padding: 0 4px;
                    margin-bottom: 6px;
                }
                .ai-msg-user {
                    display: flex;
                    justify-content: flex-end;
                }
                .ai-msg-user-bubble {
                    background: var(--accent-gradient);
                    color: #fff;
                    padding: 12px 18px;
                    border-radius: 20px 20px 4px 20px;
                    font-size: 15px;
                    line-height: 1.6;
                    max-width: 75%;
                    box-shadow: 0 3px 12px rgba(168, 85, 247, 0.2);
                    word-break: break-word;
                }
                .ai-msg-ai-block {
                    max-width: 95%;
                }
                .ai-msg-ai-content {
                    padding: 8px 0 8px 16px;
                    border-left: 3px solid var(--accent-primary);
                    font-size: 15px;
                    line-height: 1.7;
                    color: var(--text-primary);
                    word-break: break-word;
                }

                /* ── Sources section (Human Friendly) ── */
                .ai-sources-section {
                    margin-top: 8px;
                    padding-left: 16px;
                }
                .ai-sources-toggle {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    font-size: 11.5px;
                    font-weight: 600;
                    cursor: pointer;
                    padding: 4px 0;
                    transition: color 0.2s;
                }
                .ai-sources-toggle:hover { color: var(--accent-primary); }
                .ai-sources-panel { overflow: hidden; }
                .ai-sources-inner {
                    margin-top: 6px;
                    padding: 8px 12px;
                    border-radius: 10px;
                    background: var(--glass-card-bg);
                    border: 1px solid var(--border-subtle);
                    font-size: 12px;
                    color: var(--text-secondary);
                    max-height: 180px;
                    overflow-y: auto;
                    backdrop-filter: blur(8px);
                }
                .ai-sources-entry {
                    margin-bottom: 4px;
                    line-height: 1.5;
                    display: flex;
                    align-items: baseline;
                    gap: 6px;
                }
                .ai-sources-bullet {
                    color: var(--accent-primary);
                    font-size: 9px;
                    flex-shrink: 0;
                }

                /* ── Follow-up suggestions ── */
                .ai-followups {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-top: 14px;
                    padding-left: 16px;
                }
                .ai-followup-chip {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 14px;
                    border-radius: 999px;
                    border: 1px solid var(--glass-card-border);
                    background: var(--glass-card-bg);
                    color: var(--text-secondary);
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                }
                .ai-followup-chip:hover {
                    border-color: var(--accent-primary);
                    color: var(--text-primary);
                    background: var(--surface-elevated);
                }
                .ai-followup-chip svg {
                    opacity: 0.5;
                    flex-shrink: 0;
                }

                /* ── Thinking state ── */
                .ai-thinking {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 14px;
                    padding: 28px 20px;
                }

                /* Orbital dots */
                .orbital-container {
                    width: 48px;
                    height: 48px;
                    position: relative;
                }
                .orbital-glow {
                    position: absolute;
                    inset: 4px;
                    border-radius: 50%;
                    background: var(--accent-gradient);
                    opacity: 0.15;
                    filter: blur(10px);
                    animation: pulse-glow 2s ease-in-out infinite;
                }
                .orbital-dot {
                    position: absolute;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--accent-primary);
                    top: 50%;
                    left: 50%;
                    box-shadow: 0 0 8px var(--accent-primary);
                }
                .dot-1 { animation: orbit 1.8s linear infinite; }
                .dot-2 { animation: orbit 1.8s linear infinite; animation-delay: -0.6s; }
                .dot-3 { animation: orbit 1.8s linear infinite; animation-delay: -1.2s; }

                @keyframes orbit {
                    0%   { transform: translate(-50%, -50%) rotate(0deg)   translateX(18px) scale(0.8); opacity: 0.5; }
                    50%  { transform: translate(-50%, -50%) rotate(180deg) translateX(18px) scale(1);   opacity: 1; }
                    100% { transform: translate(-50%, -50%) rotate(360deg) translateX(18px) scale(0.8); opacity: 0.5; }
                }
                @keyframes pulse-glow {
                    0%, 100% { opacity: 0.12; transform: scale(1); }
                    50%      { opacity: 0.25; transform: scale(1.15); }
                }

                /* Faded Activity Line in Thinking */
                .ai-faded-activity {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 14px;
                    border-radius: 999px;
                    background: rgba(102, 126, 234, 0.08);
                    border: 1px solid rgba(102, 126, 234, 0.15);
                    color: var(--text-muted);
                    font-size: 12.5px;
                    font-weight: 500;
                    letter-spacing: -0.01em;
                    animation: fadeInPulse 2s ease-in-out infinite;
                }
                .ai-activity-sparkle {
                    color: var(--accent-primary);
                    opacity: 0.8;
                    flex-shrink: 0;
                }
                .ai-activity-text {
                    opacity: 0.9;
                }

                @keyframes fadeInPulse {
                    0%, 100% { opacity: 0.75; transform: scale(0.99); }
                    50%      { opacity: 1;    transform: scale(1); }
                }

                /* ── Input bar ── */
                .ai-input-bar {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 16px 4px 4px;
                    flex-shrink: 0;
                }

                .ai-new-chat-btn {
                    width: 48px;
                    height: 48px;
                    border-radius: 16px;
                    border: 1px solid var(--glass-card-border);
                    background: var(--glass-card-bg);
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                }
                .ai-new-chat-btn:hover:not(:disabled) {
                    color: var(--text-primary);
                    border-color: var(--accent-primary);
                    background: var(--surface-elevated);
                    box-shadow: 0 4px 14px rgba(102, 126, 234, 0.2);
                }
                .ai-new-chat-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .ai-input-container {
                    flex: 1;
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .ai-input {
                    width: 100%;
                    padding: 14px 18px;
                    padding-right: 70px;
                    border-radius: 16px;
                    border: 1px solid var(--glass-card-border);
                    background: var(--glass-card-bg);
                    color: var(--text-primary);
                    font-size: 15px;
                    font-family: inherit;
                    outline: none;
                    transition: border-color 0.2s ease, box-shadow 0.2s ease;
                }
                .ai-input:focus {
                    border-color: var(--accent-primary);
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }
                .ai-input::placeholder {
                    color: var(--text-muted);
                }
                .ai-input.ai-input-recording {
                    border-color: var(--danger) !important;
                    box-shadow: 0 0 0 3px rgba(245, 101, 101, 0.2) !important;
                }

                .ai-recording-badge {
                    position: absolute;
                    right: 12px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px;
                    border-radius: 999px;
                    background: rgba(245, 101, 101, 0.15);
                    color: var(--danger);
                    font-size: 12px;
                    font-weight: 700;
                    pointer-events: none;
                }

                .ai-recording-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--danger);
                    animation: pulse-recording 1.2s ease-in-out infinite;
                }

                .ai-mic-btn {
                    width: 48px;
                    height: 48px;
                    border-radius: 16px;
                    border: 1px solid var(--glass-card-border);
                    background: var(--glass-card-bg);
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                }
                .ai-mic-btn:hover:not(:disabled) {
                    color: var(--accent-primary);
                    border-color: var(--accent-primary);
                    background: var(--surface-elevated);
                }
                .ai-mic-btn.recording {
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    color: #ffffff;
                    border-color: #ef4444;
                    animation: pulse-mic 1.5s infinite;
                    box-shadow: 0 0 16px rgba(239, 68, 68, 0.5);
                }
                .ai-mic-btn.transcribing {
                    color: var(--accent-primary);
                    border-color: var(--accent-primary);
                    background: var(--surface-elevated);
                }

                .ai-send-btn {
                    width: 48px;
                    height: 48px;
                    border-radius: 16px;
                    border: 1px solid var(--glass-card-border);
                    background: var(--glass-card-bg);
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: default;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                }
                .ai-send-btn.active {
                    background: var(--accent-gradient);
                    color: #fff;
                    border-color: transparent;
                    cursor: pointer;
                    box-shadow: 0 4px 14px rgba(168, 85, 247, 0.3);
                }
                .ai-send-btn.active:hover {
                    box-shadow: 0 6px 20px rgba(168, 85, 247, 0.4);
                }

                .ai-spin {
                    animation: spin 1s linear infinite;
                }

                @keyframes pulse-recording {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(0.85); }
                }

                @keyframes pulse-mic {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); }
                    50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default Assistant;
