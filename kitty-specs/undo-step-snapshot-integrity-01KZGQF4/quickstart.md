# Quickstart: проверка исправления step undo

## Focused RED/GREEN

```powershell
npx mocha --import=tsx --require tests/testing/setup.ts tests/server/game/ActionReplay.spec.ts
```

До production edit новые regressions должны показать изменение root snapshot и двойной вклад. После исправления весь файл должен быть зелёным.

## Static and build gates

```powershell
npm run lint:server
npm run build:tests
git diff --check
```

Если repo scripts требуют сгенерированный asset baseline, failure классифицируется отдельно; gate не считается зелёным до успешного rerun в корректной среде.

## Review checklist

- Production edit локализован в `ActionReplay.ts`.
- `Game.serialize()` и обычный undo не изменены.
- Existing Project Eden и Hi-Tech Lab cases зелёные.
- Architecture doc явно говорит, что root detached и immutable.
- Diff содержит только mission, test, ActionReplay и design-doc файлы.

