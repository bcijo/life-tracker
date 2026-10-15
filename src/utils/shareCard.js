// Renders shareable PNG cards of habit progress using the Canvas API,
// and shares them via the Web Share API (WhatsApp, Instagram, etc.) with fallbacks.
//
// Two card styles:
//   - 'checklist': list of the day's habits, with privacy modes for names
//       'show'   -> full habit names
//       'redact' -> first letter of each word + redaction bars ("M▇▇▇▇ w▇▇")
//       'hide'   -> generic labels ("☀️ Habit 1")
//   - 'summary':   no habit names at all — progress ring, stats and a 7-day chart

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

const truncate = (ctx, text, maxWidth) => {
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
    return t + '…';
};

const brandGradient = (ctx, x0, x1) => {
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, '#a855f7');
    g.addColorStop(1, '#ec4899');
    return g;
};

// ── Shared pieces ────────────────────────────────────────────────────────────

const drawBackground = (ctx) => {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0f0a1f');
    bg.addColorStop(0.55, '#140d24');
    bg.addColorStop(1, '#1d0b1e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    glow(ctx, 120, 140, 520, 'rgba(168,85,247,0.35)');
    glow(ctx, W - 80, H - 160, 560, 'rgba(236,72,153,0.28)');
    glow(ctx, W - 200, 380, 300, 'rgba(34,197,94,0.10)');
};

const drawHeader = (ctx, { dateLabel, isToday, title, subtitle }) => {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `600 30px ${FONT}`;
    ctx.fillText((isToday ? 'TODAY · ' : '') + dateLabel.toUpperCase(), PAD, 150);

    const titleGrad = ctx.createLinearGradient(PAD, 0, PAD + 560, 0);
    titleGrad.addColorStop(0, '#ffffff');
    titleGrad.addColorStop(1, '#e9d5ff');
    ctx.fillStyle = titleGrad;
    ctx.font = `800 76px ${FONT}`;
    ctx.fillText(title, PAD, 240);

    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = `500 34px ${FONT}`;
    ctx.fillText(subtitle, PAD, 298);
};

const drawRing = (ctx, cx, cy, R, LW, pct, doneCount, totalCount, big = false) => {
    ctx.lineCap = 'round';
    ctx.lineWidth = LW;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    if (pct > 0) {
        const ringGrad = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
        ringGrad.addColorStop(0, '#a855f7');
        ringGrad.addColorStop(1, '#ec4899');
        ctx.strokeStyle = ringGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * pct) / 100);
        ctx.stroke();
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = `800 ${big ? 120 : 58}px ${FONT}`;
    ctx.fillText(`${pct}%`, cx, cy + (big ? 30 : 12));
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `600 ${big ? 34 : 22}px ${FONT}`;
    ctx.fillText(big ? `${doneCount} of ${totalCount} done` : `${doneCount}/${totalCount}`, cx, cy + (big ? 90 : 48));
    ctx.textAlign = 'left';
};

const drawFooter = (ctx, bestStreak, showStreak) => {
    const footerTop = H - 200;
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(PAD, footerTop + 30); ctx.lineTo(W - PAD, footerTop + 30); ctx.stroke();

    if (showStreak && bestStreak > 0) {
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = `600 24px ${FONT}`;
        ctx.fillText('BEST STREAK', PAD, footerTop + 90);
        ctx.fillStyle = '#fff';
        ctx.font = `800 44px ${FONT}`;
        ctx.fillText(`🔥 ${bestStreak} day${bestStreak === 1 ? '' : 's'}`, PAD, footerTop + 145);
    }

    ctx.textAlign = 'right';
    ctx.fillStyle = brandGradient(ctx, W - PAD - 300, W - PAD);
    ctx.font = `800 38px ${FONT}`;
    ctx.fillText('Life Tracker', W - PAD, footerTop + 110);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `500 24px ${FONT}`;
    ctx.fillText('Stay consistent ✨', W - PAD, footerTop + 145);
    ctx.textAlign = 'left';
};

// Draws "M▇▇▇▇ w▇▇" — first letter of each word, the rest as rounded redaction bars.
const drawRedactedName = (ctx, text, x, baseline, maxWidth, textColor, barColor) => {
    const words = text.trim().split(/\s+/).filter(Boolean);
    const space = ctx.measureText(' ').width;
    let cx = x;
    for (const word of words) {
        const first = word[0];
        const firstW = ctx.measureText(first).width;
        const restW = word.length > 1 ? Math.max(ctx.measureText(word.slice(1)).width, 18) : 0;
        if (cx + firstW + restW > x + maxWidth) {
            // Out of room — draw a trailing short bar to imply more
            if (cx + 30 <= x + maxWidth) {
                rr(ctx, cx, baseline - 24, 30, 26, 9);
                ctx.fillStyle = barColor; ctx.fill();
            }
            break;
        }
        ctx.fillStyle = textColor;
        ctx.fillText(first, cx, baseline);
        cx += firstW + 3;
        if (restW > 0) {
            rr(ctx, cx, baseline - 24, restW, 26, 9);
            ctx.fillStyle = barColor;
            ctx.fill();
            cx += restW;
        }
        cx += space;
    }
};

