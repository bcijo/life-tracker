import { supabase } from './supabase';
import { APP_KNOWLEDGE_BASE } from './appKnowledge';

// Groq LLM Integration
// Add VITE_GROQ_API_KEY to your .env file

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const PRIMARY_MODEL = 'openai/gpt-oss-120b';
const FALLBACK_MODEL = 'openai/gpt-oss-20b';
const VISION_MODEL_NAME = 'qwen/qwen3.8-27b';

/**
 * Converts a raw SQL query into a human-understandable activity phrase
 * so database schema and raw SQL aren't exposed in UI.
 */
export function getHumanReadableQueryDescription(queryText) {
    if (!queryText) return "Analyzing your records...";
    if (typeof queryText === 'object' && queryText.label) return queryText.label;
    
    const q = String(queryText).toLowerCase();

    if (q.includes('analyze_spending')) return "Calculating spending breakdown & category totals...";
    if (q.includes('get_budget_and_runway')) return "Checking budgets, burn rate & runway forecast...";
    if (q.includes('analyze_habits')) return "Analyzing habit streaks & 7-day consistency...";
    if (q.includes('get_tasks_and_shopping')) return "Scanning tasks, deadlines & shopping list...";
    if (q.includes('get_journal_and_mood')) return "Reviewing mood scores & journal reflections...";
    if (q.includes('analyze_calories')) return "Analyzing calorie intake, macros, BMR & exercise burn...";
    if (q.includes('lookup_app_guide')) return "Looking up LifeTracker feature guide...";

    if (q.includes('recurring_expenses')) {
        return "Checking your active recurring & fixed expenses...";
    }
    if (q.includes('transactions')) {
        if (q.includes('group by') && (q.includes('day') || q.includes('date') || q.includes('date_trunc'))) {
            return "Calculating daily spending breakdown for this month...";
        }
        if (q.includes('category') || q.includes('group by category')) {
            return "Analyzing spending by category...";
        }
        if (q.includes('sum(') || q.includes('avg(')) {
            return "Computing financial totals and spending averages...";
        }
        if (q.includes('order by') && q.includes('desc')) {
            return "Scanning your recent transaction history...";
        }
        return "Querying transaction and expense history...";
    }
    if (q.includes('habits')) {
        if (q.includes('history')) {
            return "Checking habit completion history & streaks...";
        }
        return "Reviewing active habits & schedule...";
    }
    if (q.includes('todos')) {
        if (q.includes('completed = false') || q.includes('completed is false') || q.includes('not completed')) {
            return "Looking up pending tasks & deadlines...";
        }
        return "Scanning your tasks & to-do items...";
    }
    if (q.includes('journal_entries')) {
        if (q.includes('mood_score')) {
            return "Analyzing mood trends & reflections...";
        }
        return "Reviewing recent journal reflections...";
    }
    if (q.includes('bank_accounts') || q.includes('bank_balance')) {
        return "Checking bank account balances...";
    }
    if (q.includes('expense_cards') || q.includes('budgets') || q.includes('expense_subcategories')) {
        return "Checking budget targets & expense cards...";
    }
    if (q.includes('shopping_items')) {
        return "Checking your shopping list items...";
    }
    return "Fetching your personal data...";
}

