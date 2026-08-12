# Модель данных

## Game surrender state

- `surrenderedPlayerIds`: persisted множество человеческих мест, которые
  необратимо переданы боту.
- Инвариант: ID из этого множества не добавляется в `botPlayerIds`.
- Инвариант: surrender-state не исключает место из research/action/solar/final
  greenery flows.

## Runtime bot state

- `BotTakeoverEntry`: runtime child process для конкретного `gameId/playerId`.
- Source of truth для необходимости процесса — persisted surrender-state.
- При старте сервера reconciliation создает отсутствующий process; повторный
  запуск должен быть идемпотентным.

## Completion outcome

- `completed`: человек продолжал сам.
- `surrendered`: место доигрывал бот после явной сдачи; leave не увеличивается.
- `left`: подтвержденный `abandoned`; leave увеличивается.

Приоритет ранжирования: `completed (0)`, `surrendered (1)`, `left (2)`. Внутри
одного приоритета — VP descending, затем MC descending; полная равенство дает
совместное место.

## Переходы

```text
human-controlled
  ├─ cancel confirmation → human-controlled
  ├─ bot start/save error → human-controlled + visible error
  └─ confirmed + persisted + bot active → surrendered-bot-controlled

surrendered-bot-controlled
  ├─ server restart → persisted surrendered → reconcile bot → surrendered-bot-controlled
  └─ game end → completionOutcome=surrendered
```

`abandoned` не выводится из runtime transition в этой mission и поступает как
отдельно подтвержденный rating/ops outcome.
