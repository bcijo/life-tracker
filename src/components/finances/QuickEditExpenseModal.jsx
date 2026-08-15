import React, { useState, useEffect } from 'react';
import { Trash2, Calendar, Tag, AlertCircle } from 'lucide-react';
import Modal from '../Modal';
import CurrencyInput from '../CurrencyInput';
import { getIconByName } from '../ExpenseCard';

const QuickEditExpenseModal = ({
    isOpen,
    onClose,
    transaction,
    cards = [],
    onUpdateExpense,
    onDeleteExpense,
    fetchSubcategories
}) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [selectedCardId, setSelectedCardId] = useState('');
    const [selectedSubcategoryId, setSelectedSubcategoryId] = useState('');
    const [subcategories, setSubcategories] = useState([]);
    const [date, setDate] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (transaction) {
            setAmount(transaction.amount?.toString() || '');
            setDescription(transaction.description || '');
            setSelectedCardId(transaction.card_id || transaction.category || (cards[0]?.id || ''));
            setSelectedSubcategoryId(transaction.subcategory_id || '');
            setDate(transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
            setShowDeleteConfirm(false);
        }
    }, [transaction, cards]);

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
    }, [selectedCardId]);

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        if (!amount || !selectedCardId || parseFloat(amount) <= 0 || isSubmitting || !transaction) return;

        setIsSubmitting(true);
        try {
            await onUpdateExpense(transaction.id, {
                amount: parseFloat(amount),
                description: description.trim() || cards.find(c => c.id === selectedCardId)?.name || 'Expense',
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
            await onDeleteExpense(transaction.id);
            onClose();
        } catch (err) {
            console.error('Error deleting transaction:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    if (!transaction) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Expense">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: '75vh', overflowY: 'auto', paddingRight: '2px' }}>
                
                {/* Amount Input */}
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

                {/* Description */}
                <div>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                        Note / Description
                    </label>
                    <input
                        type="text"
                        placeholder="Description"
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

                {/* Subcategories */}
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
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            border: '1px solid var(--glass-card-border)',
                            background: 'var(--surface-input)',
                            color: 'var(--text-primary)',
                            fontSize: '14px',
                            outline: 'none'
                        }}
                    />
                </div>

                {/* Delete Confirmation or Delete Trigger */}
                {showDeleteConfirm ? (
                    <div style={{
                        background: 'rgba(245, 101, 101, 0.1)',
                        border: '1px solid rgba(245, 101, 101, 0.3)',
                        borderRadius: '12px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', fontSize: '13px', fontWeight: '600' }}>
                            <AlertCircle size={16} /> Delete this transaction?
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(false)}
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--glass-card-border)',
                                    background: 'var(--surface-input)',
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
                                    padding: '8px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'var(--danger)',
                                    color: '#fff',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
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
                            color: 'var(--danger)',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            padding: '8px'
                        }}
                    >
                        <Trash2 size={15} /> Delete Transaction
                    </button>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
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
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!amount || parseFloat(amount) <= 0 || isSubmitting}
                        style={{
                            flex: 2,
                            padding: '14px',
                            borderRadius: '14px',
                            border: 'none',
                            background: 'var(--accent-gradient, #4ecdc4)',
                            color: '#fff',
                            fontWeight: '700',
                            fontSize: '15px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 16px rgba(78, 205, 196, 0.3)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default QuickEditExpenseModal;
