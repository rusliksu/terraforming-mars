import {expect} from 'chai';
import {cast} from '../../../src/common/utils/utils';
import {MiningTheBelt} from '../../../src/server/cards/idesofmars/MiningTheBelt';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {IProjectCard} from '../../../src/server/cards/IProjectCard';
// A card with only a building tag, and a card with only a space tag, cover each branch independently.
import {MarsUniversity} from '../../../src/server/cards/base/MarsUniversity';
import {Comet} from '../../../src/server/cards/base/Comet';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('MiningTheBelt', () => {
  let card: MiningTheBelt;
  let player: TestPlayer;

  beforeEach(() => {
    card = new MiningTheBelt();
    [, player] = testGame(1);
  });

  it('does nothing when the hand is empty', () => {
    expect(card.bespokePlay(player)).is.undefined;
  });

  it('increases steel production when discarding a building-tagged card', () => {
    const marsUniversity = new MarsUniversity();
    player.cardsInHand.push(marsUniversity);

    const selectCard = cast(card.bespokePlay(player), SelectCard<IProjectCard>);
    selectCard.cb([marsUniversity]);

    expect(player.cardsInHand).does.not.include(marsUniversity);
    expect(player.production.steel).eq(1);
    expect(player.production.titanium).eq(0);
  });

  it('increases titanium production when discarding a space-tagged card', () => {
    const comet = new Comet();
    player.cardsInHand.push(comet);

    const selectCard = cast(card.bespokePlay(player), SelectCard<IProjectCard>);
    selectCard.cb([comet]);

    expect(player.production.steel).eq(0);
    expect(player.production.titanium).eq(1);
  });
});
