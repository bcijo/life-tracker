import React, { useState, useRef, useEffect } from 'react';
import { 
    Bot, 
    Sparkles, 
    Send, 
    Trash2, 
    Database, 
    ChevronDown, 
    ChevronUp, 
    Terminal, 
    DollarSign, 
    Activity, 
    CheckSquare, 
    ArrowRight,
    Zap
} from 'lucide-react';
import { askAI } from '../lib/groq';
import useLifeContext from '../hooks/useLifeContext';

const SUGGESTED_PROMPTS = [
    {
        icon: DollarSign,
        label: "Spending Breakdown",
        query: "How much did I spend this month and what are my top expense categories?",
        color: "#22c55e"
    },
    {
        icon: Activity,
        label: "Habit Streaks",
        query: "Which habits have I maintained well, and which ones did I miss recently?",
        color: "#a855f7"
    },
    {
        icon: DollarSign,
        label: "Budget Status",
        query: "Am I currently over budget on any category this month?",
        color: "#f59e0b"
    },
    {
        icon: CheckSquare,
        label: "Pending Tasks",
        query: "What urgent tasks or upcoming todos do I need to complete?",
        color: "#6366f1"
    }
];

const INITIAL_MESSAGE = {
    role: 'assistant',
    content: "Hi! I'm your LifeTracker AI Assistant. I can analyze your expenses, monitor your habits, and check your pending todos directly using live SQL queries on your data. What would you like to explore today?"
};

