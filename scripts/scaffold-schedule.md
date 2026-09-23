# Scaffold schedule

Dated content-generation jobs for `npm run scaffold:schedule`. Each job
writes one new page, with Claude writing the actual body copy from the brief,
notes and images you give it — not a placeholder, and not padded out with
invented detail. A job runs once its date has arrived and it isn't already
`"done": true`, then gets marked done (with the date it actually ran) so it
never runs twice. Requires `ANTHROPIC_API_KEY` — without it, a job is printed
instead of run, and stays pending.

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
- `content` (optional) — raw notes, facts, quotes or copy to write from. Claude
  is told to write only from this plus the brief and images, not to invent
  anything beyond them, so thin notes produce a shorter, more general page
  rather than a confidently wrong one.
- `images` (optional) — array of image paths or URLs. An `http(s)://` entry is
  handed to Claude as a normal image source. Anything else is read as a path
  into this repo (e.g. `assets/img/movies/interstellar-poster.jpg`, with or
  without a leading `/`) and sent as real vision input, so Claude can write
  accurate, specific alt text and place it where it genuinely fits — not just
  reference a filename it never looked at. A missing file is skipped with a
  warning; anything over 5MB or not a jpg/png/gif/webp is still named in the
  body's image list but not shown visually.
- `research` (optional, default `true`) — let Claude use web search for
  supporting facts, same as `npm run blog:generate --research`.
- `done` / `completedDate` — bookkeeping the script maintains; don't hand-edit.

The generated page can link to other real pages on the site — Claude is given
the full list of existing URLs and told never to invent one, and any link it
adds anyway that doesn't match a real page is stripped automatically before
the file is written (the run log names what was removed).

Preview what's due without generating, writing or marking anything:
`npm run scaffold:schedule:preview`.

## Testing a job locally

1. Set `ANTHROPIC_API_KEY` — either `export ANTHROPIC_API_KEY=sk-ant-...` in
   your shell, or a `.env` file at the repo root (`npm run scaffold:schedule`
   loads it automatically via `--env-file-if-exists=.env`).
2. Add or edit a job below with today's date (or any date already in the
   past) and `"done": false`. A future date is left as "not due yet" and
   skipped — nothing is sent for it.
3. Run `npm run scaffold:schedule:preview` first. With no API key this prints
   the exact system prompt and user content (including which images resolved
   for vision) without spending anything; with a key it just reports the job
   is due and would be written, still writing nothing.
4. Run `npm run scaffold:schedule` to actually call Claude and write the file,
   then `npm run dev` to look at the real page, or `npm run check` to confirm
   it doesn't break links.
5. To re-test the same job: it's marked `"done": true` and the file it wrote
   now exists, so running it again just says "already exists, marking done
   without touching it". Delete the written `.md` file **and** reset
   `"done": false` (remove `completedDate`) to generate it again from scratch.

```json
[
  {
    "location": "content/products",
    "title": "Service Cloud",
    "date": "2026-09-23",
    "description": "Description of the job.",
    "content": "
    Category: CRM / Customer 
    ServiceWhat it does: Streamlines customer support, case tracking, and multi-channel issue resolution.Key 
    Features: Service Console, case management, automated macros, and a built-in knowledge base
    ",
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
