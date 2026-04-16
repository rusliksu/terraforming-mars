#!/usr/bin/env python3
"""Fix duplicate player names in elo-data.json and rebuild ratings."""
import json
from collections import defaultdict
from pathlib import Path

from elo_aliases import assert_no_suspicious_duplicate_players, normalize_name

SCRIPT_DIR = Path(__file__).resolve().parent
ELO_DIR = Path(__file__).resolve().parent
ELO_PATH = ELO_DIR / 'elo-data.json'
ELO_COMPAT_PATH = ELO_DIR / 'data.json'

def placement_score(place, player_count):
    if player_count <= 1:
        return 1.0
    return max(0.0, min(1.0, 1 - ((max(1, place) - 1) / (player_count - 1))))


def rebuild_elo(elo_data):
    """Normalize names in results and rebuild all Elo ratings from scratch."""
    K = 32
    elo_place = defaultdict(lambda: 1500)
    elo_vp = defaultdict(lambda: 1500)
    firsts = defaultdict(int)
    place_score_totals = defaultdict(float)
    games_count = defaultdict(int)
    top3_counts = defaultdict(int)
    total_vps = defaultdict(int)
    corps_by_player = defaultdict(dict)
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
            place = r.get('place', 99)
            display_names[nk] = dn
            games_count[nk] += 1
            if place == 1:
                firsts[nk] += 1
            if place <= 3:
                top3_counts[nk] += 1
            place_score_totals[nk] += placement_score(place, n)
            total_vps[nk] += r.get('vp', 0)
            corp = r.get('corp', '')
            if corp:
                corps_by_player[nk][corp] = corps_by_player[nk].get(corp, 0) + 1

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
            'firsts': firsts[nk],
            'wins': firsts[nk],
            'placeScoreTotal': round(place_score_totals[nk], 4),
            'avgPlace': round(place_score_totals[nk] / max(1, games_count[nk]), 4),
            'top3': top3_counts[nk],
            'totalVP': total_vps[nk],
            'avgVP': round(total_vps[nk] / max(1, games_count[nk]), 2),
            'corps': corps_by_player[nk],
        }

    assert_no_suspicious_duplicate_players(players_dict)
    elo_data['players'] = players_dict
    return changed, len(players_dict)


if __name__ == '__main__':
    source_path = ELO_PATH if ELO_PATH.exists() else ELO_COMPAT_PATH
    with source_path.open(encoding='utf-8') as f:
        elo = json.load(f)

    changed, nplayers = rebuild_elo(elo)

    text = json.dumps(elo, indent=2, ensure_ascii=False)
    ELO_PATH.write_text(text, encoding='utf-8')
    ELO_COMPAT_PATH.write_text(text, encoding='utf-8')

    print(f'Renamed {changed} entries. Players: {nplayers}, Games: {len(elo["games"])}')
    top = sorted(elo['players'].items(), key=lambda x: -x[1]['elo'])[:15]
    print('\nTop 15:')
    for nk, p in top:
        print(f'  {p["displayName"]}: {p["elo"]} (1st={p["firsts"]}, place={p["avgPlace"]:.2f}, games={p["games"]})')
