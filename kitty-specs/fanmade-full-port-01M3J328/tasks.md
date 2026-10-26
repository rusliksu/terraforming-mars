# Work packages

Execute sequentially in the owned single-branch mission. The approved plan is the baseline; production is excluded.

## WP01: Compose and classify the pinned source
Dependencies: none.
Prompt: tasks/WP01-source-reference.md
Source pins resolve; all 14 PR patches are represented exactly once; reference compiles and relevant source regressions pass. Inspect source-only inputs and unfinished stubs. No live services or databases.

- [ ] T001 Compose fanmade source with PRs 1-14 (WP01)
- [ ] T002 Classify source capabilities and overlap (WP01)
- [ ] T003 Validate corrected source oracle (WP01)

## WP02: Adapt common models and server gameplay
Dependencies: WP01.
Prompt: tasks/WP02-gameplay-port.md
Server builds and server test compilation/execution pass for transferred behavior. Target custom invariants remain. Document client changes pending WP03; no claim of overall readiness until combined checks.

- [ ] T004 Reconcile common contracts and configuration (WP02)
- [ ] T005 Port the server dependency closure (WP02)
- [ ] T006 Port boards, libraries and variants (WP02)
- [ ] T007 Port tests and resolve confirmed server defects (WP02)

## WP03: Integrate mechanics into the custom UI
Dependencies: WP02.
Prompt: tasks/WP03-client-port.md
No new Vue warnings/uncaught errors. Fan controls are usable on custom layout; disabled configurations retain target behavior. Existing target assets and log features remain.

- [ ] T008 Adapt creation and rendering (WP03)
- [ ] T009 Integrate editors and policy reference (WP03)
- [ ] T010 Validate interactions and responsive layouts (WP03)

## WP04: Prove save and advisor compatibility
Dependencies: WP03.
Prompt: tasks/WP04-compatibility.md
Backward compatibility and unsupported-capability behavior have executable evidence. No known defect in accepted transferred behavior remains. Cross-package fixes are sequential and explicitly recorded.

- [ ] T011 Exercise old and new save boundaries (WP04)
- [ ] T012 Exercise advisor and disabled-module contracts (WP04)
- [ ] T013 Close integration defects and inventory gaps (WP04)

## WP05: Verify combined delivery and staging
Dependencies: WP04.
Prompt: tasks/WP05-acceptance-staging.md
All requirements have evidence, source stubs disclosed, exact target head verified on staging. No production deployment. Mission acceptance must not claim an unperformed gate.

- [ ] T014 Run combined Node 22 validation (WP05)
- [ ] T015 Review and deliver through PR (WP05)
- [ ] T016 Verify staging under existing release gates (WP05)
