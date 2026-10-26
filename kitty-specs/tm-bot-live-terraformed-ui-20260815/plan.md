# План: bot takeover и terraformed status

## Архитектурное решение

1. Расширить persisted log enum и `LogMessageBuilder` новым типом takeover.
   `SurrenderService` добавляет публичный log после успешного `manager.start`.
2. Расширить public player/simple-game contracts полем `isBotControlled`,
   вычисляемым из `botPlayerIds ∪ surrenderedPlayerIds`. Это не зависит от
   runtime process и переживает restart.
3. Отобразить marker в `PlayerInfo` и game lobby rows. Красный класс применить
   только к takeover event, не меняя обычные chat messages.
4. Изменить порядок компонентов в `TopBar` и отступ banner, не трогая
   `isTerraformed` source или storage одноразовой анимации.
5. Использовать существующую `surrender-action` annotation в `OrOptions`, чтобы
   добавить вертикальный отступ и separator только опасному действию; server
   confirmation flow оставить без изменений.

## Ожидаемые файлы

- `src/common/logs/LogMessageType.ts`
- `src/server/logs/LogMessageBuilder.ts`
- `src/server/surrender/SurrenderService.ts`
- `src/common/models/PlayerModel.ts`
- `src/common/models/SimpleGameModel.ts`
- `src/server/models/ServerModel.ts`
- `src/client/components/logpanel/LogMessageComponent.vue`
- `src/client/components/overview/PlayerInfo.vue`
- `src/client/components/GameHome.vue`
- `src/client/components/TopBar.vue`
- `src/client/components/OrOptions.vue`
- `src/styles/log.less`
- `src/styles/player_home.less`
- `src/styles/waiting_for.less`
- focused tests under `tests/`

## Проверки

- takeover service/route asserts public log type, text data and bot state;
- ServerModel asserts initial and surrendered bot markers;
- PlayerInfo/GameHome asserts visible marker;
- LogMessageComponent asserts red takeover class;
- TopBar asserts banner remains in the near-left position;
- OrOptions asserts takeover action receives the separated annotated wrapper;
- run focused test command, then relevant typecheck/build and inspect diff.
