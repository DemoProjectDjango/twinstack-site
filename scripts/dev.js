#!/usr/bin/env node
/**
 * Local preview server. Rebuilds on any change under content/, templates/,
 * assets/ or site.config.json, and serves dist/ with clean URLs.
 *
 *   node scripts/dev.js            http://localhost:4321
 *   PORT=8080 node scripts/dev.js
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { paths, ROOT } from './lib/content.js';

const PORT = Number(process.env.PORT || 4321);
const WATCHED = ['content', 'templates', 'styles', 'assets/js', 'assets/img', 'site.config.json', 'scripts'];

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

let building = false;

function rebuild(reason) {
  if (building) return;
  building = true;
  const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts/build.js'), '--drafts'], {
    stdio: 'inherit',
  });
  if (result.status !== 0) console.error(`  build failed (${reason})`);
  building = false;
}

rebuild('startup');

for (const target of WATCHED) {
  const full = path.join(ROOT, target);
  if (!fs.existsSync(full)) continue;
  let timer = null;
  fs.watch(full, { recursive: true }, (_event, filename) => {
    clearTimeout(timer);
    timer = setTimeout(() => rebuild(filename || target), 120);
  });
}

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const candidates = [
      path.join(paths.dist, url),
      path.join(paths.dist, url, 'index.html'),
      path.join(paths.dist, `${url}.html`),
    ];

    for (const candidate of candidates) {
      if (!candidate.startsWith(paths.dist)) break;
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        res.writeHead(200, {
          'Content-Type': TYPES[path.extname(candidate)] || 'application/octet-stream',
          'Cache-Control': 'no-store',
        });
        fs.createReadStream(candidate).pipe(res);
        return;
      }
    }

    const notFound = path.join(paths.dist, '404.html');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.existsSync(notFound) ? fs.readFileSync(notFound) : 'Not found');
  })
  .listen(PORT, () => {
    console.log(`\n  Preview: http://localhost:${PORT}  (drafts visible, watching for changes)\n`);
  });
