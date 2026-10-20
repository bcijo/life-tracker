import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';
import { subDays, parseISO } from 'date-fns';
import { getLocalDateStr, calculateHabitStreak } from '../../hooks/useHabits';
import { useEncryption } from '../../contexts/EncryptionContext';
import { isEncrypted } from '../../lib/crypto';
import { generateNextDayAdvice, buildFallbackNextDayAdvice } from '../../lib/groq';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const STORAGE_KEY = 'lifetracker_daily_whisper_v5';

const MOOD_LABELS = {
    1: 'Rough',
    2: 'Meh',
    3: 'Okay',
    4: 'Good',
    5: 'Amazing',
};

const isRecurringTx = (t) => {
    if (t?.is_recurring) return true;
    if (typeof t?.category === 'string' && t.category.toLowerCase() === 'recurring') return true;
    if (typeof t?.description === 'string' && t.description.toLowerCase().includes('(recurring)')) return true;
    return false;
};

const cleanDecryptedText = (val) => {
    if (!val || typeof val !== 'string') return '';
    if (isEncrypted(val)) return '';
    return val.trim();
};

export const DailyWhisper = ({
    open = false,
    onClose,
    habits = [],
    habitsLoading = false,
    getStatusForDate,
    transactions = [],
    txLoading = false,
    expenseCards = [],
    journalEntries = [],
    journalLoading = false,
}) => {
    const { isEncryptionReady } = useEncryption();
    const [advice, setAdvice] = useState(null);
    const [isSynthesizing, setIsSynthesizing] = useState(false);

    const today = useMemo(() => new Date(), []);
    const todayStr = useMemo(() => getLocalDateStr(today), [today]);
    const yesterday = useMemo(() => subDays(today, 1), [today]);
    const yesterdayStr = useMemo(() => getLocalDateStr(yesterday), [yesterday]);

    const trackingStartDate = useMemo(() => {
        try {
            return localStorage.getItem('life_tracker_tracking_start') || null;
        } catch {
            return null;
        }
    }, []);

    const { digest, fingerprint } = useMemo(() => {
        const yesterdayDow = yesterday.getDay();
        const todayDow = today.getDay();

        const categoryMap = {};
        (expenseCards || []).forEach(c => {
            if (c?.id) categoryMap[c.id] = c.name;
            if (Array.isArray(c?.category_ids)) {
                c.category_ids.forEach(cid => { categoryMap[cid] = c.name; });
            }
        });

        const resolveCategory = (tx) => {
            if (!tx) return 'General';
            if (tx.card_id && categoryMap[tx.card_id]) return categoryMap[tx.card_id];
            if (tx.category && categoryMap[tx.category]) return categoryMap[tx.category];
            if (tx.category && typeof tx.category === 'string' && !/^[0-9a-f-]{20,}$/i.test(tx.category)) {
                return tx.category.charAt(0).toUpperCase() + tx.category.slice(1);
            }
            return 'General';
        };

        // 1. Habits from yesterday
        const scheduledYesterdayList = (habits || []).filter(h => {
            if (h.is_paused) return false;
            const days = h.active_days || ALL_DAYS;
            return days.includes(yesterdayDow);
        });

        const completedYesterday = [];
        const missedYesterday = [];

        scheduledYesterdayList.forEach(h => {
            const status = getStatusForDate ? getStatusForDate(h, yesterdayStr) : null;
            const streak = calculateHabitStreak(h, trackingStartDate) || 0;
            const item = { name: h.name, timeOfDay: h.time_of_day || 'morning', streak };
            if (status === 'completed') {
                completedYesterday.push(item);
            } else if (status !== 'paused') {
                missedYesterday.push(item);
            }
        });

        const scheduledTodayList = (habits || [])
            .filter(h => !h.is_paused && (h.active_days || ALL_DAYS).includes(todayDow))
            .map(h => ({
                name: h.name,
                timeOfDay: h.time_of_day || 'morning',
                streak: calculateHabitStreak(h, trackingStartDate) || 0,
            }));

        // 2. Spending from yesterday
        const sevenDaysAgoStr = getLocalDateStr(subDays(today, 7));
        const nonRecurringExpenses = (transactions || []).filter(
            t => t.type === 'expense' && !isRecurringTx(t) && t.date
        );

        const yesterdayExpenses = [];
        let sevenDayTotal = 0;

        nonRecurringExpenses.forEach(t => {
            let dStr = '';
            try {
                dStr = getLocalDateStr(parseISO(t.date));
            } catch {
                dStr = String(t.date).slice(0, 10);
            }
            const amt = parseFloat(t.amount) || 0;
            if (dStr === yesterdayStr) {
                yesterdayExpenses.push({
                    description: t.description || 'Expense',
                    amount: Math.round(amt),
                    category: resolveCategory(t),
                });
            }
            if (dStr >= sevenDaysAgoStr && dStr <= yesterdayStr) {
                sevenDayTotal += amt;
            }
        });

        const yesterdayTotal = Math.round(
            yesterdayExpenses.reduce((sum, t) => sum + t.amount, 0)
        );
        const sevenDayDailyAvg = Math.round(sevenDayTotal / 7);

        const byCat = {};
        yesterdayExpenses.forEach(t => {
            byCat[t.category] = (byCat[t.category] || 0) + t.amount;
        });
        const topCategoryYesterday = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

        // 3. Journal from yesterday (or latest decrypted entry if yesterday had none)
        const yesterdayJournal = (journalEntries || []).find(e => e.date === yesterdayStr)
            || (journalEntries || []).find(e => e.date < todayStr)
            || null;

        const highlights = cleanDecryptedText(yesterdayJournal?.how_was_today);
        const thoughts = cleanDecryptedText(yesterdayJournal?.on_your_mind);
        const intentionForToday = cleanDecryptedText(yesterdayJournal?.change_for_tomorrow);
        const hasYesterdayEntry = Boolean(
            yesterdayJournal && (highlights || thoughts || intentionForToday || yesterdayJournal.mood_score)
        );

        const builtDigest = {
            yesterdayDate: yesterdayStr,
            todayDate: todayStr,
            habits: {
                scheduledYesterday: scheduledYesterdayList.length,
                completedYesterday,
                missedYesterday,
                scheduledToday: scheduledTodayList.slice(0, 8),
            },
            spending: {
                yesterdayTotal,
                transactionCountYesterday: yesterdayExpenses.length,
                topCategoryYesterday,
                topTransactionsYesterday: yesterdayExpenses
                    .sort((a, b) => b.amount - a.amount)
                    .slice(0, 4),
                sevenDayDailyAvg,
            },
            journal: {
                hasYesterdayEntry,
                entryDate: yesterdayJournal?.date || null,
                moodLabel: yesterdayJournal?.mood_score ? MOOD_LABELS[yesterdayJournal.mood_score] : null,
                highlights: highlights.slice(0, 220),
                thoughts: thoughts.slice(0, 220),
                intentionForToday: intentionForToday.slice(0, 220),
            },
        };

        const fp = [
            todayStr,
            `h:${completedYesterday.map(h => h.name).join(',')}/${missedYesterday.map(h => h.name).join(',')}`,
            `s:${yesterdayTotal}:${yesterdayExpenses.length}`,
            `j:${yesterdayJournal?.mood_score || 0}:${highlights.slice(0, 30)}:${thoughts.slice(0, 30)}:${intentionForToday.slice(0, 30)}`,
        ].join('|');

        return { digest: builtDigest, fingerprint: fp };
    }, [habits, transactions, expenseCards, journalEntries, getStatusForDate, yesterday, yesterdayStr, today, todayStr, trackingStartDate]);

    // Check if journal entries still contain undecrypted ciphertext
    const hasUndecryptedJournal = useMemo(() => {
        return (journalEntries || []).some(
            e => isEncrypted(e?.how_was_today) || isEncrypted(e?.on_your_mind) || isEncrypted(e?.change_for_tomorrow)
        );
    }, [journalEntries]);

    const dataReady = !habitsLoading && !txLoading && !journalLoading && (isEncryptionReady || !hasUndecryptedJournal);

    const runAnalysis = useCallback(async (forceRefresh = false) => {
        if (!forceRefresh) {
            try {
                const cachedRaw = localStorage.getItem(STORAGE_KEY);
                if (cachedRaw) {
                    const cached = JSON.parse(cachedRaw);
                    if (cached?.date === todayStr && cached?.fingerprint === fingerprint && Array.isArray(cached?.advice?.bullets)) {
                        setAdvice(cached.advice);
                        return;
                    }
                    if (cached?.date === todayStr && Array.isArray(cached?.advice?.bullets)) {
                        setAdvice(cached.advice);
                    }
                }
            } catch {
                // ignore
            }
        }

        setAdvice(prev => prev || buildFallbackNextDayAdvice(digest));
        setIsSynthesizing(true);

        try {
            const generated = await generateNextDayAdvice(digest);
            if (generated && Array.isArray(generated.bullets) && generated.bullets.length > 0) {
                setAdvice(generated);
                try {
                    localStorage.setItem(
                        STORAGE_KEY,
                        JSON.stringify({
                            date: todayStr,
                            fingerprint,
                            advice: generated,
                        })
                    );
                } catch {
                    // ignore
                }
            }
        } finally {
            setIsSynthesizing(false);
        }
    }, [digest, fingerprint, todayStr]);

    useEffect(() => {
        if (!dataReady) return;
        runAnalysis(false);
    }, [dataReady, runAnalysis]);

    const displayAdvice = advice || buildFallbackNextDayAdvice(digest);
    const bullets = Array.isArray(displayAdvice?.bullets) ? displayAdvice.bullets : [];

    return (
        <AnimatePresence initial={false}>
            {open && (
                <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 18 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    style={{ overflow: 'hidden', width: '100%' }}
                >
                    <div
                        style={{
                            padding: '10px 14px',
                            borderRadius: '13px',
                            background: 'var(--glass-card-bg)',
                            border: '1px solid var(--border-subtle)',
                            backdropFilter: 'blur(12px)',
                            WebkitBackdropFilter: 'blur(12px)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: '10px',
                        }}
                    >
                        <ul
                            style={{
                                margin: 0,
                                paddingLeft: '20px',
                                listStyleType: 'disc',
                                listStylePosition: 'outside',
                                fontSize: '12.5px',
                                fontWeight: '500',
                                color: 'var(--text-primary)',
                                lineHeight: '1.5',
                                flex: 1,
                                minWidth: 0,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                            }}
                        >
                            {bullets.map((item, idx) => (
                                <li key={idx} style={{ wordBreak: 'break-word', paddingLeft: '2px' }}>
                                    {item}
                                </li>
                            ))}
                        </ul>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0, marginTop: '1px' }}>
                            <button
                                type="button"
                                disabled={isSynthesizing}
                                onClick={() => runAnalysis(true)}
                                title="Regenerate advice"
                                aria-label="Regenerate advice"
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--text-muted)',
                                    padding: '3px',
                                    borderRadius: '6px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: isSynthesizing ? 'wait' : 'pointer',
                                    opacity: 0.7,
                                }}
                            >
                                <RefreshCw
                                    size={12}
                                    style={{
                                        animation: isSynthesizing ? 'spin 1s linear infinite' : 'none',
                                    }}
                                />
                            </button>

                            {onClose && (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    title="Hide"
                                    aria-label="Hide advice"
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: 'var(--text-muted)',
                                        padding: '3px',
                                        borderRadius: '6px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        opacity: 0.7,
                                    }}
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DailyWhisper;
