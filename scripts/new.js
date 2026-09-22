#!/usr/bin/env node
/**
 * Scaffold new content. Creates the file with correct frontmatter; navigation,
 * listing pages, sitemap, RSS and internal links all update on the next build.
 *
 *   node scripts/new.js product  "Field Audit Trail Viewer"
 *   node scripts/new.js service  "Agentforce enablement"
 *   node scripts/new.js post     "Why sandbox refreshes break integrations"
 *   node scripts/new.js case     "Northwind — nonprofit CRM rebuild"
 *   node scripts/new.js page     "Partners"
 *
 * Options: --draft  --slug=custom-slug
 */

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, slugify, readJson } from './lib/content.js';
import { scaffoldBody } from './lib/scaffold-templates.js';

const [, , rawType, ...rest] = process.argv;
const flags = rest.filter((a) => a.startsWith('--'));
const title = rest.filter((a) => !a.startsWith('--')).join(' ').trim();
const flag = (name) => flags.find((f) => f.startsWith(`--${name}`))?.split('=')[1] ?? flags.includes(`--${name}`);

const TYPES = {
  page: 'pages',
  product: 'products',
  service: 'services',
  post: 'blog',
  blog: 'blog',
  case: 'caseStudies',
  'case-study': 'caseStudies',
};

const type = TYPES[rawType];

if (!type || !title) {
  console.log(`
  Usage: node scripts/new.js <page|product|service|post|case> "Title" [--draft] [--slug=...]
`);
  process.exit(1);
}

const site = readJson(path.join(ROOT, 'site.config.json'));
const config = site.collections[type];
const slug = flag('slug') || slugify(title);
const today = new Date().toISOString().slice(0, 10);
const isPost = type === 'blog';
const filename = isPost ? `${today}-${slug}.md` : `${slug}.md`;
const target = path.join(ROOT, config.dir, filename);

if (fs.existsSync(target)) {
  console.error(`\n  Already exists: ${path.relative(ROOT, target)}\n`);
  process.exit(1);
}

const draft = Boolean(flag('draft'));

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, scaffoldBody(type, { title, today, draft, defaultAuthor: site.automation.defaultAuthor }));

const url = config.urlPattern.replace(':slug', slug);
console.log(`
  Created ${path.relative(ROOT, target)}
  URL     ${url}

  Fill in the frontmatter, then: npm run dev
  Navigation, listings, sitemap and RSS update on the next build.
`);