const Assistant = () => {
    const [messages, setMessages] = useState(() => {
        try {
            const saved = sessionStorage.getItem('lifetracker_ai_chat');
            return saved ? JSON.parse(saved) : [INITIAL_MESSAGE];
        } catch {
            return [INITIAL_MESSAGE];
        }
    });
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentQueryLogs, setCurrentQueryLogs] = useState([]);
    const [openQueryIndex, setOpenQueryIndex] = useState(null);

    const contextData = useLifeContext();
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, currentQueryLogs, loading]);

    useEffect(() => {
        try {
            sessionStorage.setItem('lifetracker_ai_chat', JSON.stringify(messages));
        } catch (e) {
            console.error('Failed to save chat to session storage:', e);
        }
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

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: response.content,
                queries: response.queries
            }]);
        } catch (error) {
            console.error('AI Error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "Sorry, I ran into an issue answering your question. Please ensure your database connection is active and try again."
            }]);
        } finally {
            setLoading(false);
            setCurrentQueryLogs([]);
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }
    };

    const handleClearChat = () => {
        setMessages([INITIAL_MESSAGE]);
        sessionStorage.removeItem('lifetracker_ai_chat');
        setOpenQueryIndex(null);
    };

    const toggleQueriesCollapse = (idx) => {
        setOpenQueryIndex(openQueryIndex === idx ? null : idx);
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 120px)',
            maxWidth: '900px',
            margin: '0 auto',
            width: '100%',
        }}>
            {/* Header */}
            <div className="glass-panel" style={{
                padding: '16px 20px',
                borderRadius: '20px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
                border: '1px solid var(--glass-border)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '14px',
                        background: 'var(--accent-gradient)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        boxShadow: '0 4px 16px rgba(168, 85, 247, 0.35)',
                    }}>
                        <Sparkles size={22} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h1 style={{
                                fontSize: '18px',
                                fontWeight: '800',
                                color: 'var(--text-primary)',
                                margin: 0,
                                letterSpacing: '-0.3px',
                            }}>
                                AI Assistant
                            </h1>
                            <span style={{
                                fontSize: '10px',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                background: 'rgba(99, 102, 241, 0.15)',
                                color: 'var(--accent-primary)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                letterSpacing: '0.5px',
                            }}>
                                SQL Mode
                            </span>
                        </div>
                        <p style={{
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                            margin: 0,
                            marginTop: '2px',
                        }}>
                            Ask questions about your finances, habits, tasks, and budgets
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleClearChat}
                    title="Reset Conversation"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        borderRadius: '12px',
                        border: '1px solid var(--glass-card-border)',
                        background: 'var(--glass-card-bg)',
                        color: 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.color = 'var(--danger)';
                        e.currentTarget.style.borderColor = 'var(--danger)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.color = 'var(--text-secondary)';
                        e.currentTarget.style.borderColor = 'var(--glass-card-border)';
                    }}
                >
                    <Trash2 size={14} />
                    <span className="hide-on-mobile">Clear</span>
                </button>
            </div>

            {/* Conversation Area */}
            <div className="glass-panel" style={{
                flex: 1,
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                border: '1px solid var(--glass-border)',
                background: 'var(--surface-elevated)',
            }}>
                {/* Message Stream */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                }}>
                    {/* Prompt suggestions if only starting message */}
                    {messages.length <= 1 && (
                        <div style={{
                            marginBottom: '16px',
                            padding: '16px',
                            borderRadius: '16px',
                            background: 'var(--glass-card-bg)',
                            border: '1px dashed var(--glass-card-border)',
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: 'var(--text-secondary)',
                                fontSize: '13px',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '12px',
                            }}>
                                <Zap size={15} style={{ color: 'var(--accent-primary)' }} />
                                Suggested Queries
                            </div>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                gap: '10px',
                            }}>
                                {SUGGESTED_PROMPTS.map((item, idx) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleSend(item.query)}
                                            style={{
                                                padding: '12px 14px',
                                                borderRadius: '12px',
                                                border: '1px solid var(--glass-card-border)',
                                                background: 'var(--glass-card-bg)',
                                                color: 'var(--text-primary)',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: '10px',
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                                                e.currentTarget.style.background = 'var(--surface-elevated)';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.borderColor = 'var(--glass-card-border)';
                                                e.currentTarget.style.background = 'var(--glass-card-bg)';
                                            }}
                                        >
                                            <div style={{
                                                padding: '6px',
                                                borderRadius: '8px',
                                                background: `${item.color}20`,
                                                color: item.color,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                marginTop: '2px',
                                            }}>
                                                <Icon size={16} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                    {item.label}
                                                </div>
                                                <div style={{
                                                    fontSize: '11px',
                                                    color: 'var(--text-muted)',
                                                    marginTop: '2px',
                                                    lineHeight: '1.4',
                                                }}>
                                                    {item.query}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    {messages.map((msg, idx) => {
                        const isUser = msg.role === 'user';
                        return (
                            <div
                                key={idx}
                                style={{
                                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                                    maxWidth: isUser ? '85%' : '90%',
                                    display: 'flex',
                                    gap: '12px',
                                    flexDirection: isUser ? 'row-reverse' : 'row',
                                }}
                            >
                                {!isUser && (
                                    <div style={{
                                        width: '34px',
                                        height: '34px',
                                        borderRadius: '10px',
                                        background: 'var(--accent-gradient)',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        boxShadow: '0 2px 8px rgba(168, 85, 247, 0.3)',
                                    }}>
                                        <Bot size={18} />
                                    </div>
                                )}

                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    alignItems: isUser ? 'flex-end' : 'flex-start',
                                }}>
                                    <div style={{
                                        padding: '14px 18px',
                                        borderRadius: '18px',
                                        borderBottomRightRadius: isUser ? '4px' : '18px',
                                        borderBottomLeftRadius: !isUser ? '4px' : '18px',
                                        background: isUser ? 'var(--accent-gradient)' : 'var(--glass-card-bg)',
                                        color: isUser ? '#fff' : 'var(--text-primary)',
                                        border: !isUser ? '1px solid var(--glass-card-border)' : 'none',
                                        fontSize: '14.5px',
                                        lineHeight: '1.6',
                                        boxShadow: isUser 
                                            ? '0 4px 14px rgba(168, 85, 247, 0.25)' 
                                            : '0 2px 8px rgba(0,0,0,0.04)',
                                        whiteSpace: 'pre-wrap',
                                    }}>
                                        {msg.content}
                                    </div>

                                    {/* Collapsible SQL Queries */}
                                    {msg.queries && msg.queries.length > 0 && (
                                        <div style={{ width: '100%', maxWidth: '100%' }}>
                                            <button
                                                onClick={() => toggleQueriesCollapse(idx)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'var(--accent-primary)',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    padding: '4px 6px',
                                                    cursor: 'pointer',
                                                    outline: 'none',
                                                }}
                                            >
                                                <Database size={13} />
                                                <span>SQL Executed ({msg.queries.length})</span>
                                                {openQueryIndex === idx ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                            </button>

                                            {openQueryIndex === idx && (
                                                <div style={{
                                                    marginTop: '6px',
                                                    padding: '12px 14px',
                                                    borderRadius: '12px',
                                                    background: '#161822',
                                                    border: '1px solid #282c3f',
                                                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                                    fontSize: '12px',
                                                    color: '#73daca',
                                                    textAlign: 'left',
                                                    whiteSpace: 'pre-wrap',
                                                    maxHeight: '220px',
                                                    overflowY: 'auto',
                                                    boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
                                                }}>
                                                    {msg.queries.map((q, qIdx) => (
                                                        <div key={qIdx} style={{ marginBottom: qIdx < msg.queries.length - 1 ? '10px' : 0 }}>
                                                            <div style={{ color: '#ff9e64', fontWeight: '700', marginBottom: '2px' }}>
                                                                Query #{qIdx + 1}:
                                                            </div>
                                                            <div style={{ color: '#9ece6a' }}>{q}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Live Query Execution Feedback while loading */}
                    {loading && (
                        <div style={{
                            display: 'flex',
                            gap: '12px',
                            alignItems: 'flex-start',
                        }}>
                            <div style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '10px',
                                background: 'var(--accent-gradient)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <Bot size={18} className="spin" />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{
                                    padding: '12px 16px',
                                    borderRadius: '16px',
                                    borderBottomLeftRadius: '4px',
                                    background: 'var(--glass-card-bg)',
                                    border: '1px solid var(--glass-card-border)',
                                    color: 'var(--text-secondary)',
                                    fontSize: '13.5px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                }}>
                                    <Sparkles size={15} className="spin" style={{ color: 'var(--accent-primary)' }} />
                                    <span>Analyzing your data...</span>
                                </div>

                                {currentQueryLogs.length > 0 && (
                                    <div style={{
                                        padding: '10px 14px',
                                        borderRadius: '12px',
                                        background: '#161822',
                                        border: '1px solid #282c3f',
                                        color: '#73daca',
                                        fontFamily: 'monospace',
                                        fontSize: '11.5px',
                                        maxWidth: '450px',
                                        boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            color: '#bb9af7',
                                            borderBottom: '1px solid #282c3f',
                                            paddingBottom: '4px',
                                            marginBottom: '6px',
                                            fontWeight: '700',
                                        }}>
                                            <Terminal size={12} />
                                            Active Database Queries
                                        </div>
                                        {currentQueryLogs.map((q, qIdx) => (
                                            <div key={qIdx} style={{ whiteSpace: 'pre-wrap', color: '#9ece6a', marginBottom: '4px' }}>
                                                <span style={{ color: '#e0af68' }}>&gt;</span> {q}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                    }}
                    style={{
                        padding: '16px 20px',
                        borderTop: '1px solid var(--border-subtle)',
                        display: 'flex',
                        gap: '12px',
                        background: 'var(--surface-elevated)',
                        flexShrink: 0,
                    }}
                >
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask SQL Assistant anything about your expenses, habits, or todos..."
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '14px 18px',
                            borderRadius: '14px',
                            border: '1px solid var(--surface-input-border)',
                            background: 'var(--surface-input)',
                            color: 'var(--text-primary)',
                            fontSize: '14.5px',
                            outline: 'none',
                            transition: 'all 0.2s ease',
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                        onBlur={e => e.target.style.borderColor = 'var(--surface-input-border)'}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        style={{
                            background: input.trim() && !loading ? 'var(--accent-gradient)' : 'var(--glass-card-bg)',
                            color: input.trim() && !loading ? '#fff' : 'var(--text-muted)',
                            border: '1px solid var(--glass-card-border)',
                            borderRadius: '14px',
                            padding: '0 20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: input.trim() && !loading ? 'pointer' : 'default',
                            transition: 'all 0.2s ease',
                            fontWeight: '600',
                            gap: '6px',
                            boxShadow: input.trim() && !loading ? '0 4px 14px rgba(168, 85, 247, 0.3)' : 'none',
                        }}
                    >
                        <Send size={18} />
                        <span className="hide-on-mobile">Send</span>
                    </button>
                </form>
            </div>

            <style>{`
                .spin {
                    animation: spin 2s linear infinite;
                }
                @keyframes spin {
                    100% { transform: rotate(360deg); }
                }
                @media (max-width: 600px) {
                    .hide-on-mobile {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default Assistant;
