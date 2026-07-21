## 1. Согласование и реализация

- [x] 1.1 Получить одобрение baseline `fix-rigatone-score-contrast` до изменения source/test файлов.
- [x] 1.2 Добавить `rigatone` и `rigatone2` в точный список тёмных `.ma-score` в `src/styles/player_home.less`, не меняя фон и board marker styles.
- [x] 1.3 Расширить целевой CSS-контракт в `tests/Style.spec.ts` двумя персональными цветами.

## 2. Локальная проверка

- [x] 2.1 Выполнить релевантный `Style.spec.ts` test и CSS lint.
- [x] 2.2 Выполнить production build, подтверждающий корректную сборку стилей и клиента.
- [x] 2.3 Проверить реальные строки milestones и awards на desktop и узком viewport; подтвердить читаемость чисел и отсутствие новых console errors.

## 3. Доставка на staging

- [x] 3.1 Повторно выполнить проверку русского текста, `openspec validate fix-rigatone-score-contrast --strict --no-interactive` и scoped diff review.
- [ ] 3.2 Создать task-owned commit/PR в `rusliksu/terraforming-mars`, дождаться зелёного CI и смержить проверенный head.
- [ ] 3.3 Развернуть merge SHA на `staging.tm.knightbyte.win` со snapshot до/после и Playwright smoke реального UI.
- [ ] 3.4 После post-merge staging evidence заархивировать OpenSpec отдельным task-owned archive PR и проверить canonical spec.

## 4. Отдельный live gate

- [ ] 4.1 Получить отдельное явное разрешение Руслана на prod deploy и согласовать proof path для custom-only diff.
- [ ] 4.2 Перед prod promotion проверить active games и release state, затем развернуть только при отсутствии realtime blocker и выполнить post-deploy smoke.
