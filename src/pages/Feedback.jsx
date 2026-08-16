import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare,
    Mic,
    MicOff,
    Send,
    CheckCircle2,
    Bug,
    Lightbulb,
    MessageCircle,
    Filter,
    Inbox,
    ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import useAuth from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import '../styles/feedback.css';

const ADMIN_EMAIL = 'abhin.vinu@gmail.com';

const CATEGORIES = [
    { id: 'bug', label: 'Bug Report', emoji: '🐛', icon: Bug, color: '#ef4444' },
    { id: 'feature', label: 'Feature Request', emoji: '💡', icon: Lightbulb, color: '#3b82f6' },
    { id: 'general', label: 'General', emoji: '💬', icon: MessageCircle, color: '#8b5cf6' },
];

const Feedback = () => {
    const { user } = useAuth();
    const { profile } = useProfile();
    const navigate = useNavigate();

    const isAdmin = user?.email === ADMIN_EMAIL;

    // --- User form state ---
    const [category, setCategory] = useState('general');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [myFeedback, setMyFeedback] = useState([]);

    // --- Voice recording state ---
    const [isRecording, setIsRecording] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(false);
    const recognitionRef = useRef(null);

    // --- Admin state ---
    const [allFeedback, setAllFeedback] = useState([]);
    const [filterCategory, setFilterCategory] = useState('all');
    const [loading, setLoading] = useState(true);

    // Check for SpeechRecognition support
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        setSpeechSupported(!!SpeechRecognition);
    }, []);

    // Fetch feedback data
    useEffect(() => {
        if (!user) return;
        if (isAdmin) {
            fetchAllFeedback();
        } else {
            fetchMyFeedback();
        }
    }, [user, isAdmin]);

    const fetchAllFeedback = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('feedback')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAllFeedback(data || []);
        } catch (err) {
            console.error('Error fetching all feedback:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMyFeedback = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('feedback')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMyFeedback(data || []);
        } catch (err) {
            console.error('Error fetching my feedback:', err);
        } finally {
            setLoading(false);
        }
    };

    // --- Voice Recording ---
    const startRecording = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let finalTranscript = message;

        recognition.onresult = (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += (finalTranscript ? ' ' : '') + transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            setMessage(finalTranscript + (interimTranscript ? ' ' + interimTranscript : ''));
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsRecording(false);
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsRecording(true);
    }, [message]);

    const stopRecording = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsRecording(false);
    }, []);

    const toggleRecording = useCallback(() => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }, [isRecording, startRecording, stopRecording]);

    // --- Submit Feedback ---
    const handleSubmit = async () => {
        if (!message.trim() || submitting) return;

        setSubmitting(true);
        try {
            const displayName = profile?.display_name || profile?.full_name || user.email?.split('@')[0] || 'Anonymous';

            const { error } = await supabase.from('feedback').insert([{
                user_id: user.id,
                user_email: user.email,
                user_display_name: displayName,
                category,
                message: message.trim(),
            }]);

            if (error) throw error;

            setSubmitted(true);
            setMessage('');
            setCategory('general');

            // Refresh the user's feedback list
            fetchMyFeedback();

            setTimeout(() => setSubmitted(false), 3000);
        } catch (err) {
            console.error('Error submitting feedback:', err);
            alert('Failed to submit feedback. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // --- Helpers ---
    const formatTimestamp = (ts) => {
        const date = new Date(ts);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    };

    const getCategoryBadge = (cat) => {
        const c = CATEGORIES.find(c => c.id === cat) || CATEGORIES[2];
        return (
            <span className={`feedback-badge ${cat}`}>
                {c.emoji} {c.label}
            </span>
        );
    };

    const filteredFeedback = filterCategory === 'all'
        ? allFeedback
        : allFeedback.filter(f => f.category === filterCategory);

    const stats = {
        total: allFeedback.length,
        bugs: allFeedback.filter(f => f.category === 'bug').length,
        features: allFeedback.filter(f => f.category === 'feature').length,
        general: allFeedback.filter(f => f.category === 'general').length,
    };

    // ============================================================
    // ADMIN VIEW
    // ============================================================
    if (isAdmin) {
        return (
            <motion.div
                className="feedback-page"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                {/* Header */}
                <div className="feedback-page-header">
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button
                                onClick={() => navigate(-1)}
                                style={{
                                    background: 'var(--surface-input)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    width: '34px',
                                    height: '34px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                }}
                            >
                                <ArrowLeft size={18} />
                            </button>
                            <h1>Feedback Dashboard</h1>
                        </div>
                        <p style={{ marginLeft: '44px' }}>All user feedback in one place</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="feedback-stats">
                    <div className="feedback-stat-card">
                        <div className="feedback-stat-number">{stats.total}</div>
                        <div className="feedback-stat-label">Total</div>
                    </div>
                    <div className="feedback-stat-card">
                        <div className="feedback-stat-number" style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{stats.bugs}</div>
                        <div className="feedback-stat-label">🐛 Bugs</div>
                    </div>
                    <div className="feedback-stat-card">
                        <div className="feedback-stat-number" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{stats.features}</div>
                        <div className="feedback-stat-label">💡 Features</div>
                    </div>
                    <div className="feedback-stat-card">
                        <div className="feedback-stat-number" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{stats.general}</div>
                        <div className="feedback-stat-label">💬 General</div>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="feedback-filter-bar">
                    {[
                        { id: 'all', label: 'All' },
                        { id: 'bug', label: '🐛 Bugs' },
                        { id: 'feature', label: '💡 Features' },
                        { id: 'general', label: '💬 General' },
                    ].map(f => (
                        <button
                            key={f.id}
                            className={`feedback-filter-btn ${filterCategory === f.id ? 'active' : ''}`}
                            onClick={() => setFilterCategory(f.id)}
                        >
                            {f.label}
                            {f.id !== 'all' && (
                                <span style={{ marginLeft: '4px', opacity: 0.7 }}>
                                    ({f.id === 'bug' ? stats.bugs : f.id === 'feature' ? stats.features : stats.general})
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Feedback List */}
                {loading ? (
                    <div className="feedback-empty">
                        <div className="feedback-empty-icon">⏳</div>
                        <h3>Loading feedback…</h3>
                    </div>
                ) : filteredFeedback.length === 0 ? (
                    <div className="feedback-empty">
                        <div className="feedback-empty-icon">
                            <Inbox size={48} style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <h3>No feedback yet</h3>
                        <p>Feedback from users will appear here</p>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {filteredFeedback.map((fb, i) => (
                            <motion.div
                                key={fb.id}
                                className="feedback-card"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.2, delay: i * 0.03 }}
                            >
                                <div className="feedback-card-header">
                                    <div className="feedback-card-user">
                                        <div className="feedback-card-avatar">
                                            {(fb.user_display_name || fb.user_email || 'U')[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="feedback-card-name">
                                                {fb.user_display_name || 'Unknown User'}
                                            </div>
                                            <div className="feedback-card-email">{fb.user_email}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                        {getCategoryBadge(fb.category)}
                                        <span className="feedback-card-timestamp">{formatTimestamp(fb.created_at)}</span>
                                    </div>
                                </div>
                                <div className="feedback-card-message">{fb.message}</div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </motion.div>
        );
    }

    // ============================================================
    // USER VIEW — Feedback Submission Form
    // ============================================================
    return (
        <motion.div
            className="feedback-page"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Header */}
            <div className="feedback-page-header">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            onClick={() => navigate(-1)}
                            style={{
                                background: 'var(--surface-input)',
                                border: 'none',
                                borderRadius: '10px',
                                width: '34px',
                                height: '34px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                            }}
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <h1>Send Feedback</h1>
                    </div>
                    <p style={{ marginLeft: '44px' }}>Help us improve — type or record your thoughts</p>
                </div>
            </div>

            {/* Category Selector */}
            <div className="feedback-categories">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        className={`feedback-category-btn ${category === cat.id ? 'active' : ''}`}
                        onClick={() => setCategory(cat.id)}
                        style={category === cat.id ? { borderColor: cat.color, boxShadow: `0 0 0 3px ${cat.color}20` } : {}}
                    >
                        <span className="emoji">{cat.emoji}</span>
                        <span>{cat.label}</span>
                    </button>
                ))}
            </div>

            {/* Recording Indicator */}
            <AnimatePresence>
                {isRecording && (
                    <motion.div
                        className="feedback-recording-indicator"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <div className="feedback-recording-dot" />
                        <span>Listening… speak your feedback</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Textarea + Mic */}
            <div className="feedback-textarea-wrapper">
                <textarea
                    className="feedback-textarea"
                    placeholder="Describe your feedback here… or tap the mic 🎤"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                />
                {speechSupported && (
                    <button
                        className={`feedback-mic-btn ${isRecording ? 'recording' : ''}`}
                        onClick={toggleRecording}
                        title={isRecording ? 'Stop recording' : 'Start voice recording'}
                        type="button"
                    >
                        {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                )}
            </div>

            {/* Submit */}
            <AnimatePresence mode="wait">
                {submitted ? (
                    <motion.button
                        key="success"
                        className="feedback-submit-btn success feedback-success-msg"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        disabled
                    >
                        <CheckCircle2 size={18} />
                        Feedback Sent — Thank you! 🎉
                    </motion.button>
                ) : (
                    <motion.button
                        key="submit"
                        className="feedback-submit-btn"
                        onClick={handleSubmit}
                        disabled={!message.trim() || submitting}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {submitting ? (
                            <>Sending…</>
                        ) : (
                            <>
                                <Send size={16} />
                                Send Feedback
                            </>
                        )}
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Previous Feedback */}
            {myFeedback.length > 0 && (
                <>
                    <div className="feedback-divider">
                        <div className="feedback-divider-line" />
                        <span className="feedback-divider-text">Your Previous Feedback</span>
                        <div className="feedback-divider-line" />
                    </div>

                    {myFeedback.map((fb, i) => (
                        <motion.div
                            key={fb.id}
                            className="feedback-card"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: i * 0.05 }}
                        >
                            <div className="feedback-card-header">
                                {getCategoryBadge(fb.category)}
                                <span className="feedback-card-timestamp">{formatTimestamp(fb.created_at)}</span>
                            </div>
                            <div className="feedback-card-message">{fb.message}</div>
                        </motion.div>
                    ))}
                </>
            )}

            {/* Empty state if no previous feedback and not loading */}
            {!loading && myFeedback.length === 0 && (
                <div style={{ marginTop: '32px' }}>
                    <div className="feedback-divider">
                        <div className="feedback-divider-line" />
                        <span className="feedback-divider-text">Your Previous Feedback</span>
                        <div className="feedback-divider-line" />
                    </div>
                    <div className="feedback-empty">
                        <div className="feedback-empty-icon">📝</div>
                        <h3>No feedback yet</h3>
                        <p>Your submitted feedback will appear here</p>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default Feedback;
