# Пакеты работ

## WP01: Зафиксировать release-путь в карте кода

**Bead:** `tm-ai-lhz`

- [x] Добавить текущую цепочку rollout → staging deploy → remote deploy и её тесты в `codemap.json` и `codemap.html`.
- [x] Обновить `codemap.lock` и проверить fingerprint до изменения release-модулей.

## WP02: Изолировать CI-токен до любого рестарта

**Зависит от:** WP01

- [x] Перенести `SENTRY_AUTH_TOKEN` в `%h/.config/tm-sentry-release.env` без вывода значения.
- [x] Удалить переменную из `%h/.config/tm-server.env`, сохранить `SENTRY_DSN`/`SENTRY_ENVIRONMENT` и права `600`.
- [x] Зафиксировать metadata-only evidence и preflight-result; не деплоить и не перезапускать сервис.

## WP03: Реализовать безопасную публикацию release/deploy

**Зависит от:** WP02

- [x] Привязать runtime `event.release` к полному SHA из `assets/release.json` и добавить focused test.
- [x] Добавить тестируемый модуль и entrypoint без передачи токена на локальную машину.
- [x] Добавить preflight до deploy/restart и безусловную проверку SHA/environment/cleanliness из post-snapshot.
- [x] Поддержать release `201/208`, проверку/обновление существующего release, `flock`, pagination и дедупликацию staging deploy.
- [x] Подключить вызов после smoke и post-deploy snapshot; при `-SkipSmoke` не публиковать deploy; сохранить чистый dry-run.
- [x] Добавить focused offline regression tests.

## WP04: Документация и полная проверка

**Зависит от:** WP03

- [x] Обновить staging runbook и карту итогового внешнего потока.
- [x] Запустить parser, focused tests, dry-run и diff checks.
- [x] Провести независимое review и устранить blockers.

## Оставшиеся gates

- [ ] Commit/PR/merge после review.
- [ ] Первый staging deploy из exact merged `origin/main` допускается только после WP02 и read-only проверяется в Sentry.
- [ ] Production остаётся вне scope.
