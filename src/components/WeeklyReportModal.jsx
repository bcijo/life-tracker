import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, RefreshCw } from 'lucide-react';
import AIReportCard from './AIReportCard';

const WeeklyReportModal = ({
    isOpen,
    onClose,
    report,
    loading,
    onAcceptCommitment,
    acceptingId,
    onForceGenerate
}) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    backgroundColor: 'rgba(10, 15, 30, 0.75)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)'
                }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 30 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        width: '100%',
                        maxWidth: '820px',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        background: 'var(--surface-card, rgba(23, 25, 35, 0.95))',
                        border: '1px solid var(--glass-card-border, rgba(255, 255, 255, 0.12))',
                        borderRadius: '24px',
                        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 30px rgba(139, 92, 246, 0.15)',
                        overflow: 'hidden',
                        position: 'relative'
                    }}
                >
                    {/* Header bar inside modal */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '18px 24px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'rgba(255, 255, 255, 0.02)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '10px',
                                background: 'rgba(168, 85, 247, 0.12)',
                                border: '1px solid rgba(168, 85, 247, 0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#a855f7'
                            }}>
                                <Sparkles size={16} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                                    Sunday AI Review
                                </h3>
                                <p style={{ fontSize: '12px', margin: 0, color: 'var(--text-muted)' }}>
                                    Personalized weekly habits & financial analysis
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {onForceGenerate && (
                                <button
                                    onClick={onForceGenerate}
                                    disabled={loading}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: 'var(--text-secondary)',
                                        padding: '6px 12px',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        transition: 'all 0.2s ease'
                                    }}
                                    title="Regenerate Weekly AI Report"
                                >
                                    <RefreshCw size={14} className={loading ? 'spin' : ''} style={{ color: '#a855f7' }} />
                                    <span>Regenerate</span>
                                </button>
                            )}

                            <button
                                onClick={onClose}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s ease'
                                }}
                                title="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Modal Content Scroll Area */}
                    <div style={{
                        padding: '24px',
                        overflowY: 'auto',
                        flex: 1
                    }}>
                        <AIReportCard
                            report={report}
                            loading={loading}
                            onAcceptCommitment={onAcceptCommitment}
                            acceptingId={acceptingId}
                        />
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default WeeklyReportModal;
