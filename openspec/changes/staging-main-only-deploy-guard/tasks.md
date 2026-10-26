## Общие ограничения

- Staging проверяется только для `Environment = staging`.
- Разрешённый источник: пустой `git status --short` и равенство полного `HEAD` и `origin/main`.
- Нельзя автоматически выполнять `git fetch`, merge, rebase, deploy, restart, DB/secret/manual credential действие.
- Product code, API, зависимости, runtime state и prod не изменяются.
- Preview сохраняет clean-source flexible поведение, prod остаётся promote-only.

## 1. Исполняемый guard

- [x] 1.1 Добавить `Assert-TmStagingSource` в `scripts/lib/TmReleaseGuards.ps1` с проверками SHA, clean status и запретом bypass-флагов
  - Интерфейсы: `SourceRoot`, `HeadSha`, `OriginMainSha`, `GitStatus`, `AllowDirtySource`, `AllowPrimaryWorkingTree` → диагностическая ошибка или успешное возвращение
  - Проверка: `pwsh -File scripts/test_tm_staging_source_guard.ps1`
- [x] 1.2 Подключить guard в `scripts/deploy_tm_server.ps1` после разрешения git checkout и получения `HEAD`/`origin/main`, не меняя preview/prod ветви
  - Интерфейсы: git `rev-parse HEAD`, git `rev-parse origin/main`, `git status --short` → staging source decision
  - Проверка: `pwsh -File scripts/test_tm_staging_source_guard.ps1` и `pwsh -File scripts/deploy_tm_staging.ps1 -SourceRoot <feature-checkout> -DryRun` с ожидаемым отказом до build
- [x] 1.3 Сохранить явную передачу параметров `scripts/deploy_tm_staging.ps1` и обеспечить ранний понятный отказ для staging bypass-флагов
  - Интерфейсы: `-AllowDirtySource`, `-AllowPrimaryWorkingTree` → общий staging guard
  - Проверка: `pwsh -File scripts/deploy_tm_staging.ps1 -AllowDirtySource -DryRun` и `pwsh -File scripts/deploy_tm_staging.ps1 -AllowPrimaryWorkingTree -DryRun` с ожидаемым отказом

## 2. Правила и доказательства

- [x] 2.1 Обновить `scripts/README-staging.md`: exact `origin/main`, запрет произвольного feature `SourceRoot` и удаление staging emergency/bypass примеров
  - Проверка: `rg -n "origin/main|AllowDirtySource|AllowPrimaryWorkingTree|some-other-clean-checkout" scripts/README-staging.md`
- [x] 2.2 Обновить `C:\Users\Ruslan\tm\AGENTS.md` с тем же invariant и правилом concurrent drift без автоматического rollback
  - Проверка: чтение секции `Deployment Environment Rules` и `Test-Path C:\Users\Ruslan\tm\AGENTS.md`
- [x] 2.3 Запустить обязательные governance, script и product-safety проверки, затем зафиксировать только allowlist-файлы
  - Проверка: `C:\Users\Ruslan\.codex\maintenance\Test-OpenSpecRussian.ps1 -ChangePath openspec/changes/staging-main-only-deploy-guard`; `npx --yes @fission-ai/openspec@1.8.0 validate staging-main-only-deploy-guard --strict --no-interactive`; `pwsh -File scripts/test_tm_remote_tools.ps1`; `pwsh -File scripts/test_tm_remote_scripts_transport.ps1`; `git diff --check`; `git diff origin/main...HEAD --name-only`

## Результат

- Guard-тест: `tm staging source guard: OK (6 cases)`.
- Регрессионные проверки release guard: `tm release guards regressions: OK`.
- Удалённые инструменты и transport: оба теста `OK`.
- OpenSpec language и strict validation: `OK`.
- Product code не изменён; deploy/VPS не выполнялись.
