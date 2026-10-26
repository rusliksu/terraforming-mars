# Каталог: промежуточная проверка WP02

Каталог Wrybit, фильтры, секции, цена, поиск, отложенное отображение и стили перенесены с закреплённого источника. Данные карт, модулей, цен и More Parties берутся из нашего канонического каталога. Общая классификация agendas и имена иконок выделены без изменения прежнего поведения.

Браузерная проверка отдельного Webpack fixture: desktop 1440×1000, phone 390×844, поиск Birds даёт Birds и Stratospheric Birds, панель фильтров открывается и закрывается Escape. После исправления пути логотипа и runtime-типа строки renderer: 0 console errors/warnings, нет ошибочных запросов. Снимки находятся в `D:/tm-db/smartbot-lab/wrybit-full-ui-01a126c8/visual-proof/catalog-{desktop,phone,phone-filters}.png`.

Проверены наши метаданные и все модули, диапазон цен и match counts, разделение Turmoil/More Parties, hash round-trip, controls, прекращение URL writes после ухода. Красный тест воспроизвёл перезапись hash после unmount; исправление останавливает таймеры и animation frames. Отложенное раскрытие не меняет DOM ушедших карт; image timeout очищается после загрузки.

147 значащих CSS rules совпадают с исходником по порядку, селекторам и declarations; приватные имена изолированы. Разбиение сохраняет URL rewriting. Все файлы короче 1000 строк.

Каталог также подключён к настоящему App. Браузер использовал отдельный App-only entry со штатным Webpack: по умолчанию обычный каталог и ни одного Wrybit request; настройка включает wrybit-ui.js. Проверены desktop/phone, поиск Birds и возврат через настоящую настройку с сохранением поиска, 0 console errors/warnings. Снимки `app-catalog-{classic,wrybit-desktop,wrybit-phone}.png` и request/snapshot evidence находятся в том же каталоге на D:.

78 client checks across 26 files прошли после интеграции, как и scoped ESLint/Stylelint, Vue type-check и Webpack. Red regression показал, что классический каталог тоже оставлял hash timer; теперь оба экземпляра прекращают URL writes при unmount. Передача views содержит только presentation components; routing, сеть и actions по-прежнему принадлежат App.

PageToolbar/GameMenu/SidebarModal/DialogFrame, SVG glyphs, animation и overlay helpers перенесены с source. Старый fallback из двух native icon buttons не работал: backdrop-filter у кнопки делал её containing block для fixed preferences panel. Реальный menu использует Teleport в body с собственным изолированным root нулевой высоты. Наши preferences/languages остаются в source modal/frame; source extensions не импортированы. Проверены normal click, dropdown, centered/scrolled settings на desktop/phone и выключение layout через наш native switch; фиксированы `app-catalog-menu.png`, `app-catalog-settings{,-phone}.png`, `app-menu-return-click.txt`, `app-final-classic.txt`. Полное оформление содержимого диалогов, source HelpOverlay, игровые context providers и новая статистика остаются следующим пакетам. Ссылки на наши Card Library/Map Library сохранены.

WP02 и все полные строки матрицы не закрыты. Игровая логика, AI, working DB и production не менялись.
