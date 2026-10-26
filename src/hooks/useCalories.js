import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { supabase } from '../lib/supabase';
import { lookupFoodNutritionPer100g, estimateExerciseBurn } from '../lib/groq';
import { INDIAN_FOOD_SEED, normalizeFoodName, parseNaturalFoodQuery, resolveFoodUnit, isLiquidFood } from '../lib/indianFoodCatalog';
import { useProfile } from './useProfile';

const LOGS_CACHE_KEY = 'supa_cache_calorie_logs';
const CATALOG_CACHE_KEY = 'supa_cache_food_catalog';
const SETTINGS_CACHE_KEY = 'lifetracker_calorie_settings';
const WEIGHT_LOGS_CACHE_KEY = 'supa_cache_weight_logs';
const WATER_LOGS_CACHE_KEY = 'supa_cache_water_logs';

/**
 * Pure per-100g multiplier calculator
 */
export function calculateFromPer100g(foodItem, gramsInput) {
    const grams = Math.max(0, parseFloat(gramsInput) || 0);
    const multiplier = grams / 100;

    const cal100 = parseFloat(foodItem?.calories_per_100g) || 0;
    const pro100 = parseFloat(foodItem?.protein_per_100g) || 0;
    const carb100 = parseFloat(foodItem?.carbs_per_100g) || 0;
    const fat100 = parseFloat(foodItem?.fat_per_100g) || 0;
    const fib100 = parseFloat(foodItem?.fiber_per_100g) || 0;

    return {
        grams: Math.round(grams * 10) / 10,
        multiplier: Math.round(multiplier * 100) / 100,
        calories: Math.round(cal100 * multiplier),
        protein_g: Math.round(pro100 * multiplier * 10) / 10,
        carbs_g: Math.round(carb100 * multiplier * 10) / 10,
        fat_g: Math.round(fat100 * multiplier * 10) / 10,
        fiber_g: Math.round(fib100 * multiplier * 10) / 10,
    };
}

/**
 * Mifflin-St Jeor BMR calculation
 */
export function calculateMifflinBmr({ weight_kg = 70, height_cm = 175, age = 24, gender = 'male', bmr_override = null }) {
    if (bmr_override && Number(bmr_override) > 500) {
        return Math.round(Number(bmr_override));
    }
    const w = Number(weight_kg) || 70;
    const h = Number(height_cm) || 175;
    const a = Number(age) || 24;
    const s = gender === 'female' ? -161 : 5;
    return Math.round(10 * w + 6.25 * h - 5 * a + s);
}

// Merge seed foods with custom DB/cached foods (DB rows take priority over seed rows)
function mergeFoodCatalogs(remoteOrCachedList = []) {
    const map = new Map();
    INDIAN_FOOD_SEED.forEach(item => {
        const key = item.normalized_name || normalizeFoodName(item.name);
        map.set(key, { ...item, normalized_name: key, source: item.source || 'preset' });
    });
    (remoteOrCachedList || []).forEach(item => {
        if (!item || !item.name) return;
        const key = item.normalized_name || normalizeFoodName(item.name);
        map.set(key, {
            ...item,
            normalized_name: key,
            source: item.source || (item.created_by ? 'manual' : 'web'),
            calories_per_100g: Number(item.calories_per_100g) || 0,
            protein_per_100g: Number(item.protein_per_100g) || 0,
            carbs_per_100g: Number(item.carbs_per_100g) || 0,
            fat_per_100g: Number(item.fat_per_100g) || 0,
            fiber_per_100g: Number(item.fiber_per_100g) || 0,
        });
    });
    return Array.from(map.values());
}

