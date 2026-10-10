---
affected_files: []
cycle_number: 1
mission_slug: rebalanced-mars-reference-01M4JTWC
reproduction_command:
reviewed_at: '2026-10-10T15:28:13Z'
reviewer_agent: rebalanced_review
wp_id: WP04
---

# Ревью: требуется скидка один раз за карту

Reviewer Renata, цикл 1: FAIL для product SHA b4f69d88ad31509d6ec181bcae2405a81a67f33d. Один блокирующий P2 в src/server/cards/rebalanced/ThorgateRebalanced.ts:23.

Опубликованный module 8354, offset 1051740, вычисляет `tags.includes(ENERGY) ? 3 : 0`: скидка 3 M€ один раз на карту. Новый descriptor без `per: 'card'` использует нынешний множитель по числу Power tags.

Независимое воспроизведение reviewer и parent через реальный Player.getCardCost с HE3FusionPlant: исходная стоимость 12, два Power tags, полученная скидка 6 и цена 6. По опубликованному правилу скидка 3 и цена 9.

Исправить только новую ThorgateRebalanced: добавить `per: 'card'` и один focused regression с реальной HE3FusionPlant. Не менять оригинальную Thorgate, источник, независимый oracle или другие корпорации. Повторить относящиеся проверки типов, lint и реальные игровые тесты; поймать возврат per-tag скидки мутацией, затем восстановить source. Общий consumer скидки Kelvinists остаётся WP08.

Других замечаний нет: 16/16 публичных модулей сверены; Vitor, Splice, Pristar и Stormcraft переведены корректно в заявленных границах. Scope17, fingerprints17/17, текущие файлы совпадают с immutable commit, diff-check зелёный. Регистрация, полный reload и назначенные общие consumers остаются WP08/09.

Checklist: 1 N/A — регистрация и consumers последующего пакета; 2 PASS; 3 PASS; 4 PASS; 5 PASS; 6 FAIL — соответствие опубликованной скидке; 7 N/A — общие файлы не изменены; 8 PASS — InputError для некорректного split обоснован.
