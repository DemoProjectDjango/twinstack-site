# Changelog

<!-- changelog-since: 2026-09-23T04:51:23.499Z -->
Tracking changes committed since 2026-09-23. Regenerated on every
`npm run scaffold` — do not hand-edit, it will be overwritten. This is a
readable trail, not a rollback tool: to actually undo something, use `git
log` and `git revert`/`git checkout` as normal.

## 2026-09-23 — Make home.html a generic renderer of a data-driven section list

by Twin Stack

- modified: `CLAUDE.md`
- modified: `EVERYTHING-YOU-NEED.md`
- added: `content/data/home.json`
- modified: `scripts/edit-page.js`
- modified: `scripts/lib/template.js`
- modified: `templates/layouts/home.html`
- added: `templates/partials/section-blog.html`
- added: `templates/partials/section-case-studies.html`
- added: `templates/partials/section-products.html`
- added: `templates/partials/section-services.html`
- added: `templates/partials/section-stats.html`

## 2026-09-23 — Strip Salesforce/AppExchange-specific hardcoding out of the template layer

by Twin Stack

- modified: `TAILWIND-GUIDELINES.md`
- modified: `site.config.json`
- modified: `styles/main.css`
- modified: `templates/layouts/case-study.html`
- modified: `templates/layouts/contact.html`
- modified: `templates/layouts/home.html`
- modified: `templates/layouts/list-blog.html`
- modified: `templates/layouts/list-case-studies.html`
- modified: `templates/layouts/list-products.html`
- modified: `templates/layouts/list-services.html`
- modified: `templates/layouts/page.html`
- modified: `templates/layouts/post.html`
- modified: `templates/layouts/product.html`
- modified: `templates/layouts/service.html`
- modified: `templates/partials/cta.html`
- modified: `templates/partials/footer.html`

## 2026-09-23 — fix: site tree update on scheduled job

by Twin Stack

- added: `CHANGELOG.md`
- added: `content/_scheduled/john-wick.html`
- modified: `scripts/scaffold-schedule.md`
- modified: `scripts/site-tree.md`

## 2026-09-23 — Keep site-tree.md in sync when a scheduled job publishes a page

by Twin Stack

- modified: `scripts/lib/scaffold-tree-runner.js`
- modified: `scripts/scaffold-schedule.js`

## 2026-09-23 — Support moving full standalone HTML documents via a static/ location

by Twin Stack

- modified: `scripts/scaffold-schedule.js`
- modified: `scripts/scaffold-schedule.md`

## 2026-09-23 — Fix scaffold-schedule.js reading the wrong json fence as the job list

by Twin Stack

- modified: `scripts/scaffold-schedule.js`

## 2026-09-23 — Add move jobs to scaffold-schedule: relocate premade pages instead of generating them

by Twin Stack

- modified: `scripts/lib/content.js`
- modified: `scripts/scaffold-schedule.js`
- modified: `scripts/scaffold-schedule.md`

## 2026-09-23 — Tolerate raw line breaks pasted into scaffold-schedule.md job strings

by Twin Stack

- modified: `scripts/scaffold-schedule.js`
- modified: `scripts/scaffold-schedule.md`
