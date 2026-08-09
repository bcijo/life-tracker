import React, { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronUp, ChevronDown, RefreshCw, Check, Palette, Dices, User, AtSign } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';

const ProfileMenu = ({ variant = 'default' }) => {
    const isSidebar = variant === 'sidebar';
    const { user, signOut } = useAuth();
    const { profile, updateProfile, rerollUsername } = useProfile();
    const { theme, setTheme, THEMES } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const [updating, setUpdating] = useState(false);
    const [updated, setUpdated] = useState(false);
    const [rerolling, setRerolling] = useState(false);
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileSaved, setProfileSaved] = useState(false);

    useEffect(() => {
        if (profile) setFullName(profile.full_name || '');
    }, [profile]);

    const handleReroll = async () => {
        setRerolling(true);
        try {
            await rerollUsername();
        } catch (err) {
            console.error('Reroll error:', err);
        } finally {
            setTimeout(() => setRerolling(false), 300);
        }
    };

    const handleSaveProfile = async () => {
        setSavingProfile(true);
        try {
            await updateProfile({ full_name: fullName });
            setProfileSaved(true);
            setTimeout(() => setProfileSaved(false), 2000);
        } catch (err) {
            console.error('Save profile error:', err);
        } finally {
            setSavingProfile(false);
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

    const displayName = profile?.display_name || user.email;
    const initial = displayName ? displayName[0].toUpperCase() : 'U';
    const ChevronIcon = isSidebar ? ChevronUp : ChevronDown;

    return (
        <div style={{ position: 'relative', width: isSidebar ? '100%' : 'auto' }} ref={menuRef}>
            {/* Avatar trigger button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: isSidebar ? '10px' : '6px',
                    width: isSidebar ? '100%' : 'auto',
                    padding: isSidebar ? '10px 12px' : '4px',
                    borderRadius: isSidebar ? '14px' : '9999px',
                    background: isOpen && isSidebar ? 'rgba(255,255,255,0.06)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                }}
                onMouseOver={(e) => e.currentTarget.style.background = isSidebar ? 'rgba(255,255,255,0.06)' : 'var(--glass-card-bg)'}
                onMouseOut={(e) => e.currentTarget.style.background = isOpen && isSidebar ? 'rgba(255,255,255,0.06)' : 'transparent'}
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
                }}>
                    {initial}
                </div>

                {/* Name + username shown in sidebar variant */}
                {isSidebar && (
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <div style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: 1.3,
                        }}>
                            {profile?.display_name || profile?.full_name || 'User'}
                        </div>
                        {profile?.username && (
                            <div style={{
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                fontFamily: 'monospace',
                                fontWeight: '500',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: 1.3,
                            }}>
                                @{profile.username}
                            </div>
                        )}
                    </div>
                )}

                <ChevronIcon
                    size={15}
                    style={{
                        opacity: 0.5,
                        transform: isOpen ? (isSidebar ? 'rotate(180deg)' : 'rotate(180deg)') : 'rotate(0)',
                        transition: 'transform 0.2s ease',
                        color: 'var(--text-primary)',
                        flexShrink: 0,
                        marginLeft: isSidebar ? 'auto' : 0,
                    }}
                />
            </button>

            {/* Dropdown panel */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    ...(isSidebar
                        ? { bottom: '100%', left: '0', marginBottom: '10px' }
                        : { top: '100%', right: '0', marginTop: '10px' }
                    ),
                    width: isSidebar ? '280px' : '256px',
                    maxHeight: isSidebar ? 'calc(100vh - 140px)' : 'none',
                    overflowY: isSidebar ? 'auto' : 'visible',
                    background: 'var(--surface-elevated)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)',
                    border: '1px solid var(--glass-border)',
                    padding: '8px',
                    zIndex: 1000,
                    animation: isSidebar
                        ? 'menuSlideUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
                        : 'menuSlideIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                }}>

                    {/* ── User Info ── */}
                    <div style={{
                        padding: '12px 14px 14px',
                        borderBottom: '1px solid var(--border-subtle)',
                        marginBottom: '6px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'var(--accent-gradient)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '700',
                                fontSize: '16px',
                                flexShrink: 0,
                            }}>
                                {initial}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                                {profile?.display_name && (
                                    <p style={{
                                        margin: '0 0 2px 0',
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        color: 'var(--text-primary)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}>
                                        {profile.display_name}
                                    </p>
                                )}
                                {profile?.username && (
                                    <p style={{
                                        margin: '0 0 2px 0',
                                        fontSize: '11px',
                                        color: 'var(--accent-primary)',
                                        fontWeight: '600',
                                        fontFamily: 'monospace',
                                    }}>
                                        @{profile.username}
                                    </p>
                                )}
                                <p style={{
                                    margin: 0,
                                    fontSize: '12px',
                                    color: 'var(--text-muted)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}>
                                    {user.email}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* ── Theme Picker ── */}
                    <div style={{ padding: '10px 14px 12px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '6px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '10px',
                        }}>
                            <Palette size={14} style={{ color: 'var(--text-muted)' }} />
                            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Theme
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {THEMES.map((t) => {
                                const isActive = theme === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => setTheme(t.id)}
                                        title={t.label}
                                        style={{
                                            flex: 1,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '5px',
                                            padding: '8px 4px',
                                            border: isActive
                                                ? `2px solid var(--accent-primary)`
                                                : '2px solid var(--glass-card-border)',
                                            borderRadius: '12px',
                                            background: isActive ? 'var(--glass-card-bg)' : 'transparent',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            transform: isActive ? 'scale(1.04)' : 'scale(1)',
                                        }}
                                    >
                                        {/* Color swatch */}
                                        <div style={{
                                            width: '28px',
                                            height: '20px',
                                            borderRadius: '6px',
                                            background: `linear-gradient(135deg, ${t.preview} 0%, ${t.previewAccent} 100%)`,
                                            boxShadow: isActive ? `0 0 0 2px var(--accent-primary)` : 'none',
                                        }} />
                                        <span style={{
                                            fontSize: '9px',
                                            fontWeight: isActive ? '700' : '500',
                                            color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                                            letterSpacing: '0.02em',
                                        }}>
                                            {t.icon}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <p style={{
                            marginTop: '8px',
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            textAlign: 'center',
                        }}>
                            {THEMES.find(t => t.id === theme)?.label}
                        </p>
                    </div>

                    {/* ── Profile Section ── */}
                    <div style={{ padding: '10px 14px 12px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '6px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '10px',
                        }}>
                            <User size={14} style={{ color: 'var(--text-muted)' }} />
                            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Profile
                            </span>
                        </div>

                        {/* Full Name */}
                        <div style={{ marginBottom: '8px' }}>
                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Full Name</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Your full name"
                                style={{
                                    width: '100%',
                                    padding: '7px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--glass-card-border)',
                                    background: 'var(--glass-card-bg)',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>

                        {/* Username (read-only + re-roll) */}
                        <div style={{ marginBottom: '8px' }}>
                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>
                                <AtSign size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
                                Username
                            </label>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <div style={{
                                    flex: 1,
                                    padding: '7px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--glass-card-border)',
                                    background: 'var(--glass-card-bg)',
                                    color: profile?.username ? 'var(--accent-primary)' : 'var(--text-muted)',
                                    fontSize: '13px',
                                    fontFamily: 'monospace',
                                    fontWeight: '600',
                                }}>
                                    {profile?.username || 'Not set — visit Friends tab!'}
                                </div>
                                {profile?.username && (
                                    <button
                                        onClick={handleReroll}
                                        disabled={rerolling}
                                        title="Re-roll username"
                                        style={{
                                            padding: '7px 8px',
                                            borderRadius: '8px',
                                            border: '1px solid var(--glass-card-border)',
                                            background: 'var(--glass-card-bg)',
                                            color: 'var(--accent-primary)',
                                            cursor: rerolling ? 'default' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            opacity: rerolling ? 0.5 : 1,
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <Dices size={16} style={{ animation: rerolling ? 'spin 0.5s linear infinite' : 'none' }} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Email (read-only) */}
                        <div style={{ marginBottom: '10px' }}>
                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Email</label>
                            <div style={{
                                padding: '7px 10px',
                                borderRadius: '8px',
                                border: '1px solid var(--glass-card-border)',
                                background: 'var(--glass-card-bg)',
                                color: 'var(--text-muted)',
                                fontSize: '13px',
                            }}>
                                {user.email}
                            </div>
                        </div>

                        {/* Save Profile Button */}
                        <button
                            onClick={handleSaveProfile}
                            disabled={savingProfile}
                            style={{
                                width: '100%',
                                padding: '7px',
                                borderRadius: '8px',
                                border: 'none',
                                background: profileSaved ? 'var(--success)' : 'var(--accent-gradient)',
                                color: '#fff',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: savingProfile ? 'default' : 'pointer',
                                opacity: savingProfile ? 0.7 : 1,
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                            }}
                        >
                            {profileSaved ? <><Check size={14} /> Saved!</> : savingProfile ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>

                    {/* ── Check for Updates ── */}
                    <button
                        onClick={handleUpdate}
                        disabled={updating}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 14px',
                            border: 'none',
                            background: 'transparent',
                            color: updated ? 'var(--success)' : 'var(--text-primary)',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: updating ? 'default' : 'pointer',
                            borderRadius: '10px',
                            transition: 'background 0.2s',
                            opacity: updating ? 0.7 : 1,
                        }}
                        onMouseOver={(e) => { if (!updating) e.currentTarget.style.background = 'var(--glass-card-bg)'; }}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        {updated
                            ? <Check size={16} />
                            : <RefreshCw size={16} style={{ animation: updating ? 'spin 1s linear infinite' : 'none' }} />}
                        {updated ? 'Refreshing…' : updating ? 'Clearing cache…' : 'Check for Updates'}
                    </button>

                    <div className="divider" style={{ margin: '4px 6px' }} />

                    {/* ── Sign Out ── */}
                    <button
                        onClick={handleLogout}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 14px',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--danger)',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            borderRadius: '10px',
                            transition: 'background 0.2s',
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'var(--danger-bg)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            )}

            <style>{`
                @keyframes menuSlideIn {
                    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0)   scale(1);    }
                }
                @keyframes menuSlideUp {
                    from { opacity: 0; transform: translateY(8px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0)   scale(1);    }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default ProfileMenu;
