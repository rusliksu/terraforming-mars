# Ревью: требуется исправление гарантированного прироста

Reviewer Renata, цикл 1: FAIL для product SHA 3dcfc73dba34d76dd7edb45f376568720244d622. Один блокирующий P2 в src/server/behavior/Executor.ts:204.

При одном ресурсе на карте, нулевом energy production и отсутствии чужих целей Behavior ниже ошибочно допускается canExecute. При исполнении ресурс уже потрачен, прирост становится нулевым, цель снижения отсутствует. Воспроизведено независимым запуском реального Executor в памяти; прежняя проверка возвращала false.

```ts
{
  spend: {resourcesHere: 1},
  production: {energy: {resourcesHere: {}}},
  decreaseAnyProduction: {type: Resource.ENERGY, count: 1},
}
```

Исправить узко: кредитовать только положительную числовую прибавку, для dynamic значения credit=0. Сохранить clamped prior explicit loss, итоговый required≥0, защиты и прежние negative-production проверки. AMC и Energy Tapping используют фиксированное +1 и сохраняют свои правила. Добавить focused regression приведённого сценария, повторить целевые и прежние проверки, синхронизировать затронутые fingerprints карты. Полный transaction preview не нужен.

Других замечаний нет: все 20 опубликованных модулей сверены, generation и UI корректны; scope35, fingerprints32/32 и прежние связи карты сохранены. Регистрация и общий consumer Community остаются последующей интеграцией. Повторно проверить исправленный immutable diff; источник и независимый oracle не изменять.
