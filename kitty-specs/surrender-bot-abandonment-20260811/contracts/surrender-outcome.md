# Контракт surrender outcome

## Вход

- Игрок находится в multiplayer game и управляет собственным player link.
- Surrender подтвержден в текущем action prompt.
- Игрок не является изначально автоматическим участником и еще не surrendered.

## Успех

- Option/button и confirmation до отправки действия явно сообщают, что место
  продолжит бот.
- HTTP/player-input response остается успешным.
- Persisted game содержит player ID в `surrenderedPlayerIds`.
- Runtime manager показывает активного бота за тот же player ID.
- Audit содержит `surrender_accepted` и результат запуска/reconciliation без
  секретных полей.
- Следующий обязательный prompt обслуживается ботом.

## Ошибка

- Ответ сообщает понятную причину.
- Persisted surrender-state и runtime bot state возвращены к исходному виду.
- Human player может продолжить игру или повторить Surrender.

## Completion summary

Completed-game payload различает:

```json
{
  "completionOutcome": "completed | surrendered | left",
  "place": 1,
  "vp": 0
}
```

`left` является storage-совместимым представлением доменного `abandoned`.
