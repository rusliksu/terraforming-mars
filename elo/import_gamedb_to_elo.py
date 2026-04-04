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

DB_PATH = '/home/openclaw/terraforming-mars/db/game.db'
ELO_PATH = '/home/openclaw/terraforming-mars/elo/elo-data.json'
DEFAULT_ELO = 1500
BASE_K = 32

# ── Name normalization (from fix_elo_dupes.py MERGES + elo.js aliases) ──

MERGES = {
    'death': 'Death', 'death ': 'Death',
    'death8': 'Death8Killer', 'death8killer': 'Death8Killer', 'deathkiller': 'Death8Killer',
    'lfc': 'LFC', 'lfc ': 'LFC',
    'gydro': 'GydRo', 'руслан': 'GydRo', 'ruslan': 'GydRo',
    'linda': 'Linda', 'linda ': 'Linda',
    'giasa': 'Giasa', 'giasa_': 'Giasa',
    'simon': 'Simon',
    'geek': 'GeekDumb', 'geekdumb': 'GeekDumb',
    'bmac': 'BmacG', 'bmacg': 'BmacG', 'bmacg.': 'BmacG',
    'drr': 'Drrrg', 'drrg': 'Drrrg', 'drrrg': 'Drrrg',
    'duc': 'Duc Nguyen', 'duc nguyen': 'Duc Nguyen',
    'dukz': 'Dukz01', 'dukz01': 'Dukz01',
    'mrf': 'MrFahrenheit', 'mrf ': 'MrFahrenheit', 'mrfahrenheit': 'MrFahrenheit',
    ' mrfahrenheit': 'MrFahrenheit', 'mrfahrenheit7': 'MrFahrenheit', 'fahren': 'MrFahrenheit',
    'eket': 'Eket', 'eket678': 'Eket',
    'masterkeys': 'MasterKeys', 'mstrkeys': 'MasterKeys',
    'hoyla': 'Hoyla', 'höylä': 'Hoyla',
    'iro': 'Iropikc', 'iropic': 'Iropikc', 'iropick': 'Iropikc', 'iropikc': 'Iropikc',
    'jackir': 'Jackir',
    'kamui': 'Kamui',
    'lang': 'Langfjes', 'langfjes': 'Langfjes',
    'low': 'LOW615', 'low615': 'LOW615',
    'madhatta': 'MadHatter', 'madhatter': 'MadHatter',
    'mon': 'Monty', 'mon00': 'Monty', 'monty': 'Monty',
    'mort': 'Mortaum', 'moratum': 'Mortaum', 'mortarum': 'Mortaum', 'mortaum': 'Mortaum',
    'mu6ra7a': 'Mu6Ra7a', 'mu6rata': 'Mu6Ra7a',
    'nagimi': 'Nagumi', 'nagumi': 'Nagumi',
    'nikoha': 'Nikoha', 'nihoka13': 'Nikoha',
    'pa': 'Pa2016', 'pa2016': 'Pa2016',
    'panda': 'Panda', 'pandaboi': 'Panda',
    'plaz': 'Plazmica', 'plazma': 'Plazmica', 'plazmica': 'Plazmica',
    'pop': 'Popsickle', 'popi': 'Popsickle', 'poppy': 'Popsickle',
    'popsickle': 'Popsickle', 'popsickle ': 'Popsickle', 'popsicle': 'Popsickle',
    'preparationfit': 'PreparationFit', 'prepartionfit': 'PreparationFit',
    'reinforcement': 'Reinforcement', 'reinforcement-': 'Reinforcement',
    'rianby': 'Rianby',
    's29jin': 'S29jin',
    'shm': 'Shmondar', 'shmo': 'Shmondar', 'shmondar': 'Shmondar',
    'tarun': 'Tarun', 'taru': 'Tarun', 'taruntheo13': 'Tarun',
    'teddy': 'Teddy',
    'underthegun': 'UTG', 'utg': 'UTG',
    'vit': 'VitalyVit', 'vitaly': 'VitalyVit', 'vitalyvit': 'VitalyVit',
    'vvb': 'VvbMinsk', 'vvbminsk': 'VvbMinsk',
    'wd': 'Wdkymyms', 'wdk': 'Wdkymyms', 'wdkmysms': 'Wdkymyms',
    'wdkumums': 'Wdkymyms', 'wdkym': 'Wdkymyms', 'wdkymymd': 'Wdkymyms', 'wdkymyms': 'Wdkymyms',
    'kaera': 'Kaera', 'kaera02': 'Kaera',
    'coolio': 'Coolio',
    'xenon': 'Xenon',
    'zalo': 'Zalo', 'zalobolivia': 'Zalo',
    'krootish': 'Krootish86', 'krootish86': 'Krootish86',
    'j1233': 'J1234', 'j1234': 'J1234',
    'italian': 'Italianood', 'italianood': 'Italianood', 'ita': 'Italianood',
    'cuc': 'Cucumber', 'cucumber': 'Cucumber',
    'tal': 'Talov', 'talov': 'Talov',
    'raj': 'Rajatppn', 'raja': 'Rajatppn', 'rajatppn': 'Rajatppn',
    'mikiekv': 'MikiEkv',
    'kuntiny': 'Kuntiny',
    'amzo': 'Amzo', 'amzo4': 'Amzo',
    'tacos': 'Los Tacos', 'los tacos': 'Los Tacos',
    'andrewk': 'Andrewk', 'andrew': 'Andrewk',
    'kogoro': 'Kogoro',
    'tersius': 'Tersius',
    'martian': 'Martian',
    'junior': 'Junior',
    'zara': 'Zara',
    # Russian names from knightbyte
    'лёха': 'Алексей', 'леха': 'Алексей', 'алексей': 'Алексей',
    'лёха -15 эло': 'Алексей',
    'genuinegold': 'Илья', 'илья': 'Илья',
    'тимур': 'Тимур',
    'олеся': 'Олеся',
    'антистресс': 'Антистресс',
    'рав': 'Рав', 'равиль': 'Рав',
}


