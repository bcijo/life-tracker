import React from 'react';
import { motion } from 'framer-motion';

/**
 * Custom Unified Branded Loading Animation for LifeTracker.
 * Features:
 * - Dual rotating glowing orbital rings (representing Life, Habits, Mind, Finances).
 * - Pulsing core with the LifeTracker signature heartbeat rhythm.
 * - Shimmering gradient brand text and subtle status caption.
 * 
 * Modes:
 * - 'fullscreen': Covers viewport with backdrop blur and centered logo (ideal for page transitions & auth guards).
 * - 'section': Padded section loader with glass container (ideal for in-page widgets/tabs).
 * - 'inline': Compact mini loader for buttons or small cards.
 */
const AppLoader = ({
    message = 'Syncing your life...',
    submessage,
    size = 'normal', // 'small' | 'normal' | 'large'
    variant = 'fullscreen', // 'fullscreen' | 'section' | 'inline'
    showLogoText = true,
    className = ''
}) => {

    const sizeConfig = {
        small: {
            boxSize: 44,
            ring1: 38,
            ring2: 28,
            core: 12,
            fontSize: '11px',
            titleSize: '13px'
        },
        normal: {
            boxSize: 72,
            ring1: 64,
            ring2: 48,
            core: 20,
            fontSize: '13px',
            titleSize: '17px'
        },
        large: {
            boxSize: 96,
            ring1: 86,
            ring2: 66,
            core: 28,
            fontSize: '14px',
            titleSize: '21px'
        }
    }[size] || {
        boxSize: 72,
        ring1: 64,
        ring2: 48,
        core: 20,
        fontSize: '13px',
        titleSize: '17px'
    };

    // Compact Inline variant
    if (variant === 'inline') {
        return (
            <div className={`lifetracker-loader-inline ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ position: 'relative', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Ring 1 */}
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                        style={{
                            position: 'absolute',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            border: '2px solid transparent',
                            borderTopColor: '#a855f7',
                            borderRightColor: '#6366f1'
                        }}
                    />
                    {/* Core */}
                    <motion.div
                        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #a855f7, #ec4899)'
                        }}
                    />
                </div>
                {message && (
                    <span style={{ fontSize: sizeConfig.fontSize, color: 'var(--text-secondary)', fontWeight: '500' }}>
                        {message}
                    </span>
                )}
            </div>
        );
    }

    // Core Orb & Rings Graphic
    const LoaderGraphic = (
        <div style={{ position: 'relative', width: `${sizeConfig.boxSize}px`, height: `${sizeConfig.boxSize}px`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            
            {/* Outer Aura Glow */}
            <motion.div
                animate={{
                    scale: [1, 1.25, 1],
                    opacity: [0.25, 0.6, 0.25]
                }}
                transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
                style={{
                    position: 'absolute',
                    width: `${sizeConfig.ring1 * 1.2}px`,
                    height: `${sizeConfig.ring1 * 1.2}px`,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(168, 85, 247, 0.45) 0%, rgba(99, 102, 241, 0.15) 50%, transparent 70%)',
                    filter: 'blur(8px)',
                    zIndex: 0
                }}
            />

            {/* Orbit Ring 1 (Clockwise gradient sweep) */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
                style={{
                    position: 'absolute',
                    width: `${sizeConfig.ring1}px`,
                    height: `${sizeConfig.ring1}px`,
                    borderRadius: '50%',
                    border: '2.5px solid transparent',
                    borderTopColor: '#a855f7',
                    borderRightColor: '#ec4899',
                    borderBottomColor: 'rgba(168, 85, 247, 0.15)',
                    borderLeftColor: 'transparent',
                    boxShadow: '0 0 12px rgba(168, 85, 247, 0.3)',
                    zIndex: 1
                }}
            />

            {/* Orbit Ring 2 (Counter-clockwise emerald-indigo sweep) */}
            <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
                style={{
                    position: 'absolute',
                    width: `${sizeConfig.ring2}px`,
                    height: `${sizeConfig.ring2}px`,
                    borderRadius: '50%',
                    border: '2px solid transparent',
                    borderTopColor: '#6366f1',
                    borderLeftColor: '#10b981',
                    borderBottomColor: 'transparent',
                    boxShadow: '0 0 10px rgba(99, 102, 241, 0.25)',
                    zIndex: 2
                }}
            />

            {/* Central Heartbeat / Pulse Orb */}
            <motion.div
                animate={{
                    scale: [0.85, 1.2, 0.9, 1.15, 0.85],
                    opacity: [0.8, 1, 0.85, 1, 0.8]
                }}
                transition={{
                    duration: 1.6,
                    repeat: Infinity,
                    ease: 'easeInOut'
                }}
                style={{
                    width: `${sizeConfig.core}px`,
                    height: `${sizeConfig.core}px`,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #6366f1 100%)',
                    boxShadow: '0 0 16px rgba(236, 72, 153, 0.6), 0 0 30px rgba(168, 85, 247, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 3
                }}
            >
                {/* Tiny inner spark */}
                <div style={{
                    width: '35%',
                    height: '35%',
                    borderRadius: '50%',
                    background: '#ffffff',
                    boxShadow: '0 0 4px #fff'
                }} />
            </motion.div>
        </div>
    );

    // Section Variant
    if (variant === 'section') {
        return (
            <div className={`lifetracker-loader-section ${className}`} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                textAlign: 'center',
                gap: '14px',
                width: '100%'
            }}>
                {LoaderGraphic}
                
                {message && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <p style={{
                            margin: 0,
                            fontSize: sizeConfig.fontSize,
                            fontWeight: '600',
                            color: 'var(--text-primary)',
                            letterSpacing: '-0.2px'
                        }}>
                            {message}
                        </p>
                        {submessage && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {submessage}
                            </span>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Fullscreen / Splash Variant
    return (
        <div 
            className={`lifetracker-loader-fullscreen ${className}`} 
            style={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary, #0f0f17)',
                zIndex: 9999,
                padding: '24px',
                textAlign: 'center'
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '20px'
                }}
            >
                {LoaderGraphic}

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    {showLogoText && (
                        <div style={{
                            fontSize: sizeConfig.titleSize,
                            fontWeight: '800',
                            background: 'linear-gradient(135deg, #c084fc 0%, #f472b6 50%, #818cf8 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            letterSpacing: '-0.5px'
                        }}>
                            LifeTracker
                        </div>
                    )}
                    
                    {message && (
                        <motion.p
                            animate={{ opacity: [0.6, 1, 0.6] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                            style={{
                                margin: 0,
                                fontSize: sizeConfig.fontSize,
                                color: 'var(--text-secondary, #94a3b8)',
                                fontWeight: '500',
                                letterSpacing: '0.1px'
                            }}
                        >
                            {message}
                        </motion.p>
                    )}

                    {submessage && (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                            {submessage}
                        </span>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default AppLoader;
