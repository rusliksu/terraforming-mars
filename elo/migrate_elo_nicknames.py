#!/usr/bin/env python3
"""Canonicalize Elo nicknames without recalculating ratings.

Use this after changing player_name_aliases.json when existing Elo data still
contains old display names. The script preserves all rating/stat fields, updates
only player keys/display names and stored game result names, writes atomically,
creates backups by default, and leaves files world-readable for nginx.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, Optional, Tuple

from elo_aliases import PLAYER_ALIASES, assert_no_suspicious_duplicate_players

SCRIPT_DIR = Path(__file__).resolve().parent
PRIMARY_NAME = 'elo-data.json'
COMPAT_NAME = 'data.json'
PUBLIC_FILE_MODE = 0o644


def alias_identity(values: Iterable[object]) -> Optional[Tuple[str, str]]:
    for value in values:
        if value is None:
            continue
        key = str(value).strip().lower()
        if key == '':
            continue
        canonical = PLAYER_ALIASES.get(key)
        if canonical is not None:
            return canonical.lower(), canonical
    return None


def target_path(path: Path) -> Path:
    return path.resolve() if path.exists() else path


def read_json(path: Path) -> Dict[str, Any]:
    with path.open(encoding='utf-8') as handle:
        return json.load(handle)


def atomic_write_json(path: Path, payload: Dict[str, Any]) -> None:
    target = target_path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=f'{target.name}.', suffix='.tmp', dir=str(target.parent))
    temp_path = Path(temp_name)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as handle:
            json.dump(payload, handle, ensure_ascii=False, indent=2)
            handle.write('\n')
        os.chmod(temp_path, PUBLIC_FILE_MODE)
        os.replace(temp_path, target)
        os.chmod(target, PUBLIC_FILE_MODE)
    finally:
        if temp_path.exists():
            temp_path.unlink()


def backup_file(path: Path, backup_dir: Path, timestamp: str) -> Optional[Path]:
    target = target_path(path)
    if not target.exists():
        return None
    backup_dir.mkdir(parents=True, exist_ok=True)
    backup_path = backup_dir / f'{target.name}.before-nick-migration.{timestamp}.bak'
    shutil.copy2(target, backup_path)
    os.chmod(backup_path, PUBLIC_FILE_MODE)
    return backup_path


def canonicalize_elo_data(data: Dict[str, Any]) -> Dict[str, Any]:
    summary: Dict[str, Any] = {
        'changedPlayers': 0,
        'changedResults': 0,
        'playerRenames': [],
    }

    players = data.get('players') or {}
    next_players: Dict[str, Any] = {}
    for old_key, player in players.items():
        display_name = player.get('displayName') if isinstance(player, dict) else None
        mapped = alias_identity([display_name, old_key])
        next_key = mapped[0] if mapped is not None else old_key
        next_display = mapped[1] if mapped is not None else display_name

        if next_key in next_players and next_key != old_key:
            raise ValueError(f'target player key already exists, refusing unsafe merge: {old_key} -> {next_key}')

        next_player = dict(player)
        if next_display is not None:
            next_player['displayName'] = next_display
        if next_key != old_key or next_player.get('displayName') != display_name:
            summary['changedPlayers'] += 1
            summary['playerRenames'].append({
                'from': old_key,
                'to': next_key,
                'displayName': next_player.get('displayName'),
            })
        next_players[next_key] = next_player

    data['players'] = next_players

    for game in data.get('games') or []:
        for result in game.get('results') or []:
            mapped = alias_identity([result.get('displayName'), result.get('name')])
            if mapped is None:
                continue
            next_key, next_display = mapped
            if result.get('name') != next_key or result.get('displayName') != next_display:
                summary['changedResults'] += 1
            result['name'] = next_key
            result['displayName'] = next_display

    assert_no_suspicious_duplicate_players(data.get('players') or {})
    return summary


def migrate_elo_directory(elo_dir: Path, dry_run: bool = False, backup: bool = True) -> Dict[str, Any]:
    primary_path = elo_dir / PRIMARY_NAME
    compat_path = elo_dir / COMPAT_NAME
    source_path = primary_path if primary_path.exists() else compat_path
    if not source_path.exists():
        raise FileNotFoundError(f'missing Elo data file: {primary_path} or {compat_path}')

    data = read_json(source_path)
    summary = canonicalize_elo_data(data)
    summary['source'] = str(target_path(source_path))
    summary['primary'] = str(target_path(primary_path))
    summary['compat'] = str(target_path(compat_path))
    summary['dryRun'] = dry_run
    summary['backups'] = []

    if dry_run or (summary['changedPlayers'] == 0 and summary['changedResults'] == 0):
        return summary

    if backup:
        timestamp = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
        backup_dir = target_path(elo_dir) / 'backups'
        seen_targets = set()
        for path in (primary_path, compat_path):
            target = target_path(path)
            if target in seen_targets:
                continue
            seen_targets.add(target)
            backup_path = backup_file(path, backup_dir, timestamp)
            if backup_path is not None:
                summary['backups'].append(str(backup_path))

    atomic_write_json(primary_path, data)
    atomic_write_json(compat_path, data)
    return summary


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--elo-dir', default=os.environ.get('TM_ELO_DIR', str(SCRIPT_DIR)))
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--no-backup', action='store_true')
    args = parser.parse_args()

    summary = migrate_elo_directory(Path(args.elo_dir), dry_run=args.dry_run, backup=not args.no_backup)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
