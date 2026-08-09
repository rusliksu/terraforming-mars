# Спецификация: порт сохранения `Game`

**Ветка**: `codex/tm-game-save-port`
**Создано**: 2026-08-06
**Статус**: Реализовано, итоговая проверка

## Цель

Разорвать прямой вызов `GameLoader.getInstance().saveGame(this)` внутри `Game.save()` через узкую внедряемую функцию сохранения, не меняя наблюдаемое игровое поведение.

## Сценарий пользователя

### US-001 — Сохранение после действия остаётся прозрачным (P1)

Сервер принимает действие игрока, сохраняет новое состояние и отвечает по прежнему route-контракту. Внутренний способ получения persistence-зависимости меняется, но порядок и результат не меняются.

**Независимая проверка**: characterization tests для `Game.save()` и существующий route-test `PlayerInput` проходят без изменения HTTP-модели.

**Критерии приёмки**:

1. При обычном `Game.save()` внедрённая функция вызывается ровно один раз с текущим `Game`, а `saveGamePromise` хранит тот же возвращённый `Promise`.
2. При `simulationMode === true` persistence-функция не вызывается и `saveGamePromise` не заменяется.
3. Если обработка `PlayerInput` создаёт новый `saveGamePromise`, route ждёт именно его до формирования ответа.
4. Существующие сигнатуры HTTP route и сериализуемая модель игры не меняются.

## Требования

| ID | Требование | Приоритет | Статус |
|---|---|---:|---|
| FR-001 | `Game.save()` делегирует сохранение через внедрённую функцию/порт, а не получает singleton в теле метода. | P1 | Выполнено |
| FR-002 | `saveGamePromise` сохраняет идентичность `Promise`, возвращённого портом. | P1 | Выполнено |
| FR-003 | `simulationMode` по-прежнему полностью пропускает persistence. | P1 | Выполнено |
| FR-004 | `PlayerInput` по-прежнему ждёт новый save перед ответом. | P1 | Выполнено |
| NFR-001 | Изменение не добавляет новых runtime-зависимостей и не меняет формат сохранений. | P1 | Выполнено |
| NFR-002 | Targeted tests и релевантная локальная проверка завершаются без ошибок. | P1 | Выполнено |

## Ограничения и не-цели

- Не менять `gotoEndGame`, `completeGame`, ELO, undo, `Database.saveGameResults`.
- Не затрагивать цикл `deferred-actions ↔ Player ↔ Game`.
- Не менять игровую логику, route contract, сериализацию и DB schema.
- Не делать staging/prod deploy.
- Не расширять контракт дальше функции вида `(game: IGame) => Promise<void>` без доказанной необходимости.
- Обновить `docs/codemap/codemap.html`, `codemap.json`, `codemap.lock` вместе с кодом, потому что меняется dependency boundary.

## Измеримый результат

- Прямого singleton-вызова в `Game.save()` нет.
- Все три characterization-инварианта покрыты тестами.
- Узкие `Game`, `PlayerInput`, `GameLoader` проверки зелёные.
- Codemap отражает новый порт и проходит проверку fingerprints/evidence.

## Фактический результат

- В `Game.save()` используется внедрённый `SaveGame`; совместимый default adapter оставляет существующие фабрики рабочими.
- Wiring добавлен на create/load boundaries; HTTP route contract, `saveGamePromise` и сериализация не изменены.
- Запущены `Game`, `PlayerInput`, `GameLoader`, server lint/build и полный server test suite.
