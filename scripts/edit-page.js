#!/usr/bin/env node
/**
 * Modify one existing content or template file with Claude, from a plain
 * English instruction — for changes too specific to be worth a build-script
 * feature (add a section, restyle a block, tighten some copy) but too fiddly
 * to hand-edit template syntax for.
 *
 *   node scripts/edit-page.js <page> "<instruction>"   run this one edit now
 *   node scripts/edit-page.js <page> "<instruction>" --dry-run
 *   node scripts/edit-page.js                          run every queued edit in
 *                                                       scripts/page-commands.json
 *   node scripts/edit-page.js --dry-run                same, print only
 *   node scripts/edit-page.js --list                    show the queue, run nothing
 *
 * <page> is a content slug (e.g. "products"), a URL, or a file path under
 * content/ or templates/.
 *
 * With no <page> argument, every { file, instruction } entry in
 * scripts/page-commands.json's "queue" is applied in order and removed from
 * the queue as it succeeds. With a <page> argument, that one edit runs
 * immediately and scripts/page-commands.json is not touched — add entries to
 * the queue by hand.
 *
 * Requires ANTHROPIC_API_KEY.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readJson, loadSite } from './lib/content.js';
import { parseFrontmatter } from './lib/markdown.js';

const API_URL = 'https://api.anthropic.com/v1/messages';
const COMMANDS_PATH = path.join(ROOT, 'scripts/page-commands.json');
const EDITABLE_ROOTS = ['content', 'templates', 'styles/main.css', 'site.config.json'];

const argv = process.argv.slice(2);
const flag = (name) => {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  return hit.includes('=') ? hit.split('=').slice(1).join('=') : true;
};
const positional = argv.filter((a) => !a.startsWith('--'));
const dryRun = Boolean(flag('dry-run'));

const site = readJson(path.join(ROOT, 'site.config.json'));
const apiKey = process.env.ANTHROPIC_API_KEY;

/* ------------------------------------------------------------------ queue */

function loadQueue() {
  if (!fs.existsSync(COMMANDS_PATH)) return { _comment: '', queue: [] };
  const parsed = readJson(COMMANDS_PATH);
  return { _comment: parsed._comment || '', queue: parsed.queue || [] };
}

function writeQueue(registry) {
  fs.writeFileSync(COMMANDS_PATH, `${JSON.stringify(registry, null, 2)}\n`);
}

if (flag('list')) {
  const { queue } = loadQueue();
  if (!queue.length) {
    console.log('\n  Queue is empty. scripts/page-commands.json has nothing pending.\n');
  } else {
    console.log(`\n  Pending (${queue.length}):\n`);
    for (const job of queue) {
      console.log(`  file:        ${job.file}`);
      console.log(`  instruction: ${job.instruction}\n`);
    }
  }
  process.exit(0);
}

/* ----------------------------------------------------------------- target */

function resolveFile(pageArg) {
  const direct = pageArg.replace(/\\/g, '/');
  if (
    direct.startsWith('content/') ||
    direct.startsWith('templates/') ||
    direct.startsWith('styles/') ||
    direct === 'site.config.json'
  ) {
    return direct;
  }

  const { all } = loadSite({ includeDrafts: true, includeFuture: true });
  const bare = direct.replace(/^\/|\/$/g, '').replace(/\.html$/, '');
  const match =
    all.find((e) => e.slug === direct) ||
    all.find((e) => e.url === direct) ||
    all.find((e) => e.url.replace(/^\/|\/$/g, '').replace(/\.html$/, '') === bare);

  return match ? match.sourceFile.replace(/\\/g, '/') : null;
}

function isEditable(relPath) {
  return EDITABLE_ROOTS.some((root) => relPath === root || relPath.startsWith(`${root}/`));
}

/* ----------------------------------------------------------------- prompt */

