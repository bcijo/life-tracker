import React, { useState, useRef } from 'react';
import { parseBillImage } from '../lib/groq';
import { ArrowLeft, Upload, Users, Share2, Plus, Trash2, CheckCircle, Receipt, Camera, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).substring(2, 9);
const fmt = (n) => `₹${Number(n).toFixed(2)}`;
const fmtShort = (n) => `₹${Number(n).toFixed(0)}`;

// ─── Component ────────────────────────────────────────────────────────────────
const BillSplitter = () => {
    const [imagePreview, setImagePreview] = useState(null);
    const [loadingState, setLoadingState] = useState('idle');
    const [error, setError] = useState(null);

    const [items, setItems] = useState([]);
    const [charges, setCharges] = useState([]);
    const [discounts, setDiscounts] = useState([]);
    const [participants, setParticipants] = useState(['Me']);
    const [newParticipant, setNewParticipant] = useState('');
    const [copied, setCopied] = useState(false);
    const [summaryExpanded, setSummaryExpanded] = useState({});

    const fileInputRef = useRef(null);   // gallery / files
    const cameraInputRef = useRef(null);  // direct camera
    const summaryRef = useRef(null);

    // ── Image upload & extraction ──────────────────────────────────────────
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setError(null);

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const dataUrl = evt.target.result;
            setImagePreview(dataUrl);
            try {
                setLoadingState('processing');
                const result = await parseBillImage(dataUrl);
                if (!result.items.length) {
                    setError('No items found. Try a clearer photo or add items manually.');
                }
                setItems(result.items.map(it => ({
                    id: uid(),
                    name: it.name,
                    quantity: it.quantity || 1,
                    unit_price: parseFloat(it.unit_price) || parseFloat(it.total_price) || 0,
                    total_price: parseFloat(it.total_price) || parseFloat(it.unit_price) || 0,
                    activeParticipants: ['Me'],
                })));
                setCharges(result.charges.map(c => ({
                    id: uid(),
                    name: c.name,
                    amount: parseFloat(c.amount) || 0,
                })));
                setDiscounts(result.discounts.map(d => ({
                    id: uid(),
                    name: d.name,
                    amount: parseFloat(d.amount) || 0,
                })));
            } catch (err) {
                console.error(err);
                setError('Failed: ' + err.message);
            } finally {
                setLoadingState('idle');
            }
        };
        reader.readAsDataURL(file);
    };

    // ── Participants ───────────────────────────────────────────────────────
    const addParticipant = (e) => {
        e.preventDefault();
        const name = newParticipant.trim();
        if (name && !participants.includes(name)) {
            setParticipants([...participants, name]);
            setNewParticipant('');
        }
    };

    const removeParticipant = (name) => {
        setParticipants(p => p.filter(x => x !== name));
        setItems(items.map(it => ({
            ...it,
            activeParticipants: it.activeParticipants.filter(x => x !== name),
        })));
    };

    // ── Item editing ───────────────────────────────────────────────────────
    const updateItem = (id, field, value) => {
        setItems(items.map(it => {
            if (it.id !== id) return it;
            const updated = { ...it, [field]: value };
            // Recalculate total_price when qty or unit_price changes
            if (field === 'quantity' || field === 'unit_price') {
                updated.total_price = (field === 'quantity' ? value : updated.quantity)
                    * (field === 'unit_price' ? value : updated.unit_price);
            }
            return updated;
        }));
    };

    const deleteItem = (id) => setItems(items.filter(it => it.id !== id));

    const togglePerson = (itemId, name) => {
        setItems(items.map(it => {
            if (it.id !== itemId) return it;
            const has = it.activeParticipants.includes(name);
            return {
                ...it,
                activeParticipants: has
                    ? it.activeParticipants.filter(x => x !== name)
                    : [...it.activeParticipants, name],
            };
        }));
    };

    const selectAll = (itemId) => {
        setItems(items.map(it => it.id === itemId ? { ...it, activeParticipants: [...participants] } : it));
    };

    const manualAddItem = () => {
        setItems([...items, { id: uid(), name: 'New Item', quantity: 1, unit_price: 0, total_price: 0, activeParticipants: [] }]);
    };

    const updateCharge = (id, field, value) => setCharges(charges.map(c => c.id === id ? { ...c, [field]: value } : c));
    const deleteCharge = (id) => setCharges(charges.filter(c => c.id !== id));
    const addCharge = () => setCharges([...charges, { id: uid(), name: 'Extra Charge', amount: 0 }]);

    const updateDiscount = (id, field, value) => setDiscounts(discounts.map(d => d.id === id ? { ...d, [field]: value } : d));
    const deleteDiscount = (id) => setDiscounts(discounts.filter(d => d.id !== id));
    const addDiscount = () => setDiscounts([...discounts, { id: uid(), name: 'Discount', amount: 0 }]);

    // ── Calculations ───────────────────────────────────────────────────────
    const calculate = () => {
        const n = participants.length;
        const totalCharges = charges.reduce((s, c) => s + c.amount, 0);
        const totalDiscounts = discounts.reduce((s, d) => s + d.amount, 0);
        const chargePerPerson = n > 0 ? totalCharges / n : 0;
        const discountPerPerson = n > 0 ? totalDiscounts / n : 0;

        // items consumed per person
        const personItems = {};
        participants.forEach(p => { personItems[p] = []; });

        items.forEach(it => {
            const count = it.activeParticipants.length;
            if (count === 0 || it.total_price === 0) return;
            const share = it.total_price / count;
            it.activeParticipants.forEach(p => {
                if (personItems[p]) personItems[p].push({ name: it.name, share });
            });
        });

        const totals = {};
        participants.forEach(p => {
            const foodTotal = personItems[p].reduce((s, i) => s + i.share, 0);
            totals[p] = foodTotal + chargePerPerson - discountPerPerson;
        });

        const grandTotal = items.reduce((s, it) => s + it.total_price, 0)
            + totalCharges - totalDiscounts;

        return { totals, grandTotal, personItems, chargePerPerson, discountPerPerson, totalCharges, totalDiscounts };
    };

    // ── Copy formatted text ────────────────────────────────────────────────
    const buildText = () => {
        const { totals, grandTotal, personItems, chargePerPerson, discountPerPerson } = calculate();
        let text = `🍽️ *Bill Summary*\n${'-'.repeat(30)}\n`;

        participants.forEach(p => {
            const items_ = personItems[p];
            text += `\n👤 *${p}*\n`;
            items_.forEach(i => {
                text += `   • ${i.name} — ${fmtShort(i.share)}\n`;
            });
            if (chargePerPerson > 0) text += `   • Extra charges — ${fmtShort(chargePerPerson)}\n`;
            if (discountPerPerson > 0) text += `   • Discount — -${fmtShort(discountPerPerson)}\n`;
            text += `   *Total: ${fmt(totals[p])}*\n`;
        });

        text += `\n${'-'.repeat(30)}\n💰 *Grand Total: ${fmt(grandTotal)}*\n_Split via LifeTracker_`;
        return text;
    };

    const copyText = async () => {
        try {
            await navigator.clipboard.writeText(buildText());
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            console.error(err);
        }
    };

    const shareWhatsApp = () => {
        window.open(`whatsapp://send?text=${encodeURIComponent(buildText())}`, '_blank');
    };

    const reset = () => {
        setImagePreview(null);
        setItems([]);
        setCharges([]);
        setDiscounts([]);
        setParticipants(['Me']);
        setError(null);
    };

    const isReady = items.length > 0;
    const { totals, grandTotal, personItems, chargePerPerson, discountPerPerson, totalCharges, totalDiscounts } = isReady ? calculate() : {};

    // ─── Render ────────────────────────────────────────────────────────────
    return (
        <div className="page-container" style={{ paddingBottom: '90px' }}>

            {/* ── Header ── */}
            <header style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <Link to="/" style={{ color: 'var(--text-primary)', display: 'flex' }}>
                    <ArrowLeft size={22} />
                </Link>
                <div style={{ flex: 1 }}>
                    <h1 style={{ margin: 0, fontSize: '22px' }}>Split a Bill</h1>
                    <p style={{ margin: 0, fontSize: '12px', opacity: 0.6 }}>AI-powered receipt scanner · Llama 4 Scout</p>
                </div>
                {isReady && (
                    <button onClick={reset} style={{ background: 'none', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '5px 12px', cursor: 'pointer', fontSize: '13px', opacity: 0.7 }}>
                        Reset
                    </button>
                )}
            </header>

            {/* ── Upload: two buttons ── */}
            {!imagePreview && (
                <div style={{
                    marginBottom: '24px',
                    border: '2px dashed rgba(102,126,234,0.35)',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, rgba(102,126,234,0.06) 0%, rgba(118,75,162,0.06) 100%)',
                    padding: '28px 20px',
                    textAlign: 'center',
                }}>
                    <Receipt size={36} style={{ color: 'var(--primary)', opacity: 0.7, marginBottom: '10px' }} />
                    <h3 style={{ margin: '0 0 6px', color: 'var(--primary)', fontWeight: 700 }}>Scan your receipt</h3>
                    <p style={{ fontSize: '13px', opacity: 0.6, margin: '0 0 20px', lineHeight: 1.5 }}>
                        AI reads items, prices, charges &amp; discounts automatically.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button
                            onClick={() => cameraInputRef.current.click()}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '11px 20px', borderRadius: '12px', border: 'none',
                                background: 'var(--primary)', color: 'white',
                                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            <Camera size={18} /> Take Photo
                        </button>
                        <button
                            onClick={() => fileInputRef.current.click()}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '11px 20px', borderRadius: '12px',
                                border: '1.5px solid rgba(102,126,234,0.4)',
                                background: 'rgba(255,255,255,0.5)',
                                color: 'var(--text-primary)',
                                fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                            }}
                        >
                            <Upload size={18} /> Upload
                        </button>
                    </div>
                </div>
            )}

            {/* Hidden file inputs: camera (with capture) and gallery (without capture) */}
            <input type="file" ref={cameraInputRef} onChange={handleImageUpload} accept="image/*" capture="environment" style={{ display: 'none' }} />
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" style={{ display: 'none' }} />

            {/* ── Image preview ── */}
            {imagePreview && (
                <div style={{ marginBottom: '20px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                    <img src={imagePreview} alt="Bill" style={{ width: '100%', maxHeight: '220px', objectFit: 'contain', background: '#f8f8f8', display: 'block' }} />
                    <div style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--glass-bg)', backdropFilter: 'blur(8px)' }}>
                        <span style={{ fontSize: '13px', opacity: 0.65 }}>
                            {loadingState === 'processing' ? '🤖 Reading with AI…' : `${items.length} items · ${charges.length} charges · ${discounts.length} discounts`}
                        </span>
                        <button onClick={() => fileInputRef.current.click()} style={{ background: 'none', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}>
                            Retake
                        </button>
                    </div>
                </div>
            )}

            {/* ── Loading ── */}
            {loadingState === 'processing' && (
                <div style={{ padding: '28px', textAlign: 'center', marginBottom: '20px', borderRadius: '16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}>
                    <Receipt size={36} style={{ color: 'var(--primary)', animation: 'pulse 1.1s infinite alternate', marginBottom: '10px' }} />
                    <h3 style={{ margin: '0 0 6px' }}>Reading bill with AI…</h3>
                    <p style={{ fontSize: '13px', opacity: 0.6, margin: 0 }}>Extracting items, charges &amp; discounts</p>
                </div>
            )}

            {/* ── Error ── */}
            {error && (
                <div style={{ padding: '12px 16px', background: 'rgba(255,77,79,0.1)', border: '1px solid rgba(255,77,79,0.3)', borderRadius: '12px', marginBottom: '18px', fontSize: '13px', color: '#ff4d4f' }}>
                    ⚠️ {error}
                </div>
            )}

            {isReady && (
                <>
                    {/* ╔══════════════════════════╗ */}
                    {/* ║  PARTICIPANTS            ║ */}
                    {/* ╚══════════════════════════╝ */}
                    <Section title={<><Users size={16} /> Who's splitting?</>} style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                            {participants.map(p => (
                                <PersonChip key={p} name={p} onRemove={p !== 'Me' ? () => removeParticipant(p) : undefined} />
                            ))}
                        </div>
                        <form onSubmit={addParticipant} style={{ display: 'flex', gap: '8px' }}>
                            <input className="styled-input" value={newParticipant} onChange={e => setNewParticipant(e.target.value)} placeholder="Add a person…" style={{ flex: 1 }} />
                            <button type="submit" className="primary-button" style={{ width: 'auto', padding: '10px 16px' }}>
                                <Plus size={19} />
                            </button>
                        </form>
                    </Section>

                    {/* ╔══════════════════════════╗ */}
                    {/* ║  ITEMS                   ║ */}
                    {/* ╚══════════════════════════╝ */}
                    <Section
                        title="🍴 Items"
                        action={<button onClick={manualAddItem} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '14px' }}><Plus size={15} /> Add</button>}
                        style={{ marginBottom: '16px' }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {items.map(item => (
                                <ItemCard
                                    key={item.id}
                                    item={item}
                                    participants={participants}
                                    onUpdate={updateItem}
                                    onDelete={deleteItem}
                                    onToggle={togglePerson}
                                    onSelectAll={selectAll}
                                />
                            ))}
                        </div>
                    </Section>

                    {/* ╔══════════════════════════╗ */}
                    {/* ║  EXTRA CHARGES           ║ */}
                    {/* ╚══════════════════════════╝ */}
                    <Section
                        title="➕ Extra Charges"
                        subtitle="Split equally among everyone"
                        action={<button onClick={addCharge} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '14px' }}><Plus size={15} /> Add</button>}
                        style={{ marginBottom: '16px' }}
                    >
                        {charges.length === 0 ? (
                            <p style={{ fontSize: '13px', opacity: 0.5, margin: 0 }}>No charges found — tap Add if needed.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {charges.map(c => (
                                    <ChargeRow key={c.id} item={c} onUpdate={updateCharge} onDelete={deleteCharge} accentColor="rgba(102,126,234,0.12)" />
                                ))}
                                <div style={{ fontSize: '12px', opacity: 0.55, marginTop: '4px' }}>
                                    Each person shares: {fmt(chargePerPerson)} / {participants.length}
                                </div>
                            </div>
                        )}
                    </Section>

                    {/* ╔══════════════════════════╗ */}
                    {/* ║  DISCOUNTS               ║ */}
                    {/* ╚══════════════════════════╝ */}
                    <Section
                        title="🏷️ Discounts"
                        subtitle="Deducted equally from everyone"
                        action={<button onClick={addDiscount} style={{ background: 'none', border: 'none', color: '#27ae60', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '14px' }}><Plus size={15} /> Add</button>}
                        style={{ marginBottom: '24px' }}
                    >
                        {discounts.length === 0 ? (
                            <p style={{ fontSize: '13px', opacity: 0.5, margin: 0 }}>No discounts found — tap Add if needed.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {discounts.map(d => (
                                    <ChargeRow key={d.id} item={d} onUpdate={updateDiscount} onDelete={deleteDiscount} accentColor="rgba(39,174,96,0.1)" colorOverride="#27ae60" />
                                ))}
                                <div style={{ fontSize: '12px', opacity: 0.55, marginTop: '4px' }}>
                                    Each person saves: {fmt(discountPerPerson)} / {participants.length}
                                </div>
                            </div>
                        )}
                    </Section>

                    {/* ╔══════════════════════════╗ */}
                    {/* ║  SUMMARY                 ║ */}
                    {/* ╚══════════════════════════╝ */}
                    <div ref={summaryRef} className="glass-card" style={{
                        padding: '22px',
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)',
                        marginBottom: '16px',
                    }}>
                        <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>💰 Summary</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                            {participants.map(p => {
                                const expanded = summaryExpanded[p];
                                const pItems = personItems[p] || [];
                                return (
                                    <div key={p} style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(102,126,234,0.18)' }}>
                                        {/* Person header row */}
                                        <div
                                            onClick={() => setSummaryExpanded(s => ({ ...s, [p]: !s[p] }))}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '12px 14px',
                                                cursor: 'pointer',
                                                background: 'rgba(255,255,255,0.7)',
                                                gap: '8px',
                                            }}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <span style={{ fontWeight: 600, fontSize: '15px' }}>{p}</span>
                                                {!expanded && pItems.length > 0 && (
                                                    <span style={{ fontSize: '12px', opacity: 0.55, marginLeft: '8px' }}>
                                                        {pItems.map(i => i.name).join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                            <span style={{ fontWeight: 700, fontSize: '17px', color: 'var(--primary)' }}>{fmt(totals[p])}</span>
                                            {expanded ? <ChevronUp size={16} style={{ opacity: 0.5 }} /> : <ChevronDown size={16} style={{ opacity: 0.5 }} />}
                                        </div>

                                        {/* Expanded breakdown */}
                                        {expanded && (
                                            <div style={{ padding: '10px 14px 14px', background: 'rgba(102,126,234,0.04)', borderTop: '1px solid rgba(102,126,234,0.1)' }}>
                                                {pItems.map((i, idx) => (
                                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '3px 0', opacity: 0.85 }}>
                                                        <span>• {i.name}</span>
                                                        <span>{fmtShort(i.share)}</span>
                                                    </div>
                                                ))}
                                                {chargePerPerson > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '3px 0', opacity: 0.75, color: '#667eea' }}>
                                                        <span>➕ Extra charges</span>
                                                        <span>+{fmtShort(chargePerPerson)}</span>
                                                    </div>
                                                )}
                                                {discountPerPerson > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '3px 0', opacity: 0.75, color: '#27ae60' }}>
                                                        <span>🏷️ Discount</span>
                                                        <span>-{fmtShort(discountPerPerson)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Grand total */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '14px',
                                background: 'linear-gradient(135deg, rgba(102,126,234,0.15) 0%, rgba(118,75,162,0.15) 100%)',
                                borderRadius: '12px',
                                border: '1px solid rgba(102,126,234,0.3)',
                                marginTop: '4px',
                            }}>
                                <div>
                                    <span style={{ fontWeight: 700, fontSize: '16px', display: 'block' }}>Grand Total</span>
                                    {(totalCharges > 0 || totalDiscounts > 0) && (
                                        <span style={{ fontSize: '11px', opacity: 0.6 }}>
                                            Food {fmt(grandTotal + totalDiscounts - totalCharges)}
                                            {totalCharges > 0 && ` + charges ${fmt(totalCharges)}`}
                                            {totalDiscounts > 0 && ` - disc ${fmt(totalDiscounts)}`}
                                        </span>
                                    )}
                                </div>
                                <span style={{ fontWeight: 800, fontSize: '22px', color: 'var(--primary)' }}>{fmt(grandTotal)}</span>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={shareWhatsApp}
                                className="primary-button"
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', fontSize: '14px', fontWeight: 600 }}
                            >
                                <Share2 size={18} /> WhatsApp
                            </button>
                            <button
                                onClick={copyText}
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '13px 16px',
                                    borderRadius: '12px',
                                    border: '1.5px solid var(--glass-border)',
                                    background: copied ? 'rgba(39,174,96,0.1)' : 'rgba(255,255,255,0.7)',
                                    color: copied ? '#27ae60' : 'var(--text-primary)',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {copied ? <Check size={18} /> : <Copy size={18} />}
                                {copied ? 'Copied!' : 'Copy Text'}
                            </button>
                        </div>
                    </div>
                </>
            )}

            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; transform: scale(1); }
                    100% { opacity: 0.5; transform: scale(1.08); }
                }
            `}</style>
        </div>
    );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const Section = ({ title, subtitle, action, children, style = {} }) => (
    <div style={{ borderRadius: '16px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)', padding: '18px', ...style }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: subtitle ? '2px' : '14px' }}>
            <h3 style={{ margin: 0, flex: 1, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>{title}</h3>
            {action}
        </div>
        {subtitle && <p style={{ margin: '0 0 12px', fontSize: '12px', opacity: 0.55 }}>{subtitle}</p>}
        {children}
    </div>
);

const PersonChip = ({ name, onRemove }) => (
    <div style={{
        background: 'rgba(102,126,234,0.1)',
        border: '1px solid rgba(102,126,234,0.25)',
        borderRadius: '20px',
        padding: '6px 13px',
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        fontSize: '13px',
        fontWeight: 500,
    }}>
        {name}
        {onRemove && <Trash2 size={12} style={{ cursor: 'pointer', opacity: 0.45 }} onClick={onRemove} />}
    </div>
);

const ItemCard = ({ item, participants, onUpdate, onDelete, onToggle, onSelectAll }) => {
    const isMulti = item.quantity > 1;
    return (
        <div style={{ borderRadius: '14px', border: '1px solid var(--glass-border)', overflow: 'hidden', background: 'rgba(255,255,255,0.04)' }}>
            {/* ── Top strip: name + total ── */}
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
                <input
                    type="text"
                    value={item.name}
                    onChange={e => onUpdate(item.id, 'name', e.target.value)}
                    style={{
                        flex: 1,
                        border: 'none',
                        borderBottom: '1px solid var(--glass-border)',
                        background: 'rgba(255,255,255,0.06)',
                        padding: '11px 14px',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        outline: 'none',
                    }}
                />
                <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.06)', borderLeft: '1px solid var(--glass-border)' }}>
                    <span style={{ padding: '0 6px 0 12px', opacity: 0.5, fontSize: '14px', fontWeight: 'bold', lineHeight: 1 }}>₹</span>
                    <input
                        type="number"
                        value={item.total_price}
                        onChange={e => onUpdate(item.id, 'total_price', parseFloat(e.target.value) || 0)}
                        style={{
                            width: '72px',
                            border: 'none',
                            background: 'transparent',
                            padding: '11px 4px',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            outline: 'none',
                        }}
                    />
                </div>
                <button onClick={() => onDelete(item.id)} style={{ border: 'none', borderLeft: '1px solid var(--glass-border)', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,77,79,0.06)', color: '#ff4d4f', cursor: 'pointer', padding: '0 12px' }}>
                    <Trash2 size={15} />
                </button>
            </div>

            {/* ── Bottom: qty × unit + person toggles ── */}
            <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Qty & unit_price */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(102,126,234,0.08)', borderRadius: '8px', padding: '5px 10px' }}>
                        <span style={{ fontSize: '12px', opacity: 0.6 }}>Qty</span>
                        <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={e => onUpdate(item.id, 'quantity', parseInt(e.target.value) || 1)}
                            style={{ width: '36px', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 600, textAlign: 'center', color: 'var(--text-primary)', outline: 'none' }}
                        />
                    </div>
                    {isMulti && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.65, fontSize: '12px' }}>
                            <span>×</span>
                            <span style={{ display: 'flex', alignItems: 'center', background: 'rgba(102,126,234,0.08)', borderRadius: '8px', padding: '5px 10px' }}>
                                ₹<input
                                    type="number"
                                    value={item.unit_price}
                                    onChange={e => onUpdate(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                    style={{ width: '44px', border: 'none', background: 'transparent', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', outline: 'none' }}
                                />
                            </span>
                            <span>= ₹{item.total_price.toFixed(0)}</span>
                        </div>
                    )}
                </div>

                {/* Person toggles */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                    {participants.map(p => {
                        const active = item.activeParticipants.includes(p);
                        return (
                            <div
                                key={p}
                                onClick={() => onToggle(item.id, p)}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: '16px',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.15s',
                                    background: active ? 'var(--primary)' : 'transparent',
                                    color: active ? 'white' : 'var(--text-secondary)',
                                    border: active ? '1px solid var(--primary)' : '1px solid var(--glass-border)',
                                    userSelect: 'none',
                                }}
                            >
                                {active && <CheckCircle size={11} />}
                                {p}
                            </div>
                        );
                    })}
                    <div
                        onClick={() => onSelectAll(item.id)}
                        style={{ padding: '4px 9px', borderRadius: '16px', fontSize: '11px', cursor: 'pointer', border: '1px dashed var(--glass-border)', opacity: 0.5, userSelect: 'none' }}
                    >
                        All
                    </div>
                    {item.activeParticipants.length > 1 && item.total_price > 0 && (
                        <span style={{ fontSize: '11px', opacity: 0.6, marginLeft: 'auto' }}>
                            ₹{(item.total_price / item.activeParticipants.length).toFixed(0)} each
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

const ChargeRow = ({ item, onUpdate, onDelete, accentColor = 'rgba(102,126,234,0.08)', colorOverride }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '10px', background: accentColor }}>
        <input
            type="text"
            value={item.name}
            onChange={e => onUpdate(item.id, 'name', e.target.value)}
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 500, color: colorOverride || 'var(--text-primary)', outline: 'none' }}
        />
        <span style={{ opacity: 0.5, fontSize: '13px', fontWeight: 'bold' }}>₹</span>
        <input
            type="number"
            value={item.amount}
            onChange={e => onUpdate(item.id, 'amount', parseFloat(e.target.value) || 0)}
            style={{ width: '60px', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 600, textAlign: 'right', color: colorOverride || 'var(--text-primary)', outline: 'none' }}
        />
        <button onClick={() => onDelete(item.id)} style={{ background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', padding: '2px', display: 'flex', opacity: 0.6 }}>
            <Trash2 size={14} />
        </button>
    </div>
);

export default BillSplitter;
