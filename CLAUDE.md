# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Working on this repository

Instructions for Claude (or any agent) asked to change this site.

## What this is

A static site generator for twinstack.net. Content is markdown with
frontmatter, templates are logic-light HTML styled with Tailwind, everything
else is derived. Node 18+ and one `npm install` (Tailwind only) are the
requirements — no framework, no bundler.

**Read `TAILWIND-GUIDELINES.md` before writing any CSS or class name.**

```
site.config.json     brand, contact, collections, deploy, automation settings
content/data/*.json  navigation, shared facts, FAQ, redirects, blog queue
content/<type>/*.md  the pages themselves
templates/layouts/   one file per page type
templates/partials/  shared fragments (header, footer, cards, CTA)
styles/main.css      Tailwind source: theme tokens, utilities, component layer
assets/              compiled CSS, JS, images — copied to dist/assets
scripts/             build, dev server, checker, scaffolder, blog writer
dist/                generated output; never edit, never commit
```

## Commands

```bash
npm install                    # once — Tailwind is the only dependency
npm run build                  # build to dist/ (compiles CSS too)
npm run dev                    # preview at http://localhost:4321; rebuilds on change, drafts visible
npm run check                  # build, then fail on broken internal links or duplicate URLs
npm run css / npm run css:watch   # compile styles/main.css -> assets/css/main.css directly
npm run new <type> "Title"     # scaffold a product, service, page, post or case study
npm run nav:add -- "Label" "/url/" [--collection=name --limit=n]
npm run nav:remove -- "Label"
npm run blog:preview           # generate the next queued post with Claude, print only
npm run blog:generate          # generate and write it as a draft
npm run blog:publish           # generate and mark it published
```

There is no separate lint or test suite — `npm run check` (build + link/URL/SEO
validation) is the correctness gate. There is no way to build or check a single
page; both always run over the whole site.

## Architecture

`scripts/build.js` drives everything, using `scripts/lib/`:

1. `lib/content.js` loads `site.config.json`, every file under `content/data/`,
   and every markdown file in each collection directory named in
   `site.config.json` → `collections` (frontmatter + body), producing one
   `model` with `site`, `data`, `collections`, `nav`, `all` (every page) and
   `byUrl`.
2. `lib/template.js` is a tiny dependency-free logic-light engine (`{{ value }}`,
   `{{{ raw }}}`, `{{#if}}`/`{{#unless}}`, `{{#each}}`, `{{> partial}}`). Name
   lookup walks the whole context stack, so a partial or `{{#each}}` block
   reaches `site`/`nav`/`page` without prop drilling. Every
   `templates/partials/*.html` is registered by filename; every
   `templates/layouts/*.html` is registered as `layout:<name>`.
3. Per page: the markdown body is rendered as a template first — this is what
   makes `{{ site.contact.email }}` and `{{> stats }}` work inside content
   files — then through `lib/markdown.js`, then through the layout named in
   frontmatter, then wrapped in `templates/partials/base.html` together with
   JSON-LD from `lib/schema.js`.
4. After all pages are written, `build.js` generates `sitemap.xml`, `rss.xml`,
   `robots.txt`, `search-index.json` and `_redirects` (from
   `content/data/redirects.json`), then copies `assets/` and any `static/` into
   `dist/`. `lib/css.js` compiles `styles/main.css` with the Tailwind CLI after
   pages render (so Tailwind sees the generated HTML) and before assets are
   copied.
5. `scripts/dev.js` reruns this whole build (with `--drafts`) on any change
   under `content/`, `templates/`, `styles/`, `assets/js`, `assets/img`,
   `site.config.json` or `scripts/`, and serves `dist/` with clean URLs. In dev
   (`NODE_ENV=development`) every root-relative `href`/`src` is rewritten with
   a `/dist` prefix; absolute URLs (canonical, `og:*`, JSON-LD, sitemap, RSS)
   are left untouched. `scripts/check.js` strips that same prefix back off
   before checking that links resolve to real output files.
6. `scripts/check.js` reloads the same content model, walks the built `dist/`
   tree, and errors on duplicate URLs or internal links/images pointing at
   files that don't exist; it warns on missing or overlong SEO fields, missing
   `alt` text and thin body content.

