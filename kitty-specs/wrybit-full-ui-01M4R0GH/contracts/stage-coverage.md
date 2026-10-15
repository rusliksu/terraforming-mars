# Проверки компонентов и передача сквозных сценариев

Согласовано 15 октября 2026 (approval.md). Эта таблица дополняет ui-coverage.md и не закрывает её полные строки. Статус «проверено» относится только к указанному компонентному scope; независимое одобрение WP записывается штатным Spec Kitty.

| Пакет | Собственный scope | Проверка и результат | Остаток полного сценария / владелец |
|---|---|---|---|
| WP01 | Optional/default false; lazy shell; актуальный ввод/портал и request revision | Одобрен штатным review ранее; клиентские boundary/refresh/board/draft tests продолжают проходить | Полные игровые экраны — WP02…WP06; общий итог — WP07 |
| WP02 T005 | Атрибуция закреплённого source и используемых ресурсов, private paths/styles | import-manifest/source SHA; 48 перенесённых resources; scoped styles; default-off actual App requests не загружают Wrybit | Полный manifest всех экранов — WP07 |
| WP02 T006 | Board/scale bonuses, MA table, player stock/production/table/other-player, tabs и layout | Наши props/config/claimable/public DTO; client + ServerModel targeted tests; настоящий App root desktop, separator keyboard/reset и menu, console0/0 | Размещение/подтверждение — WP03; все expansion panels — WP04; viewport/mobile — WP05 |
| WP02 T007 | Card renderer/help/detail/flags, catalog, hand/filter/sort/stacked cards, log/previews | Canonical metadata/costs/public resources, ordered CSS parity; normal browser catalog/hand/log/preview; actual App root uses source components | Hand/action tabs и платежи — WP03; mobile hand carousel — WP05; полная UI-07 остаётся открытой |
| WP02 T008 | Разделение source views/styles, cleanup и визуальные проверки | Все246visual/stylefiles на9e042<1000строк (independent review); full1163client/239files; type/lint/actual App webpack; mutations ownership/request/focus restored | Сквозные snapshots всех экранов/устройств — WP07 |
| WP03 | Создание, старт, полный typed input registry, payment, nested forms, placement/undo | Открыто | UI-02/04/08/09 и input-часть UI-06 — WP03 |
| WP04 | Дополнения, trade и наши custom варианты | Открыто | UI-10…UI-14 и дополнения полных flows — WP04 |
| WP05 | Mobile/tablet owner, навигация/карусель, spectator | Открыто | Mobile часть UI-05/06/07/08/09 и UI-15/16 — WP05 |
| WP06 | Меню/списки/загрузка, справка/settings, результаты/статистика | Открыто | UI-01/03/17/18/19/20/21 — WP06 |
| WP07 | Полная матрица, язык/accessibility, full regressions/build/CI/PR/staging | Открыто | Все UI-01…UI-21 должны иметь полный доказанный сценарий перед итоговой готовностью |

WP02 evidence: src/client/wrybit/import-manifest.json; tests/client/wrybit/visuals/**; tests/client/wrybit/shell/**; tests/models/ServerModel.spec.ts. Визуальные artifacts на D:/tm-db/smartbot-lab/wrybit-full-ui-01a126c8/visual-proof, включая root-final-desktop.png, root-final-console.txt, root-off-static-requests.txt, root-final-return-snapshot.txt. Тесты и snapshots компонентных листов не выдаются за всю партию. Новые payment leaves являются только визуальными зависимостями; полный UI-09 остаётся открытым.
