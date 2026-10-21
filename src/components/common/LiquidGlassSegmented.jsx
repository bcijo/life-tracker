import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, memo } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

/**
 * 120fps Apple Liquid Glass Segmented Control
 *
 * Key architecture:
 * - Measures the actual rendered `{ left, width }` of every tab button via ResizeObserver.
 * - Uses Framer Motion `useMotionValue` + `useTransform` to interpolate BOTH `x` and `width`
 *   on the GPU at 120fps without triggering React re-renders during pointer scrubbing.
 * - Guarantees zero text/emoji clipping whether `fullWidth` is true or false, and whether
 *   labels are short ("All") or long ("☀️ Morning").
 */
const LiquidGlassSegmented = memo(function LiquidGlassSegmented({
  options = [],
  value,
  onChange,
  size = 'md', // 'sm' | 'md' | 'lg'
  fullWidth = true,
  equalColumns = false, // Force equal column widths even when fullWidth=false (great for 2-item toggles)
  ariaLabel = 'Segmented control',
  style = {},
  className = '',
}) {
  const trackRef = useRef(null);
  const btnRefs = useRef([]);
  const metricsRef = useRef([]); // [{ left, width, center }]
  const trackRectRef = useRef(null);

  const numItems = options.length;
  const activeIndex = options.findIndex((o) => o.id === value);
  const currentActive = activeIndex !== -1 ? activeIndex : 0;

  const [hoveredIndex, setHoveredIndex] = useState(currentActive);
  const [isDragging, setIsDragging] = useState(false);
  const [measured, setMeasured] = useState(false);

  // Continuous float slot index: 0 .. (numItems - 1)
  const slotProgress = useMotionValue(currentActive);
  // Layout version bump to force useTransform re-evaluation when container resizes
  const layoutVersion = useMotionValue(0);

  const measureTabs = useCallback(() => {
    const trackEl = trackRef.current;
    if (!trackEl || !numItems) return;

    const trackWidth = trackEl.clientWidth;
    const nextMetrics = [];

    for (let i = 0; i < numItems; i++) {
      const btn = btnRefs.current[i];
      if (btn) {
        const left = btn.offsetLeft;
        const width = btn.offsetWidth;
        nextMetrics.push({
          left,
          width,
          center: left + width / 2,
        });
      }
    }

    if (nextMetrics.length === numItems && trackWidth > 0) {
      metricsRef.current = nextMetrics;
      layoutVersion.set(layoutVersion.get() + 1);
      if (!measured) setMeasured(true);
    }
  }, [numItems, layoutVersion, measured]);

  useLayoutEffect(() => {
    measureTabs();
  }, [measureTabs, options, size, fullWidth, equalColumns]);

  useEffect(() => {
    const trackEl = trackRef.current;
    if (!trackEl || typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver(() => {
      measureTabs();
    });
    ro.observe(trackEl);
    btnRefs.current.forEach((btn) => {
      if (btn) ro.observe(btn);
    });

    return () => ro.disconnect();
  }, [measureTabs, options.length]);

  // Interpolate exact pixel X position of the active pill from measured button positions
  const bubbleX = useTransform([slotProgress, layoutVersion], ([v]) => {
    const m = metricsRef.current;
    if (!m || m.length !== numItems) {
      return `${v * 100}%`;
    }
    if (numItems === 1) return `${m[0].left}px`;

    if (v <= 0) {
      // Subtle rubber-band past left edge
      return `${m[0].left + v * m[0].width * 0.14}px`;
    }
    if (v >= numItems - 1) {
      const last = m[numItems - 1];
      const extra = v - (numItems - 1);
      return `${last.left + extra * last.width * 0.14}px`;
    }

    const idx = Math.floor(v);
    const frac = v - idx;
    const cur = m[idx];
    const next = m[Math.min(numItems - 1, idx + 1)];
    const x = cur.left + (next.left - cur.left) * frac;
    return `${x}px`;
  });

  // Interpolate exact pixel width of the active pill so variable-width tabs morph smoothly
  const bubbleWidth = useTransform([slotProgress, layoutVersion], ([v]) => {
    const m = metricsRef.current;
    if (!m || m.length !== numItems) {
      return `${100 / Math.max(1, numItems)}%`;
    }
    if (numItems === 1) return `${m[0].width}px`;

    const clamped = Math.max(0, Math.min(numItems - 1, v));
    const idx = Math.floor(clamped);
    const frac = clamped - idx;
    const cur = m[idx];
    const next = m[Math.min(numItems - 1, idx + 1)];
    const w = cur.width + (next.width - cur.width) * frac;
    return `${w}px`;
  });

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

  useEffect(() => {
    if (!pointerStateRef.current.isDragging) {
      setHoveredIndex(currentActive);
      pointerStateRef.current.hoveredSlot = currentActive;
      const controls = animate(slotProgress, currentActive, {
        type: 'spring',
        stiffness: 460,
        damping: 33,
      });
      return () => controls.stop();
    }
  }, [currentActive, slotProgress]);

  if (!numItems) return null;

  // Map a pointer clientX coordinate to continuous slot float (0 .. numItems - 1) using actual button centers
  const computeSlotFromX = (clientX) => {
    const rect = trackRectRef.current || trackRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return { slot: currentActive, raw: currentActive, avgWidth: 80 };

    const relX = clientX - rect.left;
    const m = metricsRef.current;

    if (m && m.length === numItems) {
      // Find which button contains relX (or nearest button)
      let nearestSlot = 0;
      let minDist = Infinity;
      for (let i = 0; i < numItems; i++) {
        const dist = Math.abs(relX - m[i].center);
        if (dist < minDist) {
          minDist = dist;
          nearestSlot = i;
        }
      }

      // Compute continuous float between button centers
      let rawFloat;
      if (relX <= m[0].center) {
        const span = Math.max(1, m[0].width);
        rawFloat = ((relX - m[0].center) / span) * 0.14;
      } else if (relX >= m[numItems - 1].center) {
        const last = m[numItems - 1];
        const span = Math.max(1, last.width);
        rawFloat = numItems - 1 + ((relX - last.center) / span) * 0.14;
      } else {
        for (let i = 0; i < numItems - 1; i++) {
          const c0 = m[i].center;
          const c1 = m[i + 1].center;
          if (relX >= c0 && relX <= c1) {
            rawFloat = i + (relX - c0) / Math.max(1, c1 - c0);
            break;
          }
        }
      }

      return {
        slot: nearestSlot,
        raw: rawFloat ?? nearestSlot,
        avgWidth: rect.width / numItems,
      };
    }

    // Fallback if metrics not yet populated
    const slotWidth = rect.width / numItems;
    const rawFloat = (relX - slotWidth / 2) / slotWidth;
    let clampedFloat = rawFloat;
    if (rawFloat < 0) clampedFloat = rawFloat * 0.14;
    else if (rawFloat > numItems - 1) clampedFloat = numItems - 1 + (rawFloat - (numItems - 1)) * 0.14;

    const nearestSlot = Math.max(0, Math.min(numItems - 1, Math.floor(relX / slotWidth)));
    return { slot: nearestSlot, raw: clampedFloat, avgWidth: slotWidth };
  };

  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (!trackRef.current) return;

    measureTabs();
    trackRectRef.current = trackRef.current.getBoundingClientRect();
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
      const { raw, slot } = computeSlotFromX(e.clientX);
      slotProgress.set(raw);

      const targetIdx = state.grabbedBubble
        ? Math.max(0, Math.min(numItems - 1, Math.round(raw)))
        : slot;

      if (targetIdx !== state.hoveredSlot) {
        state.hoveredSlot = targetIdx;
        setHoveredIndex(targetIdx);
        if (navigator.vibrate) {
          try {
            navigator.vibrate(8);
          } catch (err) {}
        }
      }
    }
  };

  const handlePointerUpOrCancel = () => {
    const state = pointerStateRef.current;
    if (!state.isPressed) return;

    const wasDragging = state.isDragging;
    state.isPressed = false;
    state.isDragging = false;
    setIsDragging(false);

    const targetSlot = wasDragging ? state.hoveredSlot : state.startSlot;
    setHoveredIndex(targetSlot);

    animate(slotProgress, targetSlot, {
      type: 'spring',
      stiffness: 460,
      damping: 33,
    });

    if (
      targetSlot >= 0 &&
      targetSlot < numItems &&
      options[targetSlot].id !== value
    ) {
      if (!wasDragging && navigator.vibrate) {
        try {
          navigator.vibrate(6);
        } catch (err) {}
      }
      onChange?.(options[targetSlot].id);
    }
  };

  const activeVisualSlot = isDragging ? hoveredIndex : currentActive;
  const activeOption = options[activeVisualSlot];
  const activeAccentColor = activeOption?.color || activeOption?.accentColor || null;

  // Use equal-width grid columns when fullWidth=true, equalColumns=true, or 2-item toggle
  const useEqualGrid = fullWidth || equalColumns || numItems === 2;

  const heightMap = {
    sm: 38,
    md: 44,
    lg: 50,
  };
  const fontSizeMap = {
    sm: 12,
    md: 13,
    lg: 14,
  };

  return (
    <div
      className={`apple-liquid-seg-dock size-${size} ${fullWidth ? 'is-full' : 'is-fit'} ${className}`}
      role="tablist"
      aria-label={ariaLabel}
      style={{
        height: heightMap[size] || 44,
        width: fullWidth ? '100%' : 'fit-content',
        maxWidth: '100%',
        ...style,
      }}
    >
      <div
        className={`apple-liquid-seg-track ${useEqualGrid ? 'equal-grid' : 'auto-flex'}`}
        ref={trackRef}
        style={
          useEqualGrid
            ? { gridTemplateColumns: `repeat(${numItems}, minmax(0, 1fr))` }
            : undefined
        }
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
      >
        {/* Hardware-Accelerated Morphing Liquid Glass Pill */}
        <motion.div
          className={`apple-liquid-seg-bubble ${isDragging ? 'dragging' : ''}`}
          style={{
            width: bubbleWidth,
            x: bubbleX,
          }}
        >
          <div
            className="apple-liquid-seg-bubble-glass"
            style={
              activeAccentColor
                ? {
                    background: `linear-gradient(180deg, color-mix(in srgb, ${activeAccentColor} 22%, rgba(255,255,255,0.16)) 0%, color-mix(in srgb, ${activeAccentColor} 14%, rgba(255,255,255,0.08)) 100%)`,
                    boxShadow: `inset 0 1px 0 0 rgba(255, 255, 255, 0.38), 0 4px 14px -2px color-mix(in srgb, ${activeAccentColor} 32%, rgba(0, 0, 0, 0.45))`,
                  }
                : undefined
            }
          >
            <div
              className="apple-liquid-seg-bubble-rim"
              style={
                activeAccentColor
                  ? {
                      background: `linear-gradient(135deg, rgba(255,255,255,0.55) 0%, color-mix(in srgb, ${activeAccentColor} 50%, rgba(255,255,255,0.15)) 50%, rgba(255,255,255,0.35) 100%)`,
                    }
                  : undefined
              }
            />
          </div>
        </motion.div>

        {/* Option Buttons */}
        {options.map((opt, idx) => {
          const isSelected = idx === activeVisualSlot;
          const Icon = opt.icon;
          const optAccent = opt.color || opt.accentColor;

          return (
            <button
              key={opt.id}
              ref={(el) => {
                btnRefs.current[idx] = el;
              }}
              type="button"
              role="tab"
              aria-selected={idx === currentActive}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onChange?.(opt.id);
                }
              }}
              className={`apple-liquid-seg-tab ${isSelected ? 'active' : ''}`}
              style={{
                fontSize: fontSizeMap[size] || 13,
                padding: fullWidth
                  ? '0 10px'
                  : size === 'sm'
                  ? '0 16px'
                  : '0 20px',
                color: isSelected
                  ? optAccent || 'var(--apple-tab-active, #ffffff)'
                  : 'var(--apple-tab-inactive, rgba(226, 232, 240, 0.62))',
              }}
            >
              <motion.div
                className="apple-liquid-seg-tab-inner"
                animate={{
                  scale: isSelected ? 1.02 : 0.98,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
              >
                {Icon && (
                  <span
                    className="apple-liquid-seg-icon"
                    style={
                      isSelected && optAccent
                        ? {
                            color: optAccent,
                            filter: `drop-shadow(0 2px 6px ${optAccent}55)`,
                          }
                        : undefined
                    }
                  >
                    {typeof Icon === 'function' || typeof Icon === 'object' ? (
                      <Icon
                        size={size === 'sm' ? 13.5 : 15}
                        strokeWidth={isSelected ? 2.4 : 1.9}
                      />
                    ) : (
                      <span>{Icon}</span>
                    )}
                  </span>
                )}
                {opt.emoji && (
                  <span
                    className="apple-liquid-seg-emoji"
                    style={{ fontSize: size === 'sm' ? 12.5 : 14 }}
                  >
                    {opt.emoji}
                  </span>
                )}
                <span className="apple-liquid-seg-label">{opt.label}</span>
                {opt.count !== undefined && (
                  <span
                    className="apple-liquid-seg-count"
                    style={{
                      background: isSelected
                        ? 'rgba(168, 85, 247, 0.22)'
                        : 'rgba(255, 255, 255, 0.06)',
                      color: isSelected
                        ? optAccent || 'var(--apple-tab-active, #ffffff)'
                        : 'var(--apple-tab-inactive, rgba(226, 232, 240, 0.6))',
                    }}
                  >
                    {opt.count}
                  </span>
                )}
                {typeof opt.badge === 'string' || typeof opt.badge === 'number' ? (
                  <span
                    className="apple-liquid-seg-text-badge"
                    style={{
                      opacity: isSelected ? 0.95 : 0.65,
                    }}
                  >
                    {opt.badge}
                  </span>
                ) : opt.badge ? (
                  <span className="apple-liquid-seg-dot" />
                ) : null}
              </motion.div>
            </button>
          );
        })}
      </div>

      <style>{`
        .apple-liquid-seg-dock {
          position: relative;
          padding: 3px;
          border-radius: 9999px;
          background: var(--apple-dock-bg, rgba(18, 20, 32, 0.62));
          backdrop-filter: blur(28px) saturate(190%);
          -webkit-backdrop-filter: blur(28px) saturate(190%);
          box-shadow:
            inset 0 1px 2px rgba(0, 0, 0, 0.35),
            inset 0 1px 0 0 rgba(255, 255, 255, 0.14),
            0 6px 20px -6px rgba(0, 0, 0, 0.32);
          user-select: none;
          -webkit-user-select: none;
          touch-action: pan-y;
          transform: translateZ(0);
          box-sizing: border-box;
        }

        .theme-light .apple-liquid-seg-dock {
          background: rgba(238, 240, 246, 0.72);
          box-shadow:
            inset 0 1px 2px rgba(15, 23, 42, 0.06),
            inset 0 1px 0 0 rgba(255, 255, 255, 0.8),
            0 6px 18px -6px rgba(24, 28, 48, 0.1);
        }

        .apple-liquid-seg-dock.size-md,
        .apple-liquid-seg-dock.size-lg {
          padding: 3.5px;
        }

        /* Subtle 1px Fresnel Perimeter Rim */
        .apple-liquid-seg-dock::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: var(--apple-dock-rim, linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.22) 0%,
            rgba(255, 255, 255, 0.06) 50%,
            rgba(255, 255, 255, 0.14) 100%
          ));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          z-index: 3;
        }

        .apple-liquid-seg-track {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 9999px;
          cursor: grab;
          touch-action: none;
          box-sizing: border-box;
        }

        .apple-liquid-seg-track.equal-grid {
          display: grid;
          align-items: center;
        }

        .apple-liquid-seg-track.auto-flex {
          display: inline-flex;
          align-items: center;
          width: 100%;
        }

        .apple-liquid-seg-dock.is-full .apple-liquid-seg-track.auto-flex .apple-liquid-seg-tab {
          flex: 1 1 auto;
        }

        .apple-liquid-seg-track:active {
          cursor: grabbing;
        }

        .apple-liquid-seg-bubble {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          height: 100%;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          box-sizing: border-box;
          will-change: transform, width;
        }

        .apple-liquid-seg-bubble-glass {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 9999px;
          background: var(--apple-lens-bg, linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.16) 0%,
            rgba(255, 255, 255, 0.09) 100%
          ));
          box-shadow: var(--apple-lens-shadow,
            inset 0 1px 0 0 rgba(255, 255, 255, 0.38),
            0 3px 12px -1px rgba(0, 0, 0, 0.42)
          );
          transition: transform 0.16s cubic-bezier(0.22, 1, 0.36, 1), background 0.18s ease, box-shadow 0.18s ease;
        }

        .theme-light .apple-liquid-seg-bubble-glass {
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.96) 0%,
            rgba(255, 255, 255, 0.84) 100%
          );
          box-shadow:
            inset 0 1px 0 0 rgba(255, 255, 255, 1),
            0 3px 10px -1px rgba(24, 28, 48, 0.12);
        }

        .apple-liquid-seg-bubble.dragging .apple-liquid-seg-bubble-glass {
          transform: scale(1.03);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.22) 0%,
            rgba(255, 255, 255, 0.13) 100%
          );
        }

        .theme-light .apple-liquid-seg-bubble.dragging .apple-liquid-seg-bubble-glass {
          background: #ffffff;
        }

        .apple-liquid-seg-bubble-rim {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: var(--apple-lens-rim, linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.46) 0%,
            rgba(255, 255, 255, 0.12) 50%,
            rgba(255, 255, 255, 0.28) 100%
          ));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }

        .apple-liquid-seg-tab {
          position: relative;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          font-weight: 600;
          letter-spacing: -0.01em;
          cursor: pointer;
          white-space: nowrap;
          z-index: 2;
          pointer-events: none;
          -webkit-tap-highlight-color: transparent;
          transition: color 0.18s ease;
          box-sizing: border-box;
        }

        .apple-liquid-seg-tab:active {
          transform: none !important;
        }

        .apple-liquid-seg-tab.active {
          font-weight: 700;
          text-shadow: 0 1px 8px rgba(0, 0, 0, 0.22);
        }

        .theme-light .apple-liquid-seg-tab.active {
          text-shadow: none;
        }

        .apple-liquid-seg-tab-inner {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5.5px;
          pointer-events: none;
          line-height: 1;
        }

        .apple-liquid-seg-icon,
        .apple-liquid-seg-emoji {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          line-height: 1;
          transition: color 0.2s ease, filter 0.25s ease;
        }

        .apple-liquid-seg-tab.active .apple-liquid-seg-icon {
          color: var(--apple-tab-icon-active, #ffffff);
          filter: drop-shadow(0 2px 8px var(--apple-tab-glow, rgba(168, 85, 247, 0.45)));
        }

        .apple-liquid-seg-label {
          line-height: 1;
        }

        .apple-liquid-seg-count {
          font-size: 10px;
          font-weight: 800;
          font-family: monospace;
          padding: 2px 5.5px;
          border-radius: 9999px;
          line-height: 1;
          transition: all 0.18s ease;
        }

        .apple-liquid-seg-text-badge {
          font-size: 9.5px;
          font-weight: 700;
          opacity: 0.75;
          line-height: 1;
        }

        .apple-liquid-seg-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ef4444;
          box-shadow: 0 0 6px rgba(239, 68, 68, 0.6);
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
});

export default LiquidGlassSegmented;
