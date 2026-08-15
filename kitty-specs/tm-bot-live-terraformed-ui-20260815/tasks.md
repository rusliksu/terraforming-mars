# Tasks: публичный bot takeover и terraformed status

## WP01 — серверный контракт и UI

- [x] T001 Добавить `BOT_TAKEOVER` log type/builder и публичное сообщение после
      подтвержденного запуска бота.
- [x] T002 Добавить `isBotControlled` в full/simple public models.
- [x] T003 Показать `BOT` marker в player overview, game lobby и end-game rows.
- [x] T004 Перекрасить takeover log в красный и сохранить обычные logs без
      изменения.
- [x] T005 Переместить `MARS ✓` в начало top bar и покрыть порядок компонентом.
- [x] T006 Добавить focused regressions и выполнить проверки.
- [x] T007 Визуально отделить annotated surrender/start-bot action, сохранив
      существующее подтверждение.

### Acceptance

WP считается готовым, когда S1–S4 из `spec.md` проверены тестами, diff не
затрагивает live/prod, а task-worktree остается единственным измененным
checkout.

### Evidence

- focused server: 25 passing;
- full server: 7394 passing;
- focused bot-marker/log/banner client: 28 passing;
- focused OrOptions: 11 passing;
- `build:tests`, `build:server`, production build, `build:client`, client/server/
  CSS/i18n lint: passed;
- `git diff --check`: no whitespace errors (only Windows line-ending warnings);
- no push, PR, deploy, restart, database or live-game mutation performed.
