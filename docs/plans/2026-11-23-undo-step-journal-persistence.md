# Шаговый откат: вынести журнал ActionReplay из памяти в БД

Дата: 2026-11-23
Статус: spec (вариант A), миссия не материализована
Связанные артефакты: `docs/variants/undo.md`, миссия `kitty-specs/undo-step-snapshot-integrity-01KZGQF4/`

## 1. Проблема

Шаговый откат (`undoStepOption`) держит журнал в памяти сервера:

- `Game.actionReplayState` (`src/server/Game.ts:216`) — тип `ActionReplayState` из `src/server/game/ActionReplay.ts`;
- структура: `rootSnapshot: SerializedGame`, `entries: ActionInputEntry[]` (лимит `MAX_ACTION_REPLAY_ENTRIES = 32`), `currentActorId`, `currentPromptFingerprint`, `resetBeforeNextInput`, `lastStepBackLogStartIndex`;
- поле не входит в `SerializedGame` и не сохраняется, поэтому после рестарта сервера шаговый откат недоступен до конца партии (зафиксировано в `docs/variants/undo.md`, раздел «Undo one step»).

При этом нужная инфраструктура уже есть: append-only сохранения, genesis-снапшот и упорядоченный журнал входов в v2 gateway (`src/server/actionGateway/ActionGateway.ts`, коммит `02122a15f`), `stateHashAfter` на каждый принятый input, `POST /player/undo/v2` — добавление undo-намерения без деструктивного восстановления.

## 2. Цель

Сделать журнал шагового отката переживающим рестарт сервера, не меняя поведение партий без `undoStepOption` и не включая какие-либо опции по умолчанию.

## 3. Область работ

Входит:

- персистенция журнала (root + entries) для партий с `undoStepOption: true`;
- восстановление журнала при загрузке партии;
- fail-closed при расхождении состояния;
- миграция схемы и тесты на рестарт.

Не входит:

- изменение значений по умолчанию `undoOption` / `undoStepOption` в `defaultCreateGameModel.ts`;
- изменение legacy-пути `GameLoader.undo()` / `restoreGameAt`;
- перенос журнала на клиент или в localStorage;
- интерфейсные изменения, кроме сохранения текущего поведения `showStepBack`.

## 4. Функциональные требования

**FR-1. Запись журнала.** Для партии с `undoStepOption: true` журнал пишется в БД в той же транзакции, что и сохранение партии (`Database.saveGame`). Отдельного «фонового» писателя нет.

**FR-2. Схема.** Минимальный набор данных:

- `game_action_replay`: `gameId`, `seq` (int, порядковый номер записи), `rootSaveId` (int, ссылка на сохранение корня действия), `actorId`, `promptFingerprint`, `inputJson`, `logStartIndex` (nullable), `continuesThroughNextInput` (bool), `createdAt`;
- `game_action_replay_head`: `gameId`, `rootSaveId`, `currentActorId`, `currentPromptFingerprint`, `resetBeforeNextInput` (bool), `lastStepBackLogStartIndex` (nullable), `updatedAt`;
- первичные ключи: `(gameId, seq)` и `gameId`; внешних ключей на игры нет (как у остальных игровых таблиц).

**FR-3. rootSnapshot заменяется ссылкой.** `rootSnapshot: SerializedGame` в БД не дублируется: хранится `rootSaveId` уже существующего append-only сохранения. При загрузке снапшот читается из сохранений, а не из журнала.

**FR-4. Восстановление при загрузке.** `GameLoader` при десериализации партии с `undoStepOption: true` и наличием записей в `game_action_replay_head`:

1. загружает head и записи по возрастанию `seq`;
2. проверяет, что `rootSaveId` существует в сохранениях;
3. сверяет `promptFingerprint` текущего промпта актора с `currentPromptFingerprint`;
4. только при совпадении восстанавливает `actionReplayState`; иначе журнал не восстанавливается (FR-6).

**FR-5. Лимит и очистка.** Лимит `MAX_ACTION_REPLAY_ENTRIES = 32` сохраняется: при переполнении в той же транзакции удаляются записи с наименьшим `seq` за пределами лимита. При `resetBeforeNextInput`, смене актора и начале нового корня действия журнал переписывается полностью (не накапливается между действиями).

**FR-6. Fail-closed.** Любое из условий — нет `rootSaveId`, нет head, расхождение `promptFingerprint`, ошибка разбора `inputJson` — приводит к тому, что шаговый откат недоступен, а партия загружается нормально. Партия и её состояние не изменяются, в лог пишется причина: `replay_dropped_missing_root`, `replay_dropped_fingerprint`, `replay_dropped_corrupt`.

**FR-7. Изоляция.** Партии без `undoStepOption` не читают и не пишут эти таблицы. Legacy-путь отката действия (`GameLoader.undo()`) не меняется.

**FR-8. Наблюдаемость.** Счётчики: `replay_saved`, `replay_loaded`, `replay_dropped_*`. Запись журнала не должна давать видимой задержки сохранения (см. AC-7).

