// Generates src/styles/theme-zen-remap.css
//
// Many components hard-code bright accent colours in inline styles and SVG
// attributes instead of using theme tokens. The Ancient Zen theme maps each of
// those colours to a muted pigment so the whole app shifts tone, without
// editing every component. Selectors match the way browsers serialise inline
// styles, e.g. `color: rgb(168, 85, 247)`.
//
// To retone another hard-coded colour, add its hex to a group and run:
//   node scripts/generate-zen-remap.mjs
import { writeFileSync } from 'node:fs';

const groups = {
    indigo: ['#a855f7', '#c084fc', '#8b5cf6', '#6366f1', '#818cf8', '#667eea', '#9f7aea', '#7c3aed', '#764ba2', '#5a67d8'],
    celadon: ['#06b6d4', '#4ecdc4', '#45b7d1', '#64ffda', '#00b4d8', '#14b8a6', '#22d3ee'],
    sky: ['#38bdf8', '#3b82f6', '#60a5fa', '#0ea5e9'],
    moss: ['#10b981', '#22c55e', '#16a34a', '#48bb78', '#4ade80', '#34d399', '#68d391', '#96ceb4'],
    vermilion: ['#ef4444', '#f87171', '#ff6b6b', '#dc2626', '#f56565', '#f43f5e', '#fc8181'],
    ochre: ['#f59e0b', '#eab308', '#fbbf24', '#ffd166', '#ecc94b', '#fbd38d', '#facc15'],
    persimmon: ['#f97316', '#fb923c', '#ea580c'],
    plum: ['#ec4899', '#f472b6', '#db2777', '#d946ef'],
};

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ');
const out = [
    '/* GENERATED FILE. Do not edit by hand: run `node scripts/generate-zen-remap.mjs`. */',
];
const rule = (selectors, declaration) => {
    out.push(`${selectors.map((s) => `html.theme-zen ${s}`).join(',\n')} {\n    ${declaration}\n}`);
};

for (const [name, hexes] of Object.entries(groups)) {
    const v = `var(--zen-${name})`;
    const rgbs = hexes.map(toRgb);
    const each = (fn) => rgbs.flatMap(fn);
    out.push(`/* ---- ${name} ---- */`);

    // Text
    rule(each((c) => [
        `[style^="color: rgb(${c})"]`, `[style*="; color: rgb(${c})"]`,
        `[style^="color: rgba(${c},"]`, `[style*="; color: rgba(${c},"]`,
    ]), `color: ${v} !important;`);
    // Solid and tinted backgrounds
    rule(each((c) => [`[style*="background: rgb(${c})"]`, `[style*="background-color: rgb(${c})"]`]),
        `background-color: ${v} !important;`);
    rule(each((c) => [`[style*="background: rgba(${c},"]`, `[style*="background-color: rgba(${c},"]`]),
        `background-color: color-mix(in srgb, ${v} 11%, transparent) !important;`);
    // Borders
    rule(each((c) => [`[style*="solid rgb(${c})"]`]), `border-color: ${v} !important;`);
    rule(each((c) => [`[style*="solid rgba(${c},"]`, `[style*="dashed rgba(${c},"]`]),
        `border-color: color-mix(in srgb, ${v} 32%, transparent) !important;`);
    // Gradients, keyed on their first colour stop
    rule(each((c) => [`[style*="deg, rgb(${c})"]`, `[style*="gradient(rgb(${c})"]`, `[style*="to right, rgb(${c})"]`, `[style*="to bottom, rgb(${c})"]`]),
        `background-image: linear-gradient(135deg, ${v}, color-mix(in srgb, ${v} 82%, #1c1915)) !important;`);
    rule(each((c) => [`[style*="deg, rgba(${c},"]`, `[style*="gradient(rgba(${c},"]`, `[style*="to right, rgba(${c},"]`, `[style*="to bottom, rgba(${c},"]`]),
        `background-image: linear-gradient(135deg, color-mix(in srgb, ${v} 13%, transparent), color-mix(in srgb, ${v} 5%, transparent)) !important;`);
    // Neon glows become a soft paper shadow
    rule(each((c) => [`[style*="box-shadow: rgba(${c},"]`, `[style*="px, rgba(${c},"]`]), 'box-shadow: var(--zen-shadow-soft) !important;');
    // SVG (icons and charts)
    const both = hexes.flatMap((h) => [h, h.toUpperCase()]);
    rule(both.map((h) => `[stroke="${h}"]`), `stroke: ${v};`);
    rule(both.map((h) => `[fill="${h}"]`), `fill: ${v};`);
    rule(both.map((h) => `[stop-color="${h}"]`), `stop-color: ${v};`);
    // Colours passed to CSS through the --ring-color custom property (progress rings)
    rule(both.map((h) => `[style*="--ring-color: ${h}"]`), `--ring-color: ${v} !important;`);
}

writeFileSync(new URL('../src/styles/theme-zen-remap.css', import.meta.url), `${out.join('\n\n')}\n`);
console.log('Wrote src/styles/theme-zen-remap.css');
