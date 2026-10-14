---
work_package_id: WP02
title: Поле, карты и визуальная система
dependencies:
- WP01
requirement_refs:
- FR-003
- FR-004
- NFR-005
planning_base_branch: codex/wrybit-full-ui
merge_target_branch: codex/wrybit-full-ui
branch_strategy: Planning artifacts for this mission were generated on codex/wrybit-full-ui. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into codex/wrybit-full-ui unless the human explicitly redirects the landing branch.
subtasks:
- T005
- T006
- T007
- T008
phase: Полный перенос интерфейса
history: []
agent_profile: implementer-ivan
authoritative_surface: src/client/wrybit/visuals/
create_intent: []
execution_mode: code_change
owned_files:
- src/client/wrybit/visuals/**
- src/styles/wrybit/**
- assets/wrybit/**
- tests/client/wrybit/visuals/**
- src/client/components/cardlist/catalogMetadata.ts
- src/client/components/cardlist/CardList.vue
- src/client/components/card/CardRowComponent.vue
- tests/client/components/card/CardRowComponent.spec.ts
- src/client/components/App.vue
- src/client/wrybit/shell/WrybitBoundary.vue
- src/client/wrybit/shell/WrybitShell.vue
- src/client/wrybit/shell/presentationViews.ts
- tests/client/wrybit/shell/AppMode.spec.ts
- tests/client/wrybit/shell/WrybitBoundary.spec.ts
- tests/client/wrybit/shell/WrybitShell.spec.ts
- src/common/models/ClaimedMilestoneModel.ts
- src/server/models/ServerModel.ts
- tests/models/ServerModel.spec.ts
- src/client/components/milestoneAwardPrices.ts
- src/client/components/Milestones.vue
- src/client/components/Awards.vue
- src/client/wrybit/import-manifest.json
- docs/codemap/codemap.json
- docs/codemap/codemap.html
- docs/codemap/codemap.lock
priority: P1
role: implementer
tags: []
tracker_refs: []
---

# WP02 — Поле, карты и визуальная система

## ⚡ Сначала загрузить профиль

Перед исполнением загрузить профиль implementer-ivan через resolver-backed `spk-doctrine-profile-load`; сохранить текущие модель и настройки задачи. Вспомогательные агенты не запланированы. Перечитать применимые правила и подтверждённые spec/plan; пока план не одобрен человеком, реализация запрещена.

## Цель и входы

Доставить поле, карты и визуальная система в полном опциональном режиме Wrybit. Источник закреплён в spec.md: 988235122ffd61d8d1190e90beb2247afd252c00. Использовать наши текущие модели, протоколы, данные и обработчики. Контекст: spec.md, plan.md, contracts/ui-coverage.md и результат предшествующего пакета.

## Ответственность

Пути перечислены в owned_files. При необходимом изменении вне них сначала проверить отсутствие пересечения и зафиксировать точный перенос ответственности. Не отменять чужие изменения. Изменение правил, Game/Player, AI/SmartBot, карточных эффектов и сохранения запрещено.

После одобрения WP01 ответственность за последовательное дополнение import-manifest и трёх codemap artifacts переходит WP02. Параллельной записи нет; итоговая сверка всего UI остаётся в WP07. Карточные представления наследуют наш канонический компонент: metadata, custom wire fallback, стоимость, инфраструктурная оплата и название копии не дублируются из форка. Персональные цвета используют нашу существующую графику; их перечень и привязки не меняются. Стили ограничены корнем wrybit-ui, а глобально регистрируемые CSS properties получают собственный префикс.

Для каталога WP02 последовательно владеет выделением общей read-only классификации agenda → expansion в catalogMetadata.ts и заменой её прежнего локального определения в обычном CardList. Это сохраняет существующее поведение и даёт обоим представлениям один источник; игровые правила и сервер не затрагиваются.

## Подзадачи

- [ ] T005 Перенести ресурсы и их атрибуцию.
- [ ] T006 Перенести поле, треки, награды и ресурсы игроков.
- [ ] T007 Перенести карточные представления, сортировку и каталог.
- [ ] T008 Разделить большие исходники и проверить визуальную эквивалентность.

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

Все 4 подзадачи выполнены, mapped требования имеют проверку, relevant matrix строки закрыты доказательствами, нет доменного/AI diff, проверено актуальное состояние формы и отсутствие влияния на выключенный режим. Журнал lifecycle обновлён штатными командами. Никакой шаг этого пакета сам по себе не означает завершения всего интерфейса.

## Риски и ориентиры review

Последовательный handoff внутри WP02: CardRowComponent и его focused test. Browser catalog обнаружил, что канонический ItemType допускает строковое описание, но runtime Vue prop принимал только Object. Исправляется только декларация типа prop; renderer, метаданные карт, эффекты и правила не меняются.

Последовательный handoff из завершённой WP01: App, WrybitBoundary/Shell, presentationViews и ближайшие shell tests. Wrybit chunk передаёт только presentation components для уже существующего маршрута cards. App сохраняет сеть, routing и actions; loader fallback остаётся канонической границей. Обычный маршрут до opt-in использует прежний CardList.

Переключение каталогов требует прекращать URL writes обоих экземпляров. Red regression подтвердил прежнюю утечку hash timer в classic CardList; добавлена очистка timer при unmount без изменения фильтров или формата hash.

Общий toolbar, GameMenu, SidebarModal, DialogFrame, glyph и overlay helpers переносятся последовательно в visuals внутри WP02 как необходимая зависимость каталога. Внешние extensions источника не импортируются; settings/language/help/info остаются нашими. Полное оформление содержимого этих диалогов и игровые providers будут проверены соответствующими WP. Teleport сохраняет изолированный Wrybit root без высоты обычной страницы.

Необходимая read-only проекция для таблицы достижений: optional threshold в публичном ClaimedMilestoneModel из уже имеющегося BaseMilestone.threshold либо существующей карты отображения Conglomerates. Для составных условий число не выдумывается. canClaim/getScore, класс milestone, действия и сохранения остаются неизменными. Handoff ServerModel/model/test записан до правки.

Общие цены информационных панелей извлекаются из существующих Milestones/Awards в milestoneAwardPrices и используются таблицей. Это прежний producer display prices; личные льготы/оплаты и серверные цены не рассчитываются заново.

Промежуточная проверка milestone/award/table, board tabs и pointer sorting: 95 client tests (22 files), 20 ServerModel tests, Vue type-check, scoped ESLint/Stylelint и actual Webpack зелёные. Browser component proof на D: подтвердил desktop/phone table, обычную сортировку и drag, переход Mars/Colonies/обратно и tile-view switch; console 0 errors/warnings. Source общий stopFit заменён per-instance cleanup после red regression; empty tooltip и pending touch при refresh также получили red/green проверки. Public team totals/ranks, наш custom global config и второй Epsilon marker сохраняются. Full game callers, change-flash, player table, mobile carousel и полные expansion screens ещё не проверены; matrix и подзадачи остаются открытыми.

Не копировать чужой контроллер сети/AI; не рассчитывать цены и доступность независимыми правилами; не маскировать отсутствующие поля приведением типов или выдуманными значениями; не смешивать стили двух режимов; не раскрывать административную статистику; не терять контекст формы при polling/переключении. Любая необходимость изменить игровую логику возвращается на отдельное решение.
