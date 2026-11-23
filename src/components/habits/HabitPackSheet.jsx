import React, { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import Modal from '../Modal';
import { VITAL_SEVEN } from '../../lib/habitPacks';

const norm = (s) => String(s || '').trim().toLowerCase();

/**
 * Bottom sheet listing a habit pack. Every habit starts ticked; untick any you
 * don't want. Habits the user already has are shown as added.
 */
const HabitPackSheet = ({ isOpen, onClose, habits = [], addHabit, onAdded, pack = VITAL_SEVEN }) => {
    const existing = new Set(habits.map((h) => norm(h.name)));
    const [selected, setSelected] = useState(() => new Set(pack.habits.map((h) => h.name)));
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState('');

    // Fresh selection each time the sheet opens
    useEffect(() => {
        if (isOpen) {
            setSelected(new Set(pack.habits.filter((h) => !existing.has(norm(h.name))).map((h) => h.name)));
            setError('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const toggle = (name) => setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(name)) next.delete(name); else next.add(name);
        return next;
    });

    const toAdd = pack.habits.filter((h) => selected.has(h.name) && !existing.has(norm(h.name)));

    const handleAdd = async () => {
        if (!toAdd.length || adding) return;
        setAdding(true);
        setError('');
        try {
            // Sequential keeps the pack's order
            for (const h of toAdd) {
                const res = await addHabit(h.name, h.activeDays, h.timeOfDay);
                if (res?.error) throw new Error(typeof res.error === 'string' ? res.error : 'Could not add a habit');
            }
            onAdded?.(toAdd.length);
            onClose();
        } catch (e) {
            setError(e.message || 'Something went wrong. Try again.');
        } finally {
            setAdding(false);
        }
    };

    const groups = [
        { id: 'morning', label: 'Morning' },
        { id: 'evening', label: 'Through the day & evening' },
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="440px">
            <div className="hp-sheet">
                <div className="hp-head">
                    <div className="hp-kicker">Starter pack</div>
                    <h3 className="hp-title">{pack.name}</h3>
                    <p className="hp-tagline">{pack.tagline} Untick any you don't want. You can delete them later too.</p>
                </div>

                {groups.map((g) => {
                    const items = pack.habits.filter((h) => h.timeOfDay === g.id);
                    return (
                        <div key={g.id} className="hp-group">
                            <div className="hp-group-label">{g.label}</div>
                            {items.map((h) => {
                                const already = existing.has(norm(h.name));
                                const on = already || selected.has(h.name);
                                return (
                                    <button
                                        key={h.name}
                                        type="button"
                                        className={`hp-row ${on ? 'is-on' : ''} ${already ? 'is-added' : ''}`}
                                        onClick={() => !already && toggle(h.name)}
                                        disabled={already}
                                        aria-pressed={on}
                                    >
                                        <span className="hp-emoji" aria-hidden="true">{h.emoji}</span>
                                        <span className="hp-text">
                                            <span className="hp-name">{h.name}</span>
                                            <span className="hp-hint">{already ? 'Already in your habits' : h.hint}</span>
                                        </span>
                                        <span className="hp-check">{on && <Check size={14} strokeWidth={3} />}</span>
                                    </button>
                                );
                            })}
                        </div>
                    );
                })}

                {error && <div className="hp-error">{error}</div>}

                <div className="hp-actions">
                    <button type="button" className="btn-primary hp-add" onClick={handleAdd} disabled={!toAdd.length || adding}>
                        {adding ? <Loader2 size={16} className="spin-animation" /> : null}
                        {adding ? 'Adding…' : toAdd.length ? `Add ${toAdd.length} habit${toAdd.length === 1 ? '' : 's'}` : 'Nothing selected'}
                    </button>
                    <button type="button" className="hp-skip" onClick={onClose}>Not now</button>
                </div>
            </div>

            <style>{`
                .hp-sheet { display: flex; flex-direction: column; gap: 14px; }
                .hp-head { padding-right: 36px; }
                .hp-kicker {
                    font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
                    color: var(--accent-primary);
                }
                .hp-title { margin: 4px 0 6px; font-size: 22px; font-weight: 800; color: var(--text-primary); }
                .hp-tagline { margin: 0; font-size: 13px; line-height: 1.5; color: var(--text-secondary); }
                .hp-group { display: flex; flex-direction: column; gap: 6px; }
                .hp-group-label {
                    font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
                    color: var(--text-muted); margin-top: 2px;
                }
                .hp-row {
                    display: flex; align-items: center; gap: 12px; width: 100%;
                    padding: 10px 12px; border-radius: 14px; text-align: left; font: inherit; cursor: pointer;
                    background: transparent; border: 1px solid var(--border-subtle);
                    transition: background .15s ease, border-color .15s ease;
                }
                .hp-row.is-on { background: var(--surface-input); border-color: var(--surface-input-border); }
                .hp-row.is-added { cursor: default; opacity: 0.6; }
                .hp-emoji {
                    width: 34px; height: 34px; flex-shrink: 0; border-radius: 10px;
                    display: flex; align-items: center; justify-content: center; font-size: 18px;
                    background: var(--glass-card-bg); border: 1px solid var(--border-subtle);
                }
                .hp-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
                .hp-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
                .hp-hint { font-size: 12px; color: var(--text-muted); }
                .hp-check {
                    width: 22px; height: 22px; flex-shrink: 0; border-radius: 7px;
                    display: flex; align-items: center; justify-content: center;
                    border: 1.5px solid var(--surface-input-border); color: #fff;
                }
                .hp-row.is-on .hp-check { background: var(--accent-primary); border-color: var(--accent-primary); }
                .hp-error { font-size: 12px; color: var(--danger); }
                .hp-actions { display: flex; flex-direction: column; align-items: center; gap: 6px; margin-top: 2px; }
                .hp-add {
                    width: 100%; padding: 13px 16px; font-size: 15px;
                    display: flex; align-items: center; justify-content: center; gap: 8px;
                }
                .hp-add:disabled { opacity: 0.55; cursor: default; }
                .hp-skip {
                    border: none; background: transparent; font: inherit; font-size: 13px; font-weight: 600;
                    color: var(--text-muted); cursor: pointer; padding: 6px 10px;
                }
            `}</style>
        </Modal>
    );
};

export default HabitPackSheet;
