#!/usr/bin/env python3
"""Import completed games from game.db into elo-data.json.

One-time script to populate Elo after reset.
Reads game_results table, filters bots/incomplete, normalizes names, rebuilds Elo.

Usage (on VPS):
  python3 import_gamedb_to_elo.py
"""

import json
import sqlite3
import os
from datetime import datetime, timezone
from pathlib import Path

from elo_aliases import assert_no_suspicious_duplicate_players, normalize_name

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
DB_PATH = Path(os.environ.get('TM_DB_PATH', REPO_ROOT / 'db' / 'game.db'))
ELO_DIR = Path(os.environ.get('TM_ELO_DIR', SCRIPT_DIR))
ELO_PATH = ELO_DIR / 'elo-data.json'
ELO_COMPAT_PATH = ELO_DIR / 'data.json'
DEFAULT_ELO = 1500
BASE_K = 32

def get_k(elo):
    if elo < 1400: return BASE_K * 1.2
    if elo < 1600: return BASE_K
    if elo < 1800: return BASE_K * 0.8
    if elo < 2000: return BASE_K * 0.6
    return BASE_K * 0.4


def expected_score(my_elo, opp_elo):
    return 1 / (1 + 10 ** ((opp_elo - my_elo) / 400))


def placement_score(place, player_count):
    if player_count <= 1:
        return 1.0
    return max(0.0, min(1.0, 1 - ((max(1, place) - 1) / (player_count - 1))))


def vp_margin(players, player):
    if not players:
        return 0
    leader_vp = max((entry.get('vp', 0) for entry in players), default=0)
    if player.get('place', 99) == 1:
        others = [entry.get('vp', 0) for entry in players if entry is not player]
        return player.get('vp', 0) - (max(others) if others else player.get('vp', 0))
    return player.get('vp', 0) - leader_vp


def calc_elo_place(players, elo_db):
    """Place-based FFA Elo (matches elo.js calculateFFA)."""
    n = len(players)
    if n < 2:
        return []
    results = []
    for i, p in enumerate(players):
        key, display = normalize_name(p['name'])
        my_elo = elo_db.get(key, {}).get('elo', DEFAULT_ELO)
        k = get_k(my_elo)
        total_exp = 0
        total_act = 0
        for j, opp in enumerate(players):
            if i == j:
                continue
            opp_key, _ = normalize_name(opp['name'])
            opp_elo = elo_db.get(opp_key, {}).get('elo', DEFAULT_ELO)
            total_exp += expected_score(my_elo, opp_elo)
            if p['place'] < opp['place']:
                total_act += 1.0
            elif p['place'] == opp['place']:
                total_act += 0.5
        scaled_k = k / (n - 1) * 1.5
        delta = round(scaled_k * (total_act - total_exp))
        results.append({
            'name': key, 'displayName': display,
            'oldElo': my_elo, 'newElo': my_elo + delta, 'delta': delta,
            'place': p['place'], 'corp': p.get('corp', ''), 'vp': p.get('vp', 0),
        })
    return results


def calc_elo_vp(players, elo_db):
    """VP-margin FFA Elo (matches elo.js calculateFFA_VP)."""
    n = len(players)
    if n < 2:
        return []
    results = []
    for i, p in enumerate(players):
        key, display = normalize_name(p['name'])
        my_elo = elo_db.get(key, {}).get('elo_vp', DEFAULT_ELO)
        my_vp = p.get('vp', 0)
        k = get_k(my_elo)
        total_exp = 0
        total_act = 0
        for j, opp in enumerate(players):
            if i == j:
                continue
            opp_key, _ = normalize_name(opp['name'])
            opp_elo = elo_db.get(opp_key, {}).get('elo_vp', DEFAULT_ELO)
            opp_vp = opp.get('vp', 0)
            total_exp += expected_score(my_elo, opp_elo)
            if my_vp > opp_vp:
                margin = min((my_vp - opp_vp) / 20.0, 1.0)
                total_act += 0.5 + margin * 0.5
            elif my_vp == opp_vp:
                total_act += 0.5
            else:
                margin = min((opp_vp - my_vp) / 20.0, 1.0)
                total_act += 0.5 - margin * 0.5
        scaled_k = k / (n - 1) * 1.5
        delta = round(scaled_k * (total_act - total_exp))
        results.append({'name': key, 'newElo': my_elo + delta})
    return results


