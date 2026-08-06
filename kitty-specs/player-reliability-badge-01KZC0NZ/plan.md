# План: статистика доигрываемости партий

**Ветка**: `codex/player-reliability-badge`
**Дата**: 2026-08-06
**Спецификация**: `kitty-specs/player-reliability-badge-01KZC0NZ/spec.md`

## Краткое решение

Добавить evidence takeover в server-side состояние игры, передать
подтверждённый completion outcome в `EloSyncService`, вычислять отдельный
rolling показатель по последним 20 рейтинговым партиям и отобразить его рядом с
существующим Elo только после согласованного порога.

## Технический контекст

- **Server**: `src/server/bot/BotTakeoverManager.ts`,
  `src/server/routes/ApiBotTakeover.ts`, `src/server/database/GameLoader.ts`,
  `src/server/elo/EloSyncService.ts`.
- **Client**: `src/client/utils/elo.ts`,
  `src/client/components/overview/PlayerEloBadge.vue` и ближайшие consumers.
- **Storage**: сериализуемое состояние игры и совместимый Elo data artifact;
  старые записи без outcome остаются unknown.
- **Testing**: `EloSyncService.spec.ts`, `ApiBotTakeover.spec.ts`,
  `ApiCreateGame.spec.ts`, `PlayerEloBadge.spec.ts`, `Elo.spec.ts`, плюс
  `git diff --check` и targeted build/test.
- **Constraints**: русский human-facing слой, literal paths/identifiers без
  перевода, без credentials и без live/prod действий.

## Границы поведения

1. При start takeover записать owner и pending state.
2. При stop takeover до завершения партии отметить возврат и очистить pending.
3. При normal completion без возврата классифицировать один confirmed leave.
4. При rebuild Elo пропускать unknown outcomes и считать последние 20 known
   outcomes независимо от Elo arithmetic.
5. Отдавать клиенту только агрегат `completionReliability` и показывать
   нейтральную пометку при порогах из spec.

## Карта work packages

### WP01 — Evidence и rolling outcome

Сериализуемый takeover state, classification при normal completion, совместимое
сохранение и rolling aggregation в `EloSyncService`. Зависимостей нет.

### WP02 — Client badge

Типы/загрузка агрегата и компактная нейтральная пометка с tooltip; не менять
существующие Elo/delta semantics. Зависит от WP01 contract.

### WP03 — Проверка и приёмка

Targeted tests, build, diff review и staging-only smoke при зелёных проверках.
Prod/live и upstream остаются отдельными gates. Зависит от WP01 и WP02.

## Delivery gates

- До product code нужен explicit approval этого baseline.
- Перед PR: focused tests, full relevant build и проверка отсутствия Elo delta.
- Staging допускается только после read-only snapshot и зелёных checks.
- Prod/live, база и upstream не выполняются без отдельной явной команды.
