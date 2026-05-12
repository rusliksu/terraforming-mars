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


def main() -> None:
    sync = load_sync_module()
    assert_fetch_stats_games_fills_names_before_bot_filter(sync)
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
