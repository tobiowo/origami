/**
 * Generates the printable Keel unit folding diagrams (docs/img/*.svg) and a
 * self-contained printable HTML sheet (docs/keel-unit-instructions.html)
 * straight from the verified fold model — the diagrams can't drift from the
 * geometry the app renders and the tests check.
 *
 *   node tools/generate-keel-instructions.mjs
 */

import { computeKeelGeometry } from '../js/keel-fold-model.js';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(import.meta.dirname, '../docs');
const IMG = path.join(OUT, 'img');
fs.mkdirSync(IMG, { recursive: true });

const FRONT = '#ece5d4';
const BACK = '#2fbf9c';
const STROKE = '#2a2e3a';
const CREASE = '#b06030';
const SCALE = 150;

// Cavalier-style oblique projection; ob = 0 gives a flat top-down view.
function project([x, y, z], ob) {
  return [(x + ob * 0.9 * z) * SCALE, -(y + ob * 0.55 * z) * SCALE];
}

function shoelace(pts2) {
  let a = 0;
  for (let i = 0; i < pts2.length; i++) {
    const [x1, y1] = pts2[i];
    const [x2, y2] = pts2[(i + 1) % pts2.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

function svgForStep(stepId, t, { ob = 0, title = '' } = {}) {
  const { faces, creases } = computeKeelGeometry(stepId, t);
  const polys = faces.map((f) => {
    const pts2 = f.pts.map((p) => project(p, ob));
    const zc = f.pts.reduce((s, p) => s + p[2], 0) / f.pts.length;
    const hiddenBehind = f.pts.every((p) => p[2] < -1e-9);
    // SVG y is flipped, so a paper-front (CCW) face appears CW (negative area).
    const front = shoelace(pts2) < 0;
    return { pts2, zc, hiddenBehind, front };
  });
  polys.sort((a, b) => a.zc - b.zc);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of polys) {
    for (const [x, y] of p.pts2) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
  const pad = 18;
  const vb = `${(minX - pad).toFixed(1)} ${(minY - pad).toFixed(1)} ${(maxX - minX + 2 * pad).toFixed(1)} ${(maxY - minY + 2 * pad).toFixed(1)}`;

  const parts = [];
  for (const p of polys) {
    const d = p.pts2.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    parts.push(`<polygon points="${d}" fill="${p.front ? FRONT : BACK}" stroke="${STROKE}" stroke-width="1.6" stroke-linejoin="round"/>`);
  }
  // Origami convention: layers hidden behind the paper get dashed outlines.
  for (const p of polys) {
    if (!p.hiddenBehind) continue;
    const d = p.pts2.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    parts.push(`<polygon points="${d}" fill="none" stroke="${STROKE}" stroke-width="1.3" stroke-dasharray="6 5"/>`);
  }
  for (const c of creases) {
    const [x1, y1] = project(c.a, ob);
    const [x2, y2] = project(c.b, ob);
    parts.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${CREASE}" stroke-width="1.6" stroke-dasharray="10 4 2 4"/>`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="${title}">\n${parts.join('\n')}\n</svg>\n`;
}

// Top view of the assembled pentagon frame: five mitered struts.
function pentagonSVG() {
  const R = 1.32, inset = 0.18, lift = 0;
  const verts = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * 2 * Math.PI - Math.PI / 2;
    verts.push([R * Math.cos(a), R * Math.sin(a)]);
  }
  const innerOf = (k) => {
    const A = verts[k];
    const P = verts[(k + 4) % 5], N = verts[(k + 1) % 5];
    const n1 = [N[0] - A[0], N[1] - A[1]], n2 = [P[0] - A[0], P[1] - A[1]];
    const l1 = Math.hypot(...n1), l2 = Math.hypot(...n2);
    const bis = [n1[0] / l1 + n2[0] / l2, n1[1] / l1 + n2[1] / l2];
    const lb = Math.hypot(...bis);
    const cosA = (n1[0] * n2[0] + n1[1] * n2[1]) / (l1 * l2);
    const sinHalf = Math.sqrt((1 - cosA) / 2);
    return [A[0] + bis[0] / lb * inset / sinHalf, A[1] + bis[1] / lb * inset / sinHalf];
  };
  const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];
  const S = 130, parts = [];
  for (let k = 0; k < 5; k++) {
    const A = verts[k], B = verts[(k + 1) % 5];
    const Ai = innerOf(k), Bi = innerOf((k + 1) % 5);
    const quad = [A, B, Bi, Ai].map(([x, y]) => `${(x * S).toFixed(1)},${(y * S).toFixed(1)}`).join(' ');
    parts.push(`<polygon points="${quad}" fill="${colors[k]}" stroke="${STROKE}" stroke-width="1.6" stroke-linejoin="round"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-200 -200 400 400" role="img" aria-label="Assembled pentagon frame">\n${parts.join('\n')}\n</svg>\n`;
}

const DIAGRAMS = [
  ['keel-step-1', () => svgForStep('paper', 0, { title: 'The 3:1 strip' })],
  ['keel-step-2', () => svgForStep('crease', 1, { title: 'Center crease' })],
  ['keel-step-2b', () => svgForStep('crease', 0.5, { ob: 0.45, title: 'Center crease, folded' })],
  ['keel-step-3', () => svgForStep('sleeve', 1, { title: 'Sleeve fold' })],
  ['keel-step-3b', () => svgForStep('sleeve', 0.25, { ob: 0.45, title: 'Sleeve fold in progress' })],
  ['keel-step-4', () => svgForStep('miter', 1, { title: 'Mitered ends (tabs dashed behind)' })],
  ['keel-step-5', () => svgForStep('keel', 0.55, { ob: 0.45, title: 'Keel fold in progress' })],
  ['keel-step-6', () => svgForStep('keel', 1, { ob: 0.35, title: 'The finished unit' })],
  ['keel-assembly', pentagonSVG],
];

const svgs = {};
for (const [name, make] of DIAGRAMS) {
  const svg = make();
  svgs[name] = svg;
  fs.writeFileSync(path.join(IMG, `${name}.svg`), svg);
  console.log('wrote docs/img/' + name + '.svg');
}

// ── printable HTML ───────────────────────────────────────────────────
const fig = (name, caption) =>
  `<figure>${svgs[name]}<figcaption>${caption}</figcaption></figure>`;

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>The Keel Unit — Folding Instructions</title>
<style>
  @page { margin: 18mm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1c1f28; max-width: 740px; margin: 24px auto; line-height: 1.45; }
  h1 { font-size: 1.7em; margin-bottom: 0.1em; }
  h2 { font-size: 1.15em; margin: 1.2em 0 0.3em; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
  .subtitle { color: #555; margin-top: 0; }
  figure { margin: 0.7em 0; text-align: center; page-break-inside: avoid; }
  figure svg { max-width: 100%; height: auto; max-height: 150px; }
  figcaption { font-size: 0.85em; color: #555; margin-top: 2px; }
  .step { page-break-inside: avoid; }
  table { border-collapse: collapse; margin: 0.5em 0; }
  td, th { border: 1px solid #bbb; padding: 4px 10px; font-size: 0.9em; }
  .note { background: #f4f1e8; border-left: 3px solid #b06030; padding: 8px 12px; font-size: 0.9em; }
</style></head><body>

<h1>The Keel Unit</h1>
<p class="subtitle">An open-frame modular origami edge unit — fold one unit per polyhedron edge.<br>
Designed for the Origami Explorer app, in the tradition of Robert Neale's Penultimate module and Tom Hull's PHiZZ.</p>

<h2>Paper</h2>
<div class="step">
<p>Each unit needs a <strong>3:1 rectangle</strong>. Cut a square into three equal strips, or cut A4/letter paper into strips (e.g. an A4 sheet cut into quarters lengthwise gives strips close enough to 3:1 after trimming). For your first frame, use paper around 9&nbsp;×&nbsp;3&nbsp;cm or larger.</p>
${fig('keel-step-1', 'A 3:1 strip. The colored side (if any) should start face down — it ends up outside.')}
</div>

<h2>Step 1 — Center crease</h2>
<div class="step">
<p>Fold the strip in half lengthwise (long edge to long edge), crease firmly, and open it back up.</p>
${fig('keel-step-2b', 'Fold in half lengthwise…')}
${fig('keel-step-2', '…then open. The dash-dot line is your center crease.')}
</div>

<h2>Step 2 — Sleeve fold</h2>
<div class="step">
<p>Fold both long edges in to meet the center crease (a "cupboard fold"). The slit where the two flaps meet runs the whole length of the strip; the space under each flap is a pocket. Together they are the <strong>sleeve</strong>.</p>
${fig('keel-step-3b', 'Bottom edge to the center crease; repeat with the top edge.')}
${fig('keel-step-3', 'The sleeve: two flaps meeting at the center slit.')}
</div>

<h2>Step 3 — Miter the ends</h2>
<div class="step">
<p>Keep the flap side toward you. At each end, fold the corner <em>behind</em>, along a diagonal crease that starts at the bottom corner and climbs at <strong>54°</strong>, so the folded edge runs from the bottom corner to the top edge. The two folded-back wedges are the <strong>tabs</strong>. Make the two miters mirror images of each other, as shown.</p>
${fig('keel-step-4', 'Both ends mitered; the tabs (dashed) lie behind.')}
<p class="note"><strong>The miter angle is the design parameter.</strong> It must be half the interior angle of the polygon you want to frame:</p>
<table>
<tr><th>Miter angle</th><th>Frames</th><th>Builds</th></tr>
<tr><td>54°</td><td>pentagons</td><td>dodecahedron (30 units)</td></tr>
<tr><td>45°</td><td>squares</td><td>cube (12 units)</td></tr>
<tr><td>30°</td><td>triangles</td><td>tetrahedron (6), octahedron (12), icosahedron (30)</td></tr>
</table>
<p>An easy 54° reference: fold the end so the bottom edge lies along the center slit, then nudge the crease slightly steeper — or measure once and cut a cardboard template. For 45°, simply fold the bottom edge up along the end so it aligns with the side. For 30°, fold the bottom corner up so the bottom edge meets the top corner.</p>
</div>

<h2>Step 4 — The keel fold</h2>
<div class="step">
<p>Fold the whole strip in half lengthwise, <em>away</em> from you (mountain fold), right along the sleeve slit. The fold becomes the unit's ridge — the <strong>keel</strong>.</p>
${fig('keel-step-5', 'Fold the top half behind…')}
${fig('keel-step-6', '…done: a V-section strut with a tab at each end.')}
</div>

<h2>Assembly</h2>
<div class="step">
<p>Hold a unit with the keel ridge up. Take a second unit and slide one of its tabs into the <strong>open end</strong> of the first unit, between the sleeve layers, pushing it in up to the miter crease. The miter makes the second unit kick out at exactly the polygon's corner angle. Keep adding units tab-into-end; with 54° miters, five units close into a pentagon frame.</p>
${fig('keel-assembly', 'Five units, tab into sleeve end, close a pentagon.')}
<p>Frames share struts to grow into polyhedra: every strut is one edge, so a dodecahedron takes 30 units (54°), a cube 12 (45°), and a tetrahedron just 6 (30°) — the best one to start with. If a joint feels loose, sharpen the keel fold and push the tab fully home; a tiny dab of glue inside the sleeve is legitimate for display models.</p>
</div>

<p class="note">This sheet is generated from the same geometric model that animates the in-app tutorial (<code>tools/generate-keel-instructions.mjs</code>). The unit is an original design for this app and hasn't had extensive paper testing — if a fold fights you, trust your hands over the diagram, and consider it an invitation to improve the design.</p>

</body></html>
`;

fs.writeFileSync(path.join(OUT, 'keel-unit-instructions.html'), html);
console.log('wrote docs/keel-unit-instructions.html');
