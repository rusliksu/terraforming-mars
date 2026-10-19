---
work_package_id: WP04
title: Корпорации, группа 2
dependencies:
- WP01
requirement_refs:
- FR-002
- FR-006
planning_base_branch: codex/rebalanced-mars-reference
merge_target_branch: codex/rebalanced-mars-reference
branch_strategy: Planning artifacts for this mission were generated on codex/rebalanced-mars-reference. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into codex/rebalanced-mars-reference unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-rebalanced-mars-reference-01M4JTWC
base_commit: 9bf50c68a0fd51fc0105256e2c3eae43625d0b1c
created_at: '2026-10-10T14:13:57.779609+00:00'
subtasks:
- T014
- T015
- T016
- T017
history: []
agent_profile: generic-agent
authoritative_surface: src/server/cards/rebalanced/PhoboLogRebalanced.ts
create_intent:
- src/server/cards/rebalanced/PhoboLogRebalanced.ts
- src/server/cards/rebalanced/PointLunaRebalanced.ts
- src/server/cards/rebalanced/PolyphemosRebalanced.ts
- src/server/cards/rebalanced/PoseidonRebalanced.ts
- src/server/cards/rebalanced/PristarRebalanced.ts
- src/server/cards/rebalanced/RecyclonRebalanced.ts
- src/server/cards/rebalanced/RobinsonIndustriesRebalanced.ts
- src/server/cards/rebalanced/SpliceRebalanced.ts
- src/server/cards/rebalanced/StormCraftIncorporatedRebalanced.ts
- src/server/cards/rebalanced/TerralabsResearchRebalanced.ts
- src/server/cards/rebalanced/TharsisRepublicRebalanced.ts
- src/server/cards/rebalanced/ThorgateRebalanced.ts
- src/server/cards/rebalanced/UnitedNationsMarsInitiativeRebalanced.ts
- src/server/cards/rebalanced/UtopiaInvestRebalanced.ts
- src/server/cards/rebalanced/VironRebalanced.ts
- src/server/cards/rebalanced/VitorRebalanced.ts
- tests/cards/rebalanced/Corporations2.spec.ts
execution_mode: code_change
lane: planned
owned_files:
- src/server/cards/rebalanced/PhoboLogRebalanced.ts
- src/server/cards/rebalanced/PointLunaRebalanced.ts
- src/server/cards/rebalanced/PolyphemosRebalanced.ts
- src/server/cards/rebalanced/PoseidonRebalanced.ts
- src/server/cards/rebalanced/PristarRebalanced.ts
- src/server/cards/rebalanced/RecyclonRebalanced.ts
- src/server/cards/rebalanced/RobinsonIndustriesRebalanced.ts
- src/server/cards/rebalanced/SpliceRebalanced.ts
- src/server/cards/rebalanced/StormCraftIncorporatedRebalanced.ts
- src/server/cards/rebalanced/TerralabsResearchRebalanced.ts
- src/server/cards/rebalanced/TharsisRepublicRebalanced.ts
- src/server/cards/rebalanced/ThorgateRebalanced.ts
- src/server/cards/rebalanced/UnitedNationsMarsInitiativeRebalanced.ts
- src/server/cards/rebalanced/UtopiaInvestRebalanced.ts
- src/server/cards/rebalanced/VironRebalanced.ts
- src/server/cards/rebalanced/VitorRebalanced.ts
- tests/cards/rebalanced/Corporations2.spec.ts
role: implementer
tags: []
tracker_refs: []
---

## ⚡ Do This First: Load Agent Profile

Загрузить профиль generic-agent штатным resolver перед выполнением. Профиль задаёт правила этой сессии; отдельный агент не запускается.

## Цель

Корпорации, группа 2. Успех проверяется требованиями FR-002, FR-006.

## Правила выполнения

Работа выполняется основной сессией последовательно. Новые агенты и смена модели не требуются. Не менять чужие файлы и не обходить approval/live/prod gates. Сначала прочитать spec.md, plan.md и независимый reference-inventory.json. Цены и эффекты нельзя выводить из новой реализации. Старые руки и сохранения не редактировать.

Существующий исходник pe5ha является читаемым материалом; опубликованный код rebalakefak задаёт референс. Части эффектов в старых Game/Player проверить точечно. Выбирать существующий Behavior или hooks, не переносить старый движок и не вводить именные исключения вместо общего контракта.

## Ветки и каталог

Основа и результат работы — codex/rebalanced-mars-reference в собственном checkout. Публичная доставка — PR в main; прямые main-коммиты запрещены. Пользоваться каталогом, который вернул runtime для single_branch.

## Проверки

Проверить наблюдаемые ресурсы, производство, требования, действия и очки по изменённому поведению. Для новых правил сначала получить осмысленное падение, затем зелёный результат. Проверить type-check, targeted lint и git diff --check. Не запускать SmartBot benchmark и не создавать игры на стороннем или production сервере.

## Приёмка и ревью

Все subtasks выполнены и подтверждены проверками. Не считать проверенные статические метаданные доказательством игровых effects. Проверить сохранение состояния для изменённых hooks. Проверить, что импорт старого source не тянет устаревшие APIs и чужие дополнения. Записать реальные команды и результаты. Перед завершением WP сверить разрешённые файлы и требования.

## Карты пакета

| Имя | Фабрика |
|---|---|
| PhoboLog(⚖) | PhoboLogRebalanced |
| Point Luna(⚖) | PointLunaRebalanced |
| Polyphemos(⚖) | PolyphemosRebalanced |
| Poseidon(⚖) | PoseidonRebalanced |
| Pristar(⚖) | PristarRebalanced |
| Recyclon(⚖) | RecyclonRebalanced |
| Robinson Industries(⚖) | RobinsonIndustriesRebalanced |
| Splice(⚖) | SpliceRebalanced |
| Stormcraft Incorporated(⚖) | StormCraftIncorporatedRebalanced |
| Terralabs Research(⚖) | TerralabsResearchRebalanced |
| Tharsis Republic(⚖) | TharsisRepublicRebalanced |
| Thorgate(⚖) | ThorgateRebalanced |
| United Nations Mars Initiative(⚖) | UnitedNationsMarsInitiativeRebalanced |
| Utopia Invest(⚖) | UtopiaInvestRebalanced |
| Viron(⚖) | VironRebalanced |
| Vitor(⚖) | VitorRebalanced |

## Подзадачи

### T014 — Зафиксировать стартовые ресурсы, теги, очки и изменения эффектов каждой корпорации группы.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T015 — Перенести числовые отличия, сохраняя неизменённое поведение нынешних базовых классов.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T016 — Перенести изменённые hooks и действия, включая влияние и реакции на других игроков.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T017 — Проверить игровое поведение, производство, очки и сохранение состояния корпораций группы.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.
