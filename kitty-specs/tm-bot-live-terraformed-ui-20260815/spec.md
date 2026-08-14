# Спецификация: публичный bot takeover и статус терраформирования

## Цель

Публично и однозначно показать, что игрок покинул ручное управление, его место
продолжает бот, а Марс полностью терраформирован. Изменение не раскрывает
приватные руки, драфты или capability-токены.

## Сценарии

### S1 — подтвержденный takeover

Игрок подтверждает surrender/start-bot. После успешного сохранения состояния и
запуска бота общий игровой лог получает красное событие: игрок сделал лив, и
место продолжает бот. Событие не появляется при отклоненной или неуспешной
операции.

### S2 — видимый bot marker

В game/player/spectator views каждый игрок с исходным bot seat или с
`surrenderedPlayerIds` получает публичное `isBotControlled`. UI показывает рядом
с именем текстовый маркер `BOT` с доступным title/aria-label.

### S3 — завершенный Марс

Если `game.isTerraformed` истинен, `MARS ✓` остается в top bar, но располагается
перед длинной панелью игрока — рядом с основной игровой областью и без ухода
вправо за пределы viewport. Existing accessible status и одноразовая анимация
сохраняются.

### S4 — защищенное действие takeover

`Surrender and start bot` остается двухшаговым действием с отдельным
подтверждением. В основном списке действий оно визуально отделено по вертикали
от обычных вариантов с помощью стабильной annotation `surrender-action`.

## Требования

- **FR-001**: выделить takeover-log отдельным persisted `LogMessageType` без
  переиспользования значения retired type `2`.
- **FR-002**: писать takeover log только после успешного bot start и persistence.
- **FR-003**: не добавлять приватные данные в log или public player models.
- **FR-004**: вычислять `isBotControlled` из persisted bot/surrender state на
  сервере для simple и full public models.
- **FR-005**: отображать понятный `BOT` marker во всех основных player rows.
- **FR-006**: перенести TerraformedBanner в начало top bar и сохранить status,
  title, aria-label и animation behavior.
- **FR-007**: сохранить confirmation flow и визуально отделить takeover action,
  не меняя порядок или семантику остальных player inputs.

## Ограничения и gates

- Base: `origin/main` at `16211206a1d36a050811f0674decda8e9867e8d5`.
- Code changes only in the task-owned worktree; primary/other worktrees remain
  untouched.
- No database mutation, live/prod deploy, restart, or change to the monitored
  game.
- Проверки: focused server/client tests, full server suite, TypeScript/build
  checks и diff review. Browser smoke остается обязательным перед staging/live
  delivery, которая в эту mission не входит.
