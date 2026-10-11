import {expect} from 'chai';
import {CompanyNationalization} from '../../../src/server/cards/solaris/CompanyNationalization';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setRulingParty} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {cast} from '../../../src/common/utils/utils';
import {BeginnerCorporation} from '../../../src/server/cards/corporation/BeginnerCorporation';
import {Game} from '@/server/Game';
import {Server} from '@/server/models/ServerModel';

describe('CompanyNationalization', () => {
  let card: CompanyNationalization;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new CompanyNationalization();
    [game, player] = testGame(1, {turmoilExtension: true});
    player.pickedCorporationCard = new BeginnerCorporation();
    player.playedCards.push(player.pickedCorporationCard);
  });

  it('cannot play without Reds ruling or 2 delegates', () => {
    expect(card.canPlay(player)).is.false;
    setRulingParty(game, PartyName.REDS);
    expect(card.canPlay(player)).is.true;
  });

  it('choosing the M€ option applies the M€ effect and discards the corporation', () => {
    setRulingParty(game, PartyName.REDS);
    const megaCreditsBefore = player.megaCredits;

    const orOptions = cast(card.play(player), OrOptions);
    orOptions.options[0].cb(undefined);

    expect(player.production.megacredits).to.eq(2);
    expect(player.megaCredits).to.eq(megaCreditsBefore + 15);
    expect(player.playedCards.has(player.pickedCorporationCard!.name)).is.false;
  });

  it('choosing the steel/energy option applies that effect and discards the corporation', () => {
    setRulingParty(game, PartyName.REDS);
    const steelBefore = player.steel;
    const energyBefore = player.energy;

    const orOptions = cast(card.play(player), OrOptions);
    orOptions.options[1].cb(undefined);

    expect(player.steel).to.eq(steelBefore + 12);
    expect(player.energy).to.eq(energyBefore + 4);
    expect(player.playedCards.has(player.pickedCorporationCard!.name)).is.false;
  });

  it('choosing the titanium option applies that effect and discards the corporation', () => {
    setRulingParty(game, PartyName.REDS);
    const titaniumBefore = player.titanium;

    const orOptions = cast(card.play(player), OrOptions);
    orOptions.options[2].cb(undefined);

    expect(player.production.titanium).to.eq(2);
    expect(player.titanium).to.eq(titaniumBefore + 3);
    expect(player.playedCards.has(player.pickedCorporationCard!.name)).is.false;
  });

  it('removes the corporation from player and spectator views after loading a saved game', () => {
    setRulingParty(game, PartyName.REDS);
    const restored = Game.deserialize(game.serialize(), {simulation: true});
    const restoredPlayer = restored.players[0];

    const orOptions = cast(card.play(restoredPlayer), OrOptions);
    orOptions.options[0].cb(undefined);

    expect(Server.getPlayerModel(restoredPlayer).thisPlayer.tableau).deep.eq([]);
    expect(Server.getSpectatorModel(restored).players[0].tableau).deep.eq([]);
    const reloaded = Game.deserialize(restored.serialize(), {simulation: true});
    expect(reloaded.players[0].playedCards.corporations()).is.empty;
  });
});
