import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Key, AlertCircle, RefreshCw } from 'lucide-react';
import { useEncryption } from '../../contexts/EncryptionContext';

const VaultUnlockModal = () => {
    const { needsPin, unlockWithPin } = useEncryption();
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isUnlocking, setIsUnlocking] = useState(false);

    if (!needsPin) return null;

    const handleUnlock = async (e) => {
        e.preventDefault();
        setError('');
        if (!pin) {
            setError('Please enter your Vault PIN.');
            return;
        }

        setIsUnlocking(true);
        const res = await unlockWithPin(pin);
        setIsUnlocking(false);

        if (!res.success) {
            setError(res.error || 'Incorrect PIN.');
        }
    };

    return (
        <AnimatePresence>
            <div 
                style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(10px)',
                    padding: '16px'
                }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    style={{
                        width: '100%',
                        maxWidth: '420px',
                        background: 'var(--surface-elevated, #131b2e)',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        borderRadius: '24px',
                        padding: '28px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
                        color: 'var(--text-primary, #fff)',
                        textAlign: 'center'
                    }}
                >
                    <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2))',
                        border: '1px solid rgba(139, 92, 246, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#a855f7',
                        margin: '0 auto 16px'
                    }}>
                        <Lock size={26} />
                    </div>

                    <h3 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: '700' }}>
                        Unlock Your Vault
                    </h3>
                    <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.65)', lineHeight: '1.5' }}>
                        This device detected an encrypted vault. Enter your Security PIN to unlock your personal reflections and notes.
                    </p>

                    <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="password"
                                autoFocus
                                placeholder="Enter Security PIN"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                maxLength={12}
                                style={{
                                    width: '100%',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    borderRadius: '12px',
                                    padding: '12px 16px',
                                    fontSize: '16px',
                                    textAlign: 'center',
                                    letterSpacing: '3px',
                                    color: '#fff',
                                    outline: 'none'
                                }}
                            />
                        </div>

                        {error && (
                            <div style={{ color: '#ef4444', fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                <AlertCircle size={14} /> {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isUnlocking || !pin}
                            style={{
                                width: '100%',
                                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '12px',
                                padding: '12px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: isUnlocking || !pin ? 'not-allowed' : 'pointer',
                                opacity: isUnlocking || !pin ? 0.6 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.35)'
                            }}
                        >
                            {isUnlocking ? <RefreshCw size={16} className="animate-spin" /> : <Key size={16} />}
                            Unlock Vault
                        </button>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default VaultUnlockModal;
