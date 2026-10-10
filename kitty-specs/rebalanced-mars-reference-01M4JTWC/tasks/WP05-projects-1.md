---
work_package_id: WP05
title: Проекты, группа 1
dependencies:
- WP01
requirement_refs:
- FR-002
planning_base_branch: codex/rebalanced-mars-reference
merge_target_branch: codex/rebalanced-mars-reference
branch_strategy: Planning artifacts for this mission were generated on codex/rebalanced-mars-reference. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into codex/rebalanced-mars-reference unless the human explicitly redirects the landing branch.
subtasks:
- T018
- T019
- T020
- T021
history: []
agent_profile: generic-agent
authoritative_surface: src/server/cards/rebalanced/AdaptedLichenRebalanced.ts
create_intent:
- src/server/cards/rebalanced/AdaptedLichenRebalanced.ts
- src/server/cards/rebalanced/AdvancedAlloysRebalanced.ts
- src/server/cards/rebalanced/AerobrakedAmmoniaAsteroidRebalanced.ts
- src/server/cards/rebalanced/AsteroidHollowingRebalanced.ts
- src/server/cards/rebalanced/AsteroidMiningConsortiumRebalanced.ts
- src/server/cards/rebalanced/BactoviralResearchRebalanced.ts
- src/server/cards/rebalanced/BlackPolarDustRebalanced.ts
- src/server/cards/rebalanced/BuildingIndustriesRebalanced.ts
- src/server/cards/rebalanced/CartelRebalanced.ts
- src/server/cards/rebalanced/CloudSeedingRebalanced.ts
- src/server/cards/rebalanced/CommunityServicesRebalanced.ts
- src/server/cards/rebalanced/CorporateStrongholdRebalanced.ts
- src/server/cards/rebalanced/CuttingEdgeTechnologyRebalanced.ts
- src/server/cards/rebalanced/DeimosDownPromoRebalanced.ts
- src/server/cards/rebalanced/DesignedMicroOrganismsRebalanced.ts
- src/server/cards/rebalanced/EarthCatapultRebalanced.ts
- src/server/cards/rebalanced/EarthOfficeRebalanced.ts
- src/server/cards/rebalanced/EnergyMarketRebalanced.ts
- src/server/cards/rebalanced/EnergySavingRebalanced.ts
- src/server/cards/rebalanced/EnergyTappingRebalanced.ts
- tests/cards/rebalanced/Projects1.spec.ts
execution_mode: code_change
lane: planned
owned_files:
- src/server/cards/rebalanced/AdaptedLichenRebalanced.ts
- src/server/cards/rebalanced/AdvancedAlloysRebalanced.ts
- src/server/cards/rebalanced/AerobrakedAmmoniaAsteroidRebalanced.ts
- src/server/cards/rebalanced/AsteroidHollowingRebalanced.ts
- src/server/cards/rebalanced/AsteroidMiningConsortiumRebalanced.ts
- src/server/cards/rebalanced/BactoviralResearchRebalanced.ts
- src/server/cards/rebalanced/BlackPolarDustRebalanced.ts
- src/server/cards/rebalanced/BuildingIndustriesRebalanced.ts
- src/server/cards/rebalanced/CartelRebalanced.ts
- src/server/cards/rebalanced/CloudSeedingRebalanced.ts
- src/server/cards/rebalanced/CommunityServicesRebalanced.ts
- src/server/cards/rebalanced/CorporateStrongholdRebalanced.ts
- src/server/cards/rebalanced/CuttingEdgeTechnologyRebalanced.ts
- src/server/cards/rebalanced/DeimosDownPromoRebalanced.ts
- src/server/cards/rebalanced/DesignedMicroOrganismsRebalanced.ts
- src/server/cards/rebalanced/EarthCatapultRebalanced.ts
- src/server/cards/rebalanced/EarthOfficeRebalanced.ts
- src/server/cards/rebalanced/EnergyMarketRebalanced.ts
- src/server/cards/rebalanced/EnergySavingRebalanced.ts
- src/server/cards/rebalanced/EnergyTappingRebalanced.ts
- tests/cards/rebalanced/Projects1.spec.ts
role: implementer
tags: []
tracker_refs: []
---

## ⚡ Do This First: Load Agent Profile

Загрузить профиль generic-agent штатным resolver перед выполнением. Профиль задаёт правила этой сессии; отдельный агент не запускается.

## Цель

Проекты, группа 1. Успех проверяется требованиями FR-002.

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
| Adapted Lichen(⚖) | AdaptedLichenRebalanced |
| Advanced Alloys(⚖) | AdvancedAlloysRebalanced |
| Aerobraked Ammonia Asteroid(⚖) | AerobrakedAmmoniaAsteroidRebalanced |
| Asteroid Hollowing(⚖) | AsteroidHollowingRebalanced |
| Asteroid Mining Consortium(⚖) | AsteroidMiningConsortiumRebalanced |
| Bactoviral Research(⚖) | BactoviralResearchRebalanced |
| Black Polar Dust(⚖) | BlackPolarDustRebalanced |
| Building Industries(⚖) | BuildingIndustriesRebalanced |
| Cartel(⚖) | CartelRebalanced |
| Cloud Seeding(⚖) | CloudSeedingRebalanced |
| Community Services(⚖) | CommunityServicesRebalanced |
| Corporate Stronghold(⚖) | CorporateStrongholdRebalanced |
| Cutting Edge Technology(⚖) | CuttingEdgeTechnologyRebalanced |
| Deimos Down(⚖) | DeimosDownPromoRebalanced |
| Designed Micro-organisms(⚖) | DesignedMicroOrganismsRebalanced |
| Earth Catapult(⚖) | EarthCatapultRebalanced |
| Earth Office(⚖) | EarthOfficeRebalanced |
| Energy Market(⚖) | EnergyMarketRebalanced |
| Energy Saving(⚖) | EnergySavingRebalanced |
| Energy Tapping(⚖) | EnergyTappingRebalanced |

## Подзадачи

### T018 — Сверить цены, теги, требования, ресурсы, действия и очки каждого проекта с опубликованным кодом.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T019 — Перенести варианты с неизменёнными эффектами через нынешние базовые классы.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T020 — Реализовать изменённые эффекты и rendering через существующие контракты движка.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T021 — Закрепить изменённое поведение тестами реальных ресурсов, требований, атак и защит.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.
