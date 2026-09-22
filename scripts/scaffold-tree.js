#!/usr/bin/env node
/**
 * Scaffold the site's whole page structure from one tree file.
 *
 *   node scripts/scaffold-tree.js                       scaffold every missing page
 *   node scripts/scaffold-tree.js --dry-run              print the plan, write nothing
 *   node scripts/scaffold-tree.js --force                also overwrite files that already exist
 *   node scripts/scaffold-tree.js --file=scripts/other-tree.md   use a different tree file
 *
 * Reads scripts/site-tree.md — an indented bullet list of page paths, each
 * optionally followed by " — instruction" — and, for every path that doesn't
 * already have a file, writes a correctly-shaped frontmatter skeleton using
 * the same templates as `npm run new`. No Claude/API calls here: structure is
 * entirely mechanical, which is also why it costs no tokens.
 *
 * Path -> file mapping:
 *   index.html                                  -> content/pages/home.md          (url "/")
 *   404.html                                     -> content/pages/404.md           (noindex, navHidden)
 *   about.html                                    -> content/pages/about.md
 *   products/index.html                           -> content/pages/products.md     (the collection's listing page)
 *   products/some-app.html                        -> content/products/some-app.md
 *   services/who-sees-what/index.html              -> content/services/who-sees-what/index.md (slug "who-sees-what")
 *   services/who-sees-what/how-to-use.html          -> content/services/who-sees-what/how-to-use.md
 *
 * The first path segment is matched against each collection's directory name
 * in site.config.json; anything that doesn't match becomes a standalone page
 * under content/pages/, nested exactly as written.
 *
 * Filling in body content from each instruction is a separate step, not yet
 * built — this only produces the structure and placeholder copy.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readJson, slugify } from './lib/content.js';
import { scaffoldBody } from './lib/scaffold-templates.js';

const argv = process.argv.slice(2);
const flag = (name) => {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  return hit.includes('=') ? hit.split('=').slice(1).join('=') : true;
};

const dryRun = Boolean(flag('dry-run'));
const force = Boolean(flag('force'));
const treeFile = path.join(ROOT, String(flag('file') || 'scripts/site-tree.md'));

const site = readJson(path.join(ROOT, 'site.config.json'));

/* -------------------------------------------------------------- parse tree */

function parseTree(text) {
  const nodes = [];
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '');
    const bullet = /^\s*-\s+(.*)$/.exec(line);
    if (!bullet) continue;

    const rest = bullet[1];
    const split = /^(\S+)\s+(?:—|--)\s+(.*)$/.exec(rest);
    const rawPath = (split ? split[1] : rest).trim();
    const instruction = split ? split[2].trim() : '';
    if (!rawPath || !rawPath.endsWith('.html')) continue;

    nodes.push({ rawPath, instruction });
  }
  return nodes;
}

/* ------------------------------------------------------------ resolve path */

function collectionsByDirSlug() {
  const map = new Map();
  for (const [key, cfg] of Object.entries(site.collections)) {
    map.set(path.basename(cfg.dir), { key, cfg });
  }
  return map;
}

const dirSlugMap = collectionsByDirSlug();

