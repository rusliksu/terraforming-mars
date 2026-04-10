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


def is_bot_game(scores):
    """Detect bot/test games: all names <= 2 chars, or test names."""
    names = [s.get('playerName', '').strip() for s in scores]
    if all(len(n) <= 2 for n in names):
        return True
    test_names = {'testa', 'testb', 'testc', 'test', 'bot'}
    if any(n.lower() in test_names for n in names):
        return True
    return False


def parse_completed_ts(date_str):
    if not date_str:
        return 0
    try:
        return int(datetime.fromisoformat(date_str.replace('Z', '+00:00')).timestamp())
    except Exception:
        return 0


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

            legacy_games.append({
                'gameId': game_id,
                'endId': game.get('endId') or game.get('spectatorId') or spectator_ids.get(game_id, ''),
                'date': game.get('date', ''),
                'completedTime': game.get('completedTime') or parse_completed_ts(game.get('date', '')),
                'server': game.get('server', 'knightbyte'),
                'map': game.get('map', ''),
                'generation': game.get('generation', 0),
                'players': players,
            })
            known_ids.add(game_id)
    return legacy_games


def apply_game_to_elo(game, elo_data):
    players = list(game['players'])
    results = calc_elo_place(players, elo_data['players'])
    has_vp = any(p.get('vp', 0) > 0 for p in players)
    results_vp = calc_elo_vp(players, elo_data['players']) if has_vp else []

    for r in results:
        key = r['name']
        if key not in elo_data['players']:
            elo_data['players'][key] = {
                'elo': DEFAULT_ELO, 'elo_vp': DEFAULT_ELO,
                'displayName': r['displayName'],
                'games': 0, 'firsts': 0, 'wins': 0, 'placeScoreTotal': 0,
                'avgPlace': 0, 'top3': 0,
                'totalVP': 0, 'corps': {},
                'avgVP': 0,
            }
        p = elo_data['players'][key]
        p['elo'] = r['newElo']
        p['displayName'] = r['displayName']
        p.setdefault('firsts', p.get('wins', 0))
        p.setdefault('placeScoreTotal', 0)
        p.setdefault('avgPlace', 0)
        p.setdefault('top3', 0)
        p.setdefault('totalVP', 0)
        p.setdefault('corps', {})
        p.setdefault('avgVP', 0)
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
        'playerCount': len(players),
        'completedTime': game.get('completedTime', 0),
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
            SELECT g.game_id, g.game
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
            SELECT g.game_id, g.game
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
               json_extract(lg.game, '$.spectatorId') as spectator_id
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

    for gid, gen, scores_json, completed_ts, options_json, spectator_id in rows:
        scores = json.loads(scores_json)

        # Skip bot/test games
        if is_bot_game(scores):
            skipped_bot += 1
            continue

        # Skip games with < 2 players
        if len(scores) < 2:
            skipped_few_players += 1
            continue

        has_vp = all(s.get('playerScore', 0) > 0 for s in scores)
        has_place = all('place' in s for s in scores)

        if not has_vp and not has_place:
            # No VP and no place — can't determine results
            skipped_no_vp_no_place += 1
            continue

        # Build player list
        if has_vp:
            # Sort by VP descending, assign places
            scores.sort(key=lambda s: s.get('playerScore', 0), reverse=True)
            players = []
            for i, s in enumerate(scores):
                vp = s.get('playerScore', 0)
                place = i + 1
                if i > 0 and vp == scores[i-1].get('playerScore', 0):
                    place = players[-1]['place']
                players.append({
                    'name': s.get('playerName', '?'),
                    'place': place,
                    'vp': vp,
                    'corp': s.get('corporation', ''),
                })
        else:
            # Use existing place field
            scores.sort(key=lambda s: s.get('place', 99))
            players = []
            for s in scores:
                name = s.get('playerName', '?')
                if not name or name == '?':
                    continue
                players.append({
                    'name': name,
                    'place': s.get('place', 99),
                    'vp': s.get('playerScore', 0),
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
        game_entries.append({
            'gameId': gid,
            'endId': spectator_id or spectator_ids.get(gid, ''),
            'date': date_str,
            'completedTime': completed_ts or 0,
            'server': 'knightbyte',
            'map': map_name,
            'generation': gen or 0,
            'players': players,
        })
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
