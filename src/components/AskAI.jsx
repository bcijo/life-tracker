import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Bot } from 'lucide-react';
import { askAI } from '../lib/groq';
import useLifeContext from '../hooks/useLifeContext';

const AskAI = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hi! I'm your personal assistant. I can see your expenses, habits, and tasks. Ask me anything!" }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const contextData = useLifeContext();
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = input;
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setInput('');
        setLoading(true);

        try {
            const response = await askAI(userMessage, contextData);
            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting. Please check your API key." }]);
        } finally {
            setLoading(false);
        }
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
                    boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)';
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
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
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
                        <h3 style={{ fontSize: '16px', fontWeight: '600' }}>AI Assistant</h3>
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
                    gap: '12px',
                    background: 'var(--glass-bg)',
                }}>
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            style={{
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                padding: '12px 16px',
                                borderRadius: '18px',
                                borderBottomRightRadius: msg.role === 'user' ? '4px' : '18px',
                                borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '18px',
                                background: msg.role === 'user'
                                    ? 'var(--accent-gradient)'
                                    : 'var(--surface-elevated)',
                                border: msg.role === 'assistant' ? '1px solid var(--glass-card-border)' : 'none',
                                color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                fontSize: '15px',
                                lineHeight: '1.5',
                            }}
                        >
                            {msg.content}
                        </div>
                    ))}
                    {loading && (
                        <div style={{
                            alignSelf: 'flex-start',
                            background: 'var(--surface-elevated)',
                            border: '1px solid var(--glass-card-border)',
                            padding: '12px 16px',
                            borderRadius: '18px',
                            borderBottomLeftRadius: '4px',
                            color: 'var(--text-muted)',
                            fontSize: '14px',
                        }}>
                            Thinking...
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
                        placeholder="Ask about your budget, tasks, or habits..."
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
        </div>
    );
};

export default AskAI;
