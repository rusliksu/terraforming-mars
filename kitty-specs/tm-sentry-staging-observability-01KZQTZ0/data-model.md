# Диагностическая модель данных

Изменений постоянной игровой модели и БД нет. Новая модель существует только в памяти при формировании исходящего Sentry event.

## ErrorDiagnosticContext

| Поле | Тип | Правило |
|---|---|---|
| `boundary` | обязательный закрытый enum | `process`, `request`, `player-get`, `player-undo`, `player-input` |
| `method` | string? | разрешённый HTTP method; отсутствует для process-level ошибки |
| `route` | string? | только нормализованный pathname без query |
| `gameId` | string? | raw ID разрешён пользователем; только когда доступен caller |
| `playerId` | string? | raw ID разрешён пользователем; только когда доступен caller |
| `gameplayInput` | unknown? | разобранный input после recursive redaction и ограничения 65 536 UTF-8-байт |

Контракт всегда содержит `boundary` и структурно не содержит request/response/header/cookie/query/IP/session объектов.

## Allowlist Sentry event

| Поле | Источник | Правило |
|---|---|---|
| `event_id`, `timestamp`, `platform`, `level` | SDK/константы | технические поля error event |
| `environment`, `release` | разрешающая конфигурация | только `staging` и валидный build head |
| `exception.values[].type` | `Error.name` | сохраняется после ограничения длины и secret-redaction |
| `exception.values[].value` | `Error.message` | сохраняется после secret-redaction и ограничения длины |
| `exception.values[].stacktrace.frames` | stack parser | полный call chain без local variables и source context; строки проходят secret-redaction |
| `request.method` | context | только разрешённый method |
| `request.url` | context | только route pathname без query |
| `request.data` | context | отфильтрованный gameplay input либо truncation wrapper до 65 536 UTF-8-байт |
| `tags.tm.boundary` | context | фиксированная boundary category |
| `tags.tm.game_id` | context | raw game ID, если доступен |
| `tags.tm.player_id` | context | raw player ID, если доступен |

Все остальные event-поля удаляются финальным allowlist.

## Secret denylist

Регистр и разделители ключей нормализуются перед сравнением. Минимальный denylist: `authorization`, `cookie`, `set-cookie`, `session`, `sessionid`, `password`, `passwd`, `secret`, `token`, `access-token`, `refresh-token`, `api-key`, `client-secret`, `dsn`, `private-key`.

Строковая фильтрация покрывает header/cookie lines, URL query/fragment, IPv4/IPv6, Bearer credentials, JWT, Sentry DSN URL, credential assignments и PEM private-key blocks. Совпавшее значение заменяется стабильным маркером `[Filtered]`. Произвольный неизвестный секрет без denylisted key или поддерживаемой строковой сигнатуры не считается гарантированно обнаружимым.

## Ограничение gameplay input

После фильтрации циклы и превышение глубины заменяются стабильными маркерами, а объект детерминированно сериализуется в JSON. Размер определяется `Buffer.byteLength(json, 'utf8')`. Если он превышает 65 536 байт, `request.data` становится валидным объектом `{truncated: true, originalBytes, preview}`; UTF-8-безопасный детерминированный preview сокращается так, чтобы JSON самого wrapper не превышал 65 536 байт.

## Запрещённые данные

- любые request/response headers и cookies как структурные источники;
- query string, IP и user-agent как структурные источники; их распознаваемые строковые представления также фильтруются в разрешённых полях;
- session/auth data, DSN, password, token, API/private keys;
- local variables и source context строк стека;
- полное состояние игры, имя игрока, произвольные свойства throwable и `Error.cause`;
- default SDK contexts, user, breadcrumbs, spans, transaction, logs и metrics.

## Переходы состояния шлюза

| Исходное состояние | Условие | Результат |
|---|---|---|
| `disabled` | нет DSN, environment не `staging` или build head невалиден | остаётся `disabled`, capture является no-op |
| `disabled` | корректная разрешающая конфигурация | инициализация SDK, переход в `enabled` |
| `disabled` | SDK отверг конфигурацию | остаётся `disabled`, warning без DSN |
| `enabled` | capture неожиданной ошибки | payload очищается, ограничивается и передаётся SDK; caller не ждёт доставку |

Повторная runtime-реконфигурация не требуется: состояние определяется один раз при запуске процесса.
