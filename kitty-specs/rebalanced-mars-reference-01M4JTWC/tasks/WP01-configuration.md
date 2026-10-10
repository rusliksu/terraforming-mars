---
work_package_id: WP01
title: Настройки и независимый референс
dependencies: []
requirement_refs:
- FR-001
- FR-002
- FR-006
planning_base_branch: codex/rebalanced-mars-reference
merge_target_branch: codex/rebalanced-mars-reference
branch_strategy: Planning artifacts for this mission were generated on codex/rebalanced-mars-reference. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into codex/rebalanced-mars-reference unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-rebalanced-mars-reference-01M4JTWC
base_commit: 9bf50c68a0fd51fc0105256e2c3eae43625d0b1c
created_at: '2026-10-10T12:23:56.149025+00:00'
subtasks:
- T001
- T002
- T003
- T004
history: []
agent_profile: generic-agent
authoritative_surface: src/common/cards/GameModule.ts
create_intent:
- tests/cards/rebalanced/Reference.spec.ts
- tests/cards/rebalanced/reference.json
execution_mode: code_change
lane: planned
owned_files:
- src/common/cards/GameModule.ts
- src/common/cards/CardName.ts
- src/server/game/GameOptions.ts
- src/server/Game.ts
- src/server/models/ServerModel.ts
- src/server/routes/ApiCreateGame.ts
- src/server/routes/ApiQuickGame.ts
- src/server/turmoil/globalEvents/GlobalEventDealer.ts
- src/client/components/create/JSONProcessor.ts
- src/client/components/create/json.ts
- src/client/components/cardlist/CardListModel.ts
- src/client/utils/WikiLinks.ts
- tests/cards/rebalanced/Reference.spec.ts
- tests/cards/rebalanced/reference.json
role: implementer
tags: []
tracker_refs: []
---

## ⚡ Do This First: Load Agent Profile

Загрузить профиль generic-agent штатным resolver перед выполнением. Профиль задаёт правила этой сессии; отдельный агент не запускается.

## Цель

Настройки и независимый референс. Успех проверяется требованиями FR-001, FR-002, FR-006.

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

### T001 — Сопоставить все активные фабрики с текущими оригиналами и зафиксировать независимый oracle по опубликованному коду.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T002 — Добавить стабильные имена 113 замен и пяти комбинаций, модуль и выключенные по умолчанию настройки.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T003 — Передать настройку через создание, модели, загрузку и повторные настройки, сохранив false для старых игр.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T004 — Проверить все полные Record<Expansion> и относящиеся к ним старые fixtures; зафиксировать зависимости вне классов.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

## Activity Log

- 2026-10-10T12:33:16Z – codex – shell_pid=14200 – Для завершения расширенного GameModule необходим минимальный out-of-map case rebalanced в GameCards.includeModule; регистрация фабрик остаётся в WP08. Руслан разрешил служебные kitty/ ветки только для этого переноса.
