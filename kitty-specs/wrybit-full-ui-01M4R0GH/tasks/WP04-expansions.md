---
work_package_id: WP04
title: Дополнения и собственные варианты
dependencies:
- WP03
requirement_refs:
- FR-006
- FR-008
planning_base_branch: codex/wrybit-full-ui
merge_target_branch: codex/wrybit-full-ui
branch_strategy: Planning artifacts for this mission were generated on codex/wrybit-full-ui. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into codex/wrybit-full-ui unless the human explicitly redirects the landing branch.
subtasks:
- T013
- T014
- T015
- T016
phase: Полный перенос интерфейса
history: []
agent_profile: implementer-ivan
authoritative_surface: src/client/wrybit/expansions/
create_intent: []
execution_mode: code_change
owned_files:
- src/client/wrybit/expansions/**
- tests/client/wrybit/expansions/**
- tests/client/wrybit/shell/AppInputRefresh.spec.ts
- src/client/wrybit/visuals/GameBoardView.vue
- src/client/wrybit/visuals/PlayerHome.vue
- src/client/wrybit/visuals/trackBonus/BoardTrackRow.vue
- src/client/wrybit/inputs/AndOptions.vue
- src/client/wrybit/inputs/OrOptions.vue
- src/client/wrybit/inputs/SelectColony.vue
- src/client/wrybit/inputs/SelectParty.vue
- src/client/wrybit/inputs/compositePresentation.ts
- src/client/components/AndOptions.vue
- src/styles/wrybit/expansions/**
- src/styles/wrybit/visuals.less
- assets/wrybit/ships/**
- assets/wrybit/moon/**
- src/client/wrybit/import-manifest.json
- docs/codemap/codemap.json
- docs/codemap/codemap.html
- docs/codemap/codemap.lock
priority: P1
role: implementer
tags: []
tracker_refs: []
---

# WP04 — Дополнения и собственные варианты

## ⚡ Сначала загрузить профиль

Перед исполнением загрузить профиль implementer-ivan через resolver-backed `spk-doctrine-profile-load`; сохранить текущие модель и настройки задачи. Вспомогательные агенты не запланированы. Перечитать применимые правила и подтверждённые spec/plan; пока план не одобрен человеком, реализация запрещена.

## Цель и входы

Доставить дополнения и собственные варианты в полном опциональном режиме Wrybit. Источник закреплён в spec.md: 988235122ffd61d8d1190e90beb2247afd252c00. Использовать наши текущие модели, протоколы, данные и обработчики. Контекст: spec.md, plan.md, contracts/ui-coverage.md и результат предшествующего пакета.

## Ответственность

Пути перечислены в owned_files. При необходимом изменении вне них сначала проверить отсутствие пересечения и зафиксировать точный перенос ответственности. Не отменять чужие изменения. Изменение правил, Game/Player, AI/SmartBot, карточных эффектов и сохранения запрещено.

## Подзадачи

Последовательный handoff после approved WP03: только подключения панелей в GameBoardView/PlayerHome, представления And/Or/Colony/Party, изолированные стили и ресурсы, manifest/codemap переходят WP04. Других writers нет; постоянные native controllers, сеть, цены, ответы и игровой сервер остаются владельцами. Колонии используют наш ColonyModel/ColonyMetadata и существующий own-player ColonyTradeContextModel. Неоднозначные или отсутствующие прогнозы не заменяются расчётами форка. Это уточнение путей реализации FR-006/FR-008, без смены требований, критериев или delivery gates.

Для Delta последовательно передан один визуальный slot BoardTrackRow: при отсутствии slot прежняя TrackLane сохраняется. Delta использует существующие native steps/rewardIcons и оба маркера, включая Epsilon Dample; foreign availability/tag/energy rules не импортируются.

- [x] T013 Перенести колонии и торговлю по нашим данным.
- [x] T014 Перенести Turmoil и связанные формы.
- [x] T015 Перенести Moon, Venus, Pathfinders, Ares, Underworld и остальные панели.
- [x] T016 Проверить наши карты/замены/параметры/новые типы ввода.

## Порядок выполнения

1. Сверить импорты, вызывающие компоненты, текущие типы и поле matrix, которое закрывается.
2. Сначала зафиксировать наблюдаемое поведение и независимый oracle нашего сервера.
3. Перенести реальные компоненты/стили Wrybit с атрибуцией и изоляцией; сохранить наши контракты.
4. Проверить нормальное, пустое, ошибочное и обновляющееся состояние. Для ввода проверить отмену и переключение оболочки.
5. Записать проверку и снимок к закрытой строке матрицы. Непроверенную строку оставить открытой.

## Стратегия веток и исполнения

Planning/base и внутренний merge target: codex/wrybit-full-ui. Итоговый custom PR направляется в main. Перед реализацией следовать `spec-kitty next --agent codex --mission wrybit-full-ui-01M4R0GH` и его точному action; выделенный workspace брать из lanes.json. Все пакеты исполняются последовательно, с независимой проверкой результата перед переходом.

## Проверки

- Ближайшие client/flow тесты изменённого поведения, type-check и lint.
- Реальная синтетическая партия/fixture на D:, когда пакет касается хода или проекции.
- Обычный режим, включённый Wrybit и возврат; соответствующие состояния матрицы.
- Для новых проекций — отсутствие приватных данных и сохранение доступа.
- Исходные файлы до 1000 строк; нет ручной правки generated bundles.
- Полные тесты/build/CI и staging — обязательный общий gate WP07.

## Критерий готовности

Все 4 подзадачи выполнены, mapped требования имеют проверку, проверки собственного scope закрыты в contracts/stage-coverage.md; незавершённые сквозные строки полной матрицы остаются открытыми с явным WP-владельцем; никакой полный сценарий не считается выполненным по одному компонентному proof, нет доменного/AI diff, проверено актуальное состояние формы и отсутствие влияния на выключенный режим. Журнал lifecycle обновлён штатными командами. Никакой шаг этого пакета сам по себе не означает завершения всего интерфейса.

## Риски и ориентиры review

Не копировать чужой контроллер сети/AI; не рассчитывать цены и доступность независимыми правилами; не маскировать отсутствующие поля приведением типов или выдуманными значениями; не смешивать стили двух режимов; не раскрывать административную статистику; не терять контекст формы при polling/переключении. Любая необходимость изменить игровую логику возвращается на отдельное решение.

WP04 scoped implementation: modern colony/trade, committee/events, lunar ring/native spaces, planets and Delta are connected. Native Venus Phase2, HighOrbit, teams, Ares and Underworld remain available through existing own models/controllers; native custom cards/20 inputs and More Parties/persona/second Delta marker retained. Evidence and limitations: import-manifest wp04-native-expansion-panels. No new server/common/AI/gameplay/DB changes in this WP. Independent review and all full UI rows remain OPEN.

Technical base refresh before review: origin/main advanced from 7c8a4f2b07 to c0e17f9949 (#241, optional promptId stale-input rejection). Spec Kitty implementation-base requires current primary ancestry. Merge is limited to this owned task branch; requirements/source pin and game/AI owners remain unchanged. Auto-merged models retain our presentation projections and the native prompt identity. The factual source manifest combines both reviewed sets; only the two auto-merged DTO/model fingerprints need combined hashes. Existing App input-refresh regression now also verifies exact native promptId through optional mode/classic and native payment submission; ownership of that one test transfers to this compatibility check. Primary checkout, production and DB untouched.