def is_bot_name_set(names):
    """Detect bot/test player sets from normalized names."""
    names = [str(name).strip() for name in names if str(name).strip()]
    if not names:
        return False
    if all(len(n) <= 2 for n in names):
        return True
    test_names = {'testa', 'testb', 'testc', 'test', 'bot'}
    if any(n.lower() in test_names for n in names):
        return True
    return False


def is_bot_game(scores, fallback_names=None):
    """Detect bot/test games from score rows plus optional fallback player names."""
    names = []
    fallback_names = fallback_names or []
    for idx, score in enumerate(scores or []):
        name = str(score.get('playerName') or '').strip()
        if not name and idx < len(fallback_names):
            name = str(fallback_names[idx] or '').strip()
        if name:
            names.append(name)
    return is_bot_name_set(names)


def parse_completed_ts(date_str):
    if not date_str:
        return 0
    try:
        return int(datetime.fromisoformat(date_str.replace('Z', '+00:00')).timestamp())
    except Exception:
        return 0


def parse_json_object(raw):
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except Exception:
        return {}


def normalize_optional_string(value):
    if not isinstance(value, str):
        return None
    value = value.strip()
    return value or None


def normalize_string_list(value):
    if isinstance(value, str):
        items = value.split(',')
    elif isinstance(value, list):
        items = value
    else:
        items = []
    normalized = []
    for item in items:
        if not isinstance(item, str):
            continue
        stripped = item.strip()
        if stripped and stripped not in normalized:
            normalized.append(stripped)
    return normalized or None


def extract_game_metadata(game):
    metadata = {}
    source = normalize_optional_string(game.get('source'))
    analyzed_by = normalize_string_list(game.get('analyzedBy'))
    analysis_targets = normalize_string_list(game.get('analysisTargets'))
    if source:
        metadata['source'] = source
    if analyzed_by:
        metadata['analyzedBy'] = analyzed_by
    if analysis_targets:
        metadata['analysisTargets'] = analysis_targets
    return metadata


def apply_game_metadata(target, metadata):
    if metadata.get('source'):
        target['source'] = metadata['source']
    if metadata.get('analyzedBy'):
        target['analyzedBy'] = list(metadata['analyzedBy'])
    if metadata.get('analysisTargets'):
        target['analysisTargets'] = list(metadata['analysisTargets'])


def build_legacy_metadata_index():
    metadata_by_game = {}
    for source in discover_legacy_sources():
        try:
            with source.open(encoding='utf-8') as f:
                payload = json.load(f)
        except Exception:
            continue

        for game in payload.get('games', []):
            game_id = game.get('gameId') or game.get('_key')
            if not game_id:
                continue
            metadata = extract_game_metadata(game)
            if metadata:
                metadata_by_game[game_id] = metadata
    return metadata_by_game


def extract_player_names_from_game(raw_game):
    game = parse_json_object(raw_game)
    players = game.get('players') or []
    return [str(player.get('name') or '').strip() for player in players]


def score_player_name(score, idx, fallback_names):
    name = str(score.get('playerName') or '').strip()
    if name:
        return name
    if idx < len(fallback_names):
        return fallback_names[idx]
    return '?'


def discover_legacy_sources():
    candidates = []

    env_paths = os.environ.get('TM_ELO_LEGACY_PATHS', '')
    if env_paths:
        for item in env_paths.split(os.pathsep):
            item = item.strip()
            if item:
                candidates.append(Path(item))

    candidates.extend([
        ELO_PATH,
        ELO_COMPAT_PATH,
        REPO_ROOT.parent / 'terraforming-mars' / 'elo' / 'elo-data.json',
        REPO_ROOT.parent / 'terraforming-mars' / 'elo' / 'data.json',
    ])

    seen = set()
    sources = []
    for path in candidates:
        try:
            resolved = path.resolve()
        except FileNotFoundError:
            resolved = path
        key = str(resolved)
        if key in seen or not path.exists() or not path.is_file():
            continue
        seen.add(key)
        sources.append(path)
    return sources


