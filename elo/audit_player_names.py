#!/usr/bin/env python3
"""Audit low-sample player names and their source games.

This is a read-only helper for deciding which names should be added to
player_name_aliases.json. It intentionally prints game context instead of
guessing aliases.
"""

from __future__ import annotations

import argparse
import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

from elo_aliases import normalize_name


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_DB_PATH = SCRIPT_DIR.parent / 'db' / 'game.db'


def parse_json(raw: Optional[str], fallback: Any) -> Any:
    if not raw:
        return fallback
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return fallback


def safe_int(value: Any) -> Optional[int]:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def iso_utc(timestamp: Any) -> str:
    value = safe_int(timestamp)
    if not value:
        return ''
    return datetime.fromtimestamp(value, tz=timezone.utc).isoformat().replace('+00:00', 'Z')


def card_name(card: Any) -> Optional[str]:
    if isinstance(card, str):
        return card
    if not isinstance(card, dict):
        return None
    metadata = card.get('metadata')
    if isinstance(metadata, dict) and metadata.get('name'):
        return str(metadata['name'])
    if card.get('name'):
        return str(card['name'])
    return None


def corporation_name(player: dict) -> str:
    names: List[str] = []
    for key in ('corporationCard', 'pickedCorporationCard', 'corpCard'):
        name = card_name(player.get(key))
        if name:
            names.append(name)
    for key in ('corporationCards', 'pickedCorporationCards', 'corporations'):
        cards = player.get(key)
        if isinstance(cards, list):
            names.extend(name for name in (card_name(card) for card in cards) if name)
    return '|'.join(dict.fromkeys(names))


def score_value(score: dict) -> Optional[int]:
    for key in ('score', 'total', 'vp', 'victoryPoints'):
        value = safe_int(score.get(key))
        if value is not None:
            return value
    return None


def latest_games(conn: sqlite3.Connection) -> Dict[str, dict]:
    rows = conn.execute(
        '''
        SELECT game_id, game
        FROM games g
        WHERE save_id = (
          SELECT MAX(save_id)
          FROM games
          WHERE game_id = g.game_id
        )
        '''
    ).fetchall()
    return {row['game_id']: parse_json(row['game'], {}) for row in rows}


def combined_players(scores: Any, game: dict) -> List[Tuple[str, dict, dict]]:
    score_rows = scores if isinstance(scores, list) else []
    game_players = game.get('players') if isinstance(game.get('players'), list) else []
    count = max(len(score_rows), len(game_players))
    players: List[Tuple[str, dict, dict]] = []
    for idx in range(count):
        score = score_rows[idx] if idx < len(score_rows) and isinstance(score_rows[idx], dict) else {}
        player = game_players[idx] if idx < len(game_players) and isinstance(game_players[idx], dict) else {}
        raw_name = score.get('playerName') or player.get('name') or player.get('displayName') or '?'
        players.append((str(raw_name), score, player))
    return players


def build_audit(conn: sqlite3.Connection) -> Dict[str, dict]:
    snapshots = latest_games(conn)
    rows = conn.execute(
        '''
        SELECT gr.game_id,
               gr.players,
               gr.generations,
               gr.game_options,
               gr.scores,
               COALESCE(cg.completed_time, 0) AS completed_time
        FROM game_results gr
        LEFT JOIN completed_game cg ON cg.game_id = gr.game_id
        ORDER BY COALESCE(cg.completed_time, 0), gr.game_id
        '''
    ).fetchall()

    audit: Dict[str, dict] = {}
    for row in rows:
        options = parse_json(row['game_options'], {})
        game = snapshots.get(row['game_id'], {})
        players = combined_players(parse_json(row['scores'], []), game)
        normalized_names = []
        for raw_name, _, _ in players:
            _, display = normalize_name(raw_name)
            normalized_names.append(display)

        for index, (raw_name, score, player) in enumerate(players):
            key, display = normalize_name(raw_name)
            item = audit.setdefault(key, {
                'name': key,
                'displayName': display,
                'rawNames': set(),
                'games': [],
            })
            item['displayName'] = display
            item['rawNames'].add(raw_name)
            item['games'].append({
                'gameId': row['game_id'],
                'date': iso_utc(row['completed_time']),
                'players': row['players'],
                'generations': row['generations'],
                'board': options.get('boardName') or options.get('board') or options.get('map') or '',
                'lineup': normalized_names,
                'rawName': raw_name,
                'color': player.get('color') or '',
                'corp': corporation_name(player),
                'score': score_value(score),
                'terraformRating': score.get('terraformRating') or player.get('terraformRating'),
                'index': index,
            })
    return audit


def split_names(values: Iterable[str]) -> set[str]:
    names: set[str] = set()
    for value in values:
        for part in value.split(','):
            stripped = part.strip()
            if stripped:
                key, _ = normalize_name(stripped)
                names.add(key)
    return names


def serialize_player(item: dict) -> dict:
    return {
        **item,
        'rawNames': sorted(item['rawNames']),
        'games': item['games'],
        'gamesCount': len(item['games']),
    }


def render_player(item: dict, max_context_games: int) -> List[str]:
    raw_names = ', '.join(sorted(item['rawNames']))
    lines = [
        f"{item['displayName']} games={len(item['games'])} raw={raw_names}",
    ]
    for game in item['games'][:max_context_games]:
        lineup = ', '.join(game['lineup'])
        details = [
            game['gameId'],
            game['date'],
            f"{game['players']}p",
            f"gen{game['generations']}",
            game['board'],
            f"lineup=[{lineup}]",
        ]
        extra = []
        if game['color']:
            extra.append(f"color={game['color']}")
        if game['corp']:
            extra.append(f"corp={game['corp']}")
        if game['score'] is not None:
            extra.append(f"score={game['score']}")
        if game['terraformRating'] is not None:
            extra.append(f"TR={game['terraformRating']}")
        lines.append('  ' + ' '.join(str(part) for part in details if part))
        if extra:
            lines.append('    ' + ' '.join(str(part) for part in extra))
    if len(item['games']) > max_context_games:
        lines.append(f"  ... {len(item['games']) - max_context_games} more games")
    return lines


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Audit low-sample Terraforming Mars player names')
    parser.add_argument('--db', default=os.environ.get('TM_GAME_DB', str(DEFAULT_DB_PATH)), help='Path to game.db')
    parser.add_argument('--max-games', type=int, default=1, help='Show players with at most this many games')
    parser.add_argument('--context-games', type=int, default=4, help='How many source games to show per player')
    parser.add_argument('--names', action='append', default=[], help='Comma-separated player names to inspect')
    parser.add_argument('--limit', type=int, default=50, help='Maximum players to print')
    parser.add_argument('--json', action='store_true', help='Emit JSON')
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    db_path = Path(args.db).expanduser()
    if not db_path.exists():
        raise SystemExit(f'database not found: {db_path}')

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    audit = build_audit(conn)
    requested = split_names(args.names)

    players = []
    for key, item in audit.items():
        if requested:
            if key not in requested:
                continue
        elif len(item['games']) > args.max_games:
            continue
        players.append(item)
    players.sort(key=lambda item: (len(item['games']), item['displayName'].lower()))

    if args.json:
        print(json.dumps({
            'players': [serialize_player(item) for item in players[:args.limit]],
            'total': len(players),
        }, ensure_ascii=False, indent=2))
        return 0

    print(f'players={len(players)}')
    for item in players[:args.limit]:
        for line in render_player(item, args.context_games):
            print(line)
    if len(players) > args.limit:
        print(f'... {len(players) - args.limit} more players')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
