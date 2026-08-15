import React from 'react';
import { motion } from 'framer-motion';

/**
 * Custom Unified Branded Loading Animation for LifeTracker.
 * 
 * A distinctive DNA-helix–inspired double-strand animation with orbiting particles,
 * a breathing nebula core, and floating life-domain orbs (Habits, Mind, Finance, Social).
 * Designed to feel alive, organic, and uniquely LifeTracker.
 * 
 * Modes:
 * - 'fullscreen': Covers viewport with backdrop and centered animation (auth guards, page transitions).
 * - 'section': Padded section loader (in-page widgets/tabs).
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
            containerSize: 64,
            fontSize: '11px',
            titleSize: '13px',
            padding: '28px 16px'
        },
        normal: {
            containerSize: 100,
            fontSize: '13px',
            titleSize: '18px',
            padding: '40px 20px'
        },
        large: {
            containerSize: 140,
            fontSize: '14px',
            titleSize: '22px',
            padding: '50px 24px'
        }
    }[size] || {
        containerSize: 100,
        fontSize: '13px',
        titleSize: '18px',
        padding: '40px 20px'
    };

    // ─── COMPACT INLINE VARIANT ─────────────────────────────────────
    if (variant === 'inline') {
        return (
            <div className={`lt-loader-inline ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ position: 'relative', width: '20px', height: '20px' }}>
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                        style={{
                            position: 'absolute', inset: 0,
                            borderRadius: '50%',
                            border: '2px solid transparent',
                            borderTopColor: '#a855f7',
                            borderRightColor: '#6366f1'
                        }}
                    />
                    <motion.div
                        animate={{ scale: [0.7, 1.2, 0.7], opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                        style={{
                            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #a855f7, #ec4899)'
                        }}
                    />
                </div>
                {message && (
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>{message}</span>
                )}
            </div>
        );
    }

    // ─── MAIN ANIMATION (Section + Fullscreen) ─────────────────────
    const cs = sizeConfig.containerSize;

    // Derive proportional values
    const orbitRadius = cs * 0.42;
    const coreSize = cs * 0.22;
    const particleSize = cs * 0.075;
    const ringThickness = Math.max(1.5, cs * 0.02);

    // The four life-domain colors
    const domainColors = [
        { color: '#a855f7', glow: 'rgba(168, 85, 247, 0.6)' },  // Habits (Violet)
        { color: '#ec4899', glow: 'rgba(236, 72, 153, 0.6)' },   // Mind (Pink)
        { color: '#6366f1', glow: 'rgba(99, 102, 241, 0.6)' },   // Finance (Indigo)
        { color: '#10b981', glow: 'rgba(16, 185, 129, 0.6)' }    // Social (Emerald)
    ];

    const LoaderGraphic = (
        <div style={{
            position: 'relative',
            width: `${cs}px`,
            height: `${cs}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>

            {/* ── Background Nebula Aura ── */}
            <motion.div
                animate={{
                    scale: [1, 1.3, 1.05, 1.25, 1],
                    opacity: [0.3, 0.55, 0.35, 0.5, 0.3]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                    position: 'absolute',
                    width: `${cs * 1.4}px`,
                    height: `${cs * 1.4}px`,
                    borderRadius: '50%',
                    background: `radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, rgba(99, 102, 241, 0.12) 40%, rgba(16, 185, 129, 0.05) 65%, transparent 80%)`,
                    filter: `blur(${cs * 0.12}px)`,
                    zIndex: 0
                }}
            />

            {/* ── Outer Orbit Ring (dotted, slow rotation) ── */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                style={{
                    position: 'absolute',
                    width: `${cs * 0.92}px`,
                    height: `${cs * 0.92}px`,
                    borderRadius: '50%',
                    border: `${ringThickness}px dashed rgba(168, 85, 247, 0.15)`,
                    zIndex: 1
                }}
            />

            {/* ── Primary Orbit Ring (solid gradient, clockwise) ── */}
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
                style={{
                    position: 'absolute',
                    width: `${cs * 0.78}px`,
                    height: `${cs * 0.78}px`,
                    borderRadius: '50%',
                    border: `${ringThickness * 1.3}px solid transparent`,
                    borderTopColor: '#a855f7',
                    borderRightColor: '#ec4899',
                    borderBottomColor: 'rgba(99, 102, 241, 0.2)',
                    borderLeftColor: 'transparent',
                    boxShadow: '0 0 14px rgba(168, 85, 247, 0.25)',
                    zIndex: 2
                }}
            />

            {/* ── Secondary Orbit Ring (counter-clockwise) ── */}
            <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                style={{
                    position: 'absolute',
                    width: `${cs * 0.56}px`,
                    height: `${cs * 0.56}px`,
                    borderRadius: '50%',
                    border: `${ringThickness}px solid transparent`,
                    borderTopColor: '#6366f1',
                    borderLeftColor: '#10b981',
                    borderBottomColor: 'transparent',
                    boxShadow: '0 0 10px rgba(99, 102, 241, 0.2)',
                    zIndex: 3
                }}
            />

            {/* ── 4 Orbiting Life-Domain Particles ── */}
            {domainColors.map((domain, i) => {
                const angle = (i * 90); // evenly spaced 90° apart
                const duration = 2.8; // same as primary ring
                const delay = (i * duration) / 4;

                return (
                    <motion.div
                        key={i}
                        animate={{ rotate: 360 }}
                        transition={{ duration: duration, repeat: Infinity, ease: 'linear', delay: -delay }}
                        style={{
                            position: 'absolute',
                            width: `${cs * 0.78}px`,
                            height: `${cs * 0.78}px`,
                            zIndex: 5
                        }}
                    >
                        {/* The particle dot itself, positioned at the top of its orbit circle */}
                        <motion.div
                            animate={{
                                scale: [0.8, 1.3, 0.8],
                                opacity: [0.7, 1, 0.7]
                            }}
                            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.35 }}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: '50%',
                                transform: `translate(-50%, -50%)`,
                                width: `${particleSize}px`,
                                height: `${particleSize}px`,
                                borderRadius: '50%',
                                background: domain.color,
                                boxShadow: `0 0 ${particleSize * 1.5}px ${domain.glow}, 0 0 ${particleSize * 3}px ${domain.glow}`
                            }}
                        />
                    </motion.div>
                );
            })}

            {/* ── Central Breathing Nebula Core ── */}
            <motion.div
                animate={{
                    scale: [0.85, 1.15, 0.9, 1.1, 0.85],
                    opacity: [0.85, 1, 0.9, 1, 0.85]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                    width: `${coreSize}px`,
                    height: `${coreSize}px`,
                    borderRadius: '50%',
                    background: `conic-gradient(from 0deg, #a855f7, #ec4899, #6366f1, #10b981, #a855f7)`,
                    boxShadow: `
                        0 0 ${coreSize * 0.6}px rgba(168, 85, 247, 0.5),
                        0 0 ${coreSize * 1.2}px rgba(236, 72, 153, 0.3),
                        inset 0 0 ${coreSize * 0.3}px rgba(255, 255, 255, 0.2)
                    `,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 6,
                    position: 'relative'
                }}
            >
                {/* Inner white spark */}
                <motion.div
                    animate={{ scale: [0.6, 1, 0.6], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                        width: '30%',
                        height: '30%',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, #ffffff 0%, rgba(255,255,255,0.4) 100%)',
                        boxShadow: '0 0 6px #fff'
                    }}
                />
            </motion.div>
        </div>
    );

    // ─── SECTION VARIANT ────────────────────────────────────────────
    if (variant === 'section') {
        return (
            <div className={`lt-loader-section ${className}`} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: sizeConfig.padding,
                textAlign: 'center',
                gap: '16px',
                width: '100%'
            }}>
                {LoaderGraphic}
                
                {message && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <motion.p
                            animate={{ opacity: [0.6, 1, 0.6] }}
                            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                            style={{
                                margin: 0,
                                fontSize: sizeConfig.fontSize,
                                fontWeight: '600',
                                color: 'var(--text-primary)',
                                letterSpacing: '-0.2px'
                            }}
                        >
                            {message}
                        </motion.p>
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

    // ─── FULLSCREEN / SPLASH VARIANT ────────────────────────────────
    return (
        <div 
            className={`lt-loader-fullscreen ${className}`} 
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
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '24px'
                }}
            >
                {LoaderGraphic}

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    {showLogoText && (
                        <motion.div
                            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                            style={{
                                fontSize: sizeConfig.titleSize,
                                fontWeight: '800',
                                background: 'linear-gradient(90deg, #c084fc, #f472b6, #818cf8, #34d399, #c084fc)',
                                backgroundSize: '300% 100%',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                letterSpacing: '-0.5px'
                            }}
                        >
                            LifeTracker
                        </motion.div>
                    )}
                    
                    {message && (
                        <motion.p
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
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
