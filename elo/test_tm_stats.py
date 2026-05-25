#!/usr/bin/env python3
"""Regression test for generated TM statistics."""

from __future__ import annotations

import importlib.util
import json
import sqlite3
import sys
import tempfile
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))


def load_sync_module():
    spec = importlib.util.spec_from_file_location("tm_sync_elo", BASE_DIR / "tm-sync-elo.py")
    assert spec is not None
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def create_results_db(db_path: Path) -> sqlite3.Connection:
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
    return conn


def insert_finished_game(conn: sqlite3.Connection, game_id: str, options: dict) -> None:
    scores = [
        {"playerName": "Alice", "playerScore": 75, "place": 1, "corporation": "Teractor"},
        {"playerName": "Bob", "playerScore": 68, "place": 2, "corporation": "Inventrix"},
    ]
    snapshot = {
        "spectatorId": f"s-{game_id}",
        "players": [
            {"id": "p1", "name": "Alice", "playedCards": []},
            {"id": "p2", "name": "Bob", "playedCards": []},
        ],
    }
    conn.execute(
        "INSERT INTO game_results VALUES (?, ?, ?, ?, ?)",
        (game_id, 2, 8, json.dumps(scores), json.dumps({"boardName": "Tharsis", **options})),
    )
    conn.execute("INSERT INTO completed_game VALUES (?, ?)", (game_id, 1000))
    conn.execute(
        "INSERT INTO games VALUES (?, ?, ?, ?)",
        (game_id, 1, 100, json.dumps(snapshot)),
    )


def assert_fetch_stats_games_fills_names_before_bot_filter(sync) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        db_path = Path(tmp) / "game.db"
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
        scores = [
            {"playerName": "", "playerScore": 75, "place": 1, "corporation": "Teractor"},
            {"playerName": "", "playerScore": 68, "place": 2, "corporation": "Inventrix"},
        ]
        snapshot = {
            "spectatorId": "s-fetch",
            "players": [
                {"id": "p1", "name": "Alice", "playedCards": []},
                {"id": "p2", "name": "Bob", "playedCards": []},
            ],
        }
        conn.execute(
            "INSERT INTO game_results VALUES (?, ?, ?, ?, ?)",
            ("g-fetch", 2, 8, json.dumps(scores), json.dumps({"boardName": "Tharsis"})),
        )
        conn.execute("INSERT INTO completed_game VALUES (?, ?)", ("g-fetch", 1000))
        conn.execute(
            "INSERT INTO games VALUES (?, ?, ?, ?)",
            ("g-fetch", 1, 100, json.dumps(snapshot)),
        )
        conn.commit()
        conn.close()

        original_db_path = sync.DB_PATH
        sync.DB_PATH = db_path
        try:
            games = sync.fetch_stats_games()
        finally:
            sync.DB_PATH = original_db_path

    assert len(games) == 1
    assert games[0]["results"][0]["displayName"] == "Alice"
    assert games[0]["results"][1]["displayName"] == "Bob"
    assert sync.has_detailed_game(games[0])