def extract_legacy_games(known_ids, spectator_ids):
    legacy_games = []
    for source in discover_legacy_sources():
        try:
            with source.open(encoding='utf-8') as f:
                payload = json.load(f)
        except Exception:
            continue

        for game in payload.get('games', []):
            game_id = game.get('gameId') or game.get('_key')
            if not game_id or game_id in known_ids:
                continue

            results = game.get('results') or []
            players = []
            for r in results:
                name = r.get('displayName') or r.get('name') or '?'
                if not name or name == '?':
                    continue
                players.append({
                    'name': name,
                    'place': r.get('place', 99),
                    'vp': r.get('vp', 0),
                    'corp': r.get('corp', ''),
                })

            if len(players) < 2:
                continue
            if is_bot_name_set([player.get('name', '') for player in players]):
                continue

            legacy_games.append({
                'gameId': game_id,
                'endId': game.get('endId') or game.get('spectatorId') or spectator_ids.get(game_id, ''),
                'date': game.get('date', ''),
                'completedTime': game.get('completedTime') or parse_completed_ts(game.get('date', '')),
                'startedTime': game.get('startedTime', 0),
                'durationMs': game.get('durationMs') or (
                    max(0, (game.get('completedTime') or parse_completed_ts(game.get('date', ''))) - (game.get('startedTime') or 0)) * 1000
                    if (game.get('completedTime') or parse_completed_ts(game.get('date', ''))) and game.get('startedTime')
                    else None
                ),
                'durationMinutes': game.get('durationMinutes') or (
                    round((game.get('durationMs') or (
                        max(0, (game.get('completedTime') or parse_completed_ts(game.get('date', ''))) - (game.get('startedTime') or 0)) * 1000
                        if (game.get('completedTime') or parse_completed_ts(game.get('date', ''))) and game.get('startedTime')
                        else 0
                    )) / 60000)
                    if (game.get('durationMs') or (
                        (game.get('completedTime') or parse_completed_ts(game.get('date', ''))) and game.get('startedTime')
                    ))
                    else None
                ),
                'server': game.get('server', 'knightbyte'),
                'map': game.get('map', ''),
                'generation': game.get('generation', 0),
                'players': players,
                **extract_game_metadata(game),
            })
            known_ids.add(game_id)
    return legacy_games


def apply_game_to_elo(game, elo_data):
    players = list(game['players'])
    results = calc_elo_place(players, elo_data['players'])
    has_vp = any(p.get('vp', 0) > 0 for p in players)
    results_vp = calc_elo_vp(players, elo_data['players']) if has_vp else []

    for idx, r in enumerate(results):
        key = r['name']
        if key not in elo_data['players']:
            elo_data['players'][key] = {
                'elo': DEFAULT_ELO, 'elo_vp': DEFAULT_ELO,
                'displayName': r['displayName'],
                'games': 0, 'firsts': 0, 'wins': 0, 'placeScoreTotal': 0,
                'avgPlace': 0, 'top3': 0,
                'totalVP': 0, 'totalGens': 0, 'totalMargin': 0, 'corps': {},
                'avgVP': 0,
                'avgGens': 0,
                'avgMargin': 0,
            }
        p = elo_data['players'][key]
        p['elo'] = r['newElo']
        p['displayName'] = r['displayName']
        p.setdefault('firsts', p.get('wins', 0))
        p.setdefault('placeScoreTotal', 0)
        p.setdefault('avgPlace', 0)
        p.setdefault('top3', 0)
        p.setdefault('totalVP', 0)
        p.setdefault('totalGens', 0)
        p.setdefault('totalMargin', 0)
        p.setdefault('corps', {})
        p.setdefault('avgVP', 0)
        p.setdefault('avgGens', 0)
        p.setdefault('avgMargin', 0)
        p['games'] += 1
        if r['place'] == 1:
            p['firsts'] += 1
        p['wins'] = p['firsts']
        p['placeScoreTotal'] += placement_score(r['place'], len(players))
        p['avgPlace'] = round(p['placeScoreTotal'] / p['games'], 4)
        if r['place'] <= 3:
            p['top3'] += 1
        p['totalVP'] += r.get('vp', 0)
        p['avgVP'] = round(p['totalVP'] / p['games'], 2)
        if game.get('generation', 0) > 0:
            p['totalGens'] += game.get('generation', 0)
            p['avgGens'] = round(p['totalGens'] / p['games'], 3)
        p['totalMargin'] += vp_margin(players, players[idx] if idx < len(players) else {'place': r['place'], 'vp': r.get('vp', 0)})
        p['avgMargin'] = round(p['totalMargin'] / p['games'], 3)
        if r['corp']:
            p['corps'][r['corp']] = p['corps'].get(r['corp'], 0) + 1

    for rv in results_vp:
        if rv['name'] in elo_data['players']:
            elo_data['players'][rv['name']]['elo_vp'] = rv['newElo']

    elo_data['games'].append({
        '_key': game['gameId'],
        'gameId': game['gameId'],
        'endId': game.get('endId', ''),
        'date': game.get('date', ''),
        'server': game.get('server', 'knightbyte'),
        'map': game.get('map', ''),
        'generation': game.get('generation', 0),
        'startedTime': game.get('startedTime', 0),
        'playerCount': len(players),
        'completedTime': game.get('completedTime', 0),
        'durationMs': game.get('durationMs'),
        'durationMinutes': game.get('durationMinutes'),
        **extract_game_metadata(game),
        'results': [{
            'name': r['name'], 'displayName': r['displayName'],
            'place': r['place'], 'delta': r['delta'],
            'oldElo': r['oldElo'], 'newElo': r['newElo'],
            'corp': r['corp'], 'vp': r.get('vp', 0),
        } for r in results],
    })