// Specialized domain tools + fallback SQL tool
const ASSISTANT_TOOLS = [
    {
        type: "function",
        function: {
            name: "analyze_spending",
            description: "Use for ANY question about spending, expenses, income, category totals, daily breakdown, biggest transactions, average daily spend, or comparing this month vs last month.",
            parameters: {
                type: "object",
                properties: {
                    period: {
                        type: "string",
                        enum: ["today", "this_week", "last_7_days", "this_month", "last_month", "compare_months", "all_time"],
                        description: "Time window to analyze"
                    },
                    category_filter: {
                        type: "string",
                        description: "Optional category name or keyword to filter by (e.g. 'food', 'transport', 'shopping')"
                    }
                },
                required: ["period"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_budget_and_runway",
            description: "Use for ANY question about budgets, remaining budget, over-budget categories, burn rate, safe-to-spend today, end-of-month forecast, or fixed/recurring subscriptions.",
            parameters: {
                type: "object",
                properties: {
                    category_filter: {
                        type: "string",
                        description: "Optional specific category budget to inspect (e.g. 'food')"
                    }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "analyze_habits",
            description: "Use for ANY question about habits, streaks, completion rates, missed habits this week, morning vs evening routines, or worst/best habits.",
            parameters: {
                type: "object",
                properties: {
                    focus: {
                        type: "string",
                        enum: ["all", "streaks_and_ranking", "missed_recently", "today_status", "morning_vs_evening"],
                        description: "Aspect of habits to analyze"
                    }
                },
                required: ["focus"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_tasks_and_shopping",
            description: "Use for ANY question about to-do tasks, overdue tasks, tasks due this week, tasks without a deadline, completed tasks, or shopping list items.",
            parameters: {
                type: "object",
                properties: {
                    filter: {
                        type: "string",
                        enum: ["all_pending", "overdue", "due_this_week", "no_deadline", "oldest_pending", "completed_recently", "shopping_list"],
                        description: "Filter for tasks or shopping items"
                    }
                },
                required: ["filter"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_journal_and_mood",
            description: "Use for ANY question about mood scores, emotional trends, or journal reflections.",
            parameters: {
                type: "object",
                properties: {
                    limit: {
                        type: "number",
                        description: "Number of recent journal entries to retrieve (default 7)"
                    }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "analyze_calories",
            description: "Use for ANY question about calories, food intake, macros (protein, carbs, fat), BMR, exercise burn, calorie deficit, or surplus.",
            parameters: {
                type: "object",
                properties: {
                    period: {
                        type: "string",
                        enum: ["today", "last_7_days", "all_recent"],
                        description: "Time window to analyze calories"
                    }
                },
                required: ["period"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "lookup_app_guide",
            description: "Use ONLY when the user asks how a LifeTracker feature works, how to do something in the app, how XP/levels or Runway are calculated, or how to install the PWA.",
            parameters: {
                type: "object",
                properties: {
                    topic: {
                        type: "string",
                        description: "Feature or topic being asked about (e.g. 'runway', 'xp', 'pwa', 'split bill', 'habits', 'overview')"
                    }
                },
                required: ["topic"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "execute_read_only_query",
            description: "Fallback PostgreSQL SELECT query tool ONLY if a custom query is needed that the specialized tools above cannot answer. Tables: transactions (id, amount, description, type, category, date), recurring_expenses (id, name, amount, category, day_of_month, is_active), habits (id, name, history, active_days), todos (id, text, completed, deadline), journal_entries (id, date, mood_score, how_was_today), bank_accounts (id, name, current_balance), expense_cards (id, name, budget_amount).",
            parameters: {
                type: "object",
                properties: {
                    query_text: {
                        type: "string",
                        description: "PostgreSQL SELECT query string"
                    }
                },
                required: ["query_text"]
            }
        }
    }
];

/**
 * Compacts tool output to stay within token limits while keeping full accuracy
 */
function compactToolResult(data) {
    if (!data) return "[]";
    if (typeof data === 'string') return data.slice(0, 2500);
    if (Array.isArray(data)) {
        const simplified = data.slice(0, 25).map(item => {
            if (item && item.history && Array.isArray(item.history)) {
                return { ...item, history: item.history.slice(0, 14) };
            }
            return item;
        });
        const str = JSON.stringify(simplified);
        return str.length > 3000 ? str.slice(0, 3000) + '...]' : str;
    }
    const str = JSON.stringify(data);
    return str.length > 3500 ? str.slice(0, 3500) + '...' : str;
}

/**
 * Executes specialized client-side analytical tools with 100% accuracy using live contextData._raw
 */
function executeSpecializedTool(toolName, args, contextData) {
    const raw = contextData?._raw || {};
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const isRecurringTx = (t) => {
        if (t?.is_recurring) return true;
        if (typeof t?.category === 'string' && t.category.toLowerCase() === 'recurring') return true;
        if (typeof t?.description === 'string' && t.description.toLowerCase().includes('(recurring)')) return true;
        return false;
    };

    if (toolName === 'analyze_spending') {
        const period = args?.period || 'this_month';
        const catFilter = (args?.category_filter || '').trim().toLowerCase();
        const allTx = raw.transactions || [];
        const resolveCat = raw.resolveCategoryName || ((t) => t.category || 'Uncategorized');

        const startOfThisMonth = new Date(currentYear, currentMonth, 1);
        const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
        const endOfLastMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        const startOfThisWeek = new Date(today);
        const dow = today.getDay();
        startOfThisWeek.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
        startOfThisWeek.setHours(0, 0, 0, 0);

        const inPeriod = (t, targetPeriod) => {
            if (!t.date) return false;
            const dStr = t.date.split('T')[0];
            const d = new Date(t.date);
            if (targetPeriod === 'today') return dStr === todayStr;
            if (targetPeriod === 'this_week') return d >= startOfThisWeek && d <= today;
            if (targetPeriod === 'last_7_days') return d >= sevenDaysAgo && d <= today;
            if (targetPeriod === 'this_month') return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            if (targetPeriod === 'last_month') return d >= startOfLastMonth && d <= endOfLastMonth;
            return true;
        };

        const summarizePeriod = (targetPeriod) => {
            const periodTx = allTx.filter(t => inPeriod(t, targetPeriod));
            const incomeTotal = Math.round(
                periodTx.filter(t => t.type === 'income').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0)
            );
            let expenses = periodTx.filter(t => t.type === 'expense' && !isRecurringTx(t));

            if (catFilter) {
                expenses = expenses.filter(t => {
                    const cName = resolveCat(t).toLowerCase();
                    const desc = (t.description || '').toLowerCase();
                    return cName.includes(catFilter) || desc.includes(catFilter);
                });
            }

            const dailySpend = Math.round(expenses.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0));
            const fixedSpend = (!catFilter && (targetPeriod === 'this_month' || targetPeriod === 'last_month'))
                ? Math.round(raw.fixedExpensesTotal || 0)
                : 0;

            const byCategory = {};
            const byDay = {};
            expenses.forEach(t => {
                const amt = parseFloat(t.amount) || 0;
                const cName = resolveCat(t);
                byCategory[cName] = (byCategory[cName] || 0) + amt;
                const dayKey = t.date.split('T')[0];
                byDay[dayKey] = (byDay[dayKey] || 0) + amt;
            });

            const categoryBreakdown = Object.entries(byCategory)
                .map(([category, amount]) => ({
                    category,
                    amount: Math.round(amount),
                    sharePct: dailySpend > 0 ? Math.round((amount / dailySpend) * 100) : 0
                }))
                .sort((a, b) => b.amount - a.amount);

            const dailyBreakdown = Object.entries(byDay)
                .map(([date, amount]) => ({ date, amount: Math.round(amount) }))
                .sort((a, b) => b.date.localeCompare(a.date));

            const highestSpendDay = [...dailyBreakdown].sort((a, b) => b.amount - a.amount)[0] || null;

            const topTransactions = [...expenses]
                .sort((a, b) => (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0))
                .slice(0, 6)
                .map(t => ({
                    description: t.description,
                    amount: Math.round(parseFloat(t.amount) || 0),
                    category: resolveCat(t),
                    date: t.date.split('T')[0]
                }));

            const daysElapsed = targetPeriod === 'this_month' ? Math.max(1, today.getDate()) : Math.max(1, dailyBreakdown.length);

            return {
                period: targetPeriod,
                categoryFilter: catFilter || null,
                totalSpend: dailySpend + fixedSpend,
                dailyDiscretionarySpend: dailySpend,
                fixedRecurringSpend: fixedSpend,
                incomeTotal,
                averageDailySpend: Math.round(dailySpend / daysElapsed),
                transactionCount: expenses.length,
                highestSpendDay,
                topCategories: categoryBreakdown.slice(0, 6),
                topTransactions,
                dailyBreakdown: dailyBreakdown.slice(0, 15)
            };
        };

        if (period === 'compare_months') {
            const thisMo = summarizePeriod('this_month');
            const lastMo = summarizePeriod('last_month');
            const diff = thisMo.dailyDiscretionarySpend - lastMo.dailyDiscretionarySpend;
            const pctChange = lastMo.dailyDiscretionarySpend > 0
                ? Math.round((diff / lastMo.dailyDiscretionarySpend) * 100)
                : null;
            return {
                thisMonth: thisMo,
                lastMonth: lastMo,
                dailySpendDifference: diff,
                percentChange: pctChange
            };
        }

        return summarizePeriod(period);
    }

    if (toolName === 'get_budget_and_runway') {
        const catFilter = (args?.category_filter || '').trim().toLowerCase();
        const allTx = (raw.transactions || []).filter(t => {
            if (t.type !== 'expense' || isRecurringTx(t) || !t.date) return false;
            const d = new Date(t.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
        const resolveCat = raw.resolveCategoryName || ((t) => t.category || 'Uncategorized');
        const categoryMap = raw.categoryMap || {};

        const dayOfMonth = Math.max(1, today.getDate());
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const daysRemaining = Math.max(1, daysInMonth - dayOfMonth);

        const dailySpend = Math.round(allTx.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0));
        const fixedSpend = Math.round(raw.fixedExpensesTotal || 0);
        const totalMonthlySpend = dailySpend + fixedSpend;

        const baselineSpend = allTx
            .filter(t => (parseFloat(t.amount) || 0) < 5000)
            .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        const dailyBurnRate = Math.round(baselineSpend / dayOfMonth);

        const budgets = raw.budgets || [];
        const totalBudgetCap = Math.round(budgets.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0));
        const remainingBudget = totalBudgetCap > 0 ? totalBudgetCap - dailySpend : null;
        const safeToSpendToday = remainingBudget !== null ? Math.max(0, Math.round(remainingBudget / daysRemaining)) : null;
        const projectedEndOfMonthDailySpend = Math.round(dailySpend + dailyBurnRate * daysRemaining);

        const categoryBudgets = budgets.map(b => {
            const limit = Math.round(parseFloat(b.amount) || 0);
            const catIds = Array.isArray(b.category_ids) ? b.category_ids : [];
            const matchingTx = allTx.filter(t =>
                catIds.includes(t.card_id) ||
                catIds.includes(t.category) ||
                resolveCat(t).toLowerCase() === (b.name || '').toLowerCase()
            );
            const spent = Math.round(matchingTx.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0));
            const remaining = limit - spent;
            const percentUsed = limit > 0 ? Math.round((spent / limit) * 100) : 0;
            return {
                budgetName: b.name || catIds.map(id => categoryMap[id] || id).join(', '),
                limit,
                spent,
                remaining,
                percentUsed,
                status: spent > limit ? 'EXCEEDED' : percentUsed >= 80 ? 'NEAR_LIMIT' : 'ON_TRACK'
            };
        }).sort((a, b) => b.percentUsed - a.percentUsed);

        const filteredBudgets = catFilter
            ? categoryBudgets.filter(b => (b.budgetName || '').toLowerCase().includes(catFilter))
            : categoryBudgets;

        return {
            totalMonthlySpend,
            dailyDiscretionarySpend: dailySpend,
            fixedCommitmentsSpend: fixedSpend,
            totalBudgetCap,
            remainingBudget,
            status: remainingBudget !== null && remainingBudget < 0 ? 'BUDGET_EXCEEDED' : 'WITHIN_BUDGET',
            dailyBurnRate,
            safeToSpendToday,
            daysRemainingInMonth: daysRemaining,
            projectedEndOfMonthSpend: projectedEndOfMonthDailySpend + fixedSpend,
            categoryBudgets: filteredBudgets,
            activeSubscriptions: raw.recurringExpenses || []
        };
    }

    if (toolName === 'analyze_habits') {
        const habits = raw.habits || [];
        const last7Dates = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            return {
                dateStr: d.toISOString().split('T')[0],
                dow: d.getDay()
            };
        });

        const detailed = habits.map(h => {
            const statusMap = {};
            (h.history || []).forEach(entry => {
                if (typeof entry === 'string') statusMap[entry.split('T')[0]] = 'completed';
                else if (entry?.date) statusMap[entry.date] = entry.status || 'completed';
            });

            let scheduled7d = 0;
            let completed7d = 0;
            const missedDates7d = [];

            last7Dates.forEach(({ dateStr, dow }, idx) => {
                if ((h.activeDays || [0, 1, 2, 3, 4, 5, 6]).includes(dow)) {
                    scheduled7d++;
                    const st = statusMap[dateStr] || null;
                    if (st === 'completed') {
                        completed7d++;
                    } else if (idx > 0 && st !== 'paused' && !h.isPaused) {
                        missedDates7d.push(dateStr);
                    }
                }
            });

            return {
                name: h.name,
                timeOfDay: h.timeOfDay,
                isPaused: h.isPaused,
                todayStatus: h.isPaused ? 'paused' : (h.isScheduledToday ? h.todayStatus : 'rest_day'),
                currentStreak: h.streak || 0,
                lifetimeSuccessRatePct: h.successRate,
                weeklyCompletionRatePct: scheduled7d > 0 ? Math.round((completed7d / scheduled7d) * 100) : 100,
                completedLast7Days: `${completed7d}/${scheduled7d}`,
                missedDatesLast7Days: missedDates7d
            };
        });

        const activeOnly = detailed.filter(h => !h.isPaused);
        const byStreak = [...activeOnly].sort((a, b) => b.currentStreak - a.currentStreak);
        const byWorstRate = [...activeOnly].sort((a, b) => (a.weeklyCompletionRatePct ?? 100) - (b.weeklyCompletionRatePct ?? 100));

        return {
            summary: contextData?.summary?.habitsToday || {},
            longestStreakHabit: byStreak[0] || null,
            weakestHabits: byWorstRate.slice(0, 3),
            missedThisWeek: activeOnly.filter(h => h.missedDatesLast7Days.length > 0),
            completedToday: activeOnly.filter(h => h.todayStatus === 'completed').map(h => h.name),
            pendingToday: activeOnly.filter(h => h.todayStatus === 'pending').map(h => h.name),
            allHabits: detailed
        };
    }

    if (toolName === 'get_tasks_and_shopping') {
        const filter = args?.filter || 'all_pending';
        const todos = raw.todos || [];
        const shopping = raw.shoppingItems || [];

        if (filter === 'shopping_list') {
            return {
                toBuy: shopping.filter(i => !i.is_bought && !i.isBought).map(i => ({ name: i.name, category: i.category })),
                boughtNotLogged: shopping.filter(i => (i.is_bought || i.isBought) && !i.added_to_expenses).map(i => i.name)
            };
        }

        const startOfThisWeek = new Date(today);
        const endOfThisWeek = new Date(today);
        endOfThisWeek.setDate(today.getDate() + 7);
        const endOfWeekStr = endOfThisWeek.toISOString().split('T')[0];

        const pending = todos.filter(t => !t.completed);
        const completed = todos.filter(t => t.completed);

        return {
            pendingCount: pending.length,
            completedCount: completed.length,
            overdueTasks: pending.filter(t => t.deadline && t.deadline < todayStr).map(t => ({ text: t.text, deadline: t.deadline })),
            dueThisWeek: pending.filter(t => t.deadline && t.deadline >= todayStr && t.deadline <= endOfWeekStr).map(t => ({ text: t.text, deadline: t.deadline })),
            withoutDeadline: pending.filter(t => !t.deadline).map(t => ({ text: t.text, createdAt: t.created_at?.split('T')[0] })),
            oldestPending: [...pending].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)).slice(0, 5).map(t => ({
                text: t.text,
                deadline: t.deadline || 'No deadline',
                createdAt: t.created_at?.split('T')[0]
            })),
            recentlyCompleted: completed.slice(0, 10).map(t => ({ text: t.text, deadline: t.deadline }))
        };
    }

    if (toolName === 'get_journal_and_mood') {
        const entries = (raw.journalEntries || []).slice(0, args?.limit || 7);
        const scores = entries.map(e => Number(e.mood_score)).filter(n => !isNaN(n) && n > 0);
        const avgMood = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null;
        return {
            averageMoodScore: avgMood,
            entryCount: entries.length,
            entries: entries.map(e => ({
                date: e.date,
                moodScore: e.mood_score,
                thoughts: e.on_your_mind,
                reflection: e.how_was_today,
                changeForTomorrow: e.change_for_tomorrow
            }))
        };
    }

    if (toolName === 'analyze_calories') {
        return raw.caloriesSummary || contextData?.summary?.caloriesToday || { note: "No calorie logs recorded yet." };
    }

    if (toolName === 'lookup_app_guide') {
        return { guide: APP_KNOWLEDGE_BASE };
    }

    return { error: "Unknown tool" };
}

async function fetchGroqWithRetry(payload, apiKey, maxRetries = 2) {
    let lastError = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.status === 429) {
                let waitMs = 3000;
                const retryAfter = response.headers.get('retry-after');
                const resetTokens = response.headers.get('x-ratelimit-reset-tokens');
                if (retryAfter && !isNaN(parseFloat(retryAfter))) {
                    waitMs = Math.min(Math.max(parseFloat(retryAfter) * 1000, 2000), 10000);
                } else if (resetTokens) {
                    const sec = parseFloat(resetTokens.replace('s', ''));
                    if (!isNaN(sec) && sec > 0) {
                        waitMs = Math.min(Math.max(Math.ceil(sec * 1000) + 500, 2500), 10000);
                    }
                } else {
                    waitMs = 2500 * (attempt + 1);
                }

                let rateLimitMsg = "Groq rate limit reached (429). Please wait a few seconds and try again.";
                try {
                    const errJson = await response.json();
                    if (errJson?.error?.message) {
                        rateLimitMsg = errJson.error.message;
                    }
                } catch {
                    // ignore json parse failure
                }

                lastError = new Error(rateLimitMsg);
                console.warn(`[Groq Rate Limit 429] Waiting ${waitMs}ms before retry (attempt ${attempt + 1}/${maxRetries})...:`, rateLimitMsg);

                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, waitMs));
                    continue;
                } else {
                    throw lastError;
                }
            }

            if (!response.ok) {
                let errorMsg = `Groq API error (${response.status})`;
                try {
                    const errJson = await response.json();
                    if (errJson?.error?.message) {
                        errorMsg = errJson.error.message;
                    } else if (typeof errJson === 'object') {
                        errorMsg = JSON.stringify(errJson);
                    }
                } catch {
                    const errText = await response.text().catch(() => '');
                    if (errText) errorMsg = `Groq API error ${response.status}: ${errText}`;
                }
                throw new Error(errorMsg);
            }

            return await response.json();
        } catch (err) {
            lastError = err;
            if (attempt < maxRetries) {
                await new Promise(r => setTimeout(r, 1500));
            }
        }
    }

    throw lastError || new Error("Failed to communicate with Groq. Please check your internet connection.");
}

async function runSQLTool(queryText) {
    console.log('[Groq SQL Agent] Executing Query:', queryText);
    try {
        const { data, error } = await supabase.rpc('execute_read_only_query', { query_text: queryText });
        if (!error && data !== undefined && data !== null) {
            return data;
        }

        if (error) {
            console.warn('[Groq SQL Agent] RPC note:', error.message, 'Trying direct fallback...');
        }

        const q = String(queryText).toLowerCase();
        let targetTable = null;
        if (q.includes('from transactions')) targetTable = 'transactions';
        else if (q.includes('from recurring_expenses')) targetTable = 'recurring_expenses';
        else if (q.includes('from habits')) targetTable = 'habits';
        else if (q.includes('from todos')) targetTable = 'todos';
        else if (q.includes('from journal_entries')) targetTable = 'journal_entries';
        else if (q.includes('from shopping_items')) targetTable = 'shopping_items';
        else if (q.includes('from bank_accounts')) targetTable = 'bank_accounts';
        else if (q.includes('from expense_cards')) targetTable = 'expense_cards';

        if (targetTable) {
            const { data: fallbackData, error: fallbackError } = await supabase
                .from(targetTable)
                .select('*')
                .limit(100);

            if (!fallbackError && fallbackData) {
                return fallbackData;
            }
        }

        return { error: error?.message || "Query execution failed." };
    } catch (err) {
        console.error('[Groq SQL Agent] Exception:', err);
        return { error: err.message };
    }
}

async function callGroq(messages, systemPrompt, jsonMode = false) {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('VITE_GROQ_API_KEY is missing');
    }

    const payload = {
        model: FALLBACK_MODEL,
        messages: [
            { role: 'system', content: systemPrompt },
            ...messages
        ],
        temperature: 0.25,
        max_tokens: 2500,
        reasoning_effort: "low",
    };

    if (jsonMode) {
        payload.response_format = { type: "json_object" };
    }

    const data = await fetchGroqWithRetry(payload, apiKey, 2);
    return data.choices[0]?.message?.content;
}

// 1. Agentic Chat with Specialized Tool Routing
export async function askAI(userQuery, contextData, onQueryLogged = null, history = []) {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('VITE_GROQ_API_KEY is missing');
    }

    const todayDate = new Date().toISOString().split('T')[0];
    const snapshot = contextData?.summary || contextData || {};

    const systemPrompt = `You are LifeTracker's sharp, direct, no-fluff personal AI assistant. Today is ${todayDate}.

=== LIVE SNAPSHOT ===
${JSON.stringify(snapshot)}

=== STRICT RESPONSE RULES (CRITICAL) ===
1. **ANSWER FIRST**: Your very first sentence MUST directly answer the question with the exact number, name, or yes/no verdict (e.g., "**₹39,819** spent this month (**₹27,519** daily + **₹12,300** fixed).").
2. **NO FILLER**: Never start with "Based on your data...", "Sure!", "Let's look at...", or restate the question.
3. **STAY ON TOPIC**: Only answer what was asked. If asked about habits, do NOT mention finances or tasks. If asked about food spending, do NOT dump unrelated categories.
4. **SHORT & SCANNABLE**: Keep answers under 100 words unless asked for a full breakdown. Use 3–5 tight bullet points or a compact Markdown table.
5. **CURRENCY & PRECISION**: Format all money in Indian Rupees (\`₹12,300\`). When reporting monthly spend, always clarify **Total Spend = Daily Discretionary Spend + Fixed Subscriptions**.

=== PROMPT-TO-TOOL ROUTING GUIDE (WHICH TOOL TO CALL) ===
Always call the matching specialized tool before answering detailed questions:
- **Spending / Expenses / Categories / Daily Breakdown / Compare Months / Biggest Purchases**
  -> Call \`analyze_spending\` with \`period\` ("today" | "this_week" | "last_7_days" | "this_month" | "last_month" | "compare_months" | "all_time") and optional \`category_filter\` (e.g., "food").
- **Budgets / Remaining Limit / Over-Budget / Burn Rate / Safe-to-Spend / Subscriptions / Forecast**
  -> Call \`get_budget_and_runway\` (pass \`category_filter\` if asking about a specific category budget).
- **Habits / Streaks / Missed Habits / Completion Rate / Morning vs Evening / Best or Worst Habit**
  -> Call \`analyze_habits\` with \`focus\` ("streaks_and_ranking" | "missed_recently" | "today_status" | "morning_vs_evening" | "all").
- **Tasks / Todos / Overdue / Due This Week / No Deadline / Shopping List**
  -> Call \`get_tasks_and_shopping\` with \`filter\` ("overdue" | "due_this_week" | "no_deadline" | "oldest_pending" | "completed_recently" | "shopping_list" | "all_pending").
- **Mood / Journal Reflections**
  -> Call \`get_journal_and_mood\`.
- **How LifeTracker Works / App Features / PWA Install / XP & Level Formula / Bill Splitter**
  -> Call \`lookup_app_guide\`.
- **Custom Database Query not covered above**
  -> Call \`execute_read_only_query\`.`;

    const validHistory = Array.isArray(history)
        ? history
            .filter(m => m && m.content && !m.content.includes("I ran into") && !m.isError)
            .slice(-4)
            .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
        : [];

    let messages = [
        ...validHistory,
        { role: 'user', content: userQuery }
    ];

    let executedQueries = [];

    // Up to 3 iterations for agentic reasoning
    for (let i = 0; i < 3; i++) {
        let data;
        try {
            data = await fetchGroqWithRetry({
                model: PRIMARY_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
                temperature: 0.2,
                max_tokens: 4000,
                reasoning_effort: "low",
                tools: ASSISTANT_TOOLS,
                tool_choice: "auto"
            }, apiKey, 1);
        } catch (primaryErr) {
            console.warn('[Groq Agent] Primary model failed, trying fallback model...', primaryErr.message);
            data = await fetchGroqWithRetry({
                model: FALLBACK_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...messages
                ],
                temperature: 0.2,
                max_tokens: 4000,
                reasoning_effort: "low",
                tools: ASSISTANT_TOOLS,
                tool_choice: "auto"
            }, apiKey, 2);
        }

        const responseMessage = data?.choices?.[0]?.message;
        if (!responseMessage) {
            throw new Error("Empty response from AI assistant");
        }

        messages.push(responseMessage);

        const toolCalls = responseMessage.tool_calls;
        if (!toolCalls || toolCalls.length === 0) {
            return {
                content: responseMessage.content || "No matching records found.",
                queries: executedQueries
            };
        }

        // Execute tool calls
        for (const toolCall of toolCalls) {
            const fnName = toolCall.function.name;
            let args = {};
            try {
                args = typeof toolCall.function.arguments === 'string' 
                    ? JSON.parse(toolCall.function.arguments) 
                    : (toolCall.function.arguments || {});
            } catch {
                args = { query_text: toolCall.function.arguments };
            }

            const stepDescriptor = fnName === 'execute_read_only_query'
                ? (args.query_text || fnName)
                : `${fnName}(${JSON.stringify(args)})`;
            const stepLabel = getHumanReadableQueryDescription(stepDescriptor);

            executedQueries.push({
                query: stepDescriptor,
                label: stepLabel
            });

            if (onQueryLogged) {
                onQueryLogged({
                    query: stepDescriptor,
                    label: stepLabel
                });
            }

            let toolResult;
            if (fnName === 'execute_read_only_query') {
                toolResult = await runSQLTool(args.query_text || "");
            } else {
                toolResult = executeSpecializedTool(fnName, args, contextData);
            }

            const compacted = compactToolResult(toolResult);

            messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                name: fnName,
                content: compacted
            });
        }
    }

    // If iterations reached limit, perform final direct synthesis
    const finalAnswer = await callGroq(messages, systemPrompt);
    return {
        content: finalAnswer || "Here is the summary based on your recent activity.",
        queries: executedQueries
    };
}

