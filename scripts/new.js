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

const draft = flag('draft') ? 'draft: true\n' : '';

const TEMPLATES = {
  pages: `---
title: ${title}
slug: ${slug}
order: 50
kicker: 
heroHeading: ${title}
heroText: One sentence on what this page is for.
description: Under 160 characters, written for search results.
${draft}---

## First section

Replace this with the real content.
`,

  products: `---
title: ${title}
tagline: One line on what it does, in the user's words.
order: 50
badge: Live on AppExchange
price: Free
logo: 
installUrl: 
heroHeading: ${title}
description: Under 160 characters, written for search results.
highlights:
  - First thing it does
  - Second thing it does
  - Third thing it does
facts:
  - label: Time to an answer
    value: 
    note: 
  - label: Price
    value: Free
capabilities:
  - title: Capability one
    body: What it does and why that matters.
faqTopics: [products]
${draft}---

## The problem it removes

## How it works

## Who it is for
`,

  services: `---
title: ${title}
tagline: One line on the outcome, not the activity.
order: 50
description: Under 160 characters, written for search results.
highlights:
  - Headline deliverable
  - Second deliverable
  - Third deliverable
deliverables:
  - What the client actually receives
idealFor:
  - The situation this fits
steps:
  - title: First stage
    body: What happens and what it produces.
faqTopics: [services]
${draft}---

## What this involves

## How we price it
`,

  blog: `---
title: ${title}
date: ${today}
category: Admin
author: ${site.automation.defaultAuthor}
tags: []
relatedProduct: 
description: Under 160 characters, written for search results.
excerpt: One or two sentences that make someone open the post.
${draft}---

Opening paragraph: the specific situation the reader is in.

## First section
`,

  caseStudies: `---
title: ${title}
tagline: One line on what changed for the client.
category: 
order: 50
client: 
industry: 
duration: 
stack: []
externalUrl: 
description: Under 160 characters, written for search results.
results:
  - value: 
    label: 
${draft}---

## The situation

## What we did

## The result
`,
};

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, TEMPLATES[type]);

const url = config.urlPattern.replace(':slug', slug);
console.log(`
  Created ${path.relative(ROOT, target)}
  URL     ${url}

  Fill in the frontmatter, then: npm run dev
  Navigation, listings, sitemap and RSS update on the next build.
`);
