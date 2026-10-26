# Data model: ActionReplay snapshot lifecycle

## ActionReplayState

- `rootSnapshot: SerializedGame` — immutable value состояния перед первым replayable input.
- `entries: ActionInputEntry[]` — принятые deterministic inputs после root.
- `currentActorId` и `currentPromptFingerprint` — guard текущего prompt.
- `resetBeforeNextInput` — lifecycle marker нового root.
- `lastStepBackLogStartIndex` — граница canceled log entries.

## Инварианты

1. После присвоения `rootSnapshot` ни одна live mutation не изменяет любое достижимое из него JSON-значение.
2. Каждый replay получает собственную mutable копию root перед `Game.deserialize()`.
3. `entries` описывают единственный источник изменений между root и текущим prompt.
4. Step-back удаляет один логический suffix entries и не меняет root.
5. Hidden-information validation сравнивает observable restored state и остаётся независимой от способа clone.

## Переходы

```text
no journal -> capture detached root -> record accepted entries
recorded entries -> replay all for validation -> replay prefix -> restored live game
invalid prompt/actor -> invalidated journal
completed action -> reset before next input -> new detached root
```

## Неизменённые модели

`SerializedGame`, `Game.serialize()`, persisted saves, API payloads и database schema не меняются.

