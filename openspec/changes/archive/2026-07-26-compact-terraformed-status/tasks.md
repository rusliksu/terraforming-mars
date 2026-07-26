## Общие ограничения

- Условие отображения остаётся `playerView.game.isTerraformed`; game state, end-game flow, scoring и server API не меняются.
- Компонент остаётся `TerraformedBanner` с обязательным prop `playerId` и существующим `consumeFirstBannerShow(playerId)`.
- Видимая подпись compact chip — `MARS ✓`; полный `$t('Mars is Terraformed!')` используется в `title` и `aria-label`.
- Chip находится внутри `.top-bar`, использует `flex: 0 0 auto` и не создаёт отдельную полноширинную строку.
- Entrance animation может менять только scale, opacity и glow; layout translation запрещён.
- Новые dependencies и изменения локализаций не допускаются.

## 1. Реализовать compact status-chip

- [x] 1.1 Переместить условный `TerraformedBanner` внутрь `.top-bar` рядом с `PlayerInfo`, сохранив прежнее условие и `playerId`.
  - Интерфейсы: `PlayerViewModel.game.isTerraformed` + `PlayerViewModel.id` → один `TerraformedBanner` внутри `.top-bar`.
  - Проверка: focused `TopBar.spec.ts` подтверждает размещение при `true` и отсутствие при `false`.
- [x] 1.2 Обновить markup `TerraformedBanner.vue` до compact `MARS ✓` status-chip с локализованными `title`/`aria-label` и `role="status"`, не меняя storage contract.
  - Интерфейсы: `playerId: PlayerId` + `$t('Mars is Terraformed!')` → доступный compact status-chip.
  - Проверка: focused `TerraformedBanner.spec.ts` проверяет label, доступные атрибуты и animated class.
- [x] 1.3 Заменить полноширинные стили и `slide-down` на compact flex-chip и one-time scale/glow animation без layout shift.
  - Интерфейсы: `.terraformed-banner` + `.terraformed-banner--animated` → chip около 80 px внутри высоты top bar.
  - Проверка: `npm run lint:css`.

## 2. Зафиксировать regression coverage

- [x] 2.1 Расширить `tests/client/components/TopBar.spec.ts` сценариями `isTerraformed=true/false` и DOM ownership внутри `.top-bar`.
  - Проверка: `npx cross-env NODE_ENV=development mochapack --require tests/client/components/setup.ts tests/client/components/TopBar.spec.ts`.
- [x] 2.2 Расширить `tests/client/components/TerraformedBanner.spec.ts` accessible presentation и first/repeat animation semantics.
  - Проверка: `npx cross-env NODE_ENV=development mochapack --require tests/client/components/setup.ts tests/client/components/TerraformedBanner.spec.ts`.

## 3. Проверить сборку и внешний вид

- [x] 3.1 Запустить client typecheck, focused tests и production client build.
  - Проверка: `npm run lint:client && npm run test:client && npm run build:client`.
- [x] 3.2 Выполнить browser smoke end-state на desktop и узком viewport: chip находится в top bar, отдельной полосы нет, console errors отсутствуют.
  - Проверка: два screenshot и DOM rect evidence для `.top-bar`/`.terraformed-banner`, console log без новых `error`.

## 4. Завершить evidence и OpenSpec

- [x] 4.1 Повторно проверить русский текст, strict OpenSpec validation и итоговый diff относительно `origin/main`.
  - Проверка: `C:\Users\Ruslan\.codex\maintenance\Test-OpenSpecRussian.ps1 -ChangePath openspec\changes\compact-terraformed-status`, `openspec validate compact-terraformed-status --strict --no-interactive` и `git diff --check origin/main...HEAD`.
