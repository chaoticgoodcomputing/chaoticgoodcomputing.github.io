---
title: Intro to Event Storming
date: 2026-01-06
tags:
  - annotations
  - engineering
  - projects/dayjob
---
I was sent a video on the concept of [event storming](https://www.youtube.com/watch?v=l93N4XaQJok) recently. This'll be a more concrete note on the concept, overview, and my thoughts.

## Colors/Terminologies

### Workflow Atoms

- **🟧 Domain Event:**
    - **Past-tense Language.** Understand the business, bridging definitions from problems to associated solutions.
    - Events being reacted to, hence past tense
- **🟫 Actor:**
    - Actual user being defined in the background. Sets role contexts, authorizations, capabilities by actual user.
- **🟦 Command:**
    - Action made by actor to trigger the domain event. Many-to-one relationship with 🟧 Domain Events.
- **🟪 Policy:**
    - Constraints on class constructors — conditionals between 🟦 Command and 🟧 Domain Events to determine if the state is in a position for the command to trigger domain event(s), or which domain events can be triggered.
    - **🟥 Hotspot:**
        - Attached to policies(?)
        - System/API-specific 🟪 Policies related to non-internal-state issues, such as errors or unavailability.

### State Atoms

- **🟩 Model/View:** Actual data entries/tables representing the underlying state of the application
    - SCHEMAS, not concrete TABLES. This is because model/view is also used to define responses from 💟 External Systems.
- **💟 External System:**
    - External (non-app-owned) APIs. Backing data for a) 🟩 Model/View, providing the backing data from external APIs in a standard schema consumed by the application (NOT DIRECTLY BY WORKFLOWS) and b) vital for 🟥 Hotspots related to external API availability.

### Molecules

- **🟨 Aggregate Entry:**
    - Keywords and terminology of aggregates. E.g. in e-commerce, "cart" is related to all of the individual workflows AND data for a given feature
## Initial Thoughts

The term "API surface" has been flashing around in my brain a lot lately, and this seems to be a nice way to describe layers of the application:

- **API Surface:**
    - **🟫 Actor** defines users based on their roles
    - **🟧 Domain Event** defines what the API should be able to "react" to
    - **🟦 Command** represents what commands are available to trigger those **🟧 Domain Event** reactions
    - **🟪 Policy** entries define what actions from **🟫 Actor** can be reacted to via **🟧 Domain Event** based on the authorization, as well as state, of the application
        - **🟥 Hotspot** seems to be a subset of this for error states
- Internals/Under-the-hoods:
    - **🟩 Model/View** defines the actual data backing the application using strong schemas (three cheers for [[tags/projects/flowthru/index|strong schemas!]])
    - **💟 External System** defines data/state retrieved through **🟩 Model/View** that is not owned by the application (such as an external API) that the application has less control over, and must be accounted for with **🟥 Hotspot** entries
- Conceptual:
    - **🟨 Aggregate** is used to "collect" all of the above into higher-level concepts

## Phasing

Using Event Storming for product planning breaks into distinct phases:

1. **Chaotic Exploration:** Define the surface purely by **🟧 Domain Event** entries and **🟥 Hotspot** entries
    - This feels slightly confusing, since **🟥 Hotspot** entries seem to have a hard dependency on **💟 External System**. Maybe it's just general error states?
    - It seems like the use case for this — particularly phase 1 — would be for rapid note-taking during business meetings to try and define the shape of the user interaction surface. Basically, making sure that you and the folks on the business side have the same "shape" of the application before beginning even technical planning, never mind technical development.
    - The immediate Phase 1 hop from "What can this do" into "How can this fuck up" feels a bit cart-ahead-of-the-horse. That may be an initial knee-jerk reaction, so I'm going to roll with this for now until I've done it a few times before making a judgement.
2. **Timeline Enforcement:** Ordering the Chaotic Exploration by the natural lifecycle of when events happen. Creating connections between **🟧 Domain Event** entries that are placed in a logical order of "🟧 X must occur before 🟧 Y".
    - I'm not sure if **🟥 Hotspot** continues to play a "primary" role in this, and more that the timeline enforcement bubbles up potential timing issues (e.g. "🟧 X must happen before 🟧 Y, so a Y->X would cause hotspot 🟥 Z to occur)
3. **Commands/Actors:** Flesh out with Commands and Actors
4. **Entities:** TODO
5. **Policies/Read Models**

## Phasing session thoughts

The Phase 1 being **🟧 Domain Event** and **🟥 Hotspot** feels somewhat confusing. With the goal of speaking in real-world, shared terms with business folks, I feel that it'd make sense to go with **🟫 Actor** and **🟧 Domain Event** entries first, then going into Timeline connections for Phase 2, then going with **🟥 Hotspot** for Phase 3.

The idea would be:

1. Business Meeting:
    1. Phase 1: Chaotic Entries
    2. Phase 2: Timeline Organization
2. Follow-up Engineering Meeting:
    1. Phase 3:
    2. Phase 4:
    3. Phase 5: