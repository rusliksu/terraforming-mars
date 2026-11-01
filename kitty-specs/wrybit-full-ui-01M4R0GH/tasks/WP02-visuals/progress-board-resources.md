# Поле и ресурсы: промежуточная проверка

Пакет WP02 остаётся `in_progress`: подзадачи и строки общей матрицы не закрыты.
Поле, внешние клетки, кубы и ресурсы адаптированы для проверки в изоляции;
production caller ещё не подключён.

Наши канонические компоненты остаются владельцами параметров, custom geometry,
стоимости, материалов, Helion, защиты, Coordination и командных цветов.
Бонусы берутся из `GlobalParametersConfig.bonuses`; координаты Wrybit описывают
только размещение. Непечатные custom rewards остаются в подписанном списке.
Venus Phase 2 не дублируется на Марсе. Обновление внешних клеток использует свежие props.

Проверены 59 client tests: новый визуальный scope, shell regression и ближайшие
канонические Board/resources/card tests. Vue type-check, scoped ESLint и Stylelint зелёные.
Все новые source files короче 1000 строк; gameplay, AI и DB diff отсутствуют в этом шаге.

Браузерная component fixture на D: собрана штатным Webpack, с отдельным entrypoint и
снятым `rootDir` только для cross-drive fixture. Диагностики не подавлялись.
Проверены 1440×1000 и 390×844, обычный tile toggle, counter-scale 2 при уменьшении
поля 670→335 и 0 console errors/warnings. Это не приёмка полного App/mobile flow;
временная fixture не воспроизводит весь адаптивный контейнер Wrybit.

Найдены и исправлены три представительных дефекта: namespace менял nested modifier
classes, scale chips не реагировали на viewport resize, outer-space frame перехватывал
нажатия на tile toggle. CSS contract и resize test воспроизводили ошибки до исправления;
обычный browser click после исправления проходит.

Доказательства: `D:/tm-db/smartbot-lab/wrybit-full-ui-01a126c8/visual-proof/`.
Остаются карточные стили, сортировка/каталог, остальные визуальные компоненты,
интеграция экранов, независимое ревью и последующие пакеты WP03–WP07.
