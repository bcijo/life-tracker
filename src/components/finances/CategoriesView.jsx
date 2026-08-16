import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, Tag, Settings, Trash2, Edit3, Sparkles, 
    ChevronRight, Layers, FolderPlus, DollarSign 
} from 'lucide-react';
import useExpenseCards from '../../hooks/useExpenseCards';
import useTransactions from '../../hooks/useTransactions';
import ExpenseCardDetail from '../ExpenseCardDetail';
import CategorySettingsModal from '../CategorySettingsModal';
import Modal from '../Modal';
import CurrencyInput from '../CurrencyInput';
import { CategoryIcon, CATEGORY_ICON_LIST } from '../../utils/categoryIcons';

const PRESET_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
    '#A855F7', '#EC4899', '#F59E0B', '#10B981', '#3B82F6',
    '#6366F1', '#8B5CF6'
];

const CategoriesView = () => {
    const { cards, addCard, deleteCard, getBudgetProgress, fetchAllSubcategories } = useExpenseCards();
    const { transactions } = useTransactions();

    const [selectedCard, setSelectedCard] = useState(null);
    const [editingCategory, setEditingCategory] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [allSubcategories, setAllSubcategories] = useState([]);

    const loadSubcategories = async () => {
        if (fetchAllSubcategories) {
            const data = await fetchAllSubcategories();
            setAllSubcategories(data || []);
        }
    };

    useEffect(() => {
        loadSubcategories();
    }, [cards]);

    // New Category Form State
    const [newCategory, setNewCategory] = useState({
        name: '',
        icon: 'utensils',
        color: '#FF6B6B',
        budget: ''
    });

    const handleCreateCategory = async (e) => {
        if (e) e.preventDefault();
        if (!newCategory.name.trim()) return;

        await addCard(
            newCategory.name.trim(),
            newCategory.color,
            [newCategory.name.toLowerCase().trim()],
            newCategory.icon,
            newCategory.budget ? parseFloat(newCategory.budget) : null
        );

        setNewCategory({ name: '', icon: 'utensils', color: '#FF6B6B', budget: '' });
        setShowAddModal(false);
    };

    return (
        <div className="finances-subview" style={{ animation: 'fadeIn 0.3s ease' }}>
            {/* Header / Action Bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                        Categories & Subcategories
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
                        Organize your spending into custom groups & tags
                    </p>
                </div>

                <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setShowAddModal(true)}
                    className="btn-primary"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '9px 16px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '700',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)',
                    }}
                >
                    <Plus size={16} strokeWidth={2.5} />
                    <span>Add Category</span>
                </motion.button>
            </div>

            {/* Categories Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
            }}>
                {cards.map((card) => {
                    const progress = getBudgetProgress(card, transactions);
                    const spentFormatted = Math.round(progress.spent).toLocaleString('en-IN');
                    const budgetFormatted = progress.budget > 0 ? Math.round(progress.budget).toLocaleString('en-IN') : null;
                    const cardColor = card.color || '#4ECDC4';

                    const subCount = allSubcategories.filter(s => s.card_id === card.id).length;
                    const subText = subCount === 0 ? 'No subcategories' : subCount === 1 ? '1 subcategory' : `${subCount} subcategories`;

                    return (
                        <motion.div
                            key={card.id}
                            whileHover={{ y: -3, boxShadow: '0 12px 30px rgba(0,0,0,0.15)' }}
                            transition={{ duration: 0.2 }}
                            className="glass-card"
                            onClick={() => setSelectedCard(card)}
                            style={{
                                padding: '18px',
                                borderRadius: '18px',
                                background: 'var(--surface-elevated, #131b2e)',
                                border: '1px solid var(--glass-card-border, rgba(255,255,255,0.08))',
                                borderTop: `4px solid ${cardColor}`,
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                position: 'relative',
                            }}
                        >
                            {/* Card Top: Icon & Name */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    background: `color-mix(in srgb, ${cardColor} 20%, transparent)`,
                                    border: `1px solid color-mix(in srgb, ${cardColor} 35%, transparent)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: `0 2px 10px color-mix(in srgb, ${cardColor} 20%, transparent)`
                                }}>
                                    <CategoryIcon icon={card.icon} name={card.name} color={cardColor} size={20} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                                        {card.name}
                                    </h3>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        {subText}
                                    </span>
                                </div>
                            </div>

                            {/* Monthly Spend & Budget Progress */}
                            <div style={{
                                background: 'var(--surface-input, rgba(255,255,255,0.03))',
                                padding: '10px 12px',
                                borderRadius: '12px',
                                border: '1px solid var(--border-subtle, rgba(255,255,255,0.05))',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                        This Month
                                    </span>
                                    <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                        ₹{spentFormatted} {budgetFormatted && <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-muted)' }}>/ ₹{budgetFormatted}</span>}
                                    </span>
                                </div>

                                {progress.budget > 0 && (
                                    <div style={{
                                        height: '4px',
                                        borderRadius: '9999px',
                                        background: 'rgba(255,255,255,0.08)',
                                        overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${Math.min(100, progress.percentage)}%`,
                                            background: progress.isOverBudget ? '#ef4444' : cardColor,
                                            borderRadius: '9999px',
                                            transition: 'width 0.3s ease',
                                        }} />
                                    </div>
                                )}
                            </div>

                            {/* Card Footer: Subcategories hint & Manage Arrow */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '4px' }}>
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    color: cardColor,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                }}>
                                    <Layers size={13} /> Manage Subcategories
                                </span>
                                <ChevronRight size={15} color="var(--text-muted)" />
                            </div>
                        </motion.div>
                    );
                })}

                {cards.length === 0 && (
                    <div style={{
                        gridColumn: '1 / -1',
                        padding: '40px 20px',
                        textAlign: 'center',
                        background: 'var(--surface-input)',
                        borderRadius: '20px',
                        border: '1px dashed var(--border-subtle)',
                        color: 'var(--text-muted)',
                    }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏷️</div>
                        <h3 style={{ margin: '0 0 4px', color: 'var(--text-primary)', fontSize: '16px' }}>No categories yet</h3>
                        <p style={{ margin: '0 0 16px', fontSize: '13px' }}>Create custom categories to organize your expenses.</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="btn-primary"
                            style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '12px', fontWeight: '700' }}
                        >
                            + Add Category
                        </button>
                    </div>
                )}
            </div>

            {/* Category Detail & Subcategories Drawer/Modal */}
            {selectedCard && (
                <ExpenseCardDetail
                    card={selectedCard}
                    onClose={() => {
                        setSelectedCard(null);
                        loadSubcategories();
                    }}
                    onEdit={() => {
                        const target = selectedCard;
                        setSelectedCard(null);
                        setEditingCategory(target);
                    }}
                />
            )}

            {/* Category Settings / Edit Modal */}
            {editingCategory && (
                <CategorySettingsModal
                    card={editingCategory}
                    onClose={() => {
                        setEditingCategory(null);
                        loadSubcategories();
                    }}
                />
            )}

            {/* Create New Category Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title=""
            >
                <style>{`
                    .qac-name-input,
                    .qac-name-input:focus,
                    .qac-name-input:focus-visible,
                    .qac-name-input:active {
                        outline: none !important;
                        border: none !important;
                        border-color: transparent !important;
                        box-shadow: none !important;
                        background: transparent !important;
                    }
                    .qac-name-input::placeholder {
                        color: rgba(255,255,255,0.2);
                    }
                    .qac-icon-grid::-webkit-scrollbar {
                        width: 4px;
                    }
                    .qac-icon-grid::-webkit-scrollbar-thumb {
                        background: rgba(255,255,255,0.1);
                        border-radius: 4px;
                    }
                `}</style>

                <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Hero Preview & Name */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        padding: '4px 0 10px',
                    }}>
                        {/* Live Category Avatar Preview */}
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '18px',
                            background: `color-mix(in srgb, ${newCategory.color} 25%, transparent)`,
                            border: `2px solid ${newCategory.color}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: `0 4px 20px color-mix(in srgb, ${newCategory.color} 35%, transparent)`,
                            marginBottom: '12px',
                            transition: 'all 0.25s ease',
                        }}>
                            <CategoryIcon
                                icon={newCategory.icon}
                                name={newCategory.name}
                                color={newCategory.color}
                                size={28}
                            />
                        </div>

                        {/* Name Input */}
                        <div style={{ width: '100%', textAlign: 'center' }}>
                            <input
                                className="qac-name-input"
                                type="text"
                                placeholder="Category Name..."
                                value={newCategory.name}
                                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                                autoFocus
                                style={{
                                    fontSize: '22px',
                                    fontWeight: '800',
                                    color: 'var(--text-primary)',
                                    textAlign: 'center',
                                    width: '100%',
                                    fontFamily: 'inherit',
                                    caretColor: newCategory.color,
                                    padding: '4px 0',
                                }}
                            />
                            {/* Glow underline */}
                            <div style={{
                                width: newCategory.name.trim() ? '100px' : '40px',
                                height: '3px',
                                borderRadius: '2px',
                                background: newCategory.name.trim()
                                    ? `linear-gradient(90deg, transparent, ${newCategory.color}, transparent)`
                                    : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
                                transition: 'all 0.35s ease',
                                margin: '4px auto 0',
                            }} />
                        </div>
                    </div>

                    {/* Theme Color Picker */}
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
                        }}>Accent Color</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                            {PRESET_COLORS.map((c) => {
                                const isSel = newCategory.color === c;
                                return (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setNewCategory({ ...newCategory, color: c })}
                                        style={{
                                            width: isSel ? '30px' : '26px',
                                            height: isSel ? '30px' : '26px',
                                            borderRadius: '50%',
                                            background: c,
                                            border: isSel ? '2.5px solid #ffffff' : 'none',
                                            boxShadow: isSel ? `0 0 14px ${c}99` : 'none',
                                            cursor: 'pointer',
                                            transition: 'all 0.18s ease',
                                            transform: isSel ? 'scale(1.1)' : 'scale(1)',
                                        }}
                                    />
                                );
                            })}
                        </div>
                    </div>

                    {/* Category Icon Grid */}
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
                        }}>Icon</span>
                        <div className="qac-icon-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: '6px',
                            background: 'rgba(255,255,255,0.025)',
                            padding: '10px',
                            borderRadius: '14px',
                            border: '1px solid rgba(255,255,255,0.06)',
                            maxHeight: '140px',
                            overflowY: 'auto'
                        }}>
                            {CATEGORY_ICON_LIST.map((item) => {
                                const IconComponent = item.icon;
                                const isSelected = newCategory.icon === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        title={item.label}
                                        onClick={() => setNewCategory({ ...newCategory, icon: item.id })}
                                        style={{
                                            background: isSelected ? `color-mix(in srgb, ${newCategory.color} 22%, transparent)` : 'transparent',
                                            border: isSelected ? `1.5px solid ${newCategory.color}` : '1px solid transparent',
                                            borderRadius: '10px',
                                            padding: '8px 0',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: isSelected ? newCategory.color : 'var(--text-muted)',
                                            transition: 'all 0.15s ease',
                                            transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                                        }}
                                    >
                                        <IconComponent size={18} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Optional Budget Limit */}
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
                        }}>Monthly Budget Target (Optional)</span>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 14px',
                            borderRadius: '14px',
                            border: `1px solid ${newCategory.budget ? `color-mix(in srgb, ${newCategory.color} 40%, transparent)` : 'rgba(255,255,255,0.07)'}`,
                            background: 'rgba(255,255,255,0.03)',
                            transition: 'border-color 0.25s ease',
                        }}>
                            <span style={{ fontSize: '15px', fontWeight: '700', color: newCategory.budget ? newCategory.color : 'var(--text-muted)' }}>₹</span>
                            <input
                                type="number"
                                placeholder="e.g. 5,000"
                                value={newCategory.budget}
                                onChange={(e) => setNewCategory({ ...newCategory, budget: e.target.value })}
                                style={{
                                    flex: 1,
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: 'var(--text-primary)',
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    fontFamily: 'inherit',
                                }}
                            />
                        </div>
                    </div>

                    {/* Action Area (Dark Luxe Vibe) */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                        paddingTop: '4px',
                    }}>
                        <button
                            type="submit"
                            disabled={!newCategory.name.trim()}
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '16px',
                                border: newCategory.name.trim()
                                    ? `1.5px solid color-mix(in srgb, ${newCategory.color} 70%, rgba(255,255,255,0.2))`
                                    : '1px solid rgba(255,255,255,0.06)',
                                fontWeight: '700',
                                fontSize: '14px',
                                fontFamily: 'inherit',
                                letterSpacing: '0.2px',
                                cursor: newCategory.name.trim() ? 'pointer' : 'not-allowed',
                                opacity: newCategory.name.trim() ? 1 : 0.35,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                color: '#ffffff',
                                background: newCategory.name.trim()
                                    ? `linear-gradient(135deg, color-mix(in srgb, ${newCategory.color} 85%, #1e1b4b), color-mix(in srgb, ${newCategory.color} 55%, #0f172a))`
                                    : 'rgba(255,255,255,0.03)',
                                boxShadow: newCategory.name.trim()
                                    ? `0 6px 24px color-mix(in srgb, ${newCategory.color} 30%, transparent), inset 0 1px 1px rgba(255,255,255,0.2)`
                                    : 'none',
                                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                            }}
                        >
                            <span>Create Category</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowAddModal(false)}
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
        </div>
    );
};

export default CategoriesView;
