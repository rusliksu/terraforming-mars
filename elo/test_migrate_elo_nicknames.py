#!/usr/bin/env python3
"""Regression test for migrate_elo_nicknames.py."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

from migrate_elo_nicknames import migrate_elo_directory


def write_seed(path: Path) -> None:
    payload = {
        'players': {
            'анатолий': {
                'displayName': 'Анатолий',
                'elo': 1512,
                'games': 4,
                'avgVP': 81,
            },
            'gambitgirl': {
                'displayName': 'GambitGirl',
                'elo': 1386,
                'games': 18,
                'avgVP': 83,
            },
            'gydro': {
                'displayName': 'GydRo',
                'elo': 1506,
                'games': 3,
            },
        },
        'games': [
            {
                '_key': 'old-nicks',
                'results': [
                    {'name': 'анатолий', 'displayName': 'Анатолий', 'vp': 81, 'place': 2},
                    {'name': 'gambitgirl', 'displayName': 'GambitGirl', 'vp': 83, 'place': 1},
                    {'name': 'gydro', 'displayName': 'GydRo', 'vp': 80, 'place': 3},
                ],
            },
        ],
    }
    text = json.dumps(payload, ensure_ascii=False, indent=2) + '\n'
    (path / 'elo-data.json').write_text(text, encoding='utf-8')
    (path / 'data.json').write_text(text, encoding='utf-8')


def main() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        elo_dir = Path(tmp)
        write_seed(elo_dir)

        summary = migrate_elo_directory(elo_dir, backup=True)
        assert summary['changedPlayers'] == 2
        assert summary['changedResults'] == 2
        assert len(summary['backups']) == 2

        primary = json.loads((elo_dir / 'elo-data.json').read_text(encoding='utf-8'))
        compat = json.loads((elo_dir / 'data.json').read_text(encoding='utf-8'))
        assert primary == compat
        assert 'анатолий' not in primary['players']
        assert 'gambitgirl' not in primary['players']
        assert primary['players']['антистресс']['displayName'] == 'Антистресс'
        assert primary['players']['антистресс']['elo'] == 1512
        assert primary['players']['антистресс']['games'] == 4
        assert primary['players']['олеся']['displayName'] == 'Олеся'
        assert primary['players']['олеся']['elo'] == 1386
        assert primary['players']['олеся']['games'] == 18

        results = primary['games'][0]['results']
        assert results[0]['name'] == 'антистресс'
        assert results[0]['displayName'] == 'Антистресс'
        assert results[1]['name'] == 'олеся'
        assert results[1]['displayName'] == 'Олеся'
        assert results[2]['name'] == 'gydro'
        assert results[2]['displayName'] == 'GydRo'

    print('migrate elo nicknames: OK')


if __name__ == '__main__':
    main()
