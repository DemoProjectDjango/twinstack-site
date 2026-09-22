#!/usr/bin/env node
/**
 * Runs whichever dated content-generation jobs in scripts/scaffold-schedule.md
 * are due, writing each one as a real Claude-authored page (not a
 * placeholder).
 *
 *   node scripts/scaffold-schedule.js              run every due, unfinished job
 *   node scripts/scaffold-schedule.js --dry-run     print what's due and what
 *                                                    would be sent to Claude;
 *                                                    write and mark nothing
 *
 * scripts/scaffold-schedule.md holds a fenced ```json array of jobs:
 *   { location, title, date, description, content, images, research, done }
 * See that file for the full field reference. A job whose date has arrived
 * and isn't already "done": true runs once, then gets "done": true and a
 * "completedDate" stamped in, so it never runs twice.
 *
 * Requires ANTHROPIC_API_KEY. Without it, each due job's prompt is printed
 * instead of sent, and the job is left pending for the next run.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readJson, slugify } from './lib/content.js';
import { scaffoldBody } from './lib/scaffold-templates.js';
import { updateChangelog } from './lib/scaffold-tree-runner.js';

const API_URL = 'https://api.anthropic.com/v1/messages';
const SCHEDULE_PATH = path.join(ROOT, 'scripts/scaffold-schedule.md');
const JSON_BLOCK = /```json\n([\s\S]*?)\n```/;

const dryRun = process.argv.slice(2).includes('--dry-run');
const apiKey = process.env.ANTHROPIC_API_KEY;
const site = readJson(path.join(ROOT, 'site.config.json'));

/* ------------------------------------------------------------- schedule I/O */

function readSchedule() {
  if (!fs.existsSync(SCHEDULE_PATH)) {
    console.error(`\n  No schedule file at ${path.relative(ROOT, SCHEDULE_PATH)}.\n`);
    process.exit(1);
  }
  const text = fs.readFileSync(SCHEDULE_PATH, 'utf8');
  const match = JSON_BLOCK.exec(text);
  if (!match) {
    console.error(`\n  ${path.relative(ROOT, SCHEDULE_PATH)} has no \`\`\`json job list.\n`);
    process.exit(1);
  }
  let jobs;
  try {
    jobs = JSON.parse(match[1]);
  } catch (error) {
    console.error(`\n  Could not parse the job list as JSON: ${error.message}\n`);
    process.exit(1);
  }
  return { text, jobs };
}

function writeSchedule(text, jobs) {
  const block = '```json\n' + JSON.stringify(jobs, null, 2) + '\n```';
  fs.writeFileSync(SCHEDULE_PATH, text.replace(JSON_BLOCK, block));
}

/* -------------------------------------------------------------- resolve job */

function collectionDirs() {
  const map = new Map();
  for (const [key, cfg] of Object.entries(site.collections)) map.set(cfg.dir, { key, cfg });
  return map;
}

/** Returns { type, file, error } */
function resolveJob(job) {
  const slug = slugify(job.title);
  const location = String(job.location || '').replace(/\/$/, '');
  const dirs = collectionDirs();

  const collectionHit = dirs.get(location);
  if (collectionHit) {
    return { type: collectionHit.key, file: `${collectionHit.cfg.dir}/${slug}.md` };
  }

  if (location === 'content/pages' || location.startsWith('content/pages/')) {
    const sub = location.replace(/^content\/pages\/?/, '');
    return { type: 'pages', file: sub ? `content/pages/${sub}/${slug}.md` : `content/pages/${slug}.md` };
  }

  return {
    error: `"${job.location}" isn't a collection directory (${[...dirs.keys()].join(', ')}) or under content/pages/ — the build would never find it.`,
  };
}

/* ---------------------------------------------------------------- the call */

function buildPrompts(job, type, skeleton) {
  const systemPrompt = `You write one new page for ${site.name}'s site (${site.description}). You are given a brief and must write the complete file: real frontmatter values and a real, useful markdown body — not placeholder text.

FILE SHAPE TO FOLLOW (fill in every field for real; keep the same field names and structure):
${skeleton}

HOUSE RULES (from CLAUDE.md — follow exactly)
- British spelling, sentence case headings, plain verbs. No exclamation marks, no "unlock", "seamless", "game-changing", "dive in".
- Do not invent facts: statistics, client names, release numbers, or claims about Salesforce behaviour must be things you're confident are true. If unsure, describe the shape of the thing rather than quantifying it.
- Do not add a leading "# Title" heading in the body — the layout renders the title separately. Use "##" for section headings.
- If image URLs are supplied, work them into the body with markdown image syntax ![alt text](url) wherever they genuinely fit, with meaningful alt text. Do not invent image URLs of your own.

OUTPUT
Return only the raw contents of the new file, starting with the opening "---" of the frontmatter. No commentary, no surrounding code fence.`;

  const userPrompt = `Title: ${job.title}
Brief: ${job.description}
${job.content ? `Notes/content to work from:\n${job.content}\n` : ''}${job.images?.length ? `Image URLs to use:\n${job.images.map((u) => `- ${u}`).join('\n')}\n` : ''}`;

  return { systemPrompt, userPrompt };
}

