## ADDED Requirements

### Requirement: Live runtime не строит метаданные отображения карт
После пометки процесса как live runtime система MUST возвращать общий пустой корень из `CardRenderer.builder` и MUST NOT выполнять callback построения `renderData`.

#### Scenario: Построение запрошено работающим сервером
- **WHEN** server entrypoint пометил процесс как live runtime и создаётся карта или глобальное событие с `CardRenderer.builder`
- **THEN** callback построения не выполняется, а вызов возвращает общий пустой корень

### Requirement: Non-live процессы сохраняют полные метаданные
Процессы без live-маркера SHALL выполнять callback `CardRenderer.builder` и формировать полное дерево `renderData` по существующим правилам.

#### Scenario: Сборочный экспортёр создаёт cards.json
- **WHEN** `export_card_rendering.ts` запускается без live-маркера
- **THEN** все требуемые `renderData` строятся и generated card metadata не отличается из-за оптимизации live runtime

#### Scenario: Обычный unit test вызывает builder
- **WHEN** тестовый процесс не помечен как live runtime и вызывает `CardRenderer.builder`
- **THEN** callback выполняется и возвращённый корень содержит построенные элементы

### Requirement: Оптимизация не меняет наблюдаемое игровое поведение
Система SHALL сохранять правила карт и глобальных событий, клиентское отображение, внешние API, формат сохранений и работу БД без изменений.

#### Scenario: Сервер обслуживает игру после оптимизации
- **WHEN** live runtime создаёт и выполняет карты и глобальные события
- **THEN** их игровое разрешение и передаваемые клиенту данные совпадают с поведением до оптимизации, кроме отсутствующих неиспользуемых server-side `renderData`
