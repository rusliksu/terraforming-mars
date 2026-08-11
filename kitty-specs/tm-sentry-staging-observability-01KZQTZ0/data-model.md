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
| `exception.values[].type` | объект `Error` | имя класса; для неизвестного значения — нейтральный тип |
| `exception.values[].value` | объект `Error` | очищенное сообщение с заменой TM-идентификаторов и сетевых маркеров |
| `exception.values[].stacktrace.frames` | stack parser | только `filename`, `function`, `module`, `lineno`, `colno`, `in_app`; без absolute paths, variables и source context |

Все прочие поля входного Sentry event удаляются, а не фильтруются выборочно.

## Запрещённые данные

- `request`, URL, query, headers, cookies, IP и user-agent;
- `user`, session, contexts, tags, extra, breadcrumbs, spans, transaction, logs и metrics;
- request body, игровой input, player/game state;
- player/game/spectator/run IDs и имена игроков;
- произвольные свойства throwable и `Error.cause`.

## Переходы состояния шлюза

| Исходное состояние | Условие | Результат |
|---|---|---|
| `disabled` | нет DSN или environment не `staging` | остаётся `disabled`, capture является no-op |
| `disabled` | корректная разрешающая конфигурация | инициализация SDK, переход в `enabled` |
| `disabled` | SDK отверг конфигурацию | остаётся `disabled`, безопасный локальный warning без DSN |
| `enabled` | capture неожиданной ошибки | строится и отправляется очищенное событие; вызывающий код не ждёт доставку |

Повторная runtime-реконфигурация не требуется: состояние определяется один раз при запуске процесса.
