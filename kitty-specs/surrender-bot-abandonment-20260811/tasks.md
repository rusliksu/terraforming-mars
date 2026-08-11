# Задачи: сдача с передачей места боту

## Сводка

| WP | Цель | Зависимости | Подзадачи | Prompt |
| --- | --- | --- | --- | --- |
| WP01 | Атомарная сдача и непрерывность бота | — | T001–T006 | [WP01-surrender-bot-continuity.md](tasks/WP01-surrender-bot-continuity.md) |
| WP02 | Outcome groups, рейтинг и delivery evidence | WP01 | T007–T012 | [WP02-rating-outcomes.md](tasks/WP02-rating-outcomes.md) |

## Индекс подзадач

| ID | Описание | WP | Параллельно |
| --- | --- | --- | --- |
| T001 | Регенерировать актуальную codemap и подтвердить callers/impact/tests | WP01 | Нет |
| T002 | Добавить focused failing tests атомарного surrender transition | WP01 | Нет |
| T003 | Объединить player-input и route в канонический transition | WP01 | Нет |
| T004 | Запускать бота и не исключать surrendered seat из игрового цикла | WP01 | Нет |
| T005 | Восстанавливать surrendered bots после restore/restart | WP01 | Нет |
| T006 | Проверить cancel, failure compensation, WGT и persistence | WP01 | Нет |
| T007 | Добавить отдельный `surrendered` completion outcome | WP02 | Нет |
| T008 | Ввести порядок `completed > surrendered > left` с VP/MC tie-breakers | WP02 | Нет |
| T009 | Не считать surrendered как leave и не исключать игру из ELO | WP02 | Нет |
| T010 | Добавить ELO/GameEnd regressions и обратную совместимость данных | WP02 | Нет |
| T011 | Выполнить build/lint/targeted/full checks и independent review | WP02 | Нет |
| T012 | Подготовить PR/staging evidence, оставив prod и live correction gated | WP02 | Нет |

## WP01 — атомарная сдача и непрерывность бота

**Приоритет**: P1
**Независимая проверка**: после подтверждения Surrender бот обслуживает WGT,
после рестарта возобновляется, а ошибка старта не меняет управление.

- [x] T001 Регенерировать актуальную codemap и подтвердить callers/impact/tests (WP01)
- [x] T002 Добавить focused failing tests атомарного surrender transition (WP01)
- [x] T003 Объединить player-input и route в канонический transition (WP01)
- [x] T004 Запускать бота и не исключать surrendered seat из игрового цикла (WP01)
- [x] T005 Восстанавливать surrendered bots после restore/restart (WP01)
- [x] T006 Проверить cancel, failure compensation, WGT и persistence (WP01)

**Риски**: дублирующие surrender paths, side effect до save, bot process без
persisted state, restore без process.
**Размер prompt**: около 160 строк.

## WP02 — outcome groups, рейтинг и delivery evidence

**Приоритет**: P1
**Зависимость**: WP01
**Независимая проверка**: fixture `completed/surrendered/left` дает места 1/2/3,
а leave увеличивается только для `left`.

- [x] T007 Добавить отдельный `surrendered` completion outcome (WP02)
- [x] T008 Ввести порядок `completed > surrendered > left` с VP/MC tie-breakers (WP02)
- [x] T009 Не считать surrendered как leave и не исключать игру из ELO (WP02)
- [x] T010 Добавить ELO/GameEnd regressions и обратную совместимость данных (WP02)
- [x] T011 Выполнить build/lint/targeted/full checks и independent review (WP02)
- [ ] T012 Подготовить PR/staging evidence, оставив prod и live correction gated (WP02)

**Риски**: исторические records без нового outcome, рассинхрон GameEnd/ELO,
случайное изменение live JSON при build.
**Размер prompt**: около 155 строк.

## Покрытие требований

| Набор | Work package | Проверяемый результат |
| --- | --- | --- |
| FR-001–FR-006 | WP01 | подтверждение, атомарный transition, bot continuity и restart |
| FR-007–FR-008 | WP02 | outcome groups, places и completion reliability |
| FR-009–FR-012 | WP01, WP02 | capability boundary, audit, bot-game exclusion и необратимость |
| NFR-001–NFR-002 | WP01 | запуск и восстановление бота в заданные сроки |
| NFR-003 | WP01, WP02 | три стабильных прогона focused regressions |
| NFR-004 | WP02 | staging WGT smoke без console errors и зависшего prompt |
| C-001–C-005 | WP01, WP02 | отсутствие auto-abandon, live/DB/prod gates и разделение bot IDs |
| C-006 | WP01, WP02 | сохранение hidden-info confirmation для action/step undo |

## Последовательность

Работа выполняется последовательно в одном task worktree, потому что WP02
зависит от persisted semantics WP01. Параллельная запись не применяется.
