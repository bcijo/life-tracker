import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Share2,
    Download,
    Copy,
    X,
    Check,
    Sparkles,
    ChevronLeft,
    ChevronRight,
    Calendar,
    ShieldCheck,
    Clock,
    RefreshCw,
    LayoutGrid,
    Flame,
    Wallet,
    ChevronDown
} from 'lucide-react';
import {
    subDays,
    addDays,
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    addMonths,
    subMonths
} from 'date-fns';
import { getLocalDateStr, parseLocalDate } from '../../hooks/useHabits';
import { computeDailyReportData, renderDailyReportCard } from '../../utils/dailyReportCard';
import { shareImage, downloadBlob, copyImage, canShareFiles } from '../../utils/shareCard';
import { generateDailyReportSuggestions } from '../../lib/groq';

const TEMPLATES = [
    { id: 'minimal', label: 'Minimal', icon: Sparkles },
    { id: 'habits', label: 'Habits', icon: Flame },
    { id: 'spending', label: 'Spending', icon: Wallet },
    { id: 'detailed', label: 'Detailed', icon: LayoutGrid },
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DailyReportModal = ({
    initialDateStr,
    habits = [],
    todos = [],
    transactions = [],
    budgets = [],
    getStatusForDate,
    onClose,
}) => {
    const todayStr = getLocalDateStr(new Date());
    const yesterdayStr = getLocalDateStr(subDays(new Date(), 1));
    const currentHour = new Date().getHours();
    const isDayCompletedTime = currentHour >= 20; // 8:00 PM or later counts as end-of-day

    const [selectedDate, setSelectedDate] = useState(
        initialDateStr || (isDayCompletedTime ? todayStr : yesterdayStr)
    );
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(() => parseLocalDate(
        initialDateStr || (isDayCompletedTime ? todayStr : yesterdayStr)
    ));
    const nativeDateInputRef = useRef(null);

    const [template, setTemplate] = useState('minimal');
    const [aiSuggestionsByDate, setAiSuggestionsByDate] = useState({});
    const [loadingAi, setLoadingAi] = useState(false);

    const [blob, setBlob] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState('');

    // Keep calendar month synced when selectedDate changes
    useEffect(() => {
        setCalendarMonth(parseLocalDate(selectedDate));
    }, [selectedDate]);

    const trackingStartDate = useMemo(() => {
        return localStorage.getItem('life_tracker_tracking_start') || null;
    }, []);

    const report = useMemo(() => {
        return computeDailyReportData({
            dateStr: selectedDate,
            habits,
            todos,
            transactions,
            budgets,
            getStatusForDate,
            trackingStartDate,
        });
    }, [selectedDate, habits, todos, transactions, budgets, getStatusForDate, trackingStartDate]);

    const activeSuggestions = aiSuggestionsByDate[selectedDate] || report.defaultSuggestions;

    // Render the PNG card whenever the selected date, template, or AI suggestions change
    useEffect(() => {
        let cancelled = false;
        let url = null;
        renderDailyReportCard({
            report,
            suggestions: activeSuggestions,
            template,
        })
            .then(b => {
                if (cancelled) return;
                url = URL.createObjectURL(b);
                setBlob(b);
                setPreviewUrl(url);
            })
            .catch(err => console.error('Daily report card render failed:', err));

        return () => {
            cancelled = true;
            if (url) URL.revokeObjectURL(url);
        };
    }, [report, activeSuggestions, template]);

    const flash = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(''), 2600);
    };

    const handleGenerateAiTips = async () => {
        if (loadingAi) return;
        setLoadingAi(true);
        try {
            const tips = await generateDailyReportSuggestions(report);
            if (tips && tips.length > 0) {
                setAiSuggestionsByDate(prev => ({
                    ...prev,
                    [selectedDate]: tips,
                }));
                flash('AI Coach insights updated on your card!');
            } else {
                flash('Using smart coach insights');
            }
        } catch (err) {
            console.error(err);
            flash('Could not reach AI Coach — using smart insights');
        } finally {
            setLoadingAi(false);
        }
    };

    const stepDate = (deltaDays) => {
        const current = parseLocalDate(selectedDate);
        const next = deltaDays < 0 ? subDays(current, Math.abs(deltaDays)) : addDays(current, deltaDays);
        const nextStr = getLocalDateStr(next);
        if (nextStr <= todayStr) {
            setSelectedDate(nextStr);
        }
    };

    // Calendar grid days for the currently viewed month
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(calendarMonth);
        const monthEnd = endOfMonth(monthStart);
        const gridStart = startOfWeek(monthStart);
        const gridEnd = endOfWeek(monthEnd);
        return eachDayOfInterval({ start: gridStart, end: gridEnd });
    }, [calendarMonth]);

    const canGoNextMonth = useMemo(() => {
        const nextMonthStart = startOfMonth(addMonths(calendarMonth, 1));
        return getLocalDateStr(nextMonthStart) <= todayStr;
    }, [calendarMonth, todayStr]);

    const filename = `daily-report-${template}-${selectedDate}.png`;
    const nativeShare = blob ? canShareFiles(blob) : false;

    const handleShare = async () => {
        if (!blob) return;
        setBusy(true);
        try {
            const res = await shareImage(blob, filename);
            if (res === 'downloaded') {
                flash('Report image downloaded (direct share not supported on this browser)');
            }
        } finally {
            setBusy(false);
        }
    };

    const handleCopy = async () => {
        if (!blob) return;
        try {
            await copyImage(blob);
            flash('Report copied to clipboard! Paste directly into WhatsApp.');
        } catch {
            flash('Copy not supported in this browser — use Download instead.');
        }
    };

    const isViewingToday = selectedDate === todayStr;
    const isViewingYesterday = selectedDate === yesterdayStr;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 110,
                background: 'rgba(0,0,0,0.80)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 14,
            }}
            onClick={onClose}
        >
            <motion.div
                id="daily-report-modal"
                initial={{ opacity: 0, scale: 0.94, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 14 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: 440,
                    maxHeight: '94vh',
                    overflowY: 'auto',
                    background: 'var(--surface-elevated, #151421)',
                    border: '1px solid rgba(168,85,247,0.35)',
                    borderRadius: 24,
                    padding: '18px 16px',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.65), 0 0 40px rgba(168,85,247,0.16)',
                    position: 'relative',
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>
                                Daily Report Card
                            </h3>
                            <span style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '2px 7px',
                                borderRadius: 999,
                                background: 'rgba(34,197,94,0.14)',
                                color: '#4ade80',
                                border: '1px solid rgba(34,197,94,0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                            }}>
                                <ShieldCheck size={11} /> Masked
                            </span>
                        </div>
                        <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                            Choose a template · Zero sensitive details exposed
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        style={{
                            width: 32,
                            height: 32,
                            borderRadius: 10,
                            border: 'none',
                            cursor: 'pointer',
                            background: 'var(--surface-input, rgba(255,255,255,0.06))',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Template Selector Bar */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 4,
                    padding: 3,
                    borderRadius: 12,
                    background: 'var(--surface-input, rgba(255,255,255,0.04))',
                    border: '1px solid var(--border-subtle, rgba(255,255,255,0.08))',
                    marginBottom: 10,
                }}>
                    {TEMPLATES.map((t) => {
                        const Icon = t.icon;
                        const active = template === t.id;
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setTemplate(t.id)}
                                style={{
                                    padding: '7px 4px',
                                    borderRadius: 9,
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    fontFamily: 'inherit',
                                    transition: 'all 0.15s',
                                    background: active ? 'linear-gradient(135deg, #a855f7, #ec4899)' : 'transparent',
                                    color: active ? '#fff' : 'var(--text-muted, rgba(255,255,255,0.6))',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 4,
                                }}
                            >
                                <Icon size={12} />
                                {t.label}
                            </button>
                        );
                    })}
                </div>

                {/* Date Navigation & Interactive Calendar Picker */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 14,
                    padding: '9px 10px',
                    marginBottom: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <button
                            type="button"
                            onClick={() => stepDate(-1)}
                            style={{
                                width: 30,
                                height: 30,
                                borderRadius: 8,
                                border: '1px solid rgba(255,255,255,0.08)',
                                background: 'rgba(255,255,255,0.04)',
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                            }}
                            title="Previous day"
                        >
                            <ChevronLeft size={15} />
                        </button>

                        {/* Clickable Date Button that toggles the built-in Calendar Grid */}
                        <button
                            type="button"
                            onClick={() => setShowCalendar(prev => !prev)}
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                fontSize: 12.5,
                                fontWeight: 700,
                                fontFamily: 'inherit',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                padding: '6px 12px',
                                borderRadius: 8,
                                background: showCalendar ? 'rgba(168,85,247,0.22)' : 'rgba(168,85,247,0.10)',
                                border: '1px solid rgba(168,85,247,0.35)',
                                transition: 'all 0.15s',
                            }}
                            title="Click to pick any date from calendar"
                        >
                            <Calendar size={13} color="#c084fc" />
                            <span>{format(parseLocalDate(selectedDate), 'EEE, MMM d, yyyy')}</span>
                            <ChevronDown
                                size={13}
                                color="#c084fc"
                                style={{
                                    transform: showCalendar ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s',
                                }}
                            />
                        </button>

                        <button
                            type="button"
                            disabled={selectedDate >= todayStr}
                            onClick={() => stepDate(1)}
                            style={{
                                width: 30,
                                height: 30,
                                borderRadius: 8,
                                border: '1px solid rgba(255,255,255,0.08)',
                                background: 'rgba(255,255,255,0.04)',
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: selectedDate >= todayStr ? 'not-allowed' : 'pointer',
                                opacity: selectedDate >= todayStr ? 0.35 : 1,
                            }}
                            title="Next day"
                        >
                            <ChevronRight size={15} />
                        </button>
                    </div>

                    {/* Expandable Interactive Calendar Grid */}
                    <AnimatePresence>
                        {showCalendar && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{ overflow: 'hidden' }}
                            >
                                <div style={{
                                    background: 'rgba(12, 10, 24, 0.85)',
                                    border: '1px solid rgba(168,85,247,0.28)',
                                    borderRadius: 12,
                                    padding: '10px',
                                    marginTop: 2,
                                    marginBottom: 4,
                                }}>
                                    {/* Month/Year Header + Direct Date Input */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom: 8,
                                    }}>
                                        <button
                                            type="button"
                                            onClick={() => setCalendarMonth(m => subMonths(m, 1))}
                                            style={{
                                                width: 26,
                                                height: 26,
                                                borderRadius: 7,
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                background: 'rgba(255,255,255,0.05)',
                                                color: 'var(--text-primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                            }}
                                            title="Previous month"
                                        >
                                            <ChevronLeft size={14} />
                                        </button>

                                        <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-primary)' }}>
                                            {format(calendarMonth, 'MMMM yyyy')}
                                        </span>

                                        <button
                                            type="button"
                                            disabled={!canGoNextMonth}
                                            onClick={() => canGoNextMonth && setCalendarMonth(m => addMonths(m, 1))}
                                            style={{
                                                width: 26,
                                                height: 26,
                                                borderRadius: 7,
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                background: 'rgba(255,255,255,0.05)',
                                                color: 'var(--text-primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: canGoNextMonth ? 'pointer' : 'not-allowed',
                                                opacity: canGoNextMonth ? 1 : 0.3,
                                            }}
                                            title="Next month"
                                        >
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>

                                    {/* Weekday headers */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(7, 1fr)',
                                        gap: 2,
                                        marginBottom: 4,
                                        textAlign: 'center',
                                    }}>
                                        {WEEKDAYS.map(w => (
                                            <span key={w} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>
                                                {w}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Days grid */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(7, 1fr)',
                                        gap: 3,
                                    }}>
                                        {calendarDays.map(day => {
                                            const dStr = getLocalDateStr(day);
                                            const isSelected = dStr === selectedDate;
                                            const isFutureDay = dStr > todayStr;
                                            const inCurrentMonth = isSameMonth(day, calendarMonth);
                                            const isTodayCell = dStr === todayStr;

                                            return (
                                                <button
                                                    key={dStr}
                                                    type="button"
                                                    disabled={isFutureDay}
                                                    onClick={() => {
                                                        setSelectedDate(dStr);
                                                        setShowCalendar(false);
                                                    }}
                                                    style={{
                                                        height: 30,
                                                        borderRadius: 8,
                                                        border: isTodayCell && !isSelected
                                                            ? '1px solid rgba(168,85,247,0.5)'
                                                            : 'none',
                                                        background: isSelected
                                                            ? 'linear-gradient(135deg, #a855f7, #ec4899)'
                                                            : 'transparent',
                                                        color: isSelected
                                                            ? '#ffffff'
                                                            : isFutureDay
                                                                ? 'rgba(255,255,255,0.18)'
                                                                : inCurrentMonth
                                                                    ? 'var(--text-primary)'
                                                                    : 'rgba(255,255,255,0.32)',
                                                        fontSize: 11.5,
                                                        fontWeight: isSelected || isTodayCell ? 800 : 600,
                                                        fontFamily: 'inherit',
                                                        cursor: isFutureDay ? 'not-allowed' : 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    {format(day, 'd')}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Direct Date Input row for jumping across years/months quickly */}
                                    <div style={{
                                        marginTop: 8,
                                        paddingTop: 8,
                                        borderTop: '1px solid rgba(255,255,255,0.06)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 8,
                                    }}>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                                            Jump to date:
                                        </span>
                                        <input
                                            ref={nativeDateInputRef}
                                            type="date"
                                            value={selectedDate}
                                            max={todayStr}
                                            onChange={(e) => {
                                                if (e.target.value && e.target.value <= todayStr) {
                                                    setSelectedDate(e.target.value);
                                                    setShowCalendar(false);
                                                }
                                            }}
                                            style={{
                                                background: 'rgba(255,255,255,0.06)',
                                                border: '1px solid rgba(255,255,255,0.14)',
                                                borderRadius: 7,
                                                color: 'var(--text-primary)',
                                                padding: '3px 8px',
                                                fontSize: 11.5,
                                                fontFamily: 'inherit',
                                                colorScheme: 'dark',
                                            }}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Quick Date Pills + AI Coach Refresh */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedDate(yesterdayStr);
                                    setShowCalendar(false);
                                }}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: 8,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: isViewingYesterday ? 'linear-gradient(135deg, #a855f7, #ec4899)' : 'rgba(255,255,255,0.06)',
                                    color: isViewingYesterday ? '#fff' : 'var(--text-muted)',
                                }}
                            >
                                Yesterday {!isDayCompletedTime && '✓'}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedDate(todayStr);
                                    setShowCalendar(false);
                                }}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: 8,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: isViewingToday ? 'linear-gradient(135deg, #a855f7, #ec4899)' : 'rgba(255,255,255,0.06)',
                                    color: isViewingToday ? '#fff' : 'var(--text-muted)',
                                }}
                            >
                                Today {isDayCompletedTime ? '✓' : '(In Progress)'}
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={handleGenerateAiTips}
                            disabled={loadingAi}
                            style={{
                                padding: '4px 10px',
                                borderRadius: 8,
                                fontSize: 11,
                                fontWeight: 700,
                                border: '1px solid rgba(168,85,247,0.35)',
                                background: 'rgba(168,85,247,0.14)',
                                color: '#e9d5ff',
                                cursor: loadingAi ? 'wait' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                            }}
                            title="Generate personalized AI Coach takeaways for this date"
                        >
                            {loadingAi ? (
                                <RefreshCw size={11} style={{ animation: 'spin 0.9s linear infinite' }} />
                            ) : (
                                <Sparkles size={11} />
                            )}
                            {loadingAi ? 'Thinking…' : 'AI Coach Tips'}
                        </button>
                    </div>

                    {/* Mid-day notice if viewing Today before 8 PM */}
                    {isViewingToday && !isDayCompletedTime && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 11,
                            color: '#fbbf24',
                            background: 'rgba(245,158,11,0.10)',
                            border: '1px solid rgba(245,158,11,0.25)',
                            padding: '5px 8px',
                            borderRadius: 8,
                        }}>
                            <Clock size={12} />
                            <span>Today isn't over yet — this is a live mid-day snapshot.</span>
                        </div>
                    )}
                </div>

                {/* Visual Card Preview */}
                <div style={{
                    width: '100%',
                    aspectRatio: '1080 / 1350',
                    borderRadius: 16,
                    overflow: 'hidden',
                    background: '#0f0a1f',
                    border: '1px solid rgba(255,255,255,0.08)',
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                }}>
                    {previewUrl ? (
                        <motion.img
                            key={previewUrl}
                            src={previewUrl}
                            alt="Daily Report visual card preview"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
                        />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <div style={{
                                width: 22,
                                height: 22,
                                border: '2px solid #a855f7',
                                borderTopColor: 'transparent',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite',
                            }} />
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rendering visual report…</span>
                        </div>
                    )}
                </div>

                {/* Primary Share to WhatsApp Button */}
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    disabled={!blob || busy}
                    onClick={handleShare}
                    style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: 14,
                        fontSize: 14,
                        fontWeight: 700,
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        background: 'linear-gradient(135deg, #25d366, #16a34a)',
                        boxShadow: '0 4px 18px rgba(37,211,102,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        marginBottom: 8,
                        opacity: !blob || busy ? 0.6 : 1,
                    }}
                >
                    <Share2 size={16} />
                    {nativeShare ? 'Share Report to WhatsApp & more' : 'Share Report Image'}
                </motion.button>

                {/* Secondary Download & Copy Buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        disabled={!blob}
                        onClick={() => blob && downloadBlob(blob, filename)}
                        style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 700,
                            background: 'var(--surface-input, rgba(255,255,255,0.06))',
                            border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                        }}
                    >
                        <Download size={14} /> Download PNG
                    </button>
                    <button
                        disabled={!blob}
                        onClick={handleCopy}
                        style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 700,
                            background: 'var(--surface-input, rgba(255,255,255,0.06))',
                            border: '1px solid var(--border-subtle, rgba(255,255,255,0.1))',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                        }}
                    >
                        <Copy size={14} /> Copy to Clipboard
                    </button>
                </div>

                {/* Toast Notification */}
                <AnimatePresence>
                    {toast && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            style={{
                                marginTop: 10,
                                padding: '8px 12px',
                                borderRadius: 10,
                                fontSize: 11.5,
                                fontWeight: 600,
                                background: 'rgba(34,197,94,0.14)',
                                border: '1px solid rgba(34,197,94,0.3)',
                                color: '#4ade80',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                            }}
                        >
                            <Check size={14} /> {toast}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default DailyReportModal;
