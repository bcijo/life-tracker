import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays, parseISO } from 'date-fns';
import {
    Utensils,
    Dumbbell,
    Search,
    Globe,
    Trash2,
    Settings2,
    Loader2,
    Plus,
    X,
    Check,
} from 'lucide-react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
} from 'recharts';
import useCalories, { calculateFromPer100g, calculateMifflinBmr } from '../hooks/useCalories';
import { COMMON_EXERCISES, resolveFoodUnit } from '../lib/indianFoodCatalog';
import LiquidGlassSegmented from '../components/common/LiquidGlassSegmented';
import DateDisplay from '../components/common/DateDisplay';
import Modal from '../components/Modal';

const MONO = "'JetBrains Mono', monospace";
const ACCENT = '#a855f7';
const AMBER = '#f59e0b';
const GREEN = '#22c55e';

const GRAM_PRESETS = [50, 100, 150, 200, 250];
const COUNT_PRESETS = [1, 2, 3, 4];

const MEALS = [
    { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
    { id: 'lunch', label: 'Lunch', emoji: '☀️' },
    { id: 'snack', label: 'Snack', emoji: '☕' },
    { id: 'dinner', label: 'Dinner', emoji: '🌙' },
];

const card = {
    background: 'var(--surface-elevated)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 22,
    padding: 18,
    position: 'relative',
};

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('en-IN');

function useIsNarrow(max = 520) {
    const query = `(max-width: ${max}px)`;
    const [narrow, setNarrow] = useState(
        () => typeof window !== 'undefined' && window.matchMedia(query).matches
    );
    useEffect(() => {
        const mq = window.matchMedia(query);
        const handler = (e) => setNarrow(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [query]);
    return narrow;
}

/* Progress ring: food intake vs total burn */
const Ring = ({ pct, color, size = 128, stroke = 10, children }) => {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const dash = c * Math.min(1, Math.max(0, pct));
    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={stroke} />
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={color}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={c}
                    initial={{ strokeDashoffset: c }}
                    animate={{ strokeDashoffset: c - dash }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                />
            </svg>
            <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center',
            }}>
                {children}
            </div>
        </div>
    );
};

const Label = ({ children, style }) => (
    <span style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: 'var(--text-muted)', ...style,
    }}>
        {children}
    </span>
);

