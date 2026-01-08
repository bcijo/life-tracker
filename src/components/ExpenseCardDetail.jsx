import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar, FileText, Settings } from 'lucide-react';
import useTransactions from '../hooks/useTransactions';
import useExpenseCards from '../hooks/useExpenseCards';
import CurrencyInput from './CurrencyInput';

const EMOJI_LIST = ['🍽️', '🚗', '🛒', '💡', '🎬', '🏥', '📦', '🏠', '✈️', '🎮', '🎓', '🎁', '🔧', '💅', '🏋️', '📚', '🍕', '🍻', '👶', '🐾'];

// Format number with Indian numbering system (1,00,000 format)
const formatIndianNumber = (num) => {
    if (!num && num !== 0) return '';
    const numStr = num.toString();
    const parts = numStr.split('.');
    let intPart = parts[0];
    const decPart = parts[1];

    if (intPart.length > 3) {
        let lastThree = intPart.slice(-3);
        let remaining = intPart.slice(0, -3);
        remaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
        intPart = remaining + ',' + lastThree;
    }

    return decPart !== undefined ? intPart + '.' + decPart : intPart;
};

const ExpenseCardDetail = ({ card, onClose }) => {
    const { addTransaction, deleteTransaction, transactions } = useTransactions();
    const { fetchSubcategories, addSubcategory, deleteSubcategory, updateCard, deleteCard } = useExpenseCards();

    const [subcategories, setSubcategories] = useState([]);
    const [activeTab, setActiveTab] = useState('add'); // 'add', 'history', or 'settings'

    // Add Transaction State
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [selectedSubcategory, setSelectedSubcategory] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Manage Subcategories State
    const [newSubcategoryName, setNewSubcategoryName] = useState('');
    const [showSubcategoryInput, setShowSubcategoryInput] = useState(false);

    // Settings State
    const [editName, setEditName] = useState(card.name);
    const [editIcon, setEditIcon] = useState(card.icon);
    const [editBudget, setEditBudget] = useState(card.budget_amount || '');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadSubcategories();
    }, [card.id]);

    const loadSubcategories = async () => {
        const data = await fetchSubcategories(card.id);
        setSubcategories(data || []);
    };

    const handleAddTransaction = async (e) => {
        e.preventDefault();
        if (!amount) return;

        await addTransaction({
            amount,
            description,
            type: 'expense',
            category: card.id,
            card_id: card.id,
            subcategory_id: selectedSubcategory || null,
            date: new Date(date).toISOString(),
        });

        setAmount('');
        setDescription('');
        setActiveTab('history');
    };

    const handleAddSubcategory = async () => {
        if (!newSubcategoryName.trim()) return;
        const newSub = await addSubcategory(card.id, newSubcategoryName);
        if (newSub) {
            setSubcategories([...subcategories, newSub]);
            setNewSubcategoryName('');
            setShowSubcategoryInput(false);
            setSelectedSubcategory(newSub.id);
        }
    };

    const handleDeleteSubcategory = async (subId, e) => {
        e.stopPropagation();
        const success = await deleteSubcategory(subId);
        if (success) {
            setSubcategories(subcategories.filter(s => s.id !== subId));
            if (selectedSubcategory === subId) setSelectedSubcategory('');
        }
    };

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

    const cardTransactions = transactions.filter(t =>
        t.card_id === card.id || t.category === card.id || (card.category_ids && card.category_ids.includes(t.category))
    ).sort((a, b) => new Date(b.date) - new Date(a.date));

    const tabStyle = (tab) => ({
        flex: 1,
        padding: '14px 8px',
        background: activeTab === tab ? '#fff' : '#f9f9f9',
        border: 'none',
        borderBottom: activeTab === tab ? `3px solid ${card.color}` : '3px solid transparent',
        fontWeight: '600',
        color: activeTab === tab ? card.color : '#666',
        cursor: 'pointer',
        fontSize: '13px'
    });

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
            backdropFilter: 'blur(4px)'
        }}>
            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '500px',
                height: '80vh',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                background: '#fff',
                padding: 0,
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px',
                    background: card.color,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '28px' }}>{activeTab === 'settings' ? editIcon : card.icon}</span>
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
                                {activeTab === 'settings' ? editName : card.name}
                            </h2>
                            <p style={{ fontSize: '13px', opacity: 0.9, margin: 0 }}>
                                ₹{cardTransactions.reduce((acc, t) => acc + parseFloat(t.amount), 0).toFixed(0)} spent this month
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(0,0,0,0.2)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #eee', flexShrink: 0 }}>
                    <button onClick={() => setActiveTab('add')} style={tabStyle('add')}>+ Add</button>
                    <button onClick={() => setActiveTab('history')} style={tabStyle('history')}>History</button>
                    <button onClick={() => setActiveTab('settings')} style={tabStyle('settings')}>
                        <Settings size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        Settings
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    {activeTab === 'add' && (
                        <form onSubmit={handleAddTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Amount Input */}
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={amount ? formatIndianNumber(amount) : ''}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/,/g, '');
                                        if (/^\d*\.?\d*$/.test(val)) setAmount(val);
                                    }}
                                    placeholder="0"
                                    style={{
                                        width: '100%',
                                        padding: '16px 16px 16px 40px',
                                        fontSize: '32px',
                                        fontWeight: '700',
                                        border: 'none',
                                        borderBottom: '2px solid #eee',
                                        outline: 'none',
                                        color: '#333'
                                    }}
                                    autoFocus
                                />
                                <span style={{
                                    position: 'absolute',
                                    left: '16px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    fontSize: '24px',
                                    fontWeight: '600',
                                    color: '#666',
                                    pointerEvents: 'none'
                                }}>₹</span>
                            </div>

                            {/* Subcategory Selection */}
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>
                                    SUBCATEGORY
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {subcategories.map(sub => (
                                        <div
                                            key={sub.id}
                                            onClick={() => setSelectedSubcategory(sub.id)}
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: '20px',
                                                border: selectedSubcategory === sub.id ? `2px solid ${card.color}` : '1px solid #ddd',
                                                background: selectedSubcategory === sub.id ? `${card.color}15` : '#fff',
                                                color: selectedSubcategory === sub.id ? card.color : '#666',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                                fontWeight: '500',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            {sub.name}
                                            <span
                                                onClick={(e) => handleDeleteSubcategory(sub.id, e)}
                                                style={{ opacity: 0.5, fontSize: '14px', cursor: 'pointer' }}
                                            >×</span>
                                        </div>
                                    ))}

                                    {showSubcategoryInput ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <input
                                                type="text"
                                                value={newSubcategoryName}
                                                onChange={(e) => setNewSubcategoryName(e.target.value)}
                                                placeholder="New..."
                                                style={{
                                                    padding: '8px',
                                                    borderRadius: '20px',
                                                    border: '1px solid #ddd',
                                                    fontSize: '13px',
                                                    width: '100px'
                                                }}
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleAddSubcategory();
                                                    }
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddSubcategory}
                                                style={{
                                                    background: card.color,
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    width: '24px',
                                                    height: '24px',
                                                    cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setShowSubcategoryInput(true)}
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: '20px',
                                                border: '1px dashed #bbb',
                                                background: 'transparent',
                                                color: '#666',
                                                cursor: 'pointer',
                                                fontSize: '13px',
                                                display: 'flex', alignItems: 'center', gap: '4px'
                                            }}
                                        >
                                            <Plus size={14} /> Add New
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Details */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>
                                        DATE
                                    </label>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '12px',
                                        background: '#f5f5f5',
                                        borderRadius: '8px',
                                        border: '1px solid #eee'
                                    }}>
                                        <Calendar size={16} color="#666" />
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            style={{ border: 'none', background: 'transparent', width: '100%', fontSize: '14px' }}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>
                                        DESCRIPTION
                                    </label>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '12px',
                                        background: '#f5f5f5',
                                        borderRadius: '8px',
                                        border: '1px solid #eee'
                                    }}>
                                        <FileText size={16} color="#666" />
                                        <input
                                            type="text"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Optional"
                                            style={{ border: 'none', background: 'transparent', width: '100%', fontSize: '14px' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                style={{
                                    marginTop: '20px',
                                    width: '100%',
                                    padding: '16px',
                                    background: card.color,
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '16px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                }}
                            >
                                Save Expense
                            </button>
                        </form>
                    )}

                    {activeTab === 'history' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {cardTransactions.length === 0 ? (
                                <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '40px' }}>
                                    <p>No transactions yet</p>
                                </div>
                            ) : (
                                cardTransactions.map(t => {
                                    const sub = subcategories.find(s => s.id === t.subcategory_id);
                                    return (
                                        <div
                                            key={t.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '12px',
                                                borderBottom: '1px solid #f0f0f0'
                                            }}
                                        >
                                            <div>
                                                <p style={{ fontWeight: '600', fontSize: '15px', color: '#333', margin: '0 0 4px 0' }}>
                                                    {t.description || (sub ? sub.name : 'Expense')}
                                                </p>
                                                <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
                                                    {new Date(t.date).toLocaleDateString()}
                                                    {sub && <span style={{
                                                        marginLeft: '8px',
                                                        background: '#f0f0f0',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px'
                                                    }}>{sub.name}</span>}
                                                </p>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ fontWeight: '700', fontSize: '16px' }}>
                                                    ₹{parseFloat(t.amount).toFixed(0)}
                                                </span>
                                                <button
                                                    onClick={() => deleteTransaction(t.id)}
                                                    style={{ border: 'none', background: 'transparent', color: '#ff6b6b', cursor: 'pointer', opacity: 0.6 }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Name */}
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>
                                    CATEGORY NAME
                                </label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        border: '1px solid #ddd',
                                        borderRadius: '8px',
                                        fontSize: '16px'
                                    }}
                                />
                            </div>

                            {/* Icon */}
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>
                                    ICON
                                </label>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(5, 1fr)',
                                    gap: '8px',
                                    padding: '12px',
                                    background: '#f9f9f9',
                                    borderRadius: '8px',
                                    maxHeight: '120px',
                                    overflowY: 'auto'
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
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>
                                    MONTHLY BUDGET
                                </label>
                                <CurrencyInput
                                    value={editBudget}
                                    onChange={(val) => setEditBudget(val)}
                                    placeholder="No budget set"
                                    inputStyle={{
                                        fontSize: '16px',
                                        border: '1px solid #ddd',
                                        borderRadius: '8px',
                                    }}
                                />
                            </div>

                            {/* Subcategories */}
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>
                                    SUBCATEGORIES
                                </label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {subcategories.map(sub => (
                                        <div key={sub.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '10px 12px',
                                            background: '#f9f9f9',
                                            borderRadius: '8px'
                                        }}>
                                            <span style={{ fontSize: '14px' }}>{sub.name}</span>
                                            <button
                                                onClick={(e) => handleDeleteSubcategory(sub.id, e)}
                                                style={{
                                                    border: 'none',
                                                    background: 'transparent',
                                                    color: '#ff6b6b',
                                                    cursor: 'pointer',
                                                    padding: '4px'
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
                                                border: '1px dashed #ccc',
                                                borderRadius: '8px',
                                                fontSize: '14px'
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
                                                background: newSubcategoryName.trim() ? card.color : '#ccc',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: newSubcategoryName.trim() ? 'pointer' : 'not-allowed',
                                                fontWeight: '600'
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
                                        background: '#fff',
                                        color: '#ff6b6b',
                                        border: '1px solid #ff6b6b',
                                        borderRadius: '12px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
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
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExpenseCardDetail;