// ── Checklist card ───────────────────────────────────────────────────────────

const drawChecklist = (ctx, { habits, completedOnly, privacy }) => {
    const list = completedOnly ? habits.filter(h => h.status === 'completed') : habits;
    const listTop = 380;
    const footerTop = H - 200;
    const ROW_H = 92, GAP = 14;
    const maxRows = Math.floor((footerTop - listTop - 20) / (ROW_H + GAP));
    const overflow = list.length > maxRows ? list.length - (maxRows - 1) : 0;
    const visible = overflow ? list.slice(0, maxRows - 1) : list;

    if (list.length === 0) {
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = `600 36px ${FONT}`;
        ctx.fillText(completedOnly ? 'Nothing completed yet — on it! 💪' : 'No habits scheduled', W / 2, listTop + 160);
        ctx.textAlign = 'left';
    }

    visible.forEach((h, i) => {
        const y = listTop + i * (ROW_H + GAP);
        const done = h.status === 'completed';
        const failed = h.status === 'failed';

        rr(ctx, PAD, y, W - PAD * 2, ROW_H, 24);
        ctx.fillStyle = done ? 'rgba(34,197,94,0.10)' : 'rgba(255,255,255,0.04)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = done ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.08)';
        ctx.stroke();

        // Status badge
        const bx = PAD + 50, by = y + ROW_H / 2;
        ctx.beginPath(); ctx.arc(bx, by, 22, 0, Math.PI * 2);
        if (done) {
            ctx.fillStyle = '#22c55e'; ctx.fill();
            ctx.strokeStyle = '#06210f'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.beginPath(); ctx.moveTo(bx - 10, by + 1); ctx.lineTo(bx - 3, by + 8); ctx.lineTo(bx + 11, by - 7); ctx.stroke();
        } else if (failed) {
            ctx.fillStyle = 'rgba(239,68,68,0.18)'; ctx.fill();
            ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 4; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(bx - 8, by - 8); ctx.lineTo(bx + 8, by + 8); ctx.moveTo(bx + 8, by - 8); ctx.lineTo(bx - 8, by + 8); ctx.stroke();
        } else {
            ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 3; ctx.stroke();
        }

        // Streak pill
        let rightEdge = W - PAD - 28;
        if (h.streak > 0) {
            ctx.font = `700 28px ${FONT}`;
            const label = `🔥 ${h.streak}`;
            const pw = ctx.measureText(label).width + 36;
            const px = rightEdge - pw;
            rr(ctx, px, by - 24, pw, 48, 24);
            ctx.fillStyle = 'rgba(249,115,22,0.15)'; ctx.fill();
            ctx.fillStyle = '#fdba74';
            ctx.fillText(label, px + 18, by + 10);
            rightEdge = px - 20;
        }

        // Name (respecting privacy mode)
        ctx.font = `${done ? 700 : 600} 36px ${FONT}`;
        const textColor = done ? '#ffffff' : failed ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.7)';
        const nx = bx + 48;
        const maxW = rightEdge - nx;
        if (privacy === 'redact') {
            const barColor = done ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.14)';
            drawRedactedName(ctx, h.name, nx, by + 12, maxW, textColor, barColor);
        } else if (privacy === 'hide') {
            const icon = h.timeOfDay === 'evening' ? '🌙' : '☀️';
            ctx.fillStyle = textColor;
            ctx.fillText(`${icon}  Habit ${habits.indexOf(h) + 1}`, nx, by + 12);
        } else {
            ctx.fillStyle = textColor;
            ctx.fillText(truncate(ctx, h.name, maxW), nx, by + 12);
        }
    });

    if (overflow) {
        const y = listTop + visible.length * (ROW_H + GAP);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = `600 32px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(`+ ${overflow} more`, W / 2, y + ROW_H / 2 + 10);
        ctx.textAlign = 'left';
    }
};

// ── Summary card (no habit names) ────────────────────────────────────────────

const drawSummary = (ctx, { pct, doneCount, totalCount, bestStreak, week }) => {
    // Big ring
    drawRing(ctx, W / 2, 530, 190, 34, pct, doneCount, totalCount, true);

    // Stat tiles
    const perfectDays = week.filter(d => d.total > 0 && d.done === d.total).length;
    const weekDone = week.reduce((s, d) => s + d.done, 0);
    const weekTotal = week.reduce((s, d) => s + d.total, 0);
    const weekPct = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;
    const tiles = [
        { label: 'BEST STREAK', value: `🔥 ${bestStreak}` },
        { label: 'PERFECT DAYS', value: `${perfectDays}/7` },
        { label: '7-DAY RATE', value: `${weekPct}%` },
    ];
    const tileY = 775, tileH = 150, tileGap = 20;
    const tileW = (W - PAD * 2 - tileGap * 2) / 3;
    tiles.forEach((t, i) => {
        const x = PAD + i * (tileW + tileGap);
        rr(ctx, x, tileY, tileW, tileH, 24);
        ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = `700 22px ${FONT}`;
        ctx.fillText(t.label, x + tileW / 2, tileY + 52);
        ctx.fillStyle = '#fff';
        ctx.font = `800 50px ${FONT}`;
        ctx.fillText(t.value, x + tileW / 2, tileY + 115);
    });

    // 7-day bar chart
    const chartTop = 975, barMaxH = 115, barW = 64;
    const colW = (W - PAD * 2) / 7;
    week.forEach((d, i) => {
        const cx = PAD + colW * i + colW / 2;
        const bx = cx - barW / 2;
        rr(ctx, bx, chartTop, barW, barMaxH, 16);
        ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill();
        if (d.total > 0 && d.done > 0) {
            const h = Math.max(20, (d.done / d.total) * barMaxH);
            rr(ctx, bx, chartTop + barMaxH - h, barW, h, 16);
            const g = ctx.createLinearGradient(0, chartTop + barMaxH - h, 0, chartTop + barMaxH);
            const perfect = d.done === d.total;
            g.addColorStop(0, perfect ? '#4ade80' : '#c084fc');
            g.addColorStop(1, perfect ? '#16a34a' : '#ec4899');
            ctx.fillStyle = g; ctx.fill();
        }
        if (d.isSelected) {
            rr(ctx, bx - 4, chartTop - 4, barW + 8, barMaxH + 8, 19);
            ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.stroke();
        }
        ctx.textAlign = 'center';
        ctx.fillStyle = d.isSelected ? '#fff' : 'rgba(255,255,255,0.45)';
        ctx.font = `700 24px ${FONT}`;
        ctx.fillText(d.label, cx, chartTop + barMaxH + 38);
    });
    ctx.textAlign = 'left';
};

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * @param {Object} opts
 * @param {'checklist'|'summary'} opts.style
 * @param {'show'|'redact'|'hide'} opts.privacy       (checklist only)
 * @param {boolean} opts.completedOnly                (checklist only)
 * @param {string} opts.dateLabel                     e.g. "Thu, Oct 15"
 * @param {boolean} opts.isToday
 * @param {Array<{name,status,streak,timeOfDay}>} opts.habits
 * @param {number} opts.bestStreak
 * @param {Array<{label,done,total,isSelected}>} opts.week  last 7 days ending on the selected day
 * @returns {Promise<Blob>}
 */
export async function renderHabitShareCard({
    style = 'checklist', privacy = 'redact', completedOnly = false,
    dateLabel, isToday, habits, bestStreak, week = [],
}) {
    try { await document.fonts?.ready; } catch { /* ignore */ }

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    const doneCount = habits.filter(h => h.status === 'completed').length;
    const totalCount = habits.length;
    const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
    const subtitle = pct === 100 && totalCount > 0
        ? 'Perfect day! Every habit done 🎉'
        : `${doneCount} of ${totalCount} habits done`;

    drawBackground(ctx);

    if (style === 'summary') {
        drawHeader(ctx, { dateLabel, isToday, title: isToday ? "Today's progress" : 'Daily progress', subtitle });
        drawSummary(ctx, { pct, doneCount, totalCount, bestStreak, week });
        drawFooter(ctx, bestStreak, false);
    } else {
        drawHeader(ctx, { dateLabel, isToday, title: completedOnly ? 'Habits crushed' : 'My Habits', subtitle });
        drawRing(ctx, W - PAD - 110, 210, 105, 22, pct, doneCount, totalCount);
        drawChecklist(ctx, { habits, completedOnly, privacy });
        drawFooter(ctx, bestStreak, true);
    }

    return new Promise((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Failed to render image'))), 'image/png')
    );
}

export function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function canShareFiles(blob) {
    try {
        const file = new File([blob], 'habits.png', { type: 'image/png' });
        return !!(navigator.canShare && navigator.canShare({ files: [file] }));
    } catch {
        return false;
    }
}

/**
 * Share the image via the native share sheet. Returns 'shared' | 'cancelled' | 'downloaded'.
 *
 * IMPORTANT: we share ONLY the file — no `text`/`title`. When text is included,
 * WhatsApp (especially on Android) often picks the text and drops the image.
 */
export async function shareImage(blob, filename = 'my-habits.png') {
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file] });
            return 'shared';
        } catch (err) {
            if (err?.name === 'AbortError') return 'cancelled';
            console.error('Share failed:', err);
        }
    }
    downloadBlob(blob, filename);
    return 'downloaded';
}

export async function copyImage(blob) {
    if (!navigator.clipboard || typeof window.ClipboardItem === 'undefined') throw new Error('Clipboard not supported');
    await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
}
