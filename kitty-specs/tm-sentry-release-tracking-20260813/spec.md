# Спецификация: учёт staging-релизов в Sentry

## Цель

После подтверждённого развёртывания `terraforming-mars-staging` Sentry должен получить release с точным Git SHA сборки и ровно одну запись deploy для окружения `staging`. CI-токен должен использоваться только release-скриптом на VPS и не попадать в процесс игрового сервера, логи, архив релиза или локальный компьютер.

## Требования

- **FR-001.** `event.release`, Sentry release version и `release.json.gitSha` равны одному полному 40-символьному Git SHA. Runtime получает его из проверенного release manifest, а не из сокращённого `settings.json.head`.
- **FR-002.** Release относится только к проекту `terraforming-mars-staging`, а commit reference — к репозиторию `rusliksu/terraforming-mars`.
- **FR-003.** Deploy с `environment=staging` публикуется только после успешного deploy, выполненного smoke и post-deploy snapshot. Явный `-SkipSmoke` сохраняет существующий emergency-path, но Sentry deploy в таком запуске не публикуется.
- **FR-004.** Повторный или конкурентный запуск через штатный VPS release-путь для того же SHA не создаёт второй deploy в том же окружении: lookup и create сериализованы локальным `flock`, а lookup обходит все страницы API.
- **FR-005.** HTTP `201` и `208` при создании release допускаются, но после `208` существующий release обязательно проверяется на проект `terraforming-mars-staging` и идемпотентно дополняется commit ref `rusliksu/terraforming-mars@<SHA>`; несовместимый release блокирует публикацию deploy.
- **FR-006.** Даже без `ExpectedGitSha` полный SHA безусловно берётся из post-deploy snapshot; environment и `sourceTreeClean` проверяются всегда, а переданный `ExpectedGitSha` служит дополнительным сравнением.
- **FR-007.** Dry-run не обращается к Sentry и не требует токен.
- **SEC-001.** `SENTRY_AUTH_TOKEN` переносится из `%h/.config/tm-server.env` в `%h/.config/tm-sentry-release.env` до любого рестарта; оба файла имеют права `600`.
- **SEC-002.** Токен читается только внутри удалённого shell-процесса на `hostkey-codex`, не передаётся в аргументах команд, не печатается и не включается в генерируемый remote script.
- **SEC-003.** Приложение продолжает получать только `SENTRY_DSN` и `SENTRY_ENVIRONMENT`; release-токен не наследуется `tm-server-staging.service`.
- **SEC-004.** До remote deploy выполняется fail-closed preflight: deploy-only файл существует с правами `600`, а runtime env не содержит `SENTRY_AUTH_TOKEN`. Ошибка preflight происходит до переключения release symlink и рестарта.
- **C-001.** Runtime capture и privacy-фильтр `SentryReporter.ts` не меняются.
- **C-002.** Production deploy/promotion, рестарт, push и merge остаются отдельными gates.

## Сценарии приёмки

1. Новый чистый SHA развёрнут на staging, smoke и snapshot успешны: runtime events и Sentry release используют полный SHA, существует один staging deploy.
2. Тот же SHA обрабатывается повторно: release переиспользуется, второй staging deploy не создаётся.
3. Токен отсутствует или Sentry API отвечает ошибкой: секрет не выводится, процедура сообщает точный этап сбоя, staging не откатывается автоматически.
4. Запущен `-SkipSmoke`: staging deploy сохраняет существующее поведение, но Sentry deploy не публикуется и это явно указано в выводе.
5. Запущен `-DryRun`: удалённых HTTP-запросов нет и секретный файл не читается.
6. После безопасного переноса токена `tm-server.env` больше не содержит `SENTRY_AUTH_TOKEN`, а deploy-only файл существует с правами `600`; любой будущий deploy блокируется до исправления этой границы.

## Вне scope

- автоматический production deploy;
- source maps, performance tracing и увеличение собираемых пользовательских данных;
- изменение DSN или privacy allowlist;
- GitHub Actions deployment.
