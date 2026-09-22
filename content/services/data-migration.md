---
title: Data migration
tagline: Move from a legacy system into Salesforce with integrity you can prove.
order: 3
description: Salesforce data migration: source audit, field mapping, sanitisation, dry runs and a reconciliation report proving nothing was lost.
highlights:
  - Source audit before any mapping
  - Dry runs in a full sandbox
  - Reconciliation report you can hand to finance
deliverables:
  - Audit of source data structures, volumes and quality
  - Field-to-field mapping document, agreed before execution
  - Deduplication and sanitisation rules
  - At least two full dry runs in a sandbox
  - Cutover plan with rollback
  - Reconciliation report comparing source and target record counts and totals
idealFor:
  - Teams leaving HubSpot, Dynamics, Zoho or a homegrown database
  - Org consolidations after a merger
  - Anyone whose last migration left data they do not trust
steps:
  - title: Audit
    body: We profile the source: volumes, orphans, duplicates, encodings, and the fields nobody uses any more.
  - title: Map
    body: A written mapping document, reviewed by whoever owns the data, before a single record moves.
  - title: Dry run
    body: Full-volume load into a sandbox, timed, so cutover length is known rather than estimated.
  - title: Cutover
    body: Executed against an agreed freeze window, with a rollback position at every stage.
  - title: Reconcile
    body: Counts, sums and spot checks compared against source, written up as evidence.
faqTopics: [services]
---

## The audit is the project

Most migration pain is discovered rather than caused: a country field with 40 spellings, contacts with no account, a currency column that is text, historical records whose owner no longer exists. Finding those in the audit is cheap. Finding them during cutover weekend is not.

We do not quote a migration until we have profiled the source, because the number depends entirely on what the audit turns up.

## What you get afterwards

The mapping document, the transformation rules and the reconciliation report stay with you. When someone asks in six months why a field looks the way it does, the answer is written down.

For recurring imports after the migration, our [Smart Lookup Data Loader](/products/smart-lookup-data-loader.html) handles CSV upserts with lookup resolution natively, which usually removes the need for an ongoing ETL licence.
