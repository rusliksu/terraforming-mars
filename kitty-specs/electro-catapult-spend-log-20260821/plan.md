# Implementation Plan: Electro Catapult Spend Log

**Branch**: `codex/electro-catapult-spend-log`
**Base / target**: `origin/main` / `main`
**Spec**: `kitty-specs/electro-catapult-spend-log-20260821/spec.md`

## Design

Keep the declarative `action` metadata so bots, advisors, affordability checks, and rendering retain the existing behavior model. Override only Electro Catapult's runtime action selection to perform the same plant/steel deduction and 7 M€ gain atomically, then emit the preserved card-specific combined public log.

For steel, retain the existing `player.pay(Payment.of({steel: 1}))` path so payment-triggered effects remain intact. For plants, retain stock deduction. Do not modify `Behavior`, `Executor`, or generic stock logging.

## Work Packages

### WP01 — Regression and implementation

- Add exact public-log assertions for plant and steel branches.
- Preserve two-option selection and automatic single-option execution.
- Implement the card-local runtime action and remove the obsolete commented helper.
- Run the focused test repeatedly during the red/green loop.

### WP02 — Verification and delivery

- Run focused tests, `build:tests`, relevant lint/build gates, and `git diff --check`.
- Review the scoped diff, commit, push, and open the task-owned PR.
- Inspect CI/review state; do not deploy staging or live.

## Risks and Guards

- Removing the declarative action would hide semantics from advisors/bots; therefore it remains in card properties.
- Directly deducting steel would bypass payment hooks; therefore the existing `player.pay` path is preserved.
- Generic spend logging would broaden the blast radius; it is explicitly out of scope.

## Local Closeout

WP01 is complete. The card keeps its declarative action for bot/advisor inspection while overriding only runtime execution. Plant deduction, steel payment hooks, 7 M€ gain, two-option choice, automatic single-option selection, and repeated use are covered by focused tests. Production build, full server tests, TypeScript build, server lint, and diff checks passed. PR delivery remains in WP02; deployment remains out of scope.
