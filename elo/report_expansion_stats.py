#!/usr/bin/env python3
"""Report aggregate game length and score stats by expansions and colonies.

The report is read-only: it reads the Terraforming Mars SQLite game database
and writes a local markdown or JSON artifact.
"""

from __future__ import annotations

import argparse
import itertools
import json
import math
import os
import re
import sqlite3
import statistics
import sys
import tempfile
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_DB_PATH = Path(os.environ.get("TM_DB_PATH", "/home/openclaw/tm-runtime/prod/shared/db/game.db"))
DEFAULT_OUTPUT = SCRIPT_DIR.parent / "artifacts" / "expansion-stats.md"

TEST_NAMES = {"test", "testa", "testb", "testc", "bot", "botsmoke"}
SYNTHETIC_PLAYER_NAME_RE = re.compile(r"(?:[A-Za-z]|InputLog\d+|Seq[A-Za-z])", re.IGNORECASE)

EXPANSION_FLAGS = [
    ("preludeExtension", "prelude", "Prelude"),
    ("prelude2Expansion", "prelude2", "Prelude 2"),
    ("venusNextExtension", "venus", "Venus"),
    ("coloniesExtension", "colonies", "Colonies"),
    ("turmoilExtension", "turmoil", "Turmoil"),
    ("aresExtension", "ares", "Ares"),
    ("moonExpansion", "moon", "Moon"),
    ("pathfindersExpansion", "pathfinders", "Pathfinders"),
    ("ceoExtension", "ceo", "CEO"),
    ("underworldExpansion", "underworld", "Underworld"),
    ("promoCardsOption", "promo", "Promo cards"),
    ("communityCardsOption", "community", "Community cards"),
    ("starWarsExpansion", "starwars", "Star Wars"),
    ("deltaProjectExpansion", "deltaProject", "Delta Project"),
]


@dataclass(frozen=True)
class GameRecord:
    game_id: str
    generation: int
    player_count: int
    avg_vp: float
    winner_vp: float
    expansions: frozenset[str]
    colonies: tuple[str, ...]
    completed_time: int
    duration_minutes: float | None


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", default=str(DEFAULT_DB_PATH), help="SQLite game.db path")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT), help="Output report path")
    parser.add_argument("--format", choices=("markdown", "json"), default="markdown")
    parser.add_argument("--min-games", type=int, default=3, help="Minimum games for combo sections")
    parser.add_argument("--since", help="Unix seconds or ISO date lower bound for completed_time")
    parser.add_argument("--include-no-elo", action="store_true", help="Include noEloGame records")
    parser.add_argument("--include-solo", action="store_true", help="Include solo games")
    parser.add_argument("--top", type=int, default=20, help="Rows per ranked section")
    parser.add_argument("--self-test", action="store_true", help="Run regression smoke test")
    return parser.parse_args(argv)


def parse_since(raw: str | None) -> int | None:
    if raw is None:
        return None
    raw = raw.strip()
    if raw.isdigit():
        return int(raw)
    parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    return int(parsed.timestamp())


def parse_json(raw: object, fallback):
    if not raw:
        return fallback
    try:
        return json.loads(str(raw))
    except Exception:
        return fallback


def numeric(value: object, default: float = 0.0) -> float:
    if isinstance(value, (int, float)) and math.isfinite(value):
        return float(value)
    if isinstance(value, str):
        try:
            parsed = float(value)
        except ValueError:
            return default
        return parsed if math.isfinite(parsed) else default
    return default


def is_synthetic_name(value: object) -> bool:
    return SYNTHETIC_PLAYER_NAME_RE.fullmatch(str(value or "").strip()) is not None


def is_bot_or_test_game(names: Iterable[str]) -> bool:
    clean = [name.strip() for name in names if name and name.strip()]
    if not clean:
        return False
    if all(len(name) <= 2 for name in clean):
        return True
    if any(name.lower() in TEST_NAMES for name in clean):
        return True
    return len(clean) >= 2 and all(is_synthetic_name(name) for name in clean)


def option_enabled(options: dict, flag_key: str, expansion_key: str) -> bool:
    if options.get(flag_key) is True:
        return True
    expansions = options.get("expansions")
    if isinstance(expansions, dict) and expansions.get(expansion_key) is True:
        return True
    if isinstance(expansions, list) and expansion_key in expansions:
        return True
    return False


def extract_expansions(options: dict) -> frozenset[str]:
    enabled: list[str] = []
    for flag_key, expansion_key, label in EXPANSION_FLAGS:
        if option_enabled(options, flag_key, expansion_key):
            enabled.append(label)
    return frozenset(enabled)


