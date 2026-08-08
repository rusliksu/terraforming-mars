# Research: целостность root snapshot

## Решение: clone на границе ActionReplay

- **Decision**: глубоко отделять `game.serialize()` ровно при создании `ActionReplayState.rootSnapshot`.
- **Rationale**: `ActionReplay` владеет требованием неизменяемого root; обычные сохранения уже проходят JSON boundary, а изменение всех сериализаторов расширило бы blast radius.
- **Alternatives considered**:
  - deep clone внутри `Game.serialize()` — глобальное изменение производительности и semantics всех callers;
  - копирование только известных полей — оставляет dormant aliases и воспроизводит whack-a-field класс;
  - freeze root — обнаружит мутацию, но не отделит живые объекты и может ломать live action.

## Решение: JSON round-trip

- **Decision**: использовать JSON-compatible clone, согласованный с существующим `replayActionInputs`.
- **Rationale**: `SerializedGame` уже является JSON persistence contract; dates, maps и class instances в этом значении не требуются.
- **Alternatives considered**:
  - `structuredClone` — новый runtime assumption и другой serialization contract;
  - сторонняя clone library — ненужная зависимость.

## Подтверждённый blast radius

Shallow aliases найдены для `gameLog`, `globalParameterSteps`, `removingPlayers`, Underworld/Ares/Delta state, colony occupants, Pathfinders VP ledger, selected card `data`, Gagarin/St. Joseph arrays и части tile metadata. Исправление на root boundary покрывает их совместно; тестовая матрица использует incident flow плюс один nested-state sentinel, а не отдельный тест на каждое поле.

## Delivery decision

- **Decision**: код доставляется task-owned PR в `main`; staging возможен только после merge exact `origin/main`, prod исключён без отдельной команды.
- **Rationale**: соответствует TM deployment gates и не смешивает исправление с live rollout.

