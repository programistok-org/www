// Wykrywa twarze na zdjęciach prelegentów i zapisuje je do src/data/faces.json,
// żeby /capture kadrował pod twarz, a nie pod środek zdjęcia.
// Korzysta z FaceDetector w headless Chrome (flaga experimental web platform features).
//
// Użycie: node scripts/detect-faces.mjs
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const DIR = join(REPO, 'public/prelegenci');
const OUT = join(REPO, 'src/data/faces.json');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9334;

const photos = readdirSync(DIR).filter((f) => /\.(webp|jpe?g|png)$/i.test(f)).sort();

// FaceDetector potrzebuje obrazów z tego samego originu co strona, więc serwujemy je sami
const server = createServer((req, res) => {
  const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\/prelegenci\//, '');
  if (req.url === '/') { res.end('<!doctype html><title>faces</title>'); return; }
  try { res.end(readFileSync(join(DIR, name))); } catch { res.statusCode = 404; res.end(); }
}).listen(0);
const origin = `http://127.0.0.1:${server.address().port}`;

const profile = mkdtempSync(join(tmpdir(), 'faces-'));
const chrome = spawn(CHROME, ['--headless=new', '--enable-experimental-web-platform-features', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, 'about:blank']);

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

await send('Page.enable');
await send('Page.navigate', { url: origin });
await new Promise((r) => setTimeout(r, 800));

const { result } = await send('Runtime.evaluate', {
  awaitPromise: true,
  returnByValue: true,
  expression: `(async () => {
    if (!('FaceDetector' in window)) throw new Error('brak FaceDetector w tej wersji Chrome');
    const fd = new FaceDetector({ fastMode: false, maxDetectedFaces: 5 });
    const out = {};
    for (const f of ${JSON.stringify(photos)}) {
      const img = new Image();
      img.src = '/prelegenci/' + f;
      await img.decode();
      const faces = await fd.detect(img);
      if (!faces.length) continue;
      // największa twarz to prelegent, reszta to zwykle tło
      const b = faces.map((x) => x.boundingBox).sort((a, c) => c.width * c.height - a.width * a.height)[0];
      const W = img.naturalWidth, H = img.naturalHeight;
      const r = (n) => Math.round(n * 1000) / 1000;
      out['/prelegenci/' + f] = { cx: r((b.x + b.width / 2) / W), cy: r((b.y + b.height / 2) / H), h: r(b.height / H) };
    }
    return out;
  })()`,
});

ws.close();
// profil wolno usunąć dopiero, gdy Chrome skończy do niego pisać
await new Promise((r) => { chrome.once('exit', r); chrome.kill(); });
server.close();
rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });

if (result.exceptionDetails || !result.result) {
  console.error(result.exceptionDetails?.exception?.description || result);
  process.exit(1);
}
const faces = result.result.value;
writeFileSync(OUT, JSON.stringify(faces, null, 2) + '\n');
const missing = photos.filter((f) => !faces['/prelegenci/' + f]);
console.log(`✓ ${Object.keys(faces).length}/${photos.length} twarzy → src/data/faces.json`);
if (missing.length) console.log(`  bez twarzy: ${missing.join(', ')}`);
process.exit(0);
