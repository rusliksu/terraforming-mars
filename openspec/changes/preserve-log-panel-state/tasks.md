## Общие ограничения

- Только custom-server client UI; API, server-side visibility и данные игры не меняются.
- Состояние хранится только в памяти вкладки, без новых зависимостей и `localStorage`.
- `playerkey` и lifecycle всего `PlayerHome` не меняются.
- Push, staging и prod deploy не входят в этот пакет.

## 1. Состояние и управление логами

- [x] 1.1 Зафиксировать и согласовать scope, требования и минимальный дизайн.
  - Проверка: `npx --yes @fission-ai/openspec@latest validate preserve-log-panel-state --strict --no-interactive`
- [x] 1.2 Сохранить и восстановить UI-state `LogPanel` для одного `ParticipantId` между unmount и mount.
  - Интерфейсы: `LogPanelModel`, lifecycle hooks и `loadLogs(...)` → восстановленные mode/filter/scroll/auto-follow.
  - Проверка: focused-тест размонтирует и повторно монтирует `LogPanel` с тем же `ParticipantId`.
- [x] 1.3 Добавить `Latest logs` и перенести компактные фильтры под `.log-panel`.
  - Интерфейсы: `showLatestLogs()` → `selectedRecentLimit = 100`, `selectedPlayerColor = undefined`, `stickToBottom = true`, `getRecentLogs(true)`.
  - Проверка: focused-тест проверяет сброс режима/фильтра и прокрутку вниз.

## 2. Проверка результата

- [x] 2.1 Выполнить focused `LogPanel` tests, client/CSS lint, build и `git diff --check`.
  - Проверка: все команды завершаются с exit code 0, а diff ограничен scoped client/test/OpenSpec paths.
- [x] 2.2 Синхронизировать OpenSpec и Bead с фактическим проверенным результатом.
  - Интерфейсы: проверенный diff → закрытые checkbox и статус `tm-ai-qxc`.
  - Проверка: strict OpenSpec validation и `bd show tm-ai-qxc --json`.
