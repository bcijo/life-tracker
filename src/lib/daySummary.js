/**
 * Builds a plain-text summary of one day (calories, habits, tasks, money,
 * journal) from the data the Assistant already has loaded.
 *
 * It runs entirely on the device: nothing is sent to the AI, which matters
 * because the journal is end-to-end encrypted. The output is meant to be
 * copied and pasted into another chatbot, so it uses simple headings and
 * "- " bullets that read well as plain text or Markdown.
 */
import { format } from 'date-fns';
import { isVitalHabit, VITAL_SEVEN } from './habitPacks';

const MEAL_ORDER = ['breakfast', 'lunch', 'snack', 'dinner'];
const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', snack: 'Snack', dinner: 'Dinner' };
const MOOD_LABELS = { 1: 'Rough', 2: 'Meh', 3: 'Okay', 4: 'Good', 5: 'Amazing' };

const num = (n) => Math.round(Number(n) || 0).toLocaleString('en-IN');
const rupees = (n) => `₹${num(n)}`;
const oneDecimal = (n) => Math.round((Number(n) || 0) * 10) / 10;

// Local calendar date (YYYY-MM-DD) of a stored value. Plain dates are kept as
// they are; timestamps are converted to the device's time zone first.
const localDay = (value) => {
    if (!value) return null;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return format(d, 'yyyy-MM-dd');
};

const clean = (text) => String(text || '').replace(/\s+\n/g, '\n').trim();

function caloriesSection(today) {
    const lines = ['CALORIES'];
    const intake = today?.intakeLogs || [];
    const burn = today?.burnLogs || [];
    if (!today || (intake.length === 0 && burn.length === 0 && !today.totalWaterMl)) {
        lines.push('- Nothing logged.');
        return lines;
    }

    const net = Number(today.netBalance) || 0;
    lines.push(
        `- Intake ${num(today.totalIntake)} kcal · Burn ${num(today.totalBurn)} kcal ` +
        `(BMR ${num(today.expectedBmr)} + exercise ${num(today.exerciseBurn)}) · ` +
        `Net ${net > 0 ? '+' : ''}${num(net)} kcal (${net <= 0 ? 'deficit' : 'surplus'})`
    );
    lines.push(
        `- Macros: protein ${oneDecimal(today.totalProtein)} g · carbs ${oneDecimal(today.totalCarbs)} g · ` +
        `fat ${oneDecimal(today.totalFat)} g · fiber ${oneDecimal(today.totalFiber)} g · sugar ${oneDecimal(today.totalSugar)} g`
    );
    if (today.totalWaterMl) {
        lines.push(`- Water: ${oneDecimal(today.totalWaterMl / 1000)} L of ${oneDecimal((today.waterGoalMl || 0) / 1000)} L goal`);
    }

    const byMeal = {};
    intake.forEach((l) => {
        const meal = MEAL_LABELS[l.meal_type] ? l.meal_type : 'other';
        (byMeal[meal] = byMeal[meal] || []).push(l);
    });
    [...MEAL_ORDER, 'other'].forEach((meal) => {
        const items = byMeal[meal];
        if (!items?.length) return;
        const total = items.reduce((t, i) => t + (Number(i.calories) || 0), 0);
        const list = items
            .map((i) => `${i.name} (${num(i.grams)}${i.unit === 'ml' ? ' ml' : ' g'}, ${num(i.calories)} kcal)`)
            .join('; ');
        lines.push(`- ${MEAL_LABELS[meal] || 'Other'} (${num(total)} kcal): ${list}`);
    });

    if (burn.length) {
        const list = burn
            .map((b) => `${b.name}${b.duration_mins ? ` ${b.duration_mins} min` : ''} (${num(b.calories)} kcal)`)
            .join('; ');
        lines.push(`- Exercise: ${list}`);
    }
    return lines;
}

function vitalSection(habits) {
    const vital = habits.filter((h) => isVitalHabit(h));
    const done = vital.filter((h) => h.todayStatus === 'completed');
    const lines = [`${VITAL_SEVEN.name.toUpperCase()} (${done.length} of ${VITAL_SEVEN.habits.length} done)`];
    const not = vital.filter((h) => h.todayStatus !== 'completed');
    if (done.length) lines.push(`- Done: ${done.map((h) => (h.streak > 0 ? `${h.name} (streak ${h.streak})` : h.name)).join(', ')}`);
    if (not.length) lines.push(`- Not done: ${not.map((h) => h.name).join(', ')}`);
    return lines;
}

