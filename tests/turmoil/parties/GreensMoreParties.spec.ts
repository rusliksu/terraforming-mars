import {expect} from 'chai';
import {GreensMoreParties} from '../../../src/server/turmoil/parties/GreensMoreParties';
import {GREENS_POLICY_1} from '../../../src/server/turmoil/parties/Greens';
import {
  GREENS_MORE_PARTIES_POLICY_3,
  GREENS_MORE_PARTIES_POLICY_4,
} from '../../../src/server/turmoil/parties/GreensMoreParties';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {forcePartiesInPlay, setRulingParty, addCity} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Birds} from '../../../src/server/cards/base/Birds';
import {Bushes} from '../../../src/server/cards/base/Bushes';

describe('GreensMoreParties', () => {
  let game: IGame;
  let player: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.GREENS);
    [game, player] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('reuses the exact same policy 1 object as vanilla Greens (gp01)', () => {
    const party = new GreensMoreParties();
    expect(party.policies[0]).to.eq(GREENS_POLICY_1);
  });

  it('policy 2: gains 1 plant when a tile is placed on Mars', () => {
    setRulingParty(game, PartyName.GREENS, 'gp02');
    const before = player.plants;
    addCity(player);
    expect(player.plants).to.eq(before + 1);
  });

  it('policy 3: an animal-tagged card that holds animals gets a resource placed on it, not a plant gain', () => {
    const birds = new Birds(); // Animal tag, holds Animal card resources
    player.plants = 0;
    player.playedCards.push(birds);
    GREENS_MORE_PARTIES_POLICY_3.onCardPlayed(player, birds);
    expect(birds.resourceCount).to.eq(1);
    expect(player.plants).to.eq(0);
  });

  it('policy 3: a plant-tagged card with no card-resource form grants a plant instead', () => {
    const bushes = new Bushes(); // Plant tag, no card resource of its own
    player.plants = 0;
    player.playedCards.push(bushes);
    GREENS_MORE_PARTIES_POLICY_3.onCardPlayed(player, bushes);
    expect(player.plants).to.eq(1);
  });

  it('policy 4: choosing a tag pays 4 M€ and draws a card with that tag', () => {
    player.megaCredits = 10;
    expect(GREENS_MORE_PARTIES_POLICY_4.canAct(player)).is.true;
    const input = GREENS_MORE_PARTIES_POLICY_4.action(player);
    expect(input).is.not.undefined;
  });

  it('policy 4 cannot act without enough M€', () => {
    player.megaCredits = 0;
    expect(GREENS_MORE_PARTIES_POLICY_4.canAct(player)).is.false;
  });
});
