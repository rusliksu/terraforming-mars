## ADDED Requirements

### Requirement: Завершённое терраформирование показывается компактно
Когда `playerView.game.isTerraformed` равно `true`, клиент SHALL показывать один compact status-chip внутри существующей `.top-bar`. Chip MUST не создавать отдельную полноширинную строку, не перекрывать игровое содержимое и не растягиваться на доступную ширину.

#### Scenario: Марс терраформирован
- **WHEN** TopBar получает `playerView.game.isTerraformed=true`
- **THEN** внутри `.top-bar` отображается один `TerraformedBanner` с компактной подписью `MARS ✓`

#### Scenario: Марс ещё не терраформирован
- **WHEN** TopBar получает `playerView.game.isTerraformed=false`
- **THEN** status-chip отсутствует

#### Scenario: Узкий viewport
- **WHEN** compact status-chip отображается рядом с player info при ограниченной ширине окна
- **THEN** chip сохраняет собственную компактную ширину и не переносится в отдельную строку

### Requirement: Полное сообщение остаётся доступным
Compact status-chip SHALL сохранять полный локализованный текст `Mars is Terraformed!` как tooltip и доступное имя, а также SHALL использовать семантику статуса для assistive technology.

#### Scenario: Пользователь наводит курсор или использует screen reader
- **WHEN** status-chip присутствует в DOM
- **THEN** его `title` и `aria-label` содержат локализованное полное сообщение, а элемент имеет `role="status"`

### Requirement: Одноразовая анимация не меняет layout
Status-chip SHALL использовать существующий результат `consumeFirstBannerShow(playerId)` для одноразовой entrance-анимации. Анимация MUST изменять только visual scale/opacity/glow и MUST не сдвигать соседнее игровое содержимое.

#### Scenario: Первый показ для игрока
- **WHEN** `consumeFirstBannerShow(playerId)` возвращает `true`
- **THEN** chip получает animated class и проигрывает компактную animation без появления отдельной строки

#### Scenario: Повторный показ для игрока
- **WHEN** `consumeFirstBannerShow(playerId)` возвращает `false`
- **THEN** chip отображается без повторной entrance-анимации

### Requirement: Игровое состояние не меняется
Изменение SHALL быть ограничено presentation-слоем и SHALL не менять `game.isTerraformed`, end-game flow, scoring, результаты партии или server API.

#### Scenario: Рендерится завершённая партия
- **WHEN** compact status-chip заменяет прежний полноширинный баннер
- **THEN** условие отображения и игровые данные остаются прежними
