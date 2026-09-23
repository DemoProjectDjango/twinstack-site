/**
 * Loads everything under content/ into one in-memory model:
 *
 *   site      site.config.json + derived helpers
 *   data      every JSON file in content/data (by filename)
 *   pages     content/pages/*.md
 *   products  content/products/*.md
 *   services  content/services/*.md
 *   blog      content/blog/*.md        (drafts and future dates excluded in prod)
 *   caseStudies content/case-studies/*.md
 *
 * Adding a new collection means adding an entry to site.config.json -> collections.
 * No build code needs to change.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter, renderMarkdown, excerpt, readingTime } from './markdown.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const paths = {
  root: ROOT,
  content: path.join(ROOT, 'content'),
  data: path.join(ROOT, 'content/data'),
  templates: path.join(ROOT, 'templates'),
  partials: path.join(ROOT, 'templates/partials'),
  layouts: path.join(ROOT, 'templates/layouts'),
  assets: path.join(ROOT, 'assets'),
  dist: path.join(ROOT, 'dist'),
};

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function slugify(input) {
  return String(input)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

export function formatDate(value, locale = 'en-GB') {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Every .md file under dir, recursing into subdirectories, as paths relative
 * to dir with forward slashes (e.g. "who-sees-what/how-to-use.md"). Lets a
 * collection mirror a nested URL tree as real nested folders on disk. */
function listMarkdown(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('_')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listMarkdown(full, base));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(path.relative(base, full).split(path.sep).join('/'));
    }
  }
  return out.sort();
}

export function applyUrlPattern(pattern, slug) {
  const url = pattern.replace(':slug', slug);
  return url.endsWith('/') || url.endsWith('.html') ? url : `${url}/`;
}

/** Turn a URL into the file written inside dist/ */
export function outputPathFor(url) {
  if (url === '/') return 'index.html';
  if (url.endsWith('.html')) return url.replace(/^\//, '');
  return `${url.replace(/^\/|\/$/g, '')}/index.html`;
}

function loadEntry({ file, dir, collection, config, site }) {
  const raw = fs.readFileSync(path.join(dir, file), 'utf8');
  const { data, body } = parseFrontmatter(raw);
  const dirPart = path.dirname(file); // "." for a top-level file
  const baseSlug = path
    .basename(file, '.md')
    .replace(/^\d{4}-\d{2}-\d{2}-/, '');
  const derivedSlug = dirPart === '.' ? baseSlug : `${dirPart}/${baseSlug}`;
  const slug = data.slug || derivedSlug;
  const rendered = renderMarkdown(body);
  const url = data.url || applyUrlPattern(config.urlPattern, slug);

  return {
    ...data,
    collection,
    sourceFile: path.relative(ROOT, path.join(dir, file)),
    slug,
    url,
    absoluteUrl: `${site.url.replace(/\/$/, '')}${url}`,
    layout: data.layout || config.layout,
    title: data.title || slug,
    description: data.description || excerpt(body),
    excerpt: data.excerpt || excerpt(body, 190),
    body,
    content: rendered.html,
    headings: rendered.headings,
    readingTime: readingTime(body),
    date: data.date || null,
    dateFormatted: formatDate(data.date),
    draft: Boolean(data.draft),
    tags: Array.isArray(data.tags) ? data.tags : data.tags ? [data.tags] : [],
    featured: Boolean(data.featured),
    order: typeof data.order === 'number' ? data.order : 999,
  };
}

function sortEntries(entries, sortSpec) {
  const [key, direction = 'asc'] = String(sortSpec || 'order').split(':');
  const factor = direction === 'desc' ? -1 : 1;
  return [...entries].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (av === bv) return a.title.localeCompare(b.title);
    if (av === undefined || av === null) return 1;
    if (bv === undefined || bv === null) return -1;
    return (av > bv ? 1 : -1) * factor;
  });
}

/** Build the nav/footer trees, expanding any auto-generated collection groups. */
function buildNavigation(navConfig, collections, site) {
  const expand = (items = []) =>
    items.flatMap((item) => {
      if (item.type === 'collection') {
        const entries = (collections[item.collection] || [])
          .filter((entry) => entry.navHidden !== true)
          .slice(0, item.limit || 99);
        const children = entries.map((entry) => ({
          label: entry.navLabel || entry.shortTitle || entry.title,
          url: entry.url,
          description: entry.tagline || entry.excerpt,
        }));
        if (item.label) return [{ label: item.label, url: item.url || null, children }];
        return children;
      }
      return [{ ...item, children: item.children ? expand(item.children) : [] }];
    });

  const withActive = (items) =>
    items.map((item) => ({
      ...item,
      hasChildren: Boolean(item.children && item.children.length),
      external: /^https?:\/\//.test(item.url || '') && !String(item.url).includes(site.domain),
      children: item.children ? withActive(item.children) : [],
    }));

  return {
    header: {
      items: withActive(expand(navConfig.header?.items || [])),
      cta: navConfig.header?.cta || null,
    },
    footer: (navConfig.footer || []).map((column) => ({
      ...column,
      links: withActive(expand(column.links || [])),
    })),
    legal: withActive(expand(navConfig.legal || [])),
  };
}

export function loadSite({ includeDrafts = false, includeFuture = false } = {}) {
  const site = readJson(path.join(ROOT, 'site.config.json'));
  site.domain = site.url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  site.year = new Date().getFullYear();
  site.buildTime = new Date().toISOString();

  const data = {};
  if (fs.existsSync(paths.data)) {
    for (const file of fs.readdirSync(paths.data).filter((f) => f.endsWith('.json'))) {
      data[file.replace(/\.json$/, '')] = readJson(path.join(paths.data, file));
    }
  }

  const collections = {};
  for (const [name, config] of Object.entries(site.collections)) {
    const dir = path.join(ROOT, config.dir);
    let entries = listMarkdown(dir).map((file) =>
      loadEntry({ file, dir, collection: name, config, site }),
    );

    if (!includeDrafts) entries = entries.filter((entry) => !entry.draft);
    if (!includeFuture) {
      const now = Date.now();
      entries = entries.filter((entry) => !entry.date || new Date(entry.date).getTime() <= now);
    }

    entries = sortEntries(entries, config.sort);
    entries.forEach((entry, index) => {
      entry.previous = entries[index - 1] ? pick(entries[index - 1]) : null;
      entry.next = entries[index + 1] ? pick(entries[index + 1]) : null;
    });
    collections[name] = entries;
  }

  const nav = buildNavigation(data.navigation || { header: { items: [] } }, collections, site);

  const all = Object.values(collections).flat();
  const byUrl = new Map(all.map((entry) => [entry.url, entry]));

  return { site, data, collections, nav, all, byUrl };
}

/** Lightweight version of an entry, safe to embed in other entries. */
export function pick(entry) {
  if (!entry) return null;
  return {
    title: entry.title,
    shortTitle: entry.shortTitle || entry.title,
    tagline: entry.tagline || '',
    url: entry.url,
    slug: entry.slug,
    excerpt: entry.excerpt,
    description: entry.description,
    image: entry.image || '',
    logo: entry.logo || '',
    icon: entry.icon || '',
    category: entry.category || '',
    date: entry.date,
    dateFormatted: entry.dateFormatted,
    readingTime: entry.readingTime,
    tags: entry.tags,
    price: entry.price || '',
    badge: entry.badge || '',
    collection: entry.collection,
    highlights: entry.highlights || [],
  };
}
