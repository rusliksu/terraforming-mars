# План: staging только из origin/main

**Ветка**: `codex/tm-staging-main-only-v2`
**Дата**: 2026-08-06
**Спецификация**: `kitty-specs/staging-main-only-deploy-guard-01KZC5FN/spec.md`
**Beads:** `tm-ai-rar`

## Краткое решение

Добавить общий PowerShell guard для staging source и вызвать его до build/deploy. Guard принимает только чистый checkout с равными полными SHA `HEAD` и `origin/main`; bypass-флаги для staging отклоняются. Правила и тесты синхронизируются с этим контрактом.

## Технический контекст

- **Язык/версия**: PowerShell 7 (`pwsh`), существующие `.ps1` release scripts.
- **Система**: Windows 11 локальный orchestrator; удалённые действия в этой задаче запрещены.
- **Источники**: `scripts/lib/TmReleaseGuards.ps1`, `scripts/deploy_tm_server.ps1`, `scripts/deploy_tm_staging.ps1`.
- **Документация**: `scripts/README-staging.md`, `C:\Users\Ruslan\tm\AGENTS.md`.
- **Проверка**: локальный `scripts/test_tm_staging_source_guard.ps1`, существующие remote-script tests, OpenSpec language/strict validation.
- **Зависимости**: новые внешние зависимости не добавляются.

## Границы поведения

1. Для staging проверить clean status, `HEAD`, `origin/main` и равенство SHA.
2. Для staging отклонить `-AllowDirtySource` и `-AllowPrimaryWorkingTree` до build.
3. Для preview и prod сохранить существующие ветви поведения.
4. Не выполнять fetch автоматически; отсутствие свежей локальной ссылки является явным отказом.
5. Не трогать product code, primary checkout, VPS, DB, credentials и deploy runtime.

## Карта work packages

### WP01 — Guard и тест

Добавить helper, подключить его в staging deploy path и покрыть положительный/отрицательные сценарии локальным PowerShell-тестом.

### WP02 — Правила и приёмка

Обновить `AGENTS.md` и README, провести governance/script/diff проверки и зафиксировать allowlist-результат. Зависит от WP01.

## Delivery gates

- До реализации baseline подтверждён явным `даю разрешение/@best-step`.
- Перед commit: OpenSpec language/strict validation, guard test, existing remote script tests, `git diff --check` и product allowlist.
- Push, PR, staging deploy и prod/live остаются отдельными gates; эта задача их не выполняет.
