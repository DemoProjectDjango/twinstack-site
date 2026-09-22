#!/usr/bin/env node
/**
 * Writes the next blog post with Claude, then validates it before it is allowed
 * near the site.
 *
 *   node scripts/generate-post.js                 next queued topic
 *   node scripts/generate-post.js --topic="..."   ad-hoc topic
 *   node scripts/generate-post.js --topic="..." --description="..."
 *   node scripts/generate-post.js --research      let Claude web-search first
 *   node scripts/generate-post.js --dry-run       print, write nothing
 *   node scripts/generate-post.js --publish       skip the draft flag
 *
 * Requires ANTHROPIC_API_KEY. Everything about the house style lives in
 * content/data/blog-queue.json, not in this file.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readJson, slugify, loadSite } from './lib/content.js';
import { parseFrontmatter } from './lib/markdown.js';

const API_URL = 'https://api.anthropic.com/v1/messages';
const argv = process.argv.slice(2);
const flag = (name) => {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  return hit.includes('=') ? hit.split('=').slice(1).join('=') : true;
};

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey && !flag('dry-run')) {
  console.error('\n  ANTHROPIC_API_KEY is not set. Add it to your environment or repository secrets.\n');
  process.exit(1);
}

const site = readJson(path.join(ROOT, 'site.config.json'));
const queuePath = path.join(ROOT, site.automation.queueFile);
const queue = readJson(queuePath);
const model = loadSite({ includeDrafts: true, includeFuture: true });

/* ---------------------------------------------------------------- the topic */

const adHoc = typeof flag('topic') === 'string' ? flag('topic') : null;
const suppliedDescription = flag('description');
const queued = queue.topics.find((t) => t.status === 'queued');

if (!adHoc && !queued) {
  console.error(`
  The blog queue is empty. Add a topic to ${site.automation.queueFile}
  with "status": "queued", or run with --topic="Your title".
`);
  process.exit(2);
}

const topic = adHoc
  ? {
      id: `adhoc-${Date.now()}`,
      title: adHoc,
      description: typeof suppliedDescription === 'string' ? suppliedDescription : queue.defaults.description,
      angle: '',
      category: 'Admin',
      tags: [],
      status: 'adhoc',
    }
  : queued;
const description = typeof suppliedDescription === 'string'
  ? suppliedDescription
  : topic.description ?? queue.defaults.description ?? '';

/* --------------------------------------------------------------- the prompt */

const internalUrls = model.all.map((e) => e.url).sort();
const catalogue = ['products', 'services']
  .flatMap((name) =>
    (model.collections[name] || []).map((e) => `- ${e.url} — ${e.title}: ${e.tagline || e.description}`),
  )
  .join('\n');

const recentPosts = (model.collections.blog || [])
  .slice(0, 8)
  .map((p) => `- ${p.title} (${p.url})`)
  .join('\n');

const [minWords, maxWords] = site.automation.wordCount;
const today = new Date().toISOString().slice(0, 10);
const slug = slugify(topic.slug || topic.title);

const systemPrompt = `You write for the blog of ${site.name}, ${site.description}

VOICE
${queue.defaults.voice}
Audience: ${queue.defaults.audience}

HOUSE RULES
${queue.defaults.mustInclude.map((r) => `- ${r}`).join('\n')}
- Never invent statistics, customer names, release numbers, dates or quotes. If a number is not something you are certain of, describe the shape of the thing instead of quantifying it.
- Never claim a Salesforce feature exists unless you are confident it does. Prefer durable platform behaviour over release-specific detail.
- No AI throat-clearing: no "in today's fast-paced world", no "let's dive in", no bulleted summary of what the post will cover.
- Do not use em dashes as asides. Do not write "not X, but Y" constructions.
- Write ${minWords}-${maxWords} words.

LINKING
Link only to these existing URLs, written as root-relative markdown links:
${catalogue}
Use one or two of them, where they genuinely fit. Never invent a URL.

ALREADY PUBLISHED — do not repeat these angles:
${recentPosts}

OUTPUT FORMAT
Return a single markdown document and nothing else. No preamble, no code fence around the whole thing. It must begin with frontmatter in exactly this shape:

---
title: <the post title, sentence case, no colon-subtitle pattern>
date: ${today}
category: ${topic.category || 'Admin'}
author: ${site.automation.defaultAuthor}
tags: [${(topic.tags || []).join(', ')}]
relatedProduct: ${topic.linkTo || ''}
description: <under 160 characters, written for a search result>
excerpt: <one or two sentences that make someone open the post>
generated: true
---

Then the body in markdown, using ## for section headings (never # — the title is rendered separately). Open with the specific situation the reader is in, not with background.`;

