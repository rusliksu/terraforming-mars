---
work_package_id: WP04
title: Codemap и итоговые quality gates
dependencies:
- WP02
- WP03
requirement_refs:
- FR-001
- FR-002
- FR-003
- FR-004
- FR-005
- FR-006
- FR-007
- FR-008
- FR-009
tracker_refs:
- tmsentry-q1x.4
planning_base_branch: codex/tm-sentry-staging-observability
merge_target_branch: codex/tm-sentry-staging-observability
branch_strategy: Planning artifacts for this mission were generated on codex/tm-sentry-staging-observability. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into codex/tm-sentry-staging-observability unless the human explicitly redirects the landing branch.
subtasks:
- T017
- T018
- T019
- T020
phase: Фаза 3 — интеграция и приёмочные доказательства
assignee: ''
agent: codex
history:
- timestamp: '2026-08-11T08:54:36Z'
  agent: codex
  action: Пакет сформирован как последовательная интеграция WP02 и WP03 с итоговым codemap и gates.
- timestamp: '2026-08-11T19:43:00Z'
  agent: codex
  action: Итоговый codemap зафиксирован в efcd7109; профильный suite 40/40 и все build/lint/fingerprint gates прошли без внешней доставки.
agent_profile: reviewer-renata
authoritative_surface: docs/codemap/
execution_mode: code_change
model: ''
owned_files:
- docs/codemap/codemap.html
- docs/codemap/codemap.json
- docs/codemap/codemap.lock
role: reviewer
tags: []
---

# Запрос рабочего пакета: WP04 — Codemap и итоговые quality gates

## ⚡ Do This First: Load Agent Profile

Загрузи `/ad-hoc-profile-load reviewer-renata` до чтения остальных материалов и выполнения проверок. Выполняй только read-only review текущего bounded work package; product code и owned codemap files не исправляй в reviewer-проходе.

## Цель

Собрать принятые результаты WP02 и WP03 поверх WP01, сделать итоговую карту кода источником правды для нового Sentry flow и получить полный локальный evidence-pack готовности. Этот WP не добавляет новое поведение: он единолично актуализирует три scoped codemap artifacts, запускает проверки и останавливается перед любым внешним действием.

## Контекст

После завершения зависимостей итоговый flow должен содержать один `SentryReporter`, пять owning boundaries и четыре профильных test files:

- `process` в `src/server/server.ts`;
- `request` во внешнем catch `src/server/server/requestProcessor.ts`;
- `player-get`, `player-undo`, `player-input` в `src/server/routes/PlayerInput.ts`;
- `SentryReporter.spec.ts`, `SentryProcessBoundary.spec.ts`, `requestProcessor.spec.ts` и `PlayerInput.spec.ts`.

Scoped-baseline codemap зафиксирован в planning branch до execution и только read-only проверяется WP01. WP04 — единственный write-owner: здесь relationships и fingerprints актуализируются из уже интегрированного текущего tree; старые remote evidence не переносятся.

## Стратегия веток

- Planning branch: `codex/tm-sentry-staging-observability`.
- Spec Kitty merge target: `codex/tm-sentry-staging-observability`.
- Dependencies: принятые WP02 и WP03, оба основаны на WP01.
- Реализация запускается командой `spec-kitty agent action implement WP04 --agent codex`.
- Execution worktree и merged dependency base брать только из lane в `lanes.json`.
- WP04 последовательный: parallel write lanes после его старта запрещены.
- External delivery позже выполняется отдельным PR в `main`.

## T017 — Итоговый codemap package

### Назначение

Обновить обязательную архитектурную карту тем же commit/tree, который содержит итоговый Sentry flow.

### Руководство

1. Убедись, что текущий execution lane действительно содержит принятые heads WP01, WP02 и WP03.
2. По фактическим source/tests проверь каждый existing relationship, добавь подтверждённые Sentry nodes/edges и переведи planned relationships в confirmed только при наличии path/symbol evidence.
3. Актуализируй `codemap.json`, затем `codemap.html` из того же набора relationships. Не копируй evidence из `origin/codex/tm-codemap`.
4. Проверь, что карта отвечает на три обязательных вопроса:
   - кто вызывает `SentryReporter.capture`;
   - какие modules/flows он затрагивает;
   - какие тесты покрывают каждый caller и privacy boundary.
