#!/usr/bin/env python3
"""Focused checks for the ELO importer: bot filter and win accounting."""

import importlib.util
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

spec = importlib.util.spec_from_file_location("import_gamedb_to_elo", BASE_DIR / "import_gamedb_to_elo.py")
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


def test_bot_names_are_skipped():
    assert importer.is_bot_game([{"playerName": "A"}, {"playerName": "B"}, {"playerName": "C"}])
    assert importer.is_bot_game([{"playerName": "Bot Vega"}, {"playerName": "GydRo"}, {"playerName": "Nuke"}])
    assert importer.is_bot_game([{"playerName": "Greenbot123"}, {"playerName": "Yellowbot123"}, {"playerName": "Nuke"}])
    assert importer.is_bot_game([{"playerName": "test"}, {"playerName": "GydRo"}])
    assert not importer.is_bot_game([{"playerName": "GydRo"}, {"playerName": "Nuke"}, {"playerName": "Борис"}])


def test_shared_first_place_credits_half_a_win():
    elo_data = {"players": {}, "games": []}
    game = {
        "gameId": "gtest0000000",
        "endId": "",
        "date": "",
        "completedTime": 1,
        "server": "knightbyte",
        "map": "tharsis",
        "generation": 8,
        "players": [
            {"name": "alpha", "place": 1, "vp": 90, "corp": ""},
            {"name": "beta", "place": 1, "vp": 90, "corp": ""},
            {"name": "gamma", "place": 3, "vp": 50, "corp": ""},
        ],
    }
    importer.apply_game_to_elo(game, elo_data)

    assert elo_data["players"]["alpha"]["wins"] == 0.5, elo_data["players"]["alpha"]
    assert elo_data["players"]["beta"]["wins"] == 0.5, elo_data["players"]["beta"]
    assert elo_data["players"]["gamma"]["wins"] == 0, elo_data["players"]["gamma"]
    assert elo_data["players"]["alpha"]["games"] == 1
    assert elo_data["games"][0]["gameId"] == "gtest0000000"


def main():
    test_bot_names_are_skipped()
    test_shared_first_place_credits_half_a_win()
    print("elo importer regressions: OK")


if __name__ == "__main__":
    main()
