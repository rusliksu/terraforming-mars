# Integration research

## Verified inputs
`source-pins.json` is authoritative for source/target revisions and all fourteen source PR heads. The common ancestor is `17dbc9dc26f380260b743a3db7021537d3790e4f`. At intake, target and source contain respectively 803 and 498 commits since that ancestor. A Git merge-tree preview finds 40 textual conflicts, including Game, Player, save models, party handling, creation/configuration and UI. This is not evidence of semantic correctness for cleanly merged files.

## Decisions
- Target-first three-way reconciliation preserves custom-only changes. Do not copy the complete source tree or select ours/theirs for all conflicts. Preserve target deployment, DB controls, logger/shadow fields, advisor endpoints and UI refinements.
- Integrate pinned source PRs before evaluating source behavior; our previous combined-source tests omitted newer PRs 13/14 and do not validate target integration.
- Keep source expansion flags and stable IDs. Source intentional replacements belong to their opt-in module; absence of new save fields maps to disabled/default state.
- Backend modules and common models are strongly coupled. Transfer this closure together, then adapt target UI and compatibility boundaries. Verify backend and client gates at their respective package boundaries and full gates before acceptance.
- Existing compatibility endpoints and client consumers remain additive; do not introduce new advisor scoring promises for unsupported mechanics.
- Preserve existing tests. Port source regression tests and add target integration regressions; do not fix failures by deleting assertions without proving a stale expectation.

## Completeness and exceptions
The corrected reference incorporating PRs 1-14 has 41 textual conflicts with target; `research/merge-conflicts.txt` records that later preview. The 40-conflict figure above refers to the original fanmade baseline before those PRs.
`research/source-files.csv` enumerates changes from the shared ancestor. Classification must distinguish capability, required support, unrelated upstream/tooling/localization drift, already-present behavior, and source stubs. Every pending item must receive a disposition and evidence before final acceptance. New modules include Sillyfication, BetterMars, Custom Cards, Conglomerates, Corporate Betterments, Ides of Mars, Rob Antilles, More Parties, Venus Phase 2, Industries, High Orbit and Solaris. Maps/editors, global-parameter customization, custom-card libraries, party variants and other non-module capabilities remain in scope.

## Risks and verification
Textual merges can conceal semantic clashes in deferred-action sequencing, serialization, cross-expansion card replacement and replay/undo. Verify observable flows, saved choices, scoring, disabled-module parity and client input handling. Use Node 22 and fresh local dependencies; do not share a mutable node_modules junction with another writer.

## Tooling incident
Spec Kitty 3.2.7 `setup-plan` ignores the linked owned checkout and cannot resolve this mission. `research` wrote four empty templates in primary; the exact four zero-byte files were moved into this worktree and primary was verified clean. Use the owned-checkout runtime path and author its requested artifacts here; do not retry legacy scaffolding commands against primary or bypass acceptance guards. Mission creation reported optional origin-binding unavailable (`fcntl` on Windows); no hosted authority is claimed.
