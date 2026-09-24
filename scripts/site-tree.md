<<<<<<< HEAD
=======
# Site tree

Defines the full page tree for `scripts/scaffold-tree.js`. Indentation shows hierarchy for readability only — the path on each line is what's authoritative. Anything after " — " is the instruction passed to Claude when filling in body content; a line with no instruction is scaffolded from its filename and position in the tree instead.

If `scripts/site-tree-content/<path>.md` exists for a path (same path, `.html` swapped for `.md` — e.g. `scripts/site-tree-content/contact.md` for the `contact.html` line below), that file is written verbatim instead of the generic skeleton, and any " — " instruction on that line is ignored. Everything else scaffolds as before.

>>>>>>> dev
- index.html 
- about.html 
- contact.html
- faq.html 
- privacy.html 
- terms.html 
- 404.html 
- products/index.html 
  - products/google-form-auto-sync.html 
  - products/smart-lookup-data-loader.html 
  - products/who-sees-what.html 
- services/index.html 
  - services/appexchange-product-development.html 
  - services/data-migration.html 
  - services/integrations.html 
  - services/salesforce-implementation.html 
  - services/security-review.html
  - services/who_sees_what/index.html 
    - services/who_sees_what/how_to_use.html 
- blog/index.html 
<<<<<<< HEAD
=======
- case-studies/index.html
- case-studies/raro/coupon-offer.html
- case-studies/raro/coupon-offer/monthly.html
- movies/interstellar.html
- movies/inception.html
>>>>>>> dev
