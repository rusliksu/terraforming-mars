# Исследование: текущий surrender и bot takeover

## Решение 1: сохранить отдельные outcome groups

**Решение**: использовать порядок `completed > surrendered > abandoned`.

**Причина**: одинаковое третье место для surrendered и abandoned наказывает
корректное использование Surrender так же, как молчаливый лив. Отдельные
группы дают предсказуемое pairwise-ELO: active побеждает обоих, surrendered
побеждает abandoned.

**Альтернативы**:

- Ничья surrendered/abandoned — отклонена как неверный стимул.
- Порядок сдачи — отклонен: он не отражает качество доигрывания и не решает лив.
- Только итоговый VP без outcome groups — отклонен: сдавшийся бот не должен
  обойти игрока, который продолжал сам.

## Решение 2: Surrender не является leave

**Решение**: completion reliability должна учитывать leave только для
подтвержденного `abandoned`; `surrendered` сохраняется отдельным outcome.

**Причина**: человек использовал предусмотренный flow, а сервер продолжает его
место ботом. Смешивание с leave скрывает реальное поведение игроков.

## Решение 3: persisted intent и runtime process разделены

**Решение**: persisted surrender-state является source of truth; активный child
process бота — восстанавливаемый runtime effect.

**Причина**: in-memory `BotTakeoverManager` теряет процессы при рестарте. Только
reconciliation из сохраненной игры предотвращает повторное зависание.

## Решение 4: один канонический transition service

**Решение**: player action и legacy surrender route не должны независимо
менять state. Один серверный transition владеет проверками, запуском/rollback,
сохранением и audit.

**Причина**: сейчас `Player.surrenderOption`, `PlayerInput` и `ApiSurrender`
образуют два пути. Дублирование легко оставляет один путь без запуска бота или
без правильного outcome.

## Решение 5: Abandoned остается ручной классификацией

**Решение**: не выводить лив из времени бездействия. Для текущей игры решение
`Борис = abandoned` применяется только отдельной ops-процедурой.

**Причина**: вкладка, пауза и пошаговая игра не являются надежным доказательством
лива; автоматизация создала бы ложные наказания.

## Проверка UX: подтверждения Surrender и Undo

**Surrender сейчас**: `Player.surrenderOption` уже открывает второй игровой
`OrOptions` prompt с вариантами Surrender/Continue. Это встроенный экран выбора,
а не browser modal. Текущий текст не сообщает, что после подтверждения стартует
бот, поэтому option/button и confirmation должны получить явный bot copy.

**Undo сейчас**: оба пути, `Undo action` и `Undo one step`, проверяют
`hasRevealedHiddenInformation`. Сервер отвечает специальным error ID и не
выполняет откат, пока клиент не покажет `window.confirm` и не повторит запрос с
`confirmHiddenInformation=true`. Это уже покрыто route и client regressions;
mission сохраняет поведение без отдельной переработки.
