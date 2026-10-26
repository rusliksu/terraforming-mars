# План: сдача без временного бота

**Repo**: `C:\Users\Ruslan\tm\terraforming-mars`
**Worktree**: `C:\Users\Ruslan\.codex-worktrees\terraforming-mars-bot-surrender-separation`
**Branch**: `codex/bot-surrender-separation`
**Base**: `origin/main` at `6e1c33ea0c0765257e9c6da3d801b0145d9aeea6`
**Bead**: `tm-ai-63l`

## Текущее поведение

Первый implementation commit разделил runtime takeover и surrender. После
проверки `tfm-community.herokuapp.com` Руслан одобрил более простой контракт:
human takeover удаляется, surrendered player не получает стратегического бота.

Отдельно текущий create-game/player-link flow создает и прокидывает
`botTakeoverToken` через URL fragment. Это выглядит как странный game-level
"логин": одна ссылка с `#botTakeoverToken=...` позволяет открыть player links с
тем же token и управлять bot takeover для игроков.

## Предлагаемая архитектура

1. Удалить `botTakeoverPlayerIds` и human start/stop route/UI. Сохранить
   `BotTakeoverManager` только для `botPlayerIds`, созданных как bot players.
2. Оставить сериализуемое `surrenderedPlayerIds` как outcome state.
3. Добавить отдельный `ApiSurrender` route. Он:
   - авторизуется через конкретный player page capability или admin/server-id;
   - не использует shared `botTakeoverToken` как player-facing login;
   - помечает игрока surrendered;
   - сохраняет игру;
   - не имеет stop/undo path.
4. `EloSyncService` получает confirmed leaves из surrendered state и сортирует
   surrendered players после продолживших игру до VP/MC tie-breakers.
5. Для минимальной безопасной модели при surrender:
   - на обычном action prompt сдавшийся игрок pass;
   - research закрывается без покупки карт;
   - final greenery для сдавшегося игрока пропускается;
   - surrender route доступен только в research/action phases, поэтому draft и
     другие обязательные промежуточные prompts не остаются заблокированными.
6. В UI оставить один irreversible `Surrender` action с confirm внутри Actions.
   Удалить player/admin temporary takeover controls.
7. Добавить `getPlayersStillInGame` / `allOtherPlayersHaveSurrendered` semantics
   в game-over flow; при одном оставшемся игроке multiplayer game заканчивается.
8. GameEnd сортирует surrendered players последними и показывает flag.
9. Удалить token-login UX:
   - не возвращать `botTakeoverToken` в create-game model для UI;
   - не добавлять `#botTakeoverToken=...` в `App`, `GameHome`,
     `CreateGameForm` и Telegram player links;
   - убрать `X-Bot-Takeover-Token` из client mutation;
   - обновить route/tests под player-specific capability.

## Основные файлы

- `src/client/components/PlayerHome.vue`
- `src/server/routes/ApiSurrender.ts`
- `src/server/bot/BotTakeoverManager.ts`
- `src/server/Game.ts`
- `src/server/IGame.ts`
- `src/server/SerializedGame.ts`
- `src/server/elo/EloSyncService.ts`
- `src/server/TelegramBot.ts`
- `src/server/models/ServerModel.ts`
- `src/server/routes/ApiCreateGame.ts`
- `src/common/app/paths.ts`
- `src/common/models/SimpleGameModel.ts`
- `src/server/server/requestProcessor.ts`
- `src/client/components/App.vue`
- `src/client/components/GameHome.vue`
- `src/client/components/create/CreateGameForm.vue`
- `tests/routes/ApiSurrender.spec.ts`
- `tests/routes/ApiCreateGame.spec.ts`
- `tests/routes/ApiGame.spec.ts`
- `tests/server/TelegramBot.spec.ts`
- `tests/client/components/PlayerHome.spec.ts`
- `tests/client/components/GameHome.spec.ts`
- `tests/client/components/App.spec.ts`
- `tests/Game.spec.ts`
- `tests/server/EloSyncService.spec.ts`

## Проверки

- targeted server tests for `ApiSurrender`, `EloSyncService`, `Game`
- targeted client component test for `PlayerHome`
- targeted `GameEnd` ranking test
- `npm run lint:server`
- `npm run lint:client`
- `npm run build`

Full build может быть дорогим; если targeted stage красный, build не запускать
до исправления.

## Gates

- До product code: explicit approval этого baseline.
- No LogPanel edits.
- No staging/prod deploy.
- No official upstream PR.
- Do not copy the community gen-5 restriction: early explicit surrender remains
  available after multiplayer game start so completion reliability records it.
- Public/user-facing wording можно потом отдельно упростить под стиль Руслана.
