import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, ChevronDown, RefreshCw, Check } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useNavigate } from 'react-router-dom';

const ProfileMenu = () => {
    const { user, signOut } = useAuth();
    const { profile } = useProfile();
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
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
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
            // Clear all Cache Storage (service worker caches)
            if ('caches' in window) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
            }
            // Unregister any service workers so they re-install fresh
            if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map(r => r.unregister()));
            }
            setUpdated(true);
            // Short delay so the user sees the tick, then hard-reload
            setTimeout(() => {
                window.location.href = window.location.href.split('?')[0]
                    + '?_bust=' + Date.now();
            }, 800);
        } catch (err) {
            console.error('Update error:', err);
            window.location.reload(true);
        }
    };

    if (!user) return null;

    // Get user initial from name or email
    const displayName = profile?.display_name || user.email;
    const initial = displayName ? displayName[0].toUpperCase() : 'U';

    return (
        <div style={{ position: 'relative' }} ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '20px',
                    transition: 'background 0.2s',
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '600',
                    fontSize: '14px',
                }}>
                    {initial}
                </div>
                <ChevronDown size={16} style={{ opacity: 0.5, transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: '0',
                    marginTop: '8px',
                    width: '240px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    border: '1px solid rgba(255,255,255,0.5)',
                    padding: '8px',
                    zIndex: 1000,
                    animation: 'fadeIn 0.2s ease-out',
                }}>
                    <div style={{
                        padding: '12px',
                        borderBottom: '1px solid rgba(0,0,0,0.05)',
                        marginBottom: '8px',
                    }}>
                        {profile?.display_name && (
                            <p style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600' }}>
                                {profile.display_name}
                            </p>
                        )}
                        <p style={{ margin: 0, fontSize: '13px', opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user.email}
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
                            padding: '10px 12px',
                            border: 'none',
                            background: 'transparent',
                            color: updated ? '#27ae60' : 'var(--text-primary)',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: updating ? 'default' : 'pointer',
                            borderRadius: '8px',
                            transition: 'background 0.2s',
                            opacity: updating ? 0.7 : 1,
                            marginBottom: '2px',
                        }}
                        onMouseOver={(e) => { if (!updating) e.currentTarget.style.background = 'rgba(102,126,234,0.08)'; }}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        {updated
                            ? <Check size={16} />
                            : <RefreshCw size={16} style={{ animation: updating ? 'spin 1s linear infinite' : 'none' }} />}
                        {updated ? 'Refreshing…' : updating ? 'Clearing cache…' : 'Check for Updates'}
                    </button>

                    <div style={{ height: '1px', background: 'rgba(0,0,0,0.06)', margin: '4px 0' }} />

                    <button
                        onClick={handleLogout}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 12px',
                            border: 'none',
                            background: 'transparent',
                            color: '#f56565',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            transition: 'background 0.2s',
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(245, 101, 101, 0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            )}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default ProfileMenu;
