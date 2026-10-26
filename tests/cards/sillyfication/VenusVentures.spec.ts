import {expect} from 'chai';
import {VenusVentures} from '../../../src/server/cards/sillyfication/VenusVentures';
import {MicroCredits} from '../../../src/server/cards/sillyfication/MicroCredits';
import {VenusianSubsidiary} from '../../../src/server/cards/sillyfication/VenusianSubsidiary';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions} from '../../TestingUtils';
import {testGame} from '../../TestGame';

describe('VenusVentures', () => {
  let card: VenusVentures;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new VenusVentures();
    [game, player] = testGame(2, {venusNextExtension: true});
    player.playedCards.push(card);
  });

  it('has two Venus tags', () => {
    expect(card.tags.filter((t) => t === 'venus')).to.have.length(2);
  });

  it('starts with 40 M€ and 2 M€ production', () => {
    expect(card.startingMegaCredits).to.eq(40);
    expect(card.behavior?.production?.megacredits).to.eq(2);
  });

  it('adds 1 floater per Venus tag played; 2 for its own two Venus tags', () => {
    card.onCardPlayed(player, card);
    runAllActions(game);
    expect(card.resourceCount).to.eq(2);

    // Venusian Subsidiary has a single Venus tag.
    card.onCardPlayed(player, new VenusianSubsidiary());
    runAllActions(game);
    expect(card.resourceCount).to.eq(3);
  });

  it('does not add floaters for a non-Venus card', () => {
    card.onCardPlayed(player, new MicroCredits());
    runAllActions(game);
    expect(card.resourceCount).to.eq(0);
  });

  it('action removes floaters for 2 M€ each', () => {
    expect(card.canAct()).is.false;
    player.addResourceTo(card, 5);
    player.megaCredits = 0;

    expect(card.canAct()).is.true;
    const selectAmount = card.action(player);
    selectAmount.cb(3);
    runAllActions(game);

    expect(card.resourceCount).to.eq(2);
    expect(player.megaCredits).to.eq(6);
  });
});