def extract_colonies(game_state: dict, options: dict) -> tuple[str, ...]:
    if not option_enabled(options, "coloniesExtension", "colonies"):
        return ()
    colonies = game_state.get("colonies")
    if not isinstance(colonies, list):
        return ()
    names: list[str] = []
    for colony in colonies:
        name = None
        active = True
        if isinstance(colony, str):
            name = colony
        elif isinstance(colony, dict):
            name = colony.get("name")
            active = colony.get("isActive", True) is not False
        if active and isinstance(name, str) and name.strip():
            names.append(name.strip())
    return tuple(sorted(set(names)))


def scores_from_row(scores_json: object, latest_game: dict) -> list[dict]:
    scores = parse_json(scores_json, [])
    if not isinstance(scores, list):
        return []
    players = latest_game.get("players")
    if isinstance(players, list) and len(players) == len(scores):
        for idx, score in enumerate(scores):
            if isinstance(score, dict) and not str(score.get("playerName") or "").strip():
                fallback = players[idx]
                if isinstance(fallback, dict):
                    score["playerName"] = fallback.get("name", "")
    return [score for score in scores if isinstance(score, dict)]


def load_records(db_path: Path, since: int | None, include_no_elo: bool, include_solo: bool) -> list[GameRecord]:
    if not db_path.exists() or db_path.stat().st_size == 0:
        raise FileNotFoundError(f"SQLite database is missing or empty: {db_path}")

    clauses: list[str] = []
    params: list[object] = []
    if since is not None:
        clauses.append("COALESCE(cg.completed_time, 0) >= ?")
        params.append(since)
    where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""

    sql = f"""
    WITH first_save AS (
      SELECT game_id, MIN(created_time) AS started_time
      FROM games
      GROUP BY game_id
    ),
    latest_games AS (
      SELECT g.game_id, g.game
      FROM games g
      JOIN (
        SELECT game_id, MAX(save_id) AS max_save_id
        FROM games
        GROUP BY game_id
      ) latest ON latest.game_id = g.game_id AND latest.max_save_id = g.save_id
    )
    SELECT
      gr.game_id,
      gr.players,
      gr.generations,
      gr.scores,
      gr.game_options,
      COALESCE(cg.completed_time, 0) AS completed_time,
      COALESCE(fs.started_time, 0) AS started_time,
      lg.game AS latest_game_json
    FROM game_results gr
    LEFT JOIN completed_game cg ON cg.game_id = gr.game_id
    LEFT JOIN first_save fs ON fs.game_id = gr.game_id
    LEFT JOIN latest_games lg ON lg.game_id = gr.game_id
    {where_sql}
    ORDER BY COALESCE(cg.completed_time, 0), gr.game_id
    """

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(sql, params).fetchall()
    finally:
        conn.close()

    records: list[GameRecord] = []
    for row in rows:
        options = parse_json(row["game_options"], {})
        latest_game = parse_json(row["latest_game_json"], {})
        if not isinstance(options, dict):
            options = {}
        if not isinstance(latest_game, dict):
            latest_game = {}
        if options.get("noEloGame") is True and not include_no_elo:
            continue

        scores = scores_from_row(row["scores"], latest_game)
        if len(scores) < 1:
            continue
        if len(scores) == 1 and not include_solo:
            continue
        if len(scores) < 2 and not include_solo:
            continue

        names = [str(score.get("playerName") or "") for score in scores]
        if is_bot_or_test_game(names):
            continue
        vps = [numeric(score.get("playerScore"), float("nan")) for score in scores]
        vps = [vp for vp in vps if math.isfinite(vp)]
        if len(vps) != len(scores):
            continue

        completed_time = int(numeric(row["completed_time"], 0))
        started_time = int(numeric(row["started_time"], 0))
        duration_minutes = None
        if completed_time > 0 and started_time > 0 and completed_time >= started_time:
            duration_minutes = (completed_time - started_time) / 60

        records.append(
            GameRecord(
                game_id=str(row["game_id"]),
                generation=int(numeric(row["generations"], 0)),
                player_count=len(scores),
                avg_vp=statistics.fmean(vps),
                winner_vp=max(vps),
                expansions=extract_expansions(options),
                colonies=extract_colonies(latest_game, options),
                completed_time=completed_time,
                duration_minutes=duration_minutes,
            )
        )
    return records


def avg(values: Iterable[float]) -> float | None:
    values = [value for value in values if value is not None and math.isfinite(value)]
    if not values:
        return None
    return statistics.fmean(values)


