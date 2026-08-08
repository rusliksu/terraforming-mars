# План реализации: целостность снапшота step undo

**Branch**: `codex/undo-step-snapshot-integrity` | **Date**: 2026-08-08 | **Spec**: `kitty-specs/undo-step-snapshot-integrity-01KZGQF4/spec.md`
**Beads**: `tm-ai-na8`
**Delivery target**: task-owned PR из `codex/undo-step-snapshot-integrity` в `main`; Spec Kitty single-branch lifecycle завершается на task-ветке до PR.

## Engineering Alignment

Пользователь подтвердил structural fix словом «делай» после scope review. Инвариант: `rootSnapshot` является значением состояния на входе в первый replayable prompt и после захвата никогда не меняется. Step-back строит новое состояние только из этого значения и сохранённых input entries. Hidden-information и prompt-fingerprint gates остаются прежними. Полный save-based undo не меняется.

## Summary

Добавить локальный JSON-compatible clone на границе первого захвата `ActionReplay` и использовать уже отделённый `SerializedGame` как неизменяемый root journal. Сначала добавить регрессии на mutation isolation и Giant Ice Asteroid, затем минимально изменить `ActionReplay.ts`, сохранить существующие replay guards и синхронизировать архитектурную документацию.

## Technical Context

**Language/Version**: TypeScript 5.x на Node.js, существующая конфигурация репозитория  
**Primary Dependencies**: серверные `Game`, `Player`, `ActionReplay`; JSON serialization/deserialization; без новых библиотек  
**Storage**: in-memory `ActionReplayState`; сохранение игры и БД не меняются  
**Testing**: Mocha + Chai через `tsx`, focused `tests/server/game/ActionReplay.spec.ts`, server lint/build  
**Target Platform**: Node.js Terraforming Mars server  
**Project Type**: web application, изменение только server/domain слоя и архитектурной документации  
**Performance Goals**: не более одного дополнительного JSON round-trip при создании нового root journal; replay complexity не меняется  
**Constraints**: не менять `Game.serialize()`, hidden-information guards, обычный full undo, gameplay cards или API; никаких новых зависимостей  
**Scale/Scope**: один structural boundary, один focused test file, один architecture doc; широкий класс защищённых mutable полей без field-by-field patching

## Charter Check

Project charter отсутствует. Применены builtin directives:

- Architectural Integrity / Locality of Change: исправление на границе владельца снапшота.
- Test-First Development: regression обязан падать до production edit.
- Test and Typecheck Quality Gate: targeted tests, lint/build и diff checks обязательны.
- Living Documentation Sync: invariant добавляется в существующий step-undo design doc.
- Specification Fidelity: изменения вне согласованного scope запрещены.

Нарушений gates нет.

## Project Structure

### Documentation

```text
kitty-specs/undo-step-snapshot-integrity-01KZGQF4/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── tasks.md
└── tasks/
    └── WP01-fix-action-replay-snapshot-integrity.md
```

### Source Code

```text
src/server/game/ActionReplay.ts
tests/server/game/ActionReplay.spec.ts
docs/architecture/step-undo-experiment-plan.md
```

**Structure Decision**: изменения остаются внутри существующего ActionReplay bounded context. Не создаётся общий cloning utility, пока нет второго подтверждённого caller.

## Design

1. В тесте захватить root journal через публичный `prepareActionReplayEntry`.
2. Изменить после захвата live `gameLog`, `globalParameterSteps` и репрезентативное nested state; доказать, что `rootSnapshot` не изменился.
3. Добавить поведенческий многошаговый сценарий, воспроизводящий повторное применение вкладов Giant Ice Asteroid после step-back.
4. На первом захвате выполнить JSON deep clone результата `game.serialize()` и сохранить отделённое значение.
5. Не клонировать каждый serializer и не менять последующее replay cloning: оно продолжает защищать каждый `Game.deserialize()` от мутаций во время симуляции.
6. Обновить design doc инвариантом ownership/immutability.

## Risks and Mitigations

- **Ложноположительный тест только на object identity**: дополнить observable Giant Ice Asteroid flow.
- **Слишком широкий рефакторинг сериализации**: production diff ограничить `ActionReplay.ts`.
- **Изменение hidden-info semantics**: сохранить и прогнать существующий Hi-Tech Lab тест.
- **JSON semantic drift**: использовать тот же JSON round-trip, который уже применяется в `replayActionInputs`.
- **Performance overhead**: ровно один дополнительный clone при создании журнала, не на каждый input.

## Implementation Concern Map

### IC-01 — Immutable replay root

- **Purpose**: закрыть весь класс aliasing через ownership boundary.
- **Relevant requirements**: FR-001, FR-004, NFR-001, NFR-002, NFR-003.
- **Affected surfaces**: `src/server/game/ActionReplay.ts`.
- **Sequencing/depends-on**: regression tests должны быть RED первыми.
- **Risks**: случайно изменить prompt fingerprint либо simulation semantics.

### IC-02 — Observable regressions

- **Purpose**: доказать исправление инцидента и защиту вложенного состояния.
- **Relevant requirements**: FR-002, FR-003, FR-005, NFR-004.
- **Affected surfaces**: `tests/server/game/ActionReplay.spec.ts`.
- **Sequencing/depends-on**: none.
- **Risks**: тест, проверяющий implementation detail вместо поведения.

### IC-03 — Architecture invariant

- **Purpose**: не допустить возврат shallow-root assumption.
- **Relevant requirements**: FR-006.
- **Affected surfaces**: `docs/architecture/step-undo-experiment-plan.md`.
- **Sequencing/depends-on**: после подтверждённого production shape.
- **Risks**: описание более широкого контракта, чем реально проверено.

## Verification Gates

1. RED: новые focused regression tests падают на исходном `ActionReplay`.
2. GREEN: весь `ActionReplay.spec.ts` проходит после минимальной правки.
3. Targeted server tests для затронутого flow.
4. `npm run lint:server` и релевантный build/type gate.
5. `git diff --check`, allowlist review и diff against `origin/main`.
6. Task-owned commit/push/PR; prod/live deploy не выполняется без отдельного разрешения.

