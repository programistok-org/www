// Plansze końcowe do pionowych filmów (9:16): wsparcie, partner strategiczny, patronat, sponsorzy, partnerzy.
// Ten sam język co posty sponsorskie (ciemne tło, białe kafelki, mono podpisy), tyle że
// układ robi HTML/CSS w headless Chrome, bo przy kilkunastu logotypach canvas byłby męczarnią.
//
// Użycie: node scripts/plansze-koncowe.mjs [--no-safe]
//   --no-safe  treść na cały kadr (bez pól bezpiecznych pod pasek IG/FB)
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const W = 1080;
const H = 1920;
const SAFE = !process.argv.includes('--no-safe');
const SAFE_TOP = SAFE ? Math.round(H * 0.14) : 0;
const SAFE_BOTTOM = SAFE ? Math.round(H * 0.2) : 0;
const M = Math.round(W * 0.075);

const BG = '#1c1b16';
const TEXT = '#f4f2ec';
const DARK_CARD = '#14130f';
const FOOT = '25–26.09.2026 // Białystok';

const boards = [
  {
    slug: 'wsparcie',
    tier: 'Współpraca i wsparcie',
    head: ['PROGRAMISTOK', 'POWSTAJE', 'DZIĘKI'],
    cols: 1,
    items: [
      { name: 'Fundacja INFOTECH', logo: 'infotech.svg' },
      { name: 'Wydział Informatyki PB', logo: 'wi.svg' },
    ],
  },
  {
    slug: 'partner-strategiczny',
    tier: 'Dziękujemy',
    head: ['PARTNER', 'STRATEGICZNY'],
    cols: 1,
    items: [{ name: 'Województwo Podlaskie', logo: 'wojewodztwo-podlaskie.svg' }],
  },
  {
    slug: 'patronat-honorowy',
    tier: 'Dziękujemy',
    head: ['PATRONAT', 'HONOROWY'],
    cols: 1,
    items: [{ name: 'Patronat Rektor Politechniki Białostockiej', logo: 'patronat-rektora-pb.svg' }],
  },
  {
    slug: 'sponsorzy',
    // bez nagłówka: jedenaście logotypów potrzebuje całej wysokości
    tier: 'Sponsorzy',
    head: [],
    cols: 2,
    items: [
      { name: 'cronn', logo: 'cronn.svg' },
      { name: 'PLUM', logo: 'plum.svg' },
      { name: 'Sii Polska', logo: 'sii.webp' },
      // logo na czarnej płycie, więc kafelek w tym samym kolorze
      { name: 'Commerce Weavers', logo: 'commerce-weavers.webp', bg: '#000' },
      { name: 'Aexol', logo: 'aexol.svg' },
      { name: 'Calamari', logo: 'calamari.webp' },
      { name: 'BlueRider.Software', logo: 'bluerider.webp' },
      { name: 'Simpligo', logo: 'simpligo.png' },
      { name: 'DS360', logo: 'ds360.webp' },
      // logo w bieli, więc ciemny kafelek zamiast białego
      { name: 'Spyrosoft', logo: 'spyrosoft-white.png', dark: true },
      { name: 'devstyle', logo: 'devstyle.png' },
    ],
  },
  {
    slug: 'partnerzy',
    tier: 'Partnerzy',
    head: [],
    cols: 2,
    items: [
      { name: 'Google for Education', logo: 'google-for-education.svg' },
      { name: 'Izba Przemysłowo-Handlowa w Białymstoku', logo: 'iph.svg' },
      { name: 'Podlaska Fundacja Rozwoju Regionalnego', logo: 'pfrr.svg' },
      // herb na granatowej płycie, więc kafelek w tym samym kolorze
      { name: 'Podlaski Klub Biznesu', logo: 'pkb.webp', bg: '#0b214e' },
      { name: 'Evoluma', logo: 'evoluma.svg' },
      { name: '4Podlaskie', logo: '4podlaskie.svg' },
      { name: 'Białostocki Park Naukowo-Technologiczny', logo: 'bpnt.svg' },
      { name: 'Polskie Towarzystwo Gospodarcze', logo: 'ptg.svg' },
    ],
  },
];

const MIME = { svg: 'image/svg+xml', webp: 'image/webp', png: 'image/png', woff2: 'font/woff2' };
const dataUri = (path) => `data:${MIME[path.split('.').pop()]};base64,${readFileSync(path).toString('base64')}`;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const FONTS = `${REPO}/node_modules/@fontsource/montserrat/files`;
const MONTSERRAT_LATIN = dataUri(`${FONTS}/montserrat-latin-800-normal.woff2`);
const MONTSERRAT_EXT = dataUri(`${FONTS}/montserrat-latin-ext-800-normal.woff2`);
const SYGNET = dataUri(`${REPO}/public/programistok-sygnet-white.svg`);

