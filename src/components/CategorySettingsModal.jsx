import React, { useState, useEffect } from 'react';
import { Trash2, Plus } from 'lucide-react';
import useExpenseCards from '../hooks/useExpenseCards';
import CurrencyInput from './CurrencyInput';
import Modal from './Modal';

const EMOJI_LIST = ['🍽️', '🚗', '🛒', '💡', '🎬', '🏥', '📦', '🏠', '✈️', '🎮', '🎓', '🎁', '🔧', '💅', '🏋️', '📚', '🍕', '🍻', '👶', '🐾'];

const CategorySettingsModal = ({ card, onClose }) => {
    const { updateCard, deleteCard, fetchSubcategories, addSubcategory, deleteSubcategory } = useExpenseCards();
    
    const [editName, setEditName] = useState(card.name);
    const [editIcon, setEditIcon] = useState(card.icon || '🍽️');
    const [editBudget, setEditBudget] = useState(card.budget_amount || '');
    const [isSaving, setIsSaving] = useState(false);
    
    const [subcategories, setSubcategories] = useState([]);
    const [newSubcategoryName, setNewSubcategoryName] = useState('');

    useEffect(() => {
        const loadSubs = async () => {
            const data = await fetchSubcategories(card.id);
            setSubcategories(data || []);
        };
        loadSubs();
    }, [card.id, fetchSubcategories]);

    const handleSaveSettings = async () => {
        setIsSaving(true);
        await updateCard(card.id, {
            name: editName,
            icon: editIcon,
            budget_amount: editBudget ? parseFloat(editBudget) : null
        });
        setIsSaving(false);
        onClose();
    };

    const handleDeleteCard = async () => {
        if (window.confirm(`Delete "${card.name}" and all its transactions?`)) {
            await deleteCard(card.id);
            onClose();
        }
    };

    const handleAddSubcategory = async () => {
        if (!newSubcategoryName.trim()) return;
        const newSub = await addSubcategory(card.id, newSubcategoryName);
        if (newSub) {
            setSubcategories([...subcategories, newSub]);
            setNewSubcategoryName('');
        }
    };

    const handleDeleteSubcategory = async (subId) => {
        const success = await deleteSubcategory(subId);
        if (success) {
            setSubcategories(subcategories.filter(s => s.id !== subId));
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Edit Category">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '75vh', overflowY: 'auto', paddingRight: '4px' }}>
                {/* Name */}
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.5px' }}>
                        CATEGORY NAME
                    </label>
                    <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid var(--surface-input-border)',
                            borderRadius: '8px',
                            fontSize: '15px',
                            background: 'var(--surface-input)',
                            color: 'var(--text-primary)',
                        }}
                    />
                </div>

                {/* Icon */}
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.5px' }}>
                        ICON
                    </label>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: '8px',
                        padding: '12px',
                        background: 'var(--glass-card-bg)',
                        border: '1px solid var(--glass-card-border)',
                        borderRadius: '8px',
                        maxHeight: '160px',
                        overflowY: 'auto',
                    }}>
                        {EMOJI_LIST.map(emoji => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => setEditIcon(emoji)}
                                style={{
                                    border: 'none',
                                    background: editIcon === emoji ? card.color : 'transparent',
                                    borderRadius: '8px',
                                    fontSize: '20px',
                                    padding: '8px',
                                    cursor: 'pointer',
                                    transform: editIcon === emoji ? 'scale(1.1)' : 'scale(1)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Budget */}
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.5px' }}>
                        MONTHLY BUDGET
                    </label>
                    <CurrencyInput
                        value={editBudget}
                        onChange={(val) => setEditBudget(val)}
                        placeholder="No budget set"
                        inputStyle={{
                            fontSize: '16px',
                            border: '1px solid var(--glass-card-border)',
                            borderRadius: '8px',
                        }}
                    />
                </div>

                {/* Subcategories */}
                <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', letterSpacing: '0.5px' }}>
                        SUBCATEGORIES
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {subcategories.map(sub => (
                            <div key={sub.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 12px',
                                background: 'var(--glass-card-bg)',
                                border: '1px solid var(--glass-card-border)',
                                borderRadius: '8px',
                            }}>
                                <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{sub.name}</span>
                                <button
                                    onClick={() => handleDeleteSubcategory(sub.id)}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: 'var(--danger)',
                                        cursor: 'pointer',
                                        padding: '4px',
                                    }}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                value={newSubcategoryName}
                                onChange={(e) => setNewSubcategoryName(e.target.value)}
                                placeholder="Add subcategory..."
                                style={{
                                    flex: 1,
                                    padding: '10px 12px',
                                    border: '1px dashed var(--glass-card-border)',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    background: 'var(--surface-input)',
                                    color: 'var(--text-primary)',
                                    outline: 'none'
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddSubcategory();
                                    }
                                }}
                            />
                            <button
                                onClick={handleAddSubcategory}
                                disabled={!newSubcategoryName.trim()}
                                style={{
                                    padding: '10px 16px',
                                    background: newSubcategoryName.trim() ? card.color : 'var(--border-subtle)',
                                    color: newSubcategoryName.trim() ? '#fff' : 'var(--text-muted)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: newSubcategoryName.trim() ? 'pointer' : 'not-allowed',
                                    fontWeight: '600',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                    <button
                        onClick={handleDeleteCard}
                        style={{
                            flex: 1,
                            padding: '14px',
                            background: 'var(--danger-bg)',
                            color: 'var(--danger)',
                            border: '1px solid var(--danger)',
                            borderRadius: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                        }}
                    >
                        Delete Category
                    </button>
                    <button
                        onClick={handleSaveSettings}
                        disabled={isSaving}
                        style={{
                            flex: 2,
                            padding: '14px',
                            background: card.color,
                            color: '#fff',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default CategorySettingsModal;
