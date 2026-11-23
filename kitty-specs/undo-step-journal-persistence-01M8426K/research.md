# Research: сохранение журнала шагового отката

## Текущее состояние кода

- `Game.actionReplayState` (`src/server/Game.ts:216`) — runtime-only поле, отсутствует в `SerializedGame`.
- `ActionReplayState` (`src/server/game/ActionReplay.ts`): `rootSnapshot: SerializedGame`, `entries` (лимит `MAX_ACTION_REPLAY_ENTRIES = 32`), `currentActorId`, `currentPromptFingerprint`, `resetBeforeNextInput`, `lastStepBackLogStartIndex`.
- `docs/variants/undo.md`: журнал шагов живёт в памяти; рестарт делает шаговый откат недоступным.
- Append-only сохранения + v2 gateway (`src/server/actionGateway/ActionGateway.ts`): persisted genesis, ordered replay, `stateHashAfter`, `POST /player/undo/v2` без `restoreGameAt`.

## Решения

1. **Корень — ссылка, не копия.** Хранить `rootSaveId` существующего сохранения вместо `SerializedGame` в БД: объём журнала падает до десятков строк.
2. **Транзакция сохранения.** Запись журнала выполняется внутри `Database.saveGame`: либо партия и журнал сохраняются вместе, либо ничего.
3. **Fail-closed по fingerprint.** При загрузке сверять `promptFingerprint`; расхождение — журнал отбрасывается, партия грузится.
4. **Изоляция опцией.** Чтение и запись только при `undoStepOption === true`; legacy undo-путь не затрагивается.
5. **Рубильник.** `TM_DISABLE_REPLAY_JOURNAL=1` полностью отключает чтение/запись журнала без миграции схемы.

## Открытые вопросы

- Нужна ли очистка журнала при завершении партии в этом же изменении (да, минимально: удаление строк вместе с сохранениями).
- Формат миграции: существующие миграции каталога `src/server/database/` (PostgreSQL/SQLite обе реализации) — оба бэкенда обязаны поддерживать новые таблицы.
