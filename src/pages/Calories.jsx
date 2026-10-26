import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
    Scale,
    Droplets,
    RotateCcw,
    TrendingUp,
    Camera,
    Upload,
    Sparkles,
} from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ReferenceLine,
} from 'recharts';
import useCalories, { calculateFromPer100g, calculateMifflinBmr } from '../hooks/useCalories';
import { COMMON_EXERCISES, resolveFoodUnit, isLiquidFood } from '../lib/indianFoodCatalog';
import { parseNutritionLabelImage, compressImageFile } from '../lib/groq';
import LiquidGlassSegmented from '../components/common/LiquidGlassSegmented';
import DateDisplay from '../components/common/DateDisplay';
import Modal from '../components/Modal';

const MONO = "'JetBrains Mono', monospace";
const ACCENT = '#a855f7';
const AMBER = '#f59e0b';
const GREEN = '#22c55e';
const FIBER_COLOR = '#ec4899';

const GRAM_PRESETS = [50, 100, 150, 200, 250];
const ML_PRESETS = [100, 150, 200, 250, 500];
const COUNT_PRESETS = [1, 2, 3, 4];

const MEALS = [
    { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
    { id: 'lunch', label: 'Lunch', emoji: '☀️' },
    { id: 'snack', label: 'Snack', emoji: '☕' },
    { id: 'dinner', label: 'Dinner', emoji: '🌙' },
];

const renderVesselSvg = (vessel) => {
    switch (vessel) {
        case 'glass':
            return (
                <svg width="22" height="26" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 2L5.2 20.2C5.4 21.3 6.3 22 7.4 22H12.6C13.7 22 14.6 21.3 14.8 20.2L17 2H3Z" stroke="#06b6d4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4.5 12C6.5 11.2 8.5 12.8 11 12C13.5 11.2 14.5 12.5 15.5 12" stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M5.5 20H14.5" stroke="#06b6d4" strokeWidth="1.2" strokeOpacity="0.4" />
                </svg>
            );
        case 'bottle':
            return (
                <svg width="20" height="26" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="7" y="1" width="6" height="2.5" rx="1" stroke="#06b6d4" strokeWidth="1.5" />
                    <path d="M8 3.5V5.5C5.8 7 4.5 9.2 4.5 11.8V19.8C4.5 21 5.4 22 6.6 22H13.4C14.6 22 15.5 21 15.5 19.8V11.8C15.5 9.2 14.2 7 12 5.5V3.5" stroke="#06b6d4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4.8 14C7 13.2 9 14.8 11.5 14C13.5 13.4 14.5 14.2 15.2 14" stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
            );
        case 'sipper':
            return (
                <svg width="20" height="26" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 1H9C8.4 1 8 1.4 8 2V3.5H12V2C12 1.4 11.6 1 11 1Z" fill="#06b6d4" />
                    <rect x="5.5" y="3.5" width="9" height="2.5" rx="1" stroke="#06b6d4" strokeWidth="1.5" />
                    <path d="M6 6L4.8 9.5C4.6 10.2 4.5 10.8 4.5 11.5V19.8C4.5 21 5.4 22 6.6 22H13.4C14.6 22 15.5 21 15.5 19.8V11.5C15.5 10.8 15.4 10.2 15.2 9.5L14 6" stroke="#06b6d4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4.6 15C7 14.2 9 15.8 11.5 15C13.5 14.4 14.5 15.2 15.4 15" stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
            );
        case 'flask':
        default:
            return (
                <svg width="22" height="26" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="7" y="1.5" width="6" height="2.5" rx="1" stroke="#06b6d4" strokeWidth="1.5" />
                    <path d="M7 2C5.3 2 4 3.3 4 5V8C4 8.8 4.7 9.5 5.5 9.5" stroke="#06b6d4" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M5.5 6C5.5 5 6.4 4 7.5 4H12.5C13.6 4 14.5 5 14.5 6V19.8C14.5 21 13.6 22 12.5 22H7.5C6.4 22 5.5 21 5.5 19.8V6Z" stroke="#06b6d4" strokeWidth="1.6" strokeLinejoin="round" />
                    <path d="M5.8 14.5C8 13.8 10 15.2 12.2 14.5C13.4 14.1 14 14.6 14.3 14.5" stroke="#38bdf8" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
            );
    }
};

const card = {
    background: 'var(--surface-elevated-translucent, rgba(20, 20, 35, 0.68))',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.06))',
    borderRadius: 22,
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
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
    const [mode, setMode] = useState('food'); // 'food' | 'exercise' | 'weight'
    const [logFilter, setLogFilter] = useState('all');
    const [chartTab, setChartTab] = useState('calories'); // 'calories' | 'weight'

    const {
        foodCatalog,
        bmrSettings,
        expectedBmr,
        dailySummary,
        weeklyTrend,
        weightLogs,
        todayWeightLog,
        currentWeight,
        weekWeightStats,
        searchFoodDatabase,
        lookupAndCacheFood,
        addCustomFood,
        addFoodIntake,
        addExerciseBurn,
        deleteCalorieLog,
        addWater,
        deleteWaterLog,
        undoLastWater,
        logDailyWeight,
        deleteDailyWeight,
        saveBmrSettings,
        saveWaterGoal,
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
    const [portionMode, setPortionMode] = useState('grams'); // 'unit' | 'grams' | 'ml'
    const [countInput, setCountInput] = useState('1');
    const [gramsInput, setGramsInput] = useState('150');
    const [mlInput, setMlInput] = useState('200');
    const [searchingWeb, setSearchingWeb] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [lookupError, setLookupError] = useState('');

    /* ── Exercise logger state ── */
    const [exerciseType, setExerciseType] = useState(COMMON_EXERCISES[0].name);
    const [exerciseDuration, setExerciseDuration] = useState('30');
    const [manualCalories, setManualCalories] = useState(null);

    /* ── Weight logger state ── */
    const [weightInput, setWeightInput] = useState(() => String(todayWeightLog?.weight_kg || currentWeight || '70'));
    const [weightSaving, setWeightSaving] = useState(false);
    const [weightFeedback, setWeightFeedback] = useState('');

    /* ── Add Entry Modal state (Food / Exercise / Weight) ── */
    const [showAddModal, setShowAddModal] = useState(false);
    const closeAddModal = () => {
        setShowAddModal(false);
        setSelectedFood(null);
        setFoodSearch('');
        setLookupError('');
        setFeedback('');
    };

    useEffect(() => {
        if (todayWeightLog) {
            setWeightInput(String(todayWeightLog.weight_kg));
        } else if (currentWeight) {
            setWeightInput(String(currentWeight));
        }
        setWeightFeedback('');
    }, [selectedDate, todayWeightLog, currentWeight]);

    /* ── Weekly analytics modal & averages ── */
    const [showAnalytics, setShowAnalytics] = useState(false);
    const avgWeekIntake = useMemo(
        () => Math.round(weeklyTrend.reduce((s, d) => s + (d.intake || 0), 0) / (weeklyTrend.length || 1)),
        [weeklyTrend]
    );
    const avgWeekBurn = useMemo(
        () => Math.round(weeklyTrend.reduce((s, d) => s + (d.totalBurn || 0), 0) / (weeklyTrend.length || 1)),
        [weeklyTrend]
    );
    const avgWeekWaterL = useMemo(
        () => ((weeklyTrend.reduce((s, d) => s + (d.waterMl || 0), 0) / (weeklyTrend.length || 1)) / 1000).toFixed(1),
        [weeklyTrend]
    );

    /* ── BMR modal ── */
    const [showBmr, setShowBmr] = useState(false);
    const [bmrForm, setBmrForm] = useState(bmrSettings);

    /* ── Water tracker state ── */
    const [customWaterInput, setCustomWaterInput] = useState('');
    const [showCustomWater, setShowCustomWater] = useState(false);
    const [waterFeedback, setWaterFeedback] = useState('');
    const [showEditWaterGoal, setShowEditWaterGoal] = useState(false);
    const [waterGoalInput, setWaterGoalInput] = useState('3000');

    const handleSaveWaterGoalDirectly = async (goalMl) => {
        const ml = parseInt(goalMl !== undefined ? goalMl : waterGoalInput, 10);
        if (ml >= 250 && ml <= 10000) {
            await saveWaterGoal(ml);
            setShowEditWaterGoal(false);
            setWaterFeedback(`Goal updated to ${(ml / 1000).toFixed(1)} L`);
            setTimeout(() => setWaterFeedback(''), 2000);
        }
    };

    const handleQuickWater = async (ml) => {
        const res = await addWater(ml);
        if (!res?.error) {
            setWaterFeedback(`+${ml >= 1000 ? `${(ml / 1000).toFixed(1)} L` : `${ml} ml`} added`);
            setTimeout(() => setWaterFeedback(''), 1800);
        }
    };

    const handleCustomWaterSubmit = async (e) => {
        e.preventDefault();
        const ml = parseInt(customWaterInput, 10);
        if (ml > 0) {
            const res = await addWater(ml);
            if (!res?.error) {
                setCustomWaterInput('');
                setShowCustomWater(false);
                setWaterFeedback(`+${ml >= 1000 ? `${(ml / 1000).toFixed(1)} L` : `${ml} ml`} added`);
                setTimeout(() => setWaterFeedback(''), 1800);
            }
        }
    };

    /* ── Manual Food modal state ── */
    const [showManualFoodModal, setShowManualFoodModal] = useState(false);
    const [manualFoodForm, setManualFoodForm] = useState({
        name: '',
        calories_per_100g: '',
        protein_per_100g: '',
        carbs_per_100g: '',
        fat_per_100g: '',
        fiber_per_100g: '',
        is_liquid: false,
        unit_name: '',
        grams_per_unit: '',
        source: 'manual',
    });
    const [manualFoodSaving, setManualFoodSaving] = useState(false);
    const [manualFoodError, setManualFoodError] = useState('');
    const [labelImagePreview, setLabelImagePreview] = useState(null);
    const [scanningLabel, setScanningLabel] = useState(false);
    const [scanStatusNote, setScanStatusNote] = useState('');
    const labelCameraInputRef = useRef(null);
    const labelFileInputRef = useRef(null);

    /* ── Full-screen scan overlay: { src, source, phase: 'scanning' | 'done' | 'error', result, error } ── */
    const [scanOverlay, setScanOverlay] = useState(null);
    const closeScanOverlay = () => {
        setScanOverlay((prev) => {
            if (prev?.src) URL.revokeObjectURL(prev.src);
            return null;
        });
    };
    const retakeFromOverlay = () => {
        const srcType = scanOverlay?.source || 'upload';
        closeScanOverlay();
        setLabelImagePreview(null);
        setScanStatusNote('');
        setTimeout(() => {
            if (srcType === 'camera') {
                labelCameraInputRef.current?.click();
            } else {
                labelFileInputRef.current?.click();
            }
        }, 150);
    };

    const openManualFoodModal = (prefillName = '', triggerAction = null) => {
        const query = prefillName || foodSearch.trim();
        const liquid = isLiquidFood({ name: query });
        setManualFoodForm({
            name: query,
            calories_per_100g: '',
            protein_per_100g: '',
            carbs_per_100g: '',
            fat_per_100g: '',
            fiber_per_100g: '',
            is_liquid: liquid,
            unit_name: liquid ? 'glass' : '',
            grams_per_unit: liquid ? '200' : '',
            source: 'manual',
        });
        setLabelImagePreview(null);
        setScanningLabel(false);
        setScanStatusNote('');
        setManualFoodError('');

        if (triggerAction === 'camera') {
            setShowManualFoodModal(false);
            setTimeout(() => labelCameraInputRef.current?.click(), 80);
        } else if (triggerAction === 'upload') {
            setShowManualFoodModal(false);
            setTimeout(() => labelFileInputRef.current?.click(), 80);
        } else {
            setShowManualFoodModal(true);
        }
    };

    const handleLabelImageFile = async (file, source = 'upload') => {
        if (!file) return;
        setManualFoodError('');
        setScanStatusNote('');
        setScanningLabel(true);
        setShowManualFoodModal(false);
        const objectUrl = URL.createObjectURL(file);
        setScanOverlay({ src: objectUrl, source, phase: 'scanning', result: null, error: '' });
        try {
            const compressedDataUrl = await compressImageFile(file, 1100, 0.80);
            setLabelImagePreview(compressedDataUrl);

            const parsed = await parseNutritionLabelImage(compressedDataUrl, manualFoodForm.name);

            setManualFoodForm((prev) => ({
                ...prev,
                name: parsed.name ? parsed.name : prev.name,
                calories_per_100g: parsed.calories_per_100g > 0 ? String(parsed.calories_per_100g) : prev.calories_per_100g,
                protein_per_100g: parsed.protein_per_100g >= 0 ? String(parsed.protein_per_100g) : prev.protein_per_100g,
                carbs_per_100g: parsed.carbs_per_100g >= 0 ? String(parsed.carbs_per_100g) : prev.carbs_per_100g,
                fat_per_100g: parsed.fat_per_100g >= 0 ? String(parsed.fat_per_100g) : prev.fat_per_100g,
                fiber_per_100g: parsed.fiber_per_100g >= 0 ? String(parsed.fiber_per_100g) : prev.fiber_per_100g,
                is_liquid: Boolean(parsed.is_liquid),
                unit_name: parsed.unit_name || prev.unit_name,
                grams_per_unit: parsed.grams_per_unit ? String(parsed.grams_per_unit) : prev.grams_per_unit,
                source: 'scan',
            }));

            setScanStatusNote(
                parsed.serving_size_text
                    ? `Normalized to 100${parsed.is_liquid ? 'ml' : 'g'} (label: ${parsed.serving_size_text})`
                    : `Extracted nutrition per 100${parsed.is_liquid ? 'ml' : 'g'}`
            );
            setScanOverlay((prev) => (prev ? { ...prev, phase: 'done', result: parsed } : prev));
        } catch (err) {
            console.error('Label scan error:', err);
            const msg = err.message || 'Could not parse nutrition label from this image';
            setManualFoodError(msg);
            setScanOverlay((prev) => (prev ? { ...prev, phase: 'error', error: msg } : prev));
        } finally {
            setScanningLabel(false);
        }
    };

    const handleManualFoodSubmit = async (e) => {
        e.preventDefault();
        if (!manualFoodForm.name.trim()) {
            setManualFoodError('Please enter a food name');
            return;
        }
        if (!manualFoodForm.calories_per_100g || Number(manualFoodForm.calories_per_100g) < 0) {
            setManualFoodError('Please enter valid calories per 100g');
            return;
        }
        setManualFoodSaving(true);
        setManualFoodError('');
        try {
            const saved = await addCustomFood(manualFoodForm);
            closeScanOverlay();
            setShowManualFoodModal(false);
            selectFoodItem(saved);
            setShowAddModal(true);
            setFeedback(`Saved "${saved.name}" to your database`);
            setTimeout(() => setFeedback(''), 2500);
        } catch (err) {
            setManualFoodError(err.message || 'Could not save food');
        } finally {
            setManualFoodSaving(false);
        }
    };

    const getSourceChip = (source) => {
        const s = String(source || '').toLowerCase();
        if (s === 'scan' || s === 'photo' || s === 'vision') {
            return (
                <span style={{
                    fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 5,
                    background: 'rgba(16,185,129,0.14)', color: '#10b981', letterSpacing: '0.03em',
                    display: 'inline-flex', alignItems: 'center', lineHeight: 1.3, gap: 3,
                }}>
                    <Camera size={9} /> Scan
                </span>
            );
        }
        if (s === 'manual') {
            return (
                <span style={{
                    fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 5,
                    background: 'rgba(168,85,247,0.14)', color: ACCENT, letterSpacing: '0.03em',
                    display: 'inline-flex', alignItems: 'center', lineHeight: 1.3,
                }}>
                    Manual
                </span>
            );
        }
        if (s === 'web' || s === 'web_search') {
            return (
                <span style={{
                    fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 5,
                    background: 'rgba(6,182,212,0.14)', color: '#06b6d4', letterSpacing: '0.03em',
                    display: 'inline-flex', alignItems: 'center', lineHeight: 1.3,
                }}>
                    Web
                </span>
            );
        }
        return null;
    };

    const dbSearch = useMemo(() => searchFoodDatabase(foodSearch), [foodSearch, searchFoodDatabase]);
    const unitInfo = useMemo(() => resolveFoodUnit(selectedFood), [selectedFood]);
    const effectiveGrams = useMemo(() => {
        if (!selectedFood) return 0;
        if (portionMode === 'ml') {
            return Math.max(0, parseFloat(mlInput) || 0);
        }
        if (portionMode === 'unit') {
            return Math.max(0, (parseFloat(countInput) || 0) * unitInfo.gramsPerUnit);
        }
        return Math.max(0, parseFloat(gramsInput) || 0);
    }, [selectedFood, portionMode, countInput, gramsInput, mlInput, unitInfo]);

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
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        for (let i = 6; i >= 0; i--) {
            const d = subDays(new Date(), i);
            const id = format(d, 'yyyy-MM-dd');
            const isTod = id === todayStr;
            days.push({
                id,
                label: narrow ? `${format(d, 'EEE, d MMM')}${isTod ? ' (Today)' : ''}` : format(d, 'EEE'),
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
        const waterEntries = (dailySummary.waterLogs || []).map((w) => ({
            ...w,
            type: 'water',
            name: `${w.amount_ml >= 1000 ? `${(w.amount_ml / 1000).toFixed(1)} L` : `${w.amount_ml} ml`} Water`,
            calories: 0,
        }));
        const merged = [...dailySummary.intakeLogs, ...dailySummary.burnLogs, ...waterEntries];
        return merged.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }, [dailySummary.intakeLogs, dailySummary.burnLogs, dailySummary.waterLogs]);

    const visibleLogs = allLogs.filter((l) => {
        if (logFilter === 'all') return true;
        if (logFilter === 'food') return l.type === 'intake';
        if (logFilter === 'exercise') return l.type === 'burn';
        if (logFilter === 'water') return l.type === 'water';
        return true;
    });

    const logOptions = [
        { id: 'all', label: 'All', count: allLogs.length },
        { id: 'food', label: 'Food', count: dailySummary.intakeLogs.length },
        { id: 'exercise', label: 'Exercise', count: dailySummary.burnLogs.length },
        { id: 'water', label: 'Water', count: (dailySummary.waterLogs || []).length },
    ];

    /* ── Handlers ── */
    const selectFoodItem = (food, queryOverride = null) => {
        if (!food) return;
        const info = resolveFoodUnit(food);
        const pq = queryOverride || dbSearch.parsedQuery;

        setSelectedFood(food);
        setFoodSearch(food.name);

        if (pq?.mode === 'ml' && pq.ml > 0) {
            setPortionMode('ml');
            setMlInput(String(pq.ml));
            setGramsInput(String(pq.ml));
            setCountInput('1');
        } else if (pq?.mode === 'unit' && pq.count > 0) {
            setPortionMode('unit');
            setCountInput(String(pq.count));
            setGramsInput(String(Math.round(pq.count * info.gramsPerUnit)));
            setMlInput(String(Math.round(pq.count * info.gramsPerUnit)));
        } else if (pq?.mode === 'grams' && pq.grams > 0) {
            setPortionMode('grams');
            setGramsInput(String(pq.grams));
            setMlInput(String(pq.grams));
            setCountInput('1');
        } else if (info.isLiquid || food.is_liquid || isLiquidFood(food)) {
            setPortionMode('ml');
            const defaultMl = info.gramsPerUnit || 200;
            setMlInput(String(defaultMl));
            setGramsInput(String(defaultMl));
            setCountInput('1');
        } else if (info.isCountable) {
            setPortionMode('unit');
            setCountInput('1');
            setGramsInput(String(info.gramsPerUnit));
            setMlInput(String(info.gramsPerUnit));
        } else {
            setPortionMode('grams');
            setCountInput('1');
            setGramsInput('150');
            setMlInput('150');
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
        const loggedUnit = portionMode === 'ml' ? 'ml' : (portionMode === 'unit' ? unitInfo.unitName : 'g');
        await addFoodIntake({
            foodItem: selectedFood,
            grams: effectiveGrams,
            count: loggedCount,
            unit: loggedUnit,
            mealType,
            date: selectedDate,
        });
        setSelectedFood(null);
        setFoodSearch('');
        setFeedback('');
        setShowAddModal(false);
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
        setShowAddModal(false);
    };

    const handleWeightSubmit = async (e) => {
        e.preventDefault();
        const val = parseFloat(weightInput);
        if (!val || val < 20 || val > 300) return;
        setWeightSaving(true);
        const res = await logDailyWeight({ weight_kg: val, date: selectedDate });
        setWeightSaving(false);
        if (!res?.error) {
            setWeightFeedback(`Logged ${val} kg for ${selectedDate === format(new Date(), 'yyyy-MM-dd') ? 'today' : selectedDate}`);
            setTimeout(() => {
                setShowAddModal(false);
            }, 600);
        }
    };

    const handleStepWeight = (delta) => {
        const cur = parseFloat(weightInput) || currentWeight || 70;
        const next = Math.round((cur + delta) * 10) / 10;
        if (next >= 20 && next <= 300) {
            setWeightInput(String(next));
        }
    };

    const openBmr = () => {
        setBmrForm({
            weight_kg: bmrSettings.weight_kg || 70,
            height_cm: bmrSettings.height_cm || 175,
            age: bmrSettings.age || 24,
            gender: bmrSettings.gender || 'male',
            bmr_override: bmrSettings.bmr_override || '',
            water_goal_ml: bmrSettings.water_goal_ml || 3000,
        });
        setShowBmr(true);
    };

    const handleSaveBmr = async (e) => {
        e.preventDefault();
        await saveBmrSettings({
            ...bmrForm,
            bmr_override: bmrForm.bmr_override ? Number(bmrForm.bmr_override) : null,
            water_goal_ml: bmrForm.water_goal_ml ? Number(bmrForm.water_goal_ml) : 3000,
        });
        setShowBmr(false);
    };

    const inputStyle = {
        width: '100%', padding: '11px 14px', borderRadius: 12, fontSize: 14,
        fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
    };

    const heightM = (Number(bmrSettings.height_cm) || 175) / 100;
    const enteredBmi = heightM > 0 && parseFloat(weightInput) > 0 ? (parseFloat(weightInput) / (heightM * heightM)).toFixed(1) : null;

    const renderWeeklyAnalytics = (inModal = false) => {
        const waterGoalL = Math.round(((Number(bmrSettings?.water_goal_ml) || 3000) / 1000) * 10) / 10;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 10, flexWrap: 'wrap' }}>
                    <div>
                        {!inModal && <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>This week</h2>}
                        {chartTab === 'weight' && weekWeightStats.count > 0 && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: MONO, marginTop: 2, display: 'block' }}>
                                {weekWeightStats.latestWeight} kg · {weekWeightStats.change > 0 ? `+${weekWeightStats.change}` : weekWeightStats.change} kg this week
                            </span>
                        )}
                        {chartTab === 'calories' && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: MONO, marginTop: 2, display: 'block' }}>
                                Avg: {fmt(avgWeekIntake)} in · {fmt(avgWeekBurn)} out
                            </span>
                        )}
                        {chartTab === 'water' && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: MONO, marginTop: 2, display: 'block' }}>
                                Avg: {avgWeekWaterL} L/day
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {chartTab === 'calories' ? (
                            <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT }} /> In
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: AMBER }} /> Out
                                </span>
                            </div>
                        ) : chartTab === 'water' ? (
                            <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#06b6d4' }} /> Water (L)
                                </span>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} /> kg
                                </span>
                            </div>
                        )}
                        <div style={{ width: narrow ? 210 : 225 }}>
                            <LiquidGlassSegmented
                                options={[
                                    { id: 'calories', label: 'Calories' },
                                    { id: 'weight', label: 'Weight' },
                                    { id: 'water', label: 'Water' },
                                ]}
                                value={chartTab}
                                onChange={setChartTab}
                                size="sm"
                                fullWidth
                                ariaLabel="Chart view"
                            />
                        </div>
                    </div>
                </div>

                <div style={{ width: '100%', height: inModal ? 210 : 170 }}>
                    {chartTab === 'calories' ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={weeklyTrend} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="intakeWaveGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={ACCENT} stopOpacity={0.45} />
                                        <stop offset="95%" stopColor={ACCENT} stopOpacity={0.0} />
                                    </linearGradient>
                                    <linearGradient id="burnWaveGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={AMBER} stopOpacity={0.22} />
                                        <stop offset="95%" stopColor={AMBER} stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="dayLabel" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ stroke: 'var(--border-subtle)', strokeDasharray: '3 3' }}
                                    content={({ active, payload, label }) => {
                                        if (!active || !payload || !payload.length) return null;
                                        const intakeVal = payload.find(p => p.dataKey === 'intake')?.value || 0;
                                        const burnVal = payload.find(p => p.dataKey === 'totalBurn')?.value || 0;
                                        const netVal = intakeVal - burnVal;
                                        return (
                                            <div style={{
                                                background: 'var(--surface-elevated)',
                                                border: '1px solid var(--glass-border)',
                                                borderRadius: 12,
                                                padding: '8px 12px',
                                                fontSize: 12,
                                                boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
                                            }}>
                                                <div style={{ fontWeight: 700, marginBottom: 5, color: 'var(--text-primary)' }}>{label}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: ACCENT, fontSize: 11 }}>
                                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT }} />
                                                    <span>Intake: <strong>{intakeVal} kcal</strong></span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: AMBER, fontSize: 11, marginTop: 2 }}>
                                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: AMBER }} />
                                                    <span>Burn: <strong>{burnVal} kcal</strong></span>
                                                </div>
                                                <div style={{
                                                    marginTop: 6,
                                                    paddingTop: 5,
                                                    borderTop: '1px solid var(--border-subtle)',
                                                    fontFamily: MONO,
                                                    fontSize: 11,
                                                    color: netVal > 0 ? AMBER : GREEN,
                                                }}>
                                                    Net: {netVal > 0 ? `+${netVal}` : netVal} kcal ({netVal > 0 ? 'Surplus' : 'Deficit'})
                                                </div>
                                            </div>
                                        );
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="totalBurn"
                                    name="Burn"
                                    stroke={AMBER}
                                    strokeWidth={2}
                                    strokeDasharray="4 4"
                                    fill="url(#burnWaveGrad)"
                                    dot={{ r: 3, fill: AMBER, stroke: 'var(--surface-elevated)', strokeWidth: 1.5 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="intake"
                                    name="Intake"
                                    stroke={ACCENT}
                                    strokeWidth={2.5}
                                    fill="url(#intakeWaveGrad)"
                                    dot={{ r: 4, fill: ACCENT, stroke: 'var(--surface-elevated)', strokeWidth: 2 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : chartTab === 'water' ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={weeklyTrend} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="waterWaveGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.45} />
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="dayLabel" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis
                                    stroke="var(--text-muted)"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    unit="L"
                                    domain={[0, (dataMax) => Math.max(Math.ceil((dataMax || 3) + 0.5), Math.ceil(waterGoalL))]}
                                />
                                <Tooltip
                                    cursor={{ stroke: 'var(--border-subtle)', strokeDasharray: '3 3' }}
                                    content={({ active, payload, label }) => {
                                        if (!active || !payload || !payload.length) return null;
                                        const waterVal = payload[0]?.value || 0;
                                        const pct = waterGoalL > 0 ? Math.round((waterVal / waterGoalL) * 100) : 0;
                                        return (
                                            <div style={{
                                                background: 'var(--surface-elevated)',
                                                border: '1px solid var(--glass-border)',
                                                borderRadius: 12,
                                                padding: '8px 12px',
                                                fontSize: 12,
                                                boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
                                            }}>
                                                <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>{label}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#06b6d4', fontSize: 11 }}>
                                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#06b6d4' }} />
                                                    <span>Water: <strong>{waterVal} L</strong> ({Math.round(waterVal * 1000)} ml)</span>
                                                </div>
                                                <div style={{
                                                    marginTop: 5,
                                                    paddingTop: 5,
                                                    borderTop: '1px solid var(--border-subtle)',
                                                    fontFamily: MONO,
                                                    fontSize: 11,
                                                    color: waterVal >= waterGoalL ? GREEN : 'var(--text-muted)',
                                                }}>
                                                    {pct}% of {waterGoalL}L goal {waterVal >= waterGoalL ? '✓' : ''}
                                                </div>
                                            </div>
                                        );
                                    }}
                                />
                                {waterGoalL > 0 && (
                                    <ReferenceLine
                                        y={waterGoalL}
                                        stroke="rgba(6,182,212,0.4)"
                                        strokeDasharray="4 4"
                                        label={{ value: `${waterGoalL}L Goal`, fill: 'var(--text-muted)', fontSize: 9, position: 'insideTopRight' }}
                                    />
                                )}
                                <Area
                                    type="monotone"
                                    dataKey="waterL"
                                    name="Water"
                                    stroke="#06b6d4"
                                    strokeWidth={2.5}
                                    fill="url(#waterWaveGrad)"
                                    dot={{ r: 4, fill: '#06b6d4', stroke: 'var(--surface-elevated)', strokeWidth: 2 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : weekWeightStats.count === 0 ? (
                    <div style={{
                        height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', gap: 8, textAlign: 'center', padding: '0 16px',
                    }}>
                        <Scale size={24} style={{ color: '#3b82f6', opacity: 0.8 }} />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            No weigh-ins recorded for this 7-day period.
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                if (inModal) setShowAnalytics(false);
                                setMode('weight');
                                setShowAddModal(true);
                            }}
                            style={{
                                padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                                background: 'rgba(59,130,246,0.15)', color: '#3b82f6',
                                border: '1px solid rgba(59,130,246,0.3)', cursor: 'pointer',
                            }}
                        >
                            Log weight
                        </button>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={weeklyTrend} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
                            <defs>
                                <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="dayLabel" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis
                                stroke="var(--text-muted)"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                domain={[
                                    (dataMin) => Math.floor(Math.max(0, (dataMin || currentWeight) - 1)),
                                    (dataMax) => Math.ceil((dataMax || currentWeight) + 1),
                                ]}
                            />
                            <Tooltip
                                cursor={{ stroke: 'var(--border-subtle)', strokeDasharray: '3 3' }}
                                contentStyle={{
                                    background: 'var(--surface-elevated)', border: '1px solid var(--glass-border)',
                                    borderRadius: 10, fontSize: 12,
                                }}
                                formatter={(val) => (val ? [`${val} kg`, 'Weight'] : ['Not logged', 'Weight'])}
                            />
                            <Area
                                type="monotone"
                                dataKey="weight"
                                stroke="#3b82f6"
                                strokeWidth={2.5}
                                fill="url(#weightAreaGrad)"
                                connectNulls={true}
                                dot={{ r: 4, fill: '#3b82f6', stroke: 'var(--surface-elevated)', strokeWidth: 2 }}
                                activeDot={{ r: 6, fill: '#60a5fa' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

    /* ── Add Entry Logger (Rendered inside Add Modal) ── */
    const renderLogger = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <LiquidGlassSegmented
                options={[
                    { id: 'food', label: 'Food', icon: Utensils, color: ACCENT },
                    { id: 'exercise', label: 'Exercise', icon: Dumbbell, color: AMBER },
                    { id: 'weight', label: 'Weight', icon: Scale, color: '#3b82f6' },
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

                    {!foodSearch.trim() && !selectedFood && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: -4 }}>
                            <button
                                type="button"
                                onClick={() => openManualFoodModal('', 'camera')}
                                style={{
                                    background: 'transparent', border: 'none', color: '#10b981',
                                    fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                                    padding: '2px 4px',
                                }}
                            >
                                <Camera size={12} /> Scan label
                            </button>
                            <button
                                type="button"
                                onClick={() => openManualFoodModal('')}
                                style={{
                                    background: 'transparent', border: 'none', color: 'var(--text-muted)',
                                    fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                                    padding: '2px 4px',
                                }}
                            >
                                <Plus size={12} /> Add manually
                            </button>
                        </div>
                    )}

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
                            foodSearch.trim() ? (
                                <motion.div
                                    key="results"
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    {dbSearch.results.length > 0 ? (
                                        <div style={{ maxHeight: 250, overflowY: 'auto', margin: '0 -4px', padding: '0 4px' }}>
                                            <Label style={{ display: 'block', margin: '2px 0 6px' }}>
                                                Database suggestions ({dbSearch.results.length})
                                            </Label>
                                            {dbSearch.results.slice(0, 8).map((item) => {
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
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                                                                {getSourceChip(item.source)}
                                                            </span>
                                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: MONO }}>
                                                                {itemUnit.isCountable
                                                                    ? `1 ${itemUnit.unitName} (${itemUnit.gramsPerUnit}g) · ${Math.round(item.calories_per_100g)}/100g`
                                                                    : `P ${item.protein_per_100g} · C ${item.carbs_per_100g} · F ${item.fat_per_100g}${item.fiber_per_100g ? ` · Fib ${item.fiber_per_100g}g` : ''}`}
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

                                            <div style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                gap: 8, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)',
                                                flexWrap: 'wrap',
                                            }}>
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Not in suggestions?</span>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => openManualFoodModal(foodSearch, 'camera')}
                                                        style={{
                                                            padding: '5px 9px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                                            background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
                                                            color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                                                        }}
                                                    >
                                                        <Camera size={12} /> Scan
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleWebSearch(foodSearch)}
                                                        disabled={searchingWeb}
                                                        style={{
                                                            padding: '5px 9px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                                            background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)',
                                                            color: '#06b6d4', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                                                        }}
                                                    >
                                                        {searchingWeb ? <Loader2 size={12} className="spin" /> : <Globe size={12} />}
                                                        {searchingWeb ? 'Searching…' : 'Web lookup'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openManualFoodModal(foodSearch)}
                                                        style={{
                                                            padding: '5px 9px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                                            background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)',
                                                            color: ACCENT, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                                                        }}
                                                    >
                                                        <Plus size={12} /> Add manually
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{
                                            display: 'flex', flexDirection: 'column', gap: 10, padding: '14px', borderRadius: 14,
                                            background: 'var(--surface-input)', border: '1px solid var(--border-subtle)',
                                        }}>
                                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                                "{foodSearch.trim()}" is not in your database yet.
                                            </span>
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => openManualFoodModal(foodSearch, 'camera')}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                        padding: '9px 14px', fontSize: 13, flex: 1, minWidth: 120,
                                                        background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)',
                                                        color: '#10b981', borderRadius: 12, fontWeight: 700, cursor: 'pointer',
                                                    }}
                                                >
                                                    <Camera size={14} /> Scan label
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleWebSearch(foodSearch)}
                                                    disabled={searchingWeb}
                                                    className="btn-primary"
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                                                        padding: '9px 14px', fontSize: 13, flex: 1, minWidth: 140,
                                                    }}
                                                >
                                                    {searchingWeb ? <Loader2 size={14} className="spin" /> : <Globe size={14} />}
                                                    {searchingWeb ? 'Searching…' : 'Search web & save'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openManualFoodModal(foodSearch)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                                        padding: '9px 14px', fontSize: 13, flex: 1, minWidth: 120,
                                                        background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.35)',
                                                        color: ACCENT, borderRadius: 12, fontWeight: 700, cursor: 'pointer',
                                                    }}
                                                >
                                                    <Plus size={14} /> Add manually
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ) : null
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedFood.name}</span>
                                            {getSourceChip(selectedFood.source)}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: MONO, marginTop: 2 }}>
                                            {unitInfo.isLiquid || selectedFood.is_liquid || isLiquidFood(selectedFood)
                                                ? (portionMode === 'unit'
                                                    ? `1 ${unitInfo.unitName} ≈ ${unitInfo.gramsPerUnit}ml · ${Math.round((selectedFood.calories_per_100g * unitInfo.gramsPerUnit) / 100)} kcal (${Math.round(selectedFood.calories_per_100g)}/100ml)`
                                                    : `${Math.round(selectedFood.calories_per_100g)} kcal / 100ml`)
                                                : (portionMode === 'unit'
                                                    ? `1 ${unitInfo.unitName} ≈ ${unitInfo.gramsPerUnit}g · ${Math.round((selectedFood.calories_per_100g * unitInfo.gramsPerUnit) / 100)} kcal (${Math.round(selectedFood.calories_per_100g)}/100g)`
                                                    : `${Math.round(selectedFood.calories_per_100g)} kcal / 100g`)}
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

                                {(() => {
                                    const isLiquid = Boolean(unitInfo.isLiquid || selectedFood.is_liquid || isLiquidFood(selectedFood));
                                    const portionOptions = isLiquid
                                        ? [
                                            { id: 'ml', label: 'Milliliters (ml)' },
                                            ...(unitInfo.isCountable
                                                ? [{ id: 'unit', label: `${unitInfo.unitName.charAt(0).toUpperCase() + unitInfo.unitName.slice(1)} (${unitInfo.gramsPerUnit}ml)` }]
                                                : []),
                                            { id: 'grams', label: 'Grams (g)' },
                                        ]
                                        : [
                                            ...(unitInfo.isCountable
                                                ? [{ id: 'unit', label: `${unitInfo.unitName.charAt(0).toUpperCase() + unitInfo.unitName.slice(1)} (${unitInfo.gramsPerUnit}g)` }]
                                                : []),
                                            { id: 'grams', label: 'Grams (g)' },
                                        ];

                                    return (
                                        <>
                                            <LiquidGlassSegmented
                                                options={portionOptions}
                                                value={portionMode}
                                                dropdownBreakpoint={380}
                                                dropdownLabel="Unit:"
                                                onChange={(nextMode) => {
                                                    setPortionMode(nextMode);
                                                    if (nextMode === 'ml') {
                                                        const mlVal = portionMode === 'unit'
                                                            ? Math.round((parseFloat(countInput) || 1) * unitInfo.gramsPerUnit)
                                                            : Math.round(parseFloat(gramsInput) || 200);
                                                        setMlInput(String(mlVal || 200));
                                                    } else if (nextMode === 'grams') {
                                                        const g = portionMode === 'unit'
                                                            ? Math.round((parseFloat(countInput) || 1) * unitInfo.gramsPerUnit)
                                                            : Math.round(parseFloat(mlInput) || 150);
                                                        setGramsInput(String(g || 150));
                                                    } else if (nextMode === 'unit') {
                                                        const base = portionMode === 'ml'
                                                            ? (parseFloat(mlInput) || unitInfo.gramsPerUnit)
                                                            : (parseFloat(gramsInput) || unitInfo.gramsPerUnit);
                                                        const c = Math.max(0.5, Math.round((base / (unitInfo.gramsPerUnit || 100)) * 2) / 2);
                                                        setCountInput(String(c));
                                                    }
                                                }}
                                                size="sm"
                                                fullWidth
                                                ariaLabel="Portion unit mode"
                                            />

                                            {portionMode === 'ml' ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                    <div style={{ position: 'relative', width: 112 }}>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="5000"
                                                            step="any"
                                                            inputMode="decimal"
                                                            value={mlInput}
                                                            onChange={(e) => setMlInput(e.target.value)}
                                                            className="surface-input"
                                                            style={{ ...inputStyle, padding: '9px 32px 9px 12px', fontFamily: MONO, fontWeight: 700 }}
                                                        />
                                                        <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-muted)' }}>ml</span>
                                                    </div>
                                                    {ML_PRESETS.map((m) => {
                                                        const on = Number(mlInput) === m;
                                                        return (
                                                            <button
                                                                key={m}
                                                                type="button"
                                                                onClick={() => setMlInput(String(m))}
                                                                style={{
                                                                    padding: '6px 10px', borderRadius: 9, fontSize: 12, fontWeight: 700,
                                                                    fontFamily: MONO, cursor: 'pointer',
                                                                    background: on ? `${ACCENT}22` : 'transparent',
                                                                    border: on ? `1px solid ${ACCENT}` : '1px solid var(--border-subtle)',
                                                                    color: on ? ACCENT : 'var(--text-muted)',
                                                                }}
                                                            >
                                                                {m}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            ) : portionMode === 'unit' ? (
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
                                                        = {Math.round(effectiveGrams)}{isLiquid ? 'ml' : 'g'}
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
                                        </>
                                    );
                                })()}

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
                                            P {livePreview?.protein_g || 0} · C {livePreview?.carbs_g || 0} · F {livePreview?.fat_g || 0}{livePreview?.fiber_g ? ` · Fib ${livePreview.fiber_g}g` : ''}
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
            ) : mode === 'exercise' ? (
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
            ) : (
                <form onSubmit={handleWeightSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', borderRadius: 14,
                        background: 'var(--surface-input)', border: '1px solid var(--border-subtle)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <div style={{
                                width: 30, height: 30, borderRadius: 9, display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                                background: 'rgba(59,130,246,0.15)', color: '#3b82f6',
                            }}>
                                <Scale size={16} />
                            </div>
                            <div>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {selectedDate === format(new Date(), 'yyyy-MM-dd') ? "Today's Weigh-in" : `Weigh-in for ${selectedDate}`}
                                </span>
                                <span style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', fontFamily: MONO }}>
                                    {todayWeightLog ? `Logged: ${todayWeightLog.weight_kg} kg` : `Current: ${currentWeight} kg`}
                                </span>
                            </div>
                        </div>
                        {todayWeightLog && (
                            <button
                                type="button"
                                onClick={() => deleteDailyWeight(selectedDate)}
                                style={{
                                    background: 'transparent', border: 'none', color: 'var(--text-muted)',
                                    fontSize: 11, cursor: 'pointer', padding: '4px 6px',
                                }}
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                        <Label>Weight</Label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                                type="button"
                                onClick={() => handleStepWeight(-0.5)}
                                style={{
                                    padding: '8px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                                    fontFamily: MONO, cursor: 'pointer', background: 'var(--surface-input)',
                                    border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)',
                                }}
                            >
                                -0.5
                            </button>
                            <button
                                type="button"
                                onClick={() => handleStepWeight(-0.1)}
                                style={{
                                    padding: '8px 9px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                                    fontFamily: MONO, cursor: 'pointer', background: 'var(--surface-input)',
                                    border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)',
                                }}
                            >
                                -0.1
                            </button>
                            <div style={{ position: 'relative', width: 130 }}>
                                <input
                                    type="number"
                                    min="20"
                                    max="300"
                                    step="0.1"
                                    inputMode="decimal"
                                    value={weightInput}
                                    onChange={(e) => setWeightInput(e.target.value)}
                                    className="surface-input"
                                    style={{
                                        ...inputStyle, padding: '10px 36px 10px 12px',
                                        fontFamily: MONO, fontSize: 22, fontWeight: 800, textAlign: 'center',
                                    }}
                                />
                                <span style={{
                                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                    fontSize: 12, color: 'var(--text-muted)', fontWeight: 700,
                                }}>
                                    kg
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleStepWeight(0.1)}
                                style={{
                                    padding: '8px 9px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                                    fontFamily: MONO, cursor: 'pointer', background: 'var(--surface-input)',
                                    border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)',
                                }}
                            >
                                +0.1
                            </button>
                            <button
                                type="button"
                                onClick={() => handleStepWeight(0.5)}
                                style={{
                                    padding: '8px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                                    fontFamily: MONO, cursor: 'pointer', background: 'var(--surface-input)',
                                    border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)',
                                }}
                            >
                                +0.5
                            </button>
                        </div>

                        {enteredBmi && (
                            <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                <span>BMI: <strong style={{ color: 'var(--text-primary)', fontFamily: MONO }}>{enteredBmi}</strong></span>
                                <span>·</span>
                                <span>Auto-syncs to BMR & calorie burn</span>
                            </div>
                        )}
                    </div>

                    {weightFeedback && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: GREEN, justifyContent: 'center' }}>
                            <Check size={14} /> {weightFeedback}
                        </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Consistent morning weigh-ins recommended.
                        </span>
                        <button
                            type="submit"
                            disabled={weightSaving}
                            className="btn-primary cal-add-btn"
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                gap: 7, padding: '11px 22px', fontSize: 14,
                                background: '#3b82f6',
                            }}
                        >
                            <Scale size={16} />
                            {weightSaving ? 'Saving…' : todayWeightLog ? 'Update Weight' : 'Log Weight'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );

    /* ═══════════════ RENDER ═══════════════ */
    return (
        <div className="page-container cal-page" style={{ maxWidth: 1080, margin: '0 auto', width: '100%' }}>
            {/* Header */}
            <motion.header
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}
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
                        Intake, burn, weight & macros
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => { setMode('weight'); setShowAddModal(true); }}
                        aria-label="Track weight"
                        style={{
                            height: 36, padding: '0 12px', borderRadius: 12, display: 'flex',
                            alignItems: 'center', gap: 6, cursor: 'pointer',
                            background: mode === 'weight' ? 'rgba(59,130,246,0.18)' : 'var(--surface-input, rgba(255,255,255,0.04))',
                            border: mode === 'weight' ? '1px solid #3b82f6' : '1px solid var(--border-subtle)',
                            color: mode === 'weight' ? '#3b82f6' : 'var(--text-secondary)',
                            fontSize: 12, fontWeight: 700,
                        }}
                    >
                        <Scale size={15} />
                        <span style={{ fontFamily: MONO }}>
                            {todayWeightLog ? todayWeightLog.weight_kg : currentWeight}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>kg</span>
                    </motion.button>
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
                    <motion.button
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setShowAnalytics(true)}
                        aria-label="Weekly analytics"
                        style={{
                            height: 36, padding: '0 12px', borderRadius: 12, display: 'flex',
                            alignItems: 'center', gap: 6, cursor: 'pointer',
                            background: showAnalytics ? 'rgba(168,85,247,0.18)' : 'var(--surface-input, rgba(255,255,255,0.04))',
                            border: showAnalytics ? '1px solid var(--accent, #a855f7)' : '1px solid var(--border-subtle)',
                            color: showAnalytics ? 'var(--accent, #a855f7)' : 'var(--text-secondary)',
                            fontSize: 12, fontWeight: 700,
                        }}
                    >
                        <TrendingUp size={15} style={{ color: ACCENT }} />
                        <span>Analytics</span>
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.92 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => { setMode('food'); setShowAddModal(true); }}
                        className="btn-primary"
                        style={{
                            height: 36, padding: '0 14px', borderRadius: 12, display: 'flex',
                            alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13,
                            fontWeight: 700,
                        }}
                    >
                        <Plus size={16} strokeWidth={2.6} />
                        <span>Add</span>
                    </motion.button>
                </div>
            </motion.header>

            {/* Glass date strip */}
            <div style={{ marginBottom: 18 }}>
                <LiquidGlassSegmented
                    options={dateOptions}
                    value={selectedDate}
                    onChange={setSelectedDate}
                    size="sm"
                    fullWidth
                    dropdownBreakpoint={520}
                    dropdownLabel="Date:"
                    ariaLabel="Select day"
                />
            </div>

            <div className="cal-layout">
                {/* ───────── LEFT COLUMN ───────── */}
                <div className="cal-col cal-col-left">
                    {/* Unified Daily Nutrition: Hero & Macros */}
                    <motion.section
                        className="gradient-border glow-purple cal-card-nutrition"
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
                            <div style={{ minWidth: 0, flex: 1 }}>
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

                        {/* Macros */}
                        <div style={{
                            display: 'flex', flexDirection: 'column', gap: 12,
                            paddingTop: 14, borderTop: '1px solid var(--border-subtle)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Label>Macros</Label>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: MONO }}>
                                    {Math.round(macroKcal)} kcal logged
                                </span>
                            </div>
                            <div style={{
                                display: 'flex', height: 8, borderRadius: 9999, overflow: 'hidden',
                                background: 'var(--border-subtle)', gap: 2,
                            }}>
                                <div style={{ width: `${pPct}%`, background: '#6366f1', transition: 'width .4s ease' }} />
                                <div style={{ width: `${cPct}%`, background: GREEN, transition: 'width .4s ease' }} />
                                <div style={{ width: `${fPct}%`, background: AMBER, transition: 'width .4s ease' }} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                                {[
                                    { label: 'Protein', value: dailySummary.totalProtein, color: '#6366f1', pct: pPct },
                                    { label: 'Carbs', value: dailySummary.totalCarbs, color: GREEN, pct: cPct },
                                    { label: 'Fat', value: dailySummary.totalFat, color: AMBER, pct: fPct },
                                    { label: 'Fiber', value: dailySummary.totalFiber || 0, color: FIBER_COLOR, pct: null },
                                ].map((m) => (
                                    <div key={m.label}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color }} />
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{m.label}</span>
                                        </div>
                                        <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>
                                            {Math.round(m.value)}<span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>g</span>
                                        </div>
                                        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: MONO }}>
                                            {m.pct !== null ? `${m.pct}%` : `${Math.round(m.value)}g`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.section>

                    {/* Water Intake Tracker */}
                    {(() => {
                        const waterGoalMl = dailySummary.waterGoalMl || 3000;
                        const totalWaterMl = dailySummary.totalWaterMl || 0;
                        const waterRemainingMl = Math.max(0, waterGoalMl - totalWaterMl);
                        const isGoalMet = dailySummary.waterPct >= 100;

                        return (
                            <motion.section
                                className="gradient-border glow-cyan cal-card-water"
                                style={{ ...card, display: 'flex', flexDirection: 'column', gap: 15 }}
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.12, type: 'spring', stiffness: 300, damping: 25 }}
                            >
                                {/* Header */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: 12,
                                            background: 'linear-gradient(135deg, rgba(6,182,212,0.2) 0%, rgba(59,130,246,0.12) 100%)',
                                            border: '1px solid rgba(6,182,212,0.3)',
                                            color: '#06b6d4',
                                            boxShadow: '0 0 16px rgba(6,182,212,0.18)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <Droplets size={20} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                                                Water Intake
                                            </h3>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                                                {isGoalMet
                                                    ? 'Target achieved! Keep staying hydrated.'
                                                    : `${dailySummary.waterLogs?.length || 0} drink${dailySummary.waterLogs?.length === 1 ? '' : 's'} logged · ${waterRemainingMl.toLocaleString()} ml remaining`}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, justifyContent: 'flex-end' }}>
                                            <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 800, color: '#06b6d4', lineHeight: 1 }}>
                                                {(totalWaterMl / 1000).toFixed(1)}
                                            </span>
                                            <span style={{
                                                fontSize: 13,
                                                color: 'var(--text-muted)',
                                                fontFamily: MONO,
                                                fontWeight: 600,
                                            }}>
                                                / {(waterGoalMl / 1000).toFixed(1)} L
                                            </span>
                                        </div>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: MONO, display: 'block', marginTop: 2 }}>
                                            {totalWaterMl.toLocaleString()} / {waterGoalMl.toLocaleString()} ml
                                        </span>
                                    </div>
                                </div>

                                {/* Liquid Glass Capsule Track */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <div style={{
                                        position: 'relative', width: '100%', height: 12, borderRadius: 9999,
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.45), inset 0 0 0 1px rgba(255, 255, 255, 0.06)',
                                        overflow: 'hidden',
                                    }}>
                                        {/* Milestone tick notches */}
                                        <div style={{ position: 'absolute', left: '33.3%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.08)', zIndex: 2 }} />
                                        <div style={{ position: 'absolute', left: '66.6%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.08)', zIndex: 2 }} />

                                        {/* Liquid Stream */}
                                        <div style={{
                                            width: `${Math.min(100, dailySummary.waterPct)}%`,
                                            height: '100%',
                                            background: isGoalMet
                                                ? 'linear-gradient(90deg, #06b6d4 0%, #10b981 100%)'
                                                : 'linear-gradient(90deg, #06b6d4 0%, #38bdf8 55%, #3b82f6 100%)',
                                            borderRadius: 9999,
                                            boxShadow: '0 0 14px rgba(6, 182, 212, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.45)',
                                            transition: 'width 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                            position: 'relative',
                                        }} />
                                    </div>

                                    {/* Milestone Labels */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', fontFamily: MONO, padding: '0 2px' }}>
                                        <span>0L</span>
                                        <span>{((waterGoalMl * 0.33) / 1000).toFixed(1)}L</span>
                                        <span>{((waterGoalMl * 0.66) / 1000).toFixed(1)}L</span>
                                        <span style={{ color: isGoalMet ? GREEN : 'var(--text-muted)', fontWeight: 600 }}>
                                            {(waterGoalMl / 1000).toFixed(1)}L Goal
                                        </span>
                                    </div>
                                </div>

                                {/* Quick Presets Grid: 250ml, 500ml, 750ml, 1L */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                                    {[
                                        { ml: 250, label: '250 ml', vessel: 'glass' },
                                        { ml: 500, label: '500 ml', vessel: 'bottle' },
                                        { ml: 750, label: '750 ml', vessel: 'sipper' },
                                        { ml: 1000, label: '1 L', vessel: 'flask' },
                                    ].map((preset) => (
                                        <motion.button
                                            key={preset.ml}
                                            type="button"
                                            onClick={() => handleQuickWater(preset.ml)}
                                            whileHover={{ y: -2, scale: 1.02 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="cal-water-btn"
                                            style={{
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                gap: 8, padding: '14px 6px', borderRadius: 14,
                                                background: 'rgba(6, 182, 212, 0.05)',
                                                border: '1px solid rgba(6, 182, 212, 0.2)',
                                                cursor: 'pointer', outline: 'none',
                                            }}
                                        >
                                            {/* Vessel Graphic */}
                                            <div style={{ height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {renderVesselSvg(preset.vessel)}
                                            </div>

                                            {/* Amount */}
                                            <span style={{
                                                fontFamily: MONO,
                                                fontSize: 13,
                                                fontWeight: 800,
                                                color: 'var(--text-primary)',
                                                letterSpacing: '-0.02em',
                                                lineHeight: 1,
                                            }}>
                                                {preset.label}
                                            </span>
                                        </motion.button>
                                    ))}
                                </div>

                                {/* Actions & Feedback Footer */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 2 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <button
                                            type="button"
                                            onClick={() => undoLastWater()}
                                            disabled={!dailySummary.waterLogs || dailySummary.waterLogs.length === 0}
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                                padding: '6px 12px', borderRadius: 9, fontSize: 11, fontWeight: 600,
                                                background: 'rgba(255, 255, 255, 0.04)',
                                                border: '1px solid var(--border-subtle)',
                                                color: (!dailySummary.waterLogs || dailySummary.waterLogs.length === 0) ? 'var(--text-muted)' : 'var(--text-secondary)',
                                                cursor: (!dailySummary.waterLogs || dailySummary.waterLogs.length === 0) ? 'not-allowed' : 'pointer',
                                                opacity: (!dailySummary.waterLogs || dailySummary.waterLogs.length === 0) ? 0.35 : 1,
                                                transition: 'all 0.15s ease',
                                            }}
                                        >
                                            <RotateCcw size={12} /> Undo
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setShowCustomWater(!showCustomWater)}
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                                padding: '6px 12px', borderRadius: 9, fontSize: 11, fontWeight: 600,
                                                background: showCustomWater ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                                                border: showCustomWater ? '1px solid rgba(6, 182, 212, 0.35)' : '1px solid var(--border-subtle)',
                                                color: showCustomWater ? '#06b6d4' : 'var(--text-secondary)',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                            }}
                                        >
                                            <Plus size={12} /> {showCustomWater ? 'Close' : 'Custom ml'}
                                        </button>
                                    </div>

                                    {waterFeedback ? (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: 3 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            style={{
                                                fontSize: 11, fontWeight: 700, color: '#06b6d4',
                                                background: 'rgba(6, 182, 212, 0.12)',
                                                border: '1px solid rgba(6, 182, 212, 0.25)',
                                                padding: '4px 10px', borderRadius: 9999,
                                                display: 'flex', alignItems: 'center', gap: 4,
                                            }}
                                        >
                                            <Droplets size={11} /> {waterFeedback}
                                        </motion.div>
                                    ) : (
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: MONO }}>
                                            {waterRemainingMl > 0 ? `${waterRemainingMl} ml to goal` : 'Goal met!'}
                                        </span>
                                    )}
                                </div>

                                {/* Custom ml expanded drawer */}
                                <AnimatePresence>
                                    {showCustomWater && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            style={{ overflow: 'hidden' }}
                                        >
                                            <div style={{
                                                padding: 12, borderRadius: 14,
                                                background: 'rgba(6, 182, 212, 0.04)',
                                                border: '1px solid rgba(6, 182, 212, 0.18)',
                                                display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4,
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Quick:</span>
                                                    {[150, 300, 400, 600].map((quickMl) => (
                                                        <button
                                                            key={quickMl}
                                                            type="button"
                                                            onClick={() => setCustomWaterInput(String(quickMl))}
                                                            style={{
                                                                padding: '3px 8px', borderRadius: 6, fontSize: 11, fontFamily: MONO,
                                                                background: customWaterInput === String(quickMl) ? 'rgba(6,182,212,0.22)' : 'rgba(255,255,255,0.05)',
                                                                border: customWaterInput === String(quickMl) ? '1px solid rgba(6,182,212,0.4)' : '1px solid var(--border-subtle)',
                                                                color: customWaterInput === String(quickMl) ? '#06b6d4' : 'var(--text-secondary)',
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            +{quickMl}ml
                                                        </button>
                                                    ))}
                                                </div>

                                                <form onSubmit={handleCustomWaterSubmit} style={{ display: 'flex', gap: 8 }}>
                                                    <div style={{ position: 'relative', flex: 1 }}>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="5000"
                                                            step="10"
                                                            placeholder="Enter exact ml (e.g. 350)"
                                                            value={customWaterInput}
                                                            onChange={(e) => setCustomWaterInput(e.target.value)}
                                                            autoFocus
                                                            className="surface-input"
                                                            style={{ ...inputStyle, padding: '8px 45px 8px 12px', fontSize: 13, fontFamily: MONO }}
                                                        />
                                                        <span style={{
                                                            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                                            fontSize: 11, color: 'var(--text-muted)', fontFamily: MONO, pointerEvents: 'none',
                                                        }}>
                                                            ml
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="submit"
                                                        disabled={!customWaterInput || parseInt(customWaterInput, 10) <= 0}
                                                        className="btn-primary"
                                                        style={{
                                                            padding: '8px 16px', fontSize: 13, fontWeight: 700,
                                                            background: '#06b6d4', opacity: (!customWaterInput || parseInt(customWaterInput, 10) <= 0) ? 0.5 : 1,
                                                        }}
                                                    >
                                                        Add
                                                    </button>
                                                </form>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.section>
                        );
                    })()}
                </div>

                {/* ───────── RIGHT COLUMN ───────── */}
                <div className="cal-col cal-col-right">
                    {/* Log */}
                    <motion.section
                        className="cal-card-log"
                        style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 25 }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Today's Log</h2>
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
                            dropdownBreakpoint={420}
                            dropdownLabel="Filter:"
                            ariaLabel="Filter log"
                        />

                        {visibleLogs.length === 0 ? (
                            <div style={{ margin: 0, padding: '36px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
                                    Nothing logged for this day.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => { setMode('food'); setShowAddModal(true); }}
                                    className="btn-primary"
                                    style={{ padding: '8px 18px', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                                >
                                    <Plus size={15} /> Add Food, Exercise or Weight
                                </button>
                            </div>
                        ) : (
                            <div>
                                <AnimatePresence initial={false}>
                                    {visibleLogs.map((item) => {
                                        const isWater = item.type === 'water';
                                        const isBurn = item.type === 'burn';
                                        const Icon = isWater ? Droplets : isBurn ? Dumbbell : Utensils;
                                        const tint = isWater ? '#06b6d4' : isBurn ? AMBER : ACCENT;
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
                                                        {isWater
                                                            ? (item.logged_at ? new Date(item.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Hydration')
                                                            : isBurn
                                                            ? `${item.duration_mins || '—'} min`
                                                            : `${item.grams}${item.unit === 'ml' || isLiquidFood(item) ? 'ml' : 'g'} · ${item.meal_type} · P${Math.round(item.protein_g)} C${Math.round(item.carbs_g)} F${Math.round(item.fat_g)}${item.fiber_g ? ` Fib${Math.round(item.fiber_g)}g` : ''}`}
                                                    </div>
                                                </div>
                                                <span style={{
                                                    fontFamily: MONO, fontSize: 14, fontWeight: 800,
                                                    color: isWater ? '#06b6d4' : isBurn ? AMBER : 'var(--text-primary)',
                                                    flexShrink: 0,
                                                }}>
                                                    {isWater
                                                        ? `${item.amount_ml >= 1000 ? `${(item.amount_ml / 1000).toFixed(1)} L` : `${item.amount_ml} ml`}`
                                                        : `${isBurn ? '+' : ''}${fmt(item.calories)}`}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => (isWater ? deleteWaterLog(item.id) : deleteCalorieLog(item.id))}
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
                </div>
            </div>

            {/* Add Food / Exercise / Weight Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={closeAddModal}
                title={mode === 'food' ? 'Add Food Intake' : mode === 'exercise' ? 'Log Exercise' : 'Record Weight'}
                maxWidth="520px"
            >
                {renderLogger()}
            </Modal>

            {/* Weekly Analytics Modal */}
            <Modal isOpen={showAnalytics} onClose={() => setShowAnalytics(false)} title="Weekly Analytics">
                {renderWeeklyAnalytics(true)}
            </Modal>

            {/* Manual Food Modal */}
            <Modal isOpen={showManualFoodModal} onClose={() => setShowManualFoodModal(false)} title="Add Food to Database">
                <form onSubmit={handleManualFoodSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* AI Nutrition Label Scanner Box */}
                    <div style={{
                        borderRadius: 14,
                        border: '1px dashed var(--border-subtle)',
                        background: 'rgba(168,85,247,0.05)',
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: 8,
                                background: 'rgba(168,85,247,0.18)', color: ACCENT,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                            }}>
                                <Sparkles size={15} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                                    Scan Nutrition Label
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    Upload or snap a photo of the nutrition table to auto-fill
                                </div>
                            </div>
                        </div>

                        {labelImagePreview ? (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px',
                                borderRadius: 10, background: 'var(--surface-input)', border: '1px solid var(--border-subtle)'
                            }}>
                                <img
                                    src={labelImagePreview}
                                    alt="Nutrition label preview"
                                    style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-subtle)', flexShrink: 0 }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {scanningLabel ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: ACCENT }}>
                                            <Loader2 size={13} className="spin" /> Reading nutrition label with AI...
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: 12, fontWeight: 600, color: GREEN, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Check size={14} /> {scanStatusNote || 'Label analyzed successfully'}
                                        </div>
                                    )}
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                        {scanningLabel ? 'Calculating per 100g/ml values...' : 'Review & adjust the auto-filled values below'}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLabelImagePreview(null);
                                        setScanStatusNote('');
                                    }}
                                    disabled={scanningLabel}
                                    style={{
                                        background: 'transparent', border: 'none', color: 'var(--text-muted)',
                                        fontSize: 11, cursor: 'pointer', padding: '4px 6px', flexShrink: 0,
                                    }}
                                >
                                    Retake
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    type="button"
                                    disabled={scanningLabel}
                                    onClick={() => labelCameraInputRef.current?.click()}
                                    style={{
                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                        padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                                        background: 'var(--surface-input)', border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-primary)', cursor: 'pointer',
                                    }}
                                >
                                    <Camera size={14} color={ACCENT} /> Take Photo
                                </button>
                                <button
                                    type="button"
                                    disabled={scanningLabel}
                                    onClick={() => labelFileInputRef.current?.click()}
                                    style={{
                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                        padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                                        background: 'var(--surface-input)', border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-primary)', cursor: 'pointer',
                                    }}
                                >
                                    <Upload size={14} color={ACCENT} /> Upload Image
                                </button>
                            </div>
                        )}
                    </div>

                    <div>
                        <Label style={{ display: 'block', marginBottom: 6 }}>Food Name *</Label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Protein Smoothie, Paneer Wrap"
                            value={manualFoodForm.name}
                            onChange={(e) => setManualFoodForm({ ...manualFoodForm, name: e.target.value })}
                            className="surface-input"
                            style={{ ...inputStyle }}
                        />
                    </div>

                    <div>
                        <Label style={{ display: 'block', marginBottom: 6 }}>Food Type</Label>
                        <LiquidGlassSegmented
                            options={[
                                { id: 'solid', label: 'Solid (g)' },
                                { id: 'liquid', label: 'Liquid (ml)' },
                            ]}
                            value={manualFoodForm.is_liquid ? 'liquid' : 'solid'}
                            onChange={(val) => {
                                const isLiq = val === 'liquid';
                                setManualFoodForm((prev) => ({
                                    ...prev,
                                    is_liquid: isLiq,
                                    unit_name: isLiq ? (prev.unit_name || 'glass') : (prev.unit_name === 'glass' ? '' : prev.unit_name),
                                    grams_per_unit: isLiq ? (prev.grams_per_unit || '200') : prev.grams_per_unit,
                                }));
                            }}
                            size="sm"
                            fullWidth
                            ariaLabel="Food type"
                        />
                    </div>

                    <div>
                        <Label style={{ display: 'block', marginBottom: 6 }}>Nutrition ({manualFoodForm.is_liquid ? 'Per 100ml' : 'Per 100g'})</Label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                            <div>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Calories (kcal) *</span>
                                <input
                                    type="number"
                                    step="0.1"
                                    required
                                    placeholder="e.g. 250"
                                    value={manualFoodForm.calories_per_100g}
                                    onChange={(e) => setManualFoodForm({ ...manualFoodForm, calories_per_100g: e.target.value })}
                                    className="surface-input"
                                    style={{ ...inputStyle, fontFamily: MONO, padding: '9px 10px' }}
                                />
                            </div>
                            <div>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Protein (g)</span>
                                <input
                                    type="number"
                                    step="0.1"
                                    placeholder="0"
                                    value={manualFoodForm.protein_per_100g}
                                    onChange={(e) => setManualFoodForm({ ...manualFoodForm, protein_per_100g: e.target.value })}
                                    className="surface-input"
                                    style={{ ...inputStyle, fontFamily: MONO, padding: '9px 10px' }}
                                />
                            </div>
                            <div>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Carbs (g)</span>
                                <input
                                    type="number"
                                    step="0.1"
                                    placeholder="0"
                                    value={manualFoodForm.carbs_per_100g}
                                    onChange={(e) => setManualFoodForm({ ...manualFoodForm, carbs_per_100g: e.target.value })}
                                    className="surface-input"
                                    style={{ ...inputStyle, fontFamily: MONO, padding: '9px 10px' }}
                                />
                            </div>
                            <div>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Fat (g)</span>
                                <input
                                    type="number"
                                    step="0.1"
                                    placeholder="0"
                                    value={manualFoodForm.fat_per_100g}
                                    onChange={(e) => setManualFoodForm({ ...manualFoodForm, fat_per_100g: e.target.value })}
                                    className="surface-input"
                                    style={{ ...inputStyle, fontFamily: MONO, padding: '9px 10px' }}
                                />
                            </div>
                            <div>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Fiber (g)</span>
                                <input
                                    type="number"
                                    step="0.1"
                                    placeholder="0"
                                    value={manualFoodForm.fiber_per_100g}
                                    onChange={(e) => setManualFoodForm({ ...manualFoodForm, fiber_per_100g: e.target.value })}
                                    className="surface-input"
                                    style={{ ...inputStyle, fontFamily: MONO, padding: '9px 10px' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <Label style={{ display: 'block', marginBottom: 6 }}>
                            {manualFoodForm.is_liquid ? 'Optional Serving Unit (e.g. Glass, Cup)' : 'Optional Piece / Serving Unit'}
                        </Label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                            <div>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                                    Unit Name {manualFoodForm.is_liquid ? '(e.g. glass, mug)' : '(e.g. piece, scoop)'}
                                </span>
                                <input
                                    type="text"
                                    placeholder={manualFoodForm.is_liquid ? 'glass' : 'piece'}
                                    value={manualFoodForm.unit_name}
                                    onChange={(e) => setManualFoodForm({ ...manualFoodForm, unit_name: e.target.value })}
                                    className="surface-input"
                                    style={{ ...inputStyle, padding: '9px 10px' }}
                                />
                            </div>
                            <div>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                                    {manualFoodForm.is_liquid ? 'Volume per unit (ml)' : 'Weight per unit (g)'}
                                </span>
                                <input
                                    type="number"
                                    step="1"
                                    placeholder={manualFoodForm.is_liquid ? '200' : '50'}
                                    value={manualFoodForm.grams_per_unit}
                                    onChange={(e) => setManualFoodForm({ ...manualFoodForm, grams_per_unit: e.target.value })}
                                    className="surface-input"
                                    style={{ ...inputStyle, fontFamily: MONO, padding: '9px 10px' }}
                                />
                            </div>
                        </div>
                    </div>

                    {manualFoodError && (
                        <div style={{ fontSize: 12, color: 'var(--danger)' }}>{manualFoodError}</div>
                    )}

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 6 }}>
                        <button
                            type="button"
                            onClick={() => setShowManualFoodModal(false)}
                            style={{
                                padding: '10px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                                background: 'transparent', border: '1px solid var(--border-subtle)',
                                color: 'var(--text-secondary)', cursor: 'pointer',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={manualFoodSaving}
                            className="btn-primary"
                            style={{ padding: '10px 20px', fontSize: 13 }}
                        >
                            {manualFoodSaving ? 'Saving to Database…' : 'Save to Database'}
                        </button>
                    </div>
                </form>
            </Modal>

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

                    <div>
                        <Label style={{ display: 'block', marginBottom: 6 }}>Daily Water Goal (ml)</Label>
                        <input
                            type="number"
                            step="100"
                            placeholder="3000"
                            value={bmrForm.water_goal_ml || ''}
                            onChange={(e) => setBmrForm({ ...bmrForm, water_goal_ml: e.target.value })}
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

            {/* Direct Water Goal Modal */}
            <Modal isOpen={showEditWaterGoal} onClose={() => setShowEditWaterGoal(false)} title="Daily Water Goal">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSaveWaterGoalDirectly();
                    }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                >
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        Select or enter your daily hydration target:
                    </span>

                    {/* Quick Presets */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                        {[2000, 2500, 3000, 3500].map((presetMl) => (
                            <button
                                key={presetMl}
                                type="button"
                                onClick={() => {
                                    setWaterGoalInput(String(presetMl));
                                }}
                                style={{
                                    padding: '10px 6px',
                                    borderRadius: 12,
                                    fontSize: 13,
                                    fontFamily: MONO,
                                    fontWeight: 700,
                                    background: waterGoalInput === String(presetMl) ? 'rgba(6,182,212,0.2)' : 'var(--surface-input)',
                                    border: waterGoalInput === String(presetMl) ? '1px solid #06b6d4' : '1px solid var(--border-subtle)',
                                    color: waterGoalInput === String(presetMl) ? '#06b6d4' : 'var(--text-primary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                {(presetMl / 1000).toFixed(1)} L
                            </button>
                        ))}
                    </div>

                    <div>
                        <Label style={{ display: 'block', marginBottom: 6 }}>Target in Milliliters (ml)</Label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="number"
                                min="500"
                                max="10000"
                                step="100"
                                placeholder="3000"
                                value={waterGoalInput}
                                onChange={(e) => setWaterGoalInput(e.target.value)}
                                autoFocus
                                className="surface-input"
                                style={{ ...inputStyle, fontFamily: MONO, padding: '11px 45px 11px 14px' }}
                            />
                            <span style={{
                                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                                fontSize: 12, color: 'var(--text-muted)', fontFamily: MONO, pointerEvents: 'none',
                            }}>
                                ml
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                        <button
                            type="button"
                            onClick={() => setShowEditWaterGoal(false)}
                            style={{
                                flex: 1, padding: 12, borderRadius: 12, fontSize: 14, fontWeight: 600,
                                background: 'transparent', border: '1px solid var(--border-subtle)',
                                color: 'var(--text-secondary)', cursor: 'pointer',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            style={{ flex: 1, padding: 12, fontSize: 14, background: '#06b6d4' }}
                        >
                            Save Goal
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Always-mounted hidden file and camera inputs for nutrition label scanning */}
            <input
                ref={labelCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLabelImageFile(file, 'camera');
                    e.target.value = '';
                }}
            />
            <input
                ref={labelFileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLabelImageFile(file, 'upload');
                    e.target.value = '';
                }}
            />

            {/* Full-screen nutrition label scan overlay */}
            {createPortal(
                <AnimatePresence>
                    {scanOverlay && (
                        <motion.div
                            key="scan-overlay"
                            className="cal-scan-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            onClick={scanOverlay.phase !== 'scanning' ? closeScanOverlay : undefined}
                        >
                            {/* Full-bleed ambient blurred background */}
                            <div
                                className="cal-scan-ambient"
                                style={{ backgroundImage: `url(${scanOverlay.src})` }}
                            />

                            {scanOverlay.phase !== 'scanning' && (
                                <button
                                    type="button"
                                    className="cal-scan-close"
                                    onClick={(e) => { e.stopPropagation(); closeScanOverlay(); }}
                                    aria-label="Close"
                                >
                                    <X size={18} />
                                </button>
                            )}

                            {/* Image frame — uncropped while scanning, blurred backdrop with values overlaid directly on top when done */}
                            <motion.div
                                className={`cal-scan-frame ${scanOverlay.phase !== 'scanning' ? 'is-done' : ''}`}
                                initial={{ scale: 0.96, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <img
                                    src={scanOverlay.src}
                                    alt="Nutrition label"
                                    className={`cal-scan-img ${scanOverlay.phase !== 'scanning' ? 'is-blurred' : ''}`}
                                />

                                {/* Scanning sweep & subtle corner ticks */}
                                {scanOverlay.phase === 'scanning' && (
                                    <>
                                        <div className="cal-scan-tint" />
                                        <span className="cal-scan-corner tl" />
                                        <span className="cal-scan-corner tr" />
                                        <span className="cal-scan-corner bl" />
                                        <span className="cal-scan-corner br" />
                                        <motion.div
                                            className="cal-scan-line"
                                            initial={{ top: '2%' }}
                                            animate={{ top: ['2%', '98%', '2%'] }}
                                            transition={{ duration: 3.0, ease: 'easeInOut', repeat: Infinity }}
                                        />
                                    </>
                                )}

                                {/* Scanned values overlaid directly on top of the blurred image */}
                                {scanOverlay.phase === 'done' && scanOverlay.result && (() => {
                                    const r = scanOverlay.result;
                                    const unit = manualFoodForm.is_liquid ? 'ml' : 'g';
                                    const macros = [
                                        { key: 'protein_per_100g', label: 'Protein', color: '#818cf8' },
                                        { key: 'carbs_per_100g', label: 'Carbs', color: GREEN },
                                        { key: 'fat_per_100g', label: 'Fat', color: AMBER },
                                        { key: 'fiber_per_100g', label: 'Fiber', color: FIBER_COLOR },
                                    ];
                                    return (
                                        <motion.form
                                            onSubmit={handleManualFoodSubmit}
                                            className="cal-scan-direct-overlay"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.12, duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                                        >
                                            <div className="cal-scan-top-row">
                                                <div className="cal-scan-badge">
                                                    <Sparkles size={11} style={{ color: '#38bdf8' }} />
                                                    <span>Scanned · Per 100{unit}</span>
                                                </div>
                                                <div className="cal-scan-type-toggle">
                                                    <button
                                                        type="button"
                                                        className={!manualFoodForm.is_liquid ? 'active' : ''}
                                                        onClick={() => setManualFoodForm({ ...manualFoodForm, is_liquid: false })}
                                                    >
                                                        100g
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={manualFoodForm.is_liquid ? 'active' : ''}
                                                        onClick={() => setManualFoodForm({ ...manualFoodForm, is_liquid: true })}
                                                    >
                                                        100ml
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Food name directly on the blurred image */}
                                            <input
                                                type="text"
                                                required
                                                placeholder="Tap to name this food *"
                                                value={manualFoodForm.name}
                                                onChange={(e) => {
                                                    setManualFoodError('');
                                                    setManualFoodForm({ ...manualFoodForm, name: e.target.value });
                                                }}
                                                className="cal-scan-name-input"
                                            />

                                            {/* Large Calorie readout directly on the blurred image */}
                                            <div className="cal-scan-kcal-row">
                                                <input
                                                    type="number"
                                                    step="any"
                                                    min="0"
                                                    required
                                                    value={manualFoodForm.calories_per_100g}
                                                    onChange={(e) => setManualFoodForm({ ...manualFoodForm, calories_per_100g: e.target.value })}
                                                    className="cal-scan-kcal-input"
                                                    aria-label={`Calories per 100${unit}`}
                                                />
                                                <span className="cal-scan-kcal-unit">kcal <small>/ 100{unit}</small></span>
                                            </div>

                                            {/* 4 Macros overlaid on the blurred image */}
                                            <div className="cal-scan-macro-grid">
                                                {macros.map((m) => (
                                                    <label key={m.key} className="cal-scan-macro-cell">
                                                        <div className="cal-scan-macro-head">
                                                            <span
                                                                className="cal-scan-macro-dot"
                                                                style={{ background: m.color, boxShadow: `0 0 8px ${m.color}` }}
                                                            />
                                                            <span className="cal-scan-macro-label">{m.label}</span>
                                                        </div>
                                                        <div className="cal-scan-macro-val-wrap">
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                min="0"
                                                                value={manualFoodForm[m.key]}
                                                                onChange={(e) => setManualFoodForm({ ...manualFoodForm, [m.key]: e.target.value })}
                                                                className="cal-scan-macro-input"
                                                            />
                                                            <span className="cal-scan-macro-g">g</span>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>

                                            {/* Serving unit row */}
                                            <div className="cal-scan-serving-row">
                                                <span className="cal-scan-serving-label">
                                                    {r.serving_size_text ? `Label serving: ${r.serving_size_text}` : 'Optional serving unit'}
                                                </span>
                                                <div className="cal-scan-serving-inputs">
                                                    <input
                                                        type="text"
                                                        placeholder="Unit (e.g. 1 scoop)"
                                                        value={manualFoodForm.unit}
                                                        onChange={(e) => setManualFoodForm({ ...manualFoodForm, unit: e.target.value })}
                                                        className="cal-scan-sub-input"
                                                    />
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        min="0"
                                                        placeholder={`Weight (${unit})`}
                                                        value={manualFoodForm.unit_weight_grams}
                                                        onChange={(e) => setManualFoodForm({ ...manualFoodForm, unit_weight_grams: e.target.value })}
                                                        className="cal-scan-sub-input"
                                                    />
                                                </div>
                                            </div>

                                            {manualFoodError && (
                                                <div className="cal-scan-error-msg">
                                                    {manualFoodError}
                                                </div>
                                            )}

                                            <div className="cal-scan-actions">
                                                <button type="button" onClick={retakeFromOverlay} className="cal-scan-btn-ghost">
                                                    Retake
                                                </button>
                                                <button
                                                    type="submit"
                                                    disabled={manualFoodSaving}
                                                    className="cal-scan-btn-primary"
                                                >
                                                    <Check size={16} strokeWidth={2.5} />
                                                    <span>{manualFoodSaving ? 'Saving…' : 'Save to Database'}</span>
                                                </button>
                                            </div>
                                        </motion.form>
                                    );
                                })()}

                                {/* Error overlaid directly on the blurred image */}
                                {scanOverlay.phase === 'error' && (
                                    <motion.div
                                        className="cal-scan-direct-overlay"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.1, duration: 0.28 }}
                                    >
                                        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', textAlign: 'center', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                                            Couldn't read this label
                                        </div>
                                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', textAlign: 'center', lineHeight: 1.5, textShadow: '0 1px 6px rgba(0,0,0,0.45)' }}>
                                            {scanOverlay.error}
                                        </div>
                                        <div className="cal-scan-actions" style={{ marginTop: 6 }}>
                                            <button type="button" onClick={closeScanOverlay} className="cal-scan-btn-ghost">
                                                Close
                                            </button>
                                            <button type="button" onClick={retakeFromOverlay} className="cal-scan-btn-primary">
                                                <span>Try another photo</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>

                            {/* Minimal status caption while scanning */}
                            {scanOverlay.phase === 'scanning' && (
                                <motion.div
                                    className="cal-scan-caption"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.15 }}
                                >
                                    <motion.span
                                        style={{ width: 6, height: 6, borderRadius: 9999, background: '#38bdf8', boxShadow: '0 0 8px #38bdf8', display: 'inline-block' }}
                                        animate={{ opacity: [0.35, 1, 0.35] }}
                                        transition={{ duration: 1.4, repeat: Infinity }}
                                    />
                                    Reading label…
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Circular Floating Add Action Button */}
            <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setShowAddModal(true)}
                title="Add Food, Exercise, or Weight"
                aria-label="Add Log Entry"
                className="fab-add-calorie"
            >
                <Plus size={26} strokeWidth={2.8} />
            </motion.button>

            <style>{`
                .spin { animation: cal-spin 1s linear infinite; }
                @keyframes cal-spin { to { transform: rotate(360deg); } }

                .fab-add-calorie {
                    position: fixed;
                    bottom: calc(85px + env(safe-area-inset-bottom, 0px));
                    right: calc(20px + env(safe-area-inset-right, 0px));
                    width: 54px;
                    height: 54px;
                    border-radius: 50%;
                    background: var(--accent-gradient, linear-gradient(135deg, #a855f7 0%, #ec4899 100%));
                    color: #ffffff;
                    border: 1.5px solid rgba(255, 255, 255, 0.25);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 95;
                    box-shadow: 0 8px 24px rgba(168, 85, 247, 0.45);
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .fab-add-calorie:hover {
                    box-shadow: 0 12px 30px rgba(124, 58, 237, 0.6);
                }

                /* ── Full-screen label scan overlay ── */
                .cal-scan-overlay {
                    position: fixed; inset: 0; z-index: 10050;
                    background: rgba(6, 7, 14, 0.94);
                    backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    gap: 16px;
                    padding: calc(20px + env(safe-area-inset-top, 0px)) 20px calc(20px + env(safe-area-inset-bottom, 0px));
                    overflow: hidden;
                }
                .cal-scan-ambient {
                    position: absolute; inset: -40px;
                    background-size: cover; background-position: center;
                    filter: blur(56px) brightness(0.24) saturate(1.2);
                    pointer-events: none; z-index: 0;
                }
                .cal-scan-close {
                    position: absolute; top: calc(18px + env(safe-area-inset-top, 0px)); right: 18px;
                    width: 40px; height: 40px; border-radius: 50%;
                    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.16);
                    color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer;
                    z-index: 6;
                    transition: background 0.15s ease, transform 0.15s ease;
                }
                .cal-scan-close:hover { background: rgba(255,255,255,0.18); transform: scale(1.04); }
                .cal-scan-frame {
                    position: relative; z-index: 1;
                    overflow: hidden; border-radius: 22px;
                    display: grid; grid-template-areas: "stack";
                    align-items: center; justify-items: center;
                    max-width: 92vw; max-height: 84vh;
                    box-shadow: 0 28px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.14);
                    background: rgba(12, 14, 24, 0.55);
                }
                .cal-scan-frame.is-done {
                    width: min(92vw, 420px);
                }
                .cal-scan-img {
                    grid-area: stack;
                    display: block;
                    width: auto; height: auto;
                    max-width: min(92vw, 760px);
                    max-height: 78vh;
                    object-fit: contain;
                    transition: filter 0.65s cubic-bezier(0.16, 1, 0.3, 1), transform 0.65s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .cal-scan-img.is-blurred {
                    width: 100%; height: 100%;
                    max-width: none; max-height: none;
                    object-fit: cover;
                    filter: blur(22px) brightness(0.32) saturate(1.18);
                    transform: scale(1.08);
                    pointer-events: none;
                }
                .cal-scan-tint {
                    position: absolute; inset: 0; pointer-events: none;
                    background: linear-gradient(180deg, rgba(56,189,248,0.04), rgba(168,85,247,0.05));
                }
                .cal-scan-corner {
                    position: absolute; width: 18px; height: 18px;
                    border-color: rgba(165, 243, 252, 0.75); border-style: solid;
                    pointer-events: none; z-index: 2;
                }
                .cal-scan-corner.tl { top: 10px; left: 10px; border-width: 2px 0 0 2px; border-top-left-radius: 6px; }
                .cal-scan-corner.tr { top: 10px; right: 10px; border-width: 2px 2px 0 0; border-top-right-radius: 6px; }
                .cal-scan-corner.bl { bottom: 10px; left: 10px; border-width: 0 0 2px 2px; border-bottom-left-radius: 6px; }
                .cal-scan-corner.br { bottom: 10px; right: 10px; border-width: 0 2px 2px 0; border-bottom-right-radius: 6px; }
                .cal-scan-line {
                    position: absolute; left: 0; right: 0; height: 72px;
                    transform: translateY(-50%);
                    pointer-events: none; z-index: 2;
                    background: linear-gradient(180deg,
                        rgba(56,189,248,0) 0%,
                        rgba(56,189,248,0.12) 44%,
                        rgba(186,230,253,0.92) 50%,
                        rgba(56,189,248,0.12) 56%,
                        rgba(56,189,248,0) 100%);
                    mix-blend-mode: screen;
                }
                .cal-scan-caption {
                    position: relative; z-index: 2;
                    display: inline-flex; align-items: center; gap: 8px;
                    padding: 7px 14px; border-radius: 9999px;
                    background: rgba(255,255,255,0.06);
                    border: 1px solid rgba(255,255,255,0.1);
                    font-size: 13px; font-weight: 500; letter-spacing: 0.01em;
                    color: rgba(255,255,255,0.82);
                }
                .cal-scan-direct-overlay {
                    grid-area: stack;
                    position: relative; z-index: 3;
                    width: 100%;
                    display: flex; flex-direction: column; align-items: center;
                    gap: 14px; padding: 24px 22px 22px;
                    color: #fff;
                    background: linear-gradient(180deg, rgba(8,10,18,0.18) 0%, rgba(8,10,18,0.42) 100%);
                }
                /* Completely eliminate focus rectangles, outline rings, and box-shadows on overlay inputs */
                .cal-scan-direct-overlay input,
                .cal-scan-direct-overlay input:focus,
                .cal-scan-direct-overlay input:focus-visible,
                .cal-scan-direct-overlay input:active {
                    outline: none !important;
                    box-shadow: none !important;
                }
                .cal-scan-macro-input,
                .cal-scan-macro-input:focus,
                .cal-scan-macro-input:focus-visible,
                .cal-scan-macro-input:active,
                .cal-scan-kcal-input,
                .cal-scan-kcal-input:focus,
                .cal-scan-kcal-input:focus-visible,
                .cal-scan-kcal-input:active {
                    outline: none !important;
                    border: none !important;
                    border-color: transparent !important;
                    box-shadow: none !important;
                    background: transparent !important;
                }
                .cal-scan-name-input:focus,
                .cal-scan-name-input:focus-visible {
                    background: rgba(255, 255, 255, 0.13);
                    border-color: rgba(56, 189, 248, 0.65) !important;
                    box-shadow: none !important;
                }
                .cal-scan-sub-input:focus,
                .cal-scan-sub-input:focus-visible {
                    border-color: rgba(255, 255, 255, 0.35) !important;
                    box-shadow: none !important;
                }
                .cal-scan-macro-cell {
                    display: flex; flex-direction: column; align-items: center; gap: 6px;
                    padding: 10px 6px; border-radius: 14px;
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.14);
                    cursor: text;
                    transition: border-color 0.15s ease, background 0.15s ease;
                }
                .cal-scan-macro-cell:focus-within {
                    border-color: rgba(255, 255, 255, 0.32) !important;
                    background: rgba(255, 255, 255, 0.12);
                }
                .cal-scan-top-row {
                    width: 100%;
                    display: flex; align-items: center; justify-content: space-between; gap: 8px;
                }
                .cal-scan-badge {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 5px 11px; border-radius: 9999px;
                    background: rgba(56, 189, 248, 0.14);
                    border: 1px solid rgba(56, 189, 248, 0.32);
                    font-size: 11px; font-weight: 700; letter-spacing: 0.06em;
                    text-transform: uppercase; color: #bae6fd;
                }
                .cal-scan-type-toggle {
                    display: inline-flex; padding: 2px; border-radius: 9999px;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.16);
                }
                .cal-scan-type-toggle button {
                    padding: 3px 10px; border-radius: 9999px; border: none;
                    background: transparent; color: rgba(255, 255, 255, 0.7);
                    font-size: 11px; font-weight: 700; cursor: pointer;
                    transition: all 0.15s ease;
                }
                .cal-scan-type-toggle button.active {
                    background: rgba(255, 255, 255, 0.22); color: #ffffff;
                }
                .cal-scan-name-input {
                    width: 100%;
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.18);
                    border-radius: 12px;
                    padding: 10px 14px;
                    font-size: 18px; font-weight: 800; color: #ffffff;
                    text-align: center; letter-spacing: -0.01em;
                    outline: none;
                    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.35);
                    transition: border-color 0.15s ease, background 0.15s ease;
                }
                .cal-scan-name-input::placeholder {
                    color: rgba(255, 255, 255, 0.55);
                    font-weight: 600;
                }
                .cal-scan-name-input:focus {
                    background: rgba(255, 255, 255, 0.13);
                    border-color: rgba(56, 189, 248, 0.65);
                }
                .cal-scan-kcal-row {
                    display: flex; align-items: baseline; justify-content: center; gap: 6px;
                    margin: -2px 0;
                }
                .cal-scan-kcal-input {
                    width: 130px;
                    background: transparent; border: none; border-bottom: 1.5px dashed rgba(255, 255, 255, 0.22);
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 46px; font-weight: 800; color: #ffffff;
                    line-height: 1; letter-spacing: -0.03em;
                    text-align: right; outline: none; padding: 0 2px 2px;
                    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.45);
                    -moz-appearance: textfield;
                }
                .cal-scan-kcal-input::-webkit-outer-spin-button,
                .cal-scan-kcal-input::-webkit-inner-spin-button {
                    -webkit-appearance: none; margin: 0;
                }
                .cal-scan-kcal-input:focus {
                    border-bottom-color: #38bdf8;
                }
                .cal-scan-kcal-unit {
                    font-size: 15px; font-weight: 700; color: rgba(255, 255, 255, 0.82);
                    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.4);
                }
                .cal-scan-kcal-unit small {
                    font-size: 11px; font-weight: 600; color: rgba(255, 255, 255, 0.58);
                }
                .cal-scan-macro-grid {
                    width: 100%;
                    display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
                }
                .cal-scan-macro-head {
                    display: flex; align-items: center; gap: 5px;
                }
                .cal-scan-macro-dot {
                    width: 6px; height: 6px; border-radius: 9999px; flex-shrink: 0;
                }
                .cal-scan-macro-label {
                    font-size: 11px; font-weight: 600; color: rgba(255, 255, 255, 0.78);
                }
                .cal-scan-macro-val-wrap {
                    display: flex; align-items: baseline; justify-content: center; gap: 1px;
                }
                .cal-scan-macro-input {
                    width: 48px;
                    background: transparent; border: none;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 15px; font-weight: 800; color: #ffffff; line-height: 1.1;
                    text-align: right; outline: none; padding: 0;
                    -moz-appearance: textfield;
                }
                .cal-scan-macro-input::-webkit-outer-spin-button,
                .cal-scan-macro-input::-webkit-inner-spin-button {
                    -webkit-appearance: none; margin: 0;
                }
                .cal-scan-macro-g {
                    font-size: 11px; font-weight: 600; color: rgba(255, 255, 255, 0.68);
                }
                .cal-scan-serving-row {
                    width: 100%;
                    display: flex; flex-direction: column; gap: 6px;
                }
                .cal-scan-serving-label {
                    font-size: 11px; font-weight: 600; color: rgba(255, 255, 255, 0.72);
                    text-align: center;
                }
                .cal-scan-serving-inputs {
                    display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
                }
                .cal-scan-sub-input {
                    width: 100%;
                    background: rgba(255, 255, 255, 0.07);
                    border: 1px solid rgba(255, 255, 255, 0.14);
                    border-radius: 10px;
                    padding: 7px 10px;
                    font-size: 12px; font-weight: 600; color: #ffffff;
                    text-align: center; outline: none;
                }
                .cal-scan-sub-input::placeholder {
                    color: rgba(255, 255, 255, 0.45);
                }
                .cal-scan-error-msg {
                    width: 100%;
                    padding: 8px 12px; border-radius: 10px;
                    background: rgba(239, 68, 68, 0.22);
                    border: 1px solid rgba(239, 68, 68, 0.45);
                    color: #fecaca; font-size: 12px; font-weight: 600; text-align: center;
                }
                .cal-scan-actions {
                    display: flex; align-items: center; gap: 10px; width: 100%; margin-top: 2px;
                }
                .cal-scan-btn-ghost {
                    height: 44px; padding: 0 18px; border-radius: 12px;
                    font-size: 14px; font-weight: 600;
                    background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.16);
                    color: #ffffff; cursor: pointer;
                    display: inline-flex; align-items: center; justify-content: center;
                    transition: background 0.15s ease;
                }
                .cal-scan-btn-ghost:hover { background: rgba(255, 255, 255, 0.14); }
                .cal-scan-btn-primary {
                    flex: 1; height: 44px; padding: 0 18px; border-radius: 12px;
                    font-size: 14px; font-weight: 700;
                    background: var(--accent-gradient, linear-gradient(135deg, #a855f7 0%, #ec4899 100%));
                    border: 1px solid rgba(255, 255, 255, 0.22);
                    color: #ffffff; cursor: pointer;
                    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
                    box-shadow: 0 8px 20px rgba(168, 85, 247, 0.35);
                    transition: transform 0.15s ease, box-shadow 0.15s ease;
                }
                .cal-scan-btn-primary:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 10px 24px rgba(168, 85, 247, 0.5);
                }
                @media (min-width: 768px) {
                    .fab-add-calorie {
                        bottom: 36px;
                        right: 36px;
                        width: 58px;
                        height: 58px;
                    }
                }

                /* Mobile & Tablet: ergonomic single column ordering */
                .cal-layout { display: flex; flex-direction: column; gap: 14px; }
                .cal-col { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
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

                .cal-water-btn {
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
                    position: relative;
                    overflow: hidden;
                }
                .cal-water-btn::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(circle at 50% 0%, rgba(6, 182, 212, 0.2), transparent 70%);
                    opacity: 0;
                    transition: opacity 0.2s ease;
                    pointer-events: none;
                }
                .cal-water-btn:hover::before {
                    opacity: 1;
                }
                .cal-water-btn:hover {
                    background: rgba(6, 182, 212, 0.12) !important;
                    border-color: rgba(6, 182, 212, 0.45) !important;
                    box-shadow: 0 8px 24px -4px rgba(6, 182, 212, 0.22) !important;
                    transform: translateY(-2px);
                }
                .cal-water-btn:active {
                    transform: translateY(0px) scale(0.96) !important;
                }

                @media (max-width: 520px) {
                    .cal-add-btn { width: 100%; }
                }

                @media (max-width: 1099px) {
                    .cal-col-left, .cal-col-right { display: contents; }
                    .cal-card-nutrition { order: 1; }
                    .cal-card-water { order: 2; }
                    .cal-card-log { order: 3; }
                }

                /* Desktop: two balanced columns */
                @media (min-width: 1100px) {
                    .cal-layout {
                        display: grid;
                        grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
                        gap: 20px;
                        align-items: start;
                    }
                    .cal-col { gap: 20px; }
                }
            `}</style>
        </div>
    );
};

export default Calories;
