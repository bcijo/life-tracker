import React, { useState, useEffect, useRef, memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutGrid, BarChart3, Tag, Target, ShoppingCart
} from 'lucide-react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import ExpensesView from '../components/finances/ExpensesView';
import AnalyticsView from '../components/finances/AnalyticsView';
import CategoriesView from '../components/finances/CategoriesView';
import BudgetsView from '../components/finances/BudgetsView';
import ShoppingView from '../components/finances/ShoppingView';

const TABS = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'categories', label: 'Categories', icon: Tag },
    { id: 'budgets', label: 'Budgets', icon: Target },
    { id: 'shopping', label: 'Shopping', icon: ShoppingCart },
];

// Isolated Liquid Glass Tab Bar so dragging never re-renders heavy Finance views
const FinancesLiquidBar = memo(({ currentActive, onSelectTab }) => {
    const trackRef = useRef(null);
    const rectRef = useRef(null);

    const [hoveredIndex, setHoveredIndex] = useState(currentActive);
    const [isDragging, setIsDragging] = useState(false);

    // Motion value in slot units (0 .. TABS.length - 1) for 120fps zero-rerender dragging
    const slotProgress = useMotionValue(currentActive);
    const bubbleX = useTransform(slotProgress, (v) => `${v * 100}%`);

    const pointerStateRef = useRef({
        isPressed: false,
        isDragging: false,
        startX: 0,
        startY: 0,
        startSlot: currentActive,
        startProgress: currentActive,
        grabbedBubble: false,
        hoveredSlot: currentActive,
    });

    // Animate smoothly when currentActive changes externally or via tap
    useEffect(() => {
        if (!pointerStateRef.current.isDragging) {
            setHoveredIndex(currentActive);
            pointerStateRef.current.hoveredSlot = currentActive;
            const controls = animate(slotProgress, currentActive, {
                type: 'spring',
                stiffness: 450,
                damping: 32,
            });
            return () => controls.stop();
        }
    }, [currentActive, slotProgress]);

    const computeSlotFromX = (clientX) => {
        const rect = rectRef.current || trackRef.current?.getBoundingClientRect();
        if (!rect || !rect.width) return { slot: currentActive, raw: currentActive };
        const numItems = TABS.length;
        const slotWidth = rect.width / numItems;
        const relX = clientX - rect.left;
        const rawFloat = (relX - slotWidth / 2) / slotWidth;

        let clampedFloat = rawFloat;
        if (rawFloat < 0) {
            clampedFloat = rawFloat * 0.12;
        } else if (rawFloat > numItems - 1) {
            clampedFloat = (numItems - 1) + (rawFloat - (numItems - 1)) * 0.12;
        }

        const nearestSlot = Math.max(
            0,
            Math.min(numItems - 1, Math.floor(relX / slotWidth))
        );
        return { slot: nearestSlot, raw: clampedFloat, slotWidth };
    };

    const handlePointerDown = (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        if (!trackRef.current) return;

        rectRef.current = trackRef.current.getBoundingClientRect();
        const { slot } = computeSlotFromX(e.clientX);
        const currentPos = slotProgress.get();

        pointerStateRef.current = {
            isPressed: true,
            isDragging: false,
            startX: e.clientX,
            startY: e.clientY,
            startSlot: slot,
            startProgress: currentPos,
            grabbedBubble: slot === currentActive,
            hoveredSlot: currentActive,
        };

        try {
            e.currentTarget.setPointerCapture(e.pointerId);
        } catch (err) {}
    };

    const handlePointerMove = (e) => {
        const state = pointerStateRef.current;
        if (!state.isPressed) return;

        const dx = e.clientX - state.startX;
        const dy = e.clientY - state.startY;

        if (!state.isDragging && Math.abs(dx) > 4 && Math.abs(dx) > Math.abs(dy)) {
            state.isDragging = true;
            setIsDragging(true);
            // If user started dragging from another slot, smoothly glide to finger
            if (!state.grabbedBubble) {
                const { raw, slot } = computeSlotFromX(e.clientX);
                animate(slotProgress, raw, {
                    type: 'spring',
                    stiffness: 600,
                    damping: 35,
                });
                if (slot !== state.hoveredSlot) {
                    state.hoveredSlot = slot;
                    setHoveredIndex(slot);
                }
                return;
            }
        }

        if (state.isDragging) {
            const rect = rectRef.current;
            if (!rect || !rect.width) return;
            const numItems = TABS.length;
            const slotWidth = rect.width / numItems;

            let raw;
            if (state.grabbedBubble) {
                // Direct 1:1 offset dragging just like the bottom nav bubble
                raw = state.startProgress + dx / slotWidth;
                if (raw < 0) raw = raw * 0.12;
                else if (raw > numItems - 1) raw = (numItems - 1) + (raw - (numItems - 1)) * 0.12;
            } else {
                raw = computeSlotFromX(e.clientX).raw;
            }

            // Instant 120fps motion-value update — zero React re-renders!
            slotProgress.set(raw);

            const targetIdx = Math.max(0, Math.min(numItems - 1, Math.round(raw)));
            if (targetIdx !== state.hoveredSlot) {
                state.hoveredSlot = targetIdx;
                setHoveredIndex(targetIdx);
                if (navigator.vibrate) {
                    try {
                        navigator.vibrate(10);
                    } catch (err) {}
                }
            }
        }
    };

    const handlePointerUpOrCancel = (e) => {
        const state = pointerStateRef.current;
        if (!state.isPressed) return;

        const wasDragging = state.isDragging;
        state.isPressed = false;
        state.isDragging = false;
        setIsDragging(false);

        const targetSlot = wasDragging ? state.hoveredSlot : state.startSlot;
        setHoveredIndex(targetSlot);

        // Snap the liquid pill into the target slot with spring physics
        animate(slotProgress, targetSlot, {
            type: 'spring',
            stiffness: 450,
            damping: 32,
        });

        if (targetSlot >= 0 && targetSlot < TABS.length && targetSlot !== currentActive) {
            if (!wasDragging && navigator.vibrate) {
                try {
                    navigator.vibrate(6);
                } catch (err) {}
            }
            onSelectTab(TABS[targetSlot].id);
        }
    };

    const activeVisualSlot = isDragging ? hoveredIndex : currentActive;

    return (
        <div
            className="finances-liquid-dock"
            role="tablist"
            aria-label="Finances sections"
        >
            <div
                className="finances-dock-track"
                ref={trackRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUpOrCancel}
                onPointerCancel={handlePointerUpOrCancel}
            >
                {/* Hardware-Accelerated Liquid Glass Bubble */}
                <motion.div
                    className={`finances-liquid-bubble ${isDragging ? 'dragging' : ''}`}
                    style={{
                        width: `${100 / TABS.length}%`,
                        x: bubbleX,
                    }}
                >
                    <div className="finances-liquid-bubble-glass">
                        <div className="finances-liquid-bubble-rim" />
                    </div>
                </motion.div>

                {/* Section Tabs */}
                {TABS.map((tab, idx) => {
                    const isSelected = idx === activeVisualSlot;
                    const Icon = tab.icon;

                    return (
                        <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={idx === currentActive}
                            title={tab.label}
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    onSelectTab(tab.id);
                                }
                            }}
                            className={`finances-nav-tab ${isSelected ? 'active' : ''}`}
                        >
                            <motion.div
                                className="finances-tab-inner"
                                animate={{
                                    scale: isSelected ? 1.05 : 0.95,
                                    y: isSelected ? -0.5 : 0,
                                }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            >
                                <span className="finances-tab-icon">
                                    <Icon
                                        size={18}
                                        strokeWidth={isSelected ? 2.35 : 1.85}
                                    />
                                </span>
                                <span className="finances-tab-text">{tab.label}</span>
                            </motion.div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
});

const Finances = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Determine active tab from URL
    const getTabFromPath = () => {
        if (location.pathname.includes('/finances/analytics')) return 'analytics';
        if (location.pathname.includes('/finances/categories')) return 'categories';
        if (location.pathname.includes('/finances/budgets')) return 'budgets';
        if (location.pathname.includes('/finances/shopping')) return 'shopping';
        return 'overview';
    };

    const [activeTab, setActiveTab] = useState(getTabFromPath());

    useEffect(() => {
        setActiveTab(getTabFromPath());
    }, [location.pathname]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === 'overview') navigate('/finances');
        else navigate(`/finances/${tab}`);
    };

    const activeIndex = TABS.findIndex(t => t.id === activeTab);
    const currentActive = activeIndex !== -1 ? activeIndex : 0;

    return (
        <div className="page-container finances-hub" style={{ position: 'relative' }}>
            {/* Header */}
            <header className="finances-header" style={{ marginBottom: '18px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
                        Finances
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '3px 0 0 0' }}>
                        Track, forecast, and optimize your wealth
                    </p>
                </div>
            </header>

            {/* Isolated 120fps Apple Liquid Glass Segmented Tab Bar */}
            <FinancesLiquidBar
                currentActive={currentActive}
                onSelectTab={handleTabChange}
            />

            {/* Tab Views */}
            <div className="tab-content-wrapper" style={{ animation: 'fadeIn 0.35s ease' }}>
                {activeTab === 'overview' && <ExpensesView />}
                {activeTab === 'analytics' && <AnalyticsView />}
                {activeTab === 'categories' && <CategoriesView />}
                {activeTab === 'budgets' && <BudgetsView />}
                {activeTab === 'shopping' && <ShoppingView />}
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .finances-liquid-dock {
                    position: sticky;
                    top: 70px;
                    z-index: 85;
                    height: 52px;
                    padding: 4px;
                    margin-bottom: 22px;
                    border-radius: 9999px;
                    background: var(--apple-dock-bg, rgba(22, 22, 34, 0.52));
                    backdrop-filter: blur(28px) saturate(190%);
                    -webkit-backdrop-filter: blur(28px) saturate(190%);
                    box-shadow: var(--apple-dock-shadow,
                        inset 0 1px 0 0 rgba(255, 255, 255, 0.22),
                        0 12px 28px -6px rgba(0, 0, 0, 0.45),
                        0 4px 12px -2px rgba(0, 0, 0, 0.25)
                    );
                    user-select: none;
                    -webkit-user-select: none;
                    touch-action: pan-y;
                    transform: translateZ(0);
                }

                /* 1px Fresnel Specular Rim Border */
                .finances-liquid-dock::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: inherit;
                    padding: 1px;
                    background: var(--apple-dock-rim, linear-gradient(
                        135deg,
                        rgba(255, 255, 255, 0.32) 0%,
                        rgba(255, 255, 255, 0.08) 50%,
                        rgba(255, 255, 255, 0.22) 100%
                    ));
                    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor;
                    mask-composite: exclude;
                    pointer-events: none;
                    z-index: 3;
                }

                .finances-dock-track {
                    position: relative;
                    display: grid;
                    grid-template-columns: repeat(5, minmax(0, 1fr));
                    align-items: center;
                    width: 100%;
                    height: 100%;
                    border-radius: 9999px;
                    cursor: grab;
                    touch-action: none;
                }

                .finances-dock-track:active {
                    cursor: grabbing;
                }

                .finances-liquid-bubble {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    left: 0;
                    height: 100%;
                    z-index: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1px 2px;
                    pointer-events: none;
                    box-sizing: border-box;
                    will-change: transform;
                }

                .finances-liquid-bubble-glass {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    border-radius: 9999px;
                    background: var(--apple-lens-bg, rgba(255, 255, 255, 0.12));
                    box-shadow: var(--apple-lens-shadow,
                        inset 0 1px 0 0 rgba(255, 255, 255, 0.35),
                        0 4px 16px -2px rgba(0, 0, 0, 0.38)
                    );
                    transition: transform 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
                }

                .finances-liquid-bubble.dragging .finances-liquid-bubble-glass {
                    transform: scale(1.05);
                    background: rgba(255, 255, 255, 0.18);
                }

                .theme-light .finances-liquid-bubble.dragging .finances-liquid-bubble-glass {
                    background: rgba(255, 255, 255, 0.9);
                }

                .finances-liquid-bubble-rim {
                    position: absolute;
                    inset: 0;
                    border-radius: inherit;
                    padding: 1px;
                    background: var(--apple-lens-rim, linear-gradient(
                        135deg,
                        rgba(255, 255, 255, 0.48) 0%,
                        rgba(255, 255, 255, 0.12) 50%,
                        rgba(255, 255, 255, 0.32) 100%
                    ));
                    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor;
                    mask-composite: exclude;
                    pointer-events: none;
                }

                .finances-nav-tab {
                    position: relative;
                    flex: 1;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: none;
                    background: transparent;
                    color: var(--apple-tab-inactive, rgba(226, 232, 240, 0.56));
                    font-size: 13px;
                    font-weight: 600;
                    padding: 0 10px;
                    cursor: pointer;
                    white-space: nowrap;
                    z-index: 2;
                    pointer-events: none;
                    -webkit-tap-highlight-color: transparent;
                    transition: color 0.2s ease;
                }

                .finances-nav-tab:active {
                    transform: none !important;
                }

                .finances-nav-tab.active {
                    color: var(--apple-tab-active, #ffffff);
                    font-weight: 700;
                }

                .finances-tab-inner {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 7px;
                    pointer-events: none;
                }

                .finances-tab-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: color 0.2s ease, filter 0.25s ease;
                }

                .finances-nav-tab.active .finances-tab-icon {
                    color: var(--apple-tab-icon-active, #ffffff);
                    filter: drop-shadow(0 2px 8px var(--apple-tab-glow, rgba(168, 85, 247, 0.45)));
                }

                @media (max-width: 640px) {
                    .finances-tab-text {
                        display: none !important;
                    }
                    .finances-nav-tab {
                        padding: 0 6px !important;
                        min-width: unset !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default Finances;
