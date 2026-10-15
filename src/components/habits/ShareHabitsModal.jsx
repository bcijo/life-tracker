import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Download, Copy, X, Check, EyeOff, Shield, BarChart3, ListFilter } from 'lucide-react';
import { renderHabitShareCard, shareImage, downloadBlob, copyImage, canShareFiles } from '../../utils/shareCard';

/**
 * Preview + share modal for the day's habits with privacy masking options.
 * props: dateLabel, isToday, habits [{name,status,streak,timeOfDay}], bestStreak, week, onClose
 */
export const ShareHabitsModal = ({ dateLabel, isToday, habits, bestStreak, week = [], onClose }) => {
    // Card style: 'checklist' or 'summary' (summary has no habit names at all)
    const [cardStyle, setCardStyle] = useState('checklist');
    // Privacy for checklist: 'redact' (first letter + bars), 'hide' (generic Habit 1..), 'show' (full names)
    const [privacy, setPrivacy] = useState('redact');
    // Checklist filter: 'all' or 'completed'
    const [filterMode, setFilterMode] = useState('all');

    const [blob, setBlob] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState('');

    const doneCount = useMemo(() => habits.filter(h => h.status === 'completed').length, [habits]);
    const totalCount = habits.length;

    useEffect(() => {
        let cancelled = false;
        let url = null;
        renderHabitShareCard({
            style: cardStyle,
            privacy,
            completedOnly: filterMode === 'completed',
            dateLabel,
            isToday,
            habits,
            bestStreak,
            week,
        })
            .then(b => {
                if (cancelled) return;
                url = URL.createObjectURL(b);
                setBlob(b);
                setPreviewUrl(url);
            })
            .catch(err => console.error('Share card render failed:', err));
        return () => {
            cancelled = true;
            if (url) URL.revokeObjectURL(url);
        };
    }, [cardStyle, privacy, filterMode, dateLabel, isToday, habits, bestStreak, week]);

    const flash = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 2500);
    };

    const filename = `habits-${dateLabel.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
    const nativeShare = blob ? canShareFiles(blob) : false;

    const handleShare = async () => {
        if (!blob) return;
        setBusy(true);
        try {
            // NOTE: We share ONLY the image file so WhatsApp attaches the image directly instead of converting to text
            const res = await shareImage(blob, filename);
            if (res === 'downloaded') flash('Image downloaded (direct share not supported on this device/browser)');
        } finally {
            setBusy(false);
        }
    };

    const handleCopy = async () => {
        if (!blob) return;
        try {
            await copyImage(blob);
            flash('Image copied to clipboard! Paste it into WhatsApp or any app.');
        } catch {
            flash('Copy not supported in this browser. Use Download instead.');
        }
    };

    const pillBtn = (active) => ({
        flex: 1, padding: '7px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
        fontSize: 11.5, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.15s',
        background: active ? 'linear-gradient(135deg, #a855f7, #ec4899)' : 'transparent',
        color: active ? '#fff' : 'var(--text-muted, rgba(255,255,255,0.6))',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
    });

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 100,
                background: 'rgba(0,0,0,0.78)',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14,
            }}
            onClick={onClose}
        >
            <motion.div
                id="share-habits-modal"
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 12 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: 420, maxHeight: '92vh', overflowY: 'auto',
                    background: 'var(--surface-elevated, #161622)',
                    border: '1px solid rgba(168,85,247,0.35)',
                    borderRadius: 24, padding: '18px 16px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(168,85,247,0.15)',
                    position: 'relative',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>Share habits card</h3>
                        <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{dateLabel} · {doneCount}/{totalCount} done</span>
                    </div>
                    <button
                        id="share-habits-close"
                        onClick={onClose}
                        aria-label="Close"
                        style={{
                            width: 32, height: 32, borderRadius: 10, border: 'none', cursor: 'pointer',
                            background: 'var(--surface-input, rgba(255,255,255,0.06))', color: 'var(--text-muted)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Card Style Selector */}
                <div style={{ marginBottom: 10 }}>
                    <div style={{
                        display: 'flex', gap: 4, padding: 3, borderRadius: 12,
                        background: 'var(--surface-input, rgba(255,255,255,0.04))',
                        border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                    }}>
                        <button
                            id="share-style-checklist"
                            onClick={() => setCardStyle('checklist')}
                            style={pillBtn(cardStyle === 'checklist')}
                        >
                            <ListFilter size={13} /> Checklist
                        </button>
                        <button
                            id="share-style-summary"
                            onClick={() => setCardStyle('summary')}
                            style={pillBtn(cardStyle === 'summary')}
                            title="Completely private - shows stats & chart without any habit names"
                        >
                            <BarChart3 size={13} /> Summary (No names)
                        </button>
                    </div>
                </div>

                {/* Privacy & Filter Options (Only when checklist is selected) */}
                {cardStyle === 'checklist' && (
                    <div style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 14, padding: '10px 10px 8px', marginBottom: 12,
                        display: 'flex', flexDirection: 'column', gap: 8,
                    }}>
                        {/* Privacy / Masking */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                                <Shield size={12} color="#a855f7" />
                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>Habit Names Privacy</span>
                            </div>
                            <div style={{
                                display: 'flex', gap: 3, padding: 3, borderRadius: 10,
                                background: 'var(--surface-input, rgba(255,255,255,0.04))',
                            }}>
                                <button
                                    id="privacy-redact"
                                    onClick={() => setPrivacy('redact')}
                                    style={pillBtn(privacy === 'redact')}
                                    title="M▇▇▇▇ W▇▇ (masked bars)"
                                >
                                    🔒 Masked (M▇▇)
                                </button>
                                <button
                                    id="privacy-hide"
                                    onClick={() => setPrivacy('hide')}
                                    style={pillBtn(privacy === 'hide')}
                                    title="Habit 1, Habit 2..."
                                >
                                    <EyeOff size={12} /> Anonymous
                                </button>
                                <button
                                    id="privacy-show"
                                    onClick={() => setPrivacy('show')}
                                    style={pillBtn(privacy === 'show')}
                                    title="Full habit names visible"
                                >
                                    Show names
                                </button>
                            </div>
                        </div>

                        {/* Filter */}
                        <div>
                            <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Filter</span>
                            <div style={{
                                display: 'flex', gap: 3, padding: 3, borderRadius: 10,
                                background: 'var(--surface-input, rgba(255,255,255,0.04))',
                            }}>
                                <button
                                    onClick={() => setFilterMode('all')}
                                    style={pillBtn(filterMode === 'all')}
                                >
                                    All habits ({totalCount})
                                </button>
                                <button
                                    onClick={() => setFilterMode('completed')}
                                    style={pillBtn(filterMode === 'completed')}
                                >
                                    Completed only ({doneCount})
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Preview image */}
                <div style={{
                    width: '100%', aspectRatio: '1080 / 1350', borderRadius: 16, overflow: 'hidden',
                    background: '#0f0a1f', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                }}>
                    {previewUrl ? (
                        <motion.img
                            key={previewUrl}
                            src={previewUrl}
                            alt="Habit progress share card preview"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
                        />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 22, height: 22, border: '2px solid #a855f7', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Generating card…</span>
                        </div>
                    )}
                </div>

                {/* Main Action: Share Image directly to WhatsApp / Apps */}
                <motion.button
                    id="share-habits-share"
                    whileTap={{ scale: 0.97 }}
                    disabled={!blob || busy}
                    onClick={handleShare}
                    style={{
                        width: '100%', padding: '12px', borderRadius: 14, fontSize: 14, fontWeight: 700,
                        border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
                        background: 'linear-gradient(135deg, #25d366, #16a34a)',
                        boxShadow: '0 4px 18px rgba(37,211,102,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        marginBottom: 8, opacity: !blob || busy ? 0.6 : 1,
                    }}
                >
                    <Share2 size={16} />
                    {nativeShare ? 'Share Image to WhatsApp & more' : 'Share Image'}
                </motion.button>

                {/* Fallbacks: Download & Copy */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        id="share-habits-download"
                        disabled={!blob}
                        onClick={() => blob && downloadBlob(blob, filename)}
                        style={{
                            flex: 1, padding: '10px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                            background: 'var(--surface-input, rgba(255,255,255,0.06))',
                            border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                            color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                    >
                        <Download size={14} /> Download Image
                    </button>
                    <button
                        id="share-habits-copy"
                        disabled={!blob}
                        onClick={handleCopy}
                        style={{
                            flex: 1, padding: '10px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                            background: 'var(--surface-input, rgba(255,255,255,0.06))',
                            border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                            color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                    >
                        <Copy size={14} /> Copy to Clipboard
                    </button>
                </div>

                {/* Feedback Toast */}
                <AnimatePresence>
                    {toast && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            style={{
                                marginTop: 10, padding: '8px 12px', borderRadius: 10, fontSize: 11.5, fontWeight: 600,
                                background: 'rgba(34,197,94,0.14)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80',
                                display: 'flex', alignItems: 'center', gap: 6,
                            }}
                        >
                            <Check size={14} /> {toast}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default ShareHabitsModal;
