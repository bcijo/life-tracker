import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    BookOpen, 
    ArrowLeft, 
    Calendar, 
    Sparkles, 
    Brain, 
    Check, 
    Loader2, 
    History,
    TrendingUp,
    Compass
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import useJournal from '../hooks/useJournal';

const MOOD_OPTIONS = [
    { value: 1, emoji: '😞', label: 'Rough', color: '#f87171' },
    { value: 2, emoji: '😐', label: 'Meh', color: '#fbbf24' },
    { value: 3, emoji: '🙂', label: 'Okay', color: '#60a5fa' },
    { value: 4, emoji: '😊', label: 'Good', color: '#34d399' },
    { value: 5, emoji: '🤩', label: 'Amazing', color: '#a855f7' }
];

const Journal = () => {
    const { todayEntry, weekEntries, loading, saving, saveEntry, updateField } = useJournal();
    const [localEntry, setLocalEntry] = useState({
        mood_score: 3,
        how_was_today: '',
        on_your_mind: '',
        change_for_tomorrow: ''
    });
    const [savedNotice, setSavedNotice] = useState(false);
    const [manualSaveSuccess, setManualSaveSuccess] = useState(false);

    const todayFormatted = format(new Date(), 'EEEE, MMMM d, yyyy');
    const todayDateStr = format(new Date(), 'yyyy-MM-dd');

    // Sync local state when today's entry is loaded
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

    // Debounced auto-save
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
        }, 1500);

        return () => clearTimeout(timer);
    }, [localEntry, saveEntry]);

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

    const pastEntries = weekEntries.filter(entry => entry.date !== todayDateStr);

    return (
        <div className="page-container" style={{ position: 'relative' }}>
            {/* Header with back button & status */}
            <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <Link 
                        to="/" 
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '12px',
                            background: 'var(--surface-input)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)',
                            textDecoration: 'none'
                        }}
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
                                Daily Journal
                            </h1>
                            <span style={{ 
                                padding: '3px 10px', 
                                borderRadius: '12px', 
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
                                {saving ? 'Saving...' : (savedNotice || manualSaveSuccess) ? 'Saved ✓' : 'Auto-save on'}
                            </span>
                        </div>
                        <p style={{ margin: 0, marginTop: '2px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={13} />
                            {todayFormatted}
                        </p>
                    </div>
                </div>

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleManualSave}
                    disabled={saving}
                    className="btn-primary"
                    style={{
                        padding: '10px 18px',
                        fontSize: '13px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        borderRadius: '12px',
                        cursor: 'pointer'
                    }}
                >
                    {saving ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                    {manualSaveSuccess ? 'Saved!' : 'Save Entry'}
                </motion.button>
            </header>

            {loading ? (
                <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--accent-primary)' }}>
                    <Loader2 className="spin" size={36} style={{ margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Loading your reflections...</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: pastEntries.length > 0 ? 'minmax(0, 2fr) minmax(0, 1.1fr)' : '1fr', gap: '24px' }}>
                    {/* Main Entry Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Mood Selector Card */}
                        <div className="glass-card" style={{ padding: '22px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} />
                                How are you feeling today?
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                                {MOOD_OPTIONS.map(mood => {
                                    const isSelected = localEntry.mood_score === mood.value;
                                    return (
                                        <button
                                            key={mood.value}
                                            type="button"
                                            onClick={() => handleMoodSelect(mood.value)}
                                            style={{
                                                padding: '14px 8px',
                                                border: isSelected ? `2px solid ${mood.color}` : '1px solid var(--border-subtle)',
                                                borderRadius: '16px',
                                                background: isSelected ? `color-mix(in srgb, ${mood.color} 15%, transparent)` : 'var(--surface-input)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                transform: isSelected ? 'translateY(-2px)' : 'none',
                                                boxShadow: isSelected ? `0 8px 16px color-mix(in srgb, ${mood.color} 20%, transparent)` : 'none',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            <span style={{ fontSize: '26px' }}>{mood.emoji}</span>
                                            <span style={{ 
                                                fontSize: '11px', 
                                                fontWeight: isSelected ? '700' : '500', 
                                                color: isSelected ? mood.color : 'var(--text-secondary)' 
                                            }}>
                                                {mood.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Question 1: Highlights / How was today */}
                        <div className="glass-card" style={{ padding: '22px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <BookOpen size={16} style={{ color: '#6366f1' }} />
                                Daily Highlights & Summary
                            </label>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                                What happened today? Record key accomplishments, events, or memorable moments.
                            </p>
                            <textarea
                                placeholder="Today I worked on..."
                                value={localEntry.how_was_today}
                                onChange={(e) => handleFieldChange('how_was_today', e.target.value)}
                                className="surface-input styled-input"
                                style={{
                                    width: '100%',
                                    minHeight: '90px',
                                    resize: 'vertical',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    lineHeight: '1.5'
                                }}
                            />
                        </div>

                        {/* Question 2: Brain Dump / On your mind */}
                        <div className="glass-card" style={{ padding: '22px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Brain size={16} style={{ color: '#ec4899' }} />
                                Thoughts & Brain Dump
                            </label>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                                Unload your thoughts, ideas, gratitude, worries, or freeform feelings.
                            </p>
                            <textarea
                                placeholder="Something on my mind..."
                                value={localEntry.on_your_mind}
                                onChange={(e) => handleFieldChange('on_your_mind', e.target.value)}
                                className="surface-input styled-input"
                                style={{
                                    width: '100%',
                                    minHeight: '100px',
                                    resize: 'vertical',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    lineHeight: '1.5'
                                }}
                            />
                        </div>

                        {/* Question 3: Improvement for tomorrow */}
                        <div className="glass-card" style={{ padding: '22px' }}>
                            <label style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Compass size={16} style={{ color: '#10b981' }} />
                                Tomorrow's Focus & Improvement
                            </label>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
                                What is one thing you would like to do differently or prioritize tomorrow?
                            </p>
                            <textarea
                                placeholder="Tomorrow I will focus on..."
                                value={localEntry.change_for_tomorrow}
                                onChange={(e) => handleFieldChange('change_for_tomorrow', e.target.value)}
                                className="surface-input styled-input"
                                style={{
                                    width: '100%',
                                    minHeight: '85px',
                                    resize: 'vertical',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    lineHeight: '1.5'
                                }}
                            />
                        </div>
                    </div>

                    {/* Past Reflections Sidebar / History */}
                    {pastEntries.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '4px' }}>
                                <History size={18} style={{ color: 'var(--accent-primary)' }} />
                                <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>Recent Reflections</h2>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {pastEntries.map(entry => {
                                    const moodObj = MOOD_OPTIONS.find(m => m.value === entry.mood_score) || MOOD_OPTIONS[2];
                                    const entryDate = parseISO(entry.date);
                                    const formattedDate = format(entryDate, 'EEE, MMM d');

                                    return (
                                        <div 
                                            key={entry.id || entry.date} 
                                            className="glass-card"
                                            style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '18px' }}>{moodObj.emoji}</span>
                                                    <span style={{ fontSize: '13px', fontWeight: '700' }}>{formattedDate}</span>
                                                </div>
                                                <span style={{ 
                                                    fontSize: '11px', 
                                                    padding: '2px 8px', 
                                                    borderRadius: '8px', 
                                                    background: `color-mix(in srgb, ${moodObj.color} 15%, transparent)`,
                                                    color: moodObj.color,
                                                    fontWeight: '600'
                                                }}>
                                                    {moodObj.label}
                                                </span>
                                            </div>

                                            {entry.how_was_today && (
                                                <div>
                                                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                        Summary
                                                    </span>
                                                    <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: '2px 0 0 0', lineHeight: '1.4' }}>
                                                        {entry.how_was_today}
                                                    </p>
                                                </div>
                                            )}

                                            {entry.on_your_mind && (
                                                <div>
                                                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                        Thoughts
                                                    </span>
                                                    <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: '2px 0 0 0', lineHeight: '1.4' }}>
                                                        {entry.on_your_mind}
                                                    </p>
                                                </div>
                                            )}

                                            {entry.change_for_tomorrow && (
                                                <div>
                                                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                        Focus
                                                    </span>
                                                    <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: '2px 0 0 0', lineHeight: '1.4' }}>
                                                        {entry.change_for_tomorrow}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Journal;
