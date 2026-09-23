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
 * already have a file, writes a correctly-shaped frontmatter skeleton, or the
 * matching file under scripts/site-tree-content/ verbatim if one exists for
 * that path. See scripts/lib/scaffold-tree-runner.js for the path -> file
 * mapping rules, the predefined-content lookup, and how nested paths resolve.
 *
 * To run several tree files on a schedule instead of by hand, see
 * scripts/scaffold-schedule.js / scripts/scaffold-schedule.md.
 */

import path from 'node:path';
import { ROOT } from './lib/content.js';
import { runScaffoldTree, updateChangelog } from './lib/scaffold-tree-runner.js';

const argv = process.argv.slice(2);
const flag = (name) => {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  return hit.includes('=') ? hit.split('=').slice(1).join('=') : true;
};

const dryRun = Boolean(flag('dry-run'));
const force = Boolean(flag('force'));
const treeFile = path.join(ROOT, String(flag('file') || 'scripts/site-tree.md'));

const { created, failed } = runScaffoldTree({ treeFile, dryRun, force });

if (!dryRun) {
  try {
    updateChangelog();
    console.log('  Updated CHANGELOG.md.');
  } catch (error) {
    console.log(`  Skipped CHANGELOG.md — ${error.message}`);
  }
  console.log(created ? '  Fill in the placeholder copy, then: npm run check\n' : '');
}

process.exit(failed ? 1 : 0);
