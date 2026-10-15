import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, Download, Copy, X, Check } from 'lucide-react';
import { renderHabitShareCard, buildShareText, shareImage, downloadBlob, copyImage, canShareFiles } from '../../utils/shareCard';

/**
 * Preview + share modal for the day's habits.
 * props: dateLabel, isToday, habits [{name,status,streak}], bestStreak, onClose
 */
export const ShareHabitsModal = ({ dateLabel, isToday, habits, bestStreak, onClose }) => {
    const [mode, setMode] = useState('all');
    const [blob, setBlob] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState('');

    const doneCount = useMemo(() => habits.filter(h => h.status === 'completed').length, [habits]);
    const totalCount = habits.length;

    useEffect(() => {
        let cancelled = false;
        let url = null;
        renderHabitShareCard({ dateLabel, isToday, habits, doneCount, totalCount, bestStreak, mode })
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
    }, [mode, dateLabel, isToday, habits, doneCount, totalCount, bestStreak]);

    const flash = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 2200);
    };

    const filename = `habits-${dateLabel.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
    const nativeShare = blob ? canShareFiles(blob) : false;

    const handleShare = async () => {
        if (!blob) return;
        setBusy(true);
        try {
            const text = buildShareText({ dateLabel, habits, doneCount, totalCount, mode });
            const res = await shareImage(blob, text, filename);
            if (res === 'downloaded') flash('Sharing not supported here — image downloaded');
        } finally {
            setBusy(false);
        }
    };

    const handleCopy = async () => {
        if (!blob) return;
        try {
            await copyImage(blob);
            flash('Image copied — paste it in any chat');
        } catch {
            flash('Copy not supported in this browser');
        }
    };

    const btnBase = {
        padding: '12px', borderRadius: 14, fontSize: 13, fontWeight: 700,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        fontFamily: 'inherit',
    };

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 100,
                background: 'rgba(0,0,0,0.72)',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
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
                    width: '100%', maxWidth: 400, maxHeight: '94vh', overflowY: 'auto',
                    background: 'var(--surface-elevated, #161622)',
                    border: '1px solid rgba(168,85,247,0.35)',
                    borderRadius: 24, padding: 18,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(168,85,247,0.15)',
                    position: 'relative',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>Share your progress</h3>
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

                {/* Mode toggle */}
                <div style={{
                    display: 'flex', gap: 4, padding: 4, borderRadius: 12, marginBottom: 12,
                    background: 'var(--surface-input, rgba(255,255,255,0.04))',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                }}>
                    {[{ val: 'all', label: 'Full checklist' }, { val: 'completed', label: 'Completed only' }].map(o => (
                        <button
                            key={o.val}
                            id={`share-mode-${o.val}`}
                            onClick={() => setMode(o.val)}
                            style={{
                                flex: 1, padding: '8px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
                                fontSize: 12, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.15s',
                                background: mode === o.val ? 'linear-gradient(135deg, #a855f7, #ec4899)' : 'transparent',
                                color: mode === o.val ? '#fff' : 'var(--text-muted)',
                            }}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>

                {/* Preview */}
                <div style={{
                    width: '100%', aspectRatio: '1080 / 1350', borderRadius: 16, overflow: 'hidden',
                    background: '#0f0a1f', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    {previewUrl ? (
                        <motion.img
                            key={previewUrl}
                            src={previewUrl}
                            alt="Habit progress share card"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{ width: '100%', height: '100%', display: 'block' }}
                        />
                    ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Generating…</span>
                    )}
                </div>

                {/* Actions */}
                <motion.button
                    id="share-habits-share"
                    whileTap={{ scale: 0.97 }}
                    disabled={!blob || busy}
                    onClick={handleShare}
                    style={{
                        ...btnBase, width: '100%', marginBottom: 8, border: 'none', color: '#fff', fontSize: 14,
                        background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                        boxShadow: '0 4px 16px rgba(168,85,247,0.35)',
                        opacity: !blob || busy ? 0.6 : 1,
                    }}
                >
                    <Share2 size={16} />
                    {nativeShare ? 'Share to WhatsApp & more' : 'Share'}
                </motion.button>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        id="share-habits-download"
                        disabled={!blob}
                        onClick={() => blob && downloadBlob(blob, filename)}
                        style={{
                            ...btnBase, flex: 1,
                            background: 'var(--surface-input, rgba(255,255,255,0.06))',
                            border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                            color: 'var(--text-secondary)',
                        }}
                    >
                        <Download size={15} /> Download
                    </button>
                    <button
                        id="share-habits-copy"
                        disabled={!blob}
                        onClick={handleCopy}
                        style={{
                            ...btnBase, flex: 1,
                            background: 'var(--surface-input, rgba(255,255,255,0.06))',
                            border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                            color: 'var(--text-secondary)',
                        }}
                    >
                        <Copy size={15} /> Copy
                    </button>
                </div>

                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            marginTop: 10, padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                            background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80',
                            display: 'flex', alignItems: 'center', gap: 6,
                        }}
                    >
                        <Check size={14} /> {toast}
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};

export default ShareHabitsModal;
