## 1. Перенос upstream-реализации

- [ ] 1.1 Перенести module-scope `renderData` из upstream-коммита `451759a888` в конструкторы и сохранить custom hunks в пересекающихся файлах.
- [ ] 1.2 Добавить live-маркер и общий пустой корень по upstream-коммиту `06989b8205`, не меняя build/export entrypoints.
- [ ] 1.3 Добавить изолированный regression test, подтверждающий, что live runtime не выполняет callback builder-а и не загрязняет остальные тесты process-local флагом.

## 2. Локальная проверка

- [ ] 2.1 Сравнить итоговый touched scope с upstream PR `#8337` и подтвердить отсутствие постороннего gameplay/API/DB diff.
- [ ] 2.2 Запустить focused `CardRenderer` tests и `npm run make:cards`, затем подтвердить отсутствие неожиданного generated diff.
- [ ] 2.3 Запустить `npm run build:server`, релевантный server test suite и `git diff --check`.
- [ ] 2.4 Выполнить `Test-OpenSpecRussian.ps1` и `openspec validate upstream-card-render-memory --strict --no-interactive` после реализации.

## 3. Проверка на staging

- [ ] 3.1 Снять обязательный pre-deploy snapshot и задеплоить точный проверенный task SHA на `staging.tm.knightbyte.win` штатным guarded path.
- [ ] 3.2 Выполнить backend health/release smoke и подтвердить SHA, artifact hash и отсутствие service/console ошибок.
- [ ] 3.3 Зафиксировать staging evidence, повторить языковую и strict OpenSpec-проверку и подтвердить готовность change к архивированию и task-owned PR.
