// Renders a shareable PNG card of habits for a given day using the Canvas API,
// and shares it via the Web Share API (WhatsApp, Instagram, etc.) with fallbacks.

const W = 1080;
const H = 1350;
const FONT = `'Inter', 'Outfit', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;

const rr = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
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

/**
 * @param {Object} opts
 * @param {string} opts.dateLabel    e.g. "Thu, Oct 15"
 * @param {boolean} opts.isToday
 * @param {Array<{name:string,status:'completed'|'failed'|null,streak:number}>} opts.habits
 * @param {number} opts.doneCount
 * @param {number} opts.totalCount
 * @param {number} opts.bestStreak
 * @param {'all'|'completed'} opts.mode
 * @returns {Promise<Blob>}
 */
export async function renderHabitShareCard({ dateLabel, isToday, habits, doneCount, totalCount, bestStreak, mode = 'all' }) {
    try { await document.fonts?.ready; } catch { /* ignore */ }

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // ── Background ──
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0f0a1f');
    bg.addColorStop(0.55, '#140d24');
    bg.addColorStop(1, '#1d0b1e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    glow(ctx, 120, 140, 520, 'rgba(168,85,247,0.35)');
    glow(ctx, W - 80, H - 160, 560, 'rgba(236,72,153,0.28)');
    glow(ctx, W - 200, 380, 300, 'rgba(34,197,94,0.10)');

    const PAD = 80;
    const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    // ── Header ──
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `600 30px ${FONT}`;
    ctx.fillText((isToday ? 'TODAY · ' : '') + dateLabel.toUpperCase(), PAD, 150);

    const titleGrad = ctx.createLinearGradient(PAD, 0, PAD + 560, 0);
    titleGrad.addColorStop(0, '#ffffff');
    titleGrad.addColorStop(1, '#e9d5ff');
    ctx.fillStyle = titleGrad;
    ctx.font = `800 76px ${FONT}`;
    ctx.fillText(mode === 'completed' ? 'Habits crushed' : 'My Habits', PAD, 240);

    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = `500 34px ${FONT}`;
    const subtitle = pct === 100 && totalCount > 0
        ? 'Perfect day! Every habit done 🎉'
        : `${doneCount} of ${totalCount} habits done`;
    ctx.fillText(subtitle, PAD, 298);

    // ── Progress ring ──
    const cx = W - PAD - 110, cy = 210, R = 105, LW = 22;
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
    ctx.font = `800 58px ${FONT}`;
    ctx.fillText(`${pct}%`, cx, cy + 12);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `600 22px ${FONT}`;
    ctx.fillText(`${doneCount}/${totalCount}`, cx, cy + 48);
    ctx.textAlign = 'left';

    // ── Habit list ──
    const list = mode === 'completed' ? habits.filter(h => h.status === 'completed') : habits;
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
        ctx.fillText(mode === 'completed' ? 'Nothing completed yet — on it! 💪' : 'No habits scheduled', W / 2, listTop + 160);
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

        // Name
        ctx.font = `${done ? 700 : 600} 36px ${FONT}`;
        ctx.fillStyle = done ? '#ffffff' : failed ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.7)';
        const nx = bx + 48;
        ctx.fillText(truncate(ctx, h.name, rightEdge - nx), nx, by + 12);
    });

    if (overflow) {
        const y = listTop + visible.length * (ROW_H + GAP);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = `600 32px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(`+ ${overflow} more`, W / 2, y + ROW_H / 2 + 10);
        ctx.textAlign = 'left';
    }

    // ── Footer ──
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(PAD, footerTop + 30); ctx.lineTo(W - PAD, footerTop + 30); ctx.stroke();

    if (bestStreak > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = `600 24px ${FONT}`;
        ctx.fillText('BEST STREAK', PAD, footerTop + 90);
        ctx.fillStyle = '#fff';
        ctx.font = `800 44px ${FONT}`;
        ctx.fillText(`🔥 ${bestStreak} day${bestStreak === 1 ? '' : 's'}`, PAD, footerTop + 145);
    }

    ctx.textAlign = 'right';
    const brand = ctx.createLinearGradient(W - PAD - 300, 0, W - PAD, 0);
    brand.addColorStop(0, '#a855f7');
    brand.addColorStop(1, '#ec4899');
    ctx.fillStyle = brand;
    ctx.font = `800 38px ${FONT}`;
    ctx.fillText('Life Tracker', W - PAD, footerTop + 110);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = `500 24px ${FONT}`;
    ctx.fillText('Stay consistent ✨', W - PAD, footerTop + 145);
    ctx.textAlign = 'left';

    return new Promise((resolve, reject) =>
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Failed to render image'))), 'image/png')
    );
}

export function buildShareText({ dateLabel, habits, doneCount, totalCount, mode }) {
    const list = mode === 'completed' ? habits.filter(h => h.status === 'completed') : habits;
    const lines = list.map(h => `${h.status === 'completed' ? '✅' : h.status === 'failed' ? '❌' : '⬜'} ${h.name}${h.streak > 0 ? ` 🔥${h.streak}` : ''}`);
    return `My habits · ${dateLabel} — ${doneCount}/${totalCount} done\n\n${lines.join('\n')}`;
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
 */
export async function shareImage(blob, text, filename = 'my-habits.png') {
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            // Note: some apps (e.g. WhatsApp) drop `text` when files are present.
            await navigator.share({ files: [file], text });
            return 'shared';
        } catch (err) {
            if (err?.name === 'AbortError') return 'cancelled';
            // Some targets reject text+files; retry with files only
            try {
                await navigator.share({ files: [file] });
                return 'shared';
            } catch (err2) {
                if (err2?.name === 'AbortError') return 'cancelled';
            }
        }
    }
    downloadBlob(blob, filename);
    return 'downloaded';
}

export async function copyImage(blob) {
    if (!navigator.clipboard || typeof window.ClipboardItem === 'undefined') throw new Error('Clipboard not supported');
    await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
}
