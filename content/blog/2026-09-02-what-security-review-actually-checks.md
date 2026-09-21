---
title: What Security Review actually checks, and what fails most often
date: 2026-09-02
category: ISV
author: TwinStack Team
tags: [security review, isv, appexchange]
relatedProduct: /services/security-review/
description: Salesforce Security Review tests a predictable set of categories. Here is what reviewers look for, which findings recur most, and why packages often fail twice.
excerpt: Security Review has a reputation for unpredictability it does not deserve. The categories are stable, and most failures come from four of them.
---

Security Review has a reputation for being opaque. In our experience it is one of the more predictable parts of shipping on the AppExchange. The categories are stable, the tooling is public, and most failures come from the same handful of patterns.

## The categories

**CRUD and FLS enforcement.** Every query and every DML statement must respect what the running user is allowed to see and change. `WITH USER_MODE` on SOQL and `as user` on DML cover most of this in modern Apex; older codebases rely on `Security.stripInaccessible()` or manual `isAccessible()` checks. The point reviewers are testing is whether a user can reach data through your package that they could not reach through the standard UI.

**Injection.** Dynamic SOQL and SOSL assembled by string concatenation. Bind variables solve it. `String.escapeSingleQuotes()` is a patch, not a fix, and reviewers know the difference.

**Sharing declarations.** Classes should declare `with sharing` unless there is a reason not to. `without sharing` is allowed, but you will be asked to justify each one, and "the tests failed otherwise" is not a justification.

**Secrets and endpoints.** API keys, tokens and endpoints belong in named credentials or protected custom metadata, not in code, not in a custom setting a customer admin can read.

**Front-end security.** Lightning Web Security compliance, no `unsafe-eval`, no third-party scripts loaded from a CDN at runtime, and correct escaping anywhere you render user-supplied content.

**Data leaving the org.** Any external transmission needs a documented purpose, a documented retention policy, and usually a privacy statement in the listing.

## Run the scanner before they do

The Salesforce Code Analyzer is the same class of tool reviewers use, and it is free:

```bash
sf scanner run --target "force-app" --category "Security" --format csv --outfile findings.csv
```

Run it in CI from the first sprint, not the week before submission. A codebase that has never been scanned typically produces several hundred findings on its first run, most of them the same three patterns repeated, and triaging them under deadline pressure is where mistakes get made.

## Why packages fail twice

The common trajectory is this. The package is submitted, comes back with a list of findings, the team fixes exactly those findings, resubmits, and gets a second list that touches the same patterns in different files.

The scanner report is a sample of where a pattern occurs, not an inventory. If FLS is missing on one controller, the reviewer's job is to flag the instance they found; your job is to assume the pattern exists elsewhere and fix it everywhere. Teams that do this pass on the second attempt. Teams that do not spend another six weeks in the queue.

## False positives, and how to write them up

Some findings are genuinely false positives — a `without sharing` class that only reads metadata, or a query on an object the user is guaranteed to have access to by the package's own install requirements.

These are accepted when the justification is specific. Name the file and line, explain what the code does, explain why the finding does not apply in that context, and say what stops it becoming a real issue later. A generic statement that the code is safe gets rejected, reasonably.

## What to plan for

Four to eight weeks from submission to outcome, depending on queue length and how many rounds of questions come back. Remediation on a mid-sized package usually takes two to four weeks of engineering time before submission.

Nothing about the queue is in your control. Everything about being ready for it is, and the difference between a prepared package and an unprepared one is usually a full quarter.

If you would rather not run this yourself, [Security Review preparation](/services/security-review/) is one of the things we do, including for packages that have already come back once.