function habitsSection(allHabits) {
    const habits = allHabits.filter((h) => !isVitalHabit(h));
    const scheduled = habits.filter((h) => h.isScheduledToday);
    const paused = habits.filter((h) => h.isPaused);
    const withStreak = (h) => (h.streak > 0 ? `${h.name} (streak ${h.streak})` : h.name);

    const done = scheduled.filter((h) => h.todayStatus === 'completed');
    const missed = scheduled.filter((h) => h.todayStatus === 'failed');
    const open = scheduled.filter((h) => !['completed', 'failed', 'paused'].includes(h.todayStatus));

    const lines = [scheduled.length ? `PERSONAL HABITS (${done.length} of ${scheduled.length} done)` : 'PERSONAL HABITS'];
    if (!scheduled.length && !paused.length) {
        lines.push('- No personal habits scheduled today.');
        return lines;
    }
    if (done.length) lines.push(`- Done: ${done.map(withStreak).join(', ')}`);
    if (missed.length) lines.push(`- Missed: ${missed.map((h) => h.name).join(', ')}`);
    if (open.length) lines.push(`- Not marked: ${open.map((h) => h.name).join(', ')}`);
    if (paused.length) lines.push(`- Paused: ${paused.map((h) => h.name).join(', ')}`);
    return lines;
}

function tasksSection(todos, todayStr) {
    const completedToday = todos.filter((t) => t.completed && localDay(t.updated_at) === todayStr);
    const open = todos.filter((t) => !t.completed);
    const overdue = open.filter((t) => t.deadline && localDay(t.deadline) < todayStr);
    const addedToday = todos.filter((t) => localDay(t.created_at) === todayStr);

    const lines = ['TASKS'];
    if (completedToday.length) {
        lines.push(`- Completed today (${completedToday.length}): ${completedToday.map((t) => t.text).join('; ')}`);
    } else {
        lines.push('- No tasks completed today.');
    }
    if (addedToday.length) lines.push(`- Added today: ${addedToday.length}`);
    lines.push(`- Still open: ${open.length}${overdue.length ? ` (${overdue.length} overdue)` : ''}`);
    return lines;
}

function moneySection(raw, monthTotal, todayStr) {
    const todays = (raw.transactions || []).filter((t) => localDay(t.date) === todayStr);
    const expenses = todays.filter((t) => t.type === 'expense');
    const income = todays.filter((t) => t.type === 'income');
    const category = (t) => (raw.resolveCategoryName ? raw.resolveCategoryName(t) : t.category) || 'Uncategorized';

    const lines = ['MONEY'];
    if (expenses.length) {
        const total = expenses.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        lines.push(`- Spent today: ${rupees(total)} across ${expenses.length} transaction${expenses.length === 1 ? '' : 's'}`);
        expenses.forEach((t) => {
            lines.push(`  - ${t.description || category(t)}: ${rupees(t.amount)} (${category(t)})`);
        });
    } else {
        lines.push('- No spending logged today.');
    }
    if (income.length) {
        const total = income.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        lines.push(`- Income today: ${rupees(total)} (${income.map((t) => t.description || category(t)).join(', ')})`);
    }
    if (monthTotal) lines.push(`- Spent this month so far: ${rupees(monthTotal)}`);
    return lines;
}

function journalSection(entries, todayStr) {
    const entry = (entries || []).find((e) => localDay(e.date) === todayStr);
    const lines = ['JOURNAL'];
    const parts = entry
        ? [
            ['Highlights', clean(entry.how_was_today)],
            ['On my mind', clean(entry.on_your_mind)],
            ['For tomorrow', clean(entry.change_for_tomorrow)],
        ].filter(([, text]) => text)
        : [];
    if (!entry || parts.length === 0) {
        if (entry?.mood_score) lines.push(`- Mood: ${MOOD_LABELS[entry.mood_score] || entry.mood_score} (${entry.mood_score}/5)`);
        lines.push(entry ? '- Nothing written today.' : '- No journal entry today.');
        return lines;
    }
    if (entry.mood_score) lines.push(`- Mood: ${MOOD_LABELS[entry.mood_score] || entry.mood_score} (${entry.mood_score}/5)`);
    parts.forEach(([label, text]) => {
        // Keep multi-line entries readable when pasted
        lines.push(`- ${label}: ${text.replace(/\n+/g, '\n  ')}`);
    });
    return lines;
}

/**
 * @param {object} contextData  value returned by useLifeContext()
 * @param {Date}   [date]       the day being summarised (defaults to today)
 * @returns {string}
 */
export function buildDaySummary(contextData, date = new Date()) {
    const raw = contextData?._raw || {};
    const summary = contextData?.summary || {};
    const todayStr = format(date, 'yyyy-MM-dd');

    const sections = [
        caloriesSection(raw.caloriesSummary?.today),
        vitalSection(raw.habits || []),
        habitsSection(raw.habits || []),
        tasksSection(raw.todos || [], todayStr),
        moneySection(raw, summary.financesThisMonth?.totalSpend, todayStr),
        journalSection(raw.journalEntries, todayStr),
    ];

    return [
        `Daily summary for ${format(date, 'EEEE, d MMMM yyyy')}`,
        ...sections.map((lines) => lines.join('\n')),
    ].join('\n\n');
}

// Typed commands that produce the summary instead of asking the AI
const DAY_SUMMARY_PATTERN = /^\s*(\/day\b|\/summary\b|(summari[sz]e|recap)\s+(my|the)\s+day\b|day\s+summary\b|summary\s+of\s+(my|the)\s+day\b)/i;

export const isDaySummaryCommand = (text) => DAY_SUMMARY_PATTERN.test(text || '');
