import '../tests/testing/setup';
import {Game} from '../src/server/Game';
import {bgaFeatures} from '../src/server/ai/bgaValueModel';
import {runInSandbox} from '../src/server/ai/simulationSandbox';
import {isCeoCard} from '../src/server/cards/ceos/ICeoCard';
import * as fs from 'node:fs';
import * as zlib from 'node:zlib';

const [dir, outPath] = process.argv.slice(2);
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json.gz')).sort();
const out = fs.createWriteStream(outPath, {flags: 'w'});

const EXTRA = ['own_colonies','opp_colonies','diff_colonies','own_fleet','opp_fleet','diff_fleet','own_influence','opp_influence','diff_influence','own_chairman','opp_chairman','own_partyDelegates','opp_partyDelegates','diff_partyDelegates','own_ceoPlayed','opp_ceoPlayed','diff_ceoPlayed','own_ceoInHand','opp_ceoInHand','coloniesOnBoard','coloniesExt','turmoilExt','ceoExt'];

function extras(p: any, q: any, game: any): number[] {
  const tur = game.turmoil;
  const dom = tur?.dominantParty;
  const delegates = (pl: any) => dom?.delegates?.get(pl) ?? 0;
  const infl = (pl: any) => tur === undefined ? 0 : tur.getInfluence(pl);
  const chair = (pl: any) => (tur !== undefined && tur.chairman === pl) ? 1 : 0;
  const ceoPlayed = (pl: any) => pl.playedCards.filter((c: any) => isCeoCard(c)).length;
  const ceoHand = (pl: any) => pl.ceoCardsInHand?.size ?? 0;
  const own = {colonies: p.getColoniesCount(), fleet: p.colonies?.getFleetSize?.() ?? 0, influence: infl(p), chairman: chair(p), delegates: delegates(p), ceoPlayed: ceoPlayed(p), ceoHand: ceoHand(p)};
  const opp = {colonies: q.getColoniesCount(), fleet: q.colonies?.getFleetSize?.() ?? 0, influence: infl(q), chairman: chair(q), delegates: delegates(q), ceoPlayed: ceoPlayed(q), ceoHand: ceoHand(q)};
  let coloniesOnBoard = 0;
  if (game.gameOptions.coloniesExtension) { game.colonies.forEach((c: any) => { coloniesOnBoard += c.colonies.length; }); }
  const opt = game.gameOptions;
  return [own.colonies, opp.colonies, own.colonies - opp.colonies, own.fleet, opp.fleet, own.fleet - opp.fleet,
    own.influence, opp.influence, own.influence - opp.influence, own.chairman, opp.chairman,
    own.delegates, opp.delegates, own.delegates - opp.delegates,
    own.ceoPlayed, opp.ceoPlayed, own.ceoPlayed - opp.ceoPlayed, own.ceoHand, opp.ceoHand,
    coloniesOnBoard, opt.coloniesExtension ? 1 : 0, opt.turmoilExtension ? 1 : 0, opt.ceoExtension ? 1 : 0];
}

const counts = {games: 0, snaps: 0, pairs: 0, errors: 0, skip: 0};
for (const f of files) {
  const data = JSON.parse(zlib.gunzipSync(fs.readFileSync(dir + '/' + f)) as unknown as Buffer);
  counts.games++;
  const scoreByName: Record<string, number> = {};
  for (const s of data.scores ?? []) if (s.playerName !== undefined) scoreByName[s.playerName] = s.playerScore;
  for (const snap of data.snaps ?? []) {
    counts.snaps++;
    let game: any;
    try { game = runInSandbox(() => Game.deserialize(snap.state, {viewOnly: true})); } catch (e) { counts.errors++; continue; }
    const players = game.players;
    if (players.length < 2 || players.length > 4) { counts.skip++; continue; }
    const scores = Array.isArray(data.scores) ? data.scores : players.map((p: any) => scoreByName[p.name]);
    if (scores.some((s: any) => s === undefined)) { counts.skip++; continue; }
    for (let i = 0; i < players.length; i++) {
      for (let j = 0; j < players.length; j++) {
        if (i === j) continue;
        const base = bgaFeatures(players[i], players[j]);
        out.write(JSON.stringify({game: data.gameId, players: players.length, gen: snap.gen, i, j, target: scores[i] - scores[j], features: base.concat(extras(players[i], players[j], game)), extraNames: EXTRA.length}) + '\n');
        counts.pairs++;
      }
    }
  }
}
out.end();
console.log(JSON.stringify(counts));
