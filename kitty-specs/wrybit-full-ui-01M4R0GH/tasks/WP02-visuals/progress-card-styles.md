# Карточные стили: промежуточная проверка

`cards_v2.less` закреплённого Wrybit разбит на 9 модулей: оформление, логотипы
основного и дополнительного набора, контент/требования, ресурсы/символы, render/тайлы,
названия/теги и счётчики. Самый большой модуль — 693 строки; новые source files
не превышают 1000 строк. Фрагменты стали самостоятельными rulesets; shared delegate
graphic вынесена в один mixin для обоих потребителей.

417 значащих скомпилированных CSS-правил полностью совпадают с frozen source:
селекторы, свойства, значения, `important`, контекст и порядок. Сравнение учитывает
production URL rewriting и эквивалентность `./assets`/`assets`; пустые comment-only
rules пропускаются. Источник, hash и normalized CSS hash сохранены в
`D:/tm-db/smartbot-lab/wrybit-full-ui-01a126c8/visual-proof/card-css-parity.json`.

Полная проверка URL обнаружила 128 ссылок. Старое `assets/resources/cube.png`
отсутствует и в frozen source, но та же CSS-декларация позже переопределена существующим
`assets/cube.png`. Непереопределённых отсутствующих ресурсов нет; выдуманный дубль
не создавался.

Проверены Card/visual tests (16 passed), Vue type-check, scoped ESLint, Stylelint и
штатный Webpack component fixture. Browser screenshots 1440×1000 и 390×844 дают
0 console errors/warnings. Разделение сначала сломало относительные URL: браузер
воспроизвёл 404, после исправления paths и idempotent importer они исчезли.
CSS contract теперь проверяет URL с тем же rewriting.

Это проверка компонентов; весь каталог, типы карт, сортировка, игровые экраны и
полный mobile flow ещё не приняты. WP02 остаётся `in_progress`, все строки общей
матрицы открыты, полнота UI не заявляется. Наши данные карт, правила, AI и БД не менялись.
