# План: сохранение журнала шагового отката в БД

## Архитектура изменения

```
saveGame(transaction):
  game (SerializedGame) ──> saves
  if undoStepOption:
      replayHead (rootSaveId, fingerprint, flags)
      replayEntries[<=32] (seq, inputJson, logStartIndex)
load(gameId):
  game ──> deserialize
  if undoStepOption:
      head + entries ──> validate(rootSaveId exists, fingerprint match)
      ok   ──> restore actionReplayState
      fail ──> actionReplayState = undefined + metric
```

## Границы

- `src/server/database/` — миграции и repository (PostgreSQL + SQLite).
- `src/server/database/GameLoader.ts` — восстановление журнала при загрузке.
- `src/server/game/ActionReplay.ts` — маппинг runtime-состояния в персистентную форму.
- `src/server/routes/` не меняются: клиентский контракт `showStepBack` остаётся прежним.

## Точки отказа и поведение

| Ситуация | Поведение |
| --- | --- |
| Нет head | откат недоступен, `replay_dropped_missing_root` |
| `rootSaveId` не найден | откат недоступен, `replay_dropped_missing_root` |
| fingerprint не совпал | откат недоступен, `replay_dropped_fingerprint` |
| битый `inputJson` | откат недоступен, `replay_dropped_corrupt` |
| >32 шагов | старые строки удаляются в той же транзакции |
| `TM_DISABLE_REPLAY_JOURNAL=1` | журнал не читается и не пишется |

## Порядок работ

1. Схема и repository (WP01).
2. Запись в транзакции сохранения (WP02).
3. Восстановление и fail-closed (WP03).
4. Интеграционные тесты на рестарт (WP04).
5. Клиентский тест, документация, финальные гейты (WP05).

## Риски

- Рост задержки сохранения (митигация: 32 строки, только при включённой опции, замер в WP04).
- Дрейф fingerprint после апгрейда кода (митигация: версия схемы fingerprint + fail-closed).
- Накопление строк (митигация: удаление вместе с сохранениями партии).