// 2. Weekly/Monthly Reports with Voluntary Commitments
export async function generateReport(type, periodStart, periodEnd, fullData) {
    const systemPrompt = `Generate a ${type} report (${periodStart} to ${periodEnd}).
    
    Data: ${JSON.stringify(fullData, null, 2)}
    
    Return STRICTLY valid JSON with no enclosing markdown ticks, containing exactly these keys:
    {
        "summary": "1 sentence max - key insight only",
        "highlights": ["3 SHORT bullet points - 5-8 words each"],
        "spendingAnalysis": "1 sentence - spending pattern",
        "habitAnalysis": "1 sentence - habit consistency",
        "journalInsight": "1 sentence - mood/mindset trend from journal entries",
        "suggestion": "1 actionable tip - under 10 words",
        "score": 85,
        "voluntaryCommitments": [
            {
                "id": "commit-unique-id",
                "type": "todo", 
                "title": "Clean room",
                "description": "Clean and declutter your study desk.",
                "actionData": {
                    "deadline": "YYYY-MM-DD"
                }
            },
            {
                "id": "commit-unique-id-2",
                "type": "habit",
                "title": "Morning Journaling",
                "description": "Write down 3 things you are grateful for each morning.",
                "actionData": {
                    "activeDays": [0,1,2,3,4,5,6],
                    "timeOfDay": "morning"
                }
            },
            {
                "id": "commit-unique-id-3",
                "type": "budget",
                "title": "Limit Dining Out",
                "description": "Keep restaurants and dining under ₹1,000 this week.",
                "actionData": {
                    "amount": 1000,
                    "categoryIds": ["food"]
                }
            }
        ]
    }
    
    You MUST generate exactly 2-3 highly personalized "voluntaryCommitments" based on the user's weaknesses or opportunities in their data.
    - If they spent too much, suggest a budget.
    - If they missed habits, suggest a habit.
    - If they have pending tasks or deadlines, suggest a todo.
    Make sure each commitment is realistic and highly action-oriented.
    Be extremely concise in summaries. No fluff.`;

    const messages = [{ role: 'user', content: `Generate the ${type} report.` }];

    try {
        const jsonStr = await callGroq(messages, systemPrompt, true);
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error('Failed to generate report:', e);
        return null;
    }
}

