#!/usr/bin/env node
/**
 * Builds the whole site into dist/.
 *
 *   node scripts/build.js            production build
 *   node scripts/build.js --drafts   include drafts and future-dated posts
 *
 * Nothing here is page-specific. Pages appear because content files exist,
 * navigation appears because content/data/navigation.json describes it.
 */

import fs from 'node:fs';
import path from 'node:path';
import { TemplateEngine, escapeHtml } from './lib/template.js';
import { loadSite, paths, outputPathFor, pick, ROOT } from './lib/content.js';
import { renderMarkdown, excerpt } from './lib/markdown.js';
import { buildJsonLd } from './lib/schema.js';
import { buildCss } from './lib/css.js';

const args = new Set(process.argv.slice(2));
const includeDrafts = args.has('--drafts') || args.has('--dev');

// In development the site is often previewed from a server that serves this
// whole project directory, so dist/ is reachable at /dist rather than at the
// domain root. Every root-relative href/src gets that prefix; absolute URLs
// (canonical, og:*, JSON-LD, sitemap, RSS) are untouched since they already
// point at the real production domain.
const base = process.env.NODE_ENV === 'development' ? '/dist' : '';

function withBase(html) {
  if (!base) return html;
  return html.replace(/((?:href|src)=")\/(?!\/)/g, `$1${base}/`);
}

/* ------------------------------------------------------------------- helpers */

function loadTemplates(engine) {
  for (const [dir, prefix] of [[paths.partials, ''], [paths.layouts, 'layout:']]) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.html'))) {
      engine.add(prefix + file.replace(/\.html$/, ''), fs.readFileSync(path.join(dir, file), 'utf8'));
    }
  }
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) return 0;
  fs.mkdirSync(to, { recursive: true });
  let count = 0;
  for (const item of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, item.name);
    const dest = path.join(to, item.name);
    if (item.isDirectory()) count += copyDir(src, dest);
    else { fs.copyFileSync(src, dest); count++; }
  }
  return count;
}

