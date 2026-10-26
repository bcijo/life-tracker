/**
 * Food normalization helper & standard Exercise MET presets.
 * Food items are NOT hardcoded/pre-seeded: every food item is looked up via live
 * web search on first use and saved permanently into the `food_catalog` database.
 */

export function normalizeFoodName(str) {
    return String(str || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export const INDIAN_FOOD_SEED = [];

/**
 * Common Exercises with MET (Metabolic Equivalent of Task) values
 * Formula: Burned kcal = MET * weight_kg * (duration_mins / 60)
 */
export const COMMON_EXERCISES = [
    { name: 'Walking', met: 4.3, emoji: '🚶' },
    { name: 'Running', met: 8.5, emoji: '🏃' },
    { name: 'Gym', met: 5.0, emoji: '🏋️' },
];
