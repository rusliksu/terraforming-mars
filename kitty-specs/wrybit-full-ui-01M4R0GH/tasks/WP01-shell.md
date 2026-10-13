---
work_package_id: WP01
title: Режим и оболочка
dependencies: []
requirement_refs:
- FR-001
- FR-002
- FR-009
- NFR-001
planning_base_branch: codex/wrybit-full-ui
merge_target_branch: codex/wrybit-full-ui
branch_strategy: Planning artifacts for this mission were generated on codex/wrybit-full-ui. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into codex/wrybit-full-ui unless the human explicitly redirects the landing branch.
subtasks:
- T001
- T002
- T003
- T004
phase: Полный перенос интерфейса
history: []
agent_profile: implementer-ivan
authoritative_surface: src/client/wrybit/shell/
create_intent:
- src/client/wrybit/import-manifest.json
execution_mode: code_change
owned_files:
- .kittify/config.yaml
- tools/spec-kitty-review.cjs
- src/client/wrybit/shell/**
- src/client/wrybit/import-manifest.json
- src/client/components/App.vue
- src/client/utils/PreferencesManager.ts
- src/client/components/PreferencesDialog.vue
- tests/client/wrybit/shell/**
- docs/codemap/codemap.json
- docs/codemap/codemap.html
- docs/codemap/codemap.lock
priority: P1
role: implementer
tags: []
tracker_refs: []
---

# WP01 — Режим и оболочка

## ⚡ Сначала загрузить профиль

Перед исполнением загрузить профиль implementer-ivan через resolver-backed `spk-doctrine-profile-load`; сохранить текущие модель и настройки задачи. Вспомогательные агенты не запланированы. Перечитать применимые правила и подтверждённые spec/plan; пока план не одобрен человеком, реализация запрещена.

## Цель и входы

Доставить режим и оболочка в полном опциональном режиме Wrybit. Источник закреплён в spec.md: 988235122ffd61d8d1190e90beb2247afd252c00. Использовать наши текущие модели, протоколы, данные и обработчики. Контекст: spec.md, plan.md, contracts/ui-coverage.md и результат предшествующего пакета.

## Ответственность

Пути перечислены в owned_files. При необходимом изменении вне них сначала проверить отсутствие пересечения и зафиксировать точный перенос ответственности. Не отменять чужие изменения. Изменение правил, Game/Player, AI/SmartBot, карточных эффектов и сохранения запрещено.

Подготовка native SDK baseline/review включает `.kittify/config.yaml` и `tools/spec-kitty-review.cjs`: проект явно объявляет существующие npm-проверки server/client с настоящим JUnit-файлом. Эти пути не принадлежат другим WP. Команды запускаются с Node 22, `TM_NPM_CLI` на установленный npm CLI и временными каталогами на D:; настройки модели/агентов не меняются. Полная проверка UI и staging остаётся обязанностью WP07.

Первое изменение границы App → оболочка обновляет три codemap artifacts в том же code commit по CODING_STANDARDS.md. На этом последовательном шаге ответственность принадлежит WP01; итоговое расширение карты после полного переноса остаётся в WP07. Параллельной записи в эти файлы нет.

Baseline фиксирует все runtime-тесты server/client после штатной генерации static assets и клиентской сборки. `build:client` сам генерирует наши карточные данные и настоящий `sw.js`, который проверяет существующий HTTP-тест. Компиляция серверных/test типов, lint и полный build проверяются отдельно по критериям WP и WP07. Server runner ограничивает workers до восьми на машине с 16 логическими процессорами и использует конечный timeout 30 секунд на тест, сохраняя весь набор и assertions. Длительность каждой команды записывается в журнал: прежний запуск с четырьмя workers прерван штатным пределом capture в 300 секунд и сохранён отдельно. При восьми workers все 12691 runtime-тестов завершились; единственная ошибка отсутствующего `sw.js` сохранена до добавления штатной подготовки клиентской сборки.

## Подзадачи

- [ ] T001 Классифицировать все исходные компоненты и закрепить manifest.
- [ ] T002 Изолировать загрузку UI, стилей и ресурсов.
- [ ] T003 Подключить переключатель и контекст текущего ввода к нашему App.
- [ ] T004 Проверить default, отказ загрузки, возврат и обновление.

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

Не копировать чужой контроллер сети/AI; не рассчитывать цены и доступность независимыми правилами; не маскировать отсутствующие поля приведением типов или выдуманными значениями; не смешивать стили двух режимов; не раскрывать административную статистику; не терять контекст формы при polling/переключении. Любая необходимость изменить игровую логику возвращается на отдельное решение.
