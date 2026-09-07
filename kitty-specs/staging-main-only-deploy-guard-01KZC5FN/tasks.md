# Задачи: staging только из origin/main

## Общие ограничения

- Разрешённый staging source: чистый checkout и точное равенство полных SHA `HEAD` и `origin/main`.
- Нельзя автоматически выполнять fetch, merge, rebase, deploy, restart, DB/secret/manual credential действие.
- Product code, preview contract и prod promote-only граница не изменяются.
- Все человекочитаемые части mission пишутся по-русски; команды, пути и идентификаторы сохраняются буквально.

## WP01 — Guard и тест

- [x] T001 Добавить `Assert-TmStagingSource` в `scripts/lib/TmReleaseGuards.ps1`.
  - Проверка: exact-main проходит; mismatch, dirty, отсутствующий SHA и bypass-флаги отклоняются в `scripts/test_tm_staging_source_guard.ps1`.
- [x] T002 Вызвать helper в `scripts/deploy_tm_server.ps1` только для `$Environment -eq "staging"` после получения git values.
  - Проверка: staging dry-run feature source останавливается до build; preview/prod source branches не меняются.

## WP02 — Правила и приёмка

- [x] T003 Удалить из `scripts/README-staging.md` запрещённые staging примеры и описать exact-main invariant.
  - Проверка: grep по README и ручная сверка команд.
- [x] T004 Добавить invariant в `C:\Users\Ruslan\tm\AGENTS.md`.
  - Проверка: секция `Deployment Environment Rules` содержит clean exact `origin/main` и concurrent-drift stop.
- [x] T005 Повторить governance, script и allowlist проверки; отметить результаты в Beads.
  - Проверка: `Test-OpenSpecRussian.ps1`, OpenSpec strict, два существующих remote-script tests и `git diff --check` зелёные.

## Результат

- Guard: `tm staging source guard: OK (6 cases)`.
- Release guards, remote tools и transport: `OK`.
- OpenSpec language/strict: `OK`.
- Product code, VPS и deploy state не затронуты.
