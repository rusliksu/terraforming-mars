---
work_package_id: WP03
title: Корпорации, группа 1
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
created_at: '2026-10-10T13:12:03.332512+00:00'
subtasks:
- T010
- T011
- T012
- T013
history: []
agent_profile: generic-agent
authoritative_surface: src/server/cards/rebalanced/AphroditeRebalanced.ts
create_intent:
- src/server/cards/rebalanced/AphroditeRebalanced.ts
- src/server/cards/rebalanced/ArcadianCommunitiesRebalanced.ts
- src/server/cards/rebalanced/AridorRebalanced.ts
- src/server/cards/rebalanced/ArklightRebalanced.ts
- src/server/cards/rebalanced/AstrodrillRebalanced.ts
- src/server/cards/rebalanced/CelesticRebalanced.ts
- src/server/cards/rebalanced/CheungShingMARSRebalanced.ts
- src/server/cards/rebalanced/EcoLineRebalanced.ts
- src/server/cards/rebalanced/FactorumRebalanced.ts
- src/server/cards/rebalanced/HelionRebalanced.ts
- src/server/cards/rebalanced/InterplanetaryCinematicsRebalanced.ts
- src/server/cards/rebalanced/InventrixRebalanced.ts
- src/server/cards/rebalanced/LakefrontResortsRebalanced.ts
- src/server/cards/rebalanced/MiningGuildRebalanced.ts
- src/server/cards/rebalanced/MonsInsuranceRebalanced.ts
- src/server/cards/rebalanced/MorningStarIncRebalanced.ts
- tests/cards/rebalanced/Corporations1.spec.ts
execution_mode: code_change
lane: planned
owned_files:
- src/server/cards/rebalanced/AphroditeRebalanced.ts
- src/server/cards/rebalanced/ArcadianCommunitiesRebalanced.ts
- src/server/cards/rebalanced/AridorRebalanced.ts
- src/server/cards/rebalanced/ArklightRebalanced.ts
- src/server/cards/rebalanced/AstrodrillRebalanced.ts
- src/server/cards/rebalanced/CelesticRebalanced.ts
- src/server/cards/rebalanced/CheungShingMARSRebalanced.ts
- src/server/cards/rebalanced/EcoLineRebalanced.ts
- src/server/cards/rebalanced/FactorumRebalanced.ts
- src/server/cards/rebalanced/HelionRebalanced.ts
- src/server/cards/rebalanced/InterplanetaryCinematicsRebalanced.ts
- src/server/cards/rebalanced/InventrixRebalanced.ts
- src/server/cards/rebalanced/LakefrontResortsRebalanced.ts
- src/server/cards/rebalanced/MiningGuildRebalanced.ts
- src/server/cards/rebalanced/MonsInsuranceRebalanced.ts
- src/server/cards/rebalanced/MorningStarIncRebalanced.ts
- tests/cards/rebalanced/Corporations1.spec.ts
- src/server/Game.ts
- src/server/Player.ts
- src/server/cards/ICard.ts
- src/server/cards/base/standardActions/ConvertHeat.ts
- src/server/cards/promo/ArcadianCommunities.ts
- src/server/cards/promo/MonsInsurance.ts
- src/server/turmoil/parties/Reds.ts
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

Корпорации, группа 1. Успех проверяется требованиями FR-002, FR-006.

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
| Aphrodite(⚖) | AphroditeRebalanced |
| Arcadian Communities(⚖) | ArcadianCommunitiesRebalanced |
| Aridor(⚖) | AridorRebalanced |
| Arklight(⚖) | ArklightRebalanced |
| Astrodrill(⚖) | AstrodrillRebalanced |
| Celestic(⚖) | CelesticRebalanced |
| Cheung Shing MARS(⚖) | CheungShingMARSRebalanced |
| EcoLine(⚖) | EcoLineRebalanced |
| Factorum(⚖) | FactorumRebalanced |
| Helion(⚖) | HelionRebalanced |
| Interplanetary Cinematics(⚖) | InterplanetaryCinematicsRebalanced |
| Inventrix(⚖) | InventrixRebalanced |
| Lakefront Resorts(⚖) | LakefrontResortsRebalanced |
| Mining Guild(⚖) | MiningGuildRebalanced |
| Mons Insurance(⚖) | MonsInsuranceRebalanced |
| Morning Star Inc.(⚖) | MorningStarIncRebalanced |

## Подзадачи

Уточнение T012 по фактическим call sites: родитель назначил общие поверхности Game/Player/ICard, исходные Arcadian/Mons, ConvertHeat/Reds и три codemap-артефакта. Они реализуют уже согласованные эффекты, не добавляют правила или миграцию данных. WP01 уже принят; WP09 ещё не начат. На пересекающихся путях допускается один writer, изменения и старые правила проверяются отдельно. Scope warning исходной узкой декларации устранён её синхронизацией с назначенным и проверенным diff.

### T010 — Зафиксировать стартовые ресурсы, теги, очки и изменения эффектов каждой корпорации группы.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T011 — Перенести числовые отличия, сохраняя неизменённое поведение нынешних базовых классов.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T012 — Перенести изменённые hooks и действия, включая влияние и реакции на других игроков.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.

### T013 — Проверить игровое поведение, производство, очки и сохранение состояния корпораций группы.

- Выполнить только относящиеся к этому пункту изменения.
- Проверить реальные call sites и исходные правила.
- Сохранить неизменённое поведение вне нового модуля.
- Подтвердить результат профильной проверкой и отметить пункт в tasks.md.
