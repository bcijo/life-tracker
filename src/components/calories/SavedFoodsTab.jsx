import React, { useMemo, useState } from 'react';
import { Search, Utensils, Pencil, Plus, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { calculateFromPer100g } from '../../hooks/useCalories';
import { resolveFoodUnit, isLiquidFood, normalizeFoodName } from '../../lib/indianFoodCatalog';
import LiquidGlassSegmented from '../common/LiquidGlassSegmented';
import Modal from '../Modal';
import FoodDetailCard from './FoodDetailCard';

const MONO = "var(--font-mono)";
const ACCENT = '#a855f7';
const AMBER = '#f59e0b';
const GREEN = '#22c55e';
const PROTEIN = '#818cf8';

const MEALS = [
    { id: 'breakfast', label: 'Breakfast' },
    { id: 'lunch', label: 'Lunch' },
    { id: 'snack', label: 'Snack' },
    { id: 'dinner', label: 'Dinner' },
];

const defaultMeal = () => {
    const hr = new Date().getHours();
    if (hr < 11) return 'breakfast';
    if (hr < 16) return 'lunch';
    if (hr < 19) return 'snack';
    return 'dinner';
};

const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 12, fontSize: 14,
    fontFamily: MONO, outline: 'none', boxSizing: 'border-box',
};

const labelStyle = {
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.05em', color: 'var(--text-muted)', display: 'block', marginBottom: 5,
};

const EDIT_FIELDS = [
    { key: 'calories_per_100g', label: 'Calories' },
    { key: 'protein_per_100g', label: 'Protein (g)' },
    { key: 'carbs_per_100g', label: 'Carbs (g)' },
    { key: 'fat_per_100g', label: 'Fat (g)' },
    { key: 'fiber_per_100g', label: 'Fiber (g)' },
    { key: 'sugar_per_100g', label: 'Sugar (g)' },
];

const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

