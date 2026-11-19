import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Shared pop-up.
 *
 * - Phones (< 640px): a bottom sheet that is never taller than the visible
 *   screen, with its close button pinned while the content scrolls.
 * - Larger screens: a centred card, also capped to the visible height.
 *
 * Sizes use --app-vh (see lib/viewportHeight.js) so browser toolbars and the
 * on-screen keyboard can't push the top or bottom of the pop-up off-screen.
 *
 * Inside the scrolling body, --modal-pad-x and --modal-pad-b hold the body's
 * padding, for children that need to bleed to the edges (e.g. sticky footers).
 */
const Modal = ({ isOpen, onClose, title, children, maxWidth = '400px' }) => {
    // Callers pass a new onClose each render; read the latest through a ref
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!isOpen) return undefined;
        document.body.style.overflow = 'hidden';
        const onKey = (e) => { if (e.key === 'Escape') onCloseRef.current?.(); };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', onKey);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="lt-modal-overlay" onClick={onClose}>
            <div
                className="lt-modal-panel"
                style={{ '--lt-modal-max-width': maxWidth }}
                role="dialog"
                aria-modal="true"
                aria-label={typeof title === 'string' ? title : undefined}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="lt-modal-grabber" aria-hidden="true" />
                <button type="button" className="lt-modal-close" onClick={onClose} aria-label="Close">
                    <X size={16} />
                </button>
                <div className="lt-modal-body">
                    {title && <h3 className="lt-modal-title">{title}</h3>}
                    {children}
                </div>
            </div>
            <style>{`
                .lt-modal-overlay {
                    position: fixed;
                    left: 0;
                    right: 0;
                    top: var(--app-vv-top, 0px);
                    height: calc(var(--app-vh, 1vh) * 100);
                    background: var(--overlay-bg);
                    backdrop-filter: blur(6px);
                    -webkit-backdrop-filter: blur(6px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    padding: 20px;
                    animation: ltModalFadeIn 0.2s ease-out;
                }
                .lt-modal-panel {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    max-width: var(--lt-modal-max-width, 400px);
                    max-height: 100%;
                    background: var(--surface-elevated);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid var(--glass-border);
                    border-radius: var(--radius-md);
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    color: var(--text-primary);
                    overflow: hidden;
                    animation: ltModalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .lt-modal-body {
                    --modal-pad-x: 24px;
                    --modal-pad-b: 24px;
                    flex: 1 1 auto;
                    min-height: 0;
                    overflow-y: auto;
                    overscroll-behavior: contain;
                    -webkit-overflow-scrolling: touch;
                    padding: 24px var(--modal-pad-x) var(--modal-pad-b);
                }
                .lt-modal-title {
                    margin: 0 0 20px;
                    padding-right: 40px;
                    font-size: 18px;
                    font-weight: 700;
                    color: var(--text-primary);
                }
                .lt-modal-close {
                    position: absolute;
                    top: 14px;
                    right: 14px;
                    z-index: 5;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    background: var(--surface-elevated);
                    border: 1px solid var(--glass-card-border);
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: background 0.2s ease;
                }
                .lt-modal-close:hover { background: var(--surface-input); }
                .lt-modal-grabber { display: none; }

                /* Phones: bottom sheet */
                @media (max-width: 639px) {
                    .lt-modal-overlay {
                        align-items: flex-end;
                        padding: max(12px, env(safe-area-inset-top, 0px)) 0 0;
                    }
                    .lt-modal-panel {
                        max-width: none;
                        border-radius: 22px 22px 0 0;
                        border-bottom: none;
                        box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.25);
                        animation: ltModalSheetUp 0.32s cubic-bezier(0.16, 1, 0.3, 1);
                    }
                    .lt-modal-grabber {
                        display: block;
                        flex-shrink: 0;
                        width: 38px;
                        height: 4px;
                        margin: 8px auto 0;
                        border-radius: 999px;
                        background: var(--border-subtle);
                        box-shadow: inset 0 0 0 1px var(--surface-input-border);
                    }
                    .lt-modal-close { top: 12px; right: 12px; }
                    .lt-modal-body {
                        --modal-pad-x: 18px;
                        --modal-pad-b: calc(20px + env(safe-area-inset-bottom, 0px));
                        padding-top: 14px;
                    }
                    .lt-modal-title {
                        font-size: 17px;
                        margin-bottom: 16px;
                    }
                }

                @keyframes ltModalFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes ltModalSlideUp {
                    from { transform: translateY(16px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes ltModalSheetUp {
                    from { transform: translateY(40px); opacity: 0.4; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>,
        document.body
    );
};

export default Modal;
