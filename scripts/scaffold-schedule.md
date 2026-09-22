# Scaffold schedule

Dated content-generation jobs for `npm run scaffold:schedule`. Each job
writes one new page, with Claude researching and writing the actual body
copy from the brief you give it — not a placeholder. A job runs once its
date has arrived and it isn't already `"done": true`, then gets marked done
(with the date it actually ran) so it never runs twice. Requires
`ANTHROPIC_API_KEY` — without it, a job is printed instead of run, and stays
pending.

Fields:
- `location` (required) — either one of the collection directories from
  `site.config.json` (`content/products`, `content/services`, `content/blog`,
  `content/case-studies`) to get that type's real template and URL pattern,
  or any path under `content/pages/` for a standalone page, nested exactly
  as given (e.g. `content/pages/movies` -> `/movies/<slug>.html`). Anything
  else is rejected — the build only ever looks in those places.
- `title` (required) — also becomes the filename: `Interstellar` -> `interstellar.md`.
- `date` (required) — any date `new Date()` can parse. The job runs once this date arrives.
- `description` (required) — the brief: what the page is for and who it's for.
- `content` (optional) — raw notes, facts, quotes or copy to write from.
- `images` (optional) — array of image URLs/paths to work into the body.
- `research` (optional, default `true`) — let Claude use web search for
  supporting facts, same as `npm run blog:generate --research`.
- `done` / `completedDate` — bookkeeping the script maintains; don't hand-edit.

Preview what's due without generating, writing or marking anything:
`npm run scaffold:schedule:preview`.

```json
[
  {
    "location": "content/products",
    "title": "Sample product",
    "date": "2026-09-23",
    "description": "Description of the job.",
    "content": "",
    "images": [],
    "done": false
  },
  {
    "location": "content/pages/movies",
    "title": "Interstellar",
    "date": "2026-09-25",
    "description": "Description of the job.",
    "content": "",
    "images": [],
    "done": false
  }
]
```
