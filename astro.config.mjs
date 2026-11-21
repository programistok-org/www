// @ts-check
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// shortcut: pages hardcode root paths (/agenda, /prelegenci/…), so a sub-path build (astro build --base /hack/,
// the hzub.github.io preview) rewrites them in the output; make every link base-aware if the site must live under a sub-path for good.
let base = '/';
const rebaseRootPaths = {
  name: 'rebase-root-paths',
  hooks: {
    'astro:config:done': ({ config }) => {
      base = config.base.replace(/\/?$/, '/');
    },
    'astro:build:done': async ({ dir }) => {
      if (base === '/') return;
      const fresh = `(?!/|${base.slice(1)})`; // skip protocol-relative URLs and paths already under the base
      const attr = new RegExp(`(\\s[\\w:-]+=["'])/${fresh}`, 'g'); // href="/agenda", data-photo="/prelegenci/…"
      const cssUrl = new RegExp(`(url\\(["']?)/${fresh}`, 'g');
      // paths in scripts (SVGLoader, fetch, faces.json keys): only quoted strings ending in a file extension
      const asset = new RegExp(`(["'\`])/${fresh}([\\w./-]+\\.(?:svg|png|jpe?g|webp|gif|json))\\1`, 'g');
      const out = fileURLToPath(dir);
      for (const f of await readdir(out, { recursive: true })) {
        const ext = path.extname(f);
        if (!['.html', '.css', '.js'].includes(ext)) continue;
        const file = path.join(out, f);
        const src = await readFile(file, 'utf8');
        let s = src.replace(cssUrl, `$1${base}`).replace(asset, `$1${base}$2$1`);
        if (ext === '.html') s = s.replace(attr, `$1${base}`);
        if (s !== src) await writeFile(file, s);
      }
    },
  },
};

// https://astro.build/config
const publicDirIndex = {
  name: 'public-dir-index',
  hooks: {
    'astro:server:setup': ({ server }) => {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/gra') {
          res.writeHead(301, { Location: '/gra/' });
          return res.end();
        }
        if (req.url === '/gra/') req.url = '/gra/index.html';
        next();
      });
    },
  },
};

export default defineConfig({
  site: 'https://programistok.org',
  output: 'static',
  integrations: [publicDirIndex, rebaseRootPaths],
  vite: {
    plugins: [tailwindcss()],
  },
});
