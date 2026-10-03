import {expect} from 'chai';
import {PreludeCloning} from '../../../src/server/cards/sillyfication/PreludeCloning';
import {AlliedBanks} from '../../../src/server/cards/prelude/AlliedBanks';
import {CardType} from '../../../src/common/cards/CardType';
import {IGame} from '../../../src/server/IGame';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';
import {testGame} from '../../TestGame';

describe('PreludeCloning', () => {
  let card: PreludeCloning;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new PreludeCloning();
    [game, player, player2] = testGame(2, {preludeExtension: true});
  });

  it('is a green (automated) card, cost 14, 1 VP', () => {
    expect(card.type).to.eq(CardType.AUTOMATED);
    expect(card.cost).to.eq(14);
    expect(card.getVictoryPoints(player)).to.eq(1);
  });

  it('requires 4 science tags and an opponent prelude', () => {
    player.tagsForTest = {science: 4};
    expect(card.canPlay(player)).is.false; // no opponent prelude

    player2.playedCards.push(new AlliedBanks());
    expect(card.canPlay(player)).is.true;

    player.tagsForTest = {science: 3};
    expect(card.canPlay(player)).is.false;
  });

  it('plays a copy of the chosen opponent prelude', () => {
    player2.playedCards.push(new AlliedBanks());
    player.tagsForTest = {science: 4};
    player.production.override({megacredits: 0});

    const selectCard = cast(card.play(player), SelectCard);
    selectCard.cb([selectCard.cards[0]]);
    runAllActions(game);

    // Allied Bank: +4 M€ production and 3 M€.
    expect(player.production.megacredits).to.eq(4);
    expect(player.playedCards.asArray().some((c) => c.name === 'Allied Bank')).is.true;
  });
});