def assert_fetch_stats_games_skips_excluded_games(sync) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        db_path = tmp_path / "game.db"
        excluded_path = tmp_path / "excluded_games.json"
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

        def insert_game(game_id: str) -> None:
            scores = [
                {"playerName": "Alice", "playerScore": 75, "place": 1, "corporation": "Teractor"},
                {"playerName": "Bob", "playerScore": 68, "place": 2, "corporation": "Inventrix"},
            ]
            snapshot = {
                "spectatorId": f"s-{game_id}",
                "players": [
                    {"id": "p1", "name": "Alice", "playedCards": []},
                    {"id": "p2", "name": "Bob", "playedCards": []},
                ],
            }
            conn.execute(
                "INSERT INTO game_results VALUES (?, ?, ?, ?, ?)",
                (game_id, 2, 8, json.dumps(scores), json.dumps({"boardName": "Tharsis"})),
            )
            conn.execute("INSERT INTO completed_game VALUES (?, ?)", (game_id, 1000))
            conn.execute(
                "INSERT INTO games VALUES (?, ?, ?, ?)",
                (game_id, 1, 100, json.dumps(snapshot)),
            )

        insert_game("g-keep")
        insert_game("g-excluded")
        conn.commit()
        conn.close()
        excluded_path.write_text(json.dumps({"g-excluded": {"reason": "test"}}), encoding="utf-8")

        original_db_path = sync.DB_PATH
        original_excluded_paths = sync.EXCLUDED_GAMES_PATHS
        sync.DB_PATH = db_path
        sync.EXCLUDED_GAMES_PATHS = [excluded_path]
        try:
            games = sync.fetch_stats_games()
        finally:
            sync.DB_PATH = original_db_path
            sync.EXCLUDED_GAMES_PATHS = original_excluded_paths

    assert [game["_key"] for game in games] == ["g-keep"]


def assert_fetch_stats_games_skips_no_elo_games(sync) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        db_path = Path(tmp) / "game.db"
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

        def insert_game(game_id: str, no_elo: bool) -> None:
            scores = [
                {"playerName": "Alice", "playerScore": 75, "place": 1, "corporation": "Teractor"},
                {"playerName": "Bob", "playerScore": 68, "place": 2, "corporation": "Inventrix"},
            ]
            snapshot = {
                "spectatorId": f"s-{game_id}",
                "players": [
                    {"id": "p1", "name": "Alice", "playedCards": []},
                    {"id": "p2", "name": "Bob", "playedCards": []},
                ],
            }
            conn.execute(
                "INSERT INTO game_results VALUES (?, ?, ?, ?, ?)",
                (game_id, 2, 8, json.dumps(scores), json.dumps({"boardName": "Tharsis", "noEloGame": no_elo})),
            )
            conn.execute("INSERT INTO completed_game VALUES (?, ?)", (game_id, 1000))
            conn.execute(
                "INSERT INTO games VALUES (?, ?, ?, ?)",
                (game_id, 1, 100, json.dumps(snapshot)),
            )

        insert_game("g-training", True)
        insert_game("g-ranked", False)
        conn.commit()
        conn.close()

        original_db_path = sync.DB_PATH
        sync.DB_PATH = db_path
        try:
            games = sync.fetch_stats_games()
        finally:
            sync.DB_PATH = original_db_path

    assert [game["_key"] for game in games] == ["g-ranked"]


def assert_fetch_finished_games_skips_no_elo_and_malformed_escape_velocity(sync) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        db_path = Path(tmp) / "game.db"
        conn = create_results_db(db_path)

        insert_finished_game(conn, "g-ranked", {})
        insert_finished_game(conn, "g-training", {"noEloGame": True})
        insert_finished_game(
            conn,
            "g-bad-ev",
            {
                "escapeVelocity": {
                    "thresholdMinutes": -9999,
                    "bonusSectionsPerAction": -9999,
                    "penaltyPeriodMinutes": -12,
                    "penaltyVPPerPeriod": 999999,
                },
            },
        )
        conn.commit()
        conn.close()

        original_db_path = sync.DB_PATH
        sync.DB_PATH = db_path
        try:
            games = sync.fetch_finished_games()
        finally:
            sync.DB_PATH = original_db_path

    assert [game["_key"] for game in games] == ["g-ranked"]


def assert_fetch_stats_games_skips_malformed_escape_velocity(sync) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        db_path = Path(tmp) / "game.db"
        conn = create_results_db(db_path)

        insert_finished_game(conn, "g-ranked", {})
        insert_finished_game(
            conn,
            "g-bad-ev",
            {
                "escapeVelocity": {
                    "thresholdMinutes": -9999,
                    "bonusSectionsPerAction": -9999,
                    "penaltyPeriodMinutes": -12,
                    "penaltyVPPerPeriod": 999999,
                },
            },
        )
        conn.commit()
        conn.close()

        original_db_path = sync.DB_PATH
        sync.DB_PATH = db_path
        try:
            games = sync.fetch_stats_games()
        finally:
            sync.DB_PATH = original_db_path

    assert [game["_key"] for game in games] == ["g-ranked"]


