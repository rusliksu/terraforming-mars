# Tasks: distinct Capital tile artwork

## WP01 - restore and verify Capital rendering

- [x] T001 Confirm current upstream and custom main still alias Capital to city.
- [x] T002 Add a focused regression test for the distinct Capital style.
- [x] T003 Restore the canonical Capital board artwork without changing cities.
- [x] T004 Run focused tests and production build.
- [x] T005 Run isolated Playwright visual smoke and inspect console errors.
- [ ] T006 Review diff, commit, push, open the task PR, and close governance
      records with actual evidence.

### Acceptance

WP01 is complete when S1-S3 are verified, the focused regression and build are
green, the browser smoke shows a visually distinct Capital with no unexpected
console errors, and no live game or production environment was changed.

### Evidence

- test-first regression: failed before the style fix, then passed;
- full `tests/Style.spec.ts`: 29 passing;
- `BoardSpaceTile.spec.ts`: 1 passing;
- `build:tests`, targeted stylelint, and production build: passed;
- isolated compiled-CSS Playwright smoke: ordinary city grey, Capital white,
  Capital + Ares white with yellow outline; 0 console errors and 0 warnings;
- screenshot: `output/playwright/capital-tile/capital-tile-smoke.png`.
