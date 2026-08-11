# Локальная проверка

## Предусловия

- Node.js 22.x;
- чистый task-owned worktree;
- реальные DSN и токены не нужны и не должны находиться в тестовой конфигурации.

## Профильные тесты

```powershell
npm ci
npx mocha --import=tsx --require tests/testing/setup.ts tests/server/server/SentryReporter.spec.ts tests/server/server/SentryProcessBoundary.spec.ts tests/server/requestProcessor.spec.ts tests/routes/PlayerInput.spec.ts
```

Проверки используют настоящий configured Sentry client с fake transport. Они подтверждают присутствие message, stack, обязательного boundary, method/path, game/player IDs и gameplay input. Поддерживаемые secret/header/cookie/query/IP sentinel-форматы внедряются непосредственно в thrown message, stack и input; финальный envelope рекурсивно проверяется на их отсутствие. Отдельный случай проверяет `Buffer.byteLength(..., 'utf8')`, валидный детерминированный truncation wrapper и лимит 65 536 байт. Сетевой запрос в Sentry не выполняется.

## Общие gates

```powershell
npm run build:tests
npm run lint:server
npm run build
git diff --check
```

## Проверка карты кода

В репозитории нет штатного codemap generator. Проверка и итоговое обновление выполняются одним владельцем по воспроизводимой scoped-процедуре:

1. Распарсить `docs/codemap/codemap.json` и `docs/codemap/codemap.lock` стандартным JSON parser.
2. Проверить, что каждый confirmed evidence path и каждый path из lock существует, а confirmed symbols подтверждаются текущим кодом. Planned paths в baseline могут ещё отсутствовать; после реализации их relationships либо переводятся в confirmed с evidence, либо удаляются.
3. Для каждого path из `codemap.lock.scope` вычислить lowercase SHA-256 содержимого файла. Codemap artifacts в scope не включать.
4. Отсортировать paths ordinal, сформировать для каждого запись `path + NUL + fileHash`, соединить записи LF, закодировать UTF-8 и вычислить SHA-256 composite.
5. Сверить per-file hashes и composite с `codemap.lock`; обновить HTML из тех же подтверждённых relationships и проверить пять boundary labels, четыре test files и отсутствие `unhandledRejection` caller.

Baseline до source-правок проверяется read-only. Единственное итоговое изменение `codemap.html/json/lock` выполняется в финальном интеграционном пакете.

## Что не является локальной проверкой

Настройка `SENTRY_DSN`, staging deploy и реальное тестовое событие требуют отдельных разрешений после merge. До этого успешность пакета доказывается только детерминированными тестами и сборкой.
