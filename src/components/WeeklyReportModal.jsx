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
                        padding: '20px 24px',
                        borderBottom: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                        background: 'rgba(0, 0, 0, 0.2)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: 'var(--accent-gradient, linear-gradient(135deg, #6366f1, #a855f7))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff'
                            }}>
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: 'var(--text-primary)' }}>
                                    Weekly Report
                                </h3>
                                <p style={{ fontSize: '12px', margin: 0, color: 'var(--text-muted)' }}>
                                    Personalized AI financial & habit insights
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {onForceGenerate && (
                                <button
                                    onClick={onForceGenerate}
                                    disabled={loading}
                                    style={{
                                        background: 'var(--glass-card-bg, rgba(255, 255, 255, 0.05))',
                                        border: '1px solid var(--glass-card-border, rgba(255, 255, 255, 0.1))',
                                        color: 'var(--text-primary)',
                                        padding: '8px 14px',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        transition: 'all 0.2s ease'
                                    }}
                                    title="Regenerate Weekly AI Report"
                                >
                                    <RefreshCw size={15} className={loading ? 'spin' : ''} style={{ color: 'var(--accent-primary)' }} />
                                    <span>Regenerate</span>
                                </button>
                            )}

                            <button
                                onClick={onClose}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: 'none',
                                    color: 'var(--text-primary)',
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s ease'
                                }}
                                title="Close"
                            >
                                <X size={20} />
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
