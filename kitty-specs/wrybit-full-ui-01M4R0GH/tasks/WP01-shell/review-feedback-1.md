# WP01 — исправления перед независимым review

Пакет не принят. Read-only архитектурная проверка реализации выявила гонку; полный green gate её не покрывает.

## P1: прежний GET во время POST

App.vue инвалидирует refreshRevision после принятия POST, а в classic каждый GET меняет inputRevision. WaitingFor.vue игнорирует ответы после unmount. Порядок GET started → POST started → прежний GET pending-a returned → форма unmounted → POST pending-b returned оставляет UI на pending-a. Исправить принадлежащий App порядок запросов при начале mutation и не применять промежуточные refresh во время неё; после ошибки восстановить возможность refresh.

Проверка: deferred GET/POST с настоящим WaitingFor.onsavePlayerInput для classic и возврата Wrybit→classic. До завершения POST прежний GET не уничтожает форму; после POST виден pending-b, отправка ровно одна, request lock снят. Тест должен обнаруживать старый порядок до исправления.

## Проверить комбинацию поля и одинакового refresh

OrOptions.vue сравнивает selectedOption из первоначального data() с новым playerinput.options по ссылке. После JSON refresh выбранная ветка и новая option перестают быть одним объектом. Выполнить сценарий выбранной greenery-ветки, cloned same-context input, нового host и клика клетки. До подтверждения требуется ноль ответов, после — один ответ с прежним индексом. Если воспроизводится, исправить сравнение через канонический original index и проверить обработчики нового поля. Предположение о порядке callbacks пока не проверено исполнением.

## Независимый review

Текущий bootstrap review был заявлен родителем с implementer-ivan; approved verdict не выдавался. Перед повторным handoff указать reviewer-renata и передать отдельному reviewer-контексту. Родитель не может утверждать собственную реализацию. Архитектор остаётся только read-only автором приведённых findings; это не формальный verdict всего WP.

WP02 ещё не начинался, dependents не требуют rebase. База, спецификация, границы правил/AI и delivery gates сохраняются.
