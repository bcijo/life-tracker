import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Loader2, ArrowRight, Users, X, Minus, Plus, ChevronDown } from 'lucide-react';
import Modal from '../Modal';
import { CategoryIcon } from '../../utils/categoryIcons';
import { format, subDays } from 'date-fns';

/* ── animation presets ───────────────────────────────── */
const stepReveal = {
    initial: { opacity: 0, y: 16, height: 0 },
    animate: { opacity: 1, y: 0, height: 'auto' },
    exit:    { opacity: 0, y: 8, height: 0 },
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
};

const QuickAddExpenseModal = ({
    isOpen,
    onClose,
    cards = [],
    onAddExpense,
    fetchSubcategories,
    initialCardId = null
}) => {
    /* ── state ───────────────────────────────────────── */
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCardId, setSelectedCardId] = useState(initialCardId || '');
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');
    const [subcategories, setSubcategories] = useState([]);
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [showCustomDate, setShowCustomDate] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Split
    const [isSplitActive, setIsSplitActive] = useState(false);
    const [splitPeopleCount, setSplitPeopleCount] = useState(2);

    const amountRef = useRef(null);
    const descRef = useRef(null);

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    /* ── derived ─────────────────────────────────────── */
    const rawTotal = parseFloat(amount) || 0;
    const hasAmount = rawTotal > 0;
    const hasDescription = description.trim().length > 0;
    const hasCategory = !!selectedCardId;
    const safeSplit = Math.max(2, parseInt(splitPeopleCount, 10) || 2);
    const share = isSplitActive && rawTotal > 0
        ? Math.round((rawTotal / safeSplit) * 100) / 100
        : rawTotal;

    const selectedCat = cards.find(c => c.id === selectedCardId);
    const accent = selectedCat?.color || '#a855f7';

    /* ── effects ──────────────────────────────────────── */
    useEffect(() => {
        if (isOpen) setTimeout(() => amountRef.current?.focus(), 150);
    }, [isOpen]);

    useEffect(() => {
        if (initialCardId) setSelectedCardId(initialCardId);
    }, [initialCardId]);

    useEffect(() => {
        (async () => {
            if (selectedCardId && fetchSubcategories) {
                const subs = await fetchSubcategories(selectedCardId);
                setSubcategories(subs || []);
                setSelectedSubcategoryId('');
            } else {
                setSubcategories([]);
                setSelectedSubcategoryId('');
            }
        })();
    }, [selectedCardId, fetchSubcategories]);

    // Remove automatic focus jump to description so user is not interrupted

    /* ── reset on close ──────────────────────────────── */
    useEffect(() => {
        if (!isOpen) {
            setAmount('');
            setDescription('');
            setSelectedCardId(initialCardId || '');
            setSelectedSubcategoryId('');
            setIsSplitActive(false);
            setSplitPeopleCount(2);
            setDate(format(new Date(), 'yyyy-MM-dd'));
            setShowCustomDate(false);
        }
    }, [isOpen]);

    /* ── submit ───────────────────────────────────────── */
    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (share <= 0 || !selectedCardId || isSubmitting) return;

        setIsSubmitting(true);
        try {
            let desc = description.trim() || selectedCat?.name || 'Expense';
            if (isSplitActive && rawTotal > 0 && !desc.toLowerCase().includes('split')) {
                desc = `${desc} (Split 1/${safeSplit} of ₹${rawTotal.toLocaleString('en-IN')})`;
            }

            await onAddExpense({
                amount: share,
                description: desc,
                type: 'expense',
                card_id: selectedCardId,
                category: selectedCardId,
                subcategory_id: selectedSubcategoryId || null,
                date: new Date(date).toISOString(),
            });
            onClose();
        } catch (err) {
            console.error('Error adding transaction:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    /* ── styles (scoped inline CSS) ──────────────────── */
    const styles = `
        .qaem-amount-input::-webkit-inner-spin-button,
        .qaem-amount-input::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        .qaem-amount-input[type=number] {
            -moz-appearance: textfield;
        }
        .qaem-amount-input,
        .qaem-amount-input:focus,
        .qaem-amount-input:focus-visible,
        .qaem-amount-input:active {
            outline: none !important;
            border: none !important;
            border-color: transparent !important;
            box-shadow: none !important;
            background: transparent !important;
        }
        .qaem-amount-input::placeholder {
            color: rgba(255,255,255,0.18);
        }
        .qaem-cat-grid::-webkit-scrollbar { display: none; }
    `;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="">
            <style>{styles}</style>

            <form onSubmit={handleSubmit} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0',
            }}>

                {/* ═══════════════════════════════════════════
                    STEP 1 — AMOUNT (Always visible, hero area)
                    ═══════════════════════════════════════════ */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '8px 0 20px',
                }}>
                    {/* Subtle label */}
                    <span style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: 'var(--text-muted)',
                        marginBottom: '12px',
                        letterSpacing: '0.3px',
                    }}>
                        How much?
                    </span>

                    {/* Big centered amount */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        width: '100%',
                    }}>
                        <span style={{
                            fontSize: '32px',
                            fontWeight: '700',
                            color: hasAmount ? accent : 'rgba(255,255,255,0.25)',
                            transition: 'color 0.3s ease',
                            userSelect: 'none',
                        }}>₹</span>
                        <input
                            ref={amountRef}
                            className="qaem-amount-input"
                            type="number"
                            inputMode="decimal"
                            step="any"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0"
                            style={{
                                fontSize: '48px',
                                fontWeight: '800',
                                color: 'var(--text-primary)',
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                boxShadow: 'none',
                                width: `${Math.max(1, amount ? amount.length : 1) * 28 + 14}px`,
                                minWidth: '40px',
                                maxWidth: '240px',
                                textAlign: 'left',
                                fontFamily: 'inherit',
                                lineHeight: 1,
                                caretColor: accent,
                                padding: '0',
                                margin: '0',
                            }}
                        />
                    </div>

                    {/* Glow underline */}
                    <div style={{
                        width: hasAmount ? '120px' : '40px',
                        height: '3px',
                        borderRadius: '2px',
                        background: hasAmount
                            ? `linear-gradient(90deg, transparent, ${accent}, transparent)`
                            : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
                        transition: 'all 0.4s ease',
                        marginTop: '6px',
                    }} />

                    {/* Split toggle (small, unobtrusive) */}
                    <AnimatePresence>
                        {hasAmount && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                                style={{ marginTop: '12px', width: '100%' }}
                            >
                                {!isSplitActive ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsSplitActive(true)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            width: '100%',
                                            padding: '8px',
                                            borderRadius: '10px',
                                            border: '1px dashed rgba(255,255,255,0.1)',
                                            background: 'transparent',
                                            color: 'var(--text-muted)',
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        <Users size={13} />
                                        <span>Split with people</span>
                                    </button>
                                ) : (
                                    <div style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '12px',
                                        padding: '10px 12px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px',
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <Users size={13} color={accent} /> Split equally
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => { setIsSplitActive(false); setSplitPeopleCount(2); }}
                                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '2px' }}
                                            >
                                                <X size={13} />
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <button type="button" onClick={() => setSplitPeopleCount(p => Math.max(2, (parseInt(p,10)||2)-1))} disabled={safeSplit<=2}
                                                    style={{ width: '26px', height: '26px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: safeSplit>2?'pointer':'not-allowed', opacity: safeSplit>2?1:0.3 }}>
                                                    <Minus size={12} />
                                                </button>
                                                <span style={{ fontSize: '13px', fontWeight: '700', minWidth: '50px', textAlign: 'center' }}>{safeSplit} people</span>
                                                <button type="button" onClick={() => setSplitPeopleCount(p => (parseInt(p,10)||2)+1)}
                                                    style={{ width: '26px', height: '26px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                                    <Plus size={12} />
                                                </button>
                                            </div>
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#10b981' }}>
                                                Your share: ₹{share.toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ═══════════════════════════════════════════
                    STEP 2 — DESCRIPTION ("What's this for?")
                    Reveals after amount > 0
                    ═══════════════════════════════════════════ */}
                <AnimatePresence>
                    {hasAmount && (
                        <motion.div {...stepReveal} style={{ overflow: 'hidden', marginBottom: '14px' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '12px 14px',
                                borderRadius: '14px',
                                border: `1px solid ${hasDescription ? `color-mix(in srgb, ${accent} 40%, transparent)` : 'rgba(255,255,255,0.07)'}`,
                                background: 'rgba(255,255,255,0.03)',
                                transition: 'border-color 0.25s ease',
                            }}>
                                <span style={{ fontSize: '14px', color: 'var(--text-muted)', flexShrink: 0 }}>✏️</span>
                                <input
                                    ref={descRef}
                                    type="text"
                                    placeholder="What's this for?"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    style={{
                                        flex: 1,
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: 'var(--text-primary)',
                                        background: 'transparent',
                                        border: 'none',
                                        outline: 'none',
                                        fontFamily: 'inherit',
                                    }}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ═══════════════════════════════════════════
                    STEP 3 — CATEGORY TILES
                    Reveals after description is filled
                    ═══════════════════════════════════════════ */}
                <AnimatePresence>
                    {hasAmount && hasDescription && (
                        <motion.div {...stepReveal} style={{ overflow: 'hidden', marginBottom: '6px' }}>
                            <span style={{
                                display: 'block',
                                fontSize: '11px',
                                fontWeight: '700',
                                color: 'var(--text-muted)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.8px',
                                marginBottom: '8px',
                                paddingLeft: '2px',
                            }}>Category</span>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                                gap: '8px',
                            }}>
                                {cards.map(card => {
                                    const sel = selectedCardId === card.id;
                                    const c = card.color || '#a855f7';
                                    return (
                                        <button
                                            key={card.id}
                                            type="button"
                                            onClick={() => setSelectedCardId(card.id)}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '12px 6px',
                                                borderRadius: '14px',
                                                border: sel ? `2px solid ${c}` : '1px solid rgba(255,255,255,0.06)',
                                                background: sel
                                                    ? `color-mix(in srgb, ${c} 15%, transparent)`
                                                    : 'rgba(255,255,255,0.025)',
                                                cursor: 'pointer',
                                                transition: 'all 0.18s ease',
                                                boxShadow: sel ? `0 2px 16px color-mix(in srgb, ${c} 30%, transparent)` : 'none',
                                                transform: sel ? 'scale(1.04)' : 'scale(1)',
                                            }}
                                        >
                                            <div style={{
                                                width: '34px',
                                                height: '34px',
                                                borderRadius: '10px',
                                                background: sel
                                                    ? `color-mix(in srgb, ${c} 28%, transparent)`
                                                    : 'rgba(255,255,255,0.05)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'background 0.18s ease',
                                            }}>
                                                <CategoryIcon icon={card.icon} name={card.name} color={sel ? c : 'var(--text-muted)'} size={17} />
                                            </div>
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: sel ? '700' : '500',
                                                color: sel ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                textAlign: 'center',
                                                lineHeight: 1.2,
                                                maxWidth: '80px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {card.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* ── SUBCATEGORIES (Animated slide-down) ─── */}
                            <AnimatePresence>
                                {hasCategory && subcategories.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, y: -8 }}
                                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                                        exit={{ opacity: 0, height: 0, y: -8 }}
                                        transition={{ duration: 0.25, ease: 'easeOut' }}
                                        style={{ overflow: 'hidden', marginTop: '10px' }}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            marginBottom: '6px',
                                        }}>
                                            <ChevronDown size={12} color={accent} />
                                            <span style={{
                                                fontSize: '10px',
                                                fontWeight: '700',
                                                color: accent,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.6px',
                                            }}>
                                                Subcategory
                                            </span>
                                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '2px' }}>(optional)</span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {subcategories.map(sub => {
                                                const isSel = selectedSubcategoryId === sub.id;
                                                return (
                                                    <button
                                                        key={sub.id}
                                                        type="button"
                                                        onClick={() => setSelectedSubcategoryId(isSel ? '' : sub.id)}
                                                        style={{
                                                            padding: '5px 12px',
                                                            borderRadius: '20px',
                                                            border: isSel ? `1.5px solid ${accent}` : '1px solid rgba(255,255,255,0.08)',
                                                            background: isSel ? `color-mix(in srgb, ${accent} 18%, transparent)` : 'rgba(255,255,255,0.03)',
                                                            color: isSel ? 'var(--text-primary)' : 'var(--text-muted)',
                                                            fontSize: '12px',
                                                            fontWeight: isSel ? '700' : '500',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s ease',
                                                        }}
                                                    >
                                                        {sub.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ═══════════════════════════════════════════
                    STEP 4 — DATE PICKER
                    Reveals after category is selected
                    ═══════════════════════════════════════════ */}
                <AnimatePresence>
                    {hasAmount && hasDescription && hasCategory && (
                        <motion.div {...stepReveal} style={{ overflow: 'hidden', marginTop: '8px', marginBottom: '16px' }}>
                            <span style={{
                                display: 'block',
                                fontSize: '11px',
                                fontWeight: '700',
                                color: 'var(--text-muted)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.8px',
                                marginBottom: '8px',
                                paddingLeft: '2px',
                            }}>When</span>

                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                {[
                                    { label: 'Today', val: todayStr },
                                    { label: 'Yesterday', val: yesterdayStr },
                                ].map(d => {
                                    const active = date === d.val && !showCustomDate;
                                    return (
                                        <button
                                            key={d.label}
                                            type="button"
                                            onClick={() => { setDate(d.val); setShowCustomDate(false); }}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '12px',
                                                border: active ? `1.5px solid ${accent}` : '1px solid rgba(255,255,255,0.07)',
                                                background: active ? `color-mix(in srgb, ${accent} 15%, transparent)` : 'rgba(255,255,255,0.025)',
                                                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                                                fontSize: '13px',
                                                fontWeight: active ? '700' : '500',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                            }}
                                        >{d.label}</button>
                                    );
                                })}
                                <button
                                    type="button"
                                    onClick={() => setShowCustomDate(!showCustomDate)}
                                    style={{
                                        padding: '8px 14px',
                                        borderRadius: '12px',
                                        border: showCustomDate || (date !== todayStr && date !== yesterdayStr)
                                            ? `1.5px solid ${accent}` : '1px solid rgba(255,255,255,0.07)',
                                        background: showCustomDate || (date !== todayStr && date !== yesterdayStr)
                                            ? `color-mix(in srgb, ${accent} 15%, transparent)` : 'rgba(255,255,255,0.025)',
                                        color: 'var(--text-secondary)',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    <Calendar size={13} />
                                    <span>{date !== todayStr && date !== yesterdayStr ? format(new Date(date), 'dd MMM') : 'Pick date'}</span>
                                </button>
                            </div>

                            <AnimatePresence>
                                {showCustomDate && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        style={{ overflow: 'hidden', marginTop: '8px' }}
                                    >
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={e => setDate(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                borderRadius: '12px',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                background: 'rgba(255,255,255,0.03)',
                                                color: 'var(--text-primary)',
                                                fontSize: '13px',
                                                outline: 'none',
                                                fontFamily: 'inherit',
                                            }}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ═══════════════════════════════════════════
                    SUBMIT AREA (Redesigned dark luxe vibe)
                    ═══════════════════════════════════════════ */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                    paddingTop: '6px',
                }}>
                    <button
                        type="submit"
                        disabled={!hasAmount || !hasCategory || isSubmitting}
                        style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '16px',
                            border: (hasAmount && hasCategory)
                                ? `1.5px solid color-mix(in srgb, ${accent} 70%, rgba(255,255,255,0.2))`
                                : '1px solid rgba(255,255,255,0.06)',
                            fontWeight: '700',
                            fontSize: '14px',
                            fontFamily: 'inherit',
                            letterSpacing: '0.2px',
                            cursor: (hasAmount && hasCategory) ? 'pointer' : 'not-allowed',
                            opacity: (hasAmount && hasCategory) ? 1 : 0.35,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            color: '#ffffff',
                            background: (hasAmount && hasCategory)
                                ? `linear-gradient(135deg, color-mix(in srgb, ${accent} 85%, #1e1b4b), color-mix(in srgb, ${accent} 55%, #0f172a))`
                                : 'rgba(255,255,255,0.03)',
                            boxShadow: (hasAmount && hasCategory)
                                ? `0 6px 24px color-mix(in srgb, ${accent} 30%, transparent), inset 0 1px 1px rgba(255,255,255,0.2)`
                                : 'none',
                            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                    >
                        {isSubmitting ? (
                            <Loader2 size={18} className="spin" />
                        ) : (
                            <>
                                <span>
                                    {isSplitActive && share > 0
                                        ? `Add ₹${share.toLocaleString('en-IN')} (my share)`
                                        : share > 0 && hasCategory
                                            ? `Add ₹${share.toLocaleString('en-IN')}`
                                            : 'Add Expense'}
                                </span>
                                {hasAmount && hasCategory && <ArrowRight size={15} />}
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            padding: '4px 12px',
                            transition: 'color 0.15s ease',
                        }}
                        onMouseOver={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                        onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default QuickAddExpenseModal;