def summarize(records: list[GameRecord]) -> dict:
    return {
        "games": len(records),
        "avgGeneration": avg(record.generation for record in records),
        "avgPlayerVP": avg(record.avg_vp for record in records),
        "avgWinnerVP": avg(record.winner_vp for record in records),
        "avgDurationMinutes": avg(record.duration_minutes for record in records if record.duration_minutes is not None),
    }


def summarize_group(name: str, records: list[GameRecord]) -> dict:
    summary = summarize(records)
    return {"name": name, **summary}


def with_without_rows(records: list[GameRecord], labels: list[str], accessor) -> list[dict]:
    rows = []
    for label in labels:
        with_records = [record for record in records if label in accessor(record)]
        without_records = [record for record in records if label not in accessor(record)]
        with_summary = summarize(with_records)
        without_summary = summarize(without_records)
        row = {
            "name": label,
            "with": with_summary,
            "without": without_summary,
            "deltaGeneration": None,
            "deltaAvgPlayerVP": None,
            "deltaWinnerVP": None,
        }
        if with_summary["avgGeneration"] is not None and without_summary["avgGeneration"] is not None:
            row["deltaGeneration"] = with_summary["avgGeneration"] - without_summary["avgGeneration"]
        if with_summary["avgPlayerVP"] is not None and without_summary["avgPlayerVP"] is not None:
            row["deltaAvgPlayerVP"] = with_summary["avgPlayerVP"] - without_summary["avgPlayerVP"]
        if with_summary["avgWinnerVP"] is not None and without_summary["avgWinnerVP"] is not None:
            row["deltaWinnerVP"] = with_summary["avgWinnerVP"] - without_summary["avgWinnerVP"]
        rows.append(row)
    return rows


def grouped_rows(records: list[GameRecord], key_fn, min_games: int) -> list[dict]:
    groups: dict[str, list[GameRecord]] = defaultdict(list)
    for record in records:
        groups[key_fn(record)].append(record)
    rows = [summarize_group(name, group) for name, group in groups.items() if len(group) >= min_games]
    return sorted(rows, key=lambda row: (-row["games"], row["name"]))


def pair_rows(records: list[GameRecord], labels: list[str], accessor, min_games: int) -> list[dict]:
    rows = []
    for first, second in itertools.combinations(labels, 2):
        pair = frozenset((first, second))
        with_records = [record for record in records if pair.issubset(accessor(record))]
        if len(with_records) < min_games:
            continue
        without_records = [record for record in records if not pair.issubset(accessor(record))]
        with_summary = summarize(with_records)
        without_summary = summarize(without_records)
        delta_gen = None
        delta_vp = None
        if with_summary["avgGeneration"] is not None and without_summary["avgGeneration"] is not None:
            delta_gen = with_summary["avgGeneration"] - without_summary["avgGeneration"]
        if with_summary["avgPlayerVP"] is not None and without_summary["avgPlayerVP"] is not None:
            delta_vp = with_summary["avgPlayerVP"] - without_summary["avgPlayerVP"]
        rows.append({
            "name": f"{first} + {second}",
            "with": with_summary,
            "without": without_summary,
            "deltaGeneration": delta_gen,
            "deltaAvgPlayerVP": delta_vp,
        })
    return sorted(rows, key=lambda row: (abs(row["deltaGeneration"] or 0), abs(row["deltaAvgPlayerVP"] or 0)), reverse=True)


def fmt(value: object, digits: int = 1) -> str:
    if value is None:
        return "n/a"
    if isinstance(value, float):
        if not math.isfinite(value):
            return "n/a"
        return f"{value:.{digits}f}"
    return str(value)


def markdown_table(headers: list[str], rows: list[list[object]]) -> str:
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join("---" for _ in headers) + " |",
    ]
    for row in rows:
        lines.append("| " + " | ".join(str(cell) for cell in row) + " |")
    return "\n".join(lines)


def build_report(records: list[GameRecord], min_games: int, top: int) -> dict:
    expansion_labels = [label for _, _, label in EXPANSION_FLAGS]
    present_expansions = sorted({label for record in records for label in record.expansions}, key=expansion_labels.index)
    colony_games = [record for record in records if "Colonies" in record.expansions]
    colony_labels = sorted({name for record in colony_games for name in record.colonies})

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "overall": summarize(records),
        "expansions": with_without_rows(records, present_expansions, lambda record: record.expansions),
        "expansionCombos": grouped_rows(
            records,
            lambda record: "Base/no tracked expansions" if not record.expansions else " + ".join(sorted(record.expansions)),
            min_games,
        )[:top],
        "expansionPairs": pair_rows(records, present_expansions, lambda record: record.expansions, min_games)[:top],
        "colonies": with_without_rows(colony_games, colony_labels, lambda record: record.colonies),
        "colonyCombos": grouped_rows(
            colony_games,
            lambda record: "Unknown colonies" if not record.colonies else " + ".join(record.colonies),
            min_games,
        )[:top],
        "colonyPairs": pair_rows(colony_games, colony_labels, lambda record: record.colonies, min_games)[:top],
    }


