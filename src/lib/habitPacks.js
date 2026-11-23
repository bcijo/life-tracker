/**
 * Ready-made habit sets new users can add in one tap.
 * Each habit uses the same fields as a habit created by hand.
 */
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

export const VITAL_SEVEN = {
    id: 'vital-seven',
    name: 'The Vital Seven',
    tagline: 'Seven small daily markers of a healthy life.',
    habits: [
        { name: 'Wake up early', hint: 'Same time every day, ideally before 7', timeOfDay: 'morning', emoji: '🌅' },
        { name: 'Drink a glass of water', hint: 'First thing after waking', timeOfDay: 'morning', emoji: '💧' },
        { name: 'Meditate 10 minutes', hint: 'Sit quietly, follow your breath', timeOfDay: 'morning', emoji: '🧘' },
        { name: 'Walk 10,000 steps', hint: 'Spread through the day', timeOfDay: 'evening', emoji: '👟' },
        { name: 'Eat healthy', hint: 'Home-cooked meals, no junk food', timeOfDay: 'evening', emoji: '🥗' },
        { name: 'No screens before bed', hint: 'Phone down 30 minutes before sleep', timeOfDay: 'evening', emoji: '📵' },
        { name: 'Sleep on time', hint: 'In bed by 11 pm', timeOfDay: 'evening', emoji: '😴' },
    ].map((h) => ({ ...h, activeDays: EVERY_DAY })),
};

const normalise = (name) => String(name || '').trim().toLowerCase();

/** Pack habits the user doesn't already have (matched by name). */
export const missingFromPack = (pack, existingHabits = []) => {
    const have = new Set(existingHabits.map((h) => normalise(h.name)));
    return pack.habits.filter((h) => !have.has(normalise(h.name)));
};

/** Per-user flag so the automatic offer is shown only once. */
export const packOfferKey = (userId) => `lt_vital_seven_offered_${userId || 'anon'}`;
