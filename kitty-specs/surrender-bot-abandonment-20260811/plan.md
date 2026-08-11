# План: сдача с передачей места боту

## Технический контекст

- **Язык/версия**: TypeScript, Node.js 22.x.
- **Сервер**: существующий Terraforming Mars server, player input routes и
  `BotTakeoverManager`.
- **Хранение**: serialized game state и JSON ELO mirrors; DB schema migration не
  планируется.
- **Тесты**: Mocha server/client tests, TypeScript test build, ESLint, production build.
- **Base**: `origin/main` at `b89ea4d9ccb9eff549daade1e88534bc9e055905`.
- **Planning branch**: `codex/surrender-bot-abandonment`.
- **Merge target**: `main` через task-owned PR.

## Branch contract

Планирование и будущая реализация происходят только в
`C:\Users\Ruslan\.codex-worktrees\terraforming-mars-surrender-bot-abandonment`.
Primary checkout и чужие worktrees read-only. Итоговая ветка должна попасть в
`main` через PR; staging и prod остаются отдельными gates.

## Проверка карты кода

В `origin/main` отсутствуют `docs/codemap/codemap.json` и `codemap.lock`.
До первой code-правки требуется регенерировать три codemap-файла на актуальном
base и письменно подтвердить:

1. **Кто вызывает flow**: `Player.surrenderOption`, `PlayerInput`, legacy
   `ApiSurrender`, restore/startup path.
2. **Что он затрагивает**: serialized game, action/research/solar/final flows,
   bot process lifecycle, GameEnd и ELO.
3. **Какие тесты покрывают**: `Player`, `PlayerInput`, `ApiSurrender`, `Game`,
   `BotTakeoverManager`, `EloSyncService`, restore и client confirmation.

Старый незамерженный codemap commit не переносится вслепую; карта строится по
текущему `origin/main`.

## Архитектурное решение

### 1. Канонический surrender transition

Выделить один серверный transition, который выполняет eligibility checks,
preflight bot start, persisted state update, save, audit и компенсацию при
ошибке. `PlayerInput` и legacy route либо используют его, либо один из путей
удаляется как дублирующий.

Transition не должен требовать game-level shared token и не должен давать
управление чужим player ID.

### 2. Игровой цикл

Убрать трактовку `surrenderedPlayerIds` как списка неиграющих мест:

- не auto-complete research;
- не pass/skip action;
- не skip final greenery;
- не завершать игру по числу non-surrendered;
- обязательные solar/WGT prompts получает и выполняет бот.

Изначальные `botPlayerIds` остаются отдельной сущностью и продолжают исключать
bot games из ELO.

### 3. Восстановление runtime

После загрузки активных игр reconcile persisted `surrenderedPlayerIds` с
`BotTakeoverManager`. Старт идемпотентен; завершенные игры и изначальные bot
players не создают лишние процессы. Ошибки восстановления логируются
санитизированно и не скрываются за успешным статусом.

### 4. Рейтинг и reliability

Completed summary получает surrender outcome отдельно от confirmed leave.
Сортировка выполняется единым rank-key:

```text
outcome priority asc → VP desc → MC desc
completed=0, surrendered=1, left/abandoned=2
```

`completionOutcome=surrendered` участвует в числе игр, но не увеличивает
`leaves`. `left` сохраняет текущее значение leave. Существующие исторические
`completed/left` records остаются валидными.

### 5. Текущая игра

`g9e9c7f0b6fff` не является migration fixture для code change. После отдельного
разрешения ops-процедура может записать `Nuke 1 / vvbMinsk 2 / Борис 3` и
пересчитать ELO, но только после проверки активности игры, backup/dry-run и
post-state verification.

## Риски и защиты

- **Half-transition**: bot process стартовал, state не сохранился — обязательна
  компенсация и focused failure test.
- **Restart gap**: persisted surrender без процесса — обязательный startup
  reconciliation test.
- **ELO exclusion**: surrendered human попал в `botPlayerIds` — отдельный
  regression, подтверждающий, что игра остается рейтинговой.
- **Два пути сдачи**: divergent behavior — один transition/service и call-site
  inventory из codemap.
- **Ложный abandoned**: inactivity detector запрещен scope constraint.

## Проверки

- Focused tests сначала красные, затем зеленые для transition, WGT, restore и ELO.
- `npm run build:tests`.
- ESLint только затронутых source/test files, затем релевантный полный test set.
- `npm run build` после targeted green.
- Independent diff review и PR CI.
- После merge — staging snapshot/deploy/smoke по локальным правилам; prod только
  после отдельной команды и proof path.

## Gated delivery

1. Одобрение этого baseline.
2. Реализация и тесты в task worktree.
3. Review, commit, PR в `main`, CI.
4. Merge после зеленых проверок.
5. Staging deploy из clean exact `origin/main` и Playwright smoke.
6. Отдельное prod/live-разрешение.
7. Отдельное разрешение на ELO/DB correction текущей игры.