const userPrompt = `Write this week's post.

Working title: ${topic.title}
Description: ${description}
Angle: ${topic.angle || 'Choose the most useful practical angle for the audience.'}
${topic.notes ? `Notes: ${topic.notes}` : ''}

Include at least one concrete, checkable example: a short code block, a query, a table, or a numbered procedure someone could follow in an org.`;

/* ------------------------------------------------------------------- the API */

async function callClaude() {
  const body = {
    model: site.automation.model,
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  };

  if (flag('research')) {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }];
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API ${response.status}: ${(await response.text()).slice(0, 400)}`);
  }

  const payload = await response.json();
  return payload.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
}

/* --------------------------------------------------------------- validation */

function validate(markdown) {
  const problems = [];
  const warnings = [];

  const { data, body } = parseFrontmatter(markdown);
  if (!data.title) problems.push('missing title in frontmatter');
  if (!data.description) problems.push('missing description in frontmatter');
  if (!data.excerpt) warnings.push('missing excerpt');
  if (data.description && String(data.description).length > 180) warnings.push('description over 180 characters');

  const words = body.split(/\s+/).filter(Boolean).length;
  if (words < minWords * 0.6) problems.push(`too short (${words} words)`);
  if (words > maxWords * 1.6) warnings.push(`long (${words} words)`);

  if (/^#\s/m.test(body)) warnings.push('body contains an H1; the layout renders the title already');

  let cleaned = body;
  const links = [...body.matchAll(/\[([^\]]+)\]\((\/[^)\s]*)\)/g)];
  for (const [full, label, href] of links) {
    const normalised = href.endsWith('/') || href.includes('.') ? href : `${href}/`;
    if (!internalUrls.includes(normalised)) {
      warnings.push(`removed link to non-existent page: ${href}`);
      cleaned = cleaned.replace(full, label);
    }
  }

  const banned = [/let's dive in/i, /in today's fast-paced/i, /game.?changer/i, /unlock the power/i];
  for (const pattern of banned) {
    if (pattern.test(cleaned)) warnings.push(`contains banned phrase: ${pattern.source}`);
  }

  return { problems, warnings, data, cleaned, words };
}

/* -------------------------------------------------------------------- write */

function frontmatterBlock(data, extra) {
  const merged = { ...data, ...extra };
  const lines = Object.entries(merged)
    .filter(([, value]) => value !== undefined && value !== '' && !(Array.isArray(value) && !value.length))
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? `[${value.join(', ')}]` : value}`);
  return `---\n${lines.join('\n')}\n---\n`;
}

async function run() {
  console.log(`\n  Topic: ${topic.title}`);
  console.log(`  Model: ${site.automation.model}${flag('research') ? ' (with web search)' : ''}\n`);

  // Without a key, a dry run still shows exactly what would be sent.
  if (!apiKey) {
    console.log(`----- system prompt -----\n${systemPrompt}\n\n----- user prompt -----\n${userPrompt}\n`);
    console.log('  No ANTHROPIC_API_KEY set, so nothing was sent.\n');
    return;
  }

  const raw = await callClaude();
  const { problems, warnings, data, cleaned, words } = validate(raw);

  for (const warning of warnings) console.log(`  warning: ${warning}`);
  if (problems.length) {
    console.error(`\n  Rejected:\n${problems.map((p) => `    - ${p}`).join('\n')}\n`);
    process.exit(3);
  }

  const asDraft = site.automation.requireReview && !flag('publish');
  const output =
    frontmatterBlock(data, { slug: slugify(data.title) || slug, generated: true, draft: asDraft || undefined }) +
    `\n${cleaned.trim()}\n`;

  const filename = `${today}-${slugify(data.title) || slug}.md`;
  const target = path.join(ROOT, 'content/blog', filename);

  if (flag('dry-run')) {
    console.log(`\n----- ${filename} (${words} words, not written) -----\n`);
    console.log(output);
    return;
  }

  fs.writeFileSync(target, output);

  if (topic.status === 'queued') {
    topic.status = 'published';
    topic.publishedAs = `/blog/${slugify(data.title) || slug}.html`;
    topic.publishedOn = today;
    fs.writeFileSync(queuePath, `${JSON.stringify(queue, null, 2)}\n`);
  }

  const queuedLeft = queue.topics.filter((t) => t.status === 'queued').length;

  console.log(`
  Wrote content/blog/${filename}  (${words} words)
  Status: ${asDraft ? 'draft — publish by removing "draft: true"' : 'live on next build'}
  Topics left in queue: ${queuedLeft}${queuedLeft < 3 ? '  <- top this up' : ''}
`);
}

run().catch((error) => {
  console.error(`\n  Generation failed: ${error.message}\n`);
  process.exit(1);
});
