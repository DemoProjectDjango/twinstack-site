# Site tree

Defines the full page tree for `scripts/scaffold-tree.js`. Indentation shows
hierarchy for readability only — the path on each line is what's authoritative.
Anything after " — " is the instruction passed to Claude when filling in body
content; a line with no instruction is scaffolded from its filename and
position in the tree instead.

- index.html — Home page for TwinStack Solutions, a Salesforce Product Development Outsourcer. Lead with what a PDO is and why an ISV founder building on the AppExchange would need one: architecture, build, Security Review, and the implementation/integration work around it.
- about.html — Who TwinStack is, the AppExchange PDO angle, why a small focused team beats a generalist agency for Security Review work.
- contact.html — How to reach TwinStack: booking link, email, response-time expectation. Short.
- faq.html — Landing page for the FAQ partial; intro sentence only, the questions themselves come from content/data/faq.json.
- privacy.html — Standard privacy policy for a B2B services site. Do not invent data-handling claims — describe only what's evidently true of this site (contact form, analytics, no ecommerce).
- terms.html — Standard terms of service for a services engagement. Keep generic; no invented SLAs or numbers.
- 404.html — Not-found page. Short, points at home, products and services.
- products/index.html — Listing intro for the AppExchange products catalogue (the products collection renders below it automatically).
  - products/google-form-auto-sync.html — Product page for an app that syncs Google Form submissions into Salesforce records. Describe the problem (manual re-entry from form responses) and the shape of the fix, without inventing install numbers or specific field mappings.
  - products/smart-lookup-data-loader.html — Product page for a smarter data-loader tool for Salesforce lookups. Describe the problem it solves (matching/deduping on lookup fields during import) without inventing benchmarks.
  - products/who-sees-what.html — Product page for a tool that visualises Salesforce sharing and visibility (who can see a given record and why). Describe it as an admin-facing diagnostic, not a security-guarantee tool.
- services/index.html — Listing intro for the services catalogue (the services collection renders below it automatically).
  - services/appexchange-product-development.html — Service page: end-to-end build of an AppExchange-listed managed package, from architecture through Security Review submission.
  - services/data-migration.html — Service page: Salesforce data migration and cleanup work (imports, dedupe, field mapping).
  - services/integrations.html — Service page: building integrations between Salesforce and external systems.
  - services/salesforce-implementation.html — Service page: implementing Salesforce for a client org (setup, configuration, adoption), distinct from AppExchange product work.
  - services/security-review.html — Service page: helping ISV partners prepare for and pass Salesforce Security Review specifically. Claims about what Security Review checks should be things an admin/reviewer could verify.
  - services/who_sees_what/index.html — Landing page for a short guide on the Salesforce sharing model (why "who sees what" is hard to answer in a growing org) as a lead-in to the security-review and who-sees-what product pages.
    - services/who_sees_what/how_to_use.html — Practical how-to: the steps an admin takes to actually answer "who can see this record" in their own org, referencing standard Salesforce tools (sharing settings, OWD, role hierarchy) rather than only the TwinStack product.
- blog/index.html — Listing intro for the blog (posts render below it automatically).
- case-studies/index.html — Listing intro for case studies (entries render below it automatically).
- movies/index.html — Listing all the movies.
- movies/how-to-train-your-dragon.html — Listing intro for the blog (posts render below it automatically).
- movies/inception.html — A sci-fi movie by Leonardo da Capiprio.
- movies/south/leo.html — A South indian movie
