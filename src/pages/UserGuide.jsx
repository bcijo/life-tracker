import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ArrowLeft, Search, BookOpen, Sparkles, Activity, Wallet, 
    CheckSquare, Users, Smartphone, Compass, Shield, Lightbulb, 
    ChevronDown, ChevronUp, Tag, Target, ShoppingCart, RefreshCw,
    Flame, Calendar, Layers, Split, MessageSquare, Zap
} from 'lucide-react';

const GUIDE_SECTIONS = [
    {
        id: 'overview',
        title: 'Home & Daily Dashboard',
        category: 'Core',
        icon: Compass,
        color: '#6366f1',
        badge: 'Getting Started',
        summary: 'Your command center for daily habit check-ins, active tasks, financial summaries, and life progress.',
        topics: [
            {
                title: "Daily Overview & Today's Focus",
                content: "The Home dashboard aggregates everything you need for the day in one screen. At the top, you'll find your active habit streak snapshot, upcoming todos, and quick summary metrics so you never lose momentum."
            },
            {
                title: "Quick Action Controls",
                content: "Quickly check off habits directly from the home feed by tapping the interactive circular rings. You can also launch instant expense logging and task additions using floating action triggers."
            },
            {
                title: "Progress & Life Score",
                content: "As you complete daily habits and clear todos, your daily progress ring fills up in real time, giving you visual feedback on your consistency."
            }
        ]
    },
    {
        id: 'habits',
        title: 'Habit Tracking & Streaks',
        category: 'Growth',
        icon: Activity,
        color: '#10b981',
        badge: 'Habits',
        summary: 'Build lifelong routines with intelligent streak tracking, customizable frequencies, heatmap consistency analytics, and reordering.',
        topics: [
            {
                title: "Creating & Customizing Habits",
                content: "Tap '+ New Habit' on the Habits page. Pick a distinct icon, curated color accent, and define your target frequency—whether daily, specific weekdays (e.g. Mon/Wed/Fri), or a target number of times per week."
            },
            {
                title: "Daily Check-Ins & Streak Calculation",
                content: "Tap any habit card to log your daily completion. Streaks calculate automatically based on your active schedule. Missed days outside your scheduled frequency won't break your streak."
            },
            {
                title: "Heatmap Analytics & Detail View",
                content: "Click on any habit card to open its full detail modal. Inspect your 30-day and 365-day consistency heatmaps, lifetime success rate, longest streak, and check-in history."
            },
            {
                title: "Reordering Habits",
                content: "Use the 'Reorder' button in the habits toolbar to rearrange the order of your habits so your most important morning routines stay right at the top."
            }
        ]
    },
    {
        id: 'finances',
        title: 'Finances & Wealth Tracking',
        category: 'Wealth',
        icon: Wallet,
        color: '#a855f7',
        badge: 'Finances',
        summary: 'Complete expense management with customizable visual cards, runway calculations, budget progress, recurring bills, and shopping integration.',
        topics: [
            {
                title: "Expense Cards & Subcategories",
                content: "Organize spending using visual Expense Cards (e.g., Food & Dining, Tech, Transit, Housing). Each card acts as an envelope budget. You can add granular subcategories to cards for detailed reporting."
            },
            {
                title: "Logging Expenses & Fast Search",
                content: "Tap the floating '+' button in Finances to log an expense. Select the card, enter the amount, and add notes. Use the top search bar and time filters (Today, Yesterday, Last 7 Days, Custom Month) to filter your timeline instantly."
            },
            {
                title: "Runway & Burn Rate Calculator",
                content: "The Hero Financial Card at the top calculates your average daily burn rate and estimated financial runway. You can toggle 'Ignore Outliers' to exclude one-off large purchases (like security deposits) from your regular runway projection."
            },
            {
                title: "Budgets & Spending Limits",
                content: "In the 'Budgets' tab, assign monthly spending targets to individual categories. Dynamic progress bars change from emerald green to amber and red as you approach or exceed your limits."
            },
            {
                title: "Recurring Subscriptions & Bills",
                content: "Track recurring payments like Netflix, rent, gym memberships, and utility bills. LifeTracker computes your committed monthly overhead and tells you your true discretionary spend."
            },
            {
                title: "Shopping List with 1-Tap Expense Conversion",
                content: "Add items to your Shopping List. When you purchase an item and check it off as bought, LifeTracker prompts you to convert it into a logged expense card with a single tap!"
            },
            {
                title: "Progressive Infinite Scrolling",
                content: "Historical transactions load smoothly in progressive batches of 25 as you scroll down, keeping navigation instantaneous and lag-free."
            }
        ]
    },
    {
        id: 'assistant',
        title: 'AI Life & Finance Assistant',
        category: 'Intelligence',
        icon: Sparkles,
        color: '#f59e0b',
        badge: 'AI Coach',
        summary: 'Conversational intelligent assistant to log expenses via natural language, answer financial questions, and offer habit coaching.',
        topics: [
            {
                title: "Natural Language Expense Logging",
                content: "You don't need to fill out forms! Simply type in the AI chat: 'Spent 350 on lunch at Chipotle' or 'Paid 1200 for electricity bill'. The AI extracts the amount, card, and note, and records it directly into your database."
            },
            {
                title: "Habit & Routine Coaching",
                content: "Ask the AI for advice on breaking bad habits, establishing morning routines, or applying atomic habit strategies to your current streak goals."
            },
            {
                title: "Financial Insights & Queries",
                content: "Ask questions like 'How much have I spent on food this month?' or 'What are my highest expenses this week?' for instant personalized breakdowns."
            }
        ]
    },
    {
        id: 'todos',
        title: 'Todos & Task Management',
        category: 'Productivity',
        icon: CheckSquare,
        color: '#38bdf8',
        badge: 'Productivity',
        summary: 'Streamlined daily checklist with priority tags, filtering, and seamless completion tracking.',
        topics: [
            {
                title: "Adding & Organizing Tasks",
                content: "Create tasks with High, Medium, or Low priority tags. Keep daily to-dos separate from long-term backlog goals."
            },
            {
                title: "Filters & Views",
                content: "Quickly filter between All Tasks, Active Tasks, and Completed History to focus on what needs your attention right now."
            }
        ]
    },
    {
        id: 'friends',
        title: 'Social, Friends & Split Bill',
        category: 'Community',
        icon: Users,
        color: '#ec4899',
        badge: 'Social',
        summary: 'Connect with friends, share habit accountability streaks, and split bills easily without awkward math.',
        topics: [
            {
                title: "Claiming Your @username",
                content: "Open the Profile Menu > Account Details to set your unique public username (e.g. @abhin). Your username is used to generate your personal invite link."
            },
            {
                title: "Private Invite Links",
                content: "To protect your privacy and prevent unsolicited directory searches, friend connections in LifeTracker are strictly invite-only. Share your personal invite link (lifetracker.app/invite/your_username) with friends to connect and compare habit streaks."
            },
            {
                title: "Habit Accountability Feed",
                content: "View your friends' active streaks and celebrate milestones together for mutual motivation."
            },
            {
                title: "Interactive Bill Splitter",
                content: "Navigate to the Bill Splitter tool to split restaurant bills, rent, or group trip expenses equally or with custom tip and tax additions."
            }
        ]
    },
    {
        id: 'mobile-pwa',
        title: 'iPhone PWA & Liquid Glass Navigation',
        category: 'Experience',
        icon: Smartphone,
        color: '#06b6d4',
        badge: 'Mobile & PWA',
        summary: 'Designed specifically for modern mobile devices with Dynamic Island safe areas and an interactive draggable liquid glass navigation dock.',
        topics: [
            {
                title: "Installing on iPhone (Home Screen PWA)",
                content: "Open LifeTracker in Safari on your iPhone, tap the Share icon (the square with the upward arrow), and select 'Add to Home Screen'. LifeTracker installs as a native, full-screen standalone application with offline support."
            },
            {
                title: "Dynamic Island & Notch Integration",
                content: "The top navigation header automatically respects your iPhone status bar, notch, and Dynamic Island boundaries with fluid glassmorphism."
            },
            {
                title: "Draggable Liquid Navigation Bubble",
                content: "You can swipe or drag the glowing purple liquid bubble at the bottom dock horizontally across tabs! As you drag, adjacent tabs highlight, and releasing the bubble snaps it with Apple spring physics directly to that page."
            }
        ]
    },
    {
        id: 'tips',
        title: 'Pro Tips & Best Practices',
        category: 'Tips',
        icon: Lightbulb,
        color: '#eab308',
        badge: 'Pro Tips',
        summary: 'Shortcuts and power-user tips to get the absolute most out of LifeTracker every day.',
        topics: [
            {
                title: "1. Appearance & Custom Themes",
                content: "Open Profile Menu > Appearance to switch between high-contrast dark modes, Cyberpunk, Emerald Forest, Midnight Velvet, and more."
            },
            {
                title: "2. Privacy Mode (Hide Balances)",
                content: "In Finances, tap the Eye icon next to your balances to mask amounts with dots when using the app in public."
            },
            {
                title: "3. Instant Updates & Offline Cache",
                content: "LifeTracker caches your data locally for instant startup. You can refresh app assets anytime via Profile Menu > 'Check for Updates'."
            }
        ]
    }
];

const CATEGORIES = ['All', 'Core', 'Growth', 'Wealth', 'Intelligence', 'Productivity', 'Community', 'Experience', 'Tips'];

const UserGuide = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [expandedSections, setExpandedSections] = useState({
        overview: true,
        habits: true,
        finances: true,
        assistant: true
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
                            Everything you need to master your habits, finances, AI coach, and routines.
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
                        placeholder="Search guide (e.g. runway, streaks, AI logging, split bill, PWA)..."
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
