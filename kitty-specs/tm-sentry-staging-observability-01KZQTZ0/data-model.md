# Диагностическая модель данных

Изменений постоянной игровой модели и БД нет. Единственная новая модель — исходящее диагностическое событие, существующее только в памяти перед отправкой.

## Allowlist события

| Поле | Источник | Правило |
|---|---|---|
| `event_id` | SDK | технический случайный идентификатор события |
| `timestamp` | SDK | время события |
| `platform` | константа | только `node` |
| `level` | константа | только `error` |
| `environment` | конфигурация | только `staging` |
| `release` | build metadata | короткий Git head текущей сборки |
| `exception.values[].type` | классификатор | только закрытый список встроенных безопасных категорий; иначе `Error` |
| `exception.values[].value` | константа | нейтральное `Unexpected server error`, не производное от throwable |
| `exception.values[].stacktrace.frames` | stack parser | только project-relative `filename`, безопасное code-symbol `function`, `lineno`, `colno`, `in_app`; неизвестные строки отбрасываются |

Все прочие поля входного Sentry event удаляются, а не фильтруются выборочно.

## Запрещённые данные

- `request`, URL, query, headers, cookies, IP и user-agent;
- исходные `Error.message`, raw stack и нестандартное имя throwable;
- `user`, session, contexts, tags, extra, breadcrumbs, spans, transaction, logs и metrics;
- request body, игровой input, player/game state;
- player/game/spectator/run IDs и имена игроков;
- произвольные свойства throwable и `Error.cause`.

## Переходы состояния шлюза

| Исходное состояние | Условие | Результат |
|---|---|---|
| `disabled` | нет DSN, environment не `staging` или build head невалиден | остаётся `disabled`, capture является no-op |
| `disabled` | корректная разрешающая конфигурация и валидный build head | инициализация SDK, переход в `enabled` |
| `disabled` | SDK отверг конфигурацию | остаётся `disabled`, безопасный локальный warning без DSN |
| `enabled` | capture неожиданной ошибки | строится и отправляется очищенное событие; вызывающий код не ждёт доставку |

Повторная runtime-реконфигурация не требуется: состояние определяется один раз при запуске процесса.
