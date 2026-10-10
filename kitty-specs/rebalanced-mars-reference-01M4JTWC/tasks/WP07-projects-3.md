---
work_package_id: WP07
title: Проекты, группа 3
dependencies:
- WP01
requirement_refs:
- FR-002
planning_base_branch: codex/rebalanced-mars-reference
merge_target_branch: codex/rebalanced-mars-reference
branch_strategy: Planning artifacts for this mission were generated on codex/rebalanced-mars-reference. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into codex/rebalanced-mars-reference unless the human explicitly redirects the landing branch.
subtasks:
- T026
- T027
- T028
- T029
history: []
agent_profile: generic-agent
authoritative_surface: src/server/cards/rebalanced/RestrictedAreaRebalanced.ts
create_intent:
- src/server/cards/rebalanced/RestrictedAreaRebalanced.ts
- src/server/cards/rebalanced/RotatorImpactsRebalanced.ts
- src/server/cards/rebalanced/SabotageRebalanced.ts
- src/server/cards/rebalanced/SkyDocksRebalanced.ts
- src/server/cards/rebalanced/SnowAlgaeRebalanced.ts
- src/server/cards/rebalanced/SoilFactoryRebalanced.ts
- src/server/cards/rebalanced/SolarPowerRebalanced.ts
- src/server/cards/rebalanced/SpinoffDepartmentRebalanced.ts
- src/server/cards/rebalanced/StratopolisRebalanced.ts
- src/server/cards/rebalanced/StripMineRebalanced.ts
- src/server/cards/rebalanced/TitanAirScrappingRebalanced.ts
- src/server/cards/rebalanced/TollStationRebalanced.ts
- src/server/cards/rebalanced/TopsoilContractRebalanced.ts
- src/server/cards/rebalanced/TropicalResortRebalanced.ts
- src/server/cards/rebalanced/UndergroundCityRebalanced.ts
- src/server/cards/rebalanced/UndergroundDetonationsRebalanced.ts
- src/server/cards/rebalanced/ViralEnhancersRebalanced.ts
- src/server/cards/rebalanced/WarpDriveRebalanced.ts
- src/server/cards/rebalanced/ZeppelinsRebalanced.ts
- tests/cards/rebalanced/Projects3.spec.ts
execution_mode: code_change
lane: planned
owned_files:
- src/server/cards/rebalanced/RestrictedAreaRebalanced.ts
- src/server/cards/rebalanced/RotatorImpactsRebalanced.ts
- src/server/cards/rebalanced/SabotageRebalanced.ts
- src/server/cards/rebalanced/SkyDocksRebalanced.ts
- src/server/cards/rebalanced/SnowAlgaeRebalanced.ts
- src/server/cards/rebalanced/SoilFactoryRebalanced.ts
- src/server/cards/rebalanced/SolarPowerRebalanced.ts
- src/server/cards/rebalanced/SpinoffDepartmentRebalanced.ts
- src/server/cards/rebalanced/StratopolisRebalanced.ts
- src/server/cards/rebalanced/StripMineRebalanced.ts
- src/server/cards/rebalanced/TitanAirScrappingRebalanced.ts
- src/server/cards/rebalanced/TollStationRebalanced.ts
- src/server/cards/rebalanced/TopsoilContractRebalanced.ts
- src/server/cards/rebalanced/TropicalResortRebalanced.ts
- src/server/cards/rebalanced/UndergroundCityRebalanced.ts
- src/server/cards/rebalanced/UndergroundDetonationsRebalanced.ts
- src/server/cards/rebalanced/ViralEnhancersRebalanced.ts
- src/server/cards/rebalanced/WarpDriveRebalanced.ts
- src/server/cards/rebalanced/ZeppelinsRebalanced.ts
- tests/cards/rebalanced/Projects3.spec.ts
role: implementer
tags: []
tracker_refs: []
---

## ⚡ Do This First: Load Agent Profile

Загрузить профиль generic-agent штатным resolver перед выполнением. Профиль задаёт правила этой сессии; отдельный агент не запускается.

## Цель

Проекты, группа 3. Успех проверяется требованиями FR-002.

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
| Restricted Area(⚖) | RestrictedAreaRebalanced |
| Rotator Impacts(⚖) | RotatorImpactsRebalanced |
| Sabotage(⚖) | SabotageRebalanced |
| Sky Docks(⚖) | SkyDocksRebalanced |
| Snow Algae(⚖) | SnowAlgaeRebalanced |
| Soil Factory(⚖) | SoilFactoryRebalanced |
| Solar Power(⚖) | SolarPowerRebalanced |
| Spin-off Department(⚖) | SpinoffDepartmentRebalanced |
| Stratopolis(⚖) | StratopolisRebalanced |
| Strip Mine(⚖) | StripMineRebalanced |
| Titan Air-scrapping(⚖) | TitanAirScrappingRebalanced |
| Toll Station(⚖) | TollStationRebalanced |
| Topsoil Contract(⚖) | TopsoilContractRebalanced |
| Tropical Resort(⚖) | TropicalResortRebalanced |
| Underground City(⚖) | UndergroundCityRebalanced |
| Underground Detonations(⚖) | UndergroundDetonationsRebalanced |
| Viral Enhancers(⚖) | ViralEnhancersRebalanced |
| Warp Drive(⚖) | WarpDriveRebalanced |
| Zeppelins(⚖) | ZeppelinsRebalanced |

## Подзадачи

### T026 — Сверить цены, теги, требования, ресурсы, действия и очки каждого проекта с опубликованным кодом.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T027 — Перенести варианты с неизменёнными эффектами через нынешние базовые классы.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T028 — Реализовать изменённые эффекты и rendering через существующие контракты движка.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T029 — Закрепить изменённое поведение тестами реальных ресурсов, требований, атак и защит.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.
