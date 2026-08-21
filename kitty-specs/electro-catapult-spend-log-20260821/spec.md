# Mission Specification: Electro Catapult Spend Log

**Branch**: `codex/electro-catapult-spend-log`
**Created**: 2026-08-21
**Status**: Implemented and verified; PR delivery pending
**Bead**: `tm-ai-4w3`
**Input**: A live game showed `used Electro Catapult action` followed by `gained 7 M€`, but no public indication whether one plant or one steel was spent. Ruslan approved a narrow card-specific fix and PR.

## Root Cause Evidence

- Live game `gc0282232c5b6` emitted the action and gain entries but no spend entry on both observed Electro Catapult uses.
- `src/server/behavior/Executor.ts` deducts declarative `spend` resources without logging them, then logs the `stock` gain.
- `src/server/cards/base/ElectroCatapult.ts` retains a commented `KEEP THIS` helper with the intended combined message.
- The same omission exists in both `origin/main` and the inspected current `upstream/main`.

## Acceptance Scenarios

1. When a player spends one plant with Electro Catapult, exactly one public outcome entry states that the player spent one plant to gain 7 M€.
2. When a player spends one steel, exactly one public outcome entry states that the player spent one steel to gain 7 M€.
3. When only one resource choice is legal, the existing automatic selection behavior is preserved.
4. When both choices are legal, the player still receives the existing two-option choice.
5. Reusing the action through Viron produces the same truthful entry for each use.

## Requirements

| ID | Requirement |
|----|-------------|
| FR-001 | Electro Catapult SHALL publicly identify the resource spent on every successful action. |
| FR-002 | The outcome log SHALL combine the selected spend and 7 M€ gain without an additional gain-only entry. |
| FR-003 | Plant and steel balances, the 7 M€ gain, card-use limits, and option availability SHALL remain unchanged. |
| FR-004 | The generic behavior executor and logging behavior of all other cards SHALL remain unchanged. |
| NFR-001 | Focused tests SHALL independently cover plant, steel, automatic single-option selection, and public visibility. |
| C-001 | No live game, database, service, advisor, or deployment mutation is part of this mission. |
| C-002 | Delivery SHALL use the task branch and a PR to `rusliksu/terraforming-mars`; live deployment is a separate gate. |

## Success Criteria

- Focused Electro Catapult tests pass with exact public messages for both resources.
- Existing Electro Catapult play/action behavior tests remain green.
- Required TypeScript test/build/lint gates pass.
- Final diff is limited to the card, focused tests, and this mission dossier.

## Local Evidence

- Focused `ElectroCatapult.spec.ts`: 7 passing.
- Full server suite: 7404 passing.
- `npm run build:tests`: passed.
- `npm run lint:server`: passed.
- `npm run build`: passed with only existing webpack asset-size warnings.
- `git diff --check`: passed.
