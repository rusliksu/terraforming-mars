---
description: "Рабочий пакет узкого порта сохранения Game"
---

# Рабочие пакеты: порт сохранения `Game`

**Bead**: `tmgsp-s7h`

## WP01 — Characterization, порт и проверка (P1)

**Цель**: заменить singleton lookup только внутри пути `Game.save()` минимальной внедряемой функцией без изменения поведения.

**Независимая проверка**: три characterization-инварианта, route ожидания и loader lifecycle проходят; codemap согласован с diff.

**Prompt**: `tasks/WP01-game-save-port.md`
**Требования**: FR-001, FR-002, FR-003, FR-004, NFR-001, NFR-002

### Подзадачи

- [x] T001 Добавить в `tests/Game.spec.ts` тест normal save: один вызов и identity Promise.
- [x] T002 Добавить в `tests/Game.spec.ts` тест simulation mode: ноль persistence-вызовов и неизменный Promise.
- [x] T003 Подтвердить/усилить в `tests/routes/PlayerInput.spec.ts` ожидание нового `saveGamePromise` без изменения route contract.
- [x] T004 Ввести минимальный `SaveGame` function contract и внедрить его в `Game`.
- [x] T005 Выполнить минимальное runtime wiring на существующих create/load boundaries; не менять end-game/ELO/undo/results.
- [x] T006 Запустить targeted `Game`, `PlayerInput`, `GameLoader` tests.
- [x] T007 Регенерировать `docs/codemap/codemap.html`, `codemap.json`, `codemap.lock` и проверить evidence/fingerprints.
- [x] T008 Запустить релевантную локальную project-проверку, сверить scope diff и остаточные риски.

### Зависимости

- T001–T003 предшествуют T004–T005.
- T006–T008 выполняются после реализации.
- Параллельной записи нет: рабочий пакет затрагивает один dependency seam.

### Риски

- Слишком широкий constructor/options diff — сократить контракт до функции и сохранить совместимость фабрик.
- Незаметная смена Promise semantics — блокируется T001 и T003.
- Codemap drift — блокируется T007.

## Покрытие требований

| Требование | Подзадачи |
|---|---|
| FR-001 | T004, T005 |
| FR-002 | T001, T004 |
| FR-003 | T002, T004 |
| FR-004 | T003, T006 |
| NFR-001 | T005, T008 |
| NFR-002 | T006, T007, T008 |
