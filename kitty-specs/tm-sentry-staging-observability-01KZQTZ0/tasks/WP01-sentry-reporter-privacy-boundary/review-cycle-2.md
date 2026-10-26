---
affected_files: []
cycle_number: 2
mission_slug: tm-sentry-staging-observability-01KZQTZ0
reproduction_command:
reviewed_at: '2026-08-11T13:54:24Z'
reviewer_agent: codex
verdict: rejected
wp_id: WP01
---

# Review cycle 2 — требуется доработка

## Блокирующие замечания

### 1. [P1] Новый reporter пока является dead production module

`rg` по `src/**/*.ts` не находит ни одного импорта или вызова `SentryReporter` за пределами самого `src/server/server/SentryReporter.ts`. Factory используется только тестами, а стабильная функция `capture(error, context)` — только внутренним singleton этого же файла.

Обязательный review-гейт для нового публичного модуля требует хотя бы одного production caller. Сейчас WP02/WP03 зависят от принятия WP01, поэтому декомпозиция образует замкнутую зависимость: WP01 нельзя принять без caller, а caller нельзя добавить до принятия WP01.

Перед повторным review нужно изменить границу пакетов одним из двух способов:

- включить один минимальный production caller в WP01, явно обновив ownership и planning; либо
- пересобрать dependency/review boundary так, чтобы reporter и первый caller проходили review вместе.

Это изменение затрагивает декомпозицию и ownership, поэтому оно должно быть отражено в planning до source-правки.

### 2. [P1] Публичный `capture` не защищён тестовым oracle

`tests/server/server/SentryReporter.spec.ts` импортирует и проверяет `createSentryReporter`, но не экспортируемую функцию `capture`. В review временно заменено тело публичной функции с `defaultReporter.capture(error, context)` на `return`; после этого focused suite всё равно показал `9 passing`. Мутация полностью восстановлена, рабочее дерево source-файлов чистое.

Следовательно, публичный singleton/env/build-head путь может превратиться в no-op при зелёных тестах. Нужен black-box тест стабильной функции `capture`, который не использует реальный DSN или сеть и падает при такой мутации.

### 3. [P2] Не записано обязательное evidence T001

В Activity Log нет проверенных baseline commit и scoped composite fingerprint, хотя T001 прямо требует записать оба значения. Проверенные значения:

- baseline commit: `8a5604fa69f45898c3c18c4ac8f19104cb0e6ed5`;
- scoped composite fingerprint: `07e62dc1c96cd92c12684e42628c444187a4d479a807da315aaa2cd29734e511`.

Composite повторно вычислен из зафиксированных per-file hashes и совпал с `docs/codemap/codemap.lock`. Нужно добавить оба значения в Activity Log; отмеченного checkbox недостаточно.

## Обязательный anti-pattern checklist

- Dead code: **FAIL** — production caller отсутствует.
- Synthetic fixture / deletion test: **FAIL** — no-op публичного `capture` не ловится focused suite.
- Silent empty return: **PASS** — fail-closed/best-effort возвраты соответствуют заявленному контракту.
- FR coverage: **FAIL** — стабильная production-точка входа и реальный caller path пока не наблюдаемы тестами.
- Frozen surface: **PASS** — codemap-файлы не изменялись.
- Locked decision: **PASS** — exact SDK, allowlist и privacy boundary соблюдены на проверяемом factory seam.
- Shared ownership: **PASS** — текущий diff ограничен owned files WP01.
- Production fragility: **N/A** — новый код не добавляет исключение в production flow.

## Успешные проверки

- `npx mocha --import=tsx --require tests/testing/setup.ts tests/server/server/SentryReporter.spec.ts` — 9 passing;
- `npm run build:tests` — PASS;
- `npm run lint:server` — PASS;
- `git diff --check` — PASS;
- после мутационной проверки source/test/package diff отсутствует; остаётся только служебный untracked `.spec-kitty/` review-lane.

Реальный DSN, сеть, push, PR, merge, config или deploy не использовались.
