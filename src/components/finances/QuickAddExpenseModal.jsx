import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Calendar, Check, Loader2, ArrowRight, Users, X, Minus, Plus } from 'lucide-react';
import Modal from '../Modal';
import { getIconByName } from '../ExpenseCard';
import { format, subDays } from 'date-fns';

const SMART_PRESETS = [
    { label: 'Chai / Coffee', amount: '50', icon: '☕', categoryHint: 'Food' },
    { label: 'Lunch / Snacks', amount: '150', icon: '🥗', categoryHint: 'Food' },
    { label: 'Dinner', amount: '350', icon: '🍕', categoryHint: 'Food' },
    { label: 'Cab / Auto', amount: '120', icon: '🚕', categoryHint: 'Transport' },
    { label: 'Fuel / Petrol', amount: '500', icon: '⛽', categoryHint: 'Transport' },
    { label: 'Groceries', amount: '600', icon: '🛒', categoryHint: 'Groceries' },
    { label: 'Entertainment', amount: '300', icon: '🍿', categoryHint: 'Entertainment' },
    { label: 'Medicine', amount: '250', icon: '💊', categoryHint: 'Health' },
];

const QuickAddExpenseModal = ({
    isOpen,
    onClose,
    cards = [],
    onAddExpense,
    fetchSubcategories,
    initialCardId = null
}) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCardId, setSelectedCardId] = useState(initialCardId || (cards[0]?.id || ''));
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');
    const [subcategories, setSubcategories] = useState([]);
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [showCustomDate, setShowCustomDate] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Split state
    const [isSplitActive, setIsSplitActive] = useState(false);
    const [splitPeopleCount, setSplitPeopleCount] = useState(2);

    const inputRef = useRef(null);

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    // Auto-focus amount input on modal open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    // Sync default card when opened or cards change
    useEffect(() => {
        if (initialCardId) {
            setSelectedCardId(initialCardId);
        } else if (cards.length > 0 && !selectedCardId) {
            setSelectedCardId(cards[0].id);
        }
    }, [initialCardId, cards]);

    // Load subcategories when selected card changes
    useEffect(() => {
        const loadSubs = async () => {
            if (selectedCardId && fetchSubcategories) {
                const subs = await fetchSubcategories(selectedCardId);
                setSubcategories(subs || []);
                setSelectedSubcategoryId('');
            } else {
                setSubcategories([]);
                setSelectedSubcategoryId('');
            }
        };
        loadSubs();
    }, [selectedCardId, fetchSubcategories]);

    const handleApplyPreset = (preset) => {
        setAmount(preset.amount);
        setDescription(preset.label);
        // Auto-match category
        const matchedCard = cards.find(c => 
            c.name.toLowerCase().includes(preset.categoryHint.toLowerCase()) ||
            preset.categoryHint.toLowerCase().includes(c.name.toLowerCase())
        );
        if (matchedCard) {
            setSelectedCardId(matchedCard.id);
        }
    };

    // Calculate effective amount for user's share
    const rawTotalAmount = parseFloat(amount) || 0;
    const safeSplitCount = Math.max(2, parseInt(splitPeopleCount, 10) || 2);
    const calculatedShare = isSplitActive && rawTotalAmount > 0 
        ? Math.round((rawTotalAmount / safeSplitCount) * 100) / 100 
        : rawTotalAmount;

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!calculatedShare || calculatedShare <= 0 || !selectedCardId || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const cardObj = cards.find(c => c.id === selectedCardId);
            
            let finalDescription = description.trim() || cardObj?.name || 'Expense';
            if (isSplitActive && rawTotalAmount > 0 && !finalDescription.toLowerCase().includes('split')) {
                finalDescription = `${finalDescription} (Split 1/${safeSplitCount} of ₹${rawTotalAmount.toLocaleString('en-IN')})`;
            }

            await onAddExpense({
                amount: calculatedShare,
                description: finalDescription,
                type: 'expense',
                card_id: selectedCardId,
                category: selectedCardId,
                subcategory_id: selectedSubcategoryId || null,
                date: new Date(date).toISOString(),
            });

            // Reset form
            setAmount('');
            setDescription('');
            setSelectedSubcategoryId('');
            setIsSplitActive(false);
            setSplitPeopleCount(2);
            setDate(format(new Date(), 'yyyy-MM-dd'));
            setShowCustomDate(false);
            onClose();
        } catch (err) {
            console.error('Error adding transaction:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && calculatedShare > 0) {
            handleSubmit(e);
        }
    };

    const selectedCategory = cards.find(c => c.id === selectedCardId);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Expense">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--text-primary)' }}>
                
                {/* Clean Hero Amount Input & Split Option */}
                <div style={{
                    background: 'var(--surface-input)',
                    borderRadius: '20px',
                    padding: '18px 16px 14px 16px',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                        {isSplitActive ? 'Total Bill Amount' : 'Amount'}
                    </span>
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', width: '100%' }}>
                        <span style={{ fontSize: '28px', fontWeight: '700', color: 'var(--accent-primary)', opacity: 0.85 }}>₹</span>
                        <input
                            ref={inputRef}
                            type="number"
                            step="any"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="0"
                            style={{
                                fontSize: '38px',
                                fontWeight: '800',
                                color: 'var(--text-primary)',
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                width: '100%',
                                maxWidth: '240px',
                                textAlign: 'left',
                                fontFamily: 'inherit'
                            }}
                        />
                    </div>

                    {/* Subtle Split Toggle / Trigger */}
                    {!isSplitActive ? (
                        <button
                            type="button"
                            onClick={() => setIsSplitActive(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '5px 12px',
                                borderRadius: '12px',
                                border: '1px solid var(--border-subtle)',
                                background: 'var(--surface-elevated)',
                                color: 'var(--text-secondary)',
                                fontSize: '11px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                marginTop: '4px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'var(--accent-primary)';
                                e.currentTarget.style.color = 'var(--text-primary)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                            }}
                        >
                            <Users size={13} style={{ color: 'var(--accent-primary)' }} />
                            <span>Split with people?</span>
                        </button>
                    ) : (
                        /* Active Split Controls Card */
                        <div style={{
                            width: '100%',
                            background: 'var(--surface-elevated)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '14px',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            marginTop: '6px',
                            animation: 'fadeIn 0.2s ease'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Users size={14} style={{ color: 'var(--accent-primary)' }} />
                                    Split Equally
                                </span>
                                <button
                                    type="button"
                                    onClick={() => { setIsSplitActive(false); setSplitPeopleCount(2); }}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        padding: '2px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Cancel split"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Divide among:</span>
                                
                                {/* Stepper */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-input)', padding: '3px 6px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                                    <button
                                        type="button"
                                        onClick={() => setSplitPeopleCount(prev => Math.max(2, (parseInt(prev, 10) || 2) - 1))}
                                        disabled={safeSplitCount <= 2}
                                        style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            background: safeSplitCount > 2 ? 'var(--surface-elevated)' : 'transparent',
                                            color: 'var(--text-primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: safeSplitCount > 2 ? 'pointer' : 'not-allowed',
                                            opacity: safeSplitCount > 2 ? 1 : 0.4
                                        }}
                                    >
                                        <Minus size={12} />
                                    </button>
                                    
                                    <span style={{ fontSize: '13px', fontWeight: '800', minWidth: '45px', textAlign: 'center' }}>
                                        {safeSplitCount} people
                                    </span>

                                    <button
                                        type="button"
                                        onClick={() => setSplitPeopleCount(prev => (parseInt(prev, 10) || 2) + 1)}
                                        style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            background: 'var(--surface-elevated)',
                                            color: 'var(--text-primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Plus size={12} />
                                    </button>
                                </div>
                            </div>

                            {/* Quick selection numbers */}
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                {[2, 3, 4, 5].map(num => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => setSplitPeopleCount(num)}
                                        style={{
                                            padding: '3px 8px',
                                            borderRadius: '8px',
                                            border: safeSplitCount === num ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                                            background: safeSplitCount === num ? 'color-mix(in srgb, var(--accent-primary) 15%, transparent)' : 'transparent',
                                            color: safeSplitCount === num ? 'var(--accent-primary)' : 'var(--text-muted)',
                                            fontSize: '11px',
                                            fontWeight: safeSplitCount === num ? '700' : '500',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {num}p
                                    </button>
                                ))}
                            </div>

                            {/* Calculated share badge */}
                            {rawTotalAmount > 0 && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    background: 'var(--success-bg)',
                                    color: 'var(--success)',
                                    fontSize: '12px',
                                    fontWeight: '700'
                                }}>
                                    <span>Your Share:</span>
                                    <span>₹{calculatedShare.toLocaleString('en-IN')} / person</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 1-Tap Smart Presets */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <Sparkles size={13} style={{ color: 'var(--accent-primary)' }} />
                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Quick Tap
                        </span>
                    </div>
                    <div style={{
                        display: 'flex',
                        gap: '6px',
                        overflowX: 'auto',
                        paddingBottom: '4px',
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'none'
                    }}>
                        {SMART_PRESETS.map((preset, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => handleApplyPreset(preset)}
                                style={{
                                    flex: '0 0 auto',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '7px 12px',
                                    borderRadius: '16px',
                                    border: '1px solid var(--border-subtle)',
                                    background: 'var(--surface-input)',
                                    color: 'var(--text-primary)',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                <span>{preset.icon}</span>
                                <span>{preset.label}</span>
                                <span style={{ opacity: 0.65, fontWeight: '700' }}>₹{preset.amount}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Category Picker */}
                <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                        Category {selectedCategory && <span style={{ color: selectedCategory.color, fontWeight: '700' }}>• {selectedCategory.name}</span>}
                    </label>
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        overflowX: 'auto',
                        paddingBottom: '4px',
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'none'
                    }}>
                        {cards.map(card => {
                            const isSelected = selectedCardId === card.id;
                            const cardColor = card.color || '#6366f1';
                            return (
                                <button
                                    key={card.id}
                                    type="button"
                                    onClick={() => setSelectedCardId(card.id)}
                                    style={{
                                        flex: '0 0 auto',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '8px 14px',
                                        borderRadius: '14px',
                                        border: isSelected ? `2px solid ${cardColor}` : '1px solid var(--border-subtle)',
                                        background: isSelected ? `color-mix(in srgb, ${cardColor} 18%, transparent)` : 'var(--surface-input)',
                                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        fontWeight: isSelected ? '700' : '500',
                                        fontSize: '12px'
                                    }}
                                >
                                    <div style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '6px',
                                        background: `color-mix(in srgb, ${cardColor} 25%, transparent)`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {React.cloneElement(getIconByName(card.name), { color: cardColor, size: 12 })}
                                    </div>
                                    <span>{card.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Subcategories (if available for selected card) */}
                {subcategories.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {subcategories.map(sub => {
                            const isSubSelected = selectedSubcategoryId === sub.id;
                            return (
                                <button
                                    key={sub.id}
                                    type="button"
                                    onClick={() => setSelectedSubcategoryId(isSubSelected ? '' : sub.id)}
                                    style={{
                                        padding: '5px 10px',
                                        borderRadius: '12px',
                                        border: isSubSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                                        background: isSubSelected ? 'color-mix(in srgb, var(--accent-primary) 18%, transparent)' : 'var(--surface-input)',
                                        color: isSubSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                                        fontSize: '11px',
                                        fontWeight: isSubSelected ? '700' : '500',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {sub.name}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Note / Description */}
                <div>
                    <input
                        type="text"
                        placeholder="Note / Description (e.g. Dinner with friends, Uber, Groceries)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="surface-input styled-input"
                        style={{
                            width: '100%',
                            padding: '11px 14px',
                            borderRadius: '14px',
                            fontSize: '13px'
                        }}
                    />
                </div>

                {/* Quick Date Selector (Today / Yesterday / Custom) */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                            type="button"
                            onClick={() => { setDate(todayStr); setShowCustomDate(false); }}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '12px',
                                border: date === todayStr ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                                background: date === todayStr ? 'color-mix(in srgb, var(--accent-primary) 15%, transparent)' : 'var(--surface-input)',
                                color: date === todayStr ? 'var(--text-primary)' : 'var(--text-muted)',
                                fontSize: '11px',
                                fontWeight: date === todayStr ? '700' : '500',
                                cursor: 'pointer'
                            }}
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => { setDate(yesterdayStr); setShowCustomDate(false); }}
                            style={{
                                padding: '6px 12px',
                                borderRadius: '12px',
                                border: date === yesterdayStr ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                                background: date === yesterdayStr ? 'color-mix(in srgb, var(--accent-primary) 15%, transparent)' : 'var(--surface-input)',
                                color: date === yesterdayStr ? 'var(--text-primary)' : 'var(--text-muted)',
                                fontSize: '11px',
                                fontWeight: date === yesterdayStr ? '700' : '500',
                                cursor: 'pointer'
                            }}
                        >
                            Yesterday
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowCustomDate(!showCustomDate)}
                            style={{
                                padding: '6px 10px',
                                borderRadius: '12px',
                                border: showCustomDate || (date !== todayStr && date !== yesterdayStr) ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                                background: showCustomDate || (date !== todayStr && date !== yesterdayStr) ? 'color-mix(in srgb, var(--accent-primary) 15%, transparent)' : 'var(--surface-input)',
                                color: 'var(--text-secondary)',
                                fontSize: '11px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <Calendar size={12} />
                            <span>{date !== todayStr && date !== yesterdayStr ? date : 'Other'}</span>
                        </button>
                    </div>

                    {showCustomDate && (
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            style={{
                                padding: '4px 8px',
                                borderRadius: '10px',
                                border: '1px solid var(--border-subtle)',
                                background: 'var(--surface-input)',
                                color: 'var(--text-primary)',
                                fontSize: '11px'
                            }}
                        />
                    )}
                </div>

                {/* Primary Action Button */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            flex: '1',
                            padding: '12px',
                            borderRadius: '14px',
                            border: '1px solid var(--border-subtle)',
                            background: 'var(--surface-input)',
                            color: 'var(--text-secondary)',
                            fontWeight: '600',
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!calculatedShare || calculatedShare <= 0 || isSubmitting}
                        className="btn-primary"
                        style={{
                            flex: '2',
                            padding: '12px',
                            borderRadius: '14px',
                            border: 'none',
                            fontWeight: '700',
                            fontSize: '14px',
                            cursor: calculatedShare > 0 ? 'pointer' : 'not-allowed',
                            opacity: calculatedShare > 0 ? 1 : 0.6,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                        }}
                    >
                        {isSubmitting ? (
                            <Loader2 size={18} className="spin" />
                        ) : (
                            <>
                                <span>
                                    {isSplitActive && calculatedShare > 0
                                        ? `Add My Share: ₹${calculatedShare.toLocaleString('en-IN')}`
                                        : calculatedShare > 0
                                            ? `Add ₹${calculatedShare.toLocaleString('en-IN')}`
                                            : 'Add Expense'}
                                </span>
                                <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default QuickAddExpenseModal;
