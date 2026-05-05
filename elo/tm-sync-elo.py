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
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple
from elo_aliases import assert_no_suspicious_duplicate_players, normalize_name

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

DEFAULT_ELO = 1500
BASE_K = 32

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


def fetch_finished_games() -> List[dict]:
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

    latest_game_by_game: Dict[str, dict] = {}
    latest_players_by_game: Dict[str, List[dict]] = {}
    cur.execute(
        "SELECT game_id, game FROM games ORDER BY save_id DESC"
    )
    for game_id, game_json in cur.fetchall():
        if game_id in latest_game_by_game or not game_json:
            continue
        try:
            game_state = json.loads(game_json)
        except Exception:
            continue
        latest_game_by_game[game_id] = game_state
        players = game_state.get("players")
        if isinstance(players, list):
            latest_players_by_game[game_id] = players

    conn.close()

    games: List[dict] = []
    for gid, generations, scores_json, completed_time, board_name, spectator_id in rows:
        scores = json.loads(scores_json)

        # Fill missing player names from the latest saved game state.
        if not any((s.get("playerName") or "").strip() for s in scores):
            game_players = latest_players_by_game.get(gid) or []
            if len(game_players) == len(scores):
                for si, sc in enumerate(scores):
                    sc["playerName"] = game_players[si].get("name", "")

        if len(scores) < 2 or is_bot_game(scores):
            continue

        named_scores = [s for s in scores if (s.get("playerName") or "").strip()]
        if len(named_scores) < 2:
            continue

        named_scores.sort(key=lambda s: s.get("playerScore", 0), reverse=True)
        players = []
        for i, score in enumerate(named_scores):
            vp = score.get("playerScore", 0)
            place = i + 1
            if i > 0 and vp == named_scores[i - 1].get("playerScore", 0):
                place = players[-1]["place"]
            _, display_name = normalize_name(score.get("playerName", "?"))
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

    latest_game_by_game: Dict[str, dict] = {}
    latest_players_by_game: Dict[str, List[dict]] = {}
    cur.execute(
        "SELECT game_id, game FROM games ORDER BY save_id DESC"
    )
    for game_id, game_json in cur.fetchall():
        if game_id in latest_game_by_game or not game_json:
            continue
        try:
            game_state = json.loads(game_json)
        except Exception:
            continue
        latest_game_by_game[game_id] = game_state
        players = game_state.get("players")
        if isinstance(players, list):
            latest_players_by_game[game_id] = players

    conn.close()

    records: List[dict] = []
    for gid, generations, scores_json, options_json, completed_time, board_name, spectator_id, participant_spectator_id in rows:
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

        if raw_name.lower() in SOLO_BOT_NAMES:
            continue

        solo_win = parse_optional_bool(override.get("soloWin"))
        solo_win_source = "override" if solo_win is not None else ""
        if solo_win is None:
            solo_win = parse_optional_bool(score.get("soloWin"))
            solo_win_source = "game_results" if solo_win is not None else ""
        if solo_win is None:
            solo_win = parse_optional_bool(existing_record.get("soloWin"))
            solo_win_source = "existing" if solo_win is not None else ""
        if solo_win is None:
            solo_win = infer_solo_win_from_game_state(latest_game_by_game.get(gid) or {})
            solo_win_source = "game_state" if solo_win is not None else ""

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
    existing_keys = {g.get("_key") for g in elo.get("games", [])}
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

    print(f"existing_games={len(existing_keys) - added}")
    print(f"added_games={added}")
    print(f"total_games={len(elo.get('games', []))}")
    print(f"total_players={len(elo.get('players', {}))}")
    print(f"solo_records={len(solo_records)}")


if __name__ == "__main__":
    main()