Nothing in the pipeline is page-specific: a page exists because a markdown file
exists in a collection directory, and navigation highlighting, listing pages,
the sitemap, RSS, the search index and JSON-LD are all derived from `model` at
build time.

## Rules

1. **Never edit `dist/` or `assets/css/main.css`.** Both are generated. CSS is
   compiled from `styles/main.css` on every build.
2. **Never hardcode anything that appears on more than one page.** Contact
   details, nav links, stats and FAQ entries live in `site.config.json` or
   `content/data/`. If you find yourself typing the same string twice, it
   belongs in one of those files.
3. **Never hand-list content.** Product grids, service menus, blog listings and
   the footer are generated from collections. Adding a markdown file is the
   whole job.
4. **Run `npm run check` before saying you are done.** It builds and then fails
   on broken internal links and duplicate URLs.
5. **Markdown bodies are templated first, then rendered.** `{{ site.contact.email }}`
   and `{{> stats }}` work inside content files. Escape literal braces if a post
   needs to show template syntax.
6. **Do not invent facts.** Statistics, client names, release numbers and
   Salesforce behaviour need a source. If unsure, describe the shape of the
   thing rather than quantifying it.

## Common tasks

**Add a product, service, page, post or case study**

```bash
npm run new product "Field Audit Trail Viewer"
```

Fill in the frontmatter. Navigation, listing pages, the footer, sitemap, RSS and
the search index all update on the next build. Nothing else needs touching.

**Change something site-wide**

| Change | File |
| --- | --- |
| Phone, email, booking link | `site.config.json` → `contact` |
| Nav or footer structure | `content/data/navigation.json` |
| Headline stats | `content/data/company.json` |
| FAQ entries | `content/data/faq.json` |
| Colours, type scale, fonts | `styles/main.css` → `@theme` |
| A repeated visual pattern | `styles/main.css` → `@layer components` (read the guidelines first) |
| Page shell, meta tags, schema | `templates/partials/base.html`, `scripts/lib/schema.js` |
| A page type's structure | `templates/layouts/<layout>.html` |

**Add a new content type** (for example, `events`)

1. Add an entry to `site.config.json` → `collections`.
2. Create `templates/layouts/event.html` and, if it needs one, a list layout.
3. Create `content/events/` and add markdown.
4. Optionally add a `type: "collection"` entry to `navigation.json`.

No build code changes.

**Write a blog post with Claude**

```bash
npm run blog:preview          # print it, write nothing
npm run blog:generate         # write it as a draft
```

The house style, audience, banned phrases and topic queue live in
`content/data/blog-queue.json`. Change the writing by changing that file, not
`scripts/generate-post.js`.

## Frontmatter reference

Shared by every type: `title`, `description`, `slug`, `url`, `layout`, `order`,
`draft`, `noindex`, `navHidden`, `image`, `kicker`, `heroHeading`, `heroText`,
`faqTopics`, `showFaq`, `ctaHeading`, `ctaText`, `hideCta`.

- **products** — `tagline`, `badge`, `price`, `logo`, `installUrl`,
  `highlights[]`, `facts[{label,value,note}]`, `capabilities[{title,body}]`
- **services** — `tagline`, `highlights[]`, `deliverables[]`, `idealFor[]`,
  `steps[{title,body}]`
- **blog** — `date`, `category`, `author`, `tags[]`, `relatedProduct`, `excerpt`,
  `generated`
- **case-studies** — `tagline`, `category`, `client`, `industry`, `duration`,
  `stack[]`, `externalUrl`, `results[{value,label}]`

## CSS

Utilities in templates; `styles/main.css` only for tokens, patterns repeated in
three or more templates, and markdown output. Brand tokens only — no stock
Tailwind colours. Full rules in `TAILWIND-GUIDELINES.md`.

## Style

British spelling. Sentence case headings. Plain verbs. No exclamation marks, no
"unlock", "seamless", "game-changing" or "dive in". Claims about Salesforce
behaviour should be ones an admin could verify in an org.
