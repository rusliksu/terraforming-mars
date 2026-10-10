---
work_package_id: WP02
title: Прологи и стандартный проект
dependencies:
- WP01
requirement_refs:
- FR-002
- FR-005
planning_base_branch: codex/rebalanced-mars-reference
merge_target_branch: codex/rebalanced-mars-reference
branch_strategy: Planning artifacts for this mission were generated on codex/rebalanced-mars-reference. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into codex/rebalanced-mars-reference unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-rebalanced-mars-reference-01M4JTWC
base_commit: 9bf50c68a0fd51fc0105256e2c3eae43625d0b1c
created_at: '2026-10-10T13:08:48.921056+00:00'
subtasks:
- T005
- T006
- T007
- T008
- T009
history: []
agent_profile: generic-agent
authoritative_surface: src/server/cards/rebalanced/BiofuelsRebalanced.ts
create_intent:
- src/server/cards/rebalanced/BiofuelsRebalanced.ts
- src/server/cards/rebalanced/BiosphereSupportRebalanced.ts
- src/server/cards/rebalanced/DomeFarmingRebalanced.ts
- src/server/cards/rebalanced/DonationRebalanced.ts
- src/server/cards/rebalanced/EarlySettlementRebalanced.ts
- src/server/cards/rebalanced/EccentricSponsorRebalanced.ts
- src/server/cards/rebalanced/GalileanMiningRebalanced.ts
- src/server/cards/rebalanced/HugeAsteroidRebalanced.ts
- src/server/cards/rebalanced/IoResearchOutpostRebalanced.ts
- src/server/cards/rebalanced/LoanRebalanced.ts
- src/server/cards/rebalanced/MartianIndustriesRebalanced.ts
- src/server/cards/rebalanced/MetalsCompanyRebalanced.ts
- src/server/cards/rebalanced/MoholeExcavationRebalanced.ts
- src/server/cards/rebalanced/MoholeRebalanced.ts
- src/server/cards/rebalanced/NitrogenDeliveryRebalanced.ts
- src/server/cards/rebalanced/OrbitalConstructionYardRebalanced.ts
- src/server/cards/rebalanced/PolarIndustriesRebalanced.ts
- src/server/cards/rebalanced/SelfSufficientSettlementRebalanced.ts
- src/server/cards/rebalanced/SmeltingPlantRebalanced.ts
- src/server/cards/rebalanced/SocietySupportRebalanced.ts
- src/server/cards/rebalanced/SupplyDropRebalanced.ts
- src/server/cards/rebalanced/BuildColonyStandardProjectRebalanced.ts
- tests/cards/rebalanced/Preludes.spec.ts
execution_mode: code_change
lane: planned
owned_files:
- src/server/cards/rebalanced/BiofuelsRebalanced.ts
- src/server/cards/rebalanced/BiosphereSupportRebalanced.ts
- src/server/cards/rebalanced/DomeFarmingRebalanced.ts
- src/server/cards/rebalanced/DonationRebalanced.ts
- src/server/cards/rebalanced/EarlySettlementRebalanced.ts
- src/server/cards/rebalanced/EccentricSponsorRebalanced.ts
- src/server/cards/rebalanced/GalileanMiningRebalanced.ts
- src/server/cards/rebalanced/HugeAsteroidRebalanced.ts
- src/server/cards/rebalanced/IoResearchOutpostRebalanced.ts
- src/server/cards/rebalanced/LoanRebalanced.ts
- src/server/cards/rebalanced/MartianIndustriesRebalanced.ts
- src/server/cards/rebalanced/MetalsCompanyRebalanced.ts
- src/server/cards/rebalanced/MoholeExcavationRebalanced.ts
- src/server/cards/rebalanced/MoholeRebalanced.ts
- src/server/cards/rebalanced/NitrogenDeliveryRebalanced.ts
- src/server/cards/rebalanced/OrbitalConstructionYardRebalanced.ts
- src/server/cards/rebalanced/PolarIndustriesRebalanced.ts
- src/server/cards/rebalanced/SelfSufficientSettlementRebalanced.ts
- src/server/cards/rebalanced/SmeltingPlantRebalanced.ts
- src/server/cards/rebalanced/SocietySupportRebalanced.ts
- src/server/cards/rebalanced/SupplyDropRebalanced.ts
- src/server/cards/rebalanced/BuildColonyStandardProjectRebalanced.ts
- tests/cards/rebalanced/Preludes.spec.ts
role: implementer
tags: []
tracker_refs: []
---

## ⚡ Do This First: Load Agent Profile

Загрузить профиль generic-agent штатным resolver перед выполнением. Профиль задаёт правила этой сессии; отдельный агент не запускается.

## Цель

Прологи и стандартный проект. Успех проверяется требованиями FR-002, FR-005.

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
| Biofuels(⚖) | BiofuelsRebalanced |
| Biosphere Support(⚖) | BiosphereSupportRebalanced |
| Dome Farming(⚖) | DomeFarmingRebalanced |
| Donation(⚖) | DonationRebalanced |
| Early Settlement(⚖) | EarlySettlementRebalanced |
| Eccentric Sponsor(⚖) | EccentricSponsorRebalanced |
| Galilean Mining(⚖) | GalileanMiningRebalanced |
| Huge Asteroid(⚖) | HugeAsteroidRebalanced |
| Io Research Outpost(⚖) | IoResearchOutpostRebalanced |
| Loan(⚖) | LoanRebalanced |
| Martian Industries(⚖) | MartianIndustriesRebalanced |
| Metals Company(⚖) | MetalsCompanyRebalanced |
| Mohole Excavation(⚖) | MoholeExcavationRebalanced |
| Mohole(⚖) | MoholeRebalanced |
| Nitrogen Shipment(⚖) | NitrogenDeliveryRebalanced |
| Orbital Construction Yard(⚖) | OrbitalConstructionYardRebalanced |
| Polar Industries(⚖) | PolarIndustriesRebalanced |
| Self-Sufficient Settlement(⚖) | SelfSufficientSettlementRebalanced |
| Smelting Plant(⚖) | SmeltingPlantRebalanced |
| Society Support(⚖) | SocietySupportRebalanced |
| Supply Drop(⚖) | SupplyDropRebalanced |
| Colony(⚖) | BuildColonyStandardProjectRebalanced |

## Подзадачи

### T005 — Написать ожидаемые сценарии ресурсов и производства 21 пролога по независимому референсу.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T006 — Перенести декларативные прологи через существующий Behavior и rendering.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T007 — Перенести размещения, требования и отложенные действия прологов без старого движка.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T008 — Перенести стандартный проект колонии и проверить цену, покупку и совместимость.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T009 — Выполнить тесты, type-check и targeted lint; проверить отсутствие потери ресурсов в mutation check.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.
