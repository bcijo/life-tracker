import React, { useState } from 'react';
import { ArrowRight, Trash2, Check, Plus } from 'lucide-react';
import useShopping from '../hooks/useShopping';
import useLocalStorage from '../hooks/useLocalStorage';

const DEFAULT_SHOPPING_CATEGORIES = [
    { id: 'grocery', name: 'Grocery', color: '#ff6b6b' },
    { id: 'wants', name: 'Wants', color: '#4ecdc4' },
    { id: 'gym', name: 'Gym', color: '#45b7d1' },
    { id: 'other', name: 'Other', color: '#a55eea' },
];

const Shopping = () => {
    const { items, loading, addItem: addItemDb, toggleBought: toggleBoughtDb, deleteItem: deleteItemDb } = useShopping();
    const [categories, setCategories] = useLocalStorage('shopping-categories', DEFAULT_SHOPPING_CATEGORIES);

    const [newItemName, setNewItemName] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('grocery');
    const [showCategoryForm, setShowCategoryForm] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    const addItem = async (e) => {
        e.preventDefault();
        if (!newItemName.trim()) return;

        await addItemDb(newItemName);
        setNewItemName('');
    };

    const addCategory = (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        const newCategory = {
            id: Date.now().toString(),
            name: newCategoryName,
            color: `hsl(${Math.random() * 360}, 70%, 60%)`,
        };

        setCategories([...categories, newCategory]);
        setNewCategoryName('');
        setShowCategoryForm(false);
    };

    const toggleItem = async (id) => {
        await toggleBoughtDb(id);
    };

    const deleteItem = async (id) => {
        await deleteItemDb(id);
    };

    const activeItems = items.filter(i => !i.isBought);
    const boughtItems = items.filter(i => i.isBought);

    return (
        <div className="page-container">
            <header style={{ marginBottom: '24px' }}>
                <h1>Shopping List</h1>
                <p style={{ opacity: 0.7 }}>{activeItems.length} items to buy</p>
            </header>

            <form onSubmit={addItem} style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Add item (e.g., Milk)"
                        className="glass-panel"
                        style={{
                            flex: 1,
                            padding: '16px',
                            border: 'none',
                            outline: 'none',
                            fontSize: '16px',
                            color: 'var(--text-primary)',
                            borderRadius: 'var(--radius-lg)',
                        }}
                    />
                    <button
                        type="submit"
                        style={{
                            background: 'var(--text-primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--radius-lg)',
                            width: '56px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <ArrowRight size={24} />
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedCategory(cat.id)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: 'none',
                                background: selectedCategory === cat.id ? cat.color : 'rgba(255,255,255,0.5)',
                                color: selectedCategory === cat.id ? '#fff' : 'var(--text-primary)',
                                fontSize: '14px',
                                fontWeight: '500',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {cat.name}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={() => setShowCategoryForm(!showCategoryForm)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '20px',
                            border: '1px dashed var(--text-secondary)',
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}
                    >
                        <Plus size={14} /> New
                    </button>
                </div>
            </form>

            {showCategoryForm && (
                <form onSubmit={addCategory} className="glass-panel" style={{ padding: '16px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="New Category Name"
                            style={{
                                flex: 1,
                                padding: '12px',
                                border: '1px solid var(--glass-border)',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(255,255,255,0.5)',
                            }}
                            autoFocus
                        />
                        <button
                            type="submit"
                            style={{
                                padding: '12px 24px',
                                background: 'var(--text-primary)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                fontWeight: '600',
                            }}
                        >
                            Add
                        </button>
                    </div>
                </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activeItems.map(item => {
                    const category = categories.find(c => c.id === item.category);
                    return (
                        <div
                            key={item.id}
                            className="glass-card"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '16px',
                                gap: '12px',
                            }}
                        >
                            <button
                                onClick={() => toggleItem(item.id)}
                                style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '6px',
                                    border: '2px solid var(--text-secondary)',
                                    background: 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 0,
                                    flexShrink: 0,
                                }}
                            >
                            </button>
                            <div style={{ flex: 1 }}>
                                <span style={{ fontSize: '16px', display: 'block' }}>{item.name}</span>
                                {category && (
                                    <span style={{ fontSize: '12px', color: category.color, fontWeight: '500' }}>
                                        {category.name}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => deleteItem(item.id)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    opacity: 0.5,
                                    padding: '4px',
                                }}
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    );
                })}

                {boughtItems.length > 0 && (
                    <>
                        <h3 style={{ marginTop: '24px', opacity: 0.6, fontSize: '14px' }}>Bought</h3>
                        {boughtItems.map(item => {
                            const category = categories.find(c => c.id === item.category);
                            return (
                                <div
                                    key={item.id}
                                    className="glass-card"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '16px',
                                        gap: '12px',
                                        opacity: 0.5,
                                        background: 'rgba(0,0,0,0.02)',
                                    }}
                                >
                                    <button
                                        onClick={() => toggleItem(item.id)}
                                        style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '6px',
                                            border: 'none',
                                            background: 'var(--accent-color)',
                                            color: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: 0,
                                            flexShrink: 0,
                                        }}
                                    >
                                        <Check size={16} />
                                    </button>
                                    <div style={{ flex: 1 }}>
                                        <span style={{ fontSize: '16px', textDecoration: 'line-through', display: 'block' }}>{item.name}</span>
                                        {category && (
                                            <span style={{ fontSize: '12px', color: category.color, fontWeight: '500' }}>
                                                {category.name}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => deleteItem(item.id)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--text-secondary)',
                                            opacity: 0.5,
                                            padding: '4px',
                                        }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>
        </div>
    );
};

export default Shopping;
