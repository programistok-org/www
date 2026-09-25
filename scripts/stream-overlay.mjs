// Tło pod stream w OBS, 3840×2160: jasne tło marki, siatka, dwa przezroczyste okna na wideo
// (stream1 2524×1420, stream2 1216×684 — ten sam układ co ciemne tło z ProgaMeetstoka),
// szerokie logo i logotypy partnerów pod nim. Rysuje na canvasie w headless Chrome.
//
// Użycie: node scripts/stream-overlay.mjs [plik.png]
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = resolve(process.argv[2] || 'programistok-stream-3840x2160.png');
const PORT = 9335;

const dataUri = (file) => `data:image/svg+xml;base64,${readFileSync(join(REPO, 'public', file)).toString('base64')}`;

const spec = {
  W: 3840,
  H: 2160,
  bg: '#f4f2ec',
  line: 'rgba(20,19,15,0.16)',
  // linie siatki (2 px) i okna na wideo, współrzędne 1:1 z ciemnego szablonu
  vLines: [32, 2558, 2590, 3808],
  hLines: [328, 1014, 1374, 1750],
  holes: [
    { x: 34, y: 330, w: 2524, h: 1420 },
    { x: 2592, y: 330, w: 1216, h: 684 },
  ],
  logo: { src: dataUri('programistok-wide.svg'), x: 2592, y: 1016, w: 1216, h: 358, width: 820 },
  partners: {
    x: 2592, y: 1376, w: 1216, h: 374, pad: 70, gap: 60,
    items: [dataUri('wojewodztwo-podlaskie.svg'), dataUri('infotech.svg'), dataUri('wi.svg')],
  },
};

const profile = mkdtempSync(join(tmpdir(), 'overlay-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank']);

let targets = [];
for (let i = 0; i < 40 && !targets.length; i++) {
  await new Promise((r) => setTimeout(r, 250));
  try { targets = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).filter((t) => t.type === 'page'); } catch {}
}
const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = {};
ws.onmessage = (e) => { const m = JSON.parse(e.data); pending[m.id]?.(m); delete pending[m.id]; };
const send = (method, params = {}) => new Promise((r) => { pending[++id] = r; ws.send(JSON.stringify({ id, method, params })); });

const { result } = await send('Runtime.evaluate', {
  awaitPromise: true,
  returnByValue: true,
  expression: `(async (S) => {
    // SVG bez width/height Chrome rasteryzuje w 300×150, więc wymuszamy duży rozmiar
    const load = async (uri, target = 3000) => {
      let txt = atob(uri.split(',')[1]);
      txt = new TextDecoder().decode(Uint8Array.from(txt, (c) => c.charCodeAt(0)));
      const vb = txt.match(/viewBox="\\s*([-\\d.]+)[\\s,]+([-\\d.]+)[\\s,]+([-\\d.]+)[\\s,]+([-\\d.]+)/);
      const ratio = vb ? Number(vb[4]) / Number(vb[3]) : 1;
      txt = txt.replace(/<svg([^>]*)>/, (_, a) => '<svg' + a.replace(/\\s(width|height)="[^"]*"/g, '') + ' width="' + target + '" height="' + Math.round(target * ratio) + '">');
      const img = new Image();
      img.src = URL.createObjectURL(new Blob([txt], { type: 'image/svg+xml' }));
      await img.decode();
      return img;
    };

    const c = document.createElement('canvas');
    c.width = S.W; c.height = S.H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = S.bg;
    ctx.fillRect(0, 0, S.W, S.H);
    ctx.fillStyle = S.line;
    for (const x of S.vLines) ctx.fillRect(x, 0, 2, S.H);
    for (const y of S.hLines) ctx.fillRect(0, y, S.W, 2);
    for (const h of S.holes) ctx.clearRect(h.x, h.y, h.w, h.h);

    const L = S.logo;
    const logo = await load(L.src, 4000);
    const lh = (L.width * logo.height) / logo.width;
    ctx.drawImage(logo, L.x + (L.w - L.width) / 2, L.y + (L.h - lh) / 2, L.width, lh);

    // logotypy partnerów w jednym rzędzie, o zbliżonej powierzchni (panoramiczne niższe, zwarte wyższe)
    const P = S.partners;
    const imgs = await Promise.all(P.items.map((u) => load(u)));
    const ratios = imgs.map((i) => i.width / i.height);
    const k = (P.w - P.pad * 2 - P.gap * (imgs.length - 1)) / ratios.reduce((n, r) => n + Math.sqrt(r), 0);
    let x = P.x + P.pad;
    imgs.forEach((img, i) => {
      const w = k * Math.sqrt(ratios[i]);
      const h = w / ratios[i];
      ctx.drawImage(img, x, P.y + (P.h - h) / 2, w, h);
      x += w + P.gap;
    });

    return c.toDataURL('image/png');
  })(${JSON.stringify(spec)})`,
});

ws.close();
await new Promise((r) => { chrome.once('exit', r); chrome.kill(); });
rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });

if (result.exceptionDetails) {
  console.error(result.exceptionDetails.exception?.description || result.exceptionDetails);
  process.exit(1);
}
writeFileSync(OUT, Buffer.from(result.result.value.split(',')[1], 'base64'));
console.log(`✓ ${OUT}`);
process.exit(0);
