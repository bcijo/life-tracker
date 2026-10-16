// Renders privacy-safe Daily Report PNG cards (1080x1350) across 4 selectable templates:
//   - 'minimal'  : Sleek, airy overview (Day Score ring + 3 minimal bars + AI Focus)
//   - 'habits'   : Habits & Streaks spotlight (Big Habit ring + AM/PM/Streak tiles + 7-day chart + AI tip)
//   - 'spending' : Spending Discipline spotlight (Big Pace ring + 7-day relative pace chart + AI tip, zero ₹ amounts)
//   - 'detailed' : Full Bento breakdown (Habits grid + Task difficulties + Spending gauge + AI Coach)

import { format, subDays } from 'date-fns';
import { parseLocalDate, getLocalDateStr, calculateHabitStreak } from '../hooks/useHabits';

const W = 1080;
const H = 1350;
const PAD = 80;
const FONT = `'Inter', 'Outfit', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;

const rr = (ctx, x, y, w, h, r) => {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
};

const glow = (ctx, x, y, r, color) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
};

const wrapText = (ctx, text, maxWidth, maxLines = 2) => {
    const words = (text || '').split(/\s+/);
    const lines = [];
    let current = '';

    for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (ctx.measureText(test).width <= maxWidth) {
            current = test;
        } else {
            if (current) lines.push(current);
            current = word;
            if (lines.length >= maxLines - 1) break;
        }
    }
    if (current && lines.length < maxLines) {
        while (ctx.measureText(current).width > maxWidth && current.length > 3) {
            current = current.slice(0, -1);
        }
        lines.push(current);
    }
    return lines;
};

/**
 * Compute privacy-masked daily metrics & 7-day trends for a specific YYYY-MM-DD date string.
 */
export function computeDailyReportData({
    dateStr,
    habits = [],
    todos = [],
    transactions = [],
    budgets = [],
    getStatusForDate,
    trackingStartDate = null,
}) {
    const targetDate = parseLocalDate(dateStr);
    const dayOfWeek = targetDate.getDay();
    const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

    // 1. HABITS
    const activeHabits = habits.filter(h => {
        if (h.is_paused) return false;
        const days = h.active_days || ALL_DAYS;
        return days.includes(dayOfWeek);
    });

    const habitStatuses = activeHabits.map((h, idx) => {
        const status = getStatusForDate ? getStatusForDate(h, dateStr) : null;
        const streak = calculateHabitStreak(h, trackingStartDate) || 0;
        const timeOfDay = h.time_of_day || 'morning';
        return {
            index: idx + 1,
            done: status === 'completed',
            failed: status === 'failed',
            streak,
            timeOfDay,
        };
    });

    const habitsDone = habitStatuses.filter(h => h.done).length;
    const habitsTotal = habitStatuses.length;
    const habitsPct = habitsTotal > 0 ? Math.round((habitsDone / habitsTotal) * 100) : 100;
    const bestStreak = habitStatuses.reduce((max, h) => Math.max(max, h.streak), 0);

    const morningHabits = habitStatuses.filter(h => h.timeOfDay !== 'evening');
    const eveningHabits = habitStatuses.filter(h => h.timeOfDay === 'evening');
    const morningDone = morningHabits.filter(h => h.done).length;
    const eveningDone = eveningHabits.filter(h => h.done).length;

    // 2. TASKS
    let completionRecords = {};
    try {
        completionRecords = JSON.parse(localStorage.getItem('todo_completion_records') || '{}');
    } catch {
        completionRecords = {};
    }

    const XP_MAP = { easy: 10, medium: 25, hard: 50 };

    const tasksCompletedOnDate = todos.filter(t => {
        if (!t.completed) return false;
        const rec = completionRecords[t.id];
        if (rec?.completedAt && rec.completedAt.slice(0, 10) === dateStr) return true;
        if (t.updated_at && String(t.updated_at).slice(0, 10) === dateStr) return true;
        if (t.deadline && String(t.deadline).slice(0, 10) === dateStr) return true;
        if (!t.deadline && t.created_at && String(t.created_at).slice(0, 10) === dateStr) return true;
        return false;
    });

    const tasksPendingForDate = todos.filter(t => {
        if (t.completed) return false;
        if (t.deadline && String(t.deadline).slice(0, 10) === dateStr) return true;
        return false;
    });

    const difficultyCounts = { easy: 0, medium: 0, hard: 0 };
    let xpEarned = 0;
    tasksCompletedOnDate.forEach(t => {
        const diff = t.difficulty || 'medium';
        if (difficultyCounts[diff] !== undefined) difficultyCounts[diff]++;
        else difficultyCounts.medium++;
        xpEarned += XP_MAP[diff] || 25;
    });

    const tasksDoneCount = tasksCompletedOnDate.length;
    const tasksTargetTotal = tasksDoneCount + tasksPendingForDate.length;
    const tasksScore = tasksTargetTotal > 0
        ? Math.round((tasksDoneCount / tasksTargetTotal) * 100)
        : (tasksDoneCount > 0 ? 100 : 75);

    // 3. SPENDING DISCIPLINE (Masked)
    const dayExpenses = transactions.filter(t => {
        if (t.type !== 'expense') return false;
        const tDate = String(t.date || '').slice(0, 10);
        return tDate === dateStr;
    });

    const daySpendTotal = dayExpenses.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const dayTxnCount = dayExpenses.length;

    const overallBudgetObj = budgets.find(b => b.category === 'overall');
    const overallMonthlyBudget = overallBudgetObj ? parseFloat(overallBudgetObj.amount) || 0 : 0;

    const thirtyDaysAgoStr = getLocalDateStr(subDays(targetDate, 30));
    const last30Expenses = transactions.filter(t => {
        if (t.type !== 'expense') return false;
        const d = String(t.date || '').slice(0, 10);
        return d >= thirtyDaysAgoStr && d <= dateStr;
    });
    const last30Total = last30Expenses.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    const avgDailySpend = last30Total > 0 ? last30Total / 30 : 500;

    const dailyAllowance = overallMonthlyBudget > 0
        ? overallMonthlyBudget / 30
        : Math.max(avgDailySpend, 100);

    const spendPacePct = daySpendTotal === 0
        ? 0
        : Math.round((daySpendTotal / dailyAllowance) * 100);

    let spendStatusLabel = 'No-Spend Day';
    let spendStatusTier = 'optimal';
    let spendDisciplineScore = 100;

    if (daySpendTotal === 0) {
        spendStatusLabel = 'No-Spend Day';
        spendStatusTier = 'optimal';
        spendDisciplineScore = 100;
    } else if (spendPacePct <= 75) {
        spendStatusLabel = 'Well Under Pace';
        spendStatusTier = 'optimal';
        spendDisciplineScore = 95;
    } else if (spendPacePct <= 105) {
        spendStatusLabel = 'On Daily Target';
        spendStatusTier = 'good';
        spendDisciplineScore = 82;
    } else if (spendPacePct <= 140) {
        spendStatusLabel = 'Slightly Above Pace';
        spendStatusTier = 'moderate';
        spendDisciplineScore = 62;
    } else {
        spendStatusLabel = 'Above Daily Pace';
        spendStatusTier = 'high';
        spendDisciplineScore = Math.max(30, 100 - Math.min(70, Math.round((spendPacePct - 100) * 0.5)));
    }

    // 4. OVERALL DAY SCORE
    const overallScore = Math.round(
        habitsPct * 0.45 +
        tasksScore * 0.30 +
        spendDisciplineScore * 0.25
    );

    let grade = 'A';
    let gradeTitle = 'Strong Momentum 🔥';
    if (overallScore >= 92) { grade = 'S'; gradeTitle = 'Peak Day ⚡'; }
    else if (overallScore >= 82) { grade = 'A'; gradeTitle = 'Strong Momentum 🔥'; }
    else if (overallScore >= 70) { grade = 'B'; gradeTitle = 'Solid Progress ✨'; }
    else if (overallScore >= 55) { grade = 'C'; gradeTitle = 'Steady Effort 🌱'; }
    else { grade = 'D'; gradeTitle = 'Reset & Recharge 🌙'; }

    // 5. 7-DAY TRENDS (For Habits & Spending templates)
    const trend7d = Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(targetDate, 6 - i);
        const dStr = getLocalDateStr(d);
        const dow = d.getDay();

        // Habits on day d
        const act = habits.filter(h => !h.is_paused && (h.active_days || ALL_DAYS).includes(dow));
        const done = act.filter(h => getStatusForDate && getStatusForDate(h, dStr) === 'completed').length;
        const hPct = act.length > 0 ? Math.round((done / act.length) * 100) : 0;

        // Spending pace on day d (masked as % of dailyAllowance)
        const dSpend = transactions
            .filter(t => t.type === 'expense' && String(t.date || '').slice(0, 10) === dStr)
            .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        const sPace = dSpend === 0 ? 0 : Math.round((dSpend / dailyAllowance) * 100);

        return {
            label: format(d, 'EEE'),
            dateStr: dStr,
            habitDone: done,
            habitTotal: act.length,
            habitPct: hPct,
            spendPacePct: sPace,
            isSelected: dStr === dateStr,
        };
    });

    const noSpendDays7d = trend7d.filter(d => d.spendPacePct === 0).length;
    const avgSpendPace7d = Math.round(trend7d.reduce((s, d) => s + d.spendPacePct, 0) / 7);
    const perfectHabitDays7d = trend7d.filter(d => d.habitTotal > 0 && d.habitDone === d.habitTotal).length;
    const weekHabitDone = trend7d.reduce((s, d) => s + d.habitDone, 0);
    const weekHabitTotal = trend7d.reduce((s, d) => s + d.habitTotal, 0);
    const weekHabitPct = weekHabitTotal > 0 ? Math.round((weekHabitDone / weekHabitTotal) * 100) : 0;

    const defaultSuggestions = buildDefaultSuggestions({
        habitsPct,
        habitsDone,
        habitsTotal,
        morningHabits,
        morningDone,
        eveningHabits,
        eveningDone,
        tasksDoneCount,
        tasksPendingCount: tasksPendingForDate.length,
        spendPacePct,
    });

    return {
        dateStr,
        dateLabel: format(targetDate, 'EEE, MMM d'),
        shortDateLabel: format(targetDate, 'EEE, MMM d'),
        overallScore,
        grade,
        gradeTitle,
        habits: {
            done: habitsDone,
            total: habitsTotal,
            pct: habitsPct,
            bestStreak,
            morningDone,
            morningTotal: morningHabits.length,
            eveningDone,
            eveningTotal: eveningHabits.length,
            perfectDays7d: perfectHabitDays7d,
            weekRatePct: weekHabitPct,
            items: habitStatuses,
        },
        tasks: {
            done: tasksDoneCount,
            pendingDue: tasksPendingForDate.length,
            xpEarned,
            difficultyCounts,
            score: tasksScore,
        },
        spending: {
            pacePct: Math.min(150, spendPacePct),
            rawPacePct: spendPacePct,
            txnCount: dayTxnCount,
            statusLabel: spendStatusLabel,
            statusTier: spendStatusTier,
            disciplineScore: spendDisciplineScore,
            noSpendDays7d,
            avgPace7d: avgSpendPace7d,
        },
        trend7d,
        defaultSuggestions,
    };
}

function buildDefaultSuggestions({
    habitsPct,
    habitsDone,
    habitsTotal,
    morningHabits,
    morningDone,
    eveningHabits,
    eveningDone,
    tasksDoneCount,
    tasksPendingCount,
    spendPacePct,
}) {
    const tips = [];

    if (habitsTotal > 0) {
        if (habitsPct === 100) {
            tips.push('Every routine completed — keep the exact same morning cue tomorrow.');
        } else if (eveningHabits.length > 0 && eveningDone < eveningHabits.length && morningDone === morningHabits.length) {
            tips.push('Mornings were spotless; start evening routines 30 mins earlier tomorrow.');
        } else if (morningHabits.length > 0 && morningDone < morningHabits.length) {
            tips.push('Stack your first habit right after waking up to build early momentum.');
        } else {
            tips.push(`${habitsTotal - habitsDone} routine(s) missed — use the 2-minute rule on busy days.`);
        }
    } else {
        tips.push('Rest day on routines — recharge and prep tomorrow’s top 3 priorities.');
    }

    if (spendPacePct > 110) {
        tips.push(`Spending ran ${spendPacePct - 100}% over pace — aim for a low-spend reset tomorrow.`);
    } else if (tasksDoneCount === 0 && tasksPendingCount > 0) {
        tips.push('Break your top carry-over task into a quick 15-minute first step tomorrow.');
    } else if (spendPacePct === 0) {
        tips.push('Zero-spend day locked in — great buffer for the rest of the week.');
    } else {
        tips.push(`Spending stayed well controlled at ${spendPacePct}% of your daily pace.`);
    }

    return tips.slice(0, 2);
}

// ── Shared Visual Helpers ────────────────────────────────────────────────────

const drawBackground = (ctx) => {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0f0a1f');
    bg.addColorStop(0.55, '#140d24');
    bg.addColorStop(1, '#1d0b1e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    glow(ctx, 140, 140, 520, 'rgba(168,85,247,0.32)');
    glow(ctx, W - 80, H - 160, 540, 'rgba(236,72,153,0.26)');
};

const drawTopHeader = (ctx, { dateLabel, title, subtitle }) => {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `600 28px ${FONT}`;
    ctx.fillText(dateLabel.toUpperCase(), PAD, 142);

    const titleGrad = ctx.createLinearGradient(PAD, 0, PAD + 560, 0);
    titleGrad.addColorStop(0, '#ffffff');
    titleGrad.addColorStop(1, '#e9d5ff');
    ctx.fillStyle = titleGrad;
    ctx.font = `800 70px ${FONT}`;
    ctx.fillText(title, PAD, 224);

    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.font = `500 32px ${FONT}`;
    ctx.fillText(subtitle, PAD, 276);
};

const drawScoreRing = (ctx, cx, cy, R, LW, score, label = 'SCORE') => {
    ctx.lineCap = 'round';
    ctx.lineWidth = LW;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    if (score > 0) {
        const ringGrad = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
        ringGrad.addColorStop(0, '#a855f7');
        ringGrad.addColorStop(1, '#ec4899');
        ctx.strokeStyle = ringGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * Math.min(100, score)) / 100);
        ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 56px ${FONT}`;
    ctx.fillText(`${score}`, cx, cy + 14);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = `700 18px ${FONT}`;
    ctx.fillText(label, cx, cy + 46);
    ctx.textAlign = 'left';
};