def save_outputs(elo_data):
    text = json.dumps(elo_data, ensure_ascii=False, indent=2)
    ELO_DIR.mkdir(parents=True, exist_ok=True)
    ELO_PATH.write_text(text, encoding='utf-8')
    ELO_COMPAT_PATH.write_text(text, encoding='utf-8')


def main():
    conn = sqlite3.connect(str(DB_PATH))
    c = conn.cursor()

    c.execute("""
        WITH latest_games AS (
            SELECT g.game_id, g.game, g.created_time
            FROM games g
            JOIN (
                SELECT game_id, MAX(save_id) AS max_save_id
                FROM games
                GROUP BY game_id
            ) latest
            ON latest.game_id = g.game_id AND latest.max_save_id = g.save_id
        )
        SELECT game_id, json_extract(game, '$.spectatorId') as spectator_id
        FROM latest_games
    """)
    spectator_ids = {gid: spectator_id or '' for gid, spectator_id in c.fetchall()}

    # Load all game_results with completion timestamps
    c.execute("""
        WITH latest_games AS (
            SELECT g.game_id, g.game, g.created_time
            FROM games g
            JOIN (
                SELECT game_id, MAX(save_id) AS max_save_id
                FROM games
                GROUP BY game_id
            ) latest
            ON latest.game_id = g.game_id AND latest.max_save_id = g.save_id
        )
        SELECT gr.game_id, gr.generations, gr.scores,
               COALESCE(cg.completed_time, 0) as completed_time,
               gr.game_options,
               json_extract(lg.game, '$.spectatorId') as spectator_id,
               lg.game as latest_game_json,
               COALESCE(lg.created_time, 0) as started_time
        FROM game_results gr
        LEFT JOIN completed_game cg ON gr.game_id = cg.game_id
        LEFT JOIN latest_games lg ON lg.game_id = gr.game_id
        ORDER BY COALESCE(cg.completed_time, 0)
    """)
    rows = c.fetchall()
    conn.close()

    print(f'Total game_results rows: {len(rows)}')

    elo_data = {'players': {}, 'games': []}
    imported = 0
    preserved_legacy = 0
    skipped_bot = 0
    skipped_no_vp_no_place = 0
    skipped_few_players = 0
    game_entries = []
    known_ids = set()
    legacy_metadata = build_legacy_metadata_index()

    for gid, gen, scores_json, completed_ts, options_json, spectator_id, latest_game_json, started_time in rows:
        scores = json.loads(scores_json)
        fallback_names = extract_player_names_from_game(latest_game_json)

        # Skip bot/test games
        if is_bot_game(scores, fallback_names):
            skipped_bot += 1
            continue

        # Skip games with < 2 players
        if len(scores) < 2:
            skipped_few_players += 1
            continue

        has_vp = all(s.get('playerScore', 0) > 0 for s in scores)
        has_place = all(s.get('place') is not None for s in scores)

        if not has_vp and not has_place:
            # No VP and no place — can't determine results
            skipped_no_vp_no_place += 1
            continue

        # Build player list
        if has_place:
            # Prefer authoritative place field from source when present.
            scores.sort(key=lambda s: s.get('place', 99))
            players = []
            for i, s in enumerate(scores):
                name = score_player_name(s, i, fallback_names)
                if not name or name == '?':
                    continue
                players.append({
                    'name': name,
                    'place': s.get('place', 99),
                    'vp': s.get('playerScore', 0),
                    'corp': s.get('corporation', ''),
                })
        else:
            # Sort by VP descending, assign places
            indexed_scores = list(enumerate(scores))
            indexed_scores.sort(key=lambda item: item[1].get('playerScore', 0), reverse=True)
            players = []
            for i, (idx, s) in enumerate(indexed_scores):
                vp = s.get('playerScore', 0)
                place = i + 1
                if i > 0 and vp == indexed_scores[i-1][1].get('playerScore', 0):
                    place = players[-1]['place']
                name = score_player_name(s, idx, fallback_names)
                if not name or name == '?':
                    continue
                players.append({
                    'name': name,
                    'place': place,
                    'vp': vp,
                    'corp': s.get('corporation', ''),
                })

        if len(players) < 2:
            skipped_few_players += 1
            continue

        # Filter: at least one player VP > 0 OR all have valid places
        # For place-based games, we proceed even with VP=0

        # Extract map from game_options
        map_name = ''
        if options_json:
            try:
                opts = json.loads(options_json)
                map_name = opts.get('boardName', '')
            except:
                pass

        # Date from completed_time
        date_str = ''
        if completed_ts and completed_ts > 0:
            date_str = datetime.fromtimestamp(completed_ts, tz=timezone.utc).isoformat()
        duration_ms = None
        duration_minutes = None
        if completed_ts and started_time and completed_ts > 0 and started_time > 0:
            duration_ms = max(0, int(completed_ts - started_time) * 1000)
            duration_minutes = round(duration_ms / 60000)
        game_entry = {
            'gameId': gid,
            'endId': spectator_id or spectator_ids.get(gid, ''),
            'date': date_str,
            'completedTime': completed_ts or 0,
            'startedTime': started_time or 0,
            'durationMs': duration_ms,
            'durationMinutes': duration_minutes,
            'server': 'knightbyte',
            'map': map_name,
            'generation': gen or 0,
            'players': players,
        }
        apply_game_metadata(game_entry, legacy_metadata.get(gid, {}))
        if 'source' not in game_entry:
            game_entry['source'] = 'import'
        game_entries.append(game_entry)
        known_ids.add(gid)

    legacy_games = extract_legacy_games(known_ids, spectator_ids)
    preserved_legacy = len(legacy_games)
    game_entries.extend(legacy_games)
    game_entries.sort(key=lambda g: (g.get('completedTime', 0), g.get('date', ''), g.get('gameId', '')))

    for game in game_entries:
        apply_game_to_elo(game, elo_data)
        if game.get('server') == 'knightbyte':
            imported += 1

    print(f'\nImported: {imported}')
    print(f'Preserved legacy-only games: {preserved_legacy}')
    print(f'Skipped bot/test: {skipped_bot}')
    print(f'Skipped no VP/no place: {skipped_no_vp_no_place}')
    print(f'Skipped <2 players: {skipped_few_players}')
    print(f'Players: {len(elo_data["players"])}')
    assert_no_suspicious_duplicate_players(elo_data['players'])

    # Leaderboard
    lb = sorted(elo_data['players'].items(), key=lambda x: x[1]['elo'], reverse=True)
    print(f'\n{"#":>3} {"Name":<20} {"Elo":>5} {"EloVP":>6} {"Games":>5} {"1st":>4} {"Place":>6} {"AvgVP":>6}')
    print('-' * 68)
    for i, (key, p) in enumerate(lb[:25]):
        place_avg = p.get('avgPlace', 0)
        avg_vp = p.get('avgVP', 0)
        print(f'{i+1:>3} {p["displayName"]:<20} {p["elo"]:>5} {p.get("elo_vp", 1500):>6} {p["games"]:>5} {p.get("firsts", p.get("wins", 0)):>4} {place_avg:>6.2f} {avg_vp:>6.1f}')

    # Save
    save_outputs(elo_data)
    print(f'\nSaved to {ELO_PATH}')
    print(f'Saved to {ELO_COMPAT_PATH}')


if __name__ == '__main__':
    main()
