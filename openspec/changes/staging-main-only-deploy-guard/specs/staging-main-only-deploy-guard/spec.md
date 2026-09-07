## ADDED Requirements

### Requirement: Staging принимает только exact origin/main

Deploy guard SHALL разрешать staging только из git checkout без изменений, в котором `HEAD` точно совпадает с локально разрешаемым `origin/main`.

#### Scenario: Разрешён чистый exact-main checkout

- **WHEN** `Environment` равен `staging`, `git status --short` пуст, а `HEAD` и `origin/main` содержат одинаковый полный SHA
- **THEN** source guard проходит и deploy может продолжить обычные локальные проверки

#### Scenario: Feature-ветка отклоняется

- **WHEN** `Environment` равен `staging`, checkout чистый, но SHA `HEAD` отличается от `origin/main`
- **THEN** guard отклоняет запуск до сборки и удалённого действия и сообщает оба SHA и `SourceRoot`

#### Scenario: Отсутствующий origin/main отклоняется

- **WHEN** `Environment` равен `staging`, но `origin/main` не разрешается в полный SHA
- **THEN** guard отклоняет запуск и требует обновить локальную ссылку штатным fetch/refresh вне deploy-скрипта

### Requirement: Staging не имеет bypass для dirty или primary checkout

Deploy guard SHALL отклонять staging при передаче `-AllowDirtySource` или `-AllowPrimaryWorkingTree`, а также при непустом `git status --short`.

#### Scenario: Dirty source отклоняется

- **WHEN** `Environment` равен `staging` и checkout содержит tracked или untracked изменения
- **THEN** guard отклоняет запуск независимо от наличия `-AllowDirtySource`

#### Scenario: Primary override отклоняется

- **WHEN** `Environment` равен `staging` и передан `-AllowPrimaryWorkingTree`
- **THEN** guard отклоняет запуск до выполнения build/deploy

### Requirement: Preview и prod сохраняют свои границы

Изменение SHALL ограничивать только staging: preview MAY использовать отдельный чистый upstream/fork checkout, а prod SHALL оставаться promote-only через существующие release gates.

#### Scenario: Preview не требует exact origin/main custom ref

- **WHEN** `Environment` равен `preview` и указан допустимый чистый upstream/fork checkout
- **THEN** новый staging guard не отклоняет источник из-за несовпадения с custom `origin/main`

#### Scenario: Прямой prod deploy остаётся заблокирован

- **WHEN** `Environment` равен `prod` без существующего explicit direct-prod override
- **THEN** существующий prod guard блокирует запуск независимо от нового staging правила

### Requirement: Правила и проверка соответствуют guard

Документация SHALL запрещать feature/local-only/dirty staging source и узкий локальный тест SHALL проверять разрешённый и запрещённые варианты без сетевого или VPS действия.

#### Scenario: README не предлагает запрещённый staging source

- **WHEN** оператор читает `scripts/README-staging.md` и `C:\Users\Ruslan\tm\AGENTS.md`
- **THEN** примеры staging требуют clean exact `origin/main` и не предлагают bypass-флаги или произвольный feature `SourceRoot`

#### Scenario: Guard regression test покрывает границы

- **WHEN** запускается `scripts/test_tm_staging_source_guard.ps1`
- **THEN** тест подтверждает exact-main success и отказ для dirty, mismatch, отсутствующего SHA и обоих bypass-флагов
