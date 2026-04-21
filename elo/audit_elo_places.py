#!/usr/bin/env python3
"""Compare elo-data games against authoritative completed-games exports.

Expected export shape matches export_completed_games(.ts):
  {
    "gameId": "g...",
    "players": [
      {"name": "...", "user": "...", "place": 1, "vp": 105, "corp": "..."}
    ]
  }

Supports both JSON arrays and JSONL inputs.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

from elo_aliases import normalize_name


def normalize_identity(name: str, user: Optional[str] = None) -> Tuple[str, str]:
    if isinstance(user, str) and user.strip():
        _, display_name = normalize_name(name)
        return f'user:{user.strip()}', display_name
    key, display_name = normalize_name(name)
    return key, display_name


def load_json_or_jsonl(path: Path) -> List[dict]:
    raw = path.read_text(encoding='utf-8').strip()
    if raw == '':
        return []
    if path.suffix.lower() == '.jsonl':
        rows = []
        for line in raw.splitlines():
            line = line.strip()
            if line:
                rows.append(json.loads(line))
        return rows
    payload = json.loads(raw)
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        return list(payload.get('games', []))
    raise ValueError(f'unsupported payload in {path}')


def load_elo_games(path: Path) -> List[dict]:
    payload = json.loads(path.read_text(encoding='utf-8'))
    games = payload.get('games', [])
    if not isinstance(games, list):
        raise ValueError(f'bad elo payload in {path}')
    return games


def sort_elo_results(results: Iterable[dict]) -> List[dict]:
    return sorted(
        list(results),
        key=lambda item: (
            int(item.get('place', 999) or 999),
            -(int(item.get('vp', 0) or 0)),
            str(item.get('name') or ''),
        ),
    )


def sort_export_players(players: Iterable[dict]) -> List[dict]:
    normalized: List[dict] = []
    for idx, player in enumerate(players):
        key, display_name = normalize_identity(player.get('name', ''), player.get('user'))
        normalized.append({
            'idx': idx,
            'key': key,
            'displayName': display_name,
            'place': int(player.get('place', 999) or 999),
            'vp': int(player.get('vp', 0) or 0),
            'corp': player.get('corp', ''),
        })
    return sorted(
        normalized,
        key=lambda item: (item['place'], -item['vp'], item['idx']),
    )


def build_export_index(rows: Iterable[dict]) -> Dict[str, dict]:
    index: Dict[str, dict] = {}
    for row in rows:
        game_id = row.get('gameId') or row.get('_key')
        players = row.get('players')
        if not game_id or not isinstance(players, list) or len(players) < 2:
            continue
        if not all(player.get('place') is not None for player in players):
            continue
        index[str(game_id)] = {
            **row,
            'players': sort_export_players(players),
        }
    return index


def compare_game(elo_game: dict, export_game: dict) -> Optional[dict]:
    elo_results = sort_elo_results(elo_game.get('results', []))
    export_results = list(export_game.get('players', []))
    if len(elo_results) != len(export_results):
        return {
            'gameId': elo_game.get('gameId') or elo_game.get('_key'),
            'reason': 'player-count-mismatch',
            'eloCount': len(elo_results),
            'exportCount': len(export_results),
        }

    elo_order = [str(item.get('name') or '') for item in elo_results]
    export_order = [str(item.get('key') or '') for item in export_results]
    elo_winner = elo_results[0] if elo_results else {}
    export_winner = export_results[0] if export_results else {}
    problems: List[str] = []

    if elo_order != export_order:
        problems.append('order')
    if str(elo_winner.get('name') or '') != str(export_winner.get('key') or ''):
        problems.append('winner')

    max_elo_vp = max((int(item.get('vp', 0) or 0) for item in elo_results), default=0)
    if int(elo_winner.get('vp', 0) or 0) < max_elo_vp:
        problems.append('winner-vp-below-max')

    if not problems:
        return None

    return {
        'gameId': elo_game.get('gameId') or elo_game.get('_key'),
        'date': elo_game.get('date'),
        'reasons': problems,
        'eloWinner': {
            'key': elo_winner.get('name'),
            'name': elo_winner.get('displayName') or elo_winner.get('name'),
            'place': elo_winner.get('place'),
            'vp': elo_winner.get('vp'),
        },
        'exportWinner': {
            'key': export_winner.get('key'),
            'name': export_winner.get('displayName') or export_winner.get('key'),
            'place': export_winner.get('place'),
            'vp': export_winner.get('vp'),
        },
        'eloOrder': [
            {
                'name': item.get('displayName') or item.get('name'),
                'key': item.get('name'),
                'place': item.get('place'),
                'vp': item.get('vp'),
            }
            for item in elo_results
        ],
        'exportOrder': [
            {
                'name': item.get('displayName') or item.get('key'),
                'key': item.get('key'),
                'place': item.get('place'),
                'vp': item.get('vp'),
            }
            for item in export_results
        ],
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Audit elo-data placement against completed-games exports')
    parser.add_argument('--elo-file', default='elo/elo-data.json', help='Path to elo-data.json')
    parser.add_argument('--completed-games', required=True, help='Path to completed-games export (.json or .jsonl)')
    parser.add_argument('--game', help='Check only one game id')
    parser.add_argument('--recent', type=int, default=25, help='Check only last N elo games by completedTime/date')
    parser.add_argument('--json', action='store_true', help='Emit JSON instead of human-readable text')
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    elo_file = Path(args.elo_file).resolve()
    completed_games_file = Path(args.completed_games).resolve()

    elo_games = load_elo_games(elo_file)
    export_index = build_export_index(load_json_or_jsonl(completed_games_file))

    elo_games = sorted(
        elo_games,
        key=lambda game: (
            int(game.get('completedTime', 0) or 0),
            str(game.get('gameId') or game.get('_key') or ''),
        ),
    )
    if args.game:
        elo_games = [game for game in elo_games if (game.get('gameId') or game.get('_key')) == args.game]
    elif args.recent and args.recent > 0:
        elo_games = elo_games[-args.recent:]

    mismatches: List[dict] = []
    checked = 0
    missing_export = 0
    for elo_game in elo_games:
        game_id = str(elo_game.get('gameId') or elo_game.get('_key') or '')
        if not game_id:
            continue
        export_game = export_index.get(game_id)
        if export_game is None:
            missing_export += 1
            continue
        checked += 1
        mismatch = compare_game(elo_game, export_game)
        if mismatch:
            mismatches.append(mismatch)

    if args.json:
        print(json.dumps({
            'checked': checked,
            'missingExport': missing_export,
            'mismatches': mismatches,
        }, ensure_ascii=False, indent=2))
        return 1 if mismatches else 0

    print(f'checked={checked} missing_export={missing_export} mismatches={len(mismatches)}')
    for mismatch in mismatches:
        reasons = ','.join(mismatch['reasons'])
        print(f"{mismatch['gameId']} {mismatch.get('date', '')} reasons={reasons}")
        print(f"  elo    winner={mismatch['eloWinner']['name']} place={mismatch['eloWinner']['place']} vp={mismatch['eloWinner']['vp']}")
        print(f"  export winner={mismatch['exportWinner']['name']} place={mismatch['exportWinner']['place']} vp={mismatch['exportWinner']['vp']}")
    return 1 if mismatches else 0


if __name__ == '__main__':
    raise SystemExit(main())