def render_markdown(report: dict, db_path: Path, min_games: int) -> str:
    overall = report["overall"]
    lines = [
        "# TM Expansion and Colony Stats",
        "",
        f"- Generated: `{report['generatedAt']}`",
        f"- Source DB: `{db_path}`",
        f"- Games included: {overall['games']}",
        f"- Overall avg generation: {fmt(overall['avgGeneration'])}",
        f"- Overall avg player VP: {fmt(overall['avgPlayerVP'])}",
        f"- Overall avg winner VP: {fmt(overall['avgWinnerVP'])}",
        f"- Overall avg DB save-window minutes: {fmt(overall['avgDurationMinutes'])}",
        "",
        "Caveat: this is observational production data. Deltas are `with item` minus `without item`; they are not causal balance estimates and are confounded by player count, map, draft, skill, and option bundles.",
        "",
        "`Avg gen` is the reliable gameplay-length metric. `Avg DB min` is only the database save-window between first and completed saves; it can be zero or too short after imports/migrations.",
        "",
        "## Expansions",
        "",
    ]
    lines.append(markdown_table(
        ["Expansion", "Games", "Avg gen", "Avg DB min", "Avg VP", "Winner VP", "Delta gen", "Delta VP"],
        [
            [
                row["name"],
                row["with"]["games"],
                fmt(row["with"]["avgGeneration"]),
                fmt(row["with"]["avgDurationMinutes"]),
                fmt(row["with"]["avgPlayerVP"]),
                fmt(row["with"]["avgWinnerVP"]),
                fmt(row["deltaGeneration"], 2),
                fmt(row["deltaAvgPlayerVP"], 2),
            ]
            for row in report["expansions"]
        ],
    ))
    lines.extend(["", "## Expansion Combinations", ""])
    lines.append(f"Minimum games per row: {min_games}.")
    lines.append("")
    lines.append(markdown_table(
        ["Combination", "Games", "Avg gen", "Avg DB min", "Avg VP", "Winner VP"],
        [
            [row["name"], row["games"], fmt(row["avgGeneration"]), fmt(row["avgDurationMinutes"]), fmt(row["avgPlayerVP"]), fmt(row["avgWinnerVP"])]
            for row in report["expansionCombos"]
        ],
    ))
    lines.extend(["", "## Interesting Expansion Pairs", ""])
    lines.append(markdown_table(
        ["Pair", "Games", "Avg gen", "Avg DB min", "Avg VP", "Delta gen", "Delta VP"],
        [
            [
                row["name"],
                row["with"]["games"],
                fmt(row["with"]["avgGeneration"]),
                fmt(row["with"]["avgDurationMinutes"]),
                fmt(row["with"]["avgPlayerVP"]),
                fmt(row["deltaGeneration"], 2),
                fmt(row["deltaAvgPlayerVP"], 2),
            ]
            for row in report["expansionPairs"]
        ],
    ))
    lines.extend(["", "## Colonies", ""])
    lines.append("Colony rows compare games with that colony against other games where the Colonies expansion is enabled.")
    lines.append("")
    lines.append(markdown_table(
        ["Colony", "Games", "Avg gen", "Avg DB min", "Avg VP", "Winner VP", "Delta gen", "Delta VP"],
        [
            [
                row["name"],
                row["with"]["games"],
                fmt(row["with"]["avgGeneration"]),
                fmt(row["with"]["avgDurationMinutes"]),
                fmt(row["with"]["avgPlayerVP"]),
                fmt(row["with"]["avgWinnerVP"]),
                fmt(row["deltaGeneration"], 2),
                fmt(row["deltaAvgPlayerVP"], 2),
            ]
            for row in report["colonies"]
        ],
    ))
    lines.extend(["", "## Colony Combinations", ""])
    lines.append(f"Minimum games per row: {min_games}.")
    lines.append("")
    lines.append(markdown_table(
        ["Colony set", "Games", "Avg gen", "Avg DB min", "Avg VP", "Winner VP"],
        [
            [row["name"], row["games"], fmt(row["avgGeneration"]), fmt(row["avgDurationMinutes"]), fmt(row["avgPlayerVP"]), fmt(row["avgWinnerVP"])]
            for row in report["colonyCombos"]
        ],
    ))
    lines.extend(["", "## Interesting Colony Pairs", ""])
    lines.append(markdown_table(
        ["Pair", "Games", "Avg gen", "Avg DB min", "Avg VP", "Delta gen", "Delta VP"],
        [
            [
                row["name"],
                row["with"]["games"],
                fmt(row["with"]["avgGeneration"]),
                fmt(row["with"]["avgDurationMinutes"]),
                fmt(row["with"]["avgPlayerVP"]),
                fmt(row["deltaGeneration"], 2),
                fmt(row["deltaAvgPlayerVP"], 2),
            ]
            for row in report["colonyPairs"]
        ],
    ))
    return "\n".join(lines) + "\n"


