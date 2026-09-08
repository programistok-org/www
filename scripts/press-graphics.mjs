// Generator grafik prasowych Programistok 2026.
// Renderuje szablony HTML przez headless Chrome do PNG (2x).
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const OUT = resolve(process.argv[2] || `${REPO}/public/press/grafiki`);
const TMP = `${REPO}/.astro/press-tmp`;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const INTER = `${REPO}/node_modules/@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2`;
const sygnetDark = readFileSync(`${REPO}/public/programistok-sygnet-white.svg`, 'utf8'); // biały segment — na ciemnym tle
const sygnetLight = readFileSync(`${REPO}/public/programistok-sygnet.svg`, 'utf8');

const C = {
  ink: '#14130F',
  cream: '#F4F2EC',
  creamDim: '#D0CCC2',
  faint: '#A8A399',
  red: '#DC1945',
  blue: '#0296D8',
  yellow: '#F7D33D',
  paper: '#F5F3EE',
  muted: '#565249',
  hair: 'rgba(244,242,236,.16)',
  hairInk: 'rgba(20,19,15,.16)',
};

const base = (w, h, body) => `<!doctype html><html lang="pl"><head><meta charset="utf-8">
<style>
@font-face{font-family:"Inter";src:url("file://${INTER}") format("woff2");font-weight:100 900;font-display:block}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${w}px;height:${h}px;overflow:hidden}
body{font-family:"Inter",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.stage{position:relative;width:${w}px;height:${h}px;overflow:hidden;display:flex;flex-direction:column}
.dots{display:flex}
.dots i{border-radius:3px;display:block}
.eyebrow{font-weight:700;letter-spacing:.18em;text-transform:uppercase}
.title{font-weight:700;letter-spacing:-.035em;line-height:.92;white-space:nowrap}
.bar{position:absolute;left:0;right:0;bottom:0;display:flex}
.bar span{height:100%;flex:1}
svg{display:block}
</style></head><body>${body}</body></html>`;

const dots = (size, gap) =>
  `<div class="dots" style="gap:${gap}px">${[C.red, C.blue, C.creamDim, C.yellow]
    .map((c) => `<i style="width:${size}px;height:${size}px;background:${c}"></i>`)
    .join('')}</div>`;

const sygnetAt = (w, onDark = true) =>
  (onDark ? sygnetDark : sygnetLight).replace('<svg ', `<svg style="width:${w}px;height:auto;flex:none" `);

const bar = (h) =>
  `<div class="bar" style="height:${h}px"><span style="background:${C.red}"></span><span style="background:${C.blue}"></span><span style="background:${C.yellow}"></span></div>`;

const chips = (s, onDark) =>
  `<div style="display:flex;gap:${Math.round(s.chip * 0.6)}px;flex-wrap:wrap">
    ${[
      ['Ścieżka IT', C.blue],
      ['Ścieżka Biznes', C.red],
    ]
      .map(
        ([label, col]) => `<div style="display:flex;align-items:center;gap:${Math.round(s.chip * 0.5)}px;border:${s.chipB}px solid ${onDark ? C.hair : C.hairInk};border-radius:999px;padding:${Math.round(s.chip * 0.5)}px ${Math.round(s.chip * 1.0)}px">
          <i style="width:${Math.round(s.chip * 0.6)}px;height:${Math.round(s.chip * 0.6)}px;border-radius:2px;background:${col};display:block"></i>
          <span style="font-size:${s.chip}px;font-weight:600;letter-spacing:-.01em;color:${onDark ? C.cream : C.ink}">${label}</span>
        </div>`
      )
      .join('')}
  </div>`;

