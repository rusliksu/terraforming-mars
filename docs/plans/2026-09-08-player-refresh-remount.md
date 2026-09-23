# Оптимизация обновления экрана игрока

Статус: отменена по запросу владельца 12 сентября 2026 года вместе с зависимыми
изменениями setup polling и тегов. Экран снова пересоздаётся после принятого view.
Ниже сохранён исторический план; его no-remount контракт больше не действует.

## Проблема

После каждого успешного получения `/api/player` корневой `App` увеличивает
`playerkey`, который используется как `key` всего `PlayerHome`. Ответ на
игровое действие дополнительно переключает `screen` через `empty`. Поэтому Vue
полностью размонтирует и создаёт заново экран игрока, включая доску, обзоры и
карточки.

На позднем публичном состоянии с 177 карточными компонентами 20 принудительных
обновлений занимали медианно 282 мс клиентского времени. После удаления 127
компонентов медиана снизилась до 182 мс. Отдельный Game log объясняет заметно
меньшую часть задержки.

## Цели

- Сохранять экземпляр `PlayerHome` при очередном полном `playerView`.
- Обновлять отображаемые данные через реактивные props и keyed-списки Vue.
- По-прежнему сбрасывать `WaitingFor` и вложенную форму ввода после каждого
  принятого server view, чтобы не переносить локальный выбор между ходами.
- Сохранить существующий refresh журнала по `gameAge`, polling, undo, suspend и
  переход на экран окончания игры.

## Не входит в работу

- Spectator refresh, API/serialization и игровая логика.
- Виртуализация карточек или журнала.
- Официальный upstream PR, production deploy или изменение БД.

## Текущие владельцы контракта

- `src/client/components/App.vue`: получает view model и владеет revision.
- `src/client/components/PlayerHome.vue`: отображает реактивный `playerView`.
- `src/client/components/WaitingFor.vue`: отправляет input и применяет ответ.
- `src/client/components/logpanel/LogPanel.vue`: обновляет журнал по `gameAge`.

## Целевой контракт

`App` передаёт `viewRevision` принятого player view в стабильный `PlayerHome`
как обычный prop. `PlayerHome` использует revision только как `key` для
`WaitingFor`. Обычный `/api/player` и ответ на действие применяют модель одним
корневым методом, не переключая `screen` и не меняя key всего `PlayerHome`.

## План и gates

- [x] Зафиксировать поздний baseline профиля.
- [x] Добавить красные тесты: `PlayerHome` не remount, новый prop видим;
  `WaitingFor` remount при новой revision; action response использует корневой
  контракт без screen toggle.
- [x] Реализовать узкий контракт в `App.vue`, `PlayerHome.vue`, `WaitingFor.vue`.
- [x] Прогнать целевые Vitest, `build:tests`, client/server lint и production
  build.
- [x] Повторить тот же 20-кратный browser profile и сравнить с baseline.
- [ ] Развернуть точный проверенный commit только на preview и выполнить smoke.

## Rollout и rollback

Preview manifest должен указывать точный clean commit и новый artifact hash.
Production и staging не переключаются. При функциональном regression preview
возвращается на предыдущий сохранённый release штатным release helper; ручные
symlink/DB изменения запрещены.

## Риски

- Локальное состояние формы может пережить новый prompt: поэтому keyed boundary
  остаётся на `WaitingFor`.
- Компоненты могут полагаться на remount вместо реактивных props: это проверяют
  component tests и поздний browser smoke.
- Оптимизация клиента не устраняет отдельно измеренную задержку Heroku API.

## Результат локальной приёмки

- Красный baseline поймал все три защищаемые поломки до production patch.
- Целевые component tests: 24/24; полный client suite: 610/610.
- `build:tests`, Vue typecheck, ESLint, CSS lint и production build прошли.
- На том же публичном состоянии с 177 карточками 20 обновлений дали медиану
  64 мс и p95 65 мс против baseline 282/324 мс.
- `PlayerHome` не удалялся, все 177 исходных карточных DOM-узлов сохранились,
  main-thread long tasks в измеряемых обновлениях отсутствовали.