export default function useCalories(selectedDateStr = null) {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const activeDate = selectedDateStr || todayStr;
    const { profile, updateProfile } = useProfile();

    // 1. Calorie Logs State (Intake + Exercise Burn)
    const [logs, setLogs] = useState(() => {
        try {
            const cached = localStorage.getItem(LOGS_CACHE_KEY);
            return cached ? JSON.parse(cached) : [];
        } catch {
            return [];
        }
    });
    const [loadingLogs, setLoadingLogs] = useState(true);

    // 2. Weight Logs State
    const [weightLogs, setWeightLogs] = useState(() => {
        try {
            const cached = localStorage.getItem(WEIGHT_LOGS_CACHE_KEY);
            return cached ? JSON.parse(cached) : [];
        } catch {
            return [];
        }
    });

    // 3. Water Logs State
    const [waterLogs, setWaterLogs] = useState(() => {
        try {
            const cached = localStorage.getItem(WATER_LOGS_CACHE_KEY);
            return cached ? JSON.parse(cached) : [];
        } catch {
            return [];
        }
    });

    // 3. Food Catalog State (Seed + LocalStorage + Supabase `food_catalog`)
    const [customCatalog, setCustomCatalog] = useState(() => {
        try {
            const cached = localStorage.getItem(CATALOG_CACHE_KEY);
            return cached ? JSON.parse(cached) : [];
        } catch {
            return [];
        }
    });

    // 3. BMR & Body Settings
    const [localSettings, setLocalSettings] = useState(() => {
        let initialWaterGoal = 3000;
        try {
            const wg = localStorage.getItem('cal_water_goal_ml');
            if (wg && Number(wg) > 0) initialWaterGoal = Number(wg);
        } catch {}

        try {
            const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
            if (cached) {
                const parsed = JSON.parse(cached);
                return {
                    ...parsed,
                    water_goal_ml: Number(parsed.water_goal_ml) || initialWaterGoal,
                };
            }
        } catch {}

        return {
            weight_kg: 70,
            height_cm: 175,
            age: 24,
            gender: 'male',
            bmr_override: null,
            calorie_goal: null,
            water_goal_ml: initialWaterGoal,
        };
    });

    // Sync settings from profile when loaded (safely preserving water_goal_ml)
    useEffect(() => {
        if (!profile) return;
        const hasProfileMetrics =
            profile.weight_kg || profile.height_cm || profile.age || profile.bmr_override || profile.calorie_goal || profile.water_goal_ml;
        if (hasProfileMetrics) {
            setLocalSettings(prev => {
                let savedWater = prev?.water_goal_ml;
                if (!savedWater || savedWater === 3000) {
                    try {
                        const ls = localStorage.getItem('cal_water_goal_ml');
                        if (ls && Number(ls) > 0) savedWater = Number(ls);
                    } catch {}
                }

                const merged = {
                    ...prev,
                    weight_kg: Number(profile.weight_kg) || prev.weight_kg || 70,
                    height_cm: Number(profile.height_cm) || prev.height_cm || 175,
                    age: Number(profile.age) || prev.age || 24,
                    gender: profile.gender || prev.gender || 'male',
                    bmr_override: profile.bmr_override ? Number(profile.bmr_override) : prev.bmr_override,
                    calorie_goal: profile.calorie_goal ? Number(profile.calorie_goal) : prev.calorie_goal,
                    water_goal_ml: Number(profile.water_goal_ml) || savedWater || 3000,
                };
                try {
                    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(merged));
                } catch {}
                return merged;
            });
        }
    }, [profile]);

    // Full merged food catalog
    const foodCatalog = useMemo(() => mergeFoodCatalogs(customCatalog), [customCatalog]);

    // Fetch `food_catalog` and `calorie_logs` from Supabase on mount
    useEffect(() => {
        let cancelled = false;

        const initData = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                let userId = session?.user?.id;
                if (!userId) {
                    const { data: { user } } = await supabase.auth.getUser();
                    userId = user?.id;
                }
                if (cancelled) return;

                // A. Fetch shared food_catalog
                const { data: catalogData, error: catalogErr } = await supabase
                    .from('food_catalog')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(500);

                if (!catalogErr && Array.isArray(catalogData) && !cancelled) {
                    setCustomCatalog(prev => {
                        // Combine any offline-saved items with remote items
                        const byNorm = new Map();
                        prev.forEach(i => byNorm.set(i.normalized_name || normalizeFoodName(i.name), i));
                        catalogData.forEach(i => byNorm.set(i.normalized_name || normalizeFoodName(i.name), i));
                        const combined = Array.from(byNorm.values());
                        try {
                            localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(combined));
                        } catch {}
                        return combined;
                    });
                }

                // B. Fetch user's calorie_logs
                if (userId) {
                    const { data: logsData, error: logsErr } = await supabase
                        .from('calorie_logs')
                        .select('*')
                        .eq('user_id', userId)
                        .order('created_at', { ascending: false });

                    if (!logsErr && Array.isArray(logsData) && !cancelled) {
                        setLogs(prev => {
                            // Keep any unsynced local-only entries (id starting with 'local-')
                            const localOnly = prev.filter(item => String(item.id).startsWith('local-'));
                            const mergedLogs = [...localOnly, ...logsData];
                            try {
                                localStorage.setItem(LOGS_CACHE_KEY, JSON.stringify(mergedLogs));
                            } catch {}
                            return mergedLogs;
                        });
                    }

                    // C. Fetch user's weight_logs
                    try {
                        const { data: weightData, error: weightErr } = await supabase
                            .from('weight_logs')
                            .select('*')
                            .eq('user_id', userId)
                            .order('date', { ascending: false });

                        if (!weightErr && Array.isArray(weightData) && !cancelled) {
                            setWeightLogs(prev => {
                                const localOnly = prev.filter(item => String(item.id).startsWith('local-'));
                                const byDate = new Map();
                                [...localOnly, ...weightData].forEach(w => byDate.set(w.date, w));
                                const mergedWeights = Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
                                try {
                                    localStorage.setItem(WEIGHT_LOGS_CACHE_KEY, JSON.stringify(mergedWeights));
                                } catch {}
                                return mergedWeights;
                            });
                        }
                    } catch (wErr) {
                        console.warn('[useCalories] Using local weight logs:', wErr.message);
                    }

                    // D. Fetch user's water_logs
                    try {
                        const { data: waterData, error: waterErr } = await supabase
                            .from('water_logs')
                            .select('*')
                            .eq('user_id', userId)
                            .order('created_at', { ascending: false });

                        if (!waterErr && Array.isArray(waterData) && !cancelled) {
                            setWaterLogs(prev => {
                                const localOnly = prev.filter(item => String(item.id).startsWith('local-'));
                                const byId = new Map();
                                [...localOnly, ...waterData].forEach(w => byId.set(w.id, w));
                                const mergedWater = Array.from(byId.values()).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
                                try {
                                    localStorage.setItem(WATER_LOGS_CACHE_KEY, JSON.stringify(mergedWater));
                                } catch {}
                                return mergedWater;
                            });
                        }
                    } catch (wErr) {
                        console.warn('[useCalories] Using local water logs:', wErr.message);
                    }
                }
            } catch (err) {
                console.warn('[useCalories] Using cached calorie data:', err.message);
            } finally {
                if (!cancelled) setLoadingLogs(false);
            }
        };

        initData();
        return () => {
            cancelled = true;
        };
    }, []);

    /**
     * Step 1: Search the Database (`food_catalog` + cached + pre-seeded Indian staples)
     * Also parses natural queries like "2 rotis" or "3 boiled eggs"
     */
    const searchFoodDatabase = useCallback((rawQuery) => {
        const parsedQuery = parseNaturalFoodQuery(rawQuery);
        const q = normalizeFoodName(parsedQuery.cleanQuery);
        if (!q) {
            return {
                results: [],
                hasExactMatch: false,
                parsedQuery,
            };
        }

        const tokens = q.split(' ').filter(Boolean);
        const scored = [];
        let hasExactMatch = false;

        for (const item of foodCatalog) {
            const norm = item.normalized_name || normalizeFoodName(item.name);
            if (norm === q) {
                hasExactMatch = true;
                scored.push({ item, score: 100 });
                continue;
            }
            if (norm.startsWith(q)) {
                scored.push({ item, score: 85 });
                continue;
            }
            if (norm.includes(q)) {
                scored.push({ item, score: 70 });
                continue;
            }
            const matchedTokens = tokens.filter(t => norm.includes(t));
            if (matchedTokens.length === tokens.length && tokens.length > 0) {
                scored.push({ item, score: 60 });
            } else if (matchedTokens.length > 0 && tokens.some(t => t.length >= 3 && norm.includes(t))) {
                scored.push({ item, score: 30 * (matchedTokens.length / tokens.length) });
            }
        }

        scored.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));

        return {
            results: scored.slice(0, 10).map(s => s.item),
            hasExactMatch,
            parsedQuery,
        };
    }, [foodCatalog]);

    /**
     * Step 2: Automated Web Search Fallback -> Save to Database (`food_catalog`)
     * Checks Supabase DB first; if not found, runs one web search via Groq and saves to DB permanently.
     */
    const lookupAndCacheFood = useCallback(async (foodQuery) => {
        const parsedQuery = parseNaturalFoodQuery(foodQuery);
        const cleanQuery = String(parsedQuery.cleanQuery || foodQuery || '').trim();
        const normQuery = normalizeFoodName(cleanQuery);
        if (!normQuery) throw new Error('Please enter a food name');

        // 1. Check local merged catalog first for exact match
        const existingLocal = foodCatalog.find(
            item => (item.normalized_name || normalizeFoodName(item.name)) === normQuery
        );
        if (existingLocal) {
            return { food: existingLocal, fromCache: true, parsedQuery };
        }

        // 2. Check remote Supabase `food_catalog` in case it was added previously
        try {
            const { data: remoteMatch } = await supabase
                .from('food_catalog')
                .select('*')
                .or(`normalized_name.eq.${normQuery},name.ilike.%${cleanQuery}%`)
                .limit(1)
                .maybeSingle();

            if (remoteMatch && normalizeFoodName(remoteMatch.name) === normQuery) {
                setCustomCatalog(prev => {
                    const next = [remoteMatch, ...prev.filter(i => i.normalized_name !== remoteMatch.normalized_name)];
                    try {
                        localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(next));
                    } catch {}
                    return next;
                });
                return { food: remoteMatch, fromCache: true, parsedQuery };
            }
        } catch {
            // Ignore if table not created yet
        }

        // 3. Not in DB -> Perform ONE Web Search via Groq `browser_search`
        const webFood = await lookupFoodNutritionPer100g(cleanQuery);
        const normalizedName = normalizeFoodName(webFood.name || cleanQuery);
        const unitInfo = resolveFoodUnit({
            name: webFood.name || cleanQuery,
            unit_name: webFood.unit_name,
            grams_per_unit: webFood.grams_per_unit,
        });

        const newCatalogEntry = {
            id: 'food-' + Date.now(),
            name: webFood.name || cleanQuery,
            normalized_name: normalizedName,
            category: webFood.category || 'Indian Dish',
            calories_per_100g: webFood.calories_per_100g,
            protein_per_100g: webFood.protein_per_100g,
            carbs_per_100g: webFood.carbs_per_100g,
            fat_per_100g: webFood.fat_per_100g,
            fiber_per_100g: webFood.fiber_per_100g || 0,
            unit_name: unitInfo.unitName,
            grams_per_unit: unitInfo.gramsPerUnit,
            source: 'web',
            created_at: new Date().toISOString(),
        };

        // 4. Save to Supabase `food_catalog` permanently so future searches hit DB first
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id || null;

            const baseRow = {
                name: newCatalogEntry.name,
                normalized_name: newCatalogEntry.normalized_name,
                category: newCatalogEntry.category,
                calories_per_100g: newCatalogEntry.calories_per_100g,
                protein_per_100g: newCatalogEntry.protein_per_100g,
                carbs_per_100g: newCatalogEntry.carbs_per_100g,
                fat_per_100g: newCatalogEntry.fat_per_100g,
                source: 'web',
                created_by: userId,
            };

            let savedRow = null;
            let saveErr = null;

            const res = await supabase
                .from('food_catalog')
                .upsert([{ ...baseRow, fiber_per_100g: newCatalogEntry.fiber_per_100g }], { onConflict: 'normalized_name' })
                .select()
                .single();
            savedRow = res.data;
            saveErr = res.error;

            // If Supabase table does not yet have fiber_per_100g column, retry without it
            if (saveErr && (saveErr.message?.includes('fiber') || saveErr.code === 'PGRST204')) {
                const retryRes = await supabase
                    .from('food_catalog')
                    .upsert([baseRow], { onConflict: 'normalized_name' })
                    .select()
                    .single();
                savedRow = retryRes.data;
                saveErr = retryRes.error;
            }

            if (!saveErr && savedRow) {
                newCatalogEntry.id = savedRow.id;
            }
        } catch (dbErr) {
            console.warn('[useCalories] Cached food locally (run calories_schema.sql to persist in Supabase):', dbErr.message);
        }

        // Also store under the user's exact searched normalized query if different from canonical name
        setCustomCatalog(prev => {
            const filtered = prev.filter(
                i => i.normalized_name !== newCatalogEntry.normalized_name && i.normalized_name !== normQuery
            );
            const next = [newCatalogEntry, ...filtered];
            try {
                localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(next));
            } catch {}
            return next;
        });

        return { food: newCatalogEntry, fromCache: false, parsedQuery };
    }, [foodCatalog]);

    /**
     * Add a Custom Food Manually to the Database (`food_catalog`)
     * Stores source: 'manual'
     */
    const addCustomFood = useCallback(async ({
        name,
        calories_per_100g,
        protein_per_100g = 0,
        carbs_per_100g = 0,
        fat_per_100g = 0,
        fiber_per_100g = 0,
        category = 'Custom',
        unit_name = null,
        grams_per_unit = null,
        is_liquid = false,
        source = 'manual',
    }) => {
        const cleanName = String(name || '').trim();
        if (!cleanName) throw new Error('Please enter a food name');
        const cal = Math.max(0, parseFloat(calories_per_100g) || 0);
        const pro = Math.max(0, parseFloat(protein_per_100g) || 0);
        const carb = Math.max(0, parseFloat(carbs_per_100g) || 0);
        const fat = Math.max(0, parseFloat(fat_per_100g) || 0);
        const fib = Math.max(0, parseFloat(fiber_per_100g) || 0);

        const normalizedName = normalizeFoodName(cleanName);
        const unitInfo = resolveFoodUnit({
            name: cleanName,
            unit_name: unit_name || (is_liquid ? 'glass' : undefined),
            grams_per_unit: grams_per_unit ? Number(grams_per_unit) : (is_liquid ? 200 : undefined),
            is_liquid: Boolean(is_liquid),
        });

        const newEntry = {
            id: 'food-manual-' + Date.now(),
            name: cleanName,
            normalized_name: normalizedName,
            category: category || (is_liquid ? 'Beverage' : 'Custom'),
            calories_per_100g: cal,
            protein_per_100g: pro,
            carbs_per_100g: carb,
            fat_per_100g: fat,
            fiber_per_100g: fib,
            unit_name: unitInfo.unitName,
            grams_per_unit: unitInfo.gramsPerUnit,
            is_liquid: Boolean(is_liquid || unitInfo.isLiquid),
            source: source || 'manual',
            created_at: new Date().toISOString(),
        };

        // Save to Supabase food_catalog
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id || null;

            const baseRow = {
                name: newEntry.name,
                normalized_name: newEntry.normalized_name,
                category: newEntry.category,
                calories_per_100g: newEntry.calories_per_100g,
                protein_per_100g: newEntry.protein_per_100g,
                carbs_per_100g: newEntry.carbs_per_100g,
                fat_per_100g: newEntry.fat_per_100g,
                source: newEntry.source,
                created_by: userId,
            };

            let savedRow = null;
            let saveErr = null;

            const res = await supabase
                .from('food_catalog')
                .upsert([{ ...baseRow, fiber_per_100g: newEntry.fiber_per_100g }], { onConflict: 'normalized_name' })
                .select()
                .single();
            savedRow = res.data;
            saveErr = res.error;

            if (saveErr && (saveErr.message?.includes('fiber') || saveErr.code === 'PGRST204')) {
                const retryRes = await supabase
                    .from('food_catalog')
                    .upsert([baseRow], { onConflict: 'normalized_name' })
                    .select()
                    .single();
                savedRow = retryRes.data;
            }

            if (savedRow?.id) {
                newEntry.id = savedRow.id;
            }
        } catch (dbErr) {
            console.warn('[useCalories] Saved manual food locally:', dbErr.message);
        }

        // Save to customCatalog and local cache
        setCustomCatalog(prev => {
            const filtered = prev.filter(i => i.normalized_name !== newEntry.normalized_name);
            const next = [newEntry, ...filtered];
            try {
                localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(next));
            } catch {}
            return next;
        });

        return newEntry;
    }, []);

    /**
     * Add a Food Intake Log (strictly grams * per-100g multiplier, with optional piece count)
     */
    const addFoodIntake = useCallback(async ({ foodItem, grams, count = null, unit = null, mealType = 'lunch', date = activeDate }) => {
        const computed = calculateFromPer100g(foodItem, grams);
        if (computed.grams <= 0) return { error: 'Enter a valid weight in grams' };

        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        const numCount = count !== null ? Number(count) : null;
        const displayName = numCount && numCount > 0
            ? `${foodItem.name} × ${numCount}`
            : foodItem.name;

        const tempId = 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
        const newEntry = {
            id: tempId,
            user_id: userId,
            date,
            type: 'intake',
            meal_type: mealType,
            name: displayName,
            grams: computed.grams,
            unit: unit || (foodItem?.is_liquid || isLiquidFood(foodItem) ? 'ml' : 'g'),
            calories_per_100g: Number(foodItem.calories_per_100g) || 0,
            duration_mins: null,
            calories: computed.calories,
            protein_g: computed.protein_g,
            carbs_g: computed.carbs_g,
            fat_g: computed.fat_g,
            fiber_g: computed.fiber_g || 0,
            created_at: new Date().toISOString(),
        };

        // Optimistic update
        setLogs(prev => {
            const next = [newEntry, ...prev];
            try {
                localStorage.setItem(LOGS_CACHE_KEY, JSON.stringify(next));
            } catch {}
            return next;
        });

        // Persist to Supabase `calorie_logs`
        if (userId) {
            try {
                const { id, ...dbPayload } = newEntry;
                let inserted = null;
                let error = null;

                const res = await supabase
                    .from('calorie_logs')
                    .insert([dbPayload])
                    .select()
                    .single();
                inserted = res.data;
                error = res.error;

                // If Supabase table does not yet have fiber_g or unit column, retry without them
                if (error && (error.message?.includes('fiber') || error.message?.includes('unit') || error.code === 'PGRST204')) {
                    const fallbackPayload = { ...dbPayload };
                    delete fallbackPayload.fiber_g;
                    delete fallbackPayload.unit;
                    const retryRes = await supabase
                        .from('calorie_logs')
                        .insert([fallbackPayload])
                        .select()
                        .single();
                    inserted = retryRes.data;
                    error = retryRes.error;
                }

                if (!error && inserted) {
                    setLogs(prev => {
                        const next = prev.map(item => (item.id === tempId ? { ...inserted, fiber_g: item.fiber_g || inserted.fiber_g || 0 } : item));
                        try {
                            localStorage.setItem(LOGS_CACHE_KEY, JSON.stringify(next));
                        } catch {}
                        return next;
                    });
                    return { data: inserted, error: null };
                }
            } catch (err) {
                console.warn('[useCalories] Saved intake locally:', err.message);
            }
        }

        return { data: newEntry, error: null };
    }, [activeDate]);

    /**
     * Add an Exercise Burn Log (added on top of expected daily BMR)
     */
    const addExerciseBurn = useCallback(async ({ name, caloriesBurned, durationMins = null, date = activeDate }) => {
        const cals = Math.round(parseFloat(caloriesBurned) || 0);
        if (cals <= 0) return { error: 'Calories burned must be greater than 0' };

        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        const tempId = 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
        const newEntry = {
            id: tempId,
            user_id: userId,
            date,
            type: 'burn',
            meal_type: 'exercise',
            name: String(name || 'Exercise').trim(),
            grams: null,
            calories_per_100g: null,
            duration_mins: durationMins ? Math.round(Number(durationMins)) : null,
            calories: cals,
            protein_g: 0,
            carbs_g: 0,
            fat_g: 0,
            created_at: new Date().toISOString(),
        };

        setLogs(prev => {
            const next = [newEntry, ...prev];
            try {
                localStorage.setItem(LOGS_CACHE_KEY, JSON.stringify(next));
            } catch {}
            return next;
        });

        if (userId) {
            try {
                const { id, ...dbPayload } = newEntry;
                const { data: inserted, error } = await supabase
                    .from('calorie_logs')
                    .insert([dbPayload])
                    .select()
                    .single();

                if (!error && inserted) {
                    setLogs(prev => {
                        const next = prev.map(item => (item.id === tempId ? inserted : item));
                        try {
                            localStorage.setItem(LOGS_CACHE_KEY, JSON.stringify(next));
                        } catch {}
                        return next;
                    });
                    return { data: inserted, error: null };
                }
            } catch (err) {
                console.warn('[useCalories] Saved exercise locally:', err.message);
            }
        }

        return { data: newEntry, error: null };
    }, [activeDate]);

    /**
     * Delete a calorie log entry
     */
    const deleteCalorieLog = useCallback(async (id) => {
        setLogs(prev => {
            const next = prev.filter(item => item.id !== id);
            try {
                localStorage.setItem(LOGS_CACHE_KEY, JSON.stringify(next));
            } catch {}
            return next;
        });

        if (!String(id).startsWith('local-')) {
            try {
                await supabase.from('calorie_logs').delete().eq('id', id);
            } catch (err) {
                console.warn('[useCalories] Error deleting remote log:', err.message);
            }
        }
    }, []);

    /**
     * Log or update daily body weight
     */
    const logDailyWeight = useCallback(async ({ weight_kg, date = activeDate, note = '' }) => {
        const num = Math.round(parseFloat(weight_kg) * 10) / 10;
        if (!num || num < 20 || num > 300) {
            return { error: 'Please enter a valid weight between 20 and 300 kg' };
        }

        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        const tempId = 'local-' + Date.now();
        const newEntry = {
            id: tempId,
            user_id: userId,
            date,
            weight_kg: num,
            note: note || null,
            created_at: new Date().toISOString(),
        };

        // Optimistically update weightLogs
        setWeightLogs(prev => {
            const filtered = prev.filter(w => w.date !== date);
            const next = [newEntry, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
            try {
                localStorage.setItem(WEIGHT_LOGS_CACHE_KEY, JSON.stringify(next));
            } catch {}
            return next;
        });

        // Also update current profile & BMR settings if this log is for today or the most recent date
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        if (date >= todayStr || !localSettings.weight_kg) {
            const updatedSettings = { ...localSettings, weight_kg: num };
            setLocalSettings(updatedSettings);
            try {
                localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(updatedSettings));
                updateProfile({ weight_kg: num });
            } catch {}
        }

        // Persist to Supabase weight_logs
        if (userId) {
            try {
                const { id, ...dbPayload } = newEntry;
                const { data: inserted, error } = await supabase
                    .from('weight_logs')
                    .upsert([dbPayload], { onConflict: 'user_id,date' })
                    .select()
                    .single();

                if (!error && inserted) {
                    setWeightLogs(prev => {
                        const next = prev.map(w => (w.date === date ? inserted : w));
                        try {
                            localStorage.setItem(WEIGHT_LOGS_CACHE_KEY, JSON.stringify(next));
                        } catch {}
                        return next;
                    });
                    return { data: inserted, error: null };
                }
            } catch (err) {
                console.warn('[useCalories] Saved weight locally (run calories_schema.sql to sync in Supabase):', err.message);
            }
        }

        return { data: newEntry, error: null };
    }, [activeDate, localSettings, updateProfile]);

    /**
     * Delete a daily weight entry
     */
    const deleteDailyWeight = useCallback(async (date) => {
        setWeightLogs(prev => {
            const next = prev.filter(w => w.date !== date);
            try {
                localStorage.setItem(WEIGHT_LOGS_CACHE_KEY, JSON.stringify(next));
            } catch {}
            return next;
        });

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id;
            if (userId) {
                await supabase.from('weight_logs').delete().match({ user_id: userId, date });
            }
        } catch (err) {
            console.warn('[useCalories] Error deleting remote weight log:', err.message);
        }
    }, []);

    /**
     * Add Water Intake (in ml)
     */
    const addWater = useCallback(async (amountMl, date = activeDate) => {
        const ml = Math.round(Number(amountMl));
        if (!ml || ml <= 0) return { error: 'Please enter a valid amount in ml' };

        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        const tempId = 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
        const newEntry = {
            id: tempId,
            user_id: userId,
            date,
            amount_ml: ml,
            created_at: new Date().toISOString(),
        };

        setWaterLogs(prev => {
            const next = [newEntry, ...prev];
            try {
                localStorage.setItem(WATER_LOGS_CACHE_KEY, JSON.stringify(next));
            } catch {}
            return next;
        });

        if (userId) {
            try {
                const { id, ...dbPayload } = newEntry;
                const { data: inserted, error } = await supabase
                    .from('water_logs')
                    .insert([dbPayload])
                    .select()
                    .single();

                if (!error && inserted) {
                    setWaterLogs(prev => {
                        const next = prev.map(item => (item.id === tempId ? inserted : item));
                        try {
                            localStorage.setItem(WATER_LOGS_CACHE_KEY, JSON.stringify(next));
                        } catch {}
                        return next;
                    });
                    return { data: inserted, error: null };
                }
            } catch (err) {
                console.warn('[useCalories] Saved water locally:', err.message);
            }
        }

        return { data: newEntry, error: null };
    }, [activeDate]);

    /**
     * Delete a single water log
     */
    const deleteWaterLog = useCallback(async (id) => {
        setWaterLogs(prev => {
            const next = prev.filter(item => item.id !== id);
            try {
                localStorage.setItem(WATER_LOGS_CACHE_KEY, JSON.stringify(next));
            } catch {}
            return next;
        });

        if (!String(id).startsWith('local-')) {
            try {
                await supabase.from('water_logs').delete().eq('id', id);
            } catch (err) {
                console.warn('[useCalories] Error deleting remote water log:', err.message);
            }
        }
    }, []);

    /**
     * Undo the most recent water log for date
     */
    const undoLastWater = useCallback(async (date = activeDate) => {
        const dayWater = waterLogs.filter(w => w.date === date);
        if (dayWater.length > 0) {
            const latest = dayWater[0];
            await deleteWaterLog(latest.id);
            return latest;
        }
        return null;
    }, [waterLogs, activeDate, deleteWaterLog]);

    /**
     * Save BMR & Body Settings
     */
    const saveBmrSettings = useCallback(async (newSettings) => {
        const waterGoal = newSettings.water_goal_ml ? Number(newSettings.water_goal_ml) : (localSettings.water_goal_ml || 3000);
        try {
            localStorage.setItem('cal_water_goal_ml', String(waterGoal));
        } catch {}

        const updated = {
            ...localSettings,
            weight_kg: Number(newSettings.weight_kg) || 70,
            height_cm: Number(newSettings.height_cm) || 175,
            age: Number(newSettings.age) || 24,
            gender: newSettings.gender || 'male',
            bmr_override: newSettings.bmr_override ? Number(newSettings.bmr_override) : null,
            calorie_goal: newSettings.calorie_goal ? Number(newSettings.calorie_goal) : null,
            water_goal_ml: waterGoal,
        };

        setLocalSettings(updated);
        try {
            localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(updated));
        } catch {}

        // Separate core profile columns to prevent "column profiles.water_goal_ml does not exist" error rollback
        const profilePayload = {
            weight_kg: updated.weight_kg,
            height_cm: updated.height_cm,
            age: updated.age,
            gender: updated.gender,
            bmr_override: updated.bmr_override,
            calorie_goal: updated.calorie_goal,
        };

        try {
            await updateProfile(profilePayload);
        } catch (err) {
            console.warn('[useCalories] Saved BMR settings locally:', err.message);
        }

        return updated;
    }, [localSettings, updateProfile]);

    /**
     * Directly update daily water goal
     */
    const saveWaterGoal = useCallback(async (newGoalMl) => {
        const goal = Math.max(250, Math.min(10000, Number(newGoalMl) || 3000));
        try {
            localStorage.setItem('cal_water_goal_ml', String(goal));
        } catch {}

        const updated = {
            ...localSettings,
            water_goal_ml: goal,
        };

        setLocalSettings(updated);
        try {
            localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(updated));
        } catch {}

        return updated;
    }, [localSettings]);

    // Expected Daily BMR
    const expectedBmr = useMemo(() => calculateMifflinBmr(localSettings), [localSettings]);

    // Active day's logged weight & most recent weight
    const todayWeightLog = useMemo(() => {
        return weightLogs.find(w => w.date === activeDate) || null;
    }, [weightLogs, activeDate]);

    const currentWeight = useMemo(() => {
        if (weightLogs.length > 0) return Number(weightLogs[0].weight_kg);
        return Number(localSettings.weight_kg) || 70;
    }, [weightLogs, localSettings]);

    // Summary for the active selected date
    const dailySummary = useMemo(() => {
        const dayLogs = logs.filter(l => l.date === activeDate);
        const intakeLogs = dayLogs.filter(l => l.type === 'intake');
        const burnLogs = dayLogs.filter(l => l.type === 'burn');

        const totalIntake = Math.round(
            intakeLogs.reduce((sum, l) => sum + (parseFloat(l.calories) || 0), 0)
        );
        const totalProtein = Math.round(
            intakeLogs.reduce((sum, l) => sum + (parseFloat(l.protein_g) || 0), 0) * 10
        ) / 10;
        const totalCarbs = Math.round(
            intakeLogs.reduce((sum, l) => sum + (parseFloat(l.carbs_g) || 0), 0) * 10
        ) / 10;
        const totalFat = Math.round(
            intakeLogs.reduce((sum, l) => sum + (parseFloat(l.fat_g) || 0), 0) * 10
        ) / 10;
        const totalFiber = Math.round(
            intakeLogs.reduce((sum, l) => sum + (parseFloat(l.fiber_g) || 0), 0) * 10
        ) / 10;

        const exerciseBurn = Math.round(
            burnLogs.reduce((sum, l) => sum + (parseFloat(l.calories) || 0), 0)
        );

        const totalBurn = expectedBmr + exerciseBurn;
        const netBalance = totalIntake - totalBurn; // Negative = Deficit, Positive = Surplus

        // Hydration calculation
        const dayWaterLogs = waterLogs.filter(w => w.date === activeDate);
        const totalWaterMl = dayWaterLogs.reduce((sum, w) => sum + (Number(w.amount_ml) || 0), 0);
        const waterGoalMl = Number(localSettings.water_goal_ml) || 3000;
        const waterPct = Math.min(100, Math.round((totalWaterMl / waterGoalMl) * 100));

        return {
            date: activeDate,
            intakeLogs,
            burnLogs,
            waterLogs: dayWaterLogs,
            totalWaterMl,
            waterGoalMl,
            waterPct,
            totalIntake,
            totalProtein,
            totalCarbs,
            totalFat,
            totalFiber,
            expectedBmr,
            exerciseBurn,
            totalBurn,
            netBalance,
            isDeficit: netBalance <= 0,
            deficitOrSurplusAmount: Math.abs(netBalance),
        };
    }, [logs, waterLogs, activeDate, expectedBmr, localSettings.water_goal_ml]);

    // 7-day trend data for charts (Calories + Weight)
    const weeklyTrend = useMemo(() => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = subDays(new Date(), i);
            const dStr = format(d, 'yyyy-MM-dd');
            const dayLogs = logs.filter(l => l.date === dStr);
            const dayWeight = weightLogs.find(w => w.date === dStr);
            const dayWater = waterLogs.filter(w => w.date === dStr).reduce((s, w) => s + (Number(w.amount_ml) || 0), 0);

            const intake = Math.round(
                dayLogs.filter(l => l.type === 'intake').reduce((s, l) => s + (parseFloat(l.calories) || 0), 0)
            );
            const exBurn = Math.round(
                dayLogs.filter(l => l.type === 'burn').reduce((s, l) => s + (parseFloat(l.calories) || 0), 0)
            );
            const totalBurn = expectedBmr + exBurn;
            days.push({
                date: dStr,
                dayLabel: format(d, 'EEE'),
                dayNumber: format(d, 'd'),
                intake,
                exerciseBurn: exBurn,
                bmr: expectedBmr,
                totalBurn,
                net: intake - totalBurn,
                weight: dayWeight ? Number(dayWeight.weight_kg) : null,
                hasWeight: Boolean(dayWeight),
                waterMl: dayWater,
                waterL: Math.round((dayWater / 1000) * 10) / 10,
            });
        }
        return days;
    }, [logs, weightLogs, waterLogs, expectedBmr]);

    // 7-day weight statistics (change, min, max)
    const weekWeightStats = useMemo(() => {
        const loggedInWeek = weeklyTrend.filter(d => d.weight !== null);
        if (loggedInWeek.length === 0) {
            return {
                count: 0,
                startWeight: null,
                latestWeight: null,
                change: 0,
                min: null,
                max: null,
            };
        }
        const weights = loggedInWeek.map(d => d.weight);
        const startWeight = loggedInWeek[0].weight;
        const latestWeight = loggedInWeek[loggedInWeek.length - 1].weight;
        const change = Math.round((latestWeight - startWeight) * 10) / 10;
        const min = Math.min(...weights);
        const max = Math.max(...weights);
        return {
            count: loggedInWeek.length,
            startWeight,
            latestWeight,
            change,
            min,
            max,
        };
    }, [weeklyTrend]);

    return {
        logs,
        loadingLogs,
        foodCatalog,
        bmrSettings: localSettings,
        expectedBmr,
        dailySummary,
        weeklyTrend,
        weightLogs,
        waterLogs,
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
        estimateExerciseBurn,
    };
}
