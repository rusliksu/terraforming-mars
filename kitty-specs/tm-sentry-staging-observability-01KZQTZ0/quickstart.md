# Локальная проверка

## Предусловия

- Node.js 22.x;
- чистый task-owned worktree;
- реальные DSN и токены не нужны и не должны находиться в тестовой конфигурации.

## Профильные тесты

```powershell
npm ci
npx mocha --import=tsx --require tests/testing/setup.ts tests/server/server/SentryReporter.spec.ts tests/server/requestProcessor.spec.ts tests/routes/PlayerInput.spec.ts
```

Проверки используют fake transport/client и анализируют окончательное событие. Сетевой запрос в Sentry не выполняется.

## Общие gates

```powershell
npm run build:tests
npm run lint:server
npm run build
git diff --check
```

Дополнительно распарсить `docs/codemap/codemap.json` и `docs/codemap/codemap.lock`, проверить внутренние пути и убедиться, что lock описывает итоговое task-дерево.

## Что не является локальной проверкой

Настройка `SENTRY_DSN`, staging deploy и реальное тестовое событие требуют отдельных разрешений после merge. До этого успешность пакета доказывается только детерминированными тестами и сборкой.
