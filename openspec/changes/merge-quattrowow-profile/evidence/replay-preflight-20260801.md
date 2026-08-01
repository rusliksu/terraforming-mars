# Replay preflight 2026-08-01

- Source: current prod `elo-data.json`
- SHA-256: `d8024e685b7e1d15ab3e57770d7f444abffb15718d2bb68237fbacc4b25cf93d`
- Release base: `d9853c3c49f30649a3a6ef8ab1c1cf26e59543ee`
- Alias delta: added only `quattrowow`, `александр`, `саша` → `Quattrowow`; no changed or removed mappings
- Games: 359 before, 359 after
- Profiles: 40 before, 38 after
- Direct rename: 8 games
- Rating-field changes: 109 games, 162 results
- Union of changed games: 113
- Other affected profiles: 13; placement Elo delta range 0…+7
- `Quattrowow`: 10 games, placement Elo 1484, VP Elo 1500
- Sports projection (places, VP, corporations, order): unchanged
- Second replay: byte-stable/idempotent
- Unrelated `Nuke` merge observed on `origin/main`: absent on the corrected live-based branch
