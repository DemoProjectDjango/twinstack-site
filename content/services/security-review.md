---
title: Security Review preparation
tagline: Get a package through Salesforce Security Review, including one that has already failed.
order: 2
description: Security Review preparation and remediation for Salesforce ISVs: scanner findings, code fixes, submission documentation and reviewer responses.
highlights:
  - Full scanner run and triage
  - Remediation of findings in your codebase
  - Submission documents and reviewer responses
deliverables:
  - Checkmarx and PMD scan with every finding triaged as real or false positive
  - Code remediation for CRUD, FLS, sharing and injection findings
  - Written false-positive justifications reviewers accept
  - Completed submission documentation and test org setup
  - Responses to reviewer questions until the package passes
idealFor:
  - ISVs submitting for the first time
  - Packages that came back with findings
  - Teams facing an annual re-review deadline
steps:
  - title: Baseline scan
    body: We run the scanners against your current package and sort real findings from noise.
  - title: Triage and estimate
    body: You get a list of what must change, what can be justified, and how long each takes.
  - title: Remediation
    body: Fixes go in as reviewed pull requests against your repository, not as a patched copy.
  - title: Submission
    body: Documentation, test org, credentials and justifications prepared the way reviewers expect.
  - title: Response
    body: We stay on the ticket and answer follow-up questions until it passes.
faqTopics: [pdo]
---

## What reviewers actually test

Security Review is more predictable than its reputation suggests. The recurring categories are:

- **CRUD and FLS enforcement.** Every SOQL query and DML statement must respect what the running user is allowed to see and do.
- **Injection.** Dynamic SOQL, dynamic SOSL and anything built by string concatenation.
- **Sharing.** Classes declared `without sharing` need a defensible reason.
- **Secrets.** Credentials, API keys and endpoints in code or custom settings rather than in named credentials or protected custom metadata.
- **Endpoints and CSP.** External calls, remote site settings and Lightning Locker compliance.
- **Storage of customer data.** Anything leaving the org needs a documented reason and a documented retention policy.

## Why packages fail twice

The first failure usually produces a scramble: fix exactly the findings listed, resubmit, and get a second list that touches the same patterns elsewhere. The scanner report is a sample, not an inventory. Fixing the pattern across the codebase is what turns a second submission into a pass.

## Timeline

Plan for four to eight weeks from submission to outcome, plus however long remediation takes. Remediation on a mid-sized package typically runs two to four weeks. Nothing about the queue is in our control; everything about being ready for it is.
