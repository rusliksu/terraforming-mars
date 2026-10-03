# WP04 compatibility evidence

## Scope and status

Server-side compatibility package reviewed at `20c6a55ed3a706fa1ca593f23d97b1e0c1226ef8`;
external FR006 consumer protection was authorized and delivered through merged tm-advisor PR908
at `024f19153cf2331d2c0044e2ef038f789683c6d9`. Independent combined WP04 review approves.
Full-port hosting delivery and staging remain WP05; no production operation is claimed.

## Confirmed fixes

- Legacy payments lacked energy, nereidMicrobes and anyFloaters. Both payment and card-play
  input boundaries now supply only those new defaults, preserve required old fields and reject
  malformed supplied values. Original JSON is not mutated.
- Replay retained dynamic card identity but dropped its public face. The projection now includes
  the explicit face whitelist, copied display name and InSpire resource display, with private
  hands, access IDs and embedded behavior snapshots excluded.
- Rematch setup lost custom map codes and team assignments. Quick-game templates could select
  Custom without decoding its map, returning HTTP500. Both paths now retain those settings.
- Deimos copies in hand reloaded as Comet. Custom definitions depended on the live library and
  name-only property cache. Optional per-position state sidecars retain dynamic metadata without
  changing ordinary card-name arrays. Embedded definitions bypass the cache, survive deletion
  or editing, and retain their public face. Nested robot targets, Spaceport capture and later
  Project Imitators/Deimos copies preserve the same boundary.
- Cloner's recursive player-ID rewrite could corrupt a custom name or description matching an
  ID, including lastCardPlayed. Card identities/definition content/card log values are protected,
  while the actual player references still change.

Every group has focused failing-before/passing-after reproduction. The dynamic-card suite also
checks coexisting same-name definitions, nested storage and fresh copies without accumulated
resources. The synthetic pre-port fixture was generated from untouched target source 4ea59edde
and retains undo, bot seat, notice and input-sequence state on load.

## Automation boundary

`automationCompatibility: {version: 1, unsupportedFeatures: string[]}` is additive on simple,
player/spectator and quick-game models. It derives only from public setup, never private hands.
All12 new modules, custom boards/tracks and explicit fan-card selections are represented.
New Pathfinders/Delta pools are distinguished from old saves by fanmadeCardPool provenance.
This conservative boundary means not certified for automatic play, not absence of all card facts.

Requested bots are rejected before creation saves, cloned settings are checked, nonterminal
surrender is rejected before mutation, and startup reconciliation does not spawn unsupported
bots. The process-launch sink requires compatibility metadata. Terminal surrender remains
available. A concise English/Russian UI notice exposes unsupported game options.

Standalone tm-advisor bot, extension, service and Python consumers now honor the field before
automatic input/advice, clear stale advice and preserve supported/legacy behavior. See
external-compatibility-evidence.md for exact commits, zero-POST and callback regressions,
full consumer-suite validation and isolated browser limits. FR006 is satisfied; mission acceptance
still requires WP05 delivery and staging.

## Verification

- Node22.23.3 throughout; target dependencies unchanged.
- Full server suite:10966 passing,3 platform-conditional pending after the package changes.
- Full client suite:999 passing in183 files.
- Full lint, server/client build and test compilation passed. Three existing webpack size/runtime
  warnings remain. Final Cloner-reference followup has7 focused passing tests; final full rerun passed
  10966 tests with3 conditional skips. The immutable commit is recorded in the accompanying result manifest.
- Module creation/save smoke covers12/12. module-validation.md maps action, transition/reset
  and scoring cells. Six new lifecycle cases close the eight previously uncovered cells.
- Browser: isolated local synthetic DB on D:, no live games. Final390px notice bounds
  x70,width320,height69, no page or console errors. Only the two unavailable local ELO proxy
  endpoints were fulfilled with empty fixtures; no gameplay endpoint was mocked. Screenshot
  automation-boundary-mobile.png was visually inspected. Browser and server were stopped.

## Limits

See source-limitations.md for unchanged source stubs/adaptations. Old dynamic saves that already
lost source identity/definitions cannot reconstruct that information. No claim of exhaustive
combinatorial gameplay verification is made.