// 3. Bill Splitting — Direct Vision Parser (Groq Qwen 3.8 27B)
export async function parseBillImage(base64ImageDataUrl) {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) throw new Error('VITE_GROQ_API_KEY is missing');

    const payload = {
        model: VISION_MODEL_NAME,
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: `You are a restaurant receipt parser. Carefully read this receipt image and extract all data into structured JSON.

Return a JSON object with exactly these 4 keys: "restaurant_name", "items", "charges", "discounts".

0. "restaurant_name" — The name of the restaurant, cafe, shop or establishment printed on the receipt. If not visible, return null.

1. "items" — Individual food/drink ordered:
   - "name": item name (clean it up if needed)
   - "quantity": number of units (integer, default 1 if not shown)
   - "unit_price": price per single unit (number, in INR)
   - "total_price": quantity × unit_price (number, in INR)
   Example: 2x Butter Naan at ₹40 each → { "name": "Butter Naan", "quantity": 2, "unit_price": 40, "total_price": 80 }

2. "charges" — Additional charges added to the bill:
   - Include: service charge, service tax, GST, CGST, SGST, packing charge, delivery fee, etc.
   - "name": charge name
   - "amount": charge amount (number, in INR)
   - If the charge is a percentage and you can compute it, put the computed rupee amount.

3. "discounts" — Any discounts or deductions:
   - Include: discount, offer, coupon, promo, membership discount, etc.
   - "name": discount name
   - "amount": discount amount as a POSITIVE number (even though it reduces the bill)

Return only valid JSON, no markdown fences, no extra text. Example structure:
{
  "restaurant_name": "The Spice Garden",
  "items": [
    { "name": "Paneer Tikka", "quantity": 1, "unit_price": 280, "total_price": 280 },
    { "name": "Butter Naan", "quantity": 2, "unit_price": 40, "total_price": 80 }
  ],
  "charges": [
    { "name": "GST (5%)", "amount": 18 },
    { "name": "Service Charge", "amount": 36 }
  ],
  "discounts": [
    { "name": "10% Membership Discount", "amount": 36 }
  ]
}`
                    },
                    {
                        type: 'image_url',
                        image_url: { url: base64ImageDataUrl }
                    }
                ]
            }
        ],
        temperature: 0.1,
        max_tokens: 2048,
        response_format: { type: 'json_object' }
    };

    const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq Vision API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const jsonStr = data.choices[0]?.message?.content;

    try {
        const parsed = JSON.parse(jsonStr);
        return {
            restaurant_name: parsed.restaurant_name || null,
            items: parsed.items || [],
            charges: parsed.charges || [],
            discounts: parsed.discounts || [],
        };
    } catch (e) {
        console.error('Failed to parse bill vision response:', e, jsonStr);
        return { restaurant_name: null, items: [], charges: [], discounts: [] };
    }
}

