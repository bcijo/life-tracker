import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { Target, Link as LinkIcon, ArrowRight, Loader2, Trash2, AlertCircle } from 'lucide-react';
import useExpenseCards from '../hooks/useExpenseCards';
import { CategoryIcon } from '../utils/categoryIcons';

const BudgetModal = ({ isOpen, onClose, onSave, onDelete = null, budgetToEdit = null }) => {
    const { cards: categories } = useExpenseCards();

    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const amountRef = useRef(null);

    useEffect(() => {
        if (budgetToEdit && isOpen) {
            setName(budgetToEdit.name || '');
            setAmount(budgetToEdit.amount?.toString() || '');
            setSelectedCategories(budgetToEdit.category_ids || []);
            setShowDeleteConfirm(false);
        } else if (isOpen) {
            setName('');
            setAmount('');
            setSelectedCategories([]);
            setShowDeleteConfirm(false);
            setTimeout(() => amountRef.current?.focus(), 120);
        }
    }, [budgetToEdit, isOpen]);

    const handleSave = (e) => {
        if (e) e.preventDefault();
        if (!name.trim() || !amount || parseFloat(amount) <= 0 || isSubmitting) return;

        setIsSubmitting(true);
        try {
            onSave(name.trim(), parseFloat(amount), selectedCategories);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = () => {
        if (budgetToEdit && onDelete) {
            onDelete(budgetToEdit.id);
            onClose();
        }
    };

    const toggleCategory = (id) => {
        if (selectedCategories.includes(id)) {
            setSelectedCategories(selectedCategories.filter(c => c !== id));
        } else {
            setSelectedCategories([...selectedCategories, id]);
        }
    };

    const hasAmount = parseFloat(amount) > 0;
    const accent = '#10b981';

    const styles = `
        .qbm-amount-input::-webkit-inner-spin-button,
        .qbm-amount-input::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        .qbm-amount-input[type=number] {
            -moz-appearance: textfield;
        }
        .qbm-amount-input,
        .qbm-amount-input:focus,
        .qbm-amount-input:focus-visible,
        .qbm-amount-input:active {
            outline: none !important;
            border: none !important;
            border-color: transparent !important;
            box-shadow: none !important;
            background: transparent !important;
        }
        .qbm-amount-input::placeholder {
            color: rgba(255,255,255,0.18);
        }
    `;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="">
            <style>{styles}</style>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Hero Amount Input */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '6px 0 14px',
                }}>
                    <span style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'var(--text-muted)',
                        marginBottom: '8px',
                        letterSpacing: '0.3px',
                        textTransform: 'uppercase'
                    }}>
                        {budgetToEdit ? 'Edit Budget Target' : 'Set Budget Target'}
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
                            className="qbm-amount-input"
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
                </div>

                {/* Budget Name */}
                <div>
                    <span style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        marginBottom: '8px',
                        paddingLeft: '2px',
                    }}>Budget Name</span>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Monthly Living, Vacation, Groceries..."
                        style={{
                            width: '100%',
                            padding: '12px 14px',
                            borderRadius: '14px',
                            border: '1px solid rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.03)',
                            color: 'var(--text-primary)',
                            fontSize: '14px',
                            outline: 'none',
                            fontFamily: 'inherit'
                        }}
                    />
                </div>

                {/* Linked Categories (Optional) */}
                <div>
                    <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        marginBottom: '8px',
                        paddingLeft: '2px',
                    }}>
                        <LinkIcon size={12} /> Linked Categories (Optional)
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {(categories || []).map(cat => {
                            const isSelected = selectedCategories.includes(cat.id);
                            const catColor = cat.color || '#a855f7';
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => toggleCategory(cat.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '7px 12px',
                                        borderRadius: '14px',
                                        border: isSelected ? `1.5px solid ${catColor}` : '1px solid rgba(255,255,255,0.08)',
                                        background: isSelected ? `color-mix(in srgb, ${catColor} 20%, transparent)` : 'rgba(255,255,255,0.03)',
                                        color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                                        fontSize: '12px',
                                        fontWeight: isSelected ? '700' : '500',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        boxShadow: isSelected ? `0 2px 10px color-mix(in srgb, ${catColor} 25%, transparent)` : 'none'
                                    }}
                                >
                                    <CategoryIcon icon={cat.icon} name={cat.name} color={isSelected ? catColor : 'var(--text-muted)'} size={14} />
                                    <span>{cat.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Delete Confirmation / Trigger (when editing existing budget) */}
                {budgetToEdit && onDelete && (
                    <div>
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
                                    <AlertCircle size={16} /> Delete this budget?
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
                                        Yes, Delete
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
                                    padding: '4px',
                                    opacity: 0.85,
                                    transition: 'opacity 0.15s ease'
                                }}
                                onMouseOver={e => e.currentTarget.style.opacity = '1'}
                                onMouseOut={e => e.currentTarget.style.opacity = '0.85'}
                            >
                                <Trash2 size={14} /> Delete Budget
                            </button>
                        )}
                    </div>
                )}

                {/* Submit Area */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                    paddingTop: '6px',
                }}>
                    <button
                        type="submit"
                        disabled={!name.trim() || !hasAmount || isSubmitting}
                        style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '16px',
                            border: (name.trim() && hasAmount)
                                ? `1.5px solid color-mix(in srgb, ${accent} 70%, rgba(255,255,255,0.2))`
                                : '1px solid rgba(255,255,255,0.06)',
                            fontWeight: '700',
                            fontSize: '14px',
                            fontFamily: 'inherit',
                            letterSpacing: '0.2px',
                            cursor: (name.trim() && hasAmount) ? 'pointer' : 'not-allowed',
                            opacity: (name.trim() && hasAmount) ? 1 : 0.35,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            color: '#ffffff',
                            background: (name.trim() && hasAmount)
                                ? `linear-gradient(135deg, color-mix(in srgb, ${accent} 85%, #064e3b), color-mix(in srgb, ${accent} 55%, #022c22))`
                                : 'rgba(255,255,255,0.03)',
                            boxShadow: (name.trim() && hasAmount)
                                ? `0 6px 24px color-mix(in srgb, ${accent} 30%, transparent), inset 0 1px 1px rgba(255,255,255,0.2)`
                                : 'none',
                            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                    >
                        {isSubmitting ? (
                            <Loader2 size={18} className="spin" />
                        ) : (
                            <>
                                <span>{budgetToEdit ? 'Update Budget' : 'Create Budget'}</span>
                                {name.trim() && hasAmount && <ArrowRight size={15} />}
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

export default BudgetModal;
