# Спецификация: сдача как обычное действие

## Цель

Заменить отдельную кнопку surrender стандартным пунктом в списке действий
активного игрока по образцу community-сервера.

## Требования

- `Surrender this game` появляется только в multiplayer с поколения 5.
- Пункт доступен только через обычный action prompt активного игрока.
- Выбор открывает подтверждение с вариантами surrender и продолжения игры.
- Отмена не расходует действие и не меняет game state.
- Подтверждение помечает игрока surrendered и завершает его участие через
  существующий pass/game-flow.
- Legacy surrender API оставляется для совместимости, но не позволяет обойти
  generation 5 и active-turn ограничения обычного action flow.
- Успешная сдача через `PlayerInput` сохраняет отдельный audit event
  `surrender_accepted`.
- Существующие reliability, last-place, Elo и serialization semantics не
  меняются.
- Отдельная кнопка и клиентский surrender fetch удаляются.

## Acceptance Criteria

- До поколения 5, в solo, для bot player и при одном оставшемся игроке опции нет.
- В поколении 5+ активный human player видит surrender в обычном `OrOptions`.
- Cancel возвращает тот же action prompt без потери действия.
- Confirm добавляет player id в `surrenderedPlayerIds` и пасует игрока.
- Legacy API отклоняет сдачу до поколения 5 и от неактивного игрока.
- Targeted Player/PlayerHome/route tests, полный server suite, lint и build
  проходят.

## Out of Scope

- Удаление legacy surrender API.
- Изменение reliability, Elo или GameEnd.
- LogPanel.
- Prod deploy и официальный upstream PR.

## Governance Note

Spec Kitty CLI 3.2.5 резолвит repo root в primary checkout вместо task
worktree. Mission оформлена task-local artifacts и связана с Bead `tm-ai-c8c`.
