# Decision Moment `01KZQYEDSTTS6S5Z0A0FQMPQ6Q`

- **Mission:** `tm-sentry-staging-observability-01KZQTZ0`
- **Origin flow:** `plan`
- **Slot key:** `plan.privacy.expanded-context`
- **Input key:** `sentry_context_policy`
- **Status:** `resolved`
- **Created:** `2026-08-11T08:18:55.418638+00:00`
- **Resolved:** `2026-08-11T08:19:03.570594+00:00`
- **Opened by:** `cli`
- **Other answer:** `false`

## Question

Какой диагностический контекст разрешено отправлять в Sentry?

## Options

- Расширенный контекст без секретов
- Минимальный технический контекст

## Final answer

Расширенный контекст без секретов: разрешены исходное сообщение после secret-redaction, полный стек вызовов без локальных переменных, HTTP method и route path, release/environment, gameId/playerId и gameplay input после рекурсивного удаления секретных ключей; запрещены headers, cookies, session, токены, пароли, DSN, query string и IP.

## Rationale

_(none)_

## Change log

- `2026-08-11T08:18:55.418638+00:00` — opened
- `2026-08-11T08:19:03.570594+00:00` — resolved (final_answer="Расширенный контекст без секретов: разрешены исходное сообщение после secret-redaction, полный стек вызовов без локальных переменных, HTTP method и route path, release/environment, gameId/playerId и gameplay input после рекурсивного удаления секретных ключей; запрещены headers, cookies, session, токены, пароли, DSN, query string и IP.")
