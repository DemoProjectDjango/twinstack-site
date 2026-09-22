---
title: Upserts, external IDs and the lookup problem in CSV imports
date: 2026-09-15
category: Data
author: TwinStack Team
tags: [data loading, integration, migration]
relatedProduct: /products/smart-lookup-data-loader.html
description: Why lookup fields break CSV imports into Salesforce, how external IDs and multi-field matching fix it, and when to stop using VLOOKUP as a data pipeline.
excerpt: Your source system exports names and codes. Data loaders want record IDs. Everything painful about CSV imports lives in that gap.
---

Your source system exports names, codes and email addresses. Salesforce data loaders want eighteen-character record IDs. Nearly everything painful about loading CSVs into Salesforce lives in the gap between those two facts.

## The usual workaround, and its cost

The standard approach is a lookup table. Export a report of accounts with their IDs, VLOOKUP them against the account names in your import file, paste the resulting IDs into a column, load.

It works until any of the following happens, which is to say immediately:

- Two accounts share a name, and the VLOOKUP silently takes the first.
- A name has a trailing space, an ampersand spelled differently, or "Ltd" where the other file says "Limited".
- The load runs twice and creates duplicates, because nothing in the file identifies which records already exist.
- Someone reruns last month's file against this month's org, and the IDs have moved on.

Each of these produces bad data quietly. That is what makes them expensive: nobody finds out at load time.

## External IDs: the right fix when you control the source

An external ID field is a field on the Salesforce object marked *External ID*, holding the identifier the source system already uses. Once it exists, a lookup can be populated by that value instead of a record ID:

```
Name,Account.Legacy_Id__c,Email
Dana Ruiz,ACC-1042,dana@example.com
```

Point the loader at `Account.Legacy_Id__c` and it resolves the parent itself. Combined with an upsert keyed on the contact's own external ID, the load becomes idempotent: running the same file twice updates the same records rather than creating a second set.

This is the correct answer whenever your source system has stable identifiers and you can add a field to hold them. Set the field to unique, and index it, which marking it as an external ID does for you.

## When there is no stable identifier

Plenty of real imports have no usable key. A spreadsheet from a partner, an event attendee list, a finance export where the identifier is an internal sequence that gets reused.

Here the only sound approach is matching on a combination of fields — email plus account name, or postcode plus surname plus date — chosen so that the combination is unique in practice even though no single field is. The important part is deciding the combination deliberately, testing it against a sample, and applying the same rule to every subsequent load.

Single-field matching on anything as unstable as a company name is how most duplicate problems begin.

## A checklist before any bulk load

1. Profile the file. Count rows, count distinct values in your intended matching fields, and look for blanks.
2. Decide insert, update or upsert explicitly. "Upsert and see what happens" is not a decision.
3. Pick the matching key and prove it is unique in the sample.
4. Load into a full sandbox first, at full volume, and time it.
5. Reconcile: compare record counts and at least one numeric total against the source.
6. Keep the mapping. In six months someone will ask why a field looks the way it does.

## Doing it inside Salesforce

We wrote [Smart Lookup Data Loader](/products/smart-lookup-data-loader.html) to remove the VLOOKUP stage entirely. It runs natively in the org, auto-maps CSV headers to fields, resolves lookups by matching on the fields your file actually contains, supports multi-field matching for upserts, and reports failures per row so a rerun only touches what failed. It is free, and nothing leaves the org during a load.

For a one-off migration, the [data migration process](/services/data-migration.html) matters more than the tool: audit, mapping document, dry run, reconciliation. The tool only makes the execution less painful.
