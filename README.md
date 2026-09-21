# TwinStack Solutions — website

A dependency-light static site generator. Markdown in, fast HTML out, styled
with Tailwind v4, with a weekly blog post written by Claude and reviewed by a
human before it publishes.

```bash
npm install               # once — Tailwind is the only dependency
node scripts/build.js     # build to dist/ (compiles CSS too)
npm run dev               # preview at http://localhost:4321 with live rebuild
npm run check             # build, then fail on broken links or duplicate URLs
npm run new post "Title"  # scaffold new content
npm run nav:add -- "FAQ" "/faq/"  # add item and update navigation.json
npm run nav:add -- "Products" "/products/" --collection=products --limit=8
npm run nav:remove -- "FAQ"  # remove a primary navbar item
npm run blog:generate     # write the next queued post with Claude
npm run blog:preview -- --topic="A useful topic" --description="Optional context for the post"
```

Node 18 or newer. Tailwind is the only dependency; there is no framework or
bundler.

**CSS:** [TAILWIND-GUIDELINES.md](TAILWIND-GUIDELINES.md) — read before writing
any class name or touching `styles/main.css`.
**Start here:** [EVERYTHING-YOU-NEED.md](EVERYTHING-YOU-NEED.md) — setup,
credentials, operating procedures and the scaling plan in one file.
**Agents:** [CLAUDE.md](CLAUDE.md) — rules for changing this repository.

## Layout

| Path | What lives there |
| --- | --- |
| `site.config.json` | Brand, contact details, collections, deploy and automation settings |
| `content/data/` | Navigation, shared facts, FAQ, redirects, blog topic queue |
| `content/pages/` | Standalone pages |
| `content/products/` | One file per AppExchange product |
| `content/services/` | One file per service |
| `content/blog/` | Posts, named `YYYY-MM-DD-slug.md` |
| `content/case-studies/` | One file per case study |
| `templates/layouts/` | One layout per page type |
| `templates/partials/` | Header, footer, cards, CTA, FAQ, stats |
| `styles/main.css` | Tailwind source: theme tokens, utilities, component layer |
| `assets/` | Compiled CSS (generated), JS, images |
| `scripts/` | Build, dev server, checker, scaffolder, blog writer |
| `dist/` | Generated. Never edit, never commit. |

## How content becomes a page

1. A markdown file appears in a collection directory.
2. The build reads its frontmatter, renders the body through the template engine
   (so `{{ site.contact.email }}` and `{{> stats }}` work in content), then
   through markdown.
3. The result is passed to the layout named in the frontmatter, wrapped in the
   base shell, and written to its URL.
4. Navigation, listing pages, related-content blocks, the sitemap, RSS feed,
   JSON-LD and the search index all pick it up automatically.

Adding a page means adding a file. Nothing else.
