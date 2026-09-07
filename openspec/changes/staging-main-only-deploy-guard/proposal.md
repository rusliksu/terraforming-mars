## Почему

Текущий staging может быть перезаписан clean feature-веткой или local-only checkout: документация разрешает произвольный `SourceRoot`, а deploy guard допускает bypass-флаги. Это разрушает staging как единую проверочную линию и не позволяет однозначно понять, какая версия должна быть следующей.

## Что изменится

- Staging будет принимать только чистый checkout, у которого `HEAD` точно совпадает с локально известным `origin/main`.
- `-AllowDirtySource` и `-AllowPrimaryWorkingTree` будут отклоняться для staging даже при явной передаче.
- Команды и примеры для staging больше не будут предлагать feature-ветки, local-only checkout или произвольный `SourceRoot`.
- Preview сохранит возможность запуска из отдельного чистого upstream/fork checkout, а prod останется promote-only.
- Появится узкая проверка guard, отдельно подтверждающая разрешённый и запрещённые источники.

## Возможности

### Новые возможности

- `staging-main-only-deploy-guard`: нормативное правило и исполняемый guard, ограничивающие staging exact `origin/main`.

### Изменённые возможности

- Нет.

## Влияние

Изменятся `scripts/deploy_tm_server.ps1`, `scripts/deploy_tm_staging.ps1`, `scripts/lib/TmReleaseGuards.ps1`, `scripts/README-staging.md`, локальные правила `C:\Users\Ruslan\tm\AGENTS.md` и новый PowerShell-тест guard. Product code, API, базы, зависимости, VPS и deploy state не изменяются.

Задача отслеживается Beads-идентификатором `tm-ai-rar`.