/**
 * Compresses and resizes an image file to a base64 Data URL to fit within Vision LLM limits.
 */
export function compressImageFile(file, maxDimension = 1100, quality = 0.80) {
    return new Promise((resolve, reject) => {
        if (!file) return reject(new Error('No file provided'));
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = () => reject(new Error('Failed to load image'));
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

/**
 * Reads a food product nutrition label/table image via Groq Vision,
 * extracts macronutrients and standardizes values to PER-100g (or PER-100ml for liquids).
 */
export async function parseNutritionLabelImage(base64ImageDataUrl, productNameHint = '') {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) throw new Error('VITE_GROQ_API_KEY is missing');

    const prompt = `You are an expert nutrition facts reader. Analyze this image of a food product's nutrition facts panel, label, or package table.

Extract the nutritional information and normalize it STRICTLY to PER 100g (or PER 100ml if it is a beverage/liquid).

CRITICAL INSTRUCTIONS:
1. Product Name: Identify the brand and product name from the image if visible (e.g. "Amul Gold Milk", "Kellogg's Corn Flakes", "Britannia Good Day", "Pintola Peanut Butter"). If unclear or missing, use: "${productNameHint || 'Packaged Food'}".
2. Liquid or Solid:
   - "is_liquid": true if the product is milk, juice, shake, tea, soup, beverage, edible oil, liquid syrup, etc.
   - "is_liquid": false if it is solid/powder (biscuits, bread, cereal, protein powder, chocolate, snacks, etc.).
3. Serving Basis & Math Conversion:
   - Look for whether values are given "Per 100g" / "Per 100ml" or "Per Serving" (e.g. per 30g, per 1 biscuit 12.5g, per scoop 32g).
   - If "Per 100g" or "Per 100ml" is present on the table, extract those values directly!
   - If values are ONLY listed per serving, identify the serving size in grams or ml (e.g. serving size = 25g).
     Then mathematically calculate per-100g = (per_serving_value / serving_size) * 100.
4. Energy/Calories:
   - Return "calories_per_100g" in kcal (kilocalories).
   - If only kJ is given on the label, convert: kcal = Math.round(kJ / 4.184). Must be a positive number.
5. Macronutrients per 100g (or per 100ml):
   - "protein_per_100g": grams of protein (number, 1 decimal)
   - "carbs_per_100g": grams of total carbohydrates (number, 1 decimal)
   - "fat_per_100g": grams of total fat (number, 1 decimal)
   - "fiber_per_100g": grams of dietary fiber (number, 1 decimal, default 0 if not listed)
6. Serving Unit:
   - "unit_name": single portion name if applicable (e.g. "biscuit", "cookie", "bar", "scoop", "slice", "glass", "cup", "pack", "piece", "serving")
   - "grams_per_unit": weight or volume of 1 serving/unit in grams or ml (number). If not clear, default to 30 for solid or 200 for liquid.
   - "serving_size_text": brief note of serving size read from label (e.g. "30g (approx 2 cookies)", "1 scoop (33g)", "100ml")

Return ONLY a valid JSON object with NO markdown fences and NO extra commentary matching this schema:
{
  "name": "Product Name",
  "category": "Packaged Food",
  "is_liquid": false,
  "calories_per_100g": 450,
  "protein_per_100g": 7.5,
  "carbs_per_100g": 65.0,
  "fat_per_100g": 18.0,
  "fiber_per_100g": 3.0,
  "unit_name": "biscuit",
  "grams_per_unit": 12,
  "serving_size_text": "1 biscuit (12g)"
}`;

    const candidateModels = [VISION_MODEL_NAME];
    let lastError = null;

    for (const model of candidateModels) {
        try {
            const payload = {
                model,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            { type: 'image_url', image_url: { url: base64ImageDataUrl } }
                        ]
                    }
                ],
                temperature: 0.1,
                max_tokens: 600,
                response_format: { type: 'json_object' }
            };

            const data = await fetchGroqWithRetry(payload, apiKey, 2);
            const content = data.choices[0]?.message?.content;
            if (!content) continue;

            const parsed = JSON.parse(content);
            return {
                name: String(parsed.name || productNameHint || 'Scanned Food').trim(),
                category: parsed.category || (parsed.is_liquid ? 'Beverage' : 'Packaged Food'),
                is_liquid: Boolean(parsed.is_liquid),
                calories_per_100g: Math.max(0, Math.round(Number(parsed.calories_per_100g) || 0)),
                protein_per_100g: Math.max(0, Math.round((Number(parsed.protein_per_100g) || 0) * 10) / 10),
                carbs_per_100g: Math.max(0, Math.round((Number(parsed.carbs_per_100g) || 0) * 10) / 10),
                fat_per_100g: Math.max(0, Math.round((Number(parsed.fat_per_100g) || 0) * 10) / 10),
                fiber_per_100g: Math.max(0, Math.round((Number(parsed.fiber_per_100g) || 0) * 10) / 10),
                unit_name: String(parsed.unit_name || (parsed.is_liquid ? 'glass' : 'serving')).toLowerCase().trim(),
                grams_per_unit: Math.max(1, Math.round(Number(parsed.grams_per_unit) || (parsed.is_liquid ? 200 : 30))),
                serving_size_text: String(parsed.serving_size_text || '').trim(),
                source: 'scan'
            };
        } catch (err) {
            console.warn(`[Groq Nutrition Vision] Model ${model} failed:`, err.message);
            lastError = err;
        }
    }

    throw lastError || new Error("Failed to scan nutrition label image");
}

