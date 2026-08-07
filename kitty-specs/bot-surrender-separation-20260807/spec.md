# Спецификация: временный бот и сдача

## Цель

Разделить два разных пользовательских действия:

- временно отдать управление боту и потом вернуться без штрафа;
- окончательно сдаться, чтобы партия продолжалась без игрока, а результат
  считался как подтвержденный leave.

## Термины

- **Bot takeover**: обратимый runtime control. Игрок временно просит сервер
  играть за него, но может вернуться.
- **Surrender**: необратимый game outcome. Игрок явно сдается и больше не
  влияет на партию как полноценный стратегический участник.
- **Completion reliability**: текущая статистика `Ливы N/M`, построенная через
  `completionOutcome: left`.

## Функциональные требования

| ID | Требование |
| --- | --- |
| FR-001 | Start/stop bot takeover остаются обратимыми и не создают `left`, если игрок вернулся до конца партии. |
| FR-002 | Explicit surrender сохраняется в game state, переживает рестарт и не очищается stop takeover. |
| FR-003 | При завершении партии surrendered player получает `completionOutcome: left`. Остальные игроки получают `completed`. |
| FR-004 | Surrender влияет на обычный Elo через итоговое место как обычный результат; отдельного x2 Elo или дополнительного рейтингового штрафа нет. |
| FR-005 | Surrendered player не должен играть полноценным стратегическим smartbot. Минимальная модель: pass/skip when possible, deterministic no-op для безопасных обязательных prompts, без покупки/разыгрывания карт ради оптимизации. |
| FR-006 | Player-facing controls отображаются в Actions area, а не отдельным верхним блоком PlayerHome. |
| FR-007 | Bot takeover и surrender имеют разные тексты, подтверждения, audit metadata и tests. |
| FR-008 | LogPanel и связанные log UI/files не меняются в этой mission. |
| FR-009 | Game-level `botTakeoverToken` URL fragment flow удаляется из player-facing UX: create-game/game/player links не должны выдавать `#botTakeoverToken=...` как отдельный "login" для управления ботом. |
| FR-010 | Player-facing takeover/surrender авторизуются знанием конкретной player-ссылки этого игрока; shared game token больше не должен давать управление любым игроком из одной ссылки. |

## Acceptance Criteria

- Игрок нажал temporary bot, потом stop/return: `botTakeoverPlayerIds` не
  остается как leave marker, `completionOutcome` не становится `left`.
- Игрок нажал surrender: state serialized/deserialized и при конце игры этот
  игрок учитывается как `left`.
- Surrender нельзя отменить через stop bot takeover.
- Если сдавшийся игрок получает обычный action prompt, сервер не выбирает
  стратегические действия вместо него; он проходит ход через pass/skip.
- UI показывает controls внутри блока Actions и не показывает старый верхний
  `bot-takeover-control`.
- Новые game/player/Telegram links не содержат `#botTakeoverToken=...`.
- API больше не требует `X-Bot-Takeover-Token` для действия со своей player
  page capability и не принимает shared game token как player-facing login.
- Targeted route/model/client/Elo tests проходят.

## Out Of Scope

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
