# План: удалить Current games

**Worktree**: `C:\Users\Ruslan\.codex-worktrees\terraforming-mars-remove-live-games`
**Branch**: `codex/remove-live-games`
**Base**: `origin/main` at `cd5c9bcedd8ed4cecc9a920f7192cfcb903652d9`
**Bead**: `tm-ai-93r`

1. Зафиксировать все client, route, model и database call sites.
2. Удалить UI/API вертикаль целиком.
3. Удалить ставшие мёртвыми database/game-loader methods и tests.
4. Проверить отсутствие ссылок и просмотреть итоговый diff.
5. Запустить focused tests, lint и build.
6. Опубликовать отдельный task-owned PR в кастомный репозиторий.

## Gates

- Руслан явно одобрил удаление: `удаляй, я с тобой согласен`.
- Proof PR для upstream naming выполняется отдельно и без behavior change.
- Staging/prod не входят в эту задачу; prod требует отдельной команды.
