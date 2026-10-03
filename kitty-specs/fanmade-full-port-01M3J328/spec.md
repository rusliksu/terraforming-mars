# Mission Specification: [MISSION NAME]
<!-- Replace [MISSION NAME] with the confirmed friendly title generated during /spec-kitty.specify. -->

**Mission Branch**: `[###-mission-name]`  
**Created**: [DATE]  
**Status**: Draft  
**Input**: User description: "$ARGUMENTS"

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently - e.g., "Can be fully tested by [specific action] and delivers [specific value]"]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 3 - [Brief Title] (Priority: P3)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- What happens when [boundary condition]?
- How does system handle [error scenario]?

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED:
  1) Keep requirement types separated (Functional / Non-Functional / Constraints)
  2) Use unique IDs per type (FR-###, NFR-###, C-###)
  3) Keep Status populated for every row
  4) Non-functional requirements must include measurable thresholds
-->

### Functional Requirements

| ID | Title | User Story | Priority | Status |
|----|-------|------------|----------|--------|
| FR-001 | [Short title] | As a [role], I want [goal] so that [benefit]. | High | Open |
| FR-002 | [Short title] | As a [role], I want [goal] so that [benefit]. | Medium | Open |
| FR-003 | [Short title] | As a [role], I want [goal] so that [benefit]. | Low | Open |

### Non-Functional Requirements

| ID | Title | Requirement | Category | Priority | Status |
|----|-------|-------------|----------|----------|--------|
| NFR-001 | [Short title] | [Measurable threshold, e.g., p95 latency under 300ms] | Performance | High | Open |
| NFR-002 | [Short title] | [Measurable threshold] | Security | High | Open |
| NFR-003 | [Short title] | [Measurable threshold] | Reliability | Medium | Open |

### Constraints

| ID | Title | Constraint | Category | Priority | Status |
|----|-------|------------|----------|----------|--------|
| C-001 | [Short title] | [Required boundary or limitation] | Technical | High | Open |
| C-002 | [Short title] | [Required boundary or limitation] | Business | Medium | Open |
| C-003 | [Short title] | [Required boundary or limitation] | Regulatory | Medium | Open |

### Key Entities *(include if feature involves data)*

- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: [Measurable metric, e.g., "Users can complete account creation in under 2 minutes"]
- **SC-002**: [Measurable metric, e.g., "System handles 1000 concurrent users without degradation"]
- **SC-003**: [User satisfaction metric, e.g., "90% of users successfully complete primary task on first attempt"]
- **SC-004**: [Business metric, e.g., "Reduce support tickets related to [X] by 50%"]
# Full fanmade mechanics integration

## Confirmed intent
Ruslan approved the complete implementation plan on 2026-09-27. Players creating games on the custom server must be able to use every implemented fanmade mechanic, with confirmed defects fixed during transfer. Preserve the custom UI, logging, server additions, existing saves, and advisor compatibility. No additional discovery is needed for these confirmed choices.

## Functional requirements
| ID | Requirement | Status |
|---|---|---|
| FR-001 | Account for every implemented capability in pinned fanmade source and PRs 1-14 in a source-to-target completeness ledger. | accepted |
| FR-002 | Expose all twelve additional expansions and their cards, tags, resources, actions, rules, and compatibility constraints in new-game setup; defaults are off. | accepted |
| FR-003 | Transfer implemented maps, editors, tracks, game variants, milestones and awards outside the expansion registry. | accepted |
| FR-004 | Preserve custom server UI and logging; integrate required fanmade choices/rendering and the Chairman/current-policy popup. | accepted |
| FR-005 | Old API requests and saves remain readable without new fields; new state survives saves during pending choices. | accepted |
| FR-006 | Existing advisor and SmartBot flows retain compatibility; unsupported mechanics are explicit rather than crashing or claiming full support. New strategy/scoring work is excluded. | accepted |
| FR-007 | Reproduce and fix confirmed source/adaptation bugs in the package that transfers the affected behavior, with regression evidence. | accepted |
| FR-008 | Previously supported games with new modules disabled retain target behavior except separately verified defect fixes. | accepted |

## Non-functional requirements
| ID | Requirement | Status |
|---|---|---|
| NFR-001 | Full lint, client/server build, test compilation and relevant server/client suites pass on Node 22 before final acceptance. | accepted |
| NFR-002 | Each transferred module has evidence for creation, a representative action, generation transition, scoring and save/resume; cross-module interactions have bounded integration scenarios. | accepted |
| NFR-003 | Desktop and 390-pixel browser checks cover setup, new choices and reference UI without new uncaught errors. | accepted |
| NFR-004 | Every ledger item is verified, already present with evidence, or explicitly identified as a source stub; no unexplained omissions. | accepted |

## Constraints
| ID | Constraint | Status |
|---|---|---|
| C-001 | Target repository is rusliksu/terraforming-mars; work and mission artifacts stay in the owned worktree and enter main through PR. User approved a separate bounded compatibility PR in rusliksu/tm-advisor on 2026-10-03. | accepted |
| C-002 | Do not alter the dirty day-to-day checkout, production service/database, credentials, DNS or live games. | accepted |
| C-003 | Final staging deployment uses the existing clean exact-origin/main release process and its drift/lock guards. Production deployment requires separate approval. | accepted |
| C-004 | Do not invent missing rules for source stubs or silently decide disputed rules/balance. Record and escalate disputed behavior. | accepted |
| C-005 | New modules are opt-in; disabling future availability must not prevent existing games from loading. | accepted |

## Acceptance scenarios
- Existing saved game: load without new fields, resume a deferred choice, save again, preserve custom tracking fields.
- Each new expansion: create using supported prerequisites, execute representative input/effect, advance generation and verify final score contribution.
- More Parties: Moon dependency, absent-party draw filtering, saved tag bonuses, neutral leadership and correct reference-popup mode.
- Giga Interferometer: complete immediate research/draft and save/resume without deadlock or skipped purchase prompts.
- New content disabled: custom server regression suite and advisor fixtures behave as before.
- Confirmed defect: reproduction fails before the fix, passes afterward, and protects externally observable behavior.

## Delivery
Sequential work packages share one task-owned branch. The mission target is codex/fanmade-full-port; the hosting PR target is main. Keep source inventory, pinned SHA manifest, bug ledger and test evidence with the mission. A passing reference-source suite alone does not prove target compatibility. Do not declare the mission complete before combined validation and the permitted staging gate.

## Approved scope delta 2026-10-03

Ruslan explicitly authorized the separate tm-advisor compatibility PR. Add consumer guards for unsupported automation/advice before action submission or numerical recommendations; missing/empty metadata preserves old-server behavior. No strategy, scoring, data evaluation, live extension installation, or production deployment is added. This closes the existing FR006 requirement. Normal checks and own-repository PR delivery follow existing gates.
