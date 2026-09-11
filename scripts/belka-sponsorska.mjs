// Belka partnersko-sponsorska na billboard: 2500 × 400 mm, jeden wiersz.
// Uruchom: node scripts/belka-sponsorska.mjs
// Logotypy SVG są wklejane jako wektory, rastry jako osadzone PNG (base64).
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const PUB = 'public';
const OUT = 'public/press/programistok-belka-2500x400.svg';
const TMP = fs.mkdtempSync('/tmp/belka-');

// --- płótno (mm) ---
const W = 2500;
const H = 400;
const MARGIN_X = 70;
const PAD_TOP = 14;
const ROW_GAP = 30; // odstęp między wierszami
const LABEL_SPACE = 30; // pasek na podpis grupy nad wierszem
const TEMPER = 0.56; // >0.5 przycina „optyczne pole” bardzo szerokich znaków
const H_MIN = 18;

const INK = '#14130f';
const RULE = '#d8d6cf';
const BG = '#ffffff';

// --- dane ---
const rows = [
  {
    band: 200, // maksymalna wysokość logotypu
    gap: 90, // odstęp między logotypami w grupie
    gutter: 140, // odstęp między grupami (na środku kreska)
    wMax: 900, // limit szerokości, żeby szerokie wordmarki nie zjadły wiersza
    labelSize: 17,
    groups: [
      {
        label: 'Współpraca i wsparcie',
        items: [
          { file: 'infotech.svg', name: 'Fundacja INFOTECH' },
          { file: 'wi.svg', name: 'Wydział Informatyki PB' },
        ],
      },
      {
        label: 'Partner strategiczny',
        items: [{ file: 'wojewodztwo-podlaskie.svg', name: 'Województwo Podlaskie' }],
      },
      {
        label: 'Patronat honorowy',
        items: [{ file: 'patronat-rektora-pb.svg', name: 'Patronat Rektora PB' }],
      },
    ],
  },
];

// --- wczytywanie logotypów ---
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const round = (v, d = 3) => Number(v.toFixed(d));

function loadSvg(file, key) {
  const raw = fs.readFileSync(`${PUB}/${file}`, 'utf8');
  const openTag = raw.match(/<svg[\s\S]*?>/)[0];
  const attr = (n) => (openTag.match(new RegExp(`${n}="([^"]+)"`)) || [])[1];
  const vb = attr('viewBox');
  let box;
  if (vb) box = vb.trim().split(/[\s,]+/).map(Number);
  else box = [0, 0, parseFloat(attr('width')), parseFloat(attr('height'))];

  let body = raw
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!DOCTYPE[\s\S]*?>/g, '')
    .replace(/^[\s\S]*?<svg[\s\S]*?>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/<metadata[\s\S]*?<\/metadata>/g, '')
    // elementy i atrybuty z przestrzeni nazw Inkscape'a psują walidację pliku wynikowego
    .replace(/<sodipodi:namedview[\s\S]*?(?:\/>|<\/sodipodi:namedview>)/g, '')
    .replace(/<(inkscape|sodipodi):[\w-]+[\s\S]*?(?:\/>|<\/\1:[\w-]+>)/g, '')
    .replace(/\s(?:inkscape|sodipodi):[\w-]+="[^"]*"/g, '')
    // ramka pomocnicza w logotypie cronn
    .replace(/<path[^>]*stroke="#d3d2d2"[^>]*\/>/g, '')
    .trim();

  // ids muszą być unikalne w docelowym pliku
  const ids = [...new Set([...body.matchAll(/id="([^"]+)"/g)].map((m) => m[1]))];
  for (const id of ids) {
    const safe = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    body = body
      .replace(new RegExp(`id="${safe}"`, 'g'), `id="${key}-${id}"`)
      .replace(new RegExp(`url\\(#${safe}\\)`, 'g'), `url(#${key}-${id})`)
      .replace(new RegExp(`(xlink:href|href)="#${safe}"`, 'g'), `$1="#${key}-${id}"`);
  }
  return { kind: 'svg', box, body };
}

function loadRaster(file) {
  let png = `${PUB}/${file}`;
  if (!file.endsWith('.png')) {
    png = `${TMP}/${file.replace(/\.\w+$/, '.png')}`;
    execFileSync('sips', ['-s', 'format', 'png', `${PUB}/${file}`, '--out', png], { stdio: 'ignore' });
  }
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', png], { encoding: 'utf8' });
  const w = Number(out.match(/pixelWidth:\s*(\d+)/)[1]);
  const h = Number(out.match(/pixelHeight:\s*(\d+)/)[1]);
  const data = fs.readFileSync(png).toString('base64');
  return { kind: 'raster', box: [0, 0, w, h], data };
}

let n = 0;
for (const row of rows) {
  for (const g of row.groups) {
    for (const it of g.items) {
      const key = `l${n++}`;
      // gdy obok rastra pojawi się plik .svg o tej samej nazwie, bierzemy wektor
      const vector = it.file.replace(/\.\w+$/, '.svg');
      if (!it.file.endsWith('.svg') && fs.existsSync(`${PUB}/${vector}`)) it.file = vector;
      const asset = it.file.endsWith('.svg') ? loadSvg(it.file, key) : loadRaster(it.file);
      Object.assign(it, asset, { key, weight: it.scale ?? 1 });
      it.ratio = it.box[2] / it.box[3];
    }
  }
}

// --- rozmiary w obrębie wiersza: równe „pole optyczne”, przycięte limitami wiersza ---
const avail = W - 2 * MARGIN_X;

function layoutRow(row) {
  const items = row.groups.flatMap((g) => g.items);
  const fixedGaps =
    (row.groups.length - 1) * row.gutter +
    row.groups.reduce((s, g) => s + (g.items.length - 1) * row.gap, 0);

  const sizesFor = (k) =>
    items.map((it) => {
      let h = Math.min(row.band, Math.max(H_MIN, (k * it.weight) / it.ratio ** TEMPER));
      let w = h * it.ratio;
      if (w > row.wMax) {
        w = row.wMax;
        h = w / it.ratio;
      }
      return { it, w, h };
    });

  let lo = 1;
  let hi = 4000;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    const total = sizesFor(mid).reduce((s, x) => s + x.w, 0) + fixedGaps;
    if (total > avail) hi = mid;
    else lo = mid;
  }
  const sized = sizesFor(lo);
  const used = sized.reduce((s, x) => s + x.w, 0) + fixedGaps;
  // gdy limity wysokości przytną logotypy, resztę szerokości rozdajemy na odstępy
  const slots = items.length - 1 + (row.groups.length - 1) * 0.6;
  const extra = slots > 0 ? (avail - used) / slots : 0;
  return { items, sized, extra };
}

