---
work_package_id: WP06
title: Проекты, группа 2
dependencies:
- WP01
requirement_refs:
- FR-002
planning_base_branch: codex/rebalanced-mars-reference
merge_target_branch: codex/rebalanced-mars-reference
branch_strategy: Planning artifacts for this mission were generated on codex/rebalanced-mars-reference. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into codex/rebalanced-mars-reference unless the human explicitly redirects the landing branch.
subtasks:
- T022
- T023
- T024
- T025
history: []
agent_profile: generic-agent
authoritative_surface: src/server/cards/rebalanced/ExtractorBalloonsRebalanced.ts
create_intent:
- src/server/cards/rebalanced/ExtractorBalloonsRebalanced.ts
- src/server/cards/rebalanced/FloaterLeasingRebalanced.ts
- src/server/cards/rebalanced/ForcedPrecipitationRebalanced.ts
- src/server/cards/rebalanced/FuelFactoryRebalanced.ts
- src/server/cards/rebalanced/GHGImportFromVenusRebalanced.ts
- src/server/cards/rebalanced/GMOContractRebalanced.ts
- src/server/cards/rebalanced/HackersRebalanced.ts
- src/server/cards/rebalanced/HeatTrappersRebalanced.ts
- src/server/cards/rebalanced/IndustrialCenterRebalanced.ts
- src/server/cards/rebalanced/InsectsRebalanced.ts
- src/server/cards/rebalanced/JetStreamMicroscrappersRebalanced.ts
- src/server/cards/rebalanced/MarsUniversityRebalanced.ts
- src/server/cards/rebalanced/MartianRailsRebalanced.ts
- src/server/cards/rebalanced/MassConverterRebalanced.ts
- src/server/cards/rebalanced/MeatIndustryRebalanced.ts
- src/server/cards/rebalanced/MicroMillsRebalanced.ts
- src/server/cards/rebalanced/OrbitalCleanupRebalanced.ts
- src/server/cards/rebalanced/OutdoorSportsRebalanced.ts
- src/server/cards/rebalanced/ReleaseOfInertGasesRebalanced.ts
- src/server/cards/rebalanced/ResearchOutpostRebalanced.ts
- tests/cards/rebalanced/Projects2.spec.ts
execution_mode: code_change
lane: planned
owned_files:
- src/server/cards/rebalanced/ExtractorBalloonsRebalanced.ts
- src/server/cards/rebalanced/FloaterLeasingRebalanced.ts
- src/server/cards/rebalanced/ForcedPrecipitationRebalanced.ts
- src/server/cards/rebalanced/FuelFactoryRebalanced.ts
- src/server/cards/rebalanced/GHGImportFromVenusRebalanced.ts
- src/server/cards/rebalanced/GMOContractRebalanced.ts
- src/server/cards/rebalanced/HackersRebalanced.ts
- src/server/cards/rebalanced/HeatTrappersRebalanced.ts
- src/server/cards/rebalanced/IndustrialCenterRebalanced.ts
- src/server/cards/rebalanced/InsectsRebalanced.ts
- src/server/cards/rebalanced/JetStreamMicroscrappersRebalanced.ts
- src/server/cards/rebalanced/MarsUniversityRebalanced.ts
- src/server/cards/rebalanced/MartianRailsRebalanced.ts
- src/server/cards/rebalanced/MassConverterRebalanced.ts
- src/server/cards/rebalanced/MeatIndustryRebalanced.ts
- src/server/cards/rebalanced/MicroMillsRebalanced.ts
- src/server/cards/rebalanced/OrbitalCleanupRebalanced.ts
- src/server/cards/rebalanced/OutdoorSportsRebalanced.ts
- src/server/cards/rebalanced/ReleaseOfInertGasesRebalanced.ts
- src/server/cards/rebalanced/ResearchOutpostRebalanced.ts
- tests/cards/rebalanced/Projects2.spec.ts
role: implementer
tags: []
tracker_refs: []
---

## ⚡ Do This First: Load Agent Profile

Загрузить профиль generic-agent штатным resolver перед выполнением. Профиль задаёт правила этой сессии; отдельный агент не запускается.

## Цель

Проекты, группа 2. Успех проверяется требованиями FR-002.

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
| Extractor Balloons(⚖) | ExtractorBalloonsRebalanced |
| Floater Leasing(⚖) | FloaterLeasingRebalanced |
| Forced Precipitation(⚖) | ForcedPrecipitationRebalanced |
| Fuel Factory(⚖) | FuelFactoryRebalanced |
| GHG Import From Venus(⚖) | GHGImportFromVenusRebalanced |
| GMO Contract(⚖) | GMOContractRebalanced |
| Hackers(⚖) | HackersRebalanced |
| Heat Trappers(⚖) | HeatTrappersRebalanced |
| Industrial Center(⚖) | IndustrialCenterRebalanced |
| Insects(⚖) | InsectsRebalanced |
| Jet Stream Microscrappers(⚖) | JetStreamMicroscrappersRebalanced |
| Mars University(⚖) | MarsUniversityRebalanced |
| Martian Rails(⚖) | MartianRailsRebalanced |
| Mass Converter(⚖) | MassConverterRebalanced |
| Meat Industry(⚖) | MeatIndustryRebalanced |
| Micro-Mills(⚖) | MicroMillsRebalanced |
| Orbital Cleanup(⚖) | OrbitalCleanupRebalanced |
| Outdoor Sports(⚖) | OutdoorSportsRebalanced |
| Release of Inert Gases(⚖) | ReleaseOfInertGasesRebalanced |
| Research Outpost(⚖) | ResearchOutpostRebalanced |

## Подзадачи

### T022 — Сверить цены, теги, требования, ресурсы, действия и очки каждого проекта с опубликованным кодом.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T023 — Перенести варианты с неизменёнными эффектами через нынешние базовые классы.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T024 — Реализовать изменённые эффекты и rendering через существующие контракты движка.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T025 — Закрепить изменённое поведение тестами реальных ресурсов, требований, атак и защит.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.
