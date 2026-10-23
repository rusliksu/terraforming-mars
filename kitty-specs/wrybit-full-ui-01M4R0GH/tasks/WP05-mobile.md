---
work_package_id: WP05
title: Mobile и зритель
dependencies:
- WP04
requirement_refs:
- FR-003
- FR-006
- FR-009
- NFR-002
- NFR-004
planning_base_branch: codex/wrybit-full-ui
merge_target_branch: codex/wrybit-full-ui
branch_strategy: Planning artifacts for this mission were generated on codex/wrybit-full-ui. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into codex/wrybit-full-ui unless the human explicitly redirects the landing branch.
subtasks:
- T017
- T018
- T019
- T020
phase: Полный перенос интерфейса
history: []
agent_profile: implementer-ivan
authoritative_surface: src/client/wrybit/mobile/
create_intent: []
execution_mode: code_change
owned_files:
- src/client/wrybit/mobile/**
- src/client/wrybit/spectator/**
- tests/client/wrybit/mobile/**
- src/client/wrybit/shell/WrybitShell.vue
- src/client/wrybit/shell/presentationViews.ts
- src/client/wrybit/shell/inputBridge.ts
- src/client/components/App.vue
- src/client/components/SelectProjectCardToPlay.vue
- src/client/wrybit/inputs/OrOptions.vue
- src/client/wrybit/inputs/SelectProjectCardToPlay.vue
- src/client/wrybit/inputs/presentation.ts
- src/client/wrybit/visuals/PlayerHome.vue
- src/client/wrybit/visuals/GameBoardView.vue
- src/client/wrybit/visuals/common/mobileLayout.ts
- src/client/wrybit/visuals/mobile/MobileCardZoom.vue
- src/styles/wrybit/mobile.less
- src/styles/wrybit/mobile/**
- src/styles/wrybit/visuals.less
- src/client/wrybit/import-manifest.json
- docs/codemap/codemap.json
- docs/codemap/codemap.html
- docs/codemap/codemap.lock
priority: P1
role: implementer
tags: []
tracker_refs: []
---

# WP05 — Mobile и зритель

## ⚡ Сначала загрузить профиль

Перед исполнением загрузить профиль implementer-ivan через resolver-backed `spk-doctrine-profile-load`; сохранить текущие модель и настройки задачи. Вспомогательные агенты не запланированы. Перечитать применимые правила и подтверждённые spec/plan; пока план не одобрен человеком, реализация запрещена.

## Цель и входы

Доставить mobile и зритель в полном опциональном режиме Wrybit. Источник закреплён в spec.md: 988235122ffd61d8d1190e90beb2247afd252c00. Использовать наши текущие модели, протоколы, данные и обработчики. Контекст: spec.md, plan.md, contracts/ui-coverage.md и результат предшествующего пакета.

## Ответственность

Пути перечислены в owned_files. При необходимом изменении вне них сначала проверить отсутствие пересечения и зафиксировать точный перенос ответственности. Не отменять чужие изменения. Изменение правил, Game/Player, AI/SmartBot, карточных эффектов и сохранения запрещено.

## Подзадачи

Sequential handoff from approved WP01–WP04: only optional presentation routing in App/WrybitViews/Shell, root read-only input binding registration, viewport owner, PlayerHome mobile wrapper, GameBoardView marsAside slot, existing MobileCardZoom and scoped styles/manifest/codemap transfer to WP05. Native SelectProjectCardToPlay may expose a typed clear-selection presentation command so an unavailable carousel card cannot submit an off-screen selection; its ledger, availability, pricing, network and save commands remain native. No other writers. Source mobile globals/poll-reset logic and DOM controller discovery are replaced by per-owner view state and existing typed native bindings. Spectator retains its native poller and public ViewModel; no actor input/hand is mounted. This implements the approved mobile/privacy/preserved-input requirements without a new controller or gameplay change.

- [x] T017 Перенести полный мобильный ход, drawer и карусель.
- [x] T018 Перенести desktop/mobile зрителя.
- [x] T019 Проверить resize, прокрутку, ввод и обновление шага.
- [x] T020 Проверить приватность и отсутствие действий игрока у зрителя.

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
