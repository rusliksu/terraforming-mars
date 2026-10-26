## Контекст

`TopBar.vue` сейчас выводит `TerraformedBanner` отдельным sibling после `.top-bar`. Компонент получает `playerId`, использует `consumeFirstBannerShow(...)` для одноразовой анимации и создаёт полноширинный блок с `padding: 12px`, `font-size: 24px` и `margin-bottom: 15px`. В результате завершённая игра постоянно теряет отдельную горизонтальную полосу.

## Цели / Вне целей

**Цели:**

- сохранить хорошо заметный статус завершённого терраформирования;
- не создавать отдельную строку и не перекрывать игровое содержимое;
- сохранить локализованное описание и одноразовую анимацию;
- обеспечить компактный вид на широком и узком viewport.

**Вне целей:**

- изменение условия `playerView.game.isTerraformed`;
- изменение end-game flow, scoring или результатов партии;
- добавление dismiss/storage-настроек;
- staging или live deploy.

## Решения

1. Переместить `TerraformedBanner` внутрь `.top-bar` рядом с `PlayerInfo`. Это использует существующую sticky-строку и полностью убирает дополнительную вертикальную полосу.
2. Сохранить имя компонента и prop `playerId`, но представить его как flex-chip с видимой короткой подписью `MARS ✓`. Полный `$t('Mars is Terraformed!')` использовать в `title` и `aria-label`, а контейнер пометить `role="status"`.
3. Ограничить chip высотой существующей top bar и запретить растяжение: `flex: 0 0 auto`, компактные horizontal padding, без `width: 100%` и `margin-bottom`.
4. Заменить `slide-down` на короткую one-time scale/glow-анимацию. Источник решения `consumeFirstBannerShow(playerId)` и storage key не меняются.
5. Focused component test проверяет видимый compact label, локализуемое доступное описание и animated class; `TopBar` test фиксирует размещение компонента внутри `.top-bar` только при `isTerraformed=true`.

## Риски / Компромиссы

- [Дополнительный chip увеличивает ширину top bar] → удерживать ширину около 80 px и разрешить существующему horizontal overflow вместо переноса на новую строку.
- [Короткая подпись менее подробна] → полный локализованный текст остаётся tooltip и доступным именем.
- [Animation может отвлекать] → проигрывать её только один раз на игрока через существующий storage contract и не перемещать layout.
- [CSS затронет component test, но не гарантирует реальный layout] → добавить focused DOM test и browser screenshot smoke на end-state fixture.

## План применения

1. Обновить component markup, TopBar placement и LESS.
2. Расширить focused tests для компонента и TopBar.
3. Запустить targeted tests, lint/typecheck и client build.
4. Выполнить browser smoke на end-state fixture в desktop и узком viewport, проверить отсутствие console errors и отдельной строки.
5. Откат — вернуть commit; миграции данных нет, существующий localStorage остаётся совместимым.

## Открытые вопросы

Нет.