// wspólny korpus key visuala — wersje ciemna i jasna różnią się tylko paletą
function keyVisualBody({ w, h, s, onDark }) {
  const fg = onDark ? C.cream : C.ink;
  const dim = onDark ? C.creamDim : C.muted;
  return base(
    w,
    h,
    `<div class="stage" style="background:${onDark ? C.ink : C.paper};color:${fg};padding:${s.pad}px ${s.pad}px ${s.pad + s.barH}px">
      <header style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          ${dots(s.dot, Math.round(s.dot * 0.62))}
          <div class="eyebrow" style="margin-top:${Math.round(s.dot * 1.5)}px;font-size:${s.eyebrow}px;color:${onDark ? C.faint : C.muted}">// Konferencja IT &amp; Business</div>
        </div>
        ${sygnetAt(s.mark, onDark)}
      </header>

      <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;gap:${Math.round(s.title * 0.22)}px">
        ${chips(s, onDark)}
        <div>
          ${
            s.wide
              ? `<h1 class="title" style="font-size:${s.title}px">Programistok<span style="color:${C.red}">'26</span></h1>`
              : `<h1 class="title" style="font-size:${s.title}px">Programistok</h1>
                 <h1 class="title" style="font-size:${s.titleYear}px;color:${C.red}">'26</h1>`
          }
          <div style="display:flex;align-items:center;gap:${Math.round(s.date * 0.45)}px;margin-top:${Math.round(s.title * 0.16)}px">
            <i style="width:${Math.round(s.date * 0.42)}px;height:${Math.round(s.date * 0.42)}px;background:${C.red};border-radius:3px;display:block;flex:none"></i>
            <div style="font-size:${s.date}px;font-weight:700;letter-spacing:-.01em">25–26.09.2026</div>
          </div>
          <p style="margin-top:${Math.round(s.sub * 0.7)}px;font-size:${s.sub}px;line-height:1.35;color:${dim}">Politechnika Białostocka · Białystok</p>
        </div>
      </div>
      ${bar(s.barH)}
    </div>`
  );
}

const keyVisual = (a) => keyVisualBody({ ...a, onDark: true });
const keyVisualLight = (a) => keyVisualBody({ ...a, onDark: false });

// ——— plansza: konferencja w liczbach ———
function facts({ w, h, s }) {
  const items = [
    ['2', 'dni konferencji', C.red],
    ['500+', 'uczestników', C.blue],
    ['24+', 'prezentacji', C.yellow],
    ['2', 'ścieżki tematyczne', C.creamDim],
  ];
  // formaty poziome: jeden rząd czterech liczb; kwadrat/pion: siatka 2×2
  const cols = s.wide ? 4 : 2;
  const gap = Math.round(s.col * (s.wide ? 0.04 : 0.07));
  const cell = (s.col - gap * (cols - 1)) / cols;
  // "500+" to najszerszy napis — ≈ 2.3em w Inter Bold
  const num = Math.round(Math.min(cell / 2.3, s.col * 0.16));
  const lab = Math.round(num * 0.3);
  return base(
    w,
    h,
    `<div class="stage" style="background:${C.ink};color:${C.cream};padding:${s.pad}px ${s.pad}px ${s.pad + s.barH}px;gap:${Math.round(s.pad * 0.8)}px">
      <header style="display:flex;justify-content:space-between;align-items:flex-start">
        <div class="eyebrow" style="font-size:${s.eyebrow}px;color:${C.faint}">// Programistok 2026 · w liczbach</div>
        ${sygnetAt(s.mark)}
      </header>
      <div style="flex:1;display:grid;grid-template-columns:repeat(${cols},1fr);align-content:center;gap:${gap}px">
        ${items
          .map(
            ([n, l, col]) => `<div style="border-top:${s.rule}px solid ${col};padding-top:${Math.round(lab * 0.8)}px">
              <div style="font-size:${num}px;font-weight:700;letter-spacing:-.04em;line-height:.9;color:${col};white-space:nowrap">${n}</div>
              <div style="margin-top:${Math.round(lab * 0.5)}px;font-size:${lab}px;color:${C.creamDim};line-height:1.25">${l}</div>
            </div>`
          )
          .join('')}
      </div>
      <div style="font-size:${s.foot}px;color:${C.faint};line-height:1.4">25–26.09.2026 · Politechnika Białostocka, Białystok · programistok.org</div>
      ${bar(s.barH)}
    </div>`
  );
}

// Skala typograficzna. Tytuł liczony z szerokości kolumny tekstu, żeby nigdy
// nie wyszedł poza kadr — Inter Bold ≈ 7.7em na "Programistok'26", 6.3em na
// samo "Programistok" (formaty pionowe łamią tytuł na dwie linie).
const TITLE_EM = 7.7;
const TITLE_EM_STACKED = 6.3;
const scaleFor = (w, h) => {
  const k = Math.min(w, h);
  const wide = w / h > 1.4;
  const pad = Math.round(w * (wide ? 0.055 : 0.075));
  const col = w - 2 * pad;
  const title = Math.floor(col / (wide ? TITLE_EM : TITLE_EM_STACKED));
  return {
    wide,
    col,
    titleYear: Math.round(title * 1.55),
    pad,
    dot: Math.round(k * 0.022),
    eyebrow: Math.round(k * 0.021),
    mark: Math.round(k * 0.13),
    title,
    date: Math.round(title * 0.36),
    sub: Math.round(title * 0.22),
    chip: Math.round(k * (wide ? 0.024 : 0.03)),
    chipB: Math.max(2, Math.round(k * 0.0022)),
    barH: Math.max(6, Math.round(k * 0.012)),
    rule: Math.max(3, Math.round(k * 0.005)),
    foot: Math.round(col * 0.022),
  };
};

const JOBS = [
  ['key-visual-1920x1080', 1920, 1080, keyVisual],
  ['key-visual-1200x630', 1200, 630, keyVisual],
  ['key-visual-1080x1080', 1080, 1080, keyVisual],
  ['key-visual-1080x1350', 1080, 1350, keyVisual],
  ['key-visual-jasny-1920x1080', 1920, 1080, keyVisualLight],
  ['w-liczbach-1920x1080', 1920, 1080, facts],
  ['w-liczbach-1080x1080', 1080, 1080, facts],
];

for (const [name, w, h, tpl] of JOBS) {
  const s = scaleFor(w, h);
  const file = `${TMP}/${name}.html`;
  writeFileSync(file, tpl({ w, h, s }));
  execFileSync(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=2',
      `--window-size=${w},${h}`,
      `--screenshot=${OUT}/${name}.png`,
      `file://${file}`,
    ],
    { stdio: 'ignore' }
  );
  console.log('✓', name, `${w}x${h} @2x`);
}
