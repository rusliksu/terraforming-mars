#!/usr/bin/env python3
"""Backfill Elo game annotations from local shadow logger files.

Examples:
  python backfill_elo_shadow_annotations.py
  python backfill_elo_shadow_annotations.py --analyzed-by codex --targets advisor,tierlist
  python backfill_elo_shadow_annotations.py --dry-run
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
ELO_PATH = SCRIPT_DIR / 'elo-data.json'
ELO_COMPAT_PATH = SCRIPT_DIR / 'data.json'
DEFAULT_SHADOW_DIR = REPO_ROOT.parent / 'tm-tierlist' / 'data' / 'shadow'


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


def extract_game_id_from_shadow_file(path: Path) -> str | None:
    stem = path.stem
    if stem.startswith('shadow-g'):
        return stem.replace('shadow-', '', 1)

    try:
        with path.open(encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    payload = json.loads(line)
                except Exception:
                    continue
                game_id = payload.get('gameId')
                if isinstance(game_id, str) and game_id.strip():
                    return game_id.strip()
    except Exception:
        return None
    return None


def collect_shadow_game_ids(shadow_dir: Path) -> set[str]:
    game_ids: set[str] = set()
    if not shadow_dir.exists():
        return game_ids
    for path in sorted(shadow_dir.glob('shadow-*.jsonl')):
        game_id = extract_game_id_from_shadow_file(path)
        if game_id:
            game_ids.add(game_id)
    return game_ids


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--shadow-dir', default=str(DEFAULT_SHADOW_DIR))
    parser.add_argument('--source', default='shadowlogger')
    parser.add_argument('--analyzed-by', help='comma-separated analyzers to add to matched games')
    parser.add_argument('--targets', help='comma-separated analysis targets to add to matched games')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    shadow_dir = Path(args.shadow_dir)
    shadow_ids = collect_shadow_game_ids(shadow_dir)
    data = load_elo()

    source = normalize_optional_string(args.source)
    analyzed_by = normalize_string_list(args.analyzed_by)
    targets = normalize_string_list(args.targets)

    matched = 0
    updated = 0
    for game in data.get('games', []):
        game_id = str(game.get('gameId') or game.get('_key') or '').strip()
        if not game_id or game_id not in shadow_ids:
            continue
        matched += 1

        before = json.dumps({
            'source': game.get('source'),
            'analyzedBy': game.get('analyzedBy'),
            'analysisTargets': game.get('analysisTargets'),
        }, ensure_ascii=False, sort_keys=True)

        if source and not normalize_optional_string(game.get('source')):
            game['source'] = source
        merged_by = merge_string_lists(game.get('analyzedBy'), analyzed_by)
        if merged_by:
            game['analyzedBy'] = merged_by
        merged_targets = merge_string_lists(game.get('analysisTargets'), targets)
        if merged_targets:
            game['analysisTargets'] = merged_targets

        after = json.dumps({
            'source': game.get('source'),
            'analyzedBy': game.get('analyzedBy'),
            'analysisTargets': game.get('analysisTargets'),
        }, ensure_ascii=False, sort_keys=True)
        if before != after:
            updated += 1

    if not args.dry_run and updated > 0:
        save_elo(data)

    print(f'shadow_dir={shadow_dir}')
    print(f'shadow_game_ids={len(shadow_ids)}')
    print(f'matched_games={matched}')
    print(f'updated_games={updated}')
    if args.dry_run:
        print('dry_run=yes')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
