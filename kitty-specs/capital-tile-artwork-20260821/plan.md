# Plan: distinct Capital tile artwork

## Source finding

`src/client/components/board/BoardSpaceTile.vue` already maps
`TileType.CAPITAL` to the `capital` CSS class. The regression is isolated to
`src/styles/board.less`, where upstream commit `fe789c1521` replaced the
Capital sprite with `.board-space-tile--city()`.

## Implementation

1. Restore the explicit canonical Capital background in
   `src/styles/board.less` using the existing board sprite or equivalent
   existing asset.
2. Leave the normal city mixin and `BoardSpaceTile.vue` mapping unchanged.
3. Add a focused source/style regression test at the nearest existing test
   level.
4. Run focused tests, build, and an isolated browser visual smoke. Inspect the
   Capital and city side by side where practical and check console errors.

## Risks

- Ares composes its Capital style from the base Capital style, so the smoke must
  verify that the outline remains present.
- Sprite coordinates are easy to regress; use the coordinates from the
  pre-regression canonical implementation and protect them with a focused test.
