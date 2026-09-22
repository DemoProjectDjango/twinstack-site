---
title: The five places Salesforce permission actually comes from
date: 2026-08-25
category: Admin
author: TwinStack Team
tags: [permissions, security, admin]
relatedProduct: /products/who-sees-what.html
description: Profiles, permission sets, groups, role hierarchy and sharing rules all grant access, and no Setup screen shows them together. How to trace a grant.
excerpt: Five separate mechanisms grant access in Salesforce, and no single Setup screen shows them together. Here is how to trace any grant back to the rule that made it.
---

Someone messages you: *why can Dana see this opportunity?* It sounds like a five-minute question. It is not, and the reason is structural rather than a gap in your knowledge.

## Access is granted in five places

**Profiles** set the baseline. Object permissions, field-level security, and the record types and apps a user can reach. Every user has exactly one.

**Permission sets** add to that baseline. They never subtract. A user with four permission sets has the union of everything those sets grant plus everything the profile grants.

**Permission set groups** bundle sets, with muting to remove specific permissions inside the group. This is the layer people forget, and the one most likely to explain a grant nobody can account for.

**Role hierarchy** controls record visibility upward. A manager sees the records their subordinates own, when the object's sharing settings allow it.

**Sharing rules and manual shares** extend record access sideways: criteria-based rules, owner-based rules, territory sharing, manual shares, and Apex managed sharing.

Object and field access come from the first three. Record access comes from organisation-wide defaults, then the last two. An answer that only covers one group is a partial answer, and a partial answer is how an over-permissioned user stays over-permissioned.

## Why Setup cannot answer the question directly

Setup screens are organised around configuration objects. You open a permission set and it tells you who has it. You open a sharing rule and it tells you what it grants.

The question you were asked runs the other way: start with a person, end with everything they can reach. Answering it in Setup means visiting six screens, holding partial results in your head, and combining them manually — which is both slow and easy to get wrong.

## Tracing a grant by hand

When you do need to do it manually, work in this order. It fails fast, which saves time.

1. **Check the object.** Setup → Object Manager → the object → does the profile grant read? If not, which permission set does? `ObjectPermissions` in the Tooling API answers this faster than clicking.
2. **Check the field.** Field-level security is separate from object access, and a hidden field will make a user insist they cannot see a record they can in fact open.
3. **Check the org-wide default.** If the OWD is Public Read/Write, stop. The record is visible to everyone and no sharing rule is responsible.
4. **Check ownership and the role hierarchy.** Does the user own it, or sit above the owner in the hierarchy with *Grant Access Using Hierarchies* enabled for that object?
5. **Check sharing rules.** Criteria-based first — they are easiest to misjudge, because a rule written for one team often matches records well outside it.
6. **Check manual and Apex shares.** Query the share object directly. For a custom object called `Deal__c`, that is `Deal__Share`:

```sql
SELECT Id, UserOrGroupId, AccessLevel, RowCause
FROM Deal__Share
WHERE ParentId = 'a0X...'
```

`RowCause` is the useful column. It tells you whether the share came from ownership, the hierarchy, a rule, a manual share or Apex — which is the actual answer to *why*.

## The failure mode worth naming

The version of this that causes real damage is not a wrong answer. It is a partial one: the check covers object access, the object access looks correct, and the investigation stops there. Meanwhile a sharing rule written two years ago for a team that has since been reorganised is quietly granting record access to thirty people.

That is why offboarding checks and access reviews are worth running against a complete picture rather than a sampled one, and why "deactivating the user covered it" is an assumption rather than evidence.

## Doing it in two clicks instead

We built [Who Sees What](/products/who-sees-what.html) because we were running the manual version of this process several times a week. It starts from a user, resolves object, field and record access together, and names the profile, permission set or sharing rule responsible for each grant. It is native, read-only and free, so it is safe to install in production and safe to hand to someone you would not give Setup access to.

The manual method above still matters. Knowing where access comes from is what lets you decide what to change once you can see it.
