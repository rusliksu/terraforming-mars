---
affected_files: []
cycle_number: 1
mission_slug: wrybit-full-ui-01M4R0GH
reproduction_command:
reviewed_at: '2026-10-17T19:13:41Z'
reviewer_agent: user
wp_id: WP03
---

# Нужны изменения: создание и ввод

Независимый reviewer: `/root/wrybit_wp_review`, Reviewer Renata. Проверен код `5e08eee30c153e1b9ee5d5689298772486b9d3de` к базе `7c8a4f2b07b310efddd0eec5aae64ba24248cf3f`. Последующие коммиты — только lifecycle.

1. **P2, свежие DTO выбранных карт.** `src/client/wrybit/inputs/SelectCard.vue:21` и native `src/client/components/SelectCard.vue:8` используют identity в disabled condition. Постоянный controller сохраняет старые selected objects; JSON-клон offered cards при достигнутом max блокирует даже выбранные checkbox. Сравнивать canonical name в обоих шаблонах. Проверить max2, свежий равный DTO, тот же UID, снятие/замену выбора, classic return и точные native response names. Методы/state/save не менять.
2. **P2, отдельный Venus: Phase 2.** `src/client/wrybit/create/CreateGameForm.vue:406` не включает venusPhase2 в hasExpansionOptions. Поэтому Teleport с native custom Venus editor не монтируется, если venus/turmoil/moon/ares выключены. Показать editor при отдельном включении; проверить доступность, сохранение его DOM/draft при смене оформления и неизменность native config.
3. **P3, явный boolean prop.** В `src/client/wrybit/inputs/PresentationHost.vue:2` заменить bare defer на `:defer="true"` по STYLE.md.

Checklist1/2/3/5/6/7/8 прошли; компонентная готовность4 не прошла из-за двух сценариев выше. Full JUnit: 12904 total, 12901 passed, 3 skipped, 0 failures/errors, SHA256 `c4ceac05434fcf77c6fae48c8a6084af0e4a2193e0e39715437a805f0d0d200e`. Текущие тесты не покрывают эти регрессии. Codemap900 fingerprints/embedded graph и journal route/test совпадают с проверенной базой. Все21 полных сценария и WP04–WP07 остаются открытыми. После исправлений требуется повторное независимое review.
