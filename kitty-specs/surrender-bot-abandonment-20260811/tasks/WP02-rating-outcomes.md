---
work_package_id: "WP02"
title: "Outcome groups, рейтинг и delivery evidence"
dependencies: ["WP01"]
subtasks: ["T007", "T008", "T009", "T010", "T011", "T012"]
requirement_refs: ["FR-007", "FR-008", "FR-011", "NFR-003", "NFR-004", "C-001", "C-002", "C-003", "C-004", "C-005", "C-006"]
planning_base_branch: "main"
merge_target_branch: "main"
branch_strategy: "task-owned PR"
execution_mode: "code_change"
owned_files:
  - "src/common/game/CompletionOutcome.ts"
  - "src/server/Game.ts"
  - "src/server/elo/EloSyncService.ts"
  - "src/server/routes/PlayerInput.ts"
  - "src/server/routes/Reset.ts"
  - "src/client/components/GameEnd.vue"
  - "tests/server/EloSyncService.spec.ts"
  - "tests/client/components/GameEnd.spec.ts"
  - "kitty-specs/surrender-bot-abandonment-20260811/**"
authoritative_surface: "src/server/elo/"
agent_profile: "implementer-ivan"
role: "implementer"
agent: "codex"
history:
  - "2026-08-11: baseline approved; implementation pending"
  - "2026-08-11: a93f262517 adds the shared outcome rank and ELO/GameEnd regressions"
  - "2026-08-11: eb9ef146cf closes the review-found human-input race after surrender"
  - "2026-08-11: targeted tests, three stability runs, build:tests, production build, lint, typecheck and 7381 server tests passed"
---

## ⚡ Do This First: Load Agent Profile

Load `Implementer Ivan` through `/ad-hoc-profile-load`, then read the accepted
spec, WP01 outcome and current ELO tests. Confirm WP01 is complete before edits.

## Цель

Разделить `completed`, `surrendered` и `left/abandoned` в result storage,
ranking и completion reliability без изменения исторических результатов и без
автоматической разметки молчаливого лива.

## Branch strategy

- Planning/base: `main` at the mission base SHA.
- Execution: та же task-owned ветка после WP01.
- Merge target: `main` через PR.
- Live correction `g9e9c7f0b6fff` и prod deploy остаются отдельными gates.

## T007 — отдельный completion outcome

Расширить result contract так, чтобы явная сдача сохранялась как
`completionOutcome: surrendered`, а confirmed abandonment продолжал
использовать storage value `left`.

Backward compatibility:

- historical `completed` и `left` читаются без изменений;
- отсутствующий outcome остается legacy unknown;
- unknown future value не ломает rebuild и обрабатывается явно;
- merge metadata не стирает ранее подтвержденный outcome без причины.

`surrenderedPlayerIds` и `confirmedLeavePlayerIds` должны поступать в summary
раздельно. Один ID в обеих группах трактуется как более строгий `left` и
вызывает диагностируемый invariant check/test.

## T008 — единое ранжирование

Использовать один rank-key для server score и ELO summary:

1. `completed` priority 0.
2. `surrendered` priority 1.
3. `left` priority 2.
4. VP descending.
5. MC descending.

Совместное место допустимо только при одинаковой outcome group, VP и MC.
Не применять порядок surrender clicks как tie-breaker.

Не дублировать comparator в GameEnd и ELO без общей authority либо focused
contract tests, которые гарантируют одинаковый результат.

## T009 — reliability и bot-game exclusion

Completion reliability должна считать:

- `games`: все известные outcomes, включая surrendered;
- `leaves`: только `left`;
- `rate`: leaves / known games.

Surrendered human не добавляется в summary `botPlayerIds`, поэтому обычная
человеческая партия остается рейтинговой. Изначально созданный bot player
по-прежнему исключает всю игру из ELO.

Проверить оба ELO (`elo` по place и `elo_vp` по VP): outcome group определяет
place-ELO, а raw VP rating сохраняет существующую формулу, если spec не требует
иного.

## T010 — regressions

Добавить focused fixtures:

- `completed/surrendered/left` → места 1/2/3 независимо от VP между группами;
- два surrendered → порядок по VP, затем MC;
- два left → порядок по VP/MC;
- equal group/VP/MC → shared place;
- surrendered увеличивает known games, но не leaves;
- left увеличивает leaves;
- human surrender game записывается в ELO;
- original bot game пропускается;
- legacy records rebuild без data loss;
- GameEnd визуально помечает surrender, не называя его leave.

Тест current-game names не должен становиться production fixture; использовать
нейтральные Alice/Bob/Carol.

## T011 — проверки и review

Минимальная матрица:

- targeted route/player/game/bot/ELO/client tests;
- три последовательных прогона новых regressions;
- `npm run build:tests`;
- ESLint для измененных source/tests;
- `npm run build`;
- `git diff --check`;
- independent review итогового diff.

Build может менять tracked ELO mirrors. Такие side effects не включать в commit,
если они не являются намеренным результатом mission; сравнить hash/content и
восстановить только task-owned generated side effects.

## T012 — delivery evidence

Подготовить узкий PR в `rusliksu/terraforming-mars`:

- Summary: surrender запускает bot и не является leave.
- Demo: локальная/staging трехместная WGT партия.
- Testing: только реально выполненные команды.
- Notes: inactivity detection, live correction и prod out of scope.

После зеленого PR/merge staging разрешен только из clean release checkout, где
`HEAD == origin/main`, после snapshot и с Playwright console check. Не менять
preview. Prod/live и ELO correction требуют отдельных команд Руслана.

## Definition of Done

- Outcome groups сохранены и ранжируются единообразно.
- Reliability считает surrendered как известную игру без leave.
- Existing bot-game exclusion не расширился на surrendered humans.
- Исторические ELO records совместимы.
- Все проверки зелёные, diff review-clean, PR-ready evidence подготовлена.
- `g9e9c7f0b6fff`, prod DB, runtime и ELO не изменены.

## Reviewer focus

- Сравнить GameEnd и ELO place semantics.
- Проверить pairwise place-ELO для 1/2/3 fixture.
- Проверить denominator completion reliability.
- Убедиться, что build artifacts и live data не попали в diff.
