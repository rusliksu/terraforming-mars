# Спецификация: необратимая сдача без временного бота

## Цель

Оставить одно явное пользовательское действие: окончательно сдаться, чтобы
партия завершилась или продолжалась без стратегического управления за ушедшего
игрока, а результат считался как подтвержденный leave и последнее место.

## Термины

- **Surrender**: необратимый game outcome. Игрок явно сдается и больше не
  влияет на партию как полноценный стратегический участник.
- **Bot player**: участник, созданный как автоматический игрок при старте игры.
  Внутренняя bot-инфраструктура для него сохраняется и не является takeover
  человеческого места.
- **Completion reliability**: текущая статистика `Ливы N/M`, построенная через
  `completionOutcome: left`.

## Функциональные требования

| ID | Требование |
| --- | --- |
| FR-001 | Player/admin UI и API больше не позволяют временно передавать человеческое место боту или возвращать управление. |
| FR-002 | Explicit surrender сохраняется в game state, переживает рестарт и не имеет undo/stop path. |
| FR-003 | При завершении партии surrendered player получает `completionOutcome: left`. Остальные игроки получают `completed`. |
| FR-004 | Surrendered players всегда ранжируются после продолживших игру; внутри каждой группы сохраняются VP/MC tie-breakers. Elo считается по этому обычному месту без x2 или отдельного штрафа. |
| FR-005 | Surrendered player не должен играть полноценным стратегическим smartbot. Минимальная модель: pass/skip when possible, deterministic no-op для безопасных обязательных prompts, без покупки/разыгрывания карт ради оптимизации. |
| FR-006 | Единственный player-facing `Surrender` control отображается в Actions area и требует явного подтверждения. |
| FR-007 | `BotTakeoverManager` остается только внутренней инфраструктурой для игроков, созданных с `isBot`; runtime human start/stop route удаляется. |
| FR-008 | LogPanel и связанные log UI/files не меняются в этой mission. |
| FR-009 | Game-level `botTakeoverToken` URL fragment flow удаляется из player-facing UX: create-game/game/player links не должны выдавать `#botTakeoverToken=...` как отдельный "login" для управления ботом. |
| FR-010 | Player-facing surrender авторизуется знанием конкретной player-ссылки этого игрока; shared game token не дает управление другими игроками. |
| FR-011 | Multiplayer game считается завершенной, когда остается ровно один non-surrendered player. |
| FR-012 | Surrender доступна в research/action phases multiplayer game без ограничения по поколению; ранний явный leave также должен фиксироваться. |

## Acceptance Criteria

- Игрок нажал surrender: state serialized/deserialized и при конце игры этот
  игрок учитывается как `left`.
- Human start/stop takeover отсутствует в PlayerHome, admin overview и API.
- Surrender нельзя отменить через другой route или UI.
- Если сдавшийся игрок получает обычный action prompt, сервер не выбирает
  стратегические действия вместо него; он проходит ход через pass/skip.
- При одном оставшемся non-surrendered игроке multiplayer game завершает
  обычный game-over flow.
- GameEnd и Elo ставят surrendered players после продолживших игру и помечают
  их surrender-флагом.
- UI показывает только `Surrender` внутри блока Actions.
- Новые game/player/Telegram links не содержат `#botTakeoverToken=...`.
- Surrender API не требует `X-Bot-Takeover-Token`; знание собственной player
  page capability достаточно, shared game token отсутствует.
- Targeted route/model/client/Elo tests проходят.

## Out Of Scope

- Временный human bot takeover.
- Продвинутый smartbot для сдавшихся игроков.
- x2 Elo, отдельная карма или новые penalty formulas.
- Изменение LogPanel.
- Staging/prod deploy, official upstream PR, DB migration.

## Governance Note

`spec-kitty specify` нельзя безопасно запустить в текущем окружении: CLI
резолвит `repo_root` в primary checkout `C:\Users\Ruslan\tm\terraforming-mars`
и видит branch `codex/nikita-kuskov-color-preferences`, а не task worktree
`codex/bot-surrender-separation`. Поэтому baseline создан как task-local
Spec Kitty artifact и связан с Bead `tm-ai-63l`.
