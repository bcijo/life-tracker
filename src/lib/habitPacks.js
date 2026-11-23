/**
 * The Vital Seven: default habits every user has.
 *
 * They're stored as normal habit rows tagged with `pack_key`, so streaks,
 * analytics, XP and the Assistant all work on them, but the app shows them
 * in their own section, doesn't let them be deleted, and shares only their
 * progress with friends.
 */
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

export const VITAL_SEVEN = {
    id: 'vital-seven',
    name: 'The Vital Seven',
    tagline: 'Seven small daily markers of a healthy life.',
    habits: [
        { key: 'wake-early', name: 'Wake up early', hint: 'Same time every day, ideally before 7', timeOfDay: 'morning', emoji: '🌅' },
        { key: 'water', name: 'Drink a glass of water', hint: 'First thing after waking', timeOfDay: 'morning', emoji: '💧' },
        { key: 'meditate', name: 'Meditate 10 minutes', hint: 'Sit quietly, follow your breath', timeOfDay: 'morning', emoji: '🧘' },
        { key: 'steps', name: 'Walk 10,000 steps', hint: 'Spread through the day', timeOfDay: 'evening', emoji: '👟' },
        { key: 'eat-healthy', name: 'Eat healthy', hint: 'Home-cooked meals, no junk food', timeOfDay: 'evening', emoji: '🥗' },
        { key: 'no-screens', name: 'No screens before bed', hint: 'Phone down 30 minutes before sleep', timeOfDay: 'evening', emoji: '📵' },
        { key: 'sleep-on-time', name: 'Sleep on time', hint: 'In bed by 11 pm', timeOfDay: 'evening', emoji: '😴' },
    ].map((h) => ({ ...h, activeDays: EVERY_DAY })),
};

export const VITAL_KEYS = VITAL_SEVEN.habits.map((h) => h.key);

const norm = (s) => String(s || '').trim().toLowerCase();
const BY_KEY = Object.fromEntries(VITAL_SEVEN.habits.map((h) => [h.key, h]));
const BY_NAME = Object.fromEntries(VITAL_SEVEN.habits.map((h) => [norm(h.name), h]));

/**
 * The Vital Seven entry a habit row belongs to, or null.
 * Uses `pack_key`; falls back to the name when the database migration that
 * adds `pack_key` hasn't been run yet.
 */
export const vitalDefOf = (habit) => {
    if (!habit) return null;
    if (habit.pack_key && BY_KEY[habit.pack_key]) return BY_KEY[habit.pack_key];
    if (!habit.pack_key) return BY_NAME[norm(habit.name)] || null;
    return null;
};

export const isVitalHabit = (habit) => Boolean(vitalDefOf(habit));

/** Vital habits in pack order (one per key). */
export const sortVital = (habits) => {
    const seen = new Set();
    return VITAL_SEVEN.habits
        .map((def) => habits.find((h) => {
            const d = vitalDefOf(h);
            return d && d.key === def.key && !seen.has(h.id) && seen.add(h.id);
        }))
        .filter(Boolean);
};
