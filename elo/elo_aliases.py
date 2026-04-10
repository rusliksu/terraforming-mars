#!/usr/bin/env python3
"""Shared Elo name normalization and duplicate detection helpers."""

from __future__ import annotations

import itertools
import json
import unicodedata
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

SCRIPT_DIR = Path(__file__).resolve().parent
ALIASES_PATH = SCRIPT_DIR / 'player_name_aliases.json'
PLAYER_ALIASES: Dict[str, str] = json.loads(ALIASES_PATH.read_text(encoding='utf-8'))

_CONFUSABLE_TO_LATIN = str.maketrans({
    'а': 'a',
    'в': 'b',
    'с': 'c',
    'е': 'e',
    'н': 'h',
    'к': 'k',
    'м': 'm',
    'о': 'o',
    'р': 'p',
    'т': 't',
    'х': 'x',
    'у': 'y',
})

_CYRILLIC_TO_LATIN = {
    'а': 'a',
    'б': 'b',
    'в': 'v',
    'г': 'g',
    'д': 'd',
    'е': 'e',
    'ё': 'e',
    'ж': 'zh',
    'з': 'z',
    'и': 'i',
    'й': 'i',
    'к': 'k',
    'л': 'l',
    'м': 'm',
    'н': 'n',
    'о': 'o',
    'п': 'p',
    'р': 'r',
    'с': 's',
    'т': 't',
    'у': 'u',
    'ф': 'f',
    'х': 'h',
    'ц': 'c',
    'ч': 'ch',
    'ш': 'sh',
    'щ': 'sch',
    'ъ': '',
    'ы': 'y',
    'ь': '',
    'э': 'e',
    'ю': 'yu',
    'я': 'ya',
}


def normalize_name(raw_name: str) -> Tuple[str, str]:
    stripped = (raw_name or '').strip()
    canonical = PLAYER_ALIASES.get(stripped.lower(), stripped)
    return canonical.lower(), canonical


def _clean_name(raw_name: str) -> str:
    normalized = unicodedata.normalize('NFKC', (raw_name or '').strip().lower())
    return ''.join(ch for ch in normalized if ch.isalnum())


def _transliteration_key(raw_name: str) -> str:
    return ''.join(_CYRILLIC_TO_LATIN.get(ch, ch) for ch in _clean_name(raw_name))


def _confusable_key(raw_name: str) -> str:
    return _clean_name(raw_name).translate(_CONFUSABLE_TO_LATIN)


def find_suspicious_duplicate_names(display_names: Iterable[str]) -> List[dict]:
    groups: Dict[Tuple[str, str], set[str]] = {}
    unique_names = sorted({name.strip() for name in display_names if name and name.strip()})

    for name in unique_names:
        signatures = {
            ('clean', _clean_name(name)),
            ('translit', _transliteration_key(name)),
            ('confusable', _confusable_key(name)),
        }
        for kind, value in signatures:
            if value:
                groups.setdefault((kind, value), set()).add(name)

    pair_reasons: Dict[Tuple[str, str], set[str]] = {}
    for (kind, _), names in groups.items():
        if len(names) < 2:
            continue
        for left, right in itertools.combinations(sorted(names), 2):
            pair_reasons.setdefault((left, right), set()).add(kind)

    return [
        {'left': left, 'right': right, 'reasons': sorted(reasons)}
        for (left, right), reasons in sorted(pair_reasons.items())
    ]


def find_suspicious_duplicate_players(players: Dict[str, dict]) -> List[dict]:
    display_names = [player.get('displayName') or key for key, player in players.items()]
    return find_suspicious_duplicate_names(display_names)


def assert_no_suspicious_duplicate_players(players: Dict[str, dict]) -> None:
    duplicates = find_suspicious_duplicate_players(players)
    if not duplicates:
        return
    sample = ', '.join(
        f"{item['left']} <-> {item['right']} ({'/'.join(item['reasons'])})"
        for item in duplicates[:8]
    )
    raise ValueError(f'suspicious Elo player duplicates detected: {sample}')