// 4. Speech-to-Text Transcription via Groq Whisper Large V3
const AUDIO_TRANSCRIPTION_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
const WHISPER_MODEL = 'whisper-large-v3-turbo';

/**
 * Transcribes an audio blob using Groq's whisper-large-v3 model.
 * @param {Blob} audioBlob - Audio recording blob (webm, mp4, wav, ogg, etc.)
 * @param {string} [promptHint] - Optional context to guide vocabulary and punctuation
 * @returns {Promise<string>} - Transcribed text
 */
export async function transcribeAudio(audioBlob, promptHint = '') {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('VITE_GROQ_API_KEY is missing');
    }

    const mimeType = audioBlob.type || 'audio/webm';
    let ext = 'webm';
    if (mimeType.includes('mp4') || mimeType.includes('m4a')) ext = 'm4a';
    else if (mimeType.includes('ogg')) ext = 'ogg';
    else if (mimeType.includes('wav')) ext = 'wav';
    else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) ext = 'mp3';

    const formData = new FormData();
    formData.append('file', audioBlob, `recording.${ext}`);
    formData.append('model', WHISPER_MODEL);
    formData.append('response_format', 'json');
    formData.append('temperature', '0.0');
    if (promptHint) {
        formData.append('prompt', promptHint);
    }

    const response = await fetch(AUDIO_TRANSCRIPTION_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`
        },
        body: formData
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error('[Groq Whisper Error]:', response.status, errText);
        throw new Error(`Whisper transcription failed: ${response.status}`);
    }

    const data = await response.json();
    return data.text ? data.text.trim() : '';
}

/**
 * AI Habit Match Analysis: Compares habits of two users to discover shared habits,
 * synergized habits, and mutual challenge opportunities.
 */
export async function analyzeHabitMatch(myHabits, friendHabits, myName = 'You', friendName = 'Friend') {
    const myHabitNames = (myHabits || []).map(h => ({ id: h.id, name: h.name, active_days: h.active_days }));
    const friendHabitNames = (friendHabits || []).map(h => ({ id: h.id, name: h.name, active_days: h.active_days }));

    const systemPrompt = `You are a concise AI habit matcher for LifeTracker.
Analyze habits of: ${myName} and ${friendName}.
Tasks:
1. Suggest ONE clean, realistic mutual habit challenge neither tracks that fits their shared focus.
2. Match similar habits they already track.

Return ONLY a JSON object with this exact minimal structure:
{
  "compatibilityScore": 85,
  "mutualSynergyHabit": {
    "title": "Morning 15m Walk",
    "category": "Health",
    "frequency": "Daily"
  },
  "matches": [
    {
      "habitTitle": "Workout",
      "category": "Fitness",
      "myHabitId": "optional-id-or-null",
      "friendHabitId": "optional-id-or-null",
      "status": "both_tracking"
    }
  ]
}

Status must be: "both_tracking" | "you_need_to_add" | "friend_needs_to_add". Keep all titles concise (2-4 words max).`;

    const userMessage = `${myName}'s habits: ${JSON.stringify(myHabitNames)}\n${friendName}'s habits: ${JSON.stringify(friendHabitNames)}`;

    try {
        const response = await callGroq([
            { role: 'user', content: userMessage }
        ], systemPrompt, true);

        if (!response) return null;
        return JSON.parse(response);
    } catch (e) {
        console.error('Error analyzing habit match:', e);
        return null;
    }
}

/**
 * Generates 3 concise, privacy-masked AI Coach suggestions for the visual Daily Report card.
 * Strictly avoids mentioning specific currency amounts, merchant names, habit titles, or task titles.
 */
export async function generateDailyReportSuggestions(report) {
    if (!report) return null;

    const systemPrompt = `You are the LifeTracker Daily Report Coach.
Generate 2 short, minimal, actionable takeaways based on the user's daily metrics.
STRICT PRIVACY & FORMAT RULES:
1. NEVER mention any specific currency amounts (no ₹, $, or exact money values), merchant names, habit names, or task titles.
2. Keep each takeaway ultra-concise (6 to 10 words max) with no emojis at the start.
3. Return ONLY a JSON object with this exact shape:
{
  "suggestions": [
    "Start evening routines 30 mins earlier tomorrow.",
    "Spending stayed 28% under pace — keep the buffer."
  ]
}`;

    const summaryPayload = {
        date: report.dateLabel,
        overallScore: report.overallScore,
        grade: report.grade,
        habits: {
            done: report.habits.done,
            total: report.habits.total,
            pct: report.habits.pct,
            bestStreak: report.habits.bestStreak,
            morning: `${report.habits.morningDone}/${report.habits.morningTotal}`,
            evening: `${report.habits.eveningDone}/${report.habits.eveningTotal}`,
        },
        tasks: {
            completed: report.tasks.done,
            pendingCarriedOver: report.tasks.pendingDue,
            xpEarned: report.tasks.xpEarned,
        },
        spending: {
            pacePctOfDailyTarget: report.spending.rawPacePct,
            status: report.spending.statusLabel,
        },
    };

    try {
        const response = await callGroq(
            [{ role: 'user', content: JSON.stringify(summaryPayload) }],
            systemPrompt,
            true
        );
        if (!response) return null;
        const parsed = JSON.parse(response);
        if (Array.isArray(parsed?.suggestions) && parsed.suggestions.length > 0) {
            return parsed.suggestions.slice(0, 2);
        }
        return null;
    } catch (e) {
        console.error('Error generating daily report AI suggestions:', e);
        return null;
    }
}

/**
 * Deterministic fallback for next-day advice when offline or API is unavailable.
 * Returns 3 concrete bullets across yesterday's habits, spending, and journal.
 */
export function buildFallbackNextDayAdvice(digest) {
    const habits = digest?.habits || {};
    const spending = digest?.spending || {};
    const journal = digest?.journal || {};

    const doneList = habits.completedYesterday || [];
    const missedList = habits.missedYesterday || [];
    const doneCount = doneList.length;
    const scheduledCount = habits.scheduledYesterday || 0;
    const spentYesterday = Math.round(spending.yesterdayTotal || 0);
    const avgDaily = Math.round(spending.sevenDayDailyAvg || 0);
    const topCat = spending.topCategoryYesterday;

    // 1. Habits bullet
    let habitBullet = 'Start with your earliest scheduled habit today to build momentum.';
    if (scheduledCount > 0) {
        if (doneCount === scheduledCount) {
            const lead = doneList[0]?.name ? ` (led by ${doneList[0].name})` : '';
            habitBullet = `Hit ${doneCount}/${scheduledCount} habits yesterday${lead}. Keep the full streak alive today.`;
        } else if (missedList.length > 0) {
            const missedNames = missedList.slice(0, 2).map(h => h.name).join(' & ');
            habitBullet = `Hit ${doneCount}/${scheduledCount} habits yesterday (missed ${missedNames}). Knock out ${missedList[0].name} early today.`;
        }
    }

    // 2. Spending bullet
    let spendingBullet = 'Keep discretionary spending intentional today.';
    if (spentYesterday === 0) {
        const avgText = avgDaily > 0 ? ` vs ₹${avgDaily.toLocaleString('en-IN')} avg` : '';
        spendingBullet = `Spent ₹0 yesterday${avgText}. Maintain that buffer and keep today's spend light.`;
    } else if (avgDaily > 0 && spentYesterday > avgDaily) {
        const catSuffix = topCat ? ` (${topCat})` : '';
        spendingBullet = `Spent ₹${spentYesterday.toLocaleString('en-IN')} yesterday${catSuffix} vs ₹${avgDaily.toLocaleString('en-IN')} avg. Aim for a low-spend day today.`;
    } else {
        const catSuffix = topCat ? ` on ${topCat}` : '';
        spendingBullet = `Spent ₹${spentYesterday.toLocaleString('en-IN')} yesterday${catSuffix}. Well within pace, stay steady today.`;
    }

    // 3. Journal bullet
    const rawIntention = String(journal.intentionForToday || '').trim().replace(/\.$/, '');
    const rawThought = String(journal.highlights || journal.thoughts || '').trim().replace(/\.$/, '');
    let journalBullet = 'No journal entry yesterday. Jot down a 1-minute reflection tonight.';
    if (rawIntention) {
        journalBullet = `Yesterday's note for today: "${rawIntention.slice(0, 55)}${rawIntention.length > 55 ? '…' : ''}". Make that your anchor today.`;
    } else if (journal.moodLabel && rawThought) {
        journalBullet = `Logged a "${journal.moodLabel}" mood yesterday ("${rawThought.slice(0, 45)}${rawThought.length > 45 ? '…' : ''}"). Pace your energy today.`;
    } else if (journal.moodLabel) {
        journalBullet = `Logged a "${journal.moodLabel}" mood yesterday. Carry a calm, steady focus into today.`;
    }

    return {
        bullets: [habitBullet, spendingBullet, journalBullet],
    };
}