async function callClaude(systemPrompt, userPrompt, research) {
  const body = {
    model: site.automation.model,
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  };
  if (research) body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }];

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API ${response.status}: ${(await response.text()).slice(0, 400)}`);
  }

  const payload = await response.json();
  return payload.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

function stripFence(text) {
  const fenced = text.match(/^```[a-z]*\n([\s\S]*)\n```$/);
  return fenced ? fenced[1] : text;
}

function sanityCheck(raw) {
  const problems = [];
  if (!/^---\n/.test(raw)) problems.push('missing opening frontmatter "---"');
  if (!/\ntitle:\s*\S/.test(raw)) problems.push('missing a title in frontmatter');
  if (raw.length < 200) problems.push(`output is suspiciously short (${raw.length} chars)`);
  const openers = (raw.match(/\{\{#\s*(if|unless|each)/g) || []).length;
  const closers = (raw.match(/\{\{\/\s*(if|unless|each)/g) || []).length;
  if (openers !== closers) problems.push(`unbalanced template blocks (${openers} opened, ${closers} closed)`);
  return problems;
}

/* ---------------------------------------------------------------- one job */

async function runJob(job) {
  const resolved = resolveJob(job);
  if (resolved.error) {
    console.error(`  ! ${job.title} — ${resolved.error}`);
    return false;
  }

  const target = path.join(ROOT, resolved.file);
  if (fs.existsSync(target)) {
    console.log(`  = ${resolved.file}  (already exists, marking done without touching it)`);
    return true;
  }

  const today = new Date().toISOString().slice(0, 10);
  const skeleton = scaffoldBody(resolved.type, { title: job.title, today, defaultAuthor: site.automation.defaultAuthor });
  const { systemPrompt, userPrompt } = buildPrompts(job, resolved.type, skeleton);
  const research = job.research !== false;

  if (dryRun) {
    console.log(`  + ${resolved.file}  (would write, research: ${research})`);
    return false;
  }

  if (!apiKey) {
    console.log(`\n----- ${job.title}: system prompt -----\n${systemPrompt}\n\n----- user prompt -----\n${userPrompt}\n`);
    console.log('  No ANTHROPIC_API_KEY set — job left pending.\n');
    return false;
  }

  console.log(`  ... generating ${resolved.file} (model: ${site.automation.model}, research: ${research})`);
  const raw = stripFence(await callClaude(systemPrompt, userPrompt, research));
  const problems = sanityCheck(raw);
  if (problems.length) {
    console.error(`  ! ${job.title} — rejected:\n${problems.map((p) => `      - ${p}`).join('\n')}`);
    return false;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, raw.endsWith('\n') ? raw : `${raw}\n`);
  console.log(`  + ${resolved.file}`);
  return true;
}

/* -------------------------------------------------------------------- run */

async function main() {
  const { text, jobs } = readSchedule();
  const today = new Date().toISOString().slice(0, 10);

  console.log(`\n  Checking ${path.relative(ROOT, SCHEDULE_PATH)} (today: ${today})\n`);

  let ranAny = false;
  let due = 0;

  for (const job of jobs) {
    if (job.done) continue;
    const jobDate = new Date(job.date);
    if (Number.isNaN(jobDate.getTime())) {
      console.log(`  ! "${job.title}" has an unparsable date "${job.date}", skipped.`);
      continue;
    }
    if (jobDate.toISOString().slice(0, 10) > today) {
      console.log(`  - ${job.title}  (scheduled ${job.date}, not due yet)`);
      continue;
    }

    due++;
    const done = await runJob(job);
    if (done && !dryRun) {
      job.done = true;
      job.completedDate = today;
      ranAny = true;
    }
  }

  if (dryRun) {
    console.log(`\n  Dry run — ${due} job(s) due, nothing written, nothing marked done.\n`);
    return;
  }

  if (ranAny) {
    writeSchedule(text, jobs);
    try {
      updateChangelog();
      console.log('  Updated CHANGELOG.md.');
    } catch (error) {
      console.log(`  Skipped CHANGELOG.md — ${error.message}`);
    }
    console.log(`\n  Marked done in ${path.relative(ROOT, SCHEDULE_PATH)}. Review with npm run check.\n`);
  } else if (due) {
    console.log('\n  Job(s) were due but none completed — see errors above. Nothing marked done.\n');
  } else {
    console.log('\n  No jobs due.\n');
  }
}

main().catch((error) => {
  console.error(`\n  Schedule run failed: ${error.message}\n`);
  process.exit(1);
});
