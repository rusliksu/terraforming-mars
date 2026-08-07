# Tasks: временный бот и сдача

## Контракт

- Mission: `bot-surrender-separation-20260807`
- Bead: `tm-ai-63l`
- Branch/worktree: `codex/bot-surrender-separation`
- Product code waits for Руслан approval.

## Подзадачи

| ID | WP | Task | Status |
| --- | --- | --- | --- |
| T001 | Governance | Repo/worktree/old-worktree inventory, Spec Kitty baseline, Bead | [x] |
| T002 | Server state | Add serialized surrendered-player outcome state | [ ] |
| T003 | Route | Add irreversible surrender mutation with authorization/audit/save semantics | [ ] |
| T004 | Bot model | Implement minimal no-strategy surrendered-player progression | [ ] |
| T005 | Elo | Use surrendered state for confirmed leave; keep ordinary Elo arithmetic | [ ] |
| T006 | Auth/links | Remove shared `botTakeoverToken` player-facing login and URL fragments | [ ] |
| T007 | UI | Move temporary bot control into Actions and add separate surrender control | [ ] |
| T008 | Tests | Add focused server/client serialization/Elo route/link tests | [ ] |
| T009 | Validation | Run targeted tests, lint/build as appropriate, final diff review | [ ] |

## Notes

- Existing old worktree
  `C:\Users\Ruslan\.codex-worktrees\terraforming-mars-bot-takeover-owner-auth`
  is dirty and behind `origin/main`; this mission does not modify it.
- Spec Kitty CLI could not safely create the mission because it resolved the
  primary checkout branch instead of this worktree. This task-local artifact is
  the approved baseline candidate until that tool issue is cleaned up.
