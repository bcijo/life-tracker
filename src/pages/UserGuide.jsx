import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, Search, BookOpen, Sparkles, Activity, Wallet, 
    CheckSquare, Users, Smartphone, Compass, Shield, Lightbulb, 
    ChevronDown, ChevronUp, Tag, Target, ShoppingCart, RefreshCw,
    Flame, Calendar, Layers, Split, MessageSquare, Zap, Settings2
} from 'lucide-react';
import { GUIDE_SECTIONS as GUIDE_DATA, GUIDE_CATEGORIES } from '../lib/userGuide';

// Guide content lives in lib/userGuide.js, shared with the AI Assistant
const ICONS = { Compass, Activity, Flame, Wallet, CheckSquare, BookOpen, Sparkles, Users, Zap, Split, Settings2 };

const GUIDE_SECTIONS = GUIDE_DATA.map((s) => ({ ...s, icon: ICONS[s.icon] || BookOpen, badge: s.category }));
const CATEGORIES = GUIDE_CATEGORIES;

const UserGuide = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [expandedSections, setExpandedSections] = useState({
        'getting-started': true,
    });

    const toggleSection = (id) => {
        setExpandedSections(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const expandAll = () => {
        const all = {};
        GUIDE_SECTIONS.forEach(s => { all[s.id] = true; });
        setExpandedSections(all);
    };

    const collapseAll = () => {
        setExpandedSections({});
    };

    // Filter sections based on search query and category
    const filteredSections = useMemo(() => {
        return GUIDE_SECTIONS.filter(section => {
            if (selectedCategory !== 'All' && section.category !== selectedCategory) {
                return false;
            }

            if (!searchQuery.trim()) return true;

            const q = searchQuery.toLowerCase();
            const matchTitle = section.title.toLowerCase().includes(q);
            const matchSummary = section.summary.toLowerCase().includes(q);
            const matchTopics = section.topics.some(t => 
                t.title.toLowerCase().includes(q) || t.content.toLowerCase().includes(q)
            );

            return matchTitle || matchSummary || matchTopics;
        });
    }, [searchQuery, selectedCategory]);

    return (
        <div className="page-container" style={{ paddingBottom: '120px' }}>
            
            {/* Header with Back Button */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
                gap: '12px'
            }}>
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        borderRadius: '12px',
                        background: 'var(--surface-input)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        type="button"
                        onClick={expandAll}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '10px',
                            background: 'var(--surface-input)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-secondary)',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Expand All
                    </button>
                    <button
                        type="button"
                        onClick={collapseAll}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '10px',
                            background: 'var(--surface-input)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-secondary)',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Collapse All
                    </button>
                </div>
            </div>

            {/* Hero Title Card */}
            <div className="glass-card" style={{
                padding: '24px 22px',
                borderRadius: '24px',
                marginBottom: '22px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.18)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '14px',
                        background: 'var(--accent-gradient)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        boxShadow: '0 4px 16px rgba(168, 85, 247, 0.4)'
                    }}>
                        <BookOpen size={22} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
                            LifeTracker User Guide
                        </h1>
                        <p style={{ margin: '2px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                            How every part of LifeTracker works: habits, calories, money, tasks, journal, friends and more.
                        </p>
                    </div>
                </div>

                {/* Search Bar */}
                <div style={{
                    position: 'relative',
                    marginTop: '16px'
                }}>
                    <Search size={18} style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                        pointerEvents: 'none'
                    }} />
                    <input
                        type="text"
                        placeholder="Search the guide (e.g. streaks, log a meal, vault PIN)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 14px 12px 42px',
                            borderRadius: '16px',
                            background: 'var(--surface-input)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)',
                            fontSize: '13.5px',
                            outline: 'none',
                            transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                        }}
                    />
                </div>
            </div>

            {/* Category Filter Pills */}
            <div style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '12px',
                marginBottom: '16px',
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch'
            }}>
                {CATEGORIES.map(cat => {
                    const isSelected = selectedCategory === cat;
                    return (
                        <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            style={{
                                padding: '7px 14px',
                                borderRadius: '12px',
                                border: '1px solid',
                                borderColor: isSelected ? 'var(--accent-primary)' : 'var(--glass-border)',
                                background: isSelected ? 'var(--accent-gradient)' : 'var(--surface-input)',
                                color: isSelected ? '#fff' : 'var(--text-secondary)',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.15s ease',
                                boxShadow: isSelected ? '0 4px 12px rgba(168, 85, 247, 0.3)' : 'none'
                            }}
                        >
                            {cat}
                        </button>
                    );
                })}
            </div>

            {/* Guide Sections List */}
            {filteredSections.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {filteredSections.map(section => {
                        const Icon = section.icon;
                        const isExpanded = !!expandedSections[section.id];

                        return (
                            <div
                                key={section.id}
                                className="glass-card"
                                style={{
                                    borderRadius: '20px',
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--surface-elevated, #131b2e)',
                                    overflow: 'hidden',
                                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                                }}
                            >
                                {/* Section Header / Accordion Trigger */}
                                <div
                                    onClick={() => toggleSection(section.id)}
                                    style={{
                                        padding: '16px 18px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        background: isExpanded ? 'rgba(255,255,255,0.03)' : 'transparent',
                                        borderBottom: isExpanded ? '1px solid var(--glass-border)' : 'none',
                                        transition: 'background 0.15s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            width: '42px',
                                            height: '42px',
                                            borderRadius: '12px',
                                            background: `color-mix(in srgb, ${section.color} 18%, transparent)`,
                                            border: `1.2px solid color-mix(in srgb, ${section.color} 35%, transparent)`,
                                            color: section.color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            <Icon size={22} />
                                        </div>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                    {section.title}
                                                </h3>
                                                <span style={{
                                                    fontSize: '10.5px',
                                                    fontWeight: '700',
                                                    color: section.color,
                                                    background: `color-mix(in srgb, ${section.color} 12%, transparent)`,
                                                    padding: '2px 8px',
                                                    borderRadius: '8px',
                                                    border: `1px solid color-mix(in srgb, ${section.color} 24%, transparent)`
                                                }}>
                                                    {section.badge}
                                                </span>
                                            </div>
                                            <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                                {section.summary}
                                            </p>
                                        </div>
                                    </div>

                                    <div style={{
                                        padding: '6px',
                                        borderRadius: '8px',
                                        color: 'var(--text-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginLeft: '12px'
                                    }}>
                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                {/* Expanded Topics */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}
                                        >
                                            {section.topics.map((topic, tIdx) => (
                                                <div
                                                    key={tIdx}
                                                    style={{
                                                        padding: '14px 16px',
                                                        borderRadius: '14px',
                                                        background: 'var(--surface-input)',
                                                        border: '1px solid var(--border-subtle)',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{
                                                            width: '20px',
                                                            height: '20px',
                                                            borderRadius: '6px',
                                                            background: `color-mix(in srgb, ${section.color} 20%, transparent)`,
                                                            color: section.color,
                                                            fontSize: '11px',
                                                            fontWeight: '800',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}>
                                                            {tIdx + 1}
                                                        </div>
                                                        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                            {topic.title}
                                                        </h4>
                                                    </div>
                                                    <p style={{
                                                        margin: 0,
                                                        fontSize: '13px',
                                                        color: 'var(--text-secondary)',
                                                        lineHeight: 1.5,
                                                        paddingLeft: '28px'
                                                    }}>
                                                        {topic.content}
                                                    </p>
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{
                    padding: '48px 20px',
                    textAlign: 'center',
                    background: 'var(--surface-input)',
                    borderRadius: '20px',
                    border: '1px dashed var(--border-subtle)',
                    color: 'var(--text-muted)'
                }}>
                    <BookOpen size={36} style={{ opacity: 0.5, marginBottom: '8px' }} />
                    <h3 style={{ margin: '0 0 4px', color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700' }}>
                        No guide topics found
                    </h3>
                    <p style={{ margin: '0 0 14px', fontSize: '13px' }}>
                        No results matched "{searchQuery}". Try a different keyword or category.
                    </p>
                    <button
                        type="button"
                        onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                        style={{
                            padding: '8px 18px',
                            borderRadius: '10px',
                            background: 'var(--accent-gradient)',
                            border: 'none',
                            color: '#fff',
                            fontSize: '12px',
                            fontWeight: '700',
                            cursor: 'pointer'
                        }}
                    >
                        Reset Filters
                    </button>
                </div>
            )}
        </div>
    );
};

export default UserGuide;
