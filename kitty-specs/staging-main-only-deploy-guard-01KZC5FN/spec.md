# Спецификация: staging только из origin/main

## Цель

Закрепить staging как единую проверочную среду кастомного Terraforming Mars сервера. Любой staging deploy должен исходить из чистого checkout, чей полный `HEAD` совпадает с локально разрешаемым `origin/main`.

## Функциональные требования

| ID | Требование |
| --- | --- |
| FR-001 | Для `Environment=staging` guard проверяет пустой `git status --short` и точное равенство полного `HEAD` полному `origin/main`. |
| FR-002 | Staging guard отклоняет отсутствие или невалидность `origin/main`, несовпадение SHA, `-AllowDirtySource`, `-AllowPrimaryWorkingTree` и dirty checkout до build/deploy. |
| FR-003 | Preview сохраняет clean-source flexible поведение, а prod остаётся promote-only через существующий release gate. |
| FR-004 | `C:\Users\Ruslan\tm\AGENTS.md` и `scripts/README-staging.md` описывают тот же exact-main invariant и не предлагают запрещённые staging источники. |
| FR-005 | Локальный PowerShell-тест проверяет exact-main success и отрицательные варианты без сети, VPS, DB или credentials. |

## Требования

### Требование 1: строгий источник staging

Для `Environment=staging` guard обязан проверить пустой `git status --short`, полный SHA `HEAD`, полный SHA `origin/main` и их точное равенство. При отсутствии `origin/main` или несовпадении guard останавливает запуск до build и удалённого действия.

### Требование 2: запрет обходов

Для staging передача `-AllowDirtySource` или `-AllowPrimaryWorkingTree` всегда является ошибкой. Dirty checkout также отклоняется без возможности обхода. Preview и prod не получают нового staging-правила: preview остаётся clean-source flexible, prod остаётся promote-only.

### Требование 3: единые правила и доказательство

`C:\Users\Ruslan\tm\AGENTS.md` и `scripts/README-staging.md` обязаны описывать exact-main invariant, запрет feature/local-only/dirty источников и правило остановки при неоднозначном concurrent drift. Локальный PowerShell-тест обязан покрыть exact-main success, SHA mismatch, отсутствующий SHA, dirty status и оба bypass-флага без сетевого/VPS действия.

## Критерии приёмки

- `Assert-TmStagingSource` существует и используется deploy path staging.
- Feature/local-only/dirty/bypass варианты возвращают понятную ошибку до сборки.
- Exact-main clean вариант проходит source guard.
- Preview/prod existing boundaries не изменены.
- Русские Spec Kitty/OpenSpec/Beads артефакты валидны; product code не затронут.
