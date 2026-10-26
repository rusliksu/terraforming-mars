# simulation-branch-resume Specification

## Purpose
TBD - created by archiving change resume-unstable-simulation-branches. Update Purpose after archive.
## Requirements
### Requirement: Возобновляемая незавершённая simulation-ветвь
`tm-sim-host` SHALL возвращать непрозрачный временный `branchHandle` после успешного input, если следующий prompt имеет однозначного actor и fingerprint, а очередь deferred actions пуста, даже когда `stableMainActionBoundary` равен `false`.

#### Scenario: Вложенный prompt без deferred actions
- **WHEN** успешный fork или continue заканчивается на intra-action prompt с известными actor и fingerprint и пустой deferred queue
- **THEN** результат содержит ненулевой `branchHandle`, `stableMainActionBoundary: false`, следующий `activePlayerId`, `promptFingerprint` и запрошенный transient `simulationActor`

#### Scenario: Продолжение вложенного prompt
- **WHEN** caller отправляет `continue_batch_v1` с выданными state version, handle, actor и prompt fingerprint и legal input
- **THEN** host исполняет input на сохранённой ветви и возвращает следующий результат по обычному контракту, включая новый handle, если состояние снова возобновляемо

### Requirement: Fail-closed границы возобновления
`tm-sim-host` MUST не выдавать и не исполнять resumable handle, когда состояние не удовлетворяет isolation и determinism-инвариантам.

#### Scenario: Непустая deferred queue
- **WHEN** после input в simulation-ветви остаются deferred actions
- **THEN** результат содержит `successor_has_deferred_actions` и `branchHandle: null`

#### Scenario: Неизвестный следующий prompt
- **WHEN** после input невозможно определить actor или fingerprint следующего prompt
- **THEN** результат содержит `branchHandle: null`

#### Scenario: Actor continuation не совпадает
- **WHEN** `continue_batch_v1.actorId` не совпадает с actor, сохранённым для handle
- **THEN** host возвращает fail-closed unsupported result и не исполняет input

#### Scenario: Stale или изолированная ветвь
- **WHEN** observer, knowledge mode, state version или prompt fingerprint не совпадает с сохранённым контекстом
- **THEN** host сохраняет существующее unsupported/stale поведение и не исполняет input

### Requirement: Отсутствие server-side policy
`tm-sim-host` MUST только хранить и продолжать simulation state и MUST не выбирать ответ на вложенный prompt от имени caller.

#### Scenario: Выдача resumable handle
- **WHEN** host возвращает handle для нестабильной ветви
- **THEN** состояние не продвигается дальше до отдельного legal input от caller