function titleFromSlug(slug) {
  const words = slug.split('-').join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function segmentsFor(rawPath) {
  return rawPath
    .replace(/\.html$/, '')
    .split('/')
    .filter(Boolean)
    .map((seg) => (seg === 'index' || seg === '404' ? seg : slugify(seg)));
}

/** Maps one tree path to { type, file, slug, urlOverride, title, extra, exists } */
function resolveNode(rawPath) {
  const segments = segmentsFor(rawPath);

  if (segments.length === 1 && segments[0] === 'index') {
    return {
      type: 'pages',
      file: 'content/pages/home.md',
      slug: 'home',
      urlOverride: '/',
      layout: 'home',
      title: site.tagline || site.name,
    };
  }

  const [first, ...rest] = segments;
  const hit = dirSlugMap.get(first);

  if (hit && rest.length) {
    const { key, cfg } = hit;

    if (rest.length === 1 && rest[0] === 'index') {
      const url = cfg.index?.url || `/${first}.html`;
      return {
        type: 'pages',
        file: `content/pages/${first}.md`,
        slug: first,
        urlOverride: url,
        layout: cfg.index?.layout || `list-${first}`,
        title: cfg.index?.label || titleFromSlug(first),
      };
    }

    const last = rest[rest.length - 1];
    if (last === 'index') {
      const inner = rest.slice(0, -1);
      return {
        type: key,
        file: `${cfg.dir}/${inner.join('/')}/index.md`,
        slug: inner.join('/'),
        title: titleFromSlug(inner[inner.length - 1]),
      };
    }

    return {
      type: key,
      file: `${cfg.dir}/${rest.join('/')}.md`,
      slug: null, // matches the file's own relative path, no override needed
      title: titleFromSlug(last),
    };
  }

  // standalone page, nested exactly as written under content/pages/
  const relPath = segments.join('/');
  const is404 = relPath === '404';
  return {
    type: 'pages',
    file: `content/pages/${relPath}.md`,
    slug: relPath,
    urlOverride: is404 ? '/404.html' : null,
    title: is404 ? 'Page not found' : titleFromSlug(segments[segments.length - 1]),
    extra: is404 ? { noindex: true, navHidden: true } : {},
  };
}

/* --------------------------------------------------------------- generate */

function injectFrontmatterFields(body, fields) {
  // Insert extra "key: value" lines right after the "title:" line (or the
  // opening "---" if there isn't one) so files read the way a hand-written
  // one does, with slug/url/layout grouped near the top.
  const lines = body.split('\n');
  const titleAt = lines.findIndex((line) => /^title:\s/.test(line));
  const insertAt = titleAt >= 0 ? titleAt + 1 : (lines[0] === '---' ? 1 : 0);
  const extraLines = Object.entries(fields)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}: ${v}`);
  lines.splice(insertAt, 0, ...extraLines);
  return lines.join('\n');
}

function buildFile(node) {
  const today = new Date().toISOString().slice(0, 10);
  let body = scaffoldBody(node.type, {
    title: node.title,
    today,
    defaultAuthor: site.automation.defaultAuthor,
  });

  const fields = { ...(node.extra || {}) };
  if (node.slug) fields.slug = node.slug;
  if (node.urlOverride) fields.url = node.urlOverride;
  if (node.layout) fields.layout = node.layout;

  if (Object.keys(fields).length) body = injectFrontmatterFields(body, fields);
  return body;
}

/* -------------------------------------------------------------------- run */

if (!fs.existsSync(treeFile)) {
  console.error(`\n  Tree file not found: ${path.relative(ROOT, treeFile)}\n`);
  process.exit(1);
}

const nodes = parseTree(fs.readFileSync(treeFile, 'utf8'));
if (!nodes.length) {
  console.log(`\n  No page paths found in ${path.relative(ROOT, treeFile)}.\n`);
  process.exit(0);
}

let created = 0;
let skipped = 0;
let failed = 0;

console.log(`\n  Scaffolding from ${path.relative(ROOT, treeFile)} (${nodes.length} path${nodes.length === 1 ? '' : 's'})\n`);

for (const { rawPath, instruction } of nodes) {
  let node;
  try {
    node = resolveNode(rawPath);
  } catch (error) {
    console.error(`  ! ${rawPath} — could not resolve: ${error.message}`);
    failed++;
    continue;
  }

  const target = path.join(ROOT, node.file);
  const exists = fs.existsSync(target);

  if (exists && !force) {
    console.log(`  = ${node.file}  (exists, skipped)`);
    skipped++;
    continue;
  }

  if (dryRun) {
    console.log(`  + ${node.file}${exists ? '  (would overwrite)' : ''}${instruction ? `\n      instruction: ${instruction}` : ''}`);
    continue;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, buildFile(node));
  console.log(`  + ${node.file}${exists ? '  (overwritten)' : ''}`);
  created++;
}

if (dryRun) {
  console.log(`\n  Dry run — nothing written. ${nodes.length} path(s) planned.\n`);
} else {
  console.log(`\n  ${created} created, ${skipped} skipped, ${failed} failed.`);
  if (created) console.log('  Fill in the placeholder copy, then: npm run check\n');
  else console.log('');
}

process.exit(failed ? 1 : 0);
