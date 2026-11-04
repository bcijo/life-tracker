import React from 'react';
import { Utensils, Clock } from 'lucide-react';
import { isLiquidFood, normalizeFoodName } from '../../lib/indianFoodCatalog';

const MONO = "'JetBrains Mono', monospace";
const ACCENT = '#a855f7';
const AMBER = '#f59e0b';
const GREEN = '#22c55e';
const FIBER_COLOR = '#ec4899';
const SUGAR_COLOR = '#f43f5e';

/** Nutrition card for a food entry (log-shaped item). Shared by the daily log and Saved Foods. */
const FoodDetailCard = ({ item, foodCatalog = [], headerAction = null, footer = null, portionLabel = 'logged portion', badge = null, showTime = true }) => {
                    const unit = item.unit || (isLiquidFood(item) ? 'ml' : 'g');
                    const grams = Number(item.grams) || 0;
                    const calories = Math.round(Number(item.calories) || 0);
                    const protein = Math.round((Number(item.protein_g) || 0) * 10) / 10;
                    const carbs = Math.round((Number(item.carbs_g) || 0) * 10) / 10;
                    const fat = Math.round((Number(item.fat_g) || 0) * 10) / 10;
                    
                    let resolvedFiber = Number(item.fiber_g) || 0;
                    if (resolvedFiber <= 0) {
                        const cat = foodCatalog.find(f => (f.normalized_name && item.name && f.normalized_name === normalizeFoodName(item.name)) || (f.name && item.name && f.name.toLowerCase() === item.name.toLowerCase()));
                        if (cat && Number(cat.fiber_per_100g) > 0) {
                            resolvedFiber = (Number(cat.fiber_per_100g) * grams) / 100;
                        } else if (carbs > 3 && !isLiquidFood(item)) {
                            const nameLower = (item.name || '').toLowerCase();
                            const isAnimalOrDairy = /milk|cheese|curd|yogurt|butter|ghee|oil|egg|chicken|mutton|beef|pork|fish|prawn|sugar|water|soda/i.test(nameLower);
                            if (!isAnimalOrDairy) {
                                resolvedFiber = Math.max(1.2, carbs * 0.11);
                            }
                        }
                    }
                    const fiber = Math.round(resolvedFiber * 10) / 10;

                    let resolvedSugar = Number(item.sugar_g) || 0;
                    if (resolvedSugar <= 0) {
                        const cat = foodCatalog.find(f => (f.normalized_name && item.name && f.normalized_name === normalizeFoodName(item.name)) || (f.name && item.name && f.name.toLowerCase() === item.name.toLowerCase()));
                        if (cat && Number(cat.sugar_per_100g) > 0) {
                            resolvedSugar = (Number(cat.sugar_per_100g) * grams) / 100;
                        } else if (carbs > 0) {
                            const nameLower = (item.name || '').toLowerCase();
                            if (/fruit|banana|apple|mango|orange|grape|chikoo|papaya|juice/i.test(nameLower)) {
                                resolvedSugar = carbs * 0.65;
                            } else if (/sweet|mithai|halwa|laddu|ladoo|gulab jamun|jalebi|sugar|cake|pastry|ice cream|chocolate|cookie|biscuit/i.test(nameLower)) {
                                resolvedSugar = carbs * 0.70;
                            } else if (/milk|curd|dahi|tea|chai|coffee|lassi/i.test(nameLower)) {
                                resolvedSugar = Math.min(carbs, (grams / 100) * 4.8);
                            } else if (carbs > 5) {
                                resolvedSugar = carbs * 0.05;
                            }
                        }
                    }
                    const sugar = Math.round(resolvedSugar * 10) / 10;

                    const proteinKcal = Math.round(protein * 4);
                    const carbsKcal = Math.round(carbs * 4);
                    const fatKcal = Math.round(fat * 9);
                    const totalMacroKcal = (proteinKcal + carbsKcal + fatKcal) || calories || 1;

                    const proteinPct = Math.round((proteinKcal / totalMacroKcal) * 100);
                    const carbsPct = Math.round((carbsKcal / totalMacroKcal) * 100);
                    const fatPct = Math.max(0, 100 - proteinPct - carbsPct);

                    const factor100 = grams > 0 ? (100 / grams) : 1;
                    const cal100 = Math.round(item.calories_per_100g || (calories * factor100));
                    const protein100 = Math.round((protein * factor100) * 10) / 10;
                    const carbs100 = Math.round((carbs * factor100) * 10) / 10;
                    const fat100 = Math.round((fat * factor100) * 10) / 10;
                    const fiber100 = Math.round((fiber * factor100) * 10) / 10;
                    const sugar100 = Math.round((sugar * factor100) * 10) / 10;

                    const timeString = item.created_at
                        ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : null;

                    const mealColors = {
                        Breakfast: '#f59e0b',
                        Lunch: '#10b981',
                        Dinner: '#8b5cf6',
                        Snacks: '#06b6d4',
                    };
                    const mealColor = mealColors[item.meal_type] || ACCENT;


    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingRight: 28 }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 5,
                                            padding: '3px 9px', borderRadius: 9999,
                                            fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                                            textTransform: 'uppercase',
                                            background: `${mealColor}22`, color: mealColor,
                                            border: `1px solid ${mealColor}44`,
                                        }}>
                                            <Utensils size={10} />
                                            {badge || item.meal_type || 'Food'}
                                        </span>
                                        {showTime && timeString && (
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                <Clock size={11} /> {timeString}
                                            </span>
                                        )}
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.25, letterSpacing: '-0.02em' }}>
                                        {item.name}
                                    </h3>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{
                                            padding: '2px 8px', borderRadius: 8,
                                            background: 'var(--surface-input)', border: '1px solid var(--border-subtle)',
                                            fontSize: 12, fontWeight: 700, fontFamily: MONO, color: 'var(--text-primary)',
                                        }}>
                                            {grams} {unit}
                                        </span>
                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {portionLabel}
                                        </span>
                                    </div>
                                </div>
                                {headerAction}
                            </div>

                            {/* Hero Total Calories & Macro Split Card */}
                            <div style={{
                                padding: '16px 18px', borderRadius: 16,
                                background: 'linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(236,72,153,0.08) 100%)',
                                border: '1px solid rgba(168,85,247,0.22)',
                                display: 'flex', flexDirection: 'column', gap: 12,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                                    <div>
                                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                                            Total Energy
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                                            <span style={{ fontFamily: MONO, fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
                                                {calories}
                                            </span>
                                            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
                                                kcal
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                                            Calorie Ratio
                                        </span>
                                        <span style={{ fontFamily: MONO, fontSize: 12, color: 'var(--text-secondary)' }}>
                                            P {proteinPct}% Â· C {carbsPct}% Â· F {fatPct}%
                                        </span>
                                    </div>
                                </div>

                                {/* Macro Split Bar */}
                                <div style={{
                                    height: 7, width: '100%', borderRadius: 9999, overflow: 'hidden',
                                    display: 'flex', background: 'rgba(255,255,255,0.08)',
                                }}>
                                    <div style={{ width: `${proteinPct}%`, background: '#818cf8', transition: 'width 0.3s ease' }} title={`Protein: ${proteinPct}%`} />
                                    <div style={{ width: `${carbsPct}%`, background: GREEN, transition: 'width 0.3s ease' }} title={`Carbs: ${carbsPct}%`} />
                                    <div style={{ width: `${fatPct}%`, background: AMBER, transition: 'width 0.3s ease' }} title={`Fat: ${fatPct}%`} />
                                </div>
                            </div>

                            {/* Macro & Nutrient Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                                {[
                                    { label: 'Protein', value: protein, color: '#818cf8', kcal: proteinKcal },
                                    { label: 'Carbs', value: carbs, color: GREEN, kcal: carbsKcal },
                                    { label: 'Fat', value: fat, color: AMBER, kcal: fatKcal },
                                    { label: 'Fiber', value: fiber, color: FIBER_COLOR, kcal: null },
                                    { label: 'Sugar', value: sugar, color: SUGAR_COLOR, kcal: null },
                                ].map((m) => (
                                    <div
                                        key={m.label}
                                        style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                                            padding: '10px 2px', borderRadius: 12,
                                            background: 'var(--surface-input)', border: '1px solid var(--border-subtle)',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <span style={{ width: 6, height: 6, borderRadius: 9999, background: m.color }} />
                                            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>{m.label}</span>
                                        </div>
                                        <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                                            {m.value}<span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginLeft: 1 }}>g</span>
                                        </div>
                                        {m.kcal !== null ? (
                                            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: MONO }}>
                                                {m.kcal} kcal
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.6 }}>
                                                â€”
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Serving vs Per 100 Comparison Table */}
                            <div style={{
                                borderRadius: 14, overflow: 'hidden',
                                border: '1px solid var(--border-subtle)',
                                background: 'var(--surface-input)',
                            }}>
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr',
                                    padding: '9px 12px', background: 'rgba(255,255,255,0.03)',
                                    borderBottom: '1px solid var(--border-subtle)',
                                    fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
                                    textTransform: 'uppercase', color: 'var(--text-muted)',
                                }}>
                                    <span>Nutrient</span>
                                    <span style={{ textAlign: 'right' }}>Portion ({grams}{unit})</span>
                                    <span style={{ textAlign: 'right' }}>Per 100{unit}</span>
                                </div>

                                {[
                                    { name: 'Energy', portion: `${calories} kcal`, per100: `${cal100} kcal` },
                                    { name: 'Protein', portion: `${protein} g`, per100: `${protein100} g` },
                                    { name: 'Carbs', portion: `${carbs} g`, per100: `${carbs100} g` },
                                    { name: 'Sugar', portion: `${sugar} g`, per100: `${sugar100} g` },
                                    { name: 'Total Fat', portion: `${fat} g`, per100: `${fat100} g` },
                                    { name: 'Dietary Fiber', portion: `${fiber} g`, per100: `${fiber100} g` },
                                ].map((row, idx, arr) => (
                                    <div
                                        key={row.name}
                                        style={{
                                            display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr',
                                            padding: '8px 12px',
                                            borderBottom: idx < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                                            fontSize: 12,
                                        }}
                                    >
                                        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{row.name}</span>
                                        <span style={{ textAlign: 'right', fontFamily: MONO, fontWeight: 700, color: 'var(--text-primary)' }}>{row.portion}</span>
                                        <span style={{ textAlign: 'right', fontFamily: MONO, color: 'var(--text-muted)' }}>{row.per100}</span>
                                    </div>
                                ))}
                            </div>


                            {footer}
                        </div>
    );
};

export default FoodDetailCard;

