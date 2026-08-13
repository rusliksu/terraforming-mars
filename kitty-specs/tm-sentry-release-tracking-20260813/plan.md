# План реализации

## Текущий путь вызовов

`rollout_tm_server.ps1` вызывает `deploy_tm_staging.ps1`, который запускает `deploy_tm_server.ps1`, затем smoke и post-deploy snapshot. Новый Sentry reporter подключается в `deploy_tm_staging.ps1` только после этих проверок.

## Решение

1. Сначала расширить карту кода текущим release-потоком, потому что существующая карта описывает runtime Sentry capture, но не deployment scripts.
2. Перенести токен в deploy-only VPS-файл до любых рестартов и добавить remote preflight, вызываемый перед `deploy_tm_server.ps1`: mode `600`, token file present, token absent from runtime env.
3. Обеспечить единый release ID: `SentryReporter.ts` берёт полный Git SHA из `assets/release.json`; сокращённый `settings.json.head` больше не является release ID.
4. Добавить тестируемый PowerShell-модуль `scripts/lib/TmSentryRelease.ps1`, который валидирует allowlisted org/project/repository/SHA/environment и формирует удалённый скрипт без значения токена. Organization slug явно задан как `ruslan-gayanov`, но остаётся проверяемым параметром entrypoint.
5. Добавить entrypoint `scripts/report_tm_sentry_release.ps1`, использующий общий `TmRemoteTools.ps1` и `%h/.config/tm-sentry-release.env`.
6. На VPS один `flock` охватывает release create/check/update, постраничный deploy lookup и conditional deploy create. HTTP `208` запускает проверку project и idempotent update commit refs.
7. В `deploy_tm_staging.ps1` всегда валидировать полный SHA/environment/cleanliness из post-snapshot. Reporter вызывается после успешного smoke/post-snapshot; при `-SkipSmoke` deploy record пропускается, `-DryRun` не читает secret и не использует сеть.
8. Добавить offline regression tests с fake remote invoker/API oracle для порядка preflight, единого полного SHA, pagination, конкурентной сериализации, `201/208`, несовместимого release и отсутствия секретов в передаваемом скрипте.
9. Обновить `README-staging.md` и все три файла карты кода; затем выполнить parser/tests/dry-run/diff gates.

## Затрагиваемые области

- вызывают: `rollout_tm_server.ps1` → `deploy_tm_staging.ps1`;
- затрагивает: только release metadata в Sentry и deploy-only secret boundary на `hostkey-codex`;
- не затрагивает: игровой runtime, БД, ELO, production promotion и Sentry event payload.

## Проверки

- PowerShell parser для всех изменённых `.ps1`;
- `scripts/test_tm_sentry_release.ps1`, включая два конкурентных вызова и постраничный existing-deploy ответ;
- `tests/server/server/SentryReporter.spec.ts` для полного manifest SHA и отключения при невалидном release ID;
- `scripts/test_tm_staging_source_guard.ps1`;
- `scripts/test_tm_remote_scripts_transport.ps1`;
- staging rollout dry-run без сетевого вызова Sentry;
- проверка fingerprint карты кода и `git diff --check`;
- отдельный read-only API check после будущего staging deploy: release SHA и один deploy `staging`.

## Delivery gates

1. Согласование этого baseline.
2. Реализация и локальные проверки в task-worktree.
3. Review, commit, push и PR после зелёных проверок.
4. Merge — отдельный проверяемый шаг.
5. До первого рестарта или staging deploy обязателен завершённый deploy-only secret boundary gate.
6. Развёртывание на staging разрешено только из чистого release checkout с exact `origin/main`; production не входит в задачу.