def write_report(report: dict, output_path: Path, report_format: str, db_path: Path, min_games: int) -> None:
    if str(output_path) == "-":
        if report_format == "json":
            sys.stdout.write(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
        else:
            sys.stdout.write(render_markdown(report, db_path, min_games))
        return

    output_path.parent.mkdir(parents=True, exist_ok=True)
    if report_format == "json":
        output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    else:
        output_path.write_text(render_markdown(report, db_path, min_games), encoding="utf-8")


def create_test_db(db_path: Path) -> None:
    conn = sqlite3.connect(db_path)
    conn.executescript(
        """
        CREATE TABLE game_results (
            game_id TEXT PRIMARY KEY,
            players INTEGER,
            generations INTEGER,
            scores TEXT,
            game_options TEXT
        );
        CREATE TABLE completed_game (
            game_id TEXT PRIMARY KEY,
            completed_time INTEGER
        );
        CREATE TABLE games (
            game_id TEXT,
            save_id INTEGER,
            created_time INTEGER,
            game TEXT
        );
        """
    )
    samples = [
        ("g1", 8, {"preludeExtension": True}, ["Luna", "Triton"], [74, 68]),
        ("g2", 10, {"preludeExtension": True, "coloniesExtension": True}, ["Luna", "Pluto"], [92, 81]),
        ("g3", 11, {"venusNextExtension": True, "coloniesExtension": True}, ["Titan", "Pluto"], [88, 77]),
    ]
    for idx, (gid, generation, options, colonies, vps) in enumerate(samples, start=1):
        scores = [
            {"playerName": f"Player{idx}A", "playerScore": vps[0], "place": 1, "corporation": "Teractor"},
            {"playerName": f"Player{idx}B", "playerScore": vps[1], "place": 2, "corporation": "Inventrix"},
        ]
        snapshot = {
            "players": [{"name": f"Player{idx}A"}, {"name": f"Player{idx}B"}],
            "colonies": [{"name": name, "isActive": True} for name in colonies],
        }
        conn.execute(
            "INSERT INTO game_results VALUES (?, ?, ?, ?, ?)",
            (gid, 2, generation, json.dumps(scores), json.dumps(options)),
        )
        conn.execute("INSERT INTO completed_game VALUES (?, ?)", (gid, 1000 + idx))
        conn.execute("INSERT INTO games VALUES (?, ?, ?, ?)", (gid, 1, 900 + idx, json.dumps(snapshot)))
    conn.commit()
    conn.close()


def self_test() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        db_path = Path(tmp) / "game.db"
        create_test_db(db_path)
        records = load_records(db_path, since=None, include_no_elo=False, include_solo=False)
        assert len(records) == 3, records
        report = build_report(records, min_games=1, top=20)
        assert report["overall"]["games"] == 3
        assert any(row["name"] == "Prelude" and row["with"]["games"] == 2 for row in report["expansions"])
        assert any(row["name"] == "Pluto" and row["with"]["games"] == 2 for row in report["colonies"])
        rendered = render_markdown(report, db_path, min_games=1)
        assert "TM Expansion and Colony Stats" in rendered
        assert "Pluto" in rendered


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    if args.self_test:
        self_test()
        print("self-test ok")
        return 0

    db_path = Path(args.db)
    records = load_records(
        db_path=db_path,
        since=parse_since(args.since),
        include_no_elo=args.include_no_elo,
        include_solo=args.include_solo,
    )
    report = build_report(records, min_games=max(1, args.min_games), top=max(1, args.top))
    output_path = Path(args.output)
    write_report(report, output_path, args.format, db_path, max(1, args.min_games))
    print(f"wrote {output_path} ({report['overall']['games']} games)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
