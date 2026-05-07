#!/usr/bin/env python3
"""Regression test for generated TM statistics."""

from __future__ import annotations

import importlib.util
import sys
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


def main() -> None:
    sync = load_sync_module()
    card_metadata = {
        "Teractor": {"name": "Teractor", "type": "corporation", "tags": ["earth"]},
        "Asteroid": {"name": "Asteroid", "type": "event", "tags": ["space", "event"]},
        "AI Central": {"name": "AI Central", "type": "active", "tags": ["science", "building"]},
        "Mine": {"name": "Mine", "type": "automated", "tags": ["building"]},
        "Inventrix": {"name": "Inventrix", "type": "corporation", "tags": ["science"]},
    }
    games = [
        {
            "_key": "g-stats",
            "gameId": "g-stats",
            "server": "knightbyte",
            "generation": 8,
            "playerCount": 2,
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
                        "megaCreditProduction": 30,
                        "steelProduction": 3,
                        "titaniumProduction": 2,
                        "plantProduction": 7,
                        "energyProduction": 4,
                        "heatProduction": 5,
                        "playedCards": [
                            {"name": "Teractor"},
                            {"name": "Asteroid"},
                            {"name": "AI Central"},
                            {"name": "Mine"},
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
                        "megaCreditProduction": 18,
                        "steelProduction": 1,
                        "titaniumProduction": 1,
                        "plantProduction": 2,
                        "energyProduction": 1,
                        "heatProduction": 2,
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
    assert gydro["averages"]["playedCards"] == 4
    assert gydro["averages"]["eventCards"] == 1
    assert gydro["averages"]["activeCards"] == 1
    assert gydro["averages"]["automatedCards"] == 1
    assert gydro["avgTags"]["building"] == 2
    assert gydro["maxProduction"]["mc"] == 30

    record_by_key = {record["key"]: record for record in stats["records"]}
    assert record_by_key["bestVP"]["value"] == 150
    assert record_by_key["mostCardVP"]["value"] == 45
    assert record_by_key["mostEvents"]["value"] == 1
    assert record_by_key["production:mc"]["value"] == 30
    assert record_by_key["tag:building"]["value"] == 2

    card_by_name = {card["name"]: card for card in stats["cardStats"]}
    assert card_by_name["Asteroid"]["played"] == 1
    assert card_by_name["Asteroid"]["winRate"] == 100
    assert card_by_name["Asteroid"]["avgEloDelta"] == 12
    assert card_by_name["Mine"]["played"] == 2
    print("tm stats regressions: OK")


if __name__ == "__main__":
    main()
