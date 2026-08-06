## Контекст

Кастомный сервер разворачивается скриптами из `scripts/`. Для staging скрипт принимает явный `SourceRoot`, проверяет чистоту только без `-AllowDirtySource` и отдельно позволяет `-AllowPrimaryWorkingTree`. В результате clean feature-ветка или local-only commit может попасть на общий staging, хотя `origin/main` уже содержит другой release train.

Ограничения: не менять product code, не выполнять VPS deploy, не читать credentials, не трогать dirty primary checkout и не ломать preview/prod правила.

## Цели / Вне целей

**Цели:**

- Сделать invariant staging исполняемым: `git status --short` пуст, `git rev-parse HEAD` равен `git rev-parse origin/main`.
- Fail closed при отсутствии `origin/main`, несовпадении SHA или попытке bypass-флагов.
- Синхронизировать локальные правила и README с фактическим guard.
- Дать узкий автономный тест guard без сетевого или VPS действия.

**Вне целей:**

- Автоматический `git fetch`, merge, rebase или изменение веток.
- Изменение preview, prod promotion, runtime state, release manifests или deployment locks.
- Запрет detached HEAD, если его SHA точно совпадает с `origin/main`.

## Решения

1. Добавить в `scripts/lib/TmReleaseGuards.ps1` функцию `Assert-TmStagingSource`, принимающую `SourceRoot`, `HeadSha`, `OriginMainSha`, `GitStatus`, `AllowDirtySource` и `AllowPrimaryWorkingTree`. Она отклоняет bypass-флаги, dirty status, отсутствующий/невалидный `origin/main` и несовпадение SHA.
2. В `scripts/deploy_tm_server.ps1` вызывать guard только для `$Environment -eq "staging"` после разрешения git checkout и получения `HEAD`/`origin/main`; preview остаётся clean-source flexible, prod сохраняет существующий promote-only guard.
3. В `scripts/deploy_tm_staging.ps1` сохранить совместимые параметры для диагностики, но передавать их в общий guard; staging bypass будет отклонён до сборки и удалённого действия.
4. В README и `C:\Users\Ruslan\tm\AGENTS.md` описать exact-main invariant, требование заранее обновлённого `origin/main`, запрет произвольного feature `SourceRoot` и правило не откатывать чужой concurrent deploy автоматически.
5. Новый `scripts/test_tm_staging_source_guard.ps1` проверит success exact-main и failure для dirty, mismatch, отсутствующего SHA и обоих bypass-флагов, используя только локальную функцию.

## Риски / Компромиссы

- [Старый release checkout не обновил `origin/main`] → guard остановит deploy с диагностикой; сначала выполнить штатный fetch/refresh в отдельном чистом checkout.
- [Операционный emergency flow рассчитывал на dirty/primary override] → для staging он станет недействительным; emergency должен сначала создать commit в `origin/main` или использовать отдельный явно согласованный non-staging путь.
- [Detached HEAD exact-main может быть менее наглядным] → разрешается по SHA, а manifest по-прежнему фиксирует SHA и sourceRoot.

## План применения

1. В task-owned worktree создать русские OpenSpec/Beads governance artifacts и изменить только перечисленные docs/scripts.
2. Запустить guard-тест, существующие remote-script tests и статическую проверку diff/allowlist.
3. Запустить `Test-OpenSpecRussian.ps1` и `npx --yes @fission-ai/openspec@1.8.0 validate staging-main-only-deploy-guard --strict --no-interactive`.
4. Закоммитить task-owned ветку; не push, не deploy и не менять primary.
5. Откат — revert task commit; до изменения проверить, что staging/prod runtime не затронуты.

## Открытые вопросы

Нет.