function page(b) {
  const cards = b.items
    .map(
      (it) =>
        `<div class="card${it.dark ? ' dark' : ''}"${it.bg ? ` style="background:${it.bg}"` : ''}><img src="${dataUri(`${REPO}/public/${it.logo}`)}" alt="${esc(it.name)}"></div>`
    )
    .join('\n');

  return `<!doctype html><html lang="pl"><head><meta charset="utf-8">
<style>
@font-face{font-family:"Montserrat";src:url("${MONTSERRAT_LATIN}") format("woff2");font-weight:800;
  unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:"Montserrat";src:url("${MONTSERRAT_EXT}") format("woff2");font-weight:800;
  unicode-range:U+0100-02AF,U+0304,U+0308,U+0329,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${BG};color:${TEXT}}
.frame{position:absolute;left:${M}px;right:${M}px;top:${SAFE_TOP + M / 2}px;bottom:${SAFE_BOTTOM + M / 2}px;display:flex;flex-direction:column}
.top{display:flex;justify-content:space-between;align-items:center;height:130px;flex:none}
.top img{height:130px}
.mono{font:600 28px ui-monospace,"SF Mono",Menlo,monospace;letter-spacing:5px;text-transform:uppercase}
h1{font:800 ${b.head.length > 1 ? 104 : 120}px/1.02 Montserrat,"Helvetica Neue",Arial,sans-serif;margin-top:48px;flex:none}
.grid{flex:1;min-height:0;margin:56px 0;display:grid;gap:24px;
  grid-template-columns:repeat(${b.cols},1fr);grid-template-rows:repeat(${Math.ceil(b.items.length / b.cols)},minmax(0,${b.cols > 1 ? 150 : b.items.length === 1 ? 620 : 360}px));align-content:center}
.card{background:#fff;border-radius:${b.cols > 1 ? 28 : 54}px;display:flex;align-items:center;justify-content:center;min-height:0;overflow:hidden}
.card.dark{background:${DARK_CARD};box-shadow:inset 0 0 0 2px #3a3830}
.card img{display:block}
/* nieparzysty ostatni kafelek na środek */
.grid .card:last-child:nth-child(odd){${b.cols > 1 ? 'grid-column:1/-1;justify-self:center;width:calc(50% - 12px)' : ''}}
.foot{flex:none}
</style></head><body>
<div class="frame">
  <div class="top"><span class="mono">// ${esc(b.tier)}</span><img src="${SYGNET}" alt=""></div>
  ${b.head.length ? `<h1>${b.head.map(esc).join('<br>')}</h1>` : ''}
  <div class="grid">${cards}</div>
  <div class="foot mono">${esc(FOOT)}</div>
</div>
<script>
// równe „pole optyczne”: szerokie wordmarki nie zjadają kafelka, kwadratowe znaki nie giną
const TEMPER = 0.56;
async function fit() {
  await document.fonts.ready;
  const imgs = [...document.querySelectorAll('.card img')];
  await Promise.all(imgs.map((i) => i.decode()));
  const pad = ${b.cols > 1 ? 0.2 : 0.22};
  const boxes = imgs.map((img) => {
    const c = img.parentElement.getBoundingClientRect();
    const p = Math.min(c.width, c.height) * pad;
    return { img, bw: c.width - 2 * p, bh: c.height - 2 * p, ratio: img.naturalWidth / img.naturalHeight };
  });
  const size = (b, k) => {
    let h = Math.min(b.bh, k / b.ratio ** TEMPER);
    let w = h * b.ratio;
    if (w > b.bw) { w = b.bw; h = w / b.ratio; }
    return { w, h };
  };
  // wspólne k z mediany, żeby jeden nietypowy znak nie zmniejszał wszystkich; resztę tnie kafelek
  const ks = boxes.map((b) => Math.min(b.bh * b.ratio ** TEMPER, b.bw / b.ratio ** (1 - TEMPER))).sort((a, c) => a - c);
  const k = ks[Math.floor((ks.length - 1) / 2)];
  for (const b of boxes) {
    const { w, h } = size(b, k);
    b.img.style.width = w + 'px';
    b.img.style.height = h + 'px';
  }
  document.title = 'done';
}
fit();
</script></body></html>`;
}

const TMP = `${REPO}/.astro/plansze-koncowe`;
const OUT_DIR = `${REPO}/public/social`;
mkdirSync(TMP, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

for (const b of boards) {
  const file = `${TMP}/${b.slug}.html`;
  const out = `${OUT_DIR}/plansza-${b.slug}-${W}x${H}.png`;
  writeFileSync(file, page(b));
  execFileSync(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--virtual-time-budget=4000',
      `--window-size=${W},${H}`,
      `--screenshot=${out}`,
      `file://${file}`,
    ],
    { stdio: 'ignore' }
  );
  console.log(`✓ ${out.replace(REPO + '/', '')}`);
}
