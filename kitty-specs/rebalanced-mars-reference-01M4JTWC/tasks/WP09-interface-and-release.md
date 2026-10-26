---
work_package_id: WP09
title: Интерфейс, сохранения и выпуск
dependencies:
- WP08
requirement_refs:
- FR-001
- FR-003
- FR-004
- FR-005
- FR-006
- NFR-001
- NFR-002
- NFR-003
- C-001
- C-002
- C-003
planning_base_branch: codex/rebalanced-mars-reference
merge_target_branch: codex/rebalanced-mars-reference
branch_strategy: Planning artifacts for this mission were generated on codex/rebalanced-mars-reference. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into codex/rebalanced-mars-reference unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-rebalanced-mars-reference-01M4JTWC
base_commit: 9bf50c68a0fd51fc0105256e2c3eae43625d0b1c
created_at: '2026-10-10T17:14:53.841684+00:00'
subtasks:
- T035
- T036
- T037
- T038
- T039
history: []
agent_profile: generic-agent
authoritative_surface: src/client/components/create/CreateGameForm.vue
create_intent:
- tests/client/components/create/Rebalanced.spec.ts
- tests/fanmade-compat/RebalancedLifecycle.spec.ts
execution_mode: code_change
lane: planned
owned_files:
- docs/variants/rebalanced.md
- src/client/components/create/CreateGameForm.vue
- src/client/components/create/JSONProcessor.ts
- src/client/components/GameSetupDetail.vue
- src/client/components/help/HelpRulebooks.vue
- src/styles/cards.less
- tests/client/components/create/Rebalanced.spec.ts
- tests/fanmade-compat/RebalancedLifecycle.spec.ts
- tests/client/components/create/JSONProcessor.spec.ts
- tests/routes/ApiGame.spec.ts
- tests/cards/venusNext/floaterCards.spec.ts
- src/server/bot/AutomationCompatibility.ts
- src/server/cards/rebalanced/AstrodrillRebalanced.ts
- tests/server/bot/AutomationCompatibility.spec.ts
- tools/fanmade-port/fanmade-catalog-source-manifest.json
- docs/codemap/codemap.json
- docs/codemap/codemap.html
- docs/codemap/codemap.lock
role: implementer
tags: []
tracker_refs: []
---

## ⚡ Do This First: Load Agent Profile

Загрузить профиль generic-agent штатным resolver перед выполнением. Профиль задаёт правила этой сессии; отдельный агент не запускается.

## Цель

Интерфейс, сохранения и выпуск. Успех проверяется требованиями FR-001, FR-003, FR-004, FR-005, FR-006, NFR-001, NFR-002, NFR-003, C-001, C-002, C-003.

## Правила выполнения

Работа выполняется основной сессией последовательно. Новые агенты и смена модели не требуются. Не менять чужие файлы и не обходить approval/live/prod gates. Сначала прочитать spec.md, plan.md и независимый reference-inventory.json. Цены и эффекты нельзя выводить из новой реализации. Старые руки и сохранения не редактировать.

Существующий исходник pe5ha является читаемым материалом; опубликованный код rebalakefak задаёт референс. Части эффектов в старых Game/Player проверить точечно. Выбирать существующий Behavior или hooks, не переносить старый движок и не вводить именные исключения вместо общего контракта.

## Ветки и каталог

Основа и результат работы — codex/rebalanced-mars-reference в собственном checkout. Публичная доставка — PR в main; прямые main-коммиты запрещены. Пользоваться каталогом, который вернул runtime для single_branch.

## Проверки

Публичная ссылка правил Rebalanced ведёт на docs/variants/rebalanced.md в этом репозитории. Документ описывает согласованный набор и семь пересечений, ссылки на закреплённые источники и поддержку Prelude 2; не оставлять ссылку на отсутствующий файл и не публиковать внутренние служебные артефакты или данные партий.

Новый модуль входит в существующий список FANMADE_MODULES для метаданных совместимости автоматической игры. Проверить оба формата настроек, ручной выбор новой карты и фактический отказ запуска бота до побочных действий. Поддержка или изменение поведения бота не входят в перенос; существующие ограничения пользовательских дополнений сохраняются.

Полная проверка рендеринга выявила в AstrodrillRebalanced два startAction в одной ce.action. Исправить только структуру metadata.renderData по существующему DSL, разделив альтернативы как в оригинальной Astrodrill. Стартовые 40 M€, четыре астероида и все игровые действия сохраняются; проверить нормальный экспорт всех 118 зарегистрированных вариантов. Этот shared path согласован для WP09 после утверждения WP03/WP08.

Импорт старых настроек проверяется в общем JSONProcessor: переданная неполная expansions нормализуется поверх DEFAULT_EXPANSIONS. Если в старом JSON нет Rebalanced ни во вложенном, ни в плоском формате, выбор сбрасывается в false, включая ранее включённый модуль в форме. Для нового флага явное вложенное значение приоритетнее плоского, затем используется false; существующая обработка других плоских настроек сохраняется. Исправление и focused regression в JSONProcessor.spec.ts согласованы как общий producer/contract для WP09 после WP01.

Полный серверный прогон выявил два устаревших ожидания в существующих тестах. ApiGame.spec.ts учитывает новый выключенный по умолчанию флаг. floaterCards.spec.ts сверяет независимый oracle метаданных и требований с объединением статического списка и явных hasFloaterIcon declarations, сохраняя проверку прежних карточек. Игровой classifier и фабрики при этой поправке не меняются; обе тестовые поверхности включены в owned_files WP09.

Проверить наблюдаемые ресурсы, производство, требования, действия и очки по изменённому поведению. Для новых правил сначала получить осмысленное падение, затем зелёный результат. Проверить type-check, targeted lint и git diff --check. Не запускать SmartBot benchmark и не создавать игры на стороннем или production сервере.

## Приёмка и ревью

Все subtasks выполнены и подтверждены проверками. Не считать проверенные статические метаданные доказательством игровых effects. Проверить сохранение состояния для изменённых hooks. Проверить, что импорт старого source не тянет устаревшие APIs и чужие дополнения. Записать реальные команды и результаты. Перед завершением WP сверить разрешённые файлы и требования.

## Подзадачи

### T035 — Добавить выключенную галочку, значок и отображение правил; проверить работу общего фильтра клиента.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T036 — Проверить создание и старые шаблоны, Prelude 2, совместную работу и сохранение/загрузку.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T037 — Обновить необходимые fingerprints источника и карту новых связей, сохранив обязательный guard.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T038 — Пройти focused review и локальные tests/types/lint/build; подготовить diff, описание PR и доказательства для штатной приёмки и объединения.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T039 — Подготовить штатный пакет PR/CI/staging и его проверки; фактический выпуск выполнить после приёмки и объединения, подтвердив неизменность prod.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

## Фактический выпуск после объединения

Руслан согласовал поправку порядка выпуска 2026-10-10. Приёмка WP09 подтверждает готовность к выпуску; она не подтверждает выполненный deploy. Сразу после штатного объединения в codex/rebalanced-mars-reference родитель создаёт PR в main, дожидается CI, выполняет разрешённый merge, обновляет clean release checkout и проверяет exact origin/main на staging штатными snapshot/CAS/API/Playwright. Неизменность prod подтверждается по полному snapshot. Этот пакет остаётся обязательным для завершения поручения; live/prod без отдельной команды запрещён. Контроль — release-checklist.md.
