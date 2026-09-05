import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Lock, Key, Copy, Check, X, AlertCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { useEncryption } from '../../contexts/EncryptionContext';

const PrivacySettingsModal = ({ isOpen, onClose }) => {
    const { 
        isEncryptionReady, 
        hasPinSet, 
        setupPin, 
        exportRecoveryKey, 
        importRecoveryKey 
    } = useEncryption();

    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [pinSuccess, setPinSuccess] = useState(false);
    const [isSubmittingPin, setIsSubmittingPin] = useState(false);

    const [recoveryKey, setRecoveryKey] = useState(null);
    const [copiedKey, setCopiedKey] = useState(false);
    const [showKey, setShowKey] = useState(false);

    const [importKeyInput, setImportKeyInput] = useState('');
    const [showImport, setShowImport] = useState(false);
    const [importError, setImportError] = useState('');
    const [importSuccess, setImportSuccess] = useState(false);

    // Close on Escape key & lock background scroll
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = originalOverflow;
        };
    }, [isOpen, onClose]);

    const handleSavePin = async (e) => {
        e.preventDefault();
        setPinError('');
        setPinSuccess(false);

        if (!pin || pin.length < 4) {
            setPinError('PIN must be at least 4 digits.');
            return;
        }
        if (pin !== confirmPin) {
            setPinError('PINs do not match.');
            return;
        }

        setIsSubmittingPin(true);
        const res = await setupPin(pin);
        setIsSubmittingPin(false);

        if (res.success) {
            setPinSuccess(true);
            setPin('');
            setConfirmPin('');
            setTimeout(() => setPinSuccess(false), 4000);
        } else {
            setPinError(res.error || 'Failed to set PIN.');
        }
    };

    const handleViewRecoveryKey = async () => {
        if (recoveryKey) {
            setShowKey(!showKey);
            return;
        }
        const key = await exportRecoveryKey();
        setRecoveryKey(key);
        setShowKey(true);
    };

    const handleCopyKey = () => {
        if (!recoveryKey) return;
        navigator.clipboard.writeText(recoveryKey);
        setCopiedKey(true);
        setTimeout(() => setCopiedKey(false), 3000);
    };

    const handleImportKey = async (e) => {
        e.preventDefault();
        setImportError('');
        setImportSuccess(false);

        if (!importKeyInput.trim()) {
            setImportError('Please enter a valid recovery key.');
            return;
        }

        const res = await importRecoveryKey(importKeyInput.trim());
        if (res.success) {
            setImportSuccess(true);
            setImportKeyInput('');
            setTimeout(() => {
                setImportSuccess(false);
                setShowImport(false);
            }, 2000);
        } else {
            setImportError(res.error || 'Invalid key format.');
        }
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        width: '100vw',
                        height: '100vh',
                        zIndex: 99999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        padding: '20px',
                        boxSizing: 'border-box'
                    }}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 15 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            width: '100%',
                            maxWidth: '520px',
                            background: 'var(--surface-elevated, #131b2e)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            borderRadius: '24px',
                            padding: '28px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                            color: 'var(--text-primary, #fff)',
                            position: 'relative',
                            maxHeight: 'min(90vh, 720px)',
                            overflowY: 'auto',
                            overscrollBehavior: 'contain'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(6, 182, 212, 0.2))',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#10b981'
                            }}>
                                <ShieldCheck size={26} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
                                    Privacy & Encryption
                                </h3>
                                <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)' }}>
                                    Zero-Knowledge Client-Side Protection
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'rgba(255, 255, 255, 0.6)',
                                cursor: 'pointer',
                                transition: 'all 0.15s'
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Status Badge */}
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(6, 182, 212, 0.05))',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '16px',
                        padding: '16px',
                        marginBottom: '22px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: '600', fontSize: '14px', marginBottom: '6px' }}>
                            <Lock size={16} />
                            {isEncryptionReady ? 'AES-256-GCM Active' : 'Vault Initializing...'}
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', color: 'rgba(255, 255, 255, 0.7)' }}>
                            Your journal reflections and private notes are encrypted directly on your device before being transmitted to the cloud. Even the server and database host cannot read your entries.
                        </p>
                    </div>

                    {/* Section 1: Security PIN for Cross-Device Sync */}
                    <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Key size={15} color="#8b5cf6" />
                            Multi-Device Vault PIN
                        </h4>
                        <p style={{ fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 12px', lineHeight: '1.4' }}>
                            {hasPinSet 
                                ? 'Your vault key is synced. If you switch devices, you can enter this PIN to unlock your encrypted entries.'
                                : 'Set a 4-6 digit PIN so you can access your encrypted diary and notes when signing in on other phones or browsers.'}
                        </p>

                        <form onSubmit={handleSavePin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <input
                                    type="password"
                                    placeholder="Enter Security PIN"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    maxLength={12}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        borderRadius: '10px',
                                        padding: '10px 14px',
                                        fontSize: '13px',
                                        color: '#fff',
                                        outline: 'none'
                                    }}
                                />
                                <input
                                    type="password"
                                    placeholder="Confirm PIN"
                                    value={confirmPin}
                                    onChange={(e) => setConfirmPin(e.target.value)}
                                    maxLength={12}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        borderRadius: '10px',
                                        padding: '10px 14px',
                                        fontSize: '13px',
                                        color: '#fff',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            {pinError && (
                                <div style={{ color: '#ef4444', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <AlertCircle size={13} /> {pinError}
                                </div>
                            )}

                            {pinSuccess && (
                                <div style={{ color: '#10b981', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Check size={13} /> Vault PIN saved successfully!
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmittingPin || !pin}
                                style={{
                                    alignSelf: 'flex-start',
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '10px',
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: isSubmittingPin || !pin ? 'not-allowed' : 'pointer',
                                    opacity: isSubmittingPin || !pin ? 0.6 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {isSubmittingPin ? <RefreshCw size={14} className="animate-spin" /> : null}
                                {hasPinSet ? 'Update Vault PIN' : 'Save Vault PIN'}
                            </button>
                        </form>
                    </div>

                    {/* Section 2: Backup Recovery Key */}
                    <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '18px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Lock size={15} color="#38bdf8" />
                            Emergency Recovery Key
                        </h4>
                        <p style={{ fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.6)', margin: '0 0 12px' }}>
                            You can export your raw encryption key and save it into a password manager as an ultimate backup.
                        </p>

                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                                onClick={handleViewRecoveryKey}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    color: '#fff',
                                    borderRadius: '10px',
                                    padding: '8px 14px',
                                    fontSize: '12.5px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                {showKey ? 'Hide Recovery Key' : 'View Recovery Key'}
                            </button>

                            <button
                                onClick={() => setShowImport(!showImport)}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    color: 'rgba(255, 255, 255, 0.7)',
                                    borderRadius: '10px',
                                    padding: '8px 14px',
                                    fontSize: '12.5px',
                                    cursor: 'pointer'
                                }}
                            >
                                {showImport ? 'Cancel Import' : 'Import Key'}
                            </button>
                        </div>

                        {/* Display Key */}
                        {showKey && recoveryKey && (
                            <div style={{
                                marginTop: '12px',
                                background: 'rgba(0, 0, 0, 0.3)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '10px',
                                padding: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '8px'
                            }}>
                                <code style={{ fontSize: '11px', wordBreak: 'break-all', color: '#38bdf8' }}>
                                    {recoveryKey}
                                </code>
                                <button
                                    onClick={handleCopyKey}
                                    style={{
                                        background: copiedKey ? '#10b981' : 'rgba(255, 255, 255, 0.1)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '6px 10px',
                                        color: '#fff',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        flexShrink: 0
                                    }}
                                >
                                    {copiedKey ? <Check size={12} /> : <Copy size={12} />}
                                    {copiedKey ? 'Copied' : 'Copy'}
                                </button>
                            </div>
                        )}

                        {/* Import Key Form */}
                        {showImport && (
                            <form onSubmit={handleImportKey} style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <input
                                    type="text"
                                    placeholder="Paste Base64 Recovery Key..."
                                    value={importKeyInput}
                                    onChange={(e) => setImportKeyInput(e.target.value)}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        borderRadius: '10px',
                                        padding: '10px 14px',
                                        fontSize: '12px',
                                        color: '#fff',
                                        outline: 'none',
                                        fontFamily: 'monospace'
                                    }}
                                />
                                {importError && <div style={{ color: '#ef4444', fontSize: '12px' }}>{importError}</div>}
                                {importSuccess && <div style={{ color: '#10b981', fontSize: '12px' }}>Key restored successfully!</div>}
                                <button
                                    type="submit"
                                    style={{
                                        alignSelf: 'flex-start',
                                        background: '#38bdf8',
                                        color: '#000',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '7px 14px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Restore Key
                                </button>
                            </form>
                        )}
                    </div>
                </motion.div>
            </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default PrivacySettingsModal;
