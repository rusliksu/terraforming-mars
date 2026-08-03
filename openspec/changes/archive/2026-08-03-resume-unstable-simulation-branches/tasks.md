## Общие ограничения

- JSON-форма `TmSimBranchResultV1`, `ForkBatchV1` и `ContinueBatchV1` остаётся совместимой; `branchHandle` остаётся nullable и непрозрачным.
- Handle для нестабильной ветви допустим только при успешном результате, известных `promptActorId` и `nextFingerprint` и `game.deferredActions.length === 0`.
- `continue_batch_v1` не исполняет input при mismatch observer, knowledge mode, state version, сохранённого prompt actor или prompt fingerprint.
- `tm-sim-host` не выбирает intra-action input и не импортирует SmartBot/advisor policy.
- Scoring, recommendation, execution authority, live gameplay, staging/prod deploy и restart не меняются.

## 1. Проверяемый resumable-контракт

- [x] 1.1 Добавить focused regression, где main-action launcher создаёт нестабильный prompt без deferred actions, возвращает handle и legal `continue_batch_v1` продвигает ту же ветвь.
  - Интерфейсы: `ForkBatchV1` → `TmSimBranchResultV1.branchHandle`, `activePlayerId`, `promptFingerprint`, `stableMainActionBoundary` → `ContinueBatchV1`.
  - Проверка: `npm run test:sim-host` сначала падает на прежнем `branchHandle: null`, затем проходит после реализации.
- [x] 1.2 Закрепить fail-closed сценарии для actor mismatch и непустой deferred queue.
  - Интерфейсы: сохранённый `promptActorId` + `ContinueBatchV1.actorId` → unsupported warning; `game.deferredActions.length > 0` → `branchHandle: null`.
  - Проверка: `npm run test:sim-host` подтверждает отсутствие исполнения input и отсутствие handle в запрещённых состояниях.

## 2. Минимальная реализация host

- [x] 2.1 Расширить внутренний stored branch ожидаемым prompt actor и разрешить `storeBranch` для успешной нестабильной ветви только при известных actor/fingerprint и пустой deferred queue.
  - Интерфейсы: `continuationPromptActorIdV1`, `promptFingerprintFromWaitingFor`, `StoredBranch`, `storeBranch` → существующий nullable `TmSimBranchResultV1.branchHandle`.
  - Проверка: `npm run test:sim-host`.
- [x] 2.2 Проверять `ContinueBatchV1.actorId` против actor, сохранённого для handle, до десериализации и исполнения input.
  - Интерфейсы: `StoredBranch.promptActorId` + `ContinueBatchV1.actorId` → fail-closed `unsupportedResult` при mismatch.
  - Проверка: focused actor-mismatch test из задачи 1.2 и `npm run test:sim-host`.

## 3. Gates и доставка

- [x] 3.1 Запустить focused и пропорциональные server gates без изменения runtime/deploy.
  - Проверка: `npm run test:sim-host`, `npm run lint:server`, `npm run build:server`.
- [x] 3.2 Повторить русскоязычную и strict OpenSpec-проверки, отметить только доказанно завершённые задачи и архивировать change в тот же task-owned PR.
  - Проверка: `C:\Users\Ruslan\.codex\maintenance\Test-OpenSpecRussian.ps1 -ChangePath openspec\changes\resume-unstable-simulation-branches`; `openspec validate resume-unstable-simulation-branches --strict --no-interactive`; после реализации `openspec archive resume-unstable-simulation-branches --yes` и повторный `openspec validate --all --strict --no-interactive`.
