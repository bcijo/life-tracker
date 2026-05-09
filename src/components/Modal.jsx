import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div
            style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'var(--overlay-bg)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px',
                animation: 'modalFadeIn 0.2s ease-out',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'var(--surface-elevated)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    padding: '24px',
                    width: '100%',
                    maxWidth: '400px',
                    position: 'relative',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    color: 'var(--text-primary)',
                }}
                onClick={e => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'var(--glass-card-bg)',
                        border: '1px solid var(--glass-card-border)',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        transition: 'background 0.2s ease',
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--surface-input)'}
                    onMouseOut={e => e.currentTarget.style.background = 'var(--glass-card-bg)'}
                >
                    <X size={16} />
                </button>

                {title && (
                    <h3 style={{
                        marginBottom: '20px',
                        fontSize: '18px',
                        paddingRight: '28px',
                        color: 'var(--text-primary)',
                        fontWeight: '700',
                    }}>
                        {title}
                    </h3>
                )}

                {children}
            </div>
            <style>{`
                @keyframes modalFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes modalSlideUp {
                    from { transform: translateY(16px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>,
        document.body
    );
};

export default Modal;