const drawAiFooterBox = (ctx, y, h, tips, heading = '✨ TOMORROW’S FOCUS') => {
    const rowW = W - PAD * 2;
    rr(ctx, PAD, y, rowW, h, 28);
    ctx.fillStyle = 'rgba(168,85,247,0.07)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(168,85,247,0.22)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#c084fc';
    ctx.font = `700 20px ${FONT}`;
    ctx.fillText(heading, PAD + 36, y + 44);

    tips.slice(0, 2).forEach((tip, idx) => {
        const lineY = y + 88 + idx * 50;
        ctx.beginPath();
        ctx.arc(PAD + 44, lineY - 8, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#ec4899';
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.88)';
        ctx.font = `500 24px ${FONT}`;
        const lines = wrapText(ctx, tip, rowW - 105, 1);
        ctx.fillText(lines[0] || tip, PAD + 64, lineY);
    });
};

const drawBrandFooter = (ctx, leftLabel, leftValue) => {
    const footerTop = H - 170;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAD, footerTop + 20);
    ctx.lineTo(W - PAD, footerTop + 20);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = `600 22px ${FONT}`;
    ctx.fillText(leftLabel, PAD, footerTop + 72);
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 40px ${FONT}`;
    ctx.fillText(leftValue, PAD, footerTop + 122);

    ctx.textAlign = 'right';
    const brandGrad = ctx.createLinearGradient(W - PAD - 280, 0, W - PAD, 0);
    brandGrad.addColorStop(0, '#a855f7');
    brandGrad.addColorStop(1, '#ec4899');
    ctx.fillStyle = brandGrad;
    ctx.font = `800 36px ${FONT}`;
    ctx.fillText('Life Tracker', W - PAD, footerTop + 88);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `500 23px ${FONT}`;
    ctx.fillText('Stay consistent ✨', W - PAD, footerTop + 122);
    ctx.textAlign = 'left';
};

// ── TEMPLATE 1: MINIMAL OVERVIEW ─────────────────────────────────────────────

const renderMinimalTemplate = (ctx, report, activeTips) => {
    drawTopHeader(ctx, {
        dateLabel: report.dateLabel,
        title: 'Daily Report',
        subtitle: report.gradeTitle,
    });
    drawScoreRing(ctx, W - PAD - 100, 198, 95, 20, report.overallScore, 'SCORE');

    const rowsTop = 365;
    const rowH = 152;
    const rowGap = 24;
    const rowW = W - PAD * 2;

    const metrics = [
        {
            label: 'Habits',
            value: report.habits.total > 0 ? `${report.habits.done} / ${report.habits.total}` : 'Rest Day',
            sub: `${report.habits.pct}% completed`,
            pct: report.habits.pct,
            c0: '#a855f7',
            c1: '#ec4899',
        },
        {
            label: 'Tasks',
            value: report.tasks.done > 0
                ? `${report.tasks.done} done`
                : (report.tasks.pendingDue === 0 ? 'All clear' : '0 done'),
            sub: report.tasks.xpEarned > 0 ? `+${report.tasks.xpEarned} XP earned` : 'Focus & todos',
            pct: report.tasks.score,
            c0: '#8b5cf6',
            c1: '#38bdf8',
        },
        {
            label: 'Spending Pace',
            value: report.spending.rawPacePct === 0 ? 'No Spend' : `${report.spending.rawPacePct}%`,
            sub: report.spending.statusLabel,
            pct: report.spending.rawPacePct === 0 ? 100 : Math.min(100, report.spending.rawPacePct),
            c0: report.spending.rawPacePct <= 100 ? '#34d399' : '#f59e0b',
            c1: report.spending.rawPacePct <= 100 ? '#10b981' : '#ef4444',
        },
    ];

    metrics.forEach((m, i) => {
        const y = rowsTop + i * (rowH + rowGap);
        rr(ctx, PAD, y, rowW, rowH, 28);
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = `700 34px ${FONT}`;
        ctx.fillText(m.label, PAD + 36, y + 60);

        ctx.fillStyle = 'rgba(255,255,255,0.48)';
        ctx.font = `500 23px ${FONT}`;
        ctx.fillText(m.sub, PAD + 36, y + 94);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        ctx.font = `800 46px ${FONT}`;
        ctx.fillText(m.value, W - PAD - 36, y + 72);

        const barX = PAD + 36;
        const barY = y + rowH - 30;
        const barW = rowW - 72;
        const barH = 10;

        rr(ctx, barX, barY, barW, barH, 5);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fill();

        if (m.pct > 0) {
            const fillW = Math.max(14, (barW * Math.min(100, m.pct)) / 100);
            rr(ctx, barX, barY, fillW, barH, 5);
            const g = ctx.createLinearGradient(barX, 0, barX + barW, 0);
            g.addColorStop(0, m.c0);
            g.addColorStop(1, m.c1);
            ctx.fillStyle = g;
            ctx.fill();
        }
    });
    ctx.textAlign = 'left';

    drawAiFooterBox(ctx, 900, 175, activeTips);
    drawBrandFooter(
        ctx,
        report.habits.bestStreak > 0 ? 'BEST STREAK' : 'GRADE',
        report.habits.bestStreak > 0 ? `🔥 ${report.habits.bestStreak}d` : report.grade
    );
};

// ── TEMPLATE 2: HABITS SPOTLIGHT ─────────────────────────────────────────────

const renderHabitsTemplate = (ctx, report, activeTips) => {
    drawTopHeader(ctx, {
        dateLabel: report.dateLabel,
        title: 'Habit Rhythm',
        subtitle: report.habits.pct === 100 && report.habits.total > 0
            ? 'Perfect consistency today 🎉'
            : `${report.habits.done} of ${report.habits.total} routines completed`,
    });

    // Big Center Ring
    const cx = W / 2;
    const cy = 475;
    const R = 145;
    ctx.lineCap = 'round';
    ctx.lineWidth = 28;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    if (report.habits.pct > 0) {
        const g = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
        g.addColorStop(0, '#a855f7');
        g.addColorStop(1, '#ec4899');
        ctx.strokeStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * report.habits.pct) / 100);
        ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 88px ${FONT}`;
    ctx.fillText(`${report.habits.pct}%`, cx, cy + 22);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `600 26px ${FONT}`;
    ctx.fillText(`${report.habits.done}/${report.habits.total} done`, cx, cy + 68);

    // 3 Clean Stat Tiles (AM · PM · 7-Day Rate)
    const tiles = [
        { label: '☀️ MORNING', value: `${report.habits.morningDone}/${report.habits.morningTotal}` },
        { label: '🌙 EVENING', value: `${report.habits.eveningDone}/${report.habits.eveningTotal}` },
        { label: '7-DAY RATE', value: `${report.habits.weekRatePct}%` },
    ];
    const tileY = 670, tileH = 128, tileGap = 20;
    const tileW = (W - PAD * 2 - tileGap * 2) / 3;
    tiles.forEach((t, i) => {
        const x = PAD + i * (tileW + tileGap);
        rr(ctx, x, tileY, tileW, tileH, 24);
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.48)';
        ctx.font = `700 20px ${FONT}`;
        ctx.fillText(t.label, x + tileW / 2, tileY + 46);
        ctx.fillStyle = '#ffffff';
        ctx.font = `800 42px ${FONT}`;
        ctx.fillText(t.value, x + tileW / 2, tileY + 100);
    });

    // 7-Day Bar Chart
    const chartTop = 830, barMaxH = 96, barW = 58;
    const colW = (W - PAD * 2) / 7;
    report.trend7d.forEach((d, i) => {
        const xCenter = PAD + colW * i + colW / 2;
        const bx = xCenter - barW / 2;
        rr(ctx, bx, chartTop, barW, barMaxH, 14);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fill();

        if (d.habitPct > 0) {
            const h = Math.max(16, (d.habitPct / 100) * barMaxH);
            rr(ctx, bx, chartTop + barMaxH - h, barW, h, 14);
            const g = ctx.createLinearGradient(0, chartTop + barMaxH - h, 0, chartTop + barMaxH);
            const perfect = d.habitPct === 100;
            g.addColorStop(0, perfect ? '#4ade80' : '#c084fc');
            g.addColorStop(1, perfect ? '#16a34a' : '#ec4899');
            ctx.fillStyle = g;
            ctx.fill();
        }
        ctx.textAlign = 'center';
        ctx.fillStyle = d.isSelected ? '#ffffff' : 'rgba(255,255,255,0.45)';
        ctx.font = `700 21px ${FONT}`;
        ctx.fillText(d.label, xCenter, chartTop + barMaxH + 32);
    });
    ctx.textAlign = 'left';

    drawAiFooterBox(ctx, 985, 165, activeTips, '✨ HABIT COACH');
    drawBrandFooter(ctx, 'BEST STREAK', `🔥 ${report.habits.bestStreak}d`);
};

