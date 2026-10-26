# План реализации: порт сохранения `Game`

**Ветка**: `codex/tm-game-save-port` | **Дата**: 2026-08-06 | **Spec**: `spec.md`

## Текущий путь по исходникам и codemap

### Что вызывает `Game`

- `ApiCreateGame` и `ApiQuickGame` создают игру через `Game.newInstance(...)`.
- `GameLoader`, `Cloner`, replay/simulation и тесты восстанавливают игру через `Game.deserialize(...)`.
- Route `src/server/routes/PlayerInput.ts` вызывает `player.process(entity)`; игровая логика через `Player` и методы `Game` вызывает `Game.save()` на фазовых/ходовых границах.
- Внутри `Game` сохранение вызывается, в частности, при переходах research-фазы и перед продолжением final greenery.

### Что затрагивает `Game.save()`

- Сейчас тело метода напрямую получает `GameLoader.getInstance()` и вызывает `saveGame(this)`.
- `GameLoader.saveGame()` делегирует в `Database.getInstance().saveGame(game)`.
- Возвращённый `Promise` записывается в `game.saveGamePromise`.
- `PlayerInput` сравнивает старый и новый `saveGamePromise` и ждёт новый Promise перед ответом.
- При `simulationMode` метод возвращается до persistence.

### Какие тесты покрывают путь сейчас

- `tests/routes/PlayerInput.spec.ts`: проверяет ожидание сохранения перед ответом.
- `tests/database/GameLoader.spec.ts`: проверяет save/load lifecycle и ожидание `game.saveGamePromise` в ряде сценариев.
- `tests/Game.spec.ts`: покрывает общие инварианты `Game`, включая simulation end path, но не изолирует три обязательных инварианта самого `Game.save()`.

Codemap создан от product commit `85e93d58c581e676af96474255391f4c5ffda09d`; текущий task base добавляет только codemap commit `73e08f31bab8a188193e6972568922b187eb95d3`, поэтому product fingerprints актуальны до будущей правки.

## Дизайн

Ввести минимальный контракт функции:

```ts
type SaveGame = (game: IGame) => Promise<void>;
```

`Game` хранит внедрённую функцию как несерилизуемую зависимость экземпляра. `Game.save()` сохраняет существующий early return для simulation и присваивает `saveGamePromise` результату одного вызова функции.

Runtime wiring выполняется на существующих application boundaries создания/загрузки игры: route использует доступный `ctx.gameLoader`, а `GameLoader` — собственный `saveGame`. Для многочисленных существующих внутренних/test фабрик допускается минимальный совместимый default adapter на текущий loader; он не используется телом `Game.save()` и не меняет публичные route-сигнатуры. После characterization tests точная форма options-параметра выбирается по принципу наименьшего diff.

## Структура изменений

```text
src/server/Game.ts                       # контракт и делегирование Game.save()
src/server/routes/ApiCreateGame.ts       # минимальный runtime wiring, если требуется
src/server/routes/ApiQuickGame.ts        # минимальный runtime wiring, если требуется
src/server/database/GameLoader.ts        # wiring для restored games, если требуется
tests/Game.spec.ts                       # characterization tests
tests/routes/PlayerInput.spec.ts         # существующий route-инвариант
tests/database/GameLoader.spec.ts        # существующий loader-инвариант
docs/codemap/codemap.{html,json,lock}    # обновлённая dependency boundary
```

Список production-файлов уточняется после тестового spike; лишние boundary-файлы не менять.

## Риски и меры

- **Потеря identity Promise**: отдельный тест сравнивает объект Promise по ссылке.
- **Simulation persistence**: отдельный тест проверяет ноль вызовов и неизменный Promise.
- **Неправильное wiring при deserialize**: targeted `GameLoader` tests проверяют восстановленную игру.
- **Случайное расширение scope**: diff не должен затрагивать end-game/ELO/undo/results/deferred-actions.
- **Устаревший codemap**: все три generated файла обновляются и проверяются вместе.

## Gates

1. До кода: подтверждён этот baseline; worktree/branch/base clean относительно planning artifacts.
2. Tests-first: characterization tests воспроизводят текущие инварианты до structural change.
3. Реализация: минимальный function contract, без нового поведения и без широкого interface.
4. Targeted: `Game.spec.ts`, `routes/PlayerInput.spec.ts`, `database/GameLoader.spec.ts`.
5. Project: релевантные `npm` build/type/lint/test команды по фактическому diff.
6. Codemap: regenerated HTML/JSON/lock, evidence и fingerprints согласованы.
7. Delivery: diff review, commit в task-ветке; push/PR/merge только после всех проверок. Deploy отсутствует.

## Решение по сложности

Один порт, один рабочий пакет, без repository/facade/framework. Это минимальная миграционная ступень; дальнейшие singleton-зависимости остаются явно вне scope.

## Фактическое выполнение

- Реализованы characterization-тесты normal/simulation save и сохранён существующий `PlayerInput` wait path.
- Введён `SaveGame`, добавлено wiring на create/load boundaries; end-game/ELO/undo/results и deferred-actions не менялись.
- Targeted tests, server lint/build и полный server test suite пройдены; три codemap-файла регенерируются после фиксации исходного снимка.
