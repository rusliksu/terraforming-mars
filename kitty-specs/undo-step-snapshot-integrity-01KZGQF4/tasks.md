# Задачи: целостность снапшота step undo

## Subtask Index

| ID | Описание | WP | Parallel |
| --- | --- | --- | --- |
| T001 | Добавить RED regression на неизменяемость root snapshot | WP01 | No |
| T002 | Добавить RED behavioral regression на Giant Ice Asteroid replay | WP01 | No |
| T003 | Реализовать detached root capture в ActionReplay | WP01 | No |
| T004 | Зафиксировать invariant в architecture doc | WP01 | No |
| T005 | Выполнить focused/full gates и review diff | WP01 | No |

## WP01 — Исправить целостность ActionReplay snapshot

**Priority**: P1  
**Goal**: одним structural boundary закрыть утечку live mutations в replay root.  
**Independent test**: `ActionReplay.spec.ts` доказывает isolation и корректный Giant Ice Asteroid step-back без двойных вкладов.  
**Dependencies**: none  
**Prompt**: `tasks/WP01-fix-action-replay-snapshot-integrity.md`  
**Estimated prompt size**: ~260 lines

- [ ] T001 Добавить regression, который захватывает journal, мутирует live `gameLog`, `globalParameterSteps` и nested mutable state и проверяет неизменность `rootSnapshot`.
- [ ] T002 Добавить многошаговый Giant Ice Asteroid regression с двумя step-back и проверкой board/global contribution totals.
- [ ] T003 После подтверждённого RED добавить минимальный detached JSON clone на границе первого захвата root в `ActionReplay.ts`.
- [ ] T004 Обновить `docs/architecture/step-undo-experiment-plan.md` инвариантом ownership/immutability и перечислением regression classes.
- [ ] T005 Выполнить targeted tests, server lint/build gates, `git diff --check` и ручной allowlist review.

### Implementation sketch

1. Добавить тесты без production changes и сохранить RED evidence.
2. Изменить только capture boundary, не serializers.
3. Довести focused suite до GREEN.
4. Обновить документацию и выполнить расширенные gates.

### Parallel opportunities

Нет: тест, production code и документация описывают один изменяющийся контракт и должны выполняться последовательно в одном task-owned worktree.

### Risks

- Тест может случайно проверять только identity, а не observable replay.
- Giant Ice Asteroid setup может открыть скрытую информацию или пройти не тот prompt path.
- Глобальный serializer refactor расширит scope и запрещён.

