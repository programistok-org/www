// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

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
  integrations: [publicDirIndex],
  vite: {
    plugins: [tailwindcss()],
  },
});