5. Проверь наличие всех пяти boundary labels и отсутствие выдуманного `unhandledRejection` caller.
6. Сформируй явный scope итоговых source/test/package evidence без самих codemap files; вычисли lowercase SHA-256 каждого файла и composite как SHA-256 от UTF-8 записей `path + NUL + fileHash`, отсортированных ordinal и соединённых LF.
7. Проверь внутренние links/IDs, JSON parse, совпадение всех per-file hashes и composite в `codemap.lock`.

### Scope

Owned write surface ограничена тремя codemap files. Общий generator/config/script в этот scope не входит; если без него нельзя подтвердить итоговый graph, остановись и верни blocker как material scope delta.

## T018 — Объединённый профильный oracle

### Назначение

Проверить собранное поведение на конечном envelope и реальных call sites без Sentry network.

### Команда

```powershell
npx mocha --import=tsx --require tests/testing/setup.ts tests/server/server/SentryReporter.spec.ts tests/server/requestProcessor.spec.ts tests/server/server/SentryProcessBoundary.spec.ts tests/routes/PlayerInput.spec.ts
```

### Проверяемые доказательства

- valid activation создаёт события, disabled matrix — нет;
- каждый boundary присутствует и создаёт не более одного event;
- expected `AppError`/`InputError`, malformed JSON и invalid runId не создают event;
- message/full stack и разрешённые IDs/input присутствуют;
- перечисленные credential/header/cookie/query/IP sentinel-форматы отсутствуют даже при внедрении в message/stack/input;
- `request.data` truncation wrapper валиден, стабилен и не превышает 65 536 UTF-8-байт;
- fake transport подтверждает финальный SDK envelope и не выполняет network request.

Не принимай suite, который скрывает skipped privacy cases или оставляет process listeners/env/SDK state между тестами.

## T019 — Broad quality gates

### Команды

Запусти по порядку и фиксируй exit code каждого шага:

```powershell
npm run build:tests
npm run lint:server
npm run build:server
npm run build
git diff --check
```

Дополнительно:

1. распарсь `codemap.json` и `codemap.lock` штатным JSON parser;
2. воспроизведи scoped per-file/composite SHA-256 процедуру из `quickstart.md` и проверь четыре test files;
3. проверь `npm ls @sentry/node` и точную resolved version без печати конфигурации;
4. проверь clean test cleanup и отсутствие реального `.env`/DSN change;
5. сравни итоговый diff с owned/specified surface.

Если broad gate падает на unrelated baseline, собери точную команду, exit code и минимальный error excerpt. Не исправляй unrelated код и не называй пакет готовым без классификации.

## T020 — Allowlist review и handoff

### Назначение

Дать reviewer воспроизводимую проверку spec-to-code fidelity и остановиться перед delivery gates.

### Руководство

1. Сверь фактические изменения с FR-001—FR-009, NFR-001—NFR-006 и C-001—C-004.
2. Подтверди exact capture ownership:
   - request только в `processRequest` outer catch;
   - `requestHandler` только формирует прежний 500;
   - PlayerInput владеет тремя поглощаемыми paths;
   - process listener остаётся последней boundary.
3. Рекурсивно осмотри final event fixture на запрещённые structural fields и supported sentinel formats.
4. Подтверди отсутствие public API/schema/DB/gameplay changes.
5. Зафиксируй commit/head, команды, counts tests и codemap fingerprint.
6. Остановись перед push, draft/ready PR, merge, `SENTRY_DSN` config, staging deploy и реальным Sentry smoke.

## Definition of Done

- [x] WP01, WP02 и WP03 присутствуют в integration lane и не имеют unresolved conflicts.
- [x] Все три codemap artifacts единственным владельцем актуализированы из проверяемого итогового tree по документированной scoped-процедуре.
- [x] Карта показывает reporter, пять callers и четыре покрывающих test files.
- [x] Combined Mocha suite проходит без сети и skipped privacy cases.
- [x] Build-tests, server lint, server/full build и diff checks проходят либо unrelated blocker доказательно классифицирован.
- [x] Итоговый diff соответствует spec/plan/WP ownership и не меняет public behavior.
- [x] Evidence содержит head, команды и результаты, но не DSN, токены или raw secret fixtures.
- [x] Никакие push/PR/merge/config/deploy/live действия не выполнены.

## Reviewer Guidance

Отклони handoff при устаревшем или невоспроизводимом scoped codemap lock, неподтверждённом relationship, пропущенном caller/test file, duplicated request capture, optional boundary, fake SDK вместо fake transport или неполной UTF-8 privacy matrix. Не требуй реального Sentry event на этом gate: такой smoke требует отдельного разрешения и staging configuration после delivery.