def normalize_name(raw):
    """Return (key, displayName) from raw player name."""
    stripped = raw.strip()
    low = stripped.lower()
    canonical = MERGES.get(low, stripped)
    return canonical.lower(), canonical


def get_k(elo):
    if elo < 1400: return BASE_K * 1.2
    if elo < 1600: return BASE_K
    if elo < 1800: return BASE_K * 0.8
    if elo < 2000: return BASE_K * 0.6
    return BASE_K * 0.4


def expected_score(my_elo, opp_elo):
    return 1 / (1 + 10 ** ((opp_elo - my_elo) / 400))


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


def main():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Load all game_results with completion timestamps
    c.execute("""
        SELECT gr.game_id, gr.generations, gr.scores,
               COALESCE(cg.completed_time, 0) as completed_time,
               gr.game_options
        FROM game_results gr
        LEFT JOIN completed_game cg ON gr.game_id = cg.game_id
        ORDER BY COALESCE(cg.completed_time, 0)
    """)
    rows = c.fetchall()
    conn.close()

    print(f'Total game_results rows: {len(rows)}')

    elo_data = {'players': {}, 'games': []}
    imported = 0
    skipped_bot = 0
    skipped_no_vp_no_place = 0
    skipped_few_players = 0

    for gid, gen, scores_json, completed_ts, options_json in rows:
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

        # Calculate Elo
        results = calc_elo_place(players, elo_data['players'])
        results_vp = calc_elo_vp(players, elo_data['players']) if has_vp else []

        # Update player records
        for ri, r in enumerate(results):
            key = r['name']
            if key not in elo_data['players']:
                elo_data['players'][key] = {
                    'elo': DEFAULT_ELO, 'elo_vp': DEFAULT_ELO,
                    'displayName': r['displayName'],
                    'games': 0, 'wins': 0, 'top3': 0,
                    'totalVP': 0, 'corps': {},
                }
            p = elo_data['players'][key]
            p['elo'] = r['newElo']
            p['displayName'] = r['displayName']
            p['games'] += 1
            if r['place'] == 1:
                p['wins'] += 1
            if r['place'] <= 3:
                p['top3'] += 1
            p['totalVP'] += r.get('vp', 0)
            if r['corp']:
                p['corps'][r['corp']] = p['corps'].get(r['corp'], 0) + 1

        # Update VP-margin Elo
        for rv in results_vp:
            if rv['name'] in elo_data['players']:
                elo_data['players'][rv['name']]['elo_vp'] = rv['newElo']

        # Game key for dedup
        game_key = date_str + '_' + ','.join(sorted(r['name'] for r in results)) if date_str else gid

        elo_data['games'].append({
            '_key': game_key,
            'date': date_str,
            'server': 'knightbyte',
            'map': map_name,
            'generation': gen or 0,
            'playerCount': len(players),
            'results': [{
                'name': r['name'], 'displayName': r['displayName'],
                'place': r['place'], 'delta': r['delta'],
                'oldElo': r['oldElo'], 'newElo': r['newElo'],
                'corp': r['corp'], 'vp': r.get('vp', 0),
            } for r in results],
        })
        imported += 1

    print(f'\nImported: {imported}')
    print(f'Skipped bot/test: {skipped_bot}')
    print(f'Skipped no VP/no place: {skipped_no_vp_no_place}')
    print(f'Skipped <2 players: {skipped_few_players}')
    print(f'Players: {len(elo_data["players"])}')

    # Leaderboard
    lb = sorted(elo_data['players'].items(), key=lambda x: x[1]['elo'], reverse=True)
    print(f'\n{"#":>3} {"Name":<20} {"Elo":>5} {"EloVP":>6} {"Games":>5} {"Wins":>4} {"Win%":>5} {"AvgVP":>5}')
    print('-' * 60)
    for i, (key, p) in enumerate(lb[:25]):
        wr = round(p['wins'] / p['games'] * 100) if p['games'] > 0 else 0
        avg = round(p['totalVP'] / p['games']) if p['games'] > 0 else 0
        print(f'{i+1:>3} {p["displayName"]:<20} {p["elo"]:>5} {p.get("elo_vp", 1500):>6} {p["games"]:>5} {p["wins"]:>4} {wr:>4}% {avg:>5}')

    # Save
    with open(ELO_PATH, 'w', encoding='utf-8') as f:
        json.dump(elo_data, f, ensure_ascii=False, indent=2)
    print(f'\nSaved to {ELO_PATH}')


if __name__ == '__main__':
    main()
