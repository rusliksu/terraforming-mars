# Action protocol v1 для browser engine slice

Статус: frozen contract для A1. HTTP endpoint остаётся `POST /player/input/v2`, wire schema — `v: 1`. Legacy `/player/input` не меняется этим контрактом.

## Authority

- Online-правила исполняет сервер на авторитетном состоянии. Браузер присылает intent, а не state, cost, seed, RNG, revision или hash.
- `playerId` не входит в body. Сервер выводит его из аутентифицированной сессии и проверяет владение `gameId` до загрузки игрового состояния.
- `gameId` в body сверяется с загруженной игрой. Spectator не может отправлять intent.
- `runId` и `shadowInputSeq` не являются revision или idempotency key и в v2 не участвуют.

## Request

```json
{
  "v": 1,
  "gameId": "g...",
  "actionId": "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx",
  "baseRevision": 42,
  "promptToken": "server-issued-opaque-token",
  "engineVersion": "rules-build-id",
  "input": { "type": "option" }
}
```

Поля:

| Поле | Правило |
|---|---|
| `v` | Ровно `1`. Несовпадение — schema error. |
| `gameId` | `g` + 1..63 безопасных ASCII символа, сверяется server-side. |
| `actionId` | UUID; клиентский ключ идемпотентности, не доказательство личности. |
| `baseRevision` | Последняя подтверждённая клиентом revision; не право на запись и не CAS-токен. |
| `promptToken` | Opaque, unpredictable server-issued token текущего prompt. Меняется при смене/исчезновении `waitingFor` и после undo. |
| `engineVersion` | Build/rules identity; несовпадение требует resync/refresh. |
| `input` | Ровно один существующий `InputResponse`; неизвестные поля и типы отклоняются. |

Ограничения парсера: 32 KiB body, глубина вложенности 8, не более 1024 значений, массивы до 64 элементов, суммы/количества — safe integer в допустимом диапазоне. Семантические границы (сколько карт доступно, хватает ли ресурсов, легален ли space) проверяет сервер по текущему prompt.

## Idempotency и revision

- Уникальность: `(gameId, actionId)`. Повтор с тем же canonical semantic payload возвращает сохранённый outcome без второго apply.
- Тот же `actionId` с другим payload — `IDEMPOTENCY_CONFLICT`, без mutation.
- `requestFingerprint` считается по canonical parsed payload: `gameId, actionId, baseRevision, promptToken, engineVersion, input`. Порядок JSON-ключей не влияет. `runId` и диагностические поля не входят.
- `revision` назначает только сервер, монотонно для игры, включая undo. Сервер также хранит `epoch`/ветку: undo начинает новый epoch, а старые события остаются в audit.
- `baseRevision` используется клиентом для reconciliation. Если `promptToken` ещё актуален, устаревшая `baseRevision` сама по себе не обязана отклонять reaction; сервер всё равно проверяет текущий prompt и состояние. Если prompt изменился — `STALE_PROMPT`.

## Response

Успех:

```json
{
  "v": 1,
  "actionId": "...",
  "status": "applied",
  "revision": 43,
  "appliedRevision": 43,
  "engineVersion": "rules-build-id",
  "viewRevision": 43,
  "view": { "id": "p...", "waitingFor": {}, "game": {} },
  "viewHash": "server-computed-authorized-view-hash",
  "promptToken": "next-prompt-token"
}
```

`status: "duplicate"` возвращает сохранённый исходный outcome и текущую authorized view; повторно правила не применяются. `view` — это `PlayerViewModel`, без `SerializedGame`, seed, чужих рук, draft и ordered decks. `viewHash` — диагностический hash только авторизованного view; он не является authority и не заменяет server state hash.

Ошибки: `INVALID_SCHEMA`, `UNAUTHORIZED`, `ENGINE_VERSION_MISMATCH`, `STALE_PROMPT`, `STALE_REVISION`, `INVALID_ACTION`, `IDEMPOTENCY_CONFLICT`, `RATE_LIMITED`, `PERSISTENCE_FAILURE`. Ответ не содержит stack trace, SQL, private cards, токенов или внутренних ID. Для stale/version mismatch клиент делает ровно один full authorized resync.

## Recovery и commit

- ACK выдаётся только после commit action journal и связанного checkpoint/genesis state по правилам серверного store; до commit live authoritative state не меняется.
- Источник истины на первом срезе — genesis snapshot + ordered replay принятых actions. `Game.deserialize()` сейчас не восстанавливает `waitingFor`/deferred continuation, поэтому mid-deferred checkpoint не считается exact-resume.
- Undo — новый intent/revision/epoch, а не удаление старых saves. Hidden-information guard остаётся серверным.
- Повтор после потери ответа должен найти сохранённый outcome; ошибка записи не должна оставлять клиента с успешным ACK.

## Privacy

Запрещено отправлять в browser/Worker/storage/logs:

- `SerializedGame`, `seed`, `currentSeed`, ordered draw/discard piles;
- чужие `cardsInHand`, dealt/drafted/prelude/CEO cards;
- deferred callbacks, raw server `PlayerInput`, Telegram/user identity;
- raw promptToken в audit и публичных логах (хранится hash/token только в защищённом prompt metadata).

Разрешены только `PlayerViewModel` текущего игрока, public player/game view и `viewHash`. Spectator получает отдельную redacted projection и не может действовать.

## Feature flag и rollback

- Режим `legacy|v2` выбирается при создании тестовой игры и сохраняется на её жизнь. Смешивать v1/v2 writes в одной игре нельзя.
- Default — `legacy`. V2 creation включается только для согласованного cohort; kill switch отключает новые v2 games.
- Уже начатые v2 games должны оставаться читаемыми совместимым backend. Откат не удаляет action history и не переключает активную игру на build без v2 reader/writer.
- Flag нельзя включать query/body/header. Fallback допустим только для transport/Worker failure; validation/parity error не маскируется fallback-ом.

## Baseline и проверки A1

До появления numeric budget измеряются: размер типичного/максимального action body, время parse/canonicalize, размер authorized view, bundle impact, p95 gateway/apply. Абсолютные пороги назначаются после измерения, не выдумываются.

A1 acceptance:

- runtime guards принимают все поддержанные `InputResponse` и отклоняют malformed/unknown/oversized без side effects;
- canonical fingerprint не зависит от порядка ключей и меняется при изменении semantic payload;
- в примерах и тестах нет полного state, seed, чужих рук;
- server/client owners сверили поля и error codes;
- legacy route не изменён.

## Вне scope A1

Gateway, HMAC/prompt store, DB schema, replay, UI, Worker bundle, EPIC/expansion-specific prompts. Реализация этих частей — A2/A4/A5a/A5b/C1/Q1.
