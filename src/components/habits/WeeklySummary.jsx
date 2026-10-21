import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { format, subDays, getDay, isToday as isDateToday } from 'date-fns';
import { getLocalDateStr } from '../../hooks/useHabits';

export const WeeklySummary = memo(function WeeklySummary({
  habits,
  getStatusForDate,
  selectedDate,
  onSelectDate,
}) {
  const trackRef = useRef(null);
  const rectRef = useRef(null);

  const daysData = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }).map((_, i) => {
      const day = subDays(today, 6 - i);
      const dateStr = getLocalDateStr(day);
      const dow = getDay(day);
      const isToday = isDateToday(day);
      return {
        day,
        dateStr,
        dow,
        isToday,
        label: format(day, 'EEE'),
      };
    });
  }, []);

  const activeIndex = daysData.findIndex((d) => d.dateStr === selectedDate);
  const currentActive = activeIndex !== -1 ? activeIndex : 6;

  const [hoveredIndex, setHoveredIndex] = useState(currentActive);
  const [isDragging, setIsDragging] = useState(false);

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

  if (!habits || habits.length === 0) return null;

  const computeSlotFromX = (clientX) => {
    const rect = rectRef.current || trackRef.current?.getBoundingClientRect();
    if (!rect || !rect.width) return { slot: currentActive, raw: currentActive };
    const numItems = daysData.length;
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
      const numItems = daysData.length;
      const slotWidth = rect.width / numItems;

      let raw;
      if (state.grabbedBubble) {
        raw = state.startProgress + dx / slotWidth;
        if (raw < 0) raw = raw * 0.12;
        else if (raw > numItems - 1) raw = (numItems - 1) + (raw - (numItems - 1)) * 0.12;
      } else {
        raw = computeSlotFromX(e.clientX).raw;
      }

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

    animate(slotProgress, targetSlot, {
      type: 'spring',
      stiffness: 450,
      damping: 32,
    });

    if (
      targetSlot >= 0 &&
      targetSlot < daysData.length &&
      daysData[targetSlot].dateStr !== selectedDate
    ) {
      if (!wasDragging && navigator.vibrate) {
        try {
          navigator.vibrate(6);
        } catch (err) {}
      }
      onSelectDate(daysData[targetSlot].dateStr);
    }
  };

  const activeVisualSlot = isDragging ? hoveredIndex : currentActive;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="habits-day-liquid-dock"
      role="tablist"
      aria-label="Select habit day"
    >
      <div
        className="habits-day-dock-track"
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
      >
        {/* Hardware-Accelerated Liquid Glass Capsule */}
        <motion.div
          className={`habits-day-liquid-bubble ${isDragging ? 'dragging' : ''}`}
          style={{
            width: `${100 / daysData.length}%`,
            x: bubbleX,
          }}
        >
          <div className="habits-day-liquid-bubble-glass">
            <div className="habits-day-liquid-bubble-rim" />
          </div>
        </motion.div>

        {/* 7 Day Slots */}
        {daysData.map((d, idx) => {
          const isSelected = idx === activeVisualSlot;
          const activeHabits = habits.filter(
            (h) => !h.is_paused && (h.active_days || [0, 1, 2, 3, 4, 5, 6]).includes(d.dow)
          );

          let completedCount = 0;
          activeHabits.forEach((h) => {
            if (getStatusForDate(h, d.dateStr) === 'completed') completedCount++;
          });

          const totalActive = activeHabits.length;
          const allDone = totalActive > 0 && completedCount === totalActive;
          const someDone = completedCount > 0;

          let countColor = 'var(--apple-tab-inactive, rgba(226, 232, 240, 0.56))';
          if (allDone) countColor = '#22c55e';
          else if (someDone) countColor = '#a855f7';
          else if (isSelected) countColor = 'var(--apple-tab-active, #ffffff)';

          return (
            <button
              key={d.dateStr}
              type="button"
              role="tab"
              aria-selected={idx === currentActive}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectDate(d.dateStr);
                }
              }}
              className={`habits-day-tab ${isSelected ? 'active' : ''}`}
            >
              <motion.div
                className="habits-day-tab-inner"
                animate={{
                  scale: isSelected ? 1.06 : 0.96,
                  y: isSelected ? -0.5 : 0,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <span
                  className="habits-day-label"
                  style={{
                    color: isSelected
                      ? 'var(--apple-tab-active, #ffffff)'
                      : d.isToday
                      ? 'var(--text-primary)'
                      : 'var(--apple-tab-inactive, rgba(226, 232, 240, 0.56))',
                    fontWeight: isSelected || d.isToday ? 700 : 500,
                  }}
                >
                  {d.label}
                </span>
                <span
                  className="habits-day-count"
                  style={{
                    color: countColor,
                    filter:
                      isSelected && (allDone || someDone)
                        ? `drop-shadow(0 1px 6px ${allDone ? 'rgba(34,197,94,0.45)' : 'rgba(168,85,247,0.45)'})`
                        : 'none',
                  }}
                >
                  {totalActive === 0 ? '-' : `${completedCount}/${totalActive}`}
                </span>
              </motion.div>
            </button>
          );
        })}
      </div>

      <style>{`
        .habits-day-liquid-dock {
          position: relative;
          height: 58px;
          padding: 4px;
          margin-bottom: 20px;
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
        .habits-day-liquid-dock::before {
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

        .habits-day-dock-track {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
          height: 100%;
          border-radius: 9999px;
          cursor: grab;
          touch-action: none;
        }

        .habits-day-dock-track:active {
          cursor: grabbing;
        }

        .habits-day-liquid-bubble {
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

        .habits-day-liquid-bubble-glass {
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

        .habits-day-liquid-bubble.dragging .habits-day-liquid-bubble-glass {
          transform: scale(1.05);
          background: rgba(255, 255, 255, 0.18);
        }

        .theme-light .habits-day-liquid-bubble.dragging .habits-day-liquid-bubble-glass {
          background: rgba(255, 255, 255, 0.9);
        }

        .habits-day-liquid-bubble-rim {
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

        .habits-day-tab {
          position: relative;
          flex: 1;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          padding: 0 2px;
          cursor: pointer;
          z-index: 2;
          pointer-events: none;
          -webkit-tap-highlight-color: transparent;
        }

        .habits-day-tab:active {
          transform: none !important;
        }

        .habits-day-tab-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          pointer-events: none;
        }

        .habits-day-label {
          font-size: 10px;
          line-height: 1;
          letter-spacing: -0.1px;
          transition: color 0.15s ease;
        }

        .habits-day-count {
          font-size: 12px;
          font-weight: 700;
          line-height: 1;
          font-family: monospace;
          transition: color 0.15s ease, filter 0.2s ease;
        }
      `}</style>
    </motion.div>
  );
});
