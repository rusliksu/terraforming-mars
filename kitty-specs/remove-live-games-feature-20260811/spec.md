# Спецификация: удалить Current games

## Цель

Удалить маленькую стартовую фичу `Current games`, потому что её запрос
провоцирует синхронный неограниченный SQLite scan и способен блокировать весь
Node.js server process на большой production-базе.

## Требования

- Удалить блок `Current games` со стартового экрана и его клиентский fetch.
- Удалить `/api/live-games`, модель ответа и регистрацию route.
- Удалить database/game-loader helpers, существующие только ради этой фичи.
- Удалить тесты удалённого поведения и обновить соседние regression tests.
- Не менять gameplay, сохранения партий, схему или содержимое БД.
- Не добавлять кеш, индекс, worker или новый control plane вместо фичи.

## Acceptance Criteria

- В client/server source и tests нет `API_LIVE_GAMES`, `LiveGameModel` и
  `getLastSaveTimesMs`.
- Стартовый экран не делает background-запрос активных игр.
- Targeted client/server/database tests, lint и build проходят.
- В PR нет DB migration и deployment changes.

## Out of Scope

- Оптимизация хранения 21 GB SQLite database.
- Перевод `better-sqlite3` на worker threads или PostgreSQL.
- Staging/prod deploy, restart или DB cleanup.
- Изменение официального upstream в этом PR.

## Governance Note

Spec Kitty CLI 3.2.x резолвит внешний task-worktree в dirty primary checkout.
Mission оформлена task-local artifacts и связана с Bead `tm-ai-93r`.
