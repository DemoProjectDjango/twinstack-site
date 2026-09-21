---
title: AppExchange product development
shortTitle: AppExchange product development
tagline: Full PDO service: architecture, build, Security Review and listing, for ISVs launching on the AppExchange.
order: 1
description: TwinStack is a Salesforce Product Development Outsourcer. We architect, build, review and package AppExchange apps for B2B ISV partners.
highlights:
  - Feasibility and data model design
  - LWC and Apex development in a scratch-org pipeline
  - Security Review and listing support
deliverables:
  - Technical feasibility assessment against platform and governor limits
  - Scalable data model and sharing design
  - Managed package built in LWC and Apex, developed in version control
  - Scratch-org based CI pipeline you keep after the engagement
  - Security Review preparation, submission and response handling
  - Listing assets, demo org and installation documentation
idealFor:
  - Founders with a validated idea and no Salesforce engineering team
  - ISVs on another platform bringing a product to Salesforce
  - Partners whose package has stalled in Security Review
steps:
  - title: Feasibility
    body: Two weeks of architecture work that tells you whether the idea is buildable inside platform limits, and what it costs.
  - title: Data model and design
    body: Objects, sharing, packaging boundaries and namespace decisions made before any code exists.
  - title: Build
    body: LWC and Apex in pull requests, deployed continuously to scratch orgs, demoed every two weeks.
  - title: Security Review
    body: Scanner runs, findings fixed, submission written, questions answered until it passes.
  - title: Listing and launch
    body: Managed package versioning, listing copy, demo org and the assets the AppExchange team asks for.
faqTopics: [pdo, engagement]
---

## What a PDO actually is

A Product Development Outsourcer is a Salesforce-authorised partner that builds AppExchange applications on behalf of an ISV. In practice that means we take responsibility for the parts of the journey that are specific to Salesforce — the packaging model, the sharing model, the review process — so your team can stay focused on the product itself.

## Where projects go wrong

Almost every stalled AppExchange project we inherit has the same two problems.

The first is a data model designed for one customer. It works beautifully in the demo org and collapses when a second customer with different sharing requirements installs it. Packaging boundaries and sharing behaviour are architecture decisions, not configuration, and they are very expensive to revisit after launch.

The second is treating Security Review as a stage at the end. Reviewers test for the same categories every time: CRUD and FLS enforcement, SOQL injection, insecure endpoints, stored secrets, CSP compliance. Code written without those in mind fails, gets patched, fails again, and adds months.

## How we price it

Feasibility is fixed price. Build is either fixed-scope per milestone or a monthly retainer, depending on how settled the requirements are. Security Review support is included in build engagements rather than billed separately, because we would rather design for it than charge for fixing it.
