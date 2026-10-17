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
- src/client/components/create/CreateGameForm.vue
- src/client/components/create/createGamePresentation.ts
- src/client/components/create/ModuleItemFilter.vue
- src/client/components/create/CorporationsFilter.vue
- src/client/components/create/PreludesFilter.vue
- src/client/components/create/ColoniesFilter.vue
- src/client/components/create/CeosFilter.vue
- src/client/components/create/ceoSelection.ts
- src/client/components/create/CardsFilter.vue
- src/common/boards/boardOptions.ts
- src/common/models/BoardPreviewModel.ts
- src/common/app/paths.ts
- src/server/models/BoardPreview.ts
- src/server/models/ServerModel.ts
- src/server/routes/ApiBoardPreview.ts
- src/server/routes/ApiCreateGame.ts
- src/server/server/requestProcessor.ts
- tests/models/BoardPreview.spec.ts
- tests/models/ServerModel.spec.ts
- tests/client/wrybit/visuals/CatalogControls.spec.ts
- tests/client/wrybit/visuals/PlayersOverview.spec.ts
- tests/client/wrybit/visuals/PlayerTagsRefresh.spec.ts
- tests/client/wrybit/visuals/SortableCards.spec.ts
- tests/routes/ApiBoardPreview.spec.ts
- src/client/components/create/useBoardPreview.ts
- tests/client/components/create/**
- src/client/wrybit/visuals/common/PlayerCube.vue
- tests/client/wrybit/visuals/PlayerCube.spec.ts
- tests/client/wrybit/inputs/**
- tests/client/wrybit/create/**
- src/client/components/PaymentForm.vue
- src/client/components/SelectProjectCardToPlay.vue
- src/client/components/OrOptions.vue
- src/client/components/AndOptions.vue
- src/client/components/SelectCard.vue
- src/client/components/SelectAmount.vue
- src/client/components/SelectPayment.vue
- src/client/components/SelectInitialCards.vue
- src/client/components/SelectOption.vue
- src/client/components/SelectPlayer.vue
- src/client/components/SelectSpace.vue
- src/client/components/SelectDelegate.vue
- src/client/components/SelectParty.vue
- src/client/components/turmoil/Turmoil.vue
- src/client/components/turmoil/partyAgenda.ts
- tests/client/components/turmoil/Turmoil.spec.ts
- src/client/components/SelectColony.vue
- src/client/components/SelectProductionToLose.vue
- src/client/components/ShiftAresGlobalParameters.vue
- src/client/components/SelectGlobalEvent.vue
- src/client/components/SelectResource.vue
- src/client/components/SelectResources.vue
- src/client/components/SelectClaimedUndergroundToken.vue
- src/client/components/delta/DeltaProjectInput.vue
- src/client/components/PlayerInputFactory.vue
- src/client/components/common/ConfirmDialog.vue
- src/client/wrybit/visuals/TabPanelFooterSlot.vue
- src/client/wrybit/visuals/ShiftAresGlobalParameters.vue
- src/client/wrybit/visuals/PlayerHome.vue
- src/client/components/App.vue
- src/client/wrybit/shell/presentationViews.ts
- src/client/wrybit/shell/WrybitShell.vue
- tests/client/wrybit/shell/WrybitShell.spec.ts
- src/styles/wrybit/choice_block.less
- src/styles/wrybit/amount_slider.less
- src/styles/wrybit/selection_highlight.less
- src/styles/wrybit/resource_options.less
- src/styles/wrybit/player_options.less
- src/styles/wrybit/setup_columns.less
- src/styles/wrybit/setup_summary.less
- src/styles/wrybit/setup_start.less
- src/styles/wrybit/party_choice.less
- assets/wrybit/figures/**
- assets/wrybit/colony-planets/**
- src/styles/wrybit/colony_choice.less
- src/styles/wrybit/create/**
- src/styles/wrybit/create_game.less
- src/styles/wrybit/board.less
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

Последовательный handoff всех двадцати native input controllers нужен для завершения ввода: optional per-call responder сохраняет нынешний this.onsave по умолчанию, но позволяет Factory собрать ровно ответ текущего вызова. Возвращаемое завершение остаётся синхронным в classic; только допустимая подтверждаемая переплата Wrybit асинхронна. Общая SaveAttempt отменяется при изменении draft/ограничений/режима или уничтожении input. And собирает новый массив в исходном порядке и не отправляет stale/неполный responded[]. Это исполнение согласованных nested/payment UI, без изменения типов InputResponse, игровых правил/defaults/AI или серверного протокола. Дополнительные формы по-прежнему требуют полного source presentation и проверки.

Save completion scoped proof: 1182 client tests/246files,108 focused checks including all8 completion cases, Vue types/scoped lint and App-only Webpack passed. Real source overpayment dialog in App: +1, cancel retains titanium2, console0/0 and only GET/no move. Async completion cancels changed draft/ledger/unmount and ignores old/double accepts; And response stays complete and ordered. Source header intercepted the global classic button; layer fix awaits next browser pass. All T009-T012/full UI rows remain OPEN.

Input view cohort proof: native amount/option/delegate/player/resource/resources/production/event/token/Delta/Ares/space controllers now consume source bindings. Full1191client/250files, Vue types/scoped lint/style and App Webpack0warnings; browser source choices/default-off/classic-return3+Ti/console0/0 verified. Pointer focus bug found in browser, real RED/GREEN and4 scoped checks fix it; browser keyboard follow-up pending. Source forecasts/converter, placement zoom, colony/party, creation/initial, Or grouping, undo and mobile remain open. ConfirmDialog sequentially hands off only an explicit close method for classic/source placement transitions; no change to other callers. All T009-T012/full UI rows stay OPEN.

Initial selection scoped proof: source four columns/summary use our permanent selectors and existing calculations/validation/response. Twelve setup checks, full1194client/251files, types/scoped lint/style and App Webpack0warnings. Actual App1920x1080 ordinary picks show50,+3,-5,48; classic45/48 retained, console0/0. Source pointer+keyboard focus follow-up now passes in browser5->classic5. Local fixture GET only, no Start/move/DB. T009-T012/full rows remain OPEN: creation, colony/party, grouping/forecast/zoom/undo and remaining packages required.

Party/colony scoped proof: source cards/figures/planet assets use our agendas and colony metadata, retain native owners/responses and refresh. Actual App ordinary choices survive classic; console0/0. Full1197client/254files and types/lint/style/build passed; persona follow-up has RED/GREEN, affected3tests and rebuilt App. No foreign forecasts or trade rules. T009-T012 and full UI rows remain OPEN.

Creation presentation scoped proof: all62 readonly projected fields and28canonical expansions, source cards/columns/widgets/header icons/wiki; native methods/defaults/watchers/serializer/AI retained. Permanent native editors/ref/filter search/config survive layout changes; source submit body byte-equals native. One mode-key mutation killed then exact restoration green. Full1200client/256files, types/scoped lint/style/App build; real1920desktop/390phone, classic-return edits retained, console0/0, fresh default-off no optional assets, GET-only fixture. New source files below1000lines; existing native legacy owner remains large with unchanged methods. Grouping/content/board preview/share/inline custom lists and full rows/T009-T012 remain OPEN.

Creation grouping/preview scoped proof: source menu/content lines use our canonical public manifests, all28+base complete; six count/source groupings preserve own config and exact intercepted submit body. Actual App Corporations grouping, console0/0; focused5tests/4files, types/lint/style/App build. Pure preview contract separately verified with custom geometry/error/redraw/random-example label; no fake producer and no foreign boardSeed or backend import. Own preview/trait projections remain deferred and OPEN for integration, as do share/inline lists/full creation. No lifecycle transition or full row accepted.

Custom-list presentation scoped proof: source Show/Edit + real card previews + inline grouped filters wired to permanent native editors. All selections/replacements/availability/defaults stay native; exact native CEO default helper extracted. Six filter hosts keep identity/search through Show/Edit/classic. Actual App desktop/phone and classic return, console0/0; full1204client/259files green, types/lint/style/App build. Native Create methods/watchers/style unchanged. Full creation/WP03/21rows remain OPEN.

Card-search presentation scoped proof: source grid/search/remove/keyboard presentation bound to native catalogue/five-match search/batch parser/selection. Native input/ref permanent across modes. Real App1280x900 keyboard selection/classic return and final390x844 Enter selection with corrected isolated source spacing; console0/0. Full1205client/259files green, types/lint/style/App build. No creation/WP/full-row acceptance.

Native board preview scoped proof: real read-only route, own GameSetup factory and Server public space projection; exact native boardOptions extraction. Native form sends only public layout fields while source mode active, hides clone preview, cancels stale requests. No Game/Player/AI/DB/save changes. Real App+native handler D proof with Database/gameLoader fail-closed, normal native initialization, all200 and finalconsole0/0 at three viewports. Existing planet texture URL corrected. Full1208client/260files and71targeted server green, current Vue/test TS/scoped lint/style/App build; stale guard mutation killed/exactly restored. Sequential handoff of4prior visual test files and ServerModel test repairs7existing TS errors using canonical types; assertions preserved. Full custom visual/traits/share/create/start/WP03/21rows remain OPEN.

Expansion feature grouping scoped proof: all9source groupings use native surfaces/GlobalParameter/TileType + own card modules. Exact all28+base coverage in each grouping. All66numeric tile types audited, no unmapped live type; explicit Moon Mine vs Mine collision regression. Layout adds our HighOrbit/teams/VenusPhase2 panels; own special tile types included and fallback labelled Cards and variants. No foreign expansionFacts counts. Ninefocused/3files, types/lint/App build; actual App Board/NewTiles/GlobalParameters + final unobscured custom preview, console0/0. Prior full1208/260 remains baseline; full creation/share/input/review still OPEN.
