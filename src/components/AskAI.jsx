import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Bot, Database, ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import { askAI } from '../lib/groq';
import useLifeContext from '../hooks/useLifeContext';

const AskAI = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hi! I'm your personal assistant. I can see your expenses, habits, and tasks. Ask me anything!" }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [currentQueryLogs, setCurrentQueryLogs] = useState([]);
    const [openQueryIndex, setOpenQueryIndex] = useState(null);

    const contextData = useLifeContext();
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen, currentQueryLogs, loading]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = input;
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setInput('');
        setLoading(true);
        setCurrentQueryLogs([]);

        try {
            const response = await askAI(userMessage, contextData, (query) => {
                setCurrentQueryLogs(prev => [...prev, query]);
            });
            
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: response.content, 
                queries: response.queries 
            }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: "Sorry, I ran into an error executing your request. Please check that your Supabase execute_read_only_query function is created." 
            }]);
        } finally {
            setLoading(false);
            setCurrentQueryLogs([]);
        }
    };

    const toggleQueriesCollapse = (idx) => {
        setOpenQueryIndex(openQueryIndex === idx ? null : idx);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: '88px',
                    right: '20px',
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    background: 'var(--accent-gradient)',
                    color: '#fff',
                    border: 'none',
                    boxShadow: '0 8px 24px rgba(100, 120, 240, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 30px rgba(100, 120, 240, 0.5)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.transform = 'scale(1) translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(100, 120, 240, 0.4)';
                }}
            >
                <MessageCircle size={22} />
            </button>
        );
    }

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            background: 'var(--overlay-bg)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
        }}>
            <div style={{
                width: '100%',
                maxWidth: '500px',
                height: '80vh',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--surface-elevated)',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
                border: '1px solid var(--glass-border)',
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--accent-gradient)',
                    color: '#fff',
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Bot size={20} />
                        <h3 style={{ fontSize: '16px', fontWeight: '600' }}>AI Assistant (SQL Mode)</h3>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        style={{
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            padding: '6px',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Messages */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    background: 'var(--bg-solid)',
                }}>
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            style={{
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                            }}
                        >
                            <div
                                style={{
                                    padding: '12px 16px',
                                    borderRadius: '18px',
                                    borderBottomRightRadius: msg.role === 'user' ? '4px' : '18px',
                                    borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '18px',
                                    background: msg.role === 'user'
                                        ? 'var(--accent-gradient)'
                                        : 'var(--glass-card-bg)',
                                    border: msg.role === 'assistant' ? '1px solid var(--glass-card-border)' : 'none',
                                    color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                    fontSize: '14px',
                                    lineHeight: '1.5',
                                    textAlign: 'left'
                                }}
                            >
                                {msg.content}
                            </div>
                            
                            {/* COLLAPSIBLE SQL QUERY LOGS */}
                            {msg.queries && msg.queries.length > 0 && (
                                <div style={{ alignSelf: 'flex-start', width: '100%' }}>
                                    <button
                                        onClick={() => toggleQueriesCollapse(idx)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--accent-primary)',
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            padding: '2px 8px',
                                            cursor: 'pointer',
                                            outline: 'none',
                                        }}
                                    >
                                        <Database size={12} />
                                        <span>Queries Executed ({msg.queries.length})</span>
                                        {openQueryIndex === idx ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                    </button>
                                    
                                    {openQueryIndex === idx && (
                                        <div style={{
                                            marginTop: '6px',
                                            padding: '10px',
                                            borderRadius: '8px',
                                            background: 'rgba(0,0,0,0.04)',
                                            border: '1px dashed var(--border-subtle)',
                                            fontFamily: 'monospace',
                                            fontSize: '11px',
                                            color: 'var(--text-secondary)',
                                            textAlign: 'left',
                                            whiteSpace: 'pre-wrap',
                                            maxHeight: '150px',
                                            overflowY: 'auto'
                                        }}>
                                            {msg.queries.map((q, qIdx) => (
                                                <div key={qIdx} style={{ marginBottom: qIdx < msg.queries.length - 1 ? '8px' : 0 }}>
                                                    <span style={{ color: 'var(--accent-secondary)' }}>Query #{qIdx+1}:</span> {q}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    
                    {/* Real-time Query Running Log inside Loading state */}
                    {loading && (
                        <div style={{
                            alignSelf: 'flex-start',
                            maxWidth: '85%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}>
                            <div style={{
                                background: 'var(--glass-card-bg)',
                                border: '1px solid var(--glass-card-border)',
                                padding: '12px 16px',
                                borderRadius: '18px',
                                borderBottomLeftRadius: '4px',
                                color: 'var(--text-muted)',
                                fontSize: '13px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <Bot size={16} className="spin" style={{ color: 'var(--accent-primary)' }} />
                                <span>AI is gathering details...</span>
                            </div>

                            {currentQueryLogs.length > 0 && (
                                <div style={{
                                    alignSelf: 'flex-start',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    padding: '10px 12px',
                                    borderRadius: '12px',
                                    background: '#1a1b26',
                                    border: '1px solid #2f344d',
                                    color: '#73daca',
                                    fontFamily: 'monospace',
                                    fontSize: '11px',
                                    maxWidth: '380px',
                                    boxShadow: '0 6px 16px rgba(0,0,0,0.1)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c0caf5', borderBottom: '1px solid #2f344d', paddingBottom: '4px', marginBottom: '4px' }}>
                                        <Terminal size={12} />
                                        <span style={{ fontWeight: '600' }}>Active SQL Logs</span>
                                    </div>
                                    {currentQueryLogs.map((q, qIdx) => (
                                        <div key={qIdx} style={{ whiteSpace: 'pre-wrap', color: '#9ece6a' }}>
                                            <span style={{ color: '#e0af68' }}>&gt;</span> {q}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form
                    onSubmit={handleSend}
                    style={{
                        padding: '16px',
                        borderTop: '1px solid var(--border-subtle)',
                        display: 'flex',
                        gap: '10px',
                        background: 'var(--surface-elevated)',
                        flexShrink: 0,
                    }}
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask SQL Agent anything about your data..."
                        style={{
                            flex: 1,
                            padding: '12px 16px',
                            borderRadius: '14px',
                            border: '1px solid var(--surface-input-border)',
                            background: 'var(--surface-input)',
                            color: 'var(--text-primary)',
                            fontSize: '15px',
                            outline: 'none',
                            transition: 'border-color 0.2s ease',
                        }}
                        onFocus={e => e.target.style.borderColor = 'var(--accent-primary)'}
                        onBlur={e => e.target.style.borderColor = 'var(--surface-input-border)'}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        style={{
                            background: input.trim() ? 'var(--accent-gradient)' : 'var(--glass-card-bg)',
                            color: input.trim() ? '#fff' : 'var(--text-muted)',
                            border: '1px solid var(--glass-card-border)',
                            borderRadius: '14px',
                            width: '48px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: input.trim() ? 'pointer' : 'default',
                            transition: 'all 0.2s ease',
                            flexShrink: 0,
                        }}
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
            <style>{`
                .spin { animation: spin 2s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default AskAI;