function buildPrompts(relFile, instruction, original) {
  const isContent = relFile.startsWith('content/') && relFile.endsWith('.md');

  const contextNote = isContent
    ? `This file is a markdown content file. Its body is rendered as a template BEFORE markdown conversion, so template syntax works directly in the body. Variables in scope: site (site.config.json, e.g. site.contact.email, site.name), data.<jsonFileName> (every file in content/data/, e.g. data.faq, data.company, data.testimonials), nav (primary/footer/utility/legal), page (this file's own frontmatter plus derived fields: title, description, url, tagline, content, headings, dateFormatted, readingTime...), and the full collections as flat lists usable directly in {{#each}}: pages, products, services, blog, caseStudies (each item has at least title, url, description, excerpt, tagline, image, date, dateFormatted, tags). Also in scope: faqItems, isHome, latestPosts (3 most recent blog posts, excluding this page), recentPosts (5 most recent blog posts, excluding this page), productPosts (up to 5 most recent blog posts whose relatedProduct frontmatter points at a /products/ page), otherProducts, otherServices, relatedItems. The template engine cannot slice or numerically compare inside {{#each}} — no "first N" of an arbitrary list. If you need a specific count that isn't already one of the pre-sliced lists above, loop the whole collection instead of inventing comparison logic that doesn't exist in this engine. Partials are available via {{> name }}, e.g. {{> stats }}, {{> testimonials }}, {{> cta }}, {{> faq }}.`
    : relFile.startsWith('templates/')
      ? `This file is an HTML template rendered with the same tiny template engine and the same context object described above for content files (site, data, nav, page, collections as pages/products/services/blog/caseStudies, faqItems, isHome, latestPosts, otherProducts, otherServices, relatedItems, plus {{> partial }} includes). It has no server-side logic beyond the engine's own syntax.`
      : `This is a site-wide config or stylesheet file, not rendered through the template engine.`;

  const systemPrompt = `You edit one existing file in the source of ${site.name}'s static site (${site.description}). You will be given the file's full current contents and an instruction. Return the complete new file, and nothing else.

TEMPLATE ENGINE SYNTAX (only what exists — do not use anything not listed here)
  {{ value }}                 escaped output
  {{{ value }}}               raw HTML output
  {{# if value }} … {{ else }} … {{/ if }}
  {{# unless value }} … {{/ unless }}
  {{# each list }} … {{/ each }}   inside: {{ this }}, {{ @index }}, {{ @number }}, {{ @first }}, {{ @last }}, {{ @odd }}
  {{> partial-name }}         include templates/partials/partial-name.html

GOTCHA — {{#each}} inside a markdown content file, producing a markdown list:
Rendering happens BEFORE markdown conversion, so a line break right after
"{{# each x }}" or right before "{{/ each }}" becomes a real blank line
between each rendered item, and the markdown parser then reads every item as
its own separate one-item list instead of one shared list. Write the loop
with the item's own markdown line immediately after the opening tag, e.g.:
  {{# each recentPosts }}- [{{ title }}]({{ url }}) — {{ dateFormatted }}
  {{/ each }}
(item text on the same line as the opening tag, closing tag on its own line)
— not with a line break after the opening tag.

${contextNote}

HOUSE RULES (from CLAUDE.md — follow these exactly)
- Never hardcode a fact that appears, or could appear, on more than one page (contact details, stats, FAQ entries). Reference site.*, data.* or a collection instead.
- Never hand-list content that a collection already provides (products, services, posts, case studies) — loop over the collection with {{#each}}.
- Do not invent facts: statistics, client names, release numbers, or claims about Salesforce behaviour need to already be true of the codebase you can see. If unsure, describe the shape of the thing rather than quantifying it.
- British spelling, sentence case headings, plain verbs. No exclamation marks, no "unlock", "seamless", "game-changing", "dive in".
- Markdown content files: do not add a leading "# Title" heading — the layout renders the title separately.
- Preserve everything about the file that the instruction doesn't ask you to change: frontmatter fields and their order, unrelated sections, existing classes and structure, indentation style.
- Utilities belong inline in templates; only touch styles/main.css for tokens or patterns already repeated three or more times elsewhere, and never touch assets/css/main.css (it is compiled output).

OUTPUT
Return only the raw contents of the new file, starting from its very first character (frontmatter's opening "---" for a content file). No commentary, no explanation, no surrounding code fence.`;

  const userPrompt = `File: ${relFile}

----- current contents -----
${original}
----- end current contents -----

Instruction: ${instruction}`;

  return { systemPrompt, userPrompt, isContent };
}

async function callClaude(systemPrompt, userPrompt) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: site.automation.model,
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
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

function stripFence(text) {
  const fenced = text.match(/^```[a-z]*\n([\s\S]*)\n```$/);
  return fenced ? fenced[1] : text;
}

