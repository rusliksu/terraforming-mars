---
work_package_id: WP08
title: Манифест, замены и совместная работа
dependencies:
- WP02
- WP03
- WP04
- WP05
- WP06
- WP07
requirement_refs:
- FR-003
- FR-004
- FR-005
planning_base_branch: codex/rebalanced-mars-reference
merge_target_branch: codex/rebalanced-mars-reference
branch_strategy: Planning artifacts for this mission were generated on codex/rebalanced-mars-reference. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into codex/rebalanced-mars-reference unless the human explicitly redirects the landing branch.
subtasks:
- T030
- T031
- T032
- T033
- T034
history: []
agent_profile: generic-agent
authoritative_surface: src/server/cards/rebalanced/RebalancedCardManifest.ts
create_intent:
- src/server/cards/rebalanced/RebalancedCardManifest.ts
- src/server/cards/rebalanced/CombinedVariants.ts
- tests/cards/rebalanced/Replacements.spec.ts
- tests/cards/rebalanced/Combinations.spec.ts
execution_mode: code_change
lane: planned
owned_files:
- src/server/cards/rebalanced/RebalancedCardManifest.ts
- src/server/cards/rebalanced/CombinedVariants.ts
- src/server/cards/AllManifests.ts
- src/server/GameCards.ts
- tests/cards/rebalanced/Replacements.spec.ts
- tests/cards/rebalanced/Combinations.spec.ts
role: implementer
tags: []
tracker_refs: []
---

## ⚡ Do This First: Load Agent Profile

Загрузить профиль generic-agent штатным resolver перед выполнением. Профиль задаёт правила этой сессии; отдельный агент не запускается.

## Цель

Манифест, замены и совместная работа. Успех проверяется требованиями FR-003, FR-004, FR-005.

## Правила выполнения

Работа выполняется основной сессией последовательно. Новые агенты и смена модели не требуются. Не менять чужие файлы и не обходить approval/live/prod gates. Сначала прочитать spec.md, plan.md и независимый reference-inventory.json. Цены и эффекты нельзя выводить из новой реализации. Старые руки и сохранения не редактировать.

Существующий исходник pe5ha является читаемым материалом; опубликованный код rebalakefak задаёт референс. Части эффектов в старых Game/Player проверить точечно. Выбирать существующий Behavior или hooks, не переносить старый движок и не вводить именные исключения вместо общего контракта.

## Ветки и каталог

Основа и результат работы — codex/rebalanced-mars-reference в собственном checkout. Публичная доставка — PR в main; прямые main-коммиты запрещены. Пользоваться каталогом, который вернул runtime для single_branch.

## Проверки

Проверить наблюдаемые ресурсы, производство, требования, действия и очки по изменённому поведению. Для новых правил сначала получить осмысленное падение, затем зелёный результат. Проверить type-check, targeted lint и git diff --check. Не запускать SmartBot benchmark и не создавать игры на стороннем или production сервере.

## Приёмка и ревью

Все subtasks выполнены и подтверждены проверками. Не считать проверенные статические метаданные доказательством игровых effects. Проверить сохранение состояния для изменённых hooks. Проверить, что импорт старого source не тянет устаревшие APIs и чужие дополнения. Записать реальные команды и результаты. Перед завершением WP сверить разрешённые файлы и требования.

## Подзадачи

### T030 — Зарегистрировать ровно 113 активных фабрик и условные замены с корректными зависимостями.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T031 — Добавить пять итоговых вариантов с эффектом Rebalanced и тегами Better Mars.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T032 — При доступном Better Mars исключать Rebalanced Mars University и Meat Industry, сохраняя существующие цены и эффекты.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T033 — Проверить все четыре конфигурации и выключенные зависимости; не менять ручные override старых игр без нового флага.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T034 — Проверить реальное создание партии, старый список прологов и отсутствие дублей.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.