// ── TEMPLATE 3: SPENDING DISCIPLINE SPOTLIGHT (100% Masked) ──────────────────

const renderSpendingTemplate = (ctx, report, activeTips) => {
    drawTopHeader(ctx, {
        dateLabel: report.dateLabel,
        title: 'Spending Pace',
        subtitle: `${report.spending.statusLabel} · Privacy-Masked`,
    });

    // Big Center Pace Ring
    const cx = W / 2;
    const cy = 475;
    const R = 145;
    ctx.lineCap = 'round';
    ctx.lineWidth = 28;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    const pace = report.spending.rawPacePct;
    const ringFillPct = pace === 0 ? 100 : Math.min(100, pace);
    const ringGrad = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    if (pace <= 100) {
        ringGrad.addColorStop(0, '#34d399');
        ringGrad.addColorStop(1, '#a855f7');
    } else {
        ringGrad.addColorStop(0, '#f59e0b');
        ringGrad.addColorStop(1, '#ec4899');
    }
    ctx.strokeStyle = ringGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * ringFillPct) / 100);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${pace === 0 ? 54 : 84}px ${FONT}`;
    ctx.fillText(pace === 0 ? '0%' : `${pace}%`, cx, cy + 20);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `600 24px ${FONT}`;
    ctx.fillText('OF DAILY TARGET', cx, cy + 66);

    // 3 Clean Stat Tiles (Discipline Score · No-Spend Days · 7d Avg Pace)
    const tiles = [
        { label: 'DISCIPLINE', value: `${report.spending.disciplineScore}/100` },
        { label: 'NO-SPEND DAYS', value: `${report.spending.noSpendDays7d}/7` },
        { label: '7-DAY PACE', value: `${report.spending.avgPace7d}%` },
    ];
    const tileY = 670, tileH = 128, tileGap = 20;
    const tileW = (W - PAD * 2 - tileGap * 2) / 3;
    tiles.forEach((t, i) => {
        const x = PAD + i * (tileW + tileGap);
        rr(ctx, x, tileY, tileW, tileH, 24);
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.48)';
        ctx.font = `700 20px ${FONT}`;
        ctx.fillText(t.label, x + tileW / 2, tileY + 46);
        ctx.fillStyle = '#ffffff';
        ctx.font = `800 42px ${FONT}`;
        ctx.fillText(t.value, x + tileW / 2, tileY + 100);
    });

    // 7-Day Spending Pace Bar Chart (No currency values!)
    const chartTop = 830, barMaxH = 96, barW = 58;
    const colW = (W - PAD * 2) / 7;
    report.trend7d.forEach((d, i) => {
        const xCenter = PAD + colW * i + colW / 2;
        const bx = xCenter - barW / 2;
        rr(ctx, bx, chartTop, barW, barMaxH, 14);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fill();

        if (d.spendPacePct > 0) {
            const ratio = Math.min(1.4, d.spendPacePct / 100) / 1.4;
            const h = Math.max(16, ratio * barMaxH);
            rr(ctx, bx, chartTop + barMaxH - h, barW, h, 14);
            const g = ctx.createLinearGradient(0, chartTop + barMaxH - h, 0, chartTop + barMaxH);
            const under = d.spendPacePct <= 100;
            g.addColorStop(0, under ? '#34d399' : '#f59e0b');
            g.addColorStop(1, under ? '#10b981' : '#ec4899');
            ctx.fillStyle = g;
            ctx.fill();
        } else {
            // Subtle green dot at base for No-Spend day
            rr(ctx, bx, chartTop + barMaxH - 12, barW, 12, 6);
            ctx.fillStyle = 'rgba(52,211,153,0.45)';
            ctx.fill();
        }
        ctx.textAlign = 'center';
        ctx.fillStyle = d.isSelected ? '#ffffff' : 'rgba(255,255,255,0.45)';
        ctx.font = `700 21px ${FONT}`;
        ctx.fillText(d.label, xCenter, chartTop + barMaxH + 32);
    });
    ctx.textAlign = 'left';

    drawAiFooterBox(ctx, 985, 165, activeTips, '✨ SPENDING INSIGHT');
    drawBrandFooter(ctx, 'STATUS', report.spending.rawPacePct <= 100 ? '🛡️ On Track' : '⚖️ Rebalance');
};

// ── TEMPLATE 4: DETAILED BENTO ───────────────────────────────────────────────

const renderDetailedTemplate = (ctx, report, activeTips) => {
    drawTopHeader(ctx, {
        dateLabel: report.dateLabel,
        title: 'Daily Breakdown',
        subtitle: `Grade ${report.grade} · ${report.gradeTitle}`,
    });
    drawScoreRing(ctx, W - PAD - 100, 198, 95, 20, report.overallScore, 'DAY SCORE');

    const gridTop = 340;
    const cardGap = 24;
    const halfW = (W - PAD * 2 - cardGap) / 2;
    const cardH = 265;

    // Left Card: Habits
    rr(ctx, PAD, gridTop, halfW, cardH, 26);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(168,85,247,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#c084fc';
    ctx.font = `700 20px ${FONT}`;
    ctx.fillText('⚡ HABITS', PAD + 28, gridTop + 44);

    ctx.fillStyle = '#ffffff';
    ctx.font = `800 50px ${FONT}`;
    ctx.fillText(`${report.habits.done}/${report.habits.total}`, PAD + 28, gridTop + 108);

    ctx.fillStyle = 'rgba(255,255,255,0.52)';
    ctx.font = `600 20px ${FONT}`;
    ctx.fillText(
        `☀️ AM ${report.habits.morningDone}/${report.habits.morningTotal}  ·  🌙 PM ${report.habits.eveningDone}/${report.habits.eveningTotal}`,
        PAD + 28,
        gridTop + 154
    );

    // Anonymous habit blocks
    const maxPills = Math.min(report.habits.items.length, 9);
    const pillSize = 32;
    const pillGap = 10;
    for (let i = 0; i < maxPills; i++) {
        const item = report.habits.items[i];
        const px = PAD + 28 + i * (pillSize + pillGap);
        const py = gridTop + 188;
        rr(ctx, px, py, pillSize, pillSize, 9);
        if (item.done) {
            ctx.fillStyle = '#22c55e';
            ctx.fill();
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fill();
        }
    }

    // Right Card: Tasks
    const rightX = PAD + halfW + cardGap;
    rr(ctx, rightX, gridTop, halfW, cardH, 26);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(59,130,246,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#60a5fa';
    ctx.font = `700 20px ${FONT}`;
    ctx.fillText('🎯 TASKS & XP', rightX + 28, gridTop + 44);

    ctx.fillStyle = '#ffffff';
    ctx.font = `800 50px ${FONT}`;
    ctx.fillText(`${report.tasks.done} done`, rightX + 28, gridTop + 108);

    ctx.fillStyle = 'rgba(255,255,255,0.52)';
    ctx.font = `600 20px ${FONT}`;
    ctx.fillText(`+${report.tasks.xpEarned} XP earned today`, rightX + 28, gridTop + 154);

    const diffPills = [
        { label: `Easy ${report.tasks.difficultyCounts.easy}`, color: '#34d399' },
        { label: `Med ${report.tasks.difficultyCounts.medium}`, color: '#fbbf24' },
        { label: `Hard ${report.tasks.difficultyCounts.hard}`, color: '#f87171' },
    ];
    const dPillW = (halfW - 56 - 16) / 3;
    diffPills.forEach((dp, idx) => {
        const dx = rightX + 28 + idx * (dPillW + 8);
        const dy = gridTop + 182;
        rr(ctx, dx, dy, dPillW, 46, 12);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fill();
        ctx.textAlign = 'center';
        ctx.fillStyle = dp.color;
        ctx.font = `700 19px ${FONT}`;
        ctx.fillText(dp.label, dx + dPillW / 2, dy + 30);
    });
    ctx.textAlign = 'left';

    // Middle Full-Width Card: Spending Pace Gauge
    const spendY = gridTop + cardH + 22;
    const spendH = 160;
    rr(ctx, PAD, spendY, W - PAD * 2, spendH, 26);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(236,72,153,0.25)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#f472b6';
    ctx.font = `700 20px ${FONT}`;
    ctx.fillText('🛡️ SPENDING PACE', PAD + 32, spendY + 44);

    ctx.fillStyle = '#ffffff';
    ctx.font = `800 34px ${FONT}`;
    ctx.fillText(report.spending.statusLabel, PAD + 32, spendY + 90);

    ctx.textAlign = 'right';
    ctx.fillStyle = report.spending.rawPacePct <= 100 ? '#4ade80' : '#fbbf24';
    ctx.font = `800 34px ${FONT}`;
    ctx.fillText(`${report.spending.rawPacePct}% of Daily Pace`, W - PAD - 32, spendY + 90);
    ctx.textAlign = 'left';

    const gBarX = PAD + 32;
    const gBarY = spendY + 114;
    const gBarW = W - PAD * 2 - 64;
    rr(ctx, gBarX, gBarY, gBarW, 16, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fill();

    const fillRatio = Math.min(1, (report.spending.rawPacePct === 0 ? 100 : report.spending.rawPacePct) / 100);
    rr(ctx, gBarX, gBarY, Math.max(16, gBarW * fillRatio), 16, 8);
    const sGrad = ctx.createLinearGradient(gBarX, 0, gBarX + gBarW, 0);
    sGrad.addColorStop(0, report.spending.rawPacePct <= 100 ? '#34d399' : '#f59e0b');
    sGrad.addColorStop(1, report.spending.rawPacePct <= 100 ? '#10b981' : '#ef4444');
    ctx.fillStyle = sGrad;
    ctx.fill();

    // AI Coach Box
    drawAiFooterBox(ctx, spendY + spendH + 22, 175, activeTips, '🤖 AI COACH TAKEAWAYS');
    drawBrandFooter(ctx, 'BEST STREAK', `🔥 ${report.habits.bestStreak}d`);
};

/**
 * Renders the selected template ('minimal' | 'habits' | 'spending' | 'detailed') onto a 1080x1350 PNG Blob.
 */
export async function renderDailyReportCard({ report, suggestions = [], template = 'minimal' }) {
    try { await document.fonts?.ready; } catch { /* ignore */ }

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const activeTips = (suggestions && suggestions.length > 0)
        ? suggestions.slice(0, 2).map(s => s.replace(/^[^\w\d]+/, '').trim())
        : report.defaultSuggestions.slice(0, 2);

    drawBackground(ctx);

    if (template === 'habits') {
        renderHabitsTemplate(ctx, report, activeTips);
    } else if (template === 'spending') {
        renderSpendingTemplate(ctx, report, activeTips);
    } else if (template === 'detailed') {
        renderDetailedTemplate(ctx, report, activeTips);
    } else {
        renderMinimalTemplate(ctx, report, activeTips);
    }

    return new Promise((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Failed to render daily report image'))), 'image/png')
    );
}
