---
affected_files: []
cycle_number: 4
mission_slug: tm-sentry-staging-observability-01KZQTZ0
reproduction_command:
reviewed_at: '2026-08-11T15:19:55Z'
reviewer_agent: reviewer-renata
verdict: rejected
wp_id: WP01
---

# Ревью WP01 — цикл 3

Вердикт: **требуются изменения**.

## 1. HIGH — поддерживаемые privacy-сигнатуры проходят в финальный envelope

`sanitizeString` распознаёт `Authorization`/`Cookie`/`Set-Cookie` только с первого символа строки, а credential assignment для составных ключей не допускает точку как разделитель.

Read-only review probe через настоящий `NodeClient` и fake transport подтвердил утечки:

- `  Authorization: LEAD_AUTH_SENTINEL` сохраняет sentinel;
- `api.key=DOT_API_SENTINEL` сохраняет sentinel;
- эквивалентный `private.key=...` проходит тем же путём.

Это противоречит обязательной очистке header lines, credential assignments и нормализованных вариантов ключей. Нужно расширить sanitizer и добавить эти sentinel-варианты в существующий final-envelope oracle. Соседние разрешённые значения должны сохраниться.

Затронутые места: `src/server/server/SentryReporter.ts:105`, `src/server/server/SentryReporter.ts:114`, `tests/server/server/SentryReporter.spec.ts:260`.

## 2. MEDIUM — `server.ts` не связывает публичный `capture` напрямую

`server.ts` импортирует только `registerUncaughtExceptionHandler`; публичный `capture` скрыто подставляется default-параметром внутри `SentryProcessBoundary.ts`. Reviewer gate требует, чтобы `server.ts` действительно импортировал публичный API и явно связывал его с production callback.

Нужно сохранить testable process seam, но передавать публичный `capture` из `server.ts` в регистрируемый handler. Тест должен продолжать упражнять тот же production callback без импорта side-effectful `server.ts`.

Затронутые места: `src/server/server.ts:27-29`, `src/server/server/SentryProcessBoundary.ts:1-32`.

## 3. MEDIUM — изменён порядок существующего локального лога

Baseline callback сразу выполнял `console.error('UNCAUGHT EXCEPTION', error)`. Новый callback сначала вызывает Sentry и только затем локальный лог. Это не сохраняет прежний порядок и может задержать единственный локальный diagnostic path.

Нужно выполнять существующий локальный лог до нового best-effort capture и закрепить порядок одним общим sequence oracle. Reporter failure по-прежнему не должен выходить из callback.

Затронутые места: `src/server/server/SentryProcessBoundary.ts:18-25`, `tests/server/server/SentryProcessBoundary.spec.ts:9-34`.

## Проверки ревью

- focused Mocha: 12 passing;
- `npm run build:tests`: PASS;
- `npm run lint:server`: PASS;
- `npm run build:server`: PASS;
- полный `npm run build`: PASS, только штатные webpack size warnings;
- deletion checks публичного `capture`, process fallback и `beforeSend`: ожидаемый RED, затем исходники восстановлены;
- полный server suite: 7350 passing и один неизменный environment failure из-за отсутствующего native binding `better-sqlite3`;
- diff ограничен семью owned files; frozen codemap/request/player-input surfaces не менялись;
- новый `unhandledRejection` listener отсутствует;
- push, network Sentry event и deploy не выполнялись.

## Anti-pattern checklist

1. Dead code — PASS.
2. Synthetic fixture — PASS.
3. Silent empty return — PASS: только документированные fail-closed/best-effort paths.
4. FR coverage — PASS для покрытых вариантов, но privacy oracle требует расширения из issue 1.
5. Frozen surface — PASS.
6. Locked decision — FAIL: поддерживаемые privacy-сигнатуры проходят.
7. Shared-file ownership — PASS.
8. Production fragility — N/A: новых production `throw` нет.