**FR-9. Миграция.** Миграция только создаёт таблицы. Обратного заполнения нет: партии, начатые до миграции, шагового отката после рестарта не получат.

## 5. Acceptance criteria

- **AC-1.** Партия с `undoStepOption: true`: игрок делает два шага, сервер перезапускается, после загрузки `showStepBack` доступен, откат возвращает к предыдущему логическому шагу с теми же картами (сценарий Hi-Tech Lab из `docs/variants/undo.md`).
- **AC-2.** После рестарта шаговый откат не возвращает в состояние, отличное от состояния до рестарта: сравнение `stateHash` до и после восстановления совпадает.
- **AC-3.** Изменение `currentPromptFingerprint` (например, партия ушла дальше через другого клиента при выключенном журнале) даёт fail-closed: откат недоступен, партия загружается, в логах `replay_dropped_fingerprint`.
- **AC-4.** Удалённое корневое сохранение даёт fail-closed: откат недоступен, `replay_dropped_missing_root`.
- **AC-5.** Серия из 40 шагов: в журнале остаются последние 32, откат на 32-й шаг работает, откат на 33-й недоступен.
- **AC-6.** Партия с `undoOption: true` и `undoStepOption: false` ведёт себя как раньше: откат действия работает, таблицы журнала не затрагиваются.
- **AC-7.** Задержка сохранения партии с включённым журналом не растёт более чем на 5 мс по p95 на локальной PostgreSQL-фикстуре (замер в тесте, не в продакшене).
- **AC-8.** Повторный рестарт без новых шагов не теряет журнал: два рестарта подряд, откат всё ещё доступен.
- **AC-9.** Остановка сервера в момент записи не оставляет частичный журнал: транзакционность подтверждается тестом с принудительным исключением в конце транзакции.

## 6. Тесты

**Интеграционные (PostgreSQL, `tests/integration/`)**

- **T-1 restart step undo**: создать игру (`undoStepOption: true`), два шага, сбросить кэш `GameLoader` (эмуляция рестарта), загрузить игру, выполнить шаговый откат, сверить `stateHash` и промпты.
- **T-2 fingerprint drift**: изменить промпт-состояние между сохранением и загрузкой, ожидать `replay_dropped_fingerprint` и рабочий откат действия.
- **T-3 missing root**: удалить корневое сохранение, ожидать `replay_dropped_missing_root`, отсутствие исключений.
- **T-4 eviction**: 40 шагов, проверить 32 записи и границу доступного отката.
- **T-5 transaction rollback**: замоканная ошибка после вставки записей → журнал не изменён.
- **T-6 isolation**: игра без `undoStepOption` — таблицы пусты.

**Модульные (`tests/server/game/`)**

- **T-7 сериализация head**: round-trip `ActionReplayState` ↔ (head + entries) без потери полей, включая `continuesThroughNextInput` и `lastStepBackLogStartIndex`.
- **T-8 fingerprint**: `promptFingerprintForPlayer` стабилен между сериализацией и загрузкой.

**Клиентские (Vitest, `tests/client/`)**

- **T-9 showStepBack**: при восстановленном журнале кнопка доступна; при `canStepBack: false` — скрыта.

**Рестарт-сценарий для ручной проверки (staging)**

1. Создать партию на `staging.tm.knightbyte.win` с включённым `undoStepOption`.
2. Сделать два шага в действии с раскрытием карт (Hi-Tech Lab / Project Eden).
3. `systemctl restart` сервиса (или штатный deploy).
4. Вернуться в партию, нажать «шаг назад», убедиться, что выбор повторяемый и карты те же.
5. Проверить лог: `replay_loaded` без `replay_dropped_*`.

## 7. План реализации

1. Миграция: `game_action_replay`, `game_action_replay_head` (+ индексы).
2. Тип-маппер `ActionReplayState` ↔ строки (модульные тесты T-7, T-8).
3. Запись в `Database.saveGame` в существующей транзакции (FR-1, FR-5).
4. Восстановление в `GameLoader` + fail-closed ветки и счётчики (FR-4, FR-6, FR-8).
5. Интеграционные тесты T-1…T-6, клиентский T-9.
6. Ручной staging-сценарий и замер задержки сохранения (AC-7).

## 8. Риски

- **Горячий путь сохранения.** Запись добавляет строки на каждый input; митигация — лимит 32 и только для включённой опции, плюс AC-7.
- **Дрейф промпта после апгрейда кода.** Изменение формы `waitingFor` сломает сверку fingerprint; митигация — версия схемы fingerprint и мягкий fail-closed.
- **Рост таблиц.** Без очистки старые записи копятся; митигация — очистка при завершении партии и удаление вместе с сохранениями.
- **Ожидания игроков.** Шаговый откат остаётся экспериментальным: после рестарта он доступен только при совпадении состояния, что и описано в документации.

## 9. Откат (rollback)

Фича за флагом `undoStepOption`; глобальный рубильник — переменная окружения `TM_DISABLE_REPLAY_JOURNAL=1`, при которой журнал не пишется и не читается. Миграция аддитивная, удаление таблиц не требуется для отката поведения.
