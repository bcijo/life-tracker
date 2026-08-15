import React, { useState, useEffect } from 'react';
import { X, Sparkles, Calendar, Tag, ChevronRight, Check } from 'lucide-react';
import Modal from '../Modal';
import CurrencyInput from '../CurrencyInput';
import { getIconByName } from '../ExpenseCard';

const SMART_PRESETS = [
    { label: 'Chai / Coffee', amount: '50', icon: '☕', categoryHint: 'Food' },
    { label: 'Lunch / Snacks', amount: '150', icon: '🥗', categoryHint: 'Food' },
    { label: 'Dinner / Swiggy', amount: '350', icon: '🍕', categoryHint: 'Food' },
    { label: 'Auto / Cab / Metro', amount: '120', icon: '🚕', categoryHint: 'Transport' },
    { label: 'Fuel / Petrol', amount: '500', icon: '⛽', categoryHint: 'Transport' },
    { label: 'Groceries / Mart', amount: '600', icon: '🛒', categoryHint: 'Groceries' },
    { label: 'Entertainment / Movie', amount: '300', icon: '🍿', categoryHint: 'Entertainment' },
    { label: 'Pharmacy / Meds', amount: '250', icon: '💊', categoryHint: 'Health' },
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
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
    }, [selectedCardId]);

    const handleApplyPreset = (preset) => {
        setAmount(preset.amount);
        setDescription(preset.label);
        // Attempt to auto-match category
        const matchedCard = cards.find(c => 
            c.name.toLowerCase().includes(preset.categoryHint.toLowerCase()) ||
            preset.categoryHint.toLowerCase().includes(c.name.toLowerCase())
        );
        if (matchedCard) {
            setSelectedCardId(matchedCard.id);
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!amount || !selectedCardId || parseFloat(amount) <= 0 || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await onAddExpense({
                amount: parseFloat(amount),
                description: description.trim() || cards.find(c => c.id === selectedCardId)?.name || 'Expense',
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
            setDate(new Date().toISOString().split('T')[0]);
            onClose();
        } catch (err) {
            console.error('Error adding transaction:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add Expense">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: '75vh', overflowY: 'auto', paddingRight: '2px' }}>
                
                {/* Big Amount Input Hero */}
                <div style={{
                    background: 'var(--surface-input)',
                    borderRadius: '16px',
                    padding: '16px',
                    border: '1px solid var(--glass-card-border)',
                    textAlign: 'center'
                }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Expense Amount
                    </label>
                    <CurrencyInput
                        value={amount}
                        onChange={(val) => setAmount(val)}
                        placeholder="0"
                        autoFocus={true}
                        inputStyle={{
                            fontSize: '36px',
                            fontWeight: '800',
                            textAlign: 'center',
                            color: 'var(--text-primary)',
                            padding: '8px 0',
                            border: 'none',
                            background: 'transparent'
                        }}
                    />
                </div>

                {/* Smart 1-Tap Presets */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <Sparkles size={14} color="var(--accent-primary, #4ecdc4)" />
                        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                            Quick Presets
                        </span>
                    </div>
                    <div style={{
                        display: 'flex',
                        gap: '8px',
                        overflowX: 'auto',
                        paddingBottom: '4px',
                        WebkitOverflowScrolling: 'touch'
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
                                    padding: '8px 12px',
                                    borderRadius: '20px',
                                    border: '1px solid var(--glass-card-border)',
                                    background: 'var(--glass-card-bg)',
                                    color: 'var(--text-primary)',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    whiteSpace: 'nowrap'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.borderColor = 'var(--accent-primary, #4ecdc4)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.borderColor = 'var(--glass-card-border)';
                                }}
                            >
                                <span>{preset.icon}</span>
                                <span>{preset.label}</span>
                                <span style={{ opacity: 0.75, fontWeight: '700' }}>₹{preset.amount}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Description Input */}
                <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        Note / Description
                    </label>
                    <input
                        type="text"
                        placeholder="What was this for? (e.g. Grocery run)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: '12px',
                            border: '1px solid var(--glass-card-border)',
                            background: 'var(--surface-input)',
                            color: 'var(--text-primary)',
                            fontSize: '14px',
                            outline: 'none'
                        }}
                    />
                </div>

                {/* Category Grid Picker */}
                <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                        Category
                    </label>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                        gap: '8px'
                    }}>
                        {cards.map(card => {
                            const isSelected = selectedCardId === card.id;
                            return (
                                <button
                                    key={card.id}
                                    type="button"
                                    onClick={() => setSelectedCardId(card.id)}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        padding: '10px 6px',
                                        borderRadius: '12px',
                                        border: isSelected ? `2px solid ${card.color}` : '1px solid var(--glass-card-border)',
                                        background: isSelected ? `${card.color}22` : 'var(--surface-input)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <div style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '8px',
                                        background: `${card.color}33`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {React.cloneElement(getIconByName(card.name), { color: card.color, size: 16 })}
                                    </div>
                                    <span style={{
                                        fontSize: '12px',
                                        fontWeight: isSelected ? '700' : '500',
                                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                                        textAlign: 'center',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        maxWidth: '90px'
                                    }}>
                                        {card.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Subcategories (if any) */}
                {subcategories.length > 0 && (
                    <div>
                        <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                            Subcategory (Optional)
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {subcategories.map(sub => {
                                const isSubSelected = selectedSubcategoryId === sub.id;
                                return (
                                    <button
                                        key={sub.id}
                                        type="button"
                                        onClick={() => setSelectedSubcategoryId(isSubSelected ? '' : sub.id)}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '16px',
                                            border: isSubSelected ? '1px solid var(--accent-primary, #4ecdc4)' : '1px solid var(--glass-card-border)',
                                            background: isSubSelected ? 'var(--accent-primary, #4ecdc4)22' : 'var(--surface-input)',
                                            color: isSubSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                                            fontSize: '12px',
                                            fontWeight: isSubSelected ? '700' : '500',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {sub.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Date Picker */}
                <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        Date
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            style={{
                                flex: 1,
                                padding: '10px 14px',
                                borderRadius: '12px',
                                border: '1px solid var(--glass-card-border)',
                                background: 'var(--surface-input)',
                                color: 'var(--text-primary)',
                                fontSize: '14px',
                                outline: 'none'
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setDate(new Date().toISOString().split('T')[0])}
                            style={{
                                padding: '10px 14px',
                                borderRadius: '12px',
                                border: '1px solid var(--glass-card-border)',
                                background: 'var(--glass-card-bg)',
                                color: 'var(--text-primary)',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            Today
                        </button>
                    </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '14px',
                            borderRadius: '14px',
                            border: '1px solid var(--glass-card-border)',
                            background: 'var(--surface-input)',
                            color: 'var(--text-secondary)',
                            fontWeight: '600',
                            fontSize: '15px',
                            cursor: 'pointer'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!amount || parseFloat(amount) <= 0 || isSubmitting}
                        style={{
                            flex: 2,
                            padding: '14px',
                            borderRadius: '14px',
                            border: 'none',
                            background: amount && parseFloat(amount) > 0 ? 'var(--accent-gradient, #4ecdc4)' : 'var(--border-subtle)',
                            color: '#fff',
                            fontWeight: '700',
                            fontSize: '15px',
                            cursor: amount && parseFloat(amount) > 0 ? 'pointer' : 'not-allowed',
                            boxShadow: amount && parseFloat(amount) > 0 ? '0 4px 16px rgba(78, 205, 196, 0.3)' : 'none',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {isSubmitting ? 'Saving...' : 'Add Expense'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default QuickAddExpenseModal;
