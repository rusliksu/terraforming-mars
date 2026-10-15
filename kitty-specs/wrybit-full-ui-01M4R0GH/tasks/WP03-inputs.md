---
work_package_id: WP03
title: Создание, старт и действия
dependencies:
- WP02
requirement_refs:
- FR-004
- FR-005
- FR-008
- FR-009
planning_base_branch: codex/wrybit-full-ui
merge_target_branch: codex/wrybit-full-ui
branch_strategy: Planning artifacts for this mission were generated on codex/wrybit-full-ui. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into codex/wrybit-full-ui unless the human explicitly redirects the landing branch.
subtasks:
- T009
- T010
- T011
- T012
phase: Полный перенос интерфейса
history: []
agent_profile: implementer-ivan
authoritative_surface: src/client/wrybit/inputs/
create_intent: []
execution_mode: code_change
owned_files:
- src/client/wrybit/inputs/**
- src/client/wrybit/create/**
- tests/client/wrybit/inputs/**
- src/client/components/PaymentForm.vue
- src/client/components/SelectProjectCardToPlay.vue
- src/client/components/OrOptions.vue
- src/client/components/AndOptions.vue
- src/client/components/SelectCard.vue
- src/client/components/PlayerInputFactory.vue
- src/client/wrybit/visuals/TabPanelFooterSlot.vue
- src/client/wrybit/visuals/PlayerHome.vue
- src/client/components/App.vue
- src/client/wrybit/shell/presentationViews.ts
- src/client/wrybit/shell/WrybitShell.vue
- tests/client/wrybit/shell/WrybitShell.spec.ts
- src/styles/wrybit/choice_block.less
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

# WP03 — Создание, старт и действия

## ⚡ Сначала загрузить профиль

Перед исполнением загрузить профиль implementer-ivan через resolver-backed `spk-doctrine-profile-load`; сохранить текущие модель и настройки задачи. Вспомогательные агенты не запланированы. Перечитать применимые правила и подтверждённые spec/plan; пока план не одобрен человеком, реализация запрещена.

## Цель и входы

Доставить создание, старт и действия в полном опциональном режиме Wrybit. Источник закреплён в spec.md: 988235122ffd61d8d1190e90beb2247afd252c00. Использовать наши текущие модели, протоколы, данные и обработчики. Контекст: spec.md, plan.md, contracts/ui-coverage.md и результат предшествующего пакета.

## Ответственность

Пути перечислены в owned_files. При необходимом изменении вне них сначала проверить отсутствие пересечения и зафиксировать точный перенос ответственности. Не отменять чужие изменения. Изменение правил, Game/Player, AI/SmartBot, карточных эффектов и сохранения запрещено.

## Подзадачи

Последовательный handoff после approved WP02: App/Shell передают только lazy typed input presentations. Наши PaymentForm, project/card/and/or controllers сохраняют экземпляры, ledger/defaults/валидацию и ответы; меняются только шаблоны через явные bindings. Stateful descendants переносятся локальными hosts своего owner, не глобальным INPUT_HOSTS. Исходные индексы и refs остаются у наших controllers. Общие manifest/codemap/style entry последовательно дополняет WP03; параллельной записи нет. Подготовленные payment visual leaves из WP02 получают реального потребителя здесь.

WrybitShell.spec.ts последовательно передаётся для расширенного presentation payload: существующие cards/playerHome по-прежнему проверяются, дополнительные typed inputs не считаются ошибкой теста. Source choice geometry изолируется под wrybit-ui; только две константы mobile geometry взяты из закреплённого source, полный viewport owner остаётся WP05.

PlayerHome последовательно передаёт hand-panel handoff WP03: после подключения root OrOptions руки внутри вкладок отдельный дубликат руки скрывается. До готовности typed view и для остальных типов сохраняется отдельная панель. Полная WaitingForTabs/initial/mobile интеграция остаётся открытой внутри своих пакетов.

- [ ] T009 Перенести создание и стартовую покупку с нашими параметрами.
- [ ] T010 Покрыть все наши варианты PlayerInputModel/InputResponse.
- [ ] T011 Перенести платежи и вложенные формы с нашими ограничениями.
- [ ] T012 Проверить оплату, клетку, отмену/undo и актуальность выбора.

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

Initial input vertical proof: 103 focused client tests/16files, types/scoped lint/style and actual App-only Webpack; source payment/actions screenshot and console0/0 on D:. Permanent nested controllers and exact native response retained; hand-tab and classic-return values verified. Mode-key mutation killed and exact bytes restored. All T009-T012 and full UI matrix rows stay open; remaining forms/creation/placement and full source interactions are not accepted by this partial proof.

SelectCard добавляет typed presentation к постоянному нашему controller: single/multiple state shape, max, disabled offered cards, robots и owner grouping, source filters/sort/zoom и скрытый фильтром выбор. Его методы getData/canSave/saveData/toggleSelectAll и native cardschanged не меняются. Full client regression: 1176 tests/243files, zero failures; Vue types и scoped ESLint/Stylelint зелёные. Source draft/current-pick и дополнительные card sections ещё в работе; никакой T009-T012 или полный matrix row не закрывается этим промежуточным результатом.
