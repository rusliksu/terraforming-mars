# Проверяемый сценарий

1. Создать или использовать локальную multiplayer игру с двумя игроками.
2. Подтвердить `Surrender and start bot` за активного игрока.
3. Проверить persisted `surrenderedPlayerIds`, публичный красный log и marker
   `BOT` у места.
4. Открыть player/spectator view и убедиться, что marker виден без приватных
   полей.
5. В fixture с `isTerraformed=true` проверить, что `MARS ✓` находится перед
   player panel, а не в дальнем правом конце top bar.
6. Проверить, что `Surrender and start bot` отделен по вертикали от обычных
   действий, а переход к takeover по-прежнему требует отдельного confirmation.
7. Запустить focused tests, typecheck/build и diff review.

Не менять текущую live-игру `gcb418d0e277f` и не выполнять deploy.
