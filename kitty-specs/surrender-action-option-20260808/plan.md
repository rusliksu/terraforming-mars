# План: surrender action option

**Worktree**: `C:\Users\Ruslan\.codex-worktrees\terraforming-mars-surrender-action-option`
**Branch**: `codex/surrender-action-option`
**Base**: `origin/main` at `f1900da1eb9292b30df83ca700e508c8c85ddc74`
**Bead**: `tm-ai-c8c`

1. Добавить nested confirmation option в `Player.getActions()`.
2. Показывать опцию с первой action phase только в multiplayer, human и при
   более чем одном non-surrendered игроке.
3. Удалить standalone surrender UI/state/fetch из `PlayerHome.vue`.
4. Ограничить legacy surrender API тем же action-phase/active-turn контрактом
   и сохранить `surrender_accepted` audit при action input.
5. Переписать focused tests на реальный server action flow.
6. Запустить targeted tests, полный server suite, lint, build и визуальный
   staging smoke после merge.

## Gates

- Руслан одобрил UX словом `давай` после live-разбора community implementation.
- Staging разрешен после merge/checks; prod требует отдельной команды.
