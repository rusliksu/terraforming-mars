## Почему

Локальный compare-only beam-прогон на 10 сохранённых позициях остановил 40 ветвей на незавершённом игровом действии: 33 из них уже имели следующий prompt и не имели deferred actions, но `tm-sim-host` возвращал `branchHandle: null` только потому, что граница ещё не была main-action. Из-за этого вызывающая сторона не может безопасно досимулировать placement, colony, player, card или другой вложенный выбор до следующей main-action boundary.

## Что изменится

- `tm-sim-host` будет возвращать временный `branchHandle` для успешной нестабильной ветви, если известны actor и fingerprint следующего prompt и очередь deferred actions пуста.
- Продолжение через такой handle сохранит существующие проверки observer, knowledge mode, state version, actor и prompt fingerprint.
- Ветви с deferred actions, отсутствующим prompt actor/fingerprint, ошибкой или stale-состоянием останутся fail-closed без handle.
- Сервер не будет выбирать ответ на вложенный prompt автоматически; выбор останется ответственностью вызывающей стороны.
- Gameplay, live API, scoring, recommendation и execution authority не изменятся.

## Возможности

### Новые возможности

- `simulation-branch-resume`: безопасное пошаговое продолжение незавершённой simulation-ветви до стабильной main-action boundary.

### Изменённые возможности

- Нет.

## Влияние

- Код: `src/server/tools/tm-sim-host.ts`.
- Тесты: `tests/server/tools/TmSimHost.spec.ts`.
- Контракт: additive-семантика существующего nullable `TmSimBranchResultV1.branchHandle`; форма JSON и типы запросов не меняются.
- Downstream: отдельный последующий change в `tm-advisor` сможет использовать handle для caller-owned intra-action continuation; этот change не включает consumer wiring и не меняет SmartBot runtime.
- Deployment: отсутствует; prod/staging restart или deploy не входят в scope.
