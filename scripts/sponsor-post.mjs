// Generator postów sponsorskich 1080×1350 — ten sam layout co tryb "sponsor" w /capture,
// tyle że bez klikania: rysuje na canvasie w headless Chrome i zrzuca PNG.
//
// Użycie: node scripts/sponsor-post.mjs <logo> <slug> [--tier "Sponsor"] [--head "SPONSOREM\nPROGRAMISTOKU\nJEST"]
// np.:    node scripts/sponsor-post.mjs public/ds360.png ds360
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const [logoArg, slug, ...rest] = process.argv.slice(2);
if (!logoArg || !slug) {
  console.error('użycie: node scripts/sponsor-post.mjs <logo> <slug> [--tier ...] [--head ...]');
  process.exit(1);
}
const flag = (name, fallback) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 && rest[i + 1] ? rest[i + 1] : fallback;
};
const flagSize = (a) => {
  const i = a.indexOf('--size');
  return i >= 0 ? a[i + 1] : null;
};

const [W, H] = (flagSize(rest) || '1080x1350').split('x').map(Number);
// story (9:16) chowa treść w bezpiecznym polu — pasek IG/FB zjada górę i dół kadru
const SAFE_TOP = H / W >= 1.5 ? Math.round(H * 0.14) : 0;
const SAFE_BOTTOM = H / W >= 1.5 ? Math.round(H * 0.2) : 0;
const TIER = flag('tier', 'Sponsor');
const HEAD = flag('head', 'SPONSOREM\nPROGRAMISTOKU\nJEST');
const FOOT = flag('foot', '25–26.09.2026 // Białystok');
const OUT = resolve(flag('out', `${REPO}/public/social/sponsor-${slug}-${W}x${H}.png`));

// wartości przeniesione 1:1 z drawSponsor() w src/pages/capture.astro
const BG = '#1c1b16';
const CARD_BG = '#ffffff';
const TEXT = '#f4f2ec';
const SYGNET_RATIO = 0.12;

const dataUri = (path, mime) => `data:${mime};base64,${readFileSync(path).toString('base64')}`;
const MONTSERRAT = dataUri(
  `${REPO}/node_modules/@fontsource/montserrat/files/montserrat-latin-ext-800-normal.woff2`,
  'font/woff2'
);
const logoPath = resolve(logoArg);
const logoMime = logoPath.endsWith('.svg') ? 'image/svg+xml' : logoPath.endsWith('.webp') ? 'image/webp' : 'image/png';
const LOGO = dataUri(logoPath, logoMime);
const SYGNET = dataUri(`${REPO}/public/programistok-sygnet-white.svg`, 'image/svg+xml');

const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8">
<style>
@font-face{font-family:"Montserrat";src:url("${MONTSERRAT}") format("woff2");font-weight:800;font-display:block}
*{margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:${BG}}
canvas{display:block}
</style></head><body>
<canvas id="c" width="${W}" height="${H}"></canvas>
<script>
const W = ${W}, H = ${H};
const ctx = document.getElementById('c').getContext('2d');
const load = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });

function drawRounded(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
const monoFont = (px) => \`600 \${px}px ui-monospace, "SF Mono", Menlo, monospace\`;
const FONT = 'Montserrat, "Helvetica Neue", Arial, sans-serif';

function fitFont(lines, maxW, startPx) {
  let px = startPx;
  while (px > 12) {
    ctx.font = \`800 \${px}px \${FONT}\`;
    if (Math.max(...lines.map((l) => ctx.measureText(l).width)) <= maxW) break;
    px -= 2;
  }
  return px;
}

async function draw() {
  const sygnetImg = await load(${JSON.stringify(SYGNET)});
  const logoImg = await load(${JSON.stringify(LOGO)});

  ctx.fillStyle = ${JSON.stringify(BG)};
  ctx.fillRect(0, 0, W, H);

  const m = W * 0.075;
  const top = ${SAFE_TOP} + m;
  const bottom = H - ${SAFE_BOTTOM} - m;
  const contentH = bottom - top;

  const sygnet = Math.min(W, H) * ${SYGNET_RATIO};
  const r0 = sygnet / Math.max(sygnetImg.naturalWidth, sygnetImg.naturalHeight);
  const mw = sygnetImg.naturalWidth * r0, mh = sygnetImg.naturalHeight * r0;
  ctx.drawImage(sygnetImg, W - m - mw, top + (sygnet - mh) / 2, mw, mh);

  const labelPx = Math.round(Math.min(W, H) * 0.026);
  ctx.letterSpacing = \`\${Math.round(labelPx * 0.18)}px\`;
  ctx.font = monoFont(labelPx);
  ctx.fillStyle = ${JSON.stringify(TEXT)};
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(${JSON.stringify(`// ${TIER}`)}.toUpperCase(), m, top + sygnet * 0.42);

  const foot = ${JSON.stringify(FOOT)}.trim();
  let footTop = bottom;
  if (foot) {
    ctx.font = monoFont(labelPx);
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(foot.toUpperCase(), m, bottom);
    footTop = bottom - labelPx * 1.6;
  }
  ctx.letterSpacing = '0px';

  const headLines = ${JSON.stringify(HEAD)}.split('\\n').map((s) => s.trim()).filter(Boolean);
  let headBottom = top + sygnet + contentH * 0.03;
  if (headLines.length) {
    const px = fitFont(headLines, W - m * 2, contentH * 0.11);
    ctx.font = \`800 \${px}px \${FONT}\`;
    ctx.fillStyle = ${JSON.stringify(TEXT)};
    ctx.textBaseline = 'middle';
    const lineH = px * 1.02;
    let y = top + sygnet + contentH * 0.05 + lineH / 2;
    for (const l of headLines) { ctx.fillText(l, m, y); y += lineH; }
    headBottom = y - lineH / 2 + lineH * 0.5;
  }

  const areaTop = headBottom + contentH * 0.04;
  const areaH = footTop - contentH * 0.04 - areaTop;
  // kafelek na całą wolną wysokość gubi logo w pustce
  const cardH = Math.min(areaH, (W - m * 2) * 0.72);
  const cardTop = areaTop + (areaH - cardH) / 2;

  ctx.fillStyle = ${JSON.stringify(CARD_BG)};
  drawRounded(m, cardTop, W - m * 2, cardH, W * 0.05);
  ctx.fill();

  const pad = Math.min(W - m * 2, cardH) * 0.16;
  const boxW = W - m * 2 - pad * 2;
  const boxH = cardH - pad * 2;
  const r1 = Math.min(boxW / logoImg.naturalWidth, boxH / logoImg.naturalHeight);
  const lw = logoImg.naturalWidth * r1, lh = logoImg.naturalHeight * r1;
  ctx.drawImage(logoImg, m + (W - m * 2 - lw) / 2, cardTop + (cardH - lh) / 2, lw, lh);

  document.title = 'done';
}

document.fonts.load('800 100px Montserrat').then(draw).catch(draw);
</script></body></html>`;

const TMP = `${REPO}/.astro/sponsor-post`;
mkdirSync(TMP, { recursive: true });
mkdirSync(dirname(OUT), { recursive: true });
const file = `${TMP}/${slug}.html`;
writeFileSync(file, html);

execFileSync(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--virtual-time-budget=4000',
    `--window-size=${W},${H}`,
    `--screenshot=${OUT}`,
    `file://${file}`,
  ],
  { stdio: 'ignore' }
);
console.log(`✓ ${OUT.replace(REPO + '/', '')} (${W}×${H})`);
