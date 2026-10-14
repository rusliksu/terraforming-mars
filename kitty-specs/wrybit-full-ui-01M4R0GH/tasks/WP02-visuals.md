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
- src/client/components/card/CardExtraContent.vue
- src/client/components/PlayerHome.vue
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
- src/client/components/overview/PlayerTags.vue
- src/client/components/overview/playerTagDetails.ts
- tests/client/components/overview/PlayerTags.spec.ts
- src/common/models/PlayerModel.ts
- src/common/models/ConditionalDiscountModel.ts
- src/server/models/publicConditionalDiscounts.ts
- src/client/components/card/Card.vue
- src/client/cards/CardModelMetadata.ts
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

Промежуточная проверка filter/hand views: наши static/custom metadata, clone tags, Galactic/Infrastructure, server calculatedCost и offered project input. Общий producer active predicate сохраняет активные/effect preludes; сортировка всей руки использует наши SortOrder/CardOrderStorage, отдельное viewer state, восстанавливает Manual и добавляет новые карты в конец. Source filter/sort/zoom controls перенесены с private overlay root; zoom не пишет в html. 90 client tests/38 files плюс focused active-prelude test, Vue types, scoped lint/style и actual Webpack без warnings. Browser component fixture на D: подтвердил Playable now, phone sheet/open-close и Cost/Manual обычными кликами; console 0/0. 137 упорядоченных CSS rules совпадают после documented isolation и исправления двух combined modifier selectors. Полные home/input/carousel/viewport flows ещё открыты.

## Риски и ориентиры review

Info/shared widgets proof: 204 tests/73 files плюс шесть focused widget tests, Vue types, ESLint/Stylelint и actual Webpack зелёные. Source tiles читают все наши EXPANSIONS/MODULE_NAMES, privacy/ELO/undo/one-way draft, supplied decks и spectator link; foreign defaults/AI setup не импортируются. Keyboard help сохраняет наш F shortcut; Party использует canonical availability/counts. Browser обнаружил native info_panel absolute layout (2×2 px), исправлен только scoped CSS. Итоговые info-verified-desktop/phone показывают framed dialog, Escape закрывает, console 0/0. Ранние пустые info-framed screenshots — failure evidence. Full game providers, log panels, inputs и оставшиеся matrix строки открыты.

Board zoom scoped proof: 201 client tests/71 files до последней gesture-правки и 6 focused tests после; Vue types, ESLint/Stylelint и final actual Webpack без warnings. Browser desktop/390×844: open/close, + 200→225%, fit 100%, Escape, console 0/0. Async ownership mutation убит detached DOM error, исходник восстановлен; source pointercancel/pinch-tail regression red→green. Asset mars-planet.png копируется без изменения, SHA-256 проверен. Реальные placement/input/viewport-owner flows пока не закрыты.

Board zoom dependency handoff внутри WP02: pure MobileZoomControls/mobileBoardZoom geometry находится в visuals/board; полный mobile owner/экраны остаются WP05. BoardZoomModal/ScaledBoard сохраняют наши Board props/config/custom rows; custom maps не обрезаются фиксированным planet crop. Для body Teleport применяется private root; async show/hide/zoom callbacks инвалидируются при unmount/новом переходе. Selection controller и ответы сервера не импортируются. Полное размещение/zoom из input owner проверяется WP03/WP05.

Промежуточная проверка card/detail/timer views: 197 client tests/70 files, Vue types, scoped ESLint/Stylelint и actual Webpack без warnings. Normal browser hover/help click, desktop/phone popup и Escape — console 0/0. Таймер использует наш Timer.toString, public snapshot и live flag; readOnly не получает wall-clock elapsed, interval очищается. Mutation тест убивает возврат wall-clock в recorded mode и восстановлен. Требования поколения/max и readonly card resources проверены. Renderer reuses записаны по фактическому source diff; наши corporation rows, custom icons, teammate/Coordination, extra data и конфиг максимумов сохраняются. Полный Game/App caller, owner layouts и остальные строки matrix остаются открытыми.

Последовательный CardExtraContent handoff: существующий lifeFound predicate извлекается в CardModelMetadata без изменения условия. Source found-life overlay использует наш public resource state и имеющееся изображение martian.png; foreign foundLifeVariant/сервер не импортируются. InSpire resources и mining markers сохраняются. Native predicate и игровой SearchForLife/VP не меняются.

Последовательный handoff внутри WP02: CardRowComponent и его focused test. Browser catalog обнаружил, что канонический ItemType допускает строковое описание, но runtime Vue prop принимал только Object. Исправляется только декларация типа prop; renderer, метаданные карт, эффекты и правила не меняются.

Последовательный handoff из завершённой WP01: App, WrybitBoundary/Shell, presentationViews и ближайшие shell tests. Wrybit chunk передаёт только presentation components для уже существующего маршрута cards. App сохраняет сеть, routing и actions; loader fallback остаётся канонической границей. Обычный маршрут до opt-in использует прежний CardList.