function write(file, contents) {
  const target = path.join(paths.dist, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
}

function markActive(items, currentUrl) {
  return items.map((item) => {
    const children = item.children ? markActive(item.children, currentUrl) : [];
    const active =
      item.url === currentUrl ||
      (item.url && item.url !== '/' && currentUrl.startsWith(item.url)) ||
      children.some((child) => child.active);
    return { ...item, children, active, ariaCurrent: active ? ' aria-current="page"' : '' };
  });
}

/* --------------------------------------------------------------------- build */

function build() {
  const started = Date.now();
  const model = loadSite({ includeDrafts, includeFuture: includeDrafts });
  const { site, data, collections, nav, all } = model;

  const engine = new TemplateEngine();
  loadTemplates(engine);

  fs.rmSync(paths.dist, { recursive: true, force: true });
  fs.mkdirSync(paths.dist, { recursive: true });

  const written = [];
  const searchIndex = [];

  const lists = Object.fromEntries(
    Object.entries(collections).map(([name, entries]) => [name, entries.map(pick)]),
  );

  for (const entry of all) {
    const layoutName = `layout:${entry.layout}`;
    if (!engine.templates[layoutName]) {
      throw new Error(`${entry.sourceFile}: layout "${entry.layout}" not found in templates/layouts/`);
    }

    // Breadcrumb parents come from the collection config, never hand-written.
    const parent = site.collections[entry.collection]?.index;
    const page = {
      ...entry,
      parentLabel: entry.parentLabel || parent?.label || null,
      parentUrl: entry.parentUrl || parent?.url || null,
    };

    // FAQ entries are filtered from the one shared file by topic.
    const allFaq = data.faq?.items || [];
    const topics = page.faqTopics || page.faqTopic;
    const ownFaq = Array.isArray(page.faq) ? page.faq : [];
    const faqItems = ownFaq.length
      ? ownFaq
      : topics
        ? allFaq.filter((item) => [].concat(topics).includes(item.topic))
        : page.showFaq
          ? allFaq
          : [];

    // Content bodies may use template syntax, so shared values stay in one place.
    const context = {
      site,
      data,
      nav: { ...nav, primary: markActive(nav.primary, entry.url) },
      page,
      collections: lists,
      ...lists,
      faqItems,
      isHome: entry.url === '/',
      latestPosts: (lists.blog || []).filter((p) => p.url !== entry.url).slice(0, 3),
      otherProducts: (lists.products || []).filter((p) => p.url !== entry.url),
      otherServices: (lists.services || []).filter((p) => p.url !== entry.url).slice(0, 3),
      relatedItems: [page.relatedProduct]
        .filter(Boolean)
        .map((url) => model.byUrl.get(url))
        .filter(Boolean)
        .map(pick),
    };

    const rerendered = renderMarkdown(engine.renderString(entry.body, context));
    context.page = { ...page, content: rerendered.html, headings: rerendered.headings };

    const main = engine.render(layoutName, context);
    const html = engine.render('base', {
      ...context,
      main,
      jsonLd: buildJsonLd({ site, page: context.page, faqItems }),
    });

    const file = outputPathFor(entry.url);
    write(file, withBase(html));
    written.push({ url: entry.url, file, collection: entry.collection });

    if (entry.noindex !== true) {
      searchIndex.push({
        title: entry.title,
        url: entry.url,
        collection: entry.collection,
        description: entry.description,
        tags: entry.tags,
        text: excerpt(entry.body, 400),
      });
    }
  }

  /* ---------------------------------------------------------------- feeds */

  const indexable = all.filter((e) => e.noindex !== true);
  const sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    indexable
      .map((entry) => {
        const lastmod = entry.updated || entry.date || site.buildTime;
        const priority = entry.url === '/' ? '1.0' : entry.collection === 'blog' ? '0.6' : '0.8';
        return `  <url>\n    <loc>${entry.absoluteUrl}</loc>\n    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>\n    <changefreq>${entry.collection === 'blog' ? 'monthly' : 'weekly'}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
      })
      .join('\n') +
    `\n</urlset>\n`;
  write('sitemap.xml', sitemap);

  const posts = (collections.blog || []).slice(0, 25);
  const rss =
    `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n` +
    `  <title>${escapeHtml(site.name)} Blog</title>\n  <link>${site.url}</link>\n` +
    `  <description>${escapeHtml(site.description)}</description>\n  <language>${site.language || 'en'}</language>\n` +
    `  <atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml"/>\n` +
    posts
      .map(
        (post) =>
          `  <item>\n    <title>${escapeHtml(post.title)}</title>\n    <link>${post.absoluteUrl}</link>\n    <guid isPermaLink="true">${post.absoluteUrl}</guid>\n    <pubDate>${new Date(post.date || site.buildTime).toUTCString()}</pubDate>\n    <description>${escapeHtml(post.excerpt)}</description>\n  </item>`,
      )
      .join('\n') +
    `\n</channel>\n</rss>\n`;
  write('rss.xml', rss);

  write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`);
  write('search-index.json', JSON.stringify(searchIndex));

  if (site.deploy?.cname) write('CNAME', `${site.deploy.cname}\n`);
  write('.nojekyll', '');

  const redirects = (data.redirects || [])
    .map((rule) => `${rule.from} ${rule.to} ${rule.status || 301}`)
    .join('\n');
  if (redirects) write('_redirects', `${redirects}\n`);

  // Tailwind scans the templates, so CSS is compiled after pages are rendered
  // and before assets are copied into dist/.
  const css = buildCss({ minify: !includeDrafts });

  const assetCount = copyDir(paths.assets, path.join(paths.dist, 'assets'));
  const staticCount = copyDir(path.join(ROOT, 'static'), paths.dist);

  /* --------------------------------------------------------------- report */

  const byCollection = written.reduce((acc, item) => {
    acc[item.collection] = (acc[item.collection] || 0) + 1;
    return acc;
  }, {});

  console.log(`\n  ${site.name} — build complete in ${Date.now() - started}ms`);
  console.log(`  ${written.length} pages, ${assetCount + staticCount} static files, ${(css.bytes / 1024).toFixed(1)}kB CSS -> dist/\n`);
  for (const [name, count] of Object.entries(byCollection).sort()) {
    console.log(`    ${String(count).padStart(3)}  ${name}`);
  }
  if (includeDrafts) console.log('\n  (drafts and future-dated posts included)');
  if (base) console.log(`  (NODE_ENV=development — internal links prefixed with ${base})`);
  console.log('');

  return { written, model };
}

try {
  build();
} catch (error) {
  console.error(`\n  Build failed: ${error.message}\n`);
  if (process.env.DEBUG) console.error(error);
  process.exit(1);
}