def assert_player_name_overrides_apply_per_game(sync) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        db_path = tmp_path / "game.db"
        overrides_path = tmp_path / "player_name_overrides.json"
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

        def insert_game(game_id: str, names: list[str]) -> None:
            scores = [
                {"playerName": "", "playerScore": 100 - idx, "place": idx + 1, "corporation": "Teractor"}
                for idx, _ in enumerate(names)
            ]
            snapshot = {
                "spectatorId": f"s-{game_id}",
                "players": [
                    {"id": f"p{idx}", "name": name, "playedCards": []}
                    for idx, name in enumerate(names)
                ],
            }
            conn.execute(
                "INSERT INTO game_results VALUES (?, ?, ?, ?, ?)",
                (game_id, len(names), 8, json.dumps(scores), json.dumps({"boardName": "Tharsis"})),
            )
            conn.execute("INSERT INTO completed_game VALUES (?, ?)", (game_id, 1000))
            conn.execute(
                "INSERT INTO games VALUES (?, ?, ?, ?)",
                (game_id, 1, 100, json.dumps(snapshot)),
            )

        insert_game("g-felkner", ["Саша", "Даша"])
        insert_game("g-alexander", ["Тома", "Саша"])
        conn.commit()
        conn.close()
        overrides_path.write_text(
            json.dumps(
                {
                    "g-felkner": {"playerNames": {"саша": "Фелькнер"}},
                    "g-alexander": {"playerNames": {"саша": "Александр"}},
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

        original_db_path = sync.DB_PATH
        original_override_paths = sync.PLAYER_NAME_OVERRIDES_PATHS
        sync.DB_PATH = db_path
        sync.PLAYER_NAME_OVERRIDES_PATHS = [overrides_path]
        try:
            games = sync.fetch_stats_games()
            stored_game = {
                "_key": "g-felkner",
                "results": [
                    {"name": "саша", "displayName": "Саша"},
                    {"name": "даша", "displayName": "Даша"},
                ],
            }
            sync.apply_player_name_overrides_to_game(stored_game, sync.load_player_name_overrides())
        finally:
            sync.DB_PATH = original_db_path
            sync.PLAYER_NAME_OVERRIDES_PATHS = original_override_paths

    names_by_game = {
        game["_key"]: [result["displayName"] for result in game["results"]]
        for game in games
    }
    assert names_by_game["g-felkner"] == ["Фелькнер", "Даша"]
    assert names_by_game["g-alexander"] == ["Тома", "Александр"]
    assert [result["displayName"] for result in stored_game["results"]] == ["Фелькнер", "Даша"]


def assert_provisional_elo_caps_expected_score(sync) -> None:
    assert sync.effective_elo_for_expected_score({"elo": 1500, "games": 0}, "elo") == 1300
    assert sync.effective_elo_for_expected_score({"elo": 1500, "games": 1}, "elo") == 1375
    assert sync.effective_elo_for_expected_score({"elo": 1500, "games": 2}, "elo") == 1450
    assert sync.effective_elo_for_expected_score({"elo": 1500, "games": 3}, "elo") == 1500
    assert sync.effective_elo_for_expected_score({"elo": 1290, "games": 0}, "elo") == 1290
    assert sync.effective_elo_for_expected_score({"elo_vp": 1510, "games": 1}, "elo_vp") == 1375


def assert_provisional_elo_reduces_first_game_farm_delta(sync) -> None:
    def game(game_id: str, completed_time: int, loser: str) -> dict:
        return {
            "_key": game_id,
            "gameId": game_id,
            "server": "test",
            "generation": 10,
            "playerCount": 2,
            "completedTime": completed_time,
            "results": [
                {"name": "vet", "displayName": "Vet", "place": 1, "vp": 100, "corp": "CrediCor"},
                {"name": loser.lower(), "displayName": loser, "place": 2, "vp": 80, "corp": "Helion"},
            ],
        }

    games = [
        game("g1", 1, "A"),
        game("g2", 2, "B"),
        game("g3", 3, "C"),
        game("g4", 4, "Rookie"),
    ]
    players = sync.rebuild_ratings(games)
    final_results = games[3]["results"]

    assert final_results[0]["displayName"] == "Vet"
    assert final_results[0]["delta"] == 9
    assert final_results[1]["displayName"] == "Rookie"
    assert final_results[1]["delta"] == -9
    assert players["rookie"]["elo"] == 1491


def assert_synthetic_elo_records_are_identified(sync) -> None:
    assert sync.is_synthetic_elo_record(
        {
            "_key": "g-test",
            "results": [
                {"name": "a", "displayName": "a"},
                {"name": "b", "displayName": "b"},
                {"name": "c", "displayName": "c"},
            ],
        }
    )
    assert sync.is_synthetic_elo_record(
        {
            "_key": "g-smoke",
            "results": [
                {"name": "inputlog1", "displayName": "InputLog1"},
                {"name": "seqa", "displayName": "SeqA"},
            ],
        }
    )
    assert not sync.is_synthetic_elo_record(
        {
            "_key": "g-real",
            "results": [
                {"name": "даша", "displayName": "Даша"},
                {"name": "gyd-ro", "displayName": "GydRo"},
            ],
        }
    )


def main() -> None:
    sync = load_sync_module()
    assert_fetch_stats_games_fills_names_before_bot_filter(sync)
    assert_fetch_stats_games_skips_excluded_games(sync)
    assert_fetch_stats_games_skips_no_elo_games(sync)
    assert_fetch_finished_games_skips_no_elo_and_malformed_escape_velocity(sync)
    assert_fetch_stats_games_skips_malformed_escape_velocity(sync)
    assert_player_name_overrides_apply_per_game(sync)
    assert_provisional_elo_caps_expected_score(sync)
    assert_provisional_elo_reduces_first_game_farm_delta(sync)
    assert_synthetic_elo_records_are_identified(sync)
    card_metadata = {
        "Teractor": {"name": "Teractor", "type": "corporation", "tags": ["earth"]},
        "Applied Science": {"name": "Applied Science", "type": "prelude", "tags": ["wild"], "resourceType": "Science"},
        "Asteroid": {"name": "Asteroid", "type": "event", "tags": ["space", "event"], "cost": 14},
        "AI Central": {"name": "AI Central", "type": "active", "tags": ["science", "building"], "cost": 21, "resourceType": "Science", "hasRequirements": True},
        "Mine": {"name": "Mine", "type": "automated", "tags": ["building"], "cost": 4},
        "Pets": {"name": "Pets", "type": "active", "tags": ["earth", "animal"], "cost": 10, "resourceType": "Animal"},
        "Floating Habs": {"name": "Floating Habs", "type": "active", "tags": ["venus"], "cost": 5, "resourceType": "Floater"},
        "Data Archive": {"name": "Data Archive", "type": "active", "tags": [], "cost": 8, "resourceType": "Data"},
        "Inventrix": {"name": "Inventrix", "type": "corporation", "tags": ["science"]},
    }
    games = [
        {
            "_key": "g-stats",
            "gameId": "g-stats",
            "server": "knightbyte",
            "generation": 8,
            "playerCount": 2,
            "createdTime": 100,
            "completedTime": 1000,
            "results": [
                {
                    "name": "gydro",
                    "displayName": "GydRo",
                    "place": 1,
                    "vp": 100,
                    "corp": "Teractor",
                    "score": {
                        "playerScore": 100,
                        "victoryPointsBreakdown": {
                            "terraformRating": 40,
                            "victoryPoints": 25,
                            "greenery": 8,
                            "city": 7,
                            "milestones": 10,
                            "awards": 10,
                        },
                    },
                    "snapshot": {
                        "id": "p1",
                        "name": "GydRo",
                        "terraformRating": 42,
                        "actionsTakenThisGame": 10,
                        "timer": {"sumElapsed": 600000, "running": False},
                        "megaCredits": 75,
                        "steel": 5,
                        "titanium": 4,
                        "plants": 9,
                        "energy": 3,
                        "heat": 11,
                        "megaCreditProduction": 30,
                        "steelProduction": 3,
                        "titaniumProduction": 2,
                        "plantProduction": 7,
                        "energyProduction": 4,
                        "heatProduction": 5,
                        "globalParameterSteps": {
                            "temperature": 3,
                            "oxygen": 2,
                            "oceans": 1,
                            "venus": 4,
                        },
                        "playedCards": [
                            {"name": "Teractor"},
                            {"name": "Applied Science"},
                            {"name": "Asteroid"},
                            {"name": "AI Central", "resourceCount": 2},
                            {"name": "Mine"},
                            {"name": "Pets", "resourceCount": 3},
                            {"name": "Floating Habs", "resourceCount": 4},
                            {"name": "Data Archive", "resourceCount": 5},
                        ],
                    },
                },
                {
                    "name": "рав",
                    "displayName": "Рав",
                    "place": 2,
                    "vp": 92,
                    "corp": "Inventrix",
                    "score": {
                        "playerScore": 92,
                        "victoryPointsBreakdown": {
                            "terraformRating": 35,
                            "victoryPoints": 20,
                            "greenery": 5,
                            "city": 4,
                        },
                    },
                    "snapshot": {
                        "id": "p2",
                        "name": "Рав",
                        "terraformRating": 35,
                        "actionsTakenThisGame": 20,
                        "timer": {"sumElapsed": 300000, "running": False},
                        "megaCreditProduction": 18,
                        "steelProduction": 1,
                        "titaniumProduction": 1,
                        "plantProduction": 2,
                        "energyProduction": 1,
                        "heatProduction": 2,
                        "globalParameterSteps": {
                            "temperature": 1,
                            "oxygen": 0,
                            "oceans": 2,
                            "venus": 0,
                        },
                        "playedCards": [
                            {"name": "Inventrix"},
                            {"name": "Mine"},
                        ],
                    },
                },
            ],
            "board": {
                "spaces": [
                    {"player": "p1", "tile": {"tileType": 0}},
                    {"player": "p1", "tile": {"tileType": 2}},
                    {"player": "p2", "tile": {"tileType": 0}},
                ],
            },
        },
        {
            "_key": "g-score-only",
            "gameId": "g-score-only",
            "server": "knightbyte",
            "generation": 9,
            "playerCount": 2,
            "createdTime": 100,
            "completedTime": 11000,
            "results": [
                {
                    "name": "gydro",
                    "displayName": "GydRo",
                    "place": 1,
                    "vp": 150,
                    "corp": "Teractor",
                    "score": {
                        "playerScore": 150,
                        "victoryPointsBreakdown": {
                            "terraformRating": 45,
                            "victoryPoints": 45,
                            "greenery": 12,
                            "city": 8,
                        },
                    },
                    "snapshot": {},
                },
                {
                    "name": "рав",
                    "displayName": "Рав",
                    "place": 2,
                    "vp": 100,
                    "corp": "Inventrix",
                    "score": {
                        "playerScore": 100,
                        "victoryPointsBreakdown": {
                            "terraformRating": 38,
                            "victoryPoints": 18,
                            "greenery": 8,
                            "city": 6,
                        },
                    },
                    "snapshot": {},
                },
            ],
            "board": {},
        },
    ]
    elo_games = [
        {
            "_key": "g-stats",
            "results": [
                {"name": "gydro", "displayName": "GydRo", "delta": 12},
                {"name": "рав", "displayName": "Рав", "delta": -12},
            ],
        },
    ]

    stats = sync.build_stats(games, card_metadata, elo_games)
    assert stats["gameCount"] == 2
    assert stats["playerGameCount"] == 4
    assert stats["detailedGameCount"] == 1
    assert stats["detailedPlayerGameCount"] == 2
    assert stats["generationRecords"][0]["generation"] == 8
    assert stats["generationRecords"][0]["vp"] == 100
    assert stats["generationRecords"][1]["generation"] == 9
    assert stats["generationRecords"][1]["vp"] == 150

    gydro = stats["players"][0]
    assert gydro["displayName"] == "GydRo"
    assert gydro["games"] == 1
    assert gydro["averages"]["playedCards"] == 8
    assert gydro["averages"]["eventCards"] == 1
    assert gydro["averages"]["activeCards"] == 4
    assert gydro["averages"]["automatedCards"] == 1
    assert gydro["averages"]["temperature"] == 3
    assert gydro["averages"]["oxygen"] == 2
    assert gydro["averages"]["oceans"] == 1
    assert gydro["averages"]["venus"] == 4
    assert gydro["avgVPBreakdown"]["cards"] == 25
    assert gydro["avgVPBreakdown"]["greenery"] == 8
    assert gydro["avgVPBreakdown"]["city"] == 7
    assert gydro["avgVPBreakdown"]["milestones"] == 10
    assert gydro["avgVPBreakdown"]["awards"] == 10
    assert gydro["vpBreakdownGames"]["cards"] == 1
    assert gydro["avgTags"]["building"] == 2
    assert gydro["maxProduction"]["mc"] == 30
    assert gydro["timing"]["games"] == 1
    assert gydro["timing"]["avgTimeSeconds"] == 600
    assert gydro["timing"]["avgSecondsPerAction"] == 60

    record_by_key = {record["key"]: record for record in stats["records"]}
    assert record_by_key["bestVP"]["value"] == 150
    assert record_by_key["mostCardVP"]["value"] == 45
    assert record_by_key["highestTR"]["value"] == 42
    assert record_by_key["mostNoTagProjectCards"]["value"] == 1
    assert record_by_key["mostHighCostProjectCards"]["value"] == 1
    assert record_by_key["mostLowCostProjectCards"]["value"] == 4
    assert record_by_key["mostRequirementProjectCards"]["value"] == 1
    assert record_by_key["mostTotalCardResources"]["value"] == 14
    assert record_by_key["cardResource:Animal"]["value"] == 3
    assert record_by_key["cardResource:Floater"]["value"] == 4
    assert record_by_key["cardResource:Data"]["value"] == 5
    assert record_by_key["mostCardResourceTypes"]["value"] == 4
    assert record_by_key["stockpile:mc"]["value"] == 75
    assert record_by_key["totalNonMcProduction"]["value"] == 21
    assert record_by_key["longestGameDuration"]["valueText"] == "15m"
    assert record_by_key["fastestSecondsPerAction"]["valueText"] == "30.0 sec/action"
    assert record_by_key["fastestPlayerSecondsPerAction"]["valueText"] == "15.0 sec/action"
    assert record_by_key["mostEvents"]["value"] == 1
    assert record_by_key["production:mc"]["value"] == 30
    assert record_by_key["tag:building"]["value"] == 2

    card_by_name = {card["name"]: card for card in stats["cardStats"]}
    assert card_by_name["Asteroid"]["played"] == 1
    assert card_by_name["Asteroid"]["winRate"] == 100
    assert card_by_name["Asteroid"]["avgEloDelta"] == 12
    assert card_by_name["Mine"]["played"] == 2
    assert {card["name"]: card for card in stats["corporationStats"]}["Teractor"]["played"] == 1
    assert {card["name"]: card for card in stats["preludeStats"]}["Applied Science"]["played"] == 1
    print("tm stats regressions: OK")


if __name__ == "__main__":
    main()