Переключение каталогов требует прекращать URL writes обоих экземпляров. Red regression подтвердил прежнюю утечку hash timer в classic CardList; добавлена очистка timer при unmount без изменения фильтров или формата hash.

Общий toolbar, GameMenu, SidebarModal, DialogFrame, glyph и overlay helpers переносятся последовательно в visuals внутри WP02 как необходимая зависимость каталога. Внешние extensions источника не импортируются; settings/language/help/info остаются нашими. Полное оформление содержимого этих диалогов и игровые providers будут проверены соответствующими WP. Teleport сохраняет изолированный Wrybit root без высоты обычной страницы.

Необходимая read-only проекция для таблицы достижений: optional threshold в публичном ClaimedMilestoneModel из уже имеющегося BaseMilestone.threshold либо существующей карты отображения Conglomerates. Для составных условий число не выдумывается. canClaim/getScore, класс milestone, действия и сохранения остаются неизменными. Handoff ServerModel/model/test записан до правки.

Общие цены информационных панелей извлекаются из существующих Milestones/Awards в milestoneAwardPrices и используются таблицей. Это прежний producer display prices; личные льготы/оплаты и серверные цены не рассчитываются заново.

Последовательный handoff общего read-only producer тегов: канонический PlayerTags и новый playerTagDetails. Для таблицы Wrybit выделяется существующий расчёт из нашей панели, без импорта чужого подсчёта скидок/VP. Оба представления должны реагировать на обновление публичных моделей; игровой расчёт стоимости, VP и AI не меняется. Focused refresh test находится в owned tests/client/wrybit/visuals.

Read-only metadata handoff для фильтров: из канонического Card выделяются static/custom wire resolution и отображаемые теги (включая cloneTag) в CardModelMetadata. Filter и renderer читают один источник; custom cards, Galactic/Infrastructure и server calculatedCost сохраняются. SortOrder, правила и данные карт не изменяются этим выделением.

Последовательный handoff PlayerHome: его существующий isActiveCard переносится в CardModelMetadata без изменения predicate/custom priority. Wrybit hand/group views используют этот же producer, сохраняя активные preludes/effects наших карточек. Shared hand sort использует наш SortOrder и CardOrderStorage, отдельное transient состояние по viewer ID и revision для связанных представлений; foreign storage/controller не импортируются.

Ближайший native PlayerTags test входит в этот handoff: его существующий conciseTagsViewDefaultValue=false уже задаёт режим. Удаляется только запись в несуществующий $data.conciseView, которая ломается при переходе producer на computed; все проверки скидок, замены тегов и Galactic сохраняются.

Read-only conditional discount DTO для source badges: PlayerModel/ConditionalDiscountModel и publicConditionalDiscounts входят в последовательный handoff WP02. Только проверенные CET (включая Rebalanced), Xavier и Adhai из публичного tableau; helper вызывает их существующий getCardDiscount на фиксированных настоящих Birds (requirements) и Asteroid (SPACE без planetary tags). Рука игрока, canPlay/play, оплата, эффекты, Game/Player/AI не затрагиваются. Undefined означает отсутствие проекции, [] — нет активных скидок этого ограниченного списка. Клиент не прибавляет их к общей скидке и не вычисляет числа самостоятельно.

Промежуточная проверка player panels: 122 client tests/31 files, 22 ServerModel tests, Vue types/scoped ESLint/Stylelint, actual Webpack без warnings. Red/green проверки: реактивные теги и отдельная защита stock/production. Method substitution проверяет делегирование badge суммы; prices/pending input и независимость от приватной руки проверены. Browser на синтетическом component fixture подтвердил показ таблицы, открытие/закрытие played-card панели и toggle goods, console 0 errors/warnings. Escape Velocity badge читает публичный penalty, не вычисляет VP; recorded clock не продолжает ход времени. Полное App/home подключение, viewport/column resizing, change-flash, filters/carousel и expansion presentation остаются открытыми.

Промежуточная проверка milestone/award/table, board tabs и pointer sorting: 95 client tests (22 files), 20 ServerModel tests, Vue type-check, scoped ESLint/Stylelint и actual Webpack зелёные. Browser component proof на D: подтвердил desktop/phone table, обычную сортировку и drag, переход Mars/Colonies/обратно и tile-view switch; console 0 errors/warnings. Source общий stopFit заменён per-instance cleanup после red regression; empty tooltip и pending touch при refresh также получили red/green проверки. Public team totals/ranks, наш custom global config и второй Epsilon marker сохраняются. Full game callers, change-flash, player table, mobile carousel и полные expansion screens ещё не проверены; matrix и подзадачи остаются открытыми.

Не копировать чужой контроллер сети/AI; не рассчитывать цены и доступность независимыми правилами; не маскировать отсутствующие поля приведением типов или выдуманными значениями; не смешивать стили двух режимов; не раскрывать административную статистику; не терять контекст формы при polling/переключении. Любая необходимость изменить игровую логику возвращается на отдельное решение.