function sanityCheck(original, updated, isContent) {
  const problems = [];

  if (updated.length < original.length * 0.4) {
    problems.push(`output is suspiciously short (${updated.length} chars vs ${original.length} originally)`);
  }

  if (isContent) {
    const before = parseFrontmatter(original);
    const after = parseFrontmatter(updated);
    if (before.data.title && !after.data.title) problems.push('frontmatter lost its title');
    if (before.data.layout && after.data.layout !== before.data.layout) {
      problems.push(`layout changed from "${before.data.layout}" to "${after.data.layout || '(none)'}" — was that intended?`);
    }
  }

  const openers = (updated.match(/\{\{#\s*(if|unless|each)/g) || []).length;
  const closers = (updated.match(/\{\{\/\s*(if|unless|each)/g) || []).length;
  if (openers !== closers) problems.push(`unbalanced template blocks (${openers} opened, ${closers} closed)`);

  return problems;
}

/* ------------------------------------------------------------- one edit --- */

async function applyEdit(relFile, instruction) {
  console.log(`  File: ${relFile}`);
  console.log(`  Instruction: ${instruction}`);

  if (!isEditable(relFile)) {
    console.error(`  Won't touch "${relFile}" — outside content/, templates/, styles/main.css and site.config.json (dist/ and assets/css/main.css are generated, never edit them directly).\n`);
    return false;
  }

  const targetPath = path.join(ROOT, relFile);
  if (!fs.existsSync(targetPath)) {
    console.error(`  ${relFile} does not exist.\n`);
    return false;
  }

  const original = fs.readFileSync(targetPath, 'utf8');
  const { systemPrompt, userPrompt, isContent } = buildPrompts(relFile, instruction, original);

  if (!apiKey) {
    console.log(`----- system prompt -----\n${systemPrompt}\n\n----- user prompt -----\n${userPrompt}\n`);
    console.log('  No ANTHROPIC_API_KEY set, so nothing was sent.\n');
    return false;
  }

  console.log(`  Model: ${site.automation.model}\n`);
  const raw = stripFence(await callClaude(systemPrompt, userPrompt));
  const problems = sanityCheck(original, raw, isContent);

  if (dryRun) {
    console.log(`----- proposed ${relFile} (not written) -----\n`);
    console.log(raw);
    if (problems.length) console.log(`\n  warning: ${problems.join('\n  warning: ')}`);
    return false;
  }

  if (problems.length) {
    console.error(`\n  Refused to write — looked wrong:\n${problems.map((p) => `    - ${p}`).join('\n')}\n\n  Re-run with --dry-run to inspect the output, or rephrase the instruction.\n`);
    return false;
  }

  fs.writeFileSync(targetPath, raw.endsWith('\n') ? raw : `${raw}\n`);
  console.log(`\n  Wrote ${relFile}  (${original.split('\n').length} -> ${raw.split('\n').length} lines)\n`);
  return true;
}

/* -------------------------------------------------------------------- run */

async function runAdHoc(pageArg, instruction) {
  const relFile = resolveFile(pageArg);
  if (!relFile) {
    console.error(`\n  Could not resolve "${pageArg}" to a file.\n`);
    process.exit(1);
  }

  const ok = await applyEdit(relFile, instruction);
  if (!dryRun) {
    console.log(ok ? `  Review with: git diff -- ${relFile}\n  Validate with: npm run check\n` : '');
    process.exit(ok ? 0 : 3);
  }
}

async function runQueue() {
  const registry = loadQueue();
  const { queue } = registry;

  if (!queue.length) {
    console.log(`
  No queued edits. scripts/page-commands.json's "queue" is empty.
  Add { "file": "...", "instruction": "..." } entries to it, or run:
    npm run page:edit -- <page> "<instruction>"
`);
    return;
  }

  console.log(`\n  Running ${queue.length} queued edit${queue.length === 1 ? '' : 's'} from scripts/page-commands.json\n`);

  const remaining = [...queue];
  let stoppedEarly = false;

  for (const job of queue) {
    console.log('  ----------------------------------------');
    const ok = await applyEdit(job.file, job.instruction);

    if (dryRun) {
      remaining.shift();
      continue;
    }

    if (!ok) {
      stoppedEarly = true;
      break; // leave this job and everything after it queued
    }

    remaining.shift();
    writeQueue({ _comment: registry._comment, queue: remaining });
  }

  if (!dryRun) {
    console.log(stoppedEarly ? '  Stopped after a failed edit — it and any after it are still queued.\n' : '  Queue cleared. Validate with: npm run check\n');
  }
}

if (positional.length) {
  const [pageArg, instructionArg] = positional;
  const instruction = instructionArg || flag('instruction');
  if (!instruction) {
    console.error(`
  Usage:
    node scripts/edit-page.js <page> "<instruction>"
    node scripts/edit-page.js                 run every queued edit
    node scripts/edit-page.js --list          show the queue
`);
    process.exit(1);
  }
  if (!apiKey && !dryRun) {
    console.error('\n  ANTHROPIC_API_KEY is not set. Add it to your environment or repository secrets.\n');
    process.exit(1);
  }
  runAdHoc(pageArg, instruction).catch((error) => {
    console.error(`\n  Edit failed: ${error.message}\n`);
    process.exit(1);
  });
} else {
  if (!apiKey && !dryRun) {
    console.error('\n  ANTHROPIC_API_KEY is not set. Add it to your environment or repository secrets.\n');
    process.exit(1);
  }
  runQueue().catch((error) => {
    console.error(`\n  Queue run failed: ${error.message}\n`);
    process.exit(1);
  });
}
