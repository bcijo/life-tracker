/**
 * Food normalization helper, natural unit/count parser, and standard Exercise MET presets.
 * Food items are NOT hardcoded/pre-seeded: every food item is looked up via live
 * web search on first use and saved permanently into the `food_catalog` database.
 */

// Singularize common countable food plurals so "2 rotis" and "roti" hit the exact same DB entry
const PLURAL_MAP = {
    rotis: 'roti',
    rotti: 'roti',
    rottis: 'roti',
    chapatis: 'chapati',
    chapathis: 'chapati',
    chapathi: 'chapati',
    phulkas: 'phulka',
    parathas: 'paratha',
    paranthas: 'paratha',
    parantha: 'paratha',
    naans: 'naan',
    kulchas: 'kulcha',
    puris: 'puri',
    pooris: 'puri',
    poori: 'puri',
    bhaturas: 'bhatura',
    bhature: 'bhatura',
    eggs: 'egg',
    omelettes: 'omelette',
    omlets: 'omelette',
    idlis: 'idli',
    idlys: 'idli',
    idly: 'idli',
    dosas: 'dosa',
    dosai: 'dosa',
    vadas: 'vada',
    vadais: 'vada',
    uttapams: 'uttapam',
    appams: 'appam',
    samosas: 'samosa',
    kachoris: 'kachori',
    pakoras: 'pakora',
    pakodas: 'pakora',
    pavs: 'pav',
    slices: 'slice',
    bananas: 'banana',
    apples: 'apple',
    oranges: 'orange',
    mangoes: 'mango',
    biscuits: 'biscuit',
    cookies: 'cookie',
    laddus: 'laddu',
    ladoos: 'laddu',
    ladoo: 'laddu',
    gulabjamuns: 'gulab jamun',
    rasgullas: 'rasgulla',
    katoris: 'katori',
    cups: 'cup',
};

export function normalizeFoodName(str) {
    const cleaned = String(str || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!cleaned) return '';

    return cleaned
        .split(' ')
        .map((word) => PLURAL_MAP[word] || word)
        .join(' ');
}

/**
 * Parses natural queries like:
 *  - "2 rotis" -> { cleanQuery: "roti", count: 2, grams: null, mode: "unit" }
 *  - "3 boiled eggs" -> { cleanQuery: "boiled egg", count: 3, grams: null, mode: "unit" }
 *  - "150g paneer" -> { cleanQuery: "paneer", count: null, grams: 150, mode: "grams" }
 *  - "roti" -> { cleanQuery: "roti", count: null, grams: null, mode: null }
 */
export function parseNaturalFoodQuery(rawInput) {
    const raw = String(rawInput || '').trim();
    if (!raw) return { cleanQuery: '', count: null, grams: null, mode: null };

    // Pattern 1: Leading or trailing explicit grams e.g. "150g chicken" or "chicken 150g"
    const gramsLead = raw.match(/^(\d+(?:\.\d+)?)\s*(?:g|gm|gms|grams)\b\s+(.+)$/i);
    if (gramsLead) {
        return {
            cleanQuery: gramsLead[2].trim(),
            count: null,
            grams: parseFloat(gramsLead[1]),
            mode: 'grams',
        };
    }
    const gramsTrail = raw.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*(?:g|gm|gms|grams)$/i);
    if (gramsTrail) {
        return {
            cleanQuery: gramsTrail[1].trim(),
            count: null,
            grams: parseFloat(gramsTrail[2]),
            mode: 'grams',
        };
    }

    // Pattern 2: Leading count e.g. "2 roti", "3 boiled eggs", "1.5 paratha"
    const countLead = raw.match(/^(\d+(?:\.\d+)?)\s*(?:x|pcs?|pieces?)?\s+([a-zA-Z].*)$/);
    if (countLead) {
        const num = parseFloat(countLead[1]);
        if (num > 0 && num <= 50) {
            return {
                cleanQuery: countLead[2].trim(),
                count: num,
                grams: null,
                mode: 'unit',
            };
        }
    }

    return { cleanQuery: raw, count: null, grams: null, mode: null };
}

/**
 * Standard unit weights (in grams) for countable Indian & everyday foods.
 * Used when a food item is typically eaten by piece/number rather than weighed on a scale,
 * or as a fallback if the database row doesn't have `unit_name` / `grams_per_unit` stored yet.
 */
