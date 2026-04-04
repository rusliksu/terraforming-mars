#!/usr/bin/env python3
"""Fix duplicate player names in elo-data.json and rebuild ratings."""
import json
from collections import defaultdict

ELO_PATH = '/home/openclaw/terraforming-mars/elo/elo-data.json'

# Merge map: lowercase variant → canonical displayName
MERGES = {
    'death': 'Death', 'death ': 'Death',
    'death8': 'Death8Killer', 'death8killer': 'Death8Killer', 'deathkiller': 'Death8Killer',
    'lfc': 'LFC', 'lfc ': 'LFC',
    'gydro': 'GydRo',
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
}


def normalize_name(display_name):
    """Map a display name to canonical form using MERGES."""
    nk = display_name.lower().strip()
    return MERGES.get(nk, display_name.strip())


def rebuild_elo(elo_data):
    """Normalize names in results and rebuild all Elo ratings from scratch."""
    K = 32
    elo_place = defaultdict(lambda: 1500)
    elo_vp = defaultdict(lambda: 1500)
    wins = defaultdict(int)
    games_count = defaultdict(int)
    display_names = {}
    changed = 0

    for g in elo_data['games']:
        results = g.get('results', [])
        n = len(results)
        if n < 2:
            continue

        # Normalize names
        for r in results:
            dn = r.get('displayName', r.get('name', '?'))
            canonical = normalize_name(dn)
            if dn != canonical:
                r['displayName'] = canonical
                r['name'] = canonical.lower()
                changed += 1

        # Track stats
        for r in results:
            dn = r['displayName']
            nk = dn.lower()
            display_names[nk] = dn
            games_count[nk] += 1
            if r.get('place', 99) == 1:
                wins[nk] += 1

        # Pairwise Elo
        for i in range(n):
            for j in range(i + 1, n):
                pi = results[i]['displayName'].lower()
                pj = results[j]['displayName'].lower()
                # Placement Elo
                ri, rj = elo_place[pi], elo_place[pj]
                ei = 1 / (1 + 10 ** ((rj - ri) / 400))
                pi_pl = results[i].get('place', i + 1)
                pj_pl = results[j].get('place', j + 1)
                si = 1.0 if pi_pl < pj_pl else (0.5 if pi_pl == pj_pl else 0.0)
                k = K / max(1, n - 1)
                elo_place[pi] += k * (si - ei)
                elo_place[pj] += k * ((1 - si) - (1 - ei))
                # VP Elo
                vi = results[i].get('vp', 0)
                vj = results[j].get('vp', 0)
                ri2, rj2 = elo_vp[pi], elo_vp[pj]
                ei2 = 1 / (1 + 10 ** ((rj2 - ri2) / 400))
                si2 = 1.0 if vi > vj else (0.5 if vi == vj else 0.0)
                elo_vp[pi] += k * (si2 - ei2)
                elo_vp[pj] += k * ((1 - si2) - (1 - ei2))

    # Build players dict
    players_dict = {}
    for nk in games_count:
        players_dict[nk] = {
            'displayName': display_names.get(nk, nk),
            'elo': round(elo_place[nk]),
            'elo_vp': round(elo_vp[nk]),
            'games': games_count[nk],
            'wins': wins[nk],
        }

    elo_data['players'] = players_dict
    return changed, len(players_dict)


if __name__ == '__main__':
    with open(ELO_PATH) as f:
        elo = json.load(f)

    changed, nplayers = rebuild_elo(elo)

    with open(ELO_PATH, 'w') as f:
        json.dump(elo, f, indent=2, ensure_ascii=False)

    print(f'Renamed {changed} entries. Players: {nplayers}, Games: {len(elo["games"])}')
    top = sorted(elo['players'].items(), key=lambda x: -x[1]['elo'])[:15]
    print('\nTop 15:')
    for nk, p in top:
        pct = round(p['wins'] / max(1, p['games']) * 100)
        print(f'  {p["displayName"]}: {p["elo"]} ({p["wins"]}/{p["games"]}={pct}%)')
