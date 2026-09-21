---
title: Who Sees What
shortTitle: Who Sees What
tagline: Pick a user and see exactly what they can access, and the rule that granted it.
order: 1
badge: Live on AppExchange
price: Free
logo: https://res.cloudinary.com/du42kbmmn/image/upload/f_auto,q_auto,w_140/v1788419416/Who_Sees_What_vy8udv.png
image: https://res.cloudinary.com/du42kbmmn/image/upload/f_auto,q_auto,w_1200/v1788419416/Who_Sees_What_vy8udv.png
installUrl: https://appexchange.salesforce.com/appxListingDetail?listingId=dc0aa216-dbed-49e5-86e0-542869f8dc26
heroHeading: Start with a user, not a permission set
description: See every object, field and record a Salesforce user can access, with the exact profile, permission set or sharing rule that granted it. Native, read-only, free.
highlights:
  - Object, field and record access in one view
  - Names the granting rule, not just the result
  - Read-only, nothing leaves the org
facts:
  - label: Time to an answer
    value: 2 clicks
    note: From a user to a complete access picture
  - label: Write access
    value: None
    note: Read-only by design, safe in production
  - label: Price
    value: Free
    note: No user cap, no usage tier
  - label: Clouds
    value: Sales, Service, Data, Nonprofit
capabilities:
  - title: See access through a user's eyes
    body: Pick anyone in the org and see every object, field and record they can touch. No reverse-engineering permission sets.
  - title: Know why, not just what
    body: Every result names the profile, permission set or sharing rule responsible for the grant.
  - title: Native and read-only
    body: Runs entirely inside Salesforce. No write operations, no external storage, nothing to expose.
  - title: Drill into any app
    body: Scope the question to one app or look across the whole org, whichever the question calls for.
  - title: Person Accounts supported
    body: Works in orgs using Person Accounts, so the answer is complete rather than partial.
  - title: Built for reviews
    body: Onboarding checks, offboarding checks, permission set cleanup and audit evidence.
faqTopics: [products]
---

## The problem it removes

Someone asks why a user can see a record they should not. Answering means stitching together profiles, permission sets, permission set groups, role hierarchy, sharing rules and manual shares in your head, one Setup screen at a time. Half an hour later you have an answer you are not fully sure of.

The direction is the real problem. Setup starts from a permission set and lists who it affects. The question you were asked started from the person.

## How it works

1. **Install the managed package.** A few clicks from the AppExchange. Lightning ready, nothing to configure first.
2. **Pick any user.** Search by name. No setup step, no definitions to create.
3. **Drill into an app, or don't.** Narrow the question or look across the org.
4. **Read object and field access together.** Object permissions and field-level security resolved into one view.
5. **See the records they can reach.** Where role hierarchy, sharing rules and manual shares usually complicate things.
6. **Read the granting rule.** Every row names what granted it, so you know exactly what to change.

## Against how this gets answered today

| | Standard setup screens | Manual spreadsheet audit | Who Sees What |
| --- | --- | --- | --- |
| Direction of enquiry | Permission set first | Whatever you assemble | User first |
| Object access | Several screens | Manual | One view |
| Field-level detail | Separate screen | Manual | Included |
| Record-level access | Hard to confirm | Estimated | Included |
| Shows the granting rule | Inferred | Inferred | Shown |
| Risk of changing something | Yes, you are in Setup | None | None, read-only |

Comparison reflects publicly documented behaviour at the time of writing.

## Why read-only matters

A permission inspector that could also change permissions would be a liability. This one cannot, which is what makes it safe to install in production and safe to hand to anyone who needs an answer — including people you would not give Setup access to.
