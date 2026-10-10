# Локальная проверка Rebalanced

Проверенный кандидат: `675e073f87fe4ab8fa22bc182f035227af8ecdf7`. Основа кастомного сервера: `b88ab6668b4ecae9d8a47b99661424b3f0946fad`. Результат подтверждает готовность к независимому ревью и локальной интеграции; PR, CI и staging выполняются после штатного объединения по согласованному порядку.

## Полная проверка

Node.js 22.23.3. Первый прогон `tools/fanmade-port/verify.mjs --output-dir D:/tm-db/rebalanced-mars-reference-01M4JTWC --npm-cli "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js"` завершил make:static, lint, build и build:test успешно. Серверные тесты выявили два устаревших ожидания: отсутствие нового выключенного флага в API snapshot и учёт только статических имён в проверке значков поплавков. Исправлены только два теста; исходники, зависимости, guard и входы сборки идентичны проверенному commit `40df3a536ca2435ce25ada567123315eff704339`.

Повторный серверный прогон и оставшиеся этапы выполнены теми же командами и ограниченным runner:

- `npm run test:server -- --jobs 4`: 11 608 прошли, три прежних пропуска.
- `npm run test:client`: 1 049 прошли в 190 файлах.
- Полная module-matrix из verify.mjs: 201 прошёл.
- Scoped ESLint и типы для двух исправленных тестов: exit 0.
- `git diff --check`: exit 0.

Машинные результаты: `D:/tm-db/rebalanced-mars-reference-01M4JTWC/run-Iio96x/results.json` и `D:/tm-db/rebalanced-mars-reference-01M4JTWC/resume-l6Q7C5/results.json`. Второй отчёт проверяет точный diff из двух тестов и явно отмечает повторное использование четырёх успешных проверок.

## Связь требований с поведением

| Требование | Исполняемое доказательство |
|---|---|
| FR-001 | Reference.spec.ts проверяет исходные defaults и создание; Rebalanced.spec.ts проверяет реальную выключенную галочку и настройки; RebalancedLifecycle.spec.ts проходит API создания. |
| FR-002 | Независимый reference.json содержит ровно 113 активных карт; Preludes.spec.ts, Corporations1/2.spec.ts и Projects1/2/3.spec.ts проверяют фактические ресурсы, производство, требования, действия, hooks и очки по исходным значениям. Родитель отдельно сверил 114 исходных removal endpoints и 17 dependencies с закреплённым опубликованным bundle. |
| FR-003 | Replacements.spec.ts и Compatibility.spec.ts проверяют совместимость и замену; реальная форма и API нормализуют старые original/combined пары без дублей в начальной раздаче. |
| FR-004 | Combinations.spec.ts и Replacements.spec.ts проходят четыре режима модулей, пять комбинаций и полный приоритет Better Mars для University и Meat Industry. |
| FR-005 | Rebalanced.spec.ts и RebalancedLifecycle.spec.ts создают настройки и партию одновременно с Prelude 2, сохраняют его карты и флаг через загрузку. |
| FR-006 | Reference.spec.ts, Compatibility.spec.ts и RebalancedLifecycle.spec.ts проверяют новые идентификаторы, ресурсы, действие, производство и очки после загрузки; синтетическое сохранение до переноса и старые шаблоны сохраняют прежние правила. |

Карточные suites находятся в `tests/cards/rebalanced/`, клиентский — `tests/client/components/create/Rebalanced.spec.ts`, API/lifecycle — `tests/fanmade-compat/RebalancedLifecycle.spec.ts`.

## Дополнительные ограничения

Источник закреплён: rebalakefak `28846e8`, SHA-256 bundle `4949d60dcddaeceb505a27d7fe46a39b1ce10b8427ebefde0a5ce3f0ee0c87c0`. Проверены 113 активных фабрик и пять итоговых комбинаций; неактивные и посторонние дополнения не зарегистрированы. Frozen oracle не изменялся ради прохождения тестов.

Sourceguard проходит для прежних 297 каталожных identities и 2406 source files; изменены только необходимые fingerprints. Codemap сохраняет прежний граф и renderer, содержит 42 узла, 69 связей, 17 потоков, два прежних неизвестных участка и 239 проверенных fingerprints.

Точечные мутации обнаруживали потерю ресурсов, неправильный приоритет, ошибочный порядок colony production, dependency, replacement chain, старый отсутствующий флаг и пропуск automation guard. Байты восстановлены. Для двух исправленных тестов отдельно обнаружены лишнее и отсутствующее статическое имя.

Автоплей нового модуля явно отклоняется до запуска процесса; изменение бота не входило в пакет. Данные действующих партий не редактировались. Нативный Python pre-review сообщает no_coverage и не считается доказательством прохождения TM тестов. Семь исходных Windows ошибок durable-promotion не затронуты карточным diff.

Проверка интерфейса на staging и неизменности prod остаётся обязательной в release-checklist.md; здесь она не объявляется выполненной.
