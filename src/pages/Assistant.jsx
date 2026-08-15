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
    ArrowRight
} from 'lucide-react';
import { askAI } from '../lib/groq';
import useLifeContext from '../hooks/useLifeContext';

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

    const contextData = useLifeContext();
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const scrollContainerRef = useRef(null);

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
            });

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
                content: "I ran into an issue processing your request. Please check your connection and try again.",
                followUps: ["Give me a quick overview of everything", "Summarize my financial health this month", "What should I focus on?"],
            }]);
        } finally {
            setLoading(false);
            setCurrentQueryLogs([]);
            inputRef.current?.focus();
        }
    };

    const handleClear = () => {
        setMessages([]);
        sessionStorage.removeItem('lifetracker_ai_chat');
        setOpenQueryIndex(null);
    };

    const toggleQueries = (idx) => {
        setOpenQueryIndex(openQueryIndex === idx ? null : idx);
    };

    const isEmpty = messages.length === 0;

    /* ─── RENDER ─── */
    return (
        <div className="ai-page">
            {/* Clear button — top right */}
            {!isEmpty && (
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="ai-clear-btn"
                    onClick={handleClear}
                    title="Clear conversation"
                >
                    <RotateCcw size={14} />
                    <span>New chat</span>
                </motion.button>
            )}

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
                                        {msg.content}
                                    </div>

                                    {/* SQL queries collapsible */}
                                    {msg.queries && msg.queries.length > 0 && (
                                        <div className="ai-sql-section">
                                            <button
                                                className="ai-sql-toggle"
                                                onClick={() => toggleQueries(idx)}
                                            >
                                                <Database size={12} />
                                                <span>{msg.queries.length} {msg.queries.length === 1 ? 'query' : 'queries'} executed</span>
                                                {openQueryIndex === idx ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                            </button>

                                            <AnimatePresence>
                                                {openQueryIndex === idx && (
                                                    <motion.div
                                                        className="ai-sql-panel"
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.25 }}
                                                    >
                                                        <div className="ai-sql-inner">
                                                            {msg.queries.map((q, qIdx) => (
                                                                <motion.div
                                                                    key={qIdx}
                                                                    className="ai-sql-entry"
                                                                    initial={{ opacity: 0, x: -8 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    transition={{ delay: qIdx * 0.06 }}
                                                                >
                                                                    <span className="ai-sql-prefix">{'>'}</span> {q}
                                                                </motion.div>
                                                            ))}
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

                            {/* Live SQL terminal */}
                            <AnimatePresence>
                                {currentQueryLogs.length > 0 && (
                                    <motion.div
                                        className="ai-live-terminal"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <div className="ai-live-terminal-header">
                                            <Terminal size={11} />
                                            <span>Live SQL</span>
                                        </div>
                                        {currentQueryLogs.map((q, qIdx) => (
                                            <motion.div
                                                key={qIdx}
                                                className="ai-live-terminal-line"
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: qIdx * 0.05 }}
                                            >
                                                <span className="ai-sql-prefix">{'>'}</span> {q}
                                            </motion.div>
                                        ))}
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
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask anything about your data..."
                    disabled={loading}
                    className="ai-input"
                />
                <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className={`ai-send-btn ${input.trim() && !loading ? 'active' : ''}`}
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
                        height: calc(100vh - 140px);
                        margin: -16px;
                        padding: 16px;
                        width: calc(100% + 32px);
                    }
                }

                /* ── Clear button ── */
                .ai-clear-btn {
                    position: absolute;
                    top: 0;
                    right: 0;
                    z-index: 10;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 14px;
                    border: none;
                    background: transparent;
                    color: var(--text-muted);
                    font-size: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                }
                .ai-clear-btn:hover {
                    color: var(--text-primary);
                    background: var(--glass-card-bg);
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
                    padding: 16px 0 8px 16px;
                    border-left: 3px solid var(--accent-primary);
                    font-size: 15px;
                    line-height: 1.7;
                    color: var(--text-primary);
                    white-space: pre-wrap;
                    word-break: break-word;
                }

                /* ── SQL section ── */
                .ai-sql-section {
                    margin-top: 6px;
                    padding-left: 16px;
                }
                .ai-sql-toggle {
                    display: inline-flex;
                    align-items: center;
                    gap: 5px;
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    font-size: 11.5px;
                    font-weight: 600;
                    cursor: pointer;
                    padding: 4px 0;
                    transition: color 0.2s;
                }
                .ai-sql-toggle:hover { color: var(--accent-primary); }
                .ai-sql-panel { overflow: hidden; }
                .ai-sql-inner {
                    margin-top: 6px;
                    padding: 10px 12px;
                    border-radius: 10px;
                    background: #141520;
                    border: 1px solid #232538;
                    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                    font-size: 11.5px;
                    color: #9ece6a;
                    max-height: 180px;
                    overflow-y: auto;
                }
                .ai-sql-entry {
                    margin-bottom: 4px;
                    white-space: pre-wrap;
                    line-height: 1.5;
                }
                .ai-sql-prefix { color: #e0af68; font-weight: 700; }

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
                    gap: 16px;
                    padding: 32px 20px;
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

                /* Live terminal in thinking */
                .ai-live-terminal {
                    width: 100%;
                    max-width: 480px;
                    overflow: hidden;
                    border-radius: 10px;
                    background: #141520;
                    border: 1px solid #232538;
                    font-family: 'Consolas', 'Monaco', monospace;
                    font-size: 11.5px;
                    color: #9ece6a;
                    padding: 10px 14px;
                }
                .ai-live-terminal-header {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    color: #bb9af7;
                    font-weight: 700;
                    font-size: 11px;
                    margin-bottom: 6px;
                    padding-bottom: 5px;
                    border-bottom: 1px solid #232538;
                }
                .ai-live-terminal-line {
                    white-space: pre-wrap;
                    margin-bottom: 3px;
                    line-height: 1.5;
                }

                /* ── Input bar ── */
                .ai-input-bar {
                    display: flex;
                    gap: 10px;
                    padding: 16px 4px 4px;
                    flex-shrink: 0;
                }
                .ai-input {
                    flex: 1;
                    padding: 14px 18px;
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
                .ai-send-btn {
                    width: 50px;
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
            `}</style>
        </div>
    );
};

export default Assistant;
