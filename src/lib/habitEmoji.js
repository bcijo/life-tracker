/**
 * Emoji suggestions for habits, worked out on the device from keywords.
 * If nothing matches, the app can ask the AI (suggestHabitEmojisAI).
 */
import { vitalDefOf } from './habitPacks';

// First matching rule wins; each rule's emojis are offered best first
const RULES = [
    [/wake|morning|sunrise|alarm|early/, ['🌅', '⏰', '☀️', '🐓']],
    [/sleep|bed|nap|rest/, ['😴', '🛏️', '🌙', '💤']],
    [/water|hydrat|drink/, ['💧', '🥤', '🚰', '🫗']],
    [/meditat|mindful|breath|calm/, ['🧘', '🕯️', '🌿', '🫁']],
    [/walk|steps|hike/, ['👟', '🚶', '🥾', '🏞️']],
    [/run|jog|marathon/, ['🏃', '👟', '🏅', '⏱️']],
    [/gym|workout|lift|weights|exercise|train|push.?up|squat|plank/, ['🏋️', '💪', '🤸', '🔥']],
    [/yoga|stretch/, ['🧘', '🤸', '🌿', '🙆']],
    [/cycl|bike|ride/, ['🚴', '🚲', '⛰️', '🏁']],
    [/swim/, ['🏊', '🌊', '🥽', '💦']],
    [/read|book|page/, ['📖', '📚', '🔖', '🤓']],
    [/write|journal|diary/, ['✍️', '📓', '🖊️', '📝']],
    [/study|learn|course|class|exam/, ['📚', '🎓', '🧠', '✏️']],
    [/code|program|leetcode|dsa|develop/, ['💻', '⌨️', '🧑‍💻', '🧩']],
    [/language|spanish|french|german|hindi|duolingo/, ['🗣️', '🌍', '📘', '🔤']],
    [/eat|food|meal|diet|healthy|vegg|fruit|salad|cook/, ['🥗', '🍎', '🥦', '🍳']],
    [/sugar|sweet|junk|soda|dessert/, ['🚫', '🍩', '🍬', '🥤']],
    [/smok|cigar|vape|nicotine/, ['🚭', '🚫', '🫁', '💨']],
    [/alcohol|drink less|beer|wine|sober/, ['🚱', '🍷', '🚫', '🧃']],
    [/screen|phone|social media|scroll|instagram|youtube|digital/, ['📵', '📱', '🔕', '🚫']],
    [/vitamin|supplement|pill|medicine|meds/, ['💊', '🩺', '🧪', '🍊']],
    [/skin|skincare|face|teeth|brush|floss|hygiene|shower/, ['🧴', '🪥', '🚿', '✨']],
    [/clean|tidy|declutter|chores|laundry|dishes/, ['🧹', '🧺', '🧽', '✨']],
    [/money|save|budget|spend|invest/, ['💰', '🐷', '📈', '💳']],
    [/pray|gratitude|grateful|thank/, ['🙏', '💛', '🌼', '🕊️']],
    [/music|guitar|piano|sing|practice instrument/, ['🎸', '🎹', '🎶', '🎤']],
    [/draw|paint|art|sketch/, ['🎨', '✏️', '🖌️', '🖼️']],
    [/call|family|friend|parents|mom|dad/, ['📞', '👨‍👩‍👧', '💬', '❤️']],
    [/plan|todo|task|organi[sz]e|review/, ['🗓️', '✅', '📋', '🎯']],
    [/sun|outside|nature|garden|plant/, ['🌞', '🌳', '🌱', '🪴']],
    [/cold shower|ice/, ['🧊', '🚿', '❄️', '💪']],
    [/pet|dog|cat/, ['🐶', '🐱', '🦮', '🐾']],
];

const GENERIC = ['✨', '🎯', '⭐', '✅', '🔥'];

/** Up to 5 emoji suggestions for a habit name (always returns some). */
export const suggestHabitEmojis = (name) => {
    const n = String(name || '').toLowerCase();
    for (const [re, emojis] of RULES) {
        if (re.test(n)) return emojis.slice(0, 4).concat('✨').slice(0, 5);
    }
    return GENERIC;
};

/** True when the keyword list found a real match (not just the generic set). */
export const hasKeywordEmoji = (name) => RULES.some(([re]) => re.test(String(name || '').toLowerCase()));

/** The emoji to show for a habit: saved choice, Vital Seven default, or a suggestion. */
export const habitEmojiOf = (habit) => habit?.emoji || vitalDefOf(habit)?.emoji || suggestHabitEmojis(habit?.name)[0];
