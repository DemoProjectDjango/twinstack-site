#!/usr/bin/env node
/**
 * Validates the built site before it goes anywhere. Run after build.
 *
 *   node scripts/check.js
 *
 * Fails the build on broken internal links or duplicate URLs. Warns on missing
 * or overlong SEO fields, missing alt text and thin pages.
 */

import fs from 'node:fs';
import path from 'node:path';
import { paths, loadSite } from './lib/content.js';

if (!fs.existsSync(paths.dist)) {
  console.error('\n  dist/ does not exist. Run the build first.\n');
  process.exit(1);
}

const { all, site } = loadSite();
const errors = [];
const warnings = [];

// Mirrors scripts/build.js: in development every internal href/src is written
// with a /dist prefix, so links must be stripped back to their real dist/
// path before checking they resolve to a file that was actually written.
const base = process.env.NODE_ENV === 'development' ? '/dist' : '';
function stripBase(href) {
  return base && href.startsWith(base) ? href.slice(base.length) || '/' : href;
}

/* Every URL the built site actually serves */
const served = new Set();
(function walk(dir, prefix = '') {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walk(full, `${prefix}/${item.name}`);
    else if (item.name === 'index.html') served.add(`${prefix}/`);
    else served.add(`${prefix}/${item.name}`);
  }
})(paths.dist);

/* Duplicate URLs */
const seen = new Map();
for (const entry of all) {
  if (seen.has(entry.url)) {
    errors.push(`duplicate URL ${entry.url}: ${seen.get(entry.url)} and ${entry.sourceFile}`);
  }
  seen.set(entry.url, entry.sourceFile);
}

/* Internal links and images */
const linkPattern = /(?:href|src)="(\/[^"#?]*)(?:[#?][^"]*)?"/g;
for (const entry of all) {
  const file = path.join(paths.dist, entry.url === '/' ? 'index.html' : entry.url.endsWith('.html') ? entry.url.slice(1) : `${entry.url.slice(1)}index.html`);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');

  for (const [, href] of html.matchAll(linkPattern)) {
    const bare = stripBase(href);
    const target = bare.endsWith('/') || path.extname(bare) ? bare : `${bare}/`;
    if (!served.has(target) && !served.has(bare)) {
      errors.push(`${entry.url} links to missing ${href}`);
    }
  }

  const imagesWithoutAlt = [...html.matchAll(/<img (?![^>]*\balt=)[^>]*>/g)];
  if (imagesWithoutAlt.length) warnings.push(`${entry.url}: ${imagesWithoutAlt.length} image(s) without alt`);
}

/* SEO and content hygiene */
for (const entry of all) {
  if (!entry.description) warnings.push(`${entry.url}: no description`);
  else if (entry.description.length > 175) warnings.push(`${entry.url}: description is ${entry.description.length} chars`);
  if (entry.title.length > 65) warnings.push(`${entry.url}: title is ${entry.title.length} chars`);
  if (entry.collection === 'blog' && !entry.date) errors.push(`${entry.sourceFile}: blog post without a date`);
  if (entry.body.trim().length < 120 && entry.collection !== 'pages') {
    warnings.push(`${entry.url}: very little body content`);
  }
}

/* Report */
const dedupe = (list) => [...new Set(list)];
for (const warning of dedupe(warnings)) console.log(`  warning  ${warning}`);
for (const error of dedupe(errors)) console.error(`  error    ${error}`);

console.log(`\n  ${site.name}: ${all.length} pages checked, ${dedupe(errors).length} errors, ${dedupe(warnings).length} warnings\n`);
process.exit(dedupe(errors).length ? 1 : 0);