const laid = rows.map(layoutRow);

// --- rysowanie ---
const parts = [];
const rowHeights = laid.map(({ sized }) => Math.max(...sized.map((s) => s.h)));
const blockH =
  rowHeights.reduce((s, h) => s + LABEL_SPACE + h, 0) + (rows.length - 1) * ROW_GAP;
let y = Math.max(PAD_TOP, (H - blockH) / 2);

rows.forEach((row, ri) => {
  const { sized, extra } = laid[ri];
  const rowH = rowHeights[ri];
  const labelBaseline = y + row.labelSize;
  const bandTop = y + LABEL_SPACE;
  const centerY = bandTop + rowH / 2;

  let x = MARGIN_X;
  let idx = 0;

  row.groups.forEach((g, gi) => {
    parts.push(
      `  <text x="${round(x)}" y="${round(labelBaseline)}" font-family="Inter, Arial, Helvetica, sans-serif" font-size="${row.labelSize}" font-weight="600" letter-spacing="${round(row.labelSize * 0.18, 2)}" fill="${INK}" fill-opacity="0.5">${esc(g.label.toUpperCase())}</text>`
    );

    g.items.forEach((_, ii) => {
      const { it, w, h } = sized[idx++];
      const ly = centerY - h / 2;
      const clip = it.radius ? ` clip-path="url(#clip-${it.key})"` : '';
      if (it.radius) {
        parts.push(
          `  <clipPath id="clip-${it.key}"><rect x="${round(x)}" y="${round(ly)}" width="${round(w)}" height="${round(h)}" rx="${round(Math.min(w, h) * it.radius)}"/></clipPath>`
        );
      }
      parts.push(`  <!-- ${esc(it.name)} -->`);
      if (it.kind === 'svg') {
        const sc = w / it.box[2];
        parts.push(
          `  <g${clip} transform="translate(${round(x)} ${round(ly)}) scale(${round(sc, 6)}) translate(${round(-it.box[0], 4)} ${round(-it.box[1], 4)})">\n${it.body}\n  </g>`
        );
      } else {
        parts.push(
          `  <image${clip} x="${round(x)}" y="${round(ly)}" width="${round(w)}" height="${round(h)}" preserveAspectRatio="xMidYMid meet" xlink:href="data:image/png;base64,${it.data}"/>`
        );
      }
      x += w;
      if (ii < g.items.length - 1) x += row.gap + extra;
    });

    if (gi < row.groups.length - 1) {
      const step = row.gutter + extra * 1.6;
      const rx = round(x + step / 2);
      parts.push(
        `  <line x1="${rx}" y1="${round(labelBaseline - row.labelSize)}" x2="${rx}" y2="${round(bandTop + rowH)}" stroke="${RULE}" stroke-width="1.2"/>`
      );
      x += step;
    }
  });

  y = bandTop + rowH + ROW_GAP;
});

const contentBottom = y - ROW_GAP;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">
  <title>Programistok 2026 — belka partnersko-sponsorska (${W} × ${H} mm)</title>
  <rect width="${W}" height="${H}" fill="${BG}"/>
${parts.join('\n')}
</svg>
`;

fs.writeFileSync(OUT, svg);

// wersja PDF dla drukarni (jeśli w systemie jest rsvg-convert)
const PDF = OUT.replace(/\.svg$/, '.pdf');
try {
  execFileSync('rsvg-convert', ['-f', 'pdf', '-o', PDF, OUT], { stdio: 'ignore' });
} catch {
  console.log('(pominięto PDF — brak rsvg-convert)');
}

fs.rmSync(TMP, { recursive: true, force: true });

console.log(`${OUT}  ${(svg.length / 1024 / 1024).toFixed(2)} MB`);
console.log(`treść kończy się na ${contentBottom.toFixed(0)} mm z ${H} mm wysokości`);
laid.forEach(({ sized, extra }, ri) => {
  console.log(`\nwiersz ${ri + 1}: dodatkowy odstęp ${extra.toFixed(0)} mm`);
  console.table(
    sized.map((s) => ({
      logo: s.it.name,
      'szer. [mm]': +s.w.toFixed(1),
      'wys. [mm]': +s.h.toFixed(1),
      'dpi 1:1': s.it.kind === 'svg' ? 'wektor' : Math.round(s.it.box[2] / (s.w / 25.4)),
    }))
  );
});