const UNIT_PATTERNS = [
    { regex: /\b(phulka)\b/i, unitName: 'phulka', gramsPerUnit: 30, isCountable: true },
    { regex: /\b(roti|chapati|chapathi|rotti)\b/i, unitName: 'roti', gramsPerUnit: 35, isCountable: true },
    { regex: /\b(thepla)\b/i, unitName: 'thepla', gramsPerUnit: 40, isCountable: true },
    { regex: /\b(paratha|parantha)\b/i, unitName: 'paratha', gramsPerUnit: 80, isCountable: true },
    { regex: /\b(naan|kulcha|bhatura)\b/i, unitName: 'piece', gramsPerUnit: 90, isCountable: true },
    { regex: /\b(puri|poori)\b/i, unitName: 'puri', gramsPerUnit: 25, isCountable: true },
    { regex: /\b(bhakri|jolada rotti|akki rotti|ragi rotti)\b/i, unitName: 'rotti', gramsPerUnit: 60, isCountable: true },
    { regex: /\b(egg white)\b/i, unitName: 'white', gramsPerUnit: 33, isCountable: true },
    { regex: /\b(omelette|omlet)\b/i, unitName: 'omelette', gramsPerUnit: 100, isCountable: true },
    { regex: /\b(egg|boiled egg|fried egg|poached egg|scrambled egg|anda)\b/i, unitName: 'egg', gramsPerUnit: 50, isCountable: true },
    { regex: /\b(idli|idly)\b/i, unitName: 'idli', gramsPerUnit: 40, isCountable: true },
    { regex: /\b(vada|medu vada|masala vada|dal vada|vadai)\b/i, unitName: 'vada', gramsPerUnit: 45, isCountable: true },
    { regex: /\b(masala dosa)\b/i, unitName: 'dosa', gramsPerUnit: 150, isCountable: true },
    { regex: /\b(dosa|plain dosa|rava dosa|neer dosa|set dosa|pesarattu|adai)\b/i, unitName: 'dosa', gramsPerUnit: 85, isCountable: true },
    { regex: /\b(uttapam|appam)\b/i, unitName: 'piece', gramsPerUnit: 90, isCountable: true },
    { regex: /\b(samosa|kachori|vada pav|dabeli)\b/i, unitName: 'piece', gramsPerUnit: 65, isCountable: true },
    { regex: /\b(pani puri|golgappa|puchka)\b/i, unitName: 'puri', gramsPerUnit: 15, isCountable: true },
    { regex: /\b(pakora|pakoda|bhajiya|bajji|bonda)\b/i, unitName: 'piece', gramsPerUnit: 25, isCountable: true },
    { regex: /\b(pav|bun|dinner roll)\b/i, unitName: 'pav', gramsPerUnit: 40, isCountable: true },
    { regex: /\b(bread|toast)\b/i, unitName: 'slice', gramsPerUnit: 30, isCountable: true },
    { regex: /\b(sandwich|burger|wrap|roll|frankie|shawarma)\b/i, unitName: 'piece', gramsPerUnit: 180, isCountable: true },
    { regex: /\b(banana|elaichi banana)\b/i, unitName: 'banana', gramsPerUnit: 115, isCountable: true },
    { regex: /\b(apple|orange|pear|guava|pomegranate|mango)\b/i, unitName: 'fruit', gramsPerUnit: 150, isCountable: true },
    { regex: /\b(gulab jamun|rasgulla|laddu|ladoo|barfi|burfi|peda|jalebi|mysore pak)\b/i, unitName: 'piece', gramsPerUnit: 45, isCountable: true },
    { regex: /\b(biscuit|cookie|rusk|khari)\b/i, unitName: 'piece', gramsPerUnit: 12, isCountable: true },
    { regex: /\b(chai|tea|coffee|filter coffee|green tea)\b/i, unitName: 'cup', gramsPerUnit: 150, isCountable: true },
    { regex: /\b(lassi|buttermilk|chaas|milk|protein shake|juice|coconut water)\b/i, unitName: 'glass', gramsPerUnit: 200, isCountable: true },
    { regex: /\b(dal|sambar|rasam|kadhi|rajma|chole|chana|paneer|curry|sabzi|bhaji|korma|curd|dahi|raita|khichdi|poha|upma)\b/i, unitName: 'katori', gramsPerUnit: 150, isCountable: false },
    { regex: /\b(rice|biryani|pulao|fried rice)\b/i, unitName: 'katori', gramsPerUnit: 150, isCountable: false },
];

/**
 * Resolves the unit info for any food item:
 * Returns `{ unitName, gramsPerUnit, isCountable }`
 * - `isCountable: true` means the UI should default to Count mode (e.g., 1, 2, 3 rotis or eggs)
 * - `isCountable: false` means the UI defaults to Grams mode, but still offers the unit (e.g., katori) as a quick toggle
 */
export function resolveFoodUnit(foodItem) {
    if (!foodItem) {
        return { unitName: 'piece', gramsPerUnit: 100, isCountable: false };
    }

    const name = String(foodItem.name || '');

    // Check known Indian & everyday countable food patterns first
    for (const pattern of UNIT_PATTERNS) {
        if (pattern.regex.test(name)) {
            const customGrams = Number(foodItem.grams_per_unit);
            return {
                unitName: foodItem.unit_name || pattern.unitName,
                gramsPerUnit: customGrams > 0 ? customGrams : pattern.gramsPerUnit,
                isCountable: pattern.isCountable,
            };
        }
    }

    // Check if the item itself carries AI-discovered unit metadata
    const dbUnit = String(foodItem.unit_name || '').trim().toLowerCase();
    const dbGrams = Number(foodItem.grams_per_unit);
    if (dbUnit && dbUnit !== 'g' && dbUnit !== 'gram' && dbUnit !== 'grams' && dbUnit !== '100g' && dbGrams > 0) {
        const countableUnits = ['roti', 'chapati', 'phulka', 'paratha', 'naan', 'puri', 'egg', 'idli', 'dosa', 'vada', 'piece', 'slice', 'pav', 'bun', 'banana', 'fruit', 'cup', 'glass', 'biscuit', 'cookie', 'scoop', 'tbsp'];
        return {
            unitName: dbUnit,
            gramsPerUnit: dbGrams,
            isCountable: countableUnits.some((u) => dbUnit.includes(u)),
        };
    }

    return {
        unitName: 'serving',
        gramsPerUnit: 100,
        isCountable: false,
    };
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

