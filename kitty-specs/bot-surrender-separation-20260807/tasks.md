# Tasks: сдача без временного бота

## Контракт

- Mission: `bot-surrender-separation-20260807`
- Bead: `tm-ai-63l`
- Branch/worktree: `codex/bot-surrender-separation`
- Product code waits for Руслан approval.

## Подзадачи

| ID | WP | Task | Status |
| --- | --- | --- | --- |
| T001 | Governance | Repo/worktree/old-worktree inventory, Spec Kitty baseline, Bead | [x] |
| T002 | Server state | Add serialized surrendered-player outcome state | [x] |
| T003 | Route | Replace human takeover route with irreversible surrender route | [x] |
| T004 | Game flow | Keep surrendered player inert and end when one non-surrendered player remains | [x] |
| T005 | Elo/results | Count surrender as leave and force surrendered players after active players | [x] |
| T006 | Auth/links | Remove shared `botTakeoverToken` player-facing login and URL fragments | [x] |
| T007 | UI | Remove player/admin takeover controls and keep Surrender in Actions | [x] |
| T008 | Tests | Update focused server/client/serialization/Elo/results tests | [x] |
| T009 | Validation | Run targeted tests, lint/build as appropriate, final diff review | [x] |

## Notes

- Existing old worktree
  `C:\Users\Ruslan\.codex-worktrees\terraforming-mars-bot-takeover-owner-auth`
  is dirty and behind `origin/main`; this mission does not modify it.
- Spec Kitty CLI could not safely create the mission because it resolved the
  primary checkout branch instead of this worktree. This task-local artifact is
  the approved baseline candidate until that tool issue is cleaned up.
