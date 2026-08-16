import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    LogOut, 
    ChevronUp, 
    ChevronDown, 
    RefreshCw, 
    Check, 
    Palette, 
    User, 
    AtSign, 
    Shield, 
    Eye, 
    EyeOff, 
    Copy, 
    ChevronRight, 
    ArrowLeft, 
    Edit2, 
    Lock,
    Sparkles,
    CheckCircle2,
    MessageSquare,
    BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuth from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';

const ADMIN_EMAIL = 'abhinb2703@gmail.com';

const ProfileMenu = ({ variant = 'default' }) => {
    const isSidebar = variant === 'sidebar';
    const { user, signOut } = useAuth();
    const { profile, updateProfile } = useProfile();
    const { theme, setTheme, THEMES, currentTheme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [currentView, setCurrentView] = useState('main'); // 'main' | 'theme' | 'account' | 'edit-name'
    const menuRef = useRef(null);
    const navigate = useNavigate();

    // State for editing name & security reveals
    const [showFullEmail, setShowFullEmail] = useState(false);
    const [copiedId, setCopiedId] = useState(false);
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileSaved, setProfileSaved] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [updated, setUpdated] = useState(false);

    useEffect(() => {
        if (profile) setFullName(profile.full_name || '');
    }, [profile]);

    // Close menu when clicking outside & reset view
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
                setTimeout(() => setCurrentView('main'), 200);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const handleSaveProfile = async (e) => {
        if (e) e.preventDefault();
        if (!fullName.trim()) return;
        setSavingProfile(true);
        try {
            await updateProfile({ full_name: fullName.trim() });
            setProfileSaved(true);
            setTimeout(() => {
                setProfileSaved(false);
                setCurrentView('account');
            }, 1200);
        } catch (err) {
            console.error('Save profile error:', err);
        } finally {
            setSavingProfile(false);
        }
    };

    const handleCopyUserId = () => {
        if (user?.id) {
            navigator.clipboard.writeText(user.id);
            setCopiedId(true);
            setTimeout(() => setCopiedId(false), 2000);
        }
    };

    const handleUpdate = async () => {
        setUpdating(true);
        try {
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
            }
            if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map(r => r.unregister()));
            }
            setUpdated(true);
            setTimeout(() => {
                window.location.reload();
            }, 800);
        } catch (err) {
            console.error('Update error:', err);
            window.location.reload();
        }
    };

    if (!user) return null;

    const displayName = profile?.display_name || profile?.full_name || user.email?.split('@')[0] || 'User';
    const initial = displayName ? displayName[0].toUpperCase() : 'U';
    const ChevronIcon = isSidebar ? ChevronUp : ChevronDown;

    // Masked email helper (e.g. ab***@gmail.com)
    const maskedEmail = useMemo(() => {
        if (!user.email) return '';
        const [local, domain] = user.email.split('@');
        if (!domain) return user.email;
        if (local.length <= 2) return `${local}***@${domain}`;
        return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
    }, [user.email]);

    return (
        <div style={{ position: 'relative', width: isSidebar ? '100%' : 'auto' }} ref={menuRef}>
            {/* Avatar trigger button */}
            <button
                type="button"
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) setCurrentView('main');
                }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isSidebar ? '10px' : '6px',
                    width: isSidebar ? '100%' : 'auto',
                    padding: isSidebar ? '8px 10px' : '4px',
                    borderRadius: isSidebar ? '14px' : '9999px',
                    background: isOpen && isSidebar ? 'rgba(255,255,255,0.06)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                }}
            >
                {/* Avatar circle */}
                <div style={{
                    width: isSidebar ? '36px' : '34px',
                    height: isSidebar ? '36px' : '34px',
                    borderRadius: '50%',
                    background: 'var(--accent-gradient)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: isSidebar ? '15px' : '14px',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}>
                    {initial}
                </div>

                {/* Sidebar details */}
                {isSidebar && (
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <div style={{
                            fontSize: '13px',
                            fontWeight: '700',
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: 1.2,
                        }}>
                            {displayName}
                        </div>
                        {profile?.username ? (
                            <div style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                fontFamily: 'monospace',
                                fontWeight: '500',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}>
                                @{profile.username}
                            </div>
                        ) : (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                Account
                            </div>
                        )}
                    </div>
                )}

                <ChevronIcon
                    size={14}
                    style={{
                        opacity: 0.6,
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                        transition: 'transform 0.2s ease',
                        color: 'var(--text-primary)',
                        flexShrink: 0,
                        marginLeft: isSidebar ? 'auto' : 0,
                    }}
                />
            </button>

            {/* Dropdown panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: isSidebar ? 8 : -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: isSidebar ? 8 : -8, scale: 0.96 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        style={{
                            position: 'absolute',
                            ...(isSidebar
                                ? { bottom: '100%', left: '0', marginBottom: '10px' }
                                : { top: '100%', right: '0', marginTop: '8px' }
                            ),
                            width: '280px',
                            background: 'var(--surface-elevated)',
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                            borderRadius: '20px',
                            boxShadow: '0 16px 38px rgba(0,0,0,0.24), 0 2px 8px rgba(0,0,0,0.12)',
                            border: '1px solid var(--glass-border)',
                            padding: '12px',
                            zIndex: 1000,
                            overflow: 'hidden'
                        }}
                    >
                        {/* ── 1. MAIN PROFILE VIEW ── */}
                        {currentView === 'main' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                
                                {/* User Hero Card */}
                                <div style={{
                                    padding: '12px',
                                    borderRadius: '14px',
                                    background: 'var(--surface-input)',
                                    border: '1px solid var(--border-subtle)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}>
                                    <div style={{
                                        width: '42px',
                                        height: '42px',
                                        borderRadius: '50%',
                                        background: 'var(--accent-gradient)',
                                        color: '#fff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: '800',
                                        fontSize: '16px',
                                        flexShrink: 0,
                                    }}>
                                        {initial}
                                    </div>
                                    <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            fontSize: '14px',
                                            fontWeight: '700',
                                            color: 'var(--text-primary)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}>
                                            {displayName}
                                        </div>
                                        {profile?.username ? (
                                            <div style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                                fontSize: '11px',
                                                color: 'var(--accent-primary)',
                                                fontWeight: '600',
                                                fontFamily: 'monospace',
                                                marginTop: '1px'
                                            }}>
                                                <span>@{profile.username}</span>
                                                <Lock size={10} style={{ opacity: 0.6 }} />
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                {maskedEmail}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Menu Items List */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                    
                                    {/* Appearance / Theme Submenu Row */}
                                    <button
                                        type="button"
                                        onClick={() => setCurrentView('theme')}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '10px 12px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: 'transparent',
                                            color: 'var(--text-primary)',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            transition: 'background 0.15s ease'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface-input)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '8px',
                                                background: 'rgba(99, 102, 241, 0.12)',
                                                color: '#6366f1',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <Palette size={15} />
                                            </div>
                                            <span>Appearance</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '500' }}>
                                                {currentTheme?.label || 'Theme'}
                                            </span>
                                            <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                                        </div>
                                    </button>

                                    {/* Account & Details Submenu Row */}
                                    <button
                                        type="button"
                                        onClick={() => setCurrentView('account')}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '10px 12px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: 'transparent',
                                            color: 'var(--text-primary)',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            transition: 'background 0.15s ease'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface-input)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '8px',
                                                background: 'rgba(16, 185, 129, 0.12)',
                                                color: '#10b981',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <Shield size={15} />
                                            </div>
                                            <span>Account Details</span>
                                        </div>
                                        <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                                    </button>

                                    {/* App Updates & Cache */}
                                    <button
                                        type="button"
                                        onClick={handleUpdate}
                                        disabled={updating}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '10px 12px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: 'transparent',
                                            color: updated ? 'var(--success)' : 'var(--text-primary)',
                                            cursor: updating ? 'default' : 'pointer',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            transition: 'background 0.15s ease'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface-input)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '8px',
                                                background: updated ? 'var(--success-bg)' : 'rgba(59, 130, 246, 0.12)',
                                                color: updated ? 'var(--success)' : '#3b82f6',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                {updated ? <Check size={15} /> : <RefreshCw size={15} className={updating ? 'spin' : ''} />}
                                            </div>
                                            <span>{updated ? 'Up to date' : updating ? 'Refreshing…' : 'Check for Updates'}</span>
                                        </div>
                                    </button>

                                    {/* User Guide & Handbook */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsOpen(false);
                                            navigate('/guide');
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '10px 12px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: 'transparent',
                                            color: 'var(--text-primary)',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            transition: 'background 0.15s ease'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface-input)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '8px',
                                                background: 'rgba(236, 72, 153, 0.12)',
                                                color: '#ec4899',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <BookOpen size={15} />
                                            </div>
                                            <span>User Guide</span>
                                        </div>
                                        <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                                    </button>

                                    {/* Feedback */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsOpen(false);
                                            navigate('/feedback');
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '10px 12px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: 'transparent',
                                            color: 'var(--text-primary)',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: '600',
                                            transition: 'background 0.15s ease'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'var(--surface-input)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '8px',
                                                background: 'rgba(245, 158, 11, 0.12)',
                                                color: '#f59e0b',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <MessageSquare size={15} />
                                            </div>
                                            <span>{user?.email === ADMIN_EMAIL ? 'View Feedback' : 'Send Feedback'}</span>
                                        </div>
                                        <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                                    </button>
                                </div>

                                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />

                                {/* Sign Out */}
                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '10px 12px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#ef4444',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'background 0.15s ease'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '8px',
                                        background: 'rgba(239, 68, 68, 0.12)',
                                        color: '#ef4444',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <LogOut size={15} />
                                    </div>
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        )}

                        {/* ── 2. THEME SELECTION SUBVIEW ── */}
                        {currentView === 'theme' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '6px', borderBottom: '1px solid var(--border-subtle)' }}>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentView('main')}
                                        style={{
                                            background: 'var(--surface-input)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            width: '26px',
                                            height: '26px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'var(--text-primary)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <ArrowLeft size={14} />
                                    </button>
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                        Appearance & Themes
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {THEMES.map((t) => {
                                        const isActive = theme === t.id;
                                        return (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => setTheme(t.id)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '10px 12px',
                                                    borderRadius: '12px',
                                                    border: isActive ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                                                    background: isActive ? 'var(--surface-input)' : 'transparent',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{
                                                        width: '24px',
                                                        height: '24px',
                                                        borderRadius: '6px',
                                                        background: `linear-gradient(135deg, ${t.preview} 0%, ${t.previewAccent} 100%)`,
                                                        border: '1px solid rgba(255,255,255,0.15)',
                                                        boxShadow: isActive ? '0 0 0 2px var(--accent-primary)' : 'none'
                                                    }} />
                                                    <div style={{ textAlign: 'left' }}>
                                                        <div style={{ fontSize: '13px', fontWeight: isActive ? '700' : '500', color: 'var(--text-primary)' }}>
                                                            {t.label}
                                                        </div>
                                                        {t.id === 'dark' && (
                                                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Default</span>
                                                        )}
                                                    </div>
                                                </div>
                                                {isActive && <CheckCircle2 size={16} style={{ color: 'var(--accent-primary)' }} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── 3. ACCOUNT DETAILS SUBVIEW (Abstracted & Masked) ── */}
                        {currentView === 'account' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--border-subtle)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setCurrentView('main')}
                                            style={{
                                                background: 'var(--surface-input)',
                                                border: 'none',
                                                borderRadius: '8px',
                                                width: '26px',
                                                height: '26px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'var(--text-primary)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <ArrowLeft size={14} />
                                        </button>
                                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                            Account Security
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentView('edit-name')}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--accent-primary)',
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px'
                                        }}
                                    >
                                        <Edit2 size={12} />
                                        <span>Edit</span>
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    
                                    {/* Name Item */}
                                    <div style={{ padding: '8px 10px', background: 'var(--surface-input)', borderRadius: '10px' }}>
                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Name</span>
                                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px' }}>
                                            {displayName}
                                        </div>
                                    </div>

                                    {/* Username (Permanent & Locked) */}
                                    <div style={{ padding: '8px 10px', background: 'var(--surface-input)', borderRadius: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Username</span>
                                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                <Lock size={10} /> Permanent
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent-primary)', fontFamily: 'monospace', marginTop: '2px' }}>
                                            {profile?.username ? `@${profile.username}` : 'Not set'}
                                        </div>
                                    </div>

                                    {/* Email (Masked with reveal toggle) */}
                                    <div style={{ padding: '8px 10px', background: 'var(--surface-input)', borderRadius: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Email</span>
                                            <button
                                                type="button"
                                                onClick={() => setShowFullEmail(!showFullEmail)}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontSize: '11px',
                                                    padding: 0
                                                }}
                                            >
                                                {showFullEmail ? <EyeOff size={12} /> : <Eye size={12} />}
                                                <span>{showFullEmail ? 'Hide' : 'Reveal'}</span>
                                            </button>
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', wordBreak: 'break-all' }}>
                                            {showFullEmail ? user.email : maskedEmail}
                                        </div>
                                    </div>

                                    {/* User ID Copy */}
                                    <div style={{ padding: '8px 10px', background: 'var(--surface-input)', borderRadius: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>User ID</span>
                                            <button
                                                type="button"
                                                onClick={handleCopyUserId}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: copiedId ? 'var(--success)' : 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontSize: '11px',
                                                    padding: 0
                                                }}
                                            >
                                                {copiedId ? <Check size={12} /> : <Copy size={12} />}
                                                <span>{copiedId ? 'Copied' : 'Copy'}</span>
                                            </button>
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {user.id}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── 4. EDIT FULL NAME SUBVIEW ── */}
                        {currentView === 'edit-name' && (
                            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '6px', borderBottom: '1px solid var(--border-subtle)' }}>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentView('account')}
                                        style={{
                                            background: 'var(--surface-input)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            width: '26px',
                                            height: '26px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'var(--text-primary)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <ArrowLeft size={14} />
                                    </button>
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                        Edit Full Name
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Display / Full Name</label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Your name"
                                        autoFocus
                                        className="surface-input styled-input"
                                        style={{
                                            width: '100%',
                                            padding: '8px 12px',
                                            borderRadius: '10px',
                                            fontSize: '13px',
                                        }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentView('account')}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            borderRadius: '10px',
                                            border: '1px solid var(--border-subtle)',
                                            background: 'transparent',
                                            color: 'var(--text-muted)',
                                            fontSize: '12px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingProfile || !fullName.trim()}
                                        className="btn-primary"
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            borderRadius: '10px',
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {savingProfile ? 'Saving...' : profileSaved ? 'Saved ✓' : 'Save'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProfileMenu;
