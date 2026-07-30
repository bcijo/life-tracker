import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, X, Loader2, Sparkles, Check } from 'lucide-react';
import useJournal from '../hooks/useJournal';

const MOOD_OPTIONS = [
    { value: 1, emoji: '😞', label: 'Rough' },
    { value: 2, emoji: '😐', label: 'Meh' },
    { value: 3, emoji: '🙂', label: 'Okay' },
    { value: 4, emoji: '😊', label: 'Good' },
    { value: 5, emoji: '🤩', label: 'Amazing' }
];

export const JournalModal = ({ isOpen, onClose }) => {
    const { todayEntry, loading, saving, saveEntry, updateField } = useJournal();
    const [localEntry, setLocalEntry] = useState({
        mood_score: 3,
        how_was_today: '',
        on_your_mind: '',
        change_for_tomorrow: ''
    });
    const [savedNotice, setSavedNotice] = useState(false);

    // Sync local state with fetched entry
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

    // Debounced save
    useEffect(() => {
        if (!isOpen) return;

        const timer = setTimeout(() => {
            if (localEntry.how_was_today || localEntry.on_your_mind || localEntry.change_for_tomorrow || localEntry.mood_score !== 3) {
                saveEntry(localEntry);
                setSavedNotice(true);
                setTimeout(() => setSavedNotice(false), 2000);
            }
        }, 1200);

        return () => clearTimeout(timer);
    }, [localEntry, isOpen]);

    const handleFieldChange = (field, value) => {
        setLocalEntry(prev => ({ ...prev, [field]: value }));
        updateField(field, value);
    };

    const handleMoodSelect = (moodValue) => {
        handleFieldChange('mood_score', moodValue);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 1100,
                    background: 'rgba(11, 17, 32, 0.75)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 20 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: '100%',
                        maxWidth: '520px',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        background: 'var(--surface-elevated, #161f36)',
                        border: '1px solid var(--glass-card-border, rgba(255, 255, 255, 0.12))',
                        borderRadius: '24px',
                        padding: '24px',
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                        position: 'relative',
                        color: 'var(--text-primary)',
                    }}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '12px',
                                background: 'rgba(168, 85, 247, 0.15)',
                                color: '#a855f7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <BookOpen size={20} />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Daily Journal</h2>
                                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted, rgba(255,255,255,0.5))' }}>
                                    {saving ? 'Saving changes...' : savedNotice ? 'All changes saved ✓' : 'Reflect on your day'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                border: 'none',
                                background: 'rgba(255,255,255,0.06)',
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {loading ? (
                        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--accent-primary)' }}>
                            <Loader2 className="spin" size={32} />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Mood Selector */}
                            <div>
                                <label style={{ fontSize: '13px', fontWeight: '600', opacity: 0.8, marginBottom: '10px', display: 'block' }}>
                                    How was your day?
                                </label>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
                                    {MOOD_OPTIONS.map(mood => (
                                        <button
                                            key={mood.value}
                                            onClick={() => handleMoodSelect(mood.value)}
                                            style={{
                                                flex: 1,
                                                padding: '10px 6px',
                                                border: localEntry.mood_score === mood.value ? '1.5px solid #a855f7' : '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: '14px',
                                                background: localEntry.mood_score === mood.value ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255,255,255,0.03)',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                                transform: localEntry.mood_score === mood.value ? 'scale(1.05)' : 'scale(1)',
                                            }}
                                        >
                                            <div style={{ fontSize: '22px' }}>{mood.emoji}</div>
                                            <div style={{ fontSize: '10px', marginTop: '4px', color: localEntry.mood_score === mood.value ? '#a855f7' : 'var(--text-muted, rgba(255,255,255,0.5))', fontWeight: '600' }}>
                                                {mood.label}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* How was today */}
                            <div>
                                <label style={{ fontSize: '13px', fontWeight: '600', opacity: 0.8, marginBottom: '6px', display: 'block' }}>
                                    Highlights or summary of today
                                </label>
                                <textarea
                                    placeholder="Write a quick summary of your day..."
                                    value={localEntry.how_was_today}
                                    onChange={(e) => handleFieldChange('how_was_today', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '14px',
                                        background: 'rgba(0,0,0,0.2)',
                                        color: '#fff',
                                        resize: 'none',
                                        minHeight: '70px',
                                        fontSize: '14px',
                                        outline: 'none',
                                        fontFamily: 'inherit',
                                    }}
                                />
                            </div>

                            {/* What's on your mind */}
                            <div>
                                <label style={{ fontSize: '13px', fontWeight: '600', opacity: 0.8, marginBottom: '6px', display: 'block' }}>
                                    What's on your mind?
                                </label>
                                <textarea
                                    placeholder="Brain dump thoughts, wins, or feelings..."
                                    value={localEntry.on_your_mind}
                                    onChange={(e) => handleFieldChange('on_your_mind', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '14px',
                                        background: 'rgba(0,0,0,0.2)',
                                        color: '#fff',
                                        resize: 'none',
                                        minHeight: '80px',
                                        fontSize: '14px',
                                        outline: 'none',
                                        fontFamily: 'inherit',
                                    }}
                                />
                            </div>

                            {/* Change for tomorrow */}
                            <div>
                                <label style={{ fontSize: '13px', fontWeight: '600', opacity: 0.8, marginBottom: '6px', display: 'block' }}>
                                    What would you change for tomorrow?
                                </label>
                                <textarea
                                    placeholder="One improvement for tomorrow..."
                                    value={localEntry.change_for_tomorrow}
                                    onChange={(e) => handleFieldChange('change_for_tomorrow', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '14px',
                                        background: 'rgba(0,0,0,0.2)',
                                        color: '#fff',
                                        resize: 'none',
                                        minHeight: '70px',
                                        fontSize: '14px',
                                        outline: 'none',
                                        fontFamily: 'inherit',
                                    }}
                                />
                            </div>

                            {/* Footer / Done button */}
                            <button
                                onClick={onClose}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '14px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                                    color: '#fff',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    marginTop: '4px',
                                    boxShadow: '0 4px 14px rgba(168, 85, 247, 0.3)',
                                }}
                            >
                                Done
                            </button>
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
