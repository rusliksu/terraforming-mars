## Контекст

`tm-sim-host` хранит forked game snapshots за непрозрачными TTL-bound `branchHandle` и уже умеет продолжать их через `continue_batch_v1` с проверками observer, knowledge mode, state version и prompt fingerprint. Сейчас snapshot сохраняется только после stable main-action boundary. Поэтому placement и другие intra-action prompts возвращают достаточный transient actor context, но теряют саму ветвь. Focused regression дополнительно подтвердил, что `Game.serialize()` намеренно не сохраняет `waitingFor`: сохранение только текущего unstable snapshot выдаёт handle, который при continue сразу становится stale.

Privacy-safe диагностика merged SmartBot beam на 10 сохранённых позициях насчитала 40 результатов `successor_not_stable_main_action_boundary`: 33 без warning о deferred actions и 7 с ним. Из всех 40 результатов 24 заканчивались на `space`; остальные распределились между `colony`, `player`, `card`, `party` и вложенными `or`. Семь отдельных `error` остаются вне этого change.

## Цели / Вне целей

**Цели:**

- разрешить вызывающей стороне продолжить успешную simulation-ветвь с известным следующим prompt;
- сохранить stale/privacy/isolation-инварианты существующего handle store;
- оставить deferred и неоднозначные состояния fail-closed;
- предоставить узкий server-side контракт для следующего compare-only advisor change.

**Вне целей:**

- автоматический выбор ответа на вложенный prompt внутри сервера;
- обработка ветвей с `game.deferredActions.length > 0`;
- исправление семи simulator errors из диагностической выборки;
- изменение SmartBot scoring, beam budget, recommendation, execution authority или live gameplay;
- staging/prod deploy или restart.

## Решения

1. Для unstable prompt переиспользуется существующий `replayActionInputs`: handle хранит восстановимый root snapshot и цепочку уже fingerprint-проверенных exact inputs. При каждом continue host заново воспроизводит эту цепочку, проверяет текущий prompt и добавляет новый input. После stable main-action boundary цепочка снова сворачивается в обычный текущий snapshot без entries.
2. Stored branch дополнительно фиксирует ожидаемый `promptActorId`. `continue_batch_v1` принимает продолжение только от этого actor; несовпадение возвращает отдельный fail-closed warning и не исполняет input.
3. Nullable JSON-поле `branchHandle` и существующие request/response types не меняются. Это additive-семантика: часть ранее `null` результатов получает непрозрачный handle.
4. Host не интерпретирует prompt и не вызывает политику SmartBot. Downstream consumer получает `simulationActor`, строит точный input своей политикой и отправляет его отдельным `continue_batch_v1`.
5. Ветвь с deferred actions не сохраняется даже при известном prompt. Поддержка deferred queue требует отдельной модели порядка разрешения и не должна попадать в минимальный контракт.

Отклонённые варианты:

- `replayContinuations` в исходном fork-запросе не подходит: caller ещё не видел возникший вложенный prompt и не может безопасно заранее сформировать fingerprint/input.
- Автоматический server-side выбор prompt нарушил бы границу между server physics и advisor policy.
- Сохранение deferred queue в этом change расширило бы blast radius без отдельного доказательства порядка разрешения.

## Риски / Компромиссы

- [Handle теперь может представлять intra-action, а не только main-action state] → сохранить явный `stableMainActionBoundary` и требовать от consumer проверять его перед main-action scoring.
- [Replay может перестать быть детерминированным после изменения server physics] → `replayActionInputs` проверяет fingerprint каждого шага и завершает ветвь fail-closed при mismatch.
- [Caller может прислать actor другого prompt] → хранить ожидаемый `promptActorId` и отклонять mismatch до исполнения input.
- [Рост числа временных snapshots] → переиспользовать существующие TTL, purge и `maxStoredBranches`; новый бесконечный cache не создавать.
- [Deferred state может выглядеть resumable] → при непустой deferred queue всегда оставлять `branchHandle: null` и warning.
- [Server change сам по себе не улучшит beam] → после merge подготовить отдельный `tm-advisor` change с caller-owned intra-action loop и paired compare-only evidence.

## План применения

1. Добавить focused host tests для unstable/no-deferred resume, actor mismatch и deferred fail-closed.
2. Реализовать минимальное расширение stored branch и условия сохранения.
3. Запустить `npm run test:sim-host`, затем релевантные server/type/lint gates.
4. Архивировать OpenSpec и доставить server change отдельным task-owned PR без deploy.
5. После merge создать отдельный OpenSpec в `tm-advisor` для consumer wiring и повторить paired 10+10 compare-only smoke.

Откат: revert server PR. Старые consumers совместимы, потому что форма ответа не меняется и они уже обязаны ориентироваться на `stableMainActionBoundary`.

## Открытые вопросы

Нет для server-side этапа. Deferred actions и advisor consumer intentionally вынесены в отдельные изменения.
