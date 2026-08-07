# План: временный бот и сдача

**Repo**: `C:\Users\Ruslan\tm\terraforming-mars`
**Worktree**: `C:\Users\Ruslan\.codex-worktrees\terraforming-mars-bot-surrender-separation`
**Branch**: `codex/bot-surrender-separation`
**Base**: `origin/main` at `6e1c33ea0c0765257e9c6da3d801b0145d9aeea6`
**Bead**: `tm-ai-63l`

## Текущее поведение

`ApiBotTakeover` сейчас при start добавляет human player в
`game.botTakeoverPlayerIds`, а stop удаляет его. `EloSyncService` при завершении
игры использует `game.botTakeoverPlayerIds` как `confirmedLeavePlayerIds`.

Это смешивает два смысла:

- runtime: кто сейчас под управлением бота;
- outcome: кто окончательно покинул партию.

Отдельно текущий create-game/player-link flow создает и прокидывает
`botTakeoverToken` через URL fragment. Это выглядит как странный game-level
"логин": одна ссылка с `#botTakeoverToken=...` позволяет открыть player links с
тем же token и управлять bot takeover для игроков.

## Предлагаемая архитектура

1. Оставить `botTakeoverPlayerIds` как pending/reversible takeover marker.
2. Добавить отдельное сериализуемое состояние surrendered players, например
   `surrenderedPlayerIds`.
3. Добавить route action или отдельный route для surrender. Он:
   - авторизуется через конкретный player page capability или admin/server-id;
   - не использует shared `botTakeoverToken` как player-facing login;
   - помечает игрока surrendered;
   - останавливает активный takeover для этого игрока, если он был;
   - сохраняет игру;
   - не имеет stop/undo path.
4. `EloSyncService` получает confirmed leaves из surrendered state, а не из
   временного takeover state.
5. Для минимальной безопасной модели при surrender:
   - на обычном action prompt сдавшийся игрок pass;
   - на research/draft/final greenery выбирается no-buy/no-op/skip when available;
   - если prompt не имеет безопасного no-op, fail closed и оставляем явно
     видимый blocker вместо стратегической игры ботом.
6. В UI перенести controls внутрь блока Actions:
   - temporary button/switch: `Let bot play for me` / `Return control`;
   - separate irreversible `Surrender` action с confirm.
7. Удалить token-login UX:
   - не возвращать `botTakeoverToken` в create-game model для UI;
   - не добавлять `#botTakeoverToken=...` в `App`, `GameHome`,
     `CreateGameForm` и Telegram player links;
   - убрать `X-Bot-Takeover-Token` из client mutation;
   - обновить route/tests под player-specific capability.

## Основные файлы

- `src/client/components/PlayerHome.vue`
- `src/server/routes/ApiBotTakeover.ts`
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
- `tests/routes/ApiBotTakeover.spec.ts`
- `tests/routes/ApiCreateGame.spec.ts`
- `tests/routes/ApiGame.spec.ts`
- `tests/server/TelegramBot.spec.ts`
- `tests/client/components/PlayerHome.spec.ts`
- `tests/client/components/GameHome.spec.ts`
- `tests/client/components/App.spec.ts`
- `tests/Game.spec.ts`
- `tests/server/EloSyncService.spec.ts`

## Проверки

- `npm run test:server -- --grep "ApiBotTakeover|EloSyncService|Game"`
- targeted client component test for `PlayerHome`
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
- Public/user-facing wording можно потом отдельно упростить под стиль Руслана.
