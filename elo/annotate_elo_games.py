#!/usr/bin/env python3
"""Add or update source/analysis metadata for games in elo-data.json.

Examples:
  python annotate_elo_games.py --game g934841ed1ec8 --source shadowlogger --analyzed-by codex --targets advisor,tierlist
  python annotate_elo_games.py --end sabc123 --analyzed-by claude --targets smartbot
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
ELO_PATH = SCRIPT_DIR / 'elo-data.json'
ELO_COMPAT_PATH = SCRIPT_DIR / 'data.json'


def normalize_optional_string(value: str | None) -> str | None:
    if not isinstance(value, str):
        return None
    value = value.strip()
    return value or None


def normalize_string_list(value: str | list[str] | None) -> list[str]:
    if isinstance(value, str):
        items = value.split(',')
    elif isinstance(value, list):
        items = value
    else:
        items = []
    normalized: list[str] = []
    for item in items:
        if not isinstance(item, str):
            continue
        stripped = item.strip()
        if stripped and stripped not in normalized:
            normalized.append(stripped)
    return normalized


def merge_string_lists(existing, new_values) -> list[str] | None:
    merged = normalize_string_list(existing) + normalize_string_list(new_values)
    deduped: list[str] = []
    for item in merged:
        if item not in deduped:
            deduped.append(item)
    return deduped or None


def load_elo() -> dict:
    for path in (ELO_PATH, ELO_COMPAT_PATH):
        if path.exists():
            return json.loads(path.read_text(encoding='utf-8'))
    return {'players': {}, 'games': []}


def save_elo(data: dict) -> None:
    payload = json.dumps(data, ensure_ascii=False, indent=2)
    ELO_PATH.write_text(payload, encoding='utf-8')
    ELO_COMPAT_PATH.write_text(payload, encoding='utf-8')


def game_matches(game: dict, game_ids: set[str], end_ids: set[str]) -> bool:
    if game_ids:
        key = str(game.get('gameId') or game.get('_key') or '').strip()
        if key in game_ids:
            return True
    if end_ids:
        end_id = str(game.get('endId') or '').strip()
        if end_id in end_ids:
            return True
    return False


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--game', action='append', default=[], help='gameId/_key to annotate')
    parser.add_argument('--end', action='append', default=[], help='endId to annotate')
    parser.add_argument('--source', help='source badge, e.g. shadowlogger/import/manual')
    parser.add_argument('--analyzed-by', help='comma-separated analyzers, e.g. codex,claude')
    parser.add_argument('--targets', help='comma-separated targets, e.g. advisor,smartbot,tierlist')
    args = parser.parse_args()

    game_ids = {item.strip() for item in args.game if item.strip()}
    end_ids = {item.strip() for item in args.end if item.strip()}
    if not game_ids and not end_ids:
        raise SystemExit('Need --game and/or --end')

    source = normalize_optional_string(args.source)
    analyzed_by = normalize_string_list(args.analyzed_by)
    targets = normalize_string_list(args.targets)
    if not source and not analyzed_by and not targets:
        raise SystemExit('Nothing to update: provide --source and/or --analyzed-by and/or --targets')

    data = load_elo()
    matched: list[str] = []

    for game in data.get('games', []):
        if not game_matches(game, game_ids, end_ids):
            continue
        if source:
            game['source'] = source
        merged_by = merge_string_lists(game.get('analyzedBy'), analyzed_by)
        if merged_by:
            game['analyzedBy'] = merged_by
        merged_targets = merge_string_lists(game.get('analysisTargets'), targets)
        if merged_targets:
            game['analysisTargets'] = merged_targets
        matched.append(str(game.get('gameId') or game.get('_key') or game.get('endId') or '?'))

    if not matched:
        raise SystemExit('No matching games found')

    save_elo(data)
    print(f'Updated {len(matched)} game(s):')
    for item in matched:
        print(f'  {item}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
