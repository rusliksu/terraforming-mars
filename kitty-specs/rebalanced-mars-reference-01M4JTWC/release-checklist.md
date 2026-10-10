# Выпуск Rebalanced после технической приёмки

Порядок согласован Русланом 2026-10-10. Эти действия обязательны для завершения поручения после штатного объединения рабочих веток. Продакшен не включён в разрешённый выпуск.

- [ ] Подтвердить полный diff согласованного набора, локальные проверки и независимое ревью.
- [ ] Выполнить штатную приёмку и объединение Spec Kitty в codex/rebalanced-mars-reference.
- [ ] Открыть и прикрепить PR codex/rebalanced-mars-reference → main в rusliksu/terraforming-mars.
- [ ] Дождаться обязательных CI, проверить SHA, mergeability и отсутствие review blockers.
- [ ] Выполнить разрешённый hosting merge; подтвердить результат в authoritative main.
- [ ] Обновить штатный clean release checkout до exact origin/main; повторно проверить правила и build.
- [ ] Снять read-only snapshot prod/staging/current, manifests, timestamps, health и deploy lock.
- [ ] Выполнить штатный staging deploy с CAS/lock guard и postchecks.
- [ ] Подтвердить API/health, настройки и реальную начальную раздачу через Playwright без console/page errors.
- [ ] Подтвердить неизменность prod и закрыть только свои временные проверочные ресурсы.
- [ ] Сообщить проверенный результат и отдельный gate для live/prod, если требуется продолжение.

Готовность к выпуску, локальная интеграция, CI, staging и prod — разные результаты; доказательства каждого записываются после фактической проверки.
