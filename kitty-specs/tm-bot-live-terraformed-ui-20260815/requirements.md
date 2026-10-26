# Проверка качества baseline

- [x] Scope и user-visible acceptance criteria определены.
- [x] Источник `origin/main` и exact base SHA зафиксированы.
- [x] Runtime bot state не используется как единственный public source of truth.
- [x] Приватные руки, драфты и capability tokens исключены из scope.
- [x] Live/prod/database gates зафиксированы.
- [x] Spec Kitty fallback объяснен из-за root-resolution ошибки внешнего
      worktree; mission и Bead все равно сохранены в task scope.
