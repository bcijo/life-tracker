import React, { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronDown, RefreshCw, Check, Palette } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';

const ProfileMenu = () => {
    const { user, signOut } = useAuth();
    const { profile } = useProfile();
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
                window.location.href = window.location.href.split('?')[0] + '?_bust=' + Date.now();
            }, 800);
        } catch (err) {
            console.error('Update error:', err);
            window.location.reload(true);
        }
    };

    if (!user) return null;

    const displayName = profile?.display_name || user.email;
    const initial = displayName ? displayName[0].toUpperCase() : 'U';

    return (
        <div style={{ position: 'relative' }} ref={menuRef}>
            {/* Avatar trigger button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 rounded-full px-1 py-1 transition-all duration-200"
                style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'var(--glass-card-bg)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
                {/* Avatar circle */}
                <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: 'var(--accent-gradient)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '14px',
                    flexShrink: 0,
                }}>
                    {initial}
                </div>
                <ChevronDown
                    size={15}
                    style={{
                        opacity: 0.5,
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                        transition: 'transform 0.2s ease',
                        color: 'var(--text-primary)',
                    }}
                />
            </button>

            {/* Dropdown panel */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: '0',
                    marginTop: '10px',
                    width: '256px',
                    background: 'var(--surface-elevated)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.10)',
                    border: '1px solid var(--glass-border)',
                    padding: '8px',
                    zIndex: 1000,
                    animation: 'menuSlideIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
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
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default ProfileMenu;