function sanitizeBullet(text) {
    if (!text || typeof text !== 'string') return '';
    let cleaned = text.replace(/^[•\-*]\s*/, '').trim();
    // Replace em-dashes, en-dashes, and spaced hyphens with periods
    cleaned = cleaned.replace(/\s*[—–]\s*/g, '. ').replace(/\s+-\s+/g, '. ');
    // Clean up duplicate periods
    cleaned = cleaned.replace(/\.{2,}/g, '.');
    // Ensure first character after a period + space is capitalized
    cleaned = cleaned.replace(/\.\s+([a-z])/g, (_, letter) => `. ${letter.toUpperCase()}`);
    return cleaned;
}

/**
 * Analyzes yesterday's habits, spending, and journal entry to generate 3 crisp,
 * data-grounded bullet points of advice for today without unwanted hyphens or em-dashes.
 */
export async function generateNextDayAdvice(yesterdayDigest) {
    if (!yesterdayDigest) return null;

    const systemPrompt = `You are a sharp, perceptive personal coach in LifeTracker.
Analyze the user's YESTERDAY data (habits completed/missed, ₹ spending & categories/items, and journal mood/reflections/intention) and return 3 concise, scannable bullet points of advice for TODAY.

=== STRICT RULES ===
1. EXACTLY 3 BULLETS (one per pillar, 10 to 18 words each):
   - Bullet 1 (Habits): Cite exact X/Y habits completed yesterday + name a specific missed or completed habit. Give today's habit focus.
   - Bullet 2 (Spending): Cite exact ₹ spent yesterday (and category, or ₹0) vs 7-day average. Give today's spending target.
   - Bullet 3 (Journal): Cite yesterday's mood or quote their "intentionForToday"/"highlights"/"thoughts" (or note no entry was logged). Give today's mindset/journal nudge.
2. NO HYPHENS OR EM-DASHES: Do NOT use em-dashes (—) or hyphens (-) to connect or separate clauses. Use standard punctuation like periods or commas.
3. NO GENERIC FLUFF: Never write vague advice without yesterday's actual numbers/names. Zero emojis, currency in ₹.
4. OUTPUT FORMAT: Return ONLY valid JSON:
{
  "bullets": [
    "Hit 9/17 habits yesterday (missed Wake up). Prioritize waking up on time today.",
    "Spent ₹0 vs ₹1,151 daily average. Keep today's discretionary spend under ₹300.",
    "No journal entry yesterday. Take 1 minute tonight to log your mood and wins."
  ]
}`;

    try {
        const response = await callGroq(
            [{ role: 'user', content: JSON.stringify(yesterdayDigest) }],
            systemPrompt,
            true
        );
        if (!response) return buildFallbackNextDayAdvice(yesterdayDigest);
        const parsed = JSON.parse(response);
        if (Array.isArray(parsed?.bullets) && parsed.bullets.length > 0) {
            return {
                bullets: parsed.bullets.slice(0, 3).map(sanitizeBullet),
            };
        }
        return buildFallbackNextDayAdvice(yesterdayDigest);
    } catch (e) {
        console.warn('[DailyWhisper] Falling back to local synthesis:', e.message);
        return buildFallbackNextDayAdvice(yesterdayDigest);
    }
}

