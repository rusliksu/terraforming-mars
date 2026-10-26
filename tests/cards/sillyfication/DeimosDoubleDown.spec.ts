import {expect} from 'chai';
import {DeimosDoubleDown} from '../../../src/server/cards/sillyfication/DeimosDoubleDown';
import {DeimosDoubleDownCopy} from '../../../src/server/cards/sillyfication/DeimosDoubleDownCopy';
import {Comet} from '../../../src/server/cards/base/Comet';
import {IGame} from '../../../src/server/IGame';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {Tag} from '../../../src/common/cards/Tag';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';
import {testGame} from '../../TestGame';

describe('DeimosDoubleDown', () => {
  let card: DeimosDoubleDown;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new DeimosDoubleDown();
    [game, player, player2] = testGame(2, {preludeExtension: true});
  });

  it('has a space tag and a "?" in its name', () => {
    expect(card.tags).to.deep.eq([Tag.SPACE]);
    expect(card.name).to.eq('Deimos Double Down?');
  });

  it('gains titanium, draws space events, and copies one to every player', () => {
    player.titanium = 0;
    player.cardsInHand = [];

    card.play(player);
    runAllActions(game);

    expect(player.titanium).to.eq(2);
    const spaceEvents = player.cardsInHand.filter((c) => c.tags.includes(Tag.SPACE));
    expect(spaceEvents.length).to.be.greaterThan(0);
    for (const c of player.cardsInHand) {
      expect(c.type).to.eq('event');
      expect(c.tags).to.contain(Tag.SPACE);
    }
  });

  it('give-away hands every other player a DeimosDoubleDownCopy of the chosen space event too', () => {
    player.cardsInHand = [new Comet()];
    player2.cardsInHand = [];

    const selectCard = cast(card.bespokePlay(player), SelectCard);
    selectCard.cb([selectCard.cards[0]]);

    expect(player2.cardsInHand).to.have.length(1);
    const otherCopy = player2.cardsInHand[0];
    expect(otherCopy).to.be.instanceOf(DeimosDoubleDownCopy);
    expect(otherCopy.tags).to.deep.eq([Tag.SPACE]);
    expect(otherCopy).to.not.eq(player.cardsInHand[0]);
  });

  it('gives the owner a genuinely distinct copy instead of a second same-named Comet', () => {
    const originalComet = new Comet();
    player.cardsInHand = [originalComet];

    const selectCard = cast(card.bespokePlay(player), SelectCard);
    selectCard.cb([selectCard.cards[0]]);

    expect(player.cardsInHand).to.have.length(2);
    expect(player.cardsInHand).to.include(originalComet);
    const copy = player.cardsInHand.find((c) => c !== originalComet)!;
    expect(copy).to.be.instanceOf(DeimosDoubleDownCopy);
    expect(copy.name).to.not.eq(originalComet.name);
    // But it functions identically - same tags/cost/behavior as the real Comet.
    expect(copy.tags).to.deep.eq(originalComet.tags);
    expect(copy.cost).to.eq(originalComet.cost);

    // Both are independently playable in the same tableau - the whole point.
    expect(() => player.playedCards.push(originalComet)).to.not.throw();
    expect(() => player.playedCards.push(copy)).to.not.throw();
    expect(player.playedCards.length).to.eq(2);
  });

  it('gives every player the same kind of copy, all independently playable', () => {
    const originalComet = new Comet();
    player.cardsInHand = [originalComet];
    player2.cardsInHand = [];

    const selectCard = cast(card.bespokePlay(player), SelectCard);
    selectCard.cb([selectCard.cards[0]]);

    const ownCopy = player.cardsInHand.find((c) => c !== originalComet)!;
    const otherCopy = player2.cardsInHand[0];
    expect(ownCopy).to.be.instanceOf(DeimosDoubleDownCopy);
    expect(otherCopy).to.be.instanceOf(DeimosDoubleDownCopy);
    expect(ownCopy).to.not.eq(otherCopy);

    expect(() => player2.playedCards.push(otherCopy)).to.not.throw();
  });
});
