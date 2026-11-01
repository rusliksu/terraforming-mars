# WP04 review cycle 1 — REJECT

Independent Reviewer Renata reviewed pinned head `17ae2fdcbed44393b5e6a77444712cfc49a93cde`, including native base `c0e17f9949`. Parent independently reproduced the finding and verified the reported boundaries. Full UI rows and staging remain open.

## P2 — Turmoil silently loses delegates beyond twelve seats

`src/client/wrybit/expansions/turmoil/TurmoilBoard.vue:26` iterates only `wedges[index].seats`; `turmoilHemicycle.ts:9` supplies 3+4+5 = 12 seats. A valid party with blue:7, red:7 and blue leader has 13 seated delegates; the final red delegate disappears without an overflow count. Our native Party has no twelve-delegate party limit. The current small-count fixture misses this loss of public information. Parent separately reproduced 14 seated / 12 visible / 2 missing through the production helpers.

Required: preserve all native colors/counts, through additional seats or visible exact overflow counts. Add a regression above twelve seated delegates and a model refresh changing the overflow composition and removing it. Keep native game effects and delegate controllers unchanged.

| Generated checklist | Verdict |
|---|---|
| 1 Production callers | PASS |
| 2 Tests invoke production paths | PASS |
| 3 Empty returns justified | PASS |
| 4 FR coverage / component readiness | FAIL: overflow data loss |
| 5 Frozen surfaces | PASS |
| 6 Locked decisions | PASS |
| 7 Shared ownership | PASS |
| 8 Production fragility | PASS |

No other confirmed blockers found in the scoped colonies/trade, Moon, Planets or Delta connections. Full native gate independently checked: 12919 total /12916 passed /3 skipped /0 failures/errors; combined JUnit SHA256 `b552a6ce5add1e39ea6a8469f09c7d288396a8ddf59999879e7c51a66a34ea0b`. Parent repeated AST checks for seven amount and fifteen placement producers, frozen diff0 and 960 raw codemap hashes. Passing tests do not cover the overflow.

Review profile was resolver-loaded Reviewer Renata; the CLI claim recorded reviewer role with explicit-absent profile metadata. Next claim should pass the resolved `--profile` explicitly; do not fabricate or rewrite previous events.
