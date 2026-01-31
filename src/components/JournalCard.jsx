import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Sun, Cloud, CloudRain, Loader2 } from 'lucide-react';
import useJournal from '../hooks/useJournal';

const MOOD_OPTIONS = [
    { value: 1, emoji: '😞', label: 'Rough' },
    { value: 2, emoji: '😐', label: 'Meh' },
    { value: 3, emoji: '🙂', label: 'Okay' },
    { value: 4, emoji: '😊', label: 'Good' },
    { value: 5, emoji: '🤩', label: 'Amazing' }
];

const JournalCard = () => {
    const { todayEntry, loading, saving, saveEntry, updateField } = useJournal();
    const [isExpanded, setIsExpanded] = useState(false);
    const [localEntry, setLocalEntry] = useState({
        mood_score: 3,
        how_was_today: '',
        on_your_mind: '',
        change_for_tomorrow: ''
    });

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
        if (!isExpanded) return;

        const timer = setTimeout(() => {
            // Only save if there's actual content
            if (localEntry.how_was_today || localEntry.on_your_mind || localEntry.change_for_tomorrow || localEntry.mood_score !== 3) {
                saveEntry(localEntry);
            }
        }, 1500);

        return () => clearTimeout(timer);
    }, [localEntry, isExpanded]);

    const handleFieldChange = (field, value) => {
        setLocalEntry(prev => ({ ...prev, [field]: value }));
        updateField(field, value);
    };

    const handleMoodSelect = (moodValue) => {
        handleFieldChange('mood_score', moodValue);
    };

    const hasContent = localEntry.how_was_today || localEntry.on_your_mind || localEntry.change_for_tomorrow;

    return (
        <div
            className="glass-card"
            style={{
                marginBottom: '20px',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.3) 100%)'
            }}
        >
            {/* Header - Always Visible */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    borderBottom: isExpanded ? '1px solid rgba(255,255,255,0.3)' : 'none'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <BookOpen size={20} color="#667eea" />
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Daily Journal</h3>
                        <p style={{ fontSize: '12px', opacity: 0.6, margin: 0 }}>
                            {hasContent ? 'Entry saved ✓' : 'Tap to reflect on your day'}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {saving && <Loader2 size={16} className="spin" style={{ opacity: 0.5 }} />}
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
            </div>

            {/* Expandable Content */}
            {isExpanded && (
                <div style={{ padding: '20px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                            <Loader2 className="spin" size={24} />
                        </div>
                    ) : (
                        <>
                            {/* Mood Selector */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    marginBottom: '10px',
                                    display: 'block',
                                    color: '#4a5568'
                                }}>
                                    How was today?
                                </label>
                                <div style={{
                                    display: 'flex',
                                    gap: '8px',
                                    justifyContent: 'space-between'
                                }}>
                                    {MOOD_OPTIONS.map(mood => (
                                        <button
                                            key={mood.value}
                                            onClick={() => handleMoodSelect(mood.value)}
                                            style={{
                                                flex: 1,
                                                padding: '12px 8px',
                                                border: 'none',
                                                borderRadius: '12px',
                                                background: localEntry.mood_score === mood.value
                                                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                                    : 'rgba(255,255,255,0.5)',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                transform: localEntry.mood_score === mood.value ? 'scale(1.05)' : 'scale(1)'
                                            }}
                                        >
                                            <div style={{ fontSize: '24px' }}>{mood.emoji}</div>
                                            <div style={{
                                                fontSize: '10px',
                                                marginTop: '4px',
                                                color: localEntry.mood_score === mood.value ? '#fff' : '#4a5568',
                                                fontWeight: '500'
                                            }}>
                                                {mood.label}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* How was today - optional text */}
                            <div style={{ marginBottom: '16px' }}>
                                <textarea
                                    placeholder="Any thoughts about today? (optional)"
                                    value={localEntry.how_was_today}
                                    onChange={(e) => handleFieldChange('how_was_today', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        border: '1px solid rgba(255,255,255,0.5)',
                                        borderRadius: '12px',
                                        background: 'rgba(255,255,255,0.4)',
                                        resize: 'none',
                                        minHeight: '60px',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            {/* What's on your mind */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    marginBottom: '8px',
                                    display: 'block',
                                    color: '#4a5568'
                                }}>
                                    What's on your mind?
                                </label>
                                <textarea
                                    placeholder="Brain dump your thoughts, worries, or wins..."
                                    value={localEntry.on_your_mind}
                                    onChange={(e) => handleFieldChange('on_your_mind', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        border: '1px solid rgba(255,255,255,0.5)',
                                        borderRadius: '12px',
                                        background: 'rgba(255,255,255,0.4)',
                                        resize: 'none',
                                        minHeight: '80px',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            {/* What would you change */}
                            <div>
                                <label style={{
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    marginBottom: '8px',
                                    display: 'block',
                                    color: '#4a5568'
                                }}>
                                    What would you change for tomorrow?
                                </label>
                                <textarea
                                    placeholder="One thing to do differently..."
                                    value={localEntry.change_for_tomorrow}
                                    onChange={(e) => handleFieldChange('change_for_tomorrow', e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        border: '1px solid rgba(255,255,255,0.5)',
                                        borderRadius: '12px',
                                        background: 'rgba(255,255,255,0.4)',
                                        resize: 'none',
                                        minHeight: '60px',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>
                        </>
                    )}
                </div>
            )}

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default JournalCard;
