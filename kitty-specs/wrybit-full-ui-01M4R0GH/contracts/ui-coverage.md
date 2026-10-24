# Матрица полного интерфейса

Строки WP06 закрыты только в собственном scope; полная матрица и real-game сценарии остаются открытыми для WP07. Статус «готово» требует реального сценария, исходной ссылки, пути адаптированного компонента и результата. Для групп дополнений разворачиваются отдельные строки по каждой доступной панели. Каждый исходный компонент классифицируется как перенесённый, общий повторно используемый, заменённый нашей реализацией с проверкой поведения либо относящийся к исключённому AI/серверу. Неатрибутированные пропуски запрещены.

| ID | Представление | Источник Wrybit | Обязательная проверка | Статус |
|----|---------------|----------------|----------------------|--------|
| UI-01 | Меню, фон, навигация | StartScreen, AppBackground, App | Включение с первой страницы; все ссылки доступны | Проверено в WP06 scope (StartScreen, 8 ссылок, desktop/mobile); полный сценарий — WP07 |
| UI-02 | Создание и ссылки партии | create/CreateGameForm, GameHome | Наши параметры, создание, корректные player/spectator ссылки | Открыто |
| UI-03 | Загрузка и список партий | LoadGameForm, GamesOverview | Корректная/неизвестная ссылка; пустой список | Проверено в WP06 scope (load/games/empty); unknown-ID сценарий — WP07 |
| UI-04 | Начальный выбор | PlayerSetupView, SelectInitialCards, SetupSummary | Корпорация, прелюдии, проекты, покупка, начало партии | Открыто |
| UI-05 | Desktop, игроки и ресурсы | PlayerHome, TopBar, Sidebar, OtherPlayer | Запас/производство, активный игрок, вкладки, разделители | Открыто |
| UI-06 | Поле, треки, награды | GameBoardView, board, Milestones, Awards | Масштаб, бонусы, размещение и подтверждение | Открыто |
| UI-07 | Карты и каталог | Card, SortableCards, StackedCards, cardlist | Наши цены/рендеринг, сортировка, поиск/фильтры, карусель | Открыто |
| UI-08 | Действия и все типы ввода | WaitingFor, PlayerInputFactory, Select*, And/OrOptions | Вложенность, пропуск/отмена, обновление, полный наш реестр | Открыто |
| UI-09 | Платежи | PaymentForm, PaymentLedger, SelectPayment, SelectProjectCardToPlay | Наши скидки/ресурсы/переплата; ответ принят сервером | Открыто |
| UI-10 | Колонии и торговля | colonies, TradeColony | Выбор колонии, стоимость, доход, бонус владельцам, отказ | Открыто |
| UI-11 | Turmoil | turmoil, SelectParty, SelectDelegate, SelectGlobalEvent | Партии, председатель, события, делегаты, выбор | Открыто |
| UI-12 | Moon | moon | Поле, все треки и бонусы, резервирование/размещение | Открыто |
| UI-13 | Venus, Pathfinders | GameBoardView, pathfinders | Отображение и изменение доступных треков | Открыто |
| UI-14 | Ares, Underworld, остальные панели | ShiftAresGlobalParameters, underworld, все панели GameBoardView | Особые клетки, токены, выбор, собственные данные | Открыто |
| UI-15 | Mobile и tablet | mobile/MobilePlayerHome, MobileNav, MobileTurnSheet | Ход, задачи, карта/оплата, возврат, поворот/resize | Открыто |
| UI-16 | Зритель | SpectatorHome, mobile/MobileSpectatorHome | Desktop/mobile, обновление, нет форм хода/приватных рук | Открыто |
| UI-17 | Конец и результаты | TerraformedBanner, GameEnd, Charts | Solo win/loss, multiplayer, VP, конечное поле/история | Проверено в WP06 scope (source GameEnd + gameend/**, multiplayer/solo); полный real-game — WP07 |
| UI-18 | Статистика | stats/StatsPage и все дочерние представления | Данные/фильтры/таблицы, пусто/ошибка; публичная проекция | Проверено в WP06 scope: 11 source-вкладок, 36 stats components, desktop/mobile; детали карт/прелюдий отсутствуют в публичной ELO-проекции — WP07 |
| UI-19 | Справка и настройки | help/HelpOverlay, PreferencesDialog, LanguageSelectionDialog | Русский/английский, поиск/справка, сохранение и возврат | Проверено в WP06 scope (help, 5 groups/15 switches); полная языковая матрица — WP07 |
| UI-20 | Администрирование и вход | admin/AdminHome, auth/LoginHome | Наши доступы и маршруты сохраняются, нет новых прав | Проверено в WP06 scope (native admin links/login card); реальные права/сессии — WP07 |
| UI-21 | Наши дополнительные возможности | Наши replay/card-maker/map-library/custom варианты | Функции доступны в новой оболочке; Wrybit не удаляет их | Проверено в WP06 scope (5 native routes, desktop/mobile, console 0); submit/replay данные — WP07 |
