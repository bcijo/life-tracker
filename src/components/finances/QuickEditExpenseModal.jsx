import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Trash2, Loader2, ArrowRight, AlertCircle, ChevronDown, Check, Plus, X, Users, Minus } from 'lucide-react';
import Modal from '../Modal';
import { CategoryIcon, NAME_KEYWORDS_MAP } from '../../utils/categoryIcons';
import { supabase } from '../../lib/supabase';
import { format, subDays } from 'date-fns';

const stepReveal = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: 8 },
    transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] },
};

const PALETTE_COLORS = [
    '#a855f7', '#ec4899', '#3b82f6', '#06b6d4', '#10b981', 
    '#f59e0b', '#f97316', '#ef4444', '#6366f1', '#14b8a6'
];

const POPULAR_ICONS = [
    'utensils', 'coffee', 'shopping-bag', 'shirt', 'car', 'fuel', 
    'zap', 'home', 'film', 'gamepad-2', 'heart-pulse', 'pill', 
    'dumbbell', 'plane', 'gift', 'sparkles', 'wrench', 'smartphone',
    'wifi', 'wallet', 'briefcase', 'dog'
];

const QuickEditExpenseModal = ({
    isOpen,
    onClose,
    transaction,
    cards = [],
    onUpdateExpense,
    onDeleteExpense,
    fetchSubcategories,
    onAddCategory,
    onAddSubcategory
}) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCardId, setSelectedCardId] = useState('');
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');
    const [subcategories, setSubcategories] = useState([]);
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [showCustomDate, setShowCustomDate] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // On-the-fly Category Creation
    const [isDescFocused, setIsDescFocused] = useState(false);
    const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState('#a855f7');
    const [newCategoryIcon, setNewCategoryIcon] = useState('wallet');
    const [userCustomizedIcon, setUserCustomizedIcon] = useState(false);
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [localNewCards, setLocalNewCards] = useState([]);

    // On-the-fly Subcategory Creation
    const [showNewSubcategoryInput, setShowNewSubcategoryInput] = useState(false);
    const [newSubcategoryName, setNewSubcategoryName] = useState('');
    const [isCreatingSubcategory, setIsCreatingSubcategory] = useState(false);

    // Split
    const [isSplitActive, setIsSplitActive] = useState(false);
    const [splitPeopleCount, setSplitPeopleCount] = useState(2);

    const amountRef = useRef(null);
    const newCatInputRef = useRef(null);
    const subInputRef = useRef(null);

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    // Populate transaction data on open
    useEffect(() => {
        if (transaction && isOpen) {
            const rawDesc = transaction.description || '';
            const splitMatch = rawDesc.match(/\(Split 1\/(\d+) of ₹([0-9.,]+)\)/i);
            if (splitMatch) {
                setIsSplitActive(true);
                setSplitPeopleCount(parseInt(splitMatch[1], 10) || 2);
                const parsedTotal = parseFloat(splitMatch[2].replace(/,/g, ''));
                if (!isNaN(parsedTotal) && parsedTotal > 0) {
                    setAmount(parsedTotal.toString());
                } else {
                    setAmount(transaction.amount?.toString() || '');
                }
                const cleanDesc = rawDesc.replace(/\s*\(Split 1\/(\d+) of ₹[0-9.,]+\)/i, '').trim();
                setDescription(cleanDesc);
            } else {
                setIsSplitActive(false);
                setSplitPeopleCount(2);
                setAmount(transaction.amount?.toString() || '');
                setDescription(rawDesc);
            }
            setSelectedCardId(transaction.card_id || transaction.category || (cards[0]?.id || ''));
            setSelectedSubcategoryId(transaction.subcategory_id || '');
            const parsedDate = transaction.date ? format(new Date(transaction.date), 'yyyy-MM-dd') : todayStr;
            setDate(parsedDate);
            setShowCustomDate(parsedDate !== todayStr && parsedDate !== yesterdayStr);
            setShowDeleteConfirm(false);
            setShowNewCategoryForm(false);
            setNewCategoryName('');
            setUserCustomizedIcon(false);
            setShowNewSubcategoryInput(false);
            setNewSubcategoryName('');
        }
    }, [transaction, isOpen, cards]);

    useEffect(() => {
        if (showNewCategoryForm) {
            setTimeout(() => newCatInputRef.current?.focus(), 150);
        }
    }, [showNewCategoryForm]);

    useEffect(() => {
        if (showNewSubcategoryInput) {
            setTimeout(() => subInputRef.current?.focus(), 150);
        }
    }, [showNewSubcategoryInput]);

    // Load subcategories when category changes
    useEffect(() => {
        const loadSubs = async () => {
            if (selectedCardId && fetchSubcategories) {
                const subs = await fetchSubcategories(selectedCardId);
                setSubcategories(subs || []);
            } else {
                setSubcategories([]);
            }
        };
        loadSubs();
    }, [selectedCardId, fetchSubcategories]);

    // Intelligent icon suggestion based on typed category name
    const handleCategoryNameChange = (val) => {
        setNewCategoryName(val);
        if (!userCustomizedIcon && val.trim()) {
            const lower = val.toLowerCase();
            for (const entry of NAME_KEYWORDS_MAP) {
                if (entry.keywords.some(k => lower.includes(k))) {
                    setNewCategoryIcon(entry.icon);
                    break;
                }
            }
        }
    };

    /* ── create category on the fly ─────────────────── */
    const handleCreateCategory = async (e) => {
        if (e) e.preventDefault();
        const trimmed = newCategoryName.trim();
        if (!trimmed || isCreatingCategory) return;

        setIsCreatingCategory(true);
        try {
            let created = null;
            if (onAddCategory) {
                const res = await onAddCategory(
                    trimmed,
                    newCategoryColor,
                    [trimmed.toLowerCase()],
                    newCategoryIcon
                );
                created = res?.data || res;
            } else {
                const { data: { session } } = await supabase.auth.getSession();
                const userId = session?.user?.id;
                const maxOrder = mergedCards.reduce((max, c) => Math.max(max, c.sort_order || 0), 0);
                const { data, error } = await supabase
                    .from('expense_cards')
                    .insert([{
                        name: trimmed,
                        icon: newCategoryIcon,
                        color: newCategoryColor,
                        category_ids: [trimmed.toLowerCase()],
                        is_default: false,
                        sort_order: maxOrder + 1,
                        user_id: userId,
                        created_at: new Date().toISOString()
                    }])
                    .select()
                    .single();
                if (error) throw error;
                created = data;
            }

            if (created && created.id) {
                setLocalNewCards(prev => [...prev, created]);
                setSelectedCardId(created.id);
            }
            setShowNewCategoryForm(false);
            setNewCategoryName('');
            setUserCustomizedIcon(false);
        } catch (err) {
            console.error('Error creating category on the go:', err);
        } finally {
            setIsCreatingCategory(false);
        }
    };

    /* ── create subcategory on the fly ──────────────── */
    const handleCreateSubcategory = async (e) => {
        if (e) e.preventDefault();
        const trimmed = newSubcategoryName.trim();
        if (!trimmed || !selectedCardId || isCreatingSubcategory) return;

        setIsCreatingSubcategory(true);
        try {
            let createdSub = null;
            if (onAddSubcategory) {
                createdSub = await onAddSubcategory(selectedCardId, trimmed);
            } else {
                const { data, error } = await supabase
                    .from('expense_subcategories')
                    .insert([{ card_id: selectedCardId, name: trimmed }])
                    .select()
                    .single();
                if (error) throw error;
                createdSub = data;
            }

            if (createdSub && createdSub.id) {
                setSubcategories(prev => {
                    if (prev.some(s => s.id === createdSub.id)) return prev;
                    return [...prev, createdSub];
                });
                setSelectedSubcategoryId(createdSub.id);
            }
            setShowNewSubcategoryInput(false);
            setNewSubcategoryName('');
        } catch (err) {
            console.error('Error creating subcategory on the go:', err);
        } finally {
            setIsCreatingSubcategory(false);
        }
    };

    const rawTotal = parseFloat(amount) || 0;
    const hasAmount = rawTotal > 0;
    const hasCategory = !!selectedCardId;
    const safeSplit = Math.max(2, parseInt(splitPeopleCount, 10) || 2);
    const share = isSplitActive && rawTotal > 0
        ? Math.round((rawTotal / safeSplit) * 100) / 100
        : rawTotal;

    // Merge prop cards with locally created cards
    const mergedCards = useMemo(() => {
        const existingIds = new Set(cards.map(c => c.id));
        const extra = localNewCards.filter(c => !existingIds.has(c.id));
        return [...cards, ...extra];
    }, [cards, localNewCards]);

    const selectedCat = mergedCards.find(c => c.id === selectedCardId);
    const accent = selectedCat?.color || '#a855f7';

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        if (!hasAmount || !selectedCardId || isSubmitting || !transaction) return;

        setIsSubmitting(true);
        try {
            let desc = description.trim() || selectedCat?.name || 'Expense';
            if (isSplitActive && rawTotal > 0 && !desc.toLowerCase().includes('split')) {
                desc = `${desc} (Split 1/${safeSplit} of ₹${rawTotal.toLocaleString('en-IN')})`;
            }

            await onUpdateExpense(transaction.id, {
                amount: isSplitActive ? share : rawTotal,
                description: desc,
                card_id: selectedCardId,
                category: selectedCardId,
                subcategory_id: selectedSubcategoryId || null,
                date: new Date(date).toISOString(),
            });
            onClose();
        } catch (err) {
            console.error('Error updating transaction:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!transaction || isDeleting) return;
        setIsDeleting(true);
        try {
            const txId = transaction.id;
            onClose();
            await onDeleteExpense(txId);
        } catch (err) {
            console.error('Error deleting transaction:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    if (!transaction) return null;

    const styles = `
        .qeem-amount-input::-webkit-inner-spin-button,
        .qeem-amount-input::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        .qeem-amount-input[type=number] {
            -moz-appearance: textfield;
        }
        .qeem-amount-input,
        .qeem-amount-input:focus,
        .qeem-amount-input:focus-visible,
        .qeem-amount-input:active,
        .qeem-bare-input,
        .qeem-bare-input:focus,
        .qeem-bare-input:focus-visible,
        .qeem-bare-input:active {
            outline: none !important;
            border: none !important;
            border-color: transparent !important;
            box-shadow: none !important;
            background: transparent !important;
        }
        .qeem-amount-input::placeholder {
            color: rgba(255,255,255,0.18);
        }
    `;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="">
            <style>{styles}</style>

            <form onSubmit={handleSave} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
            }}>

                {/* ═══════════════════════════════════════════
                    HERO AMOUNT SECTION
                    ═══════════════════════════════════════════ */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '4px 0 14px',
                }}>
                    <span style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'var(--text-muted)',
                        marginBottom: '8px',
                        letterSpacing: '0.3px',
                        textTransform: 'uppercase'
                    }}>
                        Edit Expense Amount
                    </span>

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
                            className="qeem-amount-input"
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

                    {/* Split toggle */}
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
                    DESCRIPTION / NOTE
                    ═══════════════════════════════════════════ */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    border: `1px solid ${isDescFocused ? accent : (description ? `color-mix(in srgb, ${accent} 40%, transparent)` : 'rgba(255,255,255,0.07)')}`,
                    background: isDescFocused ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
                    boxShadow: isDescFocused ? `0 0 16px color-mix(in srgb, ${accent} 15%, transparent)` : 'none',
                    transition: 'all 0.25s ease',
                }}>
                    <span style={{ fontSize: '14px', color: 'var(--text-muted)', flexShrink: 0 }}>✏️</span>
                    <input
                        type="text"
                        className="qeem-bare-input"
                        placeholder="What's this for?"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        onFocus={() => setIsDescFocused(true)}
                        onBlur={() => setIsDescFocused(false)}
                        style={{
                            flex: 1,
                            fontSize: '14px',
                            fontWeight: '500',
                            color: 'var(--text-primary)',
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            boxShadow: 'none',
                            fontFamily: 'inherit',
                        }}
                    />
                </div>

                {/* ═══════════════════════════════════════════
                    CATEGORY TILES
                    ═══════════════════════════════════════════ */}
                <div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '8px',
                        paddingLeft: '2px',
                    }}>
                        <span style={{
                            display: 'block',
                            fontSize: '11px',
                            fontWeight: '700',
                            color: 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.8px',
                        }}>Category</span>

                        <button
                            type="button"
                            onClick={() => setShowNewCategoryForm(prev => !prev)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: showNewCategoryForm ? '#f87171' : accent,
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 4px',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            {showNewCategoryForm ? <X size={12} /> : <Plus size={12} />}
                            <span>{showNewCategoryForm ? 'Cancel' : 'New Category'}</span>
                        </button>
                    </div>

                    {/* ── INLINE NEW CATEGORY FORM ─── */}
                    <AnimatePresence>
                        {showNewCategoryForm && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, scale: 0.98 }}
                                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                                exit={{ opacity: 0, height: 0, scale: 0.98 }}
                                transition={{ duration: 0.22, ease: 'easeOut' }}
                                style={{
                                    overflow: 'hidden',
                                    marginBottom: '12px',
                                    padding: '12px',
                                    borderRadius: '16px',
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    border: `1px solid color-mix(in srgb, ${newCategoryColor} 45%, rgba(255,255,255,0.1))`,
                                    boxShadow: `0 8px 24px color-mix(in srgb, ${newCategoryColor} 15%, transparent)`,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <CategoryIcon icon={newCategoryIcon} size={15} color={newCategoryColor} />
                                        Create New Category
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowNewCategoryForm(false);
                                            setNewCategoryName('');
                                        }}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex' }}
                                    >
                                        <X size={13} />
                                    </button>
                                </div>

                                {/* Category Name Input */}
                                <input
                                    ref={newCatInputRef}
                                    type="text"
                                    value={newCategoryName}
                                    onChange={e => handleCategoryNameChange(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleCreateCategory();
                                        } else if (e.key === 'Escape') {
                                            setShowNewCategoryForm(false);
                                            setNewCategoryName('');
                                        }
                                    }}
                                    placeholder="Name (e.g. Pet Care, Games, Tuition)"
                                    style={{
                                        width: '100%',
                                        padding: '9px 12px',
                                        borderRadius: '10px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        color: 'var(--text-primary)',
                                        fontSize: '13px',
                                        fontFamily: 'inherit',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        marginBottom: '10px',
                                    }}
                                />

                                {/* Color Palette */}
                                <div style={{ marginBottom: '10px' }}>
                                    <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
                                        Color
                                    </span>
                                    <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', alignItems: 'center' }}>
                                        {PALETTE_COLORS.map(col => {
                                            const isSel = newCategoryColor === col;
                                            return (
                                                <button
                                                    key={col}
                                                    type="button"
                                                    onClick={() => setNewCategoryColor(col)}
                                                    style={{
                                                        width: '20px',
                                                        height: '20px',
                                                        borderRadius: '50%',
                                                        background: col,
                                                        border: isSel ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                                                        boxShadow: isSel ? `0 0 10px ${col}` : 'none',
                                                        transform: isSel ? 'scale(1.2)' : 'scale(1)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s ease',
                                                        padding: 0,
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Quick Icons */}
                                <div style={{ marginBottom: '12px' }}>
                                    <span style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
                                        Icon
                                    </span>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(28px, 1fr))',
                                        gap: '5px',
                                        maxHeight: '74px',
                                        overflowY: 'auto',
                                        padding: '4px',
                                        background: 'rgba(255, 255, 255, 0.02)',
                                        borderRadius: '10px',
                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                    }}>
                                        {POPULAR_ICONS.map(ic => {
                                            const isSelected = newCategoryIcon === ic;
                                            return (
                                                <button
                                                    key={ic}
                                                    type="button"
                                                    onClick={() => {
                                                        setNewCategoryIcon(ic);
                                                        setUserCustomizedIcon(true);
                                                    }}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        height: '28px',
                                                        borderRadius: '8px',
                                                        border: isSelected ? `1.5px solid ${newCategoryColor}` : '1px solid transparent',
                                                        background: isSelected ? `color-mix(in srgb, ${newCategoryColor} 25%, transparent)` : 'transparent',
                                                        color: isSelected ? newCategoryColor : 'var(--text-muted)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s ease',
                                                    }}
                                                    title={ic}
                                                >
                                                    <CategoryIcon icon={ic} size={14} />
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Submit category */}
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowNewCategoryForm(false);
                                            setNewCategoryName('');
                                        }}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            background: 'transparent',
                                            color: 'var(--text-muted)',
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCreateCategory}
                                        disabled={!newCategoryName.trim() || isCreatingCategory}
                                        style={{
                                            padding: '6px 14px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: newCategoryName.trim()
                                                ? `linear-gradient(135deg, ${newCategoryColor}, color-mix(in srgb, ${newCategoryColor} 70%, #000))`
                                                : 'rgba(255, 255, 255, 0.05)',
                                            color: '#ffffff',
                                            fontSize: '11px',
                                            fontWeight: '700',
                                            cursor: newCategoryName.trim() ? 'pointer' : 'not-allowed',
                                            opacity: newCategoryName.trim() ? 1 : 0.4,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            boxShadow: newCategoryName.trim() ? `0 4px 12px color-mix(in srgb, ${newCategoryColor} 40%, transparent)` : 'none',
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        {isCreatingCategory ? <Loader2 size={12} className="spin" /> : <Check size={12} />}
                                        <span>Save & Select</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Category Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                        gap: '8px',
                    }}>
                        {mergedCards.map(card => {
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

                    {/* Subcategories */}
                    <AnimatePresence>
                        {hasCategory && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, y: -8 }}
                                animate={{ opacity: 1, height: 'auto', y: 0 }}
                                exit={{ opacity: 0, height: 0, y: -8 }}
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                                style={{ overflow: 'hidden', marginTop: '12px' }}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '7px',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowNewSubcategoryInput(prev => !prev);
                                            if (showNewSubcategoryInput) setNewSubcategoryName('');
                                        }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: showNewSubcategoryInput ? '#f87171' : accent,
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px',
                                            padding: '2px 4px',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {showNewSubcategoryInput ? <X size={11} /> : <Plus size={11} />}
                                        <span>{showNewSubcategoryInput ? 'Cancel' : 'Add Subcategory'}</span>
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
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

                                    {!showNewSubcategoryInput && subcategories.length === 0 && (
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '2px 4px' }}>
                                            No subcategories yet
                                        </span>
                                    )}

                                    {/* Inline Add Subcategory input */}
                                    {showNewSubcategoryInput && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                background: 'rgba(255,255,255,0.05)',
                                                border: `1.5px solid ${accent}`,
                                                borderRadius: '20px',
                                                padding: '2px 6px 2px 10px',
                                                boxShadow: `0 0 10px color-mix(in srgb, ${accent} 25%, transparent)`,
                                            }}
                                        >
                                            <input
                                                ref={subInputRef}
                                                type="text"
                                                className="qeem-bare-input"
                                                value={newSubcategoryName}
                                                onChange={e => setNewSubcategoryName(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleCreateSubcategory();
                                                    } else if (e.key === 'Escape') {
                                                        setShowNewSubcategoryInput(false);
                                                        setNewSubcategoryName('');
                                                    }
                                                }}
                                                placeholder="New subcategory..."
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    outline: 'none',
                                                    color: 'var(--text-primary)',
                                                    fontSize: '12px',
                                                    fontFamily: 'inherit',
                                                    width: '130px',
                                                    padding: '3px 0',
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleCreateSubcategory}
                                                disabled={!newSubcategoryName.trim() || isCreatingSubcategory}
                                                style={{
                                                    background: accent,
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    width: '22px',
                                                    height: '22px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#fff',
                                                    cursor: newSubcategoryName.trim() ? 'pointer' : 'not-allowed',
                                                    opacity: newSubcategoryName.trim() ? 1 : 0.4,
                                                    flexShrink: 0,
                                                    transition: 'all 0.15s ease',
                                                }}
                                                title="Add subcategory"
                                            >
                                                {isCreatingSubcategory ? <Loader2 size={11} className="spin" /> : <Check size={12} />}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowNewSubcategoryInput(false);
                                                    setNewSubcategoryName('');
                                                }}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    padding: '2px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                }}
                                                title="Cancel"
                                            >
                                                <X size={13} />
                                            </button>
                                        </motion.div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ═══════════════════════════════════════════
                    DATE PICKER
                    ═══════════════════════════════════════════ */}
                <div style={{ marginTop: '2px' }}>
                    <span style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        marginBottom: '8px',
                        paddingLeft: '2px',
                    }}>Date</span>

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
                            <span>{date !== todayStr && date !== yesterdayStr ? format(new Date(date), 'dd MMM yyyy') : 'Pick date'}</span>
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
                </div>

                {/* ═══════════════════════════════════════════
                    DELETE CONFIRMATION / BUTTON
                    ═══════════════════════════════════════════ */}
                {showDeleteConfirm ? (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: '14px',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        marginTop: '4px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontSize: '13px', fontWeight: '600' }}>
                            <AlertCircle size={16} /> Are you sure you want to delete this expense?
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                style={{
                                    flex: 1,
                                    padding: '9px',
                                    borderRadius: '10px',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    background: 'rgba(255,255,255,0.04)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                style={{
                                    flex: 1,
                                    padding: '9px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: '#ef4444',
                                    color: '#fff',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)'
                                }}
                            >
                                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--danger, #ef4444)',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            padding: '6px',
                            opacity: 0.85,
                            transition: 'opacity 0.15s ease',
                            marginTop: '2px'
                        }}
                        onMouseOver={e => e.currentTarget.style.opacity = '1'}
                        onMouseOut={e => e.currentTarget.style.opacity = '0.85'}
                    >
                        <Trash2 size={14} /> Delete Transaction
                    </button>
                )}

                {/* ═══════════════════════════════════════════
                    SUBMIT AREA (Dark Luxe Vibe)
                    ═══════════════════════════════════════════ */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                    paddingTop: '4px',
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
                                <span>{hasAmount ? `Save Changes • ₹${(isSplitActive ? share : rawTotal).toLocaleString('en-IN')}` : 'Save Changes'}</span>
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

export default QuickEditExpenseModal;
