// Rozrzucone sygnety Programistoku wypełniające prostokąt 275 × 525 mm.
// Uruchom: node scripts/logo-pattern.mjs
import fs from 'node:fs';

const SRC = 'public/press/logotypy/svg/programistok-sygnet-na-ciemnym.svg';
const OUT = 'public/press/programistok-pattern-275x525.svg';
const OUT_MONO = 'public/press/logotypy/svg/programistok-sygnet-bialy.svg';

const W = 275, H = 525;            // mm
const BG = '#14130f';
const MARK = '#F4F2EC';       // off-white used inside the pattern
const MARK_SOLO = '#FFFFFF';  // the standalone mono logotype is pure white
const LOGO_W = 201, LOGO_H = 176;  // source viewBox
const MIN_W = 12, MAX_W = 48;      // mm, logo width range
const GAP = 1.8;                   // mm of clear space kept between marks
const BLEED = 16;                  // how far past the trim a mark may sit, so the edges stay filled
const TRIES = 400000;              // dart throws; placement stops when the sheet is full
const SEED = 20260911;

// --- deterministic PRNG (mulberry32) ---
let s = SEED;
const rnd = () => {
  s |= 0; s = (s + 0x6D2B79F5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const rand = (a, b) => a + rnd() * (b - a);

// --- pull the logo geometry out of the source file ---
// the kontur logotype is a filled silhouette, so flatten the four-colour sygnet to white instead
const src = fs.readFileSync(SRC, 'utf8');
const flatten = (colour) =>
  src
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>[\s\S]*$/, '')
    .replace(/fill="#[0-9A-Fa-f]{3,8}"/g, `fill="${colour}"`)
    .trim();
const body = flatten(MARK);

// --- the mark on its own, one colour, transparent background ---
fs.writeFileSync(
  OUT_MONO,
  `<svg xmlns="http://www.w3.org/2000/svg" width="${LOGO_W}" height="${LOGO_H}" viewBox="0 0 ${LOGO_W} ${LOGO_H}" fill="none">
  <title>Programistok — sygnet biały</title>
${flatten(MARK_SOLO)
  .split('\n')
  .map((l) => '  ' + l.trim())
  .join('\n')}
</svg>
`,
);
console.log(`${OUT_MONO}: solo mark, ${MARK_SOLO}`);

// --- separating-axis test on two rotated rectangles ---
// Circles would be far too generous for a mark this square, and would leave the sheet looking empty.
const corners = (p) => {
  const a = (p.rot * Math.PI) / 180;
  const cos = Math.cos(a), sin = Math.sin(a);
  const hw = p.w / 2 + GAP / 2, hh = p.h / 2 + GAP / 2;
  return [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => ({
    x: p.x + x * cos - y * sin,
    y: p.y + x * sin + y * cos,
  }));
};

const axes = (p) => {
  const a = (p.rot * Math.PI) / 180;
  return [{ x: Math.cos(a), y: Math.sin(a) }, { x: -Math.sin(a), y: Math.cos(a) }];
};

const overlaps = (p, q) => {
  const cp = corners(p), cq = corners(q);
  for (const ax of [...axes(p), ...axes(q)]) {
    let pMin = Infinity, pMax = -Infinity, qMin = Infinity, qMax = -Infinity;
    for (const c of cp) { const d = c.x * ax.x + c.y * ax.y; pMin = Math.min(pMin, d); pMax = Math.max(pMax, d); }
    for (const c of cq) { const d = c.x * ax.x + c.y * ax.y; qMin = Math.min(qMin, d); qMax = Math.max(qMax, d); }
    if (pMax <= qMin || qMax <= pMin) return false;   // a gap on this axis means they are clear
  }
  return true;
};

// --- dart-throwing, biggest marks first so the small ones can fill the leftovers ---
const placed = [];
let size = MAX_W;
for (let i = 0; i < TRIES; i++) {
  // ease the size down over the run: big marks claim space early, small ones plug the holes
  size = MIN_W + (MAX_W - MIN_W) * Math.pow(1 - i / TRIES, 2);
  const w = rand(Math.max(MIN_W, size * 0.75), size);
  const cand = {
    x: rand(-BLEED, W + BLEED),
    y: rand(-BLEED, H + BLEED),
    w,
    h: w * (LOGO_H / LOGO_W),
    rot: rand(-180, 180),
  };
  if (!placed.some((p) => overlaps(p, cand))) placed.push(cand);
}

// --- emit one <use> per mark; the clip trims whatever hangs over the edge ---
const uses = placed.map((p) => {
  const scale = p.w / LOGO_W;
  const t = [
    `translate(${p.x.toFixed(3)} ${p.y.toFixed(3)})`,
    `rotate(${p.rot.toFixed(2)})`,
    `scale(${scale.toFixed(5)})`,
    `translate(${-LOGO_W / 2} ${-LOGO_H / 2})`,
  ].join(' ');
  return `  <use href="#pgk" transform="${t}"/>`;
});

const out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">
  <title>Programistok — wzór tła 275 × 525 mm</title>
  <defs>
    <clipPath id="edge">
      <rect width="${W}" height="${H}"/>
    </clipPath>
    <symbol id="pgk" viewBox="0 0 ${LOGO_W} ${LOGO_H}" overflow="visible">
${body.split('\n').map((l) => '      ' + l.trim()).join('\n')}
    </symbol>
  </defs>
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <g clip-path="url(#edge)">
${uses.join('\n')}
  </g>
</svg>
`;

fs.writeFileSync(OUT, out);
console.log(`${OUT}: ${placed.length} logos, ${(out.length / 1024).toFixed(1)} KB`);

