#!/usr/bin/env python3
"""Incrementally sync Elo from TM game.db into elo-data.json/data.json.

Behavior:
- If Elo file is empty/missing, seed it with only the last N finished games (default 1).
- On subsequent runs, append only finished games not already present in Elo.
- Rebuild player ratings from stored games after each sync.

Usage on VPS:
  python3 /home/openclaw/scripts/tm-sync-elo.py
  python3 /home/openclaw/scripts/tm-sync-elo.py --seed-last 3
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List
from elo_aliases import assert_no_suspicious_duplicate_players, normalize_name

SCRIPT_DIR = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("TM_DB_PATH", "/home/openclaw/tm-runtime/prod/shared/db/game.db"))
ELO_DIR = Path(os.environ.get("TM_ELO_DIR", "/home/openclaw/tm-runtime/prod/shared/elo"))
ELO_LOAD_PATHS = [
    ELO_DIR / "elo-data.json",
    ELO_DIR / "data.json",
]
ELO_SAVE_PATHS = [
    ELO_DIR / "elo-data.json",
    ELO_DIR / "data.json",
]
SOLO_RECORDS_PATH = ELO_DIR / "solo-records.json"
SOLO_OVERRIDES_PATH = ELO_DIR / "solo-record-overrides.json"
STATS_PATH = ELO_DIR / "stats.json"
EXCLUDED_GAMES_PATHS = [
    Path(os.environ["TM_EXCLUDED_GAMES_PATH"]) if os.environ.get("TM_EXCLUDED_GAMES_PATH") else None,
    SCRIPT_DIR / "excluded_games.json",
    ELO_DIR / "excluded_games.json",
]
PLAYER_NAME_OVERRIDES_PATHS = [
    Path(os.environ["TM_PLAYER_NAME_OVERRIDES_PATH"]) if os.environ.get("TM_PLAYER_NAME_OVERRIDES_PATH") else None,
    SCRIPT_DIR / "player_name_overrides.json",
    ELO_DIR / "player_name_overrides.json",
]

CARD_METADATA_PATHS = [
    Path(os.environ["TM_CARD_METADATA_PATH"]) if os.environ.get("TM_CARD_METADATA_PATH") else None,
    Path(os.environ["TM_REPO_ROOT"]) / "src" / "genfiles" / "cards.json" if os.environ.get("TM_REPO_ROOT") else None,
    SCRIPT_DIR.parent / "src" / "genfiles" / "cards.json",
    Path.cwd() / "src" / "genfiles" / "cards.json",
    Path("/home/openclaw/repos/terraforming-mars-upstream/src/genfiles/cards.json"),
    Path("/home/openclaw/repos/terraforming-mars/src/genfiles/cards.json"),
]
CARD_SOURCE_ROOTS = [
    Path(os.environ["TM_REPO_ROOT"]) if os.environ.get("TM_REPO_ROOT") else None,
    SCRIPT_DIR.parent,
    Path.cwd(),
    Path("/home/openclaw/repos/terraforming-mars-upstream"),
    Path("/home/openclaw/repos/terraforming-mars"),
]

DEFAULT_ELO = 1500
BASE_K = 32
MAX_TIMING_RECORD_DURATION_SECONDS = 2 * 60 * 60

TEST_NAMES = {"testa", "testb", "testc", "test", "bot"}
SOLO_BOT_NAMES = TEST_NAMES | {"botsmoke"}
UNKNOWN_SOLO_NAMES = {"", "?", "solo", "unknown"}
SOLO_EXTENSION_FLAGS = [
    ("venusNextExtension", "Venus"),
    ("coloniesExtension", "Colonies"),
    ("preludeExtension", "Prelude"),
    ("prelude2Expansion", "Prelude 2"),
    ("turmoilExtension", "Turmoil"),
    ("aresExtension", "Ares"),
    ("pathfindersExpansion", "Pathfinders"),
    ("ceoExtension", "CEO"),
    ("moonExpansion", "Moon"),
    ("underworldExpansion", "Underworld"),
]
SOLO_EXPANSION_KEYS = {
    "venus": "Venus",
    "venusnext": "Venus",
    "colonies": "Colonies",
    "prelude": "Prelude",
    "prelude2": "Prelude 2",
    "turmoil": "Turmoil",
    "ares": "Ares",
    "pathfinders": "Pathfinders",
    "pathfinder": "Pathfinders",
    "ceo": "CEO",
    "moon": "Moon",
    "underworld": "Underworld",
}

RESOURCE_PRODUCTION_KEYS = {
    "mc": "megaCreditProduction",
    "steel": "steelProduction",
    "titanium": "titaniumProduction",
    "plants": "plantProduction",
    "energy": "energyProduction",
    "heat": "heatProduction",
}
RESOURCE_AMOUNT_KEYS = {
    "mc": "megaCredits",
    "steel": "steel",
    "titanium": "titanium",
    "plants": "plants",
    "energy": "energy",
    "heat": "heat",
}
RESOURCE_LABELS = {
    "mc": "M€ production",
    "steel": "Steel production",
    "titanium": "Titanium production",
    "plants": "Plant production",
    "energy": "Energy production",
    "heat": "Heat production",
}
RESOURCE_AMOUNT_LABELS = {
    "mc": "M€",
    "steel": "Steel resources",
    "titanium": "Titanium resources",
    "plants": "Plant resources",
    "energy": "Energy resources",
    "heat": "Heat resources",
}
CARD_RESOURCE_RECORD_TYPES = {
    "Animal": "Animal resources",
    "Floater": "Floater resources",
    "Microbe": "Microbe resources",
    "Data": "Data resources",
}
PROJECT_CARD_TYPES = {"active", "automated", "event"}
TAG_KEYS = [
    "building",
    "space",
    "science",
    "earth",
    "jovian",
    "venus",
    "plant",
    "microbe",
    "animal",
    "city",
    "power",
    "mars",
]
TAG_LABELS = {
    "building": "Building tags",
    "space": "Space tags",
    "science": "Science tags",
    "earth": "Earth tags",
    "jovian": "Jovian tags",
    "venus": "Venus tags",
    "plant": "Plant tags",
    "microbe": "Microbe tags",
    "animal": "Animal tags",
    "city": "City tags",
    "power": "Power tags",
    "mars": "Mars tags",
}
CITY_TILE_TYPES = {2, 3, 20, 37, 43, "city", "capital", "ocean city", "red city", "new holland"}
GREENERY_TILE_TYPES = {0, 36, "greenery", "wetlands"}
GLOBAL_PARAMETER_METRICS = [
    "temperature",
    "oxygen",
    "oceans",
    "venus",
]
VP_BREAKDOWN_SOURCE_KEYS = {
    "terraformRating": ("terraformRating",),
    "cards": ("victoryPoints",),
    "greenery": ("greenery",),
    "city": ("city",),
    "milestones": ("milestones",),
    "awards": ("awards",),
    "escapeVelocity": ("escapeVelocity",),
    "moon": ("moonHabitats", "moonMines", "moonRoads"),
    "planetaryTracks": ("planetaryTracks",),
    "negative": ("negativeVP",),
}
PLAYER_AVG_METRICS = [
    "playedCards",
    "projectCards",
    "eventCards",
    "activeCards",
    "automatedCards",
    "cities",
    "greeneries",
    "ownedTiles",
    *GLOBAL_PARAMETER_METRICS,
]


def get_k(elo: float) -> float:
    if elo < 1400:
        return BASE_K * 1.2
    if elo < 1600:
        return BASE_K
    if elo < 1800:
        return BASE_K * 0.8
    if elo < 2000:
        return BASE_K * 0.6
    return BASE_K * 0.4


def expected_score(my_elo: float, opp_elo: float) -> float:
    return 1 / (1 + 10 ** ((opp_elo - my_elo) / 400))


def normalized_place_score(place: int, player_count: int) -> float:
    if player_count <= 1:
        return 1.0
    return max(0.0, min(1.0, 1.0 - ((place - 1) / (player_count - 1))))


def is_bot_game(scores: List[dict]) -> bool:
    names = [(s.get("playerName") or "").strip() for s in scores]
    if names and all(len(name) <= 2 for name in names):
        return True
    return any(name.lower() in TEST_NAMES for name in names if name)


def load_elo() -> dict:
    for path in ELO_LOAD_PATHS:
        if path.exists():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except Exception:
                continue
    return {"players": {}, "games": []}


def load_excluded_games() -> set[str]:
    excluded: set[str] = set()
    for path in EXCLUDED_GAMES_PATHS:
        if path is None or not path.exists():
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if isinstance(data, list):
            excluded.update(str(game_id) for game_id in data if game_id)
        elif isinstance(data, dict):
            for game_id, config in data.items():
                if isinstance(config, dict) and config.get("exclude") is False:
                    continue
                if game_id:
                    excluded.add(str(game_id))
    return excluded


def game_id_of(game: dict) -> str:
    return str(game.get("_key") or game.get("gameId") or "")


def is_excluded_game(game_id: object, excluded_games: set[str]) -> bool:
    return str(game_id or "") in excluded_games


def _player_override_key(value: object) -> str:
    key = str(value or "").strip()
    if key.isdigit() or key.startswith("index:"):
        return key
    return key.lower()


def load_player_name_overrides() -> Dict[str, Dict[str, str]]:
    overrides: Dict[str, Dict[str, str]] = {}
    for path in PLAYER_NAME_OVERRIDES_PATHS:
        if path is None or not path.exists():
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(data, dict):
            continue
        for game_id, config in data.items():
            if not game_id or not isinstance(config, dict):
                continue
            player_names = config.get("playerNames") or config.get("players") or {}
            if not isinstance(player_names, dict):
                continue
            game_overrides = overrides.setdefault(str(game_id), {})
            for source, target in player_names.items():
                target_name = str(target or "").strip()
                if target_name:
                    game_overrides[_player_override_key(source)] = target_name
    return overrides


def override_player_name(
    raw_name: object,
    game_id: object,
    player_name_overrides: Dict[str, Dict[str, str]],
    player_index: int | None = None,
) -> str:
    name = str(raw_name or "").strip()
    game_overrides = player_name_overrides.get(str(game_id or "")) or {}
    if player_index is not None:
        for key in (str(player_index), f"index:{player_index}"):
            if key in game_overrides:
                return game_overrides[key]
    return game_overrides.get(_player_override_key(name), name)


def apply_player_name_overrides_to_game(game: dict, player_name_overrides: Dict[str, Dict[str, str]]) -> None:
    game_id = game_id_of(game)
    if not game_id:
        return
    for index, result in enumerate(game.get("results") or []):
        raw_name = result.get("displayName") or result.get("name") or ""
        overridden = override_player_name(raw_name, game_id, player_name_overrides, index)
        key, display = normalize_name(overridden)
        result["name"] = key
        result["displayName"] = display


def save_elo(data: dict) -> None:
    payload = json.dumps(data, ensure_ascii=False, indent=2)
    for path in ELO_SAVE_PATHS:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(payload, encoding="utf-8")


def append_unique(values: List[str], value: str) -> None:
    if value and value not in values:
        values.append(value)


def format_solo_mode(options: dict) -> str:
    target = "TR 63" if options.get("soloTR") else "Terraform"
    expansions: List[str] = []

    for key, label in SOLO_EXTENSION_FLAGS:
        if options.get(key):
            append_unique(expansions, label)

    raw_expansions = options.get("expansions")
    if isinstance(raw_expansions, dict):
        for key, enabled in raw_expansions.items():
            if enabled:
                label = SOLO_EXPANSION_KEYS.get(str(key).replace("-", "").lower())
                if label:
                    append_unique(expansions, label)
    elif isinstance(raw_expansions, list):
        for key in raw_expansions:
            label = SOLO_EXPANSION_KEYS.get(str(key).replace("-", "").lower())
            if label:
                append_unique(expansions, label)

    if options.get("escapeVelocityMode"):
        append_unique(expansions, "EV")
    if options.get("twoCorpsVariant"):
        append_unique(expansions, "2 corps")

    if expansions:
        return f"{target} · {', '.join(expansions)}"
    return target


def save_solo_records(records: List[dict]) -> None:
    payload = json.dumps(
        {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "records": records,
        },
        ensure_ascii=False,
        indent=2,
    )
    SOLO_RECORDS_PATH.parent.mkdir(parents=True, exist_ok=True)
    SOLO_RECORDS_PATH.write_text(payload, encoding="utf-8")


def save_stats(stats: dict) -> None:
    payload = json.dumps(stats, ensure_ascii=False, indent=2)
    STATS_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATS_PATH.write_text(payload, encoding="utf-8")


def load_solo_records_by_game() -> Dict[str, dict]:
    try:
        data = json.loads(SOLO_RECORDS_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}

    records_by_game: Dict[str, dict] = {}
    for record in data.get("records", []):
        game_id = record.get("gameId") or record.get("_key")
        if game_id:
            records_by_game[game_id] = record
    return records_by_game


def load_solo_overrides() -> Dict[str, dict]:
    try:
        data = json.loads(SOLO_OVERRIDES_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def useful_solo_name(value: object) -> str:
    name = str(value or "").strip()
    if name.lower() in UNKNOWN_SOLO_NAMES:
        return ""
    return name


def parse_optional_bool(value: object) -> bool | None:
    if isinstance(value, bool):
        return value
    if value is None:
        return None
    if isinstance(value, (int, float)):
        if value == 1:
            return True
        if value == 0:
            return False
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "win", "won", "yes", "1"}:
            return True
        if normalized in {"false", "loss", "lose", "lost", "no", "0"}:
            return False
    return None


def last_solo_generation(options: dict) -> int:
    generation = 14
    if options.get("preludeExtension"):
        generation -= 2
    if options.get("moonExpansion") and not options.get("soloTR") and options.get("requiresMoonTrackCompletion"):
        generation += 2
    return generation


def count_ocean_tiles(game_state: dict) -> int:
    spaces = ((game_state.get("board") or {}).get("spaces") or [])
    oceans = 0
    for space in spaces:
        tile = space.get("tile") or {}
        tile_type = tile.get("tileType")
        if tile_type == 1 or str(tile_type).lower() == "ocean":
            oceans += 1
    return oceans


def infer_solo_win_from_game_state(game_state: dict) -> bool | None:
    players = game_state.get("players") or []
    if len(players) != 1:
        return None

    options = game_state.get("gameOptions") or {}
    player = players[0]
    if options.get("soloTR"):
        return (player.get("terraformRating") or 0) >= 63

    oxygen_maxed = (game_state.get("oxygenLevel") or 0) >= 14
    temperature_maxed = (game_state.get("temperature") or -30) >= 8
    oceans_maxed = count_ocean_tiles(game_state) >= 9
    terraformed = oxygen_maxed and temperature_maxed and oceans_maxed

    if options.get("venusNextExtension"):
        terraformed = terraformed and (game_state.get("venusScaleLevel") or 0) >= 30

    if not terraformed:
        return False

    if options.get("aresExtension") and options.get("aresExtremeVariant"):
        # Future records should persist soloWin directly; avoid guessing Ares hazard protection from JSON here.
        return None

    generation = game_state.get("generation") or 0
    return generation <= last_solo_generation(options)


def load_latest_game_states(cur: sqlite3.Cursor, game_ids: List[str]) -> tuple[Dict[str, dict], Dict[str, List[dict]]]:
    latest_game_by_game: Dict[str, dict] = {}
    latest_players_by_game: Dict[str, List[dict]] = {}

    for game_id in sorted(set(game_ids)):
        cur.execute(
            """
            SELECT game
            FROM games
            WHERE game_id = ?
            ORDER BY save_id DESC
            LIMIT 1
            """,
            (game_id,),
        )
        row = cur.fetchone()
        if row is None or not row[0]:
            continue
        try:
            game_state = json.loads(row[0])
        except Exception:
            continue
        latest_game_by_game[game_id] = game_state
        players = game_state.get("players")
        if isinstance(players, list):
            latest_players_by_game[game_id] = players

    return latest_game_by_game, latest_players_by_game


def fetch_finished_games() -> List[dict]:
    excluded_games = load_excluded_games()
    player_name_overrides = load_player_name_overrides()
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()
    cur.execute(
        """
        SELECT gr.game_id,
               gr.generations,
               gr.scores,
               COALESCE(cg.completed_time, 0) AS completed_time,
               json_extract(gr.game_options, '$.boardName') AS board_name,
               (
                   SELECT json_extract(g.game, '$.spectatorId')
                   FROM games g
                   WHERE g.game_id = gr.game_id
                   ORDER BY g.save_id DESC
                   LIMIT 1
               ) AS spectator_id
        FROM game_results gr
        JOIN completed_game cg ON gr.game_id = cg.game_id
        ORDER BY COALESCE(cg.completed_time, 0), gr.game_id
        """
    )
    rows = cur.fetchall()
    _, latest_players_by_game = load_latest_game_states(cur, [row[0] for row in rows])

    conn.close()

    games: List[dict] = []
    for gid, generations, scores_json, completed_time, board_name, spectator_id in rows:
        if is_excluded_game(gid, excluded_games):
            continue
        scores = json.loads(scores_json)

        # Fill missing player names from the latest saved game state.
        if not any((s.get("playerName") or "").strip() for s in scores):
            game_players = latest_players_by_game.get(gid) or []
            if len(game_players) == len(scores):
                for si, sc in enumerate(scores):
                    sc["playerName"] = game_players[si].get("name", "")

        if len(scores) < 2 or is_bot_game(scores):
            continue

        named_scores = [
            (idx, score)
            for idx, score in enumerate(scores)
            if (score.get("playerName") or "").strip()
        ]
        if len(named_scores) < 2:
            continue

        named_scores.sort(key=lambda item: item[1].get("playerScore", 0), reverse=True)
        players = []
        for i, (original_idx, score) in enumerate(named_scores):
            vp = score.get("playerScore", 0)
            place = i + 1
            if i > 0 and vp == named_scores[i - 1][1].get("playerScore", 0):
                place = players[-1]["place"]
            raw_name = override_player_name(score.get("playerName", "?"), gid, player_name_overrides, original_idx)
            _, display_name = normalize_name(raw_name)
            players.append(
                {
                    "name": display_name,
                    "place": place,
                    "vp": vp,
                    "corp": score.get("corporation", "") or "",
                }
            )

        games.append(
            {
                "_key": gid,
                "gameId": gid,
                "endId": spectator_id or "",
                "date": datetime.fromtimestamp(completed_time or 0, tz=timezone.utc).isoformat() if completed_time else "",
                "server": "knightbyte",
                "map": board_name or "",
                "generation": generations or 0,
                "playerCount": len(players),
                "completedTime": completed_time or 0,
                "players": players,
            }
        )
    return games


def fetch_solo_records() -> List[dict]:
    existing_records = load_solo_records_by_game()
    overrides = load_solo_overrides()
    excluded_games = load_excluded_games()
    player_name_overrides = load_player_name_overrides()

    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()
    cur.execute(
        """
        SELECT gr.game_id,
               gr.generations,
               gr.scores,
               gr.game_options,
               COALESCE(cg.completed_time, 0) AS completed_time,
               json_extract(gr.game_options, '$.boardName') AS board_name,
               (
                   SELECT json_extract(g.game, '$.spectatorId')
                   FROM games g
                   WHERE g.game_id = gr.game_id
                   ORDER BY g.save_id DESC
                   LIMIT 1
               ) AS spectator_id,
               (
                   SELECT p.participant
                   FROM participants p
                   WHERE p.game_id = gr.game_id AND p.participant LIKE 's%'
                   LIMIT 1
               ) AS participant_spectator_id
        FROM game_results gr
        JOIN completed_game cg ON gr.game_id = cg.game_id
        WHERE gr.players = 1 OR json_array_length(gr.scores) = 1
        ORDER BY COALESCE(cg.completed_time, 0), gr.game_id
        """
    )
    rows = cur.fetchall()
    latest_game_by_game, latest_players_by_game = load_latest_game_states(cur, [row[0] for row in rows])

    conn.close()

    records: List[dict] = []
    for gid, generations, scores_json, options_json, completed_time, board_name, spectator_id, participant_spectator_id in rows:
        if is_excluded_game(gid, excluded_games):
            continue
        scores = json.loads(scores_json or "[]")
        if len(scores) != 1:
            continue

        score = scores[0]
        override = overrides.get(gid) or {}
        if override.get("exclude"):
            continue

        if not (score.get("playerName") or "").strip():
            game_players = latest_players_by_game.get(gid) or []
            if len(game_players) == 1:
                score["playerName"] = game_players[0].get("name", "")

        existing_record = existing_records.get(gid) or {}
        raw_name = useful_solo_name(override.get("playerName"))
        name_source = "override" if raw_name else ""
        if not raw_name:
            raw_name = useful_solo_name(score.get("playerName"))
            name_source = "game_results" if raw_name else ""
        if not raw_name:
            raw_name = useful_solo_name(existing_record.get("displayName") or existing_record.get("name"))
            name_source = "existing" if raw_name else ""
        if not raw_name:
            continue
        raw_name = override_player_name(raw_name, gid, player_name_overrides, 0)

        if raw_name.lower() in SOLO_BOT_NAMES:
            continue

        solo_win = parse_optional_bool(override.get("soloWin"))
        solo_win_source = "override" if solo_win is not None else ""
        if solo_win is None:
            solo_win = parse_optional_bool(score.get("soloWin"))
            solo_win_source = "game_results" if solo_win is not None else ""
        if solo_win is None:
            solo_win = infer_solo_win_from_game_state(latest_game_by_game.get(gid) or {})
            solo_win_source = "game_state" if solo_win is not None else ""
        if solo_win is None:
            solo_win = parse_optional_bool(existing_record.get("soloWin"))
            solo_win_source = "existing" if solo_win is not None else ""

        key, display_name = normalize_name(raw_name)
        try:
            vp = int(score.get("playerScore", 0) or 0)
        except (TypeError, ValueError):
            vp = 0
        try:
            generation = int(generations or 0)
        except (TypeError, ValueError):
            generation = 0

        try:
            options = json.loads(options_json or "{}")
        except Exception:
            options = {}

        records.append(
            {
                "_key": gid,
                "gameId": gid,
                "endId": spectator_id or participant_spectator_id or "",
                "date": datetime.fromtimestamp(completed_time or 0, tz=timezone.utc).isoformat() if completed_time else "",
                "server": "knightbyte",
                "map": board_name or "",
                "mode": format_solo_mode(options),
                "soloTR": bool(options.get("soloTR")),
                "generation": generation,
                "completedTime": completed_time or 0,
                "name": key,
                "displayName": display_name,
                "nameSource": name_source,
                "soloWin": solo_win,
                "soloWinSource": solo_win_source,
                "vp": vp,
                "corp": score.get("corporation", "") or "",
            }
        )

    records.sort(
        key=lambda record: (
            -(record.get("vp", 0) or 0),
            record.get("generation", 99) or 99,
            -(record.get("completedTime", 0) or 0),
        )
    )
    return records


def safe_int(value: object, default: int = 0) -> int:
    try:
        if value is None:
            return default
        return int(value)
    except (TypeError, ValueError):
        return default


def round1(value: float) -> float:
    return round(value, 1)


def find_card_metadata_path() -> Path | None:
    for path in CARD_METADATA_PATHS:
        if path is not None and path.exists() and path.is_file():
            return path
    return None


def candidate_card_source_roots() -> List[Path]:
    roots: List[Path] = []
    seen = set()
    for root in CARD_SOURCE_ROOTS:
        if root is None:
            continue
        try:
            resolved = root.resolve()
        except Exception:
            resolved = root
        key = str(resolved)
        if key in seen:
            continue
        seen.add(key)
        if (resolved / "src" / "common" / "cards" / "CardName.ts").exists():
            roots.append(resolved)
    return roots


def parse_card_names(repo_root: Path) -> Dict[str, str]:
    path = repo_root / "src" / "common" / "cards" / "CardName.ts"
    try:
        content = path.read_text(encoding="utf-8")
    except Exception:
        return {}
    return {
        match.group(1): match.group(2)
        for match in re.finditer(r"\b([A-Z0-9_]+)\s*=\s*'([^']+)'", content)
    }


def infer_card_type(path: Path, content: str) -> str:
    match = re.search(r"type:\s*CardType\.([A-Z_]+)", content)
    if match:
        return match.group(1).lower()

    normalized_path = str(path).replace("\\", "/")
    if "extends CorporationCard" in content or "/corporation/" in normalized_path:
        return "corporation"
    if "extends PreludeCard" in content or "/prelude" in normalized_path:
        return "prelude"
    if "extends CeoCard" in content or "/ceo/" in normalized_path:
        return "ceo"
    return "unknown"


def parse_card_tags(content: str) -> List[str]:
    match = re.search(r"tags:\s*\[([^\]]*)\]", content, flags=re.S)
    if not match:
        return []
    return [tag.lower() for tag in re.findall(r"Tag\.([A-Z_]+)", match.group(1))]


def parse_numeric_property(content: str, property_name: str) -> int | None:
    match = re.search(rf"\b{re.escape(property_name)}:\s*(-?\d+)", content)
    if not match:
        return None
    return safe_int(match.group(1))


def parse_resource_type(content: str) -> str:
    match = re.search(r"resourceType:\s*CardResource\.([A-Z_]+)", content)
    if not match:
        return ""
    return match.group(1).replace("_", " ").title()


def has_requirements(content: str) -> bool:
    return "requirements:" in content or "RequirementType." in content


def load_card_metadata_from_sources() -> Dict[str, dict]:
    for root in candidate_card_source_roots():
        card_names = parse_card_names(root)
        if not card_names:
            continue

        metadata: Dict[str, dict] = {}
        cards_root = root / "src" / "server" / "cards"
        for path in cards_root.rglob("*.ts"):
            try:
                content = path.read_text(encoding="utf-8")
            except Exception:
                continue
            name_match = re.search(r"name:\s*CardName\.([A-Z0-9_]+)", content)
            if not name_match:
                continue
            name = card_names.get(name_match.group(1))
            if not name:
                continue
            entry = {
                "name": name,
                "type": infer_card_type(path, content),
                "tags": parse_card_tags(content),
                "module": path.parent.name,
                "cost": parse_numeric_property(content, "cost"),
                "victoryPoints": parse_numeric_property(content, "victoryPoints"),
                "resourceType": parse_resource_type(content),
                "hasRequirements": has_requirements(content),
            }
            metadata[name] = entry
            metadata[name.lower()] = entry
        if metadata:
            return metadata
    return {}


def load_card_metadata() -> Dict[str, dict]:
    path = find_card_metadata_path()
    if path is None:
        return load_card_metadata_from_sources()

    try:
        cards = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return load_card_metadata_from_sources()

    metadata: Dict[str, dict] = {}
    for card in cards if isinstance(cards, list) else []:
        name = str(card.get("name") or "").strip()
        if not name:
            continue
        entry = {
            "name": name,
            "type": str(card.get("type") or "unknown").lower(),
            "tags": [str(tag).lower() for tag in (card.get("tags") or [])],
            "module": card.get("module") or "",
            "cost": card.get("cost"),
            "victoryPoints": card.get("victoryPoints"),
            "resourceType": card.get("resourceType") or "",
            "hasRequirements": bool(card.get("requirements")),
        }
        metadata[name] = entry
        metadata[name.lower()] = entry
    return metadata or load_card_metadata_from_sources()


def get_card_metadata(card_metadata: Dict[str, dict], name: str) -> dict:
    return card_metadata.get(name) or card_metadata.get(str(name).lower()) or {
        "name": name,
        "type": "unknown",
        "tags": [],
        "module": "",
        "resourceType": "",
        "hasRequirements": False,
    }


def normalize_tile_type(tile_type: object) -> object:
    if isinstance(tile_type, str):
        return tile_type.strip().lower()
    return tile_type


def count_player_tiles(board: dict, player_id: str) -> dict:
    counts = {"cities": 0, "greeneries": 0, "ownedTiles": 0}
    if not player_id:
        return counts

    spaces = (board or {}).get("spaces") or []
    for space in spaces:
        if space.get("player") != player_id:
            continue
        tile = space.get("tile") or {}
        tile_type = normalize_tile_type(tile.get("tileType"))
        counts["ownedTiles"] += 1
        if tile_type in CITY_TILE_TYPES:
            counts["cities"] += 1
        if tile_type in GREENERY_TILE_TYPES:
            counts["greeneries"] += 1
    return counts


def normalize_card_resource_type(value: object) -> str:
    return str(value or "").strip()


def extract_timer_seconds(snapshot: dict) -> int:
    timer = snapshot.get("timer") or {}
    if not isinstance(timer, dict):
        return 0
    return max(0, round(safe_int(timer.get("sumElapsed")) / 1000))


def extract_vp_breakdown(score: dict) -> dict:
    breakdown = score.get("victoryPointsBreakdown") or {}
    return {
        "terraformRating": safe_int(breakdown.get("terraformRating")),
        "cards": safe_int(breakdown.get("victoryPoints")),
        "greenery": safe_int(breakdown.get("greenery")),
        "city": safe_int(breakdown.get("city")),
        "milestones": safe_int(breakdown.get("milestones")),
        "awards": safe_int(breakdown.get("awards")),
        "escapeVelocity": safe_int(breakdown.get("escapeVelocity")),
        "moon": safe_int(breakdown.get("moonHabitats")) + safe_int(breakdown.get("moonMines")) + safe_int(breakdown.get("moonRoads")),
        "planetaryTracks": safe_int(breakdown.get("planetaryTracks")),
        "negative": safe_int(breakdown.get("negativeVP")),
    }


def extract_vp_breakdown_counts(score: dict) -> dict:
    breakdown = score.get("victoryPointsBreakdown") or {}
    if not isinstance(breakdown, dict):
        return {}
    return {
        key: 1
        for key, source_keys in VP_BREAKDOWN_SOURCE_KEYS.items()
        if any(source_key in breakdown for source_key in source_keys)
    }


def extract_global_parameter_steps(snapshot: dict) -> dict:
    steps = snapshot.get("globalParameterSteps") or {}
    if not isinstance(steps, dict):
        steps = {}
    return {metric: safe_int(steps.get(metric)) for metric in GLOBAL_PARAMETER_METRICS}


def extract_card_counts(snapshot: dict, card_metadata: Dict[str, dict]) -> dict:
    played_cards = snapshot.get("playedCards") or []
    counts = {
        "playedCards": len(played_cards),
        "projectCards": 0,
        "eventCards": 0,
        "activeCards": 0,
        "automatedCards": 0,
        "preludeCards": 0,
        "corporationCards": 0,
        "ceoCards": 0,
        "unknownCards": 0,
        "noTagProjectCards": 0,
        "highCostProjectCards": 0,
        "lowCostProjectCards": 0,
        "requirementProjectCards": 0,
        "tags": {tag: 0 for tag in TAG_KEYS},
        "projectCardNames": [],
        "corporationCardNames": [],
        "preludeCardNames": [],
        "allCardNames": [],
        "cardResources": {},
        "totalCardResources": 0,
    }

    for card in played_cards:
        name = str(card.get("name") or "").strip()
        if not name:
            continue
        counts["allCardNames"].append(name)
        meta = get_card_metadata(card_metadata, name)
        card_type = meta.get("type", "unknown")
        tags = meta.get("tags", [])
        resource_count = safe_int(card.get("resourceCount"))
        resource_type = normalize_card_resource_type(meta.get("resourceType"))

        if resource_count > 0 and resource_type:
            counts["cardResources"][resource_type] = counts["cardResources"].get(resource_type, 0) + resource_count
            counts["totalCardResources"] += resource_count

        if card_type in PROJECT_CARD_TYPES:
            counts["projectCards"] += 1
            counts["projectCardNames"].append(name)
            cost = safe_int(meta.get("cost"), -1)
            if not tags:
                counts["noTagProjectCards"] += 1
            if cost >= 20:
                counts["highCostProjectCards"] += 1
            if 0 <= cost <= 10:
                counts["lowCostProjectCards"] += 1
            if meta.get("hasRequirements"):
                counts["requirementProjectCards"] += 1
        if card_type == "event":
            counts["eventCards"] += 1
        elif card_type == "active":
            counts["activeCards"] += 1
        elif card_type == "automated":
            counts["automatedCards"] += 1
        elif card_type == "prelude":
            counts["preludeCards"] += 1
            counts["preludeCardNames"].append(name)
        elif card_type == "corporation":
            counts["corporationCards"] += 1
            counts["corporationCardNames"].append(name)
        elif card_type == "ceo":
            counts["ceoCards"] += 1
        else:
            counts["unknownCards"] += 1

        if card_type != "event":
            for tag in tags:
                if tag in counts["tags"]:
                    counts["tags"][tag] += 1
    return counts


def extract_player_metrics(score: dict, snapshot: dict, board: dict, card_metadata: Dict[str, dict]) -> dict:
    card_counts = extract_card_counts(snapshot, card_metadata)
    tile_counts = count_player_tiles(board, str(snapshot.get("id") or ""))
    production = {
        resource: safe_int(snapshot.get(source_key))
        for resource, source_key in RESOURCE_PRODUCTION_KEYS.items()
    }
    resource_amounts = {
        resource: safe_int(snapshot.get(source_key))
        for resource, source_key in RESOURCE_AMOUNT_KEYS.items()
    }
    timer_seconds = extract_timer_seconds(snapshot)
    actions_taken = safe_int(snapshot.get("actionsTakenThisGame"))
    metrics = {
        "vp": safe_int(score.get("playerScore")),
        "terraformRating": safe_int(snapshot.get("terraformRating")),
        "actionsTaken": actions_taken,
        "timerSeconds": timer_seconds,
        "secondsPerAction": timer_seconds / actions_taken if timer_seconds > 0 and actions_taken > 0 else 0,
        "vpBreakdown": extract_vp_breakdown(score),
        "vpBreakdownCounts": extract_vp_breakdown_counts(score),
        "production": production,
        "totalNonMcProduction": sum(value for resource, value in production.items() if resource != "mc"),
        "resourceAmounts": resource_amounts,
        **extract_global_parameter_steps(snapshot),
        **{key: card_counts[key] for key in [
            "playedCards",
            "projectCards",
            "eventCards",
            "activeCards",
            "automatedCards",
            "preludeCards",
            "corporationCards",
            "ceoCards",
            "unknownCards",
            "noTagProjectCards",
            "highCostProjectCards",
            "lowCostProjectCards",
            "requirementProjectCards",
            "totalCardResources",
        ]},
        **tile_counts,
        "tags": card_counts["tags"],
        "cardResources": card_counts["cardResources"],
        "cardResourceTypes": len(card_counts["cardResources"]),
        "projectCardNames": card_counts["projectCardNames"],
        "corporationCardNames": card_counts["corporationCardNames"],
        "preludeCardNames": card_counts["preludeCardNames"],
        "allCardNames": card_counts["allCardNames"],
    }
    return metrics


def has_player_snapshot(snapshot: dict) -> bool:
    if not isinstance(snapshot, dict) or not snapshot:
        return False
    return bool(snapshot.get("id") or snapshot.get("name") or snapshot.get("playedCards"))


def has_detailed_game(game: dict) -> bool:
    results = game.get("results") or []
    return bool(results) and all(has_player_snapshot(result.get("snapshot") or {}) for result in results)


def fetch_stats_games() -> List[dict]:
    excluded_games = load_excluded_games()
    player_name_overrides = load_player_name_overrides()
    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()
    cur.execute(
        """
        SELECT gr.game_id,
               gr.players,
               gr.generations,
               gr.scores,
               gr.game_options,
               COALESCE(cg.completed_time, 0) AS completed_time,
               (
                   SELECT MIN(g.created_time)
                   FROM games g
                   WHERE g.game_id = gr.game_id
               ) AS created_time,
               json_extract(gr.game_options, '$.boardName') AS board_name,
               (
                   SELECT json_extract(g.game, '$.spectatorId')
                   FROM games g
                   WHERE g.game_id = gr.game_id
                   ORDER BY g.save_id DESC
                   LIMIT 1
               ) AS spectator_id,
               (
                   SELECT g.game
                   FROM games g
                   WHERE g.game_id = gr.game_id
                   ORDER BY g.save_id DESC
                   LIMIT 1
               ) AS game_json
        FROM game_results gr
        JOIN completed_game cg ON gr.game_id = cg.game_id
        ORDER BY COALESCE(cg.completed_time, 0), gr.game_id
        """
    )
    rows = cur.fetchall()
    conn.close()

    games: List[dict] = []
    for gid, player_count, generations, scores_json, options_json, completed_time, created_time, board_name, spectator_id, game_json in rows:
        if is_excluded_game(gid, excluded_games):
            continue
        try:
            scores = json.loads(scores_json or "[]")
            options = json.loads(options_json or "{}")
            game_state = json.loads(game_json or "{}")
        except Exception:
            continue

        if not scores:
            continue

        snapshots = game_state.get("players") if isinstance(game_state.get("players"), list) else []
        for idx, score in enumerate(scores):
            if not (score.get("playerName") or "").strip() and idx < len(snapshots):
                score["playerName"] = snapshots[idx].get("name", "")

        if is_bot_game(scores):
            continue

        named_scores = [
            (idx, score)
            for idx, score in enumerate(scores)
            if (score.get("playerName") or "").strip()
        ]
        if not named_scores:
            continue

        has_places = all(safe_int(score.get("place"), 0) > 0 for _, score in named_scores)
        named_scores.sort(
            key=lambda item: (
                safe_int(item[1].get("place"), 999) if has_places else -safe_int(item[1].get("playerScore")),
                -safe_int(item[1].get("playerScore")),
            )
        )

        snapshot_by_key: Dict[str, dict] = {}
        for snapshot in snapshots:
            raw_name = str(snapshot.get("name") or "").strip()
            if raw_name:
                key, _ = normalize_name(raw_name)
                snapshot_by_key[key] = snapshot

        results: List[dict] = []
        for sorted_idx, (original_idx, score) in enumerate(named_scores):
            raw_name = override_player_name(score.get("playerName"), gid, player_name_overrides, original_idx)
            key, display = normalize_name(raw_name)
            if has_places:
                place = safe_int(score.get("place"), sorted_idx + 1)
            else:
                place = sorted_idx + 1
                if sorted_idx > 0 and safe_int(score.get("playerScore")) == safe_int(named_scores[sorted_idx - 1][1].get("playerScore")):
                    place = results[-1]["place"]
            snapshot = snapshot_by_key.get(key) or (snapshots[original_idx] if original_idx < len(snapshots) else {})
            results.append(
                {
                    "name": key,
                    "displayName": display,
                    "place": place,
                    "vp": safe_int(score.get("playerScore")),
                    "corp": score.get("corporation", "") or "",
                    "score": score,
                    "snapshot": snapshot,
                }
            )

        if not results:
            continue

        games.append(
            {
                "_key": gid,
                "gameId": gid,
                "endId": spectator_id or "",
                "date": datetime.fromtimestamp(completed_time or 0, tz=timezone.utc).isoformat() if completed_time else "",
                "server": "knightbyte",
                "map": board_name or options.get("boardName") or "",
                "generation": generations or 0,
                "playerCount": player_count or len(results),
                "completedTime": completed_time or 0,
                "createdTime": created_time or 0,
                "results": results,
                "board": game_state.get("board") or {},
            }
        )
    return games


def build_elo_delta_lookup(elo_games: List[dict]) -> Dict[tuple, int]:
    lookup: Dict[tuple, int] = {}
    for game in elo_games:
        game_id = game.get("_key") or game.get("gameId")
        if not game_id:
            continue
        for result in game.get("results") or []:
            key, _ = normalize_name(result.get("displayName") or result.get("name") or "")
            lookup[(game_id, key)] = safe_int(result.get("delta"))
    return lookup


def new_player_accumulator(name: str, display_name: str) -> dict:
    return {
        "name": name,
        "displayName": display_name,
        "games": 0,
        "wins": 0,
        "totalVP": 0,
        "totalGeneration": 0,
        "bestVP": 0,
        "totals": {metric: 0 for metric in PLAYER_AVG_METRICS},
        "max": {metric: 0 for metric in PLAYER_AVG_METRICS},
        "tagTotals": {tag: 0 for tag in TAG_KEYS},
        "tagMax": {tag: 0 for tag in TAG_KEYS},
        "productionTotals": {resource: 0 for resource in RESOURCE_PRODUCTION_KEYS},
        "maxProduction": {resource: 0 for resource in RESOURCE_PRODUCTION_KEYS},
        "vpBreakdownTotals": {},
        "vpBreakdownCounts": {},
        "timingGames": 0,
        "timerSecondsValues": [],
        "secondsPerActionValues": [],
    }


def record_context(game: dict, result: dict) -> dict:
    return {
        "player": result.get("name", ""),
        "displayName": result.get("displayName", result.get("name", "")),
        "gameId": game.get("gameId") or game.get("_key"),
        "endId": game.get("endId", ""),
        "server": game.get("server", "knightbyte"),
        "generation": game.get("generation", 0),
        "vp": result.get("vp", 0),
        "corp": result.get("corp", ""),
        "date": game.get("date", ""),
        "completedTime": game.get("completedTime", 0),
    }


def maybe_update_record(
    records: Dict[str, dict],
    key: str,
    label: str,
    category: str,
    value: int | float,
    game: dict,
    result: dict,
    value_text: str | None = None,
    prefer_low: bool = False,
) -> None:
    if value <= 0:
        return
    current = records.get(key)
    if current is not None:
        current_value = current.get("value", 0)
        if prefer_low and value >= current_value:
            return
        if not prefer_low and value <= current_value:
            return
    records[key] = {
        "key": key,
        "label": label,
        "category": category,
        "value": value,
        **record_context(game, result),
    }
    if value_text:
        records[key]["valueText"] = value_text


def format_duration(seconds: int) -> str:
    if seconds <= 0:
        return ""
    if seconds < 60:
        return "<1m"
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    if hours:
        return f"{hours}h {minutes:02d}m"
    return f"{minutes}m"


def format_seconds_per_action(value: float) -> str:
    return f"{round1(value)} sec/action"


def trimmed_mean(values: List[float]) -> float | None:
    if not values:
        return None
    sorted_values = sorted(values)
    trim = int(len(sorted_values) * 0.1)
    if trim > 0 and len(sorted_values) > trim * 2:
        sorted_values = sorted_values[trim:-trim]
    return sum(sorted_values) / len(sorted_values)


def finalize_player_stats(players: Dict[str, dict]) -> List[dict]:
    finalized: List[dict] = []
    for acc in players.values():
        games = acc["games"] or 1
        avg_timer_seconds = trimmed_mean(acc["timerSecondsValues"])
        avg_seconds_per_action = trimmed_mean(acc["secondsPerActionValues"])
        timing = {
            "games": acc["timingGames"],
            "avgTimeSeconds": round1(avg_timer_seconds) if avg_timer_seconds is not None else 0,
            "avgSecondsPerAction": round1(avg_seconds_per_action) if avg_seconds_per_action is not None else 0,
        }
        finalized.append(
            {
                "name": acc["name"],
                "displayName": acc["displayName"],
                "games": acc["games"],
                "wins": acc["wins"],
                "winRate": round1(acc["wins"] / games * 100),
                "avgVP": round1(acc["totalVP"] / games),
                "bestVP": acc["bestVP"],
                "avgGeneration": round1(acc["totalGeneration"] / games),
                "averages": {metric: round1(value / games) for metric, value in acc["totals"].items()},
                "max": acc["max"],
                "avgTags": {tag: round1(value / games) for tag, value in acc["tagTotals"].items()},
                "maxTags": acc["tagMax"],
                "avgProduction": {resource: round1(value / games) for resource, value in acc["productionTotals"].items()},
                "maxProduction": acc["maxProduction"],
                "avgVPBreakdown": {
                    key: round1(value / acc["vpBreakdownCounts"][key])
                    for key, value in acc["vpBreakdownTotals"].items()
                    if acc["vpBreakdownCounts"].get(key, 0) > 0
                },
                "vpBreakdownGames": {key: value for key, value in acc["vpBreakdownCounts"].items() if value > 0},
                "timing": timing,
            }
        )
    finalized.sort(key=lambda player: (-player["games"], -player["avgVP"], player["displayName"]))
    return finalized


def finalize_card_stats(cards: Dict[str, dict]) -> List[dict]:
    finalized: List[dict] = []
    for stat in cards.values():
        played = stat["played"] or 1
        elo_delta_count = stat.get("eloDeltaCount", 0)
        finalized.append(
            {
                "name": stat["name"],
                "type": stat["type"],
                "tags": stat["tags"],
                "played": stat["played"],
                "wins": stat["wins"],
                "winRate": round1(stat["wins"] / played * 100),
                "avgVP": round1(stat["totalVP"] / played),
                "avgPlace": round1(stat["placeScoreTotal"] / played * 100),
                "avgEloDelta": round1(stat["eloDeltaTotal"] / elo_delta_count) if elo_delta_count else None,
                "eloDeltaCount": elo_delta_count,
            }
        )
    finalized.sort(
        key=lambda card: (
            -(card["avgEloDelta"] if card["avgEloDelta"] is not None else -999),
            -card["played"],
            card["name"],
        )
    )
    return finalized


def record_card_stat(cards: Dict[str, dict], card_metadata: Dict[str, dict], card_name: str, metrics: dict, result: dict, place_score: float, elo_delta: int | None) -> None:
    meta = get_card_metadata(card_metadata, card_name)
    card_stat = cards.setdefault(
        meta["name"],
        {
            "name": meta["name"],
            "type": meta.get("type", "unknown"),
            "tags": meta.get("tags", []),
            "played": 0,
            "wins": 0,
            "totalVP": 0,
            "placeScoreTotal": 0.0,
            "eloDeltaTotal": 0,
            "eloDeltaCount": 0,
        },
    )
    card_stat["played"] += 1
    card_stat["wins"] += 1 if safe_int(result.get("place")) == 1 else 0
    card_stat["totalVP"] += metrics["vp"]
    card_stat["placeScoreTotal"] += place_score
    if elo_delta is not None:
        card_stat["eloDeltaTotal"] += elo_delta
        card_stat["eloDeltaCount"] += 1


def build_stats(games: List[dict], card_metadata: Dict[str, dict], elo_games: List[dict] | None = None) -> dict:
    players: Dict[str, dict] = {}
    project_cards: Dict[str, dict] = {}
    corporation_cards: Dict[str, dict] = {}
    prelude_cards: Dict[str, dict] = {}
    records: Dict[str, dict] = {}
    generation_records: Dict[int, dict] = {}
    elo_delta_lookup = build_elo_delta_lookup(elo_games or [])

    competitive_games = [game for game in games if safe_int(game.get("playerCount")) >= 2 and len(game.get("results") or []) >= 2]
    detailed_games = [game for game in competitive_games if has_detailed_game(game)]
    detailed_player_game_count = 0
    for game in competitive_games:
        generation = safe_int(game.get("generation"))
        winner = next((result for result in game.get("results") or [] if safe_int(result.get("place")) == 1), (game.get("results") or [{}])[0])
        completed_time = safe_int(game.get("completedTime"))
        created_time = safe_int(game.get("createdTime"))
        duration_seconds = completed_time - created_time if completed_time > 0 and created_time > 0 and completed_time > created_time else 0
        total_actions = sum(safe_int((result.get("snapshot") or {}).get("actionsTakenThisGame")) for result in game.get("results") or [])
        timing_game = 0 < duration_seconds <= MAX_TIMING_RECORD_DURATION_SECONDS
        if timing_game:
            maybe_update_record(records, "longestGameDuration", "Longest game duration", "Timing", duration_seconds, game, winner, format_duration(duration_seconds))
        if timing_game and total_actions > 0:
            seconds_per_action = duration_seconds / total_actions
            maybe_update_record(records, "fastestSecondsPerAction", "Fastest sec/action", "Timing", seconds_per_action, game, winner, format_seconds_per_action(seconds_per_action), prefer_low=True)

        for result in game.get("results") or []:
            metrics = extract_player_metrics(result["score"], result.get("snapshot") or {}, game.get("board") or {}, card_metadata)
            if 6 <= generation <= 13:
                current_gen_record = generation_records.get(generation)
                if current_gen_record is None or metrics["vp"] > current_gen_record.get("vp", 0):
                    generation_records[generation] = record_context(game, result)

            maybe_update_record(records, "bestVP", "Best VP", "Score", metrics["vp"], game, result)
            maybe_update_record(records, "mostCardVP", "Most VP on cards", "VP breakdown", metrics["vpBreakdown"]["cards"], game, result)
            maybe_update_record(records, "mostCityVP", "Most city VP", "VP breakdown", metrics["vpBreakdown"]["city"], game, result)
            maybe_update_record(records, "mostGreeneryVP", "Most greenery VP", "VP breakdown", metrics["vpBreakdown"]["greenery"], game, result)

            if not has_player_snapshot(result.get("snapshot") or {}):
                continue

            detailed_player_game_count += 1
            key = result["name"]
            acc = players.setdefault(key, new_player_accumulator(key, result.get("displayName", key)))
            acc["displayName"] = result.get("displayName", acc["displayName"])
            acc["games"] += 1
            acc["wins"] += 1 if safe_int(result.get("place")) == 1 else 0
            acc["totalVP"] += metrics["vp"]
            acc["totalGeneration"] += generation
            acc["bestVP"] = max(acc["bestVP"], metrics["vp"])

            for metric in PLAYER_AVG_METRICS:
                value = safe_int(metrics.get(metric))
                acc["totals"][metric] += value
                acc["max"][metric] = max(acc["max"][metric], value)
            for tag, value in metrics["tags"].items():
                acc["tagTotals"][tag] += value
                acc["tagMax"][tag] = max(acc["tagMax"][tag], value)
            for resource, value in metrics["production"].items():
                acc["productionTotals"][resource] += value
                acc["maxProduction"][resource] = max(acc["maxProduction"][resource], value)
            for vp_key, value in metrics["vpBreakdown"].items():
                if metrics["vpBreakdownCounts"].get(vp_key, 0) <= 0:
                    continue
                acc["vpBreakdownTotals"][vp_key] = acc["vpBreakdownTotals"].get(vp_key, 0) + value
                acc["vpBreakdownCounts"][vp_key] = acc["vpBreakdownCounts"].get(vp_key, 0) + 1
            if timing_game and metrics["timerSeconds"] > 0 and metrics["actionsTaken"] > 0:
                acc["timingGames"] += 1
                acc["timerSecondsValues"].append(metrics["timerSeconds"])
                acc["secondsPerActionValues"].append(metrics["secondsPerAction"])
                maybe_update_record(records, "fastestPlayerSecondsPerAction", "Fastest player sec/action", "Timing", metrics["secondsPerAction"], game, result, format_seconds_per_action(metrics["secondsPerAction"]), prefer_low=True)

            maybe_update_record(records, "mostCards", "Most played cards", "Cards", metrics["playedCards"], game, result)
            maybe_update_record(records, "mostProjectCards", "Most project cards", "Cards", metrics["projectCards"], game, result)
            maybe_update_record(records, "mostEvents", "Most events", "Cards", metrics["eventCards"], game, result)
            maybe_update_record(records, "mostActiveCards", "Most blue cards", "Cards", metrics["activeCards"], game, result)
            maybe_update_record(records, "mostAutomatedCards", "Most green cards", "Cards", metrics["automatedCards"], game, result)
            maybe_update_record(records, "mostNoTagProjectCards", "Most no-tag project cards", "Cards", metrics["noTagProjectCards"], game, result)
            maybe_update_record(records, "mostHighCostProjectCards", "Most project cards cost 20+", "Cards", metrics["highCostProjectCards"], game, result)
            maybe_update_record(records, "mostLowCostProjectCards", "Most project cards cost 10-", "Cards", metrics["lowCostProjectCards"], game, result)
            maybe_update_record(records, "mostRequirementProjectCards", "Most project cards with requirements", "Cards", metrics["requirementProjectCards"], game, result)
            maybe_update_record(records, "mostCities", "Most cities", "Board", metrics["cities"], game, result)
            maybe_update_record(records, "mostGreeneries", "Most greeneries", "Board", metrics["greeneries"], game, result)
            maybe_update_record(records, "mostOwnedTiles", "Most owned tiles", "Board", metrics["ownedTiles"], game, result)
            maybe_update_record(records, "highestTR", "Highest TR", "Score", metrics["terraformRating"], game, result)
            maybe_update_record(records, "mostTotalCardResources", "Most card resources", "Card resources", metrics["totalCardResources"], game, result)
            maybe_update_record(records, "mostCardResourceTypes", "Most card resource types", "Card resources", metrics["cardResourceTypes"], game, result)
            maybe_update_record(records, "totalNonMcProduction", "Highest non-M€ production", "Production", metrics["totalNonMcProduction"], game, result)

            for resource, value in metrics["production"].items():
                maybe_update_record(records, f"production:{resource}", f"Highest {RESOURCE_LABELS[resource]}", "Production", value, game, result)
            for resource, value in metrics["resourceAmounts"].items():
                maybe_update_record(records, f"stockpile:{resource}", f"Most {RESOURCE_AMOUNT_LABELS[resource]}", "Resource stockpile", value, game, result)
            for resource_type, label in CARD_RESOURCE_RECORD_TYPES.items():
                maybe_update_record(records, f"cardResource:{resource_type}", f"Most {label}", "Card resources", safe_int(metrics["cardResources"].get(resource_type)), game, result)
            for tag, value in metrics["tags"].items():
                maybe_update_record(records, f"tag:{tag}", f"Most {TAG_LABELS[tag]}", "Tags", value, game, result)

            elo_delta = elo_delta_lookup.get((game.get("_key"), key))
            place_score = normalized_place_score(safe_int(result.get("place"), 99), len(game.get("results") or []))
            for card_name in metrics["projectCardNames"]:
                record_card_stat(project_cards, card_metadata, card_name, metrics, result, place_score, elo_delta)
            for card_name in metrics["corporationCardNames"]:
                record_card_stat(corporation_cards, card_metadata, card_name, metrics, result, place_score, elo_delta)
            for card_name in metrics["preludeCardNames"]:
                record_card_stat(prelude_cards, card_metadata, card_name, metrics, result, place_score, elo_delta)

    generation_records_list = [
        {
            "generation": generation,
            **generation_records[generation],
        }
        for generation in sorted(generation_records)
    ]

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "source": "tm-sync-elo",
        "gameCount": len(competitive_games),
        "playerGameCount": sum(len(game.get("results") or []) for game in competitive_games),
        "detailedGameCount": len(detailed_games),
        "detailedPlayerGameCount": detailed_player_game_count,
        "players": finalize_player_stats(players),
        "generationRecords": generation_records_list,
        "records": sorted(records.values(), key=lambda record: (record["category"], record["label"])),
        "cardStats": finalize_card_stats(project_cards),
        "corporationStats": finalize_card_stats(corporation_cards),
        "preludeStats": finalize_card_stats(prelude_cards),
    }


def rebuild_ratings(games: List[dict]) -> Dict[str, dict]:
    players: Dict[str, dict] = {}

    for game in games:
        entries = game.get("results") or []
        if len(entries) < 2:
            continue

        for entry in entries:
            key, display = normalize_name(entry.get("displayName") or entry.get("name") or "?")
            entry["name"] = key
            entry["displayName"] = display

        # Placement Elo
        for i, entry in enumerate(entries):
            key = entry["name"]
            current = players.setdefault(
                key,
                {
                    "displayName": entry["displayName"],
                    "elo": DEFAULT_ELO,
                    "elo_vp": DEFAULT_ELO,
                    "games": 0,
                    "wins": 0,
                    "top3": 0,
                    "placeScoreSum": 0.0,
                    "totalVP": 0,
                    "totalGens": 0,
                    "totalMargin": 0.0,
                    "corps": {},
                },
            )
            my_elo = current["elo"]
            total_expected = 0.0
            total_actual = 0.0
            for j, opp in enumerate(entries):
                if i == j:
                    continue
                opp_elo = players.setdefault(
                    opp["name"],
                    {
                        "displayName": opp["displayName"],
                        "elo": DEFAULT_ELO,
                        "elo_vp": DEFAULT_ELO,
                        "games": 0,
                        "wins": 0,
                        "top3": 0,
                        "placeScoreSum": 0.0,
                        "totalVP": 0,
                        "totalGens": 0,
                        "totalMargin": 0.0,
                        "corps": {},
                    },
                )["elo"]
                total_expected += expected_score(my_elo, opp_elo)
                if entry["place"] < opp["place"]:
                    total_actual += 1.0
                elif entry["place"] == opp["place"]:
                    total_actual += 0.5
            scaled_k = get_k(my_elo) / (len(entries) - 1) * 1.5
            entry["oldElo"] = my_elo
            entry["newElo"] = round(my_elo + scaled_k * (total_actual - total_expected))
            entry["delta"] = entry["newElo"] - entry["oldElo"]

        # VP Elo
        for i, entry in enumerate(entries):
            current = players[entry["name"]]
            my_elo = current["elo_vp"]
            my_vp = entry.get("vp", 0)
            total_expected = 0.0
            total_actual = 0.0
            for j, opp in enumerate(entries):
                if i == j:
                    continue
                opp_elo = players[opp["name"]]["elo_vp"]
                total_expected += expected_score(my_elo, opp_elo)
                opp_vp = opp.get("vp", 0)
                if my_vp > opp_vp:
                    margin = min((my_vp - opp_vp) / 20.0, 1.0)
                    total_actual += 0.5 + margin * 0.5
                elif my_vp == opp_vp:
                    total_actual += 0.5
                else:
                    margin = min((opp_vp - my_vp) / 20.0, 1.0)
                    total_actual += 0.5 - margin * 0.5
            scaled_k = get_k(my_elo) / (len(entries) - 1) * 1.5
            current["elo_vp"] = round(my_elo + scaled_k * (total_actual - total_expected))

        for entry in entries:
            current = players[entry["name"]]
            current["displayName"] = entry["displayName"]
            current["elo"] = entry["newElo"]
            current["games"] += 1
            # Placement scoring: 1st=1, 2nd=0.5, last=0
            num_players = len(entries)
            if entry["place"] == 1:
                current["wins"] += 1
            elif entry["place"] < num_players:
                current["wins"] += 0.5
            if entry["place"] <= 3:
                current["top3"] += 1
            current["placeScoreSum"] += normalized_place_score(entry["place"], num_players)
            current["totalVP"] += entry.get("vp", 0)
            current["totalGens"] += game.get("generation", 0) or 0
            sorted_vps = sorted((opp.get("vp", 0) for opp in entries), reverse=True)
            my_vp = entry.get("vp", 0)
            if entry["place"] == 1 and len(sorted_vps) >= 2:
                current["totalMargin"] += my_vp - sorted_vps[1]
            elif len(sorted_vps) >= 1:
                current["totalMargin"] += my_vp - sorted_vps[0]
            corp = entry.get("corp") or ""
            if corp:
                current["corps"][corp] = current["corps"].get(corp, 0) + 1

    for current in players.values():
        games = current.get("games", 0) or 0
        place_score_sum = current.pop("placeScoreSum", 0.0) or 0.0
        avg_place = round(place_score_sum / games, 3) if games > 0 else 0.0
        current["avgPlaceScore"] = avg_place
        current["avgPlace"] = avg_place
        current["avgVP"] = round(current["totalVP"] / games) if games > 0 else 0
        current["avgGens"] = round(current.get("totalGens", 0) / games, 1) if games > 0 else 0.0
        current["avgMargin"] = round(current.get("totalMargin", 0.0) / games, 1) if games > 0 else 0.0

    return players


def game_to_record(game: dict) -> dict:
    results = []
    for player in game["players"]:
        key, display = normalize_name(player["name"])
        results.append(
            {
                "name": key,
                "displayName": display,
                "place": player["place"],
                "vp": player.get("vp", 0),
                "corp": player.get("corp", ""),
                "oldElo": 0,
                "newElo": 0,
                "delta": 0,
            }
        )
    return {
        "_key": game["_key"],
        "gameId": game.get("gameId", game["_key"]),
        "endId": game.get("endId", ""),
        "date": game.get("date", ""),
        "server": game.get("server", "knightbyte"),
        "map": game.get("map", ""),
        "generation": game.get("generation", 0),
        "playerCount": game.get("playerCount", len(results)),
        "completedTime": game.get("completedTime", 0),
        "results": results,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed-last", type=int, default=1)
    args = parser.parse_args()

    elo = load_elo()
    excluded_games = load_excluded_games()
    player_name_overrides = load_player_name_overrides()
    if excluded_games:
        elo["games"] = [
            game
            for game in elo.get("games", [])
            if not is_excluded_game(game_id_of(game), excluded_games)
        ]
    for game in elo.get("games", []):
        apply_player_name_overrides_to_game(game, player_name_overrides)
    existing_keys = {game_id_of(game) for game in elo.get("games", [])}
    db_games = fetch_finished_games()

    if not elo.get("games"):
        candidates = db_games[-max(1, args.seed_last):]
    else:
        latest_completed = max((g.get("completedTime", 0) or 0) for g in elo.get("games", []))
        candidates = [
            game
            for game in db_games
            if game["_key"] not in existing_keys and (game.get("completedTime", 0) or 0) >= latest_completed
        ]

    added = 0
    for game in candidates:
        if game["_key"] in existing_keys:
            continue
        elo.setdefault("games", []).append(game_to_record(game))
        existing_keys.add(game["_key"])
        added += 1

    elo["players"] = rebuild_ratings(elo.get("games", []))
    assert_no_suspicious_duplicate_players(elo["players"])
    save_elo(elo)
    solo_records = fetch_solo_records()
    save_solo_records(solo_records)
    stats_games = fetch_stats_games()
    stats = build_stats(stats_games, load_card_metadata(), elo.get("games", []))
    save_stats(stats)

    print(f"existing_games={len(existing_keys) - added}")
    print(f"added_games={added}")
    print(f"total_games={len(elo.get('games', []))}")
    print(f"total_players={len(elo.get('players', {}))}")
    print(f"solo_records={len(solo_records)}")
    print(f"stats_games={stats.get('gameCount', 0)}")
    print(f"stats_players={len(stats.get('players', []))}")
    print(f"stats_cards={len(stats.get('cardStats', []))}")


if __name__ == "__main__":
    main()