/**
 * Helper to parse numeric macro/calorie values cleanly (e.g., "165 kcal" -> 165, "3.5g" -> 3.5)
 */
function parseNumericNutrition(val, fallback = 0) {
    if (typeof val === 'number' && !isNaN(val)) return Math.max(0, Math.round(val * 10) / 10);
    if (typeof val === 'string') {
        const match = val.match(/(\d+(\.\d+)?)/);
        if (match) return Math.max(0, Math.round(parseFloat(match[1]) * 10) / 10);
    }
    return fallback;
}

/**
 * Extracts a JSON object from an LLM text response (handles fenced code blocks or raw JSON)
 */
function extractJsonObject(rawText) {
    if (!rawText) return null;
    try {
        return JSON.parse(rawText);
    } catch {
        const match = String(rawText).match(/\{[\s\S]*\}/);
        if (match) {
            try {
                return JSON.parse(match[0]);
            } catch {
                return null;
            }
        }
        return null;
    }
}

/**
 * 5. Automated Web Search Food Nutrition Lookup (Per 100g)
 * Uses Groq's built-in `browser_search` tool to search the web once for a food item
 * (optimized for Indian dishes, regional meals, and branded foods) and extract
 * standardized per-100g calories & macros so the caller can save it to `food_catalog`.
 */
export async function lookupFoodNutritionPer100g(foodQuery) {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('VITE_GROQ_API_KEY is missing');
    }

    const cleanQuery = String(foodQuery || '').trim();
    if (!cleanQuery) throw new Error('Food name is required');

    const prompt = `Search the web for the nutritional values per 100g of "${cleanQuery}" (if it is an Indian dish or meal, use standard Indian home/restaurant or ICMR-NIN / HealthifyMe nutrition per 100g cooked edible portion).
Also provide the standard single-unit name and weight in grams if this food is commonly eaten by count/piece/portion (e.g. "roti": 35g, "egg": 50g, "idli": 40g, "dosa": 85g, "paratha": 80g, "samosa": 65g, "slice": 30g, "katori": 150g, "cup": 150g).

Return ONLY a valid JSON object with no markdown fences and no extra text in this exact format:
{
  "name": "Clean Singular Title-Cased Food Name (e.g. Roti, Boiled Egg, Masala Dosa)",
  "category": "Short Category (e.g. South Indian, North Indian, Indian Bread, Rice & Grains, Dal & Legumes, Paneer & Veg, Meat, Fish & Eggs, Dairy & Beverages, Snack)",
  "calories_per_100g": 165,
  "protein_per_100g": 3.5,
  "carbs_per_100g": 25.0,
  "fat_per_100g": 6.0,
  "fiber_per_100g": 2.5,
  "unit_name": "piece or roti or egg or idli or katori or serving",
  "grams_per_unit": 50
}`;

    let parsed = null;
    let usedWebSearch = false;

    // Step A: Try live web search via Groq's native `browser_search` tool
    try {
        const searchData = await fetchGroqWithRetry({
            model: FALLBACK_MODEL,
            tools: [{ type: 'browser_search' }],
            messages: [
                {
                    role: 'system',
                    content: 'You are an Indian & global nutrition lookup engine. Always use browser_search to verify per-100g calories, protein, carbs, and fat, and output strictly valid JSON.'
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            max_tokens: 1024,
        }, apiKey, 1);

        const msg = searchData?.choices?.[0]?.message;
        const executedTools = msg?.executed_tools || [];
        usedWebSearch = executedTools.some(t => t?.type?.includes('browser'));
        parsed = extractJsonObject(msg?.content);
    } catch (webErr) {
        console.warn('[Calories Web Lookup] browser_search fallback to direct LLM nutrition synthesis:', webErr.message);
    }

    // Step B: Fallback to structured JSON mode if browser_search returned non-JSON or hit a tool limit
    if (!parsed || typeof parsed.calories_per_100g === 'undefined') {
        const fallbackJsonStr = await callGroq(
            [{ role: 'user', content: prompt }],
            'You are an accurate nutrition database expert specializing in Indian (ICMR-NIN) and global foods. Return strictly valid JSON with per-100g nutritional values.',
            true
        );
        parsed = extractJsonObject(fallbackJsonStr);
    }

    if (!parsed) {
        throw new Error(`Could not retrieve nutritional values for "${cleanQuery}"`);
    }

    const calories = parseNumericNutrition(parsed.calories_per_100g, 0);
    const protein = parseNumericNutrition(parsed.protein_per_100g, 0);
    const carbs = parseNumericNutrition(parsed.carbs_per_100g, 0);
    const fat = parseNumericNutrition(parsed.fat_per_100g, 0);
    const fiber = parseNumericNutrition(parsed.fiber_per_100g, 0);
    const gramsPerUnit = parseNumericNutrition(parsed.grams_per_unit, 0);
    const unitName = parsed.unit_name ? String(parsed.unit_name).trim().toLowerCase() : null;

    // Sanity check: if calories is 0 but macros exist, compute from 4-4-9 rule
    const finalCalories = calories > 0
        ? Math.round(calories)
        : Math.round(protein * 4 + carbs * 4 + fat * 9);

    return {
        name: String(parsed.name || cleanQuery).trim(),
        category: String(parsed.category || 'Indian Dish').trim(),
        calories_per_100g: finalCalories,
        protein_per_100g: protein,
        carbs_per_100g: carbs,
        fat_per_100g: fat,
        fiber_per_100g: fiber,
        unit_name: unitName,
        grams_per_unit: gramsPerUnit > 0 ? Math.round(gramsPerUnit) : null,
        source: usedWebSearch ? 'web_search' : 'ai_lookup',
    };
}

/**
 * 6. Automated Exercise Burn Lookup
 * Estimates calories burned for an exercise given duration (mins) and user body weight (kg).
 */
export async function estimateExerciseBurn(exerciseName, durationMins, weightKg = 70) {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('VITE_GROQ_API_KEY is missing');
    }

    const mins = Math.max(1, Number(durationMins) || 30);
    const kg = Math.max(30, Number(weightKg) || 70);

    const prompt = `Estimate calories burned for "${exerciseName}" performed for ${mins} minutes by a person weighing ${kg} kg using standard MET (Metabolic Equivalent of Task) values.
Return ONLY valid JSON:
{
  "name": "Clean Exercise Name",
  "met": 6.0,
  "calories_burned": 210
}`;

    const jsonStr = await callGroq(
        [{ role: 'user', content: prompt }],
        'You are an exercise physiology calculator. Use standard Compendium of Physical Activities MET values: Calories = MET * weight_kg * (duration_mins / 60). Return strictly JSON.',
        true
    );

    const parsed = extractJsonObject(jsonStr);
    const met = parseNumericNutrition(parsed?.met, 5.0);
    const computedCals = Math.round(met * kg * (mins / 60));
    const burned = parseNumericNutrition(parsed?.calories_burned, computedCals);

    return {
        name: String(parsed?.name || exerciseName).trim(),
        met,
        calories_burned: Math.round(burned || computedCals),
    };
}
