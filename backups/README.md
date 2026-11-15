# Finished-game compaction backups

SQL dumps of rows deleted from the live SQLite database by
scripts/compact_finished_games.ps1 (see scripts/README-staging.md).

- prod/finished-compaction-prod-20261113T222909Z.sql - 287,965,184 bytes,
  sha256 362779cf7755f3ae8a590f16b9b99274f11a730c16d5da836d087f009eb61cbd,
  2208 INSERT rows for 5 games (one compaction batch of the 2026-11-14 prod run).
- staging/*.sql - small runs from 2026-11-14 (staging verification of the new default).

Restore (needs the games table schema):

    sqlite3 game.db < finished-compaction-<env>-<stamp>.sql

Note: the 2026-11-14 prod compaction removed rows in several batches; this dump keeps one
batch (5 games). Full histories of the compacted games live in the attached archives
(history_archives plus /home/openclaw/.local/share/tm-history-archive/archives) and in the
full snapshot prod/backups/20261108215601-...-game.db.gz on the VPS.

Recovery check 2026-11-14: the 2026-11-08 full snapshot on the VPS
(prod/backups/20261108215601-...-game.db.gz, 2.26 GB gz / 18.40 GB db) contains the complete
pre-compaction history of all 271 compacted games: 101,594 rows / 14.83 GB, and every
compacted game's final save id is present. Eight sampled saves are byte-identical
to the attached archives. Restoring those rows would undo the size win; keep the
snapshot as the raw recovery source.


## Restored games (2026-11-14)

Two compacted prod games were restored from the 2026-11-08 snapshot with
scripts/restore_finished_game_history.ps1. Space was intentionally not reclaimed.

| game | name | spectator | rows restored | saves now |
| --- | --- | --- | --- | --- |
| g10737534e5cd | Erratic Inertia Drift | s316f1998f8a8 | 433 | 434 (save_id 0..573) |
| g13190060e75d | Rarefied Laser Beam | s53883b280b2 | 574 | 575 (save_id 0..767) |

- Source snapshot: /home/openclaw/tm-runtime/prod/backups/20261108215601-2896962-05499b9c4648da1baa9483ac91be2609-game.db.gz
  (2.26 GB gz / 18.40 GB db, gzip -t passed; the extracted copy was removed after the run).
- Command used:
  pwsh -File scripts\restore_finished_game_history.ps1 -Environment prod -AllowProd -Games g10737534e5cd,g13190060e75d -Apply
- Dry run for the same selection:
  pwsh -File scripts\restore_finished_game_history.ps1 -Environment prod -AllowProd -Games g10737534e5cd,g13190060e75d
- Sizes: prod game.db 3,744,460,800 -> 3,895,496,704 bytes (+151,035,904 bytes for 1,007 rows).
- Verification: PRAGMA quick_check = ok; replay API returns 434 and 575 frames; frames saveId=0
  (14,843 bytes) and saveId=300 (92,922 bytes) answer 200; the /replay?id=s316f1998f8a8 page
  renders "Saved state 1 / 434" with zero console errors; server health 200, no restart.

To reclaim the space later, compact these games again with scripts/compact_finished_games.ps1;
the verified per-run backup now stays on the VPS by default (scripts/README-staging.md).