const SavedFoodsTab = ({ foodCatalog, onUpdateFood, onAddToToday }) => {
    const [query, setQuery] = useState('');
    const [scope, setScope] = useState('saved'); // 'saved' | 'all'
    const [active, setActive] = useState(null);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({});
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [meal, setMeal] = useState(defaultMeal);
    const [portionMode, setPortionMode] = useState('grams');
    const [amount, setAmount] = useState('100');
    const [added, setAdded] = useState(false);

    const savedCount = useMemo(() => foodCatalog.filter((f) => f.source !== 'preset').length, [foodCatalog]);

    const items = useMemo(() => {
        const q = normalizeFoodName(query);
        return foodCatalog
            .filter((f) => (scope === 'all' ? true : f.source !== 'preset'))
            .filter((f) => !q || (f.normalized_name || normalizeFoodName(f.name)).includes(q))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [foodCatalog, query, scope]);

    const unitInfo = useMemo(() => (active ? resolveFoodUnit(active) : null), [active]);
    const liquid = Boolean(active && (unitInfo?.isLiquid || active.is_liquid || isLiquidFood(active)));
    const baseUnit = liquid ? 'ml' : 'g';

    const grams = useMemo(() => {
        const v = parseFloat(amount) || 0;
        return portionMode === 'unit' && unitInfo ? v * unitInfo.gramsPerUnit : v;
    }, [amount, portionMode, unitInfo]);

    const preview = useMemo(() => (active ? calculateFromPer100g(active, grams) : null), [active, grams]);

    // Shape the saved food like a log entry so the shared nutrition card can render it
    const cardItem = useMemo(() => {
        if (!active || !preview) return null;
        return {
            name: active.name,
            unit: baseUnit,
            grams: preview.grams,
            calories: preview.calories,
            protein_g: preview.protein_g,
            carbs_g: preview.carbs_g,
            fat_g: preview.fat_g,
            fiber_g: preview.fiber_g,
            sugar_g: preview.sugar_g,
            calories_per_100g: active.calories_per_100g,
            meal_type: meal,
        };
    }, [active, preview, baseUnit, meal]);

    const openFood = (food) => {
        const info = resolveFoodUnit(food);
        const isLiq = Boolean(info.isLiquid || food.is_liquid || isLiquidFood(food));
        setActive(food);
        setEditing(false);
        setError('');
        setAdded(false);
        setMeal(defaultMeal());
        if (info.isCountable && !isLiq) {
            setPortionMode('unit');
            setAmount('1');
        } else {
            setPortionMode('grams');
            setAmount(String(isLiq ? info.gramsPerUnit || 200 : 100));
        }
    };

    const closeCard = () => {
        setActive(null);
        setEditing(false);
        setError('');
    };

    const startEdit = () => {
        const info = resolveFoodUnit(active);
        setForm({
            name: active.name,
            calories_per_100g: String(active.calories_per_100g ?? 0),
            protein_per_100g: String(active.protein_per_100g ?? 0),
            carbs_per_100g: String(active.carbs_per_100g ?? 0),
            fat_per_100g: String(active.fat_per_100g ?? 0),
            fiber_per_100g: String(active.fiber_per_100g ?? 0),
            sugar_per_100g: String(active.sugar_per_100g ?? 0),
            unit_name: active.unit_name || info.unitName || '',
            grams_per_unit: String(active.grams_per_unit || info.gramsPerUnit || ''),
            is_liquid: Boolean(active.is_liquid || info.isLiquid),
        });
        setError('');
        setEditing(true);
    };

    const saveEdit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return setError('Please enter a food name');
        if (form.calories_per_100g === '' || Number(form.calories_per_100g) < 0) return setError('Enter valid calories');
        setSaving(true);
        setError('');
        try {
            const updated = await onUpdateFood(active, form);
            setActive(updated);
            setEditing(false);
        } catch (err) {
            setError(err.message || 'Could not save changes');
        } finally {
            setSaving(false);
        }
    };

    const addToToday = async () => {
        if (!active || grams <= 0) return;
        const res = await onAddToToday({
            foodItem: active,
            grams,
            count: portionMode === 'unit' ? parseFloat(amount) || null : null,
            unit: portionMode === 'unit' ? unitInfo.unitName : baseUnit,
            mealType: meal,
            date: format(new Date(), 'yyyy-MM-dd'), // always today
        });
        if (res?.error) return setError(res.error);
        setAdded(true);
        setTimeout(closeCard, 700);
    };

    const macro = (label, value, color) => (
        <div key={label} style={{
            flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '9px 2px', borderRadius: 12, background: 'var(--surface-input)',
            border: '1px solid var(--border-subtle)',
        }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>
                <span style={{ width: 6, height: 6, borderRadius: 9999, background: color }} />{label}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                {round1(value)}<span style={{ fontSize: 10, color: 'var(--text-muted)' }}>g</span>
            </span>
        </div>
    );

    const portionOptions = [
        ...(unitInfo?.isCountable && !liquid ? [{ id: 'unit', label: unitInfo.unitName || 'piece' }] : []),
        { id: 'grams', label: baseUnit },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1 1 220px' }}>
                    <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search your foods…"
                        className="surface-input"
                        style={{ ...inputStyle, fontFamily: 'inherit', paddingLeft: 34 }}
                    />
                </div>
                <LiquidGlassSegmented
                    options={[
                        { id: 'saved', label: `Saved (${savedCount})` },
                        { id: 'all', label: `All (${foodCatalog.length})` },
                    ]}
                    value={scope}
                    onChange={setScope}
                    size="sm"
                    ariaLabel="Food scope"
                />
            </div>

            {items.length === 0 ? (
                <p style={{ margin: 0, padding: '36px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                    {scope === 'saved' && !query
                        ? 'No saved foods yet. Foods you add manually, scan or look up on the web appear here.'
                        : 'No foods match your search.'}
                </p>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                    {items.map((f) => (
                        <button
                            key={f.normalized_name || f.id || f.name}
                            type="button"
                            onClick={() => openFood(f)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 10, padding: 12, textAlign: 'left',
                                borderRadius: 16, cursor: 'pointer', color: 'inherit', font: 'inherit',
                                background: 'var(--surface-elevated-translucent, rgba(20,20,35,0.68))',
                                border: '1px solid var(--border-subtle)',
                            }}
                        >
                            <div style={{
                                width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex',
                                alignItems: 'center', justifyContent: 'center', background: `${ACCENT}1f`, color: ACCENT,
                            }}>
                                <Utensils size={16} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {f.name}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: MONO }}>
                                    P{round1(f.protein_per_100g)} C{round1(f.carbs_per_100g)} F{round1(f.fat_per_100g)} · per 100{isLiquidFood(f) || f.is_liquid ? 'ml' : 'g'}
                                </div>
                            </div>
                            <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                                {Math.round(Number(f.calories_per_100g) || 0)}
                                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}> kcal</span>
                            </span>
                        </button>
                    ))}
                </div>
            )}

            <Modal isOpen={Boolean(active)} onClose={closeCard} maxWidth="440px" title={editing ? 'Edit Food' : undefined}>
                {active && !editing && preview && (
                    <FoodDetailCard
                        item={cardItem}
                        foodCatalog={foodCatalog}
                        badge="Saved food"
                        showTime={false}
                        portionLabel="selected portion"
                        headerAction={(
                            <button
                                type="button"
                                onClick={startEdit}
                                style={{
                                    alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 5,
                                    padding: '6px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                                    color: 'var(--text-secondary)', background: 'var(--surface-input)',
                                    border: '1px solid var(--border-subtle)', marginRight: 4,
                                }}
                            >
                                <Pencil size={13} /> Edit
                            </button>
                        )}
                        footer={(
                            <>
                                <div>
                                    <span style={labelStyle}>Portion</span>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <input
                                            type="number"
                                            min="0"
                                            step="any"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="surface-input"
                                            style={{ ...inputStyle, width: 110, flexShrink: 0 }}
                                        />
                                        {portionOptions.length > 1 ? (
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <LiquidGlassSegmented
                                                    options={portionOptions}
                                                    value={portionMode}
                                                    onChange={(m) => {
                                                        if (m === portionMode) return;
                                                        if (m === 'unit') setAmount('1');
                                                        else setAmount(String(Math.round(grams) || 100));
                                                        setPortionMode(m);
                                                    }}
                                                    size="sm"
                                                    fullWidth
                                                    ariaLabel="Portion unit"
                                                />
                                            </div>
                                        ) : (
                                            <span style={{ fontFamily: MONO, fontSize: 13, color: 'var(--text-muted)' }}>{baseUnit}</span>
                                        )}
                                    </div>
                                    {portionMode === 'unit' && (
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>≈ {Math.round(grams)}{baseUnit}</span>
                                    )}
                                </div>

                                <div>
                                    <span style={labelStyle}>Meal</span>
                                    <LiquidGlassSegmented
                                        options={MEALS}
                                        value={meal}
                                        onChange={setMeal}
                                        size="sm"
                                        fullWidth
                                        dropdownBreakpoint={420}
                                        ariaLabel="Meal type"
                                    />
                                </div>

                                {error && <span style={{ fontSize: 12, color: 'var(--danger, #ef4444)' }}>{error}</span>}

                                <button
                                    type="button"
                                    className="btn-primary"
                                    onClick={addToToday}
                                    disabled={grams <= 0 || added}
                                    style={{ padding: 12, fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                >
                                    {added ? <><Check size={16} /> Added to today</> : <><Plus size={16} /> Add to today · {preview.calories} kcal</>}
                                </button>
                            </>
                        )}
                    />
                )}

                {active && editing && (
                    <form onSubmit={saveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                            <span style={labelStyle}>Name</span>
                            <input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="surface-input"
                                style={{ ...inputStyle, fontFamily: 'inherit' }}
                            />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Values per 100{form.is_liquid ? 'ml' : 'g'}
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                            {EDIT_FIELDS.map((f) => (
                                <div key={f.key}>
                                    <span style={labelStyle}>{f.label}</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={form[f.key]}
                                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                                        className="surface-input"
                                        style={inputStyle}
                                    />
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                            <div>
                                <span style={labelStyle}>Unit name</span>
                                <input
                                    value={form.unit_name}
                                    onChange={(e) => setForm({ ...form, unit_name: e.target.value })}
                                    placeholder="piece, glass…"
                                    className="surface-input"
                                    style={{ ...inputStyle, fontFamily: 'inherit' }}
                                />
                            </div>
                            <div>
                                <span style={labelStyle}>Grams per unit</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={form.grams_per_unit}
                                    onChange={(e) => setForm({ ...form, grams_per_unit: e.target.value })}
                                    className="surface-input"
                                    style={inputStyle}
                                />
                            </div>
                        </div>
                        {active.source === 'preset' && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                Saving will keep your edited version in Saved foods.
                            </span>
                        )}
                        {error && <span style={{ fontSize: 12, color: 'var(--danger, #ef4444)' }}>{error}</span>}
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button
                                type="button"
                                onClick={() => { setEditing(false); setError(''); }}
                                style={{
                                    padding: '11px 16px', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                                    color: 'var(--text-secondary)', background: 'var(--surface-input)',
                                    border: '1px solid var(--border-subtle)', display: 'inline-flex', alignItems: 'center', gap: 5,
                                }}
                            >
                                <X size={14} /> Cancel
                            </button>
                            <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 1, padding: 11, fontSize: 14 }}>
                                {saving ? 'Saving…' : 'Save changes'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default SavedFoodsTab;