const Calories = () => {
    const narrow = useIsNarrow(520);
    const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
    const [mode, setMode] = useState('food'); // 'food' | 'exercise'
    const [logFilter, setLogFilter] = useState('all');

    const {
        foodCatalog,
        bmrSettings,
        expectedBmr,
        dailySummary,
        weeklyTrend,
        searchFoodDatabase,
        lookupAndCacheFood,
        addFoodIntake,
        addExerciseBurn,
        deleteCalorieLog,
        saveBmrSettings,
    } = useCalories(selectedDate);

    /* ── Food logger state ── */
    const [mealType, setMealType] = useState(() => {
        const hr = new Date().getHours();
        if (hr < 11) return 'breakfast';
        if (hr < 16) return 'lunch';
        if (hr < 19) return 'snack';
        return 'dinner';
    });
    const [foodSearch, setFoodSearch] = useState('');
    const [selectedFood, setSelectedFood] = useState(null);
    const [portionMode, setPortionMode] = useState('grams'); // 'unit' | 'grams'
    const [countInput, setCountInput] = useState('1');
    const [gramsInput, setGramsInput] = useState('150');
    const [searchingWeb, setSearchingWeb] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [lookupError, setLookupError] = useState('');

    /* ── Exercise logger state ── */
    const [exerciseType, setExerciseType] = useState(COMMON_EXERCISES[0].name);
    const [exerciseDuration, setExerciseDuration] = useState('30');
    const [manualCalories, setManualCalories] = useState(null);

    /* ── BMR modal ── */
    const [showBmr, setShowBmr] = useState(false);
    const [bmrForm, setBmrForm] = useState(bmrSettings);

    const dbSearch = useMemo(() => searchFoodDatabase(foodSearch), [foodSearch, searchFoodDatabase]);
    const unitInfo = useMemo(() => resolveFoodUnit(selectedFood), [selectedFood]);
    const effectiveGrams = useMemo(() => {
        if (!selectedFood) return 0;
        if (portionMode === 'unit') {
            return Math.max(0, (parseFloat(countInput) || 0) * unitInfo.gramsPerUnit);
        }
        return Math.max(0, parseFloat(gramsInput) || 0);
    }, [selectedFood, portionMode, countInput, gramsInput, unitInfo]);

    const livePreview = useMemo(
        () => (selectedFood ? calculateFromPer100g(selectedFood, effectiveGrams) : null),
        [selectedFood, effectiveGrams]
    );

    const weight = Number(bmrSettings.weight_kg) || 70;
    const activeExercise = COMMON_EXERCISES.find((e) => e.name === exerciseType) || COMMON_EXERCISES[0];
    const autoCalories = Math.round(activeExercise.met * weight * ((parseFloat(exerciseDuration) || 0) / 60));
    const caloriesValue = manualCalories !== null ? manualCalories : String(autoCalories || '');

    /* ── Date strip: last 7 days as a glass segmented control ── */
    const dateOptions = useMemo(() => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = subDays(new Date(), i);
            days.push({
                id: format(d, 'yyyy-MM-dd'),
                label: narrow ? format(d, 'EEEEE') : format(d, 'EEE'),
                badge: narrow ? undefined : format(d, 'd'),
            });
        }
        return days;
    }, [narrow]);

    const mealOptions = useMemo(
        () => MEALS.map((m) => ({ id: m.id, label: m.label, emoji: narrow ? undefined : m.emoji })),
        [narrow]
    );
    const exerciseOptions = useMemo(
        () => COMMON_EXERCISES.map((e) => ({ id: e.name, label: e.name, emoji: e.emoji })),
        []
    );

    /* ── Derived numbers ── */
    const { totalIntake, totalBurn, netBalance, isDeficit, exerciseBurn } = dailySummary;
    const ringPct = totalBurn > 0 ? totalIntake / totalBurn : 0;
    const ringColor = isDeficit ? ACCENT : AMBER;

    const macroKcal = dailySummary.totalProtein * 4 + dailySummary.totalCarbs * 4 + dailySummary.totalFat * 9;
    const pPct = macroKcal > 0 ? Math.round((dailySummary.totalProtein * 4 / macroKcal) * 100) : 0;
    const cPct = macroKcal > 0 ? Math.round((dailySummary.totalCarbs * 4 / macroKcal) * 100) : 0;
    const fPct = macroKcal > 0 ? Math.max(0, 100 - pPct - cPct) : 0;

    const allLogs = useMemo(() => {
        const merged = [...dailySummary.intakeLogs, ...dailySummary.burnLogs];
        return merged.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }, [dailySummary.intakeLogs, dailySummary.burnLogs]);
    const visibleLogs = allLogs.filter((l) =>
        logFilter === 'all' ? true : logFilter === 'food' ? l.type === 'intake' : l.type === 'burn'
    );
    const logOptions = [
        { id: 'all', label: 'All', count: allLogs.length },
        { id: 'food', label: 'Food', count: dailySummary.intakeLogs.length },
        { id: 'exercise', label: 'Exercise', count: dailySummary.burnLogs.length },
    ];

    /* ── Handlers ── */
    const selectFoodItem = (food, queryOverride = null) => {
        if (!food) return;
        const info = resolveFoodUnit(food);
        const pq = queryOverride || dbSearch.parsedQuery;

        setSelectedFood(food);
        setFoodSearch(food.name);

        if (pq?.mode === 'unit' && pq.count > 0) {
            setPortionMode('unit');
            setCountInput(String(pq.count));
            setGramsInput(String(Math.round(pq.count * info.gramsPerUnit)));
        } else if (pq?.mode === 'grams' && pq.grams > 0) {
            setPortionMode('grams');
            setGramsInput(String(pq.grams));
            setCountInput('1');
        } else if (info.isCountable) {
            setPortionMode('unit');
            setCountInput('1');
            setGramsInput(String(info.gramsPerUnit));
        } else {
            setPortionMode('grams');
            setCountInput('1');
            setGramsInput('150');
        }
    };

    const handleWebSearch = async (queryOverride) => {
        const q = String(queryOverride ?? foodSearch).trim();
        if (!q || searchingWeb) return;
        setSearchingWeb(true);
        setLookupError('');
        setFeedback('');
        try {
            const { food, fromCache, parsedQuery } = await lookupAndCacheFood(q);
            selectFoodItem(food, parsedQuery);
            setFeedback(fromCache ? 'Found in your database' : `Saved ${food.name} to your database`);
        } catch (err) {
            setLookupError(err.message || 'Could not look up this food');
        } finally {
            setSearchingWeb(false);
        }
    };

    const handleFoodSubmit = async (e) => {
        e.preventDefault();
        if (!selectedFood) {
            if (!foodSearch.trim()) return;
            if (dbSearch.results.length > 0) {
                selectFoodItem(dbSearch.results[0], dbSearch.parsedQuery);
            } else {
                await handleWebSearch(foodSearch);
            }
            return;
        }
        if (!effectiveGrams || effectiveGrams <= 0) return;
        const loggedCount = portionMode === 'unit' ? parseFloat(countInput) || null : null;
        await addFoodIntake({
            foodItem: selectedFood,
            grams: effectiveGrams,
            count: loggedCount,
            mealType,
            date: selectedDate,
        });
        setSelectedFood(null);
        setFoodSearch('');
        setFeedback('');
    };

    const handleExerciseSubmit = async (e) => {
        e.preventDefault();
        const cals = parseFloat(caloriesValue);
        if (!cals || cals <= 0) return;
        await addExerciseBurn({
            name: exerciseType,
            caloriesBurned: cals,
            durationMins: parseFloat(exerciseDuration) || null,
            date: selectedDate,
        });
        setManualCalories(null);
    };

    const openBmr = () => {
        setBmrForm({
            weight_kg: bmrSettings.weight_kg || 70,
            height_cm: bmrSettings.height_cm || 175,
            age: bmrSettings.age || 24,
            gender: bmrSettings.gender || 'male',
            bmr_override: bmrSettings.bmr_override || '',
        });
        setShowBmr(true);
    };

    const handleSaveBmr = async (e) => {
        e.preventDefault();
        await saveBmrSettings({
            ...bmrForm,
            bmr_override: bmrForm.bmr_override ? Number(bmrForm.bmr_override) : null,
        });
        setShowBmr(false);
    };

    const inputStyle = {
        width: '100%', padding: '11px 14px', borderRadius: 12, fontSize: 14,
        fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
    };

    /* ═══════════════ RENDER ═══════════════ */
    return (
        <div className="page-container cal-page" style={{ maxWidth: 1080, margin: '0 auto', width: '100%' }}>
            {/* Header */}
            <motion.header
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
            >
                <div>
                    <DateDisplay date={parseISO(selectedDate)} />
                    <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
                        Calories
                    </h1>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                        Intake, burn & macros
                    </span>
                </div>
                <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={openBmr}
                    aria-label="Edit BMR settings"
                    style={{
                        height: 36, padding: '0 12px', borderRadius: 12, display: 'flex',
                        alignItems: 'center', gap: 7, cursor: 'pointer',
                        background: 'var(--surface-input, rgba(255,255,255,0.04))',
                        border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)',
                        fontSize: 12, fontWeight: 700,
                    }}
                >
                    <Settings2 size={15} />
                    <span style={{ fontFamily: MONO }}>{fmt(expectedBmr)}</span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>BMR</span>
                </motion.button>
            </motion.header>

            {/* Glass date strip */}
            <div style={{ marginBottom: 18 }}>
                <LiquidGlassSegmented
                    options={dateOptions}
                    value={selectedDate}
                    onChange={setSelectedDate}
                    size="sm"
                    fullWidth
                    ariaLabel="Select day"
                />
            </div>

            <div className="cal-layout">
                {/* ───────── LEFT COLUMN ───────── */}
                <div className="cal-col">
                    <div className="cal-top">
                        {/* Hero: intake vs burn */}
                        <motion.section
                            style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                                <Ring pct={ringPct} color={ringColor}>
                                    <span style={{ fontFamily: MONO, fontSize: 26, fontWeight: 800, lineHeight: 1, color: 'var(--text-primary)' }}>
                                        {fmt(totalIntake)}
                                    </span>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                        of {fmt(totalBurn)} kcal
                                    </span>
                                </Ring>
                                <div style={{ minWidth: 0 }}>
                                    <Label>Net balance</Label>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                                        <span style={{ fontFamily: MONO, fontSize: 28, fontWeight: 800, lineHeight: 1, color: isDeficit ? GREEN : AMBER }}>
                                            {netBalance > 0 ? '+' : ''}{fmt(netBalance)}
                                        </span>
                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>kcal</span>
                                    </div>
                                    <span style={{
                                        display: 'inline-block', marginTop: 8, padding: '2px 9px', borderRadius: 9999,
                                        fontSize: 11, fontWeight: 700,
                                        background: isDeficit ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                                        color: isDeficit ? GREEN : AMBER,
                                    }}>
                                        {isDeficit ? 'Deficit' : 'Surplus'}
                                    </span>
                                </div>
                            </div>

                            <div style={{
                                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                                paddingTop: 14, borderTop: '1px solid var(--border-subtle)',
                            }}>
                                {[
                                    { label: 'Intake', value: totalIntake, color: ACCENT },
                                    { label: 'BMR', value: dailySummary.expectedBmr, color: 'var(--text-primary)' },
                                    { label: 'Exercise', value: exerciseBurn, color: AMBER, prefix: '+' },
                                ].map((s, i) => (
                                    <div key={s.label} style={{
                                        textAlign: 'center', padding: '0 4px',
                                        borderLeft: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                                    }}>
                                        <div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 800, color: s.color }}>
                                            {s.prefix || ''}{fmt(s.value)}
                                        </div>
                                        <Label style={{ fontSize: 10 }}>{s.label}</Label>
                                    </div>
                                ))}
                            </div>
                        </motion.section>

                        {/* Macros */}
                        <motion.section
                            style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'center' }}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 25 }}
                        >
                            <Label>Macros</Label>
                            <div style={{
                                display: 'flex', height: 8, borderRadius: 9999, overflow: 'hidden',
                                background: 'var(--border-subtle)', gap: 2,
                            }}>
                                <div style={{ width: `${pPct}%`, background: '#6366f1', transition: 'width .4s ease' }} />
                                <div style={{ width: `${cPct}%`, background: GREEN, transition: 'width .4s ease' }} />
                                <div style={{ width: `${fPct}%`, background: AMBER, transition: 'width .4s ease' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                                {[
                                    { label: 'Protein', value: dailySummary.totalProtein, color: '#6366f1', pct: pPct },
                                    { label: 'Carbs', value: dailySummary.totalCarbs, color: GREEN, pct: cPct },
                                    { label: 'Fat', value: dailySummary.totalFat, color: AMBER, pct: fPct },
                                ].map((m) => (
                                    <div key={m.label}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color }} />
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{m.label}</span>
                                        </div>
                                        <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                                            {Math.round(m.value)}<span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>g</span>
                                        </div>
                                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: MONO }}>{m.pct}%</span>
                                    </div>
                                ))}
                            </div>
                        </motion.section>
                    </div>

                    {/* Logger */}
                    <motion.section
                        style={{ ...card, display: 'flex', flexDirection: 'column', gap: 14 }}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 25 }}
                    >
                        <LiquidGlassSegmented
                            options={[
                                { id: 'food', label: 'Food', icon: Utensils, color: ACCENT },
                                { id: 'exercise', label: 'Exercise', icon: Dumbbell, color: AMBER },
                            ]}
                            value={mode}
                            onChange={setMode}
                            size="md"
                            fullWidth
                            ariaLabel="Log type"
                        />

                        {mode === 'food' ? (
                            <form onSubmit={handleFoodSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <LiquidGlassSegmented
                                    options={mealOptions}
                                    value={mealType}
                                    onChange={setMealType}
                                    size="sm"
                                    fullWidth
                                    ariaLabel="Meal"
                                />

                                <div style={{ position: 'relative' }}>
                                    <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input
                                        type="text"
                                        value={foodSearch}
                                        onChange={(e) => {
                                            setFoodSearch(e.target.value);
                                            if (selectedFood && e.target.value !== selectedFood.name) setSelectedFood(null);
                                            setLookupError('');
                                            setFeedback('');
                                        }}
                                        placeholder="Search food or count, e.g. 2 roti, boiled egg"
                                        className="surface-input"
                                        style={{ ...inputStyle, paddingLeft: 40, paddingRight: 38 }}
                                    />
                                    {foodSearch && (
                                        <button
                                            type="button"
                                            onClick={() => { setFoodSearch(''); setSelectedFood(null); setFeedback(''); }}
                                            aria-label="Clear"
                                            style={{
                                                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                                background: 'transparent', border: 'none', color: 'var(--text-muted)',
                                                cursor: 'pointer', display: 'flex', padding: 4,
                                            }}
                                        >
                                            <X size={15} />
                                        </button>
                                    )}
                                </div>

                                {feedback && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: GREEN }}>
                                        <Check size={14} /> {feedback}
                                    </div>
                                )}
                                {lookupError && (
                                    <div style={{ fontSize: 12, color: 'var(--danger)' }}>{lookupError}</div>
                                )}

                                <AnimatePresence mode="wait" initial={false}>
                                    {!selectedFood ? (
                                        <motion.div
                                            key="results"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.15 }}
                                        >
                                            {dbSearch.results.length > 0 ? (
                                                <div style={{ maxHeight: 232, overflowY: 'auto', margin: '0 -4px', padding: '0 4px' }}>
                                                    {!foodSearch.trim() && (
                                                        <Label style={{ display: 'block', margin: '2px 0 6px' }}>
                                                            Saved foods
                                                        </Label>
                                                    )}
                                                    {dbSearch.results.slice(0, foodSearch.trim() ? 8 : 6).map((item) => {
                                                        const itemUnit = resolveFoodUnit(item);
                                                        const unitKcal = Math.round((item.calories_per_100g * itemUnit.gramsPerUnit) / 100);
                                                        return (
                                                            <button
                                                                key={item.id || item.normalized_name}
                                                                type="button"
                                                                onClick={() => { selectFoodItem(item); setFeedback(''); }}
                                                                className="cal-row-btn"
                                                            >
                                                                <span style={{ minWidth: 0, textAlign: 'left' }}>
                                                                    <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        {item.name}
                                                                    </span>
                                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: MONO }}>
                                                                        {itemUnit.isCountable
                                                                            ? `1 ${itemUnit.unitName} (${itemUnit.gramsPerUnit}g) · ${Math.round(item.calories_per_100g)}/100g`
                                                                            : `P ${item.protein_per_100g} · C ${item.carbs_per_100g} · F ${item.fat_per_100g}`}
                                                                    </span>
                                                                </span>
                                                                <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: ACCENT, flexShrink: 0 }}>
                                                                    {itemUnit.isCountable ? unitKcal : Math.round(item.calories_per_100g)}
                                                                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                                                                        {itemUnit.isCountable ? ` /${itemUnit.unitName}` : ' /100g'}
                                                                    </span>
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ) : foodSearch.trim() ? (
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    gap: 12, flexWrap: 'wrap', padding: '12px 14px', borderRadius: 14,
                                                    background: 'var(--surface-input)', border: '1px solid var(--border-subtle)',
                                                }}>
                                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                                        Not saved yet. Look it up once and keep it.
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleWebSearch(foodSearch)}
                                                        disabled={searchingWeb}
                                                        className="btn-primary"
                                                        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 14px', fontSize: 13 }}
                                                    >
                                                        {searchingWeb ? <Loader2 size={14} className="spin" /> : <Globe size={14} />}
                                                        {searchingWeb ? 'Searching…' : 'Search web'}
                                                    </button>
                                                </div>
                                            ) : (
                                                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '6px 0' }}>
                                                    Search any dish. It is looked up once, then saved.
                                                </p>
                                            )}
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="selected"
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            transition={{ duration: 0.18 }}
                                            style={{
                                                padding: 14, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 12,
                                                background: 'var(--surface-input)', border: '1px solid var(--border-subtle)',
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedFood.name}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: MONO, marginTop: 2 }}>
                                                        {portionMode === 'unit'
                                                            ? `1 ${unitInfo.unitName} ≈ ${unitInfo.gramsPerUnit}g · ${Math.round((selectedFood.calories_per_100g * unitInfo.gramsPerUnit) / 100)} kcal (${Math.round(selectedFood.calories_per_100g)}/100g)`
                                                            : `${Math.round(selectedFood.calories_per_100g)} kcal / 100g`}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => { setSelectedFood(null); setFeedback(''); }}
                                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', padding: 0, flexShrink: 0 }}
                                                >
                                                    Change
                                                </button>
                                            </div>

                                            <LiquidGlassSegmented
                                                options={[
                                                    {
                                                        id: 'unit',
                                                        label: `${unitInfo.unitName.charAt(0).toUpperCase() + unitInfo.unitName.slice(1)} (${unitInfo.gramsPerUnit}g)`,
                                                    },
                                                    { id: 'grams', label: 'Grams (g)' },
                                                ]}
                                                value={portionMode}
                                                onChange={(nextMode) => {
                                                    setPortionMode(nextMode);
                                                    if (nextMode === 'grams') {
                                                        const g = Math.round((parseFloat(countInput) || 1) * unitInfo.gramsPerUnit);
                                                        setGramsInput(String(g || 100));
                                                    } else {
                                                        const c = Math.max(0.5, Math.round(((parseFloat(gramsInput) || unitInfo.gramsPerUnit) / unitInfo.gramsPerUnit) * 2) / 2);
                                                        setCountInput(String(c));
                                                    }
                                                }}
                                                size="sm"
                                                fullWidth
                                                ariaLabel="Portion unit mode"
                                            />

                                            {portionMode === 'unit' ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                    <div style={{ position: 'relative', width: 104 }}>
                                                        <input
                                                            type="number"
                                                            min="0.25"
                                                            max="50"
                                                            step="any"
                                                            inputMode="decimal"
                                                            value={countInput}
                                                            onChange={(e) => setCountInput(e.target.value)}
                                                            className="surface-input"
                                                            style={{ ...inputStyle, padding: '9px 32px 9px 12px', fontFamily: MONO, fontWeight: 700 }}
                                                        />
                                                        <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-muted)' }}>
                                                            ×
                                                        </span>
                                                    </div>
                                                    {COUNT_PRESETS.map((c) => {
                                                        const on = Number(countInput) === c;
                                                        return (
                                                            <button
                                                                key={c}
                                                                type="button"
                                                                onClick={() => setCountInput(String(c))}
                                                                style={{
                                                                    padding: '6px 12px', borderRadius: 9, fontSize: 12, fontWeight: 700,
                                                                    fontFamily: MONO, cursor: 'pointer',
                                                                    background: on ? `${ACCENT}22` : 'transparent',
                                                                    border: on ? `1px solid ${ACCENT}` : '1px solid var(--border-subtle)',
                                                                    color: on ? ACCENT : 'var(--text-muted)',
                                                                }}
                                                            >
                                                                {c}
                                                            </button>
                                                        );
                                                    })}
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: MONO, marginLeft: 'auto' }}>
                                                        = {Math.round(effectiveGrams)}g
                                                    </span>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                    <div style={{ position: 'relative', width: 112 }}>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="5000"
                                                            step="any"
                                                            inputMode="decimal"
                                                            value={gramsInput}
                                                            onChange={(e) => setGramsInput(e.target.value)}
                                                            className="surface-input"
                                                            style={{ ...inputStyle, padding: '9px 28px 9px 12px', fontFamily: MONO, fontWeight: 700 }}
                                                        />
                                                        <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-muted)' }}>g</span>
                                                    </div>
                                                    {GRAM_PRESETS.map((g) => {
                                                        const on = Number(gramsInput) === g;
                                                        return (
                                                            <button
                                                                key={g}
                                                                type="button"
                                                                onClick={() => setGramsInput(String(g))}
                                                                style={{
                                                                    padding: '6px 10px', borderRadius: 9, fontSize: 12, fontWeight: 700,
                                                                    fontFamily: MONO, cursor: 'pointer',
                                                                    background: on ? `${ACCENT}22` : 'transparent',
                                                                    border: on ? `1px solid ${ACCENT}` : '1px solid var(--border-subtle)',
                                                                    color: on ? ACCENT : 'var(--text-muted)',
                                                                }}
                                                            >
                                                                {g}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            <div style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                gap: 12, flexWrap: 'wrap', paddingTop: 12, borderTop: '1px solid var(--border-subtle)',
                                            }}>
                                                <div>
                                                    <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 800, color: ACCENT }}>
                                                        {livePreview?.calories || 0}
                                                    </span>
                                                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>kcal</span>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: MONO, marginTop: 2 }}>
                                                        P {livePreview?.protein_g || 0} · C {livePreview?.carbs_g || 0} · F {livePreview?.fat_g || 0}
                                                    </div>
                                                </div>
                                                <button
                                                    type="submit"
                                                    className="btn-primary cal-add-btn"
                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 20px', fontSize: 14 }}
                                                >
                                                    <Plus size={16} /> Add
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </form>
                        ) : (
                            <form onSubmit={handleExerciseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <LiquidGlassSegmented
                                    options={exerciseOptions}
                                    value={exerciseType}
                                    onChange={(v) => { setExerciseType(v); setManualCalories(null); }}
                                    size="sm"
                                    fullWidth
                                    ariaLabel="Exercise"
                                />

                                <div className="cal-ex-grid">
                                    <div>
                                        <Label style={{ display: 'block', marginBottom: 6 }}>Duration</Label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="number"
                                                min="1"
                                                max="600"
                                                inputMode="numeric"
                                                value={exerciseDuration}
                                                onChange={(e) => { setExerciseDuration(e.target.value); setManualCalories(null); }}
                                                className="surface-input"
                                                style={{ ...inputStyle, paddingRight: 46, fontFamily: MONO, fontWeight: 700 }}
                                            />
                                            <span style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-muted)' }}>min</span>
                                        </div>
                                    </div>
                                    <div>
                                        <Label style={{ display: 'block', marginBottom: 6 }}>Burned</Label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type="number"
                                                min="1"
                                                max="5000"
                                                inputMode="numeric"
                                                value={caloriesValue}
                                                onChange={(e) => setManualCalories(e.target.value)}
                                                className="surface-input"
                                                style={{ ...inputStyle, paddingRight: 46, fontFamily: MONO, fontWeight: 700 }}
                                            />
                                            <span style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-muted)' }}>kcal</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        Estimated for {weight} kg. Edit to override.
                                    </span>
                                    <button
                                        type="submit"
                                        className="btn-primary cal-add-btn"
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px 20px', fontSize: 14 }}
                                    >
                                        <Plus size={16} /> Add
                                    </button>
                                </div>
                            </form>
                        )}
                    </motion.section>
                </div>

                {/* ───────── RIGHT COLUMN ───────── */}
                <div className="cal-col">
                    {/* Log */}
                    <motion.section
                        style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Log</h2>
                            <span style={{ fontFamily: MONO, fontSize: 12, color: 'var(--text-muted)' }}>
                                {fmt(totalIntake)} in · {fmt(exerciseBurn)} out
                            </span>
                        </div>

                        <LiquidGlassSegmented
                            options={logOptions}
                            value={logFilter}
                            onChange={setLogFilter}
                            size="sm"
                            fullWidth
                            ariaLabel="Filter log"
                        />

                        {visibleLogs.length === 0 ? (
                            <p style={{ margin: 0, padding: '22px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                                Nothing logged for this day.
                            </p>
                        ) : (
                            <div>
                                <AnimatePresence initial={false}>
                                    {visibleLogs.map((item) => {
                                        const isBurn = item.type === 'burn';
                                        const Icon = isBurn ? Dumbbell : Utensils;
                                        const tint = isBurn ? AMBER : ACCENT;
                                        return (
                                            <motion.div
                                                key={item.id}
                                                layout
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="cal-log-row"
                                            >
                                                <div style={{
                                                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    background: `${tint}1f`, color: tint,
                                                }}>
                                                    <Icon size={16} />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {item.name}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {isBurn
                                                            ? `${item.duration_mins || '—'} min`
                                                            : `${item.grams}g · ${item.meal_type} · P${Math.round(item.protein_g)} C${Math.round(item.carbs_g)} F${Math.round(item.fat_g)}`}
                                                    </div>
                                                </div>
                                                <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 800, color: isBurn ? AMBER : 'var(--text-primary)', flexShrink: 0 }}>
                                                    {isBurn ? '+' : ''}{fmt(item.calories)}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteCalorieLog(item.id)}
                                                    aria-label={`Remove ${item.name}`}
                                                    className="cal-del"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        )}
                    </motion.section>

                    {/* Weekly chart */}
                    <motion.section
                        style={{ ...card }}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25, type: 'spring', stiffness: 300, damping: 25 }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>This week</h2>
                            <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: 3, background: ACCENT }} /> In
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: 3, background: AMBER }} /> Out
                                </span>
                            </div>
                        </div>
                        <div style={{ width: '100%', height: 170 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={weeklyTrend} margin={{ top: 4, right: 0, left: -26, bottom: 0 }} barGap={3}>
                                    <XAxis dataKey="dayLabel" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'var(--border-subtle)' }}
                                        contentStyle={{
                                            background: 'var(--surface-elevated)', border: '1px solid var(--glass-border)',
                                            borderRadius: 10, fontSize: 12,
                                        }}
                                        formatter={(val, name) => [`${val} kcal`, name]}
                                    />
                                    <Bar dataKey="intake" name="Intake" fill={ACCENT} radius={[5, 5, 0, 0]} />
                                    <Bar dataKey="totalBurn" name="Burn" fill={AMBER} radius={[5, 5, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.section>
                </div>
            </div>

            {/* BMR settings */}
            <Modal isOpen={showBmr} onClose={() => setShowBmr(false)} title="BMR settings">
                <form onSubmit={handleSaveBmr} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {[
                            { key: 'weight_kg', label: 'Weight (kg)', step: '0.1' },
                            { key: 'height_cm', label: 'Height (cm)' },
                            { key: 'age', label: 'Age' },
                        ].map((f) => (
                            <div key={f.key}>
                                <Label style={{ display: 'block', marginBottom: 6 }}>{f.label}</Label>
                                <input
                                    type="number"
                                    step={f.step}
                                    value={bmrForm[f.key]}
                                    onChange={(e) => setBmrForm({ ...bmrForm, [f.key]: e.target.value })}
                                    className="surface-input"
                                    style={{ ...inputStyle, fontFamily: MONO }}
                                />
                            </div>
                        ))}
                        <div>
                            <Label style={{ display: 'block', marginBottom: 6 }}>Gender</Label>
                            <LiquidGlassSegmented
                                options={[
                                    { id: 'male', label: 'Male' },
                                    { id: 'female', label: 'Female' },
                                ]}
                                value={bmrForm.gender}
                                onChange={(v) => setBmrForm({ ...bmrForm, gender: v })}
                                size="md"
                                fullWidth
                                ariaLabel="Gender"
                            />
                        </div>
                    </div>

                    <div>
                        <Label style={{ display: 'block', marginBottom: 6 }}>Custom BMR (optional)</Label>
                        <input
                            type="number"
                            placeholder={`Auto: ${calculateMifflinBmr({ ...bmrForm, bmr_override: null })}`}
                            value={bmrForm.bmr_override || ''}
                            onChange={(e) => setBmrForm({ ...bmrForm, bmr_override: e.target.value })}
                            className="surface-input"
                            style={{ ...inputStyle, fontFamily: MONO }}
                        />
                    </div>

                    <div style={{
                        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                        padding: '12px 14px', borderRadius: 14, background: 'var(--surface-input)',
                        border: '1px solid var(--border-subtle)',
                    }}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Daily BMR</span>
                        <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 800, color: ACCENT }}>
                            {fmt(calculateMifflinBmr(bmrForm))}
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}> kcal</span>
                        </span>
                    </div>

                    <button type="submit" className="btn-primary" style={{ padding: 12, fontSize: 14 }}>
                        Save
                    </button>
                </form>
            </Modal>

            <style>{`
                .spin { animation: cal-spin 1s linear infinite; }
                @keyframes cal-spin { to { transform: rotate(360deg); } }

                /* Mobile first: single column */
                .cal-layout { display: flex; flex-direction: column; gap: 14px; }
                .cal-col { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
                .cal-top { display: flex; flex-direction: column; gap: 14px; }
                .cal-ex-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

                .cal-row-btn {
                    width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px;
                    padding: 10px 6px; background: transparent; border: none; cursor: pointer;
                    border-bottom: 1px solid var(--border-subtle); border-radius: 0;
                    transition: background .15s ease;
                }
                .cal-row-btn:last-child { border-bottom: none; }
                .cal-row-btn:hover { background: var(--surface-input); }

                .cal-log-row {
                    display: flex; align-items: center; gap: 12px; padding: 10px 0;
                    border-bottom: 1px solid var(--border-subtle); overflow: hidden;
                }
                .cal-log-row:last-child { border-bottom: none; }

                .cal-del {
                    background: transparent; border: none; color: var(--text-muted);
                    cursor: pointer; padding: 6px; display: flex; border-radius: 8px;
                    transition: color .15s ease, background .15s ease;
                }
                .cal-del:hover { color: var(--danger); background: var(--danger-bg); }

                @media (max-width: 520px) {
                    .cal-add-btn { width: 100%; }
                }

                /* Tablet (content area is narrow next to the sidebar): hero + macros side by side */
                @media (min-width: 960px) and (max-width: 1099px) {
                    .cal-top { flex-direction: row; }
                    .cal-top > * { flex: 1; min-width: 0; }
                }

                /* Desktop: two columns */
                @media (min-width: 1100px) {
                    .cal-layout {
                        display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
                        gap: 16px; align-items: start;
                    }
                    .cal-col, .cal-top { gap: 16px; }
                }
            `}</style>
        </div>
    );
};

export default Calories;
