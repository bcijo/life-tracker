import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Bot, User } from 'lucide-react';
import { askAI } from '../lib/groq';
import useLifeContext from '../hooks/useLifeContext';

const AskAI = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hi! I'm your personal assistant. I can see your expenses, habits, and tasks. Ask me anything!" }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    // Get real-time data context
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
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting to my brain right now. Please check your API key." }]);
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
                    bottom: '80px', // Above bottom nav
                    right: '20px',
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'var(--text-primary)',
                    color: '#fff',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
                <MessageCircle size={24} />
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
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(5px)'
        }}>
            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '500px',
                height: '80vh',
                display: 'flex',
                flexDirection: 'column',
                background: '#fff',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px',
                    borderBottom: '1px solid #eee',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--text-primary)',
                    color: '#fff'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Bot size={20} />
                        <h3 style={{ fontSize: '16px', fontWeight: '600' }}>AI Assistant</h3>
                    </div>
                    <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                        <X size={24} />
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
                    background: '#f8f9fa'
                }}>
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            style={{
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                padding: '12px 16px',
                                borderRadius: '16px',
                                borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
                                borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
                                background: msg.role === 'user' ? 'var(--text-primary)' : '#fff',
                                color: msg.role === 'user' ? '#fff' : '#333',
                                boxShadow: msg.role === 'assistant' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                fontSize: '15px',
                                lineHeight: '1.4'
                            }}
                        >
                            {msg.content}
                        </div>
                    ))}
                    {loading && (
                        <div style={{ alignSelf: 'flex-start', background: '#fff', padding: '12px', borderRadius: '16px', borderBottomLeftRadius: '4px' }}>
                            <div className="typing-indicator">Thinking...</div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSend} style={{
                    padding: '16px',
                    borderTop: '1px solid #eee',
                    display: 'flex',
                    gap: '12px',
                    background: '#fff'
                }}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about your budget, tasks, or habits..."
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '12px',
                            border: '1px solid #ddd',
                            fontSize: '16px',
                            outline: 'none'
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        style={{
                            background: 'var(--text-primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '12px',
                            width: '48px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: input.trim() ? 'pointer' : 'default',
                            opacity: input.trim() ? 1 : 0.5
                        }}
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AskAI;
