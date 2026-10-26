import { useState, useEffect, useCallback, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { supabase } from '../lib/supabase';
import { lookupFoodNutritionPer100g, estimateExerciseBurn } from '../lib/groq';
import { INDIAN_FOOD_SEED, normalizeFoodName } from '../lib/indianFoodCatalog';
import { useProfile } from './useProfile';

const LOGS_CACHE_KEY = 'supa_cache_calorie_logs';
const CATALOG_CACHE_KEY = 'supa_cache_food_catalog';
const SETTINGS_CACHE_KEY = 'lifetracker_calorie_settings';

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

    return {
        grams: Math.round(grams * 10) / 10,
        multiplier: Math.round(multiplier * 100) / 100,
        calories: Math.round(cal100 * multiplier),
        protein_g: Math.round(pro100 * multiplier * 10) / 10,
        carbs_g: Math.round(carb100 * multiplier * 10) / 10,
        fat_g: Math.round(fat100 * multiplier * 10) / 10,
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
        map.set(key, { ...item, normalized_name: key });
    });
    (remoteOrCachedList || []).forEach(item => {
        if (!item || !item.name) return;
        const key = item.normalized_name || normalizeFoodName(item.name);
        map.set(key, {
            ...item,
            normalized_name: key,
            calories_per_100g: Number(item.calories_per_100g) || 0,
            protein_per_100g: Number(item.protein_per_100g) || 0,
            carbs_per_100g: Number(item.carbs_per_100g) || 0,
            fat_per_100g: Number(item.fat_per_100g) || 0,
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

    // 2. Food Catalog State (Seed + LocalStorage + Supabase `food_catalog`)
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
        try {
            const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
            return cached ? JSON.parse(cached) : {
                weight_kg: 70,
                height_cm: 175,
                age: 24,
                gender: 'male',
                bmr_override: null,
                calorie_goal: null,
            };
        } catch {
            return {
                weight_kg: 70,
                height_cm: 175,
                age: 24,
                gender: 'male',
                bmr_override: null,
                calorie_goal: null,
            };
        }
    });

    // Sync settings from profile when loaded
    useEffect(() => {
        if (!profile) return;
        const hasProfileMetrics =
            profile.weight_kg || profile.height_cm || profile.age || profile.bmr_override || profile.calorie_goal;
        if (hasProfileMetrics) {
            const merged = {
                weight_kg: Number(profile.weight_kg) || localSettings.weight_kg || 70,
                height_cm: Number(profile.height_cm) || localSettings.height_cm || 175,
                age: Number(profile.age) || localSettings.age || 24,
                gender: profile.gender || localSettings.gender || 'male',
                bmr_override: profile.bmr_override ? Number(profile.bmr_override) : localSettings.bmr_override,
                calorie_goal: profile.calorie_goal ? Number(profile.calorie_goal) : localSettings.calorie_goal,
            };
            setLocalSettings(merged);
            try {
                localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(merged));
            } catch {}
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
     */
    const searchFoodDatabase = useCallback((rawQuery) => {
        const q = normalizeFoodName(rawQuery);
        if (!q) {
            return {
                results: foodCatalog.slice(0, 12),
                hasExactMatch: false,
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
        };
    }, [foodCatalog]);

    /**
     * Step 2: Automated Web Search Fallback -> Save to Database (`food_catalog`)
     * Checks Supabase DB first; if not found, runs one web search via Groq and saves to DB permanently.
     */
    const lookupAndCacheFood = useCallback(async (foodQuery) => {
        const cleanQuery = String(foodQuery || '').trim();
        const normQuery = normalizeFoodName(cleanQuery);
        if (!normQuery) throw new Error('Please enter a food name');

        // 1. Check local merged catalog first for exact match
        const existingLocal = foodCatalog.find(
            item => (item.normalized_name || normalizeFoodName(item.name)) === normQuery
        );
        if (existingLocal) {
            return { food: existingLocal, fromCache: true };
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
                return { food: remoteMatch, fromCache: true };
            }
        } catch {
            // Ignore if table not created yet
        }

        // 3. Not in DB -> Perform ONE Web Search via Groq `browser_search`
        const webFood = await lookupFoodNutritionPer100g(cleanQuery);
        const normalizedName = normalizeFoodName(webFood.name || cleanQuery);

        const newCatalogEntry = {
            id: 'food-' + Date.now(),
            name: webFood.name || cleanQuery,
            normalized_name: normalizedName,
            category: webFood.category || 'Indian Dish',
            calories_per_100g: webFood.calories_per_100g,
            protein_per_100g: webFood.protein_per_100g,
            carbs_per_100g: webFood.carbs_per_100g,
            fat_per_100g: webFood.fat_per_100g,
            source: webFood.source || 'web_search',
            created_at: new Date().toISOString(),
        };

        // 4. Save to Supabase `food_catalog` permanently so future searches hit DB first
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const userId = session?.user?.id || null;

            const { data: savedRow, error: saveErr } = await supabase
                .from('food_catalog')
                .upsert(
                    [
                        {
                            name: newCatalogEntry.name,
                            normalized_name: newCatalogEntry.normalized_name,
                            category: newCatalogEntry.category,
                            calories_per_100g: newCatalogEntry.calories_per_100g,
                            protein_per_100g: newCatalogEntry.protein_per_100g,
                            carbs_per_100g: newCatalogEntry.carbs_per_100g,
                            fat_per_100g: newCatalogEntry.fat_per_100g,
                            source: newCatalogEntry.source,
                            created_by: userId,
                        }
                    ],
                    { onConflict: 'normalized_name' }
                )
                .select()
                .single();

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

        return { food: newCatalogEntry, fromCache: false };
    }, [foodCatalog]);

    /**
     * Add a Food Intake Log (strictly grams * per-100g multiplier)
     */
    const addFoodIntake = useCallback(async ({ foodItem, grams, mealType = 'lunch', date = activeDate }) => {
        const computed = calculateFromPer100g(foodItem, grams);
        if (computed.grams <= 0) return { error: 'Enter a valid weight in grams' };

        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        const tempId = 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
        const newEntry = {
            id: tempId,
            user_id: userId,
            date,
            type: 'intake',
            meal_type: mealType,
            name: foodItem.name,
            grams: computed.grams,
            calories_per_100g: Number(foodItem.calories_per_100g) || 0,
            duration_mins: null,
            calories: computed.calories,
            protein_g: computed.protein_g,
            carbs_g: computed.carbs_g,
            fat_g: computed.fat_g,
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
     * Save BMR & Body Settings
     */
    const saveBmrSettings = useCallback(async (newSettings) => {
        const updated = {
            ...localSettings,
            weight_kg: Number(newSettings.weight_kg) || 70,
            height_cm: Number(newSettings.height_cm) || 175,
            age: Number(newSettings.age) || 24,
            gender: newSettings.gender || 'male',
            bmr_override: newSettings.bmr_override ? Number(newSettings.bmr_override) : null,
            calorie_goal: newSettings.calorie_goal ? Number(newSettings.calorie_goal) : null,
        };

        setLocalSettings(updated);
        try {
            localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(updated));
        } catch {}

        try {
            await updateProfile(updated);
        } catch (err) {
            console.warn('[useCalories] Saved BMR settings locally:', err.message);
        }

        return updated;
    }, [localSettings, updateProfile]);

    // Expected Daily BMR
    const expectedBmr = useMemo(() => calculateMifflinBmr(localSettings), [localSettings]);

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

        const exerciseBurn = Math.round(
            burnLogs.reduce((sum, l) => sum + (parseFloat(l.calories) || 0), 0)
        );

        const totalBurn = expectedBmr + exerciseBurn;
        const netBalance = totalIntake - totalBurn; // Negative = Deficit, Positive = Surplus

        return {
            date: activeDate,
            intakeLogs,
            burnLogs,
            totalIntake,
            totalProtein,
            totalCarbs,
            totalFat,
            expectedBmr,
            exerciseBurn,
            totalBurn,
            netBalance,
            isDeficit: netBalance <= 0,
            deficitOrSurplusAmount: Math.abs(netBalance),
        };
    }, [logs, activeDate, expectedBmr]);

    // 7-day trend data for charts
    const weeklyTrend = useMemo(() => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = subDays(new Date(), i);
            const dStr = format(d, 'yyyy-MM-dd');
            const dayLogs = logs.filter(l => l.date === dStr);
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
                intake,
                exerciseBurn: exBurn,
                bmr: expectedBmr,
                totalBurn,
                net: intake - totalBurn,
            });
        }
        return days;
    }, [logs, expectedBmr]);

    return {
        logs,
        loadingLogs,
        foodCatalog,
        bmrSettings: localSettings,
        expectedBmr,
        dailySummary,
        weeklyTrend,
        searchFoodDatabase,
        lookupAndCacheFood,
        addFoodIntake,
        addExerciseBurn,
        deleteCalorieLog,
        saveBmrSettings,
        estimateExerciseBurn,
    };
}
