# Specification: distinct Capital tile artwork

## Goal

Restore the Capital's distinct white board artwork. The current implementation
maps `TileType.CAPITAL` to the ordinary city style, making the two tiles
visually indistinguishable.

## Scenarios

### S1 - Capital on the board

When a board space contains `TileType.CAPITAL`, the client renders the canonical
Capital artwork rather than the ordinary city artwork.

### S2 - Ordinary city

When a board space contains `TileType.CITY`, its existing appearance remains
unchanged.

### S3 - Ares compatibility

With Ares enabled, Capital keeps the Capital base artwork together with the
existing Ares outline and adjacency-bonus behavior.

## Requirements

- **FR-001**: `board-space-tile--capital` must not delegate to
  `board-space-tile--city`.
- **FR-002**: reuse an existing canonical project asset; do not introduce a new
  visual design.
- **FR-003**: preserve the existing tile-type mapping, gameplay rules, VP
  calculation, city classification, and server payloads.
- **FR-004**: add focused regression coverage that fails when Capital is again
  aliased to the ordinary city artwork.

## Non-goals and gates

- No gameplay, database, advisor, bot, or live-game changes.
- No production/live deploy in this mission.
- Work only in the task-owned worktree and deliver through a task-owned PR.
- Verification: focused regression, production build, and isolated Playwright
  visual smoke with console-error inspection.
