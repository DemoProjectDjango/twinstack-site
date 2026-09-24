#!/usr/bin/env node
/**
 * Regenerate CHANGELOG.md from `git log`.
 *
 *   node scripts/changelog.js
 *
 * Also runs automatically at the end of `npm run scaffold`. See
 * scripts/lib/changelog.js for what it records and why.
 */

import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/content.js';
import { generateChangelog } from './lib/changelog.js';

const target = path.join(ROOT, 'CHANGELOG.md');
const existing = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
fs.writeFileSync(target, generateChangelog(existing));
console.log(`\n  Wrote ${path.relative(ROOT, target)}\n`);
